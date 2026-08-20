(()=>{
"use strict";
const FLAG="evia-export-download-started-v1";
let timer=null,current=null,started=0;

function clock(ms){
  const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function begin(button){
  if(current?.isConnected)return;
  stopTimer();
  started=Date.now();
  const box=document.createElement("div");
  box.className="evia-export-status";
  box.setAttribute("role","status");
  box.setAttribute("aria-live","polite");
  box.innerHTML=`<b>Preparing your evidence</b><span data-export-stage>Checking files and building your evidence pack</span><small data-export-time>Working · 0:00</small><em>Keep Evia open while the PDF, photos, recordings and any new OTJ record are prepared.</em>`;
  button.insertAdjacentElement("afterend",box);
  current=box;
  const tick=()=>{
    if(!box.isConnected||!button.isConnected){stopTimer();return}
    const elapsed=Date.now()-started,stage=box.querySelector("[data-export-stage]"),time=box.querySelector("[data-export-time]");
    if(!button.disabled&&/^Sign & download$/i.test(button.textContent.trim())&&elapsed>1500){
      stage.textContent="Preparation stopped";
      time.textContent="Try the download again";
      stopTimer();
      return;
    }
    button.textContent=`Preparing · ${clock(elapsed)}`;
    time.textContent=`Working · ${clock(elapsed)}`;
    if(elapsed>20000)stage.textContent="Still building your evidence pack — Evia is working";
    else if(elapsed>7000)stage.textContent="Preparing files, PDF and recent OTJ records";
  };
  tick();
  timer=setInterval(tick,1000);
}
function markStarting(anchor){
  if(!String(anchor.download||"").startsWith("Evia-New-Evidence-"))return;
  try{sessionStorage.setItem(FLAG,String(Date.now()))}catch{}
  stopTimer();
  if(current?.isConnected){
    current.classList.add("is-starting");
    current.querySelector("b").textContent="Download starting";
    current.querySelector("[data-export-stage]").textContent="Your evidence ZIP has been handed to your phone";
    current.querySelector("[data-export-time]").textContent="Check Downloads when Evia reopens";
  }
}
function showComplete(){
  let stamp="";
  try{stamp=sessionStorage.getItem(FLAG)||"";sessionStorage.removeItem(FLAG)}catch{}
  if(!stamp)return;
  const banner=document.createElement("div");
  banner.className="evia-export-complete";
  banner.innerHTML="<b>Evidence download started</b><span>Check your phone's Downloads folder.</span>";
  document.body.appendChild(banner);
  requestAnimationFrame(()=>banner.classList.add("show"));
  setTimeout(()=>{banner.classList.remove("show");setTimeout(()=>banner.remove(),300)},4500);
}

document.addEventListener("click",e=>{
  const button=e.target.closest?.("[data-sign-download]");
  if(button&&!button.disabled){begin(button);return}
  const anchor=e.target.closest?.("a[download]");
  if(anchor)markStarting(anchor);
},true);
window.addEventListener("load",showComplete);
})();
