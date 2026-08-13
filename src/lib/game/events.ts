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
];
