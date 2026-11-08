// 地球主探索（高中地理）：打开一本地理书，书摊在目录那一页，上方浮着一颗地球——这就是这本书的目录。
// 在地球上点一面旗（或侧栏里的名字），地球转过去；书在下面翻到那一页（纸贴着书页卷过去，不碰到地球）；
// 活页从地球上那一点长出来、落到书上，地球缩到右上角，标着你从哪里进来的。不关掉、不重开：上面的东西一直接着，下面的书跟着翻。
//   - 活页本身就是一颗地球的（昼夜、板块、气压带）：这颗地球直接落下去，变成活页里的那颗；
//   - 原理（不在某一个地方）：照旧从课本的图里升起来，地球退到角上；
//   - 回到地球：活页收回角上那颗地球里（或沉回课本的图里），书翻回目录，地球回到书上方，还朝着刚才看的地方；
//   - 反过来也行：在地球目录下直接翻书、点课本上发光的图，上面就进到那一张活页；翻到哪一页，地球上就亮出那一页的活页在哪。
// 书一直在（这个系列的标志），按章节上课的老师可以从侧栏、目录、“活页”抽屉直接进，不用先转地球。
import * as THREE from 'three';
import { WorldEarth, subsolar } from './WorldEarth.js';
import { ANCHORS, NEXT, CHAPTER_COLORS, chapterOf } from '../lessons/kit/atlas.js';
import { h } from '../ui/Panel.js';
import { tag } from '../ui/tags.js';

/** 哪些书用地球主探索：高中地理（初中七年级那本照旧） */
export const worldBook = (id) => /^dili-(bx|xb)/.test(String(id));

const KIND_TEXT = { place: '地点', globe: '整个地球', idea: '原理' };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const HUB_R = 0.8, HUB_Y = 0.13, HUB_BACK = 0.03;          // 地球目录：地球半径（书高 2）；地球在书的后上方：底离桌面多高、离书的上沿多远——翻起来的纸（立起来约 1.4 高）只从它前面经过，碰不到
const LOC = { rpx: 46, right: 30, top: 84, dist: 1.35 };          // 角上那颗地球：屏幕上的半径（像素）、离右边和上边多远、离镜头多远
const panelOffset = () => (innerWidth > 760 ? Math.min(380, innerWidth * 0.4) / 2 + 8 : 0);
const shortName = (pn) => pn.short || pn.name.split('：')[0];          // “厦门：台风‘莫兰蒂’登陆”在面板和角上只写“厦门”

