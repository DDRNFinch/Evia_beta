(()=>{
"use strict";

const HISTORY_KEY="evia-arp-practical-v1";
const DRAFT_KEY="evia-arp-practical-draft-v1";
const MEDIA_DB="evia-arp-practical-media-v1";
const MEDIA_STORE="media";
const RATING_LABELS={1:"Building",2:"Developing",3:"Secure",4:"Strong"};
let session=null;
let voice=null;
let timerHandle=null;
let patchQueued=false;
const objectUrls=new Set();

function esc(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))
}

function body(){return document.querySelector(".evia-arp-layer .evia-tools-body")}
function shuffled(items){
  const output=[...items];
  for(let index=output.length-1;index>0;index--){
    const pick=Math.floor(Math.random()*(index+1));
    [output[index],output[pick]]=[output[pick],output[index]]
  }
  return output
}
function uid(prefix="EVIA-P"){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function formatDate(value){
  try{return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}catch{return ""}
}
function minutesLabel(minutes){
  const value=Number(minutes)||0;
  if(value>=60&&value%60===0)return `${value/60} hour${value===60?"":"s"}`;
  if(value>=60)return `${Math.floor(value/60)}h ${value%60}m`;
  return `${value} mins`
}

function readiness(percent){
  if(percent>=85)return {label:"Strong",copy:"You completed this rehearsal with strong preparation, checks and practical explanations."};
  if(percent>=70)return {label:"Secure",copy:"This rehearsal is secure. Repeat the weakest area under mock conditions."};
  if(percent>=50)return {label:"Developing",copy:"You are developing well. Use the breakdown to target the next rehearsal."};
  return {label:"Building",copy:"Build confidence one stage at a time, beginning with the weakest area below."}
}

function history(){
  try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||"{}");return value&&typeof value==="object"?value:{}}catch{return{}}
}
function courseHistory(id){
  const value=history()[id];
  return value&&typeof value==="object"?value:{attempts:[],bestPercent:0}
}
function draft(){
  try{const value=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");return value&&typeof value==="object"?value:null}catch{return null}
}
function serialisableSession(){
  if(!session)return null;
  return {
    enrolmentId:session.bank?.enrolmentId,
    taskId:session.task?.id,
    mode:session.mode,
    stage:session.stage||"brief",
    startedAt:session.startedAt||null,
    durationSeconds:session.durationSeconds||null,
    safetyChecked:[...(session.safetyChecked||[])],
    performedSteps:[...(session.performedSteps||[])],
    evidence:(session.evidence||[]).map(item=>item?{mediaId:item.mediaId||null,name:item.name||"",type:item.type||"",noMedia:!!item.noMedia}:null),
    checks:session.checks||[],
    questionCovered:session.questionCovered||[],
    transcript:session.transcript||"",
    voiceMediaId:session.voiceMediaId||null,
    ratings:session.ratings||{},
    verification:session.verification||"self",
    verifier:session.verifier||"",
    methodErrors:Number(session.methodErrors||0),
    decisionCorrect:session.decisionCorrect,
    learnChecks:[...(session.learnChecks||[])],
    learnOrder:[...(session.learnOrder||[])],
  }
}
function saveDraft(){
  const value=serialisableSession();
  if(!value)return;
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(value))}catch{}
}
function clearDraft(){try{localStorage.removeItem(DRAFT_KEY)}catch{}}

function openMediaDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(Error("Media storage is unavailable."));return}
    const request=indexedDB.open(MEDIA_DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(MEDIA_STORE))db.createObjectStore(MEDIA_STORE,{keyPath:"id"})
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||Error("Media storage could not open."))
  })
}
async function putMedia(blob,name,id=uid("EVIA-P-MEDIA")){
  const db=await openMediaDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readwrite");
    tx.objectStore(MEDIA_STORE).put({id,blob,name,type:blob.type||"application/octet-stream",savedAt:Date.now()});
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||Error("Media could not be saved."))
  });
  db.close();
  return id
}
async function getMedia(id){
  if(!id)return null;
  const db=await openMediaDb();
  const value=await new Promise((resolve,reject)=>{
    const request=db.transaction(MEDIA_STORE,"readonly").objectStore(MEDIA_STORE).get(id);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error||Error("Media could not be read."))
  });
  db.close();
  return value
}
async function deleteMedia(id){
  if(!id)return;
  try{
    const db=await openMediaDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(MEDIA_STORE,"readwrite");
      tx.objectStore(MEDIA_STORE).delete(id);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error)
    });
    db.close()
  }catch{}
}
function makeObjectUrl(blob){const url=URL.createObjectURL(blob);objectUrls.add(url);return url}
function releaseObjectUrls(){for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls.clear()}

function stopTimer(){if(timerHandle)clearInterval(timerHandle);timerHandle=null}
function formatClock(seconds){
  const total=Math.max(0,Math.floor(seconds));
  const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),secs=total%60;
  return hours?`${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`:`${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`
}
function timerMarkup(){
  if(session?.mode!=="mock"||!session.startedAt)return "";
  return '<div class="evia-practical-timer"><span>Mock time remaining</span><b data-practical-clock>--:--</b></div>'
}
function startTimer(){
  stopTimer();
  if(session?.mode!=="mock"||!session.startedAt)return;
  const update=()=>{
    const node=document.querySelector("[data-practical-clock]");
    if(!node)return;
    const remaining=Number(session.durationSeconds||0)-Math.floor((Date.now()-session.startedAt)/1000);
    node.textContent=remaining>=0?formatClock(remaining):`+${formatClock(Math.abs(remaining))}`;
    node.closest(".evia-practical-timer")?.classList.toggle("is-over",remaining<0)
  };
  update();timerHandle=setInterval(update,1000)
}

function stopVoice(){
  if(!voice)return;
  try{voice.recognition?.stop?.()}catch{}
  try{if(voice.recorder?.state&&voice.recorder.state!=="inactive")voice.recorder.stop()}catch{}
  try{voice.stream?.getTracks?.().forEach(track=>track.stop())}catch{}
  voice=null
}
function releaseSessionMedia(){stopVoice();stopTimer();releaseObjectUrls()}

function queuePatch(){
  if(patchQueued)return;
  patchQueued=true;
  setTimeout(()=>{patchQueued=false;patchPracticalRow()},0)
}
function patchPracticalRow(){
  const button=document.querySelector('.evia-arp-layer [data-arp-option="practical"]');
  if(!button)return;
  const small=button.querySelector("small");
  const copy="12 course-specific tasks · learn, rehearse or mock";
  if(small&&small.textContent!==copy)small.textContent=copy;
  button.setAttribute("aria-label","Open Practical Coach")
}

