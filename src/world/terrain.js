// 俯冲用的一块真实地形：高程（Terrarium 编码的 PNG，tools/geo/terrain_patch.py 做的）+ 卫星影像。
// 地形按当地的东—北平面铺开，可以贴在地球上（球面上的一块，跟着地球一起放大），也可以单独摆成一块（以后接到书上的模型）。
// 受光不用场景里的灯：在地形自己的坐标里给一个固定的太阳方向（和卫星拍摄时差不多，东南方上午的太阳），换到哪个场景里样子都一样。
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import cbDem from '../lessons/data/terrain/changbai.png';
import cbImg from '../lessons/data/terrain/changbai.jpg';
import qmDem from '../lessons/data/terrain/qomolangma.png';
import qmImg from '../lessons/data/terrain/qomolangma.jpg';

const R_KM = 6371, D2R = Math.PI / 180;
const SRC = '卫星影像：Sentinel-2 cloudless 2020（EOX，含 Copernicus 数据，CC BY-NC-SA 4.0）· 高程：AWS Terrain Tiles（SRTM 等）';
/** 每处地形：中心、边长（km）、高度放大几倍；target 是镜头看的那一点；view 从哪边看（az 镜头在目标的哪个方位，度，北 0 东 90）、俯角、看多宽（km）；cut 是画在地形上的那条线 */
export const TERRAIN = {
  cb: {
    name: '长白山', dem: cbDem, img: cbImg, lat: 42.17, lon: 128.19, size: 110, exag: 3,          // 从西边看：地形往东（镜头对面）多铺一些
    target: [42.18, 128.07], view: { az: 270, el: 26, km: 60 },          // 从西边看过去：北坡从左边的山脚一路升到右边的天池——和活页模型一样北坡在左，落到书上变成模型时方位不翻
    cut: { pts: [[42.37, 128.09], [42.028, 128.058]], text: '北坡：从约 770 米的山脚，爬到天池火山口北缘附近约 2 350 米处（高程数据是近似的）', nameAt: 1, textAt: 0.45 },          // nameAt、textAt：山名、说明写在线上走到哪儿
    crop: [[41.97, 42.41], [127.86, 128.28]],          // 切出来落到书上的那一块：天池和整条北坡
    src: SRC,
  },
  hima: {
    name: '喜马拉雅山脉', dem: qmDem, img: qmImg, lat: 27.93, lon: 86.93, size: 170, exag: 1.5,
    target: [27.96, 86.88], view: { az: 265, el: 38, km: 165 },          // 从西边看：左边是北坡（青藏高原），右边是南坡（尼泊尔的河谷）——和活页模型一样北坡在左
    cut: { pts: [[27.3, 86.75], [27.988, 86.925], [28.62, 86.9]], text: '南坡从 1 000 米左右的河谷爬上珠峰（8 849 米），北坡脚下是 4 500 米左右的青藏高原', nameAt: 0.535, textAt: 0.22 },
    crop: [[27.22, 28.66], [86.6, 87.15]],
    src: SRC,
  },
};

const img = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

/** 读进来：高程表、影像贴图。def.ready 是 Promise，第一次指着旗时就开始下 */
export function loadTerrain(def) {
  return (def.ready ||= Promise.all([img(def.dem), new THREE.TextureLoader().loadAsync(def.img)]).then(([im, tex]) => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const p = g.getImageData(0, 0, c.width, c.height).data, n = c.width, E = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) E[i] = p[i * 4] * 256 + p[i * 4 + 1] - 32768;
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    def.E = E; def.n = n; def.tex = tex;
    return def;
  }));
}

