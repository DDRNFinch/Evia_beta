(()=>{
"use strict";
const RPL_KEY="evia-rpl-ksbs-v1";
const MEDIA_DB="evia-self-observation-media";
let adminTapTimes=[];

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function ctx(){return window.EviaCourseContext?.current?.()||null}
function activePack(){return window.EviaCoursePacks?.active?.()||null}
function codes(){return Array.isArray(ctx()?.codes)?ctx().codes.map(String):[]}
function descriptions(){
  const a=activePack(),pack=a?.pack||{},path=a?.pathway||{};
  return {...(pack.codeDescriptions||{}),...(path.codeDescriptions||{})}
}
function rplSet(){const allowed=new Set(codes()),x=read(RPL_KEY,[]);return new Set((Array.isArray(x)?x:[]).map(String).filter(x=>allowed.has(x)))}
function closeLayer(){document.querySelector(".evia-tools-layer.admin")?.remove()}
function layer(body,title="Admin mode",back=closeLayer){
  document.querySelector(".evia-rpl-course-layer")?.remove();
  closeLayer();
  const el=document.createElement("div");
  el.className="evia-tools-layer admin";
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-admin-back>‹ Back</button><b>${esc(title)}</b><span></span></div><div class="evia-tools-body">${body}</div></section>`;
  document.body.appendChild(el);
  el.querySelector("[data-admin-back]").onclick=back;
  return el
}
function openAdmin(){
  const el=layer(`<p class="evia-tools-kicker">Evia</p><h2>Admin mode</h2><p class="evia-tools-copy">Manage this learner's course, recognised prior learning or app data on this device.</p><button type="button" class="evia-tools-row" data-admin-rpl><span><b>Recognised prior learning</b><small>Mark individual course requirements as RPL</small></span><i>›</i></button><button type="button" class="evia-tools-row danger" data-admin-clear><span><b>Clear learner app data</b><small>Name, evidence, media, OTJ, targets, RPL and progress</small></span><i>›</i></button>`);
  el.querySelector("[data-admin-rpl]").onclick=openRpl;
  el.querySelector("[data-admin-clear]").onclick=openClearConfirm;
  requestAnimationFrame(()=>window.dispatchEvent(new Event("evia-admin-open")));
  return el
}
function openRpl(){
  const c=ctx(),all=codes(),labels=descriptions(),set=rplSet();
  if(!all.length)return openAdmin();
  const groups=[["Knowledge","K"],["Skills","S"],["Behaviours","B"],["Assessment criteria",""]]
    .map(([title,prefix])=>[title,prefix?all.filter(x=>x.startsWith(prefix)):all.filter(x=>!/^([KSB])\d+$/i.test(x))])
    .filter(([,xs])=>xs.length);
  const body=groups.map(([title,xs])=>`<section class="evia-rpl-group"><h3>${esc(title)}</h3>${xs.map(code=>`<button type="button" class="evia-tools-row${set.has(code)?" on":""}" data-admin-rpl-code="${esc(code)}"><span><b>${esc(code)}</b><small>${esc(labels[code]||code)}</small></span><em>${set.has(code)?"RPL":""}</em></button>`).join("")}</section>`).join("");
  const el=layer(`<p class="evia-tools-kicker">Recognised prior learning</p><h2>${c?.courseType==="nvq"?"RPL assessment criteria":"RPL KSBs"}</h2><p class="evia-tools-copy">Tap an item to mark or unmark it as recognised prior learning.</p>${body}`,"Recognised prior learning",openAdmin);
  el.querySelectorAll("[data-admin-rpl-code]").forEach(btn=>btn.onclick=()=>{
    const set=rplSet(),code=String(btn.dataset.adminRplCode||"");
    if(set.has(code))set.delete(code);else set.add(code);
    write(RPL_KEY,[...set]);
    btn.classList.toggle("on",set.has(code));
    const em=btn.querySelector("em");if(em)em.textContent=set.has(code)?"RPL":"";
    window.dispatchEvent(new Event("storage"))
  })
}
function openClearConfirm(){
  const el=layer(`<h2>Clear all learner data?</h2><p class="evia-tools-copy">This removes the learner's name, evidence, media, OTJ, targets, RPL and progress stored on this device. Installed Nisi course packs are kept.</p><div class="evia-warning">This cannot be undone unless the learner has already exported their work.</div><button type="button" class="evia-tools-primary danger-fill" data-admin-clear-confirm>Clear all learner data</button><button type="button" class="evia-tools-secondary" data-admin-clear-cancel>Cancel</button>`,"Clear learner data",openAdmin);
  el.querySelector("[data-admin-clear-cancel]").onclick=openAdmin;
  el.querySelector("[data-admin-clear-confirm]").onclick=clearLearnerData
}
async function clearLearnerData(){
  const b=document.querySelector("[data-admin-clear-confirm]");if(b){b.disabled=true;b.textContent="Clearing…"}
  try{
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("evia-"))keys.push(k)}
    keys.forEach(k=>localStorage.removeItem(k));
    if("indexedDB" in window)await new Promise(resolve=>{try{const r=indexedDB.deleteDatabase(MEDIA_DB);r.onsuccess=r.onerror=r.onblocked=()=>resolve()}catch{resolve()}})
  }finally{location.reload()}
}

document.addEventListener("click",e=>{
  const name=e.target instanceof Element?e.target.closest(".self-top b"):null;
  if(!name||String(name.textContent||"").trim()!=="Evia")return;
  const now=Date.now();adminTapTimes=adminTapTimes.filter(t=>now-t<4500);adminTapTimes.push(now);
  if(adminTapTimes.length>=7){adminTapTimes=[];e.preventDefault();e.stopPropagation();openAdmin()}
},true);
window.EviaAdmin={open:openAdmin};
})();
