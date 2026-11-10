// 核对厄尔尼诺、拉尼娜：node tools/geo/enso_check.mjs（选必1 第 74–75 页）
import { west, east, diff, riseX, sinkX, weather, upwell, rainAmt, stateKey, stateName, circulation } from '../../src/lessons/kit/enso.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(west(0) > east(0) + 3, `正常年份：西部海温高（${west(0).toFixed(1)}℃），中东部低（${east(0).toFixed(1)}℃）`);
ok(east(1) > east(0) + 2 && diff(1) < diff(0), `厄尔尼诺：中东部海温异常升高（${east(1).toFixed(1)}℃），东西温差减小（${diff(0).toFixed(1)} → ${diff(1).toFixed(1)}）`);
ok(east(-1) < east(0) && diff(-1) > diff(0), `拉尼娜：中东部海温异常降低（${east(-1).toFixed(1)}℃），东西温差增大（${diff(-1).toFixed(1)}）`);
ok(riseX(0) < -0.4 && riseX(1) > riseX(0) + 0.5, '上升气流：正常在西边，厄尔尼诺时东移');
ok(weather(0).west.rain && !weather(0).east.rain, '正常年份：西部多雨、东部干燥');
ok(!weather(1).west.rain && weather(1).east.rain, '厄尔尼诺：西部偏干、中东部降水增加的风险');
ok(upwell(1) < upwell(0) && upwell(-1) > upwell(0), '秘鲁沿岸冷水上涌：厄尔尼诺减弱，拉尼娜增强');
ok(riseX(1) > 0.5 && sinkX(1) > riseX(1), '厄尔尼诺情境对流东移，未强制反转');
ok(sinkX(0) > 0.5 && sinkX(-1) > 0.5, '正常、拉尼娜：东部下沉');
for (const a of [-0.6001, -0.55, -0.5, -0.4, 0.4, 0.5, 0.5001, 0.55, 0.6, 1]) {
  const k = stateKey(a); ok(stateName(a) === ({ el: '厄尔尼诺', la: '拉尼娜', normal: '正常年份' }[k]) && weather(a).east.rain === (k === 'el'), `${a}：名称、天气、按钮统一状态来源`);
}
for (const f of [riseX, sinkX, rainAmt]) ok(Math.abs(f(0.5001) - f(0.5)) < 0.001, '跨0.5阈值环流和降雨强度连续');
ok(circulation(0.55).includes('减弱') && circulation(0.4).includes('正常') && circulation(1).includes('可能'), '往返拖动当前说明不保留旧状态，强事件仅可能反转');
process.exit(bad ? 1 : 0);
