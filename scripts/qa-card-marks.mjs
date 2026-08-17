import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(name, viewport, fn) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  if (fn) await fn(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, animations: "disabled" });
  const measure = await page.evaluate(() => {
    const marks = [...document.querySelectorAll(".talisman-mark")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || "").trim(),
        cls: el.className,
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        fs: getComputedStyle(el).fontSize,
      };
    });
    return { marks, cards: document.querySelectorAll(".talisman").length };
  });
  await page.close();
  return measure;
}

const reward = await shot("qa-card-marks-reward", { width: 1280, height: 860 }, async (page) => {
  await page.evaluate(() => {
    const api = window.__wendao;
    if (!api) throw new Error("no store");
    api.setState({
      screen: "reward",
      reward: {
        gold: 22,
        cards: [
          { uid: "r1", defId: "lianzhan", upgraded: false },
          { uid: "r2", defId: "huichun", upgraded: false },
          { uid: "r3", defId: "jianyi", upgraded: false },
        ],
        potion: null,
        relic: null,
        pickedCard: false,
        pickedPotion: false,
        pickedRelic: false,
      },
    });
  });
});

const hand = await shot("qa-card-marks-hand", { width: 1280, height: 800 }, async (page) => {
  await page.evaluate(async () => {
    const g = window.__wendao;
    if (!g) throw new Error("no store");
    let s = g.getState();
    if (!s.run) {
      s.newRun();
      s = g.getState();
    }
    const { startCombat } = await import("/src/lib/game/combat.ts");
    let n = 1;
    const combat = startCombat(s.run, ["shanxiao"], () => `qa${n++}`);
    combat.hand = [
      { uid: "h1", defId: "pikong", upgraded: false },
      { uid: "h2", defId: "huti", upgraded: false },
      { uid: "h3", defId: "jianyi", upgraded: false },
      { uid: "h4", defId: "pojia", upgraded: false },
    ];
    g.setState({ screen: "combat", combat, run: { ...s.run } });
  });
  await page.waitForSelector("[data-hand-rail] .talisman-mark");
});

const mobile = await shot("qa-card-marks-mobile", { width: 390, height: 844 }, async (page) => {
  await page.evaluate(async () => {
    const g = window.__wendao;
    if (!g) throw new Error("no store");
    let s = g.getState();
    if (!s.run) {
      s.newRun();
      s = g.getState();
    }
    const { startCombat } = await import("/src/lib/game/combat.ts");
    let n = 1;
    const combat = startCombat(s.run, ["shanxiao"], () => `qa${n++}`);
    combat.hand = [
      { uid: "h1", defId: "pikong", upgraded: false },
      { uid: "h2", defId: "huti", upgraded: false },
      { uid: "h3", defId: "jianyi", upgraded: false },
    ];
    g.setState({ screen: "combat", combat, run: { ...s.run } });
  });
  await page.waitForSelector("[data-hand-rail] .talisman-mark");
});

console.log(JSON.stringify({ reward, hand, mobile, errors }, null, 2));
await browser.close();
if (errors.length) process.exit(1);
