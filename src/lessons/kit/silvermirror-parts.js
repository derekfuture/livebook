// 图 3-17。试管模型的原点在圆底，滴管模型的原点在尖端。
import * as THREE from 'three';
import { chemBeaker, glassMat, testTube, tubeClamp, tubeRack } from './chem.js';
import { stand } from './props.js';
import { tubeLiquid, water2 } from './chemfx.js';
import { dropBottle } from './labops.js';
import { faceLabel } from './labels.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const X = 0.021, BX = 0.100, RIM = 0.061, WATER = 0.046;
export const LEN = 0.087, BASE = 0.009, R = 0.0093, RACK = 0.022;
export const NAMES = ['2% AgNO₃', '2% 氨水', '乙醛'];
export const HOMES = [-0.135, -0.084, -0.033].map(x => V(x, 0.032));
export const HOME = V(X, BASE), BATH = V(BX, 0.006);
const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.42 });
function part(parent, geometry, material, p = V()) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(p); parent.add(mesh);
  return mesh;
}
function pick(parent, radius, height, y) {
  const m = part(parent, new THREE.CylinderGeometry(radius, radius, height, 16),
    new THREE.MeshBasicMaterial({ visible: false }), V(0, y));
  m.userData.pick = true;
  return m;
}

// The silver occupies the wetted inner surface. Each seed grows in two surface
// dimensions. Once islands meet, adjacent patches share a single reflection.
function lining(tube) {
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16 - 1) * Math.PI / 2;
    profile.push(new THREE.Vector2(Math.max(0.00001, R * 0.985 * Math.cos(a)), R + 0.0008 + R * 0.985 * Math.sin(a)));
  }
  profile.push(new THREE.Vector2(R * 0.985, 0.037));
  const material = new THREE.ShaderMaterial({
    uniforms: { growth: { value: 0 } },
    vertexShader: `
      varying vec3 loc; varying vec3 refl;
      void main(){
        loc = position;
        vec4 eye = modelViewMatrix * vec4(position, 1.);
        refl = reflect(normalize(eye.xyz), normalize(normalMatrix * normal));
        gl_Position = projectionMatrix * eye;
      }`,
    fragmentShader: `
      varying vec3 loc; varying vec3 refl; uniform float growth;
      vec2 noise2(vec2 p){ return fract(sin(vec2(dot(p,vec2(23.1,87.3)),dot(p,vec2(47.2,19.9))))*4375.15); }
      void main(){
        vec2 uv = vec2((atan(loc.z,loc.x)/6.2831853+.5)*16.,loc.y*290.);
        vec2 cell=floor(uv), f=fract(uv); float first=3.;
        for (int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){
          vec2 k=vec2(float(x),float(y)), id=cell+k; id.x=mod(id.x,16.);
          vec2 seed=noise2(id);
          first=min(first,.55*length(k+.14+.72*seed-f)+.25*seed.y+.20*loc.y/.037);
        }}
        if(growth<first) discard;
        vec3 r=normalize(refl);
        float windowLight=smoothstep(-.62,.38,sin(4.2*r.x+1.1*r.y+.8*r.z));
        float horizon=smoothstep(-.1,.45,r.y+.3*r.x);
        vec3 silver=mix(vec3(.12,.15,.19),vec3(1.,.99,.97),.86*windowLight+.14*horizon);
        silver+=vec3(.36)*exp(-18.*abs(r.x+.30*r.y-.18));
        silver+=vec3(.15,.11,.07)*smoothstep(-.25,.55,-r.y)*(.25+.75*(1.-windowLight));
        gl_FragColor=vec4(silver,1.);
      }`,
  });
  const film = part(tube, new THREE.LatheGeometry(profile, 96), material);
  film.renderOrder = 10;
  return growth => { film.visible = growth > 0; material.uniforms.growth.value = growth; };
}

const ink = { color: '#263e46', stroke: '#fff', opacity: 1 };
const barrelBase = 0.018, barrelRange = 0.024;

// A longitudinal section of the concave surface, revolved around the pipette axis.
function pipetteFill(g, measured) {
  const radius = measured ? 0.0036 : 0.00165;
  const base = measured ? barrelBase : 0, height = measured ? barrelRange : 0.016;
  const water = water2({ color: 0xc3dade, base: 0.65 });
  const column = part(g, new THREE.CylinderGeometry(radius, measured ? radius : 0.00075, 1, 24, 1, true), water);
  const profile = [[radius, 0], [radius, 0.0012], [radius * 0.84, 0.00022], [radius * 0.55, 0.00004], [0, 0]];
  const surface = part(g, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), water);
  if (measured) {
    const line = [-1, -0.84, -0.55, 0, 0.55, 0.84, 1].map(x =>
      V(radius * x, 0.0012 * Math.abs(x) ** 5, radius * Math.sqrt(1 - x * x)));
    const edge = part(surface, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 32, 0.00009, 6, false), mat(0x4c6c76));
    edge.renderOrder = 10;
  }
  const stem = measured ? part(g, new THREE.CylinderGeometry(0.00165, 0.00065, base, 16), water, V(0, base / 2)) : null;
  return fraction => {
    const h = height * fraction;
    column.visible = surface.visible = fraction > 0.001;
    column.position.y = base + h / 2; column.scale.y = Math.max(0.00001, h);
    surface.position.y = base + h;
    if (stem) stem.visible = column.visible;
  };
}