/** 当地平面上的一点（东 x、北 y，km，以地形中心为原点）的高程（米），双线性 */
export function elevAt(def, x, y) {
  const n = def.n, u = (x / def.size + 0.5) * n - 0.5, v = (0.5 - y / def.size) * n - 0.5;
  const i = Math.max(0, Math.min(n - 2, Math.floor(u))), j = Math.max(0, Math.min(n - 2, Math.floor(v))), fu = Math.min(1, Math.max(0, u - i)), fv = Math.min(1, Math.max(0, v - j));
  const E = def.E, a = E[j * n + i], b = E[j * n + i + 1], c = E[(j + 1) * n + i], d = E[(j + 1) * n + i + 1];
  return a * (1 - fu) * (1 - fv) + b * fu * (1 - fv) + c * (1 - fu) * fv + d * fu * fv;
}
/** 经纬度 → 当地平面（km） */
export const toLocal = (def, lat, lon) => ({ x: (lon - def.lon) * 111.32 * Math.cos(def.lat * D2R), y: (lat - def.lat) * 111.32 });
/** 那条线（几个点连起来）上走到 f（0—1）的那一点，当地平面 km */
export function cutAt(def, f) {
  const P = def.cut.pts.map((q) => toLocal(def, ...q)), L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y));
  const d = f * L[L.length - 1]; let i = 1; while (i < P.length - 1 && L[i] < d) i++;
  const k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  return { x: P[i - 1].x + (P[i].x - P[i - 1].x) * k, y: P[i - 1].y + (P[i].y - P[i - 1].y) * k };
}

/** 地球上这块地形的东、北、上三个方向（地球自己的坐标，半径 1；和 kit/plates.js 的 ll2v 一致） */
export function frameAt(lat, lon) {
  const la = lat * D2R, lo = lon * D2R;
  const up = new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
  const east = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo));
  const north = new THREE.Vector3().crossVectors(up, east).normalize();
  return { up, east, north };
}

