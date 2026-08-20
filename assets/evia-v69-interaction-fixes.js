(()=>{
"use strict";
const STYLE_ID="evia-v72-interaction-fixes-style";
const BUILTIN_LOOK=["evia-team-look-milos","evia-team-look-tinos","evia-team-look-symi","evia-team-look-center"];
const V72_LOOK=["evia-v72-look-milos","evia-v72-look-tinos","evia-v72-look-symi","evia-v72-look-center"];
let strokeTimer=null,lookTimers=[],lastTeamOpen=false;
let frozenChoices=[],freezeTimer=null;
function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement("style");s.id=STYLE_ID;s.textContent=`
/* Prevent Android/Google text selection popups on the app chrome and controls. */
.evia-app.selfobs,.evia-app.selfobs *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
.evia-app.selfobs input,.evia-app.selfobs textarea,.evia-app.selfobs select,.evia-app.selfobs [contenteditable="true"],.evia-app.selfobs [contenteditable=""]{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}
/* Neutralise the old delayed gaze so Evia has one gaze system only. */
.selfobs.evia-team-look-milos [data-evia] .evia-face,.selfobs.evia-team-look-tinos [data-evia] .evia-face,.selfobs.evia-team-look-symi [data-evia] .evia-face,.selfobs.evia-team-look-center [data-evia] .evia-face{translate:0 0!important;rotate:0deg!important}
.selfobs.evia-team-look-milos [data-evia] .evia-eyes,.selfobs.evia-team-look-tinos [data-evia] .evia-eyes,.selfobs.evia-team-look-symi [data-evia] .evia-eyes,.selfobs.evia-team-look-center [data-evia] .evia-eyes{transform:translate(0,0)!important}
/* One smooth immediate gaze sequence. */
.selfobs.evia-v72-gazing [data-evia] .evia-face{transition:translate .82s cubic-bezier(.16,1,.3,1),rotate .82s cubic-bezier(.16,1,.3,1),filter .32s ease!important}
.selfobs.evia-v72-gazing [data-evia] .evia-eyes{transition:transform .82s cubic-bezier(.16,1,.3,1)!important}
.selfobs.evia-v72-look-milos [data-evia] .evia-face{translate:-.7% 1%!important;rotate:-2.2deg!important}.selfobs.evia-v72-look-milos [data-evia] .evia-eyes{transform:translate(-17%,16%)!important}
.selfobs.evia-v72-look-tinos [data-evia] .evia-face{translate:.7% 1%!important;rotate:2.2deg!important}.selfobs.evia-v72-look-tinos [data-evia] .evia-eyes{transform:translate(17%,16%)!important}
.selfobs.evia-v72-look-symi [data-evia] .evia-face{translate:0 1.5%!important;rotate:0deg!important}.selfobs.evia-v72-look-symi [data-evia] .evia-eyes{transform:translate(0,18%)!important}
.selfobs.evia-v72-look-center [data-evia] .evia-face{translate:0 0!important;rotate:0deg!important}.selfobs.evia-v72-look-center [data-evia] .evia-eyes{transform:translate(0,0)!important}
`;
  document.head.appendChild(s)
}
function app(){return document.querySelector(".evia-app.selfobs")}
function editableTarget(t){return !!t?.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""]')}
function resetEviaStroke(){document.querySelectorAll(".evia-anchor[data-evia]").forEach(b=>b.style.removeProperty("--evia-stroke"))}
function clearLookTimers(){lookTimers.forEach(clearTimeout);lookTimers=[]}
function setLook(state){
  const a=app();if(!a)return;
  V72_LOOK.forEach(c=>a.classList.remove(c));
  if(state)a.classList.add(`evia-v72-look-${state}`)
}
function clearLook(){
  clearLookTimers();
  const a=app();if(!a)return;
  a.classList.remove("evia-v72-gazing");V72_LOOK.forEach(c=>a.classList.remove(c))
}
function startImmediateLook(){
  clearLookTimers();
  const a=app();if(!a)return;
  a.classList.add("evia-v72-gazing");setLook("milos");
  lookTimers.push(setTimeout(()=>{if(app()?.classList.contains("evia-team-open"))setLook("tinos")},950));
  lookTimers.push(setTimeout(()=>{if(app()?.classList.contains("evia-team-open"))setLook("symi")},1900));
  lookTimers.push(setTimeout(()=>{if(app()?.classList.contains("evia-team-open"))setLook("center")},2850))
}
function clearFrozenChoices(){
  clearTimeout(freezeTimer);freezeTimer=null;
  for(const item of frozenChoices){
    const el=item.el;if(!el?.isConnected)continue;
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
    el.style.removeProperty("transition");
    el.style.removeProperty("pointer-events")
  }
  frozenChoices=[]
}
function freezeAssistantPositions(){
  clearFrozenChoices();
  const a=app();if(!a)return;
  frozenChoices=[...a.querySelectorAll(".evia-team-choice")].map(el=>{
    const cs=getComputedStyle(el);
    return {el,transform:cs.transform,opacity:cs.opacity}
  });
  for(const item of frozenChoices){
    item.el.style.setProperty("transition","none","important");
    item.el.style.setProperty("transform",item.transform==="none"?"none":item.transform,"important");
    item.el.style.setProperty("opacity",item.opacity,"important");
    item.el.style.setProperty("pointer-events","auto","important")
  }
  freezeTimer=setTimeout(clearFrozenChoices,1000)
}
function fadeFrozenChoices(){
  if(!frozenChoices.length)return;
  requestAnimationFrame(()=>{
    for(const item of frozenChoices){
      if(!item.el?.isConnected)continue;
      item.el.style.setProperty("transition","opacity .22s ease","important");
      item.el.style.setProperty("opacity","0","important");
      item.el.style.setProperty("pointer-events","none","important")
    }
  });
  clearTimeout(freezeTimer);freezeTimer=setTimeout(clearFrozenChoices,760)
}
document.addEventListener("pointerdown",e=>{
  const t=e.target instanceof Element?e.target:null;if(!t)return;
  const launch=t.closest("[data-evia-team-launch]");
  if(launch){
    if(launch.getAttribute("aria-expanded")==="true")clearLook();else startImmediateLook();
  }
},true);
document.addEventListener("pointerup",e=>{
  const t=e.target instanceof Element?e.target:null;if(!t)return;
  if(t.closest("[data-evia-team]")){freezeAssistantPositions();return}
  if(t.closest(".evia-anchor[data-evia]")){
    clearTimeout(strokeTimer);strokeTimer=setTimeout(resetEviaStroke,1120)
  }
},true);
document.addEventListener("pointercancel",e=>{
  const t=e.target instanceof Element?e.target:null;if(t?.closest("[data-evia-team]"))clearFrozenChoices()
},true);
document.addEventListener("click",e=>{
  const t=e.target instanceof Element?e.target:null;if(!t)return;
  if(t.closest("[data-evia-team]")){clearLook();fadeFrozenChoices();return}
  if(t.closest("[data-team-page-back]"))clearLook()
},true);
document.addEventListener("selectstart",e=>{
  const t=e.target instanceof Element?e.target:null;
  if(t?.closest(".evia-app.selfobs")&&!editableTarget(t))e.preventDefault()
},true);
document.addEventListener("contextmenu",e=>{
  const t=e.target instanceof Element?e.target:null;
  if(t?.closest(".evia-app.selfobs")&&!editableTarget(t))e.preventDefault()
},true);
const observer=new MutationObserver(()=>{
  const a=app();if(!a)return;
  const open=a.classList.contains("evia-team-open");
  if(open&&!lastTeamOpen&&!a.classList.contains("evia-v72-gazing"))startImmediateLook();
  if(!open&&lastTeamOpen&&!a.querySelector("[data-evia-team-page]"))clearLook();
  lastTeamOpen=open
});
ensureStyles();observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
window.addEventListener("pageshow",()=>{resetEviaStroke();clearFrozenChoices();clearLook()});
})();