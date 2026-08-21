(()=>{
"use strict";

const TIMELINE_KEY="evia-course-timeline";
const NAME_KEY="evia-full-name";
const BUILTIN_COURSES=[
  {id:"st0095-v1-2",title:"Bricklayer — ST0095 v1.2",shortTitle:"Bricklayer",standard:"ST0095 v1.2",choiceLabel:"",pathways:[],builtIn:true},
  {id:"st0264-v1-4",title:"Carpentry & Joinery — ST0264 v1.4",shortTitle:"Carpentry & Joinery",standard:"ST0264 v1.4",choiceLabel:"Pathway",pathways:[
    {id:"site-carpenter",title:"Site Carpenter"},
    {id:"architectural-joiner",title:"Architectural Joiner"}
  ],builtIn:true},
  {id:"6570-05",title:"Trowel Occupations Level 3 — 6570-05",shortTitle:"Trowel Occupations",standard:"6570-05",choiceLabel:"Optional unit",pathways:[
    {id:"thin",title:"238 · Thin joint masonry"},
    {id:"repair",title:"690 · Repairing & maintaining masonry"},
    {id:"specialist",title:"828 · Specialist masonry elements"},
    {id:"drainage",title:"837 · Drainage"}
  ],builtIn:true}
];
const COURSE_QR_CODES=[
  {name:"Bricklayer",code:"ST0095",file:"ST0095.png"},
  {name:"Site Carpenter",code:"ST0264-SITE",file:"ST0264-SITE.png"},
  {name:"Architectural Joiner",code:"ST0264-AJ",file:"ST0264-AJ.png"},
  {name:"Thin Joint",code:"6570-05-THIN",file:"6570-05-THIN.png"},
  {name:"Repair & Maintenance",code:"6570-05-REPAIR",file:"6570-05-REPAIR.png"},
  {name:"Specialist Masonry",code:"6570-05-SPECIALIST",file:"6570-05-SPECIALIST.png"},
  {name:"Drainage",code:"6570-05-DRAINAGE",file:"6570-05-DRAINAGE.png"}
];

function readJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function currentName(){return String(localStorage.getItem(NAME_KEY)||"").trim()}
function rawTimeline(){const x=readJSON(TIMELINE_KEY,{});return x&&typeof x==="object"?x:{}}
function installedCourses(){return window.EviaCoursePacks?.courseOptions?.()||[]}
function allCourses(){
  const by=new Map(BUILTIN_COURSES.map(c=>[c.id,c]));
  installedCourses().forEach(c=>by.set(c.id,c));
  return [...by.values()]
}
function selectedCourse(x=rawTimeline()){return allCourses().find(c=>c.id===x.courseId)||null}
function hasSelectedCourse(){
  const x=rawTimeline(),course=selectedCourse(x);if(!course)return false;
  if(!course.pathways.length)return true;
  return course.pathways.some(p=>p.id===x.pathway)
}
function currentTimeline(){
  const x=rawTimeline(),courses=allCourses(),course=selectedCourse(x)||courses[0]||BUILTIN_COURSES[0];
  const pathway=course.pathways.find(p=>p.id===x.pathway)||course.pathways[0]||null;
  return{
    courseId:course.id,courseTitle:course.title,pathway:pathway?.id||"",pathwayTitle:pathway?.title||"",
    startDate:String(x.startDate||""),endDate:String(x.endDate||""),updatedAt:Number(x.updatedAt)||0
  }
}
function courseHeader(t=currentTimeline()){
  if(!hasSelectedCourse())return "Choose your course";
  const course=selectedCourse(t);
  if(course?.installedPack){
    const lead=t.pathwayTitle||course.shortTitle||course.title;
    return `${lead}${course.standard?` · ${course.standard}`:""}`
  }
  if(t.courseId==="st0264-v1-4")return `${t.pathwayTitle||"Carpentry & Joinery"} · ST0264 v1.4`;
  if(t.courseId==="6570-05")return "Trowel Occupations · 6570-05";
  return "Bricklayer · ST0095 v1.2"
}
function fullCourseLine(t=currentTimeline()){return t.pathwayTitle?`${t.courseTitle} · ${t.pathwayTitle}`:t.courseTitle}
function parseDay(value){
  const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;
  const y=Number(m[1]),mo=Number(m[2])-1,d=Number(m[3]),ms=Date.UTC(y,mo,d),date=new Date(ms);
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==mo||date.getUTCDate()!==d)return null;return ms
}
function todayDay(){const d=new Date();return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())}
function daysInUTCMonth(year,month){return new Date(Date.UTC(year,month+1,0)).getUTCDate()}
function addMonthsClamped(dayMs,months){
  const d=new Date(dayMs),day=d.getUTCDate(),baseMonth=d.getUTCMonth()+months;
  const year=d.getUTCFullYear()+Math.floor(baseMonth/12),month=((baseMonth%12)+12)%12;
  return Date.UTC(year,month,Math.min(day,daysInUTCMonth(year,month)))
}
function calendarDiff(fromMs,toMs){
  if(fromMs===null||toMs===null||toMs<=fromMs)return{months:0,days:Math.max(0,Math.round(((toMs||0)-(fromMs||0))/86400000))};
  const a=new Date(fromMs),b=new Date(toMs);let months=(b.getUTCFullYear()-a.getUTCFullYear())*12+(b.getUTCMonth()-a.getUTCMonth()),anchor=addMonthsClamped(fromMs,months);
  if(anchor>toMs){months--;anchor=addMonthsClamped(fromMs,months)}
  return{months:Math.max(0,months),days:Math.max(0,Math.round((toMs-anchor)/86400000))}
}
function formatSpan(span){const m=span.months,d=span.days;return`${m} month${m===1?"":"s"} · ${d} day${d===1?"":"s"}`}
function formatDate(value){const ms=parseDay(value);if(ms===null)return"Not set";return new Date(ms).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})}
function coursePosition(t=currentTimeline()){
  const start=parseDay(t.startDate),end=parseDay(t.endDate),today=todayDay();
  if(start===null||end===null||end<=start)return{valid:false,pct:0,on:{months:0,days:0},remaining:{months:0,days:0}};
  const elapsedEnd=Math.min(Math.max(today,start),end),remainingStart=Math.min(Math.max(today,start),end),total=end-start;
  const pct=today<=start?0:today>=end?100:Math.round((today-start)/total*100);
  return{valid:true,pct,on:calendarDiff(start,elapsedEnd),remaining:calendarDiff(remainingStart,end)}
}
function patchArch(){
  const pos=coursePosition();
  document.querySelectorAll('[data-arch="TOC"]').forEach(button=>{
    const path=button.querySelector(".arch-value"),number=button.querySelector(".arch-number");
    if(path&&path.getAttribute("stroke-dasharray")!==`${pos.pct} 100`)path.setAttribute("stroke-dasharray",`${pos.pct} 100`);
    if(number&&number.textContent!==`${pos.pct}%`)number.textContent=`${pos.pct}%`
  })
}
function patchHeader(){
  const label=courseHeader();
  document.querySelectorAll(".self-top small").forEach(el=>{if(el.textContent!==label)el.textContent=label})
}
function closeLayer(){document.querySelector(".evia-toc-layer")?.remove()}
function layer(body,title="My course",back=null){
  closeLayer();document.querySelector(".evia-tools-layer")?.remove();
  const el=document.createElement("div");el.className="evia-tools-layer evia-toc-layer evia-toc";
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-toc-back>‹ Back</button><b>${esc(title)}</b><span></span></div><div class="evia-tools-body">${body}</div></section>`;
  document.body.appendChild(el);el.querySelector("[data-toc-back]").onclick=back||closeLayer;return el
}
function openPackManager(back=null){if(window.EviaCoursePacks?.manager)window.EviaCoursePacks.manager(back)}
async function copyCourseCode(code,status){
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(code);
    else{
      const input=document.createElement("textarea");input.value=code;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";
      document.body.appendChild(input);input.select();document.execCommand("copy");input.remove()
    }
    if(status)status.textContent=`${code} copied.`
  }catch{if(status)status.textContent=`Course code: ${code}`}
}
function openQrCodes(back=summary){
  const cards=COURSE_QR_CODES.map(item=>{
    const href=`./course-delivery/qr/${encodeURIComponent(item.file)}`;
    return `<article class="evia-course-qr-card">
      <a class="evia-course-qr-image" href="${href}" download="${esc(item.file)}" aria-label="Download ${esc(item.name)} QR code">
        <img src="${href}" alt="${esc(item.name)} course QR code" loading="lazy" decoding="async" draggable="false">
      </a>
      <div class="evia-course-qr-copy"><b>${esc(item.name)}</b><code>${esc(item.code)}</code></div>
      <div class="evia-course-qr-actions">
        <a href="${href}" download="${esc(item.file)}">Download</a>
        <button type="button" data-copy-course-code="${esc(item.code)}">Copy code</button>
      </div>
    </article>`
  }).join("");
  const el=layer(`
    <p class="evia-tools-kicker">Course enrolment</p>
    <h2>Course QR Codes</h2>
    <p class="evia-tools-copy">Download a labelled QR for a learner, or copy the manual course code underneath it.</p>
    <div class="evia-course-qr-status" data-course-qr-status aria-live="polite"></div>
    <div class="evia-course-qr-grid">${cards}</div>
    ${window.EviaCoursePacks?'<button type="button" class="evia-tools-secondary" data-qr-manage-packs>Manage installed packs</button>':""}
  `,"Course QR Codes",back);
  const status=el.querySelector("[data-course-qr-status]");
  el.querySelectorAll("[data-copy-course-code]").forEach(button=>button.addEventListener("click",()=>copyCourseCode(button.dataset.copyCourseCode,status)));
  el.querySelector("[data-qr-manage-packs]")?.addEventListener("click",()=>openPackManager(()=>{document.querySelector(".nisi-pack-layer")?.remove();openQrCodes(back)}))
}
function summary(){
  if(!hasSelectedCourse())return edit(true);
  const t=currentTimeline(),pos=coursePosition(t),name=currentName()||"Name not set";if(!pos.valid)return edit(false);
  const el=layer(`
    <p class="evia-tools-kicker">Time on course</p>
    <div class="evia-toc-hero"><strong>${pos.pct}%</strong><span>through planned course time</span></div>
    <div class="evia-toc-profile"><b>${esc(name)}</b><span>${esc(fullCourseLine(t))}</span></div>
    <div class="evia-toc-details">
      <div><span>Start date</span><b>${esc(formatDate(t.startDate))}</b></div>
      <div><span>Planned end date</span><b>${esc(formatDate(t.endDate))}</b></div>
      <div class="wide"><span>Time on course</span><b>${esc(formatSpan(pos.on))}</b></div>
      <div class="wide"><span>Time remaining</span><b>${esc(formatSpan(pos.remaining))}</b></div>
    </div>
    <button class="evia-tools-primary" data-edit-course>Edit course details</button>
    <button class="evia-tools-secondary" data-course-qr-codes>Course QR Codes</button>
  `,"My course",closeLayer);
  el.querySelector("[data-edit-course]").onclick=()=>edit(false);
  el.querySelector("[data-course-qr-codes]")?.addEventListener("click",()=>openQrCodes(summary))
}
function courseSelectorMarkup(t){
  const courses=allCourses();
  const courseOptions=courses.map(c=>`<option value="${esc(c.id)}" ${c.id===t.courseId?"selected":""}>${esc(c.title)}${c.installedPack?" · Installed":""}</option>`).join("");
  return{
    courseOptions,
    fields:`<label>Course<select data-toc-course>${courseOptions}</select></label>
      <label data-toc-pathway-wrap hidden><span data-toc-pathway-label>Pathway</span><select data-toc-pathway></select></label>`
  }
}
function bindCourseFields(el){
  const courseSelect=el.querySelector("[data-toc-course]"),pathwayWrap=el.querySelector("[data-toc-pathway-wrap]"),pathwayLabel=el.querySelector("[data-toc-pathway-label]"),pathwaySelect=el.querySelector("[data-toc-pathway]");
  let preferred=currentTimeline().pathway;
  function sync(){
    if(!courseSelect)return;
    const courses=allCourses(),course=courses.find(c=>c.id===courseSelect.value)||courses[0]||BUILTIN_COURSES[0],hasChoices=course.pathways.length>0;
    if(pathwayWrap)pathwayWrap.hidden=!hasChoices;
    if(pathwayLabel)pathwayLabel.textContent=course.choiceLabel||"Pathway";
    if(pathwaySelect){
      const previous=course.pathways.some(p=>p.id===pathwaySelect.value)?pathwaySelect.value:preferred;
      pathwaySelect.innerHTML=course.pathways.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join("");
      const chosen=course.pathways.find(p=>p.id===previous)||course.pathways[0]||null;
      if(chosen)pathwaySelect.value=chosen.id
    }
    preferred=pathwaySelect?.value||""
  }
  if(courseSelect){courseSelect.onchange=sync;sync()}
  return{courseSelect,pathwaySelect}
}
function edit(initialSetup=false){
  const t=currentTimeline(),name=currentName(),selector=courseSelectorMarkup(t);
  const courseFields=initialSetup?selector.fields:`<label>Course<input type="text" value="${esc(fullCourseLine(t))}" readonly tabindex="-1" aria-readonly="true"></label>`;
  const copy=initialSetup?"Choose an installed course or add a Nisi course pack from your induction email. Evia keeps each course and its learner data separate.":"Update your learner details or planned course dates. Your enrolled course stays the same.";
  const packInstall=initialSetup&&window.EviaCoursePacks?`<div class="nisi-pack-inline"><button type="button" class="evia-tools-secondary" data-toc-packs>Install a course pack</button></div>`:"";
  const el=layer(`
    <h2>${initialSetup?"Set up your course":"Course details"}</h2>
    <p class="evia-tools-copy">${esc(copy)}</p>
    <div class="evia-toc-form">
      <label>Full name<input data-toc-name type="text" autocomplete="name" value="${esc(name)}" placeholder="Your full name"></label>
      ${courseFields}
      <label>Start date<input data-toc-start type="date" value="${esc(t.startDate)}"></label>
      <label>Planned end date<input data-toc-end type="date" value="${esc(t.endDate)}"></label>
    </div>
    <div class="evia-toc-error" data-toc-error aria-live="polite"></div>
    <button class="evia-tools-primary" data-save-course>${initialSetup?"Save my course":"Save course details"}</button>${packInstall}
  `,initialSetup?"Choose your course":"My course",hasSelectedCourse()&&t.startDate&&t.endDate?summary:closeLayer);
  const fields=initialSetup?bindCourseFields(el):{courseSelect:null,pathwaySelect:null};
  el.querySelector("[data-toc-packs]")?.addEventListener("click",()=>openPackManager(()=>{document.querySelector(".nisi-pack-layer")?.remove();edit(initialSetup)}));
  el.querySelector("[data-save-course]").onclick=()=>{
    const fullName=el.querySelector("[data-toc-name]").value.trim(),courseId=initialSetup?fields.courseSelect.value:t.courseId,startDate=el.querySelector("[data-toc-start]").value,endDate=el.querySelector("[data-toc-end]").value,error=el.querySelector("[data-toc-error]");
    const start=parseDay(startDate),end=parseDay(endDate);if(!fullName){error.textContent="Enter the learner's full name.";return}
    if(start===null||end===null){error.textContent="Enter both the start date and planned end date.";return}
    if(end<=start){error.textContent="The planned end date must be after the start date.";return}
    const courses=allCourses(),course=courses.find(c=>c.id===courseId)||courses[0]||BUILTIN_COURSES[0],selectedPathway=initialSetup?fields.pathwaySelect?.value:t.pathway,pathway=course.pathways.find(p=>p.id===selectedPathway)||course.pathways[0]||null;
    localStorage.setItem(NAME_KEY,fullName);
    writeJSON(TIMELINE_KEY,{courseId:course.id,courseTitle:course.title,pathway:pathway?.id||"",pathwayTitle:pathway?.title||"",startDate,endDate,updatedAt:Date.now()});
    patchHeader();patchArch();
    if(initialSetup){closeLayer();setTimeout(()=>location.reload(),120)}else summary()
  }
}
function adminMainLayer(){
  return [...document.querySelectorAll(".evia-tools-layer.admin")].find(el=>el.querySelector(".evia-tools-body h2")?.textContent.trim()==="Admin mode")||null
}
function patchAdmin(){
  const admin=adminMainLayer();if(!admin)return;
  const body=admin.querySelector(".evia-tools-body");if(!body)return;
  const copy=body.querySelector(".evia-tools-copy");
  if(copy)copy.textContent="Manage this learner's course, recognised prior learning or app data on this device.";
  let row=body.querySelector("[data-admin-course]");
  if(!row){
    row=document.createElement("button");row.type="button";row.className="evia-tools-row";row.setAttribute("data-admin-course","");
    const before=body.querySelector("[data-admin-rpl]")||body.querySelector(".evia-tools-row");
    if(before)body.insertBefore(row,before);else body.appendChild(row)
  }
  row.innerHTML=`<span><b>Course setup</b><small>${esc(courseHeader())}</small></span><i>›</i>`;
  row.onclick=()=>openAdminCourse(admin);
  if(window.EviaCoursePacks){
    let packs=body.querySelector("[data-admin-packs]");
    if(!packs){
      packs=document.createElement("button");packs.type="button";packs.className="evia-tools-row";packs.setAttribute("data-admin-packs","");
      row.insertAdjacentElement("afterend",packs)
    }
    const count=window.EviaCoursePacks.list().length;
    packs.innerHTML=`<span><b>Installed course packs</b><small>${count} imported on this device · add, replace or remove</small></span><i>›</i>`;
    packs.onclick=()=>{admin.style.display="none";openPackManager(()=>{document.querySelector(".nisi-pack-layer")?.remove();admin.style.display="";patchAdmin()})}
  }
}
function openAdminCourse(admin){
  if(document.querySelector(".evia-admin-course-layer"))return;
  const t=currentTimeline(),selector=courseSelectorMarkup(t);
  admin.style.display="none";
  const layer=document.createElement("div");layer.className="evia-tools-layer evia-admin-course-layer";
  layer.innerHTML=`<section class="evia-tools-screen">
    <div class="evia-tools-head"><button type="button" data-admin-course-back>‹ Back</button><b>Course setup</b><span></span></div>
    <div class="evia-tools-body">
      <p class="evia-tools-kicker">Admin mode</p>
      <h2>Course setup</h2>
      <p class="evia-tools-copy">Change which installed course Evia loads on this device for setup or app testing. Existing learner data for each course is kept separately.</p>
      <div class="evia-toc-form">${selector.fields}</div>
      <button class="evia-tools-primary" data-admin-course-save>Save course</button>
      ${window.EviaCoursePacks?'<button class="evia-tools-secondary" data-admin-course-packs>Manage installed packs</button>':""}
    </div>
  </section>`;
  document.body.appendChild(layer);
  const fields=bindCourseFields(layer);
  layer.querySelector("[data-admin-course-back]").onclick=()=>{layer.remove();admin.style.display="";patchAdmin()};
  layer.querySelector("[data-admin-course-packs]")?.addEventListener("click",()=>openPackManager(()=>{document.querySelector(".nisi-pack-layer")?.remove();layer.remove();admin.style.display="";openAdminCourse(admin)}));
  layer.querySelector("[data-admin-course-save]").onclick=()=>{
    const x=rawTimeline(),courses=allCourses(),course=courses.find(c=>c.id===fields.courseSelect.value)||courses[0]||BUILTIN_COURSES[0],pathway=course.pathways.find(p=>p.id===fields.pathwaySelect?.value)||course.pathways[0]||null;
    writeJSON(TIMELINE_KEY,{...x,courseId:course.id,courseTitle:course.title,pathway:pathway?.id||"",pathwayTitle:pathway?.title||"",updatedAt:Date.now()});
    patchHeader();layer.remove();admin.style.display="";setTimeout(()=>location.reload(),120)
  }
}
function maybeInitialSetup(){
  if(hasSelectedCourse()){
    const t=currentTimeline(),course=selectedCourse(t);
    if(course?.installedPack&&currentName()&&(parseDay(t.startDate)===null||parseDay(t.endDate)===null)){
      if(document.querySelector(".is-onboarding")||document.querySelector(".evia-toc-layer")||document.querySelector(".nisi-pack-layer"))return false;
      if(!document.querySelector(".selfobs.is-ready"))return false;
      edit(false)
    }
    return true
  }
  if(!currentName())return false;
  if(document.querySelector(".is-onboarding")||document.querySelector(".evia-toc-layer")||document.querySelector(".nisi-pack-layer"))return false;
  if(!document.querySelector(".selfobs.is-ready"))return false;
  edit(true);return true
}
document.addEventListener("click",e=>{
  const oldDev=e.target.closest?.("[data-course-dev]");
  if(oldDev){e.preventDefault();e.stopImmediatePropagation();return}
  const toc=e.target.closest?.('[data-arch="TOC"]');if(!toc)return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  if(!hasSelectedCourse()){edit(true);return}
  const t=currentTimeline();if(parseDay(t.startDate)===null||parseDay(t.endDate)===null)edit(false);else summary()
},true);
function ready(){
  patchArch();patchHeader();patchAdmin();maybeInitialSetup();
  const root=document.getElementById("root");
  if(root&&!root.__eviaCourseHeaderObserved){
    root.__eviaCourseHeaderObserved=true;
    new MutationObserver(()=>requestAnimationFrame(()=>{patchHeader();patchAdmin()})).observe(root,{childList:true})
  }
  if(document.body&&!document.body.__eviaAdminCourseObserved){
    document.body.__eviaAdminCourseObserved=true;
    new MutationObserver(()=>requestAnimationFrame(()=>{patchAdmin();patchHeader()})).observe(document.body,{childList:true})
  }
}
window.addEventListener("load",ready);
window.addEventListener("pageshow",()=>{patchArch();patchHeader();patchAdmin();maybeInitialSetup()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){patchArch();patchHeader();patchAdmin();maybeInitialSetup()}});
window.addEventListener("storage",e=>{if(e.key===TIMELINE_KEY||e.key===NAME_KEY){patchArch();patchHeader();patchAdmin()}});
setTimeout(ready,250);
let setupChecks=0;const setupTimer=setInterval(()=>{setupChecks++;if(maybeInitialSetup()||setupChecks>=30)clearInterval(setupTimer)},1000);
})();
