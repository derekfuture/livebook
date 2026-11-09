// Focused semantic/geometry audit. Run alongside qa.mjs --flow --mouse --shots.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const home = process.env.HOME;
const base = [`${home}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find(p => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json')));
const { chromium } = createRequire(base)('playwright-core');
const out = process.env.LB_AUDIT_OUT || new URL('../review/lavoisier-audit-2026-11-08', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: `${home}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { window.WebSocket = class { addEventListener() {} removeEventListener() {} send() {} close() {} }; });
const clickScene = async text => { const el = page.getByText(text, { exact: true }); await el.waitFor({ state: 'visible' }); await page.waitForTimeout(1000); const box = await el.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForFunction(() => __lb.live.active.inst.debug.audit.micro().open); };
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`${process.env.LB_URL || 'http://127.0.0.1:54934/'}?book=huaxue-9s#live=lavoisier`);
  await page.waitForFunction(() => window.__lb?.live?.active?.inst?.debug);
  await page.getByText('不猜了', { exact: false }).click({ timeout: 1500 }).catch(() => {});
  await page.getByText('不用了', { exact: true }).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(1000);
  const geometry = await page.evaluate(() => {
    const a = __lb.live.active.inst.debug.audit, failures = [];
    const check = (v, m) => { if (!v) failures.push(m); };
    check(a.valveBody.position.distanceTo(a.valveAt) < 1e-9, 'valve body detached from tube centerline');
    check(Math.hypot(a.valve.position.x - a.valveAt.x, a.valve.position.y - a.valveAt.y) < 1e-9, 'valve handle axis detached');
    const routes = [[a.neck, a.airBell, -.035], [a.outlet, a.oxygenBell, .26]];
    const result = [];
    for (const [tube, bell, x] of routes) {
      check(bell.rim < bell.surface, 'bell rim not immersed in mercury');
      bell.glass.geometry.computeBoundingBox();
      check(bell.knob.position.y - bell.knob.geometry.parameters.height/2 <= bell.glass.position.y + bell.glass.geometry.boundingBox.max.y, 'transfer port floats above roof');
      let crossings = 0, low = Infinity, wallHits = 0, floorHits = 0;
      const r = tube.geometry.parameters.radius;
      for (let j = 0; j <= 2000; j++) {
        const p = tube.curve.getPoint(j / 2000), radial = Math.hypot(p.x - x, p.z);
        low = Math.min(low, p.y - r);
        if (Math.abs(radial - bell.radius) < r) {
          crossings++;
          check(p.y + r < bell.rim, `tube cuts through bell side at y=${p.y.toFixed(4)}`);
        }
        if (radial > bell.radius * 1.5 - r && radial < bell.radius * 1.65 + r && p.y - r < .028) wallHits++;
        if (radial < bell.radius * 1.5 && p.y - r < .003) floorHits++;
      }
      check(crossings > 0, 'tube never enters bell'); check(!wallHits, 'tube crosses trough wall'); check(!floorHits, 'tube crosses trough floor');
      result.push({ minTubeBottom: low, rim: bell.rim, outsideMercury: bell.surface, crossings, wallHits, floorHits });
    }
    check(a.retort.geometry.parameters.thetaStart > 0 && a.small.geometry.parameters.thetaStart > 0, 'sampling neck attached to closed sphere');
    return { result, failures };
  });
  writeFileSync(`${out}/geometry.json`,JSON.stringify(geometry,null,2));
  if (geometry.failures.length) throw Error(JSON.stringify(geometry));
  const physics = await page.evaluate(() => {
    const i = __lb.live.active.inst, d = i.debug, A = d.A, V = i.group.position.constructor;
    const p = (x,y,z=0) => new V(x,y,z), step = n => { for (let j=0;j<Math.ceil(n*60);j++) i.update(1/60,j/60); };
    const check = (v,m) => { if(!v) throw Error(m); };
    A.gate(1,p(.175,.033)); check(!d.S.strong,'empty retort heated');
    A.gate(0,p(-.155,.033)); step(1.5); A.cap(0,p(-.275,.009)); check(!d.S.capOff[0],'hot stopper removed');
    check(!d.S.records.length,'hot volume recorded'); A.gate(0,p(-.19,.033)); step(.8); check(d.S.heated<1&&!d.S.read,'partial run accepted as complete');
    const student=JSON.stringify(d.S); d.bar.play('demo');step(6);d.bar.stop();check(JSON.stringify(d.S)===student,'demo changed student state');
    A.gate(0,p(-.155,.033));step(5);A.gate(0,p(-.19,.033));step(.8);check(d.S.read,'cold record missing');
    const axis=d.audit.valve.position.clone(); A.seal(d.audit.valveAt.clone().add(p(.025,0,.023))); step(.05);
    check(d.audit.valve.position.distanceTo(axis)<1e-9,'closing valve translates it off pipe');
    A.cap(0,p(-.275,.009));A.capDrop(0);A.seal(d.audit.valveAt);check(d.S.sealed,'open sampling port exposed remaining gas');
    A.cap(1,p(.20,.009));A.capDrop(1);A.spoonDrag(p(-.19,.19));A.spoonDrag(p(-.19,.111));check(d.S.powder==='spoon','scoop failed');
    A.spoonDrag(p(-.19,.19));A.spoonDrag(p(.14,.13));step(.65);check(d.S.transferred,'powder transfer failed');
    A.gate(1,p(.175,.033));check(!d.S.strong,'unstoppered retort heated');
    A.cap(1,p(.14,.125));A.capDrop(1);A.gate(1,p(.175,.033));step(1.2);A.gate(1,p(.14,.033));step(.8);check(!d.S.recovered&&d.S.decomposed<1,'partial decomposition accepted');
    A.gate(1,p(.175,.033));step(4);A.gate(1,p(.14,.033));step(.8);check(d.S.recovered,'oxygen record failed');
    check(Math.abs(d.audit.smallMetal.position.y - d.audit.smallMetal.geometry.parameters.radius*d.audit.smallMetal.scale.y - .060)<1e-6,'mercury drop floats above bottom');
    A.pump(p(.163,.024,.16));check(d.S.syringeGas===0,'oxygen sucked from unisolated retort');
    A.isolate(d.audit.rightValveAt.clone().add(p(.025,0,.012)));
    const conservation=()=>check(Math.abs((21-d.S.drawn)+d.S.syringeGas+d.S.delivered-21)<1e-8,'oxygen not conserved across three vessels');
    A.pump(p(.1305,.024,.16));step(.1);conservation();check(Math.abs(d.S.syringeGas-10.5)<1e-8,'partial draw ignored');
    A.connect(p(.1,.2));A.connectDrop();A.pump(p(.098,.024,.16));check(Math.abs(d.S.syringeGas-10.5)<1e-8,'disconnected gas escaped');
    A.connect(d.audit.ports[0]);A.connectDrop();A.pump(p(.098,.024,.16));step(.1);conservation();check(!d.S.mixed&&Math.abs(d.S.delivered-10.5)<1e-8,'partial transfer marked complete');
    A.connect(d.audit.ports[1]);A.connectDrop();A.pump(p(.163,.024,.16));step(.1);conservation();check(Math.abs(d.S.syringeGas-10.5)<1e-8,'overdraw created gas');
    A.connect(d.audit.ports[0]);A.connectDrop();A.pump(p(.098,.024,.16));step(.1);conservation();
    check(d.S.mixed&&d.S.syringeGas===0&&d.S.delivered===21,'physical transfer incomplete');
    check(Math.abs(d.audit.airBell.liquid.scale.y-.018)<1e-8&&Math.abs(d.audit.oxygenBell.liquid.scale.y-.110)<1e-8,'liquid levels do not follow transfer');
    const records=d.S.records;A.reset();step(.1);check(!d.S.heated&&!d.S.records.length&&!d.bar.finished,'reset incomplete');
    d.bar.play('demo');step(33.8);check(d.S.mixed,'full teacher demonstration incomplete');step(2);check(!d.S.heated&&!d.S.records.length,'full demo did not restore');
    return { records, interruptedDemoRestored:true, fullDemoRestored:true, wrongOrder:true, partialRuns:true, reset:true, gasTransferConserved:true, partialTransfer:true, disconnectedSeal:true };
  });
  await clickScene('钻进汞表面看 ⊙');
  const before = await page.evaluate(() => __lb.live.active.inst.debug.audit.micro());
  const liveForward = await page.evaluate(() => { const i=__lb.live.active.inst,d=i.debug,V=i.group.position.constructor;d.A.gate(0,new V(-.155,.033,0));for(let j=0;j<18*60;j++)i.update(1/60,j/60);return d.audit.micro().particles; });
  if(liveForward.filter(k=>k==='HgO').length!==10||liveForward.filter(k=>k==='Hg').length!==6||liveForward.includes('O2'))throw Error('live oxidation atom balance failed');
  await page.getByText('回到桌上',{exact:false}).click();
  await page.evaluate(() => { const i=__lb.live.active.inst,d=i.debug;for(const q of d.qa.slice(0,2)){q.run();for(let j=0;j<(q.wait||1)*60;j++)i.update(1/60,j/60)} });
  await clickScene('钻进汞表面看 ⊙');
  const after = await page.evaluate(() => __lb.live.active.inst.debug.audit.micro());
  const count = (a,k) => a.particles.filter(x=>x===k).length;
  if(count(before,'Hg')!==16||count(before,'O2')!==5||count(after,'Hg')!==6||count(after,'HgO')!==10||count(after,'O2')!==0) throw Error('microscopic excess-Hg/stoichiometry incorrect');
  await page.waitForTimeout(1200); await page.screenshot({path:`${out}/micro-oxidation.png`});
  await page.getByText('回到桌上',{exact:false}).click();
  await page.evaluate(() => { const i=__lb.live.active.inst,d=i.debug; for(const q of d.qa.slice(2,10)){q.run();for(let j=0;j<(q.wait||1)*60;j++)i.update(1/60,j/60)} });
  await clickScene('钻进小容器看 ⊙');
  const oxide=await page.evaluate(()=>__lb.live.active.inst.debug.audit.micro()); if(count(oxide,'HgO')!==10||count(oxide,'N2'))throw Error('wrong phase in small retort micro');
  const liveReverse=await page.evaluate(()=>{const i=__lb.live.active.inst,d=i.debug,V=i.group.position.constructor;d.A.gate(1,new V(.175,.033,0));for(let j=0;j<18*60;j++)i.update(1/60,j/60);return d.audit.micro().particles;});
  if(liveReverse.filter(k=>k==='Hg').length!==10||liveReverse.filter(k=>k==='O2').length!==5||liveReverse.includes('HgO'))throw Error('live decomposition atom balance failed');
  await page.getByText('回到桌上',{exact:false}).click();
  await page.evaluate(()=>{const i=__lb.live.active.inst,d=i.debug;for(const q of d.qa.slice(10,12)){q.run();for(let j=0;j<(q.wait||1)*60;j++)i.update(1/60,j/60)}});
  await clickScene('钻进小容器看 ⊙');
  const recovered=await page.evaluate(()=>__lb.live.active.inst.debug.audit.micro());if(count(recovered,'Hg')!==10||count(recovered,'O2')!==5||count(recovered,'HgO'))throw Error('decomposition particle balance incorrect');
  await page.waitForTimeout(1200);await page.screenshot({path:`${out}/micro-decomposition.png`});
  await page.getByText('回到桌上',{exact:false}).click();
  await page.evaluate(()=>{const d=__lb.live.active.inst.debug;d.A.reset();d.audit.look([d.audit.valveAt.x,d.audit.valveAt.y,0],[.55,.2,1],.25)});
  await page.waitForTimeout(1400);await page.screenshot({path:`${out}/valve-closeup.png`});
  await page.evaluate(()=>__lb.live.active.inst.debug.audit.back());
  await page.waitForTimeout(1400);await page.screenshot({path:`${out}/initial-1440.png`});
  await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(800);await page.screenshot({path:`${out}/initial-1280.png`});
  await page.setViewportSize({width:1440,height:900});
  const studentBeforeDemo = await page.evaluate(() => { const i=__lb.live.active.inst,d=i.debug,V=i.group.position.constructor;d.A.reset();d.A.gate(0,new V(-.155,.033,0));for(let j=0;j<90;j++)i.update(1/60,j/60);d.A.gate(0,new V(-.19,.033,0));for(let j=0;j<60;j++)i.update(1/60,j/60);return JSON.stringify(d.S); });
  await page.locator('.lb-demo').click();
  for (const [shot, seconds] of [6,2,4,5,6,2,4,5].entries()) {
    await page.waitForFunction(k => __lb.live.active.inst.debug.bar.shot === k, shot);
    await page.waitForTimeout(seconds * 650);
    await page.screenshot({path:`${out}/teacher-${shot + 1}.png`});
    if(shot>=4 && await page.evaluate(()=>!!__lb.live.active.inst.debug.S.spoonPos || __lb.live.active.inst.debug.S.spoonHeld))throw Error('teacher left spoon suspended after release');
  }
  await page.waitForFunction(() => __lb.live.active.inst.debug.S.mixed);
  await page.screenshot({path:`${out}/transfer-complete.png`});
  const demoRecords=await page.locator('table.data tbody').innerText();
  if(!demoRecords.includes('100.0')||!demoRecords.includes('密闭转移后'))throw Error('teacher notebook differs from demonstrated transfer');
  await page.waitForFunction(() => !__lb.live.active.inst.debug.bar.playing);
  const studentAfterDemo=await page.evaluate(()=>JSON.stringify(__lb.live.active.inst.debug.S));
  if(studentBeforeDemo!==studentAfterDemo)throw Error('real-time teacher playback mutated student state');
  if((await page.locator('table.data tbody').innerText()).includes('密闭转移后'))throw Error('teacher notebook not restored');
  const report={geometry,physics,teacherUIRestored:true,micro:{liveForward,liveReverse,before:before.particles,after:after.particles,oxide:oxide.particles,recovered:recovered.particles},errors};
  writeFileSync(`${out}/audit.json`,JSON.stringify(report,null,2));
  if(errors.length)throw Error(errors.join(';'));console.log(JSON.stringify(report,null,2));
} catch (error) { console.error(error); await page.screenshot({ path: `${out}/failure.png` }); console.log(await page.evaluate(() => ({ state: __lb.live.active.inst.debug.S, micro: __lb.live.active.inst.debug.audit.micro(), entry: [...document.querySelectorAll('.mw-go')].map(el => { const b=el.getBoundingClientRect(); return { text:el.textContent, box: [b.x,b.y,b.width,b.height], target: document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.outerHTML.slice(0,200) } }) }))); throw error; } finally { await browser.close(); }
