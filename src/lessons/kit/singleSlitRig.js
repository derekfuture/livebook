import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block, caption } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
import { measuringScrew } from './micrometerTool.js';
import { slitPixels, SLIT_DISTANCE } from './singleSlit.js';
export const SINGLE_SLIT_X = -0.2,
  SINGLE_SCREEN_X = SINGLE_SLIT_X + SLIT_DISTANCE,
  SINGLE_AXIS = 0.12;
export function singleSlitRig() {
  const group = new THREE.Group();
  block(group, 0.9, 0.022, 0.07, -0.02, 0.021, 0, 0x63717a);
  for (const x of [-0.42, 0.38]) block(group, 0.08, 0.01, 0.15, x, 0.005, 0, 0x494d55);
  function stand(x) {
    block(group, 0.06, 0.014, 0.075, x, 0.039, 0, 0x505e65);
    block(group, 0.01, 0.065, 0.01, x === SINGLE_SCREEN_X ? x + 0.007 : x, 0.078, 0, 0x9aa3a3);
  }
  stand(-0.37);
  stand(SINGLE_SLIT_X);
  stand(SINGLE_SCREEN_X);
  const lamp = block(group, 0.085, 0.065, 0.05, -0.37, SINGLE_AXIS, 0, 0x566568),
    power = block(group, 0.028, 0.009, 0.023, -0.37, 0.049, 0.042, 0x946248);
  const sourceFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.014, 0.018),
    new THREE.MeshBasicMaterial({ color: 0x333333 }),
  );
  sourceFace.rotation.y = Math.PI / 2;
  sourceFace.position.set(-0.3274, SINGLE_AXIS, 0);
  group.add(sourceFace);
  const sourceTag = textPlate('单色平行光 650 nm', { w: 0.079, h: 0.012, font: '43px sans-serif', bg: '#e4d9bd' });
  sourceTag.rotation.x = -Math.PI / 2;
  sourceTag.position.set(-0.37, 0.153, 0.0);
  group.add(sourceTag);
  const aperture = new THREE.Group();
  aperture.position.set(SINGLE_SLIT_X, SINGLE_AXIS, 0);
  group.add(aperture);
  const left = block(aperture, 0.002, 0.03, 0.027, 0, 0, -0.0135, 0x39444c),
    right = block(aperture, 0.002, 0.03, 0.027, 0, 0, 0.014, 0x39444c);
  for (const y of [-0.021, 0.021]) block(aperture, 0.006, 0.012, 0.066, 0, y, 0.003, 0x69777c);
  const holder = block(aperture, 0.014, 0.014, 0.008, 0, 0, 0.025, 0x69777c);
  const screwFrame = new THREE.Group();
  screwFrame.rotation.y = -Math.PI / 2;
  screwFrame.position.set(SINGLE_SLIT_X, SINGLE_AXIS, 0.035);
  group.add(screwFrame);
  const screw = measuringScrew(screwFrame);
  const pick = new THREE.Mesh(
    new THREE.SphereGeometry(0.0095, 14, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.userData.pick = true;
  screw.grip.add(pick);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 16), paint(0x98a6a7));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, 0, 0.025);
  aperture.add(shaft);
  const tex = canvasTex(1024, 256, () => {}),
    screen = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.045), new THREE.MeshBasicMaterial({ map: tex }));
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(SINGLE_SCREEN_X - 0.0021, SINGLE_AXIS, 0);
  group.add(screen);
  block(group, 0.004, 0.065, 0.052, SINGLE_SCREEN_X, SINGLE_AXIS, 0, 0x4c5355);
  const screenLabel = textPlate('不透光屏', { w: 0.045, h: 0.009, font: '65px sans-serif', color: '#efeee3' });
  screenLabel.rotation.y = -Math.PI / 2;
  screenLabel.position.set(SINGLE_SCREEN_X - 0.0022, SINGLE_AXIS - 0.027, 0);
  group.add(screenLabel);
  caption(group, '缝到屏 55 cm', 0.075, 0.033, 0.0, 0.17, 0.015);
  const mark = textPlate('↑ 缩窄  ↓ 放宽', { w: 0.105, h: 0.014, font: '53px sans-serif', bg: '#e4d9bd' });
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(-0.2, 0.0003, 0.12);
  group.add(mark);
  function update(width, lit) {
    right.position.z = 0.0135 + width;
    screw.setReading(width * 1000);
    sourceFace.material.color.setHex(lit ? 0xff6047 : 0x333333);
    const c = tex.canvas.getContext('2d');
    c.putImageData(new ImageData(slitPixels(width, lit), 1024, 256), 0, 0);
    tex.needsUpdate = true;
    screen.userData.width = width;
    screen.userData.lit = lit;
  }
  update(0.0016, false);
  return {
    group,
    aperture,
    holder,
    screen,
    power,
    screw,
    screwFrame,
    update,
    canvas: tex.canvas,
    dispose() {
      screw.dispose();
      tex.dispose();
    },
  };
}
