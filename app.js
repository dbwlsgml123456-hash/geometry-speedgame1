const $ = id => document.getElementById(id);
const types = ['점', '변', '각'];
const state = { mode: 'intro', practice: 0, score: 0, correct: 0, wrong: 0, round: 0, order: [], deadline: 0, timer: null, pending: null, locked: false, selected: ['congruent'], practiceQuestions: [] };
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const rand = seeded(20261002);
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
function asymmetric(points) {
  const n=points.length;
  // Every nonidentity cyclic or reversed mapping must visibly change a distance.
  for (let reverse=0; reverse<2; reverse++) for(let shift=0;shift<n;shift++) {
    if (!reverse && !shift) continue;
    const map=i=>(shift+(reverse?-i:i)+n)%n;
    let delta=0;
    for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) delta=Math.max(delta,Math.abs(distance(points[i],points[j])-distance(points[map(i)],points[map(j)])));
    if(delta<12) return false;
  }
  return true;
}
function polygon(n) {
  for(let attempt=0;attempt<10000;attempt++) {
    const p=Array.from({length:n},(_,i)=>{const a=2*Math.PI*(i+(rand()-.5)*.38)/n; const r=70+rand()*26;return [Math.cos(a)*r,Math.sin(a)*r];});
    const convex=p.every((a,i)=>{const b=p[(i+1)%n],c=p[(i+2)%n];return (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])>50;});
    if(convex && asymmetric(p)) return p;
  }
  throw new Error('도형을 만들지 못했어요');
}
const bank=Array.from({length:50},(_,i)=>{const n=3+i%6;return {id:i,mode:"congruent",answer:null,points:polygon(n),type:i%3,target:Math.floor(rand()*n),rotation:Math.PI*(.2+rand()*1.6),reflect:i%2===0,labelOffset:Math.floor(rand()*n)};});
const modeNames = {congruent:'합동 도형',line:'선대칭도형',point:'점대칭도형'};
function symmetryQuestion(mode,i) {
  const m=2+i%3,n=2*m,rx=65+rand()*25,ry=72+rand()*22;
  const angles=Array.from({length:m},(_,k)=>-Math.PI/2+Math.PI*(k+1+(rand()-.5)*.36)/(m+1));
  const half=angles.map(a=>[rx*Math.cos(a),ry*Math.sin(a)]);
  const points=half.concat(mode==='line'?half.slice().reverse().map(([x,y])=>[-x,y]):half.map(([x,y])=>[-x,-y]));
  const type=i%3;
  const vertexMap=j=>mode==='line'?n-1-j:(j+m)%n;
  const mapping=Array.from({length:n},(_,j)=>type===1&&mode==='line'?(n-2-j+n)%n:vertexMap(j));
  const eligible=mapping.map((v,j)=>j).filter(j=>mapping[j]!==j);
  const target=eligible[Math.floor(rand()*eligible.length)];
  return {id:bank.length,mode,points,type,target,answer:mapping[target],mapping,rotation:i===0?0:rand()*Math.PI,reflect:false,labelOffset:Math.floor(rand()*n)};
}
for(const mode of ['line','point']) for(let i=0;i<50;i++) bank.push(symmetryQuestion(mode,i));
function transformed(q,right) {return q.points.map(([x,y])=>{if(q.mode==='congruent' && right && q.reflect)x=-x; const a=q.mode==='congruent'?(right?q.rotation:0):q.rotation; return [140+x*Math.cos(a)-y*Math.sin(a),140+x*Math.sin(a)+y*Math.cos(a)];});}
function selectedModes(){return [...document.querySelectorAll('[name="mission-mode"]:checked')].map(el=>el.value);}
function updateSelection(){const selected=selectedModes();$('mission-button').disabled=!selected.length;$('selection-note').textContent=selected.length?`선택한 유형에서 무작위로 출제돼요 · ${selected.length*50}문제`:'문제 유형을 하나 이상 선택해 주세요.';}
function buildPractice(){return types.map((_,type)=>{const mode=state.selected[type%state.selected.length];return bank.find(q=>q.mode===mode&&q.type===type);});}
function label(q,i){return (i+q.labelOffset)%q.points.length+1;}
// Keep each sector inside a disk smaller than half the nearest vertex distance.
// This leaves a gap even when short sides put neighboring angles close together.
function angleRadius(points,index) {
  return Math.min(25,...points.filter((_,j)=>j!==index).map(point=>distance(points[index],point)*0.34));
}
function svg(q,right) {
  const single=q.mode!=="congruent";
  const p=transformed(q,right),n=p.length;
  let html=`<svg viewBox="0 0 280 280" class="polygon-board" aria-label="${right?'답을 고르는':'빛나는 요소가 있는'} 도형"><polygon points="${p.map(v=>v.join(',')).join(' ')}" class="polygon-body"/>`;
  p.forEach(([x,y],i)=>{
    const next=p[(i+1)%n], prev=p[(i+n-1)%n],active=(!right||single)&&i===q.target;
    const attrs=right&&!(single&&i===q.target)?`data-answer="${i}" role="button" tabindex="0" aria-label="${label(q,i)}번 ${types[q.type]}"`:'';
    if(q.type===0)html+=`<circle cx="${x}" cy="${y}" r="${active?9:5}" class="vertex ${active?'highlight':''}" ${attrs}/>`;
    if(q.type===1)html+=`<line x1="${x}" y1="${y}" x2="${next[0]}" y2="${next[1]}" class="edge ${active?'highlight':''}"/><line x1="${x}" y1="${y}" x2="${next[0]}" y2="${next[1]}" class="edge-hit" ${attrs}/>`;
    if(q.type===2){const radius=angleRadius(p,i),lenA=distance(prev,[x,y]),lenB=distance(next,[x,y]);const a=[x+(prev[0]-x)*radius/lenA,y+(prev[1]-y)*radius/lenA],b=[x+(next[0]-x)*radius/lenB,y+(next[1]-y)*radius/lenB];const sweep=(a[0]-x)*(b[1]-y)-(a[1]-y)*(b[0]-x)>0?1:0;html+=`<path d="M${x},${y} L${a} A${radius},${radius} 0 0,${sweep} ${b} Z" class="angle ${active?'highlight':''}"/><circle cx="${x}" cy="${y}" r="18" class="angle-hit" ${attrs}/>`;}
    if(right&&!(single&&i===q.target)){let lx=x,ly=y;if(q.type===1){lx=(x+next[0])/2;ly=(y+next[1])/2;}const d=Math.hypot(lx-140,ly-140);lx+=(lx-140)/d*20;ly+=(ly-140)/d*20;html+=`<text x="${lx}" y="${ly}" class="shape-label">${label(q,i)}</text>`;}
  });
  if(single){const a=q.rotation;
    if(q.mode==='line'){const dx=-Math.sin(a)*120,dy=Math.cos(a)*120;html+=`<line x1="${140-dx}" y1="${140-dy}" x2="${140+dx}" y2="${140+dy}" class="symmetry-axis"/><text x="14" y="20" class="guide-label">점선: 대칭축</text>`;}
    else html+='<circle cx="140" cy="140" r="5" class="symmetry-center"/><path d="M130 140 H150 M140 130 V150" class="center-cross"/><text x="14" y="20" class="guide-label">＋: 대칭의 중심</text>';
  }
  return html+'</svg>';
}
function current(){return state.mode==='tutorial'?state.practiceQuestions[state.practice]:bank[state.order[state.round]];}
function render(container) {
  const q=current();
  const single=q.mode!=='congruent';
  const panels=single?`<div class="boards single-board"><div class="board-card answer-card"><p>${q.mode==='line'?'대칭축을 기준으로 반대쪽 짝을 찾아요':'대칭의 중심을 기준으로 180° 돌렸을 때의 짝을 찾아요'}</p>${svg(q,true)}</div></div>`:`<div class="boards"><div class="board-card"><p>빛나는 요소를 관찰해요</p>${svg(q,false)}</div><div class="board-card answer-card"><p>짝을 찾아 눌러요</p>${svg(q,true)}</div></div>`;
  container.innerHTML=`<h3 class="prompt"><small>${modeNames[q.mode]}</small>빛나는 ${types[q.type]}의 <span>대응${types[q.type]}</span>을 찾아요!</h3>${panels}<div class="choices" aria-label="답 선택">${q.points.map((_,i)=>({i,number:label(q,i)})).filter(v=>!single||v.i!==q.target).sort((a,b)=>a.number-b.number).map(v=>`<button data-answer="${v.i}" aria-label="${v.number}번 ${types[q.type]}">${v.number}</button>`).join('')}</div>`;
  container.querySelectorAll('[data-answer]').forEach(el=>{
    el.addEventListener('click',()=>answer(Number(el.dataset.answer)));
    if(el.tagName.toLowerCase()!=='button')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();answer(Number(el.dataset.answer));}});
  });
}
function disableAnswers(container){container.querySelectorAll('[data-answer]').forEach(el=>{el.setAttribute('aria-disabled','true');if(el.tagName==='BUTTON')el.disabled=true;el.setAttribute('tabindex','-1');});}
function clearJobs(){clearInterval(state.timer);clearTimeout(state.pending);state.timer=null;state.pending=null;}
function reset(mode){clearJobs();Object.assign(state,{mode,practice:0,score:0,correct:0,wrong:0,round:0,deadline:0,locked:false,order:[]});$('game-feedback').textContent='';$('practice-feedback').textContent='';}
function tutorial(){const selected=selectedModes();if(!selected.length)return;state.selected=selected;reset('tutorial');state.practiceQuestions=buildPractice();$('practice-progress').textContent='연습 1 / 3 · 시간과 점수는 기록하지 않아요.';$('start-button').disabled=true;$('start-button').textContent='연습 3문제를 먼저 풀어요';render($('practice-board'));$('mission-dialog').showModal();}
function answer(index){
  if(state.locked||!['tutorial','playing'].includes(state.mode))return;
  if(state.mode==='playing'&&performance.now()>=state.deadline){finish('60초가 끝났어요!');return;}
  const tutorialMode=state.mode==='tutorial',ok=index===(current().answer??current().target);
  const feedback=$(tutorialMode?'practice-feedback':'game-feedback');
  if(!ok){if(!tutorialMode){state.score-=5;state.wrong++;updateStats();}feedback.textContent=tutorialMode?'다시 관찰해 보세요. 빛나는 요소의 짝을 찾아요!':'아쉬워요! −5점 · 같은 문제에 다시 도전하세요.';feedback.className='feedback incorrect';state.locked=true;state.pending=setTimeout(()=>{state.locked=false;},450);return;}
  state.locked=true;disableAnswers($(tutorialMode?'practice-board':'game-board'));
  feedback.textContent=tutorialMode?'정답이에요! 다음 연습으로 출발!':'정답! +10점';feedback.className='feedback success';
  if(!tutorialMode){state.score+=10;state.correct++;updateStats();}
  state.pending=setTimeout(()=>{
    if(tutorialMode){state.practice++;if(state.practice===3){$('practice-progress').textContent='연습 3 / 3 완료 · 출발 준비 끝!';feedback.textContent='참 잘했어요! START를 누르면 60초 미션이 시작돼요.';$('start-button').disabled=false;$('start-button').textContent='START';return;} $('practice-progress').textContent=`연습 ${state.practice+1} / 3 · 시간과 점수는 기록하지 않아요.`;render($('practice-board'));}
    else {state.round++;if(state.round===state.order.length){finish(`${state.order.length}문제를 모두 해결했어요!`);return;}renderRound();}
    state.locked=false;
  },tutorialMode?650:240);
}
function shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function start(){reset('playing');if($('mission-dialog').open)$('mission-dialog').close();if($('result-dialog').open)$('result-dialog').close();document.querySelector('.universe').hidden=true;$('game-screen').hidden=false;state.order=shuffle(bank.filter(q=>state.selected.includes(q.mode)).map(q=>q.id));renderRound();state.deadline=performance.now()+60000;updateStats();tick();state.timer=setInterval(tick,100);}
function renderRound(){$('question-progress').textContent=`문제 ${state.round+1} / ${state.order.length} · 도형 안의 짝이나 아래 번호를 눌러요`;render($('game-board'));}
function updateStats(){$('score').textContent=state.score;$('correct').textContent=state.correct;}
function tick(){const remaining=Math.max(0,state.deadline-performance.now());$('time').textContent=Math.ceil(remaining/1000);$('time-bar').style.width=`${remaining/600}%`;$('time').classList.toggle('urgent',remaining<=10000);if(remaining===0)finish('60초가 끝났어요!');}
function finish(reason){if(state.mode!=='playing')return;clearJobs();state.mode='complete';state.locked=true;disableAnswers($('game-board'));$('result-reason').textContent=reason;$('result-score').textContent=`${state.score}점`;$('result-detail').textContent=`정답 ${state.correct}개 · 오답 ${state.wrong}회 · 정답 +10점 / 오답 −5점`;$('result-dialog').showModal();}
function home(){reset('intro');if($('result-dialog').open)$('result-dialog').close();if($('mission-dialog').open)$('mission-dialog').close();$('game-screen').hidden=true;document.querySelector('.universe').hidden=false;window.scrollTo(0,0);}
$('mission-button').addEventListener('click',tutorial);
$('start-button').addEventListener('click',()=>{if(state.mode==='tutorial'&&state.practice===3)start();});
$('mission-dialog').addEventListener('close',()=>{if(state.mode==='tutorial')reset('intro');});
$('result-dialog').addEventListener('cancel',e=>e.preventDefault());
$('restart-button').addEventListener('click',()=>{if(state.mode==='complete')start();});
$('home-button').addEventListener('click',home);
$('exit-button').addEventListener('click',home);

document.querySelectorAll('[name="mission-mode"]').forEach(el=>el.addEventListener('change',updateSelection));
updateSelection();
