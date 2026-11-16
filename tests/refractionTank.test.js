import test from 'node:test';
import assert from 'node:assert/strict';
import { RefractionTank } from '../src/lessons/kit/refractionTank.js';

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b} (±${tolerance})`);

// Measure wavenumber/direction in the resulting water height, not a ray sent to
// the solver. The source has finite length, so this includes its edge diffraction.
function measuredWave(tank, centerX = -0.044) {
  const p = tank.parameters;
  tank.setPower(true);
  tank.advance(5);
  const points = [];
  for (let j = 0; j < 17; j++)
    for (let i = 0; i < 23; i++) points.push({ x: centerX - 0.066 + i * 0.006, z: 0.045 + j * 0.006, re: 0, im: 0 });
  const samples = [[], []];
  for (let n = 0; n < 250; n++) {
    tank.advance(0.008);
    const phase = 2 * Math.PI * p.frequency * tank.time;
    for (const point of points) {
      const u = tank.sample(point.x, point.z);
      point.re += u * Math.cos(phase);
      point.im -= u * Math.sin(phase);
    }
    samples[0].push([tank.time, tank.sample(0.03, -0.065)]);
    samples[1].push([tank.time, tank.sample(-0.05, 0.1)]);
  }
  const expectedK = (2 * Math.PI * p.frequency) / Math.sqrt(p.gravity * p.shallow);
  let best = { power: 0 };
  for (let degrees = -50; degrees <= 10; degrees += 0.5)
    for (let ratio = 0.85; ratio <= 1.15; ratio += 0.01) {
      const angle = (degrees * Math.PI) / 180,
        k = expectedK * ratio;
      let re = 0,
        im = 0;
      for (const point of points) {
        const phase = k * (Math.sin(angle) * point.x + Math.cos(angle) * point.z);
        re += point.re * Math.cos(phase) - point.im * Math.sin(phase);
        im += point.re * Math.sin(phase) + point.im * Math.cos(phase);
      }
      const power = re * re + im * im;
      if (power > best.power) best = { power, degrees, wavelength: (2 * Math.PI) / k };
    }
  return { ...best, samples };
}

test('深浅交界静水不自发产生波；恒定水位跨变深地形仍保持平衡', () => {
  const m = new RefractionTank({ damping: 0, spongeRate: 0 });
  m.advance(0.1);
  assert.ok(m.surface.every((v) => v === 0));
  m.surface.fill(0.0001);
  const volume = m.volume();
  m.advance(0.2);
  assert.ok(m.surface.every((v) => v === 0.0001));
  assert.ok(m.fluxX.every((v) => v === 0) && m.fluxZ.every((v) => v === 0));
  close(m.volume(), volume, 1e-15);
  close(
    m.energy(),
    (m.parameters.density * m.parameters.gravity * m.surface.length * m.spacing ** 2 * 0.0001 ** 2) / 2,
  );
});

test('斜入射的实际波场满足折射方向与浅区波长；过界后频率仍由同一振源决定', () => {
  const m = new RefractionTank(),
    p = m.parameters,
    measured = measuredWave(m);
  const transmitted = Math.asin(Math.sqrt(p.shallow / p.deep) * Math.sin(p.boundaryAngle));
  const expectedDirection = ((transmitted - p.boundaryAngle) * 180) / Math.PI;
  assert.ok(measured.power > 1);
  close(measured.degrees, expectedDirection, 2);
  close(measured.wavelength, Math.sqrt(p.gravity * p.shallow) / p.frequency, 0.002);
  assert.ok(measured.wavelength < (Math.sqrt(p.gravity * p.deep) / p.frequency) * 0.65);
  for (const samples of measured.samples) {
    const crossings = [];
    for (let i = 1; i < samples.length; i++) {
      const [a, y0] = samples[i - 1],
        [b, y1] = samples[i];
      if (y0 < 0 && y1 >= 0) crossings.push(a + ((b - a) * -y0) / (y1 - y0));
    }
    assert.ok(crossings.length >= 3);
    const period = (crossings.at(-1) - crossings[0]) / (crossings.length - 1);
    close(period, 1 / p.frequency, 0.004);
  }
});

test('垂直交界面入射不应硬造转向；相同水深也不因画了交界线就折射', () => {
  const normal = new RefractionTank({ sourceAngle: Math.PI / 6 });
  // Follow the centre of the actual finite source's normal ray. Sampling the
  // old oblique beam region here instead measures the dipper's edge diffraction.
  const centerX = normal.parameters.sourceX - (0.093 - normal.parameters.sourceZ) * Math.tan(normal.angle);
  const n = measuredWave(normal, centerX);
  close(n.degrees, -30, 2);
  close(n.wavelength, Math.sqrt(9.8 * 0.002) / 2, 0.002);
  const uniform = new RefractionTank({ shallow: 0.006 });
  // The uniform-water beam stays centred on x=0; its side includes edge diffraction.
  const u = measuredWave(uniform, 0);
  close(u.degrees, 0, 2);
  close(u.wavelength, Math.sqrt(9.8 * 0.006) / 2, 0.003);
});

test('正入射脉冲在深度台阶产生真实反射与透射，水位和流量边界给出正确振幅比', () => {
  const m = new RefractionTank({ boundaryAngle: 0, damping: 0, spongeRate: 0 });
  const p = m.parameters,
    c1 = Math.sqrt(p.gravity * p.deep),
    c2 = Math.sqrt(p.gravity * p.shallow),
    a = 0.00005;
  const shape = (z) => a * Math.exp(-0.5 * ((z + 0.14) / 0.025) ** 2);
  for (let j = 0; j < m.nz; j++)
    for (let i = 0; i < m.nx; i++) {
      const z = j * m.spacing - m.length / 2,
        k = j * m.nx + i;
      m.surface[k] = shape(z);
      if (j < m.nz - 1) m.fluxZ[k] = c1 * shape(z + m.spacing / 2);
    }
  const energy = m.energy(),
    volume = m.volume();
  m.advance(0.9);
  let reflected = 0,
    transmitted = 0;
  for (let z = -0.13; z < -0.025; z += 0.001) reflected = Math.max(reflected, m.sample(0, z));
  for (let z = 0.015; z < 0.13; z += 0.001) transmitted = Math.max(transmitted, m.sample(0, z));
  close(reflected / a, (c1 - c2) / (c1 + c2), 0.02);
  close(transmitted / a, (2 * c1) / (c1 + c2), 0.04);
  close(m.volume(), volume, 1e-14);
  close(m.energy(), energy, energy * 1e-5);
});

test('振片的真实体积扰动、吸收边界与水面质量收支相符，源功和耗散独立入账', () => {
  const m = new RefractionTank();
  m.setPower(true);
  m.advance(2.37);
  const maskArea = m.sourceMask.reduce((a, b) => a + b) * m.spacing ** 2;
  const displaced = m.parameters.sourceWidth * maskArea * m.sourceAt().displacement;
  close(m.injectedVolume, displaced, 1e-11);
  close(m.volume(), m.injectedVolume - m.absorbedVolume, 1e-14);
  assert.ok(m.work > 0 && m.heat > 0 && m.energy() > 0);
  close(m.work, m.energy() + m.heat, 1e-10);
  assert.ok(m.energy() < m.work);
});

test('停机连续退振，保留水面和物理时间；不能边振边转，停振后转动不清空余波', () => {
  const m = new RefractionTank();
  m.setPower(true);
  m.advance(1.37);
  const field = m.surface.slice(),
    time = m.time,
    height = m.sourceAt().displacement;
  assert.equal(m.setSourceAngle(0.3), false);
  assert.equal(m.angle, 0);
  m.setPower(false);
  assert.deepEqual(m.surface, field);
  close(m.sourceAt().displacement, height, 1e-15);
  assert.equal(m.time, time);
  assert.equal(m.setSourceAngle(0.3), false);
  const before = m.energy();
  m.advance(0.05);
  assert.ok(m.energy() > before * 0.25);
  m.advance(0.8);
  const remaining = m.surface.slice(),
    phaseTime = m.time;
  assert.equal(m.setSourceAngle(0.3), true);
  assert.deepEqual(m.surface, remaining);
  assert.equal(m.time, phaseTime);
  assert.ok(m.energy() > 0);
  m.advance(8);
  assert.ok(m.energy() < before * 0.03);
});

test('镜像交界线和振片得到镜像波场，角度不由硬编码方向决定', () => {
  const a = new RefractionTank({ sourceAngle: 0.2 }),
    b = new RefractionTank({ boundaryAngle: -Math.PI / 6, sourceAngle: -0.2 });
  a.setPower(true);
  b.setPower(true);
  a.advance(2.5);
  b.advance(2.5);
  let error = 0;
  for (let j = 0; j < a.nz; j++)
    for (let i = 0; i < a.nx; i++)
      error = Math.max(error, Math.abs(a.surface[j * a.nx + i] - b.surface[j * a.nx + a.nx - 1 - i]));
  assert.ok(error < 1e-12, `镜像误差 ${error}`);
});

test('推进步长与画面帧率无关，重做才清除波场和记录', () => {
  const a = new RefractionTank(),
    b = new RefractionTank();
  a.setPower(true);
  b.setPower(true);
  for (let i = 0; i < 30; i++) a.advance(1 / 60);
  for (let i = 0; i < 60; i++) b.advance(1 / 120);
  assert.deepEqual(a.surface, b.surface);
  assert.deepEqual(a.fluxX, b.fluxX);
  assert.deepEqual(a.fluxZ, b.fluxZ);
  a.reset();
  assert.ok(a.surface.every((v) => v === 0));
  assert.ok(a.fluxX.every((v) => v === 0) && a.fluxZ.every((v) => v === 0));
  assert.equal(a.time, 0);
  assert.equal(a.work, 0);
  assert.equal(a.injectedVolume, 0);
  assert.equal(a.powered, false);
});

test('拒绝非法深度、网格、驱动和时间参数', () => {
  for (const options of [
    { deep: 0 },
    { shallow: -1 },
    { nx: 1 },
    { nz: 23.5 },
    { spacing: 0 },
    { frequency: NaN },
    { sourceStroke: 0.01 },
    { response: 0 },
    { spongeRate: -1 },
    { damping: -1 },
  ])
    assert.throws(() => new RefractionTank(options), RangeError);
  const m = new RefractionTank();
  assert.throws(() => m.setSourceAngle(NaN), RangeError);
  assert.throws(() => m.advance(Infinity), RangeError);
  assert.throws(() => m.advance(-1), RangeError);
});
