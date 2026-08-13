import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() === 404) errors.push("404 " + r.url());
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(400);
await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
await page.waitForSelector("[data-hand-rail] [data-card-uid]");
await page.getByRole("button", { name: "結束" }).click();
const t0 = Date.now();
const shots = [
  [400, "a"],
  [900, "b"],
  [1300, "c"],
  [1800, "d"],
  [2600, "e"],
  [3800, "f"],
  [5200, "g"],
  [7000, "h"],
];
for (const [ms, tag] of shots) {
  const wait = ms - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const snap = await page.evaluate(() => {
    const s = window.__wendao?.getState?.();
    return {
      beat: s?.turnBeat ?? null,
      anim: s?.handAnim ?? null,
      phase: s?.combat?.phase ?? null,
      hand: s?.combat?.hand?.length ?? -1,
      acting: s?.actingUid ?? null,
      banner: document.querySelector(".turn-banner")?.textContent ?? "",
    };
  });
  console.log(ms, snap);
  await page.screenshot({ path: `/workspace/screenshots/turn-${tag}.png` });
}
console.log("errors", errors);
await browser.close();
