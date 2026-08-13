import { CARDS, rewardPool } from "./cards";
import { POTION_LIST } from "./potions";
import { RELIC_LIST } from "./relics";
import { Rng } from "./rng";
import type { CardInst, RunState } from "./types";

export interface EventResult {
  log: string;
  select?: "upgrade" | "remove";
}

export interface EventChoice {
  id: string;
  label: string;
  hint: string;
  apply: (run: RunState, rng: Rng, alloc: () => string) => EventResult;
}

export interface EventDef {
  id: string;
  title: string;
  body: string;
  choices: EventChoice[];
  bg: string;
  figure: string;
  seal: string;
}

function addCard(run: RunState, defId: string, alloc: () => string, upgraded = false): void {
  run.deck.push({ uid: alloc(), defId, upgraded });
}

export const EVENTS: EventDef[] = [
  {
    id: "dongfu",
    title: "無名洞府",
    body: "石門半掩，裡面殘留著前人的氣息。洞壁刻著半卷功法，也隱隱有陣法反噬的味道。",
    bg: "/scenes/events/dongfu.jpg",
    figure: "/scenes/hermit.jpg",
    seal: "府",
    choices: [
      {
        id: "take",
        label: "推門而入",
        hint: "獲得一件隨機法寶，失去 8 點氣血",
        apply(run, rng) {
          const pool = RELIC_LIST.filter((r) => !run.relics.includes(r.id));
          if (pool.length) {
            const r = rng.pick(pool);
            run.relics.push(r.id);
            if (r.id === "yinqi") run.maxEnergy += 1;
            if (r.id === "xisui") {
              run.maxHp += 8;
              run.hp += 8;
            }
            run.hp = Math.max(1, run.hp - 8);
            return { log: `你奪得${r.name}，也受了反噬。` };
          }
          run.gold += 40;
          run.hp = Math.max(1, run.hp - 8);
          return { log: "洞府已空，你只揀到一袋靈石。" };
        },
      },
      {
        id: "leave",
        label: "謹慎離去",
        hint: "獲得 25 靈石",
        apply(run) {
          run.gold += 25;
          return { log: "你沒有貪功，沿途揀了些散落靈石。" };
        },
      },
    ],
  },
  {
    id: "sanxiu",
    title: "散修交易",
    body: "一名面黃肌瘦的散修攔住去路，攤開一塊舊布：幾張殘破符籙，要價不低。",
    bg: "/scenes/events/sanxiu.jpg",
    figure: "/scenes/wanderer.jpg",
    seal: "市",
    choices: [
      {
        id: "buy",
        label: "花 50 靈石換功法",
        hint: "獲得一張隨機罕見牌",
        apply(run, rng, alloc) {
          if (run.gold < 50) return { log: "靈石不夠，對方冷笑一聲走了。" };
          run.gold -= 50;
          const pool = rewardPool().filter((c) => c.rarity === "uncommon" || c.rarity === "rare");
          const card = rng.pick(pool);
          addCard(run, card.id, alloc);
          return { log: `你得到了「${card.name}」。` };
        },
      },
      {
        id: "rob",
        label: "搶了便是",
        hint: "獲得 40 靈石，失去 10 點氣血",
        apply(run) {
          run.gold += 40;
          run.hp = Math.max(1, run.hp - 10);
          return { log: "散修逃入林中，你奪了錢袋，也被他暗器擦傷。" };
        },
      },
      {
        id: "ignore",
        label: "不理會",
        hint: "無事發生",
        apply: () => ({ log: "你拂袖而去。" }),
      },
    ],
  },
  {
    id: "xinmo",
    title: "心魔叩問",
    body: "夜宿崖邊，你聽見自己的聲音：若功法駁雜，道心如何不裂？",
    bg: "/scenes/events/xinmo.jpg",
    figure: "/scenes/shade.jpg",
    seal: "心",
    choices: [
      {
        id: "purge",
        label: "廢去一門駁雜功法",
        hint: "移除一張牌",
        apply: () => ({ log: "你決心精簡所學。", select: "remove" }),
      },
      {
        id: "endure",
        label: "以痛壓心",
        hint: "失去 12 點氣血，獲得 1 張罕見牌",
        apply(run, rng, alloc) {
          run.hp = Math.max(1, run.hp - 12);
          const pool = rewardPool().filter((c) => c.rarity === "uncommon");
          const card = rng.pick(pool);
          addCard(run, card.id, alloc);
          return { log: `痛楚過去，你悟得「${card.name}」。` };
        },
      },
    ],
  },
  {
    id: "qianbei",
    title: "前輩殘影",
    body: "一縷殘魂坐在枯松下，看了你一眼：「小輩，可願聽我一言？」",
    bg: "/scenes/events/qianbei.jpg",
    figure: "/scenes/hermit.jpg",
    seal: "影",
    choices: [
      {
        id: "listen",
        label: "正心聽講",
        hint: "升級一張牌",
        apply: () => ({ log: "殘影為你點破瓶頸。", select: "upgrade" }),
      },
      {
        id: "gold",
        label: "求些盤纏",
        hint: "獲得 70 靈石",
        apply(run) {
          run.gold += 70;
          return { log: "殘影嘆了口氣，丟給你一袋靈石。" };
        },
      },
    ],
  },
  {
    id: "lingquan",
    title: "山中靈泉",
    body: "一線清泉自石縫滲出，喝下去只怕有益，也怕雜質入體。",
    bg: "/scenes/events/lingquan.jpg",
    figure: "/scenes/fox.jpg",
    seal: "泉",
    choices: [
      {
        id: "drink",
        label: "盡飲",
        hint: "回復 25 點氣血，最大氣血 +4",
        apply(run) {
          run.maxHp += 4;
          run.hp = Math.min(run.maxHp, run.hp + 25);
          return { log: "靈泉入喉，氣血鼓蕩。" };
        },
      },
      {
        id: "wash",
        label: "只作洗滌",
        hint: "回復 12 點氣血",
        apply(run) {
          run.hp = Math.min(run.maxHp, run.hp + 12);
          return { log: "你洗淨塵土，精神一振。" };
        },
      },
    ],
  },
  {
    id: "tiancai",
    title: "天材地寶",
    body: "崖縫中探出一株三葉靈芝。強摘可能損了根基，細心培元則可溫養功法。",
    bg: "/scenes/events/tiancai.jpg",
    figure: "/scenes/fox.jpg",
    seal: "芝",
    choices: [
      {
        id: "refine",
        label: "煉化入體",
        hint: "最大氣血 +6，回復 8 點",
        apply(run) {
          run.maxHp += 6;
          run.hp = Math.min(run.maxHp, run.hp + 8);
          return { log: "靈芝化作溫熱真氣。" };
        },
      },
      {
        id: "study",
        label: "觀其紋理",
        hint: "升級一張牌",
        apply: () => ({ log: "你從葉脈中悟出一絲劍理。", select: "upgrade" }),
      },
    ],
  },
  {
    id: "jieyun",
    title: "劫雲低垂",
    body: "天色忽然壓暗。這不是你的天劫，卻也夠傷人。硬抗可淬鍊肉身。",
    bg: "/scenes/events/jieyun.jpg",
    figure: "/scenes/monk-storm.jpg",
    seal: "劫",
    choices: [
      {
        id: "endure",
        label: "立於雲下",
        hint: "失去 15 點氣血，獲得 1 張稀有牌",
        apply(run, rng, alloc) {
          run.hp = Math.max(1, run.hp - 15);
          const rares = rewardPool().filter((c) => c.rarity === "rare");
          const card = rng.pick(rares);
          addCard(run, card.id, alloc);
          return { log: `雷火劈過，你強記下「${card.name}」。` };
        },
      },
      {
        id: "hide",
        label: "遁入岩隙",
        hint: "無事發生",
        apply: () => ({ log: "你避過這場無主天威。" }),
      },
    ],
  },
  {
    id: "danfang",
    title: "廢棄丹房",
    body: "爐火已熄，案上還剩幾枚封蠟未乾的丹藥。有的溫潤，有的發黑。",
    bg: "/scenes/events/danfang.jpg",
    figure: "/scenes/wanderer.jpg",
    seal: "丹",
    choices: [
      {
        id: "take",
        label: "揀一枚完好的",
        hint: "獲得一枚隨機丹藥",
        apply(run, rng) {
          const p = rng.pick(POTION_LIST);
          const i = run.potions.findIndex((x) => x == null);
          if (i < 0) {
            run.gold += 20;
            return { log: `丹槽已滿，你把「${p.name}」換成了靈石。` };
          }
          run.potions[i] = p.id;
          return { log: `收入「${p.name}」。` };
        },
      },
      {
        id: "brew",
        label: "強行續火再煉",
        hint: "失去 8 點氣血，獲得兩枚丹藥",
        apply(run, rng) {
          run.hp = Math.max(1, run.hp - 8);
          let got = 0;
          for (let n = 0; n < 2; n++) {
            const i = run.potions.findIndex((x) => x == null);
            if (i < 0) break;
            run.potions[i] = rng.pick(POTION_LIST).id;
            got += 1;
          }
          return { log: got ? `爐火反噬，你搶出 ${got} 枚丹藥。` : "丹槽已滿，只挨了一記燙。" };
        },
      },
      {
        id: "eat",
        label: "不問成色，吞下殘渣",
        hint: "回復 16 點氣血",
        apply(run) {
          run.hp = Math.min(run.maxHp, run.hp + 16);
          return { log: "苦澀入喉，氣血卻活了過來。" };
        },
      },
    ],
  },
];

export function pickEvent(rng: Rng): EventDef {
  return rng.pick(EVENTS);
}

export function canUpgrade(card: CardInst): boolean {
  return !card.upgraded && Boolean(CARDS[card.defId]);
}
