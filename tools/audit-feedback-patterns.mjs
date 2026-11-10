// Regression for feedback-related click and measurement failures.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const home=process.env.HOME;
const {chromium}=createRequire(`${home}/.cache/livebook-tools/package.json`)('playwright-core');
const browser=await chromium.launch({executablePath:`${home}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,args:['--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const books=JSON.parse(readFileSync('src/content/books.json','utf8'));
const base=process.env.LB_URL||'http://127.0.0.1:5174/';
const offline=base.includes('offline.html');
const results=[],errors=[];
const out=`review/feedback-patterns/${offline?'offline':'online'}`;mkdirSync(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
const click=name=>page.getByRole('button',{name,exact:true}).click();
async function open(id){await page.context().setOffline(false);const book=Object.values(books).find(b=>b.spots.some(s=>s.lesson===id));await page.goto(`${base}?book=${book.id}#live=${id}`);await page.waitForFunction(()=>window.__lb?.live?.active?.inst?.debug);await page.getByText('不用了',{exact:true}).click({timeout:1500}).catch(()=>{});await page.getByText('不猜了',{exact:false}).click({timeout:3000}).catch(()=>{});await page.waitForTimeout(800);if(offline)await page.context().setOffline(true);}
async function tapPart(name){const xy=await page.evaluate(name=>{const C=__lb.live.active.inst.debug.C,p=C.get(name),v=p.group.localToWorld(p.group.position.clone().set(0,.006,.008)).project(__lb.stage.camera);return[(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]},name);await page.mouse.move(...xy);await page.mouse.down();await page.mouse.move(xy[0]+1,xy[1]+1);await page.mouse.up();}
try{
 for(const id of (offline ? ['ohm','measurer','bulbpower'] : ['seriesparallel','circuit','dimmer','rheostat','breath','ohm','bulbpower','resistance','measurer','voltmeter','currentlaw','ammeter','equivr','voltagelaw'])){
  await open(id);const switches=await page.evaluate(()=>[...__lb.live.active.inst.debug.C.parts.values()].filter(p=>p.kind==='switch').map(p=>({name:p.name,closed:p.closed})));
  for(const sw of switches){await tapPart(sw.name);const closed=await page.evaluate(name=>__lb.live.active.inst.debug.C.get(name).closed,sw.name);assert.equal(closed,!sw.closed,`${id} ${sw.name} jitter click`);}
  results.push({id,switches:switches.length,jitterPassed:switches.length>0});console.log('checked',id);
 }
 for(const [id,key,field] of [['electrolysis','power','on'],['combustion','lamp','lit']]){
  await open(id);const before=await page.evaluate(field=>__lb.live.active.inst.debug.S[field],field);
  const xy=await page.evaluate(key=>{const p=__lb.live.active.inst.debug.picks[key],v=p.getWorldPosition(p.position.clone()).project(__lb.stage.camera);return[(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]},key);
  await page.mouse.move(...xy);await page.mouse.down();await page.mouse.move(xy[0]+1,xy[1]+1);await page.mouse.up();
  const after=await page.evaluate(field=>__lb.live.active.inst.debug.S[field],field);assert.notEqual(after,before,`${id} real click`);results.push({id,jitterPassed:true});
 }
 await open('ohm');
 for(const v of [100,70,40,15,0]){await page.locator('input[type=range]').first().fill(String(v));await page.locator('input[type=range]').first().dispatchEvent('input');await click('记下这组数据');}
 assert.equal(await page.locator('table').first().locator('tbody tr').count(),5);
 await page.evaluate(()=>{const C=__lb.live.active.inst.debug.C;C.clearWires();C.solve()});await click('记下这组数据');
 assert.equal(await page.locator('table').first().locator('tbody tr').count(),5,'broken circuit must not add data');
 assert.match(await page.locator('body').innerText(),/电路连接不完整/);
 results.push({id:'ohm',validRows:5,brokenCircuitRejected:true});
 await open('ohm');await click('② 电压一定：I 与 R');
 for(const r of [5,10,15,20]){await click(`${r} Ω`);const slider=page.locator('input[type=range]').first();await slider.fill(String(Math.round((r*.5-.12)/20*100)));await slider.dispatchEvent('input');await click('记下这组数据');}
 assert.equal(await page.locator('table').nth(1).locator('tbody tr').count(),4);
 results.push({id:'ohm',constantVoltageRows:4});
 await open('measurer');await click('示范接法');await tapPart('S');await click('记下这组数据');
 // Disconnect while the reading question is open, via the same pointer handler and onChange as a user click.
 await page.evaluate(()=>{const inst=__lb.live.active.inst,p=inst.debug.C.get('S'),point=p.group.localToWorld(p.group.position.clone().set(0,.006,.008)).project(__lb.stage.camera),ray=__lb.live._ray(point);inst.pointer.down(ray,{clientX:1,clientY:1});inst.pointer.up(ray,{clientX:1,clientY:1,type:'pointerup'});});
 assert.equal(await page.getByRole('button',{name:/^\d+\.\d V$/}).count(),0,'stale voltage choices removed');
 assert.equal(await page.locator('table').first().locator('tbody tr').count(),0);
 results.push({id:'measurer',staleQuestionCancelled:true});
 assert.deepEqual(errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(e){await page.screenshot({path:`${out}/failure.png`});console.log('URL',page.url(),await page.locator('body').innerText());throw e;}finally{await browser.close()}
