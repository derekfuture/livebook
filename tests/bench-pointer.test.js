import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
globalThis.location = { search: '' };
globalThis.document = { getElementById: () => ({ style: {} }) };
const { Bench } = await import('../src/lessons/kit/bench.js');
const { Circuit, switchPart } = await import('../src/lessons/kit/circuit.js');
function fixture() {
  const circuit = new Circuit();
  const sw = circuit.add(switchPart('S'));
  const bench = new Bench(circuit, circuit.group);
  // Real switch geometry and raycasting, without a renderer or browser.
  circuit.group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
  const event = (x, y, type = 'pointermove') => ({ clientX: x, clientY: y, type });
  return { sw, bench, ray, event, pointer: bench.pointer() };
}
test('switch click tolerates stationary moves and small hand jitter', () => {
  const { sw, ray, event, pointer } = fixture();
  for (const [x,y] of [[100,100],[101,101],[103,103]]) {
    const previous=sw.closed;
    assert.equal(pointer.down(ray,event(100,100,'pointerdown')),true);
    pointer.move(ray,event(x,y));pointer.up(ray,event(x,y,'pointerup'));
    assert.equal(sw.closed,!previous);
  }
});
test('dragging away then back does not click; cancellation does not click', () => {
  const { sw, ray, event, pointer } = fixture();
  pointer.down(ray,event(100,100));pointer.move(ray,event(120,100));pointer.move(ray,event(100,100));pointer.up(ray,event(100,100,'pointerup'));
  assert.equal(sw.closed,false);
  pointer.down(ray,event(100,100));pointer.up(ray,event(100,100,'pointercancel'));
  assert.equal(sw.closed,false);
  pointer.down(ray,event(100,100));pointer.up(ray,event(120,100,'pointerup'));
  assert.equal(sw.closed,false);
});
test('ray-only callers preserve clicks on stationary pointermove', () => {
  const { sw, ray, pointer } = fixture();
  pointer.down(ray);pointer.move(ray);pointer.up();
  assert.equal(sw.closed,true);
});
