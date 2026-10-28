import * as THREE from 'three';

// 一本平放在桌上的书。书脊沿 z 轴、位于 x = 0；右页向 +x 展开，左页向 -x。
// 每一“张”纸（leaf）正面是奇数页、背面是偶数页：
//   张 0：正面 = 封面（PDF 第 0 页），背面 = 封二（空白）
//   张 j：正面 = PDF 第 2j-1 页，背面 = PDF 第 2j 页
// 翻过 current 张之后，左页 = 第 current-1 张的背面，右页 = 第 current 张的正面。

const NX = 44;                    // 每张纸沿宽度方向的分段数（弯曲用）
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// 书页在书脊处被装订压下去的弧度：u = 离书脊的距离 / 页宽
const gutter = (u) => 1 - 0.78 * Math.pow(1 - smooth(0, 0.17, u), 2);

class Leaf {
  constructor(book) {
    this.book = book;
    const { W, H } = book;
    const nx = NX, nz = 1, count = (nx + 1) * (nz + 1);
    this.xs = new Float32Array(nx + 1);
    this.ys = new Float32Array(nx + 1);
    const pos = (this.pos = new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const nrm = (this.nrm = new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    pos.setUsage(THREE.DynamicDrawUsage); nrm.setUsage(THREE.DynamicDrawUsage);
    const uvF = new Float32Array(count * 2), uvB = new Float32Array(count * 2), index = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i, u = i / nx, w = j / nz;
      pos.setZ(k, -H / 2 + w * H);
      uvF[k * 2] = u; uvF[k * 2 + 1] = 1 - w;
      uvB[k * 2] = 1 - u; uvB[k * 2 + 1] = 1 - w;
      if (i < nx && j < nz) {
        const a = k, b = k + 1, c = k + nx + 1, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    const make = (uv) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', pos);
      g.setAttribute('normal', nrm);
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(index);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), W * 1.2);
      return g;
    };
    this.matF = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.matB = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.BackSide });
    this.matF.shadowSide = THREE.DoubleSide;
    this.front = new THREE.Mesh(make(uvF), this.matF);
    this.back = new THREE.Mesh(make(uvB), this.matB);
    this.front.castShadow = true;
    this.front.receiveShadow = this.back.receiveShadow = true;
    this.front.frustumCulled = this.back.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.front, this.back);
    book.group.add(this.group);
    this.pages = [undefined, undefined];
  }

  setPages(frontIdx, backIdx) {
    this.pages = [frontIdx, backIdx];
    this.refresh();
  }

  refresh() {
    const tex = this.book.textures;
    const f = tex.get(this.pages[0]), b = tex.get(this.pages[1]);
    if (this.matF.map !== f) { this.matF.map = f; this.matF.needsUpdate = true; }
    if (this.matB.map !== b) { this.matB.map = b; this.matB.needsUpdate = true; }
  }

  set visible(v) { this.group.visible = v; }
  get visible() { return this.group.visible; }

  /**
   * t：0 = 平躺在右侧，1 = 平躺在左侧。yR / yL：两侧纸堆的顶面高度。
   * bend > 0 时纸的外缘领先（向前翻），< 0 时向后翻。
   */
  pose(t, yR, yL, bend = 0, gut = 1) {
    const { W } = this.book, nx = NX, ds = W / nx, xs = this.xs, ys = this.ys;
    const s = Math.sin(Math.PI * t);
    const y0 = yR + (yL - yR) * t + s * 0.01;
    xs[0] = 0; ys[0] = y0;
    let x = 0, y = y0;
    for (let i = 1; i <= nx; i++) {
      const u = (i - 0.5) / nx;
      const th = Math.min(Math.PI, Math.max(0, Math.PI * t + bend * s * u * u));
      x += ds * Math.cos(th); y += ds * Math.sin(th);
      xs[i] = x; ys[i] = y;
    }
    // 躺平时贴着纸堆，在书脊处弯下去
    const wR = 1 - smooth(0, 0.14, t), wL = smooth(0.86, 1, t);
    for (let i = 0; i <= nx; i++) {
      const g = (gutter(i / nx) - 1) * gut;
      ys[i] += wR * yR * g + wL * yL * g;
    }
    const pos = this.pos, nrm = this.nrm, row = nx + 1;
    for (let i = 0; i <= nx; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(nx, i + 1);
      let tx = xs[i1] - xs[i0], ty = ys[i1] - ys[i0];
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      for (let j = 0; j < 2; j++) {
        const k = j * row + i;
        pos.setX(k, xs[i]); pos.setY(k, ys[i]);
        nrm.setXYZ(k, -ty, tx, 0);
      }
    }
    pos.needsUpdate = true; nrm.needsUpdate = true;
  }
}

function stackGeometry(W, H, h, side, gut = 1) {
  const shape = new THREE.Shape();
  const N = 28;
  shape.moveTo(0, 0);
  shape.lineTo(side * W, 0);
  shape.lineTo(side * W, h);
  for (let i = N; i >= 0; i--) {
    const u = Math.pow(i / N, 1.6);
    shape.lineTo(side * u * W, h * (1 + (gutter(u) - 1) * gut));
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -H / 2);
  return g;
}

