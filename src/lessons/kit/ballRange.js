// 图 1.4-5。沿水平方向朝槽外为正。两球半径相同，坐标原点在槽口球心的竖直投影处。
import { impactSpeeds } from './momentum.js';
import { rollingExitSpeed, TRACK_G } from './projectileTrack.js';

export const BALL_RADIUS = 0.01,
  LIP_HEIGHT = 0.28;
export const BALL_MASSES = [0.032, 0.011];

export function rangeShot(height, collision) {
  const incoming = rollingExitSpeed(height);
  if (!(incoming > 0)) return null;
  const airTime = Math.sqrt((2 * LIP_HEIGHT) / TRACK_G);
  // 碰撞发生时轻球在槽口，重球中心尚在槽内 2r。水平短槽中忽略切向冲量。
  const speeds = collision ? impactSpeeds(...BALL_MASSES, incoming, 0, 0.82) : [incoming];
  const flights = speeds.map((v, i) => {
    const offset = collision && i === 0 ? (2 * BALL_RADIUS) / v : 0;
    return { v, offset, land: offset + airTime, range: v * airTime };
  });
  function position(i, t) {
    const f = flights[i],
      elapsed = Math.min(t - f.offset, airTime);
    return elapsed < 0 ? { x: f.v * elapsed, drop: 0 } : { x: f.v * elapsed, drop: 0.5 * TRACK_G * elapsed ** 2 };
  }
  return { incoming, airTime, flights, position };
}
