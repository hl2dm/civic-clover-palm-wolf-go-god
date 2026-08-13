import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(500);

await page.evaluate(async () => {
  const api = window.__wendao;
  const s = api.getState();
  const run = s.run;
  const { CARDS } = await import("/src/lib/game/cards.ts");
  const pool = Object.values(CARDS).filter((c) => c.rarity !== "starter").slice(0, 3);
  api.setState({
    screen: "reward",
    reward: {
      gold: 20,
      cards: pool.map((c, i) => ({ uid: `r${i}`, defId: c.id, upgraded: false })),
      potion: "fenglei",
      relic: null,
      pickedCard: false,
      pickedPotion: false,
      pickedRelic: true,
    },
    run,
  });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/reward-desk.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/reward-phone.png" });

await page.setViewportSize({ width: 1280, height: 800 });
await page.evaluate(async () => {
  const api = window.__wendao;
  const { EVENTS } = await import("/src/lib/game/events.ts");
  const ev = EVENTS.find((e) => e.id === "danfang") ?? EVENTS[0];
  api.setState({ screen: "event", event: ev, eventLog: null });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/event-danfang.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/event-danfang-phone.png" });

const title = await page.getByText("廢棄丹房").count();
const loot = await page.getByText("收穫").count();
console.log({ title, errors });
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
if (!title) throw new Error("event title missing");
