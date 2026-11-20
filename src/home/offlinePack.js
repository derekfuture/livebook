// 网页打包时每科一个 HTML，课本放进同一目录里的 books/<id>.js，由对应科目的 HTML 按书目读取。PDF 不上传。
import { allPdfs } from '../book/pdfStore.js';
import { bookName } from '../content/editions.js';
import { bookList, getBook } from '../content/index.js';
import { FEATURES } from '../features.js';
import { offlinePackReadme } from './offlineReadme.js';
import { OFFLINE_SUBJECTS, offlineHtmlName, offlinePath, offlineZipName } from './offlineSubjects.js';
import { rememberRuntimeError } from '../ui/runtimeErrors.js';

const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids.flat()) if (k != null) e.append(k); return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 不带课本的离线版：部署时已经在网站上按科目做好了压缩包（tools/build_offline.mjs）。有的话就让浏览器直接下载它——
// 下载栏里有进度、失败了可以在下载栏里点重试、迅雷之类的下载软件也接得住；不用先把 HTML 拿进网页再打包。
// （Cloudflare Pages 不支持断点续传：网断了浏览器只能从头重下）
// 有就返回压缩包大小（字节；不知道大小时是 0），没有（本地开发、网站上没放）返回 null
async function serverZip(subject) {
  try { const r = await fetch(offlinePath(subject, 'zip'), { method: 'HEAD', cache: 'no-store' }); return r.ok && /zip/.test(r.headers.get('content-type') || '') ? Number(r.headers.get('content-length')) || 0 : null; }
  catch { return null; }
}
const downloadServerZip = (subject) => { const a = el('a', { href: offlinePath(subject, 'zip'), download: offlineZipName(subject) }); document.body.append(a); a.click(); a.remove(); };

