import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__wendao), { timeout: 15000 });
await page.waitForTimeout(400);

await page.evaluate(() => {
  const g = window.__wendao;
  const s = g.getState();
  g.setState({
    meta: { ...s.meta, xp: 40, merit: 25, runs: 2, seen: ["shanxiao"], seenCards: ["pikong"] },
    screen: "title",
    heritageOpen: false,
  });
});
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/qa-title-progress.png" });

await page.click(".title-dust");
await page.waitForSelector(".unlock-next");
await page.waitForTimeout(200);
const heritageText = await page.locator(".heritage-board").innerText();
await page.screenshot({ path: "/workspace/screenshots/qa-heritage-unlocks.png" });

await page.evaluate(async () => {
  const g = window.__wendao;
  if (!g.getState().run) g.getState().newRun();
  const { startCombat } = await import("/src/lib/game/combat.ts");
  let n = 1;
  const combat = startCombat(g.getState().run, ["xinmo", "sanxiu"], () => `q${n++}`);
  g.setState({ screen: "combat", heritageOpen: false, combat });
});
await page.waitForSelector("[data-foe]");
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/qa-unique-foes.png" });

const srcs = await page.$$eval("[data-foe] img.pointer-events-none", (els) =>
  [...new Set(els.map((e) => e.getAttribute("src") || ""))],
);

const fails = [];
if (!heritageText.includes("還差") && !heritageText.includes("距")) fails.push("heritage missing remain text");
if (!heritageText.includes("霧姬") && !heritageText.includes("煉氣")) fails.push("heritage missing next unlock names");
if (srcs.some((s) => s.includes("/yeshou/") || s.includes("/jindan/"))) fails.push("reused sprite still showing: " + srcs.join(","));
if (!srcs.some((s) => s.includes("xinmo") || s.includes("sanxiu"))) fails.push("unique sprites missing: " + srcs.join(","));
if (errors.length) fails.push(...errors.slice(0, 4));

console.log(JSON.stringify({ heritageOk: heritageText.slice(0, 240), srcs, fails }, null, 2));
await browser.close();
if (fails.length) process.exit(1);
