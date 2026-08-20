(()=>{
"use strict";
const SHELL_CLASS="naxos-epa-shell";
const INDIGO="#30345e";
let active=false;
let returning=false;
let timers=[];
let percentFrame=null;

function eligible(){
  try{
    const c=window.EviaCourseContext?.current?.();
    return !!c&&c.epaConfigured!==false&&String(c.courseType||"apprenticeship")!=="nvq"
  }catch{return false}
}

function learnerFirstName(){
  try{
    const raw=window.localStorage.getItem("evia-full-name")||"";
    return raw.trim().split(/\s+/)[0]||"there"
  }catch{return "there"}
}

function currentEpaPercent(){
  try{
    const arch=[...document.querySelectorAll(".progress-arch")].find(x=>String(x.querySelector(".arch-label")?.textContent||"").trim().toUpperCase()==="EPA");
    const text=arch?.querySelector(".arch-number")?.textContent||arch?.getAttribute("aria-label")||"";
    const n=Number.parseFloat(String(text).replace(/[^0-9.]/g,""));
    return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0
  }catch{return 0}
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))
}

function later(fn,ms){
  const id=window.setTimeout(()=>{
    timers=timers.filter(x=>x!==id);
    fn()
  },ms);
  timers.push(id);
  return id
}

function clearTimers(){
  timers.forEach(id=>window.clearTimeout(id));
  timers=[];
  if(percentFrame!==null){
    cancelAnimationFrame(percentFrame);
    percentFrame=null
  }
}

function animateEpaPercent(shell,target){
  const el=shell.querySelector("[data-naxos-percent]");
  if(!el)return;
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||document.querySelector(".is-reduced-motion");
  if(reduced){
    el.textContent=`${target}%`;
    el.setAttribute("aria-label",`EPA progress ${target}%`);
    return
  }
  const start=performance.now(),duration=1050;
  const tick=now=>{
    const p=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-p,3),value=Math.round(target*eased);
    el.textContent=`${value}%`;
    el.setAttribute("aria-label",`EPA progress ${value}%`);
    if(p<1)percentFrame=requestAnimationFrame(tick);
    else percentFrame=null
  };
  percentFrame=requestAnimationFrame(tick)
}

