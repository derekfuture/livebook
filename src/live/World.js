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
const HUB_R = 0.6, HUB_GAP = 0.24, HUB_Z = 0.02;          // 地球目录：地球半径（书高 2）、离书页多高（低翻页的卷边约 0.14）、前后位置
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
    book.curl = 0.17;          // 书上方浮着地球：翻页时纸不立起来
    this.locTag = tag('', 'w-loc btn', () => this.toHub());
    this.locTag.show(false);
    this.card = tag('', 'w-card'); this.card.show(false);
    book.on((type) => { if (type === 'turned' && this.state === 'hub' && !this.busy) this._syncFromBook(); });
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
  _hubPose() { return { pos: new THREE.Vector3(0, this._top() + HUB_GAP + HUB_R, HUB_Z), r: HUB_R }; }
  _sunkPose() { return { pos: new THREE.Vector3(0, this._top() + 0.01, HUB_Z), r: 0.004 }; }
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
    const P = this._hubPose(), el = THREE.MathUtils.degToRad(21);
    const target = new THREE.Vector3(0, P.pos.y - HUB_R * 0.78, 0.18);          // 地球是主角，书整个托在下面
    const dist = this.stage.fitDistance(this.book.W * 2.18, (HUB_R * 2 + HUB_GAP) * 1.95, 1.0);
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
    const def = { id: 'world-hub', index: true, fig: `${this.content.full} · 地球目录`, title: '这本书的活页，都从这颗地球出发', ask: '课本举的例子发生在哪里，地球上就插着旗；整个地球的事，指着它就叠在地球上；不在某一个地方的原理，从课本的图里升起来。<b>点一面旗或一个名字</b>，书会跟着翻到那一页。' };
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
    ui.status(`这本书一共 ${this.items.length} 张活页${parts.length > 1 ? `：${parts.join('，')}` : ''}。拖着地球可以转；也可以直接翻书，点课本上发光的图。`);
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
      this.card.text(extra ? `<b>${it.title}</b><small>${x.pn.name}：${extra}</small>` : `<div class="w-fig"${real ? '' : ' hidden'}></div><b>${it.title}</b><small>${it.fig} · 第 ${it.page} 页 · ${x.pn.name}</small>`);
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
      this.state = 'hub';
      if (this.book.current !== this.hubLeaf) { this.book.turnTo(this.hubLeaf); await this.until(() => !this.book.busy); }
      this._hubPanel(); this._hubShot();
      this.cur = this._sunkPose(); this.earth.root.visible = true;
      this.earth.spin.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
      const first = this.items.find((x) => x.anchor.kind === 'place');
      if (first) this.earth.turnTo(first.anchor.pins[0].lat, first.anchor.pins[0].lon, this.stage.camera);
      await this.setFollow(() => this._hubPose(), 1.4);
    } finally { this.busy = false; }
  }

  /** 收起地球，只看书（按“收起地球”）；顶栏“地球”再叫出来 */
  async sleep() {
    if (this.busy || this.state !== 'hub') return;
    this.busy = true;
    try {
      this.panel.close(); this._hover(null);
      this.state = 'book';
      this.setFollow(() => this._sunkPose(), 0.8);
      this.onBook?.();
      await this.wait(0.8);
      this.earth.root.visible = false;
    } finally { this.busy = false; }
  }

  async wake() {
    if (this.busy) return;
    if (this.state === 'topic') return this.toHub();
    if (this.state === 'hub') return;
    this.busy = true;
    try {
      this.state = 'hub';
      if (this.book.current !== this.hubLeaf) this.book.turnTo(this.hubLeaf);
      this._hubPanel(); this._hubShot();
      if (!this.earth.root.visible) { this.cur = this._sunkPose(); this.earth.root.visible = true; }
      await this.setFollow(() => this._hubPose(), 1.2);
    } finally { this.busy = false; }
  }

  // ---------- 进一张活页 ----------
  /** opts.pn：从哪面旗进来（没给就用第一面）；opts.quick：深链接直接进，不等地球转 */
  async enter(id, opts = {}) {
    const it = this.items.find((x) => x.id === id);
    if (!it || this.busy) return;
    if (this.topic?.id === id && !opts.pn) return;
    this.busy = true;
    try {
      const a = it.anchor, kind = a.kind, pn = kind === 'place' ? (opts.pn || a.pins[0]) : null;
      this.card.show(false); this.cardFor = null;
      const wasHub = this.state === 'hub';
      if (this.live.isOpen) await this._closeTopic();
      if (this.state === 'book' || this.state === 'off') { this.earth.root.visible = true; this.cur = kind === 'place' ? this._locPose() : this._sunkPose(); this.follow = kind === 'globe' ? () => this._hubPose() : () => this._locPose(); this.anim = null; }          // 深链接直接进、或收起地球以后点了书上的图：地球从书里冒出来
      this.state = 'topic';
      this.topic = { id, it, pn, kind };
      if (kind !== 'globe') { this.earth.setPlain(0); this.earth.setLook({ pins: true, fade: 1 }); this.earth.root.visible = true; }
      this.earth.setHot(null); this.earth.setActive(pn ? { it, pn } : { it });
      for (const [k, r] of this.rows || []) r.classList.toggle('on', k === id);
      if (kind === 'globe') this.earth.setLayer(a.layer);
      if (pn) { this.earth.turnTo(pn.lat, pn.lon, this.stage.camera); if (!opts.quick) await this.wait(wasHub ? 0.75 : 0.4); }
      // 书翻到那一页；地球（不是整颗落下去的）缩到右上角
      const leaf = this.book.leafForPage(it.spot.page);
      if (kind !== 'globe') this.setFollow(() => this._locPose(), 1.0);
      this.panel.close();
      if (kind !== 'globe' && (this.book.current !== leaf || this.book.busy)) this._bookShot();          // 地球让开，镜头低下来看书翻到那一页
      if (this.book.current !== leaf || this.book.busy) { this.book.turnTo(leaf); await this.until(() => !this.book.busy && this.book.current === leaf); }
      else if (!opts.quick) await this.wait(kind === 'globe' ? 0.15 : 0.45);
      // 活页：从旗上长出来 / 整颗地球落下去 / 从课本的图里升起来
      const mode = kind === 'place' ? 'pin' : kind === 'globe' ? 'globe' : 'figure';
      this.live.open({ ...it.spot, world: { mode, from: pn ? () => this.earth.pinWorld(pn) : null, ...this._lessonPanel(it, pn) } });
      await this.until(() => this.live.active && !this.live.opening);
      const inst = this.live.active?.inst;
      if (kind === 'globe') await this._landGlobe(it, inst);
      if (pn?.place && inst?.place) inst.place(pn.place);
      if (opts.place && inst?.place) inst.place(opts.place);
      this.locTag.text(pn ? `<b>${shortName(pn)}</b><small>回到地球</small>` : '<small>回到地球</small>');
    } finally { this.busy = false; }
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
    try {
      const T = this.topic;
      await this._closeTopic();
      this.state = 'hub';
      this.earth.setPlain(0);
      this.earth.setLook({ pins: true, fade: 1 });
      this._uprightSpin();
      if (this.book.current !== this.hubLeaf) this.book.turnTo(this.hubLeaf);
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
    // 角上那颗地球下面写着从哪里进来；指着它是“回到地球”
    const inLoc = this.state === 'topic' && !this.busy && this.topic?.kind !== 'globe';
    this.locTag.show(inLoc);
    if (inLoc) this.locTag.at(P.pos.clone().addScaledVector(new THREE.Vector3().setFromMatrixColumn(this.stage.camera.matrixWorld, 1), -P.r * 1.55));
    // 明信片：跟着指着的那面旗
    if (this.cardFor?.pn) { const w = this.earth.pinWorld(this.cardFor.pn), right = new THREE.Vector3().setFromMatrixColumn(this.stage.camera.matrixWorld, 0); this.card.at(w.addScaledVector(right, (this.cardFor.pn.side ?? 1) < 0 ? -HUB_R * 0.62 : HUB_R * 0.62)); }
    // 接着看：只在接得上的时候出现（比如板块切到了喜马拉雅）
    const A = this.live.active;
    if (A && !A.closing && A.inst) for (const b of this.panel.el?.querySelectorAll('.p-link[data-when]') || []) b.hidden = (A.inst.where ? A.inst.where() : b.dataset.when) !== b.dataset.when;
  }
}
