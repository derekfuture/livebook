// Dimensions are illustrative. Burette readings increase down the tube.
import * as T from 'three';
import { glass2, water2, bubble2 } from './chemfx.js';
import { beaker, textPlate, canvasTex } from './props.js';
import { dropBottle } from './labops.js';
import { clamp } from './interact.js';

export const V = (x, y = 0, z = 0) => new T.Vector3(x, y, z);
export const X = [-0.039, 0.039],
  TIP = 0.078,
  LENGTH = 0.183,
  TOP = TIP + LENGTH;
export const EQ = 19.98,
  DROP = 0.04;
export function pH(volume) {
  const excess = (0.1 * (volume - EQ)) / (20 + volume);
  const major = (Math.abs(excess) + Math.hypot(excess, 2e-7)) / 2;
  return excess >= 0 ? -Math.log10(major) : 14 + Math.log10(major);
}
const solid = (color) => new T.MeshStandardMaterial({ color, roughness: 0.58 });
function mesh(g, geo, mat, x, y, z = 0) {
  const o = new T.Mesh(geo, mat);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
function cylinder(g, a, b, h, mat, x, y, z = 0) {
  return mesh(g, new T.CylinderGeometry(a, b, h, 32), mat, x, y, z);
}
function profile(g, pts, mat) {
  return mesh(
    g,
    new T.LatheGeometry(
      pts.map(([r, y]) => new T.Vector2(r, y)),
      40,
    ),
    mat,
    0,
    0,
  );
}
function pick(g, w, h, d, y) {
  const o = mesh(g, new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ visible: false }), 0, y);
  o.userData.pick = true;
  return o;
}
function rim(g, r, y) {
  const o = mesh(g, new T.TorusGeometry(r, 0.00055, 8, 48), solid(0x99acb1), 0, y);
  o.rotation.x = Math.PI / 2;
}
function label(g, text, y, z, w) {
  const o = textPlate(text, { w, h: 0.009, bg: '#fffaf0', color: '#283536', font: 'bold 118px sans-serif' });
  o.position.set(0, y, z);
  g.add(o);
}
export function apparatus(g) {
  const steel = solid(0x485358),
    glass = glass2({ base: 0.16 }),
    clear = 0xcbdde0;
  mesh(g, new T.BoxGeometry(0.068, 0.006, 0.035), steel, 0, 0.003, -0.069);
  cylinder(g, 0.0028, 0.0028, 0.244, steel, 0, 0.125, -0.069);
  mesh(g, new T.BoxGeometry(0.088, 0.006, 0.008), steel, 0, 0.174, -0.012);
  mesh(g, new T.BoxGeometry(0.007, 0.009, 0.058), steel, 0, 0.174, -0.041);
  const tubes = X.map((x, i) => {
    const t = new T.Group();
    t.position.set(x, TIP, 0);
    g.add(t);
    const r = 0.0052,
      bottom = 0.036,
      zero = 0.167,
      unit = 0.0049;
    const shaft = profile(
      t,
      [
        [0.0007, 0],
        [0.0025, 0.018],
        [0.0025, 0.028],
        [r, bottom],
        [r, LENGTH],
      ],
      glass,
    );
    shaft.renderOrder = 8;
    rim(t, r, LENGTH);
    const valve = new T.Group();
    valve.position.y = 0.024;
    t.add(valve);
    const nozzle = new T.Group(),
      links = [];
    const endPick = pick(nozzle, 0.011, 0.015, 0.012, 0.006);
    const pivot = new T.Group();
    nozzle.add(pivot);
    if (i) {
      shaft.geometry.dispose();
      shaft.geometry = new T.LatheGeometry(
        [
          [0.0025, 0.033],
          [r, bottom],
          [r, LENGTH],
        ].map(([a, y]) => new T.Vector2(a, y)),
        40,
      );
      t.add(nozzle);
      profile(
        nozzle,
        [
          [0.0007, 0],
          [0.0024, 0.016],
        ],
        glass,
      ).renderOrder = 8;
      const rubber = solid(0xc8a376);
      for (let j = 0; j < 8; j++) links.push(cylinder(t, 0.0031, 0.0031, 0.0029, rubber, 0, 0));
      mesh(valve, new T.SphereGeometry(0.0039, 18, 12), solid(0xe0c598), 0, -0.001);
    } else {
      cylinder(valve, 0.0035, 0.0035, 0.019, solid(0xc6c9c3), 0, 0).rotation.z = Math.PI / 2;
      mesh(valve, new T.BoxGeometry(0.003, 0.015, 0.004), solid(0x7b463c), -0.01, 0);
    }
    const handle = pick(valve, 0.024, 0.025, 0.017, 0);
    const body = pick(t, 0.015, 0.08, 0.015, 0.125);
    const grasp = new T.Group();
    grasp.position.y = 0.125;
    t.add(grasp);
    const liq = cylinder(t, r * 0.9, r * 0.9, 1, water2({ color: clear, base: 0.59 }), 0, bottom);
    const meniscus = profile(
      t,
      [
        [0, 0],
        [0.002, 0.0001],
        [0.0047, 0.0007],
      ],
      solid(0x8bafb6),
    );
    const tex = canvasTex(160, 1536, (c, w, h) => {
      c.fillStyle = '#475253';
      c.strokeStyle = '#445153';
      c.font = 'bold 27px sans-serif';
      for (let n = 0; n <= 250; n++) {
        const y = 8 + (n / 250) * (h - 16),
          major = n % 10 === 0;
        c.lineWidth = major ? 3 : 1;
        c.beginPath();
        c.moveTo(6, y);
        c.lineTo(major ? 69 : n % 5 === 0 ? 48 : 26, y);
        c.stroke();
        if (n % 50 === 0) c.fillText(String(n / 10), 78, clamp(y + 7, 24, h - 3));
      }
    });
    const scale = mesh(
      t,
      new T.PlaneGeometry(0.0095, (25 * unit * 1536) / 1520),
      new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
      0,
      zero - 12.5 * unit,
      r + 0.0001,
    );
    scale.renderOrder = 10;
    const wetWall = cylinder(
      t,
      0.00495,
      0.00495,
      LENGTH - bottom - 0.003,
      water2({ color: clear, base: 0.22 }),
      0,
      (LENGTH + bottom) / 2,
    );
    wetWall.renderOrder = 6;
    const tipFill = profile(
      t,
      [
        [0.00065, 0.001],
        [0.0019, 0.017],
        [0.0019, 0.027],
        [0.0048, bottom],
      ],
      water2({ color: clear, base: 0.57 }),
    );
    tipFill.renderOrder = 7;
    const air = mesh(t, new T.SphereGeometry(0.0021, 18, 12), bubble2({ color: 0x334b60, white: 0.15 }), 0, 0.014);
    air.scale.y = 2.3;
    air.renderOrder = 12;
    for (const side of [-1, 1]) {
      const jaw = mesh(g, new T.BoxGeometry(0.0024, 0.009, 0.014), steel, x + side * 0.0058, 0.174, -0.004);
      jaw.rotation.z = side * 0.08;
    }
    const wheel = cylinder(g, 0.005, 0.005, 0.004, steel, x + (i ? -0.016 : 0.016), 0.174, -0.008);
    wheel.rotation.x = Math.PI / 2;
    if (i) {
      nozzle.add(air);
      air.position.y = 0.009;
      tipFill.geometry.dispose();
      tipFill.geometry = new T.LatheGeometry([new T.Vector2(0.00045, 0.0008), new T.Vector2(0.00185, 0.016)], 24);
      nozzle.add(tipFill);
    }
    const set = (reading, rinse, angle, bubble, open, bend = 0) => {
      if (i) {
        let x = 0,
          y = 0.036;
        links.forEach((link, j) => {
          const a = (bend * (j + 0.5)) / links.length,
            dx = (-Math.sin(a) * 0.02) / links.length,
            dy = (-Math.cos(a) * 0.02) / links.length;
          link.position.set(x + dx / 2, y + dy / 2, 0);
          link.rotation.z = -a;
          if (j === 4) valve.position.copy(link.position);
          x += dx;
          y += dy;
        });
        nozzle.rotation.z = -bend;
        nozzle.position.set(x - 0.016 * Math.sin(bend), y - 0.016 * Math.cos(bend), 0);
      }
      t.rotation.set(0, 0, angle);
      t.rotateY(angle * 0.68);
      wetWall.visible = rinse > 0 && Math.abs(angle) > 0.55;
      const h = reading === null ? rinse * 0.0049 : zero - reading * unit - bottom;
      liq.visible = meniscus.visible = h > 0.0002;
      liq.scale.y = Math.max(0.0002, h);
      liq.position.y = bottom + h / 2;
      meniscus.position.y = bottom + h;
      tipFill.visible = reading !== null || rinse > 0;
      air.visible = bubble;
      valve.rotation.z = i ? open * 0.2 : 0;
      valve.rotation.x = i ? 0 : open * 1.1;
    };
    t.userData.ringY = TIP + 0.13;
    return { t, body, grasp, valve, handle, set, nozzle, endPick, pivot };
  });
  const cups = X.map((x, i) => {
    const cup = beaker({ r: 0.017, h: 0.044, level: 0.033, color: clear, opacity: 0.42 });
    cup.position.x = i ? 0.139 : -0.139;
    g.add(cup);
    label(cup, i ? 'NaOH' : 'HCl', 0.026, 0.018, 0.028);
    // Orient the spout toward its tube. The drag anchor is the lip itself.
    const sign = i ? -1 : 1;
    if (i) {
      const spout = cup.children.find((o) => o.geometry?.type === 'ConeGeometry');
      spout.position.x = -0.02;
      spout.rotation.z = Math.PI / 2;
    }
    const lip = new T.Group();
    lip.position.set(sign * 0.021, 0.04, 0);
    cup.add(lip);
    return { g: cup, lip, pick: pick(cup, 0.037, 0.046, 0.037, 0.023), sign };
  });
  const waste = beaker({ r: 0.052, h: 0.034, level: 0, spout: false, color: clear, opacity: 0.3 });
  waste.setColor(clear, 0.3);
  g.add(waste);
  label(waste, '废液', 0.019, 0.053, 0.022);
  const wastePick = pick(waste, 0.092, 0.034, 0.076, 0.017);
  const flask = new T.Group();
  g.add(flask);
  profile(
    flask,
    [
      [0.0001, 0.001],
      [0.021, 0.001],
      [0.024, 0.004],
      [0.023, 0.013],
      [0.008, 0.045],
      [0.007, 0.049],
      [0.007, 0.061],
      [0.008, 0.062],
    ],
    glass,
  ).renderOrder = 9;
  rim(flask, 0.008, 0.062);
  rim(flask, 0.021, 0.0015);
  const fm = water2({ color: clear, base: 0.82 }),
    liquid = profile(
      flask,
      [
        [0.0001, 0.002],
        [0.021, 0.002],
        [0.022, 0.005],
        [0.02, 0.017],
        [0, 0.017],
      ],
      fm,
    );
  liquid.renderOrder = 7;
  const flaskPick = pick(flask, 0.042, 0.046, 0.042, 0.026);
  const bottle = dropBottle(g, V(0.187), { label: '酚酞' });
  const pip = new T.Group();
  g.add(pip);
  pip.position.copy(bottle.tipHome);
  cylinder(pip, 0.002, 0.0009, 0.046, glass, 0, 0.023);
  const bulb = mesh(pip, new T.SphereGeometry(0.0058, 16, 12), solid(0x9d4547), 0, 0.052);
  bulb.scale.y = 1.55;
  const pipPick = pick(pip, 0.015, 0.024, 0.016, 0.052);
  pip.userData.ringY = 0.062;
  const drop = mesh(g, new T.SphereGeometry(0.0017, 16, 12), solid(0xa2c0c6), 0, 0);
  drop.scale.y = 1.4;
  drop.visible = false;
  const paper = mesh(g, new T.BoxGeometry(0.081, 0.0006, 0.065), solid(0xfffdf6), X[0], 0.0004, 0.002);
  paper.receiveShadow = true;
  function setFlask(base, acid, dye) {
    liquid.visible = base > 0;
    const h = 0.0005 * base + acid * 0.00045;
    liquid.scale.y = h / 0.017;
    const pink = dye ? clamp((pH(acid) - 8.2) / 2.2, 0, 1) : 0;
    fm.color.setHex(clear).lerp(new T.Color(0xda3778), pink);
  }
  return { tubes, cups, waste, wastePick, flask, flaskPick, pip, pipPick, pipHome: bottle.tipHome, drop, setFlask };
}

