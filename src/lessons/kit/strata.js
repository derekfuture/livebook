// 岩层：每一种岩石有自己的样子（颜色、颗粒、层理、节理、凹凸），切面上一眼看得出是哪一层、是什么岩石——比课本上一块块纯色好看，也更好认。
//
//   import { rockMat, worldUV, ROCK } from './kit/strata.js';
//   const m = new THREE.Mesh(worldUV(new THREE.BoxGeometry(w, t, d), 0.06), rockMat('sandstone'));
//
// 贴图都是程序画的（可以无缝平铺），带凹凸（法线贴图）：砂岩的颗粒和斜层理、页岩一层层的薄层、石灰岩的层面和竖的节理、
// 砾岩的卵石、花岗岩的晶粒、变质岩弯弯的条带、黄土的竖直节理、土壤里的根。同一种岩石在各张活页里长一个样。
// worldUV：按网格自己的坐标铺贴图（不按每个面 0—1 拉伸），薄的层、厚的层纹理一样大；岩块移动时纹理跟着走。
import * as THREE from 'three';

/** 各种岩石：名字（界面上用）、底色 */
export const ROCK = {
  sandstone: { name: '砂岩', base: [214, 186, 138] },
  redbed: { name: '红色砂岩', base: [170, 92, 66] },
  shale: { name: '页岩', base: [112, 108, 98] },
  mudstone: { name: '泥岩', base: [150, 120, 98] },
  limestone: { name: '石灰岩', base: [184, 180, 168] },
  conglomerate: { name: '砾岩', base: [178, 156, 122] },
  granite: { name: '花岗岩', base: [200, 182, 172] },
  basalt: { name: '玄武岩', base: [78, 78, 82] },
  gneiss: { name: '片麻岩', base: [150, 140, 132] },
  quartzite: { name: '石英岩', base: [222, 214, 200] },
  marble: { name: '大理岩', base: [232, 230, 226] },
  loess: { name: '黄土', base: [214, 186, 132] },
  soil: { name: '土壤', base: [108, 82, 58] },
};

