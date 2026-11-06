// 选必二p.98–99的NTC特性。名义参数用于课堂定性对照，不是某一型号标定。
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const finitePoint = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);
const validTemperature = (t) => Number.isFinite(t) && t > -273.15;
export const THERMISTOR_BULB_RADIUS = 0.005;
export const THERMISTOR_HAND = Object.freeze({ x: 0.025, y: 0.065, z: 0.055 });
export const THERMISTOR_WATER = Object.freeze({
  x: 0.16,
  z: 0.055,
  radius: 0.038,
  floor: 0.004,
  surface: 0.055,
  rim: 0.083,
});

export function thermistorResistance(temperature, { r25 = 2200, beta = 3950 } = {}) {
  if (!validTemperature(temperature) || !Number.isFinite(r25) || r25 <= 0 || !Number.isFinite(beta) || beta <= 0)
    throw new RangeError('NTC阻值、B值须为正，温度须高于绝对零度');
  const R = r25 * Math.exp(beta * (1 / (temperature + 273.15) - 1 / 298.15));
  if (!Number.isFinite(R) || R <= 0) throw new RangeError('温度超出NTC近似式的可计算范围');
  return R;
}

// 球状封装感温头的浸水面积比例。杯壁内的竖直进出是连续球冠面积；
// 横向穿杯壁不是有效位置，交互层须先把感温头提过杯沿再平移。
// 手指接触区为可压缩指腹的近似，离开接触区后不再由手供热。
export function thermistorExposure(
  probe,
  { hand = THERMISTOR_HAND, water = THERMISTOR_WATER, radius = THERMISTOR_BULB_RADIUS } = {},
) {
  if (
    !finitePoint(probe) ||
    !finitePoint(hand) ||
    !Number.isFinite(radius) ||
    radius <= 0 ||
    !water ||
    !['x', 'z', 'radius', 'floor', 'surface', 'rim'].every((k) => Number.isFinite(water[k])) ||
    water.radius <= radius ||
    water.floor >= water.surface ||
    water.surface >= water.rim
  )
    throw new RangeError('感温头、手指和水杯几何参数须有效');
  const inside = Math.hypot(probe.x - water.x, probe.z - water.z) <= water.radius - radius;
  const immersion =
    inside && probe.y - radius >= water.floor ? clamp((water.surface - probe.y + radius) / (2 * radius), 0, 1) : 0;
  const distance = Math.hypot((probe.x - hand.x) / 0.011, (probe.y - hand.y) / 0.014, (probe.z - hand.z) / 0.011);
  // 中心附近保留约2mm的完整贴合区，防止强迫像素级对准。
  const contact = clamp((1 - distance) / 0.8, 0, 1) * (1 - immersion);
  return { contact, immersion };
}

export function thermistorState({
  initialTemperature = 22,
  r25 = 2200,
  beta = 3950,
  heatCapacity = 0.04,
  airConductance = 0.00175,
  leadConductance = 0.00025,
  handConductance = 0.008,
  waterConductance = 0.024,
} = {}) {
  thermistorResistance(initialTemperature, { r25, beta });
  if (
    !Number.isFinite(heatCapacity) ||
    heatCapacity <= 0 ||
    ![airConductance, leadConductance, handConductance, waterConductance].every((v) => Number.isFinite(v) && v >= 0) ||
    airConductance + leadConductance <= 0
  )
    throw new RangeError('热容量须为正，热导非负，并保留空气散热通路');
  let temperature = initialTemperature,
    time = 0;
  const heat = { air: 0, hand: 0, water: 0, electric: 0 };
  const snapshot = () => ({
    temperature,
    time,
    resistance: thermistorResistance(temperature, { r25, beta }),
    energy: heatCapacity * (temperature - initialTemperature),
    heat: { ...heat },
  });
  return {
    get temperature() {
      return temperature;
    },
    get resistance() {
      return thermistorResistance(temperature, { r25, beta });
    },
    snapshot,
    // C dT/dt = ΣGᵢ(Tᵢ−T)+P。输入的是实际接触/浸入比例与当前电路焦耳功率。
    // 一帧内各热源视为定温库、功率恒定；该线性热交换精确积分，无温度切换。
    step(dt, { air = 22, hand = 33, water = 10, contact = 0, immersion = 0, power = 0 } = {}) {
      if (
        !Number.isFinite(dt) ||
        dt < 0 ||
        ![air, hand, water].every(validTemperature) ||
        ![contact, immersion].every((v) => Number.isFinite(v) && v >= 0 && v <= 1) ||
        contact + immersion > 1 + 1e-10 ||
        !Number.isFinite(power) ||
        power < 0
      )
        throw new RangeError('时间、功率和接触面积须有效；总接触比例不超过1');
      const g = {
        air: leadConductance + airConductance * Math.max(0, 1 - contact - immersion),
        hand: handConductance * contact,
        water: waterConductance * immersion,
      };
      const reservoirs = { air, hand, water },
        G = g.air + g.hand + g.water;
      if (G <= 0) throw new RangeError('当前状态没有有效传热通路');
      const equilibrium = (g.air * air + g.hand * hand + g.water * water + power) / G,
        tau = heatCapacity / G,
        approach = -Math.expm1(-dt / tau),
        change = equilibrium - temperature;
      const next = temperature + change * approach;
      thermistorResistance(next, { r25, beta });
      const integratedChange = change * (dt - tau * approach);
      for (const name of ['air', 'hand', 'water'])
        heat[name] += g[name] * ((reservoirs[name] - temperature) * dt - integratedChange);
      heat.electric += power * dt;
      temperature = next;
      time += dt;
      return snapshot();
    },
  };
}
