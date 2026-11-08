// 地理世界：首页选“地理”进来的地方（?subject=dili）。夜空里浮着一颗地球，所有地理课本围成一圈立在它下面。
// 地球上插着每一本书的活页（一本书一个颜色）：指着一面旗，旁边浮出课本里那张图和活页开头的问题，下面那本书同时亮起来、往外挪一点；
// 点下去：书圈转过来，那本书转到正前方，飞到面前，翻开到那一页（换到书里，活页从旗上长出来）。
// 也可以直接点一本书进去，或者在侧栏按书、按章找。地球旁的“看法”（昼夜、板块、气压带）点了一直开着。
import * as THREE from 'three';
import { WorldEarth, subsolar } from '../live/WorldEarth.js';
import { ANCHORS } from '../lessons/kit/atlas.js';
import { bookList, getBook, getManifest, fileUrl } from '../content/index.js';
import { tag, updateTags } from '../ui/tags.js';
import { Panel, h, stamps } from '../ui/Panel.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const $ = (s) => document.querySelector(s);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const EARTH = { y: 1.9, r: 0.92 };          // 地球：球心多高、多大
const RING = { r: 2.45, h: 0.92, tilt: 0.24 };          // 书圈：半径、书多高、往后仰多少
const BOOK_COLORS = { 'dili-7s': '#4f9d4a', 'dili-bx1': '#3d6fb4', 'dili-bx2': '#c27a2c', 'dili-xb1': '#8a5aa0', 'dili-xb2': '#c0453a' };          // 一本书一个颜色：旗、书脊下的光、侧栏一致
const SHORT = (full) => full.replace(/^人教版\s*/, '').replace(/^地理\s*/, '').replace('选择性必修', '选必');

