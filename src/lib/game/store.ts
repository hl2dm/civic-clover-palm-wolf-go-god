import { create } from "zustand";
import { sfx, unlockAudio } from "./audio";
import { CARDS, rewardPool, starterDeckIds } from "./cards";
import {
  beginEnemyTurn,
  beginPlayerTurn,
  canPlayCard,
  checkTerminal,
  discardRemainingHand,
  drawOneCard,
  playCard,
  resolveEnemy,
  rollEncounter,
  startCombat,
} from "./combat";
import { canUpgrade, pickEvent } from "./events";
import type { EventDef } from "./events";
import { ACT_NAME, generateMap, reachableFrom } from "./map";
import { healPlayer } from "./engine";
import { POTION_LIST, POTIONS } from "./potions";
import { RELIC_LIST, RELICS } from "./relics";
import { Rng, xmur3 } from "./rng";
import { clearRun, loadMeta, loadRun, saveMeta, saveRun } from "./save";
import type {
  CardInst,
  CombatState,
  MetaState,
  PendingSelect,
  RewardState,
  RunState,
  Screen,
  ShopOffer,
} from "./types";
import { HAND_SIZE, POTION_SLOTS, START_ENERGY, START_GOLD, START_HP } from "./types";

export interface GameStore {
  ready: boolean;
  screen: Screen;
  run: RunState | null;
  combat: CombatState | null;
  reward: RewardState | null;
  shop: ShopOffer[] | null;
  event: EventDef | null;
  eventLog: string | null;
  pending: PendingSelect | null;
  treasure: string[] | null;
  result: "win" | "lose" | null;
  meta: MetaState;
  toast: string | null;
  deckOpen: boolean;
  helpOpen: boolean;
  confirmNew: boolean;
  inspect: { kind: "relic" | "potion"; id: string } | null;
  lastPlayed: { defId: string; upgraded: boolean; at: number } | null;
  relicPulse: string | null;
  actingUid: string | null;
  handAnim: null | "discard" | "draw";
  exitingUids: string[];
  turnBeat: null | "enemy" | "player" | "win" | "lose";
  denyUid: string | null;
  denyAt: number;
  hydrate: () => void;
  newRun: () => void;
  continueRun: () => void;
  abandon: () => void;
  chooseNode: (id: string) => void;
  selectCard: (uid: string) => void;
  playOnEnemy: (enemyUid: string) => void;
  playSelf: (uid: string) => void;
  endTurn: () => void;
  usePotion: (index: number) => void;
  pickRewardCard: (uid: string) => void;
  skipRewardCard: () => void;
  takeRewardPotion: () => void;
  takeRewardRelic: () => void;
  leaveReward: () => void;
  buyShop: (index: number) => void;
  leaveShop: () => void;
  restHeal: () => void;
  restUpgrade: () => void;
  chooseEvent: (choiceId: string) => void;
  pickSelectCard: (uid: string) => void;
  cancelSelect: () => void;
  pickTreasure: (id: string) => void;
  setDeckOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setConfirmNew: (v: boolean) => void;
  setInspect: (v: { kind: "relic" | "potion"; id: string } | null) => void;
  dismissToast: () => void;
}

function persist(screen: Screen, run: RunState | null) {
  if (!run) return;
  if (screen === "title" || screen === "result") return;
  saveRun(screen, run);
}

function alloc(run: RunState): string {
  run.nextUid += 1;
  return `u${run.nextUid}`;
}

function makeDeck(run: RunState): CardInst[] {
  return starterDeckIds().map((id) => ({ uid: alloc(run), defId: id, upgraded: false }));
}

function rngOf(run: RunState): Rng {
  return new Rng(run.rngState);
}

function shopPrice(run: RunState, base: number): number {
  return run.relics.includes("sancai") ? Math.max(1, Math.ceil(base * 0.9)) : base;
}

function applyRelicGain(run: RunState, id: string) {
  if (run.relics.includes(id)) return;
  run.relics.push(id);
  if (id === "yinqi") run.maxEnergy += 1;
  if (id === "xisui") {
    run.maxHp += 8;
    run.hp += 8;
  }
  if (id === "jubao") run.gold += 40;
  if (id === "qiankun") run.potions.push(null);
}

