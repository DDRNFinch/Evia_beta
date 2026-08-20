(()=>{
"use strict";
const COURSE_ID="6570-05";
function packInstalled(){return !!window.EviaCoursePacks?.get?.(COURSE_ID)}
function removeUnpackedOption(select){
  if(!select||packInstalled())return;
  const option=select.querySelector(`option[value="${COURSE_ID}"]`);if(!option)return;
  const wasSelected=select.value===COURSE_ID;option.remove();
  if(wasSelected&&select.options.length){select.value=select.options[0].value;select.dispatchEvent(new Event("change",{bubbles:true}))}
}
function patchSelectors(){document.querySelectorAll("select[data-toc-course]").forEach(removeUnpackedOption)}
function openPackManager(){if(window.EviaCoursePacks?.manager)window.EviaCoursePacks.manager()}
document.addEventListener("click",e=>{
  const save=e.target.closest?.("[data-save-course],[data-admin-course-save]");if(!save||packInstalled())return;
  const layer=save.closest(".evia-tools-layer"),select=layer?.querySelector?.("select[data-toc-course]");
  if(select?.value!==COURSE_ID)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();openPackManager()
},true);
let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;patchSelectors()})}
function ready(){patchSelectors();if(!document.body.__evia6570CutoverObserved){document.body.__evia6570CutoverObserved=true;new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("pageshow",ready);
window.Evia6570PackCutover={packInstalled,patchSelectors};
})();
