import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function pageAt(viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  return page;
}

const title = await pageAt({ width: 1280, height: 800 });
await title.screenshot({ path: "/workspace/screenshots/title-now.png", animations: "disabled" });
await title.close();

const mob = await pageAt({ width: 390, height: 844 });
await mob.screenshot({ path: "/workspace/screenshots/title-mobile-now.png", animations: "disabled" });
await mob.close();

const page = await pageAt({ width: 1280, height: 820 });
const start = page.getByRole("button", { name: "開啟新的一途" });
if (await start.count()) {
  await start.click();
  const again = page.getByRole("button", { name: "重新問道" });
  if (await again.count()) await again.click();
}
await page.waitForTimeout(400);
const fight = page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first();
if (await fight.count()) await fight.click();
await page.waitForTimeout(900);

await page.evaluate(() => {
  const api = window.__wendao;
  if (!api) throw new Error("no store");
  const combat = api.getState().combat;
  if (!combat) throw new Error("no combat");
  const next = structuredClone(combat);
  next.playerBlock = 5;
  api.setState({ combat: next });
});
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/ward-now.png", animations: "disabled" });

const hand = page.locator("[data-hand-rail]");
if (await hand.count()) {
  await hand.screenshot({ path: "/workspace/screenshots/hand-rail2.png", animations: "disabled" });
}

await page.evaluate(() => {
  const api = window.__wendao;
  api.setState({
    screen: "reward",
    reward: {
      gold: 18,
      cards: [
        { uid: "a", defId: "lianzhan", upgraded: false },
        { uid: "b", defId: "qingxin", upgraded: false },
        { uid: "c", defId: "jindanhu", upgraded: false },
      ],
      potion: null,
      relic: null,
      pickedCard: false,
      pickedPotion: false,
      pickedRelic: false,
    },
  });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/reward-now.png", animations: "disabled" });

const hud = await page.evaluate(() => {
  const seal = document.querySelector(".block-seal");
  if (!seal) return null;
  const r = seal.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
});

console.log({ errors, hud });
await browser.close();
if (errors.length) process.exit(1);
