import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';

export const CAPACITOR_THROW = 0.6;
const ARM = 0.047;
function partTools() {
  const group = new THREE.Group(),
    textures = [];
  function block(parent, w, h, d, x, y, z, color) {
    const obj = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.8 });
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  }
  function peg(parent, x, y, z, color) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0045, 0.009, 18), paint(color));
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  }
  function plate(parent, w, d, x, y, z, tex) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, y, z);
    parent.add(plane);
    textures.push(tex);
    return plane;
  }
  function caption(parent, text, x, y, z, w) {
    return plate(
      parent,
      w,
      0.008,
      x,
      y,
      z,
      canvasTex(512, 128, (c, W, H) => {
        c.fillStyle = '#e4dec7';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#273c3d';
        c.font = 'bold 86px sans-serif';
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillText(text, W / 2, H / 2);
      }),
    );
  }
  function badge(parent, text, x, y, z, w, d) {
    return plate(
      parent,
      w,
      d,
      x,
      y,
      z,
      canvasTex(512, Math.round((512 * d) / w), (c, W, H) => {
        c.fillStyle = '#e4dec7';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#273c3d';
        c.font = `bold ${Math.floor(H * 0.78)}px sans-serif`;
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillText(text, W / 2, H / 2, W * 0.9);
      }),
    );
  }
  return {
    group,
    block,
    peg,
    plate,
    caption,
    badge,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}

export function capacitorSelector(name = '') {
  const kit = partTools(),
    { group: sw, block, peg, caption, badge } = kit;
  block(sw, 0.081, 0.007, 0.071, 0, 0.0035, -0.004, 0xcfc6af);
  const pivotZ = 0.02,
    hinge = peg(sw, 0, 0.012, pivotZ, 0x7b7560);
  const throws = [1, 2].map((id) => {
    const q = id === 1 ? -CAPACITOR_THROW : CAPACITOR_THROW,
      x = ARM * Math.sin(q),
      z = pivotZ - ARM * Math.cos(q);
    const p = peg(sw, x, 0.012, z, 0x8c7855);
    caption(sw, String(id), x, 0.0073, z + 0.012, 0.01);
    return p;
  });
  const blade = new THREE.Group();
  blade.position.set(0, 0.018, pivotZ);
  sw.add(blade);
  block(blade, 0.006, 0.0028, ARM, 0, 0, -ARM / 2, 0xa5a3a0);
  const handle = peg(blade, 0, 0.006, -ARM + 0.005, 0x393f44);
  if (name) badge(sw, name, -0.027, 0.0073, 0.023, 0.02, 0.01);
  return {
    group: sw,
    hinge,
    throws,
    blade,
    handle,
    throwAngle: CAPACITOR_THROW,
    setAngle(q) {
      blade.rotation.y = -q;
    },
    dispose: kit.dispose,
  };
}

export function capacitorBody(name = '') {
  const kit = partTools(),
    { group: cap, block, peg, caption, badge } = kit;
  block(cap, 0.062, 0.006, 0.043, 0, 0.003, 0, 0xe6dfcf);
  const positive = peg(cap, -0.022, 0.011, -0.002, 0xac4837),
    negative = peg(cap, 0.022, 0.011, -0.002, 0x374149);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 32), paint(0x416a68));
  can.position.set(0, 0.025, 0);
  cap.add(can);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.0008, 32), paint(0xabb6ad));
  lid.position.set(0, 0.043, 0);
  cap.add(lid);
  for (const sign of [-1, 1]) {
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.019, 12), paint(0x909b98));
    lead.rotation.z = Math.PI / 2;
    lead.position.set(sign * 0.014, 0.01, -0.002);
    cap.add(lead);
  }
  caption(cap, '+  2200 μF  −', 0, 0.0063, 0.015, 0.056);
  if (name) badge(cap, name, 0, 0.0436, 0, 0.012, 0.012);
  return { group: cap, positive, negative, dispose: kit.dispose };
}

export function capacitorVoltmeter(name = '') {
  const kit = partTools(),
    { group: digital, block, peg, plate, badge } = kit;
  block(digital, 0.062, 0.015, 0.046, 0, 0.0075, 0, 0x67746f);
  const screenTex = canvasTex(512, 200, () => {});
  const screen = plate(digital, 0.054, 0.025, 0, 0.0153, -0.006, screenTex);
  const vPos = peg(digital, -0.02, 0.014, 0.017, 0xa44538),
    vNeg = peg(digital, 0.02, 0.014, 0.017, 0x323b40);
  if (name) badge(digital, name, 0, 0.0154, 0.017, 0.012, 0.009);
  let digits;
  return {
    group: digital,
    screen,
    positive: vPos,
    negative: vNeg,
    get digits() {
      return digits;
    },
    draw(voltage) {
      const next = voltage.toFixed(2);
      if (next === digits) return;
      digits = next;
      const c = screenTex.canvas.getContext('2d');
      c.fillStyle = '#bdcbb1';
      c.fillRect(0, 0, 512, 200);
      c.fillStyle = '#293e36';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = 'bold 106px monospace';
      c.fillText(digits + ' V', 256, 100);
      screenTex.needsUpdate = true;
    },
    dispose: kit.dispose,
  };
}

// Same insulated base, posts and black grip as the selector; one knife rises
// about its hinge, and only the lowered blade seats on the far contact.
export function capacitorDischargeSwitch() {
  const kit = partTools(),
    { group, block, peg, badge } = kit;
  block(group, 0.07, 0.007, 0.04, 0, 0.0035, 0, 0xcfc6af);
  const hinge = peg(group, -0.024, 0.0135, 0, 0x7b7560),
    contact = peg(group, 0.024, 0.014, 0, 0x8c7855);
  const blade = new THREE.Group();
  blade.position.set(-0.024, 0.018, 0);
  group.add(blade);
  block(blade, 0.048, 0.0028, 0.006, 0.024, 0, 0, 0xa5a3a0);
  const handle = peg(blade, 0.041, 0.007, 0, 0x393f44);
  badge(group, 'S₂', 0, 0.0073, 0.014, 0.02, 0.01);
  const openAngle = Math.PI / 3;
  return {
    group,
    hinge,
    contact,
    blade,
    handle,
    openAngle,
    setAngle(a) {
      blade.rotation.z = a;
    },
    dispose: kit.dispose,
  };
}
