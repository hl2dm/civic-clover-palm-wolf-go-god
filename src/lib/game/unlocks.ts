import { CARD_LIST } from "./cards";
import { ENEMIES } from "./enemies";
import { EVENTS } from "./events";
import { FEATS, INCENSE, PATHS, REALMS, realmAt, type RealmDef } from "./meta";
import { RELIC_LIST } from "./relics";
import type { MetaState } from "./types";

export type UnlockKind = "foe" | "event" | "card" | "relic" | "incense" | "path";

export interface UnlockBit {
  id: string;
  name: string;
  kind: UnlockKind;
  src?: string;
  hint?: string;
}

export interface UnlockRow {
  realm: RealmDef;
  bits: UnlockBit[];
}

function belongsTo(unlock: string | undefined, realm: RealmDef): boolean {
  if (realm.id === "fan") return false;
  return unlock === realm.id;
}

export function unlockRows(): UnlockRow[] {
  return REALMS.map((realm) => {
    const bits: UnlockBit[] = [
      ...Object.values(ENEMIES)
        .filter((e) => belongsTo(e.unlock, realm))
        .map((e) => ({ id: e.id, name: e.name, kind: "foe" as const, src: e.portrait })),
      ...EVENTS.filter((e) => belongsTo(e.unlock, realm)).map((e) => ({
        id: e.id,
        name: e.title,
        kind: "event" as const,
        src: e.figure,
      })),
      ...CARD_LIST.filter((c) => c.unlock && belongsTo(c.unlock, realm)).map((c) => ({
        id: c.id,
        name: c.name,
        kind: "card" as const,
        src: `/cards/faces/${c.id}.png?v=4`,
      })),
      ...RELIC_LIST.filter((r) => r.unlock && belongsTo(r.unlock, realm)).map((r) => ({
        id: r.id,
        name: r.name,
        kind: "relic" as const,
        src: `/items/relics/${r.id}.png?v=1`,
      })),
      ...INCENSE.filter((i) => (realm.id === "fan" ? !i.need : i.need === realm.id)).map((i) => ({
        id: i.id,
        name: i.name,
        kind: "incense" as const,
        src: `/items/incense/${i.id}.png?v=1`,
        hint: i.text,
      })),
      ...PATHS.filter((p) => (realm.id === "fan" ? !p.need : p.need === realm.id)).map((p) => ({
        id: p.id,
        name: p.name,
        kind: "path" as const,
        src: `/items/paths/${p.id}.png?v=1`,
        hint: p.hint,
      })),
    ];
    return { realm, bits };
  });
}

export function nextUnlock(meta: MetaState): { realm: RealmDef; remain: number; bits: UnlockBit[] } | null {
  const next = REALMS.find((r) => r.xp > meta.xp);
  if (!next) return null;
  const row = unlockRows().find((r) => r.realm.id === next.id);
  return { realm: next, remain: next.xp - meta.xp, bits: (row?.bits ?? []).slice(0, 6) };
}

export function remainTo(meta: MetaState, realm: RealmDef): number {
  return Math.max(0, realm.xp - meta.xp);
}

export function currentRealmLine(meta: MetaState): string {
  const cur = realmAt(meta.xp);
  const n = nextUnlock(meta);
  if (!n) return `${cur.name} · 已至元嬰`;
  return `${cur.name} · 距${n.realm.name}差 ${n.remain} 悟`;
}

export function featRemain(meta: MetaState, id: string): string | null {
  const f = FEATS.find((x) => x.id === id);
  if (!f || f.check(meta)) return null;
  const seen = meta.seen?.length ?? 0;
  const cards = meta.seenCards?.length ?? 0;
  if (id === "bestiary") return `還差 ${Math.max(0, 16 - seen)} 種敵手`;
  if (id === "slayer") return `還差 ${Math.max(0, 50 - (meta.totalKills ?? 0))} 斬`;
  if (id === "collector") return `還差 ${Math.max(0, 12 - cards)} 門功法`;
  if (id === "act1") return (meta.bestAct ?? 0) >= 2 ? "已過第一境" : "需先過第一境";
  if (id === "act2") return (meta.bestAct ?? 0) >= 3 ? "已過第二境" : "需先過第二境";
  if (id === "win") return "需擊敗元嬰真君";
  if (id === "calamity") return "需在一劫以上渡劫";
  if (id === "elite") return "需擊殺一名精英";
  if (id === "incense") return "需上香一次";
  if (id === "first-step") return "需踏上第一途";
  if (id === "first-blood") return "需斬殺一名敵手";
  return "未成";
}

export const KIND_LABEL: Record<UnlockKind, string> = {
  foe: "敵手",
  event: "奇遇",
  card: "功法",
  relic: "法寶",
  incense: "香火",
  path: "道路",
};
