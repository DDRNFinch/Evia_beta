(()=>{
"use strict";
let frame=0;
function makeButton(kind,label){
  const button=document.createElement("button");
  button.type="button";
  button.className="self-button primary";
  if(kind==="video")button.dataset.captureVideo="";
  else button.dataset.capturePhoto="";
  button.textContent=label;
  return button;
}
function ensureCaptureButtons(){
  const card=document.querySelector(".self-card.photo");
  if(!card)return;

  // The base capture screen may briefly render its old picker. Remove it every
  // time and render the two native-camera actions directly into the card.
  card.querySelectorAll("[data-pick]").forEach(el=>el.remove());

  let wrap=card.querySelector(":scope > .self-capture-actions");
  if(!wrap){
    wrap=document.createElement("div");
    wrap.className="self-capture-actions";
    wrap.append(makeButton("photo","Take photo"),makeButton("video","Record video"));

    const preview=card.querySelector("img[alt='Evidence preview'],video");
    if(preview)card.insertBefore(wrap,preview);
    else{
      const label=card.querySelector(":scope > span");
      if(label)label.insertAdjacentElement("afterend",wrap);
      else card.prepend(wrap);
    }
  }
}
function schedule(){
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(ensureCaptureButtons);
}
function openNativeCamera(kind){
  const input=document.querySelector("#selfPhoto");
  if(!input)return;
  input.value="";
  input.type="file";
  input.setAttribute("capture","environment");
  input.setAttribute("accept",kind==="video"?"video/*":"image/*");
  input.click();
}

document.addEventListener("click",e=>{
  // Never allow the retired combined/gallery picker to run, even if it is
  // tapped during a single render frame before it is removed.
  const legacy=e.target.closest?.("[data-pick]");
  if(legacy){
    e.preventDefault();
    e.stopImmediatePropagation();
    legacy.remove();
    ensureCaptureButtons();
    return;
  }

  const photo=e.target.closest?.("[data-capture-photo]");
  const video=e.target.closest?.("[data-capture-video]");
  if(!photo&&!video)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  openNativeCamera(video?"video":"photo");
},true);

document.addEventListener("change",e=>{
  if(e.target?.id==="selfPhoto")setTimeout(schedule,0);
},true);

const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener("pageshow",schedule);
window.addEventListener("focus",schedule);
ensureCaptureButtons();
schedule();
})();