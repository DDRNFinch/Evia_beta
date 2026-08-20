(()=>{
"use strict";
const RPL_KEY="evia-rpl-ksbs-v1",EVIDENCE_KEY="evia-selfobs-live-v3";
const COMMON={K1:"H&S regulations, standards & guidance",K2:"PPE, RPE & safety controls",K3:"Safe systems of work",K4:"Environmental impact & sustainable resources",K5:"Building & modern construction principles",K6:"Digital design & modelling systems",K7:"Carpentry standards & regulations",K8:"Drawings & specifications",K9:"Timber & material characteristics",K10:"Timber decay & repair",K11:"Carpentry/joinery products & ironmongery",K12:"Material estimating & cutting lists",K13:"Verbal communication & construction terminology",K14:"Hand tools: use & storage",K15:"Hand tool maintenance & sharpening",K16:"Jigs",K17:"Power tools: use & storage",K18:"Team working",K19:"Inclusion, equity & diversity",K20:"Wellbeing & support",K40:"Employment & self-employment",S1:"Comply with H&S requirements",S2:"Use PPE/RPE & safety controls",S3:"Sustainability & waste management",S4:"Industry standards & regulations",S5:"Prepare a safe work area",S6:"Interpret drawings & specifications",S7:"Estimate materials & cutting lists",S8:"Verbal communication",S9:"Use hand tools",S10:"Use power tools",S11:"Maintain & sharpen hand tools",S12:"Produce jigs",S13:"Identify wellbeing support",B1:"Put H&S and wellbeing first",B2:"Consider the environment & resources",B3:"Support an inclusive/diverse culture",B4:"Seek learning & development",B5:"Work as part of the wider team"};
const SITE={K21:"Site measuring, marking, fitting, cutting & mitring",K22:"Structural fixtures & timber sizing",K23:"Timber sizing tables",K24:"Splicing & scribing",K25:"Straight roofs",K26:"Flat roofs",K27:"First-fix carpentry",K28:"Second-fix carpentry",K29:"Laser levels",S14:"First-fix carpentry",S15:"Structural fixings",S16:"Use timber sizing tables",S17:"Second-fix carpentry",S18:"Rafter roofs",S19:"Use laser levels",S20:"Form carpentry connections",S21:"Measure, mark, cut, mitre, hinge & recess",S22:"Splice & scribe timber"};
const AJ={K30:"Fire-door assembly requirements",K31:"Fixed workshop machinery",K32:"Setting out & marking out",K33:"Timber joints",K34:"Timber windows",K35:"Joinery connections",K36:"First-fix manufacture",K37:"Second-fix manufacture",K38:"Finishing",K39:"Joinery ironmongery",S23:"Setting rods & marking out",S24:"Make basic timber joints",S25:"Form joinery connections",S26:"Manufacture timber windows",S27:"First-fix manufacture",S28:"Second-fix manufacture",S29:"Fit joinery ironmongery",S30:"Operate fixed machinery"};

function ctx(){return window.EviaCourseContext?.current?.()||null}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function sameText(el,value){value=String(value);if(el&&el.textContent!==value)el.textContent=value}
function sameAttr(el,name,value){value=String(value);if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value)}
function rplSet(){const c=ctx(),allowed=new Set(c?.codes||[]),x=read(RPL_KEY,[]);return new Set((Array.isArray(x)?x:[]).filter(code=>allowed.has(code)))}
function evidenceSet(){const c=ctx(),allowed=new Set(c?.codes||[]),out=new Set(),xs=read(EVIDENCE_KEY,[]);if(Array.isArray(xs))xs.forEach(e=>(Array.isArray(e?.codes)?e.codes:[]).forEach(code=>{if(allowed.has(code))out.add(code)}));return out}
function save(set){write(RPL_KEY,[...set]);schedule()}
function setArch(button,pct){if(!button)return;const path=button.querySelector(".arch-value"),num=button.querySelector(".arch-number");sameAttr(path,"stroke-dasharray",`${pct} 100`);sameText(num,`${pct}%`)}
function patchCoverage(){
  const c=ctx();if(!c?.codes?.length)return;
  const covered=new Set([...rplSet(),...evidenceSet()]),pct=Math.round(c.codes.filter(x=>covered.has(x)).length/c.codes.length*100);
  setArch(c.courseType==="nvq"?document.querySelector('[data-arch="AC"],[data-arch="KSB"]'):document.querySelector('[data-arch="KSB"]'),pct);
  const r=rplSet();
  document.querySelectorAll(".self-ksbs button[data-code]").forEach(btn=>{
    let mark=btn.querySelector(".evia-rpl-o"),on=r.has(btn.dataset.code);
    if(on&&!mark){mark=document.createElement("span");mark.className="evia-rpl-o";mark.textContent="o";btn.appendChild(mark)}
    else if(!on&&mark)mark.remove()
  })
}
function patchAdminButton(){
  const c=ctx();
  document.querySelectorAll("[data-admin-rpl]").forEach(btn=>{
    const b=btn.querySelector("b"),small=btn.querySelector("small");if(!b||!small)return;
    if(c?.courseType==="nvq"){sameText(b,"Recognised prior learning · ACs");sameText(small,`${c.codes.length} mapped ACs · grouped like the course`)}
    else if(c?.courseId==="st0264-v1-4"){sameText(b,"Recognised prior learning · KSBs");sameText(small,`${c.codes.length} KSBs · ${c.pathwayTitle}`)}
  })
}
function closeLayer(){document.querySelector(".evia-rpl-course-layer")?.remove();document.querySelector(".evia-tools-layer.admin")?.classList.remove("evia-rpl-under")}
function layer(body,title,back=closeLayer){
  closeLayer();
  const admin=[...document.querySelectorAll(".evia-tools-layer.admin")].find(el=>el.querySelector("[data-admin-rpl]"));admin?.classList.add("evia-rpl-under");
  const el=document.createElement("div");el.className="evia-tools-layer evia-rpl-course-layer";
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-rpl-back>‹ Back</button><b>${esc(title)}</b><span></span></div><div class="evia-tools-body">${body}</div></section>`;
  document.body.appendChild(el);el.querySelector("[data-rpl-back]").onclick=back;return el
}
function bindRows(el){el.querySelectorAll("[data-rpl-code]").forEach(btn=>btn.onclick=()=>{const set=rplSet(),code=btn.dataset.rplCode;if(set.has(code))set.delete(code);else set.add(code);save(set);btn.classList.toggle("on",set.has(code));sameText(btn.querySelector("em"),set.has(code)?"RPL":"");updateCounters(el,set)})}
function updateCounters(root,set=rplSet()){root.querySelectorAll("[data-rpl-codes]").forEach(el=>{const codes=(el.dataset.rplCodes||"").split("|").filter(Boolean),n=codes.filter(c=>set.has(c)).length;sameText(el,n?`${n} RPL · ${codes.length} ACs`:`${codes.length} ACs`)})}

function openCarpentryRpl(){
  const c=ctx(),r=rplSet(),labels={...COMMON,...(c.pathway==="architectural-joiner"?AJ:SITE)},groups=[["Knowledge","K"],["Skills","S"],["Behaviours","B"]];
  const sections=groups.map(([title,prefix])=>{const codes=c.codes.filter(x=>x.startsWith(prefix));return `<div class="evia-rpl-group"><h3>${title}</h3>${codes.map(code=>`<button class="evia-rpl-row ${r.has(code)?"on":""}" data-rpl-code="${code}"><span><b>${code}</b><small>${esc(labels[code]||code)}</small></span><em>${r.has(code)?"RPL":""}</em></button>`).join("")}</div>`}).join("");
  const el=layer(`<p class="evia-tools-kicker">Recognised prior learning</p><h2>RPL KSBs</h2><p class="evia-tools-copy">Only the KSBs for <b>${esc(c.pathwayTitle)}</b> are shown. Tap a KSB to mark or unmark it as RPL.</p>${sections}`,"RPL");bindRows(el)
}
async function data(){if(window.EviaTrowelDataReady)await window.EviaTrowelDataReady;const c=ctx();return c?.courseType==="nvq"?(window.EviaTrowelData?.build?.(c.pathway)||[]):[]}
function desc(code){return window.EviaTrowelACText?.describe?.(code)||window.EviaTrowelMeta?.themeNames?.[window.EviaTrowelMeta?.codeTheme?.[code]]||"Assessment criterion"}
async function openNvqRpl(){
  const c=ctx(),d=await data(),r=rplSet(),total=d.flatMap(cat=>cat.jobs.flatMap(job=>job.opps.flatMap(o=>o.codes||[])));
  const rows=d.map((cat,i)=>{const codes=cat.jobs.flatMap(job=>job.opps.flatMap(o=>o.codes||[])),n=codes.filter(x=>r.has(x)).length;return `<button class="evia-tools-row" data-rpl-cat="${i}"><span><b>${esc(cat.title)}</b><small data-rpl-codes="${esc(codes.join("|"))}">${n?`${n} RPL · `:""}${codes.length} ACs</small></span><i>›</i></button>`}).join("");
  const el=layer(`<p class="evia-tools-kicker">Recognised prior learning</p><h2>RPL assessment criteria</h2><p class="evia-tools-copy">The required ACs for <b>${esc(c.pathwayTitle||"this NVQ route")}</b> are grouped exactly like the course. Each evidence point shows the ACs mapped underneath it.</p><div class="evia-rpl-summary"><strong>${r.size}</strong><span>of ${total.length} ACs marked RPL</span></div>${rows}`,"RPL");
  el.querySelectorAll("[data-rpl-cat]").forEach(btn=>btn.onclick=()=>openNvqCategory(d,Number(btn.dataset.rplCat)))
}
function openNvqCategory(d,index){
  const cat=d[index],r=rplSet();if(!cat)return openNvqRpl();
  const rows=cat.jobs.map((job,j)=>{const codes=job.opps.flatMap(o=>o.codes||[]),n=codes.filter(x=>r.has(x)).length;return `<button class="evia-tools-row" data-rpl-job="${j}"><span><b>${esc(job.title)}</b><small data-rpl-codes="${esc(codes.join("|"))}">${n?`${n} RPL · `:""}${codes.length} ACs</small></span><i>›</i></button>`}).join("");
  const el=layer(`<p class="evia-tools-kicker">${esc(cat.title)}</p><h2>${esc(cat.title)}</h2><p class="evia-tools-copy">Choose a job to see its evidence points and the exact ACs mapped underneath.</p>${rows}`,cat.title,()=>openNvqRpl());
  el.querySelectorAll("[data-rpl-job]").forEach(btn=>btn.onclick=()=>openNvqJob(d,index,Number(btn.dataset.rplJob)))
}
function openNvqJob(d,catIndex,jobIndex){
  const cat=d[catIndex],job=cat?.jobs?.[jobIndex],r=rplSet();if(!job)return openNvqCategory(d,catIndex);
  const all=job.opps.flatMap(o=>o.codes||[]);
  const cards=job.opps.filter(o=>(o.codes||[]).length).map(o=>`<section class="evia-rpl-map-card"><div class="evia-rpl-map-head"><b>${esc(o.title)}</b><small>${esc(o.instruction||o.question||"")}</small></div>${(o.codes||[]).map(code=>`<button class="evia-rpl-row evia-rpl-ac ${r.has(code)?"on":""}" data-rpl-code="${esc(code)}"><span><b>${esc(code)}</b><small>${esc(desc(code))}</small></span><em>${r.has(code)?"RPL":""}</em></button>`).join("")}</section>`).join("");
  const el=layer(`<p class="evia-tools-kicker">${esc(cat.title)}</p><h2>${esc(job.title)}</h2><p class="evia-tools-copy"><span data-rpl-codes="${esc(all.join("|"))}">${all.filter(x=>r.has(x)).length?`${all.filter(x=>r.has(x)).length} RPL · `:""}${all.length} ACs</span> mapped across the evidence points below. Tap an AC to mark or unmark it as RPL.</p>${cards}`,job.title,()=>openNvqCategory(d,catIndex));bindRows(el)
}

let oppMap=null,oppMapKey="",mapPromise=null,nvqBusy=false;
async function buildOppMap(){
  const c=ctx();if(c?.courseType!=="nvq"){oppMap=null;oppMapKey="";mapPromise=null;return null}
  const key=`${c.courseId}|${c.pathway}`;
  if(oppMap&&oppMapKey===key)return oppMap;
  if(mapPromise)return mapPromise;
  mapPromise=(async()=>{try{const d=await data(),m=new Map();d.forEach(cat=>cat.jobs.forEach(job=>job.opps.forEach(o=>m.set(o.id,o.codes||[]))));oppMap=m;oppMapKey=key;return m}finally{mapPromise=null}})();
  return mapPromise
}
async function patchNvqMarks(){
  const c=ctx();if(c?.courseType!=="nvq"||nvqBusy)return;
  nvqBusy=true;
  try{
    const map=await buildOppMap();if(!map)return;const r=rplSet();
    document.querySelectorAll("button[data-opp]").forEach(btn=>{
      const codes=map.get(btn.dataset.opp)||[],matched=codes.filter(x=>r.has(x));let mark=btn.querySelector(".evia-rpl-evidence-marks");
      if(!matched.length){if(mark)mark.remove();return}
      if(!mark){mark=document.createElement("span");mark.className="evia-rpl-evidence-marks";const side=btn.querySelector(".self-side"),arrow=side?.querySelector("i");if(side&&arrow)side.insertBefore(mark,arrow);else side?.appendChild(mark)}
      const text=matched.length>5?`o x ${matched.length}`:"o".repeat(matched.length);sameText(mark,text);sameAttr(mark,"title",`RPL: ${matched.join(" · ")}`)
    })
  }finally{nvqBusy=false}
}
function patch(){patchAdminButton();patchCoverage();patchNvqMarks()}

let raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;patch()})}
document.addEventListener("click",e=>{
  const btn=e.target.closest?.("[data-admin-rpl]");if(!btn)return;const c=ctx();
  if(c?.courseType!=="nvq"&&c?.courseId!=="st0264-v1-4")return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  if(c.courseType==="nvq")openNvqRpl();else openCarpentryRpl()
},true);
const observer=new MutationObserver(schedule);
function ready(){const target=document.body||document.documentElement;if(!target.__eviaRplCourseObserved){target.__eviaRplCourseObserved=true;observer.observe(target,{subtree:true,childList:true})}schedule()}
window.addEventListener("load",ready);window.addEventListener("pageshow",()=>{oppMap=null;oppMapKey="";mapPromise=null;ready()});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")schedule()});setTimeout(ready,180);
})();