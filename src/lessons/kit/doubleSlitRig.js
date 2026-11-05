// 图 4.4-1 的光具座。沿 x 从灯到目镜；屏距以双缝片和毛玻璃所在平面为准。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { rulerMesh, textPlate } from './props.js';
import { measuringScrew } from './micrometerTool.js';
import { fringeScreen } from './fringeScreen.js';
import { SLIT_SEPARATIONS } from './doubleSlit.js';

export const AXIS = 0.117;
export const SINGLE_X = -0.332, DOUBLE_X = -0.29, SCREEN_X = 0.43, FILTER_X = -0.41;
function block(parent, x, y, z, w, h, d, color) {
  const part = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.6 });
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}
function ring(parent, x, radius, thickness, color) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 10, 64), paint(color));
  r.position.x = x;
  r.rotation.y = Math.PI / 2;
  parent.add(r);
  return r;
}
function slitCard(separation) {
  const card = new THREE.Group();
  const centers = separation ? [-separation / 2, separation / 2] : [0];
  let start = -0.023;
  for (const center of centers) {
    const edge = center - 0.0000225;
    block(card, 0, 0, (start + edge) / 2, 0.0008, 0.028, edge - start, 0x37434c);
    start = center + 0.0000225;
  }
  block(card, 0, 0, (start + 0.023) / 2, 0.0008, 0.028, 0.023 - start, 0x37434c);
  for (const sign of [-1, 1]) block(card, 0, sign * 0.018, 0, 0.003, 0.008, 0.046, 0x52606a);
  return card;
}
export function doubleSlitRig() {
  const group = new THREE.Group();
  block(group, -0.055, 0.02, 0, 1.12, 0.025, 0.065, 0x63717a);
  for (const x of [-0.54, 0.41]) block(group, x, 0.006, 0, 0.088, 0.012, 0.139, 0x494d55);
  function support(x, radius) {
    const base = AXIS - radius;
    block(group, x, 0.04, 0, 0.057, 0.016, 0.075, 0x3d4956);
    block(group, x, (base + 0.048) / 2, 0, 0.012, base - 0.048, 0.012, 0x97a4a7);
  }
  for (const [x, radius] of [[-0.575, 0.028], [-0.487, 0.029], [FILTER_X, 0.023],
    [SINGLE_X, 0.022], [DOUBLE_X, 0.022], [0.05, 0.031], [SCREEN_X, 0.032]]) support(x, radius);
  const lamp = new THREE.Group();
  lamp.position.set(-0.575, AXIS, 0);
  group.add(lamp);
  block(lamp, -0.012, 0, 0, 0.04, 0.056, 0.059, 0x45515b);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 24, 16), new THREE.MeshBasicMaterial({ color: 0xb3aca0 }));
  bulb.position.x = 0.013;
  lamp.add(bulb);
  // 底座的轴线用于低头粗调，再透过目镜检查光屏。
  block(group, -0.535, 0.0484, 0, 0.079, 0.0007, 0.0012, 0xdfc695);
  for (const x of [DOUBLE_X, SCREEN_X]) {
    block(group, x, 0.0405, 0.030, 0.001, 0.001, 0.029, 0xe1c390);
  }
  const power = block(group, -0.577, 0.051, 0.034, 0.034, 0.01, 0.019, 0x96634c);
  const optics = new THREE.Group();
  optics.position.y = AXIS;
  group.add(optics);
  ring(optics, -0.487, 0.029, 0.0026, 0x4b555d);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.028, 48, 24), paint(0xabced6, { transparent: true, opacity: 0.29 }));
  lens.scale.x = 0.18;
  lens.position.x = -0.487;
  optics.add(lens);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, SCREEN_X - DOUBLE_X - 0.016, 64, 1, true),
    paint(0x444d55, { side: THREE.DoubleSide }));
  tube.rotation.z = Math.PI / 2;
  tube.position.x = (SCREEN_X + DOUBLE_X) / 2 + 0.008;
  optics.add(tube);
  for (const x of [DOUBLE_X + 0.016, 0.05, SCREEN_X]) ring(optics, x, 0.032, 0.003, 0x839095);

  const head = new THREE.Group();
  head.rotation.y = Math.PI / 2;
  head.position.set(SCREEN_X, AXIS, 0);
  group.add(head);
  // 前盖开孔，目镜才能看到分划板，筒外看不到透过外壳的条纹。
  const frame = new THREE.Shape();
  frame.absarc(0, 0, 0.032, 0, 2 * Math.PI, false);
  const aperture = new THREE.Path();
  aperture.absarc(0, 0, 0.008, 0, 2 * Math.PI, true);
  frame.holes.push(aperture);
  head.add(new THREE.Mesh(new THREE.ShapeGeometry(frame, 64), paint(0x323940)));
  const scope = fringeScreen();
  head.add(scope.group);
  // 目镜放大同一分划板和毛玻璃的像。测量面的位置仍是 SCREEN_X。
  scope.group.position.z = 0.0181;
  scope.group.scale.setScalar(1.85);
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.018, 48, 1, true),
    paint(0x293138, { side: THREE.DoubleSide }));
  eyepiece.rotation.x = Math.PI / 2;
  eyepiece.position.z = 0.009;
  const opening = new THREE.Mesh(new THREE.CircleGeometry(0.015, 48), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
  opening.rotation.x = -Math.PI / 2;
  opening.position.y = 0.009;
  opening.userData.pick = true;
  eyepiece.add(opening);
  head.add(eyepiece);
  const screwFrame = new THREE.Group();
  screwFrame.position.set(0.023, 0, 0.004);
  head.add(screwFrame);
  const screw = measuringScrew(screwFrame);
  function turn(mm) {
    screw.setReading(mm);
    scope.move(mm);
  }
  const cards = [slitCard(0), ...SLIT_SEPARATIONS.map(slitCard)];
  for (const color of [0xa42c25, 0x2548ac]) {
    const filter = new THREE.Group();
    block(filter, 0, 0, 0, 0.002, 0.04, 0.044, color);
    block(filter, 0, -0.023, 0, 0.006, 0.007, 0.05, 0x45545b);
    cards.push(filter);
  }
  const labels = ['单缝', '0.36 mm', '0.18 mm', '红滤光片', '蓝滤光片'];
  const homes = cards.map((card, i) => {
    const x = -0.435 + i * 0.127, z = 0.127;
    block(group, x, 0.011, z, 0.053, 0.022, 0.068, 0xae9875);
    const pos = new THREE.Vector3(x, 0.044, z);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.059, 0.055), new THREE.MeshBasicMaterial({ visible: false }));
    handle.userData.pick = true;
    card.add(handle);
    card.position.copy(pos);
    group.add(card);
    const label = textPlate(labels[i], { w: 0.068, h: 0.019, bg: '#eee4cf' });
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, 0.002, z + 0.052);
    group.add(label);
    return pos;
  });
  const ruler = rulerMesh({ length: 4096 / 4080, width: 0.032, thick: 0.004, divisions: 1000, labelEvery: 50 });
  ruler.position.set(0.01, 0.003, -0.102);
  group.add(ruler);
  turn(8);
  return { group, cards, homes, lamp, bulb, power, head, eyepiece, ruler, scope, screw, screwFrame, turn };
}