async function currentPracticalBank(){
  const questionBank=await window.EviaArp?.currentBank?.();
  if(!questionBank?.enrolmentId)throw Error("The ARP course is not ready.");
  const registry=await window.EviaCourseRegistry?.registry?.();
  const entry=registry?.courses?.find(item=>String(item.enrolmentId).toUpperCase()===String(questionBank.enrolmentId).toUpperCase());
  if(!entry?.practicalBankPath)throw Error("The practical task bank is not available for this course yet.");
  const registryUrl=new URL("./course-delivery/registry-v1.json",document.baseURI);
  const url=new URL(String(entry.practicalBankPath),registryUrl);
  const response=await fetch(url.href,{cache:"no-store"});
  if(!response.ok)throw Error(`The practical task bank could not be loaded (${response.status}).`);
  const bank=await response.json();
  if(bank?.eviaPracticalBank!==1||String(bank.enrolmentId)!==String(questionBank.enrolmentId)||!Array.isArray(bank.tasks)||bank.tasks.length!==12)throw Error("This course's practical bank is invalid.");
  return bank
}

function returnToArp(){
  releaseSessionMedia();session=null;
  window.EviaArp?.open?.();setTimeout(patchPracticalRow,0)
}
function modeName(mode){return mode==="learn"?"Learn the Task":mode==="guided"?"Guided Rehearsal":"Mock Practical"}
function stageHeader(label){
  return timerMarkup()+'<div class="evia-arp-meta"><span>'+esc(modeName(session?.mode))+' · '+esc(label)+'</span><span>'+esc(session?.bank?.courseTitle||"")+'</span></div>'
}
function mapsMarkup(task){return '<div class="evia-practical-tags">'+(task.mapsTo||[]).map(code=>'<span>'+esc(code)+'</span>').join("")+'</div>'}

async function renderPracticalHome(){
  releaseSessionMedia();session=null;
  const target=body();if(!target)return;
  target.innerHTML='<div class="evia-arp-loading">Loading this course’s practical tasks…</div>';
  try{
    const bank=await currentPracticalBank(),record=courseHistory(bank.enrolmentId),active=draft();
    const resume=active?.enrolmentId===bank.enrolmentId&&bank.tasks.some(task=>task.id===active.taskId);
    target.innerHTML=
      '<p class="evia-tools-kicker">ARP · Practical</p><h2>Practical Coach</h2>'+ 
      '<p class="evia-tools-copy">Plan, perform, check and explain one real trade task at a time.</p>'+ 
      '<div class="evia-arp-summary"><b>'+esc(bank.courseTitle)+'</b><span>12 course-specific tasks · '+(record.attempts?.length?record.attempts.length+' completed · best '+Number(record.bestPercent||0)+'%':'no completed rehearsals yet')+'</span></div>'+ 
      (resume?'<div class="evia-practical-resume"><b>Continue '+esc(bank.tasks.find(task=>task.id===active.taskId)?.title||"practical")+'</b><span>'+esc(modeName(active.mode))+' · saved on this device</span><div><button type="button" data-practical-resume>Continue</button><button type="button" class="secondary" data-practical-discard>Discard</button></div></div>':'')+
      '<div class="evia-arp-modes">'+
        '<button type="button" class="evia-arp-mode" data-practical-mode="learn"><b>Learn the Task</b><small>Prepare digitally, order the work, solve a fault and learn the essential checks.</small><i>›</i></button>'+ 
        '<button type="button" class="evia-arp-mode" data-practical-mode="guided"><b>Guided Rehearsal</b><small>Complete real work with stage prompts, evidence checkpoints and practical questions.</small><i>›</i></button>'+ 
        '<button type="button" class="evia-arp-mode" data-practical-mode="mock"><b>Mock Practical</b><small>Use a timed brief with no method hints, then self-check and explain your work.</small><i>›</i></button>'+ 
      '</div>'+ 
      (record.attempts?.length?'<button type="button" class="evia-arp-secondary" data-practical-history>Practice history</button>':'')+
      '<p class="evia-arp-disclaimer">Evia scores preparation, sequencing, recorded checks and practical answers. Finished workmanship remains self-checked or tutor verified.</p>'+ 
      '<button type="button" class="evia-arp-secondary" data-practical-back>Back to ARP</button>';
    target.querySelectorAll("[data-practical-mode]").forEach(button=>button.addEventListener("click",()=>renderTaskPicker(bank,button.dataset.practicalMode)));
    target.querySelector("[data-practical-back]")?.addEventListener("click",returnToArp);
    target.querySelector("[data-practical-history]")?.addEventListener("click",()=>renderHistory(bank));
    target.querySelector("[data-practical-resume]")?.addEventListener("click",()=>resumeDraft(bank,active));
    target.querySelector("[data-practical-discard]")?.addEventListener("click",async()=>{
      if(!confirm("Discard this saved practical rehearsal?"))return;
      for(const item of active.evidence||[])await deleteMedia(item?.mediaId);
      await deleteMedia(active.voiceMediaId);clearDraft();renderPracticalHome()
    })
  }catch(error){
    target.innerHTML='<p class="evia-tools-kicker">ARP · Practical</p><h2>Practical bank unavailable</h2><p class="evia-tools-copy">'+esc(error?.message||error)+'</p><button type="button" class="evia-arp-secondary" data-practical-back>Back to ARP</button>';
    target.querySelector("[data-practical-back]")?.addEventListener("click",returnToArp)
  }
}

function renderTaskPicker(bank,mode){
  releaseSessionMedia();session=null;
  const target=body();if(!target)return;
  target.innerHTML=
    '<p class="evia-tools-kicker">'+esc(modeName(mode))+'</p><h2>Choose one task</h2>'+ 
    '<p class="evia-tools-copy">Each session uses one complete '+esc(bank.courseTitle)+' task.</p>'+ 
    '<button type="button" class="evia-tools-primary" data-practical-random>Choose for me</button>'+ 
    '<div class="evia-practical-task-list">'+bank.tasks.map(task=>
      '<button type="button" class="evia-practical-task" data-practical-task="'+esc(task.id)+'"><span><small>'+esc(task.category)+'</small><b>'+esc(task.title)+'</b><em>'+esc(minutesLabel(task.timing.shortMinutes))+' short practice</em></span><i>›</i></button>'
    ).join("")+'</div>'+ 
    '<button type="button" class="evia-arp-secondary" data-practical-home>Back to Practical Coach</button>';
  const choose=task=>selectTask(bank,mode,task);
  target.querySelector("[data-practical-random]")?.addEventListener("click",()=>choose(shuffled(bank.tasks)[0]));
  target.querySelectorAll("[data-practical-task]").forEach(button=>button.addEventListener("click",()=>choose(bank.tasks.find(task=>task.id===button.dataset.practicalTask))));
  target.querySelector("[data-practical-home]")?.addEventListener("click",renderPracticalHome)
}

