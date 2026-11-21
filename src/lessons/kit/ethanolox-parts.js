import * as THREE from 'three';
import { chemLamp, testTube, tubeRack } from './chem.js';
import { glass2, tubeLiquid, water2 } from './chemfx.js';
import { dropBottle, lampCap } from './labops.js';
import { airLabel, faceLabel } from './labels.js';

export const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const LAMP = -0.105, TUBE = 0.048, RIM = 0.112, LEVEL = 0.039;
export const WIRE_HOME = vec(-0.023, 0.00175), HEAT = vec(LAMP, 0.090), ABOVE = vec(TUBE, RIM + 0.004), DIP = vec(TUBE, 0.018);
export const ADD = vec(TUBE, RIM + 0.005);
const copper = new THREE.Color(0xc2643d), oxide = new THREE.Color(0x201d21);

function pick(parent, width, height, centre) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), new THREE.MeshBasicMaterial({ visible: false }));
  mesh.position.copy(centre); mesh.userData.pick = true; parent.add(mesh); return mesh;
}

export function apparatus(group) {
  const lamp = chemLamp(); lamp.position.x = LAMP; group.add(lamp);
  const cap = lampCap(group, lamp, { off: vec(LAMP - 0.048, 0, 0.016) });
  // 点燃时拿下的是灯帽；盖好时点击范围仍覆盖灯身。
  const lampPick = pick(cap.cap, 0.047, 0.066, vec(0, 0.039 - cap.cap.position.y));
  cap.cap.material.color.setHex(0x8796a1); cap.cap.material.opacity = 0.84;
  const rack = tubeRack({ r: 0.014, h: 0.062, w: 0.054 }); rack.position.x = TUBE; group.add(rack);
  const tube = testTube({ r: 0.012, len: RIM - 0.009 }); tube.position.set(TUBE, 0.009, 0); group.add(tube);
  const liquid = tubeLiquid({ R: 0.0118, yc: 0.013, color: 0xc5dce3, specks: 0 }); tube.add(liquid);
  tube.userData.ringY = RIM + 0.001;
  const hand = new THREE.Group(); hand.position.set(TUBE + 0.016, RIM + 0.004, 0.009); group.add(hand);
  const palm = new THREE.Group(); hand.add(palm);
  const skin = new THREE.MeshStandardMaterial({ color: 0xeac5a2, roughness: 0.85 });
  function pad(x, y, width, height, angle) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin);
    mesh.scale.set(width, height, 0.002); mesh.position.set(x, y, 0); mesh.rotation.z = angle; palm.add(mesh);
  }
  pad(0.007, 0, 0.008, 0.007, 0.2);
  for (let digit = 0; digit < 4; digit++) pad(0.0008 + Math.abs(1 - digit) * 0.001, 0.006 - digit * 0.0032, 0.008, 0.0017, -0.25);
  pad(0.007, 0.007, 0.0023, 0.006, -0.55);
  const rimPick = pick(hand, 0.022, 0.018, vec(0, 0));
  const bottle = dropBottle(group, vec(0.124, 0.001), { r: 0.019, liq: 0xd7e6eb });
  const dropper = new THREE.Group(); group.add(dropper); dropper.position.copy(bottle.tipHome);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.0027, 0.0011, 0.044, 16), glass2({ base: 0.22 })); glass.position.y = 0.022; glass.renderOrder = 9;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.006, 20, 14), new THREE.MeshStandardMaterial({ color: 0x923f37, roughness: 0.75 })); bulb.scale.y = 1.65; bulb.position.y = 0.049;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.006, 20), bulb.material); collar.position.y = 0.0405;
  dropper.add(glass, bulb, collar); const dropPick = pick(dropper, 0.017, 0.032, vec(0, 0.046));
  const fluid = water2({ color: 0xc5dce3, base: 0.75 });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0008, 1, 16), fluid);
  column.geometry.translate(0, 0.5, 0); column.position.y = 0.0005;
  column.renderOrder = 8; dropper.add(column);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 16, 12), fluid); group.add(drop); drop.renderOrder = 10;
  const wire = new THREE.Group(); group.add(wire); wire.position.copy(WIRE_HOME);
  const surface = new THREE.MeshStandardMaterial({ color: copper, metalness: 0.42, roughness: 0.34 });
  const curve = Array.from({ length: 145 }, (_, idx) => { const turn = idx / 24 * Math.PI * 2; return vec(0.0076 * Math.cos(turn), 0.019 * Math.max(0, idx - 18) / 126, 0.0076 * Math.sin(turn)); });
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 180, 0.00135, 10, false), surface);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([curve[curve.length - 1], vec(0.0068, 0.023), vec(0.002, 0.030), vec(0.001, 0.063), vec(0.001, 0.113)]), 45, 0.00125, 10, false), surface.clone());
  // 拇指和食指从前后捏住长柄，螺旋端留在下方。
  const fingers = new THREE.Group();
  fingers.position.set(0.001, 0.103, 0); wire.add(fingers);
  const rounded = new THREE.SphereGeometry(1, 20, 14);
  function fingerPad(x, y, z, width, height, depth, angle) {
    const part = new THREE.Mesh(rounded, skin);
    part.position.set(x, y, z); part.scale.set(width, height, depth); part.rotation.z = angle; fingers.add(part);
  }
  fingerPad(0.023, 0.003, -0.001, 0.012, 0.010, 0.007, 0.3);
  fingerPad(0.010, 0.006, -0.003, 0.013, 0.0033, 0.0034, 0.24);
  fingerPad(0.010, -0.001, 0.003, 0.013, 0.0038, 0.0036, -0.22);
  for (let i = 0; i < 3; i++) fingerPad(0.018 + i * 0.004, -0.003, 0.001, 0.004, 0.005, 0.003, -0.3);
  const dropFingers = fingers.clone();
  dropFingers.position.set(0.004, 0.050, 0); dropper.add(dropFingers);
  wire.add(coil, stem); const wirePick = pick(wire, 0.019, 0.115, vec(0, 0.057));
  const plate = { color: '#364655', stroke: '#fffaf1', opacity: 1, h: 0.008 };
  faceLabel(lamp, '酒精灯 · 酒精', { ...plate, y: 0.019, z: 0.036 });
  faceLabel(cap.cap, '灯帽', { ...plate, z: 0.015 });
  faceLabel(rack, '试管架', { ...plate, y: 0.004, z: 0.016 });
  faceLabel(bottle, '滴瓶 · 乙醇', { ...plate, y: 0.022, z: 0.019 });
  airLabel(wire, '螺旋铜丝', { y: 0.121, h: 0.009 });
  const dropperName = airLabel(dropper, '胶头滴管 · 乙醇', { y: 0.069, h: 0.009 });
  const tubeName = airLabel(tube, '空试管', { y: 0.073, z: 0.014, h: 0.009 });
  let tubeText, dropperText;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); frame.position.set(TUBE, 0.244, 0); group.add(frame);
  return { lamp, lampPick, cap, wire, coil, fingers, dropFingers, wirePick, bottle, dropper, bulb, dropPick, drop, tube, hand, palm, rimPick, liquid,
    contents(remaining, level, reacted) {
      column.visible = remaining > 0;
      column.scale.y = 0.037 * remaining;
      const contents = reacted ? '试管 · 反应液' : level > 0 ? '试管 · 乙醇' : '空试管';
      const pipette = remaining > 0 ? '胶头滴管 · 乙醇' : '胶头滴管';
      if (contents !== tubeText) { tubeName.setText(contents); tubeText = contents; }
      if (pipette !== dropperText) { dropperName.setText(pipette); dropperText = pipette; }
    },
    surface(fraction) { surface.color.copy(copper).lerp(oxide, fraction); surface.roughness = 0.34 + fraction * 0.55; surface.metalness = 0.42 * (1 - fraction); },
  };
}

