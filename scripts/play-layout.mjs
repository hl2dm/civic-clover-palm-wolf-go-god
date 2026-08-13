import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const nb = page.getByRole("button", { name: "開啟新的一途" });
if (await nb.count()) {
  await nb.click();
  const c = page.getByRole("button", { name: "重新問道" });
  if (await c.count()) await c.click();
}
await page.waitForTimeout(500);
await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/fix-combat.png" });

const measure = await page.evaluate(() => {
  const rail = document.querySelector("[data-hand-rail]");
  const cards = [...document.querySelectorAll("[data-card-uid]")];
  const intents = [...document.querySelectorAll("[data-intent]")].map((el) => ({
    t: el.getAttribute("data-intent"),
    y: Math.round(el.getBoundingClientRect().top),
    h: Math.round(el.getBoundingClientRect().height),
  }));
  const rr = rail.getBoundingClientRect();
  return {
    rail: { h: Math.round(rr.height), top: Math.round(rr.top), bot: Math.round(rr.bottom) },
    cards: cards.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        h: Math.round(r.height),
        top: Math.round(r.top),
        bot: Math.round(r.bottom),
        clipped: r.bottom > rr.bottom + 1 || r.top < rr.top - 1,
      };
    }),
    intents,
  };
});
console.log(JSON.stringify(measure, null, 2));

await page.evaluate(() => {
  const api = window.__wendao;
  api.setState({
    screen: "shop",
    shop: [
      { kind: "card", id: "pikong", price: 55, sold: false },
      { kind: "card", id: "tianlei", price: 80, sold: false },
      { kind: "card", id: "jindanhu", price: 125, sold: false },
      { kind: "relic", id: "huxin", price: 155, sold: false },
      { kind: "potion", id: "huiqi", price: 52, sold: false },
      { kind: "remove", id: "remove", price: 75, sold: false },
    ],
    combat: null,
  });
});
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/fix-shop.png" });
const chips = await page.locator(".price-chip").evaluateAll((els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect();
    return { t: el.textContent, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) };
  }),
);
console.log({ chips });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => {
  window.__wendao.setState({ screen: "combat" });
});
await page.waitForTimeout(400);
// go back to a real combat
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.locator("button").filter({ hasText: /續緣|斬妖/ }).first().click();
await page.waitForTimeout(400);
if (await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).count()) {
  await page.locator("button:not([disabled])").filter({ hasText: /斬妖/ }).first().click();
}
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/fix-combat-mobile.png" });
await browser.close();
