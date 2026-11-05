import { existsSync } from 'fs';
// 一键质检：node tools/qa.mjs <实验 id> [更多 id…] [--shots] [--flow]   （开发服务器要先开着：npm run dev，端口 5188）
//
// 每一课检查：
//   1. 语法：node --check 这一课的文件
//   2. 打开：能不能打开、控制台有没有报错
//   3. 穿模：有没有网格低于桌面（y < 0）；导线、乳胶管这类不透明的管子有没有穿过别的不透明器材
//   4. 拿得到：每件能拖、能点的东西——中心在不在画面里（不被左边面板、底部步骤栏挡住），从镜头看过去第一个碰到的是不是它自己
//   5. 叠在一起：两件能动的东西的中心离得太近（常见原因：忘了把它摆到桌上的位置，都堆在原点）
//   6. 截图（--shots）：/tmp/lbqa/<id>.png
//   9. 演示放全（--demo）：从头放完老师演示，逐帧记下每件器材的位置——一帧里跳了好几厘米的报“瞬移”（器材没有被拿过去、直接出现在那里）；
//      整段演示里一次都没动过的器材列出来（演示是不是漏了这一步的动作）
//   10. 真鼠标（--mouse，和 --flow 一起用）：流程里写成“点一下 / 拖到”的步骤，用真鼠标在屏幕上点、拖（检查点不点得中、拖的平面对不对）
//   8. 演示（--flow 时一起查）：做到一半时放老师演示，中途退出，学生自己的状态要原样回来
//   7. 流程（--flow）：实验的 debug.qa 里写好的一串操作，按顺序做（时间加快 4 倍）；每一步之后再查一遍 2、4，
//      并检查底部步骤栏“当前这一步要动的东西”拿得到
// 多个 id 时并行跑（默认 4 个一起）。
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
// playwright-core 装在 ~/.cache/livebook-tools（/tmp 会被系统定期清掉）；找不到再用 /tmp/lbshot
const PW_BASE = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json'))) || '/tmp/lbshot/package.json';
const { chromium } = createRequire(PW_BASE)('playwright-core');   // 和 tools/browse.mjs 一样，借 /tmp/lbshot 里装好的

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith('--'));
const SELFTEST = args.includes('--selftest');   // 故意弄坏几处，看质检能不能查出来
const SHOTS = args.includes('--shots'), FLOW = args.includes('--flow'), DEMO = args.includes('--demo'), MOUSE = args.includes('--mouse'); const TRACE = args.includes('--trace'), EXPR = (args.find((a) => a.startsWith('--expr=')) || '').slice(7);
const PAR = +(args.find((a) => a.startsWith('--par='))?.slice(6) || 4);
const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/books.json'), 'utf8'));
const bookOf = (id) => Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
fs.mkdirSync('/tmp/lbqa', { recursive: true });

