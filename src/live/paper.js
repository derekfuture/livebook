// 3D 里的纸：一张贴着画布的薄片。上面可以写手写字、画铅笔表格、留出可以点的区域。
// 版面坐标（左上角为原点）可以用毫米，也可以直接用课本的 PDF 点，方便和书页对齐。
import * as THREE from 'three';

export const HAND = '"Hannotate SC", "HanziPen SC", "Kaiti SC", "STKaiti", "KaiTi", serif';
export const SONG = '"Songti SC", "STSong", "Noto Serif SC", serif';
export const PENCIL = '#3a3f4e', RED = '#c8341f', BLUE = '#1f5fae';

export class Paper {
  /** w、h：纸在 3D 里的大小；units：版面坐标里纸有多宽（默认按毫米，也可以用 PDF 点）；res：画布宽度（像素）。 */
  constructor({ w, h, units, res = 1400, color = '#fdfbf4', grain = true, shadow = true }) {
    this.w = w; this.h = h;
    this.units = units ?? w * 1000;
    this.unitsH = (this.units * h) / w;
    this.canvas = document.createElement('canvas');
    this.canvas.width = res; this.canvas.height = Math.round((res * h) / w);
    this.g = this.canvas.getContext('2d');
    this.px = this.canvas.width / this.units;      // 每个版面单位多少像素
    this.color = color;
    this.grain = grain;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    const mat = new THREE.MeshLambertMaterial({ map: this.tex, transparent: color === 'transparent' });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = shadow;
    this.mesh.userData.paper = this;
    this.regions = [];
    this.anims = [];
    this._noise = grain ? noisePattern(this.g) : null;
  }

  /** 平放（纸面朝上）。 */
  flat() { this.mesh.rotation.x = -Math.PI / 2; return this; }

  /** 清空并重画：fn(g, mm) 里用 mm(x) 把毫米换成像素。 */
  draw(fn) {
    const g = this.g, W = this.canvas.width, H = this.canvas.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.color === 'transparent') g.clearRect(0, 0, W, H);
    else { g.fillStyle = this.color; g.fillRect(0, 0, W, H); if (this._noise) { g.globalAlpha = 0.5; g.fillStyle = this._noise; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } }
    this.regions = [];
    g.scale(this.px, this.px);       // 之后的坐标都是毫米
    fn(g, this);
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.tex.needsUpdate = true;
  }

  /** 登记一块可以点的区域（毫米）。 */
  region(id, x, y, w, h) { this.regions.push({ id, x, y, w, h }); }

  /** 射线打到这张纸的哪个区域（返回 id，或 null）。 */
  hit(ray) {
    const hits = ray.intersectObject(this.mesh, false);
    if (!hits.length) return null;
    const uv = hits[0].uv, x = uv.x * this.units, y = (1 - uv.y) * this.unitsH;
    const r = this.regions.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return r ? r.id : '_paper';
  }

  // ---- 画法 ----
  /** 手写字。opts: size（毫米）、color、align、wobble（抖动）、font */
  static hand(g, text, x, y, { size = 5, color = PENCIL, align = 'left', font = HAND, weight = 400, alpha = 1 } = {}) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.font = `${weight} ${size}px ${font}`;
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    // 逐字略微抖动，像手写
    if (align === 'left' && font === HAND) {
      let cx = x;
      for (const ch of [...text]) {
        const s = seed(ch.charCodeAt(0) + cx * 13);
        g.save(); g.translate(cx, y + (s - 0.5) * size * 0.08); g.rotate((s - 0.5) * 0.06);
        g.fillText(ch, 0, 0);
        g.restore();
        cx += g.measureText(ch).width * (0.96 + s * 0.06);
      }
    } else g.fillText(text, x, y);
    g.restore();
  }

  /** 印刷体（宋体）。 */
  static print(g, text, x, y, { size = 4.2, color = '#23293a', align = 'left', weight = 400 } = {}) {
    g.save(); g.fillStyle = color; g.font = `${weight} ${size}px ${SONG}`; g.textAlign = align; g.fillText(text, x, y); g.restore();
  }

  /** 铅笔线（有一点点手抖）。 */
  static pencil(g, x1, y1, x2, y2, { width = 0.35, color = PENCIL, alpha = 0.85 } = {}) {
    g.save(); g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = width; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1);
    const n = 6;
    for (let i = 1; i <= n; i++) { const t = i / n, s = seed(x1 * 7 + y1 * 3 + i); g.lineTo(x1 + (x2 - x1) * t + (s - 0.5) * 0.25, y1 + (y2 - y1) * t + (s - 0.5) * 0.25); }
    g.stroke(); g.restore();
  }

  /** 方框（可以打勾）。 */
  static box(g, x, y, s = 4.5, checked = false, { color = PENCIL } = {}) {
    Paper.pencil(g, x, y, x + s, y); Paper.pencil(g, x + s, y, x + s, y + s); Paper.pencil(g, x + s, y + s, x, y + s); Paper.pencil(g, x, y + s, x, y);
    if (checked) {
      g.save(); g.strokeStyle = BLUE; g.lineWidth = 0.7; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x + s * 0.15, y + s * 0.5); g.lineTo(x + s * 0.42, y + s * 0.85); g.lineTo(x + s * 1.1, y - s * 0.25); g.stroke(); g.restore();
    }
  }

  /** 红色印章。 */
  static stamp(g, text, cx, cy, { size = 18, rot = -0.18, alpha = 0.88 } = {}) {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.globalAlpha = alpha;
    g.strokeStyle = RED; g.lineWidth = size * 0.07;
    roundRect(g, -size / 2, -size / 2, size, size, size * 0.12); g.stroke();
    g.lineWidth = size * 0.025; roundRect(g, -size * 0.42, -size * 0.42, size * 0.84, size * 0.84, size * 0.08); g.stroke();
    g.fillStyle = RED; g.font = `700 ${size * 0.36}px ${SONG}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = [...text];
    g.fillText(t.slice(0, 1).join(''), size * 0.18, -size * 0.18); g.fillText(t.slice(1, 2).join(''), size * 0.18, size * 0.2);
    if (t.length > 2) { g.fillText(t[2], -size * 0.2, -size * 0.18); g.fillText(t[3] || '', -size * 0.2, size * 0.2); }
    // 印泥不均匀
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) { const s = seed(i * 17 + size); g.globalAlpha = 0.25; g.beginPath(); g.arc((s - 0.5) * size, (seed(i * 31) - 0.5) * size, size * 0.03 * seed(i * 7), 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function seed(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function noisePattern(g) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), d = x.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = 200 + Math.random() * 55; d.data[i] = v; d.data[i + 1] = v * 0.98; d.data[i + 2] = v * 0.93; d.data[i + 3] = Math.random() * 14; }
  x.putImageData(d, 0, 0);
  return g.createPattern(c, 'repeat');
}
