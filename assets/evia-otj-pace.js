(()=>{
"use strict";
const ENTRY_KEY="evia-otj-entries",COLLEGE_KEY="evia-otj-college-v1",TIMELINE_KEY="evia-course-timeline",MINUTES=578*60;
let patching=false;
function read(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x??fallback}catch{return fallback}}
function fmt(total){const n=Math.max(0,Math.round(total||0)),h=Math.floor(n/60),m=n%60;return m?`${h}h ${m}m`:`${h}h`}
function known(){
  const es=read(ENTRY_KEY,[]),c=read(COLLEGE_KEY,{});
  const learner=(Array.isArray(es)?es:[]).reduce((n,e)=>n+(Number.isFinite(Number(e?.durationMinutes))?Number(e.durationMinutes):Math.round((Number(e?.hours)||0)*60)),0);
  return learner+(Math.max(0,Number(c?.hours)||0)*60)+Math.max(0,Math.min(59,Number(c?.minutes)||0));
}
function position(){
  const t=read(TIMELINE_KEY,{}),s=Date.parse(`${t?.startDate||""}T00:00:00`),e=Date.parse(`${t?.endDate||""}T00:00:00`),now=Date.now();
  if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s)return null;
  const fraction=Math.max(0,Math.min(1,(now-s)/(e-s)));
  return{fraction,expected:Math.round(MINUTES*fraction)};
}
function desiredMarkup(){
  const p=position();
  if(!p)return "<b>Expected by now</b><strong>Set your course dates</strong><span>Add your start and planned end date in TOC to see an OTJ pace guide.</span>";
  const actual=known(),diff=actual-p.expected,abs=Math.abs(diff),pct=Math.round(p.fraction*100);
  let status="On track with the current pace guide";
  if(diff<-30)status=`${fmt(abs)} below the current pace guide`;
  else if(diff>30)status=`${fmt(abs)} ahead of the current pace guide`;
  return `<b>Expected by now</b><strong>${fmt(p.expected)}</strong><span>${pct}% through planned course time · ${status}. Based only on OTJ currently recorded in Evia.</span>`;
}
function patch(){
  if(patching)return;
  const summary=document.querySelector(".evia-otj-summary");
  if(!summary)return;
  patching=true;
  try{
    let card=summary.querySelector(".evia-otj-pace");
    if(!card){
      card=document.createElement("div");
      card.className="evia-otj-pace";
      const metrics=summary.querySelector(".evia-otj-metrics");
      summary.insertBefore(card,metrics||summary.lastElementChild);
    }
    const next=desiredMarkup();
    if(card.innerHTML!==next)card.innerHTML=next;
  }finally{patching=false}
}
let queued=false;
function queuePatch(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;patch()});
}
const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>Array.from(m.addedNodes||[]).some(n=>n.nodeType===1&&(n.matches?.(".evia-otj-summary")||n.querySelector?.(".evia-otj-summary")))))queuePatch();
});
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener("load",queuePatch);
window.addEventListener("pageshow",queuePatch);
window.addEventListener("storage",e=>{if([ENTRY_KEY,COLLEGE_KEY,TIMELINE_KEY].includes(e.key))queuePatch()});
document.addEventListener("click",e=>{if(e.target.closest?.('[data-arch="OTJ"]'))setTimeout(queuePatch,0)},true);
setTimeout(queuePatch,250);
})();
