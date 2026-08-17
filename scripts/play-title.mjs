import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
desk.on("pageerror", (e) => errors.push(e.message));
desk.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await desk.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await desk.waitForTimeout(600);
await desk.screenshot({ path: "/workspace/screenshots/title-clean.png" });
const newBtn = desk.getByRole("button", { name: "開啟新的一途" });
console.log("new run visible", await newBtn.count());
console.log("help", await desk.getByRole("button", { name: "規矩" }).count());
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await phone.waitForTimeout(400);
await phone.screenshot({ path: "/workspace/screenshots/title-mobile.png" });
const overflow = await phone.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
);
console.log("mobile overflow", overflow);
console.log("errors", errors);
await browser.close();
