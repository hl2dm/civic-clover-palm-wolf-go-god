import { CARDS, cardCost, tickStartPowers } from "./cards";
import { ACT1_COMBAT, ACT2_COMBAT, ELITES, ENEMIES, scaleHp } from "./enemies";
import {
  addStatus,
  aliveEnemies,
  damageAllEnemies,
  decayTimed,
  drawCards,
  gainBlock,
  getStatus,
  healPlayer,
  pushLog,
  rngFrom,
  syncRng,
} from "./engine";
import { Rng } from "./rng";
import type { CardInst, CombatState, EnemyInst, NodeType, RunState } from "./types";
import { HAND_SIZE } from "./types";

function copyCard(card: CardInst, alloc: () => string): CardInst {
  return { uid: alloc(), defId: card.defId, upgraded: card.upgraded };
}

export function rollEncounter(type: NodeType, act: 1 | 2, rng: Rng, layer = 1): string[] {
  if (type === "boss") return [act === 1 ? "zhuji" : "jindan"];
  if (type === "elite") return [rng.pick(ELITES)];
  if (type === "combat" && layer === 0) return act === 1 ? ["shanxiao"] : ["yeshou"];
  const table = act === 1 ? ACT1_COMBAT : ACT2_COMBAT;
  return [...rng.pick(table)];
}

export function startCombat(run: RunState, encounter: string[], alloc: () => string): CombatState {
  const rng = new Rng(run.rngState);
  const drawPile = rng.shuffle(run.deck.map((c) => copyCard(c, alloc)));
  const enemies: EnemyInst[] = encounter.map((id) => {
    const def = ENEMIES[id]!;
    const maxHp = scaleHp(def.maxHp, run.act);
    const inst: EnemyInst = {
      uid: alloc(),
      defId: id,
      hp: maxHp,
      maxHp,
      block: 0,
      statuses: [],
      intent: def.pickIntent(
        {
          uid: "",
          defId: id,
          hp: maxHp,
          maxHp,
          block: 0,
          statuses: [],
          intent: { kind: "attack", value: 0 },
          patternIndex: 0,
        },
        0,
      ),
      patternIndex: 0,
    };
    inst.intent = def.pickIntent(inst, 0);
    return inst;
  });

  const combat: CombatState = {
    phase: "player",
    turn: 1,
    energy: run.maxEnergy,
    maxEnergy: run.maxEnergy,
    playerBlock: run.relics.includes("julingfan") ? 4 : 0,
    playerHp: run.hp,
    playerMaxHp: run.maxHp,
    playerStatuses: [],
    enemies,
    hand: [],
    drawPile,
    discardPile: [],
    exhaustPile: [],
    powers: [],
    selectedUid: null,
    rngState: rng.state,
    floaters: [],
    log: ["殺機已現。"],
    cardsPlayed: 0,
    heartUsed: false,
    relics: [...run.relics],
    extraDraw: 0,
    freePlay: run.relics.includes("shuangwen"),
    lieboArmed: true,
  };

  if (run.relics.includes("xueyu")) {
    combat.playerHp = Math.max(1, combat.playerHp - 3);
    addStatus(combat.playerStatuses, "strength", 1);
  }
  if (run.relics.includes("jianqiao")) {
    addStatus(combat.playerStatuses, "nextStrike", 5);
  }
  if (run.relics.includes("kongming")) {
    combat.energy += 1;
  }
  if (run.relics.includes("zhenhun")) {
    for (const e of combat.enemies) {
      const def = ENEMIES[e.defId];
      if (def?.isElite || def?.isBoss) {
        e.maxHp = Math.max(1, e.maxHp - 10);
        e.hp = e.maxHp;
      }
    }
  }

  const drawN = HAND_SIZE + (run.relics.includes("dinghun") ? 1 : 0);
  drawCards(combat, drawN, rng);
  syncRng(combat, rng);
  return combat;
}

export function canPlayCard(c: CombatState, uid: string): boolean {
  if (c.phase !== "player") return false;
  const card = c.hand.find((x) => x.uid === uid);
  if (!card) return false;
  const def = CARDS[card.defId];
  if (!def) return false;
  return c.energy >= effectiveCost(c, def);
}

function effectiveCost(c: CombatState, def: { cost: number }): number {
  return c.freePlay ? 0 : cardCost(def as import("./catalog-types").CardDef);
}

