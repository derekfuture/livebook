import { lessonCommunity } from '../ui/community.js';
import { rememberRuntimeError } from '../ui/runtimeErrors.js';
import * as THREE from 'three';
import * as ink from './ink.js';
import { tag, tagFocus } from '../ui/tags.js';
import { WorldNotebook } from './WorldNotebook.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { show, setShow, applyShow } from '../ui/prefs.js';

// 实验界面怎么摆：panel（左侧面板）| page（书即学案）| desk（桌上实验本）| card（极简卡片）
// 实验面板摆在哪：float（默认：左侧悬浮的纸卡）| stand（立在书上）| panel（旧的网页面板）| page / desk / card（试验过的世界内记录）
export const UI_MODE = new URLSearchParams(location.search).get('ui') || 'float';
const BOARD_PX = 400;          // 立板的网页宽度（像素）

// 让书上的一张图“站起来”：
//   1. 把原图从页面上揭下来（用页面贴图裁出那一块），原处留下一块白纸和阴影；
//   2. 揭下来的图飞起、淡出，同一位置“啪”地弹出立体实验（像立体书那样从扁平展开）；
//   3. 相机推近，左边出面板。合上时倒着播放。

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const backOut = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const PIN_T = 1.15;          // 活页从地球上那一点长出来、落到书上要多久（秒）
const RISE_T = 0.95;          // 从切出来的那块地形的位置长高要多久（秒）

function holeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fcfbf7'; g.fillRect(0, 0, 128, 128);
  // 内阴影：揭走的地方边缘略暗
  for (let i = 0; i < 10; i++) {
    g.strokeStyle = `rgba(90, 70, 40, ${0.05 - i * 0.004})`;
    g.lineWidth = 2;
    g.strokeRect(i * 1.5, i * 1.5, 128 - i * 3, 128 - i * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class LiveLayer {
  constructor({ stage, book, textures, hotspots, panel, content, onChange }) {
    Object.assign(this, { stage, book, textures, hotspots, panel, content, onChange });
    this.active = null;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.01 };
    stage.updaters.add((dt, t) => this.update(dt, t));
  }

  get isOpen() { return !!this.active; }

  async open(spot) {
    if (this.active || this.opening) return;
    this.opening = true;
    const { book, stage, textures } = this;
    const side = book.sideOf(spot.page);
    // spot.def：已经加载好的活页（地球目录这种不在课本某张图上的）。活页的代码拿不到（网站更新后开着的旧页面、断网）：
    // 不能一直卡在“正在打开”，不然哪张都打不开了；main.js 的 vite:preloadError 会自动刷新一次
    this.loadingId = spot.lesson; this.openError = null;
    let def;
    try { def = spot.def || (await this.content.lessons[spot.lesson].load()).default; }
    catch (err) { this.opening = false; this.openError = err; throw err; }
    finally { this.loadingId = null; }

    const [x0, y0, x1, y1] = spot.bbox;
    const a = book.pageToWorld(spot.page, x0, y0, 0.002), b = book.pageToWorld(spot.page, x1, y1, 0.002);
    const fw = Math.abs(b.x - a.x), fd = Math.abs(b.z - a.z);
    const figCenter = a.clone().add(b).multiplyScalar(0.5);

    // 揭下来的原图
    const src = textures.hiRes(spot.page) || textures.get(spot.page);
    const crop = src.clone();
    crop.repeat.set((x1 - x0) / book.PW, (y1 - y0) / book.PH);
    crop.offset.set(x0 / book.PW, 1 - y1 / book.PH);
    crop.needsUpdate = true;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshBasicMaterial({ map: crop, transparent: true }));
    card.rotation.x = -Math.PI / 2;
    card.position.copy(figCenter);
    card.renderOrder = 3;
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshLambertMaterial({ map: holeTexture(), transparent: true, opacity: 0 }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.copy(figCenter).y -= 0.0005;
    hole.receiveShadow = true;
    hole.renderOrder = 2;
    const WD = spot.world || null;          // 地理的地球主探索：活页从地球上的一点长出来（pin）、整颗地球落下去换成活页里的（globe）、照旧从图里升起来（figure）
    if (spot.noFigure || (WD && WD.mode !== 'figure')) card.visible = hole.visible = false;          // 不从某张图上揭下来：书页上不留白块
    stage.scene.add(card, hole);

    // 立体实验
    const root = new THREE.Group();
    const scaler = new THREE.Group();
    root.add(scaler);
    stage.scene.add(root);
    const tags = [];
    // 世界内记录（page/desk/card）只在实验支持时才用；立板模式对所有实验都有效（手机上退回屏幕面板）
    const MODE = UI_MODE;
    const world = !!def.world && ['page', 'desk', 'card'].includes(MODE);
    const stand = MODE === 'stand' && innerWidth > 760;
    let frameDir = null;          // 实验自己指定的取景方向（世界坐标）；没指定就用 view 里的 elev / azim
    const ctx = {
      THREE, ink, camera: stage.camera, root: scaler, world, mode: world ? MODE : 'panel', spot,
      tag: (text, cls, onClick) => { const t = tag(text, cls, onClick); tags.push(t); return t; },
      prewarm: () => this._prewarm(),          // 活页里后加载的模型、材质好了以后调：在后台把它们的着色器先编好
      ui: null,
      // 让实验临时换个机位（例如“从光屏一侧透过透镜看”），back() 回到原来的机位
      look: (localTarget, localDir, dist, onExit, opts = {}) => {
        this._lookExit = onExit || null;
        stage.zoomMin = opts.minZoom ?? null;          // opts.minZoom：这一处最多拉近到多少倍
        const tgt = scaler.localToWorld(new THREE.Vector3(...localTarget));
        const q = new THREE.Quaternion(); scaler.getWorldQuaternion(q);
        this._prevShot ||= {
          target: stage.rig.target.clone(), dir: stage.rig.dir.clone(), dist: stage.rig.dist, minEl: stage.rig.minEl,
          yaw: stage.user.yaw, pitch: stage.user.pitch, zoom: stage.user.zoom, pan: stage.user.pan.clone(),
        };
        stage.shot({ target: tgt, dir: new THREE.Vector3(...localDir).applyQuaternion(q), dist: dist * this.active.s * lookFit(stage), minEl: opts.minEl ?? (Math.abs(localDir[1]) < 0.05 ? 0 : 0.17) });     // 方向几乎水平：就是要平视（读量筒、温度计）          // opts.minEl：允许相机低于目标（站在地上抬头看）
        tagFocus(tgt, dist * this.active.s * 0.35);
      },
      // 实验换了一套器材（场景）以后，按新器材重新取景
      reframe: () => requestAnimationFrame(() => this._reframe?.()),          // 地球主探索的“就地”模式：交给 World 取景（spot.world.reframe）
      // 换一个取景方向（实验的局部坐标，从模型指向镜头），按新方向把器材完整框进画面，镜头平滑地转过去
      aim: (localDir) => { const q = new THREE.Quaternion(); scaler.getWorldQuaternion(q); frameDir = new THREE.Vector3(...localDir).normalize().applyQuaternion(q); requestAnimationFrame(() => this._reframe?.()); },
      back: () => this._back(),
    };
    ink.setLessonStyle(def.style);          // 实验自己的画风（例如 'paper'），只在搭这个实验的时候生效
    const inst = def.create(ctx);
    scaler.add(inst.group);

    // 放在这一页中间，按页面大小缩放（书即学案模式：留在原图的位置，页面下半部分要留给表格）
    const size = inst.size;   // { w, d, h }（实验自己的单位，米）
    const inPage = world && MODE === 'page';
    const spread = !inPage && inst.place === 'spread';          // 放在两页正中间、按整个对开页放大（地理：模型是主角，书还在）
    const pageCenter = inPage
      ? book.pageToWorld(spot.page, book.PW / 2, (y0 + y1) / 2 + 20, 0.004)
      : spread ? new THREE.Vector3(0, Math.max(book.topHeight('left'), book.topHeight('right')) + 0.004, 0.02)
      : new THREE.Vector3(side === 'left' ? -book.W / 2 : book.W / 2, book.topHeight(side) + 0.004, 0.02);
    const s = inPage
      ? Math.min((book.W * 0.94) / size.w, (book.H * 0.34) / size.d)
      : spread ? Math.min((book.W * 1.7) / size.w, (book.H * 0.8) / size.d) * (inst.scale || 1)
      : Math.min((book.W * 0.96) / size.w, (book.H * 0.62) / size.d) * (inst.scale || 1);
    scaler.scale.setScalar(s);
    root.position.copy(figCenter);
    if (inst.card !== false) inst.group.add(ink.labBase(size.w * 1.06, size.d * 1.12, 0.012 / s));   // 实验台板（厚度约为书本单位里的 1.2 cm）

    // 镜头：从实验的视角看
    const v = (world && inst.worldView?.[MODE]) || inst.view || {};
    const elev = THREE.MathUtils.degToRad(v.elev ?? 32), azim = THREE.MathUtils.degToRad(v.azim ?? 0);
    const dir = new THREE.Vector3(Math.sin(azim) * Math.cos(elev), Math.sin(elev), Math.cos(azim) * Math.cos(elev));
    const wide = innerWidth > 760;
    stage.cameraOffsetX = world || stand ? 0 : wide ? Math.min(380, innerWidth * 0.4) / 2 + 8 : 0;
    stage.cameraOffsetY = world || stand ? 0 : wide ? 0 : innerHeight * 0.26;   // 手机：面板占下半屏，画面放到上半屏
    let look = pageCenter.clone().add(new THREE.Vector3(0, (size.h * s) * (v.lookY ?? 0.42), (v.lookZ ?? 0) * s));
    let dist = stage.fitDistance(size.w * s, Math.max(size.h * s, size.d * s * 0.6), v.margin ?? 1.2);
    let board = null;
    if (stand) {
      // 立板：立在对页上，朝着镜头；镜头往对页那边挪一点，让实验和立板都在画面里
      const other = side === 'right' ? -1 : 1;
      const el = document.createElement('section');
      el.className = 'board';
      const obj = new CSS3DObject(el);
      const H = book.H * 0.46, k = (H / 1.42) / BOARD_PX;        // 立板：不到半页高，高约为宽的 1.42 倍
      const LEAN = 0.36;                                            // 像画架一样往后斜靠
      obj.scale.setScalar(k);
      const base = new THREE.Vector3(other * book.W * 0.45, book.topHeight(other > 0 ? 'right' : 'left'), 0.2);
      obj.position.copy(base).add(new THREE.Vector3(0, H / 2 + 0.01, 0));
      stage.cssScene.add(obj);
      // WebGL 里的“纸板”：给立板一个厚度和投影，像真的立在书上
      const backing = new THREE.Mesh(new THREE.BoxGeometry(BOARD_PX * k * 1.02, H * 1.0, 0.012), new THREE.MeshLambertMaterial({ color: 0xf3ead6 }));
      backing.position.copy(obj.position).add(new THREE.Vector3(0, 0, -0.008));
      backing.castShadow = true;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(BOARD_PX * k * 0.5, 0.012, 0.22), new THREE.MeshLambertMaterial({ color: 0xd9c9a6 }));
      foot.position.copy(base).add(new THREE.Vector3(0, 0.006, -0.03));
      foot.castShadow = foot.receiveShadow = true;
      stage.scene.add(backing, foot);
      board = { el, obj, backing, foot, base, H, k, lean: LEAN, yaw: 0, t: 0 };
      el.style.height = `${(H / k) | 0}px`;
      this.panel.setHost(el);
      // 像真纸片一样：抓住上沿往下拉，卡片就躺倒在书页上；点一下躺着的卡片，它又立起来
      const STAND = LEAN, LIE = 1.5;
      board.leanTarget = STAND;
      let grab = null;
      el.addEventListener('pointerdown', (e) => {
        const lying = board.leanTarget > 1;
        if (!lying && !e.target.closest('.p-head')) return;
        if (e.target.closest('button') && !lying) return;
        grab = { y: e.clientY, l0: board.lean, moved: false };
        el.setPointerCapture(e.pointerId);
        e.preventDefault(); e.stopPropagation();
      });
      el.addEventListener('pointermove', (e) => {
        if (!grab) return;
        const dy = e.clientY - grab.y;
        if (Math.abs(dy) > 4) grab.moved = true;
        board.lean = board.leanTarget = Math.max(STAND - 0.15, Math.min(LIE, grab.l0 + dy * 0.006));
      });
      const drop = () => {
        if (!grab) return;
        const mid = (STAND + LIE) / 2;
        board.leanTarget = grab.moved ? (board.lean > mid ? LIE : STAND) : (grab.l0 > 1 ? STAND : board.leanTarget);
        board.vel = 0;
        grab = null;
      };
      el.addEventListener('pointerup', drop);
      el.addEventListener('pointercancel', drop);
      el.addEventListener('click', (e) => { if (board.leanTarget > 1) { e.stopPropagation(); e.preventDefault(); } }, true);

      // 镜头：同时看到实验和立板
      // 镜头：从正前方略高处看，实验和立板都在画面里
      const x0 = Math.min(obj.position.x - (BOARD_PX * k) / 2, pageCenter.x - (size.w * s) / 2), x1 = Math.max(obj.position.x + (BOARD_PX * k) / 2, pageCenter.x + (size.w * s) / 2);
      const tall = Math.max(H * 0.9, size.h * s);
      look = new THREE.Vector3((x0 + x1) / 2, tall * 0.42, 0.08);
      dist = stage.fitDistance((x1 - x0) * 1.04, tall * 1.2, 1.2);
      dir.set(0, Math.sin(0.32), Math.cos(0.32));
    }
    if (inPage) {                 // 整个跨页都要看得到
      look = new THREE.Vector3(side === 'right' ? book.W * 0.1 : -book.W * 0.1, 0.1, 0.08);
      dist = stage.fitDistance(book.W * 2.0, book.H * 0.92, v.margin ?? 1.0);
    } else if (world && MODE === 'desk') {
      look = new THREE.Vector3(book.W * 0.55, 0.08, book.H * 0.22);
      dist = stage.fitDistance(book.W * 1.6, book.H * 1.25, v.margin ?? 1.0);
    }
    this.bookShot = { target: stage.rig.target.clone(), dir: stage.rig.dir.clone(), dist: stage.rig.dist };
    const holdShot = WD?.mode === 'globe';          // 整颗地球落下去：镜头等地球落好（release）再转到活页的取景
    if (!holdShot) stage.shot({ target: look, dir, dist });
    this._pendingShot = holdShot ? { target: look, dir, dist } : null;

    const pageNum = spot.page - book.manifest.pageOffset;
    let api, nb = null;
    if (world) {
      nb = new WorldNotebook({ mode: MODE, def, book, textures, stage, spot, root, onClose: () => this.close() });
      api = nb.api;
      document.body.classList.add('world-ui');
    } else {
      this.panel.home.classList.toggle('board', MODE === 'float');
      this.panel.home.classList.remove('folded');
      // 预测阶段：隐藏标签和会泄露答案的现象（实验自己实现 predicting(on)）
      const onStep = (i) => { const on = i === 0 && !this.panel.explore; document.body.classList.toggle('predicting', on); this.active?.inst.predicting?.(on); inst.predicting?.(on); };
      api = this.panel.open(def, { pageLabel: `课本第 ${pageNum} 页`, book: { base: this.content.base, PW: book.PW, real: this.textures.source.kind !== 'placeholder', pageUrl: (pg) => this.textures.source.url('hi', pg) }, onStep, onClose: () => (WD?.onClose ? WD.onClose() : this.close()), closeText: WD?.closeText, crumb: WD?.crumb, links: WD?.links, figText: WD?.figText, foldable: MODE === 'float' || stand,
        onFold: (folded) => { if (!stand) stage.cameraOffsetX = folded || innerWidth <= 760 ? 0 : Math.min(380, innerWidth * 0.4) / 2 + 8; } });
    }
    ctx.ui = api;
    if (world) inst.mountWorld?.(api); else { inst.mount?.(api); this.panel.arrange?.(); }
    // 实验声明了 toggles（例如 ['cards', 'steps']）：右下角视角按钮上面加两个显示开关；没声明的实验（物理）什么都不加
    const toggles = [];
    if (inst.toggles?.length) {
      const ctl = document.getElementById('viewctl');
      // 图标：观察卡片 = 一张带小尖角的标注卡；步骤栏 = 一张步骤清单（第一步打了勾）。关掉时加一道斜线
      const svg = (body) => `<svg viewBox="0 0 22 22" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}<path class="slash" d="M4 18L18 4"/></svg>`;
      const ICON = {
        cards: svg('<path d="M5 4.5h12a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H10l-3.2 3v-3H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><path d="M6.5 8.3h9M6.5 11.3h5.5"/>'),
        steps: svg('<path d="M3 5.8l1.6 1.6L7.4 4.4"/><circle cx="5" cy="11.2" r="1.5" fill="currentColor"/><circle cx="5" cy="16.6" r="1.5"/><path d="M10 5.9h9M10 11.2h9M10 16.6h6"/>'),      // 步骤清单：做完的打勾
      };
      const NAME = { cards: '观察卡片', steps: '底部步骤栏' };
      for (const k of inst.toggles) {
        const label = NAME[k];
        const b = document.createElement('button');
        b.className = 'show-tg'; b.innerHTML = ICON[k];
        const sync = () => { b.classList.toggle('off', !show[k]); b.dataset.tip = `${label} · ${show[k] ? '显示中' : '已隐藏'}`; b.setAttribute('aria-label', `${label}：${show[k] ? '显示中，点一下隐藏' : '已隐藏，点一下显示'}`); };
        b.onclick = (e) => { e.stopPropagation(); setShow(k, !show[k]); sync(); };
        sync(); toggles.push(b);
      }
      ctl?.prepend(...toggles);
      applyShow(true);
    }

    this.hotspots.enabled = false;
    document.body.classList.add('lesson-on'); document.getElementById('c').dataset.tip = '';
    const community = lessonCommunity({capture:()=>this.stage.snapshot(Math.min(innerWidth,1280),Math.round(Math.min(innerWidth,1280)*innerHeight/innerWidth)), lesson:spot.lesson, title:def.title, where: `${this.content.full || this.content.title || ''} · 第 ${pageNum} 页 · ${def.fig || ''}`});
    document.getElementById('viewctl')?.append(community);
    toggles.push(community);
    document.body.classList.toggle('stand-ui', !!board);
    ink.setLessonStyle(null);
    this.active = { spot, def, inst, root, scaler, card, hole, crop, tags, nb, board, toggles, t: 0, from: figCenter, to: pageCenter, s, closing: false, world: WD, hold: WD?.mode === 'globe' };
    if (WD?.mode === 'pin' || WD?.mode === 'globe') { root.position.copy(WD.mode === 'pin' && WD.from ? WD.from() : pageCenter); root.visible = false; }
    this.opening = false;
    this._prewarm();
    // 实验搭好以后，按器材实际占的范围重新取景（实验里写的 size 只是估计，常常不准：器材出画或者太小）
    this._reframe = null;
    if (WD?.inplace && WD.reframe) {          // 就地（板块：地球就是书后上方那颗）：镜头由 World 安排
      const A = this.active;
      this._reframe = () => { if (this.active === A && !A.closing && !A.hold) { this._prevShot = null; this._lookExit = null; tagFocus(null); WD.reframe(A); } };
    } else if (!world && !stand && v.auto !== false) {
      const A = this.active;
      this._reframe = () => { if (this.active === A && !A.closing && !A.hold) { this._prevShot = null; this._lookExit = null; tagFocus(null); this._autoFrame(A, frameDir || dir, v); } };
      requestAnimationFrame(() => requestAnimationFrame(() => this._reframe?.()));
    }
    this.onChange?.(true);
  }

  /** 让实验器材（不含标签）刚好完整地落在画面的可用区域里：按针孔相机严格计算所需距离 */
  _autoFrame(A, dir, v) {
    const stage = this.stage, m = new THREE.Matrix4(), vtx = new THREE.Vector3(), pts = [];
    A.scaler.updateMatrixWorld(true);
    const inv = A.scaler.matrixWorld.clone().invert();
    A.inst.group.traverseVisible((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.material?.visible === false || o.userData.pick || o.userData.noFrame) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      if (!o.geometry.boundingBox || o.geometry.boundingBox.isEmpty()) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      const pos = o.geometry.attributes.position, bb = o.geometry.boundingBox;
      if (pos && pos.count <= 60000 && !o.geometry.isInstancedBufferGeometry) { const step = Math.max(1, Math.floor(pos.count / 3000)); for (let i = 0; i < pos.count; i += step) pts.push(vtx.fromBufferAttribute(pos, i).applyMatrix4(m).clone()); return; }          // 用真实的顶点取景：圆盘、转过的地球仪不会因为包围盒的角而被框得太小（粗线 Line2 的顶点只是模板，仍用包围盒）
      for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(m));
    });
    if (!pts.length) return;
    const s = A.s, to = A.to;
    const d = dir.clone().normalize(), right = new THREE.Vector3(0, 1, 0).cross(d).normalize(), up = d.clone().cross(right).normalize();
    const W = pts.map((p) => p.multiplyScalar(s).add(to));
    let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity, f0 = Infinity, f1 = -Infinity;
    for (const p of W) { const a = p.dot(right), b = p.dot(up), c = p.dot(d); r0 = Math.min(r0, a); r1 = Math.max(r1, a); u0 = Math.min(u0, b); u1 = Math.max(u1, b); f0 = Math.min(f0, c); f1 = Math.max(f1, c); }
    const center = right.clone().multiplyScalar((r0 + r1) / 2).add(up.clone().multiplyScalar((u0 + u1) / 2)).add(d.clone().multiplyScalar((f0 + f1) / 2));          // 画面上居中：按投影后的左右、上下范围取中点
    const vfov = THREE.MathUtils.degToRad(stage.camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * stage.camera.aspect);
    const uW = 1 - Math.abs(stage.cameraOffsetX * 2) / Math.max(1, innerWidth), uH = 1 - Math.abs(stage.cameraOffsetY * 2) / Math.max(1, innerHeight);
    const tH = Math.tan((hfov * uW) / 2), tV = Math.tan((vfov * uH) / 2);
    const margin = (v.frameMargin ?? 1.1) * 1.06;          // 真实顶点取景比包围盒紧，留一点给模型上方的字
    let D = 0;
    for (const p of W) { const c = p.clone().sub(center), depth = c.dot(d); D = Math.max(D, depth + (Math.abs(c.dot(right)) * margin) / tH, depth + (Math.abs(c.dot(up)) * margin) / tV); }
    stage.shot({ target: center, dir: d, dist: D });
  }

  reframe() {
    if (!this.active || this._prevShot || !this._reframe) return;
    // 面板的位置跟着屏幕宽窄变（宽屏在左侧，窄屏在下半屏）：先按现在的屏幕重算给面板让出的位置
    const wide = innerWidth > 760, folded = this.panel.el?.classList.contains('folded');
    this.stage.cameraOffsetX = wide && !folded ? Math.min(380, innerWidth * 0.4) / 2 + 8 : 0;
    this.stage.cameraOffsetY = wide ? 0 : innerHeight * 0.26;
    this._reframe();
  }

  close({ quick = false, world = null } = {}) {
    const A = this.active;
    if (!A || A.closing) return;
    A.closing = true; tagFocus(null);
    if (world) A.world = { ...(A.world || {}), ...world };          // 地球主探索：收回地球上那一点（pin）、换回地球（globe，一下子收掉）、沉回课本的图里（figure）
    const wm = A.world?.mode;
    A.t = wm === 'pin' ? Math.min(A.t, PIN_T) : wm === 'globe' ? 0.0001 : Math.min(A.t, quick ? 0.5 : 1.5);          // quick：马上要打开另一张活页，收得快一点
    this.panel.close();
    A.nb?.dispose(); A.nb = null;
    if (A.board) { A.board.closing = true; }
    document.body.classList.remove('world-ui', 'stand-ui', 'predicting');
    this._prevShot = null;
    this._lookExit = null;     // 旧实验的“回到原机位”回调不能留给下一个实验
    this.stage.cameraOffsetX = 0;
    this.stage.cameraOffsetY = 0;
    if (this.bookShot && !A.world) this.stage.shot(this.bookShot);          // 地球主探索：镜头由 World 接着安排
    document.body.classList.remove('lesson-on');
  }

  /** 活页正在收回书里（约一秒）时，要马上翻页：不等动画，直接收完 */
  finishClosing() { if (this.active?.closing) this._finishClose(); }

  /** 整颗地球落下去以后：活页里的那颗地球（连同活页的其他东西）现出来 */
  release() {
    const A = this.active; if (!A) return;
    A.hold = false;
    if (this._pendingShot && !A.world?.inplace) this.stage.shot(this._pendingShot);
    this._pendingShot = null;
    requestAnimationFrame(() => this._reframe?.());
  }
  /** 地球主探索：按给定方向把活页里看得见的东西框进画面（World 用） */
  frame(A, dir, v = {}) { this._autoFrame(A, dir, v); }

  _finishClose() {
    const A = this.active;
    // 每一步单独接住：哪一步出错（例如某张活页自己的 dispose），后面照样收拾干净，最后一定回到“没开着活页”——不然书就再也翻不动了
    const safe = (fn) => { try { fn(); } catch (err) { rememberRuntimeError(err, `close ${A.spot?.lesson || ''}`); } };
    if (A.board) safe(() => {
      this.stage.cssScene.remove(A.board.obj);
      A.board.el.remove();
      for (const m of [A.board.backing, A.board.foot]) { this.stage.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      this.panel.setHost(null);
    });
    safe(() => A.inst.dispose?.());
    safe(() => { for (const b of A.toggles || []) b.remove(); applyShow(false); });
    safe(() => { document.getElementById('c').style.cursor = ''; document.getElementById('c').dataset.tip = ''; this._hoverTip(null); });
    safe(() => { for (const t of A.tags) t.remove(); });
    safe(() => this.stage.scene.remove(A.root, A.card, A.hole));
    safe(() => ink.disposeTree(A.root));
    safe(() => { A.card.geometry.dispose(); A.card.material.dispose(); A.crop.dispose(); A.hole.geometry.dispose(); A.hole.material.map.dispose(); A.hole.material.dispose(); });
    this.active = null;
    this.hotspots.enabled = true;
    this.onChange?.(false);
  }

  update(dt, time) {
    const A = this.active;
    if (!A) return;
    A.t += A.closing ? -dt * 1.4 : dt;
    const t = A.t;

    const wm = A.world?.mode;
    A.liftCur = (A.liftCur || 0) + ((A.lift || 0) - (A.liftCur || 0)) * Math.min(1, dt * 7);          // 书翻页时活页稍微抬起来让纸滑过去（World 设 A.lift）
    if (wm === 'pin' || wm === 'globe') {
      A.card.visible = false; A.hole.visible = false;
      if (wm === 'pin' && A.world.rise && !A.closing) {
        // 从切出来的那块地形的位置长高（地理世界俯冲进来）：宽窄和它一样，从扁的立起来（和别的活页从课本的图里立起来一样），它同时压扁、淡掉
        const k = clamp01(t / RISE_T), g = easeOut(k), from = (A.riseFrom ||= (A.world.from?.() || A.from).clone());          // 起点在开始长的那一刻记下来（那块地形淡掉以后 from 就换成角上那颗地球的旗了，收起时用）
        if (A.s0 == null) { A.root.scale.setScalar(1); A.root.updateMatrixWorld(true); const sz = new THREE.Box3().setFromObject(A.root).getSize(new THREE.Vector3()); A.s0 = Math.min(1.25, Math.max(0.7, (A.world.fromWidth || sz.x) / Math.max(0.05, sz.x))); }
        A.root.position.lerpVectors(from, A.to, g); A.root.position.y += A.liftCur;
        const sx = A.s0 + (1 - A.s0) * g; A.root.scale.set(sx, sx * Math.max(0.002, backOut(clamp01((t - 0.06) / (RISE_T - 0.06)))), sx);
        A.world.onGrow?.(k);
        A.root.visible = true;
        for (const tg of A.tags) { const o = clamp01((k - 0.8) / 0.2); tg.el.style.visibility = o > 0 ? '' : 'hidden'; tg.el.style.opacity = o; }
      } else if (wm === 'pin') {
        // 从地球上那一点长出来：一边长大，一边沿一道弧线落到书页正中（收起时倒着走，回到角上那颗地球的旗里）
        const k = clamp01(t / PIN_T), e = easeInOut(k), from = A.world.from?.() || A.from;
        A.root.position.lerpVectors(from, A.to, e).y += Math.sin(Math.PI * e) * 0.18 * (1 - e * 0.5) + A.liftCur;
        const s0 = 0.015; A.root.scale.setScalar(s0 + (1 - s0) * e);          // 和位置一起走：在角上时还小，越近越大
        if (!A.closing) A.world.onGrow?.(k);
        A.root.visible = true;
        for (const tg of A.tags) { const o = A.closing ? 0 : clamp01((k - 0.85) / 0.15); tg.el.style.visibility = o > 0 ? '' : 'hidden'; tg.el.style.opacity = o; }
      } else {
        A.root.position.copy(A.to); A.root.position.y += A.liftCur; A.root.scale.setScalar(1);
        A.root.visible = !A.hold && !A.closing;
        for (const tg of A.tags) tg.el.style.visibility = !A.hold && !A.closing ? '' : 'hidden';
      }
      if (!A.closing || t > 0.4) A.inst.update?.(dt, time);
      A.nb?.update(dt);
      if (A.closing && t <= 0) this._finishClose();
      return;
    }
    // 原图：先揭起来，再淡出（emerge: 'flat'：原图平放在书页上不动，模型从它上面长出来时慢慢淡掉，看起来就是这张图立了起来）
    const flat = A.inst.emerge === 'flat';
    const lift = flat ? 0 : easeOut(clamp01(t / 0.5));
    const fade = flat ? clamp01((t - 0.45) / 0.9) : clamp01((t - 0.35) / 0.4);
    A.card.position.y = A.from.y + lift * 0.14;
    A.card.rotation.x = -Math.PI / 2 + lift * 0.35;
    A.card.material.opacity = 1 - fade;
    A.card.scale.setScalar(1 + lift * 0.06 - fade * 0.3);
    A.card.visible = fade < 1 && !A.spot.noFigure;
    A.hole.material.opacity = clamp01(t / 0.3); A.hole.visible = !A.spot.noFigure;

    // 立体图：从原图的位置弹出来，移到页面中间
    const pop = clamp01((t - 0.4) / 0.9);
    const move = easeOut(clamp01((t - 0.3) / 0.9));
    A.root.position.lerpVectors(A.from, A.to, move); A.root.position.y += A.liftCur;
    const sy = Math.max(0.001, backOut(pop));
    A.root.scale.set(0.45 + 0.55 * easeOut(pop), sy, 0.45 + 0.55 * easeOut(pop));
    A.root.visible = pop > 0;
    if (flat) for (const tg of A.tags) { const o = A.closing ? 0 : clamp01((pop - 0.8) / 0.2); tg.el.style.visibility = o > 0 ? '' : 'hidden'; tg.el.style.opacity = o; }          // 牌子跟着模型长好，慢慢浮出来，不一下子全蹦出来
    else for (const tg of A.tags) tg.el.style.visibility = pop > 0.85 && !A.closing ? '' : 'hidden';

    if (!A.closing || t > 0.4) A.inst.update?.(dt, time);
    A.nb?.update(dt);
    // 立板：和实验一起从书上“立起来”，并慢慢转向镜头（绕竖直轴），保证看得清
    if (A.board) {
      const B = A.board, cam = this.stage.camera.position;
      // 只跟随明显的视角变化（忽略鼠标视差的轻微晃动），板子不会一直在飘
      const want = Math.max(-0.9, Math.min(0.9, Math.atan2(cam.x - B.obj.position.x, cam.z - B.obj.position.z)));
      if (B.target == null || Math.abs(want - B.target) > 0.12) B.target = want;
      B.yaw += (B.target - B.yaw) * Math.min(1, dt * 3);
      const up = Math.max(0.001, Math.min(1, (t - 0.25) / 0.6));
      let e = A.closing ? up : 1 - Math.pow(1 - up, 3);
      // 换了机位（例如透过透镜看）时，立板先放平让开
      B.down = Math.max(0, Math.min(1, (B.down || 0) + (this._prevShot ? dt : -dt) * 3));
      e *= 1 - B.down * 0.999;
      // 板子实际高度（收起时只剩标题那一条）
      const hNow = Math.max(0.04, B.el.offsetHeight * B.k);
      B.hCur = B.hCur == null ? hNow : B.hCur + (hNow - B.hCur) * Math.min(1, dt * 12);
      if (B.leanTarget != null) {
        B.vel = B.vel || 0;
        B.vel += ((B.leanTarget - B.lean) * 90 - B.vel * 14) * dt;
        B.lean += B.vel * dt;
        B.el.classList.toggle('lying', B.leanTarget > 1);
      }
      const tilt = -(1 - e) * Math.PI / 2 - B.lean * e;              // 立起来：从平躺（−90°）到斜靠（−lean）
      for (const o of [B.obj, B.backing]) o.rotation.set(tilt, B.yaw, 0, 'YXZ');
      // 以底边为轴：中心 = 底边 + 沿板面向上 H/2
      const upv = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), B.yaw);
      B.obj.position.copy(B.base).addScaledVector(upv, B.hCur / 2).add(new THREE.Vector3(0, 0.006, 0));
      const back = new THREE.Vector3(0, -Math.sin(tilt), Math.cos(tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), B.yaw);
      B.backing.position.copy(B.obj.position).addScaledVector(back, -0.008);
      B.backing.scale.y = Math.max(0.01, e) * (B.hCur / B.H);
      B.foot.visible = e > 0.6 && B.lean < 0.9;
      B.el.style.opacity = String(Math.min(1, e * 1.4));
    }
    if (A.closing && t <= 0) this._finishClose();
  }

  // ---- 指针交给实验处理 ----
  _ray(ndc) {
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    return this.raycaster;
  }

  pointerDown(ndc, e) {
    this._hoverTip(null);
    const A = this.active;
    if (A && !A.closing && A.nb && A.nb.pointerDown(this._ray(ndc))) return true;
    if (!A || A.closing) return false;
    if (A.inst.pointer?.down && A.inst.pointer.down(this._ray(ndc), e)) return true;
    return false;
  }

  /** 在后台把场景里所有材质的着色器编好（包括暂时看不见的东西）：它们第一次露面时不再卡一下 */
  _prewarm() {
    const st = this.stage, r = st.renderer;
    clearTimeout(this._warmT);
    this._warmT = setTimeout(async () => {
      try { await r.compileAsync?.(st.scene, st.camera); } catch { /* 编不了就算了：第一次露面时再编 */ }
      await new Promise((ok) => setTimeout(ok, 1600));          // 等打开活页的动画走完再画（不让它在飞进来的路上卡一下）
      await new Promise((ok) => (window.requestIdleCallback || setTimeout)(ok, { timeout: 1500 }));
      if (st.post || !this.active || this.active.closing) return;
      // 再把暂时看不见的东西都在画面左下角 1 个像素里真画一次：显卡第一次画某种材质（透明、实例……）时要准备的东西、贴图上传，都在这时做掉
      requestAnimationFrame(() => {          // 放进这一帧的渲染里、跟在整幅画面后面画：不在两帧之间单独画（那样这一帧只剩 1 个像素，别的地方是空的，录屏会截到一帧空白）
        if (st.post || !this.active || this.active.closing) return;
        const hidden = []; st.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
        try { r.setScissorTest(true); r.setScissor(0, 0, 1, 1); r.render(st.scene, st.camera); }
        catch { /* 画不了就算了 */ }
        finally { r.setScissorTest(false); for (const o of hidden) o.visible = false; }
      });
    }, 120);
  }

  _back() {
    this._lookExit = null;
    this.stage.zoomMin = null;
    tagFocus(null);
    const shot = this._prevShot;
    if (!shot) return;
    this.stage.shot(shot);
    const view = this.stage.user;
    view.yaw = shot.yaw; view.pitch = shot.pitch; view.zoom = shot.zoom;
    view.pan.copy(shot.pan);
    this._prevShot = null;
  }

  exitLook() {
    this.stage.zoomMin = null;
    if (!this._prevShot && !this._lookExit) return;
    const onExit = this._lookExit;
    this._back();
    onExit?.();
  }

  pointerMove(ndc, e) {
    const A = this.active;
    if (!A || A.closing || !A.inst.pointer?.move) { this._hoverTip(null); return false; }
    const r = !!A.inst.pointer.move(this._ray(ndc), e);
    if (A.def?.flow === 'explore') this._hoverTip(e);
    return r;
  }

  /** 高中活页：鼠标停在能动的东西上（活页把光标设成 grab / pointer），旁边浮出一张小纸条说怎么动——和别的活页（kit/interact 的 tip）同一种纸条。
   *  活页想写得具体一点，就在设光标时顺手设 canvas.dataset.tip（比如“拖着登山的人上山”） */
  _hoverTip(e) {
    const c = document.getElementById('c'), cur = c.style.cursor, on = !!e && (cur === 'grab' || cur === 'pointer');
    if (!this._tipEl) { this._tipEl = document.createElement('div'); this._tipEl.className = 'hover-tip'; document.body.appendChild(this._tipEl); }
    const el = this._tipEl;
    if (!on) { el.classList.remove('on'); return; }
    el.textContent = c.dataset.tip || (cur === 'grab' ? '按住拖动' : '点一下');
    el.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 20}px)`;
    el.classList.add('on');
  }

  pointerUp(ndc, e) {
    const A = this.active;
    if (!A || A.closing || !A.inst.pointer?.up) return false;
    return !!A.inst.pointer.up(this._ray(ndc), e);
  }
}

// 实验里的近看机位是按桌面（约 16:10、左侧有纸卡）定的距离。窄屏（手机竖屏、面板占下半屏）看得到的范围小得多，
// 按比例拉远，保证桌面上能同时看到的东西（比如小孔两边的烛焰和薄膜）在这里也都在画面里。
function lookFit(stage) {
  const v = THREE.MathUtils.degToRad(stage.camera.fov) / 2;
  const half = (aspect, usable) => Math.tan(Math.atan(Math.tan(v) * aspect) * usable);
  const refW = half(1.6, 0.85), refH = Math.tan(v);
  const curW = half(stage.camera.aspect, 1 - Math.abs(stage.cameraOffsetX * 2) / Math.max(1, innerWidth));
  const curH = Math.tan(v * (1 - Math.abs(stage.cameraOffsetY * 2) / Math.max(1, innerHeight)));
  return Math.max(1, refW / curW, refH / curH);
}
