import { h } from './Panel.js';

// 生命周期跟随本张活页。转屏只切换可见性，关闭提示不会重开实验。
export function landscapeHint() {
  if (!document.documentElement.classList.contains('phone')) return null;
  const close = h('button', { type: 'button', class: 'turn-dismiss', onclick: () => card.remove() }, '继续竖屏');
  const message = h('p', {}, '横过手机，和电脑上一样操作');
  const card = h('aside', { class: 'turn-hint', 'aria-label': '横屏提示' }, message);
  if (/Android/i.test(navigator.userAgent) && document.fullscreenEnabled && screen.orientation?.lock) {
    const turn = h('button', { type: 'button', onclick: async () => {
      const entered = !document.fullscreenElement;
      try {
        if (entered) await document.documentElement.requestFullscreen();
        await screen.orientation.lock('landscape');
      } catch {
        if (entered && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        message.textContent = '请手动横过手机，或继续竖屏';
      }
    } }, '横屏');
    card.append(turn);
  }
  card.append(close);
  document.body.append(card);
  return card;
}
