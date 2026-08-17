import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/title-cta.png" });

const cta = page.getByRole("button", { name: "開啟新的一途" });
console.log("cta", await cta.count(), await cta.innerText().catch(() => ""));

await page.evaluate(() => {
  const g = window.__wendao;
  if (!g.getState().run) g.getState().newRun();
  const run = { ...g.getState().run, relics: ["yinqi", "huxin", "julingfan", "shijin"] };
  g.setState({ screen: "map", run });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/map-relic-dock.png" });

const dock = await page.locator(".map-relic-dock").boundingBox();
const relicLabel = await page.getByText("法寶").count();
console.log("dock", dock, "relicLabel", relicLabel);

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
phone.on("pageerror", (e) => errors.push(e.message));
await phone.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await phone.waitForTimeout(400);
await phone.screenshot({ path: "/workspace/screenshots/title-cta-mobile.png" });
const overflowTitle = await phone.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
await phone.evaluate(() => {
  const g = window.__wendao;
  if (!g.getState().run) g.getState().newRun();
  const run = { ...g.getState().run, relics: ["yinqi", "huxin", "julingfan"] };
  g.setState({ screen: "map", run });
});
await phone.waitForTimeout(400);
await phone.screenshot({ path: "/workspace/screenshots/map-relic-dock-mobile.png" });
const overflowMap = await phone.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log({ overflowTitle, overflowMap, errors });
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
if (!dock) throw new Error("map relic dock missing");
if (dock.y < 600) throw new Error("dock not at bottom");