function graduations(g) {
  const dark = mat(0x38494e);
  for (let i = 0; i <= 10; i++) {
    const major = i % 5 === 0, y = barrelBase + barrelRange * i / 10;
    const width = major ? 0.0029 : 0.0016;
    part(g, new THREE.BoxGeometry(width, 0.00020, 0.00013), dark, V(-0.0044 + width / 2, y, 0.0045));
    if (major) faceLabel(g, ['0', '0.5', '1 mL'][i / 5], { ...ink, x: -0.0079, y, z: 0.0045, h: 0.0034 });
  }
}

export function bench(group, tag) {
  const plates = [];
  function nameplate(obj, text, y, z) {
    const plate = tag(text, 'silver-name').loc(obj, 0, y, z);
    plates.push(plate);
    return plate;
  }
  const rack = tubeRack({ h: RACK, r: R + 0.0028, w: 0.041, d: 0.043 });
  rack.position.x = X; group.add(rack);
  nameplate(rack, '试管架', 0.004, 0.022);
  const tube = testTube({ r: R, len: LEN }); group.add(tube);
  const tubePick = pick(tube, R + 0.003, 0.066, 0.052);
  const tubeName = nameplate(tube, '洁净试管', 0.060, R);
  const liquid = tubeLiquid({ R: R - 0.00015, yc: R + 0.0008, top: LEN, base: 0.40, specks: 75, speck: 0.00066 });
  tube.add(liquid);
  // Shear the upper cylindrical section only; the round bottom stays against the glass.
  let lastGeometry, lastTilt;
  function levelSurface(tilt) {
    const geo = liquid.milk.geometry;
    if (!liquid.milk.visible || (geo === lastGeometry && tilt === lastTilt)) return;
    const profile = geo.parameters.points;
    const top = profile[profile.length - 1].y, pos = geo.attributes.position;
    if (top < R + 0.002) return;
    if (geo !== lastGeometry) {
      geo.userData.surface = [];
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - top) < 0.00001) geo.userData.surface.push(i);
    }
    for (const i of geo.userData.surface) pos.setY(i, top - pos.getX(i) * Math.tan(tilt));
    pos.needsUpdate = true; lastGeometry = geo; lastTilt = tilt;
  }
  const film = lining(tube);
  const bath = chemBeaker({ r: 0.031, h: RIM, level: WATER, marks: false, color: 0xe2eef0 });
  group.add(bath); bath.position.x = BX;
  nameplate(bath, '烧杯 · 热水', 0.009, 0.032);
  const support = stand({ height: 0.40, baseW: 0.18, baseD: 0.16 });
  const scale = 0.30, clampY = BATH.y + LEN * 0.80;
  support.scale.setScalar(scale);
  support.rotation.y = Math.PI;
  support.position.x = BX + 0.062;
  group.add(support);
  const rodX = support.position.x - support.rodX * scale;
  support.clamp(clampY / scale, (rodX - BX - R - 0.004) / scale);
  const jaws = tubeClamp(R);
  jaws.rotation.y = Math.PI;
  jaws.position.set(BX, clampY, 0);
  group.add(jaws);
  nameplate(support, '铁架台', 0.025, -0.083);
  const pipettes = HOMES.map((home, id) => {
    const bottle = dropBottle(group, V(home.x, 0), { brown: id === 0, r: 0.0155 });
    nameplate(bottle, '滴瓶 · ' + NAMES[id], 0.020, 0.0155);
    bottle.fill.scale.y = 1.5; bottle.fill.position.y = 0.019;
    const g = new THREE.Group(); group.add(g);
    const stem = part(g, new THREE.CylinderGeometry(0.0025, 0.0009, 0.019, 16), glassMat({ opacity: 0.48 }), V(0, 0.0095));
    stem.renderOrder = 9;
    const neck = id === 0 ? 0.029 : 0;
    if (id === 0) {
      const barrel = part(g, new THREE.CylinderGeometry(0.0043, 0.0038, neck, 24), glassMat({ opacity: 0.35 }), V(0, 0.017 + neck / 2));
      barrel.renderOrder = 9; graduations(g);
    }
    const fill = pipetteFill(g, id === 0);
    const rubber = mat(0x9b4f42);
    part(g, new THREE.CylinderGeometry(0.006, 0.006, 0.004, 24), rubber, V(0, 0.018 + neck));
    part(g, new THREE.SphereGeometry(0.0058, 24, 16), rubber, V(0, 0.028 + neck)).scale.y = 1.65;
    nameplate(g, '滴管 · ' + NAMES[id], 0.029 + neck, 0.006);
    return { g, fill, pick: pick(g, 0.0078, 0.026, 0.027 + neck) };
  });
  const drop = part(group, new THREE.SphereGeometry(0.002, 18, 12), mat(0xa2b8c0));
  drop.scale.y = 1.45; drop.renderOrder = 11;
  const stream = part(group, new THREE.CylinderGeometry(0.00075, 0.00062, 1, 12), water2({ color: 0xc3dade, base: 0.80 }));
  stream.scale.y = 0.0001; stream.renderOrder = 11;
  return { tube, tubePick, liquid, levelSurface, tubeName, plates, film, pipettes, drop, stream, jaws };
}

