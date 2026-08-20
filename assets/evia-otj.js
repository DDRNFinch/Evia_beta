(()=>{
"use strict";

const ENTRY_KEY="evia-otj-entries";
const COLLEGE_KEY="evia-otj-college-v1";
const TIMELINE_KEY="evia-course-timeline";
const MINIMUM_HOURS=578;
const MINIMUM_MINUTES=MINIMUM_HOURS*60;

const TYPES=[
  ["Workplace training","Someone showed or taught me something new at work."],
  ["Shadowing / mentoring","I learned by working alongside someone more experienced."],
  ["External training","Manufacturer training, an industry course, visit or event."],
  ["Independent learning","Relevant assignment work, research or revision."]
];

const AREAS={
  "Safety & site":[
    ["Risk assessments & safe working",["K1","K3","S1","S7","B1"]],
    ["PPE & RPE",["K2","S2","B1"]],
    ["Waste & environment",["K4","S3","B2"]],
    ["Building performance & sustainability",["K5","B2"]]
  ],
  "Plans, materials & tools":[
    ["Reading drawings & specifications",["K10","K11","S5"]],
    ["Materials & quantities",["K8","K12","S6"]],
    ["Hand tools",["K13","S8","S9"]],
    ["Power tools",["K14","S8"]],
    ["Standards & regulations",["K7","S4"]]
  ],
  "Setting out":[
    ["Cavity wall setting out",["K21","S10"]],
    ["Openings & dimensions",["K10","K21","S5","S10"]],
    ["Solid wall setting out",["K16","S13"]],
    ["Profiles, gauge, line & level",["K21","S10"]]
  ],
  "Building walls":[
    ["Cavity wall construction",["K22","S11"]],
    ["Solid walling & bond",["K15","K16","S13"]],
    ["Mortar mixing",["K20","S14"]],
    ["Wall ties",["K22","S11"]],
    ["Insulation",["K5","K22","S11"]],
    ["Gables & raking walls",["K30","S22"]]
  ],
  "Openings & wall details":[
    ["Lintels & openings",["K22","S11"]],
    ["DPC & cavity trays",["K6","K22","S11"]],
    ["Weep holes",["K22","S11"]],
    ["Soldier & brick-on-edge courses",["K23","S11"]],
    ["Movement joints",["K19"]],
    ["Fire stopping",["K6","K22","S11"]]
  ],
  "Finishing & site work":[
    ["Joint finishes",["K17","S12"]],
    ["Cutting bricks & blocks",["K29","S15"]],
    ["Repairs & defects",["K24","S16","B3"]],
    ["Protecting work & materials",["K25","S17","B3"]],
    ["Decorative brickwork & piers",["K18"]]
  ],
  "Working with others":[
    ["Communication",["K26","S18"]],
    ["Teamwork",["K27","S20","B6"]],
    ["Inclusion & respect",["K28","S19","B4"]],
    ["Learning & development",["B5"]],
    ["Wellbeing & support",["K31","S21","B1"]]
  ]
};

let draft=null;
let returnEntryId=null;

function readJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function todayISO(){const d=new Date(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${d.getFullYear()}-${m}-${day}`}
function formatDate(value){if(!value)return "Not checked yet";const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function formatMinutes(total){const n=Math.max(0,Math.round(Number(total)||0)),h=Math.floor(n/60),m=n%60;if(!h)return `${m}m`;return m?`${h}h ${m}m`:`${h}h`}
function entryMinutes(e){if(!e||typeof e!=="object")return 0;if(e.durationMinutes!==undefined&&e.durationMinutes!==null&&Number.isFinite(Number(e.durationMinutes)))return Math.max(0,Math.round(Number(e.durationMinutes)));if(Number.isFinite(Number(e.hours)))return Math.max(0,Math.round(Number(e.hours)*60));return 0}
function entries(){const x=readJSON(ENTRY_KEY,[]);return Array.isArray(x)?x.filter(e=>e&&typeof e==="object"):[]}
function college(){const raw=readJSON(COLLEGE_KEY,{}),x=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};return {days:Math.max(0,Math.round(Number(x.days)||0)),hours:Math.max(0,Math.round(Number(x.hours)||0)),minutes:Math.max(0,Math.min(59,Math.round(Number(x.minutes)||0))),checkedOn:String(x.checkedOn||""),updates:Array.isArray(x.updates)?x.updates.filter(v=>v&&typeof v==="object"):[]}}
function collegeMinutes(){const x=college();return x.hours*60+x.minutes}
function learnerMinutes(){return entries().reduce((sum,e)=>sum+entryMinutes(e),0)}
function knownMinutes(){return collegeMinutes()+learnerMinutes()}
function otjPercent(){return Math.round(Math.min(1,knownMinutes()/MINIMUM_MINUTES)*100)}
function topicCodes(area,topic){const item=(AREAS[area]||[]).find(x=>x[0]===topic);return item?item[1].slice():[]}

function pace(){
  const t=readJSON(TIMELINE_KEY,{});
  if(!t||typeof t!=="object")return null;
  const s=Date.parse(`${t.startDate||""}T00:00:00`),e=Date.parse(`${t.endDate||""}T00:00:00`);
  if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s)return null;
  const fraction=Math.max(0,Math.min(1,(Date.now()-s)/(e-s)));
  const expected=Math.round(MINIMUM_MINUTES*fraction),actual=knownMinutes(),diff=actual-expected;
  let status="On track with the current pace guide";
  if(diff<-30)status=`${formatMinutes(Math.abs(diff))} below the current pace guide`;
  else if(diff>30)status=`${formatMinutes(diff)} ahead of the current pace guide`;
  return {expected,fraction,status};
}
function paceMarkup(){
  const p=pace();
  if(!p)return `<div class="evia-otj-pace"><b>Expected by now</b><strong>Set your course dates</strong><span>Add your start and planned end date in TOC to see an OTJ pace guide.</span></div>`;
  return `<div class="evia-otj-pace"><b>Expected by now</b><strong>${formatMinutes(p.expected)}</strong><span>${Math.round(p.fraction*100)}% through planned course time · ${esc(p.status)}. Based only on OTJ currently recorded in Evia.</span></div>`;
}

function patchArch(){
  const pct=otjPercent(),dash=`${pct} 100`,text=`${pct}%`;
  document.querySelectorAll('[data-arch="OTJ"]').forEach(button=>{
    const path=button.querySelector(".arch-value"),number=button.querySelector(".arch-number");
    if(path&&path.getAttribute("stroke-dasharray")!==dash)path.setAttribute("stroke-dasharray",dash);
    if(number&&number.textContent!==text)number.textContent=text;
  });
}

function closeLayer(){document.querySelector(".evia-otj-layer")?.remove()}
function layer(body,title="Off the job",back=null){
  closeLayer();
  const other=document.querySelector(".evia-tools-layer:not(.evia-otj-layer)");
  if(other)other.remove();
  const el=document.createElement("div");
  el.className="evia-tools-layer evia-otj-layer evia-otj";
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-otj-back>‹ Back</button><b>${esc(title)}</b><span></span></div><div class="evia-tools-body">${body}</div></section>`;
  document.body.appendChild(el);
  const backButton=el.querySelector("[data-otj-back]");
  if(backButton)backButton.onclick=back||closeLayer;
  return el;
}
function errorScreen(err){
  console.error("Evia OTJ",err);
  try{
    const el=layer(`<h2>OTJ could not open</h2><p class="evia-tools-copy">Evia protected the rest of the app. Close this screen and try again.</p><button class="evia-tools-primary" data-otj-close>Close</button>`,"Off the job",closeLayer);
    el.querySelector("[data-otj-close]").onclick=closeLayer;
  }catch{}
}

function main(){
  const c=college(),learner=learnerMinutes(),known=knownMinutes();
  const list=entries().slice().sort((a,b)=>String(b?.date||"").localeCompare(String(a?.date||""))||Number(b?.createdAt||0)-Number(a?.createdAt||0));
  const collegeStatus=c.checkedOn?`Last checked ${formatDate(c.checkedOn)}`:"Not checked yet";
  const history=list.length?list.map(e=>`<button class="evia-otj-entry" data-entry="${esc(e.id||"")}"><span><b>${esc(e.topic||"Off-the-job learning")}</b><small>${esc(e.type||"Learning")} · ${formatMinutes(entryMinutes(e))} · ${esc(formatDate(e.date))}</small></span><i>›</i></button>`).join(""):`<div class="evia-otj-empty">No learner-recorded OTJ yet.</div>`;
  const el=layer(`
    <p class="evia-tools-kicker">Current known position</p>
    <div class="evia-otj-summary">
      <div class="evia-otj-total"><strong>${formatMinutes(known)}</strong><span>of ${MINIMUM_HOURS}h minimum</span></div>
      ${paceMarkup()}
      <div class="evia-otj-metrics">
        <div><b>${formatMinutes(collegeMinutes())}</b><span>College OTJ</span><small>${c.days} college day${c.days===1?"":"s"} recorded</small></div>
        <div><b>${formatMinutes(learner)}</b><span>Learner recorded</span><small>Workplace & other learning</small></div>
      </div>
      <p class="evia-otj-note">College record: ${esc(collegeStatus)}. Evia does not estimate missing college attendance.</p>
    </div>
    <button class="evia-tools-primary" data-record-otj>Record off the job</button>
    <button class="evia-tools-secondary" data-update-college>Update college record</button>
    <div class="evia-otj-rule">Normal college sessions are not entered again here. Record additional genuine learning away from those sessions.</div>
    <div class="evia-otj-section"><h3>Recent learning</h3>${history}</div>
  `,"Off the job",closeLayer);
  el.querySelector("[data-record-otj]").onclick=()=>startRecord();
  el.querySelector("[data-update-college]").onclick=updateCollege;
  el.querySelectorAll("[data-entry]").forEach(b=>b.onclick=()=>viewEntry(b.dataset.entry));
}

function updateCollege(){
  const c=college();
  const el=layer(`
    <h2>Update college OTJ</h2>
    <p class="evia-tools-copy">At a review, copy the learner's current cumulative figures from the college record. These replace the previous college totals rather than being added again.</p>
    <div class="evia-otj-form">
      <label>College days recorded<input data-college-days type="number" min="0" step="1" inputmode="numeric" value="${c.days}"></label>
      <div class="evia-otj-two">
        <label>OTJ hours<input data-college-hours type="number" min="0" step="1" inputmode="numeric" value="${c.hours}"></label>
        <label>Minutes<input data-college-minutes type="number" min="0" max="59" step="1" inputmode="numeric" value="${c.minutes}"></label>
      </div>
      <label>Record checked on<input data-college-date type="date" value="${esc(c.checkedOn||todayISO())}"></label>
    </div>
    <div class="evia-otj-info">Use the actual college record, not an estimate. College days are kept as a cross-check; the recorded OTJ hours are what contribute to the total.</div>
    <button class="evia-tools-primary" data-save-college>Save college record</button>
  `,"College OTJ",main);
  el.querySelector("[data-save-college]").onclick=()=>{
    const days=Math.max(0,Math.round(Number(el.querySelector("[data-college-days]")?.value)||0));
    const hours=Math.max(0,Math.round(Number(el.querySelector("[data-college-hours]")?.value)||0));
    const minutes=Math.max(0,Math.min(59,Math.round(Number(el.querySelector("[data-college-minutes]")?.value)||0)));
    const checkedOn=el.querySelector("[data-college-date]")?.value||todayISO();
    const old=college(),snapshot={days,hours,minutes,checkedOn,savedAt:Date.now()};
    writeJSON(COLLEGE_KEY,{...snapshot,updates:[...old.updates,snapshot].slice(-30)});
    patchArch();main();
  };
}

function startRecord(existing=null){
  returnEntryId=existing?.id||null;
  draft=existing?{
    id:String(existing.id||`otj-${Date.now()}`),type:String(existing.type||""),date:String(existing.date||todayISO()),area:String(existing.area||""),topic:String(existing.topic||""),durationMinutes:entryMinutes(existing),learned:String(existing.learned||existing.description||existing.whatLearned||""),createdAt:Number(existing.createdAt)||Date.now()
  }:{id:`otj-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type:"",date:todayISO(),area:"",topic:"",durationMinutes:60,learned:"",createdAt:Date.now()};
  renderStep(1);
}
function recordBack(step){if(step<=1){if(returnEntryId)viewEntry(returnEntryId);else main();return}renderStep(step-1)}
function choiceRows(items,selected,attr){return items.map(item=>{const label=Array.isArray(item)?item[0]:item,desc=Array.isArray(item)?item[1]:"";return `<button class="evia-otj-choice ${selected===label?"on":""}" ${attr}="${esc(label)}"><span><b>${esc(label)}</b>${desc?`<small>${esc(desc)}</small>`:""}</span><i>${selected===label?"✓":""}</i></button>`}).join("")}

function renderStep(step){
  if(!draft)return main();
  let body="";
  if(step===1)body=`<div class="evia-otj-step">1 of 5</div><h2>What type of learning was it?</h2><p class="evia-tools-copy">Choose the closest one. Routine productive work on its own does not count.</p><div class="evia-otj-choices">${choiceRows(TYPES,draft.type,"data-type")}</div><button class="evia-tools-primary" data-next ${draft.type?"":"disabled"}>Continue</button>`;
  else if(step===2)body=`<div class="evia-otj-step">2 of 5</div><h2>What were you learning about?</h2><p class="evia-tools-copy">Pick one broad area. Evia will only show a short relevant list next.</p><div class="evia-otj-choices">${choiceRows(Object.keys(AREAS),draft.area,"data-area")}</div><button class="evia-tools-primary" data-next ${draft.area?"":"disabled"}>Continue</button>`;
  else if(step===3){const topics=(AREAS[draft.area]||[]).map(x=>x[0]);body=`<div class="evia-otj-step">3 of 5</div><h2>Which part?</h2><p class="evia-tools-copy">Choose the topic closest to the learning you actually did.</p><div class="evia-otj-choices">${choiceRows(topics,draft.topic,"data-topic")}</div><button class="evia-tools-primary" data-next ${draft.topic?"":"disabled"}>Continue</button>`}
  else if(step===4){const h=Math.floor(draft.durationMinutes/60),m=draft.durationMinutes%60;body=`<div class="evia-otj-step">4 of 5</div><h2>When and how long?</h2><p class="evia-tools-copy">Record the actual learning time. Do not include breaks, travel or ordinary work.</p><div class="evia-otj-form"><label>Date<input data-date type="date" value="${esc(draft.date)}"></label><div class="evia-otj-two"><label>Hours<input data-hours type="number" min="0" max="24" step="1" inputmode="numeric" value="${h}"></label><label>Minutes<input data-minutes type="number" min="0" max="59" step="1" inputmode="numeric" value="${m}"></label></div></div><button class="evia-tools-primary" data-next>Continue</button>`}
  else if(step===5)body=`<div class="evia-otj-step">5 of 5</div><h2>What did you learn?</h2><p class="evia-tools-copy">One short sentence in your own words is enough. Evia will not add anything you did not say.</p><textarea class="evia-otj-text" data-learned spellcheck="true" placeholder="Write what you learned…">${esc(draft.learned)}</textarea><div class="evia-otj-info">Your device can suggest spelling corrections. The saved learning statement remains your own words.</div><button class="evia-tools-primary" data-review ${draft.learned.trim()?"":"disabled"}>Review entry</button>`;
  const el=layer(body,"Record OTJ",()=>recordBack(step));
  el.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{draft.type=b.dataset.type;renderStep(1)});
  el.querySelectorAll("[data-area]").forEach(b=>b.onclick=()=>{if(draft.area!==b.dataset.area)draft.topic="";draft.area=b.dataset.area;renderStep(2)});
  el.querySelectorAll("[data-topic]").forEach(b=>b.onclick=()=>{draft.topic=b.dataset.topic;renderStep(3)});
  const next=el.querySelector("[data-next]");
  if(next)next.onclick=()=>{
    if(step===4){draft.date=el.querySelector("[data-date]")?.value||todayISO();const h=Math.max(0,Math.round(Number(el.querySelector("[data-hours]")?.value)||0)),m=Math.max(0,Math.min(59,Math.round(Number(el.querySelector("[data-minutes]")?.value)||0)));draft.durationMinutes=h*60+m;if(draft.durationMinutes<=0){showMessage(el,"Add the actual learning time before continuing.");return}}
    renderStep(step+1);
  };
  const ta=el.querySelector("[data-learned]");
  if(ta)ta.oninput=()=>{draft.learned=ta.value;const b=el.querySelector("[data-review]");if(b)b.disabled=!draft.learned.trim()};
  const review=el.querySelector("[data-review]");if(review)review.onclick=()=>{draft.learned=(ta?.value||"").trim();if(draft.learned)reviewEntry()};
}
function showMessage(el,text){let x=el.querySelector(".evia-otj-error");if(!x){x=document.createElement("div");x.className="evia-otj-error";el.querySelector(".evia-tools-body")?.appendChild(x)}if(x)x.textContent=text}

function reviewEntry(){
  const codes=topicCodes(draft.area,draft.topic);
  const el=layer(`<div class="evia-otj-step">Review</div><h2>Check your OTJ entry</h2><p class="evia-tools-copy">Evia has only arranged the information you selected and wrote.</p><div class="evia-otj-review"><small>${esc(draft.type)}</small><h3>${esc(draft.area)} — ${esc(draft.topic)}</h3><div class="evia-otj-learned"><span>What I learned</span><p>${esc(draft.learned)}</p></div><footer>${esc(formatDate(draft.date))} · ${formatMinutes(draft.durationMinutes)}</footer></div><button class="evia-tools-primary" data-save-entry>Save OTJ</button><button class="evia-tools-secondary" data-edit-learning>Edit</button>`,"Review OTJ",()=>renderStep(5));
  el.querySelector("[data-save-entry]").onclick=()=>{
    const all=entries(),index=all.findIndex(e=>e.id===draft.id),item={id:draft.id,type:draft.type,date:draft.date,area:draft.area,topic:draft.topic,durationMinutes:draft.durationMinutes,hours:Number((draft.durationMinutes/60).toFixed(2)),learned:draft.learned,codes,createdAt:draft.createdAt,updatedAt:Date.now()};
    if(index>=0)all[index]=item;else all.push(item);writeJSON(ENTRY_KEY,all);patchArch();saved();
  };
  el.querySelector("[data-edit-learning]").onclick=()=>renderStep(1);
}
function saved(){const el=layer(`<div class="evia-otj-saved"><div>✓</div><h2>OTJ saved</h2><p class="evia-tools-copy">It has been added to the learner-recorded OTJ total.</p><button class="evia-tools-primary" data-back-main>Back to off the job</button></div>`,"Off the job",main);el.querySelector("[data-back-main]").onclick=main}
function viewEntry(id){const e=entries().find(x=>String(x.id||"")===String(id||""));if(!e)return main();const el=layer(`<p class="evia-tools-kicker">Learner-recorded OTJ</p><h2>${esc(e.topic||"Off-the-job learning")}</h2><p class="evia-tools-copy">${esc(e.type||"Learning")} · ${esc(e.area||"")}</p><div class="evia-otj-review"><div class="evia-otj-learned"><span>What I learned</span><p>${esc(e.learned||e.description||e.whatLearned||"")}</p></div><footer>${esc(formatDate(e.date))} · ${formatMinutes(entryMinutes(e))}</footer></div><button class="evia-tools-primary" data-edit-entry>Edit entry</button><button class="evia-tools-secondary evia-otj-delete" data-delete-entry>Delete entry</button>`,"OTJ entry",main);el.querySelector("[data-edit-entry]").onclick=()=>startRecord(e);el.querySelector("[data-delete-entry]").onclick=()=>confirmDelete(e)}
function confirmDelete(e){const el=layer(`<h2>Delete this OTJ entry?</h2><p class="evia-tools-copy">${esc(e.topic||"This learning record")} · ${formatMinutes(entryMinutes(e))}. This will reduce the learner-recorded OTJ total.</p><div class="evia-warning">This action cannot be undone.</div><button class="evia-tools-primary evia-otj-danger" data-confirm-delete>Delete entry</button><button class="evia-tools-secondary" data-cancel-delete>Cancel</button>`,"Delete OTJ",()=>viewEntry(e.id));el.querySelector("[data-cancel-delete]").onclick=()=>viewEntry(e.id);el.querySelector("[data-confirm-delete]").onclick=()=>{writeJSON(ENTRY_KEY,entries().filter(x=>x.id!==e.id));patchArch();main()}}

document.addEventListener("click",e=>{
  const button=e.target.closest?.('[data-arch="OTJ"]');
  if(!button)return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  try{main()}catch(err){errorScreen(err)}
},true);

window.addEventListener("load",patchArch);
window.addEventListener("pageshow",patchArch);
window.addEventListener("storage",e=>{if(e.key===ENTRY_KEY||e.key===COLLEGE_KEY||e.key===TIMELINE_KEY)patchArch()});
setTimeout(patchArch,250);
window.EviaOTJ={open:()=>{try{main()}catch(err){errorScreen(err)}},refresh:patchArch};
})();