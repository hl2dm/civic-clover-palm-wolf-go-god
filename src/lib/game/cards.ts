import type { CardDef } from "./catalog-types";
import {
  addStatus,
  aliveEnemies,
  clearDebuffs,
  consumeNextStrike,
  damageAllEnemies,
  damageEnemy,
  drawCards,
  findEnemy,
  gainBlock,
  getStatus,
  healPlayer,
  pushFloater,
  pushLog,
  rngFrom,
  syncRng,
} from "./engine";

export const CARDS: Record<string, CardDef> = {
  pikong: {
    id: "pikong",
    name: "劈空劍",
    seal: "劈",
    type: "attack",
    rarity: "starter",
    cost: 1,
    target: "enemy",
    text: (up) => `造成 ${up ? 9 : 6} 點傷害`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, up ? 9 : 6);
      consumeNextStrike(c);
    },
  },
  huti: {
    id: "huti",
    name: "護體訣",
    seal: "護",
    type: "skill",
    rarity: "starter",
    cost: 1,
    target: "self",
    text: (up) => `獲得 ${up ? 8 : 5} 點護體`,
    play(c, up) {
      gainBlock(c, up ? 8 : 5);
    },
  },
  pojia: {
    id: "pojia",
    name: "破甲刺",
    seal: "破",
    type: "attack",
    rarity: "starter",
    cost: 2,
    target: "enemy",
    text: (up) => `造成 ${up ? 11 : 8} 點傷害，給予 ${up ? 3 : 2} 層破防`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, up ? 11 : 8);
      addStatus(e.statuses, "vulnerable", up ? 3 : 2);
      consumeNextStrike(c);
    },
  },
  lianzhan: {
    id: "lianzhan",
    name: "連斬",
    seal: "連",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    text: (up) => `造成 ${up ? 5 : 4} 點傷害兩次`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      const n = up ? 5 : 4;
      damageEnemy(c, e, n);
      if (e.hp > 0) damageEnemy(c, e, n);
      consumeNextStrike(c);
    },
  },
  yujian: {
    id: "yujian",
    name: "御劍術",
    seal: "御",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    text: (up) => `造成 ${up ? 13 : 10} 點傷害`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, up ? 13 : 10);
      consumeNextStrike(c);
    },
  },
  wanjian: {
    id: "wanjian",
    name: "萬劍歸宗",
    seal: "萬",
    type: "attack",
    rarity: "uncommon",
    cost: 1,
    target: "all",
    text: (up) => `對所有敵人造成 ${up ? 8 : 5} 點傷害`,
    play(c, up) {
      damageAllEnemies(c, up ? 8 : 5);
      consumeNextStrike(c);
    },
  },
  zhuxin: {
    id: "zhuxin",
    name: "誅心一擊",
    seal: "誅",
    type: "attack",
    rarity: "uncommon",
    cost: 2,
    target: "enemy",
    text: (up) => `造成 ${up ? 21 : 16} 點傷害`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, up ? 21 : 16);
      consumeNextStrike(c);
    },
  },
  tianlei: {
    id: "tianlei",
    name: "天雷引",
    seal: "雷",
    type: "attack",
    rarity: "uncommon",
    cost: 1,
    target: "enemy",
    text: (up) => `造成 ${up ? 14 : 11} 點傷害，給予 1 層虛弱`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, up ? 14 : 11);
      addStatus(e.statuses, "weak", 1);
      consumeNextStrike(c);
    },
  },
  xueji: {
    id: "xueji",
    name: "血祭劍",
    seal: "祭",
    type: "attack",
    rarity: "rare",
    cost: 1,
    target: "enemy",
    text: (up) => `失去 ${up ? 3 : 4} 點氣血，造成 ${up ? 24 : 20} 點傷害`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      c.playerHp = Math.max(1, c.playerHp - (up ? 3 : 4));
      pushFloater(c, `-${up ? 3 : 4}`, "dmg", "player");
      damageEnemy(c, e, up ? 24 : 20);
      consumeNextStrike(c);
    },
  },
  chuanyun: {
    id: "chuanyun",
    name: "穿雲刺",
    seal: "穿",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    text: (up) => `造成 ${up ? 9 : 7} 點傷害，抽 1 張牌`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, up ? 9 : 7);
      consumeNextStrike(c);
      const rng = rngFrom(c);
      drawCards(c, 1, rng);
      syncRng(c, rng);
    },
  },
  jianqi: {
    id: "jianqi",
    name: "劍氣縱橫",
    seal: "氣",
    type: "attack",
    rarity: "rare",
    cost: 1,
    target: "enemy",
    text: (up) => `造成等同當前護體${up ? "加 5" : ""}的傷害`,
    play(c, up, targetId) {
      const e = findEnemy(c, targetId);
      if (!e) return;
      damageEnemy(c, e, c.playerBlock + (up ? 5 : 0));
      consumeNextStrike(c);
    },
  },
  tuna: {
    id: "tuna",
    name: "吐納術",
    seal: "納",
    type: "skill",
    rarity: "common",
    cost: 1,
    target: "self",
    text: (up) => `獲得 ${up ? 11 : 8} 點護體`,
    play(c, up) {
      gainBlock(c, up ? 11 : 8);
    },
  },
  ningshen: {
    id: "ningshen",
    name: "凝神",
    seal: "凝",
    type: "skill",
    rarity: "common",
    cost: 0,
    target: "none",
    text: (up) => `抽 ${up ? 3 : 2} 張牌`,
    play(c, up) {
      const rng = rngFrom(c);
      drawCards(c, up ? 3 : 2, rng);
      syncRng(c, rng);
    },
  },
  jinzhong: {
    id: "jinzhong",
    name: "金鐘罩",
    seal: "鐘",
    type: "skill",
    rarity: "uncommon",
    cost: 2,
    target: "self",
    text: (up) => `獲得 ${up ? 17 : 13} 點護體`,
    play(c, up) {
      gainBlock(c, up ? 17 : 13);
    },
  },
  huichun: {
    id: "huichun",
    name: "回春訣",
    seal: "春",
    type: "skill",
    rarity: "uncommon",
    cost: 1,
    target: "self",
    exhaust: true,
    text: (up) => `回復 ${up ? 10 : 7} 點氣血。消耗`,
    play(c, up) {
      healPlayer(c, up ? 10 : 7);
    },
  },
  juling: {
    id: "juling",
    name: "聚靈",
    seal: "聚",
    type: "skill",
    rarity: "uncommon",
    cost: 0,
    target: "none",
    exhaust: true,
    text: (up) => `獲得 ${up ? 3 : 2} 點靈力。消耗`,
    play(c, up) {
      c.energy += up ? 3 : 2;
    },
  },
  xieli: {
    id: "xieli",
    name: "卸力",
    seal: "卸",
    type: "skill",
    rarity: "common",
    cost: 1,
    target: "self",
    text: (up) => `獲得 ${up ? 9 : 7} 點護體，抽 1 張牌`,
    play(c, up) {
      gainBlock(c, up ? 9 : 7);
      const rng = rngFrom(c);
      drawCards(c, 1, rng);
      syncRng(c, rng);
    },
  },
  qingxin: {
    id: "qingxin",
    name: "清心咒",
    seal: "清",
    type: "skill",
    rarity: "uncommon",
    cost: 0,
    target: "self",
    text: (up) => `移除自身負面狀態${up ? "，抽 2 張牌" : "，抽 1 張牌"}`,
    play(c, up) {
      clearDebuffs(c.playerStatuses);
      const rng = rngFrom(c);
      drawCards(c, up ? 2 : 1, rng);
      syncRng(c, rng);
    },
  },
  xushi: {
    id: "xushi",
    name: "蓄勢",
    seal: "蓄",
    type: "skill",
    rarity: "common",
    cost: 1,
    target: "self",
    text: (up) => `下一次攻擊額外造成 ${up ? 12 : 8} 點傷害`,
    play(c, up) {
      addStatus(c.playerStatuses, "nextStrike", up ? 12 : 8);
      pushFloater(c, "蓄勢", "status", "player");
    },
  },
  fanshang: {
    id: "fanshang",
    name: "反震訣",
    seal: "震",
    type: "skill",
    rarity: "uncommon",
    cost: 1,
    target: "self",
    text: (up) => `獲得 ${up ? 8 : 5} 點護體與 ${up ? 4 : 3} 層反傷`,
    play(c, up) {
      gainBlock(c, up ? 8 : 5);
      addStatus(c.playerStatuses, "thorns", up ? 4 : 3);
    },
  },
  jianyi: {
    id: "jianyi",
    name: "劍意長存",
    seal: "意",
    type: "power",
    rarity: "rare",
    cost: 1,
    target: "none",
    text: (up) => `每回合開始時，對隨機敵人造成 ${up ? 6 : 4} 點傷害`,
    play(c, up) {
      c.powers.push({ defId: "jianyi", upgraded: up });
      pushLog(c, "劍意盤旋不散");
    },
  },
  jindanhu: {
    id: "jindanhu",
    name: "金丹護體",
    seal: "丹",
    type: "power",
    rarity: "uncommon",
    cost: 1,
    target: "none",
    text: (up) => `每回合開始時獲得 ${up ? 5 : 3} 點護體`,
    play(c, up) {
      c.powers.push({ defId: "jindanhu", upgraded: up });
      addStatus(c.playerStatuses, "metallicize", up ? 5 : 3);
    },
  },
  fenxin: {
    id: "fenxin",
    name: "焚心修煉",
    seal: "焚",
    type: "power",
    rarity: "rare",
    cost: 1,
    target: "none",
    text: (up) => `獲得 ${up ? 4 : 3} 層劍意。每回合開始失去 1 點氣血`,
    play(c, up) {
      addStatus(c.playerStatuses, "strength", up ? 4 : 3);
      c.powers.push({ defId: "fenxin", upgraded: up });
      pushLog(c, "心火燃起，劍意暴漲");
    },
  },
  yuqi: {
    id: "yuqi",
    name: "御氣",
    seal: "御",
    type: "power",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: (up) => `每回合多抽 ${up ? 2 : 1} 張牌`,
    play(c, up) {
      c.powers.push({ defId: "yuqi", upgraded: up });
      c.extraDraw += up ? 2 : 1;
    },
  },
};

