import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
globalThis.location = {search:''};
globalThis.document = {getElementById:()=>({style:{}}),createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const {draggable}=await import('../src/lessons/kit/interact.js');
function setup(tappable=true){
 const root=new THREE.Group(),obj=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());root.add(obj);root.updateMatrixWorld(true);
 const count={taps:0,drags:0,ends:[]};const pointer=draggable(root,[{obj,onDrag(){count.drags++},onEnd(moved){count.ends.push(moved)},...(tappable?{onTap(){count.taps++}}:{})}]);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,3),new THREE.Vector3(0,0,-1));
 const e=(x,type='pointermove')=>({clientX:x,clientY:100,type});return{pointer,ray,e,count};
}
test('mixed tap/drag preserves small jitter without drag side effects',()=>{const {pointer:p,ray:r,e,count:c}=setup();p.down(r,e(100));p.move(r,e(101));p.up(r,e(101,'pointerup'));assert.equal(c.taps,1);assert.equal(c.drags,0);assert.deepEqual(c.ends,[false]);});
test('real drag returning to start and cancelled gesture never tap',()=>{const {pointer:p,ray:r,e,count:c}=setup();p.down(r,e(100));p.move(r,e(120));p.move(r,e(100));p.up(r,e(100,'pointerup'));assert.equal(c.taps,0);assert.ok(c.drags>0);p.down(r,e(100));p.up(r,e(100,'pointercancel'));assert.equal(c.taps,0);assert.deepEqual(c.ends,[true,true]);});
test('pure drag retains immediate movement, ray-only mixed click tolerates stationary move',()=>{const a=setup(false);a.pointer.down(a.ray,a.e(100));a.pointer.move(a.ray,a.e(101));assert.equal(a.count.drags,1);a.pointer.up();const b=setup();b.pointer.down(b.ray);b.pointer.move(b.ray);b.pointer.up();assert.equal(b.count.taps,1);});
