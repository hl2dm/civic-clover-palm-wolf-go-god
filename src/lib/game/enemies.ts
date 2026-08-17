import {
  addStatus,
  damagePlayer,
  getStatus,
  pushLog,
} from "./engine";
import { contentOpen } from "./meta";
import type { ActId, CombatState, EnemyInst, Intent, MetaState, StatusId } from "./types";

export interface EnemyDef {
  id: string;
  name: string;
  seal: string;
  portrait: string;
  maxHp: number;
  isElite?: boolean;
  isBoss?: boolean;
  unlock?: string;
  talker?: boolean;
  lines?: { start: string[]; act?: string[]; hurt?: string[] };
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
  if ((c.calamity ?? 0) >= 3) raw += 1;
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
    lines: {
      start: ["林子裡的肉……有香氣。"],
      act: ["吃。", "別跑。"],
      hurt: ["嗷——"],
    },
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
    lines: {
      start: ["這山是我先來的。"],
      act: ["讓一讓。", "再擋，便動手。"],
      hurt: ["好劍……"],
    },
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
    portrait: "/portraits/sanxiu.png?v=21",
    maxHp: 20,
    lines: {
      start: ["路過的，留下靈石。"],
      act: ["一劍了結。"],
      hurt: ["你……有門派？"],
    },
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
    lines: {
      start: ["嘶——有熱血。"],
      act: ["毒已入。"],
      hurt: ["鱗碎了……"],
    },
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
    lines: {
      start: ["……不許過。"],
      act: ["守。"],
      hurt: ["石……裂。"],
    },
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
    lines: {
      start: ["嘎！火來了。"],
      act: ["燒！"],
      hurt: ["羽焦了——"],
    },
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackIntent(10) : attackIntent(6)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
    },
  },
  neimen: {
    id: "neimen",
    name: "內門執法",
    seal: "執",
    portrait: "/portraits/neimen.png?v=21",
    maxHp: 64,
    isElite: true,
    lines: {
      start: ["內門禁地。報名，或受罰。"],
      act: ["執法。", "跪下。"],
      hurt: ["你壞了規矩……"],
    },
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
    lines: {
      start: ["吼——山是我的。"],
      act: ["砸！"],
      hurt: ["痛……再來。"],
    },
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
    portrait: "/portraits/xinmo.png?v=21",
    maxHp: 58,
    isElite: true,
    talker: true,
    lines: {
      start: ["你為何上山？說謊，我便知道。"],
      act: ["道心，很薄。", "聽聽你自己。"],
      hurt: ["疼的是你，不是我。"],
    },
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
    talker: true,
    lines: {
      start: ["小輩，築基之前，先過我這一關。"],
      act: ["金身未成，也夠用了。", "再近一步。"],
      hurt: ["好。有點意思。"],
    },
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
    talker: true,
    lines: {
      start: ["金丹一轉，你這條命，我看過了。"],
      act: ["魔也是道。", "把心交出來。"],
      hurt: ["哈哈……再重一些。"],
    },
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
  mumei: {
    id: "mumei",
    name: "木魅",
    seal: "魅",
    portrait: "/portraits/mumei.png?v=21",
    maxHp: 38,
    lines: {
      start: ["根……已經纏上你的腳踝。"],
      act: ["長。", "睡在土裡。"],
      hurt: ["汁液……在流。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return defendIntent(8);
      if (i === 1) return attackDebuff(5, "poison", 2);
      return attackIntent(8);
    },
    act(c, e) {
      if (e.intent.kind === "defend") {
        e.block += e.intent.value;
        addStatus(e.statuses, "regen", 2);
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  zhiren: {
    id: "zhiren",
    name: "紙人",
    seal: "紙",
    portrait: "/portraits/zhiren.jpg",
    maxHp: 18,
    lines: {
      start: ["……（紙頁摩擦）"],
      act: ["裁。"],
      hurt: ["撕——"],
    },
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackDebuff(6, "frail", 1) : attackIntent(9)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
      if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 1);
    },
  },
  wuji: {
    id: "wuji",
    name: "霧姬",
    seal: "霧",
    portrait: "/portraits/wuji.png?v=21",
    maxHp: 42,
    unlock: "lianqi",
    talker: true,
    lines: {
      start: ["看不清路的人，不該上山。"],
      act: ["霧裡，沒有你。", "往後退。"],
      hurt: ["霧……散了一角。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return debuffIntent(2, "weak");
      if (i === 1) return defendIntent(10);
      return attackIntent(9);
    },
    act(c, e) {
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        e.block += 5;
        pushLog(c, "霧姬把身形藏進白霧");
      } else if (e.intent.kind === "defend") e.block += e.intent.value;
      else doAttack(c, e, e.intent.value);
    },
  },
  jianbing: {
    id: "jianbing",
    name: "劍塚殘兵",
    seal: "塚",
    portrait: "/portraits/jianbing.png?v=21",
    maxHp: 72,
    isElite: true,
    unlock: "zhuji",
    talker: true,
    lines: {
      start: ["這柄劍……還認得人。你，不是它的舊主。"],
      act: ["再近一步，便是塚。", "我守了三百年。"],
      hurt: ["痛快。像從前。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 4;
      if (i === 0) return buffIntent(2, "strength");
      if (i === 1) return attackIntent(13);
      if (i === 2) return defendIntent(12);
      return attackIntent(17);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "殘兵把斷劍重新握緊");
      } else if (e.intent.kind === "defend") e.block += e.intent.value;
      else doAttack(c, e, e.intent.value);
    },
  },
  huxian: {
    id: "huxian",
    name: "狐仙",
    seal: "狐",
    portrait: "/portraits/huxian.jpg",
    maxHp: 88,
    isElite: true,
    unlock: "jindan",
    talker: true,
    lines: {
      start: ["小修士，跟本仙玩玩？輸了，把心留下。"],
      act: ["今日心情好。", "既然不識抬舉……", "再陪你一回。"],
      hurt: ["好疼。本仙記著了。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackDebuff(8, "weak", 2);
      if (i === 1) return debuffIntent(2, "frail");
      return attackIntent(14);
    },
    act(c, e) {
      const skip = Math.random() < 0.28 && e.intent.kind !== "debuff";
      if (skip) {
        c.speech = { uid: e.uid, text: "今日饒你。去吧——下一劍可不讓。" };
        pushLog(c, "狐仙收爪，只對你眨了眨眼");
        return;
      }
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        addStatus(c.playerStatuses, "weak", 1);
        pushLog(c, "狐香入鼻，手足發軟");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  shijiang: {
    id: "shijiang",
    name: "屍僵",
    seal: "僵",
    portrait: "/portraits/shijiang.png",
    maxHp: 28,
    lines: {
      start: ["符……還在額上。"],
      act: ["跳。", "抱。"],
      hurt: ["紙……裂。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackIntent(6);
      if (i === 1) return attackDebuff(5, "frail", 1);
      return attackIntent(10);
    },
    act(c, e) {
      doAttack(c, e, e.intent.value);
      if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 1);
    },
  },
  tongzhong: {
    id: "tongzhong",
    name: "銅鐘",
    seal: "鐘",
    portrait: "/portraits/tongzhong.png",
    maxHp: 48,
    lines: {
      start: ["——（鐘舌輕響）"],
      act: ["鳴。"],
      hurt: ["裂紋……亮了。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 4;
      if (i === 0) return defendIntent(14);
      if (i === 1) return attackIntent(8);
      if (i === 2) return defendIntent(10);
      return attackIntent(12);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else doAttack(c, e, e.intent.value);
    },
  },
  youdeng: {
    id: "youdeng",
    name: "幽燈",
    seal: "燈",
    portrait: "/portraits/youdeng.png",
    maxHp: 22,
    lines: {
      start: ["跟我走。路，在燈裡。"],
      act: ["亮。"],
      hurt: ["芯……滅了。"],
    },
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackDebuff(4, "weak", 1) : attackIntent(7)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
      if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 1);
    },
  },
  xuefu: {
    id: "xuefu",
    name: "血蝠",
    seal: "蝠",
    portrait: "/portraits/xuefu.png",
    maxHp: 26,
    lines: {
      start: ["（翼膜摩擦）血，熱的。"],
      act: ["吸。"],
      hurt: ["吱——"],
    },
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackIntent(7) : attackIntent(5)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
      if (e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + 3);
    },
  },
  yanxi: {
    id: "yanxi",
    name: "岩蜥",
    seal: "蜥",
    portrait: "/portraits/yanxi.png",
    maxHp: 40,
    lines: {
      start: ["石皮，比你的劍硬。"],
      act: ["壓。"],
      hurt: ["鱗……掉了。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return defendIntent(9);
      if (i === 1) return attackIntent(8);
      return attackIntent(11);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else doAttack(c, e, e.intent.value);
    },
  },
  moxiao: {
    id: "moxiao",
    name: "墨魈",
    seal: "墨",
    portrait: "/portraits/moxiao.png",
    maxHp: 32,
    unlock: "lianqi",
    lines: {
      start: ["你的名字，我寫進水裡。"],
      act: ["化。", "洇開。"],
      hurt: ["淡了……還在。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return debuffIntent(2, "weak");
      if (i === 1) return attackIntent(8);
      return attackDebuff(6, "weak", 1);
    },
    act(c, e) {
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        pushLog(c, "墨魈把字洇進你的視野");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 1);
      }
    },
  },
  jiantong: {
    id: "jiantong",
    name: "劍僮",
    seal: "僮",
    portrait: "/portraits/jiantong.png",
    maxHp: 24,
    unlock: "lianqi",
    lines: {
      start: ["這柄不是我的。可它要出鞘。"],
      act: ["再一劍。"],
      hurt: ["劍比我重……"],
    },
    pickIntent: (_e, turn) => (turn % 2 === 0 ? attackIntent(5) : attackIntent(8)),
    act(c, e) {
      doAttack(c, e, e.intent.value);
      if (e.patternIndex % 2 === 1) doAttack(c, e, Math.max(2, Math.ceil(e.intent.value * 0.45)));
    },
  },
  fengli: {
    id: "fengli",
    name: "風狸",
    seal: "狸",
    portrait: "/portraits/fengli.png",
    maxHp: 28,
    unlock: "zhuji",
    lines: {
      start: ["風過了。你還站著？"],
      act: ["閃。", "割。"],
      hurt: ["毛……逆了。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return defendIntent(8);
      if (i === 1) return attackIntent(9);
      return attackDebuff(6, "vulnerable", 1);
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 1);
      }
    },
  },
  yaokui: {
    id: "yaokui",
    name: "藥傀",
    seal: "傀",
    portrait: "/portraits/yaokui.png",
    maxHp: 34,
    unlock: "zhuji",
    lines: {
      start: ["這爐……還熱。喝一口。"],
      act: ["煎。"],
      hurt: ["釉裂了。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackDebuff(5, "poison", 2);
      if (i === 1) return debuffIntent(3, "poison");
      return attackIntent(8);
    },
    act(c, e) {
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        addStatus(e.statuses, "regen", 2);
        pushLog(c, "藥傀把殘丹抹進自己的裂縫");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  lianshi: {
    id: "lianshi",
    name: "煉屍道人",
    seal: "煉",
    portrait: "/portraits/lianshi.png",
    maxHp: 70,
    isElite: true,
    talker: true,
    lines: {
      start: ["活的也是材料。躺下，我幫你成全。"],
      act: ["腐。", "再煉一回。"],
      hurt: ["好骨頭。留下。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 4;
      if (i === 0) return attackDebuff(8, "poison", 2);
      if (i === 1) return defendIntent(12);
      if (i === 2) return attackIntent(13);
      return debuffIntent(3, "poison");
    },
    act(c, e) {
      if (e.intent.kind === "defend") e.block += e.intent.value;
      else if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        pushLog(c, "煉屍符落在你袖口");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  leishi: {
    id: "leishi",
    name: "雷紋獅",
    seal: "獅",
    portrait: "/portraits/leishi.png",
    maxHp: 86,
    isElite: true,
    unlock: "lianqi",
    lines: {
      start: ["守門的還在。滾。"],
      act: ["吼！"],
      hurt: ["石……裂開金線。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return buffIntent(3, "strength");
      if (i === 1) return attackIntent(16);
      return attackIntent(20);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "雷紋再鑄，獅身金線暴亮");
      } else doAttack(c, e, e.intent.value);
    },
  },
  xuehe: {
    id: "xuehe",
    name: "血河女",
    seal: "河",
    portrait: "/portraits/xuehe.png",
    maxHp: 68,
    isElite: true,
    unlock: "zhuji",
    talker: true,
    lines: {
      start: ["渡河？把心放下，水會認得你。"],
      act: ["喝。", "再深一寸。"],
      hurt: ["河面……破了。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackDebuff(9, "frail", 2);
      if (i === 1) return attackIntent(12);
      return debuffIntent(2, "weak");
    },
    act(c, e) {
      if (e.intent.kind === "debuff" && e.intent.status) {
        addStatus(c.playerStatuses, e.intent.status, e.intent.value);
        pushLog(c, "血氣入鼻，手足發軟");
      } else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
        if (e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + 5);
      }
    },
  },
  zhujian: {
    id: "zhujian",
    name: "鑄劍翁",
    seal: "鑄",
    portrait: "/portraits/zhujian.png",
    maxHp: 78,
    isElite: true,
    unlock: "jindan",
    talker: true,
    lines: {
      start: ["好鐵。站穩，我量你的骨頭。"],
      act: ["再鍛。", "出爐。"],
      hurt: ["淬火……還早。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 4;
      if (i === 0) return buffIntent(2, "strength");
      if (i === 1) return attackIntent(14);
      if (i === 2) return defendIntent(13);
      return attackIntent(19);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "翁把斷臂重新鍛成刃");
      } else if (e.intent.kind === "defend") e.block += e.intent.value;
      else doAttack(c, e, e.intent.value);
    },
  },
  yecha: {
    id: "yecha",
    name: "夜叉",
    seal: "叉",
    portrait: "/portraits/yecha.png",
    maxHp: 94,
    isElite: true,
    unlock: "yuanying",
    talker: true,
    lines: {
      start: ["四隻手，夠不夠你躲？"],
      act: ["撕。", "再一爪。"],
      hurt: ["痛快。再來。"],
    },
    pickIntent: (_e, turn) => {
      const i = turn % 3;
      if (i === 0) return attackIntent(12);
      if (i === 1) return attackDebuff(10, "vulnerable", 2);
      return attackIntent(18);
    },
    act(c, e) {
      doAttack(c, e, e.intent.value);
      if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      if (e.patternIndex % 3 === 2) doAttack(c, e, 6);
    },
  },
  yuanzhen: {
    id: "yuanzhen",
    name: "元嬰真君",
    seal: "真",
    portrait: "/portraits/yuanzhen.png",
    maxHp: 220,
    isBoss: true,
    talker: true,
    lines: {
      start: ["元嬰出竅。你這具凡殼，還要往上走？"],
      act: ["坐看你碎。", "嬰火，燃。"],
      hurt: ["殼裂了。正好。"],
    },
    pickIntent: (_e, turn) => {
      if (turn === 0) return buffIntent(3, "strength");
      const i = (turn - 1) % 5;
      if (i === 0) return attackIntent(20);
      if (i === 1) return defendIntent(22);
      if (i === 2) return attackDebuff(16, "vulnerable", 2);
      if (i === 3) return buffIntent(2, "strength");
      return attackIntent(26);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        e.block += 12;
        pushLog(c, "真君結印，元嬰離體一寸");
      } else if (e.intent.kind === "defend") e.block += e.intent.value;
      else {
        doAttack(c, e, e.intent.value);
        if (e.intent.status) addStatus(c.playerStatuses, e.intent.status, e.intent.extra ?? 2);
      }
    },
  },
  tianmo: {
    id: "tianmo",
    name: "天魔尊",
    seal: "尊",
    portrait: "/portraits/tianmo.png",
    maxHp: 268,
    isBoss: true,
    talker: true,
    lines: {
      start: ["天劫是我開的門。進來。"],
      act: ["跪。", "把道心吐出來。"],
      hurt: ["哈哈……再重。我喜歡。"],
    },
    pickIntent: (_e, turn) => {
      if (turn === 0) return buffIntent(4, "strength");
      const i = (turn - 1) % 5;
      if (i === 0) return attackIntent(22);
      if (i === 1) return attackDebuff(16, "weak", 2);
      if (i === 2) return defendIntent(24);
      if (i === 3) return buffIntent(3, "strength");
      return attackIntent(30);
    },
    act(c, e) {
      if (e.intent.kind === "buff" && e.intent.status) {
        addStatus(e.statuses, e.intent.status, e.intent.value);
        pushLog(c, "天魔把劫雲握進掌心");
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
  ["mumei"],
  ["zhiren", "zhiren"],
  ["mumei", "zhiren"],
  ["wuji"],
  ["huoya", "zhiren"],
  ["shijiang"],
  ["youdeng"],
  ["xuefu"],
  ["tongzhong"],
  ["yanxi"],
  ["shijiang", "youdeng"],
  ["xuefu", "zhiren"],
];

export const ACT2_COMBAT: string[][] = [
  ["yeshou", "huoya"],
  ["shikui"],
  ["lingshe", "lingshe"],
  ["yeshou", "sanxiu"],
  ["huoya", "shanxiao"],
  ["shikui", "sanxiu"],
  ["mumei", "lingshe"],
  ["wuji", "zhiren"],
  ["wuji", "huoya"],
  ["mumei", "shikui"],
  ["moxiao"],
  ["jiantong", "jiantong"],
  ["fengli"],
  ["yaokui"],
  ["moxiao", "sanxiu"],
  ["fengli", "huoya"],
  ["yaokui", "lingshe"],
  ["tongzhong", "jiantong"],
];

export const ACT3_COMBAT: string[][] = [
  ["moxiao", "fengli"],
  ["yaokui", "shikui"],
  ["jiantong", "yeshou"],
  ["tongzhong", "yanxi"],
  ["xuefu", "xuefu"],
  ["wuji", "moxiao"],
  ["yaokui", "mumei"],
  ["fengli", "lingshe"],
  ["shijiang", "shikui"],
  ["jiantong", "huoya"],
];

export const ELITES = [
  "neimen",
  "juyuan",
  "xinmo",
  "jianbing",
  "huxian",
  "lianshi",
  "leishi",
  "xuehe",
  "zhujian",
  "yecha",
];

export function scaleHp(base: number, act: ActId, calamity = 0): number {
  const actMul = act === 3 ? 1.58 : act === 2 ? 1.28 : 1;
  const n = actMul * base * (1 + 0.12 * calamity);
  return Math.max(1, Math.floor(n));
}

export function intentLabel(intent: Intent): string {
  if (intent.kind === "attack") return `攻 ${intent.value}`;
  if (intent.kind === "defend") return `守 ${intent.value}`;
  if (intent.kind === "buff") return "蓄勢";
  if (intent.kind === "debuff") return "詛咒";
  return `攻 ${intent.value}`;
}

export function pickLine(def: EnemyDef, key: "start" | "act" | "hurt"): string | null {
  const list = def.lines?.[key];
  if (!list?.length) return null;
  return list[Math.floor(Math.random() * list.length)] ?? null;
}

export function encounterOpen(ids: string[], xp: number): boolean {
  const gate = { xp } as MetaState;
  return ids.every((id) => contentOpen(gate, ENEMIES[id]?.unlock));
}