function selectTask(bank,mode,task){
  if(!task)return;
  releaseSessionMedia();
  session={bank,task,mode,stage:"brief",safetyChecked:[],performedSteps:[],evidence:task.evidenceCheckpoints.map(()=>null),checks:task.checks.map(()=>({value:"",within:false})),questionCovered:task.questions.map(()=>false),transcript:"",ratings:{},verification:"self",verifier:"",methodErrors:0,learnChecks:[],learnOrder:[]};
  saveDraft();
  if(mode==="mock")renderTimingChoice();else renderTaskBrief()
}

function renderTimingChoice(){
  const target=body();if(!target||!session)return;
  const task=session.task;
  target.innerHTML=
    '<p class="evia-tools-kicker">Mock Practical</p><h2>Choose the timing</h2>'+ 
    '<p class="evia-tools-copy">The brief and scoring stay the same. The timer begins after you read the brief and press Begin.</p>'+ 
    '<div class="evia-practical-time-options">'+
      '<button type="button" data-practical-time="short"><b>Short practice</b><span>'+esc(minutesLabel(task.timing.shortMinutes))+'</span><small>For workshop practice or a focused component.</small></button>'+ 
      '<button type="button" data-practical-time="full"><b>Full mock</b><span>'+esc(minutesLabel(task.timing.fullMinutes))+'</span><small>'+(session.bank.courseType==="apprenticeship"?'Long-form assessment rehearsal.':'Suggested extended workplace rehearsal.')+'</small></button>'+ 
    '</div>'+ 
    '<button type="button" class="evia-arp-secondary" data-practical-tasks>Back to tasks</button>';
  target.querySelectorAll("[data-practical-time]").forEach(button=>button.addEventListener("click",()=>{
    session.durationSeconds=Number(button.dataset.practicalTime==="full"?task.timing.fullMinutes:task.timing.shortMinutes)*60;
    saveDraft();renderTaskBrief()
  }));
  target.querySelector("[data-practical-tasks]")?.addEventListener("click",()=>renderTaskPicker(session.bank,session.mode))
}

function renderTaskBrief(){
  const target=body();if(!target||!session)return;
  session.stage="brief";saveDraft();
  const {task,bank,mode}=session;
  const timing=mode==="mock"?(Number(session.durationSeconds)/60):task.timing.shortMinutes;
  target.innerHTML=
    '<p class="evia-tools-kicker">'+esc(modeName(mode))+'</p><h2>'+esc(task.title)+'</h2>'+ 
    '<div class="evia-practical-brief"><span>'+esc(task.category)+' · '+esc(minutesLabel(timing))+'</span><p>'+esc(task.brief)+'</p>'+mapsMarkup(task)+'</div>'+ 
    (mode==="mock"?'':'<div class="evia-practical-info"><b>Resources</b><ul>'+task.resources.map(item=>'<li>'+esc(item)+'</li>').join("")+'</ul></div>')+
    '<p class="evia-practical-context">'+esc(bank.assessmentContext)+'</p>'+ 
    '<button type="button" class="evia-tools-primary" data-practical-begin>Begin '+esc(modeName(mode))+'</button>'+ 
    '<button type="button" class="evia-arp-secondary" data-practical-tasks>Back to tasks</button>';
  target.querySelector("[data-practical-begin]")?.addEventListener("click",()=>{
    if(mode==="mock"&&!session.startedAt)session.startedAt=Date.now();
    saveDraft();
    if(mode==="learn")renderLearnPrepare();else renderSafetyGate()
  });
  target.querySelector("[data-practical-tasks]")?.addEventListener("click",()=>renderTaskPicker(bank,mode))
}

function renderLearnPrepare(){
  const target=body();if(!target||!session)return;
  session.stage="learn-prepare";saveDraft();
  const items=[...session.task.safetyControls,...session.task.resources.slice(0,4)];
  target.innerHTML=stageHeader("Prepare")+'<h2>Prepare the task</h2><p class="evia-tools-copy">Check each item as you work through the correct setup.</p>'+ 
    '<div class="evia-practical-checklist">'+items.map((item,index)=>'<label><input type="checkbox" data-learn-prepare="'+index+'"><span>'+esc(item)+'</span></label>').join("")+'</div>'+ 
    '<button type="button" class="evia-tools-primary" data-learn-plan disabled>Plan the work</button>';
  const boxes=[...target.querySelectorAll("[data-learn-prepare]")],next=target.querySelector("[data-learn-plan]");
  boxes.forEach(box=>box.addEventListener("change",()=>{next.disabled=!boxes.every(item=>item.checked)}));
  next?.addEventListener("click",renderLearnSequence);startTimer()
}

function renderLearnSequence(){
  const target=body();if(!target||!session)return;
  session.stage="learn-sequence";saveDraft();
  session.learnOrder=[];
  const options=shuffled(session.task.sequence);
  target.innerHTML=stageHeader("Plan")+'<h2>Put the work in order</h2><p class="evia-tools-copy">Tap the stage that should happen next.</p>'+ 
    '<div class="evia-practical-order" data-practical-order>'+options.map(step=>'<button type="button" data-order-step="'+esc(step.id)+'"><i></i><span>'+esc(step.title)+'</span></button>').join("")+'</div>'+ 
    '<p class="evia-practical-status" data-order-status aria-live="polite"></p>'+ 
    '<button type="button" class="evia-tools-primary" data-order-next disabled>Check a site fault</button>';
  const status=target.querySelector("[data-order-status]"),next=target.querySelector("[data-order-next]");
  target.querySelectorAll("[data-order-step]").forEach(button=>button.addEventListener("click",()=>{
    const expected=session.task.sequence[session.learnOrder.length];
    if(button.dataset.orderStep!==expected.id){session.methodErrors+=1;status.textContent="That stage comes later. Check what must be completed first.";button.classList.add("is-wrong");setTimeout(()=>button.classList.remove("is-wrong"),500);return}
    session.learnOrder.push(expected.id);button.disabled=true;button.classList.add("is-done");button.querySelector("i").textContent=String(session.learnOrder.length);status.textContent=session.learnOrder.length===session.task.sequence.length?"Correct sequence.":"Good. Choose the next stage.";next.disabled=session.learnOrder.length!==session.task.sequence.length;saveDraft()
  }));
  next?.addEventListener("click",renderLearnDecision);startTimer()
}

