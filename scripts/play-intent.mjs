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
await page.waitForTimeout(350);
await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
await page.waitForTimeout(800);

const badges = await page.locator(".intent-badge").evaluateAll((els) =>
  els.map((e) => {
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w ?? r.width), h: Math.round(r.h ?? r.height), text: e.getAttribute("data-intent") };
  }),
);
console.log("intent badges", badges);
console.log("intent imgs", await page.locator(".intent-icon").count());
await page.screenshot({ path: "/workspace/screenshots/qa-intent.png" });

const hu = page.locator("button").filter({ hasText: "護體訣" }).first();
if (await hu.count()) await hu.click({ force: true });
await page.waitForTimeout(500);
console.log("ward imgs", await page.locator(".ward-img").count());
await page.screenshot({ path: "/workspace/screenshots/qa-ward.png" });
await page.screenshot({ path: "/workspace/screenshots/qa-ward-player.png", clip: { x: 40, y: 180, width: 460, height: 380 } });
await page.screenshot({ path: "/workspace/screenshots/qa-intent-crop.png", clip: { x: 760, y: 80, width: 500, height: 420 } });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nb2 = mobile.getByRole("button", { name: "開啟新的一途" });
if (await nb2.count()) {
  await nb2.click();
  const c = mobile.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await mobile.waitForTimeout(250);
const fight = mobile.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
if (await fight.count()) await fight.first().click({ force: true });
await mobile.waitForTimeout(500);
const hu2 = mobile.locator("button").filter({ hasText: "護體訣" }).first();
if (await hu2.count()) await hu2.click({ force: true });
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "/workspace/screenshots/qa-intent-mobile.png" });
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log("mobile overflow", overflow);
console.log("mobile badges", await mobile.locator(".intent-badge").count());
console.log("errors", errors);
await browser.close();
