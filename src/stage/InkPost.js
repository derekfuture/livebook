// 墨线画风的后期：环境光遮蔽（N8AO）→ 按深度/法线找轮廓画墨线 → 纸张颗粒与暗角 → SMAA → 色调映射输出。
// 只在 ?style=ink 时启用。
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { N8AOPass } from 'n8ao';

const InkShader = {
  uniforms: {
    tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null },
    resolution: { value: new THREE.Vector2() }, near: { value: 0.02 }, far: { value: 60 },
    ink: { value: new THREE.Color(0x22232b) }, width: { value: 1.0 }, time: { value: 0 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tNormal, tDepth;
    uniform vec2 resolution; uniform float near, far, width, time; uniform vec3 ink;
    varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    void main(){
      vec2 px = width / resolution;
      // 手绘的抖动：采样位置随屏幕位置轻微偏移
      vec2 wob = (vec2(noise(vUv * resolution / 22.0), noise(vUv * resolution / 22.0 + 7.3)) - 0.5) * px * 1.4;
      vec2 uv = vUv + wob;
      float dC = lin(texture2D(tDepth, uv).r);
      vec3 nC = texture2D(tNormal, uv).rgb;
      float dEdge = 0.0, nEdge = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 o = (i == 0 ? vec2(1,0) : i == 1 ? vec2(-1,0) : i == 2 ? vec2(0,1) : vec2(0,-1)) * px;
        float d = lin(texture2D(tDepth, uv + o).r);
        vec3 n = texture2D(tNormal, uv + o).rgb;
        dEdge += abs(d - dC) / max(dC, 1e-3);
        nEdge += 1.0 - smoothstep(0.86, 0.985, dot(normalize(n * 2.0 - 1.0), normalize(nC * 2.0 - 1.0)));
      }
      float bg = step(0.9999, texture2D(tDepth, uv).r);       // 背景（没东西）不画线
      float e = clamp(smoothstep(0.004, 0.02, dEdge) + smoothstep(0.15, 0.7, nEdge), 0.0, 1.0);
      e *= 0.82 + 0.18 * noise(vUv * resolution / 3.0);       // 墨色深浅不匀
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = mix(c.rgb, ink, e * 0.9);
      // 纸张颗粒 + 暗角
      float grain = (hash(floor(vUv * resolution / 1.5)) - 0.5) * 0.035;
      c.rgb += grain;
      vec2 q = vUv - 0.5; c.rgb *= 1.0 - dot(q, q) * 0.38;
      gl_FragColor = c;
    }`,
};

export class InkPost {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    const w = innerWidth, h = innerHeight, pr = renderer.getPixelRatio();
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.composer = new EffectComposer(renderer);
    this.ao = new N8AOPass(scene, camera, w, h);
    Object.assign(this.ao.configuration, { aoRadius: 0.12, distanceFalloff: 0.6, intensity: 2.6, color: new THREE.Color(0x2a1d12), halfRes: false, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12 });
    this.composer.addPass(this.ao);
    // 法线 + 深度：单独渲一遍
    this.normalTarget = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType });
    this.normalTarget.depthTexture = new THREE.DepthTexture(w * pr, h * pr);
    this.normalMat = new THREE.MeshNormalMaterial();
    this.inkPass = new ShaderPass(InkShader);
    this.inkPass.uniforms.tNormal.value = this.normalTarget.texture;
    this.inkPass.uniforms.tDepth.value = this.normalTarget.depthTexture;
    this.composer.addPass(this.inkPass);
    this.composer.addPass(new SMAAPass(w * pr, h * pr));
    this.composer.addPass(new OutputPass());
    this.setSize(w, h);
  }

  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    this.composer.setSize(w, h);
    this.normalTarget.setSize(w * pr, h * pr);
    this.inkPass.uniforms.resolution.value.set(w * pr, h * pr);
    this.inkPass.uniforms.width.value = Math.max(1, pr * 0.9);
  }

  render(dt) {
    const { renderer, scene, camera } = this;
    // 法线：线、光晕、粒子、透明的东西不参与描线
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) return;
      const m = o.material;
      if (o.isLine || o.isLineSegments || o.isSprite || o.isPoints || o.userData.noInk || (m && !Array.isArray(m) && (m.blending === THREE.AdditiveBlending || m.opacity < 0.12 || m.side === THREE.BackSide)) || (m && m.isShaderMaterial)) { o.visible = false; hidden.push(o); }
    });
    const bg = scene.background, fog = scene.fog;
    scene.background = null; scene.fog = null;
    scene.overrideMaterial = this.normalMat;
    renderer.setRenderTarget(this.normalTarget);
    renderer.setClearColor(0x8080ff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;
    scene.background = bg; scene.fog = fog;
    for (const o of hidden) o.visible = true;
    this.inkPass.uniforms.near.value = camera.near;
    this.inkPass.uniforms.far.value = camera.far;
    this.composer.render(dt);
  }
}
