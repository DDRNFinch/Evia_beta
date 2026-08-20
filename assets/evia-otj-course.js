(()=>{
"use strict";
const ENTRY_KEY="evia-otj-entries",COLLEGE_KEY="evia-otj-college-v1",TIMELINE_KEY="evia-course-timeline";
function ctx(){return window.EviaCourseContext?.current?.()}
function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function mins(e){if(Number.isFinite(Number(e?.durationMinutes)))return Math.max(0,Math.round(Number(e.durationMinutes)));return Math.max(0,Math.round((Number(e?.hours)||0)*60))}
function known(){
  const es=read(ENTRY_KEY,[]),c=read(COLLEGE_KEY,{});
  const learner=(Array.isArray(es)?es:[]).reduce((n,e)=>n+mins(e),0);
  return learner+Math.max(0,Math.round(Number(c?.hours)||0))*60+Math.max(0,Math.min(59,Math.round(Number(c?.minutes)||0)))
}
function fmt(total){const n=Math.max(0,Math.round(total||0)),h=Math.floor(n/60),m=n%60;return m?`${h}h ${m}m`:`${h}h`}
function pace(minimum){
  const t=read(TIMELINE_KEY,{}),s=Date.parse(`${t?.startDate||""}T00:00:00`),e=Date.parse(`${t?.endDate||""}T00:00:00`);
  if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s)return null;
  const fraction=Math.max(0,Math.min(1,(Date.now()-s)/(e-s))),expected=Math.round(minimum*60*fraction),actual=known(),diff=actual-expected;
  let status="On track with the current pace guide";
  if(diff<-30)status=`${fmt(Math.abs(diff))} below the current pace guide`;
  else if(diff>30)status=`${fmt(diff)} ahead of the current pace guide`;
  return{fraction,expected,status}
}
function patch(){
  const c=ctx();if(!c||c.courseId!=="st0264-v1-4")return;
  const minimum=Number(c.otjMinimumHours)||557,total=document.querySelector(".evia-otj-total");
  if(total){const span=total.querySelector("span");if(span)span.textContent=`of ${minimum}h minimum`}
  const card=document.querySelector(".evia-otj-pace"),p=pace(minimum);
  if(card){
    if(!p)card.innerHTML="<b>Expected by now</b><strong>Set your course dates</strong><span>Add your start and planned end date in TOC to see an OTJ pace guide.</span>";
    else card.innerHTML=`<b>Expected by now</b><strong>${fmt(p.expected)}</strong><span>${Math.round(p.fraction*100)}% through planned course time · ${p.status}. Based only on OTJ currently recorded in Evia.</span>`
  }
}
document.addEventListener("click",e=>{if(e.target.closest?.('[data-arch="OTJ"],.evia-otj-layer'))setTimeout(patch,0)},true);
window.addEventListener("load",()=>setTimeout(patch,0));
window.addEventListener("pageshow",()=>setTimeout(patch,0));
})();