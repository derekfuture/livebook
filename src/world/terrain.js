// 俯冲用的一块真实地形：高程（Terrarium 编码的 PNG，tools/geo/terrain_patch.py 做的）+ 卫星影像。
// 地形按当地的东—北平面铺开，可以贴在地球上（球面上的一块，跟着地球一起放大），也可以单独摆成一块（以后接到书上的模型）。
// 受光不用场景里的灯：在地形自己的坐标里给一个固定的太阳方向（和卫星拍摄时差不多，东南方上午的太阳），换到哪个场景里样子都一样。
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import cbDem from '../lessons/data/terrain/changbai.png';
import cbImg from '../lessons/data/terrain/changbai.jpg';

const R_KM = 6371, D2R = Math.PI / 180;
/** 每处地形：中心、边长（km）、高度放大几倍；target 是镜头看的那一点；view 从哪边看（az 镜头在目标的哪个方位，度，北 0 东 90）、俯角、看多宽（km）；cut 是画在地形上的那条线 */
export const TERRAIN = {
  cb: {
    name: '长白山', dem: cbDem, img: cbImg, lat: 42.17, lon: 127.95, size: 110, exag: 3,          // 从东边看：地形往西（镜头对面）多铺一些
    target: [42.18, 128.07], view: { az: 100, el: 26, km: 60 },          // 从东边看过去：北坡从右边的山脚一路升到左边的天池，侧面就是课本那张剖面的样子
    cut: { from: [42.37, 128.09], to: [42.028, 128.058], text: '北坡：从山脚（700 多米）到天池边（2 600 多米）' },
    src: '卫星影像：Sentinel-2 cloudless 2016（EOX，含 Copernicus 数据）· 高程：AWS Terrain Tiles（SRTM 等）',
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
    transparent: true, uniforms: { map: { value: def.tex }, sunL: { value: sunL }, k: { value: 0 }, hazeC: { value: new THREE.Color(0xc9d6e3) }, haze: { value: new THREE.Vector2(1e5, 2e5) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying float vD; void main(){ vUv = uv; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vD = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform vec3 sunL; uniform float k; uniform vec3 hazeC; uniform vec2 haze; varying vec2 vUv; varying vec3 vN; varying float vD;
      void main(){ vec3 c = texture2D(map, vUv).rgb; float d = dot(normalize(vN), sunL);
        vec2 e = min(vUv, 1.0 - vUv); float edge = smoothstep(0.0, 0.2, min(e.x, e.y));          // 四边慢慢淡进地球里
        c = mix(c * (0.55 + 0.7 * max(d, 0.0)), hazeC, smoothstep(haze.x, haze.y, vD) * 0.85);          // 远处蒙一层空气
        gl_FragColor = vec4(c, k * edge);
        #include <colorspace_fragment>
      }`,
  });
  mat.toneMapped = false;
  const mesh = new THREE.Mesh(geo, mat); mesh.raycast = () => {}; mesh.renderOrder = 2;
  // 画在地形上的线：沿地面走，高出地面一点
  const lineAt = (f) => { const a = toLocal(def, ...def.cut.from), b = toLocal(def, ...def.cut.to), x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f; return place(x, y, elevAt(def, x, y) + 60, new THREE.Vector3()); };
  const pts = []; for (let i = 0; i <= 80; i++) pts.push(lineAt(i / 80));
  const lg = new LineSegmentsGeometry(); lg.setPositions(pts.flatMap((p, i) => (i ? [pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, p.x, p.y, p.z] : [])));
  const cut = new LineSegments2(lg, new LineMaterial({ color: 0xffd28a, linewidth: 3, worldUnits: false, transparent: true, opacity: 0 }));
  cut.raycast = () => {}; cut.renderOrder = 3; cut.visible = false;
  return { mesh, cut, frame: F, place, lineAt, sunL };
}
