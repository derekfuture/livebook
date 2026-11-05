import * as THREE from 'three';
import { paint, inked, polyline } from '../../../live/ink.js';
import { canvasTex } from '../props.js';
import { stampMass } from './loadRack.js';
import { PERIOD, TRAVEL } from './motion.js';

const TOP = 0.42,
  START = 0.14,
  PX = -0.3,
  R = 0.024,
  LINE = TOP + 0.027;
const TIMER = 0.33,
  EDGE = 0.44,
  PAPER_Y = TOP + 0.044;
const metal = 0x53616b,
  wood = 0xc39a63,
  teal = 0x366a70,
  gold = 0xb78a40;

export function apparatus({ adjustable = false } = {}) {
  const group = new THREE.Group();
  function box(parent, size, at, color, outline = false) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), paint(color));
    if (outline) inked(m, { width: 0.85 });
    m.position.set(...at);
    parent.add(m);
    return m;
  }
  function cyl(parent, radius, height, at, color, alongZ = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), paint(color));
    if (alongZ) m.rotation.x = Math.PI / 2;
    m.position.set(...at);
    parent.add(m);
    return m;
  }
  function stroke(points, color, width) {
    const line = polyline(
      points.map((p) => new THREE.Vector3(...p)),
      { color, width },
    );
    group.add(line);
    return line;
  }
  // 木板下面留出真实下落空间；桌沿不得挡住槽码。
  const board = box(group, [0.72, 0.018, 0.115], [0.08, TOP - 0.009, 0], wood, true);
  const stand = new THREE.Group();
  group.add(stand);
  for (const x of [-0.235, 0.398]) {
    for (const z of [-0.042, 0.042]) box(stand, [0.02, TOP - 0.018, 0.02], [x, (TOP - 0.018) / 2, z], 0xbba785);
    box(stand, [0.028, 0.017, 0.104], [x, 0.045, 0], wood);
  }
  box(group, [0.66, 0.027, 0.012], [0.08, TOP - 0.03, -0.043], 0xaa895f);
  const scaleTex = canvasTex(2048, 128, (c, w, h) => {
    c.fillStyle = '#e6ca98';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#544636';
    c.font = 'bold 41px sans-serif';
    for (let mm = 0; mm <= 700; mm++) {
      const x = (w * mm) / 700;
      c.fillRect(x, 0, mm % 10 ? 1 : 3, mm % 10 === 0 ? 42 : mm % 5 === 0 ? 28 : 15);
      if (mm % 50 === 0 && mm < 700) c.fillText(String(mm / 10), x + 5, 93);
    }
  });
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.012), new THREE.MeshBasicMaterial({ map: scaleTex }));
  scale.position.set(0.08, TOP - 0.008, 0.058);
  group.add(scale);

  const wheel = new THREE.Group();
  wheel.position.set(PX, LINE - R, 0);
  group.add(wheel);
  cyl(wheel, R, 0.017, [0, 0, 0], gold, true);
  for (const z of [-0.009, 0.009]) cyl(wheel, R + 0.001, 0.003, [0, 0, z], gold, true);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    cyl(wheel, 0.0038, 0.001, [0.014 * Math.cos(a), 0.014 * Math.sin(a), 0.011], 0x6d512a, true);
  }
  for (const z of [-0.017, 0.017]) box(group, [0.049, 0.009, 0.006], [PX + 0.021, LINE - R, z], metal);
  cyl(group, 0.004, 0.044, [PX, LINE - R, 0], metal, true);

  const cart = new THREE.Group();
  group.add(cart);
  box(cart, [0.104, 0.023, 0.059], [0, 0.03, 0], teal, true);
  box(cart, [0.086, 0.006, 0.049], [0, 0.044, 0], 0xb9d2cd);
  const tires = [];
  for (const x of [-0.033, 0.033])
    for (const z of [-0.032, 0.032]) {
      const tire = cyl(cart, 0.011, 0.008, [x, 0.011, z], 0x323c44, true);
      tires.push(tire);
      cyl(tire, 0.004, 0.009, [0, 0, 0], 0xc3c9c9);
    }
  box(cart, [0.012, 0.005, 0.018], [0.055, 0.044, 0], metal);
  const pan = new THREE.Group();
  group.add(pan);
  cyl(pan, 0.019, 0.005, [0, -0.037, 0], gold);
  cyl(pan, 0.0015, 0.037, [0, -0.0185, 0], metal);
  const cordMat = paint(0x393936);
  const cord = (vertical) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 8), cordMat);
    if (!vertical) m.rotation.z = Math.PI / 2;
    group.add(m);
    return m;
  };
  const horizontal = cord(false),
    vertical = cord(true);
  const wrappedCord = stroke(
    Array.from({ length: 19 }, (_, i) => {
      const a = (i * Math.PI) / 36;
      return [PX - R * Math.sin(a), LINE - R + R * Math.cos(a), 0];
    }),
    0x393936,
    1.5,
  );

  const timer = new THREE.Group();
  timer.position.x = TIMER;
  group.add(timer);
  box(timer, [0.077, 0.039, 0.072], [0, TOP + 0.0195, 0], 0x394b57, true);
  for (const z of [-0.024, 0.024]) box(timer, [0.05, 0.015, 0.009], [0, PAPER_Y + 0.003, z], metal);
  box(timer, [0.034, 0.011, 0.055], [0, PAPER_Y + 0.014, 0], teal, true);
  const striker = cyl(timer, 0.003, 0.009, [0, PAPER_Y + 0.006, 0], 0x34414a);
  const light = cyl(timer, 0.004, 0.002, [0.007, PAPER_Y + 0.021, 0], 0xa64836);
  // 线圈驱动弹片，纸带穿过线圈前方的压纸桥。
  cyl(timer, 0.008, 0.028, [-0.019, PAPER_Y + 0.012, 0], 0x97522c, true);
  for (let i = -3; i <= 3; i++) cyl(timer, 0.0085, 0.0012, [-0.019, PAPER_Y + 0.012, i * 0.0035], 0xc07844, true);
  box(timer, [0.025, 0.002, 0.006], [-0.009, PAPER_Y + 0.013, 0], metal);
  const adaptor = new THREE.Group();
  group.add(adaptor);
  box(adaptor, [0.078, 0.042, 0.057], [0.347, TOP + 0.021, -0.094], teal, true);
  const face = canvasTex(512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#e0ddd0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#344249';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('AC   50 Hz', 35, 110);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.061, 0.022), new THREE.MeshBasicMaterial({ map: face }));
  plate.position.set(0.347, TOP + 0.025, -0.0654);
  adaptor.add(plate);
  for (const off of [-0.013, 0.013])
    cyl(adaptor, 0.004, 0.004, [0.347 + off, TOP + 0.044, -0.078], off < 0 ? 0xb14130 : metal);
  box(group, [0.13, 0.014, 0.08], [0.349, TOP - 0.007, -0.09], wood);
  for (const x of [0.31, 0.38]) box(group, [0.012, 0.01, 0.085], [x, TOP - 0.019, -0.08], metal);
  for (const off of [-0.013, 0.013])
    stroke(
      [
        [TIMER + off, TOP + 0.023, -0.036],
        [TIMER + off, TOP + 0.012, -0.05],
        [0.347 + off, TOP + 0.048, -0.062],
        [0.347 + off, TOP + 0.047, -0.078],
      ],
      0x454344,
      1.5,
    );
  light.material = light.material.clone();

  // 纸带先沿板面滑动，余下部分垂在右端，纸张总长守恒。
  const paperMat = paint(0xfff2ce, { side: THREE.DoubleSide });
  const paper = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.018), paperMat);
    m.rotation.x = -Math.PI / 2;
    group.add(m);
    return m;
  };
  const strip = paper(),
    tail = paper();
  // 纸带本身很窄。触屏取带时也接受紧邻纸边的触点。
  const paperHit = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.046, 0.016),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  paperHit.userData.pick = true;
  strip.add(paperHit);
  // 垂直部分的宽度沿 z 轴。
  tail.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)),
  );
  const dots = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.0014, 10),
    new THREE.MeshBasicMaterial({ color: 0x253446 }),
    Math.ceil((adjustable ? 6 : 1.5) / PERIOD) + 1,
  );
  dots.frustumCulled = false;
  group.add(dots);
  const marker = new THREE.Object3D();
  marker.rotation.x = -Math.PI / 2;
  const base = adjustable ? new THREE.Group() : group;
  let support, ballast;
  const markings = [];
  if (adjustable) {
    base.add(stand, group);
    // 挡块接触车头两侧，中央留出牵引绳通道。
    for (const z of [-0.022, 0.022])
      box(group, [0.009, 0.034, 0.014], [START - TRAVEL - 0.052 - 0.0045, TOP + 0.017, z], metal);
    support = box(base, [0.052, 1, 0.11], [0.398, TOP - 0.018, 0], wood);
    ballast = [0.23, 0.32].map((x) => {
      const weight = box(base, [0.068, 0.009, 0.043], [x, 0.0045, 0.12], gold, true);
      markings.push(stampMass(weight, 250, 0.052, 0.026, 0.0045));
      weight.userData.home = weight.position.clone();
      return weight;
    });
  }
  function draw(run) {
    const angle = run.angle || 0;
    if (adjustable) {
      // 绕左支脚转木板。支架保持竖直，垫块填满右端抬高的间隙。
      const pivotX = -0.235,
        pivotY = TOP - 0.018;
      group.rotation.z = angle;
      group.position.set(
        pivotX * (1 - Math.cos(angle)) + pivotY * Math.sin(angle),
        pivotY * (1 - Math.cos(angle)) - pivotX * Math.sin(angle),
        0,
      );
      const height = (0.398 - pivotX) * Math.tan(angle);
      support.visible = height > 0;
      support.scale.y = height;
      support.position.y = pivotY + height / 2;
      ballast.forEach((w, i) => {
        const loaded = i < run.ballast;
        const parent = loaded ? cart : base;
        if (w.parent !== parent) parent.add(w);
        if (loaded) w.position.set(0, 0.052 + i * 0.009, 0);
        else w.position.copy(w.userData.home);
        w.quaternion.identity();
      });
      horizontal.visible = wrappedCord.visible = run.load > 0;
    }
    const travel = (run.startOffset || 0) + run.x;
    const x = START - travel,
      drop = adjustable && !run.load ? 0.381 : TRAVEL + (adjustable ? 0.046 : 0.04) - travel;
    cart.position.set(x, TOP, 0);
    pan.position.set(PX - R, drop, 0);
    if (adjustable) {
      // 槽码及下垂绳段在世界坐标系中铅直。
      const v = LINE - R - drop;
      const anchorX = PX - R * Math.cos(angle),
        anchorY = LINE - R + R * Math.sin(angle);
      pan.position.set(anchorX - v * Math.sin(angle), anchorY - v * Math.cos(angle), 0);
      pan.rotation.z = vertical.rotation.z = -angle;
    }
    wheel.rotation.z = travel / R;
    tires.forEach((w) => (w.rotation.y = travel / 0.011));
    const h = x - 0.052 - PX;
    horizontal.position.set(PX + h / 2, LINE, 0);
    horizontal.scale.y = h;
    const v = LINE - R - drop;
    vertical.position.set(PX - R, drop + v / 2, 0);
    if (adjustable)
      vertical.position.set(pan.position.x + (v / 2) * Math.sin(angle), pan.position.y + (v / 2) * Math.cos(angle), 0);
    vertical.scale.y = v;
    const from = x + 0.055;
    strip.position.set((from + EDGE) / 2, PAPER_Y, 0);
    strip.scale.x = EDGE - from;
    const remain = TRAVEL + 0.024 - travel;
    tail.position.set(EDGE, PAPER_Y - remain / 2, 0);
    tail.scale.x = remain;
    dots.count = run.marks.length;
    run.marks.forEach((m, i) => {
      marker.position.set(TIMER - run.x + m.x, PAPER_Y + 0.0004, 0);
      marker.updateMatrix();
      dots.setMatrixAt(i, marker.matrix);
    });
    dots.instanceMatrix.needsUpdate = true;
    light.material.color.setHex(run.recording ? 0xe5653d : 0x5b4138);
    striker.position.y = PAPER_Y + 0.006 + (run.recording ? 0.0015 * Math.sin((run.t / PERIOD) * Math.PI * 2) : 0);
  }
  return {
    group: base,
    board,
    ballast,
    support,
    cart,
    pan,
    timer,
    strip,
    draw,
    dispose() {
      for (const texture of markings) texture.dispose();
    },
    setPaperVisible(visible) {
      strip.visible = tail.visible = dots.visible = visible;
    },
  };
}
