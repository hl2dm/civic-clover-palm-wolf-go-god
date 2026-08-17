import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const out = process.argv[3] ?? "/workspace/screenshots/qa-combat-layout.png";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

await page.evaluate(async () => {
  const g = window.__wendao;
  if (!g) throw new Error("no store");
  let s = g.getState();
  if (!s.run) {
    s.newRun();
    s = g.getState();
  }
  const { startCombat } = await import("/src/lib/game/combat.ts");
  let n = 1;
  const combat = startCombat(s.run, ["xinmo"], () => `qa${n++}`);
  g.setState({ screen: "combat", combat, run: { ...s.run } });
});

await page.waitForSelector("[data-foe]");
await page.waitForTimeout(500);

const measure = await page.evaluate(() => {
  const foe = document.querySelector("[data-foe]");
  const sprite = foe?.querySelector("img.pointer-events-none") ?? foe?.querySelector("img");
  const intent = document.querySelector(".intent-badge");
  const icon = document.querySelector(".intent-icon");
  const speech = document.querySelector(".foe-speech");
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  return {
    foe: box(foe),
    sprite: box(sprite),
    intent: box(intent),
    icon: box(icon),
    speech: box(speech),
  };
});

await page.screenshot({ path: out, fullPage: false });
await browser.close();

const fails = [];
if (measure.intent && (measure.intent.w > 80 || measure.intent.h > 80)) {
  fails.push(`intent too big ${measure.intent.w}x${measure.intent.h}`);
}
if (measure.icon && (measure.icon.w > 80 || measure.icon.h > 80)) {
  fails.push(`intent icon too big ${measure.icon.w}x${measure.icon.h}`);
}
if (measure.speech && measure.sprite) {
  const mid = measure.speech.y + measure.speech.h / 2;
  const spriteTop = measure.sprite.y;
  const spriteBot = measure.sprite.y + measure.sprite.h;
  const chest = spriteTop + measure.sprite.h * 0.35;
  const waist = spriteTop + measure.sprite.h * 0.75;
  if (mid < spriteTop || mid > spriteBot) fails.push("speech not on body");
  if (mid < chest - 8 || mid > waist + 8) fails.push(`speech not on chest (mid=${mid}, chest=${chest}, waist=${waist})`);
}
if (!measure.intent) fails.push("intent missing");
if (!measure.speech) fails.push("speech missing");
if (errors.length) fails.push(...errors.slice(0, 5));

console.log(JSON.stringify({ measure, fails, out }, null, 2));
if (fails.length) process.exit(1);
