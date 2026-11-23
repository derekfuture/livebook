import * as THREE from 'three';
import { momentumRig, TRACK_Y } from './momentumRig.js';
import { GATES } from './momentum.js';
import { block } from './electronicsBench.js';
import { canvasTex } from './props.js';

export const SCALE_Z = 0.082,
  HEIGHT = 0.24,
  WIDTH = 0.03;
export const PAN_X = 0.49,
  PAN_Z = 0.202,
  PAN_Y = 0.045;
export function inclineRig() {
  const rig = momentumRig({ incline: true }),
    { group, rail } = rig;
  const balance = block(group, 0.17, 0.02, 0.12, PAN_X, 0.01, PAN_Z, 0x788986);
  block(group, 0.118, 0.008, 0.08, PAN_X, PAN_Y - 0.004, PAN_Z - 0.018, 0x969d99);
  block(group, 0.04, 0.021, 0.04, PAN_X, 0.0305, PAN_Z - 0.018, 0x778581);
  const display = canvasTex(512, 160, () => {});
  const massScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.096, 0.028),
    new THREE.MeshBasicMaterial({ map: display }),
  );
  massScreen.rotation.x = -Math.PI / 2;
  massScreen.position.set(PAN_X, 0.0202, PAN_Z + 0.041);
  group.add(massScreen);
  function weigh(grams) {
    const g = display.canvas.getContext('2d');
    g.fillStyle = '#273736';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#e3e9c2';
    g.font = 'bold 91px sans-serif';
    g.textAlign = 'center';
    g.fillText(grams + ' g', 256, 113);
    display.needsUpdate = true;
  }
  const ruler = new THREE.Group();
  group.add(ruler);
  block(ruler, WIDTH + 0.014, 0.006, 0.024, 0, 0.003, 0, 0xa39885);
  block(ruler, WIDTH, HEIGHT, 0.002, 0, HEIGHT / 2, 0, 0xbaa78a);
  const tex = canvasTex(256, 2048, (g, w, h) => {
    g.fillStyle = '#f0dfbd';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#423b31';
    g.font = 'bold 49px sans-serif';
    g.textAlign = 'right';
    for (let mm = 0; mm < 240; mm++) {
      const y = h * (1 - mm / 240);
      g.fillRect(0, y, mm % 10 === 0 ? 77 : mm % 5 === 0 ? 52 : 26, mm % 10 === 0 ? 3 : 1.5);
      if (mm % 10 === 0 && mm > 0) g.fillText(String(mm / 10), w - 20, y + 14);
    }
    g.fillText('cm', w - 20, 55);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.set(0, HEIGHT / 2, 0.0011);
  ruler.add(face);
  const pins = GATES.map((x) => {
    block(rail, 0.003, 0.006, 0.035, x, TRACK_Y + 0.033, 0.062, 0x766a5c);
    return block(rail, 0.02, 0.0016, 0.003, x + 0.0085, TRACK_Y + 0.033, 0.078, 0xa14e38);
  });
  const refs = () => pins.map((p) => group.worldToLocal(p.getWorldPosition(new THREE.Vector3())));
  weigh(0);
  return {
    ...rig,
    balance,
    massScreen,
    weigh,
    ruler,
    refs,
    dispose() {
      display.dispose();
      tex.dispose();
      rig.dispose();
    },
  };
}