const N = 512;          // 贴图边长（像素），无缝平铺
// ---------- 可平铺的值噪声 ----------
const rand = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function noiseField(seed, cells) {          // cells 格的周期噪声，返回 f(x, y)（x、y 是 0—N 的像素坐标）
  const r = rand(seed), g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (i, j) => g[((j % cells) + cells) % cells * cells + (((i % cells) + cells) % cells)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => { const fx = (x / N) * cells, fy = (y / N) * cells, i = Math.floor(fx), j = Math.floor(fy), u = sm(fx - i), v = sm(fy - j); return at(i, j) * (1 - u) * (1 - v) + at(i + 1, j) * u * (1 - v) + at(i, j + 1) * (1 - u) * v + at(i + 1, j + 1) * u * v; };
}
function fbm(seed, base = 4, oct = 5) { const fs = Array.from({ length: oct }, (_, k) => noiseField(seed + k * 101, base << k)); return (x, y) => { let s = 0, a = 0.5, w = 0; for (const f of fs) { s += f(x, y) * a; w += a; a *= 0.5; } return s / w; }; }

// ---------- 每种岩石：给每个像素一个颜色偏移和高度 ----------
function paint(kind, seed) {
  const col = new Float32Array(N * N * 3), hgt = new Float32Array(N * N), [R0, G0, B0] = ROCK[kind].base;
  const grain = fbm(seed, 64, 2), mid = fbm(seed + 7, 8, 4), big = fbm(seed + 13, 2, 3), r = rand(seed + 99);
  const put = (x, y, dr, dg, db, h) => { const k = (y * N + x); col[k * 3] = R0 + dr; col[k * 3 + 1] = G0 + dg; col[k * 3 + 2] = B0 + db; hgt[k] = h; };
  const blobs = [];          // 卵石、晶粒这类要单独画的东西：先画底，再叠上去
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const gn = grain(x, y) - 0.5, md = mid(x, y) - 0.5, bg = big(x, y) - 0.5;
    if (kind === 'sandstone' || kind === 'redbed') {          // 细颗粒 + 平行层理 + 一组斜层理
      const lam = Math.sin((y + md * 18) * (Math.PI * 2 / N) * 22) * 0.5 + Math.sin((y + md * 9) * (Math.PI * 2 / N) * 61) * 0.25, cross = Math.sin(((x * 0.55 + y) + md * 30) * (Math.PI * 2 / N) * 14) * (bg > 0.05 ? 0.6 : 0);
      const coarse = grain(x * 2.3, y * 2.3) > 0.86 ? 1 : 0;
      const t = gn * 30 + lam * 16 + cross * 11 + bg * 18 - coarse * 22;
      put(x, y, t, t * 0.92, t * 0.8, 0.5 + gn * 0.55 + lam * 0.12);
    } else if (kind === 'shale' || kind === 'mudstone') {          // 一层层很薄的层，偶尔有顺层的裂缝
      const yy = y + md * 10, band = Math.sin(yy * (Math.PI * 2 / N) * 64) * 0.5 + Math.sin(yy * (Math.PI * 2 / N) * 23 + 1.3) * 0.5;
      const crack = Math.abs(Math.sin(yy * (Math.PI * 2 / N) * 16)) < 0.04 && grain(x * 0.5, y) > 0.45 ? -1 : 0;
      const t = band * 14 + gn * 10 + bg * 14 + crack * 30;
      put(x, y, t, t, t * 0.95, 0.5 + band * 0.25 + crack * 0.4 + gn * 0.1);
    } else if (kind === 'limestone') {          // 一块块的：层面（横、略弯）、节理（竖，每层错开、不太直）、每块深浅不一、边上风化发暗、零星的小坑
      const beds = 4, yb = (((y + md * 14 + Math.sin((x / N) * Math.PI * 2) * 5) % N) + N) % N, bi = Math.floor((yb / N) * beds), fy = ((yb / N) * beds) % 1;
      const dPlane = Math.min(fy, 1 - fy);
      const off = ((bi * 0.37) % 1) + md * 0.05, jointsPer = 4 + (bi % 2), fx = ((x / N + off) * jointsPer) % 1, ji = Math.floor(((x / N + off) * jointsPer)), dJoint = Math.min(fx, 1 - fx) * 2.6;
      const edge = Math.min(dPlane, dJoint), plane = edge < 0.012 ? 1 : 0, rim = edge < 0.05 ? (0.05 - edge) / 0.05 : 0;
      const cell = (((bi * 7 + ji * 13) % 9) / 9 - 0.5) * 18, pit = grain(x * 1.7, y * 1.7) > 0.82 ? 1 : 0;
      const t = gn * 14 + md * 18 + bg * 10 + cell - plane * 50 - rim * 16 - pit * 26;
      put(x, y, t, t * 0.99, t * 0.95, 0.66 + gn * 0.16 + md * 0.16 - plane * 0.6 - rim * 0.18 - pit * 0.2);
    } else if (kind === 'conglomerate') {
      const t = gn * 30 + md * 16; put(x, y, t, t * 0.9, t * 0.8, 0.4 + gn * 0.3);
    } else if (kind === 'granite') {          // 底色，晶粒另画
      const t = gn * 24 + md * 10; put(x, y, t, t * 0.95, t * 0.95, 0.5 + gn * 0.4);
    } else if (kind === 'basalt') {
      const t = gn * 18 + md * 10; put(x, y, t, t, t * 1.04, 0.5 + gn * 0.4);
    } else if (kind === 'gneiss' || kind === 'quartzite' || kind === 'marble') {          // 弯弯的条带（叶理）；石英岩、大理岩淡一些
      const yy = y + Math.sin((x / N) * Math.PI * 2 * 2 + md * 4) * 22 + md * 26, band = Math.sin(yy * (Math.PI * 2 / N) * (kind === 'gneiss' ? 14 : 6));
      const k = kind === 'gneiss' ? 34 : kind === 'quartzite' ? 12 : 8, vein = kind === 'marble' && Math.abs(md + bg * 0.6) < 0.012 ? -60 : 0;
      const t = band * k + gn * (kind === 'quartzite' ? 26 : 14) + vein;
      put(x, y, t, t * 0.97, t * 0.94, 0.5 + band * 0.2 + gn * 0.2);
    } else if (kind === 'loess') {          // 黄土：均匀的细粉，竖直的节理，淡红的古土壤条带
      const fx = ((x / N) * 9 + md * 0.8) % 1, joint = Math.min(fx, 1 - fx) < 0.008 + grain(x, y * 0.2) * 0.008 ? 1 : 0;
      const paleo = Math.max(0, Math.sin((y + md * 8) * (Math.PI * 2 / N) * 3)) ** 8;
      put(x, y, gn * 16 + bg * 10 - joint * 42 - paleo * 6, gn * 14 + bg * 8 - joint * 42 - paleo * 22, gn * 10 - joint * 40 - paleo * 30, 0.6 + gn * 0.2 - joint * 0.6);
    } else if (kind === 'soil') {          // 土壤：团粒、往下扎的根，越往上越黑
      const dark = (1 - y / N) * 18, root = Math.abs(Math.sin((x + Math.sin(y * 0.05 + x * 0.01) * 14) * (Math.PI * 2 / N) * 26)) < 0.03 && mid(x * 2, y) > 0.55 ? 1 : 0;
      const t = gn * 30 + md * 18 - dark + root * 40;
      put(x, y, t, t * 0.85, t * 0.7, 0.5 + gn * 0.5 + root * 0.2);
    }
  }
  // 卵石、晶粒、气孔
  const disc = (cx, cy, rx, ry, rot, fn) => { const R = Math.ceil(Math.max(rx, ry)) + 1; for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const c = Math.cos(rot), s = Math.sin(rot), u = (i * c + j * s) / rx, v = (-i * s + j * c) / ry, d = u * u + v * v; if (d > 1) continue; const x = ((Math.round(cx) + i) % N + N) % N, y = ((Math.round(cy) + j) % N + N) % N; fn((y * N + x), d, u, v); } };
  if (kind === 'conglomerate') for (let n = 0; n < 230; n++) {
    const rx = 5 + r() * 16, ry = rx * (0.55 + r() * 0.35), tone = [[200, 196, 188], [150, 140, 128], [120, 92, 74], [226, 214, 190], [96, 98, 102]][Math.floor(r() * 5)];
    disc(r() * N, r() * N, rx, ry, r() * Math.PI, (k, d, u, v) => { const sh = (1 - d) * 0.6 - (u + v) * 0.12; col[k * 3] = tone[0] * (0.82 + sh * 0.4); col[k * 3 + 1] = tone[1] * (0.82 + sh * 0.4); col[k * 3 + 2] = tone[2] * (0.82 + sh * 0.4); hgt[k] = 0.6 + Math.sqrt(1 - d) * 0.5; });
  }
  if (kind === 'granite') for (let n = 0; n < 2600; n++) {
    const p = r(), tone = p < 0.42 ? [236, 226, 214] : p < 0.7 ? [214, 158, 140] : p < 0.88 ? [168, 170, 176] : [40, 38, 40], s = p < 0.88 ? 2 + r() * 4.5 : 1 + r() * 2.2;
    disc(r() * N, r() * N, s, s * (0.6 + r() * 0.5), r() * Math.PI, (k, d) => { col[k * 3] = tone[0] * (0.92 + (1 - d) * 0.1); col[k * 3 + 1] = tone[1] * (0.92 + (1 - d) * 0.1); col[k * 3 + 2] = tone[2] * (0.92 + (1 - d) * 0.1); hgt[k] = 0.5 + (p < 0.88 ? 0.25 : -0.1); });
  }
  if (kind === 'basalt') for (let n = 0; n < 320; n++) { const s = 1.2 + r() * 3.6; disc(r() * N, r() * N, s, s * (0.7 + r() * 0.3), r() * Math.PI, (k, d) => { col[k * 3] *= 0.45; col[k * 3 + 1] *= 0.45; col[k * 3 + 2] *= 0.45; hgt[k] = 0.15 + d * 0.3; }); }
  return { col, hgt };
}

