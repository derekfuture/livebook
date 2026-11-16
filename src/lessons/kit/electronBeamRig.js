import * as THREE from 'three';
import { paint, inked, polyline } from '../../live/ink.js';
import { woodBlock, textPlate, canvasTex } from './props.js';
import { BULB_RADIUS, GUN } from './electronBeam.js';
export const CENTER = 0.21;
export function electronBeamRig() {
  const group = new THREE.Group();
  function box(w, h, d, x, y, z, color, parent = group) {
    const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function cylinder(r, h, x, y, z, color, parent = group) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), paint(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  const base = woodBlock(0.47, 0.018, 0.34);
  base.position.y = 0.009;
  group.add(base);
  for (const z of [-0.075, 0.075]) {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.011, 12, 100), paint(0x695b4b));
    frame.position.set(0, CENTER, z);
    group.add(frame);
    // 线圈绕组的外表面，实际有效匝数为 124，纹理不把可见圈数当匝数。
    for (let j = 0; j < 9; j++) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.143 + j * 0.00175, 0.00085, 6, 100), paint(0xbd7b43));
      wire.position.set(0, CENTER, z + 0.009);
      group.add(wire);
      const back = wire.clone();
      back.position.z = z - 0.009;
      group.add(back);
    }
    for (const x of [-0.107, 0.107]) {
      box(0.019, 0.086, 0.025, x, 0.061, z, 0x5b646b);
      box(0.052, 0.008, 0.046, x, 0.022, z, 0x48565e);
    }
  }
  const tube = new THREE.Group();
  tube.position.y = CENTER;
  group.add(tube);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(BULB_RADIUS, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader:
        'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); n=normalMatrix*normal; v=-p.xyz; gl_Position=projectionMatrix*p;}',
      fragmentShader:
        'varying vec3 n; varying vec3 v; void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0); gl_FragColor=vec4(0.58,0.70,0.74,0.018+0.38*rim);}',
    }),
  );
  tube.add(glass);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.058, 32), glass.material);
  neck.position.y = -0.102;
  tube.add(neck);
  cylinder(0.023, 0.016, 0, 0.079, 0, 0x5a6268);
  cylinder(0.02, 0.048, 0, -0.108, 0, 0x53636a, tube);
  const gun = new THREE.Group();
  gun.position.set(...GUN);
  tube.add(gun);
  const barrel = cylinder(0.006, 0.025, 0.0125, 0, 0, 0x899494, gun);
  barrel.rotation.z = Math.PI / 2;
  const cathode = cylinder(0.003, 0.006, 0.022, 0, 0, 0xdda257, gun);
  cathode.rotation.z = Math.PI / 2;
  box(0.024, 0.008, 0.009, 0.012, -0.009, 0, 0x727a7f, gun);
  cylinder(0.003, 0.055, 0.009, -0.0925, 0, 0x727a7f, tube);
  const turn = new THREE.Group();
  turn.position.y = 0.108;
  cylinder(0.021, 0.012, 0, 0.108, 0, 0x53636a);
  group.add(turn);
  const handle = cylinder(0.008, 0.055, 0.0275, 0, 0, 0x9a744b, turn);
  handle.rotation.z = Math.PI / 2;
  const handleEnd = cylinder(0.012, 0.016, 0.06, 0, 0, 0x87603d, turn);
  handleEnd.rotation.z = Math.PI / 2;
  const panel = box(0.4, 0.069, 0.055, 0, 0.054, 0.135, 0x61757b);
  const displayTex = canvasTex(1536, 256, () => {}),
    display = new THREE.Mesh(new THREE.PlaneGeometry(0.374, 0.038), new THREE.MeshBasicMaterial({ map: displayTex }));
  display.position.set(0, 0.067, 0.163);
  group.add(display);
  function knob(x) {
    const g = new THREE.Group();
    g.position.set(x, 0.027, 0.174);
    group.add(g);
    const disk = cylinder(0.014, 0.012, 0, 0, 0, 0x33464f, g);
    disk.rotation.x = Math.PI / 2;
    const tick = box(0.002, 0.012, 0.001, 0, 0.006, 0.0065, 0xece5cb, g);
    return { group: g, tick };
  }
  const voltage = knob(-0.095),
    current = knob(0.055);
  const power = box(0.019, 0.016, 0.008, -0.172, 0.028, 0.168, 0xa7593a);
  power.material = power.material.clone();
  const polarity = box(0.019, 0.016, 0.008, 0.172, 0.028, 0.168, 0x40505c);
  for (const [x, t] of [
    [-0.172, '电源'],
    [0.172, '换向'],
  ]) {
    const p = textPlate(t, { w: 0.027, h: 0.01, font: 'bold 125px sans-serif', bg: '#efe6d1' });
    p.position.set(x, 0.045, 0.164);
    group.add(p);
  }
  for (const z of [-0.075, 0.075])
    for (const dx of [-0.004, 0.004]) {
      group.add(
        polyline(
          [
            [0.11 + dx, 0.038, 0.11],
            [0.16 + dx, 0.024, 0.06],
            [0.16 + dx, 0.024, z],
            [0.108 + dx, 0.105, z],
          ].map((p) => new THREE.Vector3(...p)),
          { color: 0x424e51, width: 1.4 },
        ),
      );
    }
  for (const dx of [-0.004, 0.004])
    group.add(
      polyline(
        [
          [-0.11 + dx, 0.028, 0.11],
          [-0.05 + dx, 0.024, 0.06],
          [dx, 0.048, 0],
          [dx, 0.076, 0],
        ].map((p) => new THREE.Vector3(...p)),
        { color: 0x424e51, width: 1.4 },
      ),
    );
  const fieldArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0.107, CENTER + 0.02, 0.045),
    0.09,
    0x4e7d91,
    0.014,
    0.008,
  );
  group.add(fieldArrow);
  const fieldLabel = textPlate('B', { w: 0.018, h: 0.018, font: 'bold 340px sans-serif' });
  fieldLabel.position.set(0.107, CENTER + 0.048, 0);
  group.add(fieldLabel);
  const beamGroup = new THREE.Group();
  beamGroup.position.y = CENTER;
  group.add(beamGroup);
  const inner = new THREE.MeshBasicMaterial({ color: 0xffe6ac }),
    outer = new THREE.MeshBasicMaterial({ color: 0xffa143, transparent: true, opacity: 0.18, depthWrite: false });
  let beamMeshes = [];
  function beam(trace, on) {
    for (const o of beamMeshes) {
      beamGroup.remove(o);
      o.geometry?.dispose();
    }
    beamMeshes = [];
    if (!on || trace.points.length < 2) return;
    const points = trace.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    class Path extends THREE.Curve {
      getPoint(t, target = new THREE.Vector3()) {
        const v = t * (points.length - 1),
          i = Math.min(points.length - 2, Math.floor(v));
        return target.copy(points[i]).lerp(points[i + 1], v - i);
      }
    }
    for (const [r, mat] of [
      [0.0015, outer],
      [0.00055, inner],
    ]) {
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(new Path(), Math.min(2200, points.length - 1), r, 6, false),
        mat,
      );
      beamGroup.add(mesh);
      beamMeshes.push(mesh);
    }
  }
  function show({ volts, amps, angle, on, field, polarity: direction }) {
    tube.rotation.y = (angle * Math.PI) / 180;
    turn.rotation.y = tube.rotation.y;
    voltage.group.rotation.z = (0.75 - (volts / 300) * 1.5) * Math.PI;
    current.group.rotation.z = (0.75 - (amps / 4) * 1.5) * Math.PI;
    polarity.rotation.z = direction > 0 ? -0.3 : 0.3;
    power.material.color.setHex(on ? 0xa55631 : 0x5e5551);
    fieldArrow.visible = fieldLabel.visible = on && amps > 0;
    fieldArrow.setDirection(new THREE.Vector3(0, 0, field < 0 ? -1 : 1));
    fieldArrow.position.z = field < 0 ? 0.045 : -0.045;
    const c = displayTex.canvas,
      g = c.getContext('2d');
    g.fillStyle = '#efe9d6';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#34434a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 69px sans-serif';
    g.fillText('加速电压 ' + volts + ' V', 415, 75);
    g.fillText('线圈电流 ' + (on ? amps : 0).toFixed(2) + ' A', 1050, 75);
    g.font = '46px sans-serif';
    g.fillText('上下拖旋钮', 415, 173);
    g.fillText('B ' + (Math.abs(field) * 1000).toFixed(2) + ' mT', 1050, 173);
    displayTex.needsUpdate = true;
  }
  return {
    group,
    tube,
    glass,
    turn,
    voltage: voltage.group,
    current: current.group,
    power,
    polarity,
    beam,
    show,
    dispose() {
      displayTex.dispose();
      inner.dispose();
      outer.dispose();
    },
  };
}
