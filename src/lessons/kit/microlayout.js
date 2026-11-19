// 钻进去看（microworld.js 的场景）用的两个小工具：让溶液里的粒子不叠在一起、让有标签的代表待在自己那一块。
// 只动分子的速度（m.v / m.pull），引擎照常让它们乱动。
import * as THREE from 'three';

/** 靠得太近（< dmin Å）的两个粒子互相推开一点：画面里不叠成一团。fixed 的不动。 */
export function spread(list, dmin, dt, k = 6) {
  const d = new THREE.Vector3();
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    d.copy(a.g.position).sub(b.g.position); const L = d.length();
    if (L >= dmin || L < 1e-4) continue;
    d.multiplyScalar(((dmin - L) / L) * k * dt);
    if (!a.fixed && !a.busy) a.v.add(d);
    if (!b.fixed && !b.busy) b.v.sub(d);
  }
}

/** 粒子往 home 那一点轻轻拉（弹簧）：有标签的代表各待一块，标签不互相压着。 */
export function homeTo(m, home, k = 1.2) {
  m.pull = home.clone().sub(m.g.position).multiplyScalar(k);
}