export function playCard(c: CombatState, uid: string, targetId?: string): CombatState {
  if (!canPlayCard(c, uid)) return c;
  const card = c.hand.find((x) => x.uid === uid)!;
  const def = CARDS[card.defId]!;
  if (def.target === "enemy" && !c.enemies.some((e) => e.uid === targetId && e.hp > 0)) {
    return { ...c, selectedUid: uid };
  }

  const killedBefore = c.enemies.filter((e) => e.hp <= 0).map((e) => e.uid);
  c.energy -= effectiveCost(c, def);
  if (c.freePlay) c.freePlay = false;
  c.hand = c.hand.filter((x) => x.uid !== uid);
  c.selectedUid = null;
  c.cardsPlayed += 1;
  def.play(c, card.upgraded, targetId);
  if (def.type === "attack" && c.relics.includes("chilian")) {
    gainBlock(c, 2);
  }
  if (c.relics.includes("mofu") && c.cardsPlayed > 0 && c.cardsPlayed % 3 === 0) {
    damageAllEnemies(c, 4);
    pushLog(c, "墨符齊出");
  }
  if (def.type === "power") {
    /* already recorded inside play for most powers */
  } else if (def.exhaust) {
    c.exhaustPile.push(card);
  } else {
    c.discardPile.push(card);
  }
  if (c.relics.includes("xuepo")) {
    const newlyDead = c.enemies.filter((e) => e.hp <= 0 && !killedBefore.includes(e.uid));
    if (newlyDead.length) healPlayer(c, 3 * newlyDead.length);
  }
  checkTerminal(c);
  return c;
}

export function checkTerminal(c: CombatState): void {
  if (c.playerHp <= 0) {
    c.phase = "defeat";
    pushLog(c, "氣血斷絕。");
    return;
  }
  if (aliveEnemies(c).length === 0) {
    c.phase = "victory";
    pushLog(c, "敵人已伏。");
  }
}

export function beginEnemyTurn(c: CombatState, opts?: { discard?: boolean }): CombatState {
  c.phase = "enemy";
  c.selectedUid = null;
  if (opts?.discard !== false) {
    for (const card of c.hand) c.discardPile.push(card);
    c.hand = [];
  }
  decayTimed(c.playerStatuses);
  return c;
}

export function resolveEnemy(c: CombatState, enemy: EnemyInst): void {
  if (enemy.hp <= 0 || c.phase === "defeat") return;
  enemy.block = 0;
  const poison = getStatus(enemy.statuses, "poison");
  if (poison > 0) {
    enemy.hp = Math.max(0, enemy.hp - poison);
    addStatus(enemy.statuses, "poison", -1);
  }
  if (enemy.hp <= 0) return;
  const def = ENEMIES[enemy.defId];
  if (!def) return;
  def.act(c, enemy);
  decayTimed(enemy.statuses);
  enemy.patternIndex += 1;
  enemy.intent = def.pickIntent(enemy, enemy.patternIndex);
  checkTerminal(c);
}

export function beginPlayerTurn(c: CombatState, opts?: { draw?: boolean }): CombatState {
  if (c.phase === "victory" || c.phase === "defeat") return c;
  c.turn += 1;
  c.playerBlock = 0;
  c.energy = c.maxEnergy;
  c.freePlay = c.relics.includes("shuangwen");
  c.lieboArmed = true;

  const poison = getStatus(c.playerStatuses, "poison");
  if (poison > 0) {
    c.playerHp = Math.max(0, c.playerHp - poison);
    addStatus(c.playerStatuses, "poison", -1);
  }
  if (c.playerHp <= 0) {
    c.phase = "defeat";
    return c;
  }
  const regen = getStatus(c.playerStatuses, "regen");
  if (regen > 0) c.playerHp = Math.min(c.playerMaxHp, c.playerHp + regen);

  tickStartPowers(c);
  if (c.playerHp <= 0) {
    c.phase = "defeat";
    return c;
  }
  if (aliveEnemies(c).length === 0) {
    c.phase = "victory";
    return c;
  }
  c.phase = "player";

  if (opts?.draw !== false) {
    const rng = rngFrom(c);
    drawCards(c, HAND_SIZE + c.extraDraw, rng);
    syncRng(c, rng);
  }
  return c;
}

export function discardRemainingHand(c: CombatState): void {
  for (const card of c.hand) c.discardPile.push(card);
  c.hand = [];
  c.selectedUid = null;
}

export function drawOneCard(c: CombatState): boolean {
  const before = c.hand.length;
  if (before >= 10) return false;
  const rng = rngFrom(c);
  drawCards(c, 1, rng);
  syncRng(c, rng);
  return c.hand.length > before;
}

export function discardToDraw(c: CombatState, uid: string): void {
  // reserved
  void c;
  void uid;
}
