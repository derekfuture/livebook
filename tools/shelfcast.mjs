// 首页书桌 → 点一科（摊开）→ 拿一本书进去（可以先设一个书签页，看翻页）→ 点“‹ 书架”放回去：用 CDP 的 screencast 把每一帧都录下来（截图太慢，会漏掉一两帧的闪烁）。
//   node tools/shelfcast.mjs [名字=go] [科目=物理] [摊开后第几本，从 0 数=0] [书签，如 huaxue-9s:40]
// 帧存到 /tmp/lbqa/cast/<名字>-NNNN.jpg，再用 python3 tools/flash.py <名字> 看每帧亮度、找“突然变亮又变回去”的帧。
import { createRequire } from 'module';
import fs, { existsSync } from 'fs';
const PW_BASE = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json'))) || '/tmp/lbshot/package.json';
const { chromium } = createRequire(PW_BASE)('playwright-core');
fs.mkdirSync('/tmp/lbqa/cast', { recursive: true });
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [tag = 'go', subject = '物理', nth = '0', bookmark = ''] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { window.WebSocket = class { constructor() {} addEventListener() {} removeEventListener() {} send() {} close() {} }; });
await p.goto(`http://127.0.0.1:${process.env.LB_PORT || 5188}/`);
if (bookmark) { await p.evaluate((bm) => { const [id, pg] = bm.split(':'); localStorage.setItem('livebook.bookmark.' + id, pg); }, bookmark); await p.reload(); }
await p.waitForTimeout(3500);
const cdp = await p.context().newCDPSession(p);
const frames = []; let t0 = null;
cdp.on('Page.screencastFrame', async (f) => { const t = f.metadata.timestamp; if (t0 == null) t0 = t; frames.push({ t: t - t0, data: f.data, url: p.url() }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {} });
const start = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 720, maxHeight: 450, everyNthFrame: 1 });
await start();
const mark = (name) => frames.push({ t: (Date.now() / 1000) - (t0 ?? Date.now() / 1000), mark: name });
const screen = (fn, arg) => p.evaluate(fn, arg);
const sp = await screen((name) => { const H = window.__home, s = H.subjects.find((x) => x.name === name), v = s.root.position.clone(); v.y = 0.1; v.project(H.stage.camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; }, subject);
await p.mouse.move(sp[0], sp[1]); await p.waitForTimeout(500);
mark('fan'); await p.mouse.click(sp[0], sp[1]);
await p.waitForTimeout(1800);
const bp = await screen((j) => { const H = window.__home, g = H.items.filter((x) => x.userData.mode === 'fan').sort((a, c) => a.userData.j - c.userData.j)[j]; if (!g) return null; const v = g.position.clone().project(H.stage.camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; }, +nth);
if (!bp) console.log('摊开以后没有第', nth, '本');
else { await p.mouse.move(bp[0], bp[1]); await p.waitForTimeout(400); mark('click'); await p.mouse.click(bp[0], bp[1]); }
await p.waitForTimeout(5500);
mark('back'); await p.click('#btn-shelf').catch((e) => console.log('no btn', e.message));
await p.waitForTimeout(1200);
try { await start(); } catch {}
await p.waitForTimeout(3500);
await cdp.send('Page.stopScreencast').catch(() => {});
let i = 0;
const meta = [];
for (const f of frames) { if (f.mark) { meta.push({ mark: f.mark, t: f.t }); continue; } const fn = `/tmp/lbqa/cast/${tag}-${String(i++).padStart(4, '0')}.jpg`; fs.writeFileSync(fn, Buffer.from(f.data, 'base64')); meta.push({ fn, t: f.t, url: f.url }); }
fs.writeFileSync(`/tmp/lbqa/cast/${tag}.json`, JSON.stringify(meta));
console.log('frames', i, 'errors', errs.slice(0, 5));
await b.close();
