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
  await page.waitForTimeout(400);
  if (fn) await fn(page);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, animations: "disabled" });
  await page.close();
}

await shot("title-now", { width: 1280, height: 800 });
await shot("title-mobile-now", { width: 390, height: 844 });

await shot("reward-now", { width: 1280, height: 860 }, async (page) => {
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
        potion: "xiaohuandan",
        relic: null,
        pickedCard: false,
        pickedPotion: false,
        pickedRelic: false,
      },
    });
  });
  await page.waitForTimeout(500);
});

await shot("reward-mobile-now", { width: 390, height: 844 }, async (page) => {
  await page.evaluate(() => {
    const api = window.__wendao;
    if (!api) throw new Error("no store");
    api.setState({
      screen: "reward",
      reward: {
        gold: 22,
        cards: [
          { uid: "r1", defId: "xushi", upgraded: false },
          { uid: "r2", defId: "qingxin", upgraded: false },
          { uid: "r3", defId: "fenxin", upgraded: false },
        ],
        potion: null,
        relic: null,
        pickedCard: false,
        pickedPotion: false,
        pickedRelic: false,
      },
    });
  });
  await page.waitForTimeout(500);
});

console.log({ errors });
await browser.close();
if (errors.length) process.exit(1);
