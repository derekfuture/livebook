import * as THREE from 'three';
import { paint, inked } from '../../../live/ink.js';
import { PERIOD } from './motion.js';

// 纸带从两条导轨之间穿过。坐标原点在底座下表面的中心。
export const SLOT_Y = 0.044;
export function tickerHead() {
  const group = new THREE.Group(),
    metal = 0x53616b;
  function box(w, h, d, x, y, z, color, outline = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color));
    if (outline) inked(mesh, { width: 0.85 });
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  function cylinder(r, h, x, y, z, color, alongZ = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), paint(color));
    if (alongZ) mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  box(0.077, 0.039, 0.072, 0, 0.0195, 0, 0x394b57, true);
  for (const z of [-0.024, 0.024]) box(0.05, 0.015, 0.009, 0, SLOT_Y + 0.003, z, metal);
  box(0.034, 0.011, 0.055, 0, SLOT_Y + 0.014, 0, 0x366a70, true);
  const striker = cylinder(0.003, 0.009, 0, SLOT_Y + 0.006, 0, 0x34414a);
  const light = cylinder(0.004, 0.002, 0.007, SLOT_Y + 0.021, 0, 0xa64836);
  light.material = light.material.clone();
  cylinder(0.008, 0.028, -0.019, SLOT_Y + 0.012, 0, 0x97522c, true);
  for (let i = -3; i <= 3; i++) cylinder(0.0085, 0.0012, -0.019, SLOT_Y + 0.012, i * 0.0035, 0xc07844, true);
  box(0.025, 0.002, 0.006, -0.009, SLOT_Y + 0.013, 0, metal);
  return {
    group,
    update(on, t) {
      light.material.color.setHex(on ? 0xe5653d : 0x5b4138);
      striker.position.y = SLOT_Y + 0.006 + (on ? 0.0015 * Math.sin((t / PERIOD) * 2 * Math.PI) : 0);
    },
  };
}
