import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { Circuit } from './circuit.js';
import { multimeterTool } from './multimeterTool.js';
import { block, wire } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
import { SHADE_PALM, SHADE_FINGERS } from './photoresistor.js';
export const PHOTO_POS = [0.085, -0.075],
  REGULAR_POS = [0.085, 0.075];
export const HAND_HOME = [0.205, 0.07, 0.12],
  PAPER_HOME = [-0.02, 0.004, 0.145];
export function photoresistorRig() {
  const circuit = new Circuit(),
    group = circuit.group;
  block(group, 0.54, 0.006, 0.38, 0, -0.003, 0, 0xc8ac80);
  const meter = circuit.add(multimeterTool(), [-0.155, -0.015]);
  function label(text, x, z, w = 0.08) {
    const m = textPlate(text, {
      w,
      h: 0.014,
      bg: '#e9d9b7',
      font: `bold ${Math.min(430 / [...text].length, (0.014 / w) * 400)}px sans-serif`,
    });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.001, z);
    group.add(m);
  }
  const texture = canvasTex(256, 256, (g) => {
    g.fillStyle = '#ba8c59';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#d9d7b9';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(33, 43);
    g.lineTo(33, 211);
    g.moveTo(223, 43);
    g.lineTo(223, 211);
    for (let i = 0; i < 5; i++) {
      g.moveTo(33, 45 + i * 40);
      g.lineTo(183, 45 + i * 40);
    }
    for (let i = 0; i < 4; i++) {
      g.moveTo(223, 65 + i * 40);
      g.lineTo(73, 65 + i * 40);
    }
    g.stroke();
  });
  function specimen(name, position, isPhoto) {
    const root = new THREE.Group();
    block(root, 0.07, 0.006, 0.042, 0, 0.003, 0, 0x66756b);
    for (const sign of [-1, 1]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.009, 16), paint(0xb5b2a1));
      pin.position.set(sign * 0.027, 0.01, 0);
      root.add(pin);
      wire(
        root,
        [
          [sign * 0.027, 0.013, 0],
          [sign * 0.017, 0.013, 0],
          [sign * 0.01, 0.02, 0],
        ],
        0xb8baad,
        0.0008,
      );
    }
    let face, window;
    if (isPhoto) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.003, 40), paint(0xc5b48a));
      body.position.y = 0.0185;
      root.add(body);
      face = new THREE.Mesh(new THREE.CircleGeometry(0.01, 40), new THREE.MeshLambertMaterial({ map: texture }));
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.0201;
      face.receiveShadow = true;
      root.add(face);
    } else {
      face = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.024, 24), paint(0xb9a274));
      face.rotation.z = Math.PI / 2;
      face.position.y = 0.02;
      root.add(face);
      // 去除上表面的漆窗，保留同一电阻体和两根原引线。
      window = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.006), paint(0x4d4941));
      window.rotation.x = -Math.PI / 2;
      window.position.y = 0.0251;
      window.visible = false;
      root.add(window);
    }
    const part = {
      name,
      group: root,
      terminals: { a: [-0.027, 0.0145, 0], b: [0.027, 0.0145, 0] },
      R: isPhoto ? 1800 : 2000,
      branches() {
        return [{ a: 'a', b: 'b', R: this.R }];
      },
      face,
      window,
    };
    circuit.add(part, position);
    return part;
  }
  const photo = specimen('P', PHOTO_POS, true),
    regular = specimen('R', REGULAR_POS, false);
  label('光敏电阻', PHOTO_POS[0], PHOTO_POS[1] + 0.035);
  label('普通电阻', REGULAR_POS[0], REGULAR_POS[1] + 0.035);
  const hand = new THREE.Group();
  hand.position.set(...HAND_HOME);
  group.add(hand);
  const skin = paint(0xd6a578);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skin);
  palm.scale.set(SHADE_PALM.rx, 0.007, SHADE_PALM.rz);
  palm.position.y = 0.007;
  hand.add(palm);
  palm.castShadow = true;
  for (const f of SHADE_FINGERS) {
    const a = new THREE.Vector3(f.x1, 0.007, f.z1),
      b = new THREE.Vector3(f.x2, 0.007, f.z2);
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r, a.distanceTo(b), 16), skin);
    finger.position.copy(a).add(b).multiplyScalar(0.5);
    finger.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    hand.add(finger);
    finger.castShadow = true;
    for (const p of [a, b]) {
      const end = new THREE.Mesh(new THREE.SphereGeometry(f.r, 16, 10), skin);
      end.position.copy(p);
      hand.add(end);
      end.castShadow = true;
    }
  }
  label('遮光手', 0.21, 0.173, 0.065);
  const sandpaper = new THREE.Group();
  sandpaper.position.set(...PAPER_HOME);
  group.add(sandpaper);
  block(sandpaper, 0.043, 0.004, 0.028, 0, 0, 0, 0x96764c);
  block(sandpaper, 0.026, 0.012, 0.018, 0, 0.008, 0, 0xb79e76);
  label('细砂纸', -0.02, 0.178, 0.065);
  const lamp = new THREE.Group();
  lamp.position.set(PHOTO_POS[0], 0, PHOTO_POS[1]);
  group.add(lamp);
  const lampBase = block(lamp, 0.052, 0.012, 0.044, 0, 0.006, -0.07, 0x586963);
  block(lamp, 0.008, 0.157, 0.008, 0, 0.085, -0.07, 0x8d9691);
  block(lamp, 0.009, 0.009, 0.076, 0, 0.168, -0.034, 0x8d9691);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.025, 32), paint(0x64736b));
  head.position.y = 0.165;
  lamp.add(head);
  const emitter = new THREE.Mesh(new THREE.CircleGeometry(0.024, 32), new THREE.MeshBasicMaterial({ color: 0xd7d3bd }));
  emitter.rotation.x = Math.PI / 2;
  emitter.position.y = 0.1524;
  lamp.add(emitter);
  // 可见照射仍来自原灯头。显示亮度仅用于辨认光照范围，不作为照度计。
  const beam = new THREE.SpotLight(0xfff3d4, 0.04, 0, 0.65, 0.8, 2);
  beam.position.set(0, 0.1515, 0);
  const target = new THREE.Object3D();
  lamp.add(target, beam);
  beam.target = target;
  beam.visible = false;
  beam.castShadow = true;
  beam.shadow.mapSize.set(512, 512);
  beam.shadow.camera.near = 0.002;
  const lightScale = new THREE.Vector3();
  function updateLight() {
    const s = group.getWorldScale(lightScale).x;
    beam.intensity = 0.04 * s * s;
  }
  const power = block(lamp, 0.014, 0.005, 0.014, 0.016, 0.014, -0.07, 0xb66c4d);
  label('强光源', 0.085, -0.185, 0.08);
  function expose(fraction) {
    const f = Math.max(0, Math.min(1, fraction));
    regular.window.visible = f > 0;
    regular.window.scale.x = Math.max(0.001, f);
  }
  function illuminate(on) {
    beam.visible = on;
    emitter.material.color.setHex(on ? 0xfff5c5 : 0x999c91);
    power.rotation.z = on ? -0.18 : 0;
  }
  function sensorPoint(part) {
    return { x: part.group.position.x, y: 0.02, z: part.group.position.z };
  }
  function dispose() {
    beam.dispose();
    meter.dispose();
    circuit.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
        materials.add(m);
        if (m.map) textures.add(m.map);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }
  return {
    group,
    circuit,
    meter,
    photo,
    regular,
    hand,
    sandpaper,
    lamp,
    lampBase,
    power,
    emitter,
    expose,
    illuminate,
    updateLight,
    sensorPoint,
    dispose,
  };
}
