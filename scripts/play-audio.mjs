import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const mute = page.getByRole("button", { name: "關閉音效" });
if (!(await mute.count())) throw new Error("mute missing on title");
await mute.click();
await page.waitForTimeout(80);
const afterMute = await page.getByRole("button", { name: "開啟音效" }).count();
await page.getByRole("button", { name: "開啟音效" }).click();
const ctx = await page.evaluate(async () => {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return { has: false };
  const c = new Ctor();
  await c.resume();
  return { has: true, state: c.state, rate: c.sampleRate };
});
console.log("mute toggled", afterMute, "ctx", ctx);

const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(400);
const start = page.locator("button:not([disabled])").filter({ hasText: /斬妖/ });
await start.first().click();
await page.waitForTimeout(600);
const barMute = page.getByRole("button", { name: /音效/ });
console.log("combat mute", await barMute.count());
const card = page.locator("button").filter({ hasText: "劈空劍" }).first();
if (await card.count()) await card.click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/audio-combat.png" });
console.log("errors", errors);
await browser.close();
