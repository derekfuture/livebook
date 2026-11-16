import assert from 'node:assert/strict';
import test from 'node:test';
import { RippleTank, DX, NX, BARRIER } from '../src/lessons/kit/rippleTank.js';

test('完全合拢的挡板不透波；重新开缝后已有的入射波传播到另一侧', () => {
  const tank = new RippleTank();
  tank.setGap(0, 0);
  tank.advance(1.6, true);
  assert.ok(tank.surface.slice((BARRIER + 2) * NX).every((h) => h === 0));
  tank.setGap(-0.016, 0.016);
  tank.advance(0.9, true);
  assert.ok(tank.surface.slice((BARRIER + 2) * NX).some((h) => Math.abs(h) > 0.1));
});

test('同波长、同传播距离，窄缝的斜向振动相对中心更强', () => {
  function relativePower(width) {
    const tank = new RippleTank();
    tank.setGap(-width / 2, width / 2);
    let central = 0,
      oblique = 0;
    for (let i = 0; i < 200; i++) {
      tank.step(true);
      if (i < 156) continue;
      for (let j = 0; j < 20; j++) {
        const r = 0.105 + j * 0.001;
        const sample = (angle) =>
          tank.surface[
            (BARRIER + Math.round((r * Math.cos(angle)) / DX)) * NX +
              (NX - 1) / 2 +
              Math.round((r * Math.sin(angle)) / DX)
          ] ** 2;
        central += sample(0);
        oblique += sample(Math.PI / 4);
      }
    }
    return oblique / central;
  }
  assert.ok(relativePower(0.025) > relativePower(0.128) * 1.4);
});
