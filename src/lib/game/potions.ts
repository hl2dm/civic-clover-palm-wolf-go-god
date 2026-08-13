import {
  addStatus,
  aliveEnemies,
  clearDebuffs,
  damageAllEnemies,
  damageEnemy,
  drawCards,
  findEnemy,
  gainBlock,
  healPlayer,
  rngFrom,
  syncRng,
} from "./engine";
import type { CombatState } from "./types";

export interface PotionDef {
  id: string;
  name: string;
  seal: string;
  text: string;
  use: (c: CombatState) => void;
}

export const POTIONS: Record<string, PotionDef> = {
  huiqi: {
    id: "huiqi",
    name: "回氣丹",
    seal: "回",
    text: "回復 18 點氣血",
    use: (c) => healPlayer(c, 18),
  },
  pozhang: {
    id: "pozhang",
    name: "破障丹",
    seal: "破",
    text: "給予所有敵人 3 層破防",
    use: (c) => {
      for (const e of aliveEnemies(c)) addStatus(e.statuses, "vulnerable", 3);
    },
  },
  ningshen: {
    id: "ningshen",
    name: "凝神丹",
    seal: "凝",
    text: "獲得 2 點靈力",
    use: (c) => {
      c.energy += 2;
    },
  },
  yandun: {
    id: "yandun",
    name: "煙遁丹",
    seal: "遁",
    text: "獲得 12 點護體",
    use: (c) => gainBlock(c, 12),
  },
  peiyuan: {
    id: "peiyuan",
    name: "培元丹",
    seal: "培",
    text: "本場戰鬥獲得 2 層劍意",
    use: (c) => addStatus(c.playerStatuses, "strength", 2),
  },
  qingxin: {
    id: "qingxin",
    name: "清心丹",
    seal: "清",
    text: "移除自身所有負面狀態，抽 1 張牌",
    use: (c) => {
      clearDebuffs(c.playerStatuses);
      const rng = rngFrom(c);
      drawCards(c, 1, rng);
      syncRng(c, rng);
    },
  },
  wanjian: {
    id: "wanjian",
    name: "萬劍丹",
    seal: "劍",
    text: "對所有敵人造成 12 點傷害",
    use: (c) => damageAllEnemies(c, 12),
  },
  shigu: {
    id: "shigu",
    name: "蝕骨丹",
    seal: "蝕",
    text: "給予所有敵人 5 層蝕骨",
    use: (c) => {
      for (const e of aliveEnemies(c)) addStatus(e.statuses, "poison", 5);
    },
  },
  jinshen: {
    id: "jinshen",
    name: "金身丹",
    seal: "金",
    text: "獲得 8 點護體與 2 層身法",
    use: (c) => {
      gainBlock(c, 8);
      addStatus(c.playerStatuses, "dexterity", 2);
    },
  },
  pojun: {
    id: "pojun",
    name: "破軍丹",
    seal: "軍",
    text: "給予所有敵人 2 層破防與 2 層虛弱",
    use: (c) => {
      for (const e of aliveEnemies(c)) {
        addStatus(e.statuses, "vulnerable", 2);
        addStatus(e.statuses, "weak", 2);
      }
    },
  },
  xuming: {
    id: "xuming",
    name: "續命丹",
    seal: "命",
    text: "回復 12 點氣血，獲得 6 點護體",
    use: (c) => {
      healPlayer(c, 12);
      gainBlock(c, 6);
    },
  },
  fenglei: {
    id: "fenglei",
    name: "風雷丹",
    seal: "雷",
    text: "對生命最高的敵人造成 16 點傷害",
    use: (c) => {
      const foes = aliveEnemies(c);
      if (!foes.length) return;
      const target = foes.reduce((a, b) => (a.hp >= b.hp ? a : b));
      const hit = findEnemy(c, target.uid);
      if (hit) damageEnemy(c, hit, 16);
    },
  },
};

export const POTION_LIST = Object.values(POTIONS);
