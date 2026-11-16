import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { beaker, alcoholLamp, textPlate } from './props.js';
import { block, wire } from './electronicsBench.js';
import { THIN_FILM, flameShape } from './thinFilmInterference.js';
export function thinFilmInterferenceRig() {
  const group = new THREE.Group(),
    ring = new THREE.Group();
  ring.position.set(-0.08, THIN_FILM.rest, 0);
  group.add(ring);
  const bath = beaker({ r: 0.07, h: 0.14, level: 0.125, opacity: 0.35 });
  bath.position.x = -0.08;
  group.add(bath);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(THIN_FILM.radius, 0.0015, 10, 100), paint(0x7a8581));
  ring.add(rim);
  wire(
    ring,
    [
      [0, 0.045, 0],
      [0, 0.0975, 0],
    ],
    0x7a8581,
    0.0015,
  );
  const handle = block(ring, 0.014, 0.035, 0.014, 0, 0.115, 0, 0x866f4c);
  handle.name = 'film-ring-handle';
  // The clamp slides on the same post, holding the ring where the student releases it.
  block(group, 0.075, 0.012, 0.08, -0.2, 0.006, -0.025, 0x657572);
  block(group, 0.009, 0.43, 0.009, -0.2, 0.221, -0.025, 0x87968c);
  const clamp = new THREE.Group();
  group.add(clamp);
  block(clamp, 0.016, 0.025, 0.02, -0.2, 0, -0.025, 0x596965);
  wire(
    clamp,
    [
      [-0.2, 0, -0.025],
      [-0.08, 0, -0.025],
      [-0.08, 0, 0],
    ],
    0x6d7974,
    0.003,
  );
  block(group, 0.155, 0.16, 0.004, -0.08, 0.25, -0.055, 0x292e30);
  block(group, 0.008, 0.17, 0.008, -0.16, 0.085, -0.06, 0x657572);
  // Raised lamp aligns the real sodium-yellow flame with the drawn film.
  block(group, 0.082, 0.15, 0.082, 0.02, 0.075, 0.18, 0xb9a67d);
  const lamp = alcoholLamp();
  lamp.position.set(0.02, 0.15, 0.18);
  group.add(lamp);
  lamp.flame.children[0].material.color.setHex(0xffcf36);
  lamp.flame.children[1].material.color.setHex(0xffe572);
  const label = textPlate('灯芯已撒食盐', { w: 0.09, h: 0.014, bg: '#e4d9bd', font: '50px sans-serif' });
  label.position.set(0.02, 0.115, 0.222);
  group.add(label);
  const bathLabel = textPlate('肥皂水', { w: 0.065, h: 0.014, bg: '#e4d9bd', font: '74px sans-serif' });
  bathLabel.position.set(-0.08, 0.055, 0.071);
  group.add(bathLabel);
  const shader = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      eye: { value: new THREE.Vector3() },
      center: { value: ring.position.clone() },
      source: { value: new THREE.Vector3() },
      axes: { value: new THREE.Vector3() },
      age: { value: 0 },
      lit: { value: 0 },
    },
    vertexShader: `varying vec2 uvFilm;void main(){uvFilm=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
 varying vec2 uvFilm;uniform vec3 eye,center,source,axes;uniform float age,lit;
 float airy(float r,float s){return 4.*r*s/(pow(1.-r,2.)+4.*r*s);}
 void main(){vec3 p=center+vec3(uvFilm,0.);if(eye.z<=0.||lit<.5)discard;vec3 v=normalize(eye-p),d=vec3(-v.x,-v.y,v.z);vec3 o=(p-source)/axes,q=d/axes;float a=dot(q,q),b=2.*dot(o,q),c=dot(o,o)-1.,disc=b*b-4.*a*c;if(disc<0.||(-b+sqrt(disc))/(2.*a)<=0.)discard;
 float h=25.e-9+(mix(.2e-6,1.8e-6,clamp((.045-uvFilm.y)/.09,0.,1.))-25.e-9)*exp(-age/45.);float ci=max(v.z,1.e-6),n=1.333,ct=sqrt(1.-(1.-ci*ci)/(n*n));float phase=6.28318530718*n*h*ct/589.3e-9;float s=pow(sin(phase),2.);float rs=pow((ci-n*ct)/(ci+n*ct),2.),rp=pow((n*ci-ct)/(n*ci+ct),2.);float R=.5*(airy(rs,s)+airy(rp,s));float emission=clamp(sqrt(disc)/a/.0192,0.,1.);gl_FragColor=vec4(vec3(1.,.75,.10)*R*10.*emission,1.);
 }`,
  });
  const film = new THREE.Mesh(new THREE.CircleGeometry(0.045, 100), shader);
  film.renderOrder = 7;
  ring.add(film);
  const sheen = new THREE.Mesh(
    new THREE.CircleGeometry(0.045, 100),
    new THREE.MeshPhongMaterial({
      color: 0xcbdce0,
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 80,
    }),
  );
  ring.add(sheen);
  const pick = new THREE.Mesh(
    new THREE.CircleGeometry(0.046, 100),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  pick.userData.pick = true;
  ring.add(pick);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.0012, 0.0016, 24),
    new THREE.MeshBasicMaterial({ color: 0x6c9bb2, side: THREE.DoubleSide }),
  );
  marker.name = 'thin-film-marker';
  marker.position.z = 0.0005;
  marker.visible = false;
  ring.add(marker);
  function update(model, camera, t) {
    ring.position.y = model.height;
    clamp.position.y = model.height + 0.115;
    lamp.flame.setOn(model.lit);
    lamp.flame.update(t);
    const shape = flameShape(t);
    shader.uniforms.source.value.fromArray(shape.center);
    shader.uniforms.axes.value.fromArray(shape.axes);
    shader.uniforms.eye.value.copy(group.worldToLocal(camera.getWorldPosition(new THREE.Vector3())));
    shader.uniforms.center.value.copy(ring.position);
    shader.uniforms.age.value = model.age;
    shader.uniforms.lit.value = model.lit ? 1 : 0;
    film.visible = sheen.visible = model.film && model.height - 0.045 > 0.125;
    marker.visible = marker.userData.marked && film.visible;
  }
  return { group, ring, rim, handle, lamp, film, pick, marker, update };
}
