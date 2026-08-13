export interface RelicDef {
  id: string;
  name: string;
  seal: string;
  text: string;
  rarity: "common" | "uncommon" | "rare";
}

export const RELICS: Record<string, RelicDef> = {
  yinqi: { id: "yinqi", name: "引氣玉佩", seal: "玉", text: "靈力上限 +1", rarity: "rare" },
  huxin: {
    id: "huxin",
    name: "護心鏡",
    seal: "鏡",
    text: "每場戰鬥首次致死改為剩 1 點氣血",
    rarity: "rare",
  },
  julingfan: {
    id: "julingfan",
    name: "聚靈幡",
    seal: "幡",
    text: "戰鬥開始時獲得 4 點護體",
    rarity: "common",
  },
  shijin: {
    id: "shijin",
    name: "噬金蟲",
    seal: "蟲",
    text: "戰鬥結束後額外獲得 15 靈石",
    rarity: "common",
  },
  dinghun: {
    id: "dinghun",
    name: "定魂珠",
    seal: "珠",
    text: "每場戰鬥開始多抽 1 張牌",
    rarity: "uncommon",
  },
  bifuh: {
    id: "bifuh",
    name: "避火符",
    seal: "符",
    text: "受到的攻擊傷害 -1",
    rarity: "uncommon",
  },
  xisui: {
    id: "xisui",
    name: "洗髓爐",
    seal: "爐",
    text: "最大氣血 +8",
    rarity: "uncommon",
  },
  tongtian: {
    id: "tongtian",
    name: "通天尺",
    seal: "尺",
    text: "卡牌獎勵更容易出現高品階",
    rarity: "rare",
  },
  xueyu: {
    id: "xueyu",
    name: "血玉",
    seal: "血",
    text: "戰鬥開始失去 3 點氣血，獲得 1 層劍意",
    rarity: "uncommon",
  },
  putuan: {
    id: "putuan",
    name: "靜心蒲團",
    seal: "團",
    text: "歇息時額外回復 12 點氣血",
    rarity: "common",
  },
  jubao: {
    id: "jubao",
    name: "聚寶囊",
    seal: "囊",
    text: "獲得時立刻得到 40 靈石",
    rarity: "common",
  },
  huichunpei: {
    id: "huichunpei",
    name: "回春佩",
    seal: "佩",
    text: "戰鬥結束時回復 5 點氣血",
    rarity: "common",
  },
  shuangwen: {
    id: "shuangwen",
    name: "霜紋劍穗",
    seal: "穗",
    text: "每回合打出的第一張牌不耗靈力",
    rarity: "rare",
  },
  chilian: {
    id: "chilian",
    name: "赤煉珠",
    seal: "煉",
    text: "打出劍訣時獲得 2 點護體",
    rarity: "uncommon",
  },
  kongming: {
    id: "kongming",
    name: "空明鏡",
    seal: "鏡",
    text: "戰鬥開始時額外獲得 1 點靈力",
    rarity: "uncommon",
  },
  zhenhun: {
    id: "zhenhun",
    name: "鎮魂釘",
    seal: "釘",
    text: "精英與首領開場氣血 -10",
    rarity: "rare",
  },
  buyun: {
    id: "buyun",
    name: "步雲靴",
    seal: "靴",
    text: "歇息時額外獲得一枚隨機丹藥",
    rarity: "uncommon",
  },
  mofu: {
    id: "mofu",
    name: "墨符匣",
    seal: "匣",
    text: "每打出 3 張牌，對所有敵人造成 4 點傷害",
    rarity: "rare",
  },
  qingnang: {
    id: "qingnang",
    name: "青囊書",
    seal: "囊",
    text: "使用丹藥時額外回復 6 點氣血",
    rarity: "uncommon",
  },
  liebo: {
    id: "liebo",
    name: "裂帛帶",
    seal: "帛",
    text: "每回合首次受到氣血傷害時獲得 1 層劍意",
    rarity: "uncommon",
  },
  xuepo: {
    id: "xuepo",
    name: "血珀",
    seal: "珀",
    text: "擊殺敵人時回復 3 點氣血",
    rarity: "common",
  },
  qiankun: {
    id: "qiankun",
    name: "乾坤袋",
    seal: "袋",
    text: "丹藥欄位 +1",
    rarity: "rare",
  },
  jianqiao: {
    id: "jianqiao",
    name: "劍鞘殘片",
    seal: "鞘",
    text: "戰鬥開始時，下一次攻擊額外 5 點傷害",
    rarity: "common",
  },
  sancai: {
    id: "sancai",
    name: "三才錢",
    seal: "錢",
    text: "坊市物價九折",
    rarity: "common",
  },
};

export const RELIC_LIST = Object.values(RELICS);
