import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/title-clean.png", fullPage: true });

const newBtn = page.getByRole("button", { name: "開啟新的一途" });
if (await newBtn.count()) {
  await newBtn.click();
  await page.waitForTimeout(200);
  const confirm = page.getByRole("button", { name: "重新問道" });
  if (await confirm.count()) await confirm.click();
}
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/map-clean.png", fullPage: true });

const eventNode = page.locator("button:not([disabled])").filter({ hasText: /奇遇/ });
console.log("event nodes", await eventNode.count(), await eventNode.allInnerTexts());
if (await eventNode.count()) {
  await eventNode.first().click();
} else {
  const any = page.locator("button:not([disabled])").filter({ hasText: /斬妖|奇遇|坊市|歇息|精英|洞藏/ });
  console.log("fallback nodes", await any.allInnerTexts());
  if (await any.count()) await any.first().click();
}
await page.waitForTimeout(900);
await page.screenshot({ path: "/workspace/screenshots/event-danfang.png", fullPage: true });

const text = await page.locator("body").innerText();
console.log("hasBrandText", /龍者|迪文|逆史/.test(text));
console.log("hasDanfang", text.includes("廢棄丹房"));
console.log("head", text.split("\n").slice(0, 24));
console.log("errors", errors);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await mobile.waitForTimeout(400);
const mnew = mobile.getByRole("button", { name: "開啟新的一途" });
if (await mnew.count()) {
  await mnew.click();
  const cf = mobile.getByRole("button", { name: "重新問道" });
  if (await cf.count()) await cf.click();
}
await mobile.waitForTimeout(500);
const mev = mobile.locator("button:not([disabled])").filter({ hasText: /奇遇/ });
if (await mev.count()) await mev.first().click();
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: "/workspace/screenshots/event-danfang-phone.png" });
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log("mobile overflow", overflow);
await browser.close();