// ---------- 在页面里跑的检查 ----------
const inPage = () => {
  const A = window.__lb?.live?.active; if (!A) return { open: false };
  const inst = A.inst, g = inst.group, cam = __lb.stage.camera, V = cam.position.constructor;          // 实验自己的坐标：台板顶面 y = 0（以前取 children[0]，取到第一个零件时会按它自己的坐标量，误报）
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const out = { open: true, below: [], clip: [], reach: [], stack: [] };
  const meshes = []; g.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.userData.pick && o.material?.visible !== false && shown(o) && !o.material?.isLineMaterial) meshes.push(o); });
  // 3a 低于桌面
  const v = new V();
  for (const o of meshes) {
    if (o.userData.qaSupport) continue;          // 台板
    const pos = o.geometry.attributes.position; if (!pos) continue;
    let minY = Infinity; const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); minY = Math.min(minY, v.y); }
    if (minY < -0.0008) { const w = o.getWorldPosition(new V()).applyMatrix4(inv); out.below.push(`${o.geometry.type} 在 (${w.x.toFixed(3)}, ${w.y.toFixed(3)}, ${w.z.toFixed(3)})，最低 ${(minY * 1000).toFixed(1)} mm`); }
  }
  // 3b 不透明的管子穿过不透明的器材
  const opaque = (o) => !o.material.userData?.see && (!o.material.transparent || o.material.opacity > 0.6);   // 玻璃、水（kit/chemfx 标了 see）是空心或液体，不算
  const tubes = meshes.filter((o) => o.geometry.type === 'TubeGeometry' && o.geometry.parameters.radius > 0.0012 && opaque(o) && o.material.side !== 1);
  const solids = meshes.filter((o) => o.geometry.type !== 'TubeGeometry' && opaque(o) && o.material.side !== 1 && !o.isSprite);
  for (const t of tubes) {
    const c = t.geometry.parameters.path;
    for (let i = 3; i < 47; i++) {
      const pt = c.getPointAt(i / 50).clone().applyMatrix4(t.matrixWorld);
      for (const s of solids) {
        if (s.parent === t || t.parent === s) continue;
        if (!s.geometry.boundingBox) s.geometry.computeBoundingBox();
        const l = s.worldToLocal(pt.clone()), bb = s.geometry.boundingBox, k = 0.0006;
        if (l.x > bb.min.x + k && l.x < bb.max.x - k && l.y > bb.min.y + k && l.y < bb.max.y - k && l.z > bb.min.z + k && l.z < bb.max.z - k) {
          // 空心圆环和开口圆筒内部是空的，不能把整个包围盒当成实心器材。
          const shape = s.geometry.parameters;
          if (s.geometry.type === 'TorusGeometry' &&
              Math.hypot(Math.hypot(l.x, l.y) - shape.radius, l.z) > shape.tube + t.geometry.parameters.radius) continue;
          if (s.geometry.type === 'CylinderGeometry' && shape.openEnded) {
            const fraction = l.y / shape.height + 0.5;
            const radius = shape.radiusBottom + fraction * (shape.radiusTop - shape.radiusBottom);
            if (Math.abs(Math.hypot(l.x, l.z) - radius) > t.geometry.parameters.radius) continue;
          }
          const w = s.getWorldPosition(new V()).applyMatrix4(inv); out.clip.push(`管子(r=${(t.geometry.parameters.radius*1000).toFixed(1)}mm ${t.material.type} #${t.material.color?.getHexString?.()}) 穿过 ${s.geometry.type}${s.material.transparent?'(透明'+s.material.opacity.toFixed(2)+')':''} #${s.material.color?.getHexString?.()} @(${w.x.toFixed(3)}, ${w.y.toFixed(3)}, ${w.z.toFixed(3)})`); }
      }
    }
  }
  out.clip = [...new Set(out.clip)];
  // 4 拿得到 / 5 叠在一起：在每件东西的包围盒里取几个点，只要有一个点在画面里、不被面板和步骤栏挡、从镜头看过去先碰到它自己，就算拿得到
  // 提示文字是空的（hint 返回 ''）= 这会儿不能操作（倒空了的瓶子、拧上了的瓶盖……），不查
  const items = (inst.pointer?.items?.() || []).filter((it) => it.obj && shown(it.obj) && (typeof it.hint !== 'function' || it.hint() !== ''));
  const objs = items.map((it) => it.obj);
  const rc = __lb.live.raycaster;
  const panel = document.getElementById('panel'), pr = panel && !panel.hidden && panel.offsetWidth ? panel.getBoundingClientRect() : null;
  const barEl = document.querySelector('.lbar'), br = barEl && getComputedStyle(barEl).display !== 'none' ? barEl.getBoundingClientRect() : null;
  const inR = (r, x, y) => r && x > r.left && x < r.right && y > r.top && y < r.bottom;
  const label = (it) => { const h = typeof it.hint === 'function' ? it.hint() : it.hint; return (h || '').replace(/<[^>]+>/g, '').slice(0, 18) || it.obj.name || it.obj.type; };
  const owner = (o) => { for (let q = o; q; q = q.parent) if (objs.includes(q)) return q; return null; };
  const okHit = (h) => !h.object.isSprite && !h.object.isPoints && !h.object.isLine && shown(h.object) && (h.object.material?.visible !== false || h.object.userData.pick || objs.includes(h.object));
  // 世界坐标包围盒（不用 Box3：页面里拿不到 three 的类，自己算）
  const wbox = (root) => {
    const mn = new V(Infinity, Infinity, Infinity), mx = new V(-Infinity, -Infinity, -Infinity), c = new V();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.isSprite || !o.geometry?.attributes?.position) return;
      if (o !== root && !shown(o)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      for (let k = 0; k < 8; k++) { c.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).applyMatrix4(o.matrixWorld); mn.min(c); mx.max(c); }
    });
    return [mn, mx];
  };
  const toScreen = (w) => { const p = w.clone().project(cam); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight, p.z]; };
    const reached = new Set();
  items.forEach((it) => {
    const [mn, mx] = wbox(it.obj);
    if (!isFinite(mn.x)) return;
    const name = label(it), why = new Set();
    const pts = [[0.5, 0.5, 0.5], [0.3, 0.5, 0.5], [0.7, 0.5, 0.5], [0.5, 0.3, 0.5], [0.5, 0.75, 0.5], [0.5, 0.5, 0.3], [0.5, 0.5, 0.7]];
    let reach = false;
    for (const [fx, fy, fz] of pts) {
      const w = new V(mn.x + (mx.x - mn.x) * fx, mn.y + (mx.y - mn.y) * fy, mn.z + (mx.z - mn.z) * fz);
      const [x, y, z] = toScreen(w);
      if (z > 1 || x < 4 || y < 4 || x > innerWidth - 4 || y > innerHeight - 4) { why.add('在画面外'); continue; }
      if (inR(pr, x, y)) { why.add('被左边面板挡住'); continue; }
      if (inR(br, x, y)) { why.add('被底部步骤栏挡住'); continue; }
      rc.setFromCamera({ x: (x / innerWidth) * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, cam);
      const hit = rc.intersectObjects(objs, true).find(okHit);
      const who = hit && owner(hit.object);
      if (who === it.obj) { reach = true; reached.add(it.obj); break; }
      if (who) why.add(`被“${label(items[objs.indexOf(who)])}”挡住`); else why.add('点不中（拾取范围不对）');
    }
    // 镜头拉近 / 移到别处时，别的器材出了画面、躲到面板后面是正常的；被别的器材挡住才是问题（当前步骤要用的东西，下面单独查）
    if (!reach && [...why].some((w) => w !== '在画面外' && w !== '被左边面板挡住' && w !== '被底部步骤栏挡住')) out.reach.push(`“${name}”拿不到：${[...why].join('、')}`);
  });
  // 叠在一起：两件不同的器材（拾取盒往上找到桌上那一件）摆在几乎同一个位置——多半是忘了摆到桌上的位置，都还在原点
  const top = (o) => { while (o.parent && o.parent !== g) o = o.parent; return o; };
  const tops = [...new Set(objs.map(top))].filter((o) => o !== g);
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++)
    if (tops[i].position.distanceTo(tops[j].position) < 0.002) {
      const li = label(items[objs.findIndex((o) => top(o) === tops[i])]), lj = label(items[objs.findIndex((o) => top(o) === tops[j])]);
      out.stack.push(`“${li}”和“${lj}”摆在同一个位置 (${tops[i].position.toArray().map((x) => x.toFixed(3)).join(', ')})，是不是忘了摆到桌上的位置？`);
    }
  // 底部步骤栏：当前这一步要动的东西（光圈套着的那件）——它身上（或它那件器材上）要有一个拿得到的拾取盒
  const bar = inst.debug?.bar;
  out.step = bar?.current || null;
  const tg = bar?.target;
  if (tg && shown(tg) && !window.__qaHeld && !document.querySelector('.mw.live')) {      // 正按住拖着东西、正钻在微观次元里看的时候不查（看完回到桌上，镜头会回来）
    const inside = (o, r) => { for (let q = o; q; q = q.parent) if (q === r) return true; return false; };
    const mine = objs.filter((o) => inside(o, tg) || inside(tg, o) || top(o) === top(tg));
    if (!mine.length) out.reach.push(`当前步骤“${out.step}”光圈套着的东西没有登记成能拖、能点的`);
    else if (!mine.some((o) => reached.has(o))) out.reach.push(`当前步骤“${out.step}”光圈套着的东西拿不到`);
  }
  return out;
};