export function ions() {
  // Stagger the reaction sites and the two spectator groups in the camera projection.
  const hydroxide = [
    [-2.8, 2.8, 0.8],
    [0.6, 2.5, 1],
    [3.4, 2.8, -0.4],
  ];
  const sodium = [
    [-4.8, 1, 2.3],
    [-4.5, 4.7, -2.2],
    [4.1, 0.9, 3.1],
  ];
  const chloride = [
    [5.7, 1.8, -0.6],
    [-0.8, 1.1, 4.5],
    [0.2, 5.2, -3.4],
    [2, 4.4, -2.3],
  ];
  let made = 0,
    excess = false;
  return {
    still: true,
    labels: (k, m) => !!m.rep,
    labelOnly: (k, m) => !!m.rep,
    init(c) {
      made = 0;
      excess = false;
      c.view.film = 6;
      c.view.paper = null;
      for (let i = 0; i < 3; i++) {
        c.add('OH-', c.V(hydroxide[i]), { fixed: true }).rep = i === 0;
        c.add('Na+', c.V(sodium[i]), { fixed: true }).rep = i === 0;
      }
    },
    step(c, st) {
      if (c.events.length) return;
      const goal = st.volume >= EQ ? 3 : st.volume > 0 ? Math.min(2, Math.ceil((st.volume / EQ) * 2)) : 0;
      if (made >= goal && !(st.volume > EQ && !excess)) return;
      const oh = c.free('OH-')[0],
        pos = oh ? oh.g.position.clone().add(V(1.8, 2.2, 0)) : V(-2.5, 4.8, -2.2);
      const h = c.add('H+', pos, { fixed: !oh });
      h.rep = true;
      c.add('Cl-', c.V(chloride[made]), { fixed: true }).rep = made === 0;
      if (!oh) {
        excess = true;
        return;
      }
      oh.rep = true;
      made++;
      c.start(
        {
          in: ['H+', 'OH-'],
          out: ['H2O'],
          host: 1,
          near: [[1.1, 0.5, 0], null],
          map: [
            [1, 0],
            [1, 1],
            [0, 0],
          ],
          after: [{ fixed: true }],
          approach: 1.3,
          dur: 1.7,
        },
        [h, oh],
        {
          then: (ps) => {
            ps[0].rep = made === 1;
          },
        },
      );
    },
    text(c) {
      const cap = c.events.length
        ? 'H⁺ 正靠近 OH⁻，结合生成水分子。'
        : excess
          ? '酸已过量，有剩余的 H⁺。Na⁺ 和 Cl⁻ 仍留在溶液中。'
          : made === 3
            ? '图中的 OH⁻ 已与 H⁺ 结合成水。Na⁺ 和 Cl⁻ 仍以离子形式留在溶液中。'
            : made
              ? '仍有 OH⁻ 可与 H⁺ 反应。Na⁺ 和 Cl⁻ 留在溶液中。'
              : 'NaOH 溶液中有 Na⁺ 和 OH⁻。';
      return { eq: 'H⁺ + OH⁻ → H₂O', cap };
    },
  };
}