export class World {
  constructor({ stage, book, live, panel, content, manifest, textures, onBook }) {
    Object.assign(this, { stage, book, live, panel, content, manifest, textures, onBook });
    this.earth = new WorldEarth(stage);
    this.items = this._items();
    this.earth.setPins(this.items);
    this.state = 'off';          // off：还没开始 | hub：地球目录 | topic：在一张活页里 | book：收起了地球，只看书
    this.cur = { pos: new THREE.Vector3(0, 0, 0), r: 0.0005 };          // 地球现在在哪、多大
    this.follow = null; this.anim = null; this.qAnim = null;
    this.jobs = []; this.tm = 0; this.busy = false;
    this.topic = null; this.idle = 0; this.drag = null; this.hubLayer = null;
    this.hubLeaf = Math.max(1, book.leafForPage(3));          // 目录：PDF 第 3、4 页（翻开第 2 张，右页是目录的第一页）
    book.curl = 0;          // 照常立起来翻（地球在书的后上方，碰不到）
    this.locTag = tag('', 'w-loc btn', () => this.toHub());
    this.locTag.show(false);
    this.card = tag('', 'w-card'); this.card.show(false);
    this.hint = tag('<span>拖着地球转一转</span><small>点一面旗，进到那张活页</small>', 'hint'); this.hint.show(false); this.touched = false;          // 开场的操作提示：做过一次就收
    this.saved = {};          // 每张活页上次的操作（回到地球再进来接着用）
    this.L = { r: HUB_R, y: HUB_Y, back: HUB_BACK, el: 17, ty: 0.58, tz: 0.42, fw: 2.02, fh: 0.95 };          // 地球目录的摆法和镜头（半径、底离桌面、离书多远；镜头仰角、看哪、框多大）
    // 地球旁的“看法”：整个地球的主题（板块、昼夜、气压带），点了一直开着；再点一下回到地球目录
    const themes = this.items.filter((x) => x.anchor.chip);
    this.chips = tag(themes.map((x) => `<button data-id="${x.id}" style="--c:${x.color}">${x.anchor.chip}</button>`).join(''), 'w-themes');
    this.chips.el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const id = b.dataset.id; if (this.topic?.id === id) this.toHub(); else this.enter(id); });
    this.chips.el.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && this.state === 'hub' && !this.busy) this._hover({ it: this.items.find((x) => x.id === b.dataset.id) }, true); });
    this.chips.el.addEventListener('mouseleave', () => { if (this.state === 'hub' && !this.busy) this._hover(null, true); });
    this.chips.show(false);
    book.on((type) => { if (type === 'turned' && this.state === 'hub' && !this.busy) this._syncFromBook(); });          // 地球在书的后面，翻书不挡着书页，不用让开
    stage.updaters.add((dt) => this.update(dt));
    addEventListener('resize', () => { if (this.state === 'hub' && !this.busy) this._hubShot(); });
  }

  // ---------- 这本书的活页 ----------
  _items() {
    const seen = new Set(), off = this.manifest.pageOffset;
    return this.content.spots.filter((s) => !seen.has(s.lesson) && seen.add(s.lesson)).map((s) => {
      const L = this.content.lessons[s.lesson], ch = chapterOf(L.sec), chap = this.manifest.chapters.filter((c) => c.page != null && c.page <= s.page).pop();
      return { id: s.lesson, spot: s, title: L.title, fig: L.fig, sec: L.sec, page: s.page - off, ch, chapterTitle: chap?.title || '', anchor: ANCHORS[s.lesson] || { kind: 'idea' }, color: CHAPTER_COLORS[(ch || 1) - 1] || '#b0723a' };
    }).sort((a, b) => a.spot.page - b.spot.page);
  }

  // ---------- 时间：等几秒、等到某个条件 ----------
  wait(s) { return new Promise((res) => this.jobs.push({ t: this.tm + s, res })); }
  until(fn) { return new Promise((res) => this.jobs.push({ fn, res })); }

  // ---------- 地球摆在哪：书上方（目录）、右上角、书里（还没升起来）、活页里那颗地球的位置 ----------
  _top() { return Math.max(this.book.topHeight('left'), this.book.topHeight('right')); }
  _hubPose() { const L = this.L; return { pos: new THREE.Vector3(0, L.y + L.r, -this.book.H / 2 - L.r - L.back), r: L.r }; }          // 书的后上方：书摊在前面，地球立在后面
  _sunkPose() { return { pos: new THREE.Vector3(0, this._top() + 0.01, -this.book.H * 0.32), r: 0.004 }; }          // 从书页靠里的地方升起来
  _locPose() {
    const cam = this.stage.camera; cam.updateMatrixWorld();
    const nx = 1 - ((LOC.right + LOC.rpx) / innerWidth) * 2, ny = 1 - ((LOC.top + LOC.rpx) / innerHeight) * 2;
    const p = new THREE.Vector3(nx, ny, 0.5).unproject(cam), dir = p.sub(cam.position).normalize(), fwd = cam.getWorldDirection(new THREE.Vector3());
    const pos = cam.position.clone().addScaledVector(dir, LOC.dist), depth = LOC.dist * dir.dot(fwd);
    return { pos, r: depth * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * ((LOC.rpx * 2) / innerHeight) };
  }
  _globePose(g) {
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    g.updateWorldMatrix(true, false); g.getWorldPosition(p); g.getWorldQuaternion(q); g.getWorldScale(s);
    return { pos: p, r: (g.geometry.parameters.radius || 1) * s.x, q };
  }
  _snap() { const c = this.cur; return { pos: c.pos.clone(), r: c.r }; }
  /** 一个摆法在屏幕上的样子：位置、离镜头多远、看上去多大 */
  _scr(P) { const cam = this.stage.camera; cam.updateMatrixWorld(); const fwd = cam.getWorldDirection(new THREE.Vector3()), v = P.pos.clone().project(cam), depth = Math.max(0.05, P.pos.clone().sub(cam.position).dot(fwd)); return { x: v.x, y: v.y, depth, a: P.r / depth }; }
  /** 换到另一个摆法：dur 秒，按屏幕上的位置和大小平滑过去。起点按开始那一刻在屏幕上的样子记下来：镜头同时推近，地球也不会先变大再变小 */
  setFollow(fn, dur = 0.9, { world = false } = {}) { const s = world ? this._snap() : this._scr(this._snap()); this.follow = fn; this.anim = dur > 0 ? { from: s, t: 0, dur, world } : null; return this.until(() => !this.anim); }
  _blend(A, b, k) {
    if (this.anim?.world) return { pos: A.pos.clone().lerp(b.pos, k), r: A.r + (b.r - A.r) * k };          // 落到书上、从书上升起：在世界里走直线（不会钻到书页下面）
    const cam = this.stage.camera, fwd = cam.getWorldDirection(new THREE.Vector3());
    const B = this._scr(b);
    const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k, depth = Math.exp(Math.log(A.depth) + (Math.log(B.depth) - Math.log(A.depth)) * k), ang = A.a + (B.a - A.a) * k;
    const p = new THREE.Vector3(x, y, 0.5).unproject(cam), dir = p.sub(cam.position).normalize();
    return { pos: cam.position.clone().addScaledVector(dir, depth / Math.max(0.05, dir.dot(fwd))), r: ang * depth };
  }

  // ---------- 镜头 ----------
  _hubShot(instant = false) {
    this.stage.cameraOffsetX = this.panel.el && !this.panel.el.hidden ? panelOffset() : 0;
    this.stage.cameraOffsetY = 0;
    const L = this.L, P = this._hubPose(), el = THREE.MathUtils.degToRad(L.el);
    const target = new THREE.Vector3(0, P.pos.y * L.ty, P.pos.z * L.tz + this.book.H * 0.5 * (1 - L.tz));          // 地球在后、书在前，一起框进来
    const dist = this.stage.fitDistance(this.book.W * L.fw, (L.r * 2 + this.book.H) * L.fh, 1.0);
    this.stage.shot({ target, dir: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist, instant });
  }

  /** 看书翻页：整个跨页在画面中间 */
  _bookShot() {
    this.stage.cameraOffsetX = 0; this.stage.cameraOffsetY = 0;
    const el = THREE.MathUtils.degToRad(48), top = this._top();
    this.stage.shot({ target: new THREE.Vector3(0, top, 0.08), dir: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist: this.stage.fitDistance(this.book.W * 2.3, this.book.H * 1.25, 1.0) });
  }

  // ---------- 侧栏：这本书的目录（按章列出活页，颜色和旗一样） ----------
  _hubPanel() {
    const def = { id: 'world-hub', index: true, fig: `${this.content.full} · 地球目录`, title: '这本书的活页，都从这颗地球出发', ask: '课本里讲的这些事，发生在地球的哪里？' };
    const ui = this.panel.open(def, { onClose: () => this.sleep(), closeText: '收起地球 ↓' });
    this.panel.el.classList.add('board');
    const rows = this.rows = new Map(), list = h('div', { class: 'atlas-list' });
    let lastCh = -1;
    for (const it of this.items) {
      if (it.ch !== lastCh) { lastCh = it.ch; list.append(h('div', { class: 'atlas-ch' }, h('i', { style: `background:${it.color}` }), it.chapterTitle || `第 ${it.ch} 章`)); }
      const a = it.anchor, sub = a.kind === 'place' ? a.pins.map((p) => p.name).join('、') : a.note ? a.note.replace(/^整个地球：/, '') : '';
      const row = h('button', { class: 'atlas-row', onclick: () => this.enter(it.id), onmouseenter: () => this._hover({ it }, true), onmouseleave: () => this._hover(null, true) },
        h('span', { class: `atlas-kind k-${a.kind}` }, KIND_TEXT[a.kind]), h('b', {}, it.title), h('small', {}, `${it.fig} · 第 ${it.page} 页${sub ? ` · ${sub}` : ''}`));
      rows.set(it.id, row); list.append(row);
    }
    ui.controls.append(list);
    const n = (k) => this.items.filter((x) => x.anchor.kind === k).length, parts = [['place', '插旗的'], ['globe', '整个地球的'], ['idea', '原理']].filter(([k]) => n(k)).map(([k, t]) => `${t} ${n(k)} 张`);
    ui.status(`插旗的是课本举的例子，点一面旗进去${this.chips?.el.children.length ? '；地球左边的“看法”是整个地球的事' : ''}。也可以直接翻书，点课本上发光的图。`);          // 少讲怎么用，先让人看见地球上的东西
    this.hubUI = ui;
  }

  /** 指着一面旗、一个名字：旗亮起来、写上名字；整个地球的事叠一层；旁边浮出课本里那张图 */
  _hover(x, fromPanel = false) {
    this.hovered = x; this.idle = 0;
    this.earth.setHot(x);
    for (const [id, r] of this.rows || []) r.classList.toggle('on', !!x && id === x.it.id);
    const it = x?.it;
    this.earth.setLayer(it?.anchor.kind === 'globe' ? it.anchor.layer : this.hubLayer);
    if (fromPanel && it?.anchor.kind === 'place') { const p = it.anchor.pins[0]; this.earth.turnTo(p.lat, p.lon, this.stage.camera); }
    if (fromPanel && it?.anchor.layer === 'sun') { const s = subsolar(); this.earth.turnTo(0, s.lon + 90, this.stage.camera); }          // 昼夜：把傍晚那条晨昏线转到正面，白天、黑夜各占一半
    this._card(x);
  }
  /** 课本里的那张图，像一张明信片浮在旗旁边（没有导入课本时只写图号） */
  _card(x) {
    const it = x?.it; if (!it || !x.pn) { this.card.show(false); this.cardFor = null; return; }
    if (this.cardFor !== x) {
      this.cardFor = x;
      const real = this.textures.source.kind !== 'placeholder', [x0, y0, x1, y1] = it.spot.bbox, PW = this.book.PW, PH = this.book.PH;
      const extra = x.pn.extra;          // 活页补充的地方（课本这一节没有）：不配课本的图，写明是补充
      this.card.text(`${extra ? '' : `<div class="w-fig"${real ? '' : ' hidden'}></div>`}<b>${it.title}</b><p class="w-q"></p><small>${extra ? `${x.pn.name}：${extra}` : `${it.fig} · 第 ${it.page} 页 · ${x.pn.name}`}</small>`);
      // 活页开头的那个问题：地球给出地方，问题引着人进去（活页文件第一次指着时才加载，进去时就快了）
      this.content.lessons[it.id]?.load().then((m) => { const q = this.cardFor === x && this.card.el.querySelector('.w-q'); if (q) q.innerHTML = String(m.default.ask || '').replace(/<[^>]+>/g, ''); });
      const fig = this.card.el.querySelector('.w-fig');
      if (real && fig && !extra) {
        Object.assign(fig.style, { aspectRatio: `${x1 - x0} / ${y1 - y0}`, backgroundSize: `${(PW / (x1 - x0)) * 100}% auto`, backgroundPosition: `${(x0 / (PW - (x1 - x0))) * 100}% ${(y0 / (PH - (y1 - y0))) * 100}%` });
        Promise.resolve(this.textures.source.url('hi', it.spot.page)).then((u) => { if (u && this.cardFor === x) fig.style.backgroundImage = `url(${u})`; });
      }
    }
    this.card.show(true);
  }

  // ---------- 开始：书翻到目录，地球从书里升起来 ----------
  async start() {
    if (this.state !== 'off') return;
    this.busy = true;
    try {
      this.state = 'hub'; this.reading = false;
      if (this.book.current !== this.hubLeaf) { this.book.turnTo(this.hubLeaf, { max: 3 }); await this.until(() => !this.book.busy); }
      this._hubPanel(); this._hubShot();
      this.cur = this._sunkPose(); this.earth.root.visible = true;
      this.earth.spin.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
      const first = this.items.find((x) => x.anchor.kind === 'place');
      if (first) this.earth.turnTo(first.anchor.pins[0].lat, first.anchor.pins[0].lon, this.stage.camera);
      await this.setFollow(() => this._hubPose(), 1.4, { world: true });          // 从书页正中直直升起来
    } finally { this.busy = false; }
  }

  /** 收起地球，只看书（按“收起地球”）；顶栏“地球”再叫出来 */
  async sleep() {
    if (this.busy || this.state !== 'hub') return;
    this.busy = true;
    try {
      this.panel.close(); this._hover(null);
      this.state = 'book';
      this.setFollow(() => this._sunkPose(), 0.8, { world: true });          // 沉回书里
      this.onBook?.();
      await this.wait(0.8);
      this.earth.root.visible = false;
    } finally { this.busy = false; }
  }

  /** 回书架之前：地球沉回书里，旗名、明信片都收掉 */
  hide() {
    this.state = 'book'; this.card.show(false); this.hint.show(false); this.locTag.show(false); this._hover(null);
    this.setFollow(() => this._sunkPose(), 0.5, { world: true });
  }

  async wake() {
    if (this.busy) return;
    if (this.state === 'topic') return this.toHub();
    if (this.state === 'hub') return;
    this.busy = true;
    try {
      this.state = 'hub'; this.reading = false;
      if (this.book.current !== this.hubLeaf) this.book.turnTo(this.hubLeaf, { max: 3 });
      this._hubPanel(); this._hubShot();
      if (!this.earth.root.visible) { this.cur = this._sunkPose(); this.earth.root.visible = true; }
      await this.setFollow(() => this._hubPose(), 1.2, { world: true });
    } finally { this.busy = false; }
  }

  // ---------- 进一张活页 ----------
  /** opts.pn：从哪面旗进来（没给就用第一面）；opts.quick：深链接直接进，不等地球转；opts.place：从别的活页带过来的地方 */
  async enter(id, opts = {}) {
    const it = this.items.find((x) => x.id === id);
    if (!it || this.busy) return;
    const a = it.anchor, kind = a.kind, pn = kind === 'place' ? (opts.pn || a.pins[0]) : null;
    if (this.topic?.id === id) {          // 已经在这张活页里：点了同一张活页的另一面旗（喜马拉雅→长白山），就地换地方，不关、不重开
      const inst = this.live.active?.inst;
      if (pn && pn !== this.topic.pn && inst?.place) { this.topic.pn = pn; this.earth.setActive({ it, pn }); this.earth.turnTo(pn.lat, pn.lon, this.stage.camera); inst.place(pn.place); this.locTag.text(`<b>${shortName(pn)}</b><small>回到地球</small>`); }
      return;
    }
    this.busy = true; this.touched = true;
    try {
      this.card.show(false); this.cardFor = null;
      const wasHub = this.state === 'hub';
      if (this.live.isOpen) await this._closeTopic();
      const mode = kind === 'place' ? 'pin' : kind === 'globe' ? (a.inplace ? 'inplace' : 'globe') : 'figure';
      if (this.state === 'book' || this.state === 'off') { this.earth.root.visible = true; this.cur = mode === 'pin' ? this._locPose() : this._sunkPose(); this.follow = mode === 'pin' || mode === 'figure' ? () => this._locPose() : () => this._hubPose(); this.anim = null; }          // 深链接直接进、或收起地球以后点了书上的图：地球从书里冒出来
      this.state = 'topic';
      this.topic = { id, it, pn, kind, mode };
      this.earth.setPlain(0); this.earth.setLook({ pins: mode !== 'inplace', fade: 1 }); this.earth.root.visible = true;
      this.earth.setHot(null); this.earth.setActive(pn ? { it, pn } : { it });
      for (const [k, r] of this.rows || []) r.classList.toggle('on', k === id);
      if (kind === 'globe') this.earth.setLayer(a.layer);          // 整个地球的主题：一点下去，地球上就是这一层
      if (pn) { this.earth.turnTo(pn.lat, pn.lon, this.stage.camera); if (!opts.quick) await this.wait(wasHub ? 0.75 : 0.4); }
      // 书翻到那一页（从旗进来的子情境翻到它自己那一页）：只翻一小叠
      const page = pn?.page ?? it.spot.page, leaf = this.book.leafForPage(page);
      if (mode === 'inplace') this.setFollow(() => this._hubPose(), 0.9, { world: true });          // 板块：地球就在书后上方，不挪走
      else if (mode !== 'globe') this.setFollow(() => this._locPose(), 1.0);          // 有地方的、原理：地球缩到右上角
      this.panel.close();
      const flip = this.book.current !== leaf || this.book.busy;
      if (flip && mode !== 'globe' && mode !== 'inplace') this._bookShot();          // 镜头低下来看书翻到那一页
      if (flip) { this.book.turnTo(leaf, { max: 3 }); await this.until(() => mode === 'pin' ? (!this.book.busy && this.book.current === leaf) || (this.book.anim && this.book.anim.to === leaf && this.book.anim.p > 0.72) : !this.book.busy && this.book.current === leaf); }          // 有地方的：书快翻完就开始从旗上长出来，落下时书已经翻好
      else if (!opts.quick) await this.wait(mode === 'pin' || mode === 'figure' ? 0.45 : 0.15);
      // 活页：从旗上长出来 / 整颗地球落下去 / 就在这颗地球上（板块） / 从课本的图里升起来
      const W = { mode: mode === 'inplace' ? 'globe' : mode, inplace: mode === 'inplace', from: pn ? () => this.earth.pinWorld(pn) : null, figText: pn?.figText, reframe: mode === 'inplace' ? (A) => this._inplaceFrame(A) : null, ...this._lessonPanel(it, pn) };
      this.live.open({ ...it.spot, page, world: W });
      await this.until(() => this.live.active && !this.live.opening);
      const A = this.live.active, inst = A?.inst, saved = this.saved[id];
      if (mode === 'inplace') this._inplaceHandoff(A, saved);
      else if (mode === 'globe') await this._landGlobe(it, inst);
      // 带进来的地方、上次的操作：先恢复上次的；从别的地方进来（地方变了）就按新地方
      const placeName = opts.place ?? pn?.place;
      if (saved && inst?.restore && mode !== 'inplace' && (!placeName || saved.m === placeName || saved.place === placeName || !('m' in saved))) inst.restore(saved);
      else if (placeName && inst?.place) inst.place(placeName);
      this.locTag.text(pn ? `<b>${shortName(pn)}</b><small>回到地球</small>` : '<small>回到地球</small>');
      this.subFor = { page, t: 0 };
    } finally { this.busy = false; }
  }

  /** 板块：活页里的那颗地球摆到书后上方这颗地球的位置、同样大、同一个朝向，一帧之内换过去（看上去还是这颗地球，边界留着） */
  _inplaceHandoff(A, saved) {
    const inst = A.inst, P = this._hubPose(), loc = (v) => v.clone().sub(A.to).divideScalar(A.s);
    const up = P.pos.clone().add(new THREE.Vector3(0, 0.36, -0.1));
    inst.worldHome?.({ pos: loc(P.pos), r: P.r / A.s, retreat: { pos: loc(up), r: (P.r * 0.8) / A.s }, q: this.earth.spin.quaternion.clone() });
    if (saved) inst.restore?.(saved);
    this.live.release();
    this.earth.root.visible = false;
    this.follow = () => this._globePose(inst.globe); this.anim = null;
    this._inplaceFrame(A);
  }
  /** 板块的镜头：没切开时和地球目录一样（地球在后、书在前）；切开后把切片和地球一起框进来 */
  _inplaceFrame(A) {
    if (!A.inst.sliceOut?.() || !A.inst.slice) return this._hubShot();
    // 切片是主角：切片在画面中间偏下、放大，地球在它后上方（露出切线那一带）
    const box = new THREE.Box3().setFromObject(A.inst.slice), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), G = this._globePose(A.inst.globe);
    const el = THREE.MathUtils.degToRad(27), dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
    this.stage.cameraOffsetX = this.panel.el && !this.panel.el.hidden ? panelOffset() : 0;
    // 要框进来的点：整块切片，地球的下半个（切线在中间一带，顶上可以出画）
    const pts = []; for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
    const right = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    for (const [a, b] of [[0, -1], [0.92, -0.3], [-0.92, -0.3], [0.5, 0.35], [-0.5, 0.35]]) pts.push(G.pos.clone().addScaledVector(right, a * G.r).add(new THREE.Vector3(0, b * G.r, 0)));
    this._fitPoints(pts, dir, 1.06);
    void c; void size;
  }
  /** 按针孔相机算：给定方向，让这些点刚好都落在画面可用的区域里（面板让出的地方不算） */
  _fitPoints(pts, dir, margin = 1.08) {
    const st = this.stage, d = dir.clone().normalize(), right = new THREE.Vector3(0, 1, 0).cross(d).normalize(), up = d.clone().cross(right).normalize();
    let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity, f0 = Infinity, f1 = -Infinity;
    for (const p of pts) { const a = p.dot(right), b = p.dot(up), c2 = p.dot(d); r0 = Math.min(r0, a); r1 = Math.max(r1, a); u0 = Math.min(u0, b); u1 = Math.max(u1, b); f0 = Math.min(f0, c2); f1 = Math.max(f1, c2); }
    const center = right.clone().multiplyScalar((r0 + r1) / 2).add(up.clone().multiplyScalar((u0 + u1) / 2)).add(d.clone().multiplyScalar((f0 + f1) / 2));
    const vfov = THREE.MathUtils.degToRad(st.camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * st.camera.aspect);
    const uW = 1 - Math.abs(st.cameraOffsetX * 2) / Math.max(1, innerWidth), uH = 1 - Math.abs(st.cameraOffsetY * 2) / Math.max(1, innerHeight);
    const tH = Math.tan((hfov * uW) / 2), tV = Math.tan((vfov * uH) / 2);
    let D = 0; for (const p of pts) { const c2 = p.clone().sub(center), depth = c2.dot(d); D = Math.max(D, depth + (Math.abs(c2.dot(right)) * margin) / tH, depth + (Math.abs(c2.dot(up)) * margin) / tV); }
    st.shot({ target: center, dir: d, dist: D });
  }

  /** 活页的侧栏：标题下面写从哪里进来、进来的是什么；“回到地球”；接着看 */
  _lessonPanel(it, pn) {
    const a = it.anchor;
    const crumb = a.kind === 'place' ? `<i style="background:${it.color}"></i>从地球上的<b>${shortName(pn)}</b>进来。${a.enter || ''}`
      : a.kind === 'globe' ? `<i style="background:${it.color}"></i>整个地球：就是刚才那颗地球。`
      : `<i style="background:${it.color}"></i>原理：不在某一个地方，从课本的图里升起来。`;
    const links = (NEXT[it.id] || []).filter((n) => this.items.some((x) => x.id === n.id)).map((n) => ({ text: `接着看：${n.text}`, when: n.when, onClick: () => { const t = this.items.find((x) => x.id === n.id); this.enter(n.id, { pn: n.pin != null ? t.anchor.pins?.[n.pin] : undefined, place: n.place }); } }));
    return { closeText: '回到地球 ↩', onClose: () => this.toHub(), crumb, links };
  }

  /** 整颗地球落下去：转到活页里那颗地球的朝向、挪到它的位置，海陆（需要时）淡掉，然后换成活页里的那颗 */
  async _landGlobe(it, inst) {
    const g = inst?.globe;
    if (!g) { this.live.release(); this.setFollow(() => this._locPose(), 0.8); return; }
    this.earth.target = null;
    const tgt = () => this._globePose(g);
    this.qAnim = { q0: this.earth.spin.quaternion.clone(), q1: tgt().q };
    if (it.anchor.plain) this.earth.setPlain(1, it.anchor.plain);
    this.earth.setLook({ pins: false, fade: 0 });          // 活页里那颗地球没有旗、没有大气光：落下去的路上收掉
    await this.setFollow(tgt, 1.05, { world: true });          // 镜头先不动（LiveLayer 等 release 再取景），地球从书上方直直落到活页里那颗地球的位置
    this.qAnim = null;
    this.earth.spin.quaternion.copy(tgt().q);
    this.live.release();
    await this.wait(0.05);
    this.earth.root.visible = false;
    this.follow = tgt;
  }

  /** 收起正在看的活页：回到角上那颗地球的旗里 / 整颗地球升回来 / 沉回课本的图里 */
  async _closeTopic() {
    const A = this.live.active, T = this.topic;
    if (!A) { this.topic = null; return; }
    if (T && A.inst.save) this.saved[T.id] = A.inst.save();          // 回来再进：接着刚才的
    if (T?.mode === 'inplace' && A.inst.sliceOut?.()) { A.inst.sliceIn?.(); await this.wait(0.85); }          // 切片先收回切线里
    if (T?.kind === 'globe' && A.inst.globe) {
      const P = this._globePose(A.inst.globe);
      this.earth.spin.quaternion.copy(P.q); this.earth.target = null;
      this.cur = { pos: P.pos.clone(), r: P.r }; this.follow = () => this.cur; this.anim = null;
      if (T.it.anchor.plain) this.earth.setPlain(1, T.it.anchor.plain);
      this.earth.setLook({ pins: false, fade: 0, instant: true });
      this.earth.root.visible = true;
      this.live.close({ world: { mode: 'globe' } });
    } else if (T?.kind === 'place' && T.pn) {
      this.live.close({ world: { mode: 'pin', from: () => this.earth.pinWorld(T.pn) } });
    } else this.live.close({ quick: true, world: { mode: 'figure' } });          // 原理：沉回课本的图里，收得快一点，书好接着翻
    await this.until(() => !this.live.active);
    this.locTag.show(false);
    this.topic = null;
  }

  /** 回到地球：活页收回去，书翻回目录，地球回到书上方，还朝着刚才看的地方 */
  async toHub() {
    if (this.busy) return;
    if (this.state === 'hub') return;
    if (this.state === 'book' || this.state === 'off') return this.wake();
    this.busy = true;
    const T = this.topic;
    try {
      await this._closeTopic();
      this.state = 'hub'; this.reading = false;
      this.earth.setPlain(0);
      this.earth.setLook({ pins: true, fade: 1 });
      this._uprightSpin();
      if (this.book.current !== this.hubLeaf) this.book.turnTo(this.hubLeaf, { max: 3 });
      this._hubPanel(); this._hubShot();
      this.earth.setActive(T ? (T.pn ? { it: T.it, pn: T.pn } : { it: T.it }) : null);
      this.earth.setLayer(this.hubLayer);
      await this.setFollow(() => this._hubPose(), 1.15, { world: T?.kind === 'globe' });          // 整颗地球从书上升回来：走直线
    } finally { this.busy = false; }
    this.wait(2.5).then(() => { if (this.state === 'hub' && !this.hovered && this.earth.active?.it === T?.it) this.earth.setActive(null); });          // 刚看过的那面旗再亮一会儿（不挡着别的操作）
  }

  /** 从活页里的那颗地球升回来以后，北极转回朝上（只绕地轴转，原来朝着镜头的经度还朝着镜头） */
  _uprightSpin() {
    const q = this.earth.spin.quaternion, cam = new THREE.Vector3(); this.stage.camera.getWorldPosition(cam);
    const d = cam.sub(this.cur.pos).normalize().applyQuaternion(q.clone().invert());          // 镜头方向在地球自己的坐标里
    const lon = Math.atan2(-d.z, d.x) * 180 / Math.PI;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    if (up.y > 0.999) return;
    this.earth.turnTo(0, lon, this.stage.camera);
  }

  /** 活页里换了情境，书翻到那一页：活页稍微抬起来，纸从它下面滑过去，再落回书上 */
  async _followPage(page, figText) {
    const leaf = this.book.leafForPage(page), A = this.live.active;
    this.subFor = { page }; this.subWant = null;
    if (!A || this.book.current === leaf) return;
    this.busy = true;
    try {
      A.lift = 0.34; await this.wait(0.3);
      this.book.curl = 0.17; this.book.turnTo(leaf, { max: 1 }); await this.until(() => !this.book.busy);
      this.book.curl = 0; A.lift = 0;
      const el = this.panel.el?.querySelector('.p-fig'), T = this.topic;
      if (el && T) el.textContent = figText || `${T.it.fig} · 课本第 ${page - this.manifest.pageOffset} 页`;
    } finally { this.busy = false; }
  }

  /** 地球目录下翻书：翻到的那一页有活页，就在地球上把它亮出来 */
  _syncFromBook() {
    const [l, r] = this.book.spread, here = this.items.filter((x) => x.spot.page === l || x.spot.page === r);
    const it = here.find((x) => x.anchor.kind === 'place') || here[0];
    if (!it) { this.earth.setActive(null); this.earth.setLayer(this.hubLayer); return; }
    this.earth.setActive({ it });
    if (it.anchor.kind === 'place') { const p = it.anchor.pins[0]; this.earth.turnTo(p.lat, p.lon, this.stage.camera); this.earth.setLayer(this.hubLayer); }
    else this.earth.setLayer(it.anchor.kind === 'globe' ? it.anchor.layer : this.hubLayer);
  }

  // ---------- 指针 ----------
  pointerDown(rc, e) {
    if (this.state === 'topic') { if (!this.busy && this.topic?.kind !== 'globe' && this.earth.hitGlobe(rc)) { this.drag = { loc: true }; return true; } return false; }
    if (this.state !== 'hub' || this.busy) return false;
    const pin = this.earth.hitPin(rc);
    if (!pin && !this.earth.hitGlobe(rc)) return false;
    this.drag = { x: e?.clientX ?? 0, moved: false, pin, q0: this.earth.spin.quaternion.clone() };
    this.touched = true;
    this.earth.target = null; this.idle = 0;
    document.getElementById('c').style.cursor = 'grabbing';
    return true;
  }
  pointerMove(rc, e) {
    const c = document.getElementById('c');
    if (!this.drag) {
      if (this.state === 'topic') { const on = !this.busy && this.topic?.kind !== 'globe' && this.earth.hitGlobe(rc); if (on !== this._locHover) { this._locHover = on; this.locTag.el.classList.toggle('hover', on); } if (on && c) c.style.cursor = 'pointer'; return on; }
      if (this.state !== 'hub' || this.busy) return false;
      const pin = this.earth.hitPin(rc), on = pin || this.earth.hitGlobe(rc);
      if (pin && (this.hovered?.it !== pin.it || this.hovered?.pn !== pin.pn)) this._hover(pin);
      else if (!pin && this.hovered?.pn) this._hover(null);
      if (on && c) c.style.cursor = pin ? 'pointer' : 'grab';
      return !!on;
    }
    if (this.drag.loc) return true;
    const dx = (e?.clientX ?? 0) - this.drag.x; if (Math.abs(dx) > 4) this.drag.moved = true;
    this.earth.spin.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.006).multiply(this.drag.q0));
    this.idle = 0;
    return true;
  }
  pointerUp() {
    const d = this.drag; if (!d) return false;
    this.drag = null; document.getElementById('c').style.cursor = '';
    if (d.loc) { this.toHub(); return true; }
    if (!d.moved && d.pin) this.enter(d.pin.it.id, { pn: d.pin.pn });
    return true;
  }

  reframe() { if (this.state === 'hub' && !this.busy) this._hubShot(); }

  // ---------- 每帧 ----------
  update(dt) {
    this.tm += dt;
    const A = this.live.active;
    for (const j of [...this.jobs]) if (j.fn ? j.fn() : this.tm >= j.t) { this.jobs.splice(this.jobs.indexOf(j), 1); j.res(); }
    if (this.state === 'off') return;
    let P = this.follow ? this.follow() : this.cur;
    if (this.anim) {
      this.anim.t += dt;
      const k = ease(Math.min(1, this.anim.t / this.anim.dur));
      P = this._blend(this.anim.from, P, k);
      if (this.qAnim) this.earth.spin.quaternion.slerpQuaternions(this.qAnim.q0, this.qAnim.q1, k);
      if (this.anim.t >= this.anim.dur) this.anim = null;
    }
    this.cur = { pos: P.pos.clone(), r: P.r };
    this.earth.root.position.copy(P.pos); this.earth.root.scale.setScalar(Math.max(1e-4, P.r));
    // 地球目录里闲着：地球慢慢转（指着旗、拖过以后停一会儿）
    this.idle += dt;
    if (this.state === 'hub' && !this.busy && !this.drag && !this.hovered && !this.earth.target && !this.earth.active && this.idle > 6) this.earth.spin.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.035));
    this.earth.update(dt, { camera: this.stage.camera, bookTop: this._top(), shadowK: this.state === 'hub' || this.state === 'off' ? 1 : 0.5 });
    // “看法”按钮：在地球左边（地球目录、板块里）
    const chipsOn = this.chips.el.children.length > 0 && (this.state === 'hub' || (this.state === 'topic' && this.topic?.mode === 'inplace'));
    this.chips.show(chipsOn);
    if (chipsOn) { const H = this._hubPose(), left = new THREE.Vector3().setFromMatrixColumn(this.stage.camera.matrixWorld, 0).multiplyScalar(-H.r * 1.38); this.chips.at(H.pos.clone().add(left)); for (const b of this.chips.el.children) b.classList.toggle('on', this.topic?.id === b.dataset.id); }
    // 活页里换了情境（准静止锋、海峡两岸、入海口）：书跟着翻到那一页（等它稳住半秒再翻）
    if (this.state === 'topic' && !this.busy && A && !A.closing && A.inst?.where && this.topic?.it.anchor.sub) {
      const T = this.topic, sub = T.it.anchor.sub[A.inst.where()], page = sub?.page ?? T.it.spot.page;
      if (page !== this.subFor?.page) { if (this.subWant?.page === page) this.subWant.t += dt; else this.subWant = { page, t: 0 }; if (this.subWant.t > 0.5) this._followPage(page, sub?.figText); }
      else this.subWant = null;
    }
    const showHint = this.state === 'hub' && !this.busy && !this.touched && !this.reading && this.items.some((x) => x.anchor.kind === 'place');
    this.hint.show(showHint);
    if (showHint) { const left = new THREE.Vector3().setFromMatrixColumn(this.stage.camera.matrixWorld, 0).multiplyScalar(-P.r * 1.05); this.hint.at(P.pos.clone().add(left).add(new THREE.Vector3(0, -P.r * 0.55, 0))); }
    // 角上那颗地球下面写着从哪里进来；指着它是“回到地球”
    const inLoc = this.state === 'topic' && !this.busy && this.topic?.kind !== 'globe';
    this.locTag.show(inLoc);
    if (inLoc) this.locTag.at(P.pos.clone().addScaledVector(new THREE.Vector3().setFromMatrixColumn(this.stage.camera.matrixWorld, 1), -P.r * 1.55));
    // 明信片：跟着指着的那面旗
    // 明信片：放在地球外面、和那面旗一样高，在旗名字的另一边（不挡住地球和旗）
    if (this.cardFor?.pn) {
      const cam = this.stage.camera, right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), w = this.earth.pinWorld(this.cardFor.pn);
      const toRight = (this.cardFor.pn.side ?? 1) < 0;
      const c = P.pos.clone(), edge = c.clone().addScaledVector(right, P.r * (toRight ? 1 : -1));
      const sx = (v) => (v.clone().project(cam).x + 1) / 2 * innerWidth, half = (this.card.el.offsetWidth || 214) / 2 + 18;
      const px = sx(edge) + (toRight ? half : -half), py = ((1 - w.clone().project(cam).y) / 2) * innerHeight;
      this.card.el.style.left = '0'; this.card.at(new THREE.Vector3((px / innerWidth) * 2 - 1, 1 - (py / innerHeight) * 2, 0.5).unproject(cam));
    }
    // 接着看：只在接得上的时候出现（比如板块切到了喜马拉雅）
    if (A && !A.closing && A.inst) for (const b of this.panel.el?.querySelectorAll('.p-link[data-when]') || []) b.hidden = (A.inst.where ? A.inst.where() : b.dataset.when) !== b.dataset.when;
  }
}