function addPotion(run: RunState, id: string): boolean {
  const i = run.potions.findIndex((p) => p == null);
  if (i < 0) return false;
  run.potions[i] = id;
  return true;
}

function rollRelic(run: RunState): string | null {
  const rng = rngOf(run);
  const pool = RELIC_LIST.filter((r) => !run.relics.includes(r.id));
  run.rngState = rng.state;
  if (!pool.length) return null;
  return rng.pick(pool).id;
}

function rollPotion(run: RunState): string {
  const rng = rngOf(run);
  const id = rng.pick(POTION_LIST).id;
  run.rngState = rng.state;
  return id;
}

function rarityWeight(rarity: string, favor: boolean): number {
  if (rarity === "rare") return favor ? 18 : 8;
  if (rarity === "uncommon") return favor ? 32 : 28;
  return favor ? 50 : 64;
}

function rollCards(run: RunState, n: number): CardInst[] {
  const rng = rngOf(run);
  const pool = rewardPool();
  const favor = run.relics.includes("tongtian");
  const used = new Set<string>();
  const cards: CardInst[] = [];
  for (let i = 0; i < n; i++) {
    let pick = rng.weighted(pool.map((c) => ({ item: c, weight: rarityWeight(c.rarity, favor) })));
    let guard = 0;
    while (used.has(pick.id) && guard < 16) {
      pick = rng.weighted(pool.map((c) => ({ item: c, weight: rarityWeight(c.rarity, favor) })));
      guard += 1;
    }
    used.add(pick.id);
    cards.push({ uid: alloc(run), defId: pick.id, upgraded: false });
  }
  run.rngState = rng.state;
  return cards;
}

function blankOverlays() {
  return {
    combat: null as CombatState | null,
    reward: null as RewardState | null,
    shop: null as ShopOffer[] | null,
    event: null as EventDef | null,
    eventLog: null as string | null,
    pending: null as PendingSelect | null,
    treasure: null as string[] | null,
    lastPlayed: null as GameStore["lastPlayed"],
    relicPulse: null as string | null,
    actingUid: null as string | null,
    handAnim: null as GameStore["handAnim"],
    exitingUids: [] as string[],
    turnBeat: null as GameStore["turnBeat"],
    denyUid: null as string | null,
    denyAt: 0,
    toast: null as string | null,
    inspect: null as GameStore["inspect"],
  };
}

function enterNode(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
  id: string,
) {
  const run = get().run;
  if (!run) return;
  const node = run.map.find((n) => n.id === id);
  if (!node) return;
  run.currentNodeId = id;
  if (!run.visited.includes(id)) run.visited.push(id);
  run.floor += 1;
  const extra = blankOverlays();

  if (node.type === "combat" || node.type === "elite" || node.type === "boss") {
    const rng = rngOf(run);
    const encounter = rollEncounter(node.type, run.act, rng, node.layer);
    run.rngState = rng.state;
    const combat = startCombat(run, encounter, () => alloc(run));
    run.rngState = combat.rngState;
    set(() => ({ ...extra, screen: "combat", combat, run: { ...run } }));
    persist("combat", run);
    return;
  }
  if (node.type === "shop") {
    const rng = rngOf(run);
    const cards = rollCards(run, 3).map((c) => {
      const def = CARDS[c.defId]!;
      const price = shopPrice(
        run,
        def.rarity === "rare" ? 125 : def.rarity === "uncommon" ? 80 : 55,
      );
      return { kind: "card" as const, id: c.defId, price, sold: false };
    });
    const relicId = rollRelic(run);
    const potions = [rollPotion(run), rollPotion(run), rollPotion(run)].filter(
      (pid, i, arr): pid is string => Boolean(pid) && arr.indexOf(pid) === i,
    );
    const shop: ShopOffer[] = [
      ...cards,
      ...(relicId ? [{ kind: "relic" as const, id: relicId, price: shopPrice(run, 155), sold: false }] : []),
      ...potions.map((pid) => ({ kind: "potion" as const, id: pid, price: shopPrice(run, 52), sold: false })),
      { kind: "remove", id: "remove", price: shopPrice(run, 75), sold: false },
    ];
    run.rngState = rng.state;
    sfx.shop();
    set(() => ({ ...extra, screen: "shop", shop, run: { ...run } }));
    persist("shop", run);
    return;
  }
  if (node.type === "rest") {
    set(() => ({ ...extra, screen: "rest", run: { ...run } }));
    persist("rest", run);
    return;
  }
  if (node.type === "event") {
    const rng = rngOf(run);
    const event = pickEvent(rng);
    run.rngState = rng.state;
    set(() => ({ ...extra, screen: "event", event, run: { ...run } }));
    persist("event", run);
    return;
  }
  if (node.type === "treasure") {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const idRelic = rollRelic(run);
      if (idRelic && !ids.includes(idRelic)) ids.push(idRelic);
    }
    set(() => ({ ...extra, screen: "treasure", treasure: ids, run: { ...run } }));
    persist("treasure", run);
  }
}