export class Book {
  constructor(stage, manifest, textures) {
    this.stage = stage;
    this.manifest = manifest;
    this.textures = textures;
    this.count = manifest.pageCount;
    const [pw, ph] = manifest.pageSize;
    this.PW = pw; this.PH = ph;
    this.H = 2;
    this.W = (this.H * pw) / ph;
    this.T = 0.0017;                                   // 每张纸的厚度
    this.leafCount = Math.floor(this.count / 2) + 1;
    this.current = 0;
    this.anim = null;
    this.listeners = new Set();

    this.group = new THREE.Group();
    stage.scene.add(this.group);

    this.leftTop = new Leaf(this);
    this.rightTop = new Leaf(this);
    this.fly = [];

    const edge = new THREE.MeshLambertMaterial({ color: 0xf1ebde });
    this.stackL = new THREE.Mesh(new THREE.BufferGeometry(), edge);
    this.stackR = new THREE.Mesh(new THREE.BufferGeometry(), edge);
    for (const s of [this.stackL, this.stackR]) { s.castShadow = s.receiveShadow = true; this.group.add(s); }
    this._stackH = ['', ''];

    textures.onChange(() => { for (const l of [this.leftTop, this.rightTop, ...this.fly]) l.refresh(); });
    this._rest();
    stage.updaters.add((dt) => this.update(dt));
  }

  front(j) { if (j < 0 || j >= this.leafCount) return null; const i = j === 0 ? 0 : 2 * j - 1; return i < this.count ? i : null; }
  back(j) { if (j <= 0 || j >= this.leafCount) return null; const i = 2 * j; return i < this.count ? i : null; }

  /** 当前摊开的 [左页, 右页]（PDF 页序，没有就是 null）。 */
  get spread() { return [this.back(this.current - 1), this.front(this.current)]; }
  get busy() { return !!this.anim; }

  /** 这一页现在在哪一侧（'left' | 'right' | null）。 */
  sideOf(pageIdx) {
    const [l, r] = this.spread;
    if (this.anim) return null;
    if (pageIdx === r) return 'right';
    if (pageIdx === l && l != null) return 'left';
    return null;
  }

  /** 包含某页的那张纸翻过后 current 应为多少。 */
  leafForPage(pageIdx) {
    if (pageIdx <= 0) return 0;
    return pageIdx % 2 === 1 ? (pageIdx + 1) / 2 : pageIdx / 2 + 1;
  }

  /** 书页坐标（PDF 点）-> 世界坐标（页面表面上方一点点）。 */
  pageToWorld(pageIdx, px, py, lift = 0.0015, out = new THREE.Vector3()) {
    const side = this.sideOf(pageIdx);
    const u = px / this.PW;
    const nL = this.current, nR = this.leafCount - this.current;
    let x, h, du;
    if (side === 'left') { x = -this.W + u * this.W; h = nL * this.T; du = 1 - u; }
    else { x = u * this.W; h = nR * this.T; du = u; }
    const g = this.gut(nL, nR);
    out.set(x, h * (1 + (gutter(du) - 1) * g) + lift, -this.H / 2 + (py / this.PH) * this.H);
    return out.applyMatrix4(this.group.matrixWorld);
  }

  topHeight(side) {
    return (side === 'left' ? this.current : this.leafCount - this.current) * this.T;
  }

  /** 书只有摊开时才会在书脊处弯下去；合着的那一侧是平的。 */
  gut(nL, nR) { return Math.min(1, Math.min(nL, nR) / 4); }

  _setStacks(nL, nR) {
    const q = (n) => Math.max(0, Math.round(n * 4) / 4);
    const g = Math.round(this.gut(nL, nR) * 20) / 20;
    const hl = q(nL) * this.T - this.T * 0.6, hr = q(nR) * this.T - this.T * 0.6;
    const key = (h) => `${h.toFixed(6)}|${g}`;
    if (key(hl) !== this._stackH[0]) {
      this.stackL.geometry.dispose();
      this.stackL.visible = hl > 0;
      if (hl > 0) this.stackL.geometry = stackGeometry(this.W, this.H, hl, -1, g);
      this._stackH[0] = key(hl);
    }
    if (key(hr) !== this._stackH[1]) {
      this.stackR.geometry.dispose();
      this.stackR.visible = hr > 0;
      if (hr > 0) this.stackR.geometry = stackGeometry(this.W, this.H, hr, 1, g);
      this._stackH[1] = key(hr);
    }
  }

  _rest() {
    const c = this.current, nL = c, nR = this.leafCount - c, T = this.T, g = this.gut(nL, nR);
    this._setStacks(nL, nR);
    this.leftTop.visible = c > 0;
    this.rightTop.visible = c < this.leafCount;
    if (c > 0) { this.leftTop.setPages(this.front(c - 1), this.back(c - 1)); this.leftTop.pose(1, nL * T, nL * T, 0, g); }
    if (c < this.leafCount) { this.rightTop.setPages(this.front(c), this.back(c)); this.rightTop.pose(0, nR * T, nR * T, 0, g); }
    for (const f of this.fly) f.visible = false;
    this.textures.want(this.spread);
  }

