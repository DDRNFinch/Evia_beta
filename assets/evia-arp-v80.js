(()=>{
"use strict";
const LAYER_CLASS="evia-arp-layer";
const ARCH_LABEL="ARP";
const TITLE="Assessment Readiness & Practice";
const HISTORY_KEY="evia-arp-mocks-v1";
let patchQueued=false;
let session=null;
let bankCache=null;

function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
function close(){session=null;document.querySelector(`.${LAYER_CLASS}`)?.remove()}
function layer(){return document.querySelector(`.${LAYER_CLASS}`)}
function body(){return layer()?.querySelector(".evia-tools-body")||null}

function ensureStyles(){
  if(document.getElementById("evia-arp-style"))return;
  const style=document.createElement("style");
  style.id="evia-arp-style";
  style.textContent=`
  .evia-arp-layer .evia-tools-body{padding-bottom:max(2rem,env(safe-area-inset-bottom))}
  .evia-arp-summary{margin:.8rem 0 1.2rem;padding:.9rem 1rem;border-radius:1rem;background:rgba(242,197,54,.14);color:#62520e;font-size:.78rem;line-height:1.45}
  .evia-arp-summary b{display:block;color:#3f350d;font-size:.86rem}
  .evia-arp-meta{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin:.15rem 0 1rem;color:#727278;font-size:.7rem}
  .evia-arp-track{height:.38rem;overflow:hidden;border-radius:999px;background:rgba(0,0,0,.075)}
  .evia-arp-track span{display:block;height:100%;border-radius:inherit;background:#e3b629;transition:width .3s ease}
  .evia-arp-topic{margin:.9rem 0 .3rem;color:#8b7418;text-transform:uppercase;letter-spacing:.08em;font-size:.61rem;font-weight:700}
  .evia-arp-question{margin:0 0 1rem;color:#242426;font-size:clamp(1.15rem,4.7vw,1.5rem);line-height:1.28;letter-spacing:-.025em}
  .evia-arp-options{display:grid;gap:.62rem}
  .evia-arp-answer{width:100%;min-height:3.35rem;border:1px solid rgba(0,0,0,.09);border-radius:1rem;background:rgba(255,255,255,.72);color:#343438;padding:.82rem .9rem;text-align:left;font:inherit;line-height:1.35}
  .evia-arp-answer:not(:disabled):hover,.evia-arp-answer:not(:disabled):focus-visible{border-color:rgba(181,140,14,.45);background:#fffdf4;outline:none}
  .evia-arp-answer.is-correct{border-color:#5b9b6c;background:#edf8f0;color:#235332}
  .evia-arp-answer.is-wrong{border-color:#b96b66;background:#fff0ef;color:#6f2c28}
  .evia-arp-answer:disabled{opacity:1}
  .evia-arp-feedback{margin:1rem 0 0;padding:1rem;border-radius:1rem;background:rgba(255,255,255,.72);font-size:.8rem;line-height:1.5;color:#57575d}
  .evia-arp-feedback b{display:block;margin-bottom:.25rem;color:#29292c}
  .evia-arp-feedback small{display:block;margin-top:.5rem;color:#7b7b81}
  .evia-arp-actions{display:grid;gap:.62rem;margin-top:1rem}
  .evia-arp-secondary{width:100%;min-height:3rem;border:1px solid rgba(0,0,0,.08);border-radius:999px;background:rgba(255,255,255,.68);font:inherit}
  .evia-arp-score{display:grid;place-items:center;width:8.8rem;height:8.8rem;margin:1.5rem auto;border-radius:50%;background:#fff8d9;color:#4c3e09;box-shadow:inset 0 0 0 1px rgba(195,153,18,.14)}
  .evia-arp-score strong{display:block;text-align:center;font-size:2.5rem;line-height:1;letter-spacing:-.05em}.evia-arp-score span{display:block;margin-top:.3rem;text-align:center;font-size:.65rem}
  .evia-arp-loading{padding:1.2rem 0;color:#6f6f74;font-size:.82rem}
  `;
  document.head.appendChild(style)
}

function patchArch(){
  patchQueued=false;
  const button=document.querySelector('.progress-arch[data-arch="ARP"],.progress-arch[data-arch="EPA"],.progress-arch[data-arch="Q&A"],.progress-arch[data-arch="Units"]');
  if(!button)return;
  button.dataset.arch=ARCH_LABEL;
  button.setAttribute("aria-label",`${ARCH_LABEL} — ${TITLE}. Open assessment practice`);
  const label=button.querySelector(".arch-label");
  if(label&&label.textContent!==ARCH_LABEL)label.textContent=ARCH_LABEL
}

function queuePatch(){if(patchQueued)return;patchQueued=true;requestAnimationFrame(patchArch)}

function enrolmentId(){
  const current=window.EviaCourseContext?.current?.();
  if(!current||current.noCourse)return null;
  const family=String(current.packFamilyId||current.standardId||"").toUpperCase();
  const courseId=String(current.courseId||"").toLowerCase();
  const pathway=String(current.pathway||"").toLowerCase();
  if(family==="ST0095"||courseId==="st0095-v1-2")return "ST0095";
  if(family==="ST0264"||courseId==="st0264-v1-4")return pathway==="architectural-joiner"?"ST0264-AJ":"ST0264-SITE";
  if(family==="6570-05"||courseId==="6570-05"){
    const suffix={thin:"THIN",repair:"REPAIR",specialist:"SPECIALIST",drainage:"DRAINAGE"}[pathway]||"THIN";
    return `6570-05-${suffix}`
  }
  return null
}

function bankUrl(entry){
  const registry=new URL("./course-delivery/registry-v1.json",document.baseURI);
  return new URL(String(entry.questionBankPath||""),registry).href
}

function validateBank(raw,id){
  if(raw?.eviaQuestionBank!==1||String(raw.enrolmentId)!==id||!Array.isArray(raw.questions)||!raw.questions.length)throw Error("This course's ARP question bank is invalid.");
  for(const question of raw.questions){
    if(!question?.id||!question?.prompt||!Array.isArray(question.options)||question.options.length!==4||!Number.isInteger(question.correctIndex)||question.correctIndex<0||question.correctIndex>3)throw Error("This course's ARP question bank is incomplete.")
  }
  return raw
}

async function currentBank(force=false){
  const id=enrolmentId();
  if(!id)throw Error("Add a course before opening ARP practice.");
  if(!force&&bankCache?.enrolmentId===id)return bankCache;
  const registry=await window.EviaCourseRegistry?.registry?.();
  const entry=registry?.courses?.find(item=>String(item.enrolmentId).toUpperCase()===id);
  if(!entry?.questionBankPath)throw Error("The ARP question bank is not available for this course yet.");
  const response=await fetch(bankUrl(entry),{cache:"no-store"});
  if(!response.ok)throw Error(`The ARP question bank could not be loaded (${response.status}).`);
  bankCache=validateBank(await response.json(),id);
  return bankCache
}

function history(){try{const raw=JSON.parse(localStorage.getItem(HISTORY_KEY)||"{}");return raw&&typeof raw==="object"?raw:{}}catch{return{}}}
function historyFor(id){const item=history()[id];return item&&typeof item==="object"?item:{attempts:0,bestPercent:0,lastPercent:0}}
function saveAttempt(id,score,total){
  const all=history(),before=historyFor(id),percent=Math.round(score/Math.max(1,total)*100);
  all[id]={attempts:Number(before.attempts||0)+1,bestPercent:Math.max(Number(before.bestPercent||0),percent),lastPercent:percent,lastScore:score,lastTotal:total,updatedAt:Date.now()};
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(all))}catch{}
  return all[id]
}