function afterCombatVictory(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
) {
  const { run, combat } = get();
  if (!run || !combat) return;
  run.hp = combat.playerHp;
  run.kills += combat.enemies.length;
  const node = run.map.find((n) => n.id === run.currentNodeId);
  const rng = rngOf(run);
  let gold =
    node?.type === "boss" ? rng.intRange(85, 110) : node?.type === "elite" ? rng.intRange(28, 42) : rng.intRange(12, 22);
  if (run.relics.includes("shijin")) gold += 15;
  run.gold += gold;
  if (run.relics.includes("huichunpei")) {
    run.hp = Math.min(run.maxHp, run.hp + 5);
  }
  const potionChance = node?.type === "boss" ? 1 : node?.type === "elite" ? 0.5 : 0.28;
  const potion = rng.chance(potionChance) ? rng.pick(POTION_LIST).id : null;
  const relic = node?.type === "elite" || node?.type === "boss" ? rollRelic(run) : null;
  const cards = rollCards(run, 3);
  run.rngState = rng.state;
  const reward: RewardState = {
    gold,
    cards,
    potion,
    relic,
    pickedCard: false,
    pickedPotion: !potion,
    pickedRelic: !relic,
  };
  sfx.win();
  sfx.win();
  set({
    screen: "reward",
    reward,
    combat: null,
    run: { ...run },
    handAnim: null,
    exitingUids: [],
    turnBeat: null,
    actingUid: null,
    toast: null,
  });
  persist("reward", run);
}

function finishActOrMap(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
) {
  const run = get().run;
  if (!run) return;
  const node = run.map.find((n) => n.id === run.currentNodeId);
  if (node?.type === "boss") {
    if (run.act === 1) {
      const rng = rngOf(run);
      run.act = 2;
      run.map = generateMap(2, rng);
      run.currentNodeId = null;
      run.visited = [];
      run.hp = Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * 0.3));
      run.rngState = rng.state;
      set(() => ({
        ...blankOverlays(),
        screen: "map",
        run: { ...run },
        toast: `${ACT_NAME[2]}已開`,
      }));
      persist("map", run);
      return;
    }
    const meta = { ...get().meta };
    meta.victories += 1;
    meta.bestAct = 2;
    meta.bestFloor = Math.max(meta.bestFloor, run.floor);
    saveMeta(meta);
    clearRun();
    set(() => ({ screen: "result", result: "win", run, meta, combat: null, reward: null, turnBeat: null }));
    sfx.win();
    return;
  }
  set(() => ({
    ...blankOverlays(),
    screen: "map",
    run: { ...run },
  }));
  persist("map", run);
}

function lose(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
) {
  const run = get().run;
  const meta = { ...get().meta };
  if (run) {
    meta.bestAct = Math.max(meta.bestAct, run.act);
    meta.bestFloor = Math.max(meta.bestFloor, run.floor);
    saveMeta(meta);
  }
  clearRun();
  sfx.lose();
  set({
    screen: "result",
    result: "lose",
    meta,
    combat: null,
    reward: null,
    turnBeat: null,
    actingUid: null,
    handAnim: null,
  });
}