// 在网页里打包时，先下载各科 HTML。网断了自动再试两次。
async function fetchOfflineHtml(subject, onProgress) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(offlinePath(subject, 'html'));
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
  const tip = el('div', { className: 'imp-tip up offline-tip', hidden: true });
  document.body.append(tip);
  const place = () => {
    const r = btn.getBoundingClientRect(), center = r.left + r.width / 2, width = tip.offsetWidth;
    const left = Math.max(12, Math.min(center - width / 2, innerWidth - width - 12));
    tip.style.left = `${left}px`;
    tip.style.bottom = `${innerHeight - r.top + 12}px`;
    tip.style.setProperty('--offline-arrow', `${Math.max(16, Math.min(center - left, width - 16))}px`);
  };
  const hide = () => { tip.hidden = true; };
  const acts = (...bs) => el('div', { className: 'imp-acts' }, bs.filter(Boolean).map(([t, fn, ghost]) => el('button', { className: 'imp-btn' + (ghost ? ' ghost' : ''), textContent: t, onclick: fn })));
  const show = (...kids) => { tip.replaceChildren(...kids.filter(Boolean)); tip.hidden = false; place(); return wait(30); };          // 等提示画出来再干重活
  addEventListener('resize', () => { if (!tip.hidden) place(); });

  btn.onclick = async () => {
    if (!tip.hidden) return hide();
    const selected = new Set(OFFLINE_SUBJECTS);
    const books = new Map(bookList().filter(({ id }) => !FEATURES.hiddenBooks?.includes(id)).map((book) => [book.id, book]));
    const group = el('div', { className: 'offline-subjects' });
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', '科目，可多选');
    const options = OFFLINE_SUBJECTS.map((subject) => {
      const mb = el('small');
      const check = el('span', { className: 'offline-check', textContent: '✓' });
      check.setAttribute('aria-hidden', 'true');
      const option = el('button', { type: 'button', className: 'offline-subject' },
        el('span', { className: 'offline-subject-name' }, check, subject.label), mb);
      option.onclick = () => {
        if (selected.has(subject)) selected.delete(subject);
        else selected.add(subject);
        render();
      };
      group.append(option);
      return { subject, option, mb };
    });
    const size = el('p'), includes = el('p', { className: 'imp-how' });
    size.setAttribute('aria-live', 'polite');
    const actions = acts(['下载', null], ['取消', hide, true]);
    const downloadBtn = actions.firstElementChild;
    let imported;
    let request = 0;
    const render = async () => {
      const current = ++request;
      const subjects = OFFLINE_SUBJECTS.filter((subject) => selected.has(subject));
      const pdfs = imported?.filter(([id]) => subjects.some(({ label }) => books.get(id)?.subject === label)) ?? [];
      const [single] = subjects;
      const describe = (zipBytes = null) => {
        let total = 0;
        for (const { subject, option, mb } of options) {
          const checked = selected.has(subject);
          const pdfBytes = (imported ?? []).reduce((sum, [id, rec]) => books.get(id)?.subject === subject.label ? sum + (rec.size ?? rec.blob?.size ?? 0) : sum, 0);
          const estimate = checked && zipBytes != null
            ? Math.round(zipBytes / 1e6) || subject.zipMB
            : Math.round(subject.htmlMB + pdfBytes * 1.34 / 1e6);
          option.setAttribute('aria-pressed', String(checked));
          mb.textContent = `约 ${estimate} MB`;
          if (checked) total += estimate;
        }
        size.textContent = subjects.length ? `合计约 ${total} MB · 解压后不用联网。` : '请至少选一科，才能下载。';
      };
      downloadBtn.disabled = true;
      describe();
      includes.textContent = pdfs.length
        ? `${pdfs.map(([id]) => bookName(id, books.get(id).title)).join('、')}的课本 PDF 会随离线版一起下载。`
        : '选中科目里已导入的课本 PDF 也会一起打包。';
      if (!subjects.length || !imported) return;
      const zipBytes = subjects.length === 1 && !pdfs.length ? await serverZip(single) : null;
      if (current !== request || tip.hidden || !tip.contains(group)) return;
      if (zipBytes != null) describe(zipBytes);
      downloadBtn.onclick = () => download(subjects, pdfs, zipBytes);
      downloadBtn.disabled = false;
    };
    show(el('b', { textContent: '下载离线版' }),
      group, size,
      el('p', { textContent: '解压后，用 Chrome 或 Edge 打开对应科目的 HTML。' }),
      includes,
      el('p', { className: 'imp-how', textContent: '离线版保存的是本次下载时的内容。活页课本会持续更新，想使用新内容，可以回到网站重新下载。关注“德里克的 AI 教学实验室”，了解更新消息。' }),
      actions);
    render();
    imported = await allPdfs();
    if (!tip.hidden && tip.contains(group)) render();
  };

  const started = (open, ...extra) => show(el('p', { textContent: `开始下载了。解压到 U 盘或电脑上，${open}` }), ...extra, acts(['好的', hide]));

  const download = async (subjects, pdfs, zipBytes, withoutPdfs = false) => {
    const [single] = subjects;
    const plainNote = withoutPdfs ? el('p', { className: 'imp-how', textContent: '这次下载不带课本。打开离线版后，可以在书里导入课本 PDF。' }) : null;
    if (zipBytes != null) {
      downloadServerZip(single);
      return started('双击里面的“活页课本.html”。', plainNote,
        el('p', { className: 'imp-how', textContent: '下载进度在浏览器的下载栏里。' }));
    }
    const msg = el('p', { textContent: '正在下载离线版……' });
    msg.setAttribute('role', 'status');
    await show(msg);
    const isCurrent = () => !tip.hidden && tip.contains(msg);
    let step = 'html';
    let currentSubject = single;
    try {
      // 1. 每科一个 HTML，逐科下载并显示进度。
      const folder = '活页课本', files = [];
      for (const [i, subject] of subjects.entries()) {
        currentSubject = subject;
        const progress = (got) => {
          msg.textContent = `正在下载${subject.label}离线版（${i + 1}/${subjects.length}）…… ${Math.min(subject.htmlMB, Math.floor(got / 1e6))} / ${subject.htmlMB} MB`;
        };
        progress(0);
        const html = await fetchOfflineHtml(subject, progress);
        files.push({ name: `${folder}/${offlineHtmlName(subject)}`, data: html });
      }
      files.push({ name: `${folder}/打开说明.txt`, data: new TextEncoder().encode(offlinePackReadme(subjects)) });
      // 2. 导入过的课本：一本读不出来（文件被清理软件删了之类），跳过它接着打包，最后说一声——不让一本书拖垮整个离线版
      step = 'pdf';
      const skipped = [];
      for (const [i, [id, rec]] of pdfs.entries()) {
        msg.textContent = `正在打包课本（${i + 1}/${pdfs.length}）……`;
        await wait(30);
        try { files.push({ name: `${folder}/books/${id}.js`, data: await pdfScript(id, rec) }); }
        catch (e) { skipped.push(bookName(id, getBook(id).title)); rememberRuntimeError(e, `离线版打包课本 ${id}`); }
      }
      // 3. 打成压缩包，交给浏览器下载
      step = 'zip';
      msg.textContent = '正在生成压缩包……';
      await wait(30);
      save(zip(files), offlineZipName(...subjects));
      if (isCurrent()) started(subjects.length === 1 ? `双击“${offlineHtmlName(single)}”。` : '双击相应科目的 HTML 文件。', plainNote,
        skipped.length ? el('p', { className: 'imp-how', textContent: `这台电脑上的${skipped.join('、')}文件读不出来，没能放进离线版。打开后，可以在书里重新导入。` }) : null);
    } catch (e) {
      rememberRuntimeError(e, `离线版下载 ${step}${step === 'html' ? ` ${currentSubject.slug}` : ''}`);
      if (!isCurrent()) return;
      const why = step === 'html' ? (e.final ? `网站上暂时没有${currentSubject.label}离线版` : `下载${currentSubject.label}离线版时网络断了`) : '打包时出错了';
      const plain = async () => {
        const status = el('p', { textContent: '正在准备离线版……' });
        show(status);
        const plainZip = subjects.length === 1 ? await serverZip(single) : null;
        if (!tip.hidden && tip.contains(status)) download(subjects, [], plainZip, true);
      };
      show(el('p', { textContent: `没下载成功，${why}。` }),
        pdfs.length ? el('p', { className: 'imp-how', textContent: '可以先只下载离线版（不带课本），打开以后在书里重新导入课本 PDF。' }) : null,
        acts(['再试一次', () => download(subjects, pdfs, zipBytes, withoutPdfs)], pdfs.length ? ['只下载离线版', plain] : null, ['关闭', hide, true]));
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
