// 下载离线版：放进 U 盘或拷到电脑上，双击“活页课本.html”就能用，不用联网。
// 离线版的 HTML 部署时放在 /offline.html（tools/build_offline.mjs 生成）。这台电脑上导入过课本 PDF 的话，一起打成 zip：
//   活页课本/活页课本.html + 活页课本/books/<id>.js（PDF 的 base64，离线版打开那本书时读）。全在浏览器里做，PDF 不上传。
import { allPdfs } from '../book/pdfStore.js';
import { bookName } from '../content/editions.js';
import { getBook } from '../content/index.js';
import { OFFLINE_README } from './offlineReadme.js';
import { rememberRuntimeError } from '../ui/runtimeErrors.js';

const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids.flat()) if (k != null) e.append(k); return e; };
const HTML_MB = 24;          // 离线版 HTML 大约多大（提示里估算大小用；2026-11-10 加了地理以后约 24 MB）
const ZIP_NAME = '活页课本（离线版）.zip';
const ZIP_MB = 15;          // 网站上那个压缩包大约多大（Cloudflare 回 HEAD 时不带文件大小，提示里就用这个数；2026-11-15 是 14.5 MB）
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 不带课本的离线版：部署时已经在网站上做好了压缩包（/offline.zip，tools/build_offline.mjs）。有的话就让浏览器直接下载它——
// 下载栏里有进度、失败了可以在下载栏里点重试、迅雷之类的下载软件也接得住；不用先把 24 MB 拿进网页再打包（那一步出错整个就失败了，反馈 2026-11-15）。
// （Cloudflare Pages 不支持断点续传：网断了浏览器只能从头重下）
// 有就返回压缩包大小（字节；不知道大小时是 0），没有（本地开发、网站上没放）返回 null
async function serverZip() {
  try { const r = await fetch('/offline.zip', { method: 'HEAD', cache: 'no-store' }); return r.ok && /zip/.test(r.headers.get('content-type') || '') ? Number(r.headers.get('content-length')) || 0 : null; }
  catch { return null; }
}
const downloadServerZip = () => { const a = el('a', { href: '/offline.zip', download: ZIP_NAME }); document.body.append(a); a.click(); a.remove(); };

// 带课本时要在网页里打包，先把离线版的 HTML 拿下来：一边拿一边报进度；网断了自动再试两次
async function fetchOfflineHtml(onProgress) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch('/offline.html');
      if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) throw Object.assign(new Error('网站上没有离线版'), { final: true });
      let bytes;
      if (r.body?.getReader) {
        const reader = r.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress(got); }
        bytes = new Uint8Array(got); let o = 0; for (const p of parts) { bytes.set(p, o); o += p.length; }
      } else bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.length < 1e6) throw new Error('离线版没下载完整');
      return bytes;
    } catch (e) {
      if (e.final || attempt >= 3) throw e;
      await wait(1500 * attempt);
    }
  }
}

// 一本课本 PDF → 离线版读的 books/<id>.js（PDF 的 base64）
async function pdfScript(id, rec) {
  if (!(rec?.blob instanceof Blob) || !rec.blob.size) throw new Error('导入的文件不见了');
  const b64 = (await new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => no(f.error || new Error('读不出导入的文件')); f.readAsDataURL(rec.blob); })).split(',')[1];
  if (!b64) throw new Error('读不出导入的文件');
  return new TextEncoder().encode(`(window.__LB_PDF__ ||= {})[${JSON.stringify(id)}] = ${JSON.stringify({ name: rec.name, pages: rec.pages })};\nwindow.__LB_PDF__[${JSON.stringify(id)}].data = "${b64}";\n`);
}

