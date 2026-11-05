// 放一遍每张化学活页的“老师演示”，看字幕有没有卡住、有没有冒出“先……再……”这类拒绝提示（说明演示里某个动作没做成）。
//   node democheck.mjs id1 id2 ...
import { createRequire } from 'module';
const { chromium } = createRequire(process.env.HOME + '/.cache/livebook-tools/package.json')('playwright-core');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const VT = new URL('./vt.js', import.meta.url).pathname;
const ids = process.argv.slice(2);
const books = JSON.parse((await import('fs')).readFileSync('/Users/scout911/dev/mp/livebook/src/content/books.json', 'utf8'));
const bookOf = (id) => Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const REFUSE = /先做完|还没|先把|先停止|不能|要先|等它|再试|先点|先用|先装|先塞|先打开|已经炸裂|全部重来/;
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=metal', '--enable-gpu'] });
const one = async (id) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { window.WebSocket = class { constructor() { this.readyState = 0; } addEventListener() {} removeEventListener() {} send() {} close() {} }; });     // 别人改文件不刷新这个页面
  await ctx.addInitScript({ path: VT }); await ctx.addInitScript(() => localStorage.clear());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:5188/?book=${bookOf(id)}#live=${id}`);
  await p.waitForFunction(() => window.__lb?.live?.isOpen && !window.__lb.live.opening, null, { timeout: 40000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '不猜了，直接动手 →' && x.offsetParent)?.click());
  await p.waitForTimeout(600);
  const ok = await p.evaluate(() => { const bt = [...document.querySelectorAll('.lbar .lb-demo')][0]; if (!bt) return false; bt.click(); return true; });
  if (!ok) { await ctx.close(); return { id, note: '没有演示按钮' }; }
  await p.evaluate(() => window.__vt.manual());
  const log = []; let last = -1, guard = 0;
  while (guard++ < 30 * 200) {
    const s = await p.evaluate(() => { for (let i = 0; i < 6; i++) window.__vt.step(1000 / 30); const bar = window.__lb.live.active?.inst.debug?.bar; const el = document.querySelector('.lbar .lb-main'); return { playing: !!bar?.playing, shot: bar?.shot ?? -1, text: (el?.innerText || '').replace(/\s+/g, ' ').trim().replace(/^（\d+）/, '') }; });
    if (!s.playing) break;
    if (s.shot !== last) { log.push({ shot: s.shot, texts: [] }); last = s.shot; }
    const L = log[log.length - 1]; if (L.texts[L.texts.length - 1] !== s.text) L.texts.push(s.text);
  }
  await ctx.close();
  // 判定：字幕卡住（连着两个镜头一开始就是同一句话）、出现拒绝提示
  const issues = [];
  for (let k = 1; k < log.length; k++) if (log[k].texts[0] && log[k].texts.length === 1 && log[k].texts[0] === log[k - 1].texts[log[k - 1].texts.length - 1]) issues.push(`镜头 ${log[k].shot + 1} 的字幕和上一个镜头最后一句一样（可能卡住）：${log[k].texts[0].slice(0, 50)}`);
  for (const L of log) for (const t of L.texts) if (REFUSE.test(t)) issues.push(`镜头 ${L.shot + 1} 出现提示：${t.slice(0, 70)}`);
  return { id, shots: log.length, issues: [...new Set(issues)], errs };
};
for (const id of ids) {
  try { const r = await one(id); console.log(JSON.stringify(r)); } catch (e) { console.log(JSON.stringify({ id, fail: e.message.slice(0, 120) })); }
}
await b.close();
