(()=>{
"use strict";
function cleanPack(pack){const x=JSON.parse(JSON.stringify(pack||{}));delete x.installedAt;delete x.updatedAt;return x}
function safePart(value,fallback="Course"){const s=String(value||fallback).replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"");return s||fallback}
function fileName(pack){const title=safePart(pack?.shortTitle||pack?.title||"Course"),standard=safePart(pack?.standardId||pack?.familyId||pack?.id||"course"),version=safePart(pack?.version||"1","1");return `${title}_${standard}_v${version}.nisi`}
function exportPack(id){
  const pack=window.EviaCoursePacks?.get?.(id);if(!pack)return false;
  try{
    const blob=new Blob([JSON.stringify(cleanPack(pack),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=fileName(pack);a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);return true
  }catch(error){console.error("Nisi course pack export",error);return false}
}
function patchManager(){
  const layer=document.querySelector(".nisi-pack-layer");if(!layer)return;
  layer.querySelectorAll(".nisi-pack-card").forEach(card=>{
    const use=card.querySelector("[data-pack-use]"),buttons=use?.parentElement,id=use?.getAttribute("data-pack-use");if(!buttons||!id)return;
    let b=card.querySelector("[data-pack-export]");
    if(!b){b=document.createElement("button");b.type="button";b.textContent="Export";b.setAttribute("data-pack-export",id);buttons.insertBefore(b,buttons.querySelector("[data-pack-remove]"))}
    b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!exportPack(id)){const body=layer.querySelector(".evia-tools-body");if(body){let n=body.querySelector(".nisi-pack-message");if(!n){n=document.createElement("div");n.className="nisi-pack-message is-error";body.prepend(n)}n.textContent="Evia could not export that course pack."}}}
  })
}
let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;patchManager()})}
function ready(){patchManager();if(!document.body.__nisiPackExportObserved){document.body.__nisiPackExportObserved=true;new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}}
window.EviaCoursePackExport={exportPack,patchManager};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("pageshow",patchManager);
})();