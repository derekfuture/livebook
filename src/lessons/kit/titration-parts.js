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
const ZERO = 0.167, UNIT = 0.0049, BOTTOM = 0.036;
export const levelAt = (reading) => ZERO - reading * UNIT;
export const emptyReading = (ZERO - BOTTOM) / UNIT;
export const cupLevel = (poured) => Math.max(0.004, 0.035 - poured * 0.00064);
export const EQ = 19.98,
  DROP = 0.04;
export const WALL_SECTORS = 32;
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
function label(g, text, y, z, w, x = 0) {
  const fontSize = Math.min(135, 450 / (text.length - (text.match(/[A-Za-z ·]/g) || []).length * 0.48));
  const o = textPlate(text, { w, h: 0.009, bg: '#fffaf0', color: '#283536', font: `600 ${fontSize}px sans-serif` });
  o.position.set(x, y, z);
  o.renderOrder = 12;
  g.add(o);
  return o;
}

// Slice a cylindrical vessel into vertical chords. The plane that encloses
// the current volume stays horizontal in world space as the vessel tilts.
function levelLiquid(group, radius, bottom, top, material) {
  const count = 40, depth = top - bottom;
  const chords = Array.from({ length: count + 1 }, (_, i) => {
    const angle = Math.PI * i / count;
    return { x: -radius * Math.cos(angle), z: radius * Math.sin(angle) };
  });
  const weights = chords.slice(1).map((c, i) => (c.x - chords[i].x) * (c.z + chords[i].z));
  const area = weights.reduce((a, b) => a + b, 0);
  const mean = (height, slope) => weights.reduce((sum, w, i) =>
    sum + w * clamp(height - slope * (chords[i].x + chords[i+1].x) / 2, 0, depth), 0) / area;
  const geo = new T.BufferGeometry(), coords = new Float32Array(chords.length * 12), indices = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 4; j++) {
      const a = 4*i+j, b = 4*i+(j+1)%4;
      indices.push(a, b+4, b, a, a+4, b+4);
    }
  }
  geo.setIndex(indices);
  geo.setAttribute('position', new T.BufferAttribute(coords, 3));
  const fluid = mesh(group, geo, material, 0, bottom);
  fluid.material.flatShading = true;
  fluid.material.roughness = 0.45;
  fluid.renderOrder = 7;
  fluid.frustumCulled = false;
  function surface(level, angle) {
    const slope = Math.tan(angle), span = Math.abs(slope) * radius;
    let lo = -span, hi = depth + span;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (mean(mid, slope) < level - bottom) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  let lastLevel, lastAngle;
  return {
    surface,
    pourAngle(level) {
      let lo = 0, hi = Math.PI/2 - 0.001;
      for (let i = 0; i < 15; i++) {
        const mid = (lo+hi)/2, slope = Math.tan(mid);
        if (mean(depth-radius*slope, slope) > level-bottom) lo = mid;
        else hi = mid;
      }
      return (lo+hi)/2;
    },
    set(level, angle) {
      if (lastLevel === level && lastAngle === angle) return;
      lastLevel = level;
      lastAngle = angle;
      fluid.visible = level > bottom + 0.00005;
      if (!fluid.visible) return;
      const intercept = surface(level, angle), slope = Math.tan(angle);
      chords.forEach(({x,z}, i) => {
        const h = clamp(intercept - slope * x, 0, depth);
        coords.set([x,0,-z, x,0,z, x,h,z, x,h,-z], i*12);
      });
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingBox();
    },
  };
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
    const r = 0.0052, bottom = BOTTOM, zero = ZERO, unit = UNIT;
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
    const levelGroup = new T.Group();
    t.add(levelGroup);
    const tilted = levelLiquid(levelGroup, r * 0.9, bottom, LENGTH, water2({ color: clear, base: 0.59 }));
    const meniscus = profile(
      t,
      [
        [0, 0],
        [0.002, 0.0001],
        [0.0047, 0.0007],
      ],
      solid(0x8bafb6),
    );
    const readPick = pick(meniscus, 0.014, 0.012, 0.012, 0);
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
    // Each strip remembers the highest point reached by liquid on that side.
    const wetWall = mesh(t, new T.CylinderGeometry(r * 0.95, r * 0.95, 1, WALL_SECTORS, 1, true),
      water2({ color: 0x81bac4, base: 0.47 }), 0, bottom);
    wetWall.renderOrder = 6;
    wetWall.frustumCulled = false;
    function sweepWall(tube, angle, roll) {
      const radius = r * 0.9, depth = LENGTH - bottom;
      const intercept = tilted.surface(bottom + tube.charge * UNIT, angle);
      for (let j = 0; j < WALL_SECTORS; j++) {
        const x = radius * Math.sin(2 * Math.PI * j / WALL_SECTORS + roll);
        const reach = clamp(intercept - Math.tan(angle) * x, 0, depth) / depth;
        tube.wall[j] = Math.max(tube.wall[j], reach);
      }
    }
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
    label(levelGroup, i ? '碱式滴定管 · NaOH' : '酸式滴定管 · HCl', 0.124, r + 0.001, 0.064, i ? 0.036 : -0.036);
    const set = (reading, rinse, angle, bubble, open, bend, roll, wall) => {
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
      t.rotateY(roll);
      wetWall.visible = rinse > 0;
      if (wetWall.visible) {
        const pos = wetWall.geometry.attributes.position;
        for (let j = 0; j <= WALL_SECTORS; j++) {
          pos.setY(j, wall[j % WALL_SECTORS] * (LENGTH - bottom));
          pos.setY(j + WALL_SECTORS + 1, 0);
        }
        pos.needsUpdate = true;
      }
      const h = reading === null ? rinse * 0.0049 : zero - reading * unit - bottom;
      liq.visible = meniscus.visible = h > 0.0002 && Math.abs(angle) < 0.001;
      levelGroup.rotation.y = -roll;
      tilted.set(liq.visible ? bottom : bottom + h, angle);
      liq.scale.y = Math.max(0.0002, h);
      liq.position.y = bottom + h / 2;
      meniscus.position.y = bottom + h;
      tipFill.visible = reading !== null || rinse > 0;
      air.visible = bubble;
      valve.rotation.z = i ? open * 0.2 : 0;
      valve.rotation.x = i ? 0 : open * 1.1;
    };
    t.userData.ringY = TIP + 0.13;
    return { t, body, grasp, meniscus, readPick, valve, handle, set, sweepWall, nozzle, endPick, pivot };
  });
  const cups = X.map((x, i) => {
    const cup = beaker({ r: 0.017, h: 0.044, level: 0.033, color: clear, opacity: 0.42 });
    cup.position.x = i ? 0.139 : -0.139;
    g.add(cup);
    label(cup, i ? '烧杯 · 待测 NaOH' : '烧杯 · 标准盐酸', 0.026, 0.018, 0.050);
    cup.liquid.visible = cup.surface.visible = false;
    const water = levelLiquid(cup, cup.inner, 0.004, 0.044, water2({ color: 0xabccd0, base: 0.60 }));
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
    return { g: cup, lip, water, pick: pick(cup, 0.037, 0.046, 0.037, 0.023), sign };
  });
  const waste = beaker({ r: 0.052, h: 0.034, level: 0, spout: false, color: clear, opacity: 0.3 });
  waste.setColor(clear, 0.3);
  g.add(waste);
  label(waste, '废液烧杯', 0.012, 0.053, 0.034);
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
  const patchMap = canvasTex(64, 64, (ctx) => {
    const fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    fade.addColorStop(0, '#e4eded');
    fade.addColorStop(1, 'rgba(228,237,237,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 64, 64);
  });
  const clearPatch = mesh(flask, new T.PlaneGeometry(2, 2),
    new T.MeshBasicMaterial({ map: patchMap, transparent: true, depthWrite: false }));
  clearPatch.rotation.x = -Math.PI / 2;
  clearPatch.renderOrder = 8;
  const flaskPick = pick(flask, 0.042, 0.046, 0.042, 0.026);
  const flaskTags = ['锥形瓶 · 空', '锥形瓶 · NaOH', '锥形瓶 · NaOH、酚酞', '锥形瓶 · 反应液'].map(
    (name) => label(flask, name, 0.008, 0.025, 0.052));
  label(g, '铁架台', 0.014, -0.050, 0.026);
  label(g, '滴定管夹', 0.174, 0, 0.033);
  const bottle = dropBottle(g, V(0.187));
  label(bottle, '滴瓶 · 酚酞', 0.020, 0.014, 0.038);
  const pip = new T.Group();
  g.add(pip);
  pip.position.copy(bottle.tipHome);
  cylinder(pip, 0.002, 0.0009, 0.046, glass, 0, 0.023);
  const bulb = mesh(pip, new T.SphereGeometry(0.0058, 16, 12), solid(0x9d4547), 0, 0.052);
  bulb.scale.y = 1.55;
  label(pip, '酚酞滴管', 0.067, 0.002, 0.030);
  const pipPick = pick(pip, 0.015, 0.024, 0.016, 0.052);
  pip.userData.ringY = 0.062;
  const stream = cylinder(g, 0.00105, 0.00085, 1, water2({ color: 0x91bec5, base: 0.82 }), 0, 0);
  stream.renderOrder = 11;
  stream.visible = false;
  const drops = Array.from({length: 10}, () => {
    const drop = mesh(g, new T.SphereGeometry(0.00165, 14, 12), solid(0x87acb4), 0, 0);
    drop.visible = false;
    drop.renderOrder = 11;
    return drop;
  });
  const paper = mesh(g, new T.BoxGeometry(0.081, 0.0006, 0.065), solid(0xfffdf6), X[0], 0.0004, 0.002);
  paper.receiveShadow = true;
  function setFlask(base, acid, dye, mixed, slosh, impactX) {
    const index = acid ? 3 : dye ? 2 : base ? 1 : 0;
    flaskTags.forEach((plate, i) => { plate.visible = i === index; });
    liquid.visible = base > 0;
    const h = 0.0005 * base + acid * 0.00045;
    liquid.scale.y = h / 0.017;
    liquid.rotation.z = slosh;
    clearPatch.visible = acid > mixed && !!dye && pH(mixed) > 8.2;
    if (clearPatch.visible) {
      const radius = Math.min(0.012, 0.005 + (acid - mixed) * 0.005);
      clearPatch.scale.set(radius, radius * 0.85, 1);
      clearPatch.position.set(impactX, 0.0006 + h + impactX * Math.sin(slosh), 0);
      clearPatch.rotation.y = -slosh;
    }
    const pink = dye ? clamp((pH(mixed) - 8.2) / 2.2, 0, 1) : 0;
    fm.color.setHex(clear).lerp(new T.Color(0xda3778), pink);
  }
  return { tubes, cups, waste, wastePick, flask, flaskPick, pip, pipPick, pipHome: bottle.tipHome, stream, drops, setFlask };
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

export function meniscusScale(canvas, reading) {
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  // A fixed band of graduations: the meniscus moves between the marks.
  const aboveZero = reading < -0.22;
  const center = aboveZero ? reading / 2 : Math.round(reading * 5) / 5;
  const span = aboveZero ? 0.55 - reading : 0.55;
  const y = (v) => h * (0.5 + (v-center)/span);
  const left = w*0.37, right = w*0.82, mid = (left+right)/2, low = y(reading);
  c.fillStyle = '#d0e3e4';
  c.strokeStyle = '#4d7075';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(left, low-12);
  c.quadraticCurveTo(mid, low+12, right, low-12);
  c.stroke();
  c.lineTo(right,h); c.lineTo(left,h); c.fill();
  c.strokeStyle = '#839393';
  for (const x of [left,right]) {
    c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke();
  }
  c.fillStyle = '#283c3f';
  c.font = '21px sans-serif';
  c.textAlign = 'right';
  for (let n = Math.max(0, Math.ceil((center-span/2)*10)); n <= Math.min(250,(center+span/2)*10); n++) {
    const yy = y(n/10), major = n%5 === 0;
    c.fillRect(left, yy-1, w*(major ? 0.23 : 0.11), 2);
    if (!aboveZero || major) c.fillText((n/10).toFixed(1), left-5, yy+7);
  }
  c.font = '18px sans-serif';
  c.fillText('mL', w-3, h-12);
  canvas.style.setProperty('--level', `${-100 * low / h}%`);
}

export function plotCurve(canvas, volume, trace) {
  const c = instrumentPaper(canvas);
  const xmax = Math.max(22, Math.ceil(volume)),
    x = (v) => 65 + (v / xmax) * 505,
    y = (p) => 234 - p * 14;
  c.fillText('理论 pH  ' + pH(volume).toFixed(2), 15, 27);
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
  for (const v of trace) {
    if (v > volume) break;
    c.lineTo(x(v), y(pH(v)));
  }
  c.stroke();
  c.fillStyle = '#a84958';
  c.beginPath();
  c.arc(x(volume), y(pH(volume)), 6, 0, 2 * Math.PI);
  c.fill();
}
