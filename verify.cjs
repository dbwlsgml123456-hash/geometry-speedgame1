const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file:///'+path.resolve('index.html').replace(/\\/g,'/'));
const assert=(x,m)=>{if(!x)throw Error(m)};
const geometry=await page.evaluate(()=>{
const issues=[];
for(const q of bank){if(q.mode==='congruent'){if(!asymmetric(q.points))issues.push('ambiguous '+q.id);continue;}
const n=q.points.length;
const reflect=([x,y])=>q.mode==='line'?[-x,y]:[-x,-y];
const vertexMap=i=>q.mode==='line'?n-1-i:(i+n/2)%n;
for(let i=0;i<n;i++)if(distance(reflect(q.points[i]),q.points[vertexMap(i)])>1e-8)issues.push('symmetry '+q.id);
const a=q.target,b=q.answer;if(a===b)issues.push('self answer '+q.id);
if(q.type===1){const segment=[q.points[b],q.points[(b+1)%n]];if(!segment.some(v=>distance(v,reflect(q.points[a]))<1e-8)||!segment.some(v=>distance(v,reflect(q.points[(a+1)%n]))<1e-8))issues.push('edge '+q.id);}
else if(vertexMap(a)!==b)issues.push('point or angle '+q.id);
}
return {issues,counts:['congruent','line','point'].map(m=>bank.filter(q=>q.mode===m).length)};
});assert(!geometry.issues.length,JSON.stringify(geometry.issues));assert(geometry.counts.every(n=>n===50),'50 per type');console.log('PASS geometry: 150 questions, reflection, half-turn and edge mappings');
await page.locator('[value="congruent"]').uncheck();assert(await page.isDisabled('#mission-button'),'empty selection');
for(let mask=1;mask<8;mask++){
const modes=['congruent','line','point'].filter((m,i)=>mask&(1<<i));for(const mode of ['congruent','line','point'])await page.locator(`[value="${mode}"]`).setChecked(modes.includes(mode));await page.click('#mission-button');
assert(await page.isDisabled('#start-button'),'practice gate');assert(await page.evaluate(modes=>state.practiceQuestions.every(q=>modes.includes(q.mode)),modes),'practice filtering');
for(let i=0;i<3;i++){await page.evaluate(()=>answer(current().answer??current().target));await page.waitForTimeout(700);}
assert(await page.isEnabled('#start-button'),'practice complete');await page.click('#start-button');assert(await page.evaluate(modes=>state.order.length===modes.length*50&&state.order.every(id=>modes.includes(bank[id].mode))&&new Set(state.order).size===state.order.length,modes),'selected bank');
await page.evaluate(()=>answer((current().answer??current().target)+100));assert(await page.evaluate(()=>state.score===-5),'penalty');await page.waitForTimeout(470);await page.evaluate(()=>answer(current().answer??current().target));await page.waitForTimeout(270);assert(await page.evaluate(()=>state.score===5&&state.round===1),'correct');await page.evaluate(()=>{state.deadline=performance.now()-1;tick()});assert(await page.evaluate(()=>state.mode==='complete'),'timeout');await page.click('#restart-button');assert(await page.evaluate(modes=>state.order.length===modes.length*50&&state.score===0,modes),'restart');await page.click('#exit-button');console.log('PASS selection',modes.join('+'));
}
for(const [width,height] of [[1366,768],[1024,600],[800,600],[390,844],[360,800]]){
await page.setViewportSize({width,height});await page.locator('[value="congruent"]').uncheck();await page.locator('[value="line"]').check();await page.locator('[value="point"]').uncheck();await page.click('#mission-button');
for(const mode of ['congruent','line','point']){await page.evaluate(mode=>{state.practiceQuestions[0]=bank.find(q=>q.mode===mode&&q.type===2);render(document.getElementById('practice-board'));},mode);
const bounds=await page.locator('#practice-board').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height,'board fit '+mode);const startBounds=await page.locator('#start-button').boundingBox();assert(startBounds.y+startBounds.height<=height,'START visible '+mode);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');}
await page.evaluate(()=>{state.practice=3;start();});await page.evaluate(()=>{state.round=state.order.length-1;renderRound();answer(current().answer??current().target);answer(current().answer??current().target)});await page.waitForTimeout(270);assert(await page.evaluate(()=>state.mode==='complete'&&state.correct===1),'last question');await page.click('#home-button');console.log('PASS layout',width,height);
}
assert(!errors.length,errors.join(';'));await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'selection-preview.png'});await page.click('#mission-button');await page.evaluate(()=>{state.practiceQuestions[0]=bank.find(q=>q.mode==='line'&&q.type===2);render(document.getElementById('practice-board'))});await page.screenshot({path:'symmetry-preview.png'});console.log('PASS no browser errors');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