function renderLearnDecision(){
  const target=body();if(!target||!session)return;
  session.stage="learn-decision";saveDraft();
  const decision=session.task.decision;
  const options=shuffled(decision.options.map((text,index)=>({text,index})));
  target.innerHTML=stageHeader("Check")+'<p class="evia-arp-topic">Fault decision</p><h2 class="evia-arp-question">'+esc(decision.prompt)+'</h2>'+ 
    '<div class="evia-arp-options">'+options.map(option=>'<button type="button" class="evia-arp-answer" data-decision="'+option.index+'">'+esc(option.text)+'</button>').join("")+'</div><div data-decision-feedback></div>';
  target.querySelectorAll("[data-decision]").forEach(button=>button.addEventListener("click",()=>{
    if(session.decisionCorrect!==undefined)return;
    const chosen=Number(button.dataset.decision),correct=Number(decision.correctIndex);
    session.decisionCorrect=chosen===correct;
    if(!session.decisionCorrect)session.methodErrors+=1;
    target.querySelectorAll("[data-decision]").forEach(item=>{item.disabled=true;if(Number(item.dataset.decision)===correct)item.classList.add("is-correct");else if(item===button)item.classList.add("is-wrong")});
    target.querySelector("[data-decision-feedback]").innerHTML='<div class="evia-arp-feedback"><b>'+(session.decisionCorrect?'Correct':'Not quite')+'</b>'+esc(decision.feedback)+'</div><button type="button" class="evia-tools-primary" data-decision-next>Learn the checks</button>';
    target.querySelector("[data-decision-next]")?.addEventListener("click",renderLearnChecks);saveDraft()
  }));startTimer()
}

function renderLearnChecks(){
  const target=body();if(!target||!session)return;
  session.stage="learn-checks";saveDraft();
  target.innerHTML=stageHeader("Prove")+'<h2>Essential quality checks</h2><p class="evia-tools-copy">These are the checks you should be ready to demonstrate and explain.</p>'+ 
    '<div class="evia-practical-learn-checks">'+session.task.checks.map((item,index)=>'<label><input type="checkbox" data-learn-check="'+index+'" '+(session.learnChecks[index]?'checked':'')+'><span><b>'+esc(item.label)+'</b><small>'+esc(item.target)+'</small></span></label>').join("")+'</div>'+ 
    '<div class="evia-practical-faults"><b>Common faults to watch for</b><ul>'+session.task.commonFaults.map(fault=>'<li>'+esc(fault)+'</li>').join("")+'</ul></div>'+ 
    '<button type="button" class="evia-tools-primary" data-learn-explain disabled>Practise the questions</button>';
  const boxes=[...target.querySelectorAll("[data-learn-check]")],next=target.querySelector("[data-learn-explain]");
  next.disabled=!boxes.every(item=>item.checked);
  boxes.forEach(box=>box.addEventListener("change",()=>{session.learnChecks=boxes.map(item=>item.checked);next.disabled=!boxes.every(item=>item.checked);saveDraft()}));
  next?.addEventListener("click",renderLearnExplain);startTimer()
}

function renderLearnExplain(){
  const target=body();if(!target||!session)return;
  session.stage="learn-explain";saveDraft();
  target.innerHTML=stageHeader("Explain")+'<h2>Practical questions</h2><p class="evia-tools-copy">Say each answer aloud, then compare it with the strong-answer guide.</p>'+ 
    '<div class="evia-practical-questions">'+session.task.questions.map((question,index)=>'<details><summary><i>'+String(index+1)+'</i><span>'+esc(question.prompt)+'</span></summary><p><b>Strong answer guide</b>'+esc(question.guide)+'</p></details>').join("")+'</div>'+ 
    voiceCardMarkup("Optional voice practice",false)+
    '<button type="button" class="evia-tools-primary" data-learn-finish>Finish learning task</button>';
  bindVoiceControls();
  target.querySelector("[data-learn-finish]")?.addEventListener("click",finishLearn);startTimer()
}

async function finishLearn(){
  if(!session)return;
  const method=Math.max(8,20-Math.min(12,session.methodErrors*4));
  const accuracy=session.decisionCorrect===false?22:30;
  const questions=(session.voiceMediaId||String(session.transcript||"").trim().length>=10)?10:5;
  const breakdown=[{id:"safety",label:"Safety and preparation",score:20,weight:20},{id:"method",label:"Method and sequence",score:method,weight:20},{id:"accuracy",label:"Measurements and checks",score:accuracy,weight:30},{id:"finish",label:"Finished work",score:20,weight:20},{id:"questions",label:"Practical questions",score:questions,weight:10}];
  await completeAttempt(breakdown)
}

function renderSafetyGate(){
  const target=body();if(!target||!session)return;
  session.stage="safety";saveDraft();
  target.innerHTML=stageHeader("Prepare")+'<h2>Safety gate</h2><p class="evia-tools-copy">Confirm each control before beginning practical work.</p>'+ 
    '<div class="evia-practical-checklist">'+session.task.safetyControls.map((item,index)=>'<label><input type="checkbox" data-safety="'+index+'" '+(session.safetyChecked.includes(index)?'checked':'')+'><span>'+esc(item)+'</span></label>').join("")+'</div>'+ 
    (session.mode==="guided"?'<div class="evia-practical-info"><b>Resources</b><ul>'+session.task.resources.map(item=>'<li>'+esc(item)+'</li>').join("")+'</ul></div>':'')+
    '<button type="button" class="evia-tools-primary" data-safety-next '+(session.safetyChecked.length===session.task.safetyControls.length?'':'disabled')+'>'+(session.mode==="mock"?'Start independent task':'Open work stages')+'</button>';
  const boxes=[...target.querySelectorAll("[data-safety]")],next=target.querySelector("[data-safety-next]");
  boxes.forEach(box=>box.addEventListener("change",()=>{session.safetyChecked=boxes.filter(item=>item.checked).map(item=>Number(item.dataset.safety));next.disabled=session.safetyChecked.length!==boxes.length;saveDraft()}));
  next?.addEventListener("click",renderPerform);startTimer()
}