  _flyLeaf(k) {
    while (this.fly.length <= k) this.fly.push(new Leaf(this));
    return this.fly[k];
  }

  /** 翻到第 target 张（翻很多张时只动画其中几张，其余“哗”地一下带过）。 */
  turnTo(target) {
    target = Math.max(0, Math.min(this.leafCount, Math.round(target)));
    if (this.anim) { this.queued = target; return; }
    const from = this.current, to = target;
    if (from === to) return;
    const dir = Math.sign(to - from), n = Math.abs(to - from);
    const K = Math.min(n, 7), stagger = n === 1 ? 0 : 0.085, dur = n === 1 ? 0.9 : 0.7;
    const items = [];
    for (let k = 0; k < K; k++) {
      const off = K === 1 ? 0 : Math.round((k * (n - 1)) / (K - 1));
      const j = dir > 0 ? from + off : from - 1 - off;
      const leaf = this._flyLeaf(k);
      leaf.setPages(this.front(j), this.back(j));
      leaf.visible = true;
      items.push({ leaf, j, start: k * stagger, dur, order: k });
    }
    this.anim = { from, to, dir, items, time: 0, total: (K - 1) * stagger + dur, p: 0 };
    this._beginAnim();
    const pre = dir > 0 ? [this.front(to), this.back(to - 1)] : [this.back(to - 1), this.front(to)];
    this.textures.want(pre);
  }

  next() { this.turnTo((this.queued ?? this.current) + 1); }
  prev() { this.turnTo((this.queued ?? this.current) - 1); }

  // ---- 用手拖着翻 ----
  beginDrag(dir) {
    if (this.anim) return false;
    const from = this.current, to = from + dir;
    if (to < 0 || to > this.leafCount) return false;
    const j = dir > 0 ? from : from - 1;
    const leaf = this._flyLeaf(0);
    leaf.setPages(this.front(j), this.back(j));
    leaf.visible = true;
    this.anim = { from, to, dir, items: [{ leaf, j, start: 0, dur: 1, order: 0 }], time: 0, total: 1, p: 0, drag: true };
    this._beginAnim();
    this.textures.want(dir > 0 ? [this.front(to), this.back(to - 1)] : [this.back(to - 1), this.front(to)]);
    return true;
  }

  dragTo(p) { if (this.anim?.drag) this.anim.p = Math.min(1, Math.max(0, p)); }

  endDrag(commit) {
    if (!this.anim?.drag) return;
    this.anim.release = commit ? 1 : 0;
  }

  _beginAnim() {
    const { from, to, dir } = this.anim;
    // 底下露出来的页：向前翻时右边是目的页，左边仍是原来的页；向后翻反过来
    const leftLeaf = dir > 0 ? from - 1 : to - 1;
    const rightLeaf = dir > 0 ? to : from;
    this.leftTop.visible = leftLeaf >= 0;
    this.rightTop.visible = rightLeaf < this.leafCount;
    if (leftLeaf >= 0) this.leftTop.setPages(this.front(leftLeaf), this.back(leftLeaf));
    if (rightLeaf < this.leafCount) this.rightTop.setPages(this.front(rightLeaf), this.back(rightLeaf));
    this._emit('turnstart');
  }

  update(dt) {
    const a = this.anim;
    if (!a) return;
    const T = this.T;
    if (a.drag) {
      if (a.release != null) {
        const speed = 2.6 * dt;
        a.p += Math.sign(a.release - a.p) * Math.min(speed, Math.abs(a.release - a.p));
      }
    } else {
      a.time += dt;
      a.p = Math.min(1, a.time / a.total);
    }
    const prog = a.drag ? a.p : ease(a.p);
    const nL = a.from + (a.to - a.from) * prog, nR = this.leafCount - nL;
    this._setStacks(nL, nR);
    const g = this.gut(nL, nR);
    // 底下的两页跟着纸堆高度走
    if (this.leftTop.visible) this.leftTop.pose(1, nL * T, nL * T, 0, g);
    if (this.rightTop.visible) this.rightTop.pose(0, nR * T, nR * T, 0, g);

    for (const it of a.items) {
      let lp = a.drag ? a.p : Math.min(1, Math.max(0, (a.time - it.start) / it.dur));
      lp = a.drag ? lp : ease(lp);
      const t = a.dir > 0 ? lp : 1 - lp;
      const lift = (it.order + 1) * 0.00035;
      it.leaf.pose(t, nR * T + T + lift, nL * T + T + lift, 0.55 * a.dir, g);
    }

    const finished = a.drag ? (a.release != null && a.p === a.release) : a.p >= 1;
    if (finished) {
      const commit = a.drag ? a.release === 1 : true;
      if (commit) this.current = a.to;
      this.anim = null;
      this._rest();
      this._emit(commit ? 'turned' : 'turncancel');
      if (this.queued != null) {
        const q = this.queued; this.queued = null;
        if (q !== this.current) this.turnTo(q);
      }
    }
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(type) { for (const fn of this.listeners) fn(type, this); }
}
