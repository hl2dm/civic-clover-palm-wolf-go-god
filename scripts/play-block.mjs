import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(400);
await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
await page.waitForTimeout(700);

const hu = page.locator("button").filter({ hasText: "護體訣" }).first();
if (await hu.count()) {
  await hu.click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: "/workspace/screenshots/qa-block.png" });
const hud = page.locator(".block-seal");
const bubble = page.locator("text=護").filter({ hasText: /^護$/ });
console.log("block seals", await hud.count());
console.log("head 護 bubbles", await bubble.count());
console.log("block num", await page.locator(".block-seal-num").first().innerText().catch(() => "none"));
console.log("ward imgs", await page.locator(".ward-img").count());
console.log("errors", errors);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nb2 = mobile.getByRole("button", { name: "開啟新的一途" });
if (await nb2.count()) {
  await nb2.click();
  const c = mobile.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await mobile.waitForTimeout(300);
const fight = mobile.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
if (await fight.count()) await fight.first().click();
await mobile.waitForTimeout(600);
const hu2 = mobile.locator("button").filter({ hasText: "護體訣" }).first();
if (await hu2.count()) {
  await hu2.click();
  await mobile.waitForTimeout(400);
}
await mobile.screenshot({ path: "/workspace/screenshots/qa-block-mobile.png" });
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log("mobile overflow", overflow);
await browser.close();