function renderPerform(){
  const target=body();if(!target||!session)return;
  session.stage="perform";saveDraft();
  const guided=session.mode==="guided";
  target.innerHTML=stageHeader("Perform")+'<h2>'+(guided?'Complete the work stages':'Complete the task independently')+'</h2>'+ 
    '<div class="evia-practical-brief compact"><p>'+esc(session.task.brief)+'</p></div>'+ 
    (guided?'<div class="evia-practical-stage-list">'+session.task.sequence.map((step,index)=>'<label><input type="checkbox" data-perform-step="'+index+'" '+(session.performedSteps.includes(index)?'checked':'')+'><span><i>'+String(index+1)+'</i><b>'+esc(step.title)+'</b></span></label>').join("")+'</div>':'<div class="evia-practical-independent"><b>No method hints are shown in Mock Practical.</b><p>Work from the task brief and your course knowledge. Move on when the practical work is ready for evidence and checks.</p></div>')+
    '<button type="button" class="evia-tools-primary" data-perform-next '+(guided&&session.performedSteps.length!==session.task.sequence.length?'disabled':'')+'>Record evidence checkpoints</button>';
  const boxes=[...target.querySelectorAll("[data-perform-step]")],next=target.querySelector("[data-perform-next]");
  boxes.forEach(box=>box.addEventListener("change",()=>{session.performedSteps=boxes.filter(item=>item.checked).map(item=>Number(item.dataset.performStep));next.disabled=session.performedSteps.length!==boxes.length;saveDraft()}));
  next?.addEventListener("click",renderEvidence);startTimer()
}

function evidenceComplete(item){return !!(item?.mediaId||item?.noMedia)}
async function renderEvidence(){
  const target=body();if(!target||!session)return;
  session.stage="evidence";saveDraft();releaseObjectUrls();
  target.innerHTML=stageHeader("Prove")+'<h2>Evidence checkpoints</h2><p class="evia-tools-copy">Use the camera, video or gallery. If site rules prevent media, complete the checkpoint without media.</p>'+ 
    '<div class="evia-practical-evidence">'+session.task.evidenceCheckpoints.map((point,index)=>{
      const item=session.evidence[index];
      return '<article data-evidence-card="'+index+'"><span class="number">'+String(index+1)+'</span><div><b>'+esc(point.title)+'</b><p>'+esc(point.prompt)+'</p><label class="evia-practical-upload"><input type="file" accept="'+esc(point.accept)+'" data-evidence-file="'+index+'"><span>'+(item?.mediaId?'Replace media':'Camera / gallery')+'</span></label><label class="evia-practical-no-media"><input type="checkbox" data-evidence-no-media="'+index+'" '+(item?.noMedia?'checked':'')+'><span>Checkpoint completed without media</span></label><div class="evia-practical-preview" data-evidence-preview="'+index+'">'+(item?.mediaId?'<small>'+esc(item.name||"Evidence saved on this device")+'</small>':'')+'</div></div></article>'
    }).join("")+'</div>'+ 
    '<p class="evia-practical-status" data-evidence-status aria-live="polite"></p>'+ 
    '<button type="button" class="evia-tools-primary" data-evidence-next '+(session.evidence.every(evidenceComplete)?'':'disabled')+'>Enter quality checks</button>';
  const next=target.querySelector("[data-evidence-next]"),status=target.querySelector("[data-evidence-status]");
  const update=()=>{next.disabled=!session.evidence.every(evidenceComplete);saveDraft()};
  target.querySelectorAll("[data-evidence-no-media]").forEach(box=>box.addEventListener("change",async()=>{
    const index=Number(box.dataset.evidenceNoMedia),before=session.evidence[index]||{};
    if(box.checked&&before.mediaId){await deleteMedia(before.mediaId);session.evidence[index]={mediaId:null,name:"",type:"",noMedia:true};target.querySelector(`[data-evidence-preview="${index}"]`).innerHTML=""}
    else session.evidence[index]={...before,noMedia:box.checked};
    update()
  }));
  target.querySelectorAll("[data-evidence-file]").forEach(input=>input.addEventListener("change",async()=>{
    const index=Number(input.dataset.evidenceFile),file=input.files?.[0];input.value="";if(!file)return;
    status.textContent="Saving checkpoint on this device…";
    try{
      const before=session.evidence[index];if(before?.mediaId)await deleteMedia(before.mediaId);
      const mediaId=await putMedia(file,file.name||`checkpoint-${index+1}`);
      session.evidence[index]={mediaId,name:file.name||`Checkpoint ${index+1}`,type:file.type,noMedia:false};
      target.querySelector(`[data-evidence-no-media="${index}"]`).checked=false;
      const preview=target.querySelector(`[data-evidence-preview="${index}"]`),url=makeObjectUrl(file);
      preview.innerHTML=file.type.startsWith("video/")?'<video controls playsinline src="'+esc(url)+'"></video>':'<img alt="Evidence checkpoint preview" src="'+esc(url)+'">';
      status.textContent="Checkpoint saved.";update()
    }catch{status.textContent="This media could not be saved. You can use the no-media checkpoint option."}
  }));
  next?.addEventListener("click",renderChecks);startTimer();
  for(let index=0;index<session.evidence.length;index++){
    const item=session.evidence[index];if(!item?.mediaId)continue;
    getMedia(item.mediaId).then(media=>{
      if(!media?.blob)return;const preview=document.querySelector(`[data-evidence-preview="${index}"]`);if(!preview)return;
      const url=makeObjectUrl(media.blob);preview.innerHTML=String(media.type).startsWith("video/")?'<video controls playsinline src="'+esc(url)+'"></video>':'<img alt="Evidence checkpoint preview" src="'+esc(url)+'">'
    }).catch(()=>{})
  }
}