export async function bootGeoWorld(stage, { focus = null } = {}) {
  document.body.classList.add('geo-world');
  document.title = '活页课本 · 地理世界';
  $('#book-title').textContent = '地理世界';
  for (const id of ['#btn-globe', '#btn-toc', '#btn-live']) $(id).hidden = true;
  $('#btn-shelf').textContent = '‹ 书架';

  // ---- 这些书、它们的活页 ----
  const books = bookList().filter((b) => b.subject === '地理' && Object.keys(getBook(b.id).lessons).length);
  const manifests = Object.fromEntries(await Promise.all(books.map(async (b) => [b.id, await getManifest(b.id)])));
  const items = [];
  for (const b of books) {
    const c = getBook(b.id), man = manifests[b.id], seen = new Set();
    for (const s of c.spots) {
      if (seen.has(s.lesson)) continue; seen.add(s.lesson);
      const L = c.lessons[s.lesson];
      items.push({ id: s.lesson, book: b, spot: s, title: L.title, fig: L.fig, sec: L.sec, page: s.page - man.pageOffset, anchor: ANCHORS[s.lesson] || { kind: 'idea' }, color: BOOK_COLORS[b.id] || '#7a6a4a' });
    }
  }

  // ---- 环境：木桌换成夜空（深蓝、星星、一道淡淡的银河）。地上一块圆台，台面上刻着这颗地球的北极投影图（跟着地球一起转） ----
  stage.desk.visible = false; stage.desk.material.transparent = true; stage.desk.material.needsUpdate = true;          // 书桌、书一开始就按半透明画（opacity 1 时和不透明一样）：半路改 transparent 要重新编译着色器，不改就淡不掉
  stage.scene.background = skyTex();
  stage.scene.fog = null;
  stage.scene.traverse((o) => { if (o.isHemisphereLight) { o.color.set(0x9db2d8); o.groundColor.set(0x141a2c); o.intensity = 0.5; } });
  Object.assign(stage.sun, { intensity: 3.2 }); stage.sun.color.set(0xfff4e6); stage.sun.position.set(-3.6, 5.4, 4.6);          // 主光从左上前方来：地球右下边缘落进晨昏里，有体积
  const root = new THREE.Group(); stage.scene.add(root);
  const stars = starField(); root.add(stars);
  const floorA = grayRadial([[0, 255], [0.7, 200], [1, 0]]);          // 圆台边缘淡进夜空里（alphaMap 读的是颜色，不是透明度）
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 96), new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.6, metalness: 0.2, transparent: true, alphaMap: floorA, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const glowPool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshBasicMaterial({ map: radial('rgba(110,160,255,0.30)', 'rgba(110,160,255,0)'), transparent: true, depthWrite: false }));
  glowPool.rotation.x = -Math.PI / 2; glowPool.position.y = 0.004; root.add(glowPool);          // 地球在圆台上投下一片淡淡的蓝光
  const key = new THREE.PointLight(0xffd9a8, 4, 8, 1.6); key.position.set(0, 1.6, 3.6); root.add(key);          // 一盏暖光照着书圈前面的书

  // ---- 地球 ----
  const earth = new WorldEarth(stage, { night: true });
  earth.root.visible = true; earth.root.position.set(0, EARTH.y, 0); earth.root.scale.setScalar(EARTH.r);
  earth.setPins(items);
  earth.shadow.visible = false;
  const first = items.find((x) => x.anchor.kind === 'place' && x.book.id === focus) || items.find((x) => x.anchor.kind === 'place');
  earth.spin.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-90 - (first ? first.anchor.pins[0].lon : 105)) * Math.PI / 180);          // 镜头在正前方（+z，地球不转时是西经 90° 那一面）：把这本书的第一面旗转过来
  const map = polarMap(earth.mat.map, RING.r); map.position.y = 0.006; root.add(map);

  // ---- 书圈：每本书立着，封面朝外，往后仰一点 ----
  const ring = new THREE.Group(); root.add(ring);
  const loader = new THREE.TextureLoader(), bookObjs = [];
  books.forEach((b, i) => {
    const man = manifests[b.id], W = (RING.h * man.pageSize[0]) / man.pageSize[1], T = (Math.floor(man.pageCount / 2) + 1) * 0.0017 * RING.h / 2;          // 放大到书里那本书的大小（高 2）时，正好是书里合上的书那么厚
    const cover = loader.load(fileUrl(`${getBook(b.id).base}hi/000.jpg`), () => { const bo = bookObjs.find((x) => x.b === b); if (bo) bo.coverReady = true; }); cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
    const paper = new THREE.MeshStandardMaterial({ color: 0xf1ebde, roughness: 0.9, transparent: true }), back = new THREE.MeshStandardMaterial({ map: backTex(b, BOOK_COLORS[b.id]), roughness: 0.7, transparent: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, RING.h, T), [paper, paper, paper, paper, new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6, transparent: true }), back]);          // 封面朝 +z（朝外）
    mesh.castShadow = true; mesh.position.y = RING.h / 2;
    const g = new THREE.Group(), lean = new THREE.Group(); lean.add(mesh); g.add(lean); lean.rotation.x = -RING.tilt; ring.add(g);
    const a = (i / books.length) * Math.PI * 2;
    g.position.set(Math.sin(a) * RING.r, 0, Math.cos(a) * RING.r); g.rotation.y = a;
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(W * 0.75, 40), new THREE.MeshBasicMaterial({ map: radial(hexA(BOOK_COLORS[b.id], 0.55), hexA(BOOK_COLORS[b.id], 0)), transparent: true, depthWrite: false })); lamp.rotation.x = -Math.PI / 2; lamp.position.set(0, 0.008, 0.12); g.add(lamp);          // 书脚下一圈这本书的颜色
    const label = tag(`<b>${SHORT(b.full)}</b><small>活页 ${Object.keys(getBook(b.id).lessons).length} 张</small>`, 'w-booklabel');
    bookObjs.push({ b, g, lean, mesh, lamp, label, a, W, T, hot: 0 });
  });
  let ringRot = 0, ringTo = 0;
  const spinTo = (bo) => { let d = -bo.a - ringRot; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI; ringTo = ringRot + d; };          // 转最短的那条路，让这本书到正前方
  const fb = bookObjs.find((x) => x.b.id === focus); if (fb) { spinTo(fb); ringRot = ringTo; }

  // ---- 镜头：地球在中间偏上，书圈在下面，一起框进来 ----
  const shot = (instant = false) => {
    stage.cameraOffsetX = panelOpen() ? Math.min(380, innerWidth * 0.4) / 2 + 8 : 0; stage.cameraOffsetY = 0;
    const el = THREE.MathUtils.degToRad(19);
    stage.shot({ target: new THREE.Vector3(0, 1.05, 0.3), dir: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist: stage.fitDistance(RING.r * 2 + 1.1, EARTH.y + EARTH.r + 0.75, 1.06), instant, minEl: 0.05 });
  };

  // ---- 侧栏：按书列出活页（颜色和旗一样） ----
  const panel = new Panel($('#panel'));
  const panelOpen = () => !$('#panel').hidden;
  const rows = new Map(), groups = new Map();
  let frontId = null;
  const setFront = (id) => { if (id === frontId) return; frontId = id; for (const [k, g] of groups) { g.classList.toggle('open', k === id); g.previousSibling?.classList.toggle('on', k === id); } };          // 侧栏只展开书圈正前方那本书的活页
  const openPanel = () => {
    const ui = panel.open({ id: 'geo-world', index: true, fig: '人教版 · 地理', title: '地理世界', ask: '课本里讲的这些事，发生在地球的哪里？' }, { onClose: () => { panel.close(); shot(); }, closeText: '收起 ‹' });
    panel.el.classList.add('board');
    const list = h('div', { class: 'atlas-list' });
    for (const b of books) {
      const mine = items.filter((x) => x.book.id === b.id), grp = h('div', { class: 'atlas-grp' });
      list.append(h('div', { class: 'atlas-ch', 'data-book': b.id, onclick: () => { const bo = bookObjs.find((x) => x.b.id === b.id); if (bo) spinTo(bo); } }, h('i', { style: `background:${BOOK_COLORS[b.id]}` }), b.full.replace(/^人教版\s*/, ''), h('em', {}, `${mine.length} 张`)), grp);
      groups.set(b.id, grp);
      for (const it of mine) {
        const a = it.anchor, sub = a.kind === 'place' ? a.pins.map((p) => p.name.split('：')[0]).join('、') : a.note ? a.note.replace(/^整个地球：/, '') : '原理';
        const row = h('button', { class: 'atlas-row', onclick: () => go(it), onmouseenter: () => hover({ it }, true), onmouseleave: () => hover(null, true) },
          h('span', { class: `atlas-kind k-${a.kind}` }, { place: '地点', globe: '整个地球', idea: '原理' }[a.kind]), h('b', {}, it.title), h('small', {}, `${it.fig} · 第 ${it.page} 页 · ${sub}`));
        if (stamps.has(it.id)) row.classList.add('done');
        rows.set(it.id, row); grp.append(row);
      }
    }
    ui.controls.append(list);
    ui.status(`${books.length} 本地理书、${items.length} 张活页。课本里举了具体地方的，地球上都插了一面旗，颜色是它所在的那本书。`);
  };
  openPanel();
  shot(true);

  // ---- 地球旁的“看法”：整个地球的主题，点了一直开着 ----
  const themes = items.filter((x) => x.anchor.chip);
  const chips = tag(themes.map((x) => `<button data-id="${x.id}" style="--c:${x.color}">${x.anchor.chip}</button>`).join(''), 'w-themes');
  let layerOn = null;
  chips.el.addEventListener('click', (e) => {
    const bt = e.target.closest('button'); if (!bt) return; e.stopPropagation();
    const it = themes.find((x) => x.id === bt.dataset.id); layerOn = layerOn === it ? null : it;
    earth.setLayer(layerOn?.anchor.layer || null);
    if (layerOn?.anchor.layer === 'sun') { const s = subsolar(); earth.turnTo(0, s.lon + 90, stage.camera); }
    for (const x of chips.el.children) x.classList.toggle('on', layerOn?.id === x.dataset.id);
    enterBtn.text(layerOn ? `<span>进到“${layerOn.title}”</span>` : ''); enterBtn.show(!!layerOn);
  });
  const enterBtn = tag('', 'view', () => layerOn && go(layerOn)); enterBtn.show(false);
  const hint = tag('<span>拖着地球转一转</span><small>指着一面旗看它在哪本书；点下去，翻到那一页</small>', 'hint');
  let touched = false;

  // ---- 指着旗、书、侧栏的名字：旗亮、书亮、明信片 ----
  let hovered = null, cardFor = null;
  const card = tag('', 'w-card'); card.show(false);
  function hover(x, fromPanel = false) {
    hovered = x; earth.setHot(x);
    for (const [id, r] of rows) r.classList.toggle('on', !!x && id === x.it.id);
    if (fromPanel && x?.it.anchor.kind === 'place') { const p = x.it.anchor.pins[0]; earth.turnTo(p.lat, p.lon, stage.camera); }
    earth.setLayer(x?.it.anchor.kind === 'globe' ? x.it.anchor.layer : layerOn?.anchor.layer || null);
    if (!x?.pn) { card.show(false); cardFor = null; return; }
    if (cardFor !== x) {
      cardFor = x; const it = x.it, [x0, y0, x1, y1] = it.spot.bbox, man = manifests[it.book.id], PW = man.pageSize[0], PH = man.pageSize[1];
      const extra = x.pn.extra;          // 活页补充的地方（课本这一节没有）：不配课本的图，写明是补充
      card.text(`${extra ? '' : '<div class="w-fig" hidden></div>'}<b>${it.title}</b><p class="w-q"></p><small>${extra ? `${x.pn.name}：${extra}` : `${SHORT(it.book.full)} · ${it.fig} · 第 ${it.page} 页 · ${x.pn.name}`}</small>`);
      const fig = card.el.querySelector('.w-fig');
      if (fig) {          // 课本那一页的图：本机有书页图（开发时）才配；网站上没有原书页，只写图号
        const url = fileUrl(`${getBook(it.book.id).base}hi/${String(it.spot.page).padStart(3, '0')}.jpg`), im = new Image();
        im.onload = () => { if (cardFor !== x) return; Object.assign(fig.style, { aspectRatio: `${x1 - x0} / ${y1 - y0}`, backgroundSize: `${(PW / (x1 - x0)) * 100}% auto`, backgroundPosition: `${(x0 / (PW - (x1 - x0))) * 100}% ${(y0 / (PH - (y1 - y0))) * 100}%`, backgroundImage: `url(${url})` }); fig.hidden = false; };
        im.src = url;
      }
      getBook(it.book.id).lessons[it.id]?.load().then((m) => { const q = cardFor === x && card.el.querySelector('.w-q'); if (q) q.innerHTML = String(m.default.places?.[x.pn.place]?.ask || m.default.ask || '').replace(/<[^>]+>/g, ''); });
    }
    card.show(true);
  }

  // ---- 进去：书转到正前方，落到面前放平（就是书里合上的那本书的位置），夜空换成书桌，地球缩到右上角（有地方的活页）或沉进书里 ----
  // 落好以后这一帧和书里的第一帧是同一个画面：截下来盖着换页面，那边画好了再揭开，看不出换过
  let leaving = null;
  function go(it, pn = null) {
    const bo = bookObjs.find((x) => x.b.id === it.book.id); if (!bo || leaving) return;
    const p = pn || it.anchor.pins?.[0];
    if (p) { earth.turnTo(p.lat, p.lon, stage.camera); earth.setActive({ it, pn: p }); }
    const corner = it.anchor.kind === 'place' && /^dili-(bx|xb)/.test(it.book.id);          // 书里那颗地球：有地方的活页一进去就在右上角
    leave(bo, `?book=${it.book.id}#live=${it.id}${pn && pn !== it.anchor.pins?.[0] ? `&place=${encodeURIComponent(pn.place || pn.name)}` : ''}`, corner);          // 不是第一面旗（长白山、黄河入海口……）：带上是哪一面
  }
  function openBook(bo) { leave(bo, `?book=${bo.b.id}`, false); }
  function leave(bo, url, corner) {
    if (leaving) return;
    leaving = { bo, url, corner, t: 0 }; touched = true; hover(null); card.show(false); bookHot = null;
    spinTo(bo);
    $('#panel').classList.add('leaving');
  }
  const DAY = { bg: new THREE.Color(0xe9e1d3), hemi: [new THREE.Color(0xfffaf2), new THREE.Color(0xb8a890), 1.75], sun: [new THREE.Color(0xfff6e8), 1.7, new THREE.Vector3(-2.2, 6.5, 3.2)] };          // 书里白天书桌的灯光（同 Stage.js）
  const hemi = (() => { let x = null; stage.scene.traverse((o) => { if (o.isHemisphereLight) x = o; }); return x; })();
  let worldFade = 0;          // 0 夜空里的地理世界，1 换成了书桌（别的书、圆台、星星都淡掉了）
  const skyBg = stage.scene.background;
  /** 进书 / 从书里回来的过渡：书从书圈正前方落到桌面中间放平（书里合上的书那个位置），raw 0→1 是进去，1→0 是回来 */
  function transSetup(bo, corner) {
    const s = 2 / RING.h, W = bo.W * s, el = THREE.MathUtils.degToRad(64);
    root.updateMatrixWorld(true); root.attach(bo.mesh); bo.label.show(false);
    return {
      bo, corner, W, s,
      from: { p: bo.mesh.position.clone(), q: bo.mesh.quaternion.clone(), s: bo.mesh.scale.x },
      to: { p: new THREE.Vector3(W / 2, (bo.T * s) / 2, 0), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), s },
      shot: { target: new THREE.Vector3(W / 2, 0, 0.06), dir: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist: stage.fitDistance(W * 1.25, 2 * 1.2, 1.04) },          // 和书里合上的书同一个机位（main.js 的 bookShot）
      night: { hc: hemi.color.clone(), hg: hemi.groundColor.clone(), hi: hemi.intensity, sc: stage.sun.color.clone(), si: stage.sun.intensity, sp: stage.sun.position.clone() },
      e0: corner ? scr(earth.root.position, EARTH.r) : null,
    };
  }
  function transApply(L, raw) {
    const bo = L.bo, k = ease(raw), f = THREE.MathUtils.smoothstep(raw, 0.25, 0.85);
    // 书：从书圈里落到桌面中间，一边落一边放平、放大到书里那本书的大小
    bo.mesh.position.lerpVectors(L.from.p, L.to.p, k); bo.mesh.position.y += Math.sin(Math.PI * k) * 0.35;
    bo.mesh.quaternion.slerpQuaternions(L.from.q, L.to.q, ease(Math.min(1, raw * 1.15)));
    bo.mesh.scale.setScalar(L.from.s + (L.to.s - L.from.s) * k);
    // 别的书、圆台、星星淡掉；书桌、白天的灯光、雾慢慢回来
    worldFade = f;
    for (const o of bookObjs) if (o !== bo) { o.mesh.castShadow = f < 0.01; o.mesh.visible = f < 0.995; for (const mt of o.mesh.material) { mt.depthWrite = f <= 0.001; mt.opacity = 1 - f; } }          // 淡掉的书不写深度：不然在半透明的书桌上挖出一个个洞，露出后面的夜空
    for (const m of [floor.material, glowPool.material]) m.opacity = 1 - f;
    map.material.uniforms.fade.value = 1 - f;
    stars.children.forEach((pt) => { pt.material.opacity = 1 - f; });
    stage.desk.visible = f > 0.001; stage.desk.material.opacity = f;
    stage.scene.background = f > 0.999 ? DAY.bg : skyBg;          // 书桌完全不透明了才换掉夜空（不然隔着半透明的桌面一下变亮）
    if (f > 0.001) { stage.scene.fog ||= new THREE.Fog(DAY.bg.clone(), 60, 80); stage.scene.fog.near = 60 - 53 * f; stage.scene.fog.far = 80 - 62 * f; } else stage.scene.fog = null;
    const n = L.night;
    hemi.color.lerpColors(n.hc, DAY.hemi[0], f); hemi.groundColor.lerpColors(n.hg, DAY.hemi[1], f); hemi.intensity = n.hi + (DAY.hemi[2] - n.hi) * f;
    stage.sun.color.lerpColors(n.sc, DAY.sun[0], f); stage.sun.intensity = n.si + (DAY.sun[1] - n.si) * f; stage.sun.position.lerpVectors(n.sp, DAY.sun[2], f);
    key.intensity = 4 * (1 - f);
    earth.haloM.uniforms.k.value = 1 - 0.75 * f;
    // 地球：有地方的活页缩到右上角（书里那颗地球一进去就在那儿）；别的沉进书里（书里的地球从书里升起来），回来时从书里升回去
    if (L.corner) {
      const E = cornerScr(), A = L.e0;
      placeScr(earth.root, { x: A.x + (E.x - A.x) * k, y: A.y + (E.y - A.y) * k, depth: Math.exp(Math.log(A.depth) + (Math.log(E.depth) - Math.log(A.depth)) * k), a: A.a + (E.a - A.a) * k });
    } else {
      earth.root.position.set(0, EARTH.y, 0).lerp(new THREE.Vector3(L.W / 2, bo.T * L.s + 0.01, 0), k);
      earth.root.scale.setScalar(EARTH.r + (0.004 - EARTH.r) * k);
    }
  }
  function land(dt) {
    const G = leaving;
    if (!G.L) {
      if (Math.abs(ringTo - ringRot) > 0.45 && G.t < 1.2) return;          // 书先转到前面来（差不多到了就开始落）
      G.L = transSetup(G.bo, G.corner); G.raw = 0;
      stage.cameraOffsetX = 0; stage.calm = true; stage.shot(G.L.shot);
    }
    G.raw = Math.min(1, G.raw + dt / 1.25);
    transApply(G.L, G.raw);
    if (G.raw >= 1 && !G.sent && (stage.settled(0.004, { parallax: true }) || G.t > 3.2)) {
      G.sent = true;
      try { sessionStorage.setItem('livebook.snap', stage.snapshot()); } catch { /* 存不下就直接换 */ }
      if (!window.__geoStay) location.href = G.url;          // __geoStay：测试脚本停在落好的这一帧看
    }
  }
  // 从书里回来（点了“‹ 地理世界”）：书里最后一帧（合上的书）盖着；这边先摆成同一个画面，书的封面贴图好了再揭开，然后倒着放一遍：书升回书圈，书桌淡回夜空，地球从书里升起来
  let arriving = null;
  function arrive(bo) {
    spinTo(bo); ringRot = ringTo; ring.rotation.y = ringRot; bo.g.rotation.y = bo.a;
    arriving = { L: transSetup(bo, false), raw: 1, t: 0, frames: 0 };
    transApply(arriving.L, 1);
    stage.shot({ ...arriving.L.shot, instant: true }); stage.cameraOffsetX = 0; stage.calm = true;
    $('#panel').classList.add('leaving');
  }
  function arriveStep(dt) {
    const A = arriving; A.t += dt;
    if (!A.shown) {
      if (A.L.bo.coverReady || A.t > 1.6) A.frames++;
      if (A.frames > 2) { A.shown = true; A.delay = 0.34; window.__dropSnap?.(); }          // 盖着的截图淡出完了再动（不然有一两帧重影）
      return;
    }
    if (A.delay > 0) { A.delay -= dt; if (A.delay <= 0) { stage.calm = false; shot(); } return; }
    A.raw = Math.max(0, A.raw - dt / 1.25);
    transApply(A.L, A.raw);
    if (A.raw > 0) return;
    const bo = A.L.bo;          // 落回书圈：书放回原来的位置，材质恢复不透明
    bo.lean.attach(bo.mesh); bo.mesh.position.set(0, RING.h / 2, 0); bo.mesh.quaternion.identity(); bo.mesh.scale.setScalar(1); bo.label.show(true);
    for (const o of bookObjs) { o.mesh.castShadow = true; o.mesh.visible = true; for (const mt of o.mesh.material) { mt.depthWrite = true; mt.opacity = 1; } }
    $('#panel').classList.remove('leaving');
    arriving = null;
  }
  // 一个球在屏幕上的样子（位置、离镜头多远、看上去多大），和反过来按屏幕上的样子摆回去（同 World.js 的 _scr/_blend）
  function scr(pos, r) { const cam = stage.camera; cam.updateMatrixWorld(); const fwd = cam.getWorldDirection(new THREE.Vector3()), v = pos.clone().project(cam), depth = Math.max(0.05, pos.clone().sub(cam.position).dot(fwd)); return { x: v.x, y: v.y, depth, a: r / depth }; }
  function placeScr(obj, e) { const cam = stage.camera, fwd = cam.getWorldDirection(new THREE.Vector3()), d = new THREE.Vector3(e.x, e.y, 0.5).unproject(cam).sub(cam.position).normalize(); obj.position.copy(cam.position).addScaledVector(d, e.depth / Math.max(0.05, d.dot(fwd))); obj.scale.setScalar(e.a * e.depth); }
  function cornerScr() {          // 书里右上角那颗地球（World.js 的 LOC）
    const LOC = { rpx: 46, right: 30, top: 84, dist: 1.35 }, cam = stage.camera; cam.updateMatrixWorld();
    const x = 1 - ((LOC.right + LOC.rpx) / innerWidth) * 2, y = 1 - ((LOC.top + LOC.rpx) / innerHeight) * 2;
    const d = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize(), depth = LOC.dist * d.dot(cam.getWorldDirection(new THREE.Vector3()));
    return { x, y, depth, a: Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * ((LOC.rpx * 2) / innerHeight) };
  }

  // ---- 指针 ----
  const canvas = $('#c'), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ac = new AbortController(), on = { signal: ac.signal };
  const setRay = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, stage.camera); };
  const hitBook = () => { const hit = ray.intersectObjects(bookObjs.map((x) => x.mesh), false)[0]; return hit ? bookObjs.find((x) => x.mesh === hit.object) : null; };
  let drag = null, bookHot = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (leaving || arriving) return; setRay(e); canvas.setPointerCapture(e.pointerId);
    const pin = earth.hitPin(ray), onEarth = earth.hitGlobe(ray), bo = !pin && !onEarth ? hitBook() : null;
    drag = { x: e.clientX, y: e.clientY, moved: false, pin, bo, earth: !!(pin || onEarth), q0: earth.spin.quaternion.clone(), r0: ringTo };
    if (drag.earth) earth.target = null;
    touched = true;
  }, on);
  canvas.addEventListener('pointermove', (e) => {
    setRay(e);
    if (drag) {
      const dx = e.clientX - drag.x; if (Math.abs(dx) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
      if (drag.earth) earth.spin.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.006).multiply(drag.q0));
      else { ringTo = drag.r0 + dx * 0.005; }          // 拖空白处或书：书圈跟着转
      return;
    }
    if (leaving || arriving) return;
    const pin = earth.hitPin(ray);
    if (pin && (hovered?.it !== pin.it || hovered?.pn !== pin.pn)) hover(pin);
    else if (!pin && hovered?.pn) hover(null);
    const bo = pin ? null : hitBook(); bookHot = bo;
    canvas.style.cursor = pin || bo ? 'pointer' : earth.hitGlobe(ray) ? 'grab' : '';
  }, on);
  const up = () => {
    const d = drag; drag = null; if (!d) return;
    if (!d.moved && d.pin) go(d.pin.it, d.pin.pn);
    else if (!d.moved && d.bo) openBook(d.bo);
  };
  canvas.addEventListener('pointerup', up, on); canvas.addEventListener('pointercancel', up, on);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); stage.zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : 0.0016))); }, { passive: false, signal: ac.signal });
  $('#btn-shelf').onclick = () => { try { sessionStorage.setItem('livebook.snap', stage.snapshot()); } catch { /* 存不下就直接换 */ } location.href = location.pathname; };
  stage.onResize = () => shot();

  // ---- 光线：指着的旗连到它所在的那本书（指着一本书时，连到这本书在地球正面的所有旗） ----
  const threads = [];
  const thread = () => { const l = new Line2(new LineGeometry(), new LineMaterial({ color: 0xffffff, linewidth: 1.8, worldUnits: false, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); l.raycast = () => {}; l.frustumCulled = false; root.add(l); return l; };
  let threadKey = '', threadK = 0;
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), C = new THREE.Vector3(), Q = new THREE.Vector3();
  function drawThreads(dt) {
    const bo = hovered?.pn ? bookObjs.find((x) => x.b.id === hovered.it.book.id) : bookHot;
    const pins = !bo ? [] : hovered?.pn ? earth.pins.filter((p) => p.pn === hovered.pn) : earth.pins.filter((p) => p.it.book.id === bo.b.id && earth.facing(p.n, stage.camera) > 0.25);
    const key = bo ? bo.b.id + pins.map((p) => p.pn.name).join() : '';
    if (key !== threadKey) { threadKey = key; threadK = 0; }
    threadK = Math.min(1, threadK + dt / 0.45);
    const k = ease(threadK);
    while (threads.length < pins.length) threads.push(thread());
    threads.forEach((l, i) => {
      const p = pins[i]; l.visible = !!p; if (!p) return;
      earth.pinWorld(p.pn, P0); bo.lean.localToWorld(P1.set(0, RING.h + 0.02, 0));
      C.copy(P0).add(P1).multiplyScalar(0.5); Q.set(C.x, 0, C.z).normalize(); C.addScaledVector(Q, 0.45).add(new THREE.Vector3(0, 0.25, 0));
      const pts = [], n = 28, m = Math.max(1, Math.round(n * k));
      for (let j = 0; j <= m; j++) { const t = j / n, u = 1 - t; pts.push(u * u * P0.x + 2 * u * t * C.x + t * t * P1.x, u * u * P0.y + 2 * u * t * C.y + t * t * P1.y, u * u * P0.z + 2 * u * t * C.z + t * t * P1.z); }
      l.geometry.dispose(); l.geometry = new LineGeometry(); l.geometry.setPositions(pts);
      l.material.color.set(p.it.color); l.material.opacity = 0.95;
    });
  }

  // ---- 每帧 ----
  stage.updaters.add((dt) => {
    ringRot += (ringTo - ringRot) * Math.min(1, dt * 4.5);
    ring.rotation.y = ringRot;
    for (const bo of bookObjs) { const w = Math.atan2(Math.sin(bo.a + ringRot), Math.cos(bo.a + ringRot)), f = THREE.MathUtils.smoothstep(Math.abs(w), 1.6, 2.3); bo.g.rotation.y = bo.a + (w * (0.55 + 0.45 * f) - w); }          // 封面朝外，前半圈再往镜头这边偏一半（两边的书也看得见封面）；后半圈照样朝外，露出书背
    drawThreads(dt);
    let best = null, bd = 9; for (const bo of bookObjs) { const w = Math.abs(Math.atan2(Math.sin(bo.a + ringTo), Math.cos(bo.a + ringTo))); if (w < bd) { bd = w; best = bo; } } setFront(best?.b.id);
    earth.hotBook = bookHot && !hovered ? bookHot.b.id : null;
    // 指着的旗属于哪本书：那本书亮起来、往外挪一点
    const hotBook = hovered?.it.book.id || leaving?.bo.b.id || bookHot?.b.id || null;
    for (const bo of bookObjs) {
      bo.hot += ((bo.b.id === hotBook ? 1 : 0) - bo.hot) * Math.min(1, dt * 6);
      bo.lean.position.z = bo.hot * 0.22; bo.lean.position.y = bo.hot * 0.06;
      bo.lamp.material.opacity = (0.35 + bo.hot * 0.65) * (1 - worldFade);
      const w = new THREE.Vector3(0, -0.12, 0.3); bo.g.localToWorld(w); bo.label.at(w).show(worldFade < 0.3 && bo.mesh.parent === bo.lean);
      bo.label.el.classList.toggle('hot', bo.hot > 0.5);
    }
    if (!leaving?.L && !arriving) earth.root.position.y = EARTH.y + Math.sin(performance.now() / 2400) * 0.012;          // 很轻地浮着
    if (!drag && !hovered && !earth.target && !earth.active && !leaving && !layerOn) earth.spin.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.03));
    earth.update(dt, { camera: stage.camera, bookTop: 0, shadowK: 0 });
    stars.rotation.y += dt * 0.002;
    map.material.uniforms.spin.value = 2 * Math.atan2(earth.spin.quaternion.y, earth.spin.quaternion.w);          // 台面上的投影图跟着地球转
    // 明信片跟着旗
    if (cardFor?.pn) { const cam = stage.camera, right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), w = earth.pinWorld(cardFor.pn), toRight = (cardFor.pn.side ?? 1) < 0, edge = earth.root.position.clone().addScaledVector(right, EARTH.r * (toRight ? 1 : -1)); const sx = (edge.clone().project(cam).x + 1) / 2 * innerWidth + (toRight ? 1 : -1) * ((card.el.offsetWidth || 214) / 2 + 22), sy = ((1 - w.clone().project(cam).y) / 2) * innerHeight; card.at(new THREE.Vector3((sx / innerWidth) * 2 - 1, 1 - (sy / innerHeight) * 2, 0.5).unproject(cam)); }
    const left = new THREE.Vector3().setFromMatrixColumn(stage.camera.matrixWorld, 0).multiplyScalar(-EARTH.r * 1.32), E0 = new THREE.Vector3(0, EARTH.y, 0);          // 按钮钉在地球不浮动时的位置上（地球轻轻浮着，按钮不跟着晃）
    chips.at(E0.clone().add(left)); chips.show(!leaving && !arriving);
    enterBtn.at(E0.clone().add(left).add(new THREE.Vector3(0, -EARTH.r * 0.62, 0)));
    hint.at(E0.clone().add(new THREE.Vector3(0, EARTH.r * 1.32, 0))).show(!touched && !arriving);
    if (leaving) { leaving.t += dt; land(dt); }
    if (arriving) arriveStep(dt);
    updateTags(stage.camera);
  });
  let backFrom = null;
  try { backFrom = sessionStorage.getItem('livebook.worldFrom'); sessionStorage.removeItem('livebook.worldFrom'); } catch { /* 隐私模式 */ }
  const backBo = bookObjs.find((x) => x.b.id === backFrom);
  if (backBo) arrive(backBo); else window.__dropSnap?.();
  stage.start();
  document.querySelector('#loader')?.classList.add('done');
  window.__geo = { stage, earth, items, books, bookObjs, go, openBook, get busy() { return !!(leaving || arriving); } };
}

