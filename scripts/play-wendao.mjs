import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const newBtn = page.getByRole("button", { name: "開啟新的一途" });
if (await newBtn.count()) {
  await newBtn.click();
  const confirm = page.getByRole("button", { name: "重新問道" });
  if (await confirm.count()) await confirm.click();
} else {
  await page.getByRole("button", { name: "續緣" }).click();
}
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/map.png", fullPage: true });

const start = page.locator("button:not([disabled])").filter({ hasText: /斬妖|奇遇|坊市|歇息|精英|洞藏/ });
console.log("start nodes", await start.count(), await start.allInnerTexts());
await start.first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: "/workspace/screenshots/combat.png", fullPage: true });
console.log("screen text head", (await page.locator("body").innerText()).split("\n").slice(0, 16));

async function playRound() {
  const cardBtns = page.locator("button").filter({ hasText: /劈空劍|護體訣|破甲刺|連斬|御劍|吐納|凝神|卸力|蓄勢/ });
  const count = await cardBtns.count();
  for (let i = 0; i < Math.min(count, 5); i++) {
    const btn = cardBtns.nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.click().catch(() => {});
    await page.waitForTimeout(180);
    const enemy = page.locator("button").filter({ hasText: /山魈|野修|靈蛇|火鴉|散修|石傀|執法|巨猿|心魔|長老|老魔/ });
    if (await enemy.count()) await enemy.first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
  const end = page.getByRole("button", { name: "結束回合" });
  if (await end.count() && (await end.isEnabled())) {
    await end.click();
    await page.waitForTimeout(1600);
  }
}

for (let r = 0; r < 8; r++) {
  const text = await page.locator("body").innerText();
  console.log("round", r, "snippet", text.slice(0, 120).replace(/\n/g, " | "));
  if (text.includes("戰後收穫") || text.includes("繼續前行") || text.includes("問道未果") || text.includes("渡劫成功") || text.includes("擇路") || text.includes("奇遇") || text.includes("歇息") || text.includes("坊市")) {
    break;
  }
  await playRound();
}
await page.screenshot({ path: "/workspace/screenshots/after-fight.png", fullPage: true });
console.log("errors", errors);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const cnew = mobile.getByRole("button", { name: "開啟新的一途" });
if (await cnew.count()) {
  await cnew.click();
  const cf = mobile.getByRole("button", { name: "重新問道" });
  if (await cf.count()) await cf.click();
}
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "/workspace/screenshots/map-mobile.png" });
const overflowMap = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log("map mobile overflow", overflowMap, "scrollW", await mobile.evaluate(() => document.documentElement.scrollWidth));
const s = mobile.locator("button:not([disabled])").filter({ hasText: /斬妖|奇遇|坊市|歇息/ });
if (await s.count()) await s.first().click();
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: "/workspace/screenshots/combat-mobile.png" });
const overflowC = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log("combat mobile overflow", overflowC, "scrollW", await mobile.evaluate(() => document.documentElement.scrollWidth));
await browser.close();
