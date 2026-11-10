// 下载离线版：放进 U 盘或拷到电脑上，双击“活页课本.html”就能用，不用联网。
// 离线版的 HTML 部署时放在 /offline.html（tools/build_offline.mjs 生成）。这台电脑上导入过课本 PDF 的话，一起打成 zip：
//   活页课本/活页课本.html + 活页课本/books/<id>.js（PDF 的 base64，离线版打开那本书时读）。全在浏览器里做，PDF 不上传。
import { allPdfs } from '../book/pdfStore.js';
import { bookName } from '../content/editions.js';
import { getBook } from '../content/index.js';

const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids.flat()) if (k != null) e.append(k); return e; };
const HTML_MB = 24;          // 离线版 HTML 大约多大（提示里估算大小用；2026-11-10 加了地理以后约 24 MB）

export function offlineButton({ link = false } = {}) {          // link：首页左下角那一行里的小字样式
  const btn = el('button', { className: link ? 'home-link home-offline' : 'paper-btn', textContent: link ? '下载离线版' : '⤓ 下载离线版' });
  const tip = el('div', { className: 'imp-tip up', hidden: true });
  document.body.append(tip);
  const place = () => { const r = btn.getBoundingClientRect(); tip.style.left = `${Math.max(12, r.left + r.width / 2 - 165)}px`; tip.style.bottom = `${innerHeight - r.top + 12}px`; };
  const hide = () => { tip.hidden = true; };
  const acts = (...bs) => el('div', { className: 'imp-acts' }, bs.map(([t, fn, ghost]) => el('button', { className: 'imp-btn' + (ghost ? ' ghost' : ''), textContent: t, onclick: fn })));
  const show = (...kids) => { tip.replaceChildren(...kids.filter(Boolean)); place(); tip.hidden = false; return new Promise((r) => setTimeout(r, 30)); };          // 等一下再干重活，提示先画出来
  addEventListener('resize', () => { if (!tip.hidden) place(); });

  btn.onclick = async () => {
    if (!tip.hidden) return hide();
    const pdfs = await allPdfs();
    const mb = Math.round(HTML_MB + pdfs.reduce((s, [, r]) => s + r.size * 1.34, 0) / 1e6);
    const names = pdfs.map(([id]) => bookName(id, getBook(id).title)).join('、');
    show(el('b', { textContent: '下载离线版' }),
      el('p', { textContent: pdfs.length
        ? `一个压缩包（约 ${mb} MB）。解压到 U 盘或电脑上，用 Chrome 或 Edge 打开里面的“活页课本.html”，不用联网。`
        : `一个压缩包（约 ${mb} MB）。先解压，再用 Chrome 或 Edge 打开里面的“活页课本.html”，不用联网。` }),
      el('p', { className: 'imp-how', textContent: pdfs.length ? `这台电脑上导入过的课本会一起放进去：${names}。` : '在书里导入过课本 PDF 的话，会一起放进离线版。' }),
      el('p', { className: 'imp-how', textContent: '离线版保存的是本次下载时的内容。活页课本会持续更新，想使用新内容，可以回到网站重新下载。关注「德里克的 AI 教学实验室」，了解更新消息。' }),
      acts(['下载', () => download(pdfs)], ['取消', hide, true]));
  };

  const download = async (pdfs) => {
    await show(el('p', { textContent: '正在准备……' }));
    try {
      const r = await fetch('/offline.html');
      const html = r.ok && (r.headers.get('content-type') || '').includes('html') ? await r.blob() : null;
      if (!html || html.size < 1e6) throw new Error('网站上没有离线版');
      const instructions = '活页课本离线版\r\n\r\n1. 将整个压缩包解压到电脑或 U 盘，不要直接在压缩包内打开。\r\n2. 右键“活页课本.html”，选择“打开方式”→新版 Microsoft Edge 或 Google Chrome。\r\n3. 微信、QQ、网盘里的文件预览不能运行实验，请先下载到电脑。\r\n4. 如果有 books 文件夹，请与 HTML 放在一起，转发时发送整个压缩包。\r\n5. 原书页需要导入对应版本的教材 PDF；没有 PDF 也能使用实验。\r\n6. 这是下载时的内容快照，更新后请回网站重新下载：https://livebook.derekfuture.club/\r\n';
      const files = [
        { name: '活页课本/活页课本.html', data: new Uint8Array(await html.arrayBuffer()) },
        { name: '活页课本/打开说明.txt', data: new TextEncoder().encode('\uFEFF' + instructions) },
      ];
      for (const [i, [id, rec]] of pdfs.entries()) {
        await show(el('p', { textContent: `正在打包课本（${i + 1}/${pdfs.length}）……` }));
        const b64 = (await new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => no(f.error); f.readAsDataURL(rec.blob); })).split(',')[1];
        const js = `(window.__LB_PDF__ ||= {})[${JSON.stringify(id)}] = ${JSON.stringify({ name: rec.name, pages: rec.pages })};\nwindow.__LB_PDF__[${JSON.stringify(id)}].data = "${b64}";\n`;
        files.push({ name: `活页课本/books/${id}.js`, data: new TextEncoder().encode(js) });
      }
      save(zip(files), '活页课本（离线版）.zip');
      show(el('p', { textContent: '开始下载了。解压到 U 盘或电脑上，双击里面的“活页课本.html”。' }), acts(['好的', hide]));
    } catch (e) {
      console.warn('下载离线版失败', e);
      show(el('p', { textContent: '没下载成功，稍后再试一次。' }), acts(['关闭', hide, true]));
    }
  };
  return btn;
}

function save(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

// ---- zip：只存不压（PDF 本来就压缩过），文件名标成 UTF-8（中文名在 Windows 上不乱码） ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files) {
  const enc = new TextEncoder(), parts = [], dir = [];
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const h = new DataView(new ArrayBuffer(30));          // 本地文件头
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    parts.push(h, name, f.data);
    const c = new DataView(new ArrayBuffer(46));          // 目录项
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    dir.push(c, name);
    offset += 30 + name.length + size;
  }
  const dirSize = dir.reduce((s, x) => s + x.byteLength, 0), e = new DataView(new ArrayBuffer(22));          // 目录结尾
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, dirSize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...dir, e], { type: 'application/zip' });
}
