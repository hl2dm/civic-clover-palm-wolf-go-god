import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CARDS, previewDamage } from "@/lib/game/cards";
import { ENEMIES, intentLabel } from "@/lib/game/enemies";
import { spriteScale, type SpritePose } from "@/lib/game/sprites";
import { useGame } from "@/lib/game/store";
import type { EnemyInst, Floater } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import {
  BlockSeal,
  CombatToast,
  FxNums,
  HpPlaque,
  IntentMark,
  PileSeal,
  PreviewMark,
  TargetPlate,
  QiOrbs,
  StatusStamps,
} from "./BattleHud";
import { BodyFx } from "./BodyFx";
import { CombatFx, HitWrap, useCombatShake } from "./CombatFx";
import { PotionStrip, RelicRow } from "./Chrome";
import { SpriteActor } from "./SpriteActor";
import { TalismanCard } from "./TalismanCard";

export function CombatView() {
  const { combat, selectCard, playOnEnemy, endTurn, usePotion, actingUid, run, handAnim, exitingUids, lastPlayed, denyUid, denyAt, turnBeat } =
    useGame();
  const { offset, addTrauma } = useCombatShake();
  const seenUids = useRef(new Set<string>());
  const encounterKey = useRef("");
  const [freshUids, setFreshUids] = useState<string[]>([]);
  const [focusUid, setFocusUid] = useState<string | null>(null);
  const [aimHint, setAimHint] = useState(false);

  useEffect(() => {
    if (!combat) return;
    const onKey = (e: KeyboardEvent) => {
      const aimingNow = Boolean(combat.selectedUid) && combat.phase === "player" && !handAnim;
      const live = combat.enemies.filter((en) => en.hp > 0);
      if (e.key === "Escape") {
        if (combat.selectedUid) selectCard(combat.selectedUid);
        return;
      }
      if (aimingNow) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const uid = focusUid && live.some((en) => en.uid === focusUid) ? focusUid : live[0]?.uid;
          if (uid) playOnEnemy(uid);
          return;
        }
        const n = Number(e.key);
        if (n >= 1 && n <= live.length) {
          e.preventDefault();
          playOnEnemy(live[n - 1]!.uid);
          return;
        }
        return;
      }
      if (e.key === "e" || e.key === "E" || e.key === " ") {
        e.preventDefault();
        endTurn();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const card = combat.hand[n - 1];
        if (card) selectCard(card.uid);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combat, endTurn, selectCard, playOnEnemy, handAnim, focusUid]);

  useEffect(() => {
    if (!combat) return;
    const key = combat.enemies.map((e) => e.uid).join("|");
    if (encounterKey.current !== key) {
      encounterKey.current = key;
      seenUids.current = new Set(combat.hand.map((c) => c.uid));
      setFreshUids([]);
      return;
    }
    const incoming = combat.hand.filter((c) => !seenUids.current.has(c.uid)).map((c) => c.uid);
    if (!incoming.length) return;
    incoming.forEach((id) => seenUids.current.add(id));
    setFreshUids((prev) => [...prev, ...incoming]);
  }, [combat]);

  useEffect(() => {
    if (handAnim === "discard") setFreshUids([]);
  }, [handAnim]);

  useEffect(() => {
    if (!combat || combat.phase !== "player" || !combat.selectedUid || handAnim) {
      setFocusUid(null);
      setAimHint(false);
      return;
    }
    const live = combat.enemies.filter((e) => e.hp > 0);
    setFocusUid((cur) => (cur && live.some((e) => e.uid === cur) ? cur : pickThreat(live)?.uid ?? null));
    setAimHint(true);
    const t = window.setTimeout(() => setAimHint(false), 2000);
    return () => window.clearTimeout(t);
  }, [combat, handAnim]);

  if (!combat) return null;
  const locked = combat.phase !== "player" || Boolean(handAnim);
  const ended = combat.phase === "victory" || combat.phase === "defeat";
  const foes = ended ? combat.enemies : combat.enemies.filter((e) => e.hp > 0);
  const aiming = Boolean(combat.selectedUid) && !locked;
  const aimCard = aiming ? combat.hand.find((c) => c.uid === combat.selectedUid) : null;
  const aimDef = aimCard ? CARDS[aimCard.defId] : null;
  const aimName = aimDef?.name ?? null;
  const liveFocus =
    aiming && focusUid && foes.some((e) => e.uid === focusUid) ? focusUid : aiming ? (pickThreat(foes)?.uid ?? null) : null;

  return (
    <div className="relative min-h-[calc(100dvh-52px)] overflow-hidden">
      <img
        src={run?.act === 2 ? "/arena-jindan.jpg" : "/arena-qingming.jpg"}
        alt=""
        className="absolute inset-0 size-full object-cover object-[center_62%]"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-bg/50" />
      <div className="stage-floor pointer-events-none absolute inset-0" />

      <div
        className="relative mx-auto flex h-[calc(100dvh-52px)] w-full max-w-6xl flex-col"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <CombatFx addTrauma={addTrauma} />
        <CombatToast line={combat.log[0] ?? ""} pulse={denyAt} />
        {turnBeat ? (
          <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center">
            <div className={cn("turn-banner px-8 py-4 text-center", (turnBeat === "win" || turnBeat === "lose") && "turn-banner-end")}>
              <p className="display-ink text-xs tracking-[0.48em] text-paper/65">
                {turnBeat === "enemy" ? "殺機輪轉" : turnBeat === "player" ? "靈力回潮" : turnBeat === "win" ? "斬盡" : "氣散"}
              </p>
              <p className="display-ink mt-1 text-5xl leading-none text-paper sm:text-6xl">
                {turnBeat === "enemy" ? "敵手" : turnBeat === "player" ? "問道" : turnBeat === "win" ? "勝" : "敗"}
              </p>
            </div>
          </div>
        ) : null}

        <header className="combat-top z-10 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:px-5">
          <div className="space-y-1">
            <HpPlaque name="問道人" hp={combat.playerHp} max={combat.playerMaxHp} compact />
            <div className="flex flex-wrap items-center gap-2">
              <QiOrbs energy={combat.energy} max={combat.maxEnergy} starve={denyAt} />
              <BlockSeal value={combat.playerBlock} />
            </div>
            <StatusStamps statuses={combat.playerStatuses} />
          </div>
          <div className="text-center">
            <p className="display-ink text-sm tracking-[0.35em] text-muted">
              {locked ? "敵手" : "問道"}
            </p>
            <p className="qi-num qi-num-hp text-3xl leading-none sm:text-4xl">{combat.turn}</p>
            <p className="display-ink mt-0.5 text-xs tracking-[0.28em] text-muted">回合</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {foes.map((e) => (
              <div key={e.uid} className="space-y-1">
                <HpPlaque
                  name={ENEMIES[e.defId]?.name ?? "敵"}
                  hp={e.hp}
                  max={e.maxHp}
                  align="right"
                  compact
                />
                <div className="flex justify-end">
                  <IntentMark label={intentLabel(e.intent)} />
                </div>
                <StatusStamps statuses={e.statuses} />
              </div>
            ))}
          </div>
        </header>

        <div
          className="relative flex min-h-0 flex-1 items-stretch justify-between gap-2 overflow-hidden px-2 pb-2 pt-6 sm:px-8 sm:pt-8"
          data-aiming={aiming ? "1" : "0"}
        >
          {aiming ? (
            <button
              type="button"
              className="aim-veil absolute inset-0 z-10"
              aria-label="取消擇敵"
              onClick={() => {
                if (combat.selectedUid) selectCard(combat.selectedUid);
              }}
            />
          ) : null}
          {aiming ? (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex flex-col items-center gap-1">
              <div className="aim-banner flex items-center gap-3 px-3 py-1.5 sm:px-4">
                <p className="display-ink text-sm tracking-[0.18em] text-paper sm:text-lg">
                  擇敵 · {aimName}
                </p>
                <button
                  type="button"
                  className="pointer-events-auto display-ink text-xs tracking-[0.24em] text-muted sm:text-sm"
                  onClick={() => {
                    if (combat.selectedUid) selectCard(combat.selectedUid);
                  }}
                >
                  取消
                </button>
              </div>
              {aimHint ? (
                <p className="hint-fade hidden display-ink text-xs tracking-[0.22em] text-paper/80 sm:block sm:text-sm">
                  點其身或按 {foes.map((_, i) => i + 1).join(" ")} · 空白斬之
                </p>
              ) : null}
            </div>
          ) : null}
          <div className={cn("relative z-10 flex items-end pl-2 sm:pl-8", aiming && "pointer-events-none opacity-50")}>
            <Figure
              targetId="player"
              defId="player"
              facing="right"
              hp={combat.playerHp}
              block={combat.playerBlock}
              wound={beastWound(combat.enemies) ? "claw" : "slash"}
              acting={actingUid === "player"}
              pulse={lastPlayed?.at ?? 0}
              floaters={combat.floaters.filter((f) => f.target === "player")}
            />
          </div>
          <div
            className={cn(
              "relative z-20 flex min-w-0 flex-1 items-stretch",
              foes.length > 1
                ? "grid grid-cols-2 justify-items-stretch gap-1 sm:flex sm:justify-end sm:gap-10"
                : "justify-end",
            )}
          >
            {combat.enemies.map((e) => {
              const liveIndex = foes.findIndex((f) => f.uid === e.uid);
              return (
                <EnemyFigure
                  key={e.uid}
                  enemy={e}
                  index={liveIndex}
                  aiming={aiming}
                  focused={aiming && liveFocus === e.uid}
                  preview={
                    combat.selectedUid ? previewSelected(combat, e, combat.selectedUid) : null
                  }
                  acting={actingUid === e.uid}
                  crowded={foes.length > 1}
                  floaters={combat.floaters.filter((f) => f.target === e.uid)}
                  onHover={() => {
                    if (aiming && e.hp > 0) setFocusUid(e.uid);
                  }}
                  onClick={() => {
                    if (aiming) playOnEnemy(e.uid);
                  }}
                />
              );
            })}
          </div>
        </div>

        <footer className="combat-dock z-10 shrink-0 space-y-2 overflow-visible px-3 pb-3 pt-2 sm:pb-4">
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <RelicRow compact />
            <PotionStrip onUse={locked ? undefined : usePotion} />
            <div className="flex items-end gap-2">
              <PileSeal label="牌庫" count={combat.drawPile.length} pulse={handAnim === "draw"} />
              <PileSeal label="棄牌" count={combat.discardPile.length} pulse={handAnim === "discard"} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div
              data-hand-rail
              data-hand-count={combat.hand.length}
              data-hand-anim={handAnim ?? "idle"}
              className="relative -mx-1 flex h-[13rem] min-w-0 flex-1 items-end justify-center gap-1.5 overflow-x-auto px-1 pb-1 pt-7 sm:h-[17.25rem] sm:gap-2 sm:pt-8"
            >
              {combat.hand.map((card, i) => {
                const def = CARDS[card.defId];
                const shortQi = Boolean(def && !combat.freePlay && combat.energy < def.cost);
                const unaffordable = !def || shortQi || locked;
                const discarding = exitingUids.includes(card.uid);
                const drawing = freshUids.includes(card.uid);
                const otherWhileAim = aiming && combat.selectedUid !== card.uid;
                return (
                  <TalismanCard
                    key={denyUid === card.uid ? `${card.uid}-${denyAt}` : card.uid}
                    card={card}
                    selected={combat.selectedUid === card.uid}
                    dimmed={(unaffordable && !discarding) || otherWhileAim}
                    disabled={locked}
                    costOverride={combat.freePlay ? 0 : undefined}
                    motion={discarding ? "discard" : drawing ? "draw" : "idle"}
                    delayMs={discarding ? i * 75 : 0}
                    shortQi={shortQi && !locked}
                    starved={denyUid === card.uid}
                    onClick={() => selectCard(card.uid)}
                  />
                );
              })}
            </div>
            <Button
              size="lg"
              variant="primary"
              disabled={locked}
              onClick={endTurn}
              className="mb-1 h-16 w-16 shrink-0 rounded-full px-0 sm:h-20 sm:w-20"
            >
              <span className="display-ink text-base leading-tight sm:text-lg">
                {locked ? "敵手" : "結束"}
              </span>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function pickThreat(enemies: EnemyInst[]): EnemyInst | undefined {
  const live = enemies.filter((e) => e.hp > 0);
  if (!live.length) return undefined;
  return [...live].sort((a, b) => {
    const av = a.intent.kind.startsWith("attack") ? a.intent.value : 0;
    const bv = b.intent.kind.startsWith("attack") ? b.intent.value : 0;
    if (bv !== av) return bv - av;
    return a.hp - b.hp;
  })[0];
}

function beastWound(enemies: EnemyInst[]): boolean {
  const beasts = new Set(["shanxiao", "lingshe", "huoya", "juyuan"]);
  return enemies.some((e) => e.hp > 0 && beasts.has(e.defId));
}

function previewSelected(
  combat: NonNullable<ReturnType<typeof useGame.getState>["combat"]>,
  enemy: EnemyInst,
  uid: string,
) {
  const card = combat.hand.find((c) => c.uid === uid);
  if (!card) return null;
  return previewDamage(combat, card.defId, card.upgraded, enemy);
}

function usePose(acting: boolean, hp: number, pulse = 0): SpritePose {
  const prevHp = useRef(hp);
  const [pose, setPose] = useState<SpritePose>(hp <= 0 ? "hurt" : "idle");

  useEffect(() => {
    if (hp < prevHp.current) {
      setPose("hurt");
      const t = window.setTimeout(() => setPose(hp <= 0 ? "hurt" : "idle"), 320);
      prevHp.current = hp;
      return () => window.clearTimeout(t);
    }
    prevHp.current = hp;
    if (hp <= 0) setPose("hurt");
  }, [hp]);

  useEffect(() => {
    if (!acting) return;
    setPose("attack");
    const t = window.setTimeout(() => setPose(hp <= 0 ? "hurt" : "idle"), 480);
    return () => window.clearTimeout(t);
  }, [acting, pulse, hp]);

  return hp <= 0 && pose !== "attack" ? "hurt" : pose;
}

function Figure({
  targetId,
  defId,
  hp,
  block,
  acting,
  pulse,
  floaters,
  preview,
  selected,
  onClick,
  facing = "left",
  wound = "slash",
  size,
}: {
  targetId: string;
  defId: string;
  hp: number;
  block: number;
  acting: boolean;
  pulse?: number;
  floaters: Floater[];
  preview?: number | null;
  selected?: boolean;
  onClick?: () => void;
  facing?: "left" | "right";
  wound?: "slash" | "claw";
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const pose = usePose(acting, hp, pulse);
  const Comp = onClick ? "button" : "div";
  return (
    <HitWrap targetId={targetId} className="relative">
      <Comp
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "relative flex flex-col items-center text-left",
          selected && onClick && "foe-focus",
        )}
      >
        <div className="relative">
          <SpriteActor defId={defId} pose={pose} size={size ?? spriteScale(defId)} facing={facing} />
          <BodyFx hp={hp} block={block} wound={wound} />
          <span className="pointer-events-none absolute inset-x-6 bottom-1 h-3 rounded-[100%] bg-bg/50 blur-[3px]" />
          {block > 0 ? (
            <div className="absolute right-0 top-2 z-20">
              <BlockSeal value={block} />
            </div>
          ) : null}
          {preview != null && !onClick ? (
            <div className="absolute left-1 top-2 z-20">
              <PreviewMark value={preview} />
            </div>
          ) : null}
          <FxNums items={floaters} />
        </div>
      </Comp>
    </HitWrap>
  );
}

function EnemyFigure({
  enemy,
  index,
  aiming,
  focused,
  preview,
  acting,
  crowded,
  floaters,
  onClick,
  onHover,
}: {
  enemy: EnemyInst;
  index: number;
  aiming: boolean;
  focused: boolean;
  preview: number | null;
  acting: boolean;
  crowded: boolean;
  floaters: Floater[];
  onClick: () => void;
  onHover: () => void;
}) {
  const pose = usePose(acting, enemy.hp);
  const def = ENEMIES[enemy.defId];
  if (!def) return null;
  const dead = enemy.hp <= 0;
  const size = crowdScale(spriteScale(enemy.defId), crowded);
  return (
    <HitWrap targetId={enemy.uid} className={cn("relative h-full min-h-0", aiming && focused && "z-10", dead && "foe-fall")}>
      <button
        type="button"
        data-foe={enemy.uid}
        data-target-index={index + 1}
        onClick={aiming && !dead ? onClick : undefined}
        onMouseEnter={aiming && !dead ? onHover : undefined}
        onFocus={aiming && !dead ? onHover : undefined}
        className={cn(
          "relative flex h-full min-h-0 flex-col items-center justify-end gap-1 text-left",
          aiming && !dead && "target-lock",
          aiming && focused && !dead && "foe-focus",
          aiming && !focused && !dead && "foe-wait",
          dead && "pointer-events-none",
        )}
      >
        {aiming && !dead ? (
          <div className="absolute left-1/2 top-1 z-30 -translate-x-1/2">
            <TargetPlate index={index} name={def.name} damage={preview} focused={focused} />
          </div>
        ) : !dead ? (
          <div className="pointer-events-none absolute left-1/2 top-1 z-30 -translate-x-1/2">
            <IntentMark label={intentLabel(enemy.intent)} size="lg" />
          </div>
        ) : null}
        <div className="relative">
          <SpriteActor defId={enemy.defId} pose={pose} size={size} facing="left" />
          <BodyFx hp={enemy.hp} block={enemy.block} wound="slash" />
          <span className="pointer-events-none absolute inset-x-6 bottom-1 h-3 rounded-[100%] bg-bg/50 blur-[3px]" />
          {enemy.block > 0 ? (
            <div className="absolute right-0 top-2 z-20">
              <BlockSeal value={enemy.block} />
            </div>
          ) : null}
          <FxNums items={floaters} />
        </div>
      </button>
    </HitWrap>
  );
}

function crowdScale(
  size: "sm" | "md" | "lg" | "xl",
  crowded: boolean,
): "sm" | "md" | "lg" | "xl" {
  if (!crowded) return size;
  if (size === "xl") return "lg";
  if (size === "lg") return "md";
  return "sm";
}
