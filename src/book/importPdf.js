// 导入课本 PDF。没导入时，右上角“导入课本”下面冒出一个小提示框（先闪几下）：可以导入，也可以点“不用了”，以后就不再出现。
// 文件只存在这台电脑的浏览器里（IndexedDB），不上传；导入以后书页、插图、结论原文都用这份课本。
import { rememberImportError, clearImportError } from '../ui/feedbackDiagnostics.js';
import { PdfSource } from './PageSource.js';
import { putPdf, removePdf } from './pdfStore.js';
import { EDITIONS, bookName as nameOf } from '../content/editions.js';

const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids.flat()) if (k != null) e.append(k); return e; };
const QUIET = 'lb-imp-quiet';          // 点过“不用了”：不再自动出现

export function mountImport({ content, manifest, source }) {
  const actions = document.querySelector('#hud-top .hud-actions');
  if (!actions || document.getElementById('btn-import')) return;
  const imported = source.kind === 'pdf', bundled = !!source.bundled, ed = EDITIONS[content.id];          // bundled：离线版，课本带在离线包里
  const pages = ed?.pages ?? manifest.pageCount;
  const bookName = nameOf(content.id, manifest.title);          // 人教版《物理 八年级下册》
  const short = `${bookName}（2024 年版，${pages} 页）`;
  const btn = el('button', { id: 'btn-import', className: 'chip', textContent: imported ? '课本 ✓' : '导入课本', title: bundled ? '用的是离线包里带的教材 PDF' : imported ? '用的是导入的教材 PDF（只在本机）' : '导入这一版教材的 PDF，换成原书页' });
  actions.append(btn);
  const copy = document.getElementById('copy');          // 页脚
  if (copy) copy.textContent = bundled ? '原书页来自离线包里带的教材 PDF' : imported ? '原书页来自导入的教材 PDF，只在本机使用' : source.kind === 'placeholder' ? '需要原书页，可自行导入这一版教材的 PDF' : '课本页面来自本地教材文件，仅供个人学习使用';
  const input = el('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true });
  document.body.append(input);

  // 按钮下面的小提示框
  const tip = el('div', { className: 'imp-tip', hidden: true });
  document.body.append(tip);
  const place = () => { const r = btn.getBoundingClientRect(); tip.style.top = `${r.bottom + 10}px`; tip.style.right = `${Math.max(12, innerWidth - r.right)}px`; };
  addEventListener('resize', () => { if (!tip.hidden) place(); });
  const hide = () => { tip.hidden = true; tip.classList.remove('blink'); };
  const acts = (...bs) => el('div', { className: 'imp-acts' }, bs.map(([t, fn, ghost]) => el('button', { className: 'imp-btn' + (ghost ? ' ghost' : ''), textContent: t, onclick: fn })));
  const show = (blink, ...kids) => { tip.replaceChildren(...kids.filter(Boolean)); place(); tip.hidden = false; tip.classList.toggle('blink', !!blink); };          // 空的不要放进去（不然会显示成“null”）
  const offer = (blink) => show(blink,
    el('b', { textContent: '想看原书页？' }),
    el('p', { textContent: `自行导入这一版教材的 PDF 就行：${short}。只在本机使用。` }),
    el('p', { className: 'imp-how', textContent: `手边没有 PDF 的话，最简单的办法是用 AI 助手，比如 WorkBuddy、豆包工作、千问办公：把教材名称告诉它，让它找一个下载教材的 skill，从国家中小学智慧教育平台下载。` }),
    acts(['导入 PDF', () => input.click()], ['不用了', () => { localStorage.setItem(QUIET, '1'); hide(); }, true]));
  const say = (text, ...bs) => show(false, el('p', { innerHTML: text }), bs.length ? acts(...bs) : null);

  const save = async (file, n) => {
    say('正在保存到这台电脑……');
    try {
      await putPdf(content.id, { blob: file, name: file.name, size: file.size, pages: n, at: Date.now() });
    } catch (e) {
      rememberImportError(e, 'save');
      console.warn('保存教材失败', e);
      return say('浏览器未能保存教材。请检查可用空间，并在普通浏览窗口中重试。', ['重新选择', () => input.click()], ['关闭', hide, true]);
    }
    say('导入好了，正在打开……');
    setTimeout(() => location.reload(), 400);
  };
  const doImport = async (file) => {
    if (!file || !/pdf$/i.test(file.type || file.name)) return say('请选择课本的 PDF 文件。', ['重新选择', () => input.click()], ['关闭', hide, true]);
    say('正在读取……');
    let src;
    try { src = await PdfSource.open(content.id, await file.arrayBuffer()); } catch (e) {
      rememberImportError(e, 'read');
      console.warn('读取教材失败', e);
      const text = e.name === 'PasswordException' ? '这份 PDF 有密码保护，请先解锁后再导入。'
        : e.name === 'InvalidPDFException' ? '这份文件不是有效的 PDF，或下载不完整，请重新下载后再试。'
        : 'PDF 读取组件未能正常运行。请使用新版 Chrome 或 Edge 打开后重试；也可以刷新页面重新加载组件。';
      return say(text, ['重新选择', () => input.click()], ['关闭', hide, true]); }
    clearImportError();
    const n = src.pageCount;
    if (n !== pages) return say(`这份 PDF 有 <b>${n}</b> 页，这本是 <b>${pages}</b> 页，可能不是同一版，书页会对不上。`, ['仍然使用', () => save(file, n)], ['重新选择', () => input.click(), true]);
    save(file, n);
  };

  btn.onclick = () => {
    if (!tip.hidden) return hide();
    if (!imported) return offer(false);
    if (bundled) return show(false, el('p', { textContent: `用的是离线包里带的教材 PDF：${short}。` }), acts(['换一份', () => input.click()], ['关闭', hide, true]));
    show(false, el('p', { textContent: `用的是导入的教材 PDF：${short}。只在本机使用。` }),
      acts(['换一份', () => input.click()], ['移除', async () => { await removePdf(content.id); location.reload(); }, true], ['关闭', hide, true]));
  };
  input.onchange = () => { const f = input.files?.[0]; input.value = ''; doImport(f); };
  addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((x) => x.kind === 'file')) e.preventDefault(); });
  addEventListener('drop', (e) => { const f = [...(e.dataTransfer?.files || [])][0]; if (!f) return; e.preventDefault(); doImport(f); });
  // 没导入、也没有本地书页（线上）：进书以后冒出来、闪几下；点过“不用了”就不再自动出现
  if (source.kind === 'placeholder' && !localStorage.getItem(QUIET)) setTimeout(() => offer(true), 1200);
}
