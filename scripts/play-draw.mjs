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
const start = page.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
await start.first().click();
await page.waitForSelector("[data-hand-rail]");
await page.waitForTimeout(400);

const measure = async () =>
  page.evaluate(() => {
    const rail = document.querySelector("[data-hand-rail]");
    const player = document.querySelector('img[src*="/sprites/player/"]');
    const box = player?.getBoundingClientRect();
    const railBox = rail?.getBoundingClientRect();
    return {
      hand: Number(rail?.getAttribute("data-hand-count") ?? -1),
      anim: rail?.getAttribute("data-hand-anim") ?? "",
      railH: railBox ? Math.round(railBox.height) : 0,
      playerY: box ? Math.round(box.top) : 0,
      playerH: box ? Math.round(box.height) : 0,
    };
  });

const before = await measure();
await page.screenshot({ path: "/workspace/screenshots/draw-before.png" });

const endBtn = page.getByRole("button", { name: "結束" });
await endBtn.click();

const samples = [];
for (let i = 0; i < 18; i++) {
  await page.waitForTimeout(140);
  samples.push(await measure());
}
await page.screenshot({ path: "/workspace/screenshots/draw-mid.png" });

await page.waitForTimeout(1800);
const after = await measure();
await page.screenshot({ path: "/workspace/screenshots/draw-after.png" });

const hands = samples.map((s) => s.hand);
const anims = samples.map((s) => s.anim);
const heights = [before, ...samples, after].map((s) => s.playerH);
const ys = [before, ...samples, after].map((s) => s.playerY);
const railHs = [before, ...samples, after].map((s) => s.railH);

const minHand = Math.min(...hands);
const maxHand = Math.max(...hands);
const uniqueHands = [...new Set(hands)];
const playerHSpread = Math.max(...heights) - Math.min(...heights);
const playerYSpread = Math.max(...ys) - Math.min(...ys);
const railSpread = Math.max(...railHs) - Math.min(...railHs);

console.log(JSON.stringify({ before, after, hands, anims, playerHSpread, playerYSpread, railSpread, uniqueHands }, null, 2));
console.log("errors", errors);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const mstart = mobile.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
if (await mstart.count()) {
  await mstart.first().click();
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: "/workspace/screenshots/draw-mobile.png" });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
  );
  console.log("mobile overflow", overflow);
}

await browser.close();

if (railSpread > 8) {
  console.error("FAIL rail height jumped", railSpread);
  process.exit(1);
}
if (playerHSpread > 12) {
  console.error("FAIL player height jumped", playerHSpread);
  process.exit(1);
}
if (after.hand < 4) {
  console.error("FAIL did not redraw hand", after);
  process.exit(1);
}
if (uniqueHands.length < 3) {
  console.error("FAIL cards did not appear one-by-one", uniqueHands);
  process.exit(1);
}
console.log("OK sequential draw + stable layout");
