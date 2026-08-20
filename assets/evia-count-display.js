(()=>{
"use strict";
const STORE="evia-selfobs-live-v3";
function readEntries(){try{const x=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(x)?x:[]}catch{return[]}}
function mark(n){n=Math.max(0,Math.round(Number(n)||0));if(!n)return"";return n>5?`o x ${n}`:"o".repeat(n)}
function setText(el,n){if(!el)return;const text=mark(n);if(el.textContent!==text)el.textContent=text}
function count(entries,field,id){return entries.reduce((n,e)=>n+(e?.[field]===id?1:0),0)}
function patch(){
  const entries=readEntries();
  document.querySelectorAll("button[data-cat]").forEach(b=>setText(b.querySelector(".self-side b"),count(entries,"categoryId",b.dataset.cat)));
  document.querySelectorAll("button[data-job]").forEach(b=>setText(b.querySelector(".self-side b"),count(entries,"jobId",b.dataset.job)));
  document.querySelectorAll("button[data-opp]").forEach(b=>setText(b.querySelector(".self-side b"),count(entries,"opportunityId",b.dataset.opp)));
  document.querySelectorAll(".self-ksbs button[data-code]").forEach(b=>{
    const code=b.dataset.code,n=entries.reduce((total,e)=>total+(Array.isArray(e?.codes)&&e.codes.includes(code)?1:0),0);
    const span=Array.from(b.children).find(x=>x.tagName==="SPAN"&&!x.classList.contains("evia-rpl-o"));
    setText(span,n);
  });
  document.querySelectorAll(".self-card.group").forEach(card=>setText(card.querySelector("strong em"),card.querySelectorAll(".self-entry").length));
}
const observer=new MutationObserver(patch);
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener("load",patch);
window.addEventListener("pageshow",patch);
document.addEventListener("click",()=>setTimeout(patch,0),true);
setTimeout(patch,250);

/* Keep the fade transition on ordinary Evia navigation only. TOC, OTJ, EPA and
   the Targets launcher have their own document-level handlers and must receive
   the original physical click rather than a replayed synthetic click. */
const NAV_SELECTOR=[
  "button[data-cat]","button[data-job]","button[data-opp]","button[data-mode]","button[data-tab]","button[data-code]",
  "button[data-arch='KSB']","button[data-quick]","button[data-evia]",".option-row",".self-back",".self-evidence",
  ".evia-target-row",".evia-target-history-row","[data-view]","[data-nav]","[data-route]",
  "[data-action='back']","[data-action='next']","[data-action='save']","[data-action='submit']","[data-action='finish']",
  "[data-action='home']","[data-action='evidence']","[data-action='coverage']"
].join(",");
const SURFACE_SELECTOR=".self-panel,.view-panel,.selfobs-view,.evia-tools-screen,.evia-sign-card,.selfobs-help-card,.evia-target-layer,.evia-rpl-layer";
let replaying=false,transitioning=false;
function reducedMotion(){return !!(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||document.querySelector(".is-reduced-motion"))}
function surfaceFor(control){return control.closest?.(SURFACE_SELECTOR)||document.querySelector(SURFACE_SELECTOR)}
function fallbackSurface(){return document.querySelector(SURFACE_SELECTOR)}
document.addEventListener("click",event=>{
  if(replaying||transitioning||reducedMotion()||event.defaultPrevented)return;
  const control=event.target instanceof Element?event.target.closest(NAV_SELECTOR):null;
  if(!control||control.disabled||control.getAttribute?.("aria-disabled")==="true")return;
  if(control.matches?.("[data-evia-native-photo],[data-evia-native-video],[data-evia-native-gallery],[data-pick],[data-action='record'],[data-action='stop'],[data-action='download'],[data-install-update],[data-later]"))return;
  const surface=surfaceFor(control);
  if(!surface)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  transitioning=true;
  surface.classList.remove("evia-nav-enter");
  surface.classList.add("evia-nav-leave");
  window.setTimeout(()=>{
    replaying=true;
    try{control.click()}finally{replaying=false}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const next=surface.isConnected?surface:fallbackSurface();
      if(next){
        next.classList.remove("evia-nav-leave");
        next.classList.remove("evia-nav-enter");
        void next.offsetWidth;
        next.classList.add("evia-nav-enter");
      }
      transitioning=false;
    }));
  },125);
},true);
})();
