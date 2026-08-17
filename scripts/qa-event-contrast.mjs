import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const out = process.argv[3] ?? "/workspace/screenshots/qa-event-contrast.png";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__wendao?.getState?.().ready), { timeout: 8000 });
await page.waitForTimeout(200);

await page.evaluate(async () => {
  const g = window.__wendao;
  if (!g.getState().run) g.getState().newRun();
  const { EVENTS } = await import("/src/lib/game/events.ts");
  const event = EVENTS.find((e) => e.id === "lingquan") ?? EVENTS[0];
  g.setState({ screen: "event", event, eventLog: null });
});

await page.waitForSelector(".choice-slip");
await page.waitForTimeout(350);
await page.screenshot({ path: out });

const contrast = await page.evaluate(() => {
  const sample = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { text: el.textContent?.trim().slice(0, 28), color: cs.color, bg: cs.backgroundColor, w: r.width, h: r.height };
  };
  return {
    title: sample(document.querySelector(".event-title-banner h2")),
    label: sample(document.querySelector(".choice-label")),
    hint: sample(document.querySelector(".choice-hint")),
    slip: sample(document.querySelector(".choice-slip")),
  };
});

function lum(css) {
  const m = css?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((n) => Number(n) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  if (a == null || b == null) return 0;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const slipBg = lum(contrast.slip?.bg) ?? 0.8;
const labelL = lum(contrast.label?.color);
const hintL = lum(contrast.hint?.color);
const titleL = lum(contrast.title?.color);
const fails = [];
if (ratio(slipBg, labelL) < 4) fails.push(`label contrast ${ratio(slipBg, labelL).toFixed(2)}`);
if (ratio(slipBg, hintL) < 3) fails.push(`hint contrast ${ratio(slipBg, hintL).toFixed(2)}`);
if ((titleL ?? 1) < 0.45) fails.push(`title too dark ${titleL}`);
if (errors.length) fails.push(...errors.slice(0, 3));

console.log(JSON.stringify({ contrast, ratios: { label: ratio(slipBg, labelL), hint: ratio(slipBg, hintL), titleL }, fails }, null, 2));
await browser.close();
if (fails.length) process.exit(1);
