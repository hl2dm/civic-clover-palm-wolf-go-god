import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) => errors.push("fail " + r.url()));
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
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/sprites-idle.png" });
const card = page.locator("button").filter({ hasText: "劈空劍" }).first();
if (await card.count()) await card.click();
await page.waitForTimeout(180);
await page.screenshot({ path: "/workspace/screenshots/sprites-attack.png" });
await page.waitForTimeout(400);
const imgs = await page.evaluate(() => {
  const list = [...document.querySelectorAll("img")].map((i) => i.currentSrc);
  return list.filter((s) => s.includes("/sprites/"));
});
console.log("sprite imgs", imgs);
console.log("body", (await page.locator("body").innerText()).slice(0, 240).replace(/\n/g, " | "));
console.log("errors", errors);

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
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: "/workspace/screenshots/sprites-mobile.png" });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
console.log("mobile overflow", overflow);
await browser.close();
