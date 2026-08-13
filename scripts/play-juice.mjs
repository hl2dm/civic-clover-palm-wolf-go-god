import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/map-items.png", fullPage: true });
const start = page.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
await start.first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/combat-items.png" });
const card = page.locator("button").filter({ hasText: "劈空劍" }).first();
if (await card.count()) await card.click();
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/combat-slam.png" });
const relic = page.locator("button[title^='聚靈幡']");
if (await relic.count()) {
  await relic.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "/workspace/screenshots/relic-inspect.png" });
  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(200);
}
const potion = page.locator("button[title^='回氣丹']");
if (await potion.count()) await potion.click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/potion-use.png" });
console.log("body", (await page.locator("body").innerText()).slice(0, 320).replace(/\n/g, " | "));
console.log("errors", errors);
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
console.log("mobile overflow", overflow);
await browser.close();
