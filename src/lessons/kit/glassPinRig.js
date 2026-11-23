import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { protractorTexture } from './protractor.js';
import { glassBrick, PIN_HEIGHT, HEAD_RADIUS, SHAFT_RADIUS } from './glassBrick.js';
import { SLAB_THICKNESS } from './glassSlab.js';

const names = 'ABCD',
  colors = [0xa45242, 0x42657e, 0x79935b, 0xbb853f];
const W = 0.36,
  D = 0.34;
export const PAPER_Y = 0.008,
  EYE_Z = 0.195,
  PIN_HOME_X = -0.212;
export function glassPinRig() {
  const group = new THREE.Group(),
    work = new THREE.Group(),
    extras = [];
  group.add(work);
  work.position.y = PAPER_Y;
  const box = (w, h, d, c) => inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(c)), { width: 0.65 });
  const board = box(W + 0.012, 0.008, D + 0.012, 0xbd9568);
  board.position.y = -0.004;
  work.add(board);
  const sheetTex = canvasTex(1536, Math.round((1536 * D) / W), () => {});
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: sheetTex }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = 0.0001;
  work.add(sheet);
  const rack = box(0.032, 0.014, 0.32, 0x987657);
  rack.position.set(PIN_HOME_X, -0.001, 0);
  work.add(rack);
  const pins = colors.map((color, i) => {
    const p = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, PIN_HEIGHT, 12), paint(0x5d696c));
    rod.position.y = PIN_HEIGHT / 2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 24, 16), new THREE.MeshBasicMaterial({ color }));
    head.position.y = PIN_HEIGHT;
    p.add(rod, head);
    const pick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.006, PIN_HEIGHT + 0.012, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    pick.position.y = PIN_HEIGHT / 2;
    pick.userData.pick = true;
    p.add(pick);
    work.add(p);
    return p;
  });
  const homes = [-0.131, -0.072, 0.071, 0.13].map((z) => new THREE.Vector3(PIN_HOME_X, 0.006, z));
  function engraving(parent, text, w, h, x, y, z) {
    const tex = canvasTex(256, 100, (ctx, W, H) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#2d3837';
      ctx.font = 'bold 80px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, W / 2, H / 2);
    });
    extras.push(tex);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(x, y, z);
    parent.add(plate);
  }
  homes.forEach((p, i) => engraving(work, names[i], 0.026, 0.014, p.x, 0.0063, p.z + 0.015));
  const brick = glassBrick(pins, colors);
  work.add(brick);
  const eye = new THREE.Group();
  work.add(eye);
  const rail = box(0.35, 0.004, 0.01, 0xb7aaaa);
  rail.position.set(0, -0.003, EYE_Z);
  work.add(rail);
  const knob = box(0.026, 0.009, 0.02, 0x50716f);
  eye.add(knob);
  engraving(eye, '观察', 0.026, 0.012, 0, 0.0048, 0);
  eye.position.set(0.025, 0.002, EYE_Z);
  const dock = box(0.094, 0.004, 0.11, 0xb39a77);
  dock.position.set(0.23, -0.006, 0.001);
  work.add(dock);
  const protTex = protractorTexture(true),
    prot = new THREE.Mesh(
      new THREE.CircleGeometry(0.064, 80),
      new THREE.MeshBasicMaterial({ map: protTex, transparent: true, depthWrite: false }),
    );
  extras.push(protTex);
  prot.rotation.x = -Math.PI / 2;
  prot.position.set(0.224, 0.002, 0.105);
  work.add(prot);
  const c = sheetTex.canvas.getContext('2d'),
    cw = sheetTex.canvas.width,
    ch = sheetTex.canvas.height;
  const x = (n) => (n / W + 0.5) * cw,
    z = (n) => (n / D + 0.5) * ch;
  function draw({ edges, holes, lines, normal, previous = [] }) {
    c.fillStyle = '#fcf4df';
    c.fillRect(0, 0, cw, ch);
    function line(a, b, color, dashed = false) {
      c.strokeStyle = color;
      c.lineWidth = 2.4;
      c.setLineDash(dashed ? [12, 9] : []);
      c.beginPath();
      c.moveTo(x(a.x), z(a.z));
      c.lineTo(x(b.x), z(b.z));
      c.stroke();
      c.setLineDash([]);
    }
    for (const old of previous) {
      for (const [a, b] of old.lines) line(a, b, '#c2bbb0');
      for (const pin of old.holes) {
        c.fillStyle = '#b3ab9e';
        c.beginPath();
        c.arc(x(pin.x), z(pin.z), 3, 0, 2 * Math.PI);
        c.fill();
      }
    }
    edges.forEach((range, i) => {
      if (!range) return;
      const zz = (i - 0.5) * SLAB_THICKNESS;
      line({ x: range[0], z: zz }, { x: range[1], z: zz }, '#5c6059');
    });
    for (const [a, b] of lines) line(a, b, '#994b3c');
    if (normal !== null) {
      for (const [i, label] of ['O', 'O′'].entries()) {
        const p = lines[i][1];
        c.fillStyle = '#544438';
        c.font = '23px serif';
        c.textAlign = 'left';
        c.fillText(label, x(p.x) + 10, z(p.z) - 9);
      }
    }
    if (normal !== null) line({ x: normal, z: -0.147 }, { x: normal, z: 0.093 }, '#696a61', true);
    holes.forEach((p, i) => {
      if (!p) return;
      c.fillStyle = '#3c3c36';
      c.beginPath();
      c.arc(x(p.x), z(p.z), 4, 0, 2 * Math.PI);
      c.fill();
      c.fillStyle = '#393b36';
      c.font = '25px serif';
      c.textAlign = 'left';
      c.fillText(names[i], x(p.x) + 10, z(p.z) - 7);
    });
    sheetTex.needsUpdate = true;
  }
  function reset() {
    pins.forEach((p, i) => {
      p.visible = true;
      p.position.copy(homes[i]);
    });
    brick.position.x = 0;
    eye.position.x = 0.025;
    prot.position.set(0.224, 0.002, 0.105);
    prot.rotation.set(-Math.PI / 2, 0, 0);
  }
  reset();
  return {
    group,
    work,
    pins,
    homes,
    brick,
    eye,
    prot,
    sheet,
    draw,
    reset,
    dispose() {
      sheetTex.dispose();
      extras.forEach((t) => t.dispose());
      brick.material.dispose();
    },
  };
}
