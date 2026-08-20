(()=>{
"use strict";
const ENTRY_KEY="evia-otj-entries";
const COLLEGE_KEY="evia-otj-college-v1";
function minimumMinutes(){const h=Number(window.EviaCourseContext?.current?.()?.otjMinimumHours)||578;return Math.max(1,h)*60}
function read(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function entryMinutes(entry){
  if(!entry||typeof entry!=="object")return 0;
  if(entry.durationMinutes!==undefined&&entry.durationMinutes!==null&&Number.isFinite(Number(entry.durationMinutes)))return Math.max(0,Math.round(Number(entry.durationMinutes)));
  if(Number.isFinite(Number(entry.hours)))return Math.max(0,Math.round(Number(entry.hours)*60));
  return 0
}
function currentMinutes(){
  const entries=read(ENTRY_KEY,[]);
  const learner=(Array.isArray(entries)?entries:[]).reduce((sum,entry)=>sum+entryMinutes(entry),0);
  const raw=read(COLLEGE_KEY,{}),college=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const collegeMinutes=Math.max(0,Math.round(Number(college.hours)||0))*60+Math.max(0,Math.min(59,Math.round(Number(college.minutes)||0)));
  return learner+collegeMinutes
}
function percentage(){return Math.round(Math.max(0,Math.min(1,currentMinutes()/minimumMinutes()))*100)}
function patch(){
  const pct=percentage(),dash=`${pct} 100`,text=`${pct}%`;
  document.querySelectorAll('[data-arch="OTJ"]').forEach(button=>{
    const path=button.querySelector(".arch-value"),number=button.querySelector(".arch-number");
    if(path&&path.getAttribute("stroke-dasharray")!==dash)path.setAttribute("stroke-dasharray",dash);
    if(number&&number.textContent!==text)number.textContent=text
  })
}
function observeRoot(){const root=document.getElementById("root");if(!root)return;new MutationObserver(()=>requestAnimationFrame(patch)).observe(root,{childList:true})}
window.addEventListener("load",patch);
window.addEventListener("pageshow",patch);
window.addEventListener("focus",patch);
window.addEventListener("storage",e=>{if(e.key===ENTRY_KEY||e.key===COLLEGE_KEY)patch()});
document.addEventListener("click",()=>setTimeout(patch,0),true);
document.addEventListener("change",()=>setTimeout(patch,0),true);
observeRoot();setTimeout(patch,0);setTimeout(patch,250);
})();