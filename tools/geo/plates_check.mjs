// 回归核对：保留源步段、极性、实际箭头尖端、球面点击、高程配准和浏览器加载状态。
import * as THREE from 'three';
import L, { GRID, HEIGHT, SOURCE } from '../../src/lessons/data/plates.js';
import { NAMES, CLASS, ll2v, dest, bearing, nearestBoundary, sectionSides, elevationState, sampleHeight, profile, sectionGeometry } from '../../src/lessons/kit/plates.js';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const raw = JSON.parse(readFileSync('/tmp/plates/pb_steps.json', 'utf8')).features;
ok(L.length === raw.length && L.length === 5824, '全部 5824 个输入步段均保留（不冒称原始模型的 5819 步段）');
ok(L.every((l, i) => { const p = raw[i].properties; return l.id === p.SEQNUM && l.c === p.STEPCLASS && l.left === p.PLATEBOUND.slice(0, 2) && l.right === p.PLATEBOUND.slice(3, 5) && l.polarity === p.PLATEBOUND[2] && l.subducting === (p.PLATEBOUND[2] === '/' ? l.right : p.PLATEBOUND[2] === '\\' ? l.left : null) && JSON.stringify(l.pts) === JSON.stringify([[p.STARTLONG, p.STARTLAT], [p.FINALLONG, p.FINALLAT]]); }), '逐步比对源代码、左右、极性、端点、类别，不排序、不删线');
ok(L.filter((l) => ['MO', 'SL'].some((c) => l.left === c || l.right === c)).length === 50, 'MO / SL 涉及的 50 个步段齐全');
ok(new Set(L.flatMap((l) => [l.left, l.right])).size === 52 && L.every((l) => NAMES[l.left] && NAMES[l.right]), '52 个具体板块都有中文名（AM 为阿穆尔，不是美洲）');
ok(L.some((l) => l.c === 'OSR' && l.p.includes('PA') && l.p.includes('NZ')) && L.some((l) => l.c === 'OSR' && l.p.includes('PA') && l.p.includes('CO')), '东太平洋扩张边界 PA—NZ / PA—CO 未被合并删除');
const near = (lat, lon) => nearestBoundary(L, lat, lon);
ok(near(-32.65, -72).l.p === 'NZSA' && near(-32.65, -72).l.subducting === 'NZ', '安第斯为纳斯卡向南美下插');
ok(near(38, 143.5).l.p === 'PAOK' && near(38, 143.5).l.subducting === 'PA', '日本海沟为太平洋向鄂霍次克下插');
ok(near(-48, 165).l.p === 'PAAU' && !sectionSides(near(-48, 165).l).subLeft && sectionSides(near(-48, 165).l, true).subLeft, '新西兰南端右侧 AU 下插；反转剖面会交换左右和下插侧');
ok(near(28.5, 85.2).l.c === 'CCB' && near(-30, -13.5).l.c === 'OSR' && near(5, 36.6).l.c === 'CRB', '喜马拉雅、大西洋中脊、东非案例类别正确');
ok(near(39.91, -124.16).l.c === 'CTF' && near(39.91, -124.16).dist < 0.1, '39.91°N、124.16°W 命中转换边界，不跳去 CCB');
const synthetic = [{ c: 'CTF', pts: [[179, 0], [-179, 0]] }, { c: 'CCB', pts: [[180, 1], [180, 2]] }];
ok(nearestBoundary(synthetic, 0, 180).l.c === 'CTF' && nearestBoundary(synthetic, 0, 180).dist < 1e-6, '跨日期变更线短弧的内部点距离为零，不只比较端点');
let sidesOK = true;
for (const l of L) { const [a, b] = l.pts, strike = bearing(a[1], a[0], b[1], b[0]), leftNormal = new THREE.Vector3(...ll2v(a[1], a[0])).cross(new THREE.Vector3(...ll2v(b[1], b[0]))).normalize(); const [lat, lon] = dest(a[1], a[0], strike + 90, -10); if (leftNormal.dot(new THREE.Vector3(...ll2v(lat, lon))) <= 0) sidesOK = false; }
ok(sidesOK, '所有有向线段的剖面负距离均在左侧（含冰岛斜向边界）');
ok(CLASS.OCB.form === '挤压变形示意' && CLASS.CCB.form === '挤压变形示意', 'OCB 与 CCB 默认汇聚挤压，不确诊俯冲或大陆碰撞');
const state = elevationState(GRID); ok(state.sample(0, 0) === null, '未加载不伪造零米'); state.load('bad'); ok(state.status === 'failed' && state.sample(0, 0) === null, '加载失败明确无值'); state.load(HEIGHT);
ok(state.status === 'ready' && Math.abs(GRID.lat0 - 89.88333333333333) < 1e-8 && Math.abs(GRID.lon0 + 179.86666666666667) < 1e-8 && Math.abs(GRID.dlat + 0.25) < 1e-8, '保留真实原点、步长、节点配准');
const csv = readFileSync('/tmp/plates/etopo.csv'); const rows = csv.toString().trim().split('\n').slice(2); let exact = true;
for (let i = 0; i < rows.length; i += 997) { const [lat, lon, z] = rows[i].split(',').map(Number); if (state.sample(lat, lon) !== z) exact = false; }
ok(exact && rows.length === GRID.width * GRID.height, '每隔 997 行比对 CSV 原整数高程，无 Canvas 8 位损失');
ok(state.sample(0, -180) === state.sample(0, 180) && state.sample(0, 181) === state.sample(0, -179), '经度周期取样，日期变更线连续索引');
ok(createHash('sha256').update(csv).digest('hex') === SOURCE.sha256['etopo.csv'] && createHash('sha256').update(readFileSync('/tmp/plates/pb_steps.json')).digest('hex') === SOURCE.sha256['pb_steps.json'], '来源 SHA256 与缓存一致');
const uiSource = readFileSync(new URL('../../src/lessons/plates.js', import.meta.url), 'utf8');
ok(!/实测|lowL|lowLeft|2500/.test(uiSource) && /即板块（图2.20）。这些板块/.test(uiSource), '无地形猜极性和地貌阈值；图号恢复原位置');
for (const [name, lat, lon] of [['安第斯', -32.65, -72], ['日本海沟', 38, 143.5], ['右侧俯冲', -48, 165], ['洋中脊', -30, -13.5]]) {
  const nb = near(lat, lon), pr = profile((a, b) => state.sample(a, b), nb.lat, nb.lon, nb.strike), subLeft = sectionSides(nb.l).subLeft, g = sectionGeometry(pr, subLeft); let valid = true;
  for (let x = 0; x <= 1024; x++) { valid &&= g.bottom(x, 50) > g.surface(x); if ((x - 512) * (subLeft ? 1 : -1) <= 0) valid &&= Math.abs(g.slab(x) - g.surface(x)) < 1e-8; else valid &&= g.slab(x) >= g.surface(x); }
  ok(valid, `${name}：逐像素检查海底以下厚度、入沟连续性及俯冲侧`);
}
// 真正的页面实例：检查实例矩阵变换后的圆锥尖端，不只检查模型函数的预期值。
const bases = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'];
const pw = createRequire(bases.find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json'))))('playwright-core');
const browser = await pw.chromium.launch({ executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.WebSocket = class { addEventListener() {} removeEventListener() {} send() {} close() {} }; });
  await page.goto(`http://127.0.0.1:${process.env.LB_PORT || 5189}/?book=dili-xb1#live=plates`);
  await page.waitForFunction(() => window.__lb?.live?.active?.inst?.debug?.snapshot?.().status === 'ready');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('不猜了'))?.click());
  const arrowResult = await page.evaluate(async () => {
    const { default: lines } = await import('/src/lessons/data/plates.js'); const THREE = await import('/node_modules/three/build/three.module.js');
    const { ll2v } = await import('/src/lessons/kit/plates.js'); const inst = window.__lb.live.active.inst, meshes = []; inst.group.traverse((o) => { if (o.isInstancedMesh) meshes.push(o); }); let checked = 0, correct = true;
    for (const [ki, kind] of ['grow', 'die'].entries()) { const mesh = meshes[ki], list = lines.filter((l, i) => l.k === kind && i % 14 === 0); if (mesh.count !== list.length * 2) correct = false;
      const pos = mesh.geometry.attributes.position; let tip = new THREE.Vector3(); for (let i = 0; i < pos.count; i++) { if (pos.getZ(i) > tip.z) tip.fromBufferAttribute(pos, i); } tip.normalize();
      list.forEach((l, i) => { const a = new THREE.Vector3(...ll2v(l.pts[0][1], l.pts[0][0])), b = new THREE.Vector3(...ll2v(l.pts[1][1], l.pts[1][0])), normal = a.clone().cross(b).normalize(); for (let j = 0; j < 2; j++) { const m = new THREE.Matrix4(); mesh.getMatrixAt(i * 2 + j, m); const actual = tip.clone().transformDirection(m), location = new THREE.Vector3().setFromMatrixPosition(m), side = Math.sign(location.dot(normal)), signed = actual.dot(normal) * side; if (kind === 'grow' ? signed < 0.999 : signed > -0.999) correct = false; checked++; } });
    }
    return { correct, checked };
  }); ok(arrowResult.correct && arrowResult.checked > 500, `页面实际圆锥尖端与边界法向点积正确（${arrowResult.checked} 个箭头）`);
  for (const name of ['喜马拉雅山', '安第斯山', '大西洋中脊', '东非裂谷', '日本海沟']) { await page.getByRole('button', { name, exact: true }).click(); const pk = await page.evaluate(() => window.__lb.live.active.inst.debug.snapshot().pick); ok(pk?.preset?.[0] === name && pk.pr.every((p) => Number.isFinite(p.h)) && pk.pr.some((p) => p.h !== 0), `${name} 预设使用有效地形和案例元数据`); }
  for (const [name, distance] of [['安第斯山', -600], ['日本海沟', -900]]) {
    await page.getByRole('button', { name, exact: true }).click();
    const pixels = await page.evaluate(async (distance) => {
      const inst = window.__lb.live.active.inst, pk = inst.debug.snapshot().pick; let canvas;
      inst.group.traverse((o) => { const c = o.material?.map?.image; if (c?.width === 1024 && c?.height === 512 && c.getContext) canvas = c; });
      const { sectionGeometry, sectionSides } = await import('/src/lessons/kit/plates.js'); const g = sectionGeometry(pk.pr, sectionSides(pk.line).subLeft), x = Math.round((distance + 1200) / 2400 * 1024), y = Math.ceil(g.surface(x)) + 8;
      return Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);
    }, distance);
    ok(pixels.join() === '79,95,116,255', `${name} 审稿指定海底下 8 像素为完整板片颜色，未被裁掉`);
  }
  await page.evaluate(() => { window.plateCanvasText = []; const fill = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { window.plateCanvasText.push({ text, chart: this.canvas.classList.contains('wx-map') }); return fill.call(this, text, ...args); }; });
  await page.evaluate(() => { const d = window.__lb.live.active.inst.debug; window.heightWait = d.reloadHeight(new Promise((resolve) => { window.heightResolve = resolve; })); d.pick(39.91, -124.16); });
  const loading = await page.evaluate(() => ({ s: window.__lb.live.active.inst.debug.snapshot(), text: document.body.innerText })); ok(loading.s.status === 'loading' && loading.s.pick === null && loading.text.includes('暂无') || loading.s.status === 'loading' && loading.s.pick === null && loading.text.includes('暂不提供高程'), '加载中点击不创建伪零米剖面，状态明确');
  await page.evaluate(async () => { const { HEIGHT } = await import('/src/lessons/data/plates.js'); window.heightResolve(HEIGHT); await window.heightWait; });
  const loaded = await page.evaluate(() => ({ s: window.__lb.live.active.inst.debug.snapshot(), text: document.body.innerText, chart: window.plateCanvasText.filter((r) => r.chart).map((r) => r.text) })); const pk = loaded.s.pick;
  ok(loaded.s.status === 'ready' && pk.c === 'CTF' && pk.preset === null && loaded.text.includes('大陆转换边界') && loaded.chart.some((t) => t.includes('大陆转换边界')) && loaded.chart.some((t) => t.includes('最高约')) && pk.pr.every((p, i) => p.h === profile((a, b) => sampleHeight(state.data, GRID, a, b), pk.lat, pk.lon, pk.strike)[i].h), '加载后切片、图表数据、侧栏统一更新到实际点击的 CTF');
  await page.evaluate(async () => { await window.__lb.live.active.inst.debug.reloadHeight(Promise.resolve('bad')); });
  const failed = await page.evaluate(() => ({ s: window.__lb.live.active.inst.debug.snapshot(), text: document.body.innerText })); ok(failed.s.status === 'failed' && failed.s.pick === null && failed.text.includes('不可用'), '加载失败清空切片并显示不可用');
  await page.evaluate(async () => { await window.__lb.live.active.inst.debug.reloadHeight(); });
  const ocb = L.find((l) => l.c === 'OCB'), middle = new THREE.Vector3(...ll2v(ocb.pts[0][1], ocb.pts[0][0])).add(new THREE.Vector3(...ll2v(ocb.pts[1][1], ocb.pts[1][0]))).normalize(); await page.evaluate(([x, y, z]) => { window.plateCanvasText = []; window.__lb.live.active.inst.debug.pick(Math.asin(y) * 180 / Math.PI, Math.atan2(-z, x) * 180 / Math.PI); }, middle.toArray());
  const actualOCB = await page.evaluate(() => window.__lb.live.active.inst.debug.snapshot().pick); const ocbText = await page.evaluate(() => window.plateCanvasText.map((r) => r.text)); ok(actualOCB.c === 'OCB' && ocbText.includes('汇聚挤压（不自动推断俯冲）') && !ocbText.includes('下插板片') && !ocbText.includes('局部部分熔融'), 'OCB 实际选中且只画挤压，无下插板片或部分熔融');
  await page.getByRole('button', { name: '安第斯山', exact: true }).click(); await page.waitForTimeout(2400); if (process.argv.includes('--shots')) await page.screenshot({ path: '/tmp/plates-andes.png' });
  ok(errors.length === 0, `浏览器无运行错误${errors.length ? ': ' + errors.join('; ') : ''}`);
} finally { await browser.close(); }
process.exit(bad ? 1 : 0);
