// Lengths in metres. Reagent volumes come from 必修第二册 pp. 44, 58.
import * as THREE from 'three';
import { testTube, tubeRack, spatula } from './chem.js';
import { bubble2, glass2, tubeLiquid, water2 } from './chemfx.js';
import { beaker } from './props.js';
import { dropBottle } from './labops.js';
import { faceLabel, groundLabel } from './labels.js';
import { textSprite } from './microworld.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const X = [-0.052, 0.052, 0], BX = [-0.134, 0.134];
export const LEN = 0.099, BASE = 0.009, RIM = 0.081, LOW = 0.007;
export const NAMES = ['甲', '乙', '丙'];
const R = 0.0093;
export const level = (ml) => 0.006 + ml * 0.0135; // expanded vertical scale to read the meniscus
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.52 });
function mesh(group, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); group.add(m); return m;
}
function pick(g, size, x, y) {
  const p = mesh(g, new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }), x, y);
  p.userData.pick = true;
  return p;
}
function rack(parent, x) {
  const g = tubeRack({ h: 0.055, r: R + 0.002, w: 0.037, d: 0.036 });
  g.position.x = x; parent.add(g); return g;
}
function receiver(parent, i) {
  const body = testTube({ r: R, len: LEN });
  parent.add(body); body.name = '试管' + NAMES[i];
  const liq = tubeLiquid({ R: R - 0.0005, yc: R + 0.0008, top: LEN - 0.005, color: 0xb4d5dd, base: 0.37 });
  body.add(liq);
  const band = faceLabel(body, NAMES[i], { y: LEN - 0.014, z: R, h: 0.010, color: '#314b58', stroke: '#fff' });
  const tab = mesh(body, new THREE.BoxGeometry(0.014, 0.011, 0.0007), mat(0xf6efdc), 0, band.position.y, R);
  tab.rotation.y = -0.06;
  const grip = pick(body, [0.023, 0.077, 0.023], 0, LEN * 0.56);
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), bubble2({ color: 0x458294, white: 0.38 }), 26);
  bubbles.renderOrder = 10; bubbles.frustumCulled = false; bubbles.count = 0; body.add(bubbles);
  const dummy = new THREE.Object3D();
  const update = (t) => {
    const top = level(t.ml);
    liq.setLevel(top).setColor(t.iron ? 0xe2c77b : 0xb4d5dd).setMilk(t.cloud, 0xfcfaf1, 0xe7e6d8);
    liq.update(t.age);
    body.setPowder(t.mn ? 0.45 : 0, 0x342e32);
    let n = 0;
    for (let j = 0; j < bubbles.instanceMatrix.count; j++) {
      // A bubble exists only between its own birth and its arrival at the surface.
      const offset = (t.iron || t.mn) ? .46*Math.sin((j+1)*(i+1)*2.1) : 0;
      const age = (t.gas - j - offset - 0.6) % 26;
      if (age < 0 || age >= t.flux * 1.65 || t.flux === 0) continue;
      const u = age / (t.flux * 1.65);
      const a = j * 2.4 + u * 0.75;
      dummy.position.set(0.0054 * Math.cos(a), 0.008 + (top - 0.008) * u, 0.0054 * Math.sin(a));
      dummy.scale.setScalar((0.0012 + (j % 3) * 0.00032) * (0.65 + 0.55 * u));
      dummy.updateMatrix(); bubbles.setMatrixAt(n++, dummy.matrix);
    }
    bubbles.count = n; bubbles.instanceMatrix.needsUpdate = true;
    body.userData.ringY = body.position.y + LEN * 0.72;
  };
  return { body, pick: grip, rack: rack(parent, X[i]), update };
}
function waterBath(parent, i) {
  const cup = beaker({ r: 0.034, h: RIM, level: 0.072, spout: false });
  parent.add(cup); cup.position.x = BX[i];
  cup.glass.material = glass2({ base: 0.06, rim: 0.47, band: 0.32 });
  cup.liquid.material = water2({ color: 0xa9cbd4, base: 0.2, rim: 0.17 });
  groundLabel(cup, i ? '热水' : '冷水', { z: 0.049, h: 0.016, color: i ? '#94582f' : '#38586e', opacity: 1 });
  return cup;
}
// Slice the cylinder across the tilt axis. Each strip fills up to the same
// horizontal plane, including when the pouring lip is lower than the base.
function tiltedWater(cup, radius, height) {
  const count = 32, bottom = .004, depth = height-bottom;
  const strips = Array.from({length:count+1},(_,i) => {
    const x = radius*(2*i/count-1);
    return {x,z:Math.sqrt(Math.max(0,radius*radius-x*x))};
  });
  const positions = new Float32Array((count+1)*12), indices = [];
  for (let i=0;i<count;i++) {
    for (let j=0;j<4;j++) {
      const a=4*i+j, b=4*i+(j+1)%4;
      indices.push(a,b,b+4,a,b+4,a+4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3)); geo.setIndex(indices);
  const material = cup.liquid.material.clone(); material.side = THREE.DoubleSide;
  const fluid = new THREE.Mesh(geo,material); fluid.frustumCulled=false; fluid.renderOrder=5; cup.add(fluid);
  const weight = strips.reduce((sum,s)=>sum+s.z,0);
  let previousAngle, previousLevel;
  return (angle,level) => {
    if (previousAngle === angle && previousLevel === level) return;
    previousAngle=angle; previousLevel=level;
    cup.setLevel(level);
    fluid.visible = level>bottom && Math.abs(angle)>.025;
    if (!fluid.visible) return;
    cup.liquid.visible=cup.surface.visible=false;
    const sin=Math.sin(angle), cos=Math.cos(angle);
    const filled=(plane,x) => {
      if (Math.abs(cos)<.0001) return x*sin<plane ? depth : 0;
      const cut=clamp((plane-x*sin)/cos,0,depth);
      return cos>0 ? cut : depth-cut;
    };
    let low=-radius+Math.min(0,depth*cos), high=radius+Math.max(0,depth*cos);
    for(let i=0;i<17;i++){
      const mid=(low+high)/2;
      const volume=strips.reduce((sum,s)=>sum+s.z*filled(mid,s.x),0)/weight;
      if(volume<level-bottom) low=mid; else high=mid;
    }
    strips.forEach(({x,z},i)=>{
      const amount=filled((low+high)/2,x);
      const y=cos>=0 ? bottom : height-amount;
      positions.set([x,y,-z,x,y,z,x,y+amount,z,x,y+amount,-z],i*12);
    });
    geo.attributes.position.needsUpdate=true; geo.computeVertexNormals();
  };
}
// The origin is the pouring lip. Tilting around this point keeps it over the tube.
function cylinder(parent, side, name, homeX, ml) {
  const body = new THREE.Group(), vessel = new THREE.Group(); body.add(vessel); parent.add(body);
  const r = 0.008, height = 0.050;
  const cup = beaker({ r, h: height, level: 0.004 + ml * 0.010,
    spout: false, scale: { divisions: 4, every: 1, max: 4, height: 0.040 } });
  cup.position.set(side * r, -height, 0); vessel.add(cup);
  mesh(cup, new THREE.CylinderGeometry(0.012, 0.013, 0.0025, 8), mat(0xcbd3cd), 0, 0.0018);
  const grip = pick(vessel, [0.020, height, 0.020], side * r, -height / 2);
  const home = V(homeX, height + 0.002);
  body.userData.ringY = height + .008;
  const label = groundLabel(parent, name, { x: homeX + side * r, z: 0.033, h: 0.011, opacity: 1 });
  const water = tiltedWater(cup,r*.95,height);
  let level = .004+.010*ml;
  return { body, pick: grip, home, label, side,
    volume(u) { level = u>0 ? .004+.010*ml*u : 0; },
    update() { water(body.rotation.z,level); },
  };
}
function ferric(parent, x, radius = .014) {
  const home = V(x, 0.008), g = new THREE.Group(); parent.add(g);
  const bottle = dropBottle(parent, V(home.x, 0), { label: 'FeCl₃', liq: 0xd6ab4e, h: 0.042, r: radius });
  mesh(g, new THREE.CylinderGeometry(0.0035, 0.0009, 0.048, 16), glass2({ base: 0.19 }), 0, 0.024);
  const col = mesh(g, new THREE.CylinderGeometry(0.0023, 0.00055, 0.029, 16), mat(0xd7aa50), 0, 0.015);
  const bulb = mesh(g, new THREE.SphereGeometry(0.008, 20, 14), mat(0xa35f4f), 0, 0.057);
  bulb.scale.y = 1.6;
  return { body: g, home, pick: pick(g, [0.018, 0.029, 0.018], 0, 0.056), bottle, volume: (u) => { col.visible = u > 0; } };
}
export function bench(parent) {
  const tubes = X.map((_, i) => receiver(parent, i)), baths = BX.map((_, i) => waterBath(parent, i));
  const acids = [-1, 1].map((side) => cylinder(parent, side, '稀硫酸', side * 0.078, 2));
  const water = cylinder(parent, 1, '蒸馏水', 0.009, 1);
  const fe = ferric(parent, .132), partner = ferric(parent, -.019), spoon = spatula({ color: 0x30292c });
  spoon.scale.setScalar(0.52); spoon.rotation.y = Math.PI;
  const spoonG = new THREE.Group(); parent.add(spoonG); spoonG.add(spoon);
  const mn = { body: spoonG, home: V(-0.103, 0.004), pick: pick(spoonG, [0.065, 0.011, 0.013], -0.027, 0.001),
    label: groundLabel(parent, 'MnO₂ 粉末', { x: -0.127, z: 0.024, h: 0.011 }), volume: (u) => { spoon.heap.visible = u > 0; } };
  const tools = [...acids, water, fe, mn, partner];
  const trails = tubes.map(() => {
    const g = new THREE.Group(); parent.add(g);
    const d = mesh(g, new THREE.SphereGeometry(0.002, 12, 9), mat(0xc1dce1));
    d.renderOrder = 11; return d;
  });
  return { tubes, baths, tools, trails };
}

// Atom radii and colors follow microworld.js. Two equally sized observation volumes.
// Atom indices persist throughout the sequence. The drawings express net rearrangement.
const ATOMS = { O: [0xe0483a, 0.36], H: [0xf2f1ec, 0.24], S: [0xe8c23c, 0.44] };
const peroxide = {
  elements: ['O','O','H','H','O','O','H','H'],
  from: [[-.62,0,0],[.62,0,0],[-.98,.70,0],[.94,-.32,.63],[-.62,0,0],[.62,0,0],[-.98,.70,0],[.94,-.32,.63]],
  part: [0,0,0,0,1,1,1,1], bonds: [[0,1],[0,2],[1,3],[4,5],[4,6],[5,7]],
  to: [[-2,0,0],[-.6,2.4,0],[-2.76,.59,0],[-1.24,.59,0],[.6,2.4,0],[2,0,0],[1.24,.59,0],[2.76,.59,0]],
  links: [[0,2],[0,3],[1,4],[5,6],[5,7]],
};
const thio = {
  elements: ['S','S','O','O','O','H','H'],
  from: [[0,0,0],[-1.5,-.85,-.78],[1.1,.6,-.65],[-.65,1.04,.65],[.85,-.84,.8],[0,0,0],[0,0,0]],
  part: [0,0,0,0,0,1,2], bonds: [[0,1],[0,2],[0,3],[0,4]],
  to: [[1.25,1.45,0],[-2.3,-.9,.45],[.18,2.08,0],[2.31,2.08,0],[-.28,-.45,0],[-1.04,.14,0],[.48,.14,0]],
  links: [[0,2],[0,3],[4,5],[4,6]],
};
function atom(parent, el) {
  const [color, radius] = ATOMS[el];
  return mesh(parent, new THREE.SphereGeometry(radius * 1.22, 20, 14), mat(color));
}
const smooth = (x) => { const u = clamp(x, 0, 1); return u*u*(3-2*u); };
function sample(parent, st, side) {
  const g = new THREE.Group(); g.position.set((side ? 1 : -1) * 4.7, 1.4, 0); parent.add(g);
  const spec = st.sulfur ? thio : peroxide;
  const balls = spec.elements.map((el) => atom(g, el));
  const bonds = [...spec.bonds, ...spec.links].map(([a,b], i) => ({
    a,b, old: i < spec.bonds.length, mesh: mesh(g, new THREE.CylinderGeometry(.075,.075,1,9), mat(0x858d95)),
  }));
  const disc = mesh(g, new THREE.CylinderGeometry(4.30,4.30,.12,56),
    new THREE.MeshStandardMaterial({ color: 0xb5cbd1, transparent: true, opacity: .3 }), 0,-1.18);
  disc.renderOrder = -1;
  const title = textSprite(st.labels[side], '#354f60', 'white'); title.scale.set(4.0,1.44,1); title.position.set(0,-1.35,3.3); g.add(title);
  if (st.extra === side) {
    const ion = new THREE.Group(); ion.position.set(-.6,1.65,-3.2); ion.rotation.y = .75; g.add(ion);
    spec.from.slice(0,5).forEach((p,i) => atom(ion,spec.elements[i]).position.set(...p));
    for (const [a,b] of thio.bonds) {
      const d = V(...spec.from[b]).sub(V(...spec.from[a]));
      const bond = mesh(ion,new THREE.CylinderGeometry(.075,.075,d.length(),9),mat(0x858d95));
      bond.position.copy(d).multiplyScalar(.5); bond.quaternion.setFromUnitVectors(V(0,1),d.normalize());
    }
  }
  // Neighbouring sulfur in the solid, shown when the tracked atom reaches the particle.
  const grain = new THREE.Group(); g.add(grain);
  if (st.sulfur) {
    grain.position.set(...thio.to[1]);
    for (const [x,y,z] of [[-.77,-.12,0],[-.38,-.68,.18],[-.3,-.21,-.73],[-.92,-.6,-.55]]) {
      atom(grain,'S').position.set(x,y,z);
    }
  }
  const label = textSprite(st.sulfur ? 'S₂O₃²⁻' : 'H₂O₂','#475761','white');
  label.scale.set(2.9,1.09,1); g.add(label);
  const productLabel = textSprite(st.sulfur ? '固体硫微粒' : 'O₂','#475761','white');
  productLabel.scale.set(st.sulfur ? 3.5 : 2.4,.9,1); g.add(productLabel);
  const axis = V(0,1), d = V();
  return (clock) => {
    // Shorter free paths in a denser sample increase encounter frequency at the same temperature.
    const pathRatio = st.extra === side ? .58 : 1;
    const period = 2.8 * pathRatio / st.tempo[side];
    const joinAt = period * st.attempts[side];
    const k = smooth((clock - joinAt) / 2.3);
    const phase = Math.min(clock, joinAt) / period;
    // In each encounter the particles approach, then separate if it was ineffective.
    const lastApproach = phase >= st.attempts[side] - 1;
    const fraction = clamp(phase - st.attempts[side] + 1, 0, 1);
    const swing = lastApproach ? (1 + Math.cos(Math.PI*fraction))/2 : (1 + Math.cos(2*Math.PI*phase))/2;
    const sep = st.sulfur ? .86 + 1.42 * pathRatio * swing : 2.25;
    grain.visible = st.sulfur && k > .88;
    balls.forEach((ball,i) => {
      const p = spec.from[i], j = spec.part[i];
      const x = p[0] + (j ? 1 : -1)*sep, y = p[1] + (j === 2 ? 1.15 : -.02);
      ball.position.set(x, y, p[2]+(j===2 ? -.35 : 0)).lerp(d.set(...spec.to[i]), k);
    });
    bonds.forEach((b) => {
      const alpha = b.old ? 1-smooth(k/.45) : smooth((k-.50)/.47);
      b.mesh.visible = alpha > .02;
      if (!b.mesh.visible) return;
      const a = balls[b.a].position, end = balls[b.b].position;
      d.copy(end).sub(a); b.mesh.position.copy(a).lerp(end,.5);
      b.mesh.scale.set(alpha,d.length(),alpha); b.mesh.quaternion.setFromUnitVectors(axis,d.normalize());
    });
    label.visible = k === 0 && side === 0;
    label.position.copy(balls[0].position); label.position.y += 1.30;
    productLabel.visible = k > .94 && side === 1;
    productLabel.position.copy(balls[1].position); productLabel.position.y += st.sulfur ? 1.55 : 1.05;
    if (st.sulfur) productLabel.position.x -= .65;
    return k === 1 ? 'product' : k > 0 ? 'change' : 'approach';
  };
}
export function rateScene() {
  let clock = 0, samples = [], phases = [], paused = false, saved = null;
  return {
    holoBase: false, labels: () => false,
    snapshot: () => ({ clock, paused }), resume(s) { saved = s; },
    pause() { paused = !paused; }, get paused() { return paused; }, replay() { clock = 0; paused = false; },
    init(c,st) {
      clock = saved?.clock || 0; paused = saved?.paused || false; saved = null;
      c.view.film = 0; c.view.paper = null;
      samples = [0,1].map(i => sample(c.layer, st, i)); phases = samples.map(draw => draw(clock));
    },
    step(c,st,dt) {
      if (!paused) clock += dt;
      phases = samples.map(draw => draw(clock));
    },
    text(c,st) {
      const changed = phases.indexOf('change');
      const where = st.sulfur && changed >= 0 ? (st.extra >= 0 ? st.labels[changed]+'中' : st.places[changed]) : '';
      const words = changed >= 0 ? (st.sulfur ? where+'，生成硫、二氧化硫和水。' : '追踪球的颜色和数目，看过氧化氢中的原子分别进入水和氧气。')
        : phases.every(p => p === 'product') ? (st.sulfur ? '生成的硫聚成微粒，分散在液体中，使试管里的液体变浑浊。' : '两管都生成水和氧气。') : st.explain;
      return { eq: st.sulfur ? 'S<sub>2</sub>O<sub>3</sub><sup>2−</sup> + 2H<sup>+</sup> → S↓ + SO<sub>2</sub>↑ + H<sub>2</sub>O' : '2H<sub>2</sub>O<sub>2</sub> → 2H<sub>2</sub>O + O<sub>2</sub>↑', on: true, cap: '总反应的原子去向示意 · '+words };
    },
  };
}
