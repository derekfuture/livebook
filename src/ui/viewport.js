// 所有投影和指针都用实际 CSS 像素。横屏手机只缩放纸卡和按钮。
export const viewport = {
  get phone() { return phone; },
  get widePanel() { return this.landscape || this.width > 760; },
  get width() { return phone ? width : innerWidth; },
  get height() { return phone ? height : innerHeight; },
  get scale() { return scale; },
  get landscape() { return phone && width > height; },
};

const root = document.documentElement;
const view = window.visualViewport;
let width = innerWidth, height = innerHeight, scale = 1;
const phone = matchMedia('(pointer: coarse)').matches &&
  matchMedia('(max-device-width: 599px), (max-device-height: 599px)').matches; // 只区分手机和平板，不参与排版。

if (phone) {
  const key = 'livebook.phonescale', setting = new URLSearchParams(location.search).get('phonescale');
  let override = Number(setting);
  try {
    if (setting === 'auto') localStorage.removeItem(key);
    else if (override >= 0.3 && override <= 1) localStorage.setItem(key, String(override));
    else override = Number(localStorage.getItem(key));
  } catch { /* 私密浏览也可以使用网址设置。 */ }
  root.classList.add('phone');
  const fit = () => {
    width = Math.round(view?.width || innerWidth);
    height = Math.round(view?.height || innerHeight);
    const autoScale = Math.max(0.3, Math.min(1, width / 1100, height / 640));
    scale = width > height ? (override >= 0.3 && override <= 1 ? override : autoScale) : 1;
    root.classList.toggle('phone-scaled', width > height);
    root.style.setProperty('--phone-width', width + 'px');
    root.style.setProperty('--phone-height', height + 'px');
    root.style.setProperty('--ui-scale', scale);
  };
  fit();
  let frame;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      fit();
      window.dispatchEvent(new Event('phoneviewportresize'));
    });
  };
  for (const event of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(event, schedule);
  view?.addEventListener('resize', schedule);
  // 滚动面板也要拦浏览器的双指缩放；画布自己的 Pointer Events 继续处理镜头。
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
}
