// 사용: node scripts/smoke.mjs [baseUrl]  (npm run preview가 떠 있어야 한다)
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://localhost:4321").replace(/\/$/, "");
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "chrome" });
let failed = 0;
const check = (ok, msg) => { console.log(ok ? "ok  " : "FAIL", msg); if (!ok) failed++; };

for (const width of [1440, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const logs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(m.text()); });
  page.on("pageerror", (e) => logs.push(String(e)));
  await page.goto(`${base}/posts/llm/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check(logs.length === 0, `${width}px 콘솔 오류·경고 0 ${logs.length ? JSON.stringify(logs) : ""}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${width}px 페이지 가로 넘침 0 (${overflow})`);

  if (width === 1440) {
    // 1~8 클릭 → Properties 변경
    const read = () => page.locator("#explore .cv-props").innerText();
    const before = await read();
    await page.locator("#explore .cv-seg-item", { hasText: /^8$/ }).click();
    const after = await read();
    check(before !== after && after.includes("8. 반복과 출력"), "8 클릭 시 Properties가 8단계로 바뀜");
    await page.locator("#explore .cv-seg-item", { hasText: /^1$/ }).click();
    check((await read()) === before, "1 클릭 시 되돌아옴");
    await page.locator("#explore .cv-seg-item[data-pressed]").click();
    check((await page.locator("#explore .cv-seg-item[data-pressed]").count()) === 1, "눌린 항목을 다시 눌러도 선택이 비지 않음");
    // 목차 링크 이동 + 현재 절 강조
    await page.locator('.cv-toc-link[href="#speed"]').click();
    await page.waitForTimeout(900);
    const top = await page.locator("#speed").evaluate((el) => el.getBoundingClientRect().top);
    check(Math.abs(top) < 120, `목차 링크가 #speed로 이동 (top=${Math.round(top)})`);
    check((await page.locator('.cv-toc-link[data-active="true"]').getAttribute("href")) === "#speed", "현재 절 강조");
    const sticky = await page.locator(".cv-toc-slot").evaluate((el) => el.getBoundingClientRect().top);
    check(sticky >= 0 && sticky < 100, `스크롤 후에도 목차가 보임 (top=${Math.round(sticky)})`);
  } else {
    const t = await page.locator(".cv-toc-slot").evaluate((el) => el.getBoundingClientRect().top);
    const b = await page.locator(".cv-body").evaluate((el) => el.getBoundingClientRect().top);
    check(t < b, `목차가 본문 위 (toc=${Math.round(t)}, body=${Math.round(b)})`);
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
