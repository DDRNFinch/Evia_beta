(()=>{
"use strict";
const STYLE_ID="evia-v73-page-handoff-style";
const PAGE_SELECTOR=".evia-assistant-network-page";
const WAIT_CLASS="evia-v73-intro-wait";
const INTRO_DELAY=720;
const READY_DELAY=.58;
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement("style");
  style.id=STYLE_ID;
  style.textContent=`
${PAGE_SELECTOR}.${WAIT_CLASS} .evia-team-page-intro{opacity:0!important;transform:translateY(6px)!important}
${PAGE_SELECTOR}.is-ready .evia-team-page-brand,
${PAGE_SELECTOR}.is-ready .evia-team-page-avatar,
${PAGE_SELECTOR}.is-ready .evia-team-page-greeting,
${PAGE_SELECTOR}.is-ready .evia-team-page-back{transition-delay:${READY_DELAY}s!important}
`;
  document.head.appendChild(style)
}
function arm(page){
  if(!(page instanceof Element)||!page.matches(PAGE_SELECTOR)||page.dataset.eviaV73Handoff==="1")return;
  page.dataset.eviaV73Handoff="1";
  page.classList.add(WAIT_CLASS);
  setTimeout(()=>{
    if(!page.isConnected)return;
    requestAnimationFrame(()=>page.classList.remove(WAIT_CLASS))
  },INTRO_DELAY)
}
function scan(root=document){
  if(root instanceof Element&&root.matches(PAGE_SELECTOR))arm(root);
  root.querySelectorAll?.(PAGE_SELECTOR).forEach(arm)
}
function start(){
  ensureStyle();scan();
  new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element)scan(node)
      }
    }
  }).observe(document.documentElement,{childList:true,subtree:true})
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