// The magnified meniscus and the plot share the volumetric scale used on the bench.
function instrumentPaper(canvas) {
  const c = canvas.getContext('2d'),
    w = (canvas.width = 620),
    h = (canvas.height = 290);
  c.fillStyle = '#faf8f1';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#3c4a46';
  c.font = '24px sans-serif';
  return c;
}

export function meniscusScale(canvas, name, tube) {
  const c = instrumentPaper(canvas),
    h = canvas.height,
    volume = tube.reading;
  if (!tube.zero) {
    c.font = '21px sans-serif';
    c.fillText('尖嘴内（放大示意）', 423, 64);
    c.beginPath();
    c.moveTo(480, 90);
    c.lineTo(480, 145);
    c.lineTo(501, 242);
    c.lineTo(511, 242);
    c.lineTo(532, 145);
    c.lineTo(532, 90);
    c.fillStyle = '#c2d8db';
    c.fill();
    c.strokeStyle = '#5c7478';
    c.lineWidth = 3;
    c.stroke();
    if (!tube.primed) {
      c.beginPath();
      c.ellipse(506, 143, 16, 29, 0, 0, Math.PI * 2);
      c.fillStyle = '#faf8f1';
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#3c4a46';
    c.font = '24px sans-serif';
  }
  const lo = Math.floor((volume - 0.2) * 10 + 0.00001) / 10,
    step = volume < -0.2 ? Math.ceil(-lo * 2) / 10 : 0.1,
    y = (v) => 46 + ((v - lo) / step) * 44;
  c.fillText(name + '  /  mL', 18, 30);
  c.fillStyle = '#c2d8db';
  c.beginPath();
  c.moveTo(241, y(volume) - 18);
  c.quadraticCurveTo(306, y(volume) + 18, 371, y(volume) - 18);
  c.lineTo(371, h);
  c.lineTo(241, h);
  c.fill();
  c.strokeStyle = '#5c7478';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(241, y(volume) - 18);
  c.quadraticCurveTo(306, y(volume) + 18, 371, y(volume) - 18);
  c.stroke();
  for (let j = 0; j < 6; j++) {
    const v = volume < -0.2 ? j * step : Math.round((lo + j / 10) * 10) / 10,
      yy = y(v);
    if (v < 0 || yy > h - 12 || yy < 37) continue;
    c.fillStyle = '#3c4a46';
    c.fillRect(214, yy - 1, 60, 2);
    c.fillText(v.toFixed(1), 148, yy + 8);
  }
  c.fillRect(239, 34, 2, h);
  c.fillRect(370, 34, 2, h);
  return (fraction) => {
    const value = Math.round((lo + ((fraction * h - 46) * step) / 44) * 100) / 100;
    return value >= 0 && value <= 25 ? value : null;
  };
}

export function plotCurve(canvas, volume, trace) {
  const c = instrumentPaper(canvas);
  const xmax = Math.max(22, Math.ceil(volume)),
    x = (v) => 65 + (v / xmax) * 505,
    y = (p) => 234 - p * 14;
  c.fillText('理论 pH  ' + pH(volume).toFixed(2), 15, 27);
  c.fillText(volume.toFixed(2) + ' mL', 448, 27);
  c.font = '19px sans-serif';
  for (const p of [0, 7, 14]) {
    c.fillStyle = '#dbdcd3';
    c.fillRect(64, y(p), 508, 1);
    c.fillStyle = '#525952';
    c.fillText(String(p), 27, y(p) + 6);
  }
  for (const v of [0, 10, 20]) c.fillText(String(v), x(v) - 8, 258);
  c.fillText('盐酸体积 / mL', 411, 281);
  c.strokeStyle = '#385e59';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(x(0), y(pH(0)));
  for (const v of trace) c.lineTo(x(v), y(pH(v)));
  c.stroke();
  c.fillStyle = '#a84958';
  c.beginPath();
  c.arc(x(volume), y(pH(volume)), 6, 0, 2 * Math.PI);
  c.fill();
}
