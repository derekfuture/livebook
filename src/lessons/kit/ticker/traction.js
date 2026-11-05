import { TRAVEL } from './motion.js';

// 木板两支点相距 0.633 m。向滑轮方向为正，滚动阻力按 μMg cosθ 近似。
const SPAN = 0.633;
const MU = 0.015 / SPAN;
export const GRAVITY = 9.8;
export const CARTS = [0.5, 0.75, 1];
export const HANGERS = [0.01, 0.02, 0.03, 0.15];

export function tractionRun({ mode, lift, cartIndex, hangerIndex, balanced }) {
  const angle = Math.atan(lift / 1000 / SPAN);
  const drift = GRAVITY * (Math.sin(angle) - MU * Math.cos(angle));
  const probe = mode === 'balance';
  const load = probe ? 0 : HANGERS[hangerIndex];
  const mass = CARTS[cartIndex];
  const v0 = probe ? 0.15 : 0;
  const a = probe ? drift : Math.max(0, (load * GRAVITY + mass * drift) / (mass + load));
  // 轻推后减速的车在速度降到零时停止，不允许模型自行反向。
  const finalSquared = v0 * v0 + 2 * a * TRAVEL;
  const end = finalSquared < 0 ? -v0 / a : v0 || a ? (2 * TRAVEL) / (v0 + Math.sqrt(finalSquared)) : 0;
  return {
    mode,
    angle,
    mass,
    load,
    discs: hangerIndex + 1,
    ballast: cartIndex,
    balanced,
    a,
    v0,
    end,
    t: 0,
    x: 0,
    next: 0,
    marks: [],
    recording: false,
  };
}
