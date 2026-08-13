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
    figure: "/scenes/events/dongfu-fig.jpg",
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
    figure: "/scenes/events/sanxiu-fig.jpg",
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
          return { log: "散修慘叫一聲逃走，你撈了些靈石。" };
        },
      },
      {
        id: "ignore",
        label: "揮袖離去",
        hint: "無所得",
        apply() {
          return { log: "你沒理會這散修。" };
        },
      },
    ],
  },
  {
    id: "xinmo",
    title: "心魔",
    body: "一股陰寒從腳底竄起，眼前浮現自己最懼怕的模樣。",
    bg: "/scenes/events/xinmo.jpg",
    figure: "/scenes/events/xinmo-fig.jpg",
    seal: "心",
    choices: [
      {
        id: "purge",
        label: "以劍破之",
        hint: "移除一張牌",
        apply() {
          return { log: "心魔消散，你決定捨棄一門功法。", select: "remove" };
        },
      },
      {
        id: "endure",
        label: "硬抗心魔",
        hint: "升級一張牌，失去 12 點氣血",
        apply(run) {
          run.hp = Math.max(1, run.hp - 12);
          return { log: "你咬牙挺過心魔，功法隱有精進。", select: "upgrade" };
        },
      },
    ],
  },
  {
    id: "qianbei",
    title: "前輩殘影",
    body: "殘影盤坐於石上，口中念念有詞。靠近似乎能聽清只言片語。",
    bg: "/scenes/events/qianbei.jpg",
    figure: "/scenes/events/qianbei-fig.jpg",
    seal: "影",
    choices: [
      {
        id: "listen",
        label: "靜心聆聽",
        hint: "升級一張牌",
        apply() {
          return { log: "殘影的話語點醒了你。", select: "upgrade" };
        },
      },
      {
        id: "gold",
        label: "搜尋殘影周圍",
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
    figure: "/scenes/events/lingquan-fig.jpg",
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
    figure: "/scenes/events/tiancai-fig.jpg",
    seal: "芝",
    choices: [
      {
        id: "refine",
        label: "煉化入體",
        hint: "最大氣血 +6，回復 8 點",
        apply(run) {
          run.maxHp += 6;
          run.hp = Math.min(run.maxHp, run.hp + 8);
          return { log: "靈芝化作暖流，根基更穩。" };
        },
      },
      {
        id: "study",
        label: "細心培元",
        hint: "升級一張牌",
        apply() {
          return { log: "你從靈芝氣息中悟得一絲法門。", select: "upgrade" };
        },
      },
    ],
  },
  {
    id: "jieyun",
    title: "劫雲",
    body: "烏雲壓頂，雷光在雲層中遊走。硬扛或許能淬體，躲閃則較為穩妥。",
    bg: "/scenes/events/jieyun.jpg",
    figure: "/scenes/events/jieyun-fig.jpg",
    seal: "劫",
    choices: [
      {
        id: "endure",
        label: "迎雷而上",
        hint: "獲得一張罕見牌，失去 15 點氣血",
        apply(run, rng, alloc) {
          run.hp = Math.max(1, run.hp - 15);
          const pool = rewardPool().filter((c) => c.rarity === "rare");
          if (pool.length) {
            const card = rng.pick(pool);
            addCard(run, card.id, alloc);
            return { log: `雷火淬體，你悟得「${card.name}」。` };
          }
          run.gold += 50;
          return { log: "雷火淬體，只得些靈石。" };
        },
      },
      {
        id: "hide",
        label: "躲避雷劫",
        hint: "回復 10 點氣血",
        apply(run) {
          run.hp = Math.min(run.maxHp, run.hp + 10);
          return { log: "你躲過雷劫，稍作調息。" };
        },
      },
    ],
  },
  {
    id: "danfang",
    title: "廢棄丹房",
    body: "爐火已熄，藥香猶在。架上還剩幾枚成色不一的丹藥。",
    bg: "/scenes/events/danfang.jpg",
    figure: "/scenes/events/danfang-fig.jpg",
    seal: "丹",
    choices: [
      {
        id: "take",
        label: "取走丹藥",
        hint: "獲得一枚隨機丹藥",
        apply(run, rng) {
          const i = run.potions.findIndex((x) => x == null);
          if (i < 0) return { log: "丹槽已滿，你只能空手離開。" };
          const p = rng.pick(POTION_LIST);
          run.potions[i] = p.id;
          return { log: `你取得「${p.name}」。` };
        },
      },
      {
        id: "brew",
        label: "嘗試復燃爐火",
        hint: "可能獲得更多丹藥，也可能受傷",
        apply(run, rng) {
          if (rng.next() < 0.55) {
            let got = 0;
            for (let n = 0; n < 2; n++) {
              const i = run.potions.findIndex((x) => x == null);
              if (i < 0) break;
              run.potions[i] = rng.pick(POTION_LIST).id;
              got += 1;
            }
            return { log: got ? `爐火反噬，你搶出 ${got} 枚丹藥。` : "丹槽已滿，只挨了一記燙。" };
          }
          run.hp = Math.max(1, run.hp - 8);
          return { log: "爐火失控，你被燙傷。" };
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
