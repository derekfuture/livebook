import { existsSync } from 'fs';
// 冒烟测试：每一课能不能打开、有没有报错。开发服务器要先开着（npm run dev，端口 5188）。
//   node tools/smoke.mjs                 全部已实现的实验
//   node tools/smoke.mjs oxygen co2prep  只测这几课
//   node tools/smoke.mjs --changed       只测上次通过以后改过的课：课文件改了测那一课；kit / live / ui 里的文件改了，测所有用到它的课
//   --par=6                              同时开几个页面（默认 6）
// 截图在 /tmp/lb/smoke/<id>.png。
// 测离线版：LB_URL=file:///…/dist-offline/活页课本.html node tools/smoke.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
// playwright-core 装在 ~/.cache/livebook-tools（/tmp 会被系统定期清掉）；找不到再用 /tmp/lbshot
const PW_BASE = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json'))) || '/tmp/lbshot/package.json';
const { chromium } = createRequire(PW_BASE)('playwright-core');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STAMP = '/tmp/lb/smoke/.passed';
const args = process.argv.slice(2);
const PAR = +(args.find((a) => a.startsWith('--par='))?.slice(6) || 6);
const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/books.json'), 'utf8'));
const LES = path.join(ROOT, 'src/lessons');
const have = new Set(fs.readdirSync(LES).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));
let want = args.filter((a) => !a.startsWith('--'));
fs.mkdirSync('/tmp/lb/smoke', { recursive: true });

if (args.includes('--changed')) {
  const since = fs.existsSync(STAMP) ? fs.statSync(STAMP).mtimeMs : 0;
  const changed = (f) => fs.statSync(f).mtimeMs > since;
  // 一课用到的本地文件（顺着 import 往下找）
  const deps = new Map();
  const depsOf = (file) => {
    if (deps.has(file)) return deps.get(file);
    const out = new Set([file]); deps.set(file, out);
    if (!fs.existsSync(file)) return out;
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) {
      let f = path.resolve(path.dirname(file), m[1]); if (!f.endsWith('.js')) f += '.js';
      for (const x of depsOf(f)) out.add(x);
    }
    return out;
  };
  // 所有课都会用到的（LiveLayer、舞台、面板……）：改了就全测
  const core = ['src/live', 'src/ui', 'src/style.css', 'src/main.js', 'src/content/books.json'].map((p) => path.join(ROOT, p));
  const walk = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : [p]);
  const coreChanged = core.filter(fs.existsSync).flatMap(walk).filter(changed);
  want = coreChanged.length ? [] : [...have].filter((id) => [...depsOf(path.join(LES, id + '.js'))].some((f) => fs.existsSync(f) && changed(f)));
  if (coreChanged.length) console.log('改了公共文件，全部测：' + coreChanged.map((f) => path.relative(ROOT, f)).slice(0, 4).join('、'));
  else if (!want.length) { console.log('上次通过以后没有改过实验。'); process.exit(0); }
  else console.log('只测改过的：' + want.join(' '));
}

const jobs = [];
for (const [bid, b] of Object.entries(books)) for (const id of Object.keys(b.lessons)) if (have.has(id) && (!want.length || want.includes(id))) jobs.push([bid, id]);
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const t0 = Date.now(), results = [];
const queue = [...jobs];
await Promise.all(Array.from({ length: Math.min(PAR, queue.length) }, async () => {
  while (queue.length) {
    const [bid, id] = queue.shift();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // 关掉 Vite 的热更新连接：别人（并行的子任务）改了文件，不会把这个测试页面刷掉
    await page.addInitScript(() => { window.WebSocket = class { constructor() { this.readyState = 0; } addEventListener() {} removeEventListener() {} send() {} close() {} }; });
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    await page.goto(`${process.env.LB_URL || `http://127.0.0.1:${process.env.LB_PORT || 5188}/`}?book=${bid}#live=${id}`);
    // 等实验真的打开，再多等一会儿让前几帧跑起来（每帧的 update 出错也能抓到）
    let open = false;
    for (let i = 0; i < 80 && !open; i++) { open = await page.evaluate(() => !!window.__lb?.live?.active?.inst && !window.__lb.live.opening); if (!open) await page.waitForTimeout(100); }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/lb/smoke/${id}.png` });
    const real = errs.filter((e) => !/Clock|deprecated|GPU stall|WebGL: INVALID|Failed to load resource/.test(e));
    results.push({ bid, id, ok: open && !real.length, open, real });
    await page.close();
  }
}));
await browser.close();
let bad = 0;
for (const r of results.sort((a, b) => a.id.localeCompare(b.id))) {
  if (!r.ok) bad++;
  if (!r.ok || jobs.length <= 12) console.log(`${r.ok ? 'ok ' : 'BAD'} ${r.bid} ${r.id}${r.open ? '' : '（没有打开）'} ${r.real.slice(0, 3).join(' | ')}`);
}
console.log(`${jobs.length - bad}/${jobs.length} 通过，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
if (!bad && !want.length) fs.writeFileSync(STAMP, String(Date.now()));       // 全部通过才记下时间（--changed 从这里算）
if (!bad && want.length && args.includes('--changed')) fs.writeFileSync(STAMP, String(Date.now()));
process.exit(bad ? 1 : 0);
