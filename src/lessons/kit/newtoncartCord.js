// 槽码落地后，滑轮与车头之间多出来的绳先下垂，再弯曲地铺在木板上。
import * as THREE from 'three';

export function newtoncartCord(rig) {
  const track = rig.board.parent;
  // 共用装置用横放的单位圆柱画这一段绳。沿用它的两端、粗细和材质。
  const straight = track.children.find(mesh =>
    mesh.geometry?.parameters?.height === 1 && mesh.rotation.z === Math.PI / 2);
  const count = 48;
  const curved = new THREE.InstancedMesh(straight.geometry, straight.material, count);
  curved.visible = false;
  curved.frustumCulled = false;
  track.add(curved);
  const points = Array.from({ length: count + 1 }, () => new THREE.Vector3());
  const axis = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const segment = new THREE.Object3D();
  let previous = 0;

  return (slack) => {
    curved.visible = slack > 0;
    if (curved.visible) straight.visible = false; // rig.draw 已恢复绷紧时的绳形
    if (slack === previous) return;
    previous = slack;
    if (!slack) return;
    const span = straight.scale.y;
    const start = straight.position.x - span / 2;
    const height = straight.position.y;
    function lay(amplitude) {
      let length = 0;
      for (let i = 0; i <= count; i++) {
        const u = i / count;
        const sag = Math.sin(Math.PI * u);
        points[i].set(start + span * u, height - Math.min(height - rig.top - 0.0012, amplitude * sag),
          amplitude * sag * Math.sin(4 * Math.PI * u));
        if (i) length += points[i].distanceTo(points[i - 1]);
      }
      return length;
    }
    // 两端距离缩短多少，弯曲部分就多收进多少绳。
    let lo = 0, hi = span + slack;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (lay(mid) < span + slack) lo = mid;
      else hi = mid;
    }
    lay((hi + lo) / 2);
    for (let i = 0; i < count; i++) {
      direction.subVectors(points[i + 1], points[i]);
      segment.position.lerpVectors(points[i], points[i + 1], 0.5);
      segment.scale.y = direction.length();
      segment.quaternion.setFromUnitVectors(axis, direction.normalize());
      segment.updateMatrix();
      curved.setMatrixAt(i, segment.matrix);
    }
    curved.instanceMatrix.needsUpdate = true;
  };
}