/** 贴在地球上的那一块（地球自己的坐标：半径 1）。返回 mesh 和画线用的 cutLine */
export function globePatch(def, segs = 220) {
  const F = frameAt(def.lat, def.lon), K = def.exag / 1000 / R_KM;          // 高程（米）→ 地球半径的倍数（放大 exag 倍）
  const geo = new THREE.PlaneGeometry(1, 1, segs, segs), pos = geo.attributes.position, uv = geo.attributes.uv;
  const V = new THREE.Vector3(), place = (x, y, hm, out) => out.copy(F.up).addScaledVector(F.east, x / R_KM).addScaledVector(F.north, y / R_KM).normalize().multiplyScalar(1 + hm * K);
  for (let i = 0; i < pos.count; i++) {
    const x = (uv.getX(i) - 0.5) * def.size, y = (uv.getY(i) - 0.5) * def.size;
    place(x, y, elevAt(def, x, y), V); pos.setXYZ(i, V.x, V.y, V.z);
  }
  geo.computeVertexNormals();
  const sunL = new THREE.Vector3().copy(F.east).multiplyScalar(0.45).addScaledVector(F.north, -0.55).addScaledVector(F.up, 0.7).normalize();          // 东南方上午的太阳（和卫星拍的影子方向一致）
  const mat = new THREE.ShaderMaterial({
    transparent: true, uniforms: { map: { value: def.tex }, sunL: { value: sunL }, k: { value: 0 }, hazeC: { value: new THREE.Color(0xc9d6e3) }, haze: { value: new THREE.Vector2(1e5, 2e5) }, hole: { value: new THREE.Vector4(2, 2, -1, -1) }, holeK: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying float vD; void main(){ vUv = uv; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vD = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform vec3 sunL; uniform float k; uniform vec3 hazeC; uniform vec2 haze; uniform vec4 hole; uniform float holeK; varying vec2 vUv; varying vec3 vN; varying float vD;
      void main(){ vec3 c = texture2D(map, vUv).rgb; float d = dot(normalize(vN), sunL);
        vec2 e = min(vUv, 1.0 - vUv); float edge = smoothstep(0.0, 0.2, min(e.x, e.y));          // 四边慢慢淡进地球里
        c = c * (0.55 + 0.7 * max(d, 0.0));
        float pit = step(hole.x, vUv.x) * step(vUv.x, hole.z) * step(hole.y, vUv.y) * step(vUv.y, hole.w);          // 切走那一块的地方：留下一个暗下去的坑
        c *= 1.0 - pit * holeK * 0.72;          // 压暗（不换成一种颜色：森林、雪山上看起来都是一个坑）
        c = mix(c, hazeC, smoothstep(haze.x, haze.y, vD) * 0.85);          // 远处蒙一层空气
        gl_FragColor = vec4(c, k * edge);
        #include <colorspace_fragment>
      }`,
  });
  mat.toneMapped = false;
  const mesh = new THREE.Mesh(geo, mat); mesh.raycast = () => {}; mesh.renderOrder = 2;
  // 画在地形上的线：沿地面走，高出地面一点
  const lineAt = (f) => { const q = cutAt(def, f); return place(q.x, q.y, elevAt(def, q.x, q.y) + 60, new THREE.Vector3()); };
  const pts = []; for (let i = 0; i <= 120; i++) pts.push(lineAt(i / 120));
  const lg = new LineSegmentsGeometry(); lg.setPositions(pts.flatMap((p, i) => (i ? [pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, p.x, p.y, p.z] : [])));
  const cut = new LineSegments2(lg, new LineMaterial({ color: 0xffd28a, linewidth: 3, worldUnits: false, transparent: true, opacity: 0 }));
  cut.raycast = () => {}; cut.renderOrder = 3; cut.visible = false;
  /** 切走 crop 那一块以后留下的坑（holeK 0—1：坑有多深色） */
  const pit = (crop) => { const a = toLocal(def, crop[0][0], crop[1][0]), b = toLocal(def, crop[0][1], crop[1][1]); mat.uniforms.hole.value.set(a.x / def.size + 0.5, a.y / def.size + 0.5, b.x / def.size + 0.5, b.y / def.size + 0.5); };
  return { mesh, cut, frame: F, place, lineAt, sunL, pit };
}

/** 切出来的一块地形（当地平面，单位 km：x 东、y 上（高度放大 exag 倍）、z 南），带四面土色的侧壁，像一块地形模型。
 *  crop：[[南纬, 北纬], [西经, 东经]] 只要这一块（从大地形里切出来）。返回 group（自己缩放到世界里）、顶面材质、画在上面的线 */
export function terrainBlock(def, crop, segs = 160) {
  const a = toLocal(def, crop[0][0], crop[1][0]), b = toLocal(def, crop[0][1], crop[1][1]);          // 西南角、东北角（km）
  const x0 = a.x, x1 = b.x, y0 = a.y, y1 = b.y, ex = def.exag / 1000;
  const top = new THREE.PlaneGeometry(1, 1, segs, Math.round(segs * (y1 - y0) / (x1 - x0)));
  const pos = top.attributes.position, uv = top.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = x0 + uv.getX(i) * (x1 - x0), y = y0 + uv.getY(i) * (y1 - y0);
    pos.setXYZ(i, x, elevAt(def, x, y) * ex + 0.0005, -y);
    uv.setXY(i, x / def.size + 0.5, y / def.size + 0.5);          // 在整张影像里的位置
  }
  top.computeVertexNormals();
  const sunL = new THREE.Vector3(0.45, 0.7, 0.55).normalize();          // 和贴在地球上时同一个太阳（东南方上午）
  const mat = new THREE.ShaderMaterial({
    transparent: true, uniforms: { map: { value: def.tex }, sunL: { value: sunL }, k: { value: 1 }, hazeC: { value: new THREE.Color(0xc9d6e3) }, haze: { value: new THREE.Vector2(1e5, 2e5) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying float vD; void main(){ vUv = uv; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vD = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform vec3 sunL; uniform float k; uniform vec3 hazeC; uniform vec2 haze; varying vec2 vUv; varying vec3 vN; varying float vD;
      void main(){ vec3 c = texture2D(map, vUv).rgb; float d = dot(normalize(vN), sunL);
        c = mix(c * (0.55 + 0.7 * max(d, 0.0)), hazeC, smoothstep(haze.x, haze.y, vD) * 0.85);
        gl_FragColor = vec4(c, k);
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.Group(), topM = new THREE.Mesh(top, mat); topM.raycast = () => {}; g.add(topM);
  // 侧壁：从地面边上一直到海平面，上浅下深的土色（只是模型的样子，不代表地下的岩层）
  const P = [], C = [], idx = [], col = (t) => new THREE.Color(0x8a6a4a).lerp(new THREE.Color(0x3a2a1e), t);
  const edge = (xa, ya, xb, yb) => {
    const n = 60, base = P.length / 3;
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = xa + (xb - xa) * f, y = ya + (yb - ya) * f, h = elevAt(def, x, y) * ex;
      P.push(x, h, -y, x, 0, -y); const c0 = col(0), c1 = col(1); C.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
      if (i) { const k0 = base + (i - 1) * 2; idx.push(k0, k0 + 1, k0 + 2, k0 + 1, k0 + 3, k0 + 2); }
    }
  };
  edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); wg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); wg.setIndex(idx);
  const wallM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const walls = new THREE.Mesh(wg, wallM); walls.raycast = () => {}; g.add(walls);
  // 那条线
  const pts = [];
  for (let i = 0; i <= 120; i++) { const q = cutAt(def, i / 120); pts.push(new THREE.Vector3(q.x, (elevAt(def, q.x, q.y) + 60) * ex, -q.y)); }
  const lg = new LineSegmentsGeometry(); lg.setPositions(pts.flatMap((p, i) => (i ? [pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, p.x, p.y, p.z] : [])));
  const cut = new LineSegments2(lg, new LineMaterial({ color: 0xffd28a, linewidth: 3, worldUnits: false, transparent: true, opacity: 0.95 })); cut.raycast = () => {}; g.add(cut);
  const center = new THREE.Vector3((x0 + x1) / 2, 0, -(y0 + y1) / 2);
  return { group: g, top: topM, mat, walls, wallM, cut, center, w: x1 - x0, d: y1 - y0, sunL };
}

// ---- 切出来的这块地形，从地理世界换到书里（两边共用）----
// 书里的头一帧和地理世界的最后一帧一样：这块地形浮在镜头和书之间，书已经翻在活页那一页。地理世界按书里的镜头摆自己的镜头，
// 把“镜头 → 地形块”的矩阵传过去，书里按它摆这一块。这一块落到那一页正中，活页的模型从它的位置长高，它同时压扁、淡掉。
export const BLOCK_LEN = 1.4;          // 落到书上时（南北方向）多长：和活页的模型差不多宽（喜马拉雅的模型约 1.42），模型从它的位置原样长高
const BLOCK_Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));          // 局部的东→世界 −z（背着镜头）、上→上、南→ +x（北朝左，和活页模型一样北坡在左）
/** 这块地形的底面中心放在 at（书里的世界坐标）时的摆法 */
export function blockAt(blk, at) {
  const s = BLOCK_LEN / blk.d;
  return { pos: at.clone().sub(blk.center.clone().multiplyScalar(s).applyQuaternion(BLOCK_Q)), q: BLOCK_Q.clone(), s };
}
/** 书里看这一跨页的镜头（World._bookShot：仰角 48°，看着 (0, top, 0.08)，离 dist）：镜头的矩阵 */
export function bookCamera(top, dist) {
  const el = 48 * D2R, target = new THREE.Vector3(0, top, 0.08), pos = target.clone().addScaledVector(new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist);
  return new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0)).setPosition(pos);
}
/** 书里的头一帧这块地形在哪：在跨页中心和镜头之间（往镜头那边 45%）、再高一点点。返回“镜头 → 地形块”的矩阵（带缩放） */
export function blockStartRel(blk, cam, top) {
  const at = new THREE.Vector3(0, top, 0.08).lerp(new THREE.Vector3().setFromMatrixPosition(cam), 0.45).add(new THREE.Vector3(0, 0.05, 0)), P = blockAt(blk, at);
  return cam.clone().invert().multiply(new THREE.Matrix4().compose(P.pos, P.q, new THREE.Vector3().setScalar(P.s)));
}
