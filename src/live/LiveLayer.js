import * as THREE from 'three';
import * as ink from './ink.js';
import { tag, tagFocus } from '../ui/tags.js';
import { WorldNotebook } from './WorldNotebook.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

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
    const def = (await this.content.lessons[spot.lesson].load()).default;

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
    const ctx = {
      THREE, ink, root: scaler, world, mode: world ? MODE : 'panel',
      tag: (text, cls, onClick) => { const t = tag(text, cls, onClick); tags.push(t); return t; },
      ui: null,
      // 让实验临时换个机位（例如“从光屏一侧透过透镜看”），back() 回到原来的机位
      look: (localTarget, localDir, dist, onExit) => {
        this._lookExit = onExit || null;
        const tgt = scaler.localToWorld(new THREE.Vector3(...localTarget));
        const q = new THREE.Quaternion(); scaler.getWorldQuaternion(q);
        this._prevShot ||= { target: stage.rig.target.clone(), dir: stage.rig.dir.clone(), dist: stage.rig.dist };
        stage.shot({ target: tgt, dir: new THREE.Vector3(...localDir).applyQuaternion(q), dist: dist * this.active.s * lookFit(stage), minEl: Math.abs(localDir[1]) < 0.05 ? 0 : 0.17 });     // 方向几乎水平：就是要平视（读量筒、温度计）
        tagFocus(tgt, dist * this.active.s * 0.35);
      },
      // 实验换了一套器材（场景）以后，按新器材重新取景
      reframe: () => requestAnimationFrame(() => this._reframe?.()),
      back: () => { this._lookExit = null; tagFocus(null); if (this._prevShot) { stage.shot(this._prevShot); this._prevShot = null; } },
    };
    const inst = def.create(ctx);
    scaler.add(inst.group);

    // 放在这一页中间，按页面大小缩放（书即学案模式：留在原图的位置，页面下半部分要留给表格）
    const size = inst.size;   // { w, d, h }（实验自己的单位，米）
    const inPage = world && MODE === 'page';
    const pageCenter = inPage
      ? book.pageToWorld(spot.page, book.PW / 2, (y0 + y1) / 2 + 20, 0.004)
      : new THREE.Vector3(side === 'left' ? -book.W / 2 : book.W / 2, book.topHeight(side) + 0.004, 0.02);
    const s = inPage
      ? Math.min((book.W * 0.94) / size.w, (book.H * 0.34) / size.d)
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
    stage.shot({ target: look, dir, dist });

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
      const onStep = (i) => { const on = i === 0; document.body.classList.toggle('predicting', on); this.active?.inst.predicting?.(on); inst.predicting?.(on); };
      api = this.panel.open(def, { pageLabel: `课本第 ${pageNum} 页`, book: { base: this.content.base, PW: book.PW }, onStep, onClose: () => this.close(), foldable: MODE === 'float' || stand,
        onFold: (folded) => { if (!stand) stage.cameraOffsetX = folded || innerWidth <= 760 ? 0 : Math.min(380, innerWidth * 0.4) / 2 + 8; } });
    }
    ctx.ui = api;
    if (world) inst.mountWorld?.(api); else { inst.mount?.(api); this.panel.arrange?.(); }

    this.hotspots.enabled = false;
    document.body.classList.add('lesson-on');
    document.body.classList.toggle('stand-ui', !!board);
    this.active = { spot, def, inst, root, scaler, card, hole, crop, tags, nb, board, t: 0, from: figCenter, to: pageCenter, s, closing: false };
    this.opening = false;
    // 实验搭好以后，按器材实际占的范围重新取景（实验里写的 size 只是估计，常常不准：器材出画或者太小）
    this._reframe = null;
    if (!world && !stand && v.auto !== false) {
      const A = this.active;
      this._reframe = () => { if (this.active === A && !A.closing) { this._prevShot = null; this._lookExit = null; tagFocus(null); this._autoFrame(A, dir, v); } };
      requestAnimationFrame(() => requestAnimationFrame(() => this._reframe?.()));
    }
    this.onChange?.(true);
  }

  /** 让实验器材（不含标签）刚好完整地落在画面的可用区域里：按针孔相机严格计算所需距离 */
  _autoFrame(A, dir, v) {
    const stage = this.stage, box = new THREE.Box3(), tmp = new THREE.Box3(), m = new THREE.Matrix4();
    A.scaler.updateMatrixWorld(true);
    const inv = A.scaler.matrixWorld.clone().invert();
    A.inst.group.traverseVisible((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.material?.visible === false || o.userData.pick || o.userData.noFrame) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      if (!o.geometry.boundingBox || o.geometry.boundingBox.isEmpty()) return;
      tmp.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
      box.union(tmp);
    });
    if (box.isEmpty()) return;
    const s = A.s, to = A.to;
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s).add(to);
    const d = dir.clone().normalize(), right = new THREE.Vector3(0, 1, 0).cross(d).normalize(), up = d.clone().cross(right).normalize();
    const vfov = THREE.MathUtils.degToRad(stage.camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * stage.camera.aspect);
    const uW = 1 - Math.abs(stage.cameraOffsetX * 2) / Math.max(1, innerWidth), uH = 1 - Math.abs(stage.cameraOffsetY * 2) / Math.max(1, innerHeight);
    const tH = Math.tan((hfov * uW) / 2), tV = Math.tan((vfov * uH) / 2);
    const margin = v.frameMargin ?? 1.1;
    let D = 0;
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).multiplyScalar(s).add(to).sub(center);
      const depth = c.dot(d);
      D = Math.max(D, depth + (Math.abs(c.dot(right)) * margin) / tH, depth + (Math.abs(c.dot(up)) * margin) / tV);
    }
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

  close() {
    const A = this.active;
    if (!A || A.closing) return;
    A.closing = true; tagFocus(null);
    A.t = Math.min(A.t, 1.5);
    this.panel.close();
    A.nb?.dispose(); A.nb = null;
    if (A.board) { A.board.closing = true; }
    document.body.classList.remove('world-ui', 'stand-ui', 'predicting');
    this._prevShot = null;
    this._lookExit = null;     // 旧实验的“回到原机位”回调不能留给下一个实验
    this.stage.cameraOffsetX = 0;
    this.stage.cameraOffsetY = 0;
    if (this.bookShot) this.stage.shot(this.bookShot);
    document.body.classList.remove('lesson-on');
  }

  _finishClose() {
    const A = this.active;
    if (A.board) {
      this.stage.cssScene.remove(A.board.obj);
      A.board.el.remove();
      for (const m of [A.board.backing, A.board.foot]) { this.stage.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      this.panel.setHost(null);
    }
    A.inst.dispose?.();
    document.getElementById('c').style.cursor = '';
    for (const t of A.tags) t.remove();
    ink.disposeTree(A.root);
    this.stage.scene.remove(A.root, A.card, A.hole);
    A.card.geometry.dispose(); A.card.material.dispose(); A.crop.dispose();
    A.hole.geometry.dispose(); A.hole.material.map.dispose(); A.hole.material.dispose();
    this.active = null;
    this.hotspots.enabled = true;
    this.onChange?.(false);
  }

  update(dt, time) {
    const A = this.active;
    if (!A) return;
    A.t += A.closing ? -dt * 1.4 : dt;
    const t = A.t;

    // 原图：先揭起来，再淡出
    const lift = easeOut(clamp01(t / 0.5));
    const fade = clamp01((t - 0.35) / 0.4);
    A.card.position.y = A.from.y + lift * 0.14;
    A.card.rotation.x = -Math.PI / 2 + lift * 0.35;
    A.card.material.opacity = 1 - fade;
    A.card.scale.setScalar(1 + lift * 0.06 - fade * 0.3);
    A.card.visible = fade < 1;
    A.hole.material.opacity = clamp01(t / 0.3);

    // 立体图：从原图的位置弹出来，移到页面中间
    const pop = clamp01((t - 0.4) / 0.9);
    const move = easeOut(clamp01((t - 0.3) / 0.9));
    A.root.position.lerpVectors(A.from, A.to, move);
    const sy = Math.max(0.001, backOut(pop));
    A.root.scale.set(0.45 + 0.55 * easeOut(pop), sy, 0.45 + 0.55 * easeOut(pop));
    A.root.visible = pop > 0;
    for (const tg of A.tags) tg.el.style.visibility = pop > 0.85 && !A.closing ? '' : 'hidden';

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
    const A = this.active;
    if (A && !A.closing && A.nb && A.nb.pointerDown(this._ray(ndc))) return true;
    if (!A || A.closing) return false;
    // 特殊机位下：点到器材照常操作（比如凑近看标尺时拖游码），点空白处才回到原来的机位
    if (A.inst.pointer?.down && A.inst.pointer.down(this._ray(ndc), e)) return true;
    if (this._lookExit) { const f = this._lookExit; this._lookExit = null; f(); return true; }
    return false;
  }

  pointerMove(ndc, e) {
    const A = this.active;
    if (!A || A.closing || !A.inst.pointer?.move) return false;
    return !!A.inst.pointer.move(this._ray(ndc), e);
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
