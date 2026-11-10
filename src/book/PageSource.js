// 书页从哪来（三种来源，按顺序取）：
//   1. 用户导入的课本 PDF：在浏览器里当场渲染，文件存在本机（IndexedDB），不上传；
//      离线版（U 盘上双击打开）还可以带在离线包里：books/<id>.js（下载离线包时把这台电脑上导入的 PDF 放进去）；
//   2. 本地渲染好的书页图片（只在开发时用：public/books/<id>/hi|lo/NNN.jpg；线上只有封面 000）；
//   3. 都没有：我们自己画的占位页（自己的纸、页眉页码、淡灰线代替正文、活页的位置留着图号）。
// 每种来源都提供：image(kind, i) → 上下翻转好的 ImageBitmap（给 three.js 贴图）；url(kind, i) → 图片地址（给界面里的截图用，没有就是 null）。
import './pdfCompatibility.js';
import { getPdf, getLo, putLo } from './pdfStore.js';
import { OFFLINE, OFFLINE_DATA, fileUrl } from '../content/index.js';

const fromB64 = (s) => (Uint8Array.fromBase64 ? Uint8Array.fromBase64(s) : Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
// 离线版：双击打开的网页不能从文件夹里读文件、起 worker，pdf.js 要的字库、解码器、worker 代码都打包在 HTML 里
class EmbeddedData {
  async fetch({ kind, filename }) {
    const s = OFFLINE_DATA.pdfjs[kind]?.[filename];
    if (!s) throw new Error(`离线版没有带这个文件：${filename}`);
    return fromB64(s);
  }
}
const HEIGHT = { hi: 2048, lo: 480 };          // 和 tools/render_pages.py 一样
const pad = (i) => String(i).padStart(3, '0');
const flip = (src) => createImageBitmap(src, { imageOrientation: 'flipY' });

class UrlSource {
  constructor(base) { this.kind = 'url'; this.base = base; }
  url(kind, i) { return Promise.resolve(fileUrl(`${this.base}${kind}/${pad(i)}.jpg`)); }
  async image(kind, i) {
    const r = await fetch(fileUrl(`${this.base}${kind}/${pad(i)}.jpg`));
    if (!r.ok) throw new Error(`没有这一页：${kind}/${pad(i)}`);
    return flip(await r.blob());
  }
}

// 渲染排队：高清页（摊开的那几页）插到前面，低清页在后面慢慢来
class Queue {
  constructor() { this.jobs = []; this.busy = false; }
  run(prio, fn) {
    return new Promise((resolve, reject) => { this.jobs.push({ prio, fn, resolve, reject }); this.jobs.sort((a, b) => a.prio - b.prio); this._next(); });
  }
  async _next() {
    if (this.busy || !this.jobs.length) return;
    this.busy = true;
    const j = this.jobs.shift();
    try { j.resolve(await j.fn()); } catch (e) { j.reject(e); }
    this.busy = false;
    this._next();
  }
}

export class PdfSource {
  constructor(bookId, pdf) { this.kind = 'pdf'; this.bookId = bookId; this.pdf = pdf; this.q = new Queue(); this.urls = new Map(); }
  static async open(bookId, data) {
    const pdfjs = (await import('./pdfEngine.js')).engine();          // pdf.js 很大，用到时才加载（见 pdfEngine.js）
    const files = OFFLINE
      ? { BinaryDataFactory: EmbeddedData, useWorkerFetch: false, cMapUrl: 'embedded/', standardFontDataUrl: 'embedded/', wasmUrl: 'embedded/' }
      : { cMapUrl: '/pdfjs/cmaps/', standardFontDataUrl: '/pdfjs/standard_fonts/', wasmUrl: '/pdfjs/wasm/', iccUrl: '/pdfjs/iccs/' };
    const pdf = await pdfjs.getDocument({ data, cMapPacked: true, ...files, verbosity: 0 }).promise;
    return new PdfSource(bookId, pdf);
  }
  get pageCount() { return this.pdf.numPages; }
  _render(i, H) {
    return this.q.run(H > 1000 ? 0 : 1, async () => {
      const page = await this.pdf.getPage(i + 1), v1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: H / v1.height });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvas: c, viewport: vp, background: '#ffffff' }).promise;
      page.cleanup();
      return c;
    });
  }
  async image(kind, i) {
    if (kind === 'lo') { const b = await getLo(this.bookId, i); if (b) return flip(b); }
    const c = await this._render(i, HEIGHT[kind]);
    if (kind === 'lo') c.toBlob((b) => b && putLo(this.bookId, i, b), 'image/jpeg', 0.8);
    return flip(c);
  }
  async url(kind, i) {
    const key = `${kind}${i}`;
    if (!this.urls.has(key)) this.urls.set(key, this._render(i, HEIGHT[kind]).then((c) => new Promise((r) => c.toBlob((b) => r(URL.createObjectURL(b)), 'image/jpeg', 0.88))));
    return this.urls.get(key);
  }
  /** 课本这一页的文字（核对版本用） */
  async text(i) { const p = await this.pdf.getPage(i + 1); const t = await p.getTextContent(); return t.items.map((x) => x.str).join(''); }
}