function ensureStyles(){
  if(document.getElementById("naxos-epa-shell-style"))return;
  const s=document.createElement("style");
  s.id="naxos-epa-shell-style";
  s.textContent=`
.${SHELL_CLASS}{
  --yellow:${INDIGO};
  --ease-out:cubic-bezier(.22,1,.36,1);
  z-index:1000;
  position:absolute;
  inset:0;
  overflow:hidden;
  opacity:0;
  pointer-events:auto;
  background:linear-gradient(180deg,#fcfcfd 0%,#f8f8fb 60%,#ececf5 100%);
  transition:opacity .68s ease;
  isolation:isolate;
}
.${SHELL_CLASS}:before{
  content:"";
  position:absolute;
  inset:0;
  z-index:-2;
  pointer-events:none;
  background:radial-gradient(at 50% 105%,rgba(48,52,94,.25),transparent 42%),radial-gradient(circle at 10% 8%,rgba(255,255,255,.95),transparent 30%);
}
.${SHELL_CLASS}:after{
  content:"";
  position:absolute;
  width:24rem;
  height:24rem;
  border-radius:50%;
  top:18%;
  left:50%;
  z-index:-1;
  opacity:.18;
  filter:blur(105px);
  pointer-events:none;
  background:rgba(48,52,94,.28);
  transform:translateX(-50%);
  transition:transform 1.65s var(--ease-out),opacity 1.2s ease;
}
.${SHELL_CLASS}.is-screen-visible{opacity:1}
.${SHELL_CLASS}.is-returning{pointer-events:none!important}
.${SHELL_CLASS}.is-menu-open:after{opacity:.13;transform:translate(-50%,-5vh) scale(.94)}
.naxos-epa-intro{
  position:absolute;
  inset:0;
  z-index:30;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  opacity:0;
  pointer-events:none;
  transform:translateY(6px);
  transition:opacity .55s ease,transform .55s var(--ease-out);
}
.naxos-epa-intro.is-visible{opacity:1;transform:translateY(0)}
.naxos-epa-intro strong{
  color:${INDIGO};
  letter-spacing:-.04em;
  font-size:clamp(2rem,7vw,3rem);
  font-weight:420;
  line-height:1;
}
.naxos-epa-intro span{
  color:rgba(48,52,94,.72);
  letter-spacing:.035em;
  margin-top:.52rem;
  font-size:clamp(.72rem,2.4vw,.9rem);
  font-weight:430;
}
.${SHELL_CLASS}.is-returning .naxos-epa-intro strong{color:#202022}
.${SHELL_CLASS}.is-returning .naxos-epa-intro span{color:#747477}
.naxos-epa-brand,
.naxos-epa-percent{
  position:absolute;
  z-index:25;
  top:max(.8rem,env(safe-area-inset-top));
  opacity:0;
  pointer-events:none;
  transition:opacity .45s ease;
}
.naxos-epa-brand{left:1rem}
.naxos-epa-brand b,
.naxos-epa-brand small{display:block}
.naxos-epa-brand b{color:${INDIGO};font-size:.83rem;font-weight:440}
.naxos-epa-brand small{margin-top:.04rem;color:rgba(48,52,94,.62);font-size:.55rem;font-weight:390}
.naxos-epa-percent{
  right:1rem;
  color:${INDIGO};
  text-align:right;
  font-size:1rem;
  font-weight:470;
  letter-spacing:-.025em;
}
.${SHELL_CLASS}.is-content-ready .naxos-epa-brand,
.${SHELL_CLASS}.is-content-ready .naxos-epa-percent{opacity:1}
.${SHELL_CLASS}.is-returning .naxos-epa-brand,
.${SHELL_CLASS}.is-returning .naxos-epa-percent{opacity:0!important}
.${SHELL_CLASS} .naxos-epa-avatar{
  --evia-size:clamp(9.75rem,17vw,11.75rem);
  --evia-stroke:clamp(2.5px,.26vw,3px);
  z-index:20;
  width:var(--evia-size);
  height:var(--evia-size);
  opacity:0;
  pointer-events:none;
  cursor:pointer;
  transition:top .92s var(--ease-out),width .92s var(--ease-out),height .92s var(--ease-out),opacity .6s ease,transform .92s var(--ease-out);
  background:transparent;
  border:0;
  border-radius:50%;
  margin:0;
  padding:0;
  position:absolute;
  top:42%;
  left:50%;
  transform:translate(-50%,calc(18px - 50%));
}
.${SHELL_CLASS}.is-content-ready .naxos-epa-avatar{
  opacity:1;
  pointer-events:auto;
  transform:translate(-50%,-50%);
}
.${SHELL_CLASS}.is-menu-open .naxos-epa-avatar{
  --evia-size:clamp(6.25rem,9vw,6.8rem);
  --evia-stroke:clamp(1.5px,.15vw,1.75px);
  top:clamp(5rem,11vh,6.35rem);
}
.${SHELL_CLASS}.is-returning .naxos-epa-avatar{opacity:0!important;pointer-events:none!important}
.${SHELL_CLASS} .naxos-epa-avatar .evia-halo{
  background:radial-gradient(circle,rgba(48,52,94,.24) 0%,rgba(48,52,94,.075) 43%,transparent 72%);
}
.${SHELL_CLASS} .naxos-epa-avatar .evia-face,
.${SHELL_CLASS} .naxos-epa-avatar .evia-eye{border-color:${INDIGO}}
.${SHELL_CLASS} .naxos-epa-avatar:hover .evia-face{filter:drop-shadow(0 8px 14px rgba(48,52,94,.13))}
.naxos-epa-greeting{
  position:absolute;
  z-index:18;
  top:calc(42% + 6.25rem);
  left:50%;
  width:max-content;
  max-width:calc(100% - 2rem);
  margin:0;
  opacity:0;
  pointer-events:none;
  transform:translate(-50%,6px);
  color:rgba(48,52,94,.68);
  white-space:nowrap;
  text-align:center;
  font-size:.62rem;
  font-weight:400;
  transition:opacity .4s ease,transform .4s var(--ease-out);
}
.${SHELL_CLASS}.is-content-ready:not(.is-menu-open) .naxos-epa-greeting{opacity:1;transform:translate(-50%,0)}
.${SHELL_CLASS}.is-menu-open .naxos-epa-greeting,
.${SHELL_CLASS}.is-returning .naxos-epa-greeting{opacity:0!important;transform:translate(-50%,-5px)!important}
.naxos-epa-menu{
  position:absolute;
  z-index:15;
  inset:clamp(8.4rem,18vh,10rem) .85rem calc(1.25rem + env(safe-area-inset-bottom));
  display:grid;
  justify-items:center;
  align-items:start;
  padding-top:.45rem;
  opacity:0;
  pointer-events:none;
  transform:translateY(14px);
  transition:opacity .36s ease .14s,transform .58s var(--ease-out) .14s;
}
.${SHELL_CLASS}.is-menu-open .naxos-epa-menu{opacity:1;pointer-events:auto;transform:translateY(0)}
.${SHELL_CLASS}.is-returning .naxos-epa-menu{opacity:0!important;pointer-events:none!important;transform:translateY(8px)!important}
.naxos-epa-options{
  width:min(29rem,100%);
  display:grid;
  grid-template-rows:repeat(4,3.55rem);
  gap:.7rem;
  align-content:start;
}
.${SHELL_CLASS} .naxos-epa-option{
  color:#363849;
  border-color:rgba(48,52,94,.13);
  box-shadow:inset 0 1px rgba(255,255,255,.86),0 5px 18px rgba(32,35,63,.055);
}
.${SHELL_CLASS} .naxos-epa-option:hover,
.${SHELL_CLASS} .naxos-epa-option:focus-visible{border-color:rgba(48,52,94,.24);background:rgba(255,255,255,.79)}
.${SHELL_CLASS} .naxos-epa-option .option-row-copy>span{color:#363849}
.naxos-back-evia{
  position:absolute;
  z-index:40;
  left:50%;
  bottom:max(.85rem,env(safe-area-inset-bottom));
  opacity:0;
  pointer-events:none;
  transform:translateX(-50%);
  border:0;
  background:transparent;
  color:rgba(48,52,94,.68);
  cursor:pointer;
  padding:.45rem .7rem;
  font-size:.66rem;
  font-weight:420;
  letter-spacing:.01em;
  transition:opacity .36s ease,color .2s ease,transform .28s var(--ease-out);
  -webkit-tap-highlight-color:transparent;
}
.${SHELL_CLASS}.is-content-ready .naxos-back-evia{opacity:1;pointer-events:auto}
.${SHELL_CLASS}.is-returning .naxos-back-evia{opacity:0!important;pointer-events:none!important}
.naxos-back-evia:hover,.naxos-back-evia:focus-visible{color:${INDIGO};outline:none;transform:translate(-50%,-1px)}
.naxos-back-evia:active{transform:translate(-50%,0) scale(.98)}
@media(max-width:560px){
  .${SHELL_CLASS} .naxos-epa-avatar{top:40.5%}
  .${SHELL_CLASS}.is-menu-open .naxos-epa-avatar{--evia-size:5.9rem;top:max(4.45rem,calc(env(safe-area-inset-top) + 3.45rem))}
  .naxos-epa-greeting{top:calc(40.5% + 5.75rem);font-size:.59rem}
  .naxos-epa-options{grid-template-rows:repeat(4,3.42rem);gap:.64rem}
  .naxos-epa-menu{inset:max(7.65rem,calc(env(safe-area-inset-top) + 6.9rem)) 1rem calc(1rem + env(safe-area-inset-bottom));padding-top:.55rem}
}
@media(max-height:700px){
  .naxos-epa-menu{inset:7.4rem .75rem calc(.8rem + env(safe-area-inset-bottom));padding-top:.1rem}
  .naxos-epa-options{grid-template-rows:repeat(4,3.2rem);gap:.52rem}
}
@media(max-height:650px){
  .${SHELL_CLASS}.is-menu-open .naxos-epa-avatar{--evia-size:5.45rem;top:3.5rem}
  .naxos-epa-menu{top:6.3rem}
}
@media(prefers-reduced-motion:reduce){
  .${SHELL_CLASS},.naxos-epa-intro,.naxos-epa-brand,.naxos-epa-percent,.${SHELL_CLASS} .naxos-epa-avatar,.naxos-epa-greeting,.naxos-epa-menu,.naxos-back-evia{transition-duration:.01ms!important;transition-delay:0s!important}
}
`;
  document.head.appendChild(s)
}