/** 夜空：一张经纬网的天空图（离得远，糊一点没关系）：上深下浅的蓝，一道斜着的银河（噪声做的淡淡的光带，中间一条暗缝） */
function skyTex() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#03060f'); gr.addColorStop(0.42, '#08102a'); gr.addColorStop(0.5, '#142247'); gr.addColorStop(0.56, '#0d1834'); gr.addColorStop(1, '#050913');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const rnd = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), P = 32, ii = ((i % P) + P) % P, i1 = (ii + 1) % P; const a = rnd(ii, j), b = rnd(i1, j), cc = rnd(ii, j + 1), dd = rnd(i1, j + 1); return a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lon = (x / W) * Math.PI * 2, lat = (0.5 - y / H) * Math.PI;
    const band = Math.sin(1.0) * Math.cos(lat) * Math.cos(lon - 0.25) + Math.cos(1.0) * Math.sin(lat);          // 到一个倾斜 57° 的大圆的“距离”（正弦）：这个大圆斜着从地球背后穿过
    let n = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { n += a * noise((x / W) * 32 * f, (y / H) * 16 * f); a *= 0.5; f *= 2; }
    const glow = Math.exp(-((band / 0.2) ** 2)) * (0.55 + n * 0.9) * (1 - 0.7 * Math.exp(-((band / 0.03) ** 2)) * n);
    const k = (y * W + x) * 4, t = Math.max(0, glow) * 64;
    d[k] = Math.min(255, d[k] + t * 0.85); d[k + 1] = Math.min(255, d[k + 1] + t * 0.88); d[k + 2] = Math.min(255, d[k + 2] + t * 1.15);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t;
}
/** 星星：远处一圈点，有大有小、有冷有暖；银河那一带密一些 */
function starField() {
  const g = new THREE.Group(), axis = new THREE.Vector3(-Math.sin(0.25), 0, -Math.cos(0.25));          // 和天空图里那道银河同一个大圆
  for (const [N, size, bright] of [[3200, 1.3, 0.75], [420, 2.2, 1], [60, 3.2, 1]]) {
    const P = new Float32Array(N * 3), C = new Float32Array(N * 3), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const milky = Math.random() < 0.4, u = Math.random() * Math.PI * 2, v = milky ? (Math.random() - 0.5) * 0.3 : Math.asin(Math.random() * 2 - 1);
      const q = new THREE.Vector3(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
      if (milky) q.applyAxisAngle(axis, 1.0);
      q.multiplyScalar(40);
      P.set([q.x, q.y, q.z], i * 3);
      col.setHSL(Math.random() < 0.2 ? 0.08 : 0.6, 0.35, 0.8).multiplyScalar(bright * (0.45 + Math.random() * 0.55)); C.set([col.r, col.g, col.b], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, map: starDot() }));
    pts.raycast = () => {}; g.add(pts);
  }
  return g;
}
let _dot; function starDot() { return (_dot ||= radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 0.9)); }
/** 圆台上的北极投影图（方位等距：圆心是北极，离圆心越远纬度越低；书圈正好立在赤道上）。
 *  像一块刻出来的铜版：海是深蓝，陆地是暗暗的铜色，海岸线描金；每 30° 一圈纬线、一条经线。spin 是地球绕地轴转了多少，图跟着转 */
