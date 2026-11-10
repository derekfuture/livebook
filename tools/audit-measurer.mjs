// Browser regression: physical switch input and complete resistance measurement, online/offline.
// LB_URL=http://127.0.0.1:5174/offline.html?book=wuli-9 node tools/audit-measurer.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const home = process.env.HOME;
const { chromium } = createRequire(`${home}/.cache/livebook-tools/package.json`)('playwright-core');
const browser = await chromium.launch({ executablePath: `${home}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, args: ['--use-angle=metal'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.LB_URL || 'http://127.0.0.1:5174/physics/pep/grade-9';
const offline = base.includes('offline.html');
const out = `review/measurer-fix/${offline ? 'offline' : 'online'}`;
mkdirSync(out, { recursive: true });
const click = name => page.getByRole('button', { name, exact: true }).click();
const state = () => page.evaluate(() => { const C = __lb.live.active.inst.debug.C; return { closed: C.get('S').closed, u: Math.round(Math.abs(C.get('V').value)*10)/10, i: Math.round(Math.abs(C.get('A').value)/.02)*.02, wires: C.wires.length }; });
const screen = (name, pos) => page.evaluate(({name,pos}) => {const p=__lb.live.active.inst.debug.C.get(name),v=p.group.localToWorld(p.group.position.clone().set(...pos)).project(__lb.stage.camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2];}, {name,pos});
async function pressSwitch(dx=1,dy=1) {await page.waitForTimeout(700);const [x,y]=await screen('S',[0,.02,0]);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy);await page.mouse.up();}
const slider = async value => {const input=page.locator('input[type=range]').first();await input.fill(String(value));await input.dispatchEvent('input');};
async function record() {const {u,i}=await state();await click('记下这组数据');await click(`${u.toFixed(1)} V`);await click(`${i.toFixed(2)} A`);await click(`${(u/i).toFixed(u/i<1?2:1)} Ω`);return {u,i,r:u/i};}
try {
  await page.goto(`${base}#live=measurer`);
  await page.waitForFunction(()=>window.__lb?.live?.active?.inst?.debug?.C);
  await page.getByText('不猜了',{exact:false}).click();
  await page.getByText('不用了',{exact:true}).click({timeout:1000}).catch(()=>{});
  await page.waitForTimeout(1000);
  if(offline) await context.setOffline(true);
  // Connect the circuit using real terminal drags, not the example shortcut.
  const pairs=[['E.+','A.0.6'],['A.-','X.b'],['X.a','P.C'],['P.A','S.b'],['S.a','E.-'],['V.3','X.b'],['V.-','X.a']];
  for(const pair of pairs){
    const coords=[];
    for(const id of pair){const k=id.indexOf('.'),name=id.slice(0,k);const pos=await page.evaluate(({name,t})=>__lb.live.active.inst.debug.C.get(name).terminals[t],{name,t:id.slice(k+1)});coords.push(await screen(name,pos));}
    await page.mouse.move(...coords[0]);await page.mouse.down();await page.mouse.move(...coords[1],{steps:12});await page.mouse.up();
  }
  assert.equal((await state()).wires,7,'manual wiring');
  await pressSwitch();assert.equal((await state()).closed,true,'1px jitter must close switch');
  assert.ok((await state()).u>0 && (await state()).i>0,'both meters read');
  await pressSwitch(14,0);assert.equal((await state()).closed,true,'drag must not toggle switch');
  await pressSwitch();assert.equal((await state()).closed,false,'jitter must open switch');
  await click('记下这组数据');assert.match(await page.locator('body').innerText(),/先把电路连好、闭合开关/);
  await pressSwitch();
  const rows=[];
  for(const pos of [100,50,10]){await slider(pos);rows.push(await record());}
  const avg=rows.reduce((sum,r)=>sum+r.r,0)/rows.length;
  await click(`${avg.toFixed(1)} Ω`);
  assert.equal(await page.locator('table').first().locator('tbody tr').count(),3);
  await page.screenshot({path:`${out}/resistor.png`});
  // Repeated reading is rejected rather than producing duplicate data.
  await click('记下这组数据');assert.match(await page.locator('body').innerText(),/这个电压已经测过了/);
  await pressSwitch();await click('小灯泡');await click('示范接法');await pressSwitch();
  const lamp=[];
  for(const pos of [100,35,10]){await slider(pos);lamp.push(await record());}
  await click('越大');
  assert.equal(await page.locator('table').nth(1).locator('tbody tr').count(),3);
  assert.ok(lamp[2].r>lamp[0].r,'lamp resistance increases');
  await page.screenshot({path:`${out}/lamp.png`});
  assert.deepEqual(errors,[]);
  const result={offlineNetworkBlocked:offline,manualWiring:true,jitterClick:true,dragDoesNotToggle:true,openCircuitRejected:true,duplicateRejected:true,rows,average:avg,lamp,errors};
  writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} catch(e) {await page.screenshot({path:`${out}/failure.png`});console.log(await page.locator('body').innerText());throw e;} finally {await browser.close();}
