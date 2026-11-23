import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.location = { search: '' };
globalThis.document = {
  getElementById: () => ({ style: {} }),
  createElement: () => ({ getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }) }),
};
const { draggable } = await import('../src/lessons/kit/interact.js');
const { demoActs } = await import('../src/lessons/kit/chemlesson.js');

function setup(enabled = () => true) {
  const root = new THREE.Group();
  const obj = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial());
  root.add(obj);
  root.updateMatrixWorld(true);
  const home = new THREE.Vector3(), offset = new THREE.Vector3(0, 0.2, 0);
  const target = new THREE.Vector3(1, 0.2, 0), placements = [];
  const tip = { value: '', loc(root, x, y) { if (y === -9) this.value = ''; return this; }, text(value) { this.value = value; } };
  const pointer = draggable(root, [{
    obj, dropOffset: offset,
    dropzones: [{ name: '瓶口', position: target, radius: 0.25, enabled, onDrop(position) { placements.push(position); } }],
    onDrag(p) { obj.position.copy(p); },
    onEnd(moved, dropped) { if (!dropped) obj.position.copy(home); },
  }], { tip });
  const ray = (x) => new THREE.Raycaster(new THREE.Vector3(x, 0, 3), new THREE.Vector3(0, 0, -1));
  const markers = () => root.getObjectByName('dropzones').children.filter((marker) => marker.visible);
  return { pointer, root, ray, obj, home, target, placements, markers, tip };
}

test('radius captures the working end, eases and lands exactly on release; nothing is drawn (初中 style)', () => {
  const { pointer, ray, obj, target, placements, markers, tip } = setup();
  pointer.down(ray(0));
  assert.equal(markers().length, 0);
  pointer.move(ray(0.8));
  assert.equal(obj.position.x, 0.8);
  assert.equal(markers().length, 0);
  assert.equal(tip.value, '');
  pointer.update(0.016);
  assert.ok(obj.position.x > 0.8 && obj.position.x < 1);
  pointer.up(ray(0.8));
  assert.deepEqual(obj.position.toArray(), [1, 0, 0]);
  assert.deepEqual(placements, [target]);
  assert.equal(markers().length, 0);
  assert.equal(tip.value, '');
});

test('release outside the radius uses the original return, even with a previously active magnet', () => {
  const { pointer, ray, obj, home, placements, markers } = setup();
  pointer.down(ray(0));
  pointer.move(ray(0.8));
  pointer.update(0.05);
  pointer.up(ray(0.74));
  assert.deepEqual(placements, []);
  assert.ok(obj.position.equals(home));
  assert.equal(markers().length, 0);
});

test('disabled zones do not light up or accept a drop', () => {
  const { pointer, ray, obj, home, placements, markers } = setup(() => false);
  pointer.down(ray(0));
  pointer.move(ray(1));
  pointer.update(0.1);
  assert.equal(markers().length, 0);
  pointer.up(ray(1));
  assert.deepEqual(placements, []);
  assert.ok(obj.position.equals(home));
});

test('pointer cancellation clears the zone without dropping', () => {
  const { pointer, ray, obj, home, placements, markers } = setup();
  pointer.down(ray(0));
  pointer.move(ray(1));
  pointer.up(ray(1), { type: 'pointercancel' });
  assert.deepEqual(placements, []);
  assert.ok(obj.position.equals(home));
  assert.equal(markers().length, 0);
});

test('both demo drag and path run through the same zones', () => {
  for (const method of ['drag', 'path']) {
    const { pointer, root, obj, home, target, placements, markers } = setup();
    const act = demoActs(pointer, root), end = new THREE.Vector3(0.8, 0, 0);
    const play = method === 'drag' ? act.drag(obj, end, { from: home }) : act.path(obj, [home, end]);
    play(0.1);
    assert.equal(markers().length, 0);
    play(0.6);
    pointer.update(0.016);
    assert.ok(obj.position.x > 0.8 && obj.position.x < 1);
    play(1);
    assert.deepEqual(placements, [target]);
    assert.deepEqual(obj.position.toArray(), [1, 0, 0]);
    assert.equal(markers().length, 0);
  }
});