function polarMap(tex, ringR) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { tex: { value: tex }, spin: { value: 0 }, R: { value: ringR }, fade: { value: 1 } },
    vertexShader: 'varying vec2 vXZ; void main(){ vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tex; uniform float spin; uniform float R; uniform float fade; varying vec2 vXZ;
      float seaAt(vec2 uv){ vec3 c = texture2D(tex, uv).rgb; return step(c.r * 1.25, c.b) * step(c.g * 1.02, c.b); }
      void main(){
        vec2 w = vec2(vXZ.x, -vXZ.y);
        float r = length(w), colat = 90.0 * r / R;
        if (colat > 104.0) discard;
        float az = atan(w.y, w.x) + spin, la = radians(90.0 - colat);
        vec3 d = vec3(cos(la) * cos(az), sin(la), cos(la) * sin(az));
        float lon = atan(-d.z, d.x), lat = asin(d.y);
        vec2 uv = vec2(lon / 6.2831853 + 0.5, lat / 3.14159265 + 0.5);
        vec3 c = texture2D(tex, uv).rgb;
        float sea = seaAt(uv), e = 1.6 / 2048.0;
        float coast = abs(seaAt(uv + vec2(e, 0.0)) - sea) + abs(seaAt(uv - vec2(e, 0.0)) - sea) + abs(seaAt(uv + vec2(0.0, e * 2.0)) - sea) + abs(seaAt(uv - vec2(0.0, e * 2.0)) - sea);
        float lum = dot(c, vec3(0.3, 0.55, 0.15));
        vec3 col = mix(mix(vec3(0.20, 0.17, 0.12), vec3(0.42, 0.34, 0.22), lum), vec3(0.05, 0.08, 0.16), sea);
        col += vec3(0.95, 0.76, 0.45) * min(1.0, coast) * 0.55;
        float gl = 1.0 - smoothstep(0.0, 0.7, abs(mod(colat + 15.0, 30.0) - 15.0) / fwidth(colat));
        float lonDeg = degrees(lon) + 180.0, gm = 1.0 - smoothstep(0.0, 0.7, abs(mod(lonDeg + 15.0, 30.0) - 15.0) / fwidth(lonDeg));
        float eq = 1.0 - smoothstep(0.0, 1.4, abs(colat - 90.0) / fwidth(colat));
        col += vec3(0.85, 0.68, 0.40) * (max(gl, gm * step(8.0, colat)) * 0.16 + eq * 0.7);
        float a = (1.0 - smoothstep(92.0, 104.0, colat)) * 0.78 + eq * 0.2;
        gl_FragColor = vec4(col, a * fade);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(ringR * 104 / 90, 160), m); mesh.rotation.x = -Math.PI / 2; mesh.raycast = () => {};
  return mesh;
}
/** 书背面：书的颜色，竖写书名（从后面看过去也认得出是哪一本） */
function backTex(b, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 360; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 360);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 360);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '600 30px "Songti SC", serif'; g.textAlign = 'center';
  g.fillText('地理', 128, 150); g.font = '22px "Songti SC", serif'; g.fillText(SHORT(b.full), 128, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function radial(c0, c1, stop = 1) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, c0); if (stop < 1) gr.addColorStop(stop, c0.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.6})`)); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function grayRadial(stops) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [o, v] of stops) gr.addColorStop(o, `rgb(${v},${v},${v})`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
