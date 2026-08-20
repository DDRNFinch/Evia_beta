(()=>{
"use strict";
const LAYER_CLASS="evia-arp-layer";
const ARCH_LABEL="ARP";
const TITLE="Assessment Readiness & Practice";
let patchQueued=false;

function close(){document.querySelector(`.${LAYER_CLASS}`)?.remove()}

function patchArch(){
  patchQueued=false;
  const button=document.querySelector('.progress-arch[data-arch="ARP"],.progress-arch[data-arch="EPA"],.progress-arch[data-arch="Q&A"],.progress-arch[data-arch="Units"]');
  if(!button)return;
  button.dataset.arch=ARCH_LABEL;
  button.setAttribute("aria-label",`${ARCH_LABEL} — ${TITLE}. Open assessment practice`);
  const label=button.querySelector(".arch-label");
  if(label&&label.textContent!==ARCH_LABEL)label.textContent=ARCH_LABEL
}

function queuePatch(){
  if(patchQueued)return;
  patchQueued=true;
  requestAnimationFrame(patchArch)
}

function open(){
  close();
  document.querySelector(".evia-tools-layer:not(.evia-arp-layer)")?.remove();
  const layer=document.createElement("div");
  layer.className=`evia-tools-layer ${LAYER_CLASS}`;
  layer.innerHTML=`
    <section class="evia-tools-screen">
      <div class="evia-tools-head">
        <button type="button" data-arp-back>‹ Back</button>
        <b>${TITLE}</b>
        <span></span>
      </div>
      <div class="evia-tools-body">
        <p class="evia-tools-kicker">ARP</p>
        <h2>${TITLE}</h2>
        <button type="button" class="evia-tools-row" data-arp-option="multiple-choice"><span><b>Multiple Choice</b></span></button>
        <button type="button" class="evia-tools-row" data-arp-option="discussion"><span><b>Discussion</b></span></button>
        <button type="button" class="evia-tools-row" data-arp-option="practical"><span><b>Practical</b></span></button>
      </div>
    </section>`;
  document.body.appendChild(layer);
  layer.querySelector("[data-arp-back]")?.addEventListener("click",close);
  layer.querySelectorAll("[data-arp-option]").forEach(button=>button.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation()
  }))
}

document.addEventListener("click",e=>{
  const target=e.target instanceof Element?e.target.closest('.progress-arch[data-arch="ARP"],.progress-arch[data-arch="EPA"],.progress-arch[data-arch="Q&A"],.progress-arch[data-arch="Units"]'):null;
  if(!target)return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();
  patchArch();
  open()
},true);

function ready(){
  patchArch();
  const root=document.getElementById("root");
  if(root&&!root.__eviaArpObserver){
    root.__eviaArpObserver=true;
    new MutationObserver(queuePatch).observe(root,{childList:true,subtree:true})
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("load",()=>setTimeout(patchArch,0));
window.addEventListener("pageshow",()=>setTimeout(patchArch,0));
})();
