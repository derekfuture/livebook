import * as THREE from 'three';
import { labBase, paint } from '../../live/ink.js';
import { Circuit, psuPart, switchPart, lampPart } from './circuit.js';
import { inductorPart } from './inductorPart.js';
import { canvasTex, textPlate } from './props.js';

export const SLOT = new THREE.Vector3(-0.088, 0, 0.012);
export const PARKS = [new THREE.Vector3(0.226, 0, -0.087), new THREE.Vector3(0.226, 0, 0.078)];
export const COIL_COLOR = '#196d73', LAMP_COLOR = '#a14f26';

export function selfInductionOffRig() {
  const c = new Circuit({ showCurrent: false }), group = c.group;
  const root = new THREE.Group();
  root.add(group, labBase(0.68, 0.46));
  const textures = [];
  function label(parent, text, x, z, w, h = 0.025, color = '#384641') {
    const plate = textPlate(text, { w, h, color, font: '600 ' + Math.round(512 * h / w * 0.79) + 'px sans-serif' });
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(x, 0.009, z);
    parent.add(plate);
    textures.push(plate.material.map);
    return plate;
  }
  function pick(parent, w, h, d) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    box.position.y = h / 2;
    box.userData.pick = true;
    parent.add(box);
    return box;
  }
  function seat(pos) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.157, 0.003, 0.060), paint(0xb7b0a1));
    base.position.copy(pos);
    base.position.y = 0.0015;
    group.add(base);
  }
  // 固定的两个分支节点与图 2.4-3 一致。插座两端在取下线圈后仍然留在回路上。
  const left = -0.259, right = 0.087, junctionZ = -0.049;
  function contacts(name, x, z, terminals) {
    const part = { name, group: new THREE.Group(), terminals };
    for (const [px, py, pz] of Object.values(terminals)) {
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, py, 16), paint(0x807956));
      stud.position.set(px, py / 2, pz);
      part.group.add(stud);
    }
    c.add(part, [x, z]);
  }
  contacts('P', left, junctionZ, { t: [0, 0.018, 0] });
  contacts('Q', right, junctionZ, { t: [0, 0.018, 0] });
  contacts('L', SLOT.x, SLOT.z, { a: [-0.067, 0.02, 0.013], b: [0.067, 0.02, 0.013] });
  seat(SLOT);
  const lamp = c.add(lampPart('A', { rated: 4, Rhot: 100, fixedR: true }), [SLOT.x, -0.145]);
  lamp.group.scale.setScalar(1.65);
  const sw = c.add(switchPart('S'), [-0.012, 0.157]);
  sw.group.scale.setScalar(1.40);
  const switchPick = pick(sw.group, 0.071, 0.054, 0.037);
  c.add(psuPart('E', { U: 4 }), [-0.184, 0.157]);
  label(group, '灯泡 A', SLOT.x, -0.093, 0.072, 0.021, LAMP_COLOR);
  const coilLabels = ['线圈插座', '线圈 L · 50 Ω', '线圈 L · 150 Ω'].map(text =>
    label(group, text, SLOT.x, 0.066, 0.146, 0.021, COIL_COLOR));
  label(group, '电流方向（示意）', -0.232, -0.201, 0.17, 0.020);
  label(group, '备用线圈', PARKS[0].x, -0.185, 0.107);
  const switchLabels = ['S 断开', 'S 闭合'].map(s => label(group, s, -0.012, 0.203, 0.091));
  const coils = [50, 150].map((r, i) => {
    const coil = inductorPart('coil' + i, { resistance: r });
    coil.group.position.copy(i ? PARKS[i] : SLOT);
    seat(PARKS[i]);
    label(group, r + ' Ω', PARKS[i].x, PARKS[i].z + 0.052, 0.080, 0.021);
    group.add(coil.group);
    return { body: coil.group, pick: pick(coil.group, 0.153, 0.061, 0.057) };
  });

  const branch = 0x695d4b;
  const lampZ = -0.145 + 0.0165, coilZ = SLOT.z + 0.013;
  const wire = (a, b, points, color = branch) => c.wire(a, b, { points, color });
  wire('P.t', 'A.a', [[left, 0.019, lampZ], [left + 0.035, 0.024, lampZ], [-0.16, 0.030, lampZ]]);
  wire('A.b', 'Q.t', [[-0.010, 0.030, lampZ], [right - 0.032, 0.024, lampZ], [right, 0.019, lampZ]]);
  wire('P.t', 'L.a', [[left + 0.023, 0.018, coilZ], [-0.205, 0.020, coilZ]]);
  wire('L.b', 'Q.t', [[0.025, 0.020, coilZ], [right - 0.021, 0.018, coilZ]]);
  wire('E.+', 'P.t', [[-0.157, 0.063, 0.138], [-0.202, 0.035, 0.091], [left - 0.021, 0.014, 0.067]], 0xa34635);
  wire('E.-', 'S.a', [[-0.175, 0.055, 0.184], [-0.105, 0.023, 0.183]], 0x465453);
  wire('S.b', 'Q.t', [[0.052, 0.023, 0.157], [right + 0.023, 0.015, 0.12], [right + 0.024, 0.016, 0.023]], 0x465453);
  c.update(0);
  // 锥尖沿导线切线，正向都取从左节点到右节点。
  function arrow(index, u, color) {
    const curve = c.curves[index].curve;
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.021, 16), new THREE.MeshBasicMaterial({ color }));
    const tangent = curve.getTangentAt(u), up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Quaternion().setFromUnitVectors(up, tangent);
    const backward = new THREE.Quaternion().setFromUnitVectors(up, tangent.negate());
    mesh.position.copy(curve.getPointAt(u));
    mesh.position.y += 0.012;
    group.add(mesh);
    return current => {
      mesh.visible = Math.abs(current) > 0.0005;
      mesh.quaternion.copy(current >= 0 ? forward : backward);
    };
  }
  const lampArrows = [arrow(0, 0.75, LAMP_COLOR), arrow(1, 0.27, LAMP_COLOR)];
  const coilArrows = [arrow(2, 0.78, COIL_COLOR), arrow(3, 0.25, COIL_COLOR)];
  const glow = canvasTex(128, 128, g => {
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,249,187,1)');
    gradient.addColorStop(0.24, 'rgba(255,191,55,0.85)');
    gradient.addColorStop(0.52, 'rgba(254,169,37,0.45)');
    gradient.addColorStop(1, 'rgba(255,191,72,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  });
  textures.push(glow);
  const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, depthWrite: false, transparent: true }));
  light.position.set(0, 0.032, -0.004);
  lamp.group.add(light);
  return {
    root, group, coils, switchPick,
    draw(model) {
      const labelIndex = model.coilConnected ? (model.coilResistance === 50 ? 1 : 2) : 0;
      coilLabels.forEach((l, i) => { l.visible = i === labelIndex; });
      sw.closed = model.closed;
      sw.update(1);
      switchLabels.forEach((l, i) => { l.visible = i === Number(model.closed); });
      const brightness = model.lampResponse[0], state = model.observe();
      lamp.brightness = brightness;
      lamp.update(1);
      light.visible = brightness > 0.001;
      light.scale.setScalar(0.020 + 0.041 * brightness);
      light.material.opacity = Math.min(0.95, brightness * 0.85);
      lampArrows.forEach(draw => draw(state.otherCurrent));
      coilArrows.forEach(draw => draw(state.coilCurrent));
    },
    dispose() { for (const t of textures) t.dispose(); c.dispose(); },
  };
}
