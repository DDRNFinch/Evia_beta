(()=>{
"use strict";
const COURSE_ID="6570-05";
const LAYER_CLASS="evia-6570-qa-layer";

function ctx(){
  const c=window.EviaCourseContext?.current?.();
  return c&&String(c.courseId||"")===COURSE_ID?c:null
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function wrapContext(){
  const api=window.EviaCourseContext;
  if(!api||typeof api.current!=="function"||api.__evia6570QaWrapped)return;
  const current=api.current.bind(api);
  api.current=function(){
    const c=current();
    if(!c||String(c.courseId||"")!==COURSE_ID)return c;
    return c.fourthLabel==="Q&A"?c:{...c,fourthLabel:"Q&A",epaConfigured:false}
  };
  api.__evia6570QaWrapped=true
}
function patchArch(){
  const c=ctx();
  document.body?.classList.toggle("evia-6570-qa",!!c);
  if(!c)return;
  const b=document.querySelector('.progress-arch[data-arch="Units"],.progress-arch[data-arch="EPA"],.progress-arch[data-arch="Q&A"]');
  if(!b)return;
  b.dataset.arch="Q&A";
  b.setAttribute("aria-label","Q&A mock tests. Open Q&A details");
  const lab=b.querySelector(".arch-label"),num=b.querySelector(".arch-number"),path=b.querySelector(".arch-value");
  if(lab){if(lab.firstChild)lab.firstChild.nodeValue="Q&A";else lab.append("Q&A")}
  if(num){if(num.firstChild)num.firstChild.nodeValue="0%";else num.append("0%")}
  if(path)path.setAttribute("stroke-dasharray","0 100")
}
function close(){document.querySelector(`.${LAYER_CLASS}`)?.remove()}
function openQA(){
  const c=ctx();if(!c)return;
  close();
  const el=document.createElement("div");
  el.className=`evia-tools-layer ${LAYER_CLASS}`;
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-qa-back>‹ Back</button><b>Q&amp;A</b><span></span></div><div class="evia-tools-body"><p class="evia-tools-kicker">Assessment criteria practice</p><h2>Q&amp;A</h2><p class="evia-tools-copy">Mock tests will use the official ACs from ${esc(c.pathwayTitle||"the selected Trowel Occupations route")}. This qualification does not use an EPA.</p><div class="evia-nvq-overall"><strong>${Number(c.codes?.length)||0}</strong><span>ACs available for mock-test questions</span></div></div></section>`;
  document.body.appendChild(el);
  el.querySelector("[data-qa-back]").onclick=close
}

wrapContext();
document.addEventListener("click",e=>{
  if(!ctx())return;
  const b=e.target instanceof Element?e.target.closest('.progress-arch[data-arch="Q&A"],.progress-arch[data-arch="Units"],.progress-arch[data-arch="EPA"]'):null;
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();openQA()
},true);
function ready(){wrapContext();patchArch();const root=document.getElementById("root");if(root&&!root.__evia6570QaObserver){root.__evia6570QaObserver=true;setTimeout(()=>new MutationObserver(()=>requestAnimationFrame(patchArch)).observe(root,{childList:true,subtree:true}),120)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("load",()=>setTimeout(patchArch,120));
window.addEventListener("pageshow",()=>setTimeout(patchArch,0));
})();
