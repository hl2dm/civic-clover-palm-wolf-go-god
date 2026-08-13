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
await page.waitForTimeout(300);
await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
await page.waitForTimeout(700);

const play = async (name) => {
  const card = page.locator("button").filter({ hasText: name }).first();
  if (!(await card.count())) return false;
  await card.click();
  await page.waitForTimeout(180);
  const foe = page.locator("button").filter({ hasText: "" }).locator("xpath=ancestor-or-self::button").first();
  // click enemy figure if needed
  const enemy = page.locator("button").nth(0);
  // try click the enemy sprite area - last figure button
  const figures = page.locator("main button, [class*='relative'] button");
  return true;
};

// play 劈空劍 then click enemy
const jian = page.locator("button").filter({ hasText: "劈空劍" }).first();
if (await jian.count()) {
  await jian.click();
  await page.waitForTimeout(200);
  // click right-side enemy
  await page.mouse.click(980, 420);
}
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/fx-slash.png" });
await page.waitForTimeout(2300);
await page.screenshot({ path: "/workspace/screenshots/fx-gone.png" });

const hu = page.locator("button").filter({ hasText: "護體訣" }).first();
if (await hu.count()) {
  await hu.click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: "/workspace/screenshots/fx-shield.png" });

await page.getByRole("button", { name: /結束/ }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/fx-claw.png" });
console.log("errors", errors);
await browser.close();
