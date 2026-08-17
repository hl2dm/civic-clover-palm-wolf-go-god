import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const ids = process.argv.slice(3);
const foes = ids.length
  ? ids
  : ["mumei", "zhiren", "shanxiao", "jianbing", "wuji", "huxian", "xinmo", "sanxiu", "neimen", "huoya"];

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`${m.type()}: ${m.text()}`);
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const report = [];
for (const id of foes) {
  const shot = `/workspace/screenshots/qa-foe-${id}.png`;
  await page.evaluate(async (defId) => {
    const g = window.__wendao;
    if (!g) throw new Error("no store");
    let s = g.getState();
    if (!s.run) {
      s.newRun();
      s = g.getState();
    }
    const { startCombat } = await import("/src/lib/game/combat.ts");
    let n = 1;
    const combat = startCombat(s.run, [defId], () => `qa-${defId}-${n++}`);
    g.setState({ screen: "combat", combat, run: { ...s.run } });
  }, id);
  await page.waitForSelector("[data-foe]");
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("[data-foe] img")]
      .filter((el) => getComputedStyle(el).opacity !== "0")
      .map((el) => ({
        src: el.currentSrc || el.src,
        nw: el.naturalWidth,
        nh: el.naturalHeight,
        w: +el.getBoundingClientRect().width.toFixed(1),
        h: +el.getBoundingClientRect().height.toFixed(1),
      }));
    const speech = document.querySelector(".foe-speech");
    const sr = speech?.getBoundingClientRect();
    const sprite = imgs[0];
    return {
      imgs,
      speech: speech?.textContent ?? null,
      speechY: sr ? +sr.y.toFixed(1) : null,
      spriteTop: sprite ? +(document.querySelector("[data-foe] img")?.getBoundingClientRect().y ?? 0).toFixed(1) : null,
    };
  });
  await page.screenshot({ path: shot, fullPage: false });
  report.push({ id, shot, ...info });
}

await browser.close();
console.log(JSON.stringify({ report, errors: errors.slice(0, 12) }, null, 2));
if (errors.length) process.exit(1);
