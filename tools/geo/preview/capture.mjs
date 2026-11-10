// 预览站点上给每张地理活页截一张图（没有课本书页）：做到一个看得出现象的状态，裁掉左边的纸卡
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
const { chromium } = createRequire(`${process.env.HOME}/.cache/livebook-tools/package.json`)('playwright-core');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const BASE = 'https://geo-preview.livebook-1ej.pages.dev';
const books = JSON.parse(readFileSync('/Users/scout911/dev/mp/livebook/.claude/worktrees/geo/src/content/books.json', 'utf8'));
const bookOf = (id) => Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const ONLY = (process.env.IDS || '').split(',').filter(Boolean);
const IDS = ONLY.length ? ONLY : 'latlon revolution contour sandwater tempcurve raincol mapread jieti shushui jieqi shuitu karst water tide heat thermal urban industry earthsun rockcycle plates fold fault river front belts monsoon current enso zonation cyclone basin'.split(' ');
const CUSTOM = {
  karst: 'd.time(6)', jieti: 'for (let f = 0; f <= 1.0001; f += 0.02) d.A.probeTo(f); d.A.probeTo(0.43)', fault: 'd.S.s = 0.8; d.events(); d.layout()', fold: 'd.S.c = 0.85; d.layout()', monsoon: 'd.month(7)', zonation: 'd.go(0.62)',
};
const b = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
for (const id of IDS) {
  if (!ONLY.length && existsSync(`/tmp/pv_thumbs/${id}.png`)) continue;
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    await p.goto(`${BASE}/?book=${bookOf(id)}#live=${id}`);
    let ok = false; for (let i = 0; i < 200; i++) { ok = await p.evaluate(() => !!window.__lb?.live?.active?.inst && !window.__lb.live.opening).catch(() => false); if (ok) break; await p.waitForTimeout(100); }
    await p.waitForTimeout(2200);
    await p.evaluate(() => { for (const x of document.querySelectorAll('button')) if (/不用了/.test(x.textContent)) x.click(); });
    await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('开始动手'))?.click());
    const n = await p.evaluate(() => (__lb.live.active.inst.debug?.qa || []).length);
    if (CUSTOM[id]) { await p.evaluate(`(() => { const d = __lb.live.active.inst.debug; ${CUSTOM[id]}; })()`); await p.waitForTimeout(3000); }
    else if (n) {
      await p.evaluate(() => { window.__lbTimeScale = 4; });
      for (let k = 0; k < n; k++) { const w = await p.evaluate((k) => { const s = __lb.live.active.inst.debug.qa[k]; try { s.run(); } catch (e) {} return s.wait ?? 1; }, k); await p.waitForTimeout((w * 1000) / 4 + 250); }
      await p.evaluate(() => { window.__lbTimeScale = 1; }); await p.waitForTimeout(1200);
    } else await p.waitForTimeout(1500);
    await p.evaluate(() => { for (const x of document.querySelectorAll('button')) if (/不用了/.test(x.textContent)) x.click(); });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `/tmp/pv_thumbs/${id}.png`, clip: { x: 404, y: 54, width: 1036, height: 770 } });
    console.log('ok', id, n ? `qa ${n}` : CUSTOM[id] ? 'custom' : 'default');
  } catch (e) { console.log('fail', id, e.message.slice(0, 100)); }
  await p.close();
}
// 首页、地理世界
if (!ONLY.length) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(BASE + '/'); await p.waitForTimeout(6500); await p.screenshot({ path: '/tmp/pv_thumbs/_home.png' });
  await p.goto(BASE + '/?subject=dili'); await p.waitForTimeout(8000); await p.screenshot({ path: '/tmp/pv_thumbs/_world.png' });
  await p.close();
}
await b.close();