function shell(){
  document.querySelector(".evia-tools-layer:not(.evia-arp-layer)")?.remove();
  const item=document.createElement("div");
  item.className=`evia-tools-layer ${LAYER_CLASS}`;
  item.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-arp-back>‹ Back</button><b>${TITLE}</b><span></span></div><div class="evia-tools-body"></div></section>`;
  document.body.appendChild(item);
  item.querySelector("[data-arp-back]")?.addEventListener("click",close);
  return item
}

function renderHome(){
  session=null;
  const target=body();if(!target)return;
  const id=enrolmentId(),progress=id?historyFor(id):null;
  target.innerHTML=`
    <p class="evia-tools-kicker">ARP</p><h2>${TITLE}</h2>
    <p class="evia-tools-copy">Short, course-specific practice to build confidence before assessment.</p>
    <div class="evia-arp-summary" data-arp-summary><b>Multiple-choice bank</b><span>${progress?.attempts?`${progress.attempts} mock${progress.attempts===1?"":"s"} completed · best ${progress.bestPercent}%`:"Loading this course's question bank…"}</span></div>
    <button type="button" class="evia-tools-row" data-arp-option="multiple-choice"><span><b>Multiple Choice</b><small data-arp-bank-count>10-question practice mock</small></span><i>›</i></button>
    <button type="button" class="evia-tools-row" data-arp-option="discussion"><span><b>Discussion</b><small>Planned for the next ARP bank</small></span><i>›</i></button>
    <button type="button" class="evia-tools-row" data-arp-option="practical"><span><b>Practical</b><small>Planned for the next ARP bank</small></span><i>›</i></button>`;
  target.querySelector('[data-arp-option="multiple-choice"]')?.addEventListener("click",startMock);
  target.querySelectorAll('[data-arp-option="discussion"],[data-arp-option="practical"]').forEach(button=>button.addEventListener("click",()=>renderPlanned(button.dataset.arpOption)));
  currentBank().then(bank=>{
    const count=target.querySelector("[data-arp-bank-count]");if(count)count.textContent=`${bank.questions.length} questions · ${Number(bank.questionsPerMock)||10} per mock`;
    const summary=target.querySelector("[data-arp-summary] span");if(summary&&!progress?.attempts)summary.textContent=`${bank.courseTitle} · ${bank.questions.length} mapped practice questions`
  }).catch(error=>{
    const summary=target.querySelector("[data-arp-summary]");if(summary)summary.innerHTML=`<b>Question bank unavailable</b><span>${esc(error?.message||error)}</span>`
  })
}

function renderPlanned(kind){
  const target=body();if(!target)return;
  const title=kind==="discussion"?"Discussion":"Practical";
  target.innerHTML=`<p class="evia-tools-kicker">ARP</p><h2>${title} practice</h2><p class="evia-tools-copy">The seven multiple-choice banks are ready first. ${title} prompts and marking guidance will be added as the next ARP stage.</p><button type="button" class="evia-arp-secondary" data-arp-home>Back to ARP</button>`;
  target.querySelector("[data-arp-home]")?.addEventListener("click",renderHome)
}

function shuffled(items){
  const output=[...items];
  for(let index=output.length-1;index>0;index--){const pick=Math.floor(Math.random()*(index+1));[output[index],output[pick]]=[output[pick],output[index]]}
  return output
}

async function startMock(){
  const target=body();if(!target)return;
  target.innerHTML='<div class="evia-arp-loading">Loading this course’s questions…</div>';
  try{
    const bank=await currentBank(),count=Math.min(Number(bank.questionsPerMock)||10,bank.questions.length);
    session={bank,questions:shuffled(bank.questions).slice(0,count),index:0,score:0,answered:false};
    renderQuestion()
  }catch(error){
    target.innerHTML=`<p class="evia-tools-kicker">ARP</p><h2>Question bank unavailable</h2><p class="evia-tools-copy">${esc(error?.message||error)}</p><button type="button" class="evia-arp-secondary" data-arp-home>Back to ARP</button>`;
    target.querySelector("[data-arp-home]")?.addEventListener("click",renderHome)
  }
}

function renderQuestion(){
  const target=body();if(!target||!session)return;
  const question=session.questions[session.index],number=session.index+1,total=session.questions.length,progress=Math.round((session.index/total)*100);
  session.answered=false;
  target.innerHTML=`
    <div class="evia-arp-meta"><span>Question ${number} of ${total}</span><span>${esc(session.bank.courseTitle)}</span></div>
    <div class="evia-arp-track" aria-hidden="true"><span style="width:${progress}%"></span></div>
    <p class="evia-arp-topic">${esc(question.topic||"Course practice")}</p>
    <h2 class="evia-arp-question">${esc(question.prompt)}</h2>
    <div class="evia-arp-options">${question.options.map((option,index)=>`<button type="button" class="evia-arp-answer" data-arp-answer="${index}">${esc(option)}</button>`).join("")}</div>
    <div data-arp-feedback></div>`;
  target.querySelectorAll("[data-arp-answer]").forEach(button=>button.addEventListener("click",()=>answerQuestion(Number(button.dataset.arpAnswer))))
}

function answerQuestion(selected){
  if(!session||session.answered)return;
  session.answered=true;
  const question=session.questions[session.index],correct=Number(question.correctIndex),right=selected===correct;
  if(right)session.score+=1;
  const target=body();if(!target)return;
  target.querySelectorAll("[data-arp-answer]").forEach((button,index)=>{
    button.disabled=true;
    if(index===correct)button.classList.add("is-correct");
    else if(index===selected)button.classList.add("is-wrong")
  });
  const feedback=target.querySelector("[data-arp-feedback]");
  feedback.innerHTML=`<div class="evia-arp-feedback"><b>${right?"Correct":"Not quite"}</b>${esc(question.explanation)}<small>Maps to ${esc((question.mapsTo||[]).join(" · "))}</small></div><button type="button" class="evia-tools-primary" data-arp-next>${session.index+1===session.questions.length?"See result":"Next question"}</button>`;
  feedback.querySelector("[data-arp-next]")?.addEventListener("click",()=>{
    session.index+=1;
    if(session.index>=session.questions.length)renderResult();else renderQuestion()
  })
}

function renderResult(){
  if(!session)return;
  const target=body();if(!target)return;
  const score=session.score,total=session.questions.length,percent=Math.round(score/Math.max(1,total)*100),record=saveAttempt(session.bank.enrolmentId,score,total);
  const message=percent>=80?"Strong result — keep varying the questions.":percent>=60?"Good start — review the feedback and try another mix.":"Use the feedback to target the topics that need more practice.";
  target.innerHTML=`
    <p class="evia-tools-kicker">Mock complete</p><h2>${esc(session.bank.courseTitle)}</h2>
    <div class="evia-arp-score"><div><strong>${score}/${total}</strong><span>${percent}% correct</span></div></div>
    <p class="evia-tools-copy">${message}</p>
    <div class="evia-arp-summary"><b>Practice record</b><span>${record.attempts} mock${record.attempts===1?"":"s"} completed · best ${record.bestPercent}%</span></div>
    <div class="evia-arp-actions"><button type="button" class="evia-tools-primary" data-arp-retry>Try another mock</button><button type="button" class="evia-arp-secondary" data-arp-home>Back to ARP</button></div>`;
  target.querySelector("[data-arp-retry]")?.addEventListener("click",startMock);
  target.querySelector("[data-arp-home]")?.addEventListener("click",renderHome)
}

function open(){ensureStyles();close();shell();renderHome()}

document.addEventListener("click",event=>{
  const target=event.target instanceof Element?event.target.closest('.progress-arch[data-arch="ARP"],.progress-arch[data-arch="EPA"],.progress-arch[data-arch="Q&A"],.progress-arch[data-arch="Units"]'):null;
  if(!target)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();patchArch();open()
},true);

function ready(){
  ensureStyles();patchArch();
  const root=document.getElementById("root");
  if(root&&!root.__eviaArpObserver){root.__eviaArpObserver=true;new MutationObserver(queuePatch).observe(root,{childList:true,subtree:true})}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("load",()=>setTimeout(patchArch,0));
window.addEventListener("pageshow",()=>setTimeout(patchArch,0));
window.EviaArp={open,currentBank,startMock};
})();