export const CARD_LIST = Object.values(CARDS);

export function starterDeckIds(): string[] {
  return [
    "pikong",
    "pikong",
    "pikong",
    "pikong",
    "pikong",
    "huti",
    "huti",
    "huti",
    "huti",
    "pojia",
  ];
}

export function rewardPool(): CardDef[] {
  return CARD_LIST.filter((c) => c.rarity !== "starter");
}

export function cardCost(def: CardDef): number {
  return def.cost;
}

export function tickStartPowers(c: import("./types").CombatState): void {
  const rng = rngFrom(c);
  for (const p of c.powers) {
    if (p.defId === "jianyi") {
      const foes = aliveEnemies(c);
      if (foes.length) {
        const e = rng.pick(foes);
        damageEnemy(c, e, p.upgraded ? 6 : 4, { ignoreStr: false });
        pushLog(c, `劍意劈向${ENEMY_NAME_FALLBACK}`);
      }
    }
    if (p.defId === "jindanhu") {
      gainBlock(c, p.upgraded ? 5 : 3);
    }
    if (p.defId === "fenxin") {
      c.playerHp = Math.max(0, c.playerHp - 1);
      pushFloater(c, "-1", "dmg", "player");
    }
  }
  syncRng(c, rng);
}

const ENEMY_NAME_FALLBACK = "敵人";

