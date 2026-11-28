// 功能开关（改了要重新部署才到线上）
export const FEATURES = {
  // 下载离线版（U 盘上双击打开的那个 HTML，见 tools/build_offline.mjs）。
  // false：线上不放，首页没有“下载离线版”，部署时也不做分科离线包；本地开发（npm run dev）照常显示，方便试。
  offline: true,
  // 还没准备好上线的书：线上书架不放、网址也打不开；本地开发（npm run dev）照常显示，方便接着做。准备好了就从这里删掉。
  hiddenBooks: [],
  // 还没准备好上线的单张活页：线上书页上不挂、网址也打不开（网址加 ?draft 或本地开发照常显示）。改好一张就从这里删掉一张。
  // 高中物理：这些还没按 DESIGN-物理.md 返工（分支 senior-physics-v2），其余 36 张已返工可以上线。
  hiddenLessons: [
    'squatsupport', 'newtontube', 'tangenttrack', 'waxmotion', 'inclineenergy', 'staticshielding', 'staticinduction', 'capacitorsharing',
    'amperefactors', 'fourconductors', 'fruitbattery', 'singleslit', 'thinfilminterference', 'springphase', 'freespring', 'forcedvibration',
    'coupledpendulums', 'ropewave', 'longitudinalwave', 'wavereflection', 'waverefraction', 'ripplediffraction', 'ropesuperposition', 'waveinterference',
    'totalreflection', 'polarization', 'amperedirection', 'selfinductionon', 'lcoscillation', 'photoresistor', 'thermistor', 'capillarity',
    'surfacetension', 'brownianmotion',
    // 返工过、但发布前流程测试没过的（2026-11-28），物理会话修好就删掉
    'handtape', 'tickertape', 'mutualinduction', 'momentum', 'lorentzbeam', 'lenzcoil',
  ],
};
