// 功能开关（改了要重新部署才到线上）
export const FEATURES = {
  // 下载离线版（U 盘上双击打开的那个 HTML，见 tools/build_offline.mjs）。
  // false：线上不放，首页没有“下载离线版”，部署时也不做分科离线包；本地开发（npm run dev）照常显示，方便试。
  offline: true,
  // 还没准备好上线的书：线上书架不放、网址也打不开；本地开发（npm run dev）照常显示，方便接着做。准备好了就从这里删掉。
  hiddenBooks: [
    'wuli-hs1', 'wuli-hs2', 'wuli-hs3', 'wuli-hsx1', 'wuli-hsx2', 'wuli-hsx3',          // 高中物理：按初中的标准返工中（分支 senior-physics-v2）
  ],
};
