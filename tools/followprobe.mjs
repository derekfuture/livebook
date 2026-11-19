// 跟手测试：node tools/followprobe.mjs <id…> [--par=4] [--json=out.json]   （开发服务器要开着，LB_PORT 默认 5188）
//
// 对每件能拖的器材（inst.pointer.items() 里有 onDrag 的；没有就用 debug.picks）：
//   1. 按住不动 0.4 s：器材自己动了多少（“一按就自己抬起来”）
//   2. 拖 ~90 px 后停住：器材多久跟上、停住时离光标还差多少像素（“慢慢跟过来”）
//   3. 松手后 2.5 s：器材自己又走了多远、走了多久（“松手后自己按轨迹走”）
// 每件测完调 inst.reset() 恢复。只量，不判对错；结果和初中的课对照着看。
import { existsSync } from 'fs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const PW_BASE = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json')));
const { chromium } = createRequire(PW_BASE)('playwright-core');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith('--'));
const PAR = +(args.find((a) => a.startsWith('--par='))?.slice(6) || 4);
const JSON_OUT = args.find((a) => a.startsWith('--json='))?.slice(7);
const PORT = process.env.LB_PORT || 5188;
const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/books.json'), 'utf8'));
const bookOf = (id) => Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined, args: ['--use-angle=metal', '--enable-gpu'] });

