import * as THREE from 'three';

// 每页两档贴图：低清（全部预载，翻页动画用）和高清（只给当前摊开的几页，最多留 MAX_HI 张）。
const MAX_HI = 10;

export class PageTextures {
  constructor(base, count, renderer) {
    this.base = base;
    this.count = count;
    this.aniso = renderer.capabilities.getMaxAnisotropy();
    this.loader = new THREE.ImageBitmapLoader();
    this.loader.setOptions({ imageOrientation: 'flipY' });
    this.lo = new Array(count).fill(null);
    this.hi = new Map();          // 页序 -> 纹理（Map 的插入顺序当 LRU 用）
    this.pendingHi = new Set();
    this.listeners = new Set();
    this.blank = this._paper();
  }

  _paper() {
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const g = c.getContext('2d');
    g.fillStyle = '#fbf9f3'; g.fillRect(0, 0, 4, 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _url(kind, i) { return `${this.base}${kind}/${String(i).padStart(3, '0')}.jpg`; }

  _load(kind, i) {
    return new Promise((resolve, reject) => {
      this.loader.load(this._url(kind, i), (bitmap) => {
        const t = new THREE.Texture(bitmap);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = kind === 'hi' ? this.aniso : 4;
        t.flipY = false;            // ImageBitmap 已在解码时翻转
        t.needsUpdate = true;
        resolve(t);
      }, undefined, reject);
    });
  }

  /** 预载全部低清页；先加载 first 里的页，其余并发 6 张慢慢来。 */
  async preload(first = [], onProgress) {
    const order = [...new Set([...first, ...Array.from({ length: this.count }, (_, i) => i)])];
    let done = 0;
    const firstSet = new Set(first);
    const worker = async () => {
      while (order.length) {
        const i = order.shift();
        try { this.lo[i] = await this._load('lo', i); this._emit(i); } catch (e) { /* 缺页就用白纸 */ }
        done++;
        onProgress?.(done / this.count, firstSet.size && [...firstSet].every((k) => this.lo[k]));
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  /** 请求高清页（当前摊开的页）。 */
  want(pages) {
    for (const i of pages) {
      if (i == null || i < 0 || i >= this.count) continue;
      if (this.hi.has(i)) {          // 刷新 LRU 顺序
        const t = this.hi.get(i); this.hi.delete(i); this.hi.set(i, t);
        continue;
      }
      if (this.pendingHi.has(i)) continue;
      this.pendingHi.add(i);
      this._load('hi', i).then((t) => {
        this.pendingHi.delete(i);
        this.hi.set(i, t);
        while (this.hi.size > MAX_HI) {
          const [old, ot] = this.hi.entries().next().value;
          if (pages.includes(old)) break;
          this.hi.delete(old);
          ot.dispose();
        }
        this._emit(i);
      }).catch(() => this.pendingHi.delete(i));
    }
  }

  get(i) {
    if (i == null) return this.blank;
    return this.hi.get(i) || this.lo[i] || this.blank;
  }

  hiRes(i) { return this.hi.get(i) || null; }

  onChange(fn) { this.listeners.add(fn); }
  _emit(i) { for (const fn of this.listeners) fn(i); }
}
