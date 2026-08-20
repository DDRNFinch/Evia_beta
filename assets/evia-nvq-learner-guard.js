(()=>{
"use strict";
function active(){return window.EviaCourseContext?.current?.()?.courseType==="nvq"}
function patch(){
  if(!active())return;
  document.querySelectorAll(".evia-nvq-ac-grid").forEach(grid=>{
    if(grid.dataset.hiddenForLearner==="1")return;
    const note=document.createElement("div");note.className="evia-nvq-empty";note.textContent="The exact Unit, learning outcome and assessment-criteria mapping is retained underneath for assessor and portfolio use. Learners only need to collect the evidence shown by Evia.";
    grid.replaceWith(note)
  })
}
const observer=new MutationObserver(()=>requestAnimationFrame(patch));
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener("load",patch);window.addEventListener("pageshow",patch);setTimeout(patch,100);
})();