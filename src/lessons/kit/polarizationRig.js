import * as THREE from 'three';
import { block } from './electronicsBench.js';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
import { POLAR, transmitPolarizers } from './polarization.js';
export const PZ = 0.055,
  QZ = -0.055,
  SCREEN_Z = -0.17,
  HANDLE_R = 0.052;
export function polarizationRig(model) {
  const group = new THREE.Group(),
    textures = [];
  function cylinder(parent, radius, height, x, y, z, color, axis = 'y') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 48), paint(color));
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function label(parent, text, x, y, z, w = 0.055, h = 0.012) {
    const m = textPlate(text, {
      w,
      h,
      bg: '#e4d9bd',
      font: `bold ${Math.min(340, 430 / [...text].length, (h / w) * 410)}px sans-serif`,
    });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function filter(letter, z, x) {
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);
    group.add(stand);
    const base = block(stand, 0.08, 0.012, 0.055, 0, 0.006, 0, 0x6b7c77);
    cylinder(stand, 0.004, 0.07, 0, 0.047, 0, 0x818982);
    label(stand, letter, 0, 0.0125, 0.016, 0.026, 0.016);
    const rotor = new THREE.Group();
    rotor.position.y = POLAR.height;
    stand.add(rotor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.049, 0.005, 10, 80), paint(0x596e67));
    rotor.add(rim);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const optical = {
      otherCenter: { value: new THREE.Vector3() },
      filmNormal: { value: new THREE.Vector3() },
      relativeTransmission: { value: 1 },
      filmRadius: { value: POLAR.filmRadius },
    };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, optical);
      shader.vertexShader = 'varying vec3 filmWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nfilmWorld=(modelMatrix*vec4(transformed,1.0)).xyz;',
      );
      shader.fragmentShader =
        'varying vec3 filmWorld; uniform vec3 otherCenter; uniform vec3 filmNormal; uniform float relativeTransmission; uniform float filmRadius;\n' +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 towardEye=cameraPosition-filmWorld;
        float denominator=dot(towardEye,filmNormal);
        float transmission=0.5;
        if(abs(denominator)>0.000001){
          float t=dot(otherCenter-filmWorld,filmNormal)/denominator;
          vec3 hit=filmWorld+t*towardEye-otherCenter;
          if(t>0.00001 && t<1.0 && length(hit)<filmRadius) transmission=relativeTransmission;
        }
        diffuseColor.a=1.0-transmission;
      `,
      );
    };
    const film = new THREE.Mesh(new THREE.CircleGeometry(POLAR.filmRadius, 80), material);
    const scale = new THREE.Vector3();
    film.onBeforeRender = () => {
      optical.otherCenter.value.set(letter === 'P' ? model.qx : 0, POLAR.height, letter === 'P' ? QZ : PZ);
      group.localToWorld(optical.otherCenter.value);
      optical.filmNormal.value.set(0, 0, 1).transformDirection(group.matrixWorld);
      optical.filmRadius.value = POLAR.filmRadius * scale.setFromMatrixScale(group.matrixWorld).x;
      optical.relativeTransmission.value = Math.cos(model.p - model.q) ** 2;
      material.uniformsNeedUpdate = true;
    };
    rotor.add(film);
    // Tick marks on the frame indicate the transmission axis; no slit in the film.
    for (const sign of [-1, 1]) block(rotor, 0.009, 0.002, 0.001, sign * 0.049, 0, 0.0055, 0xe5d9ae);
    const handle = cylinder(rotor, 0.006, 0.012, HANDLE_R, 0, 0.006, 0xa58458, 'z');
    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.pick = true;
    handle.add(pick);
    return { stand, rotor, base, handle };
  }
  const p = filter('P', PZ, 0),
    q = filter('Q', QZ, POLAR.park);
  // One constrained slide makes insertion continuous, without teleporting a new Q.
  block(group, 0.24, 0.003, 0.012, 0.08, 0.002, QZ, 0xb6ad91);
  label(group, '移入光路', 0.08, 0.004, QZ + 0.035, 0.075, 0.012);
  // A collimated unpolarized lamp, emitting toward the same rear observation screen.
  block(group, 0.08, 0.014, 0.075, 0, 0.007, 0.18, 0x6b7c77);
  cylinder(group, 0.005, 0.08, 0, 0.055, 0.18, 0x818982);
  cylinder(group, 0.037, 0.07, 0, POLAR.height, 0.18, 0x62736d, 'z');
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(POLAR.beamRadius, 64),
    new THREE.MeshBasicMaterial({ color: 0xffedbf, side: THREE.DoubleSide }),
  );
  lens.position.set(0, POLAR.height, 0.1445);
  group.add(lens);
  label(group, '自然光', 0, 0.0145, 0.21, 0.065, 0.013);
  block(group, 0.18, 0.16, 0.008, 0, POLAR.height, SCREEN_Z - 0.005, 0x69796e);
  cylinder(group, 0.005, 0.045, 0, 0.026, SCREEN_Z, 0x818982);
  block(group, 0.1, 0.01, 0.06, 0, 0.005, SCREEN_Z, 0x69796e);
  const tex = canvasTex(360, 320, () => {});
  textures.push(tex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.172, 0.152), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0, POLAR.height, SCREEN_Z);
  group.add(screen);
  const c = tex.canvas.getContext('2d'),
    im = c.createImageData(360, 320),
    lit = [];
  const base = Math.round(255 * 0.04 ** (1 / 2.2));
  for (let j = 0; j < 320; j++)
    for (let i = 0; i < 360; i++) {
      const x = ((i + 0.5) / 360 - 0.5) * 0.172,
        y = POLAR.height + (0.5 - (j + 0.5) / 320) * 0.152,
        k = (j * 360 + i) * 4;
      im.data[k] = base;
      im.data[k + 1] = Math.round(base * 0.98);
      im.data[k + 2] = Math.round(base * 0.91);
      im.data[k + 3] = 255;
      if (Math.hypot(x, y - POLAR.height) <= POLAR.beamRadius) lit.push({ x, y, k });
    }
  function draw() {
    p.rotor.rotation.z = model.p;
    q.rotor.rotation.z = model.q;
    q.stand.position.x = model.qx;
    const filters = model.filters();
    for (const { x, y, k } of lit) {
      const power = transmitPolarizers(x, y, filters).intensity;
      const value = Math.round(255 * (0.04 + 0.9 * power) ** (1 / 2.2));
      im.data[k] = value;
      im.data[k + 1] = Math.round(value * 0.98);
      im.data[k + 2] = Math.round(value * 0.91);
    }
    c.putImageData(im, 0, 0);
    tex.needsUpdate = true;
  }
  draw();
  return {
    group,
    p,
    q,
    screen,
    draw,
    dispose() {
      for (const t of textures) t.dispose();
    },
  };
}
