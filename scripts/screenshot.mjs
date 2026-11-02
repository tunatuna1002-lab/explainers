// 사용: node scripts/screenshot.mjs <출력 폴더> [baseUrl]
// 설치된 Chrome(channel: "chrome")을 쓴다. 브라우저를 따로 내려받지 않는다.
// 미리보기 서버(npm run preview)가 떠 있어야 한다.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const out = args[0] ?? "screenshots";
const base = (args[1] ?? "http://localhost:4321").replace(/\/$/, "");
mkdirSync(out, { recursive: true });

const shots = [
  { name: "desktop", path: "/posts/llm/", width: 1440, height: 900 },
  { name: "mobile", path: "/posts/llm/", width: 390, height: 844 },
  { name: "home", path: "/", width: 1440, height: 900 },
];
const extra = process.argv.includes("--all")
  ? [
      { name: "tablet", path: "/posts/llm/", width: 768, height: 1024 },
      ...["desktop", "mobile"].map((n) => ({ name: `${n}-dark`, path: "/posts/llm/", width: n === "desktop" ? 1440 : 390, height: 900, dark: true })),
    ]
  : [];

const channel = process.env.PW_CHANNEL || "chrome";
const browser = await chromium.launch({ channel });
for (const s of [...shots, ...extra]) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    colorScheme: s.dark ? "dark" : "light",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(base + s.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const file = join(out, `${s.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
  await ctx.close();
}
await browser.close();
