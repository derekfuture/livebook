// 断层真实页面回归：累计滑移不随卸载撤销、切换模式保存、重来清除；同时核对相关活页的界面状态。
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const base = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json')));
const { chromium } = createRequire(base)('playwright-core');
const books = JSON.parse(readFileSync(new URL('../../src/content/books.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => { window.WebSocket = class { addEventListener() {} removeEventListener() {} send() {} close() {} }; });
  const open = async (id) => { const book = Object.entries(books).find(([, b]) => b.lessons[id])[0]; await page.goto(`http://127.0.0.1:${process.env.LB_PORT || 5189}/?book=${book}#live=${id}`); await page.waitForFunction(() => !!window.__lb?.live?.active?.inst && !window.__lb.live.opening); await page.waitForTimeout(500); };
  await open('fault');
  const fault = await page.evaluate(() => {
    const d = __lb.live.active.inst.debug, out = [];
    for (const mode of ['v', 'hz']) {
      d.reset(mode); const force = (s) => { d.S.s = s; d.events(); d.layout(); return d.S.slip; };
      const before = force(0.34), first = force(0.35), full = force(1), unload = force(0), reload = force(0.5);
      d.reset(mode === 'v' ? 'hz' : 'v', true); d.reset(mode, true);
      out.push({ mode, before, first, full, unload, reload, saved: d.S.slip, text: document.querySelector('.read-out').textContent });
    }
    d.reset('v'); return { out, reset: d.S.slip, text: document.body.textContent };
  });
  for (const r of fault.out) { assert.equal(r.before, 0); assert.equal(r.first, 0.3); assert.equal(r.full, 1); assert.equal(r.unload, 1); assert.equal(r.reload, 1); assert.equal(r.saved, 1); assert.ok(r.text.includes('相对位移示意') && !r.text.includes('米')); console.log(`✓ ${r.mode}：断裂、加力、卸载、再加载和模式切换均保留累计滑移`); }
  assert.equal(fault.reset, 0); assert.ok(fault.text.includes('缓慢蠕滑') && fault.text.includes('倾角及接触关系未模拟') && !fault.text.includes('万年')); console.log('✓ 重来清除滑移；界面注明相对尺度、蠕滑、几何简化及无年代标定');
  const review = await page.evaluate(() => {
    const d = __lb.live.active.inst.debug, status = () => document.querySelector('.status, .cap-msg').textContent;
    d.reset('v'); d.S.s = 1; d.events(); d.layout(); d.S.shake = 0;
    const stages = []; for (const e of [1, 0, 0.5, 1]) { d.S.e = e; d.events(); d.layout(); stages.push(status()); }
    const inspect = () => d.cracks.map((m) => { const b = m.parent.userData, p = m.geometry.attributes.position, turn = Math.abs(m.rotation.y) > 1, top = Math.max(...Array.from({ length: p.count }, (_, i) => p.getY(i) * m.scale.y)); return { attached: b.x0 != null, inside: turn ? m.position.z - 0.0025 >= b.z0 - 1e-9 && m.position.z + 0.0025 <= b.z1 + 1e-9 : m.position.x - 0.0025 >= b.x0 - 1e-9 && m.position.x + 0.0025 <= b.x1 + 1e-9, top, offset: m.parent.position.toArray() }; });
    const eroded = inspect(); d.S.e = 0; d.layout(); const initial = inspect();
    const log = document.querySelector('.timeline').textContent;
    d.reset('hz', true); d.S.s = 1; d.events(); d.layout(); d.S.shake = 0; d.layout(); const horizontal = inspect();
    d.reset('v', true); return { stages, eroded, initial, horizontal, log, restored: status() };
  });
  assert.match(review.stages[0], /后期演化/); assert.match(review.stages[1], /刚开始.*尚未演示后期地貌/); assert.match(review.stages[2], /正在经历/); assert.match(review.stages[3], /后期演化/); assert.match(review.restored, /刚开始/); assert.match(review.log, /曾观察到·后期演化/);
  for (const r of [...review.eroded, ...review.initial, ...review.horizontal]) { assert.ok(r.attached && r.inside); }
  assert.ok(review.eroded[0].top < review.initial[0].top); assert.equal(review.eroded[1].top, review.initial[1].top); assert.ok(review.eroded[0].offset[1] > 0); assert.ok(review.eroded[1].offset[1] < 0); assert.ok(review.horizontal[5].offset[0] > review.horizontal[4].offset[0]);
  console.log('✓ 审稿回归：阶段 100→0→50→100 与切换模式刷新当前结论；历史另标；破碎纹随各岩块位移并按侵蚀裁切');
  await open('fold');
  const fold = await page.evaluate(() => { const d = __lb.live.active.inst.debug; d.S.c = 1; d.S.e = 0; d.addProbe(0); d.layout(); const before = document.querySelector('.timeline').textContent; d.S.e = 0.5; d.layout(); return { before, after: document.querySelector('.timeline').textContent }; });
  assert.match(fold.before, /当前露头：.*第 6 层/); assert.match(fold.after, /当前露头：.*第 3 层/); console.log('✓ 褶皱未触发倒置事件时，侵蚀阶段 0→0.5 的侧栏同步第 6→3 层');
  const boundary = await page.evaluate(() => {
    const d = __lb.live.active.inst.debug;
    d.S.said = {}; d.S.c = 1; d.S.e = 0.8; d.layout();
    const flat = { inv: !!d.S.said.inv, read: document.querySelector('.read-out').textContent };
    d.S.e = 1; d.layout(); d.S.c = 0; d.layout();
    return { flat, read: document.querySelector('.read-out').textContent, log: document.querySelector('.timeline').textContent, text: document.body.textContent };
  });
  assert.equal(boundary.flat.inv, false); assert.match(boundary.flat.read, /地表近乎平坦/);
  assert.match(boundary.read, /岩层平直/); assert.match(boundary.log, /原背斜轴位置当前露头/);
  assert.ok(!boundary.text.includes('侵蚀阶段回溯了')); console.log('✓ 褶皱真实页面：阶段 80 不触发倒置，撤回挤压后平层及历史取样位置准确');
  await open('earthsun');
  const sun = await page.evaluate(() => { const d = __lb.live.active.inst.debug; d.S.lat = 89.5; d.S.city = -1; d.S.rec = {}; d.S.th = 93.9; d.layout(); return { th: d.S.th, rec: d.S.rec, text: document.body.textContent }; });
  assert.equal(sun.th, 90); assert.equal(Object.keys(sun.rec).length, 1); assert.ok(Object.values(sun.rec).every((r) => r['春分']?.len === 12)); assert.ok(sun.text.includes('地方真太阳时') && sun.text.includes('太阳视半径')); console.log('✓ 89.5°N、黄经 3.9°：画面吸附春分、记录 12 小时，并显示计算条件');
  const seasons = await page.evaluate(() => {
    const d = __lb.live.active.inst.debug, out = [];
    Object.assign(d.S, { city: 2, lat: 40, said: {} });
    for (const th of [180, 0, 180, 200]) { d.S.th = th; d.layout(); out.push(document.querySelector('.status, .cap-msg').textContent); }
    d.S.th = 180; d.S.city = 3; d.S.lat = 23.13; d.layout(); out.push(document.querySelector('.status, .cap-msg').textContent);
    d.S.city = 2; d.S.lat = 40; d.layout(); out.push(document.querySelector('.status, .cap-msg').textContent);
    return out;
  });
  for (const i of [0, 2, 5]) { assert.match(seasons[i], /夏至.*北纬 23°26′.*北京.*14 小时 51 分.*73°26′/); }
  assert.match(seasons[1], /冬至.*南纬 23°26′.*9 小时 09 分.*26°34′/);
  assert.match(seasons[0], /首次记进表/); assert.ok(!seasons[2].includes('首次'));
  assert.match(seasons[3], /非二分二至/); assert.ok(!seasons[3].includes('夏至'));
  assert.match(seasons[4], /广州/); console.log('✓ 夏至→冬至→夏至、离开节气、广州→北京：当前结论同步，首次记表提示单独去重');
  await open('industry');
  for (const [kind, p] of [['beer', { x: 0.075, n: 0.022 }], ['chip', { x: 0.04, n: 0.062 }], ['beer', { x: -0.125, n: 0.042 }]]) {
    const result = await page.evaluate(({ kind, p }) => {
      const d = __lb.live.active.inst.debug, drawn = [], proto = CanvasRenderingContext2D.prototype, original = proto.fillText;
      proto.fillText = function (text, ...args) { drawn.push(text); return original.call(this, text, ...args); };
      try { Object.assign(d.S, { kind, p }); d.layout(); [...document.querySelectorAll('button')].find((b) => b.textContent === '记下这个方案').click(); }
      finally { proto.fillText = original; }
      return { read: document.querySelector('.read-out').textContent, log: document.querySelector('.timeline').textContent, drawn };
    }, { kind, p });
    assert.match(result.read, /另需核实.*供水.*废水处理/); assert.match(result.log, /另需核实/);
    if (p.x > 0) { assert.ok(!result.log.includes('有麻烦')); assert.ok(!result.drawn.some((t) => t.startsWith('要注意'))); assert.ok(result.drawn.includes('另需核实')); }
    else { assert.match(result.log, /有麻烦/); assert.ok(result.drawn.includes('要注意 1 处')); }
    console.log(`✓ ${kind} 保存记录、成本图及读数：核算范围与实际风险分开`);
  }
  await open('belts');
  for (const [lat, shift, wanted] of [[60, 0, '近地面辐合'], [-60, 0, '近地面辐合'], [2, 5, '跨赤道转向未模拟'], [-2, -5, '跨赤道转向未模拟']]) {
    const text = await page.evaluate(({ lat, shift }) => { const d = __lb.live.active.inst.debug; Object.assign(d.S, { lat, shift }); d.layout(); return document.querySelector('.read-out').textContent; }, { lat, shift });
    assert.ok(text.includes(wanted) && !text.includes('无风')); console.log(`✓ 风带界面 ${lat}°、移动 ${shift}°：${wanted}`);
  }
} finally { await browser.close(); }
