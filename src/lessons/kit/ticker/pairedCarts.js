// 图 4.2-3 的黑板擦同时压住两条尾绳。两车必须共享一次放行、制动和计时。
import { tractionRun } from './traction.js';
import { advance } from './motion.js';

export function pairedRun(settings) {
  const carts = settings.map(({ lift, cartIndex, hangerIndex }) =>
    tractionRun({ mode: 'force', lift, cartIndex, hangerIndex }),
  );
  return { carts, elapsed: 0, end: Math.min(...carts.map((cart) => cart.end)), state: 'held' };
}

export function liftBrake(pair) {
  if (pair.state === 'held') pair.state = 'moving';
}

export function movePair(pair, dt) {
  if (pair.state !== 'moving' && pair.state !== 'atEnd') return;
  for (const cart of pair.carts) advance(cart, dt);
  pair.elapsed += dt;
  // 任一辆撞到端部后，整轮作废；不能把端部截断的位移当作一次共同制动。
  if (pair.elapsed >= pair.end) pair.state = 'atEnd';
}

export function pressBrake(pair) {
  if (pair.state === 'atEnd') pair.state = 'missed';
  else if (pair.state === 'moving') pair.state = 'stopped';
}