function makeShell(host){
  document.querySelector(`.${SHELL_CLASS}`)?.remove();
  const shell=document.createElement("section");
  shell.className=SHELL_CLASS;
  shell.setAttribute("aria-label","Naxos EPA assistant");
  const first=learnerFirstName();
  shell.innerHTML=`
    <div class="naxos-epa-intro" aria-hidden="true"><strong>Naxos</strong><span>EPA assistant</span></div>
    <div class="naxos-epa-brand"><b>Naxos</b><small>EPA assistant</small></div>
    <div class="naxos-epa-percent" data-naxos-percent aria-label="EPA progress 0%">0%</div>
    <button type="button" class="evia-anchor naxos-epa-avatar" data-naxos aria-label="Naxos EPA assistant" aria-expanded="false">
      <span class="evia-float">
        <span class="evia-halo"></span>
        <span class="evia-face expression-idle">
          <span class="evia-eyes">
            <span class="evia-eye eye-left"></span>
            <span class="evia-eye eye-right"></span>
          </span>
        </span>
      </span>
    </button>
    <p class="naxos-epa-greeting">Hi ${escapeHtml(first)}, tap me to get started</p>
    <section class="naxos-epa-menu" aria-hidden="true">
      <div class="naxos-epa-options">
        <button type="button" class="option-row naxos-epa-option" data-naxos-option="multiple-choice"><span class="option-row-copy"><span>Multiple choice Mock</span></span></button>
        <button type="button" class="option-row naxos-epa-option" data-naxos-option="interview"><span class="option-row-copy"><span>Interview Mock</span></span></button>
        <button type="button" class="option-row naxos-epa-option" data-naxos-option="practical"><span class="option-row-copy"><span>Practical Mock</span></span></button>
        <button type="button" class="option-row naxos-epa-option" data-naxos-option="full"><span class="option-row-copy"><span>Full EPA Mock</span></span></button>
      </div>
    </section>
    <button type="button" class="naxos-back-evia" data-back-to-evia>Back to Evia</button>`;
  host.appendChild(shell);
  const avatar=shell.querySelector("[data-naxos]");
  const menu=shell.querySelector(".naxos-epa-menu");
  avatar?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    const open=!shell.classList.contains("is-menu-open");
    shell.classList.toggle("is-menu-open",open);
    avatar.setAttribute("aria-expanded",String(open));
    menu?.setAttribute("aria-hidden",String(!open))
  });
  shell.querySelector("[data-back-to-evia]")?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    exit(true)
  });
  shell.querySelectorAll("[data-naxos-option]").forEach(button=>button.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation()
  }));
  return shell
}

