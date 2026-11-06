// 核对厄尔尼诺、拉尼娜：node tools/geo/enso_check.mjs（选必1 第 74–75 页）
import { west, east, diff, riseX, weather, upwell } from '../../src/lessons/kit/enso.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(west(0) > east(0) + 3, `正常年份：西部海温高（${west(0).toFixed(1)}℃），中东部低（${east(0).toFixed(1)}℃）`);
ok(east(1) > east(0) + 2 && diff(1) < diff(0), `厄尔尼诺：中东部海温异常升高（${east(1).toFixed(1)}℃），东西温差减小（${diff(0).toFixed(1)} → ${diff(1).toFixed(1)}）`);
ok(east(-1) < east(0) && diff(-1) > diff(0), `拉尼娜：中东部海温异常降低（${east(-1).toFixed(1)}℃），东西温差增大（${diff(-1).toFixed(1)}）`);
ok(riseX(0) < -0.4 && riseX(1) > riseX(0) + 0.5, '上升气流：正常在西边，厄尔尼诺时东移');
ok(weather(0).west.rain && !weather(0).east.rain, '正常年份：西部多雨、东部干燥');
ok(!weather(1).west.rain && weather(1).east.rain, '厄尔尼诺：西部干旱、东部多雨');
ok(upwell(1) < upwell(0) && upwell(-1) > upwell(0), '秘鲁沿岸冷水上涌：厄尔尼诺减弱，拉尼娜增强');
process.exit(bad ? 1 : 0);
