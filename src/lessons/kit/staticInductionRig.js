import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { textPlate } from './props.js';
export function staticInductionRig() {
  const group = new THREE.Group(),
    textures = [];
  function mesh(g, geo, color, x, y, z) {
    const o = inked(new THREE.Mesh(geo, paint(color)));
    o.position.set(x, y, z);
    g.add(o);
    return o;
  }
  function label(g, text, x, y, z, w = 0.055) {
    const p = textPlate(text, {
      w,
      h: 0.016,
      bg: '#efe5cd',
      font: `bold ${Math.floor(Math.min(((512 * 0.016) / w) * 0.72, 420 / Math.max(1, text.length)))}px sans-serif`,
    });
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    g.add(p);
    textures.push(p.material.map);
    return p;
  }
  const conductors = [0, 1].map((i) => {
    const g = new THREE.Group();
    group.add(g);
    mesh(g, new THREE.CylinderGeometry(0.025, 0.029, 0.008, 24), 0x727e7b, 0, 0.004, 0);
    const handle = mesh(g, new THREE.CylinderGeometry(0.005, 0.005, 0.105, 16), 0xb7d1cc, 0, 0.06, 0);
    const body = mesh(g, new THREE.CylinderGeometry(0.015, 0.015, 0.11, 24), 0xb4bbc0, 0, 0.13, 0);
    body.rotation.z = Math.PI / 2;
    // 两金属柱以平端面相接；箔片接在各自外端的下方，保持教材装置关系。
    const leaf = new THREE.Group();
    leaf.position.set(i ? 0.044 : -0.044, 0.116, 0);
    g.add(leaf);
    const foil = new THREE.Mesh(
      new THREE.PlaneGeometry(0.014, 0.041),
      new THREE.MeshLambertMaterial({ color: 0xd7ba78, side: THREE.DoubleSide }),
    );
    foil.position.y = -0.0205;
    leaf.add(foil);
    const name = label(g, i ? 'B' : 'A', 0, 0.13, 0.0155, 0.025);
    name.rotation.x = 0;
    label(g, '绝缘柱', 0, 0.009, 0.039, 0.065);
    const sign = label(g, '', 0, 0.155, -0.03, 0.038);
    sign.visible = false;
    return { group: g, handle, body, leaf, sign, angle: 0 };
  });
  const source = new THREE.Group();
  group.add(source);
  mesh(source, new THREE.SphereGeometry(0.014, 24, 16), 0xb4bbc0, 0, 0.13, 0);
  const stem = mesh(source, new THREE.CylinderGeometry(0.004, 0.004, 0.085, 12), 0xc4d5cb, -0.055, 0.13, 0);
  stem.rotation.z = Math.PI / 2;
  const sourceName = label(source, 'C ＋', 0, 0.157, 0, 0.048);
  sourceName.rotation.x = 0;
  const parking = label(group, 'C 放远处', -0.26, 0.002, 0.19, 0.1);
  let lastSigns = '';
  return {
    group,
    conductors,
    source,
    parking,
    draw(model, dt, showSigns = false) {
      source.position.set(model.source[0], 0, model.source[1]);
      const signs = model.net.map((q) => (Math.abs(q) < 0.015 ? '净电荷≈0' : q < 0 ? '净负' : '净正'));
      conductors.forEach((p, i) => {
        p.group.position.x = model.centers[i];
        const q = model.state.charges[i ? model.state.charges.length - 1 : 0];
        // 箔片角度作定性放大，不作为电荷量的测量标尺；同号斥力随 q² 增强。
        const target = Math.min(1.05, Math.atan(1300 * q * q));
        p.angle += (target - p.angle) * (1 - Math.exp(-dt * 12));
        p.leaf.rotation.z = (i ? 1 : -1) * p.angle;
        p.sign.visible = showSigns;
      });
      if (showSigns && signs.join() !== lastSigns) {
        lastSigns = signs.join();
        conductors.forEach((p, i) => {
          p.group.remove(p.sign);
          p.sign.material.map.dispose();
          p.sign.geometry.dispose();
          p.sign.material.dispose();
          p.sign = label(p.group, signs[i], 0, 0.166, -0.035, 0.085);
        });
      }
    },
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
