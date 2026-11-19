// Safari 内核（WebKit）能不能打开：LB_PORT=5215 node tools/webkit-smoke.mjs <id…>
// 桌面 1440×900 和手机 390×844 各开一次，打不开或有报错就打出来（兼容性底线：iOS 15）。
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const { webkit } = createRequire(`${process.env.HOME}/.cache/livebook-tools/package.json`)('playwright-core');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/books.json'), 'utf8'));
const bookOf = (id) => Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const PORT = process.env.LB_PORT || 5188;
const ids = process.argv.slice(2);
const b = await webkit.launch({ headless: true });
let bad = 0;
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const id of ids) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
    await p.addInitScript(() => { window.WebSocket = class { constructor() { this.readyState = 0; } addEventListener() {} removeEventListener() {} send() {} close() {} }; });
    await p.goto(`http://127.0.0.1:${PORT}/?book=${bookOf(id)}#live=${id}`);
    let ok = false; for (let i = 0; i < 80; i++) { ok = await p.evaluate(() => !!window.__lb?.live?.active?.inst && !window.__lb.live.opening).catch(() => false); if (ok) break; await p.waitForTimeout(150); }
    await p.waitForTimeout(1500);
    if (!ok || errs.length) bad++;
    console.log(`${w}x${h} ${id}: ${ok ? 'opened' : 'NOT OPENED'}${errs.length ? ' errors: ' + errs.slice(0, 3).join(' | ') : ''}`);
    await p.close();
  }
}
await b.close();
console.log(bad ? `${bad} 个有问题` : '全部打开、没有报错');
