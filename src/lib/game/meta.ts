import type { MetaState } from "./types";

export interface RealmDef {
  id: string;
  name: string;
  xp: number;
  hint: string;
}

export interface IncenseDef {
  id: string;
  name: string;
  cost: number;
  max: number;
  text: string;
  need?: string;
}

export interface PathDef {
  id: string;
  name: string;
  hint: string;
  need?: string;
}

export interface CalamityDef {
  rank: number;
  name: string;
  hint: string;
}

export interface FeatDef {
  id: string;
  name: string;
  hint: string;
  merit: number;
  check: (m: MetaState) => boolean;
}

export const REALMS: RealmDef[] = [
  { id: "fan", name: "凡體", xp: 0, hint: "初入青山" },
  { id: "lianqi", name: "煉氣", xp: 80, hint: "霧姬現世，古碑可讀" },
  { id: "zhuji", name: "築基", xp: 220, hint: "劍塚殘兵願與你對談" },
  { id: "jindan", name: "金丹", xp: 450, hint: "狐仙入夢，天問可悟" },
  { id: "yuanying", name: "元嬰", xp: 800, hint: "天外墜星，一劍封喉" },
];

export const INCENSE: IncenseDef[] = [
  { id: "houtu", name: "厚土訣", cost: 40, max: 3, text: "每階起始氣血 +6" },
  { id: "nangzhong", name: "囊中金", cost: 35, max: 3, text: "每階起始靈石 +22" },
  { id: "danyuan", name: "丹緣", cost: 55, max: 1, text: "開局攜一枚隨機丹藥", need: "lianqi" },
  { id: "jianzhong", name: "劍種", cost: 50, max: 1, text: "起始多一張劈空劍", need: "lianqi" },
  { id: "huyuan", name: "護元息", cost: 60, max: 1, text: "每次歇息額外回復 8 點", need: "zhuji" },
  { id: "shibao", name: "識寶眼", cost: 80, max: 1, text: "開局獲得一件尋常法寶", need: "zhuji" },
  { id: "qimai", name: "氣脈通", cost: 140, max: 1, text: "起始靈力上限 +1", need: "jindan" },
];

export const PATHS: PathDef[] = [
  { id: "jian", name: "劍途", hint: "無偏無倚，原樣問道" },
  { id: "ti", name: "體途", hint: "氣血 +10，多一張護體訣", need: "lianqi" },
  { id: "san", name: "散途", hint: "靈石 +50，開局一丹", need: "zhuji" },
  { id: "mo", name: "魔途", hint: "最大氣血 -6，開局帶血玉", need: "jindan" },
];

export const CALAMITIES: CalamityDef[] = [
  { rank: 0, name: "平世", hint: "天道未怒" },
  { rank: 1, name: "一劫", hint: "敵手氣血 +12%，靈石少一成" },
  { rank: 2, name: "二劫", hint: "再削起始氣血 4，精英更密" },
  { rank: 3, name: "三劫", hint: "敵手傷害 +1，歇息少癒" },
  { rank: 4, name: "四劫", hint: "起始少 20 靈石" },
  { rank: 5, name: "五劫", hint: "起始少一張劈空劍" },
];

export const FEATS: FeatDef[] = [
  { id: "first-step", name: "初履青山", hint: "踏上第一途", merit: 15, check: (m) => m.runs >= 1 },
  { id: "first-blood", name: "初斬", hint: "斬殺第一個敵人", merit: 10, check: (m) => m.totalKills >= 1 },
  { id: "elite", name: "問劍", hint: "擊殺一名精英", merit: 20, check: (m) => m.elitesSlain >= 1 },
  { id: "act1", name: "過築基", hint: "踏入第二境", merit: 25, check: (m) => m.bestAct >= 2 },
  { id: "act2", name: "過金丹", hint: "踏入第三境", merit: 30, check: (m) => m.bestAct >= 3 },
  { id: "win", name: "渡劫", hint: "擊敗元嬰真君", merit: 50, check: (m) => m.victories >= 1 },
  { id: "bestiary", name: "識妖", hint: "見識十六種敵手", merit: 20, check: (m) => (m.seen?.length ?? 0) >= 16 },
  { id: "slayer", name: "百斬", hint: "累計斬殺五十", merit: 30, check: (m) => (m.totalKills ?? 0) >= 50 },
  { id: "calamity", name: "逆天", hint: "在一劫或以上渡劫", merit: 40, check: (m) => (m.maxCalamity ?? 0) >= 2 },
  { id: "collector", name: "博聞", hint: "見識十二種功法", merit: 20, check: (m) => (m.seenCards?.length ?? 0) >= 12 },
  { id: "incense", name: "香客", hint: "上香一次", merit: 10, check: (m) => Object.values(m.spent ?? {}).some((n) => n > 0) },
];