export function surfaceScene() {
  let stage, delay, reduced, sites, oxygen, rings, water;
  const fixed = { fixed: true };
  const copperSites = [vec(-3.3, 1.1), vec(1.4, 1.1)];
  const place = (ctx, kind, pos) => { const mol = ctx.add(kind, pos.clone(), fixed); mol.g.rotation.set(0, 0, 0); return mol; };
  return {
    labels: 'always', labelOnly: (kind, mol) => !mol.silent,
    init(ctx, state) {
      stage = state.dipped ? 'black' : 'air'; delay = 1.5; reduced = 0; ctx.view.paper = null; ctx.view.film = 0; ctx.view.speed = 0;
      water = null;
      rings = [0, 1, 2].map(() => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.13, 48), new THREE.MeshBasicMaterial({ color: 0xb77826, side: THREE.DoubleSide }));
        ring.visible = false; ctx.layer.add(ring); return ring;
      });
      sites = copperSites.map(pos => place(ctx, state.dipped ? 'CuO' : 'Cub', pos)); sites[1].silent = true;
      for (const pos of copperSites) for (const shift of [[-1.1, -0.25, -0.7], [0.2, -0.45, -1.05], [1.1, -0.2, -0.65]]) place(ctx, 'Cub', pos.clone().add(vec(...shift))).silent = true;
      oxygen = state.dipped ? null : place(ctx, 'O2', vec(-0.2, 5.4));
    },
    step(ctx, state, dt) {
      if (ctx.events.length || (delay -= dt) > 0) return;
      if (stage === 'air' && state.heated) {
        stage = 'oxidizing'; oxygen.fixed = false;
        ctx.start({ in: ['Cub', 'Cub', 'O2'], out: ['CuO', 'CuO'], host: 0, approach: 1.7, dur: 2.6,
          nearAbs: () => vec(-0.45, 2.9), placeAbs: () => copperSites, after: [fixed, fixed], map: [[0, 0], [2, 0], [1, 0], [2, 1]] }, [...sites, oxygen], { then(products) { sites = products; sites[1].silent = true; stage = 'black'; delay = 1.7; } });
      } else if (stage === 'black' && state.dipped && reduced < 2) {
        const site = copperSites[reduced];
        const ethanol = place(ctx, 'C2H5OH', vec(site.x, 6)); ethanol.fixed = false; ethanol.g.rotation.z = -0.85; stage = 'reducing';
        ctx.start({ in: ['CuO', 'C2H5OH'], out: ['Cub', 'CH3CHO', 'H2O'], host: 0, near: [[0, 0, 0], [0.2, 2.35, 0]], approach: 2.3, dur: 3.5,
          placeAbs: () => [copperSites[reduced], vec(-2.55, 4.5), vec(2.9, 4.1)], after: [fixed, fixed, fixed], map: [[0, 0], ...[0,1,2,3,4,5,6].map(idx => [1, idx]), [0, 1], [1, 7], [1, 8]] }, [sites[reduced], ethanol], { then(products) {
          water = products[2]; reduced++; stage = reduced === 2 ? 'red' : 'one'; delay = 2.2; sites[1].silent = false; products[0].silent = reduced === 2;
        } });
      } else if (stage === 'one') {
        for (const kind of ['CH3CHO', 'H2O']) ctx.remove(ctx.free(kind)[0]); water = null; stage = 'black';
      }
    },
    text(ctx, state) {
      const event = ctx.events[0];
      if (stage === 'reducing') event.mols[0].label.position.x = copperSites[reduced].x - 1.9;
      const tracked = stage !== 'reducing' ? water?.atoms : event.temp ? [event.temp[1], event.temp[9], event.temp[10]] : [event.mols[0].atoms[1], event.mols[1].atoms[7], event.mols[1].atoms[8]];
      rings.forEach((ring, idx) => {
        ring.visible = !!tracked; if (!tracked) return;
        const atom = tracked[idx]; ctx.layer.worldToLocal(atom.getWorldPosition(ring.position)); ring.scale.setScalar(atom.scale.x + 0.12);
      });
      const oxidation = !state.dipped;
      const captions = { air: '看铜丝表面的两处铜和空气中的一个氧分子。', oxidizing: '氧分子靠近热铜；两个氧原子分别留在铜表面。', black: '铜丝表面的黑色物质是氧化铜。', reducing: '看圈出的原子：乙醇的羟基和连着羟基的碳各失去一个氢。这两个氢和氧化铜中的氧组成水。', one: '乙醇原来的氧仍连在碳上，形成碳氧双键；一处铜已恢复。', red: '两处铜都已恢复。乙醇变成乙醛，空气提供的氧最终进入水。' };
      return { eq: !state.heated ? '' : oxidation ? '2Cu + O<sub>2</sub> → 2CuO' : 'CH<sub>3</sub>CH<sub>2</sub>OH + CuO → CH<sub>3</sub>CHO + Cu + H<sub>2</sub>O', cap: captions[stage], on: state.heated };
    },
  };
}