export function previewDamage(
  c: import("./types").CombatState,
  defId: string,
  upgraded: boolean,
  enemy: import("./types").EnemyInst,
): number | null {
  const def = CARDS[defId];
  if (!def || def.type !== "attack") return null;
  const rawMap: Record<string, number> = {
    pikong: upgraded ? 9 : 6,
    pojia: upgraded ? 11 : 8,
    lianzhan: (upgraded ? 5 : 4) * 2,
    yujian: upgraded ? 13 : 10,
    wanjian: upgraded ? 8 : 5,
    zhuxin: upgraded ? 21 : 16,
    tianlei: upgraded ? 14 : 11,
    xueji: upgraded ? 24 : 20,
    chuanyun: upgraded ? 9 : 7,
    jianqi: c.playerBlock + (upgraded ? 5 : 0),
  };
  const raw = rawMap[defId];
  if (raw == null) return null;
  return (
    Math.max(
      0,
      Math.floor(
        (raw +
          getStatus(c.playerStatuses, "strength") +
          getStatus(c.playerStatuses, "nextStrike")) *
          (getStatus(c.playerStatuses, "weak") > 0 ? 0.75 : 1) *
          (getStatus(enemy.statuses, "vulnerable") > 0 ? 1.5 : 1),
      ),
    )
  );
}