function enter(){
  if(active||!eligible())return false;
  const host=document.querySelector(".selfobs");
  if(!host)return false;
  ensureStyles();
  clearTimers();
  returning=false;
  active=true;
  const epaTarget=currentEpaPercent();
  const shell=makeShell(host);
  const intro=shell.querySelector(".naxos-epa-intro");
  requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add("is-screen-visible")));
  later(()=>intro?.classList.add("is-visible"),720);
  later(()=>intro?.classList.remove("is-visible"),1600);
  later(()=>{
    shell.classList.add("is-content-ready");
    animateEpaPercent(shell,epaTarget)
  },2200);
  return true
}

function exit(animated=true){
  if(returning&&animated)return;
  clearTimers();
  const shell=document.querySelector(`.${SHELL_CLASS}`);
  if(!shell){
    active=false;
    returning=false;
    return
  }
  if(!animated){
    active=false;
    returning=false;
    shell.remove();
    return
  }
  returning=true;
  shell.classList.add("is-returning");
  shell.classList.remove("is-menu-open","is-content-ready");
  const intro=shell.querySelector(".naxos-epa-intro");
  later(()=>{
    if(!intro)return;
    intro.innerHTML="<strong>Evia</strong><span>Apprentice assistant</span>";
    intro.classList.add("is-visible")
  },680);
  later(()=>intro?.classList.remove("is-visible"),1580);
  later(()=>shell.classList.remove("is-screen-visible"),2160);
  later(()=>{
    active=false;
    returning=false;
    shell.remove()
  },2920)
}

document.addEventListener("click",e=>{
  const b=e.target instanceof Element?e.target.closest("[data-arch]"):null;
  if(!b)return;
  const arch=String(b.dataset.arch||"").toUpperCase();
  if(arch==="EPA"&&eligible()){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    enter();
    return
  }
  if(active)exit(true)
},true);

window.addEventListener("pagehide",()=>exit(false));
window.EviaNaxosLanding={enter,exit,isActive:()=>active};
})();