// 占位页：不用课本的版面和文字，只保留页码、标题和活页的位置，书看起来是完整的
class PlaceholderSource {
  constructor(base, manifest, spots) { this.kind = 'placeholder'; this.cover = new UrlSource(base); this.m = manifest; this.spots = spots; this.urls = new Map(); }
  _titleOf(i) {
    let chap = '', sec = '';
    for (const c of this.m.chapters) { if (c.page != null && c.page <= i) { chap = c.title; sec = ''; } for (const s of c.sections || []) if (s.page != null && s.page <= i && (c.page == null || c.page <= i)) { chap = c.title; sec = s.title; } }
    return [chap, sec];
  }
  _draw(kind, i) {
    const H = HEIGHT[kind], [PW, PH] = this.m.pageSize, W = Math.round(H * PW / PH), k = H / PH;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, H);
    let seed = (i + 1) * 9301 + 49297; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let n = 0; n < W * H / 900; n++) { g.fillStyle = `rgba(120,100,70,${rnd() * 0.035})`; g.fillRect(rnd() * W, rnd() * H, 1.5 * k, 1.5 * k); }
    const odd = i % 2 === 1, printed = i - this.m.pageOffset;
    const [chap, sec] = this._titleOf(i);
    const mx = 48 * k, top = 54 * k, bottom = PH * k - 50 * k;
    // 页眉：单元 / 课题（来自目录）
    g.fillStyle = '#7d8696'; g.font = `${10.5 * k}px "Songti SC", "STSong", serif`; g.textAlign = odd ? 'right' : 'left';
    const head = [chap, sec].filter(Boolean).join('  ·  ');
    if (head && printed > 0) g.fillText(head, odd ? W - mx : mx, 30 * k);
    g.strokeStyle = 'rgba(125,134,150,0.35)'; g.lineWidth = 0.8 * k; g.beginPath(); g.moveTo(mx, 36 * k); g.lineTo(W - mx, 36 * k); g.stroke();
    // 正文：一行行淡灰线（看着像书，读不出字）；活页的位置空出来
    const boxes = this.spots.filter((s) => s.page === i).map((s) => s.bbox.map((v) => v * k));
    const inBox = (y0, y1) => boxes.some(([, by0, , by1]) => y1 > by0 - 8 * k && y0 < by1 + 8 * k);
    let y = top + 10 * k;
    while (y < bottom) {
      if (rnd() < 0.12) { y += 14 * k; continue; }          // 段落之间空一点
      const lines = 2 + Math.floor(rnd() * 5);
      for (let l = 0; l < lines && y < bottom; l++, y += 15.5 * k) {
        if (inBox(y - 5 * k, y + 5 * k)) continue;
        const x0 = l === 0 ? mx + 21 * k : mx, x1 = l === lines - 1 ? mx + (W - 2 * mx) * (0.35 + rnd() * 0.5) : W - mx;
        g.fillStyle = 'rgba(150,145,135,0.32)'; g.beginPath(); g.roundRect(x0, y - 2.4 * k, x1 - x0, 4.8 * k, 2.4 * k); g.fill();
      }
      y += 6 * k;
    }
    // 活页的位置：淡框 + 图号
    for (const s of this.spots.filter((s) => s.page === i)) {
      const [x0, y0, x1, y1] = s.bbox.map((v) => v * k);
      g.fillStyle = 'rgba(232,226,212,0.75)'; g.strokeStyle = 'rgba(125,134,150,0.5)'; g.lineWidth = 1 * k; g.setLineDash([5 * k, 4 * k]);
      g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 8 * k); g.fill(); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#6c7586'; g.textAlign = 'center'; g.font = `${12 * k}px "Songti SC", "STSong", serif`;
      g.fillText((s.label || '').split('·')[0].trim(), (x0 + x1) / 2, y1 - 10 * k);
    }
    // 页码
    if (printed > 0) { g.fillStyle = '#7d8696'; g.font = `${10 * k}px "Times New Roman", serif`; g.textAlign = odd ? 'right' : 'left'; g.fillText(String(printed), odd ? W - mx : mx, PH * k - 24 * k); }
    return c;
  }
  async image(kind, i) { if (i === 0) return this.cover.image(kind, 0); return flip(this._draw(kind, i)); }
  async url(kind, i) { return i === 0 ? this.cover.url(kind, 0) : null; }
}

// 离线包里带的课本：books/<id>.js 里是 PDF 的 base64（双击打开的网页只能用 <script> 读同一个文件夹里的东西）
const bundledPdf = (id) => new Promise((resolve) => {
  const s = Object.assign(document.createElement('script'), { src: `books/${id}.js` });
  s.onload = () => { const b = window.__LB_PDF__?.[id]; if (b) delete window.__LB_PDF__[id]; resolve(b || null); s.remove(); };
  s.onerror = () => { resolve(null); s.remove(); };
  document.head.append(s);
});

/** 这本书用哪种书页：导入的 PDF（离线版：这台电脑上导入的 → 离线包里带的）→ 本地书页图片 → 占位页 */
export async function createPageSource(content, manifest) {
  const rec = await getPdf(content.id);
  if (rec?.blob) {
    try { return await PdfSource.open(content.id, await rec.blob.arrayBuffer()); } catch (e) { console.warn('导入的课本打不开，改用占位页', e); }
  }
  if (OFFLINE) {
    const b = await bundledPdf(content.id);
    if (b) { try { const src = await PdfSource.open(content.id, fromB64(b.data)); src.bundled = true; return src; } catch (e) { console.warn('离线包里的课本打不开，改用占位页', e); } }
    return new PlaceholderSource(content.base, manifest, content.spots);
  }
  if (new URLSearchParams(location.search).get('pages') === 'placeholder') return new PlaceholderSource(content.base, manifest, content.spots);          // 测试用：假装没有本地书页（导入了 PDF 时仍然用导入的）
  // 本地书页图片只在开发时用。线上不放书页，而且 Cloudflare 各地的缓存里可能还留着以前的图（删掉的文件最多留一周），不能去探
  if (import.meta.env.DEV) try { const r = await fetch(`${content.base}lo/${pad(1)}.jpg`, { method: 'HEAD' }); if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) return new UrlSource(content.base); } catch (e) { /* 没有书页图片 */ }
  return new PlaceholderSource(content.base, manifest, content.spots);
}
