import * as THREE from 'three';
import { paint, inked, polyline } from '../../live/ink.js';
import { woodBlock, textPlate, canvasTex } from './props.js';
import { BULB_RADIUS, GUN } from './electronBeam.js';
const CENTER = 0.21;
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
  // 暗色背面给发光径迹提供对比；正面仍透明，枪口和弧线不被遮挡。
  const shade = new THREE.Mesh(glass.geometry, new THREE.MeshBasicMaterial({
    color: 0x182e37, side: THREE.BackSide, transparent: true, opacity: 0.80, depthWrite: false,
  }));
  shade.renderOrder = -2;
  tube.add(shade);
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
  // 支架接在枪尾后方，与正面圆轨道错开。
  const top = new THREE.Vector3(0.02, GUN[1] - 0.008, -0.008), foot = new THREE.Vector3(0, -0.091, 0);
  const axis = top.clone().sub(foot);
  const stem = cylinder(0.0028, axis.length(), 0, 0, 0, 0x6b7c80, tube);
  stem.position.copy(foot).lerp(top, 0.5);
  stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  box(0.008, 0.007, 0.014, 0.02, -0.004, -0.005, 0x6b7c80, gun);
  const lip = cylinder(0.0063, 0.001, 0, 0, 0, 0x71878a, gun);
  lip.rotation.z = Math.PI / 2;
  lip.material = new THREE.MeshBasicMaterial();
  box(0.435, 0.086, 0.05, 0, 0.061, 0.135, 0x425556);
  const displayTex = canvasTex(1600, 200, () => {});
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.423, 0.042), new THREE.MeshBasicMaterial({ map: displayTex }));
  display.position.set(0, 0.079, 0.161);
  group.add(display);
  function knob(x) {
    const disk = cylinder(0.017, 0.016, x, 0.039, 0.17, 0x22383d);
    // 转轴朝向观察者。指线与盘面一同旋转。
    disk.rotation.x = Math.PI / 2;
    box(0.0025, 0.002, 0.013, 0, 0.0082, -0.008, 0xffeac1, disk);
    return disk;
  }
  const voltage = knob(-0.097), current = knob(0), turn = knob(0.097);
  const power = box(0.030, 0.023, 0.014, -0.178, 0.039, 0.17, 0x33464a);
  const polarity = box(0.030, 0.023, 0.014, 0.178, 0.039, 0.17, 0x45616a);
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.005, 24), new THREE.MeshBasicMaterial());
  lamp.position.z = 0.0075;
  power.add(lamp);
  const lever = box(0.008, 0.017, 0.005, 0, 0, 0.008, 0xefdfb6, polarity);
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
  const fieldLabels = ['⊗ 磁场向里（示意）', '⊙ 磁场向外（示意）'].map(text => {
    const plate = textPlate(text, { w: 0.115, h: 0.021, font: 'bold 53px sans-serif', bg: '#fff5df', color: '#214859' });
    plate.position.set(0, CENTER + 0.112, 0.04);
    group.add(plate);
    return plate;
  });
  const beamGroup = new THREE.Group();
  beamGroup.position.y = CENTER;
  group.add(beamGroup);
  const inner = new THREE.MeshBasicMaterial({ color: 0xaaffdf }),
    outer = new THREE.MeshBasicMaterial({ color: 0x4effc6, transparent: true, opacity: 0.31, depthWrite: false });
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
      [0.0024, outer],
      [0.00105, inner],
    ]) {
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(new Path(), Math.min(2200, points.length - 1), r, 6, false),
        mat,
      );
      mesh.renderOrder = 2;
      beamGroup.add(mesh);
      beamMeshes.push(mesh);
    }
  }
  function show({ volts, amps, angle, on, field, polarity: direction }) {
    tube.rotation.y = (angle * Math.PI) / 180;
    for (const [dial, fraction] of [[voltage, volts / 300], [current, amps / 4], [turn, angle / 90]]) {
      dial.rotation.y = (fraction * 1.5 - 0.75) * Math.PI;
    }
    lever.rotation.z = direction > 0 ? -0.48 : 0.48;
    power.rotation.x = on ? -0.14 : 0.14;
    lamp.material.color.setHex(on ? 0x80ffb5 : 0x3b4748);
    lip.material.color.setHex(on && volts ? 0x8dfbd7 : 0x889c99);
    fieldArrow.visible = field !== 0;
    fieldLabels[0].visible = field < 0;
    fieldLabels[1].visible = field > 0;
    fieldArrow.setDirection(new THREE.Vector3(0, 0, field < 0 ? -1 : 1));
    fieldArrow.position.z = field < 0 ? 0.045 : -0.045;
    const c = displayTex.canvas,
      g = c.getContext('2d');
    g.fillStyle = '#f1ead5';
    g.fillRect(0, 0, c.width, c.height);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = (x, title, value) => {
      const px = (x / 0.423 + 0.5) * c.width;
      g.fillStyle = '#53625d'; g.font = 'bold 55px sans-serif';
      g.fillText(title, px, 53);
      g.fillStyle = '#19383d'; g.font = 'bold 68px sans-serif';
      g.fillText(value, px, 140);
    };
    label(power.position.x, '电源', on ? '开' : '关');
    label(voltage.position.x, '加速电压', (on ? volts : 0) + ' V');
    label(current.position.x, '励磁电流', (on ? amps : 0).toFixed(2) + ' A');
    label(turn.position.x, '枪口转角', angle + '°');
    label(polarity.position.x, '换向档', direction < 0 ? '向里' : '向外');
    displayTex.needsUpdate = true;
  }
  return {
    group,
    tube,
    glass,
    turn,
    voltage, current,
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