function renderChecks(){
  const target=body();if(!target||!session)return;
  session.stage="checks";saveDraft();
  target.innerHTML=stageHeader("Check")+'<h2>Record actual checks</h2><p class="evia-tools-copy">Enter what you measured or observed. Evia does not invent a result from the photos.</p>'+ 
    '<div class="evia-practical-measures">'+session.task.checks.map((item,index)=>{
      const result=session.checks[index]||{value:"",within:false};
      return '<article><b>'+esc(item.label)+'</b><small>Target: '+esc(item.target)+'</small><input type="text" inputmode="text" placeholder="Actual measurement or result" value="'+esc(result.value)+'" data-check-value="'+index+'"><label><input type="checkbox" data-check-within="'+index+'" '+(result.within?'checked':'')+'><span>Within the task specification</span></label></article>'
    }).join("")+'</div>'+ 
    '<button type="button" class="evia-tools-primary" data-checks-next '+(session.checks.every(item=>String(item.value||"").trim())?'':'disabled')+'>Answer practical questions</button>';
  const next=target.querySelector("[data-checks-next]");
  const update=()=>{session.checks=session.task.checks.map((_,index)=>({value:target.querySelector(`[data-check-value="${index}"]`).value.trim(),within:target.querySelector(`[data-check-within="${index}"]`).checked}));next.disabled=!session.checks.every(item=>item.value);saveDraft()};
  target.querySelectorAll("[data-check-value],[data-check-within]").forEach(input=>input.addEventListener("input",update));
  target.querySelectorAll("[data-check-within]").forEach(input=>input.addEventListener("change",update));
  next?.addEventListener("click",renderQuestions);startTimer()
}

function voiceCardMarkup(title,requireCoverage=true){
  return '<div class="evia-practical-voice"><b>'+esc(title)+'</b><p>Record one answer covering the three questions, or type notes if the microphone is unavailable.</p><div class="evia-arp-voice-controls"><button type="button" data-practical-record>Record answer</button><button type="button" class="secondary" data-practical-stop disabled>Stop</button></div><p class="evia-arp-voice-status" data-practical-voice-status></p><textarea rows="5" data-practical-transcript placeholder="Your transcript or typed answer">'+esc(session?.transcript||"")+'</textarea>'+(session?.voiceMediaId?'<small class="evia-practical-audio-saved">Audio saved on this device</small>':'')+(requireCoverage?'':'')+'</div>'
}
function bindVoiceControls(){
  const target=body();if(!target||!session)return;
  const record=target.querySelector("[data-practical-record]"),stop=target.querySelector("[data-practical-stop]"),status=target.querySelector("[data-practical-voice-status]"),transcript=target.querySelector("[data-practical-transcript]");
  transcript?.addEventListener("input",()=>{session.transcript=transcript.value;saveDraft()});
  record?.addEventListener("click",async()=>{
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){status.textContent="Microphone recording is not available here. Type your answer instead.";return}
    stopVoice();
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true}),recorder=new MediaRecorder(stream),chunks=[],activeSession=session;
      const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
      let recognition=null;
      if(Recognition){
        recognition=new Recognition();recognition.continuous=true;recognition.interimResults=true;recognition.lang="en-GB";
        recognition.onresult=event=>{
          let finalText=session.transcript||"",interim="";
          for(let index=event.resultIndex;index<event.results.length;index++){
            const text=event.results[index][0]?.transcript||"";
            if(event.results[index].isFinal)finalText+=(finalText&& !/\s$/.test(finalText)?" ":"")+text.trim();else interim+=text
          }
          session.transcript=finalText.trim();transcript.value=(session.transcript+(interim?` ${interim}`:" ")).trim();saveDraft()
        };
        try{recognition.start()}catch{}
      }
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
      recorder.onstop=async()=>{
        stream.getTracks().forEach(track=>track.stop());
        if(!chunks.length)return;
        const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
        try{if(!activeSession)return;if(activeSession.voiceMediaId)await deleteMedia(activeSession.voiceMediaId);activeSession.voiceMediaId=await putMedia(blob,`${activeSession.task.id}-answer.webm`);if(session===activeSession){status.textContent="Answer saved on this device.";saveDraft()}}catch{if(session===activeSession)status.textContent="The recording could not be saved. Keep or type your answer notes."}
      };
      recorder.start(250);voice={stream,recorder,recognition};record.disabled=true;stop.disabled=false;status.textContent="Recording… Speak through all three questions.";status.classList.add("is-recording")
    }catch{status.textContent="Microphone permission was not available. Type your answer instead."}
  });
  stop?.addEventListener("click",()=>{stopVoice();record.disabled=false;stop.disabled=true;status.classList.remove("is-recording");if(!status.textContent.includes("saved"))status.textContent="Finishing recording…"})
}

function renderQuestions(){
  const target=body();if(!target||!session)return;
  session.stage="questions";saveDraft();
  target.innerHTML=stageHeader("Explain")+'<h2>Practical questions</h2><p class="evia-tools-copy">Answer all three as if an assessor had asked during the task.</p>'+ 
    '<div class="evia-practical-question-list">'+session.task.questions.map((question,index)=>'<article><i>'+String(index+1)+'</i><div><b>'+esc(question.prompt)+'</b><label><input type="checkbox" data-question-covered="'+index+'" '+(session.questionCovered[index]?'checked':'')+'><span>I covered this in my answer</span></label></div></article>').join("")+'</div>'+ 
    voiceCardMarkup("Record or type your answer")+
    '<button type="button" class="evia-tools-primary" data-questions-next '+(session.questionCovered.every(Boolean)&&(session.voiceMediaId||String(session.transcript).trim().length>=10)?'':'disabled')+'>Review the practical</button>';
  bindVoiceControls();
  const next=target.querySelector("[data-questions-next]"),transcript=target.querySelector("[data-practical-transcript]");
  const update=()=>{session.questionCovered=session.task.questions.map((_,index)=>target.querySelector(`[data-question-covered="${index}"]`).checked);session.transcript=transcript.value;next.disabled=!(session.questionCovered.every(Boolean)&&(session.voiceMediaId||session.transcript.trim().length>=10));saveDraft()};
  target.querySelectorAll("[data-question-covered]").forEach(box=>box.addEventListener("change",update));
  transcript?.addEventListener("input",update);
  const watcher=setInterval(()=>{if(!document.body.contains(next)){clearInterval(watcher);return}update()},500);
  next?.addEventListener("click",()=>{clearInterval(watcher);stopVoice();renderReview()});startTimer()
}