function toTextures(kind, { col, hgt }, strength) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), im = g.createImageData(N, N);
  for (let k = 0; k < N * N; k++) { im.data[k * 4] = Math.max(0, Math.min(255, col[k * 3])); im.data[k * 4 + 1] = Math.max(0, Math.min(255, col[k * 3 + 1])); im.data[k * 4 + 2] = Math.max(0, Math.min(255, col[k * 3 + 2])); im.data[k * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  const n = document.createElement('canvas'); n.width = n.height = N;
  const gn = n.getContext('2d'), nm = gn.createImageData(N, N), H = (x, y) => hgt[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), k = (y * N + x) * 4;
    nm.data[k] = (-dx / l * 0.5 + 0.5) * 255; nm.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; nm.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; nm.data[k + 3] = 255;
  }
  gn.putImageData(nm, 0, 0);
  const map = new THREE.CanvasTexture(c), normalMap = new THREE.CanvasTexture(n);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, normalMap };
}

const cache = new Map();
/** 一种岩石的贴图（颜色 + 法线），各张活页共用一份 */
export function rockTextures(kind) {
  if (!ROCK[kind]) throw new Error(`没有这种岩石：${kind}`);
  if (!cache.has(kind)) cache.set(kind, toTextures(kind, paint(kind, kind.length * 977 + kind.charCodeAt(0) * 31), kind === 'limestone' || kind === 'loess' ? 3.2 : kind === 'conglomerate' || kind === 'granite' ? 2.6 : 1.8));
  return cache.get(kind);
}

const pxCache = new Map();
/** 一种岩石贴图的像素（自己逐像素画剖面的活页用：取它的颗粒、层理当细节，颜色可以另定） */
export function rockPixels(kind) {
  if (!pxCache.has(kind)) {
    const d = rockTextures(kind).map.image.getContext('2d').getImageData(0, 0, N, N).data; let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4; pxCache.set(kind, { data: d, n: N, mean: [r / n, g / n, b / n] });
  }
  return pxCache.get(kind);
}

/** 一种岩石的材质：真实画风里哑光、有明暗、自己亮一点点（和 ink.js 的 'real' 一样） */
export function rockMat(kind, { tint, ...opts } = {}) {
  const { map, normalMap } = rockTextures(kind);
  const m = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.94, metalness: 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.1, ...opts });
  if (tint != null) m.color.set(tint);
  return m;
}

/**
 * 按网格自己的坐标铺贴图：朝上、朝下的面用 (x, z)，朝东西的面用 (z, y)，朝南北的面用 (x, y)，除以 size（贴图铺一遍多大）。
 * 盒子、挤出体都可以用；会覆盖原来的 uv。
 */
export function worldUV(geo, size = 0.06, { offset = [0, 0] } = {}) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal || (geo.computeVertexNormals(), geo.attributes.normal), uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    const [u, v] = ay > ax && ay > az ? [x, z] : ax > az ? [z, y] : [x, y];
    uv[i * 2] = u / size + offset[0]; uv[i * 2 + 1] = v / size + offset[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
