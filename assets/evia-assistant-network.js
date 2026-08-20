(()=>{
"use strict";
const STYLE_ID="evia-assistant-network-style";
const PAGE_CLASS="evia-assistant-network-page";
const LOOK_CLASSES=["evia-team-look-milos","evia-team-look-tinos","evia-team-look-symi","evia-team-look-center"];
let assistantsOpen=false;
let pageOpen=false;
let patchQueued=false;
let lookTimers=[];
const assistants={
  milos:{name:"Milos",role:"Assessment assistant",shortRole:"Assessor",color:"#4f7fc4",items:[["Mock assessment","EPA or Q&A practice for your course"],["Assessment feedback","Review feedback shared by your assessor"],["Share with assessor","Exchange assessment information securely"]]},
  symi:{name:"Symi",role:"Tutor assistant",shortRole:"Tutor",color:"#59a875",items:[["Register sign-in","Scan or enter your tutor register code"],["Learning support","Revision and help with course knowledge"],["Tutor resources","Open learning shared by your tutor"]]},
  tinos:{name:"Tinos",role:"Employer assistant",shortRole:"Employer",color:"#d88b45",items:[["Witness testimony","Request or receive workplace testimony"],["Employer feedback","Review feedback from your employer"],["Workplace updates","Share progress and workplace information"]]}
};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function assistantFace(cls="",extra=""){return `<span class="evia-team-avatar ${cls}" ${extra}><span class="evia-team-face"><span class="evia-team-eye"></span><span class="evia-team-eye"></span></span></span>`}
function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement("style");s.id=STYLE_ID;s.textContent=`
.selfobs .progress-row.evia-team-dock{grid-template-columns:minmax(0,1fr) minmax(0,1fr) clamp(3.6rem,15vw,4.05rem) minmax(0,1fr) minmax(0,1fr);align-items:end;gap:clamp(.22rem,1vw,.55rem);width:min(31rem,100%)}
.evia-team-launch-wrap{width:clamp(3.6rem,13.5vw,4.05rem);height:clamp(3.6rem,13.5vw,4.05rem);aspect-ratio:1/1;min-width:0;min-height:0;display:grid;place-items:center;align-self:end;justify-self:center;padding:0 0 .12rem;box-sizing:content-box}
.evia-team-launch{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;max-width:100%!important;max-height:100%!important;aspect-ratio:1/1!important;box-sizing:border-box!important;padding:0!important;flex:none!important;border:0!important;border-radius:50%!important;background:var(--yellow,#efc33d)!important;position:relative;display:grid!important;place-items:center!important;cursor:pointer;box-shadow:0 8px 24px #8a670a22,inset 0 1px #ffffff50;transition:transform .22s ease,box-shadow .3s ease;-webkit-tap-highlight-color:transparent;overflow:hidden}
.evia-team-launch:active{transform:scale(.95)}
.evia-team-launch-face{width:72%;height:72%;aspect-ratio:1/1;border:2.3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;gap:18%;box-sizing:border-box}
.evia-team-launch-eye{width:20%;aspect-ratio:1;border:2px solid #fff;border-radius:50%;box-sizing:border-box}
.evia-team-cluster{position:absolute;z-index:11;left:50%;top:calc(42% + 4.6rem);width:min(18.5rem,78vw);transform:translateX(-50%);display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem;pointer-events:none}
.evia-team-choice{border:0;background:transparent;padding:0;opacity:0;pointer-events:none;cursor:pointer;transform:translateY(5.7rem) scale(.78);transition:opacity .30s ease,transform .52s cubic-bezier(.22,1,.36,1);transition-delay:0s;-webkit-tap-highlight-color:transparent}
.selfobs.evia-team-open .evia-team-choice{opacity:1;pointer-events:auto;transform:translateY(0) scale(1);transition-property:opacity,transform;transition-duration:1.68s,2.88s;transition-timing-function:linear,cubic-bezier(.22,1,.36,1)}
.selfobs.evia-team-open .evia-team-choice:nth-child(1){transition-delay:0s}.selfobs.evia-team-open .evia-team-choice:nth-child(2){transition-delay:.16s}.selfobs.evia-team-open .evia-team-choice:nth-child(3){transition-delay:.32s}
.evia-team-avatar{--team-color:#777;width:clamp(3.8rem,16vw,4.75rem);height:clamp(3.8rem,16vw,4.75rem);margin:0 auto;position:relative;display:grid;place-items:center}
.evia-team-avatar:before{content:"";position:absolute;inset:-28%;border-radius:50%;filter:blur(14px);background:radial-gradient(circle,color-mix(in srgb,var(--team-color) 23%,transparent),transparent 70%);opacity:.9}
.evia-team-face{width:76%;height:76%;border:2.15px solid var(--team-color);border-radius:50%;background:#ffffff25;position:relative;display:flex;align-items:center;justify-content:center;gap:18%;box-shadow:0 5px 18px color-mix(in srgb,var(--team-color) 10%,transparent)}
.evia-team-eye{width:20%;aspect-ratio:1;border:2px solid var(--team-color);border-radius:50%}
.evia-team-milos{--team-color:#4f7fc4}.evia-team-symi{--team-color:#59a875}.evia-team-tinos{--team-color:#d88b45}
.evia-team-name{display:block;text-align:center;margin-top:.12rem;font-size:.64rem;font-weight:470;color:#424246}.evia-team-role{display:block;text-align:center;margin-top:.05rem;font-size:.48rem;color:#969499}
.selfobs.evia-team-open .self-invite{opacity:0!important}
.selfobs.evia-team-open [data-evia] .evia-face{transition:transform .68s cubic-bezier(.22,1,.36,1),filter .32s ease,rotate .68s cubic-bezier(.22,1,.36,1),translate .68s cubic-bezier(.22,1,.36,1)!important}
.selfobs.evia-team-open [data-evia] .evia-eyes{transition:transform .68s cubic-bezier(.22,1,.36,1)!important}
.selfobs.evia-team-look-milos [data-evia] .evia-face{translate:-.7% 1%!important;rotate:-2.2deg!important}.selfobs.evia-team-look-milos [data-evia] .evia-eyes{transform:translate(-17%,16%)!important}
.selfobs.evia-team-look-tinos [data-evia] .evia-face{translate:.7% 1%!important;rotate:2.2deg!important}.selfobs.evia-team-look-tinos [data-evia] .evia-eyes{transform:translate(17%,16%)!important}
.selfobs.evia-team-look-symi [data-evia] .evia-face{translate:0 1.5%!important;rotate:0deg!important}.selfobs.evia-team-look-symi [data-evia] .evia-eyes{transform:translate(0,18%)!important}
.selfobs.evia-team-look-center [data-evia] .evia-face{translate:0 0!important;rotate:0deg!important}.selfobs.evia-team-look-center [data-evia] .evia-eyes{transform:translate(0,0)!important}
.${PAGE_CLASS}{--team-page-color:#4f7fc4;position:absolute;inset:0;z-index:1000;opacity:0;pointer-events:none;background:linear-gradient(180deg,#fcfcfd 0%,#f8f8fb 60%,color-mix(in srgb,var(--team-page-color) 9%,#fff) 100%);transition:opacity .68s ease;overflow:hidden;isolation:isolate}
.${PAGE_CLASS}:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(at 50% 105%,color-mix(in srgb,var(--team-page-color) 24%,transparent),transparent 42%),radial-gradient(circle at 10% 8%,rgba(255,255,255,.95),transparent 30%)}
.${PAGE_CLASS}.is-visible{opacity:1;pointer-events:auto}.evia-team-page-intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transform:translateY(6px);transition:opacity .55s ease,transform .55s cubic-bezier(.22,1,.36,1)}
.${PAGE_CLASS}.is-intro .evia-team-page-intro{opacity:1;transform:translateY(0)}.evia-team-page-intro strong{color:var(--team-page-color);font-size:clamp(2rem,7vw,3rem);font-weight:420;letter-spacing:-.04em}.evia-team-page-intro span{color:color-mix(in srgb,var(--team-page-color) 72%,#777);font-size:.72rem;margin-top:.45rem}
.evia-team-page-brand{position:absolute;top:max(.8rem,env(safe-area-inset-top));left:1rem;opacity:0;transition:opacity .4s ease}.evia-team-page-brand b,.evia-team-page-brand small{display:block}.evia-team-page-brand b{color:var(--team-page-color);font-size:.83rem;font-weight:440}.evia-team-page-brand small{color:#85858a;font-size:.55rem}
.evia-team-page-avatar{position:absolute;left:50%;top:41%;width:clamp(9.75rem,17vw,11.75rem);height:clamp(9.75rem,17vw,11.75rem);transform:translate(-50%,-50%);opacity:0;cursor:pointer;border:0;background:transparent;padding:0;transition:opacity .55s ease,top .9s cubic-bezier(.22,1,.36,1),width .9s cubic-bezier(.22,1,.36,1),height .9s cubic-bezier(.22,1,.36,1)}
.evia-team-page-avatar .evia-team-avatar{width:100%;height:100%}.evia-team-page-avatar .evia-team-face{width:78%;height:78%;margin:11%;border-width:3px}.evia-team-page-avatar .evia-team-eye{border-width:3px}
.evia-team-page-greeting{position:absolute;left:50%;top:calc(41% + 6.25rem);transform:translateX(-50%);white-space:nowrap;color:#8c8c90;font-size:.61rem;opacity:0;transition:opacity .4s ease}
.evia-team-page-menu{position:absolute;left:50%;top:8.3rem;width:min(29rem,calc(100% - 2rem));transform:translateX(-50%) translateY(14px);opacity:0;pointer-events:none;transition:opacity .38s ease .1s,transform .58s cubic-bezier(.22,1,.36,1) .1s;display:grid;gap:.68rem}
.evia-team-page-option{min-height:3.45rem;border-radius:999px;border:1px solid #ffffffc0;background:#ffffff9b;backdrop-filter:blur(20px);padding:0 1.2rem;color:#3c3c40;display:flex;align-items:center;justify-content:space-between;text-align:left}.evia-team-page-option span{display:block;font-size:.82rem}.evia-team-page-option small{display:block;color:#8d8d92;font-size:.56rem;margin-top:.12rem}.evia-team-page-option i{font-style:normal;color:#9a9a9f}
.evia-team-page-back{position:absolute;left:50%;bottom:max(.85rem,env(safe-area-inset-bottom));transform:translateX(-50%);border:0;background:transparent;color:#888;font-size:.65rem;opacity:0;cursor:pointer;padding:.45rem .7rem}
.${PAGE_CLASS}.is-ready .evia-team-page-brand,.${PAGE_CLASS}.is-ready .evia-team-page-avatar,.${PAGE_CLASS}.is-ready .evia-team-page-greeting,.${PAGE_CLASS}.is-ready .evia-team-page-back{opacity:1}.${PAGE_CLASS}.is-menu .evia-team-page-greeting{opacity:0}
.${PAGE_CLASS}.is-menu .evia-team-page-avatar{width:6.25rem;height:6.25rem;top:5.5rem}.${PAGE_CLASS}.is-menu .evia-team-page-menu{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
@media(max-width:560px){.evia-team-cluster{top:calc(42% + 4.4rem);width:82vw}}@media(max-height:690px){.evia-team-cluster{top:calc(41% + 4rem)}}
@media(prefers-reduced-motion:reduce){.evia-team-choice,.${PAGE_CLASS},.evia-team-page-intro,.evia-team-page-brand,.evia-team-page-avatar,.evia-team-page-greeting,.evia-team-page-menu{transition-duration:.01ms!important;transition-delay:0s!important}}
`;
  document.head.appendChild(s)
}
function clusterHtml(){return `<div class="evia-team-cluster" data-evia-team-cluster>${Object.entries(assistants).map(([id,a])=>`<button type="button" class="evia-team-choice" data-evia-team="${id}" aria-label="Open ${esc(a.name)}, ${esc(a.shortRole)}">${assistantFace(`evia-team-${id}`)}<span class="evia-team-name">${esc(a.name)}</span><span class="evia-team-role">${esc(a.shortRole)}</span></button>`).join("")}</div>`}
function launchHtml(){return `<div class="evia-team-launch-wrap" data-evia-team-launch-wrap><button type="button" class="evia-team-launch" data-evia-team-launch aria-label="Open assistants"><span class="evia-team-launch-face"><span class="evia-team-launch-eye"></span><span class="evia-team-launch-eye"></span></span></button></div>`}
function clearLookTimers(){lookTimers.forEach(id=>clearTimeout(id));lookTimers=[]}
function setLook(state){const app=document.querySelector(".evia-app.selfobs");if(!app)return;LOOK_CLASSES.forEach(c=>app.classList.remove(c));if(state)app.classList.add(`evia-team-look-${state}`)}
function resetLook(){clearLookTimers();const app=document.querySelector(".evia-app.selfobs");if(!app)return;LOOK_CLASSES.forEach(c=>app.classList.remove(c))}
function startLookSequence(){
  clearLookTimers();setLook(null);
  const later=(state,ms)=>lookTimers.push(setTimeout(()=>{if(!assistantsOpen||pageOpen)return;setLook(state)},ms));
  later("milos",3350);later("tinos",4400);later("symi",5450);later("center",6500)
}
function patch(){
  patchQueued=false;ensureStyles();
  const app=document.querySelector(".evia-app.selfobs"),row=app?.querySelector(".progress-row");if(!app||!row)return;
  const arches=[...row.querySelectorAll(":scope > .progress-arch")];
  if(arches.length===4&&!row.querySelector("[data-evia-team-launch-wrap]"))arches[1].insertAdjacentHTML("afterend",launchHtml());
  row.classList.add("evia-team-dock");
  if(!app.querySelector("[data-evia-team-cluster]"))app.insertAdjacentHTML("beforeend",clusterHtml());
  app.classList.toggle("evia-team-open",assistantsOpen&&!pageOpen);
  app.querySelector("[data-evia-team-launch]")?.setAttribute("aria-expanded",String(assistantsOpen&&!pageOpen));
  if(!assistantsOpen||pageOpen)LOOK_CLASSES.forEach(c=>app.classList.remove(c))
}
function queuePatch(){if(patchQueued)return;patchQueued=true;requestAnimationFrame(patch)}
function toggleAssistants(e){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  const app=document.querySelector(".evia-app.selfobs"),next=!assistantsOpen;assistantsOpen=next;
  if(!next){resetLook();queuePatch();return}
  if(next&&app?.classList.contains("is-open")){app.querySelector("[data-evia]")?.click();setTimeout(()=>{queuePatch();startLookSequence()},0);return}
  queuePatch();startLookSequence()
}
function pageHtml(id,a){return `<section class="${PAGE_CLASS}" data-evia-team-page style="--team-page-color:${a.color}" aria-label="${esc(a.name)} ${esc(a.role)}"><div class="evia-team-page-intro"><strong>${esc(a.name)}</strong><span>${esc(a.role)}</span></div><div class="evia-team-page-brand"><b>${esc(a.name)}</b><small>${esc(a.role)}</small></div><button type="button" class="evia-team-page-avatar" data-team-page-avatar aria-label="${esc(a.name)}"><span class="evia-team-avatar evia-team-${id}"><span class="evia-team-face"><span class="evia-team-eye"></span><span class="evia-team-eye"></span></span></span></button><div class="evia-team-page-greeting">Tap me to get started</div><div class="evia-team-page-menu">${a.items.map(([title,copy])=>`<button type="button" class="evia-team-page-option" data-team-placeholder><span>${esc(title)}<small>${esc(copy)}</small></span><i>›</i></button>`).join("")}</div><button type="button" class="evia-team-page-back" data-team-page-back>Back to Evia</button></section>`}
function openAssistant(id,e){
  e?.preventDefault();e?.stopPropagation();e?.stopImmediatePropagation?.();
  const a=assistants[id],app=document.querySelector(".evia-app.selfobs");if(!a||!app)return;
  resetLook();document.querySelector(`[data-evia-team-page]`)?.remove();pageOpen=true;assistantsOpen=false;app.classList.remove("evia-team-open");
  app.insertAdjacentHTML("beforeend",pageHtml(id,a));const page=app.querySelector("[data-evia-team-page]");if(!page){pageOpen=false;return}
  requestAnimationFrame(()=>{page.classList.add("is-visible");requestAnimationFrame(()=>page.classList.add("is-intro"))});
  setTimeout(()=>{if(!page.isConnected)return;page.classList.remove("is-intro");page.classList.add("is-ready")},1450)
}
function closePage(e){
  e?.preventDefault();e?.stopPropagation();e?.stopImmediatePropagation?.();resetLook();
  const page=document.querySelector("[data-evia-team-page]");if(!page){pageOpen=false;queuePatch();return}
  page.classList.remove("is-menu","is-ready","is-intro","is-visible");pageOpen=false;assistantsOpen=false;setTimeout(()=>{page.remove();queuePatch()},680)
}
document.addEventListener("click",e=>{
  const mainEvia=e.target.closest?.("[data-evia]");if(mainEvia&&assistantsOpen){assistantsOpen=false;resetLook();queuePatch()}
  const launch=e.target.closest?.("[data-evia-team-launch]");if(launch){toggleAssistants(e);return}
  const choice=e.target.closest?.("[data-evia-team]");if(choice){openAssistant(choice.dataset.eviaTeam,e);return}
  const avatar=e.target.closest?.("[data-team-page-avatar]");if(avatar){const page=avatar.closest("[data-evia-team-page]");if(page?.classList.contains("is-ready"))page.classList.add("is-menu");return}
  const back=e.target.closest?.("[data-team-page-back]");if(back){closePage(e);return}
  const placeholder=e.target.closest?.("[data-team-placeholder]");if(placeholder){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.()}
},true);
function start(){ensureStyles();queuePatch();const root=document.getElementById("root");if(root&&!root.__eviaTeamObserver){root.__eviaTeamObserver=true;new MutationObserver(queuePatch).observe(root,{childList:true,subtree:true})}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.addEventListener("pageshow",queuePatch);
window.EviaAssistants={open:()=>{assistantsOpen=true;pageOpen=false;queuePatch();startLookSequence()},close:()=>{assistantsOpen=false;resetLook();closePage()}};
})();
