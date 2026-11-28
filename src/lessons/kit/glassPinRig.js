import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex, woodBlock } from './props.js';
import { protractorTexture } from './protractor.js';
import { glassBrick, PIN_HEIGHT, HEAD_RADIUS, SHAFT_RADIUS } from './glassBrick.js';
import { SLAB_THICKNESS, SLAB_WIDTH } from './glassSlab.js';

const names = 'ABCD',
  colors = [0xa45242, 0x42657e, 0x79935b, 0xbb853f];
const W = 0.36,
  D = 0.34;
export const PAPER_Y = 0.008,
  EYE_Z = 0.195,
  PIN_HOME_X = -0.211,
  DOCK_X = 0.282,
  RADIUS = 0.064;
export function glassPinRig() {
  const group = new THREE.Group(),
    work = new THREE.Group(),
    extras = [];
  group.add(work);
  work.position.set(-0.073, PAPER_Y, 0);
  const box = (w, h, d, c) => inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(c)), { width: 0.65 });
  const board = woodBlock(0.627, 0.008, 0.416, { color: 0xffedd3 });
  board.position.set(0.073, -0.004, 0.014);
  work.add(board);
  const sheetTex = canvasTex(1536, Math.round((1536 * D) / W), () => {});
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: sheetTex }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = 0.0001;
  work.add(sheet);
  const rack = box(0.032, 0.006, 0.32, 0x987657);
  rack.position.set(PIN_HOME_X, 0.003, 0);
  work.add(rack);
  const pins = colors.map((color, i) => {
    const p = new THREE.Group();
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, PIN_HEIGHT, 12),
      paint(0x5d696c),
    );
    rod.position.y = PIN_HEIGHT / 2;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS, 24, 16),
      new THREE.MeshBasicMaterial({ color }),
    );
    head.position.y = PIN_HEIGHT;
    p.add(rod, head);
    const pick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.009, PIN_HEIGHT + 0.012, 12),
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
  homes.forEach((p, i) => engraving(work, names[i], 0.032, 0.018, p.x, 0.0063, p.z + 0.016));
  const brick = glassBrick(pins, colors);
  // 描边从底面两端起笔，给纸边留出手指和鼠标可落下的宽度。
  const edgePick = new THREE.Mesh(
    new THREE.BoxGeometry(SLAB_WIDTH + 0.018, 0.004, SLAB_THICKNESS + 0.02),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  edgePick.position.y = -brick.position.y + 0.002;
  edgePick.userData.pick = true;
  brick.add(edgePick);
  work.add(brick);
  const eye = new THREE.Group();
  work.add(eye);
  const rail = box(0.35, 0.004, 0.01, 0xb7aaaa);
  rail.position.set(0, 0.002, EYE_Z);
  work.add(rail);
  const knob = box(0.041, 0.009, 0.022, 0x50716f);
  eye.add(knob);
  engraving(eye, '观察', 0.04, 0.016, 0, 0.0048, 0);
  eye.position.set(0.025, 0.0085, EYE_Z);
  const dock = box(0.198, 0.002, 0.071, 0xaa8864);
  dock.position.set(DOCK_X, 0.001, 0);
  work.add(dock);
  const protTex = protractorTexture(true);
  const scale = protTex.canvas.getContext('2d'),
    mid = protTex.canvas.width / 2;
  // 数字下面留一小块浅底，纸上的实线和法线穿过量角器时仍然能读清数字。
  scale.font = 'bold 30px sans-serif';
  scale.textAlign = 'center';
  for (let k = 0; k < 360; k += 10) {
    const angle = (k * Math.PI) / 180,
      r = mid * 0.94 - 56;
    const x = mid + Math.sin(angle) * r,
      y = mid - Math.cos(angle) * r;
    const label = String(k % 180 > 90 ? 180 - (k % 180) : k % 180);
    const textWidth = scale.measureText(label).width;
    scale.fillStyle = '#fcf6e8';
    scale.fillRect(x - textWidth / 2 - 2, y - 16, textWidth + 4, 32);
    scale.fillStyle = '#212b32';
    scale.fillText(label, x, y + 10);
  }
  scale.strokeStyle = '#32625d';
  scale.lineWidth = 2.4;
  scale.beginPath();
  scale.moveTo(mid, mid * 0.25);
  scale.lineTo(mid, mid * 1.75);
  scale.moveTo(mid - 10, mid);
  scale.lineTo(mid + 10, mid);
  scale.stroke();
  scale.beginPath();
  scale.arc(mid, mid, 6, 0, 2 * Math.PI);
  scale.stroke();
  protTex.needsUpdate = true;
  const prot = new THREE.Mesh(
    new THREE.CircleGeometry(RADIUS, 80),
    new THREE.MeshBasicMaterial({ map: protTex, transparent: true, depthWrite: false }),
  );
  extras.push(protTex);
  prot.rotation.x = -Math.PI / 2;
  prot.position.set(0.269, 0.001, 0.125);
  work.add(prot);
  // 小圆点既标出针孔，也给步骤光圈一个准确的落点。
  const holeMarks = Array.from({ length: 5 }, () => {
    const mark = new THREE.Mesh(
      new THREE.CircleGeometry(0.0012, 12),
      new THREE.MeshBasicMaterial({ color: 0x45413a }),
    );
    mark.rotation.x = -Math.PI / 2;
    work.add(mark);
    mark.visible = false;
    return mark;
  });
  const c = sheetTex.canvas.getContext('2d'),
    cw = sheetTex.canvas.width,
    ch = sheetTex.canvas.height;
  const x = (n) => (n / W + 0.5) * cw,
    z = (n) => (n / D + 0.5) * ch;
  function draw({ edges, holes, lines, normal, reading, sighting }) {
    holeMarks.forEach((mark, i) => {
      const p = i === 4 ? lines[0]?.[1] : holes[i];
      mark.visible = !!p;
      if (p) mark.position.set(p.x, 0.0002, p.z);
    });
    c.fillStyle = '#fff9e8';
    c.fillRect(0, 0, cw, ch);
    function line(a, b, color, dashed = false) {
      c.strokeStyle = color;
      c.lineWidth = 4.0;
      c.setLineDash(dashed ? [12, 9] : []);
      c.beginPath();
      c.moveTo(x(a.x), z(a.z));
      c.lineTo(x(b.x), z(b.z));
      c.stroke();
      c.setLineDash([]);
    }
    edges.forEach((range, i) => {
      if (!range) return;
      const zz = (i - 0.5) * SLAB_THICKNESS;
      line({ x: range[0], z: zz }, { x: range[1], z: zz }, '#5c6059');
      if (range[1] - range[0] > 0.17) {
        c.fillStyle = '#454b48';
        c.font = 'italic 36px Georgia';
        c.fillText(i ? 'a′' : 'a', x(-0.111), z(zz) + 8);
      }
    });
    for (const [a, b] of lines) line(a, b, '#994b3c');
    if (normal !== null && !reading) {
      // 学生沿 DC 反向作图，光实际从 O′ 射向 D。
      lines.forEach(([a, b], i) => {
        const dx = x(b.x) - x(a.x),
          dz = z(b.z) - z(a.z);
        c.save();
        c.translate(x(a.x) + 0.34 * dx, z(a.z) + 0.34 * dz);
        c.rotate(Math.atan2(dz, dx) + (i === 1 ? Math.PI : 0));
        c.fillStyle = '#994b3c';
        c.beginPath();
        c.moveTo(11, 0);
        c.lineTo(-10, -7);
        c.lineTo(-10, 7);
        c.closePath();
        c.fill();
        c.restore();
      });
    }
    if (reading) {
      // A 靠近界面时延长 OA，让实际画出的光线仍够得着外圈。
      const [a, o] = lines[0],
        length = Math.hypot(a.x - o.x, a.z - o.z);
      if (length < RADIUS)
        line(
          a,
          { x: o.x + ((a.x - o.x) * RADIUS) / length, z: o.z + ((a.z - o.z) * RADIUS) / length },
          '#994b3c',
          true,
        );
    }
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      const p = lines[i][1];
      if (Math.abs(p.z - (i - 0.5) * SLAB_THICKNESS) > 0.0001) continue;
      c.fillStyle = '#544438';
      c.beginPath();
      c.arc(x(p.x), z(p.z), 6, 0, 2 * Math.PI);
      c.fill();
      c.font = 'italic 34px Georgia';
      c.fillText(i ? 'O′' : 'O', x(p.x) + (i ? 34 : 18), z(p.z) + (i ? 34 : -12));
    }
    if (normal !== null) line({ x: normal, z: -0.155 }, { x: normal, z: 0.105 }, '#62736e', true);
    holes.forEach((p, i) => {
      if (!p) return;
      c.fillStyle = '#3c3c36';
      c.beginPath();
      c.arc(x(p.x), z(p.z), 5, 0, 2 * Math.PI);
      c.fill();
      if (reading || sighting) return;
      c.fillStyle = '#393b36';
      c.font = 'bold 34px Georgia';
      c.textAlign = 'left';
      c.fillText(names[i], x(p.x) - 31, z(p.z) + 9);
    });
    sheetTex.needsUpdate = true;
  }
  function reset() {
    pins.forEach((p, i) => {
      p.visible = true;
      p.position.copy(homes[i]);
    });
    brick.position.set(0, brick.geometry.parameters.height / 2, 0);
    eye.position.x = 0.025;
    prot.position.set(0.269, 0.001, 0.125);
    prot.rotation.set(-Math.PI / 2, 0, 0.38);
  }
  reset();
  return {
    group,
    work,
    pins,
    homes,
    holeMarks,
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