function renderReview(){
  const target=body();if(!target||!session)return;
  session.stage="review";saveDraft();
  target.innerHTML=stageHeader("Review")+'<h2>Rate what you actually demonstrated</h2><p class="evia-tools-copy">Use the finished work, recorded checks and your answers. Do not award a stronger rating than the evidence supports.</p>'+ 
    '<div class="evia-practical-ratings">'+session.task.reviewAreas.map(area=>'<fieldset data-rating-area="'+esc(area.id)+'"><legend><b>'+esc(area.label)+'</b><span>'+area.weight+'%</span></legend><div>'+[1,2,3,4].map(value=>'<label><input type="radio" name="rating-'+esc(area.id)+'" value="'+value+'" '+(Number(session.ratings[area.id])===value?'checked':'')+'><span><i>'+value+'</i>'+esc(RATING_LABELS[value])+'</span></label>').join("")+'</div></fieldset>').join("")+'</div>'+ 
    '<fieldset class="evia-practical-verification"><legend>Verification</legend><label><input type="radio" name="practical-verification" value="self" '+(session.verification!=="tutor"?'checked':'')+'><span>Self-checked</span></label><label><input type="radio" name="practical-verification" value="tutor" '+(session.verification==="tutor"?'checked':'')+'><span>Tutor or assessor verified</span></label><input type="text" data-practical-verifier placeholder="Tutor or assessor name" value="'+esc(session.verifier)+'" '+(session.verification==="tutor"?'':'hidden')+'></fieldset>'+ 
    '<button type="button" class="evia-tools-primary" data-review-finish disabled>Finish and see readiness</button>';
  const finish=target.querySelector("[data-review-finish]"),verifier=target.querySelector("[data-practical-verifier]");
  const update=()=>{
    session.ratings={};session.task.reviewAreas.forEach(area=>{const selected=target.querySelector(`input[name="rating-${area.id}"]:checked`);if(selected)session.ratings[area.id]=Number(selected.value)});
    session.verification=target.querySelector('input[name="practical-verification"]:checked')?.value||"self";session.verifier=verifier.value.trim();verifier.hidden=session.verification!=="tutor";
    finish.disabled=Object.keys(session.ratings).length!==session.task.reviewAreas.length||(session.verification==="tutor"&&!session.verifier);saveDraft()
  };
  target.querySelectorAll(".evia-practical-ratings input,.evia-practical-verification input").forEach(input=>input.addEventListener("change",update));verifier.addEventListener("input",update);update();
  finish?.addEventListener("click",finishPractical);startTimer()
}

async function finishPractical(){
  if(!session)return;
  const within=session.checks.filter(item=>item.within).length/Math.max(1,session.checks.length),covered=session.questionCovered.filter(Boolean).length/Math.max(1,session.questionCovered.length);
  const scoreFor=(id,weight,factor=1)=>Math.round(weight*(Number(session.ratings[id]||1)/4*0.6+factor*0.4));
  const breakdown=[
    {id:"safety",label:"Safety and preparation",weight:20,score:scoreFor("safety",20,session.safetyChecked.length/session.task.safetyControls.length)},
    {id:"method",label:"Method and sequence",weight:20,score:scoreFor("method",20,session.mode==="guided"?session.performedSteps.length/session.task.sequence.length:Number(session.ratings.method||1)/4)},
    {id:"accuracy",label:"Measurements and checks",weight:30,score:scoreFor("accuracy",30,within)},
    {id:"finish",label:"Finished work",weight:20,score:scoreFor("finish",20,Number(session.ratings.finish||1)/4)},
    {id:"questions",label:"Practical questions",weight:10,score:scoreFor("questions",10,covered)},
  ];
  await completeAttempt(breakdown)
}

async function completeAttempt(breakdown){
  const target=body();if(!target||!session)return;
  stopVoice();stopTimer();target.innerHTML='<div class="evia-arp-loading">Saving this practical rehearsal…</div>';
  const percent=Math.max(0,Math.min(100,breakdown.reduce((total,item)=>total+item.score,0))),result=readiness(percent),attemptId=uid("EVIA-PRACTICAL");
  const evidence=(session.evidence||[]).filter(item=>item?.mediaId).map(item=>({mediaId:item.mediaId,name:item.name,type:item.type}));
  const recordedChecks=(session.checks||[]).map((item,index)=>({...item,label:session.task.checks[index]?.label||`Check ${index+1}`,target:session.task.checks[index]?.target||""}));
  const record={id:attemptId,taskId:session.task.id,title:session.task.title,category:session.task.category,mode:session.mode,score:percent,percent,readiness:result.label,breakdown,verification:session.verification||"self",verifier:session.verifier||"",evidence,voiceMediaId:session.voiceMediaId||null,checks:recordedChecks,mapsTo:session.task.mapsTo,completedAt:Date.now(),elapsedSeconds:session.startedAt?Math.max(0,Math.floor((Date.now()-session.startedAt)/1000)):null};
  const all=history(),before=courseHistory(session.bank.enrolmentId),attempts=[record,...(before.attempts||[])].slice(0,50);
  all[session.bank.enrolmentId]={attempts,bestPercent:Math.max(Number(before.bestPercent||0),percent),lastPercent:percent,updatedAt:Date.now()};
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(all))}catch{}
  clearDraft();session.resultRecord=record;renderResult(record,result)
}

function renderResult(record,result){
  const target=body();if(!target||!session)return;
  const weakest=[...record.breakdown].sort((a,b)=>(a.score/a.weight)-(b.score/b.weight))[0];
  target.innerHTML=
    '<p class="evia-tools-kicker">Practical complete</p><h2>'+esc(record.title)+'</h2>'+ 
    '<div class="evia-arp-score"><div><strong>'+record.percent+'%</strong><span>'+esc(result.label)+' readiness</span></div></div>'+ 
    '<p class="evia-tools-copy">'+esc(result.copy)+'</p>'+ 
    '<div class="evia-practical-breakdown">'+record.breakdown.map(item=>'<div><span><b>'+esc(item.label)+'</b><i>'+item.score+'/'+item.weight+'</i></span><em><i style="width:'+Math.round(item.score/item.weight*100)+'%"></i></em></div>').join("")+'</div>'+ 
    '<div class="evia-arp-summary"><b>Next focus: '+esc(weakest.label)+'</b><span>Repeat this area in '+(record.mode==="mock"?'Guided Rehearsal':'Mock Practical')+' and compare the checks.</span></div>'+ 
    '<p class="evia-practical-verified">'+(record.verification==="tutor"?'Tutor/assessor verified by '+esc(record.verifier):'Learner self-check')+' · '+record.evidence.length+' media checkpoint'+(record.evidence.length===1?'':'s')+'</p>'+ 
    '<div class="evia-arp-actions"><button type="button" class="evia-tools-primary" data-result-another>Try another task</button><button type="button" class="evia-arp-secondary" data-result-history>Practice history</button><button type="button" class="evia-arp-secondary" data-result-home>Back to ARP</button></div>';
  target.querySelector("[data-result-another]")?.addEventListener("click",()=>renderTaskPicker(session.bank,session.mode));
  target.querySelector("[data-result-history]")?.addEventListener("click",()=>renderHistory(session.bank));
  target.querySelector("[data-result-home]")?.addEventListener("click",returnToArp)
}