export function offlineButton({ link = false } = {}) {          // link：首页左下角那一行里的小字样式
  const btn = el('button', { className: link ? 'home-link home-offline' : 'paper-btn', textContent: link ? '下载离线版' : '⤓ 下载离线版' });
  const tip = el('div', { className: 'imp-tip up', hidden: true });
  document.body.append(tip);
  const place = () => { const r = btn.getBoundingClientRect(); tip.style.left = `${Math.max(12, r.left + r.width / 2 - 165)}px`; tip.style.bottom = `${innerHeight - r.top + 12}px`; };
  const hide = () => { tip.hidden = true; };
  const acts = (...bs) => el('div', { className: 'imp-acts' }, bs.filter(Boolean).map(([t, fn, ghost]) => el('button', { className: 'imp-btn' + (ghost ? ' ghost' : ''), textContent: t, onclick: fn })));
  const show = (...kids) => { tip.replaceChildren(...kids.filter(Boolean)); place(); tip.hidden = false; return new Promise((r) => setTimeout(r, 30)); };          // 等一下再干重活，提示先画出来
  addEventListener('resize', () => { if (!tip.hidden) place(); });

  btn.onclick = async () => {
    if (!tip.hidden) return hide();
    const pdfs = await allPdfs();
    const zipBytes = pdfs.length ? null : await serverZip();
    const mb = zipBytes != null ? Math.max(1, Math.round(zipBytes / 1e6) || ZIP_MB) : Math.round(HTML_MB + pdfs.reduce((s, [, r]) => s + r.size * 1.34, 0) / 1e6);
    const names = pdfs.map(([id]) => bookName(id, getBook(id).title)).join('、');
    show(el('b', { textContent: '下载离线版' }),
      el('p', { textContent: pdfs.length
        ? `一个压缩包（约 ${mb} MB）。解压到 U 盘或电脑上，用 Chrome 或 Edge 打开里面的“活页课本.html”，不用联网。`
        : `一个压缩包（约 ${mb} MB）。先解压，再用 Chrome 或 Edge 打开里面的“活页课本.html”，不用联网。` }),
      el('p', { className: 'imp-how', textContent: pdfs.length ? `这台电脑上导入过的课本会一起放进去：${names}。` : '在书里导入过课本 PDF 的话，会一起放进离线版。' }),
      el('p', { className: 'imp-how', textContent: '离线版保存的是本次下载时的内容。活页课本会持续更新，想使用新内容，可以回到网站重新下载。关注「德里克的 AI 教学实验室」，了解更新消息。' }),
      acts(['下载', () => download(pdfs, zipBytes)], ['取消', hide, true]));
  };

  const started = (...extra) => show(el('p', { textContent: '开始下载了。解压到 U 盘或电脑上，双击里面的“活页课本.html”。' }), ...extra, acts(['好的', hide]));

  // 只要离线版、不带课本：网站上有做好的压缩包就直接下（浏览器下载栏里看进度），没有再在网页里打包
  const plain = async (note) => {
    if ((await serverZip()) != null) { downloadServerZip(); return started(el('p', { className: 'imp-how', textContent: note || '下载进度在浏览器的下载栏里。' })); }
    return download([], null);
  };

  const download = async (pdfs, zipBytes) => {
    if (!pdfs.length && zipBytes != null) { downloadServerZip(); return started(el('p', { className: 'imp-how', textContent: '下载进度在浏览器的下载栏里。' })); }
    const msg = el('p', { textContent: '正在下载离线版……' });
    await show(msg);
    let step = 'html';
    try {
      // 1. 离线版的 HTML（报进度；网断了自动再试）
      const html = await fetchOfflineHtml((got) => { msg.textContent = `正在下载离线版…… ${Math.min(HTML_MB, Math.floor(got / 1e6))} / ${HTML_MB} MB`; });
      const files = [
        { name: '活页课本/活页课本.html', data: html },
        { name: '活页课本/打开说明.txt', data: new TextEncoder().encode(OFFLINE_README) },
      ];
      // 2. 导入过的课本：一本读不出来（文件被清理软件删了之类），跳过它接着打包，最后说一声——不让一本书拖垮整个离线版
      step = 'pdf';
      const skipped = [];
      for (const [i, [id, rec]] of pdfs.entries()) {
        msg.textContent = `正在打包课本（${i + 1}/${pdfs.length}）……`;
        await wait(30);
        try { files.push({ name: `活页课本/books/${id}.js`, data: await pdfScript(id, rec) }); }
        catch (e) { skipped.push(bookName(id, getBook(id)?.title || id)); rememberRuntimeError(e, `离线版打包课本 ${id}`); }
      }
      // 3. 打成压缩包，交给浏览器下载
      step = 'zip';
      save(zip(files), ZIP_NAME);
      started(skipped.length ? el('p', { className: 'imp-how', textContent: `${skipped.join('、')}没能放进去：这台电脑上导入的文件读不出来了。打开离线版以后，可以在书里重新导入。` }) : null);
    } catch (e) {
      // 说清是哪一步没成，记下来（提反馈时随诊断信息带上）；给一条一定走得通的路：只下载离线版、不带课本
      rememberRuntimeError(e, `离线版下载 ${step}`);
      const why = step === 'html' ? (e.final ? '网站上暂时没有离线版' : '下载离线版时网络断了') : '打包时出错了';
      show(el('p', { textContent: `没下载成功：${why}。` }),
        pdfs.length ? el('p', { className: 'imp-how', textContent: '可以先只下载离线版（不带课本），打开以后在书里重新导入课本 PDF。' }) : null,
        acts(['再试一次', () => download(pdfs, zipBytes)], pdfs.length ? ['只下载离线版', () => plain('不带课本。打开离线版以后，可以在书里导入课本 PDF。下载进度在浏览器的下载栏里。')] : null, ['关闭', hide, true]));
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
