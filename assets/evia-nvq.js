(()=>{
"use strict";
const GLH_KEY="evia-glh-entries";
function ctx(){const c=window.EviaCourseContext?.current?.();return c?.courseType==="nvq"?c:null}
function meta(){return window.EviaTrowelMeta||null}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function entries(){const x=read("evia-selfobs-live-v3",[]);return Array.isArray(x)?x:[]}
function glhEntries(){const x=read(GLH_KEY,[]);return Array.isArray(x)?x:[]}
function mins(x){return Math.max(0,Math.round(Number(x?.durationMinutes)||0))}
function glhMinutes(){return glhEntries().reduce((n,x)=>n+mins(x),0)}
function countMap(){
  const c=ctx(),out={};if(!c)return out;c.codes.forEach(x=>out[x]=0);
  entries().forEach(e=>(Array.isArray(e?.codes)?e.codes:[]).forEach(code=>{if(code in out)out[code]++}));
  return out
}
function dots(n){n=Math.max(0,Math.round(Number(n)||0));return !n?"":n>5?`o x ${n}`:"o".repeat(n)}
function acPercent(){const c=ctx();if(!c?.codes?.length)return 0;const x=countMap();return Math.round(c.codes.filter(code=>(x[code]||0)>0).length/c.codes.length*100)}
function glhPercent(){const c=ctx();if(!c)return 0;return Math.round(Math.min(1,glhMinutes()/(Math.max(1,Number(c.glhTargetHours)||847)*60))*100)}
function unitStats(){
  const c=ctx(),m=meta(),x=countMap();if(!c||!m)return[];
  return(c.units||[]).map(unit=>{
    const codes=(m.unitCodes?.[String(unit)]||[]).filter(code=>c.codes.includes(code));
    const touched=codes.filter(code=>(x[code]||0)>0).length;
    return{unit,title:m.unitTitles?.[String(unit)]||`Unit ${unit}`,codes,touched,pct:codes.length?Math.round(touched/codes.length*100):0}
  })
}
function unitsPercent(){const xs=unitStats();return xs.length?Math.round(xs.reduce((n,x)=>n+x.pct,0)/xs.length):0}
function setArch(button,label,pct,newKey){
  if(!button)return;
  if(newKey&&button.dataset.arch!==newKey)button.dataset.arch=newKey;
  const lab=button.querySelector(".arch-label"),num=button.querySelector(".arch-number"),path=button.querySelector(".arch-value");
  if(lab&&lab.textContent!==label)lab.textContent=label;
  if(num&&num.textContent!==`${pct}%`)num.textContent=`${pct}%`;
  if(path&&path.getAttribute("stroke-dasharray")!==`${pct} 100`)path.setAttribute("stroke-dasharray",`${pct} 100`)
}
function patchText(){
  document.querySelectorAll(".self-copy").forEach(el=>{
    const t=el.textContent||"",next=t.replace(/\bKSBs\b/g,"ACs").replace(/\bKSB\b/g,"AC");
    if(next!==t)el.textContent=next
  });
  document.querySelectorAll(".self-entry small").forEach(el=>{
    if(el.dataset.nvqCompact==="1")return;
    const parts=(el.textContent||"").split(" · "),date=parts[parts.length-1]||"";
    el.textContent=`AC evidence · ${date}`;el.dataset.nvqCompact="1"
  })
}
function patchShell(){
  const c=ctx();if(!c)return;
  const ksb=document.querySelector('[data-arch="KSB"],[data-arch="AC"]');
  const otj=document.querySelector('[data-arch="OTJ"],[data-arch="GLH"]');
  const epa=document.querySelector('[data-arch="EPA"],[data-arch="Units"]');
  setArch(ksb,"AC",acPercent(),"AC");
  setArch(otj,"GLH",glhPercent(),"GLH");
  setArch(epa,"Units",unitsPercent(),"Units");
  patchText()
}
function close(){document.querySelector(".evia-nvq-layer")?.remove()}
function layer(body,title,back=null){
  close();document.querySelector(".evia-tools-layer:not(.evia-nvq-layer)")?.remove();
  const el=document.createElement("div");el.className="evia-tools-layer evia-nvq-layer evia-nvq";
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-nvq-back>‹ Back</button><b>${esc(title)}</b><span></span></div><div class="evia-tools-body">${body}</div></section>`;
  document.body.appendChild(el);el.querySelector("[data-nvq-back]").onclick=back||close;return el
}
function themeGroups(){
  const c=ctx(),m=meta(),x=countMap(),by={};
  if(!c||!m)return[];
  c.codes.forEach(code=>{
    const theme=m.codeTheme?.[code]||"";
    if(!theme)return;
    const g=by[theme]||(by[theme]={id:theme,title:m.themeNames?.[theme]||theme,codes:[],touched:0,evidence:0});
    g.codes.push(code);if((x[code]||0)>0)g.touched++
  });
  const es=entries();
  Object.values(by).forEach(g=>{g.evidence=es.filter(e=>(e.codes||[]).some(code=>g.codes.includes(code))).length});
  return Object.values(by).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}))
}
function themeRows(xs){
  if(!xs.length)return'<div class="evia-nvq-empty">No themes in this section.</div>';
  return xs.map(g=>`<button class="evia-tools-row evia-nvq-theme" data-nvq-theme="${esc(g.id)}"><span><b>${esc(g.id)} · ${esc(g.title)}</b><small>${g.touched} of ${g.codes.length} ACs evidenced</small></span><em>${esc(dots(g.evidence))}</em></button>`).join("")
}
function openCoverage(){
  const c=ctx(),m=meta();if(!c||!m)return;
  const groups=themeGroups(),practical=groups.filter(g=>g.id.startsWith("P")),theory=groups.filter(g=>g.id.startsWith("T")),x=countMap(),touched=c.codes.filter(code=>(x[code]||0)>0).length;
  const el=layer(`
    <p class="evia-tools-kicker">Course coverage</p>
    <div class="evia-nvq-overall"><strong>${acPercent()}%</strong><span>${touched} of ${c.codes.length} official ACs evidenced</span></div>
    <p class="evia-tools-copy">The learner does not need to manage hundreds of criteria. Evia groups them into practical and theory themes while keeping every official Unit → LO → AC underneath.</p>
    <h3 class="evia-nvq-heading">Practical</h3>${themeRows(practical)}
    <h3 class="evia-nvq-heading">Theory</h3>${themeRows(theory)}
    <p class="evia-nvq-note">Yellow marks show evidence frequency, not assessor sign-off or completion.</p>
  `,"Course coverage",close);
  el.querySelectorAll("[data-nvq-theme]").forEach(b=>b.onclick=()=>openTheme(b.dataset.nvqTheme,openCoverage))
}
function openTheme(theme,back=openCoverage){
  const c=ctx(),m=meta(),x=countMap(),g=themeGroups().find(v=>v.id===theme);if(!c||!m||!g)return;
  const codes=g.codes.slice().sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  layer(`
    <p class="evia-tools-kicker">${esc(theme.startsWith("P")?"Practical theme":"Theory theme")}</p>
    <h2>${esc(g.title)}</h2>
    <p class="evia-tools-copy">${g.touched} of ${g.codes.length} linked official ACs currently have evidence. The ACs stay underneath so the assessor can judge the evidence holistically.</p>
    <div class="evia-nvq-ac-grid">${codes.map(code=>`<span class="${(x[code]||0)>0?"on":""}"><b>${esc(code)}</b><i>${esc(dots(x[code]||0))}</i></span>`).join("")}</div>
  `,`${theme} coverage`,back)
}
function pace(){
  const c=ctx();if(!c)return null;
  const t=read("evia-course-timeline",{}),s=Date.parse(`${t.startDate||""}T00:00:00`),e=Date.parse(`${t.endDate||""}T00:00:00`);
  if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s)return null;
  const fraction=Math.max(0,Math.min(1,(Date.now()-s)/(e-s))),expected=Math.round((Number(c.glhTargetHours)||847)*60*fraction);
  return{fraction,expected}
}
function fmt(total){const n=Math.max(0,Math.round(total||0)),h=Math.floor(n/60),m=n%60;return m?`${h}h ${m}m`:`${h}h`}
function dateText(v){if(!v)return"";const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function today(){const d=new Date(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return`${d.getFullYear()}-${m}-${day}`}
const GLH_TYPES=["College session","Assessor visit","Guided teaching","Supervisor session","Workplace training"];
function openGLH(){
  const c=ctx();if(!c)return;const xs=glhEntries(),known=glhMinutes(),p=pace(),target=Math.max(1,Number(c.glhTargetHours)||847);
  const el=layer(`
    <p class="evia-tools-kicker">Guided learning</p>
    <div class="evia-nvq-overall"><strong>${fmt(known)}</strong><span>of ${target}h qualification GLH</span></div>
    ${p?`<div class="evia-nvq-pace"><b>Expected by now</b><strong>${fmt(p.expected)}</strong><span>${Math.round(p.fraction*100)}% through planned course time</span></div>`:""}
    <button class="evia-tools-primary" data-glh-add>Add guided learning</button>
    <div class="evia-nvq-log">${xs.length?xs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>`<div class="evia-nvq-entry"><span><b>${esc(e.subject||e.type||"Guided learning")}</b><small>${esc(e.type||"")} · ${esc(dateText(e.date))} · ${fmt(mins(e))}</small>${e.learning?`<em>${esc(e.learning)}</em>`:""}</span><button data-glh-delete="${esc(e.id)}" aria-label="Delete">×</button></div>`).join(""):'<div class="evia-nvq-empty">No guided learning recorded yet.</div>'}</div>
    <p class="evia-nvq-note">GLH is learning under the direct supervision of a provider, tutor, assessor or other person providing guided teaching/training. This is separate from apprenticeship OTJ.</p>
  `,"GLH",close);
  el.querySelector("[data-glh-add]").onclick=openGLHForm;
  el.querySelectorAll("[data-glh-delete]").forEach(b=>b.onclick=()=>{write(GLH_KEY,glhEntries().filter(e=>e.id!==b.dataset.glhDelete));patchShell();openGLH()})
}
function openGLHForm(){
  const el=layer(`
    <p class="evia-tools-kicker">Guided learning</p><h2>Add learning</h2>
    <p class="evia-tools-copy">Record the guided learning that actually happened. A short note about what was learned is enough.</p>
    <div class="evia-nvq-form">
      <label>Activity<select data-glh-type>${GLH_TYPES.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label>
      <label>Subject<input data-glh-subject type="text" placeholder="e.g. Setting out curves"></label>
      <label>Date<input data-glh-date type="date" value="${today()}"></label>
      <div class="evia-nvq-time"><label>Hours<input data-glh-hours type="number" min="0" max="24" inputmode="numeric" value="1"></label><label>Minutes<input data-glh-mins type="number" min="0" max="59" inputmode="numeric" value="0"></label></div>
      <label>What did you do and learn?<textarea data-glh-learning placeholder="Keep it short."></textarea></label>
    </div>
    <div class="evia-toc-error" data-glh-error></div>
    <button class="evia-tools-primary" data-glh-save>Save guided learning</button>
  `,"Add GLH",openGLH);
  el.querySelector("[data-glh-save]").onclick=()=>{
    const type=el.querySelector("[data-glh-type]").value,subject=el.querySelector("[data-glh-subject]").value.trim(),date=el.querySelector("[data-glh-date]").value,h=Math.max(0,Number(el.querySelector("[data-glh-hours]").value)||0),m=Math.max(0,Math.min(59,Number(el.querySelector("[data-glh-mins]").value)||0)),learning=el.querySelector("[data-glh-learning]").value.trim(),err=el.querySelector("[data-glh-error]");
    const durationMinutes=Math.round(h*60+m);if(!date||durationMinutes<=0){err.textContent="Add a date and the guided learning time.";return}
    const xs=glhEntries();xs.unshift({id:`glh-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type,subject:subject||type,date,durationMinutes,learning,createdAt:Date.now()});write(GLH_KEY,xs);patchShell();openGLH()
  }
}
function openUnits(){
  const xs=unitStats(),m=meta(),c=ctx();if(!c||!m)return;
  layer(`
    <p class="evia-tools-kicker">Unit portfolio coverage</p>
    <div class="evia-nvq-overall"><strong>${unitsPercent()}%</strong><span>average AC evidence coverage across ${xs.length} required units</span></div>
    <p class="evia-tools-copy">All eight mandatory units and the selected optional unit are tracked underneath the same evidence you collect from real jobs.</p>
    ${xs.map(x=>`<div class="evia-tools-row evia-nvq-unit"><span><b>Unit ${x.unit}</b><small>${esc(x.title)} · ${x.touched}/${x.codes.length} ACs evidenced</small></span><em>${x.pct}%</em></div>`).join("")}
    <p class="evia-nvq-note">This is portfolio evidence coverage only. It does not mark a unit as assessed or signed off.</p>
  `,"Units",close)
}
document.addEventListener("click",e=>{
  if(!ctx())return;
  const a=e.target.closest?.('[data-arch="AC"],[data-arch="KSB"]');
  const g=e.target.closest?.('[data-arch="GLH"],[data-arch="OTJ"]');
  const u=e.target.closest?.('[data-arch="Units"],[data-arch="EPA"]');
  const coverage=e.target.closest?.('[data-action="coverage"]');
  if(a||coverage){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();openCoverage();return}
  if(g){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();openGLH();return}
  if(u){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();openUnits();return}
},true);
function ready(){if(!ctx())return;patchShell();const root=document.getElementById("root");if(root&&!root.__eviaNvqObserver){root.__eviaNvqObserver=true;new MutationObserver(()=>requestAnimationFrame(patchShell)).observe(root,{childList:true,subtree:true})}}
window.addEventListener("load",ready);window.addEventListener("pageshow",ready);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")ready()});setTimeout(ready,80);
})();