function renderHistory(bank){
  releaseSessionMedia();session=null;
  const target=body();if(!target)return;
  const record=courseHistory(bank.enrolmentId),attempts=record.attempts||[];
  target.innerHTML='<p class="evia-tools-kicker">Practical Coach</p><h2>Practice history</h2><p class="evia-tools-copy">Results and evidence remain private on this device.</p>'+ 
    '<div class="evia-practical-history">'+(attempts.length?attempts.map(item=>'<button type="button" data-history-id="'+esc(item.id)+'"><span><small>'+esc(modeName(item.mode))+' · '+esc(formatDate(item.completedAt))+'</small><b>'+esc(item.title)+'</b><em>'+esc(item.readiness)+' · '+item.percent+'% · '+(item.evidence?.length||0)+' media</em></span><i>›</i></button>').join(""):'<p>No practical rehearsals have been completed yet.</p>')+'</div>'+ 
    '<button type="button" class="evia-arp-secondary" data-history-back>Back to Practical Coach</button>';
  target.querySelectorAll("[data-history-id]").forEach(button=>button.addEventListener("click",()=>renderHistoryDetail(bank,attempts.find(item=>item.id===button.dataset.historyId))));
  target.querySelector("[data-history-back]")?.addEventListener("click",renderPracticalHome)
}

function renderHistoryDetail(bank,record){
  const target=body();if(!target||!record)return;releaseObjectUrls();
  target.innerHTML='<p class="evia-tools-kicker">'+esc(modeName(record.mode))+'</p><h2>'+esc(record.title)+'</h2>'+ 
    '<div class="evia-arp-summary"><b>'+esc(record.readiness)+' · '+record.percent+'%</b><span>'+esc(formatDate(record.completedAt))+' · '+(record.verification==="tutor"?'Verified by '+esc(record.verifier):'Self-checked')+'</span></div>'+ 
    '<div class="evia-practical-breakdown">'+record.breakdown.map(item=>'<div><span><b>'+esc(item.label)+'</b><i>'+item.score+'/'+item.weight+'</i></span><em><i style="width:'+Math.round(item.score/item.weight*100)+'%"></i></em></div>').join("")+'</div>'+ 
    '<div class="evia-practical-history-checks"><b>Recorded checks</b>'+record.checks.map((item,index)=>'<p><span>'+esc(item.label||`Check ${index+1}`)+'</span>'+esc(item.value||"Learning activity")+(item.within===true?' · within specification':item.within===false?' · outside specification':'')+'</p>').join("")+'</div>'+ 
    '<div class="evia-practical-history-media" data-history-media>'+(record.evidence?.length?record.evidence.map((item,index)=>'<article data-history-media-item="'+index+'"><span>Loading '+esc(item.name||"media")+'…</span></article>').join(""):'<p>No media was stored for this attempt.</p>')+'</div>'+ 
    '<button type="button" class="evia-arp-secondary" data-history-detail-back>Back to history</button>';
  target.querySelector("[data-history-detail-back]")?.addEventListener("click",()=>renderHistory(bank));
  (record.evidence||[]).forEach((item,index)=>getMedia(item.mediaId).then(media=>{
    const card=document.querySelector(`[data-history-media-item="${index}"]`);if(!card||!media?.blob)return;
    const url=makeObjectUrl(media.blob);card.innerHTML=String(media.type).startsWith("video/")?'<video controls playsinline src="'+esc(url)+'"></video><small>'+esc(media.name)+'</small>':'<img alt="Saved practical evidence" src="'+esc(url)+'"><small>'+esc(media.name)+'</small>'
  }).catch(()=>{}))
}

function resumeDraft(bank,value){
  const task=bank.tasks.find(item=>item.id===value.taskId);if(!task)return;
  session={bank,task,mode:value.mode,stage:value.stage||"brief",startedAt:value.startedAt,durationSeconds:value.durationSeconds,safetyChecked:value.safetyChecked||[],performedSteps:value.performedSteps||[],evidence:value.evidence||task.evidenceCheckpoints.map(()=>null),checks:value.checks||task.checks.map(()=>({value:"",within:false})),questionCovered:value.questionCovered||task.questions.map(()=>false),transcript:value.transcript||"",voiceMediaId:value.voiceMediaId||null,ratings:value.ratings||{},verification:value.verification||"self",verifier:value.verifier||"",methodErrors:value.methodErrors||0,decisionCorrect:value.decisionCorrect,learnChecks:value.learnChecks||[],learnOrder:value.learnOrder||[]};
  if(session.stage==="learn-decision"&&session.decisionCorrect!==undefined)session.stage="learn-checks";
  const renders={brief:renderTaskBrief,"learn-prepare":renderLearnPrepare,"learn-sequence":renderLearnSequence,"learn-decision":renderLearnDecision,"learn-checks":renderLearnChecks,"learn-explain":renderLearnExplain,safety:renderSafetyGate,perform:renderPerform,evidence:renderEvidence,checks:renderChecks,questions:renderQuestions,review:renderReview};
  (renders[session.stage]||renderTaskBrief)()
}

function onPracticalClick(event){
  if(event.target?.closest?.('.evia-arp-layer [data-arp-back]'))releaseSessionMedia();
  const button=event.target?.closest?.('.evia-arp-layer [data-arp-option="practical"]');
  if(!button)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();renderPracticalHome()
}
function ready(){
  patchPracticalRow();document.addEventListener("click",onPracticalClick,true);
  if(window.MutationObserver&&document.body)new MutationObserver(queuePatch).observe(document.body,{childList:true,subtree:true})
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("pageshow",queuePatch);window.addEventListener("pagehide",releaseSessionMedia);
window.EviaArpPractical={open:renderPracticalHome,currentBank:currentPracticalBank,readiness};
})();
