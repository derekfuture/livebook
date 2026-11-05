// 燃烧条件卡：贴在每一处“可能燃烧的东西”旁边的一张小纸签。
// 先只记看得到、量得到的（温度、接不接触空气、烧没烧，结果像盖一枚小印）；
// 学生总结出燃烧的条件以后，纸签翻过来，变成三枚条件签：可燃物 · 氧气 · 着火点——缺哪一个，一眼看出来。
import { sfx } from './audio.js';

const O2_OBS = { air: '接触空气', none: '在水下', pure: '通入氧气', less: '罩住了 · 氧气越来越少', gone: '罩住了 · 氧气不足' };
const O2_OK = { air: true, pure: true, less: true, none: false, gone: false };

/**
 * tag：ctx.tag；title：标题；ign：着火点（℃，不是可燃物写 null）；tmax：温度条满格；showT：false 时不显示温度（蜡烛）
 */
export function condCard(tag, { title, ign = null, tmax = 100, showT = true, px = [0, -60] } = {}) {      // px：卡片在物体旁边的位置（屏幕像素）
  const t = tag('', 'cond');
  t.px = px;
  let st = {}, model = false;
  const stamp = () => (st.burn === true ? '<span class="cc-res burn">燃烧</span>' : st.burn === 'out' ? '<span class="cc-res">熄灭了</span>' : st.burn === false ? '<span class="cc-res">不燃烧</span>' : '');
  const render = () => {
    const T = Math.round(st.T), fuel = ign != null, name = st.title || title;
    const hot = st.hot ?? (fuel && st.T >= ign), o2 = O2_OK[st.o2];
    let big;
    if (!model) {
      const k = Math.max(0.04, Math.min(1, st.T / tmax));
      const temp = showT ? `<span class="cc-th"><i style="height:${(k * 100).toFixed(0)}%"></i></span><b>${T}</b><small>℃</small>` : '';
      big = `<div class="cc-obs">${temp}<span class="cc-air ${o2 ? 'on' : ''}">${O2_OBS[st.o2]}</span></div>`;
    } else {
      const k = fuel && showT ? Math.max(0.04, Math.min(1, st.T / ign)) : 1;
      big = '<div class="cc-toks">'
        + `<span class="tok fuel ${fuel ? 'on' : 'miss'}">${fuel ? '可燃物' : '不是可燃物'}</span>`
        + `<span class="tok o2 ${o2 ? 'on' : 'miss'}">${o2 ? '氧气' : '没有氧气'}</span>`
        + (!fuel ? '<span class="tok heat na">着火点 —</span>' : !showT ? `<span class="tok heat ${hot ? 'on' : 'miss'}">着火点</span>`
          : `<span class="tok heat ${hot ? 'on' : 'miss'}"><i style="width:${(k * 100).toFixed(0)}%"></i><em>${T}/${ign} ℃</em>着火点</span>`)
        + '</div>';
    }
    const note = st.note ? `<div class="cc-note">${st.note}</div>` : '';
    t.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${name}</span>${stamp()}</div><div class="cc-more">${big}${note}</div></div>`);
  };
  const api = {
    tag: t,
    get model() { return model; },
    set model(v) { model = v; render(); },
    get visible() { return t.visible; },
    set(s) { st = { T: 25, o2: 'air', burn: null, note: '', hot: undefined, title: '', ...s }; render(); return api; },
    /** 翻面：变成三枚条件签。delay 秒后开始，k 是第几张（音高一张比一张高） */
    reveal(delay = 0, k = 0) {
      setTimeout(() => {
        t.el.animate?.([{ rotate: 'y 0deg' }, { rotate: 'y 90deg', offset: 0.45 }, { rotate: 'y 0deg' }], { duration: 560, easing: 'ease-in-out' });
        setTimeout(() => { model = true; render(); sfx.ding(660 * Math.pow(1.122, k)); }, 250);
      }, delay * 1000);
    },
    reset() { model = false; api.set({}); },
    loc(...a) { t.loc(...a); return api; },
    show(on) { t.show(on); return api; },
  };
  api.set({});
  return api;
}
