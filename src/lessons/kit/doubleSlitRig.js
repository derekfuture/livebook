// 图 4.4-1 的光具座。沿 x 从灯到目镜；屏距以双缝片和毛玻璃所在平面为准。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { glowTexture, rulerMesh, textPlate } from './props.js';
import { measuringScrew } from './micrometerTool.js';
import { screwElevation } from './doubleSlitReadout.js';
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
  const housing = block(lamp, -0.012, 0, 0, 0.04, 0.056, 0.059, 0x45515b);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 24, 16), new THREE.MeshBasicMaterial({ color: 0xb3aca0 }));
  bulb.position.x = 0.017;
  lamp.add(bulb);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffbb4b, transparent: true, depthWrite: false }));
  glow.scale.setScalar(0.105);
  bulb.add(glow);
  // 底座的轴线用于低头粗调，再透过目镜检查光屏。
  block(group, -0.535, 0.0484, 0, 0.079, 0.0007, 0.0012, 0xdfc695);
  for (const x of [DOUBLE_X, SCREEN_X]) {
    block(group, x, 0.0405, 0.030, 0.001, 0.001, 0.029, 0xe1c390);
  }
  block(group, -0.577, 0.041, 0.063, 0.052, 0.017, 0.044, 0x42484a);
  const power = block(group, -0.577, 0.055, 0.063, 0.036, 0.012, 0.028, 0x976248);
  power.material = new THREE.MeshBasicMaterial();
  const optics = new THREE.Group();
  optics.position.y = AXIS;
  group.add(optics);
  for (const x of [SINGLE_X, DOUBLE_X, FILTER_X]) {
    for (const side of [-1, 1]) block(optics, x + side * 0.0033, -0.0215, 0, 0.004, 0.009, 0.052, 0x45515b);
  }
  ring(optics, -0.487, 0.029, 0.0026, 0x4b555d);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.028, 48, 24), paint(0xabced6, { transparent: true, opacity: 0.29 }));
  lens.scale.x = 0.18;
  lens.position.x = -0.487;
  optics.add(lens);
  const beams = [[0.009, 0.024], [0.024, 0.018], [0.018, 0.012]].map(([start, end]) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(end, start, 1, 40, 1, true), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.42, depthWrite: false }));
    group.add(mesh);
    return mesh;
  });
  const up = new THREE.Vector3(0, 1, 0);
  function illuminate(lit, filter) {
    const bulbX = lamp.position.x + bulb.position.x * Math.cos(lamp.rotation.y);
    const points = [bulbX, -0.487, FILTER_X, DOUBLE_X + 0.016].map(x =>
      new THREE.Vector3(x, lamp.position.y, -(x - lamp.position.x) * Math.tan(lamp.rotation.y)));
    beams.forEach((mesh, index) => {
      const delta = points[index + 1].clone().sub(points[index]);
      mesh.position.copy(points[index]).addScaledVector(delta, 0.5);
      mesh.scale.y = delta.length();
      mesh.quaternion.setFromUnitVectors(up, delta.normalize());
      mesh.material.color.set(index === 2 && filter ? (filter === 'red' ? 0xff4435 : 0x416efe) : 0xffdd85);
      mesh.visible = lit;
    });
    glow.visible = lit;
    bulb.material.color.set(lit ? 0xfff2af : 0x8a8882);
    power.material.color.set(lit ? 0xffc653 : 0x6e635a);
    power.rotation.z = lit ? 0.18 : -0.18;
  }

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
  frame.absarc(0, 0, 0.052, 0, 2 * Math.PI, false);
  const aperture = new THREE.Path();
  aperture.absarc(0, 0, 0.008, 0, 2 * Math.PI, true);
  frame.holes.push(aperture);
  head.add(new THREE.Mesh(new THREE.ShapeGeometry(frame, 64), paint(0x323940)));
  const scope = fringeScreen();
  head.add(scope.group);
  // 目镜放大同一分划板和毛玻璃的像。测量面的位置仍是 SCREEN_X。
  scope.group.position.z = 0.0181;
  scope.group.scale.setScalar(5.8);
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.018, 64, 1, true),
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
  screwFrame.position.set(0.055, 0, 0.004);
  head.add(screwFrame);
  const screw = measuringScrew(screwFrame);
  const elevation = screwElevation(screwFrame);
  function showReading(show, mm) {
    elevation.face.visible = show;
    screw.sleeve.visible = screw.drum.visible = !show;
    if (show) elevation.draw(mm);
  }
  function turn(mm) {
    screw.setReading(mm);
    scope.move(mm);
  }
  const cards = [slitCard(0), ...SLIT_SEPARATIONS.map(slitCard)];
  for (const color of [0xa42c25, 0x2548ac]) {
    const filter = new THREE.Group();
    const glass = block(filter, 0, 0, 0, 0.002, 0.04, 0.044, color);
    glass.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.76 });
    block(filter, 0, -0.023, 0, 0.006, 0.007, 0.05, 0x45545b);
    cards.push(filter);
  }
  const labels = ['单缝', '0.36 mm', '0.18 mm', '红滤光片', '蓝滤光片'];
  const homes = cards.map((card, i) => {
    const x = -0.435 + i * 0.18, z = 0.16;
    block(group, x, 0.011, z, 0.053, 0.022, 0.068, 0xae9875);
    const pos = new THREE.Vector3(x, 0.044, z);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.059, 0.055), new THREE.MeshBasicMaterial({ visible: false }));
    handle.userData.pick = true;
    card.add(handle);
    card.position.copy(pos);
    group.add(card);
    const label = textPlate(labels[i], { w: 0.136, h: 0.03, bg: '#eee4cf', font: 'bold 92px PingFang SC, sans-serif' });
    label.rotation.set(-0.65, 0.3, 0, 'YXZ');
    label.position.set(x, 0.014, z + 0.045);
    group.add(label);
    return pos;
  });
  const ruler = rulerMesh({ length: 4096 / 4080, width: 0.032, thick: 0.004, divisions: 1000, labelEvery: 50 });
  ruler.position.set(0.007, 0.005, 0.088);
  group.add(ruler);
  const indices = [DOUBLE_X, SCREEN_X].map(x => block(ruler, x - ruler.position.x, 0.003, -0.031, 0.0006, 0.002, 0.03, 0x873f2c));
  turn(8);
  return { group, cards, homes, lamp, housing, bulb, power, head, eyepiece, ruler, indices, scope, screw, screwFrame, turn, illuminate, showReading,
    dispose() { screw.dispose(); elevation.dispose(); } };
}

