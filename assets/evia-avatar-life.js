(()=>{
"use strict";
const STATES=["idle","look-down","look-up-left","look-up-right","smile"];
const EXP_CLASSES=STATES.filter(x=>x!=="idle").map(x=>`expression-${x}`);
let timer=null,last="idle";
function reduced(){return !!(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||document.querySelector(".is-reduced-motion"))}
function ensureStyles(){
 if(document.getElementById("evia-avatar-life-style"))return;
 const s=document.createElement("style");s.id="evia-avatar-life-style";s.textContent=`
.naxos-avatar-face{transition:transform .52s cubic-bezier(.22,1,.36,1),rotate .72s cubic-bezier(.22,1,.36,1),translate .72s cubic-bezier(.22,1,.36,1),filter .32s ease}
.naxos-avatar-eyes{transition:transform .72s cubic-bezier(.22,1,.36,1)}
.naxos-avatar-eye{transition:border-radius .52s cubic-bezier(.22,1,.36,1),transform .52s cubic-bezier(.22,1,.36,1)}
.naxos-avatar-face.expression-look-down{translate:0 1.5%}.naxos-avatar-face.expression-look-down .naxos-avatar-eyes{transform:translateY(14%)}
.naxos-avatar-face.expression-look-up-left{rotate:-2.2deg;translate:-1% -1%}.naxos-avatar-face.expression-look-up-left .naxos-avatar-eyes{transform:translate(-9%,-12%)}
.naxos-avatar-face.expression-look-up-right{rotate:2.2deg;translate:1% -1%}.naxos-avatar-face.expression-look-up-right .naxos-avatar-eyes{transform:translate(9%,-12%)}
.naxos-avatar-face.expression-smile{rotate:-.6deg;translate:0 1%}.naxos-avatar-face.expression-smile .naxos-avatar-eyes{transform:translateY(5%)}
.naxos-avatar-face.expression-smile .naxos-avatar-eye{border-radius:52% 52% 10% 10%/68% 68% 14% 14%;animation:none}
.naxos-avatar-face.expression-smile .naxos-avatar-eye:first-child{transform:rotate(-6deg) scaleY(.78)}
.naxos-avatar-face.expression-smile .naxos-avatar-eye.right{transform:rotate(6deg) scaleY(.78)}
.evia-face.avatar-react,.naxos-avatar-face.avatar-react{animation:avatar-react .62s cubic-bezier(.16,1,.3,1)}
.evia-face.avatar-curious,.naxos-avatar-face.avatar-curious{animation:avatar-curious .9s cubic-bezier(.16,1,.3,1)}
@keyframes avatar-react{0%{transform:scale(1)}30%{transform:scale(.95) translateY(2px)}65%{transform:scale(1.045) translateY(-2px)}100%{transform:scale(1)}}
@keyframes avatar-curious{0%,100%{transform:rotate(0) translateY(0)}35%{transform:rotate(-3deg) translateY(-1px)}70%{transform:rotate(2deg) translateY(-2px)}}
`;
 document.head.appendChild(s)
}
function faces(){return [...document.querySelectorAll(".evia-face,.naxos-avatar-face")].filter(x=>!x.closest(".evia-motion-proxy"))}
function setState(state){
 if(reduced())return;
 ensureStyles();last=state;
 for(const face of faces()){
   face.classList.remove(...EXP_CLASSES);
   if(state!=="idle")face.classList.add(`expression-${state}`)
 }
}
function nextState(){let next=STATES[Math.floor(Math.random()*STATES.length)];if(next===last&&STATES.length>1)next=STATES[(STATES.indexOf(next)+1+Math.floor(Math.random()*(STATES.length-1)))%STATES.length];setState(next)}
function schedule(){clearTimeout(timer);if(reduced())return;timer=window.setTimeout(()=>{nextState();schedule()},3600+Math.random()*2800)}
function react(kind="react"){
 if(reduced())return;
 ensureStyles();
 for(const face of faces()){
   const c=kind==="curious"?"avatar-curious":"avatar-react";
   face.classList.remove(c);void face.offsetWidth;face.classList.add(c);
   window.setTimeout(()=>face.classList.remove(c),kind==="curious"?950:680)
 }
}
function smile(ms=1500){setState("smile");react();window.setTimeout(()=>{if(last==="smile"){setState("idle");schedule()}},ms)}
const observer=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n?.nodeType!==1)continue;if(n.matches?.(".evia-face,.naxos-avatar-face")||n.querySelector?.(".evia-face,.naxos-avatar-face")){window.setTimeout(()=>setState(last),40);return}}});
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",e=>{
 const t=e.target instanceof Element?e.target:null;if(!t)return;
 if(t.closest(".evia-course-epa .naxos-row,.evia-course-epa .mode-card,.evia-course-epa .answer,.evia-course-epa .cover-item,.evia-course-epa .naxos-primary,.evia-course-epa .naxos-secondary")){react(Math.random()>.55?"curious":"react");return}
 if(t.closest(".evia-anchor,.selfobs-primary,.primary-row,.detail-row"))react();
},true);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){setState("idle");schedule()}else clearTimeout(timer)});
ensureStyles();setState("idle");schedule();
window.EviaAvatarLife={setState,smile,react};
})();
