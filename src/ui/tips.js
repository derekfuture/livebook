// 轻量的引导（作者 2026-11-10 选的）：
//   - 第一次打开活页：右下角视角按钮旁一张小纸条，说怎么转、放大、复位（手机上先说一句“电脑上使用更佳”）；
//   - 第一次做完一张活页：在“反馈”旁提一句可以带截图告诉我；
//   - 右下角“?”：点开一张操作说明卡（怎么看、翻书、活页、放映、原书页、反馈）。
// 纸条每样只出现一次（记在 localStorage），不挡操作，点一下或过几秒自己收起。
// 自动化测试和录屏（navigator.webdriver）里不出现，免得进截图、动图；地址栏加 ?tips=1 强制出现（看样子用）。
import { h } from './Panel.js';

const forced = /[?&]tips=1\b/.test(location.search);
const KEY = (k) => `livebook.tip.${k}`;
export const tipsOn = () => forced || !navigator.webdriver;
export const seen = (k) => { if (forced) return false; try { return localStorage.getItem(KEY(k)) === '1'; } catch { return true; } };
export const markSeen = (k) => { try { localStorage.setItem(KEY(k), '1'); } catch { /* 隐私模式：下次再说 */ } };
export const touchFirst = () => matchMedia('(pointer: coarse)').matches;
const small = () => innerWidth <= 760;

/** 一张小纸条，贴在 el 的左边、指着它。ms 后、点一下、或 until() 成立时收起；收起时记下 key（以后不再出现） */
export function slip(html, el, { ms = 8000, key = null, until = null } = {}) {
  const s = h('div', { class: 'tip-slip', role: 'status', html });
  document.body.append(s);
  const place = () => { const r = el.getBoundingClientRect(); s.style.right = `${Math.max(8, innerWidth - r.left + 12)}px`; s.style.top = `${r.top + r.height / 2}px`; };
  place(); addEventListener('resize', place);
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('on')));
  let done = false, poll = 0;
  const close = () => {
    if (done) return; done = true; clearInterval(poll); clearTimeout(timer);
    if (key) markSeen(key);
    s.classList.remove('on'); removeEventListener('resize', place); setTimeout(() => s.remove(), 450);
  };
  s.addEventListener('click', close);
  const timer = setTimeout(close, ms);
  if (until) poll = setInterval(() => { if (until()) setTimeout(close, 900); }, 250);          // 用户已经照着做了：再停一下就收
  return { close };
}

/** 第一次打开活页：怎么转、放大、复位（手机上先说电脑上使用更佳） */
export function firstLesson(stage) {
  if (!tipsOn() || seen('view')) return;
  setTimeout(() => {
    const anchor = [...document.querySelectorAll('#viewctl button')].find((b) => b.offsetParent);          // 看得见的第一个（手机上没有 ＋ －）
    if (!anchor || !document.body.classList.contains('lesson-on')) return;          // 已经关了
    const html = touchFirst() && small()
      ? '<b>电脑上使用更佳</b>（活页按电脑和投影设计）<br>手机上：一根手指拖空白处转一转，两根手指捏合放大，点 ⟲ 复位'
      : touchFirst()
        ? '一根手指拖空白处<b>转一转</b> · 两根手指<b>捏合放大</b> · 点 ⟲ <b>复位</b>'
        : '拖空白处<b>转一转</b> · 滚轮<b>放大缩小</b> · 双击空白处<b>复位</b>';
    slip(html, anchor, { ms: 9000, key: 'view', until: () => stage.viewChanged });
  }, 1400);
}

/** 第一次做完一张活页（盖了章）：在“反馈”旁提一句 */
export function firstStamp() {
  if (!tipsOn() || seen('feedback')) return;
  setTimeout(() => {
    const fb = document.querySelector('#viewctl .lesson-community .feedback-entry');
    if (!fb || !fb.offsetParent) return;
    slip('哪里不对、不好用，<b>点这里告诉我</b>，可以带截图', fb, { ms: 7000, key: 'feedback' });
  }, 1800);
}

/** 右下角“?”：一张操作说明卡。再点“?”、点卡外面、按 Esc 都收起 */
export function helpButton() {
  const btn = h('button', { class: 'help-btn', title: '怎么用', 'aria-label': '怎么用', 'aria-expanded': 'false' }, '?');
  let card = null;
  const close = () => { if (!card) return; card.classList.remove('on'); const c = card; card = null; setTimeout(() => c.remove(), 250); btn.setAttribute('aria-expanded', 'false'); removeEventListener('pointerdown', outside, true); removeEventListener('keydown', esc, true); };
  const outside = (e) => { if (card && !card.contains(e.target) && e.target !== btn) close(); };
  const esc = (e) => { if (e.key === 'Escape' && card) { e.stopImmediatePropagation(); close(); } };
  btn.onclick = (e) => {
    e.stopPropagation();
    if (card) return close();
    card = helpCard(close); document.body.append(card);
    const r = btn.getBoundingClientRect();
    card.style.right = `${Math.max(8, innerWidth - r.left + 12)}px`;
    card.style.bottom = `${Math.max(8, Math.min(innerHeight - r.bottom, innerHeight - card.offsetHeight - 8))}px`;          // 底边和“?”对齐；屏幕矮、卡片高的话往下挪，顶上不出界
    requestAnimationFrame(() => card?.classList.add('on'));
    btn.setAttribute('aria-expanded', 'true');
    addEventListener('pointerdown', outside, true); addEventListener('keydown', esc, true);
  };
  return btn;
}

function helpCard(close) {
  const phone = touchFirst() && small(), touch = touchFirst();
  const row = (k, html) => h('div', { class: 'hc-row' }, h('b', {}, k), h('span', { html }));
  const fs = document.fullscreenEnabled && !phone
    ? h('button', { class: 'hc-fs', onclick: () => { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())?.catch?.(() => {}); close(); } }, document.fullscreenElement ? '退出全屏' : '全屏')
    : null;
  return h('div', { class: 'help-card', role: 'dialog', 'aria-label': '怎么用' },
    h('div', { class: 'hc-head' }, h('b', {}, '怎么用'), phone ? h('small', {}, '电脑上使用更佳') : null, h('button', { class: 'hc-x', 'aria-label': '关上', onclick: close }, '×')),
    row('看', touch ? '一根手指拖空白处转一转；两根手指捏合放大、拖动平移；点 ⟲ 复位' : '拖空白处转一转；右键拖（或按住 Shift 拖）平移；滚轮放大缩小；双击空白处复位'),
    row('翻书', touch ? '点书页，或拖着书页翻；“目录”里按章节找' : '点书页或拖书页；键盘 ← → 或翻页笔也能翻；T 打开目录'),
    row('活页', touch ? '点书上发光的图翻开；点面板上的“放回书里”合上（地理是“回到地球”）' : '点书上发光的图翻开；Esc（或面板上的“放回书里”）合上；老师演示时，空格暂停'),
    !phone ? row('放映', fs ? '投影上课时可以全屏（也可以按 F11）' : '投影上课时可以全屏：按 F11') : null,
    fs ? h('div', { class: 'hc-acts' }, fs) : null,
    !phone ? row('原书页', '右上角“导入课本”，选这一版教材的 PDF；文件只在这台电脑上用') : null,
    row('有问题', '活页右下角“反馈”，可以带截图；首页左下角“反馈与建议”'));
}
