// 衔铁夹在常闭和常开触点之间，线圈吸合时拉向下方触点。
import * as THREE from 'three';
import { paint, inked, hull } from '../../live/ink.js';
export function relayMechanism() {
  const relG = new THREE.Group();
  const baseR = inked(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.07), paint(0x2f4f8a)), { width: 1.2 });
  baseR.position.y = 0.003;
  const core = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.035, 18), paint(0x9aa3b2)), 0.001);
  core.position.set(-0.005, 0.024, 0);
  const cw = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.028, 20), paint(0xc8743a)), 0.001);
  cw.position.set(-0.005, 0.022, 0);
  const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.016), paint(0xc9b38a)), { width: 1 });
  post.position.set(-0.04, 0.028, 0);
  const armG = new THREE.Group();
  armG.position.set(-0.04, 0.05, 0);
  const armM = inked(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.004, 0.014), paint(0xc9b38a)), { width: 1 });
  armM.position.x = 0.042;
  const contactB = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), paint(0x23293a));
  contactB.position.x = 0.078;
  armG.add(armM, contactB);
  const spring = new THREE.Mesh(new THREE.TorusKnotGeometry(0.004, 0.0008, 40, 6, 1, 8), paint(0x8f99a8));
  spring.position.set(-0.05, 0.035, 0);
  spring.scale.set(1, 2.5, 1);
  const cA = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), paint(0x23293a));
  cA.position.set(0.038, 0.058, 0);
  const cC = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), paint(0x23293a));
  cC.position.set(0.038, 0.04, 0);
  relG.add(baseR, core, cw, post, armG, spring, cA, cC);
  return { group: relG, arm: armG };
}
