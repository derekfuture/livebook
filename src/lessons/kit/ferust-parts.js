// 图4-21：具支试管右接弯导管，导管下端浸在另一支敞口试管的水中。
import * as THREE from 'three';
import { testTube, glassTube, chemBeaker } from './chem.js';
import { water2 } from './chemfx.js';
import { canvasTex } from './props.js';
import { textSprite } from './microworld.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const CUP = -0.105, TUBE = -0.018, WATER = 0.098;
export const RIM = 0.132, CUP_RIM = 0.068, BRINE_LEVEL = 0.061, HALF = 0.032;
const BASE = 0.009, SURFACE = 0.048, FOOT = 0.02;
const mesh = (geometry, color) => new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));

export function apparatus(group, tag) {
  const salt = chemBeaker({ r: 0.027, h: CUP_RIM, level: BRINE_LEVEL, color: 0xc5dce0, marks: false });
  salt.position.x = CUP;
  group.add(salt);
  const nameplate = (text, x, y, z) => tag(text, 'ferust-name').loc(group, x, y, z);
  const cupName = nameplate('烧杯 · 饱和食盐水', CUP, 0.025, 0.028);
  const mainName = nameplate('具支试管 · 空气', TUBE, 0.086, 0.015);
  const bathName = nameplate('试管 · 水', WATER, 0.024, 0.018);
  const pipeName = nameplate('细导管', 0.078, 0.115, 0.005);
  const jointName = nameplate('橡胶管', 0.037, 0.107, 0.006);
  const rackName = nameplate('试管架', 0.04, 0.0048, 0.027);
  const nailName = nameplate('酸洗除锈的铁钉', CUP, CUP_RIM, 0.008);
  const capName = nameplate('橡胶塞', 0, 0, 0);
  function nameplates(s, microOpen) {
    const desk = !microOpen && !s.near;
    cupName.show(desk); jointName.show(desk); rackName.show(desk);
    mainName.text(s.inside ? '具支试管 · 铁钉和空气' : '具支试管 · 空气').show(desk);
    bathName.show(!microOpen); pipeName.show(!microOpen);
    const high = s.nail.y > RIM;
    nailName.loc(group, s.nail.x - (high ? 0.026 : 0), high ? s.nail.y : s.nail.y + Math.cos(s.angle) * HALF + 0.012, 0.008)
      .text(s.wet ? '铁钉 · 食盐水膜' : '酸洗除锈的铁钉').show(desk && !s.inside);
    capName.loc(group, s.cap.x, s.cap.y + 0.009, 0.016).show(desk);
  }

  const main = testTube({ r: 0.013, len: RIM - BASE });
  const bath = testTube({ r: 0.017, len: 0.095 - BASE });
  main.position.set(TUBE, BASE, 0);
  bath.position.set(WATER, BASE, 0);
  group.add(main, bath);
  const branch = 0.106;
  group.add(glassTube([V(TUBE + 0.012, branch), V(0.004, branch), V(0.025, branch)], { r: 0.0039 }));
  const joint = mesh(new THREE.CylinderGeometry(0.0051, 0.0051, 0.036, 32), 0xab7844);
  joint.rotation.z = -Math.PI / 2 + 0.053;
  joint.position.set(0.037, branch + 0.001, 0); group.add(joint);
  // 右侧盛水试管的口低于弯头，细导管从口上方穿入。
  group.add(glassTube([V(0.054, branch + 0.002), V(0.081, branch + 0.002),
    V(0.092, branch + 0.002), V(WATER - 0.001, branch - 0.001), V(WATER, 0.096),
    V(WATER, 0.08), V(WATER, FOOT)], { r: 0.0039 }));

  // 试管架横梁放在玻璃后面，观察水柱和铁钉时不会被横梁挡住。
  const wood = 0xc09a70;
  const grain = canvasTex(384, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e3c7a2'; ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 36; j++) {
      ctx.strokeStyle = 'rgba(124,84,49,' + (0.08 + (j % 3) * 0.03) + ')';
      ctx.beginPath(); ctx.moveTo(0, j * 1.9);
      ctx.bezierCurveTo(w * 0.3, j * 1.9 + 3, w * 0.7, j * 1.9 - 4, w, j * 1.9);
      ctx.stroke();
    }
  });
  function block(x, y, z, w, h, d) {
    const m = mesh(new THREE.BoxGeometry(w, h, d), wood);
    m.material.map = grain; m.position.set(x, y, z); group.add(m);
  }
  const mid = (TUBE + WATER) / 2;
  block(mid, 0.0045, 0, 0.174, 0.009, 0.052);
  block(mid, 0.062, -0.022, 0.174, 0.005, 0.005);
  for (const x of [mid - 0.084, mid + 0.084]) block(x, 0.0355, -0.022, 0.005, 0.056, 0.006);
  for (const [x, r] of [[TUBE, 0.015], [WATER, 0.019]]) {
    const ring = mesh(new THREE.TorusGeometry(r, 0.0016, 8, 40), wood);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.062, 0); group.add(ring);
    block(x, 0.062, -(r + 0.022) / 2, 0.005, 0.003, 0.022 - r);
  }

  const profile = [[0, -HALF], [0.0026, -0.024], [0.0027, 0.028],
    [0.0068, 0.029], [0.0071, 0.031], [0.006, HALF], [0, HALF]];
  const nail = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 18), 0x62717c);
  nail.material.metalness = 0.42;
  nail.material.roughness = 0.31;
  const film = new THREE.Mesh(new THREE.CylinderGeometry(0.00294, 0.00285, 0.05, 22),
    new THREE.MeshPhongMaterial({ color: 0xb4e0e6, specular: 0xffffff, transparent: true, opacity: 0.55, shininess: 100 }));
  nail.add(film);
  const cap = mesh(new THREE.LatheGeometry([[0, 0], [0.012, 0], [0.0125, 0.001],
    [0.015, 0.016], [0.0148, 0.0177], [0.0142, 0.018], [0, 0.018]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 40), 0x41474a);
  group.add(nail, cap);

  const liquid = new THREE.Mesh(new THREE.LatheGeometry(
    Array.from({ length: 17 }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 32;
      return new THREE.Vector2(0.0168 * Math.cos(a), 0.0168 * (1 + Math.sin(a)) * bath.scale.y);
    }).concat([new THREE.Vector2(0.0168, SURFACE - BASE)]), 48), water2({ color: 0x96c5d6 }));
  liquid.position.set(WATER, BASE + 0.0009, 0); liquid.renderOrder = 7;
  const surface = (r, inner, depth, col) => {
    const profile = Array.from({ length: 16 }, (_, i) => {
      const t = i / 15;
      return new THREE.Vector2(inner + (r - inner) * t, depth * t ** 6);
    });
    const s = new THREE.Mesh(new THREE.LatheGeometry(profile, 40),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
    s.renderOrder = 8; group.add(s); return s;
  };
  const outside = surface(0.0168, 0.0039, 0.00065, 0xaccdd5), meniscus = surface(0.00335, 0, 0.0008, 0x326a79);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.00335, 0.00335, 1, 26, 1, true), new THREE.MeshPhongMaterial({ color: 0x62a5b9, transparent: true, opacity: 0.7, shininess: 85, depthWrite: false }));
  column.renderOrder = 8;
  group.add(liquid, column);
  const waterLevel = (fraction) => {
    const rise = 0.039 * fraction;
    const outer = SURFACE - rise * 0.00335 ** 2 / (0.0168 ** 2 - 0.0039 ** 2);
    outside.position.set(WATER, outer, 0);
    liquid.scale.y = (outer - liquid.position.y) / (SURFACE - BASE);
    const top = SURFACE + rise;
    column.position.set(WATER, (FOOT + top) / 2, 0); column.scale.y = top - FOOT;
    meniscus.position.set(WATER, top + 0.0001, 0);
    bath.glass.userData.ringY = Math.max(top + 0.002, 0.066);
  };
  return { nail, cap, film, bathGlass: bath.glass, meniscus, waterLevel, nameplates };
}

