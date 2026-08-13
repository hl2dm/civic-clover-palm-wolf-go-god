import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function openShop(page) {
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  const newBtn = page.getByRole("button", { name: "開啟新的一途" });
  if (await newBtn.count()) {
    await newBtn.click();
    const confirm = page.getByRole("button", { name: "重新問道" });
    if (await confirm.count()) await confirm.click();
  }
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const api = window.__wendao;
    if (!api) throw new Error("no store");
    const run = api.getState().run;
    if (!run) throw new Error("no run");
    const start = run.map.find((n) => n.layer === 0);
    if (start) start.type = "shop";
    api.setState({ run: { ...run, map: run.map.map((n) => ({ ...n })) } });
  });
  await page.waitForTimeout(80);
  await page.getByRole("button", { name: /坊市/ }).first().click();
  await page.waitForSelector('[data-scene="shop"]');
}

const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await openShop(desk);
const greet = await desk.locator(".shop-speech").innerText();
const keeper = await desk.locator('img[alt="夜市掌櫃"]').count();
const bird = await desk.evaluate(() => {
  const imgs = [...document.images].map((i) => i.src);
  return imgs.some((s) => s.includes("keeper.png") && !s.includes("keeper-bust"));
});
console.log("greet", greet, "keeper", keeper, "oldKeeper", bird);
await desk.screenshot({ path: "/workspace/screenshots/shop-desk.png" });

const card = desk.locator("[data-card-uid^='shop-']").first();
await card.click();
await desk.waitForTimeout(200);
const deal = await desk.locator(".shop-deal").innerText();
console.log("deal", deal.replace(/\s+/g, " ").slice(0, 80));
await desk.screenshot({ path: "/workspace/screenshots/shop-pick.png" });

const buy = desk.getByRole("button", { name: "購置" });
if (await buy.count()) await buy.click();
await desk.waitForTimeout(400);
await desk.screenshot({ path: "/workspace/screenshots/shop-bought.png" });

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await openShop(phone);
const overflow = await phone.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
const errors = [];
phone.on("pageerror", (e) => errors.push(String(e)));
await phone.waitForTimeout(200);
console.log("mobile overflow", overflow, "errors", errors);
await phone.screenshot({ path: "/workspace/screenshots/shop-phone.png" });

await browser.close();