const ELEMENT = { C: [0x3d4350, 0.40], O: [0xe0483a, 0.36], H: [0xf2f1ec, 0.24], Ag: [0xe9ecf1, 0.66], N: [0x4a78d8, 0.36] };
const smooth = n => { const k = clamp(n, 0, 1); return k * k * (3 - 2 * k); };
const label = (g, text, x, y, z = 0) => faceLabel(g, text, { x, y, z, h: 0.72, color: '#243747', stroke: '#fff' });

// Atom mapping of the net ionic equation, not a proposed elementary mechanism.
// The organic half is drawn on the left, the two linear complexes on the right.
export function silverScene() {
  let t = 0, paused = false, saved = null, draw;
  const length = 12, groups = 2;
  return {
    holoBase: false, still: true, solid: true,
    snapshot: () => ({ t, paused }), restore: s => { saved = s; },
    toggle: () => { paused = !paused; }, replay: () => { t = 0; paused = false; },
    get paused() { return paused; },
    init(c) {
      t = saved?.t ?? 0; paused = saved?.paused ?? false; saved = null;
      c.view.film = 0; c.view.paper = null;
      const g = new THREE.Group(); c.layer.add(g);
      if (innerWidth <= 760) g.scale.setScalar(1.32);
      const geo = new THREE.SphereGeometry(1, 24, 16);
      const materials = Object.fromEntries(Object.entries(ELEMENT).map(([e, v]) => [e, mat(v[0])]));
      const atom = (e, p, parent = g) => {
        const a = part(parent, geo, materials[e], p);
        a.scale.setScalar(ELEMENT[e][1] * 1.65); return a;
      };
      const active = new THREE.Group(); g.add(active);
      const carbon = V(-4.5, 3.6), methyl = V(-5.64, 3.04, 0.28);
      atom('C', carbon, active); atom('C', methyl, active);
      [V(-0.47, 0.71, 0.45), V(-0.5, -0.39, -0.65), V(0.03, -0.71, 0.61)].forEach(d => atom('H', methyl.clone().add(d), active));
      atom('O', carbon.clone().add(V(0.03, 1.08)), active);
      const hydrogen = carbon.clone().add(V(0.79, -0.48, 0.2));
      const aldehydeH = atom('H', hydrogen, active);
      const hydroxyl = [V(-1.4, 2), V(-3.5, 0.05), V(-6.5, 0.4)];
      const hydroxides = hydroxyl.map((p, i) => {
        const o = atom('O', p, active);
        const h = atom('H', p.clone().add(V(i === 0 ? -0.52 : -0.37, 0.49, 0.28)), active);
        return { o, h, origin: h.position.clone() };
      });
      const organic = [label(active, 'CH₃CHO', -5.2, 5.65), label(active, 'CH₃COO⁻', -5.2, 5.65)];
      const hydroxide = label(active, 'OH⁻', -2.0, 1.08), water = label(active, 'H₂O', -3.1, -1.0);
      const origins = [V(1.6, 4.5), V(4.8, 2.75)];
      const dissolved = [[V(-0.55, 3.8), V(2.4, 7.1)], [V(2.65, 4.45), V(7.15, 5.8)]];
      const complexLabel = label(active, '[Ag(NH₃)₂]⁺', 1.5, 7.0);
      const silverLabel = label(g, 'Ag', 5.8, -0.2);
      const ammoniaLabel = label(active, 'NH₃', 6.42, 4.56);
      const dots = [], ligands = [], metals = origins.map((p, i) => {
        const direction = V(0.72, 0.67, i ? -0.2 : 0.2).normalize();
        ligands.push([-1, 1].map(sign => {
          const nh = new THREE.Group(); active.add(nh);
          atom('N', V(), nh);
          const axis = direction.clone().multiplyScalar(sign);
          const side = V(-axis.y, axis.x, 0).normalize(), normal = new THREE.Vector3().crossVectors(axis, side);
          for (let j = 0; j < 3; j++) {
            const a = j * 2 * Math.PI / 3;
            atom('H', axis.clone().multiplyScalar(0.33).addScaledVector(side, 0.67 * Math.cos(a)).addScaledVector(normal, 0.67 * Math.sin(a)), nh);
          }
          return { g: nh, dir: axis };
        }));
        const e = part(active, geo, new THREE.MeshBasicMaterial({ color: 0x265fc7 })); e.scale.setScalar(0.245); dots.push(e);
        return atom('Ag', p, active);
      });
      const eLabel = label(active, 'e⁻', 0, 0);
      part(g, new THREE.BoxGeometry(7.4, 0.24, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x9ab4bd, transparent: true, opacity: 0.5 }), V(3.2, -1.62, -0.3));
      label(g, '试管内壁', 3.15, -2.18, 1.38);
      const land = (round, i) => V(1.56 + 2.17 * i + round * 1.085, -0.47 + round * 1.77, -0.55 + round * 0.64);
      const deposited = [0, 1].map(i => atom('Ag', land(0, i)));
      draw = () => {
        const round = Math.min(groups - 1, Math.floor(t / length)), u = (t - round * length) / length;
        const change = smooth((u - 0.22) / 0.35), transfer = smooth((u - 0.23) / 0.32);
        const descend = smooth((u - 0.70) / 0.22), free = smooth((u - 0.48) / 0.22);
        hydroxides[0].o.position.copy(hydroxyl[0]).lerp(carbon.clone().add(V(0.91, -0.55, 0.12)), change);
        hydroxides[0].h.position.copy(hydroxides[0].origin).lerp(hydroxyl[2].clone().add(V(0.55, 0.41, 0.21)), change);
        aldehydeH.position.copy(hydrogen).lerp(hydroxyl[1].clone().add(V(0.58, 0.39, 0.18)), change);
        organic[0].visible = hydroxide.visible = change < 0.5; organic[1].visible = water.visible = change >= 0.8;
        complexLabel.visible = free < 0.05; ammoniaLabel.visible = free > 0.8;
        silverLabel.visible = descend > 0.88 || round > 0;
        deposited.forEach(a => { a.visible = round > 0; });
        for (let i = 0; i < 2; i++) {
          metals[i].position.copy(origins[i]).lerp(land(round, i), descend);
          ligands[i].forEach(({ g: nh, dir }, index) => {
            nh.position.copy(origins[i]).addScaledVector(dir, 1.57).lerp(dissolved[i][index], free);
          });
          dots[i].position.copy(carbon).lerp(origins[i], transfer);
          dots[i].position.y += (i ? -0.9 : 0.9) * Math.sin(transfer * Math.PI);
          dots[i].visible = transfer > 0 && transfer < 1;
        }
        // Products leave the displayed patch before the next group enters.
        // Deposited silver stays attached to the glass throughout the exchange.
        const slide = round === 0 ? smooth((u - 0.93) / 0.07) : 1 - smooth(u / 0.12);
        active.position.z = -slide * 19;
        active.visible = slide < 0.96;
        metals.forEach((a, i) => {
          if (round === 0 && u > 0.93) {
            deposited[i].visible = true;
            a.visible = false;
          } else a.visible = true;
        });
        eLabel.visible = dots[0].visible; eLabel.position.copy(dots[0].position).y += 0.65;

      };
      draw();
    },
    step(c, st, dt) { if (!paused) t = Math.min(t + dt, length * groups * st.growth); draw(); },
    text(_, st) {
      if (!st.growth) return { eq: '乙醛　·　银氨配离子', cap: '还未水浴温热。先辨认醛基和两个配离子中心的银。' };
      const u = t === length * groups ? 1 : (t % length) / length;
      if (u < 0.22) return { eq: '乙醛　·　银氨配离子', cap: t < length ? '看醛基上的碳，以及两个配离子中心的银。' : '另一组粒子来到内壁附近。先前沉积的银仍留在原处。' };
      if (u < 0.57) return { eq: 'CH₃CHO → CH₃COO⁻', cap: '乙醛被氧化。两个蓝点示意转移的两个电子，各移向一个配离子中心的银。', on: true };
      if (u < 0.70) return { eq: '2[Ag(NH₃)₂]⁺ + 2e⁻ → 2Ag + 4NH₃', cap: '两个配离子中的银各得到一个电子，四个氨分子留在溶液中。', on: true };
      return { eq: 'Ag', cap: u < 0.92 ? '跟着银原子，看它们移向试管内壁。' : '生成的银留在内壁上。越来越多的银聚在一起，宏观上能看见银镜。', on: true };
    },
  };
}