// 两个铁原子、一个氧分子和两个水分子。保留每个原子，示意原子去向，最后汇入铁面的沉淀。
// 水膜上方为溶液，电子路径在金属内，末端抵达碳与水膜接触处。
export function corrosionScene() {
  let time = 0, paused = false, atoms, electrons, labels, links, carbon, deposits, film;
  const ends = [V(0.35, 3.0, 1.8), V(3.05, 4.25, -0.7), V(5.2, 2.3, 1.4), V(2.05, 1.25, 1)];
  const ions = [V(-4.3, 3.5, 1.15), V(-1.8, 2.9, -1)];
  const sites = [V(-2.6, 0.64, 0.45), V(0.65, 0.64, -0.65)];
  const settled = sites.flatMap(site => [site.clone().add(V(-0.93, 0.12)), site.clone().add(V(0.93, 0.12))]);
  // 两个水分子从两侧靠近氧分子。保留两条 O–H 键，另两个 H 分别移向氧分子的两个 O。
  const contact = [1.58, 2.78, -1.58, 5.35].map(x => V(x, 1.5, 0.55));
  const hydroxyl = [V(-0.76, 0.59), V(0.76, 0.59), V(-0.76, 0.59), V(0.76, 0.59)];
  const hydrogenOwner = [2, 0, 1, 3];
  const starts = [V(-4.6, 0.53, 0.7), V(-2.9, 0.53, -0.6),
    V(2.8, 5.1, 0.45), V(4, 5.1, 0.45), V(0.76, 3.8, -0.8), V(5.32, 2.8, 1.8)];
  for (const w of [starts[4], starts[5]]) {
    starts.push(w.clone().add(V(-0.76, 0.59)), w.clone().add(V(0.76, 0.59)));
  }
  const brown = new THREE.Color(0x965335);
  const rust = [0xa6552d, 0x873f24, 0xb56838].map((c) => new THREE.Color(c));
  const p = (i) => atoms[i].g.position;
  const ramp = (a, b) => THREE.MathUtils.smoothstep(time, a, b);
  return {
    holoBase: false, solid: true, labelOnly: () => false,
    get time() { return time; }, set time(v) { time = v; },
    get paused() { return paused; }, set paused(v) { paused = v; },
    init(c) {
      time = 0; paused = false; c.view.film = 0;
      const tile = new THREE.BoxGeometry(2.54, 1.05, 1.78);
      for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) {
        const slab = mesh(tile, 0x65717b);
        slab.position.set(2.56 * x, -0.55, 1.8 * z); c.layer.add(slab);
      }
      const water = new THREE.Mesh(new THREE.BoxGeometry(12.8, 4.95, 5.4),
        new THREE.MeshBasicMaterial({ color: 0x9cceda, opacity: 0.11, transparent: true, depthWrite: false }));
      water.position.y = 2.48; c.layer.add(water); film = water;
      carbon = []; deposits = [];
      // 切换到较大尺度的表面示意。小片间留出空隙，显示疏松锈层。
      const mineral = new THREE.IcosahedronGeometry(1, 2);
      const vertices = mineral.attributes.position, shades = [];
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
        const noise = 0.5 + 0.5 * Math.sin(x * 54 + 8 * z) * Math.cos(y * 28 + z * 23);
        const scale = 0.84 + 0.19 * noise;
        vertices.setXYZ(i, x * scale, y * scale, z * scale);
        const light = 0.57 + 0.43 * noise;
        shades.push(light, light, light);
      }
      mineral.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
      mineral.computeVertexNormals();
      for (let j = 0; j < 48; j++) {
        const patch = mesh(mineral, 0xc4d1c5);
        const n = Math.floor(j / 2), a = n * 2.4, r = 0.43 * Math.sqrt(n);
        patch.position.copy(sites[j % 2]).setY(0.02).add(V(r * Math.cos(a), 0, r * 0.7 * Math.sin(a)));
        patch.material.vertexColors = true; patch.rotation.y = a; patch.visible = false;
        c.layer.add(patch); deposits.push(patch);
      }
      for (let j = 0; j < 5; j++) {
        const cAtom = c.add('Cs', V(3.15 + (j % 3) * 0.63, 0.24, (j % 2) * 0.55), { fixed: true });
        carbon.push(cAtom);
      }
      atoms = ['Fe', 'Fe', 'Os', 'Os', 'Os', 'Os', 'H', 'H', 'H', 'H'].map((kind, i) => c.add(kind, starts[i].clone(), { fixed: true }));
      electrons = Array.from({ length: 4 }, () => {
        const e = mesh(new THREE.SphereGeometry(0.17, 16, 12), 0xf7cb59);
        c.layer.add(e); return e;
      });
      labels = {};
      for (const word of ['Fe', 'Fe²⁺', 'e⁻', 'C', 'O₂', 'H₂O', 'OH⁻', 'Fe(OH)₂']) {
        const s = textSprite(word, '#253e49', '#fff'); s.scale.set(3.9, 1.47, 1); labels[word] = s; c.layer.add(s);
      }
      links = [];
    },
    step(c, st, dt) {
      if (!paused) time = Math.min(time + dt, st.reacted ? 21 : 13 * st.progress);
      for (let i = 0; i < 2; i++) {
        p(i).lerpVectors(starts[i], ions[i], ramp(1.6 + i * 0.7, 4 + i * 0.7)).lerp(sites[i], ramp(10.7, 13));
      }
      for (let i = 0; i < 4; i++) {
        p(i + 2).lerpVectors(starts[i + 2], contact[i], ramp(0.4, 4))
          .lerp(ends[i], ramp(7.5, 9.6)).lerp(settled[i], ramp(10.7, 13));
      }
      links = [];
      if (time < 5.9) {
        for (const d of [-0.13, 0.13]) links.push([p(2).clone().add(V(0, d)), p(3).clone().add(V(0, d))]);
      }
      for (let i = 0; i < 4; i++) {
        const water = 4 + (i >> 1), owner = hydrogenOwner[i], target = 2 + owner;
        const h = p(i + 6);
        h.copy(p(water)).add(starts[i + 6]).sub(starts[water]);
        if (target !== water) {
          const u = ramp(5.9, 7.5);
          h.lerp(p(target).clone().add(hydroxyl[owner]), u);
          h.y += 0.38 * Math.sin(Math.PI * u);
          if (u > 0 && u < 1) continue;
        }
        if (time < 15) links.push([p(time < 5.9 ? water : target), h]);
      }
      electrons.forEach((e, i) => {
        const donor = starts[i >> 1], u = ramp(1.6 + i * 0.35, 4.8 + i * 0.35);
        // 前面的截面露出金属内部，电子从失铁处经过金属，转向碳表面的氧。
        const edge = V(donor.x, -0.49, 2.77), right = V(3.75, -0.49, 2.77), cathode = V(3.72, 0.38, 0.55);
        if (u < 0.16) e.position.lerpVectors(donor, edge, u / 0.16);
        else if (u < 0.79) e.position.lerpVectors(edge, right, (u - 0.16) / 0.63);
        else if (u < 0.91) e.position.lerpVectors(right, cathode, (u - 0.79) / 0.12);
        else e.position.lerpVectors(cathode, p(2 + i % 2), (u - 0.91) / 0.09);
        e.visible = u > 0 && u < 1;
      });
      const mark = (name, pos, dx, dy, show) => {
        const s = labels[name]; s.visible = show; s.position.copy(pos); s.position.x += dx; s.position.y += dy;
      };
      mark('C', V(3.6, 0.15, 0.8), 0.25, -0.58, time < 8.3);
      mark('Fe', p(0), -1.1, 0.75, time < 1.6);
      mark('Fe²⁺', p(0), -0.1, 1, time >= 1.6 && time < 12);
      mark('O₂', p(2), 0.4, 1.1, time < 5.9);
      mark('H₂O', p(4), -0.62, 1.2, time < 5.9);
      mark('OH⁻', p(3), -0.55, 1.3, time >= 7.5 && time < 11.9);
      mark('Fe(OH)₂', sites[0], -0.2, 1.5, time >= 13 && time < 15);
      const e = electrons.find((dot) => dot.visible);
      mark('e⁻', (e || electrons[0]).position, 0.3, -0.8, !!e);
      const surfaceView = time >= 15;
      for (const m of atoms) m.g.visible = !surfaceView;
      for (const m of carbon) m.g.visible = !surfaceView;
      film.visible = !surfaceView;
      for (let i = 0; i < deposits.length; i++) {
        const d = deposits[i], grow = ramp(13 + i * 0.04, 14 + i * 0.04);
        d.visible = grow > 0;
        if (!d.visible) continue;
        const oxidized = ramp(16 + i * 0.032, 17.5 + i * 0.032);
        const dry = ramp(18.5 + i * 0.018, 20 + i * 0.018);
        d.scale.set(0.91 * grow * (1 - dry * 0.13), (0.24 + oxidized * 0.21 - dry * 0.09) * grow, 0.69 * grow);
        d.material.color.setHex(0xd0d9cb).lerp(brown, oxidized).lerp(rust[i % rust.length], dry);
      }
    },
    links: () => links,
    text(c, st) {
      if (time < 1.6) return { eq: '铁钉表面的水膜', cap: '水膜中溶有氧气。找一找铁和碳与水膜接触的地方。' };
      if (time < 5.9) return { eq: '2Fe − 4e⁻ = 2Fe²⁺', cap: '两个铁原子各失去两个电子。Fe²⁺ 进入水膜，电子沿金属流向碳。' };
      if (time < 10.7) return { eq: 'O<sub>2</sub> + 2H<sub>2</sub>O + 4e⁻ = 4OH⁻', cap: '在碳表面，氧得到电子，与水形成 OH⁻。动画只示意原子去向，不代表反应机理。' };
      if (time < 13 || !st.reacted) return { eq: '2Fe + O<sub>2</sub> + 2H<sub>2</sub>O = 2Fe(OH)<sub>2</sub>', cap: 'Fe²⁺ 和 OH⁻ 在铁表面附近相遇，生成附着在铁面上的 Fe(OH)<sub>2</sub> 沉淀。' };
      if (time < 15) return { eq: '2Fe + O<sub>2</sub> + 2H<sub>2</sub>O = 2Fe(OH)<sub>2</sub>', cap: '铁面上形成了 Fe(OH)<sub>2</sub> 沉淀。' };
      if (time < 18.6) return { eq: '以后在空气中 · 表面变化示意', cap: '把时间拉长看铁钉表面。Fe(OH)<sub>2</sub> 继续被氧化，生成红褐色的 Fe(OH)<sub>3</sub>。' };
      return { eq: '铁锈的主要成分　Fe<sub>2</sub>O<sub>3</sub>·xH<sub>2</sub>O', cap: 'Fe(OH)<sub>3</sub> 失去部分水，形成疏松的锈层。水和氧仍能接触铁，腐蚀还会继续。' };
    },
  };
}
