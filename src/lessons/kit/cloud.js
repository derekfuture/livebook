// 有体积的云：用 three 自带的 MarchingCubes（等值面）把一团团“球”融成一整朵云，从哪个角度看都是立体的。
// 光照直接在着色器里算：上面被太阳照亮、发白，底部发灰；下雨时（wet）云底压暗。比几十张半透明贴图叠起来更真实，也更省（一个网格）。
// 用法：const c = makeCloud(); scene.add(c.mesh); c.frame(cx, cy, cz, hx, hy, hz)（云所在的盒子：中心和半宽）；
//       c.build(balls)：balls = [[x, y, z, r], ...]，都是盒子里的 0–1 坐标，r 是表面半径（0–1）；c.wet(0–1)、c.opacity(0–1)。
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

export function makeCloud(res = 44, SUB = 12) {          // SUB 越大，球和球融得越少、表面越“一团团”（积云）；小了就融成一整片（层云）
  const uni = { wet: { value: 0 }, light: { value: new THREE.Vector3(-0.35, 1, 0.45).normalize() }, opacity: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    transparent: false,
    vertexShader: `varying vec3 vN; varying float vY; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vY = position.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float wet; uniform vec3 light; uniform float opacity; varying vec3 vN; varying float vY; varying vec3 vW;
      void main(){
        vec3 n = normalize(vN);
        float up = clamp(vY * 0.5 + 0.5, 0.0, 1.0);
        float l = max(dot(n, light), 0.0);
        vec3 top = vec3(1.0, 0.995, 0.98);
        vec3 base = mix(vec3(0.80, 0.83, 0.88), vec3(0.36, 0.40, 0.47), wet);
        vec3 c = mix(base, top, smoothstep(0.08, 0.75, up)) * (0.70 + 0.36 * l);
        float rim = pow(1.0 - abs(dot(n, normalize(cameraPosition - vW))), 2.5);
        c += vec3(0.10, 0.10, 0.11) * rim;          // 边缘透一点光，云边软一些
        gl_FragColor = vec4(c, opacity);
      }`,
  });
  const mc = new MarchingCubes(res, mat, false, false, 60000);
  mc.isolation = 80; mc.raycast = () => {}; mc.renderOrder = 8;
  return {
    mesh: mc,
    frame(cx, cy, cz, hx, hy, hz) { mc.position.set(cx, cy, cz); mc.scale.set(hx, hy, hz); },
    build(balls) {
      mc.reset();
      for (const [x, y, z, r] of balls) if (r > 0.004) mc.addBall(x, y, z, r * r * (mc.isolation + SUB), SUB);
      mc.update();
    },
    wet(v) { uni.wet.value = v; },
    opacity(v) { uni.opacity.value = v; const tr = v < 0.999; if (mat.transparent !== tr) { mat.transparent = tr; mat.depthWrite = !tr; mat.needsUpdate = true; } mc.visible = v > 0.01; },
  };
}
