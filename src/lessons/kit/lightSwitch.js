// 图 5.3-5 甲：R1 与光敏电阻中点接 NPN 基极，330 Ω 与 LED 接在集电极支路。
export const VISIBLE_CURRENT = 0.0001;
export const DAYLIGHT_LUX = 520,
  STRAY_LUX = 4;
export const SENSOR_Y = 0.021,
  SHADE_Y = 0.085,
  EMITTER_Y = 0.174;
export const EMITTER_WIDTH = 0.078,
  SHADE_WIDTH = 0.052;

export const SENSOR_RADIUS=.010;
export const SHADE_FRACTION=(SHADE_Y-SENSOR_Y)/(EMITTER_Y-SENSOR_Y);
export const FOOTPRINT=EMITTER_WIDTH*SHADE_FRACTION;
// 方形漫射面上的光线与卡片相交；对圆形光敏面作等面积采样，保留环境散射光。
const samples = [];
for (let ring=0;ring<4;ring++) for(let sector=0;sector<12;sector++){
  const angle=(sector+0.5*(ring%2))*Math.PI/6;
  const r=SENSOR_RADIUS*Math.sqrt((ring+.5)/4)*(1-SHADE_FRACTION);
  samples.push([r*Math.cos(angle),r*Math.sin(angle)]);
}
function covered(q) {
  return Math.max(0,Math.min(FOOTPRINT/2,q+SHADE_WIDTH/2)-Math.max(-FOOTPRINT/2,q-SHADE_WIDTH/2));
}
export function sensorLux(x,z,lampOn=true) {
  if(!lampOn)return STRAY_LUX;
  let area=0;
  for(const [px,pz] of samples) area+=covered(x-px)*covered(z-pz);
  const visible=Math.max(0,1-area/(samples.length*FOOTPRINT**2));
  return STRAY_LUX+(DAYLIGHT_LUX-STRAY_LUX)*visible;
}
export function photoResistance(lux) {
  return Math.min(1.4e6, 5800 * (100 / Math.max(0.001, lux)) ** 0.72);
}
export function lightSwitchReadings({ power, resistance, lux, r1Rail, photoRail, collectorWire }) {
  const photo = photoResistance(lux);
  if (!power) return { photo, base: 0, collector: 0 };
  const baseContribution = (rail, r) => (rail === null ? 0 : ((rail === '+' ? 6 : 0) - 0.65) / r);
  const base = Math.max(0, baseContribution(r1Rail, resistance) + baseContribution(photoRail, photo));
  // 定压降近似，保留放大区的小电流，亮度随集电极电流连续变化。
  const collector = collectorWire ? Math.min(100 * base, (6 - 1.85 - 0.18) / 330) : 0;
  return { photo, base, collector };
}
