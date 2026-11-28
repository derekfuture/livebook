import * as THREE from 'three';
import { canvasTex } from '../props.js';
import { paint } from '../../../live/ink.js';

export function stampMass(mesh, mass, width, height, y) {
  const tex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#ddbf89';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#302c28';
    g.font = 'bold 63px sans-serif';
    g.textAlign = 'center';
    g.fillText(mass + ' g', w / 2, 85);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex }));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = y + 0.0002;
  mesh.add(plate);
  return tex;
}

// 每组槽码都可以从台面拿起。安装位置固定在滑轮下方，换下的槽码回到原位。
export function loadRack(rig, loads, enabled, mount) {
  const hook = new THREE.Vector3(-0.324, 0.385, 0);
  const stacks = loads.map((load, i) => {
    const radius = load >= 0.15 ? 0.028 : 0.018;
    const height = 0.008 + 0.005 * i;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), paint(0xb58d4d));
    const home = new THREE.Vector3(-0.43 + i * 0.066, height / 2, 0.13);
    rig.group.add(mesh);
    const tex = stampMass(mesh, load * 1000, radius * 1.64, radius * 0.8, height / 2);
    return { load, mesh, home, tex };
  });
  let dragging = null,
    selected = 0;
  function draw(load) {
    selected = load;
    for (const item of stacks) {
      if (item === dragging) continue;
      const mounted = item.load === load;
      const parent = mounted ? rig.pan : rig.group;
      if (item.mesh.parent !== parent) parent.add(item.mesh);
      item.mesh.position.copy(mounted ? item.mesh.userData.mount : item.home);
      item.mesh.quaternion.identity();
    }
  }
  const drags = stacks.map((item, i) => {
    const { mesh } = item;
    mesh.userData.mount = new THREE.Vector3(0, -0.034 + mesh.geometry.parameters.height / 2, 0);
    return {
      obj: mesh,
      plane: 'xy',
      offset: 0.06,
      keepOffset: true,
      enabled: () => enabled() && item.load !== selected,
      hint: () => item.load * 1000 + ' g 槽码：拖到挂钩上',
      onStart() {
        dragging = item;
      },
      onDrag(p) {
        mesh.position.set(p.x, Math.max(item.home.y, p.y), item.home.z * Math.max(0, 1 - p.y / hook.y));
      },
      onEnd(moved) {
        dragging = null;
        if (moved && Math.abs(mesh.position.x - hook.x) < 0.08 && Math.abs(mesh.position.y - hook.y) < 0.09) mount(i);
        draw(selected);
      },
    };
  });
  return {
    draw,
    drags,
    dispose() {
      for (const item of stacks) item.tex.dispose();
    },
  };
}
