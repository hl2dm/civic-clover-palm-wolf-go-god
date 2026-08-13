import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(500);
await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
await page.waitForTimeout(800);

await page.evaluate(() => {
  const api = window.__wendao;
  if (!api) throw new Error("no store");
  const combat = api.getState().combat;
  if (!combat) throw new Error("no combat");
  const next = structuredClone(combat);
  next.enemies.forEach((e, i) => {
    e.hp = i === next.enemies.length - 1 ? 1 : 0;
  });
  api.setState({ combat: next });
});

await page.locator("button").filter({ hasText: "劈空劍" }).first().click();
if (await page.getByText("擇敵").count()) {
  await page.keyboard.press("Enter");
}
await page.waitForTimeout(380);
const stillCombat = await page.getByText("回合").count();
const stillFoe = await page.locator("[data-foe]").count();
await page.screenshot({ path: "/workspace/screenshots/victory-hold.png" });
await page.waitForTimeout(1000);
const winWord = await page.getByText("勝", { exact: true }).count();
await page.screenshot({ path: "/workspace/screenshots/victory-banner.png" });
await page.waitForTimeout(1800);
const reward = await page.getByText("戰後收穫").count();
await page.screenshot({ path: "/workspace/screenshots/victory-reward.png" });
console.log({ stillCombat, stillFoe, winWord, reward, errors });
await browser.close();
if (!stillCombat) throw new Error("jumped before settle");
if (!stillFoe) throw new Error("enemy vanished on kill");
if (!winWord) throw new Error("no win banner");
if (!reward) throw new Error("reward never arrived");
