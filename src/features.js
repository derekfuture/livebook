// 功能开关（改了要重新部署才到线上）
export const FEATURES = {
  // 下载离线版（U 盘上双击打开的那个 HTML，见 tools/build_offline.mjs）。
  // false：线上不放，首页没有“下载离线版”，部署时也不做 /offline.html；本地开发（npm run dev）照常显示，方便试。
  offline: false,
};
