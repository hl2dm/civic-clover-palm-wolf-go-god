import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const dir = "/workspace/screenshots";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__wendao?.getState?.().ready), { timeout: 8000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${dir}/qa-title-fixed.png` });

await page.locator('[aria-label="传承"]').click();
await page.waitForSelector(".heritage-board");
await page.waitForTimeout(400);
await page.screenshot({ path: `${dir}/qa-heritage-fixed.png` });

const info = await page.evaluate(() => {
  const thumbs = [...document.querySelectorAll(".heritage-thumb img")].map((img) => ({
    src: img.getAttribute("src"),
    w: img.naturalWidth,
    h: img.naturalHeight,
  }));
  const missing = thumbs.filter((t) => !t.w);
  const slip = document.querySelector('img[alt="传承"]');
  return {
    slip: slip ? { w: slip.naturalWidth, h: slip.naturalHeight, src: slip.getAttribute("src") } : null,
    thumbCount: thumbs.length,
    missing: missing.map((m) => m.src),
    srcs: thumbs.map((t) => t.src),
    text: document.body.innerText.slice(0, 240),
  };
});
console.log(JSON.stringify({ info, errors }, null, 2));
await browser.close();
if (errors.length || info.missing.length) process.exit(1);
