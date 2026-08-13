import {
  addStatus,
  damagePlayer,
  getStatus,
  pushLog,
} from "./engine";
import type { CombatState, EnemyInst, Intent, StatusId } from "./types";

export interface EnemyDef {
  id: string;
  name: string;
  seal: string;
  portrait: string;
  maxHp: number;
  isElite?: boolean;
  isBoss?: boolean;
  pickIntent: (enemy: EnemyInst, turn: number) => Intent;
  act: (c: CombatState, enemy: EnemyInst) => void;
}

function attackIntent(value: number): Intent {
  return { kind: "attack", value };
}
function defendIntent(value: number): Intent {
  return { kind: "defend", value };
}
function debuffIntent(value: number, status: StatusId, extra = 0): Intent {
  return { kind: "debuff", value, extra, status };
}
function buffIntent(value: number, status: StatusId): Intent {
  return { kind: "buff", value, status };
}
function attackDebuff(value: number, status: StatusId, extra: number): Intent {
  return { kind: "attackDebuff", value, extra, status };
}

function doAttack(c: CombatState, enemy: EnemyInst, raw: number): void {
  if (getStatus(enemy.statuses, "weak") > 0) raw = Math.floor(raw * 0.75);
  const thorns = getStatus(c.playerStatuses, "thorns");
  damagePlayer(c, raw, true);
  if (thorns > 0 && enemy.hp > 0) {
    const blocked = Math.min(enemy.block, thorns);
    enemy.block -= blocked;
    enemy.hp = Math.max(0, enemy.hp - (thorns - blocked));
  }
}

export const ENEMIES: Record<string, EnemyDef> = {
  shanxiao: {
    id: "shanxiao",
    name: "山魈",
    seal: "魈",
    portrait: "/portraits/shanxiao.jpg",
    maxHp: 30,
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackIntent(6);
      if (i === 1) return defendIntent(7);
      return attackIntent(9);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else doAttack(c, e, e.intent.value);
    },
  },
  yeshou: {
    id: "yeshou",
    name: "野修",
    seal: "野",
    portrait: "/portraits/yeshou.jpg",
    maxHp: 36,
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackIntent(8);
      if (i === 1) return attackDebuff(6, "weak", 1);
      return defendIntent(8);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 1);
      }
    },
  },
  sanxiu: {
    id: "sanxiu",
    name: "散修",
    seal: "散",
    portrait: "/portraits/yeshou.jpg",
    maxHp: 20,
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackIntent(5) : attackIntent(7)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
    },
  },
  lingshe: {
    id: "lingshe",
    name: "靈蛇",
    seal: "蛇",
    portrait: "/portraits/lingshe.jpg",
    maxHp: 24,
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackDebuff(4, "poison", 2);
      if (i === 1) return debuffIntent(3, "poison");
      return attackIntent(7);
    },
    act(c, e) {
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        pushLog(c, "靈蛇噴出蝕骨毒霧");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  shikui: {
    id: "shikui",
    name: "石傀",
    seal: "傀",
    portrait: "/portraits/shikui.jpg",
    maxHp: 44,
    pickIntent: (_e, turn) => {
      const i = turn % 4;
      if (i === 0) return defendIntent(12);
      if (i === 1) return attackIntent(8);
      if (i === 2) return buffIntent(2, "strength");
      return attackIntent(11);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "石傀符文亮起");
      } else doAttack(c, e, e.intent.value);
    },
  },
  huoya: {
    id: "huoya",
    name: "火鴉",
    seal: "鴉",
    portrait: "/portraits/huoya.jpg",
    maxHp: 26,
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackIntent(10) : attackIntent(6)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
    },
  },
  neimen: {
    id: "neimen",
    name: "內門執法",
    seal: "執",
    portrait: "/portraits/yeshou.jpg",
    maxHp: 64,
    isElite: true,
    pickIntent: (_e, turn) => {
      const i = turn % 4;
      if (i === 0) return attackIntent(12);
      if (i === 1) return attackDebuff(8, "vulnerable", 2);
      if (i === 2) return defendIntent(14);
      return attackIntent(16);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  juyuan: {
    id: "juyuan",
    name: "鎮山巨猿",
    seal: "猿",
    portrait: "/portraits/juyuan.jpg",
    maxHp: 80,
    isElite: true,
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackIntent(14);
      if (i === 1) return buffIntent(3, "strength");
      return attackIntent(18);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "巨猿擂胸，力勢暴漲");
      } else doAttack(c, e, e.intent.value);
    },
  },
  xinmo: {
    id: "xinmo",
    name: "心魔影",
    seal: "魔",
    portrait: "/portraits/jindan.jpg",
    maxHp: 58,
    isElite: true,
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return debuffIntent(2, "weak");
      if (i === 1) return attackIntent(13);
      return attackDebuff(9, "frail", 2);
    },
    act(c, e) {
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        addStatus(c.playerStatuses, "frail", 1);
        pushLog(c, "心魔低語，道心動搖");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  zhuji: {
    id: "zhuji",
    name: "築基長老",
    seal: "長",
    portrait: "/portraits/zhuji.jpg",
    maxHp: 118,
    isBoss: true,
    pickIntent: (_e, turn) => {
      if (turn === 0) return buffIntent(2, "strength");
      const i = (turn - 1) % 4;
      if (i === 0) return attackIntent(16);
      if (i === 1) return defendIntent(16);
      if (i === 2) return attackDebuff(12, "vulnerable", 2);
      return attackIntent(20);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        e.block += 10;
        pushLog(c, "長老結印，金身初現");
      } else if (e.intent.kind === "defend") e.block += e.intent.value;
      else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  jindan: {
    id: "jindan",
    name: "金丹老魔",
    seal: "魔",
    portrait: "/portraits/jindan.jpg",
    maxHp: 168,
    isBoss: true,
    pickIntent: (_e, turn) => {
      if (turn === 0) return buffIntent(3, "strength");
      const i = (turn - 1) % 5;
      if (i === 0) return attackIntent(18);
      if (i === 1) return attackDebuff(14, "weak", 2);
      if (i === 2) return defendIntent(20);
      if (i === 3) return buffIntent(2, "strength");
      return attackIntent(24);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "老魔金丹轉動，魔威更盛");
      } else if (e.intent.kind === "defend") e.block += e.intent.value;
      else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
};

export const ACT1_COMBAT: string[][] = [
  ["shanxiao"],
  ["yeshou"],
  ["lingshe"],
  ["huoya"],
  ["sanxiu", "sanxiu"],
  ["shikui"],
  ["shanxiao", "lingshe"],
];

export const ACT2_COMBAT: string[][] = [
  ["yeshou", "huoya"],
  ["shikui"],
  ["lingshe", "lingshe"],
  ["yeshou", "sanxiu"],
  ["huoya", "shanxiao"],
  ["shikui", "sanxiu"],
];

export const ELITES = ["neimen", "juyuan", "xinmo"];

export function scaleHp(base: number, act: 1 | 2): number {
  return act === 2 ? Math.floor(base * 1.28) : base;
}

export function intentLabel(intent: Intent): string {
  if (intent.kind === "attack") return `攻 ${intent.value}`;
  if (intent.kind === "defend") return `守 ${intent.value}`;
  if (intent.kind === "buff") return "蓄勢";
  if (intent.kind === "debuff") return "詛咒";
  return `攻 ${intent.value}`;
}
