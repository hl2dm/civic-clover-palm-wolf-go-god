import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const newBtn = page.getByRole("button", { name: "開啟新的一途" });
if (await newBtn.count()) {
  await newBtn.click();
  const confirm = page.getByRole("button", { name: "重新問道" });
  if (await confirm.count()) await confirm.click();
}
await page.waitForTimeout(200);
const toastEarly = await page.locator(".fx-toast-bar").count();
await page.waitForTimeout(2600);
const toastLate = await page.locator(".fx-toast-bar").count();
console.log("toast early/late", toastEarly, toastLate);

const start = page.locator("button:not([disabled])").filter({ hasText: /斬妖|精英/ });
if (await start.count()) await start.first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/combat-items.png" });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const cnew = mobile.getByRole("button", { name: "開啟新的一途" });
if (await cnew.count()) {
  await cnew.click();
  const cf = mobile.getByRole("button", { name: "重新問道" });
  if (await cf.count()) await cf.click();
}
await mobile.waitForTimeout(300);
const ms = mobile.locator("button:not([disabled])").filter({ hasText: /斬妖|精英/ });
if (await ms.count()) await ms.first().click();
await mobile.waitForTimeout(500);
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
const pot = await mobile.locator("button[title^='回氣丹']").boundingBox();
const relic = await mobile.locator("button[title^='聚靈幡']").boundingBox();
console.log("mobile overflow", overflow, "relic", relic, "potion", pot);
await mobile.screenshot({ path: "/workspace/screenshots/combat-mobile.png" });
await browser.close();