function holdCombatEnd(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
  kind: "victory" | "defeat",
  settle = 920,
) {
  void (async () => {
    await wait(settle);
    if (get().combat?.phase !== kind) return;
    set({ turnBeat: kind === "victory" ? "win" : "lose", actingUid: null });
    if (kind === "victory") sfx.win();
    await wait(kind === "victory" ? 1480 : 1180);
    if (get().combat?.phase !== kind) return;
    if (kind === "victory") afterCombatVictory(set, get);
    else lose(set, get);
  })();
}

function commitPlay(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
  uid: string,
  targetId?: string,
) {
  const combat = get().combat;
  const run = get().run;
  if (!combat || !run || combat.phase !== "player") return;
  const card = combat.hand.find((c) => c.uid === uid);
  const next = playCard(structuredClone(combat), uid, targetId);
  if (next.selectedUid === uid) {
    set({ combat: next });
    return;
  }
  run.rngState = next.rngState;
  run.hp = next.playerHp;
  sfx.playCard();
  const isAttack = Boolean(card && CARDS[card.defId]?.type === "attack");
  set({
    combat: next,
    run: { ...run },
    lastPlayed: card ? { defId: card.defId, upgraded: card.upgraded, at: Date.now() } : get().lastPlayed,
    actingUid: isAttack ? "player" : null,
  });
  if (isAttack) {
    window.setTimeout(() => {
      if (get().actingUid === "player") set({ actingUid: null });
    }, 520);
  }
  if (next.phase === "victory") {
    holdCombatEnd(set, get, "victory", 980);
  } else if (next.phase === "defeat") {
    holdCombatEnd(set, get, "defeat", 640);
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function goAfterSelect(
  set: (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore,
  after: PendingSelect["after"],
) {
  const run = get().run;
  if (!run) return;
  if (after === "shop") {
    set({ screen: "shop", pending: null, run: { ...run } });
    persist("shop", run);
    return;
  }
  if (after === "rest") {
    finishActOrMap(set, get);
    return;
  }
  set({ ...blankOverlays(), screen: "map", run: { ...run } });
  persist("map", run);
}

export const useGame = create<GameStore>((set, get) => ({
  ready: false,
  screen: "title",
  run: null,
  combat: null,
  reward: null,
  shop: null,
  event: null,
  eventLog: null,
  pending: null,
  treasure: null,
  result: null,
  meta: loadMeta(),
  toast: null,
  deckOpen: false,
  helpOpen: false,
  confirmNew: false,
  inspect: null,
  lastPlayed: null,
  relicPulse: null,
  actingUid: null,
  handAnim: null,
  exitingUids: [],
  turnBeat: null,
  denyUid: null,
  denyAt: 0,

  hydrate() {
    const meta = loadMeta();
    const saved = loadRun();
    set({
      ready: true,
      meta,
      run: saved?.run ?? null,
      screen: "title",
      combat: null,
    });
  },

  newRun() {
    unlockAudio();
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const rng = new Rng(seed || xmur3("wendao"));
    const run: RunState = {
      seed,
      act: 1,
      hp: START_HP,
      maxHp: START_HP,
      gold: START_GOLD,
      maxEnergy: START_ENERGY,
      deck: [],
      relics: [],
      potions: Array.from({ length: POTION_SLOTS }, () => null),
      map: generateMap(1, rng),
      currentNodeId: null,
      visited: [],
      floor: 0,
      nextUid: 1,
      rngState: rng.state,
      kills: 0,
    };
    run.deck = makeDeck(run);
    const meta = { ...get().meta, runs: get().meta.runs + 1 };
    saveMeta(meta);
    clearRun();
    persist("map", run);
    set({
      ...blankOverlays(),
      screen: "map",
      run,
      meta,
      result: null,
      confirmNew: false,
    });
  },

  continueRun() {
    unlockAudio();
    const saved = loadRun() ?? (get().run ? { screen: "map" as Screen, run: get().run! } : null);
    if (!saved) return;
    const screen = saved.screen === "combat" || saved.screen === "result" ? "map" : saved.screen;
    set({
      ...blankOverlays(),
      run: saved.run,
      screen,
      result: null,
    });
  },

  abandon() {
    clearRun();
    set({
      ...blankOverlays(),
      screen: "title",
      run: null,
      result: null,
      confirmNew: false,
    });
  },

  chooseNode(id) {
    const run = get().run;
    if (!run) return;
    const open = reachableFrom(run.currentNodeId, run.map, run.visited);
    if (!open.includes(id)) return;
    sfx.map();
    enterNode(set, get, id);
  },

  selectCard(uid) {
    const combat = get().combat;
    if (!combat || combat.phase !== "player" || get().handAnim) return;
    if (combat.selectedUid === uid) {
      set({ combat: { ...combat, selectedUid: null } });
      return;
    }
    const card = combat.hand.find((c) => c.uid === uid);
    if (!card) return;
    const def = CARDS[card.defId];
    if (!def) return;
    if (!canPlayCard(combat, uid)) {
      const need = combat.freePlay ? 0 : def.cost;
      if (combat.energy < need) {
        sfx.deny();
        set({
          denyUid: uid,
          denyAt: Date.now(),
          combat: {
            ...combat,
            selectedUid: null,
            log: [`靈力不足 · 需${need}點`, ...combat.log].slice(0, 8),
          },
        });
      }
      return;
    }
    if (def.target === "enemy") {
      const live = combat.enemies.filter((e) => e.hp > 0);
      if (live.length === 1) {
        commitPlay(set, get, uid, live[0]!.uid);
        return;
      }
      sfx.select();
      set({ combat: { ...combat, selectedUid: uid }, denyUid: null });
      return;
    }
    commitPlay(set, get, uid);
  },

  playOnEnemy(enemyUid) {
    const combat = get().combat;
    if (!combat || combat.phase !== "player" || !combat.selectedUid || get().handAnim) return;
    commitPlay(set, get, combat.selectedUid, enemyUid);
  },

  playSelf(uid) {
    commitPlay(set, get, uid);
  },

  endTurn() {
    const combat0 = get().combat;
    const run = get().run;
    if (!combat0 || !run || combat0.phase !== "player") return;
    if (get().handAnim) return;
    sfx.endTurn();
    const leftover = combat0.hand.map((c) => c.uid);
    const combat = beginEnemyTurn(structuredClone(combat0), { discard: false });
    set({
      combat,
      handAnim: leftover.length ? "discard" : null,
      exitingUids: leftover,
      turnBeat: leftover.length ? null : "enemy",
    });
    if (leftover.length) sfx.discard();
    const enemies = [...combat.enemies];
    void (async () => {
      if (leftover.length) {
        await wait(560 + leftover.length * 75 + 180);
        const cur = get().combat;
        if (!cur || cur.phase === "victory" || cur.phase === "defeat") return;
        const dumped = structuredClone(cur);
        discardRemainingHand(dumped);
        set({ combat: dumped, exitingUids: [], handAnim: null, turnBeat: "enemy" });
      }
      await wait(760);

      for (const e of enemies) {
        const still = get().combat?.enemies.find((x) => x.uid === e.uid && x.hp > 0);
        if (!still) continue;
        set({ actingUid: e.uid, turnBeat: null });
        await wait(340);
        const cur = get().combat;
        if (!cur || cur.phase === "victory" || cur.phase === "defeat") return;
        const next = structuredClone(cur);
        const live = next.enemies.find((x) => x.uid === e.uid);
        if (live) resolveEnemy(next, live);
        checkTerminal(next);
        run.hp = next.playerHp;
        run.rngState = next.rngState;
        set({ combat: next, run: { ...run }, actingUid: e.uid });
        if (next.phase === "defeat") {
          holdCombatEnd(set, get, "defeat", 420);
          return;
        }
        if (next.phase === "victory") {
          holdCombatEnd(set, get, "victory", 420);
          return;
        }
        await wait(580);
        if (get().actingUid === e.uid) set({ actingUid: null });
        await wait(180);
      }

      await wait(220);
      set({ turnBeat: "player", actingUid: null });
      await wait(760);
      const cur = get().combat;
      if (!cur || cur.phase !== "enemy") return;
      const next = beginPlayerTurn(structuredClone(cur), { draw: false });
      run.hp = next.playerHp;
      run.rngState = next.rngState;
      set({ combat: next, run: { ...run }, handAnim: "draw", actingUid: null, turnBeat: null });
      if (next.phase === "defeat") {
        holdCombatEnd(set, get, "defeat", 200);
        return;
      }
      if (next.phase === "victory") {
        holdCombatEnd(set, get, "victory", 200);
        return;
      }

      const want = HAND_SIZE + next.extraDraw;
      for (let i = 0; i < want; i++) {
        await wait(i === 0 ? 240 : 240);
        const live = get().combat;
        if (!live || live.phase === "victory" || live.phase === "defeat") return;
        const drawn = structuredClone(live);
        const got = drawOneCard(drawn);
        if (!got) break;
        run.rngState = drawn.rngState;
        sfx.drawCard();
        set({ combat: drawn, run: { ...run } });
      }
      set({ handAnim: null });
    })();
  },

  usePotion(index) {
    const { combat, run } = get();
    if (!combat || !run || combat.phase !== "player" || get().handAnim) return;
    const id = run.potions[index];
    if (!id) return;
    const def = POTIONS[id];
    if (!def) return;
    const next = structuredClone(combat);
    def.use(next);
    if (run.relics.includes("qingnang")) healPlayer(next, 6);
    checkTerminal(next);
    run.potions[index] = null;
    run.hp = next.playerHp;
    sfx.potion();
    set({
      combat: next,
      run: { ...run },
      relicPulse: run.relics.includes("qingnang") ? "qingnang" : null,
      toast: `服下${def.name}`,
    });
    if (next.phase === "victory") holdCombatEnd(set, get, "victory", 560);
    else if (next.phase === "defeat") holdCombatEnd(set, get, "defeat", 480);
  },

  pickRewardCard(uid) {
    const { reward, run } = get();
    if (!reward || !run || reward.pickedCard) return;
    const card = reward.cards.find((c) => c.uid === uid);
    if (!card) return;
    run.deck.push({ uid: alloc(run), defId: card.defId, upgraded: card.upgraded });
    set({ reward: { ...reward, pickedCard: true }, run: { ...run }, toast: `習得 ${CARDS[card.defId]?.name ?? ""}` });
  },

  skipRewardCard() {
    const reward = get().reward;
    if (!reward || reward.pickedCard) return;
    set({ reward: { ...reward, pickedCard: true } });
  },

  takeRewardPotion() {
    const { reward, run } = get();
    if (!reward || !run || !reward.potion || reward.pickedPotion) return;
    if (!addPotion(run, reward.potion)) {
      set({ toast: "丹藥已滿" });
      return;
    }
    set({ reward: { ...reward, pickedPotion: true }, run: { ...run } });
  },

  takeRewardRelic() {
    const { reward, run } = get();
    if (!reward || !run || !reward.relic || reward.pickedRelic) return;
    applyRelicGain(run, reward.relic);
    sfx.relic();
    set({
      reward: { ...reward, pickedRelic: true },
      run: { ...run },
      relicPulse: reward.relic,
      toast: `獲得 ${RELICS[reward.relic]?.name ?? "法寶"}`,
    });
  },

  leaveReward() {
    const reward = get().reward;
    if (!reward) return;
    if (!reward.pickedCard) return;
    finishActOrMap(set, get);
  },

  buyShop(index) {
    const { shop, run } = get();
    if (!shop || !run) return;
    const offer = shop[index];
    if (!offer || offer.sold) return;
    if (run.gold < offer.price) {
      sfx.deny();
      set({ toast: `靈石不足 · 需${offer.price}` });
      return;
    }
    const name =
      offer.kind === "card"
        ? CARDS[offer.id]?.name
        : offer.kind === "relic"
          ? RELICS[offer.id]?.name
          : offer.kind === "potion"
            ? POTIONS[offer.id]?.name
            : "廢功";
    if (offer.kind === "card") {
      run.gold -= offer.price;
      run.deck.push({ uid: alloc(run), defId: offer.id, upgraded: false });
      offer.sold = true;
      sfx.playCard();
    } else if (offer.kind === "relic") {
      run.gold -= offer.price;
      applyRelicGain(run, offer.id);
      offer.sold = true;
      sfx.relic();
    } else if (offer.kind === "potion") {
      if (!addPotion(run, offer.id)) {
        sfx.deny();
        set({ toast: "丹藥已滿" });
        return;
      }
      run.gold -= offer.price;
      offer.sold = true;
      sfx.potion();
    } else if (offer.kind === "remove") {
      set({
        pending: {
          kind: "remove",
          title: "廢功",
          hint: "選擇要移除的功法",
          after: "shop",
        },
        screen: "select",
        run: { ...run },
      });
      return;
    }
    set({ shop: [...shop], run: { ...run }, toast: `購得 ${name ?? "貨"}` });
    sfx.gold();
  },

  leaveShop() {
    finishActOrMap(set, get);
  },

  restHeal() {
    const run = get().run;
    if (!run) return;
    const heal = Math.ceil(run.maxHp * 0.3) + (run.relics.includes("putuan") ? 12 : 0);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    if (run.relics.includes("buyun")) {
      addPotion(run, rollPotion(run));
    }
    set({ run: { ...run }, toast: `調息 · 回復${heal}` });
    finishActOrMap(set, get);
  },

  restUpgrade() {
    const run = get().run;
    if (!run) return;
    set({
      pending: { kind: "upgrade", title: "溫養", hint: "選擇要進境的功法", after: "rest" },
      screen: "select",
      run: { ...run },
    });
  },

  chooseEvent(choiceId) {
    const { event, run } = get();
    if (!event || !run || get().eventLog) return;
    const choice = event.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    const rng = rngOf(run);
    const result = choice.apply(run, rng, () => alloc(run));
    run.rngState = rng.state;
    if (result.select) {
      set({
        run: { ...run },
        eventLog: result.log,
        pending: {
          kind: result.select,
          title: result.select === "upgrade" ? "溫養" : "廢功",
          hint: result.select === "upgrade" ? "選擇要進境的功法" : "選擇要遺忘的功法",
          after: "map",
        },
        screen: "select",
      });
      return;
    }
    set({ run: { ...run }, eventLog: result.log, toast: result.log });
  },

  pickSelectCard(uid) {
    const { run, pending } = get();
    if (!run || !pending) return;
    const card = run.deck.find((c) => c.uid === uid);
    if (!card) return;
    if (pending.kind === "upgrade") {
      if (!canUpgrade(card)) return;
      card.upgraded = true;
      set({ run: { ...run }, toast: `${CARDS[card.defId]?.name ?? "功法"}進境` });
    } else if (pending.kind === "remove") {
      if (pending.after === "shop") {
        const shop = get().shop;
        const offer = shop?.find((o) => o.kind === "remove" && !o.sold);
        if (offer) {
          if (run.gold < offer.price) {
            sfx.deny();
            set({ toast: `靈石不足 · 需${offer.price}` });
            return;
          }
          run.gold -= offer.price;
          offer.sold = true;
        }
      }
      run.deck = run.deck.filter((c) => c.uid !== uid);
      set({ run: { ...run }, shop: get().shop ? [...get().shop!] : null, toast: "已廢此功" });
    } else if (pending.kind === "transform") {
      const pool = rewardPool();
      const rng = rngOf(run);
      const next = rng.pick(pool);
      card.defId = next.id;
      card.upgraded = false;
      run.rngState = rng.state;
      set({ run: { ...run }, toast: `化作 ${next.name}` });
    }
    goAfterSelect(set, get, pending.after);
  },

  cancelSelect() {
    const pending = get().pending;
    if (!pending) return;
    goAfterSelect(set, get, pending.after);
  },

  pickTreasure(id) {
    const run = get().run;
    if (!run) return;
    applyRelicGain(run, id);
    sfx.relic();
    set({ run: { ...run }, relicPulse: id, toast: `獲得 ${RELICS[id]?.name ?? "法寶"}` });
    finishActOrMap(set, get);
  },

  setDeckOpen(v) {
    set({ deckOpen: v });
  },
  setHelpOpen(v) {
    set({ helpOpen: v });
  },
  setConfirmNew(v) {
    set({ confirmNew: v });
  },
  setInspect(v) {
    set({ inspect: v });
  },
  dismissToast() {
    set({ toast: null });
  },
}));

