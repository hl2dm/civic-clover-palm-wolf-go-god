import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function openRest(page) {
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
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const g = window.__wendao;
    if (!g) return;
    const run = g.getState().run;
    if (run) g.setState({ screen: "rest", run: { ...run }, pending: null });
  });
  await page.waitForSelector("[data-scene=rest]");
  await page.waitForTimeout(300);
}

async function flow(page, tag) {
  await openRest(page);
  await page.screenshot({ path: `/workspace/screenshots/upgrade-rest-${tag}.png` });
  await page.getByRole("button", { name: /溫養/ }).click();
  await page.waitForSelector("[data-scene=select]");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/workspace/screenshots/upgrade-pick-${tag}.png` });
  await page.locator("[data-card-uid]").first().click();
  await page.waitForSelector("[data-upgrade-preview]");
  await page.waitForTimeout(350);
  await page.screenshot({ path: `/workspace/screenshots/upgrade-compare-${tag}.png` });
  await page.getByRole("button", { name: "進境此功" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/workspace/screenshots/upgrade-done-${tag}.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
  );
  console.log(tag, {
    preview: await page.locator("[data-upgrade-preview]").count(),
    doneBtn: await page.getByRole("button", { name: "繼續前行" }).count(),
    overflow,
  });
}

const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await flow(desk, "desk");
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await flow(phone, "phone");
console.log("errors", errors);
await browser.close();