async function check(browser, id) {
  const R = { id, problems: [] };
  const file = path.join(ROOT, 'src/lessons', id + '.js');
  try { execFileSync('node', ['--check', file], { stdio: 'pipe' }); } catch (e) { R.problems.push('语法错误：' + String(e.stderr || e.message).split('\n').slice(0, 4).join(' ')); return R; }
  // 注释吞掉代码：一行里 // 后面还有像代码的东西（比如在一行中间加注释，把后面的 group.add(x) 吞进了注释）——语法检查查不出来
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const m = line.match(/(^|[^:'"\\])\/\/(.*)$/); if (!m) return;
    const c = m[2];
    if (/[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\([^)]*\)\s*;/.test(c) && /;/.test(c)) R.problems.push(`第 ${i + 1} 行：注释里像有代码，是不是把代码吞进注释了？ …${c.trim().slice(0, 60)}`);
  });
  const book = bookOf(id); if (!book) { R.problems.push('books.json 里没有这一课（PLAN.md 行 + bbox-overrides.json，再跑 tools/gen_content.py）'); return R; }
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // 关掉 Vite 的热更新连接：别人（并行的子任务）改了文件，不会把这个测试页面刷掉
  await p.addInitScript(() => { window.WebSocket = class { constructor() { this.readyState = 0; } addEventListener() {} removeEventListener() {} send() {} close() {} }; });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|WebGL: INVALID/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${process.env.LB_PORT || 5188}/?book=${book}#live=${id}`);
  // 等到实验真的打开（不是固定等几秒）
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => !!window.__lb?.live?.active?.inst && !window.__lb.live.opening)) break; await p.waitForTimeout(150); }
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('不猜了'))?.click());
  await p.waitForTimeout(2200);           // 立体图弹出、镜头取景
  const run = async (tag) => {
    const r = await p.evaluate(inPage);
    if (!r.open) { R.problems.push(`${tag}实验没有打开`); return; }
    for (const s of r.below) R.problems.push(`${tag}低于桌面：${s}`);
    for (const s of r.clip) R.problems.push(`${tag}${s}`);
    for (const s of r.reach) R.problems.push(`${tag}${s}`);
    for (const s of r.stack) R.problems.push(`${tag}${s}`);
    return r;
  };
  if (SELFTEST) console.log(id, '自测弄坏：', await p.evaluate(() => {
    const g = __lb.live.active.inst.group.children[0];
    const top = (o) => { while (o.parent && o.parent !== g) o = o.parent; return o; };   // 拾取盒所在的那件器材
    const it = __lb.live.active.inst.pointer.items().filter((d) => d.obj.visible);
    const a = top(it[0].obj), b = top(it[1].obj), c = top(it[2].obj);
    a.position.y -= 0.05;                                                       // 1：沉到桌面以下
    b.position.copy(c.position);                                                // 2：两件叠在一起
    const cam = __lb.stage.camera, d = cam.getWorldDirection(cam.position.clone());
    const behind = cam.position.clone().addScaledVector(d, -0.5);
    it[3].obj.parent.worldToLocal(behind); it[3].obj.position.copy(behind);    // 3：拾取盒挪到镜头背后（拿不到）
    return [a.name || a.type, b.name || b.type, c.name || c.type, it[3].hint];
  }));
  await run('');
  if (SHOTS) await p.screenshot({ path: `/tmp/lbqa/${id}.png` });
  if (FLOW) {
    const n = await p.evaluate(() => (__lb.live.active.inst.debug?.qa || []).length);
    if (!n) R.problems.push('（没有写 debug.qa 流程，跳过流程检查）');
    await p.evaluate(() => { window.__lbTimeScale = 4; });
    for (let k = 0; k < n; k++) {
      let info;
      if (MOUSE && await p.evaluate((k) => !!__lb.live.active.inst.debug.qa[k].mouse, k)) for (let i = 0, last = ''; i < 30; i++) {     // 真鼠标的那一步：等镜头停稳（演示刚退出时镜头还在往回飞）再算鼠标落点
        const c = await p.evaluate(() => { const c = __lb.stage.camera; return [c.position.x, c.position.y, c.position.z, c.quaternion.x, c.quaternion.y].map((v) => v.toFixed(4)).join(); });
        if (c === last) break; last = c; await p.waitForTimeout(120);
      }
      const plan = MOUSE ? await p.evaluate((k) => {
        const q = __lb.live.active.inst.debug.qa[k], m = q.mouse; if (!m) return null;
        const inst = __lb.live.active.inst, g = inst.group.children[0], cam = __lb.stage.camera;
        const scr = (w) => { const v = w.clone().project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
        m.obj.updateMatrixWorld(true); m.obj.geometry.computeBoundingBox();
        const c = m.obj.geometry.boundingBox.getCenter(m.obj.position.clone()).applyMatrix4(m.obj.matrixWorld);
        const an = m.kind === 'drag' && m.anchor?.(), off = an ? c.clone().sub(an.getWorldPosition(c.clone())) : c.clone().set(0, 0, 0);     // keepOffset：抓的地方和物体之差，先按这个挪过去，再看着微调
        const from = scr(c), to = m.kind === 'drag' ? scr(g.localToWorld(m.to()).add(off)) : null;
        return { name: q.name, wait: q.wait ?? 1, kind: m.kind, from, to, keep: !!an };
      }, k) : null;
      if (plan) {
        await p.mouse.move(plan.from[0] - 2, plan.from[1]); await p.mouse.move(plan.from[0], plan.from[1]); await p.waitForTimeout(60);
        { const o = await p.evaluate((k) => { const m = __lb.live.active.inst.debug.qa[k].mouse, h = m.over?.(); return h === undefined ? 'skip' : !h ? '空' : h.obj === m.obj ? 'ok' : (typeof h.hint === 'function' ? h.hint() : h.hint) || h.obj.name || '另一件'; }, k);
          if (TRACE) console.log('   hover:', o); if (o !== 'ok' && o !== 'skip') R.problems.push(`流程“${plan.name}”：鼠标按下去的地方${o === '空' ? '什么也拿不到' : `先拿到的是别的东西（${o}）`}`); }
        await p.mouse.down();
        if (plan.kind === 'drag') {
          await p.mouse.move(plan.to[0], plan.to[1], { steps: 12 });
          // keepOffset 的东西：像人一样看着它的位置再微调几下，直到它真的到了目标（抓的地方不在拖动平面上时，开环算不准）
          let at = plan.to.slice();
          for (let i = 0; plan.keep && i < 4; i++) {
            const e = await p.evaluate((k) => { const q = __lb.live.active.inst.debug.qa[k].mouse, g = __lb.live.active.inst.group.children[0], cam = __lb.stage.camera;
              const scr = (w) => { const v = w.clone().project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
              const a = scr(q.anchor().getWorldPosition(g.position.clone())), t = scr(g.localToWorld(q.to())); return [t[0] - a[0], t[1] - a[1]]; }, k);
            if (Math.hypot(e[0], e[1]) < 1.5) break;
            at = [at[0] + e[0], at[1] + e[1]]; await p.mouse.move(at[0], at[1], { steps: 4 });
          }
        }
        await p.waitForTimeout(80); await p.mouse.up();
        info = { name: plan.name + '（真鼠标）', wait: plan.wait };
        if (TRACE) console.log(`   [${id}] ${plan.name} 鼠标 ${plan.from.map(Math.round)} → ${plan.to?.map(Math.round)} 镜头 ${await p.evaluate(() => __lb.stage.camera.position.toArray().map((v) => v.toFixed(3)).join())}`);
      } else info = await p.evaluate((k) => { const q = __lb.live.active.inst.debug.qa[k]; try { q.run(); } catch (e) { return { name: q.name, err: e.message }; } return { name: q.name, wait: q.wait ?? 1 }; }, k);
      if (info.err) { R.problems.push(`流程“${info.name}”出错：${info.err}`); break; }
      const sc = await p.evaluate((k) => { const s = __lb.live.active.inst.debug.qa[k].scale || 4; window.__lbTimeScale = s; return s; }, k);
      await p.waitForTimeout((info.wait * 1000) / sc + 900);
      const r = await run(`流程“${info.name}”之后：`);
      if (SHOTS) await p.screenshot({ path: `/tmp/lbqa/${id}-${String(k + 1).padStart(2, '0')}.png` });
      R.last = r?.step;
      if (TRACE) console.log(`   [${id}] ${info.name} → ${r?.step}`, EXPR ? await p.evaluate(EXPR) : '');
      // 做到一半（第一步、中间一步）时放一遍老师演示，中途退出：学生的状态要原样回来
      if (k === 0 || k === Math.floor(n / 2)) {
        const snap = () => p.evaluate(() => { const S = __lb.live.active.inst.debug?.S; return S ? JSON.stringify(S, (key, v) => (v && typeof v === 'object' && !Array.isArray(v) && v.constructor !== Object ? undefined : v)) : null; });
        const b0 = await snap(); await p.waitForTimeout(2900); const before = await snap();
        const moving = new Set(); if (b0 && before) { const X = JSON.parse(b0), Y = JSON.parse(before); for (const key in Y) if (JSON.stringify(X[key]) !== JSON.stringify(Y[key])) moving.add(key); }   // 不放演示也在变的（反应在进行）
        const ok = await p.evaluate(() => { const b = __lb.live.active.inst.debug?.bar; if (!b) return false; b.play('demo'); return b.playing; });
        if (ok) {
          await p.waitForTimeout(2500);
          const mid = await p.evaluate(() => __lb.live.active.inst.debug.S?.demo);
          await p.evaluate(() => __lb.live.active.inst.debug.bar.stop());
          await p.waitForTimeout(400);
          const after = await snap();
          if (!mid) R.problems.push(`流程“${info.name}”之后放演示：演示用的不是独立的一套（S.demo 不是 true）`);
          if (before !== after) {
            const A = JSON.parse(before), B = JSON.parse(after);
            const diff = Object.keys({ ...A, ...B }).filter((key) => JSON.stringify(A[key]) !== JSON.stringify(B[key]) && !moving.has(key) && !['near'].includes(key));
            if (diff.length) R.problems.push(`流程“${info.name}”之后放演示再退出：学生的状态变了（${diff.join('、')}）`);
          }
        }
      }
    }
    await p.evaluate(() => { window.__lbTimeScale = 1; });
    if (n && R.last) R.problems.push(`流程走完了，可还停在步骤“${R.last}”——这一步没做成`);
  }
  if (DEMO) {
    // 逐帧记下每件器材（拾取盒往上找到桌上那一件）的位置，从头放完演示
    await p.evaluate(() => {
      const inst = __lb.live.active.inst, g = inst.group.children[0], bar = inst.debug.bar;
      const top = (o) => { while (o.parent && o.parent !== g) o = o.parent; return o; };
      const label = (it) => { const h = typeof it.hint === 'function' ? it.hint() : it.hint; return (h || '').replace(/<[^>]+>/g, '').slice(0, 16); };
      const items = inst.pointer.items(), tops = [...new Set(items.map((it) => top(it.obj)))];
      const names = tops.map((t) => { const it = items.find((x) => top(x.obj) === t); return label(it) || t.name || t.type; });
      const L = window.__demoLog = { names, frames: [] };
      const V = g.position.constructor, inv = () => g.matrixWorld.clone().invert();
      const tick = () => {
        if (!bar.playing) { if (L.frames.length) { L.done = true; return; } }
        else { g.updateMatrixWorld(true); const iv = inv(); L.frames.push({ shot: bar.shot, cap: bar.reel && document.querySelector('.lbar .lb-txt')?.textContent, pos: tops.map((t) => { const v = t.getWorldPosition(new V()).applyMatrix4(iv); return [v.x, v.y, v.z, t.visible ? 1 : 0]; }) }); }
        requestAnimationFrame(tick);
      };
      bar.play('demo'); requestAnimationFrame(tick);
    });
    for (let i = 0; i < 200; i++) { await p.waitForTimeout(300); if (await p.evaluate(() => window.__demoLog?.done)) break; }
    const L = await p.evaluate(() => window.__demoLog);
    if (!L.done) R.problems.push('演示 60 秒还没放完');
    const F = L.frames, jumps = new Map(), moved = L.names.map(() => 0);
    for (let k = 1; k < F.length; k++) {
      const a = F[k - 1], b = F[k];
      if (k < 4) continue;                                   // 刚开始：演示换上一套新器材，器材回到原位，不算
      L.names.forEach((nm, j) => {
        const d = Math.hypot(b.pos[j][0] - a.pos[j][0], b.pos[j][1] - a.pos[j][1], b.pos[j][2] - a.pos[j][2]);
        if (b.pos[j][3] && a.pos[j][3]) moved[j] += d;
        const c = F[k + 1], d2 = c ? Math.hypot(c.pos[j][0] - b.pos[j][0], c.pos[j][1] - b.pos[j][1], c.pos[j][2] - b.pos[j][2]) : 0;
        // 一帧跳过去、下一帧就停住 = 瞬移（滑过去的话下一帧还在走）
        if (d > 0.015 && d2 < d * 0.25 && b.pos[j][3] && a.pos[j][3]) { const key = nm + '@' + b.shot; if (!jumps.has(key)) jumps.set(key, { nm, shot: b.shot, d, cap: b.cap }); }
      });
    }
    for (const j of jumps.values()) R.problems.push(`演示第 ${j.shot + 1} 个镜头（${(j.cap || '').slice(0, 18)}…）：“${j.nm}”一帧里跳了 ${(j.d * 100).toFixed(1)} cm（瞬移，没有被拿过去）`);
    const still = L.names.filter((_, j) => moved[j] < 0.004);
    if (still.length) R.problems.push('（提示）整段演示里一次都没动过：' + still.map((x) => `“${x}”`).join('、') + '——演示是不是漏了用它的那一步？');
  }
  for (const e of [...new Set(errs)]) R.problems.push('报错：' + e.slice(0, 200));
  await p.close();
  return R;
}

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const queue = [...ids], results = [];
await Promise.all(Array.from({ length: Math.min(PAR, queue.length) }, async () => { while (queue.length) { const id = queue.shift(); results.push(await check(browser, id).catch((e) => ({ id, problems: ['质检脚本出错：' + String(e.message).split('\n')[0]] }))); } }));
await browser.close();
let bad = 0;
for (const r of results.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))) {
  const real = r.problems.filter((x) => !x.startsWith('（'));
  if (real.length) bad++;
  console.log(`${real.length ? '✗' : '✓'} ${r.id}${r.last !== undefined ? `（流程走完，当前步骤：${r.last ?? '全部完成'}）` : ''}`);
  for (const x of r.problems) console.log('   · ' + x);
}
console.log(`\n${results.length - bad}/${results.length} 通过` + (SHOTS ? '，截图在 /tmp/lbqa/' : ''));
process.exit(bad ? 1 : 0);
