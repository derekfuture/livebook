import { h } from './Panel.js';
import { viewport } from './viewport.js';

function hintVariant() {
  const key = 'livebook.turnhint';
  const setting = new URLSearchParams(location.search).get('turnhint');
  const explicit = setting === 'a' || setting === 'b';
  try {
    if (explicit) localStorage.setItem(key, setting);
    else return localStorage.getItem(key) === 'b' ? 'b' : 'a';
  } catch { /* 私密浏览仍可用网址切换。 */ }
  return explicit ? setting : 'a';
}

// 从书桌进书时网址会变化，在入口处记住选择。
const variant = viewport.phone ? hintVariant() : 'a';

// 两个方向共用同一张学案和同一只烧杯。预先反转横版内容，手机转过去时文字就正了。
const miniature = `<svg viewBox="-72 -72 144 144" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <defs>
    <g id="turn-notes">
      <rect width="33" height="41" rx="1" fill="#f8f2e3" stroke="#a99c84" stroke-width=".8"/>
      <path d="M5 8h16" stroke-width="2"/><path d="M5 13h23M5 18h19M5 22h22M5 26h13" stroke-width=".9" opacity=".65"/>
      <rect x="22" y="30" width="6" height="6" rx=".6" stroke="var(--seal)" transform="rotate(-6 25 33)"/>
    </g>
    <g id="turn-lab">
      <path d="M0 36q13-3 23 0 12-3 25-1l6 5q-16-2-30 1-11-3-25 0z" fill="#f8f2e3" stroke="#ac9b80"/>
      <path d="M13 7l3 4v21q0 3 13 3t13-3V8" fill="var(--paper)"/>
      <path d="M17 23q6-2 12 0t12 0v9q-12 4-24 0z" fill="#cfdddc" stroke="none"/>
      <path d="M17 23q6-2 12 0t12 0M36 14h5m-3 4h3" stroke-width=".8"/>
      <path d="M13 7q15-4 29 0-3 4-26 3" fill="var(--paper)"/>
      <path d="M25 30L36 1" stroke-width="1.6"/>
    </g>
  </defs>
  <g class="turn-device">
    <rect x="-31" y="-59" width="62" height="118" rx="8" fill="var(--paper)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    <rect x="-27" y="-49" width="54" height="98" rx="3" stroke="#aea594" stroke-width=".85"/>
    <path d="M-5-54h10M-6 54h12" stroke-width="1.5"/>
    <g class="turn-column"><use href="#turn-notes" x="-16.5" y="-41"/><use href="#turn-lab" transform="translate(-21 8) scale(.80)"/></g>
    <g class="turn-spread"><g transform="rotate(90)"><use href="#turn-notes" x="-43" y="-20"/><use href="#turn-lab" transform="translate(-4 -16) scale(.88)"/></g></g>
  </g>
</svg>`;

export function landscapeHint() {
  if (!viewport.phone) return null;
  const title = h('h2', {}, '请横屏使用');
  const message = h('p', {}, '横屏后，操作和电脑端一致');
  const note = h('small', { class: 'turn-note' }, '如未旋转，请开启手机的自动旋转');
  const actions = h('div', { class: 'turn-actions board' });
  const sheet = h('div', { class: 'turn-sheet' },
    h('div', { class: 'turn-drawing', html: miniature }), title, message, note, actions);
  const hint = h('aside', { class: 'turn-hint turn-' + variant, 'aria-label': '横屏提示' }, sheet);
  if (/Android/i.test(navigator.userAgent) && document.fullscreenEnabled && screen.orientation?.lock) {
    actions.append(h('button', { type: 'button', class: 'go', onclick: async () => {
      const entered = !document.fullscreenElement;
      try {
        if (entered) await document.documentElement.requestFullscreen();
        await screen.orientation.lock('landscape');
      } catch {
        if (entered && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        message.textContent = '请手动把手机横过来';
      }
    } }, '切换横屏'));
  }
  actions.append(h('button', { type: 'button', class: 'p-close turn-dismiss', onclick: () => hint.remove() }, '继续竖屏'));
  document.body.append(hint);
  return hint;
}