// 调灯时放大同一块毛玻璃；装片时画出片座与筒轴的位置关系。
export function drawAlignment(canvas, scope, single, double, narrow) {
  const g = canvas.getContext('2d');
  g.save();
  g.scale(canvas.width / 300, canvas.height / 112);
  g.clearRect(0, 0, 300, 112);
  g.font = '15px sans-serif';
  g.fillStyle = '#453f37';
  if (!single) {
    g.fillText('毛玻璃屏', 37, 59);
    g.translate(185, 56);
    g.beginPath(); g.arc(0, 0, 47, 0, 2 * Math.PI); g.fill(); g.clip();
    g.drawImage(scope.screen.material.map.canvas, -45, -45, 90, 90);
    g.strokeStyle = '#403b35'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-45, 0); g.lineTo(45, 0);
    g.moveTo(0, -45); g.lineTo(0, 45); g.stroke();
  } else {
    const seats = [[77, 48, true, '单缝'], [192, 63, double, '双缝']];
    for (const [x, y, loaded, label] of seats) {
      g.save();
      g.translate(x, y);
      g.transform(1, -0.24, 0, 1, 0, 0);
      if (loaded) {
        g.fillStyle = '#46545c'; g.fillRect(-21, -24, 42, 48);
        g.fillStyle = '#fff3d2';
        const gap = narrow ? 3 : 5;
        for (const z of label === '单缝' ? [0] : [-gap, gap]) g.fillRect(z - 1.3, -16, 2.6, 32);
      }
      g.fillStyle = '#78858a'; g.fillRect(-24, 21, 48, 6);
      g.restore();
      if (loaded) {
        g.fillStyle = '#453f37'; g.textAlign = 'center'; g.fillText(label, x, y - 33);
      }
    }
    g.setLineDash([4, 3]); g.strokeStyle = '#ba7848'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(18, 48 - 59 * 15 / 115); g.lineTo(263, 48 + 186 * 15 / 115); g.stroke();
    g.fillStyle = '#765134'; g.textAlign = 'left'; g.fillText('筒轴', 261, 78);
    g.font = '12px sans-serif'; g.fillText('缝片对正示意', 14, 106);
  }
  g.restore();
}
