// 放一遍老师演示，在每个镜头结束时记下活页状态 S（只留数字、字符串、布尔值），看演示到底做成了什么。
//   node demostate.mjs id
import { createRequire } from 'module';
const { chromium } = createRequire(process.env.HOME + '/.cache/livebook-tools/package.json')('playwright-core');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const VT = new URL('./vt.js', import.meta.url).pathname;
const id = process.argv[2];
const books = JSON.parse((await import('fs')).readFileSync('/Users/scout911/dev/mp/livebook/src/content/books.json', 'utf8'));
const book = Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=metal', '--enable-gpu'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { window.WebSocket = class { constructor() { this.readyState = 0; } addEventListener() {} removeEventListener() {} send() {} close() {} }; });     // 别人改文件不刷新这个页面
await ctx.addInitScript({ path: VT }); await ctx.addInitScript(() => localStorage.clear());
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(`http://127.0.0.1:5188/?book=${book}#live=${id}`);
await p.waitForFunction(() => window.__lb?.live?.isOpen && !window.__lb.live.opening, null, { timeout: 40000 });
await p.waitForTimeout(1500);
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '不猜了，直接动手 →' && x.offsetParent)?.click());
await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('.lbar .lb-demo').click());
await p.evaluate(() => window.__vt.manual());
const snap = () => p.evaluate(() => {
  const D = window.__lb.live.active?.inst.debug, bar = D?.bar, S = D?.S || {};
  const flat = (o, depth = 0) => {
    if (o == null || typeof o !== 'object') return typeof o === 'number' ? Math.round(o * 1000) / 1000 : o;
    if (o.isObject3D || o.isMaterial || o.isVector3 || depth > 3) return o.isVector3 ? [o.x, o.y, o.z].map((v) => Math.round(v * 1000) / 1000) : undefined;
    if (Array.isArray(o)) return o.length > 20 ? `[${o.length}]` : o.map((v) => flat(v, depth + 1));
    const r = {}; for (const [k, v] of Object.entries(o)) { if (typeof v === 'function') continue; const f = flat(v, depth + 1); if (f !== undefined) r[k] = f; } return r;
  };
  const el = document.querySelector('.lbar .lb-main');
  return { playing: !!bar?.playing, shot: bar?.shot ?? -1, t: window.__vt.now?.() ?? 0, text: (el?.innerText || '').replace(/\s+/g, ' ').trim(), S: flat(S) };
});
let last = -1, prev = null, guard = 0, tsec = 0;
while (guard++ < 30 * 300) {
  await p.evaluate(() => { for (let i = 0; i < 6; i++) window.__vt.step(1000 / 30); }); tsec += 0.2;
  const s = await snap();
  if (s.shot !== last || !s.playing) {
    if (prev) console.log(`\n### 镜头 ${prev.shot + 1} 结束 (t≈${tsec.toFixed(1)}s) 字幕：${prev.text.slice(0, 90)}\n` + JSON.stringify(prev.S));
    last = s.shot;
  }
  if (!s.playing) break;
  prev = s;
}
await b.close();
