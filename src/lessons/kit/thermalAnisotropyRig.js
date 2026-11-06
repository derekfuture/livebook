import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
import { block, wireGeometry } from './electronicsBench.js';
import { meltFraction } from './thermalAnisotropy.js';
export const THERMAL_LAYOUT = Object.freeze({
  centers: [-0.095, 0.095],
  plateY: 0.19,
  tipMax: 0.1895,
  tipMin: 0.105,
  side: 0.07,
});
export function thermalAnisotropyRig() {
  const group = new THREE.Group(),
    L = THERMAL_LAYOUT,
    textures = [];
  function cylinder(parent, r, h, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), paint(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function label(text, x, z, w = 0.13) {
    const m = textPlate(text, { w, h: 0.015, color: '#383b3b', bg: '#e4d9bd', font: 'bold 39px sans-serif' });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.0004, z);
    group.add(m);
  }
  const plates = L.centers.map((x, i) => {
    for (const a of [-1, 1])
      for (const b of [-1, 1]) cylinder(group, 0.0027, 0.1875, 0x81898b, x + a * 0.0375, 0.09375, b * 0.0375);
    for (const a of [-1, 1]) {
      block(group, 0.005, 0.002, 0.08, x + a * 0.0375, 0.1885, 0, 0x858e8a);
      block(group, 0.07, 0.002, 0.005, x, 0.1885, a * 0.0375, 0x858e8a);
    }
    const sheet = block(group, 0.07, 0.001, 0.07, x, 0.19, 0, i ? 0xa99c7e : 0xb8cbca);
    sheet.name = i ? 'mica-sheet' : 'glass-sheet';
    const tex = canvasTex(512, 512, () => {});
    textures.push(tex);
    const wax = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ map: tex }));
    wax.rotation.x = -Math.PI / 2;
    wax.position.set(x, 0.19055, 0);
    wax.name = i ? 'mica-wax' : 'glass-wax';
    group.add(wax);
    label(i ? '各向异性示意片' : '玻璃', x, -0.064);
    return { sheet, wax, texture: tex };
  });
  label('薄层石蜡 · 背面加热', 0, 0.085, 0.19);
  block(group, 0.3, 0.003, 0.055, 0, 0.0015, 0, 0xb8ada0);
  for (const z of [-0.022, 0.022]) block(group, 0.3, 0.004, 0.002, 0, 0.005, z, 0x92999b);
  const carriage = new THREE.Group();
  group.add(carriage);
  block(carriage, 0.04, 0.009, 0.045, 0, 0.009, 0, 0x58676b);
  cylinder(carriage, 0.0025, 0.128, 0x989fa1, 0, 0.078, -0.027);
  const heater = new THREE.Group();
  group.add(heater);
  heater.name = 'iron';
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0032, 0.016, 16), paint(0x8a7763));
  tip.position.y = -0.008;
  heater.add(tip);
  cylinder(heater, 0.004, 0.03, 0x949b9c, 0, -0.031, 0);
  const handle = cylinder(heater, 0.009, 0.045, 0x4e635e, 0, -0.0675, 0);
  handle.name = 'iron-handle';
  const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0014, 8, 24), paint(0x899494));
  clamp.rotation.x = Math.PI / 2;
  clamp.position.y = -0.0675;
  heater.add(clamp);
  const bridge = cylinder(heater, 0.002, 0.027, 0x899494, 0, -0.0675, -0.0135);
  bridge.rotation.x = Math.PI / 2;
  const power = block(group, 0.072, 0.026, 0.052, 0.135, 0.013, 0.123, 0x667b78);
  const button = block(group, 0.025, 0.006, 0.018, 0.135, 0.029, 0.126, 0x48534e);
  button.name = 'heater-power';
  label('电源', 0.135, 0.164, 0.06);
  const legend = textPlate('20 W', { w: 0.05, h: 0.013, color: '#f6f0db', font: 'bold 85px sans-serif' });
  legend.position.set(0.135, 0.014, 0.1495);
  group.add(legend);
  const lead = new THREE.Mesh(new THREE.BufferGeometry(), paint(0x4f5854));
  lead.raycast = () => {};
  group.add(lead);
  function move(x, y) {
    heater.position.set(x, y, 0);
    carriage.position.x = x;
    lead.geometry.dispose();
    lead.geometry = wireGeometry(
      [
        [x, y - 0.09, 0],
        [x + 0.018, 0.014, 0.037],
        [x + 0.025, 0.01, 0.058],
        [0.16, 0.01, 0.075],
        [0.17, 0.01, 0.123],
      ],
      0.0015,
    );
  }
  const grid = document.createElement('canvas');
  grid.width = grid.height = 65;
  function draw(model) {
    button.material.color.setHex(model.on ? 0x9b5b40 : 0x48534e);
    const hot = Math.max(0, Math.min(1, (model.iron - 60) / 190));
    tip.material.color.setRGB(0.52 + 0.32 * hot, 0.46 + 0.05 * hot, 0.38 - 0.13 * hot);
    if (grid.width !== model.p.n) grid.width = grid.height = model.p.n;
    const c = grid.getContext('2d'),
      pixels = c.createImageData(model.p.n, model.p.n);
    model.plates.forEach((s, k) => {
      for (let j = 0; j < s.T.length; j++) {
        const f = meltFraction(s.T[j], model.p),
          base = k ? [128, 116, 87] : [114, 139, 137];
        for (let a = 0; a < 3; a++) pixels.data[4 * j + a] = Math.round([236, 232, 217][a] * (1 - f) + base[a] * f);
        pixels.data[4 * j + 3] = 255;
      }
      c.putImageData(pixels, 0, 0);
      const ctx = plates[k].texture.canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(grid, 0, 0, 512, 512);
      ctx.fillStyle = '#665c4a';
      ctx.beginPath();
      ctx.arc(256, 256, 3, 0, 2 * Math.PI);
      ctx.fill();
      plates[k].texture.needsUpdate = true;
    });
  }
  move(0, L.tipMin);
  return {
    group,
    plates,
    heater,
    handle,
    button,
    tip,
    carriage,
    move,
    draw,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
