import type { CombatState, EnemyInst, Floater, Status, StatusId } from "./types";
import { Rng } from "./rng";

let floaterSeq = 0;

export function getStatus(list: Status[], id: StatusId): number {
  return list.find((s) => s.id === id)?.stacks ?? 0;
}

export function addStatus(list: Status[], id: StatusId, stacks: number): void {
  if (stacks === 0) return;
  const existing = list.find((s) => s.id === id);
  if (existing) existing.stacks += stacks;
  else list.push({ id, stacks });
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0 && (list[i]?.stacks ?? 0) <= 0) list.splice(i, 1);
}

export function clearDebuffs(list: Status[]): void {
  const keep: StatusId[] = [
    "strength",
    "dexterity",
    "thorns",
    "regen",
    "nextStrike",
    "metallicize",
  ];
  for (let i = list.length - 1; i >= 0; i--) {
    if (!keep.includes(list[i]!.id)) list.splice(i, 1);
  }
}

export function decayTimed(list: Status[]): void {
  const timed: StatusId[] = ["vulnerable", "weak", "frail"];
  for (const id of timed) {
    const s = list.find((x) => x.id === id);
    if (s) s.stacks -= 1;
  }
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]!.stacks <= 0) list.splice(i, 1);
  }
}

export function pushLog(c: CombatState, line: string): void {
  c.log = [line, ...c.log].slice(0, 8);
}

export function pushFloater(
  c: CombatState,
  text: string,
  kind: Floater["kind"],
  target: Floater["target"],
): void {
  floaterSeq += 1;
  c.floaters = [
    ...c.floaters.slice(-8),
    { id: `f${floaterSeq}`, text, kind, target },
  ];
}

export function aliveEnemies(c: CombatState): EnemyInst[] {
  return c.enemies.filter((e) => e.hp > 0);
}

export function findEnemy(c: CombatState, uid?: string): EnemyInst | undefined {
  if (uid) return c.enemies.find((e) => e.uid === uid && e.hp > 0);
  return aliveEnemies(c)[0];
}

export function outgoingPlayerDamage(c: CombatState, raw: number, enemy: EnemyInst): number {
  let dmg = raw + getStatus(c.playerStatuses, "strength") + getStatus(c.playerStatuses, "nextStrike");
  if (getStatus(c.playerStatuses, "weak") > 0) dmg = Math.floor(dmg * 0.75);
  if (getStatus(enemy.statuses, "vulnerable") > 0) dmg = Math.floor(dmg * 1.5);
  return Math.max(0, dmg);
}

export function incomingPlayerDamage(c: CombatState, raw: number, isAttack: boolean): number {
  let dmg = raw;
  if (isAttack && getStatus(c.playerStatuses, "vulnerable") > 0) dmg = Math.floor(dmg * 1.5);
  if (isAttack && c.relics.includes("bifuh")) dmg = Math.max(0, dmg - 1);
  return Math.max(0, dmg);
}

export function gainBlock(c: CombatState, raw: number): void {
  let block = raw + getStatus(c.playerStatuses, "dexterity");
  if (getStatus(c.playerStatuses, "frail") > 0) block = Math.floor(block * 0.75);
  if (block <= 0) return;
  c.playerBlock += block;
  pushFloater(c, `+${block}`, "block", "player");
}

export function healPlayer(c: CombatState, amount: number): void {
  const before = c.playerHp;
  c.playerHp = Math.min(c.playerMaxHp, c.playerHp + amount);
  const gained = c.playerHp - before;
  if (gained > 0) {
    pushFloater(c, `+${gained}`, "heal", "player");
    pushLog(c, `回復 ${gained} 點氣血`);
  }
}

export function damageEnemy(c: CombatState, enemy: EnemyInst, raw: number, opts?: { ignoreStr?: boolean }): void {
  const dmg = opts?.ignoreStr
    ? Math.max(
        0,
        getStatus(enemy.statuses, "vulnerable") > 0 ? Math.floor(raw * 1.5) : raw,
      )
    : outgoingPlayerDamage(c, raw, enemy);
  if (dmg <= 0) return;
  const blocked = Math.min(enemy.block, dmg);
  enemy.block -= blocked;
  const hpLoss = dmg - blocked;
  enemy.hp = Math.max(0, enemy.hp - hpLoss);
  pushFloater(c, `${dmg}`, "dmg", enemy.uid);
  const thorns = getStatus(enemy.statuses, "thorns");
  if (thorns > 0) damagePlayer(c, thorns, false);
}

export function damageAllEnemies(c: CombatState, raw: number): void {
  for (const e of aliveEnemies(c)) damageEnemy(c, e, raw);
}

export function damagePlayer(c: CombatState, raw: number, isAttack: boolean): void {
  const dmg = incomingPlayerDamage(c, raw, isAttack);
  if (dmg <= 0) return;
  const blocked = Math.min(c.playerBlock, dmg);
  c.playerBlock -= blocked;
  const hpLoss = dmg - blocked;
  c.playerHp = Math.max(0, c.playerHp - hpLoss);
  if (hpLoss > 0) {
    pushFloater(c, `${hpLoss}`, "dmg", "player");
    if (c.relics.includes("liebo") && c.lieboArmed) {
      addStatus(c.playerStatuses, "strength", 1);
      c.lieboArmed = false;
      pushLog(c, "裂帛帶驟緊，劍意暴起");
    }
  }
  if (c.playerHp <= 0 && c.relics.includes("huxin") && !c.heartUsed) {
    c.playerHp = 1;
    c.heartUsed = true;
    pushLog(c, "護心鏡碎裂，你勉強保住一絲氣血");
  }
}

export function consumeNextStrike(c: CombatState): void {
  const s = c.playerStatuses.find((x) => x.id === "nextStrike");
  if (s) {
    const i = c.playerStatuses.indexOf(s);
    c.playerStatuses.splice(i, 1);
  }
}

export function drawCards(c: CombatState, n: number, rng: Rng): void {
  for (let i = 0; i < n; i++) {
    if (c.hand.length >= 10) break;
    if (c.drawPile.length === 0) {
      if (c.discardPile.length === 0) break;
      c.drawPile = rng.shuffle(c.discardPile.splice(0));
    }
    const card = c.drawPile.pop();
    if (card) c.hand.push(card);
  }
}

export function rngFrom(c: CombatState): Rng {
  return new Rng(c.rngState);
}

export function syncRng(c: CombatState, rng: Rng): void {
  c.rngState = rng.state;
}

export const STATUS_LABEL: Record<StatusId, string> = {
  strength: "劍意",
  dexterity: "身法",
  vulnerable: "破防",
  weak: "虛弱",
  frail: "脆弱",
  poison: "蝕骨",
  thorns: "反傷",
  regen: "回春",
  nextStrike: "蓄勢",
  metallicize: "金身",
};
