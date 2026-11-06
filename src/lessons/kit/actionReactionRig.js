import * as THREE from 'three';
import { forceMeter } from './forcemeter.js';
import { paint, inked } from '../../live/ink.js';
import { textPlate } from './props.js';
import { pairedMeters } from './actionReaction.js';

// 复用初中板式测力计，刻度、弹簧、指针和挂钩随同一物理读数移动。
export function actionReactionRig() {
  const group = new THREE.Group(),
    textures = [];
  const meters = ['B', 'A'].map((name) => {
    const meter = forceMeter();
    meter.ring.visible = false; // 用同形的水平提环作为实际拖动处，避免两环叠在一起。
    group.add(meter);
    const label = textPlate(name, { w: 0.018, h: 0.012, bg: '#efe5cd', font: 'bold 230px sans-serif' });
    label.position.set(0.014, -0.018, 0.012);
    meter.add(label);
    textures.push(label.material.map);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 8, 24), paint(0x697b7b));
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    pick.userData.pick = true;
    handle.add(pick);
    handle.rotation.x = -Math.PI / 2;
    group.add(handle);
    return { meter, handle };
  });
  const pin = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.036, 12), paint(0x697b7b)));
  group.add(pin);
  const pinHead = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 16), paint(0xaa794e)));
  pinHead.position.y = 0.02;
  pin.add(pinHead);
  const pinPick = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pinPick.position.y = 0.02;
  pinPick.userData.pick = true;
  pin.add(pinPick);
  const rest = meters.map((m) => -m.meter.hookEnd);
  function orient(m, handle, joint) {
    const dx = handle.x - joint.x,
      dz = handle.z - joint.z,
      len = Math.hypot(dx, dz),
      x = dx / len,
      z = dz / len;
    m.meter.position.set(handle.x, 0.024, handle.z);
    m.handle.position.set(handle.x, 0.024, handle.z);
    m.meter.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(-z, 0, x),
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(0, 1, 0),
      ),
    );
  }
  return {
    group,
    meters,
    pin,
    rest,
    draw(handles, { connected = true, fixed = 0 } = {}) {
      const state = connected ? pairedMeters(handles, { rest }) : null;
      meters.forEach((m, i) => {
        m.meter.set(state?.force || 0);
        orient(m, handles[i], state?.joint || { x: handles[i].x + (i ? -rest[i] : rest[i]), z: handles[i].z });
      });
      pin.visible = fixed !== null;
      if (fixed !== null) pin.position.set(handles[fixed].x, 0.018, handles[fixed].z);
      return state;
    },
    dispose() {
      textures.forEach((t) => t.dispose());
      meters.forEach(({ meter }) =>
        meter.traverse((o) => {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m?.map?.dispose());
        }),
      );
    },
  };
}
