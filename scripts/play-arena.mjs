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
const start = page.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
await start.first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/arena-idle.png" });
const card = page.locator("button").filter({ hasText: "劈空劍" }).first();
if (await card.count()) await card.click();
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/arena-attack.png" });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nbm = mobile.getByRole("button", { name: "開啟新的一途" });
if (await nbm.count()) {
  await nbm.click();
  const c = mobile.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await mobile.waitForTimeout(300);
const st = mobile.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
if (await st.count()) await st.first().click();
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: "/workspace/screenshots/arena-mobile.png" });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
console.log("errors", errors);
console.log("overflow", overflow);
await browser.close();