export const XP = {
  combat: 8,
  extraFoe: 4,
  elite: 20,
  boss: 42,
  firstKill: 12,
  victory: 32,
} as const;

export const MERIT = {
  combat: 3,
  extraFoe: 1,
  elite: 8,
  boss: 16,
  victory: 20,
} as const;

export function defaultMeta(): MetaState {
  return {
    version: 3,
    runs: 0,
    victories: 0,
    bestAct: 0,
    bestFloor: 0,
    xp: 0,
    seen: [],
    seenCards: [],
    seenRelics: [],
    merit: 0,
    spent: {},
    path: "jian",
    calamity: 0,
    maxCalamity: 0,
    feats: [],
    totalKills: 0,
    elitesSlain: 0,
    bossesSlain: 0,
  };
}

export function normalizeMeta(raw: Partial<MetaState> | null | undefined): MetaState {
  const base = defaultMeta();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    xp: typeof raw.xp === "number" ? raw.xp : 0,
    seen: Array.isArray(raw.seen) ? raw.seen : [],
    seenCards: Array.isArray(raw.seenCards) ? raw.seenCards : [],
    seenRelics: Array.isArray(raw.seenRelics) ? raw.seenRelics : [],
    merit: typeof raw.merit === "number" ? raw.merit : 0,
    spent: raw.spent && typeof raw.spent === "object" ? { ...raw.spent } : {},
    path: raw.path || "jian",
    calamity: typeof raw.calamity === "number" ? raw.calamity : 0,
    maxCalamity: typeof raw.maxCalamity === "number" ? raw.maxCalamity : 0,
    feats: Array.isArray(raw.feats) ? raw.feats : [],
    totalKills: typeof raw.totalKills === "number" ? raw.totalKills : 0,
    elitesSlain: typeof raw.elitesSlain === "number" ? raw.elitesSlain : 0,
    bossesSlain: typeof raw.bossesSlain === "number" ? raw.bossesSlain : 0,
    version: 3,
  };
}

export function realmAt(xp: number): RealmDef {
  let cur = REALMS[0]!;
  for (const r of REALMS) {
    if (xp >= r.xp) cur = r;
  }
  return cur;
}

export function nextRealm(xp: number): RealmDef | null {
  return REALMS.find((r) => r.xp > xp) ?? null;
}

export function unlockedRealms(xp: number): string[] {
  return REALMS.filter((r) => xp >= r.xp).map((r) => r.id);
}

export function hasRealm(meta: MetaState, id: string): boolean {
  return meta.xp >= (REALMS.find((r) => r.id === id)?.xp ?? Infinity);
}

export function contentOpen(meta: MetaState, need?: string): boolean {
  if (!need) return true;
  return hasRealm(meta, need);
}

export function xpToNext(xp: number): { have: number; need: number; next: RealmDef | null } {
  const next = nextRealm(xp);
  const cur = realmAt(xp);
  if (!next) return { have: 1, need: 1, next: null };
  return { have: xp - cur.xp, need: next.xp - cur.xp, next };
}

export function scoreRun(opts: {
  floor: number;
  kills: number;
  xp: number;
  merit: number;
  win: boolean;
}): number {
  return opts.floor * 14 + opts.kills * 10 + opts.xp + opts.merit * 2 + (opts.win ? 80 : 0);
}

export function incenseRank(meta: MetaState, id: string): number {
  return meta.spent[id] ?? 0;
}

export function incenseOpen(meta: MetaState, def: IncenseDef): boolean {
  return contentOpen(meta, def.need);
}

export function pathOpen(meta: MetaState, def: PathDef): boolean {
  return contentOpen(meta, def.need);
}

export function calamityOpen(meta: MetaState, rank: number): boolean {
  return rank <= meta.maxCalamity;
}

export function unlockFeats(meta: MetaState): FeatDef[] {
  const fresh: FeatDef[] = [];
  for (const f of FEATS) {
    if (meta.feats.includes(f.id)) continue;
    if (f.check(meta)) {
      meta.feats.push(f.id);
      fresh.push(f);
    }
  }
  return fresh;
}

export function markSeen(list: string[], id: string): boolean {
  if (list.includes(id)) return false;
  list.push(id);
  return true;
}