async function probe(id) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const out = { id, items: [], err: null };
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?book=${bookOf(id)}&tips=0#live=${id}`);
    await page.waitForFunction(() => window.__lb?.live?.active?.inst && !window.__lb.live.opening, null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    const n = await page.evaluate(() => {
      const inst = __lb.live.active.inst;
      let list = inst.pointer?.items?.() || [];
      list = list.filter((d) => d.obj && (d.onDrag || d.onStart));
      if (!list.length && inst.debug?.picks) list = Object.values(inst.debug.picks).filter(Boolean).map((obj) => ({ obj }));
      window.__probeItems = list;
      return list.length;
    });
    for (let i = 0; i < n; i++) {
      await page.evaluate(() => { const inst = __lb.live.active.inst; try { inst.reset?.(); } catch {} });
      await page.waitForTimeout(900);
      const info = await page.evaluate((i) => {
        const d = window.__probeItems[i], cam = __lb.stage.camera, o = d.obj;
        const name = (typeof d.hint === 'function' ? (() => { try { return d.hint(); } catch { return ''; } })() : d.hint) || o.name || '';
        o.updateMatrixWorld(true);
        const box = new (cam.position.constructor)();
        if (!o.geometry?.boundingSphere) o.geometry?.computeBoundingSphere?.();
        const c = o.geometry?.boundingSphere ? o.localToWorld(o.geometry.boundingSphere.center.clone()) : o.getWorldPosition(box);
        const p = c.clone().project(cam);
        return { name: String(name).replace(/<[^>]+>/g, '').slice(0, 40), x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, z: p.z };
      }, i);
      const rec = { i, name: info.name };
      if (!(info.x > 380 && info.x < 1420 && info.y > 20 && info.y < 820 && info.z < 1)) { rec.skip = '不在画面里'; out.items.push(rec); continue; }
      // 在页面里逐帧记器材（拾取体）的世界位置和屏幕位置
      await page.evaluate((i) => {
        const d = window.__probeItems[i], cam = __lb.stage.camera, o = d.obj, V = cam.position.constructor;
        const s = window.__probeS = []; window.__probeOn = true;
        const g = __lb.live.active.inst.group, inv = () => g.matrixWorld.clone().invert();
        const c0 = o.geometry?.boundingSphere?.center.clone() || new V();
        const tick = () => {
          if (!window.__probeOn) return;
          const w = o.localToWorld(c0.clone()), p = w.clone().project(cam), l = w.clone().applyMatrix4(inv());   // l：实验自己的坐标（米）
          s.push([performance.now(), l.x, l.y, l.z, (p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2]);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, i);
      const now = () => page.evaluate(() => performance.now());
      await page.mouse.move(info.x - 3, info.y); await page.mouse.move(info.x, info.y); await page.waitForTimeout(80);
      const tDown = await now(); await page.mouse.down(); await page.waitForTimeout(400);
      const tMove0 = await now();
      const DX = -60, DY = -65, STEPS = 14;
      for (let k = 1; k <= STEPS; k++) { await page.mouse.move(info.x + DX * k / STEPS, info.y + DY * k / STEPS); await page.waitForTimeout(16); }
      const tMove1 = await now(); await page.waitForTimeout(1100);
      const tUp = await now(); await page.mouse.up(); await page.waitForTimeout(2600);
      const S = await page.evaluate(() => { window.__probeOn = false; return window.__probeS; });
      const at = (t) => S.reduce((b, r) => (Math.abs(r[0] - t) < Math.abs(b[0] - t) ? r : b), S[0]);
      const mm = (a, b) => Math.hypot(a[1] - b[1], a[2] - b[2], a[3] - b[3]) * 1000;
      const px = (a, b) => Math.hypot(a[4] - b[4], a[5] - b[5]);
      const r0 = at(tDown), rM0 = at(tMove0), rM1 = at(tMove1), rUp = at(tUp), rEnd = S[S.length - 1];
      // 按住不动
      rec.pressMm = +mm(r0, rM0).toFixed(1);
      { const hs = S.filter((r) => r[0] >= tDown && r[0] <= tMove0); let lt = 0; for (let k = 1; k < hs.length; k++) if (mm(hs[k], hs[k - 1]) > 0.05) lt = hs[k][0] - tDown; rec.pressMs = Math.round(lt); }
      // 跟手：光标停下那一刻离“应在的位置”差多少；停下后还在动多久（屏幕速度 > 0.4 px/帧）
      const want = [rM0[4] + DX, rM0[5] + DY];
      const lag = (r) => Math.hypot(r[4] - want[0], r[5] - want[1]);
      rec.moved = +px(rM0, rUp).toFixed(0);
      rec.lagAtStopPx = +lag(rM1).toFixed(0);
      rec.lagHeldPx = +lag(rUp).toFixed(0);
      const hold = S.filter((r) => r[0] >= tMove1 && r[0] <= tUp);
      let settle = 0; for (let k = 1; k < hold.length; k++) if (px(hold[k], hold[k - 1]) > 0.4) settle = hold[k][0] - tMove1;
      rec.settleMs = Math.round(settle);
      // 松手后
      const after = S.filter((r) => r[0] >= tUp);
      let path = 0, last = 0; for (let k = 1; k < after.length; k++) { const d = mm(after[k], after[k - 1]); path += d; if (d > 0.05) last = after[k][0] - tUp; }
      rec.afterMm = +path.toFixed(0); rec.afterMs = Math.round(last); rec.afterNetMm = +mm(rUp, rEnd).toFixed(0);
      out.items.push(rec);
    }
  } catch (e) { out.err = String(e.message || e).slice(0, 200); }
  await page.close();
  return out;
}

const results = [];
const queue = [...ids];
await Promise.all(Array.from({ length: Math.min(PAR, ids.length) }, async () => { while (queue.length) { const id = queue.shift(); const r = await probe(id); results.push(r); print(r); } }));
await browser.close();
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));

function print(r) {
  const lines = [`== ${r.id}${r.err ? '  ✗ ' + r.err : ''}`];
  for (const it of r.items) {
    if (it.skip) { lines.push(`  [${it.i}] ${it.name}：${it.skip}`); continue; }
    const flags = [];
    if (it.pressMm > 3) flags.push(it.pressMs > 300 ? '按住后慢慢自己动' : '按住就到位');
    if (it.moved < 15) flags.push('拖不动');
    else { if (it.settleMs > 250) flags.push('慢慢跟'); }
    if (it.afterMm > 10) flags.push(it.afterMs > 700 ? '松手后慢慢自己走' : '松手后很快归位');
    lines.push(`  [${it.i}] ${it.name.padEnd(20)} 按住${it.pressMm}mm/${it.pressMs}ms 拖动${it.moved}px 停时差${it.lagAtStopPx}px 跟上${it.settleMs}ms 持住差${it.lagHeldPx}px | 松手后 ${it.afterMm}mm/${it.afterMs}ms 净${it.afterNetMm}mm ${flags.length ? '⚠ ' + flags.join('、') : ''}`);
  }
  console.log(lines.join('\n'));
}
