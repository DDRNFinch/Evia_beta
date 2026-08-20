(()=>{
"use strict";
const KEY="nisi-installed-course-packs-v1";
const TIMELINE_KEY="evia-course-timeline";
const SCHEMA=1;
const originalFetch=window.fetch.bind(window);

function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function slug(s){return String(s||"course").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"course"}
function store(){const x=read(KEY,{});return x&&typeof x==="object"&&!Array.isArray(x)?x:{}}
function saveStore(x){return write(KEY,x)}
function list(){return Object.values(store()).filter(Boolean).sort((a,b)=>String(a.title||"").localeCompare(String(b.title||"")))}
function get(id){return store()[String(id||"")]||null}
function timeline(){const x=read(TIMELINE_KEY,{});return x&&typeof x==="object"?x:{}}
function pathways(pack){return Array.isArray(pack?.pathways)?pack.pathways.filter(Boolean):[]}
function pathway(pack,id){
  const xs=pathways(pack);
  if(!xs.length)return null;
  return xs.find(x=>String(x.id)===String(id))||xs[0]||null
}
function active(){
  const t=timeline(),pack=get(t.courseId);
  if(!pack)return null;
  const p=pathway(pack,t.pathway);
  return{pack,pathway:p}
}
function courseData(pack,p){
  if(p&&Array.isArray(p.siteData))return p.siteData;
  return Array.isArray(pack?.siteData)?pack.siteData:[]
}
function codes(pack,p){
  const xs=p&&Array.isArray(p.codes)?p.codes:Array.isArray(pack?.codes)?pack.codes:[];
  return [...new Set(xs.map(String).filter(Boolean))]
}
function meta(pack,p,key,fallback){
  return p?.[key]!==undefined?p[key]:pack?.[key]!==undefined?pack[key]:fallback
}
function profile(pack,pathwayId=""){
  if(!pack)return null;
  const p=pathway(pack,pathwayId),cs=codes(pack,p);
  const family=String(pack.familyId||pack.standardId||pack.id||"course");
  const explicitSuffix=meta(pack,p,"compatStorageSuffix",undefined);
  let suffix;
  if(explicitSuffix!==undefined)suffix=String(explicitSuffix||"");
  else if(pack.id==="st0095-v1-2")suffix="";
  else if(pack.id==="st0264-v1-4")suffix=p?.id==="architectural-joiner"?"st0264-aj":"st0264-site";
  else if(pack.id==="6570-05")suffix=`6570-05-${p?.id||"thin"}`;
  else suffix=`pack-${slug(family)}${p?.id?`-${slug(p.id)}`:""}`;
  const type=String(meta(pack,p,"courseType","apprenticeship"));
  return{
    courseId:String(pack.id),
    courseTitle:String(pack.title||pack.shortTitle||pack.id),
    pathway:p?.id||"",
    pathwayTitle:p?.title||"",
    storageSuffix:suffix,
    dataPrefix:"nisi-pack-active",
    codes:cs,
    totalKsb:cs.length,
    courseType:type,
    coverageLabel:String(meta(pack,p,"coverageLabel",type==="nvq"?"AC":"KSB")),
    learningLabel:String(meta(pack,p,"learningLabel",type==="nvq"?"GLH":"OTJ")),
    fourthLabel:String(meta(pack,p,"fourthLabel",type==="nvq"?"Units":"EPA")),
    otjMinimumHours:Number(meta(pack,p,"otjMinimumHours",0))||undefined,
    glhTargetHours:Number(meta(pack,p,"glhTargetHours",0))||undefined,
    tqtHours:Number(meta(pack,p,"tqtHours",0))||undefined,
    units:Array.isArray(meta(pack,p,"units",[]))?meta(pack,p,"units",[]):[],
    epaConfigured:meta(pack,p,"epaConfigured",type!=="nvq"),
    gatewayBufferMonths:Number(meta(pack,p,"gatewayBufferMonths",type==="nvq"?0:3))||0,
    packVersion:String(pack.version||""),
    packFamilyId:family,
    installedPack:true
  }
}
function courseOptions(){
  return list().map(pack=>({
    id:String(pack.id),
    title:String(pack.title||pack.shortTitle||pack.id),
    shortTitle:String(pack.shortTitle||pack.title||pack.id),
    standard:String(pack.standard||pack.standardId||pack.id),
    choiceLabel:String(pack.choiceLabel||"Pathway"),
    pathways:pathways(pack).map(p=>({id:String(p.id),title:String(p.title||p.id)})),
    installedPack:true,
    version:String(pack.version||"")
  }))
}
function normalize(raw){
  const pack=raw?.coursePack&&typeof raw.coursePack==="object"?raw.coursePack:raw;
  if(!pack||typeof pack!=="object"||Array.isArray(pack))throw Error("This is not a Nisi course pack.");
  const schema=Number(pack.schemaVersion??pack.nisiCoursePack??0);
  if(schema!==SCHEMA)throw Error(`This course pack uses schema ${schema||"unknown"}. Evia currently supports schema ${SCHEMA}.`);
  const id=String(pack.id||"").trim(),title=String(pack.title||"").trim();
  if(!id||!title)throw Error("The course pack is missing its course ID or title.");
  const out={...pack,id,title,schemaVersion:SCHEMA,nisiCoursePack:SCHEMA};
  const ps=pathways(out);
  if(ps.length){
    out.pathways=ps.map(p=>{
      if(!p?.id||!p?.title)throw Error("Every pathway needs an ID and title.");
      const cs=codes(out,p),data=courseData(out,p);
      if(!cs.length)throw Error(`${p.title} has no KSB/AC codes.`);
      if(!data.length)throw Error(`${p.title} has no learner course map.`);
      validateMap(cs,data,p.title);
      return{...p,id:String(p.id),title:String(p.title),codes:cs,siteData:data}
    })
  }else{
    const cs=codes(out,null),data=courseData(out,null);
    if(!cs.length)throw Error("The course pack has no KSB/AC codes.");
    if(!data.length)throw Error("The course pack has no learner course map.");
    validateMap(cs,data,title);
    out.codes=cs;out.siteData=data
  }
  return out
}
function validateMap(cs,data,label){
  if(!Array.isArray(data)||!data.every(c=>c&&typeof c==="object"&&Array.isArray(c.jobs)))throw Error(`${label} has an invalid course map.`);
  const allowed=new Set(cs),mapped=new Set(),ids=new Set();
  data.forEach((cat,ci)=>{
    if(!cat.id||!cat.title)throw Error(`${label}: category ${ci+1} needs an ID and title.`);
    cat.jobs.forEach((job,ji)=>{
      if(!job?.id||!job?.title||!Array.isArray(job.opps))throw Error(`${label}: a job in ${cat.title} is incomplete.`);
      job.opps.forEach((op,oi)=>{
        if(!op?.id||!op?.title||!op?.question||(!op?.instruction&&op?.media!=="talk"))throw Error(`${label}: evidence point ${oi+1} in ${job.title} is incomplete.`);
        const unique=`${cat.id}/${job.id}/${op.id}`;if(ids.has(unique))throw Error(`${label}: duplicate evidence point ${op.id}.`);ids.add(unique);
        if(!Array.isArray(op.codes))throw Error(`${label}: ${op.title} has an invalid KSB/AC mapping.`);
        if(!op.codes.length&&op.holistic!==true)throw Error(`${label}: ${op.title} has no mapped KSB/AC.`);
        op.codes.forEach(code=>{code=String(code);if(!allowed.has(code))throw Error(`${label}: ${op.title} maps unknown code ${code}.`);mapped.add(code)})
      })
    })
  });
  const missing=cs.filter(code=>!mapped.has(code));
  if(missing.length)throw Error(`${label}: ${missing.length} KSB/AC code${missing.length===1?" is":"s are"} not mapped in the learner course map.`)
}
function install(raw){
  const pack=normalize(raw),all=store(),family=String(pack.familyId||pack.standardId||pack.id);
  const old=Object.values(all).find(x=>String(x?.familyId||x?.standardId||x?.id)===family&&String(x?.id)!==pack.id);
  if(old)delete all[old.id];
  pack.installedAt=Date.now();pack.updatedAt=Date.now();
  all[pack.id]=pack;
  if(!saveStore(all))throw Error("Evia could not save the course pack on this device.");
  const t=timeline();
  if(old&&t.courseId===old.id){
    const ps=pathways(pack),keep=ps.some(p=>String(p.id)===String(t.pathway))?t.pathway:ps[0]?.id||"";
    write(TIMELINE_KEY,{...t,courseId:pack.id,courseTitle:pack.title,pathway:keep,pathwayTitle:pathway(pack,keep)?.title||"",updatedAt:Date.now()})
  }
  return pack
}
function remove(id){
  const all=store(),pack=all[id];if(!pack)return false;
  delete all[id];saveStore(all);
  return true
}
function activate(id,pathwayId=""){
  const pack=get(id);if(!pack)throw Error("That course pack is not installed.");
  const p=pathway(pack,pathwayId),t=timeline();
  write(TIMELINE_KEY,{...t,courseId:pack.id,courseTitle:pack.title,pathway:p?.id||"",pathwayTitle:p?.title||"",updatedAt:Date.now()});
  return true
}
function readFile(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(Error("Evia could not read that file."));
    reader.onload=()=>{try{resolve(JSON.parse(String(reader.result||"")))}catch{reject(Error("That file is not valid JSON."))}};
    reader.readAsText(file)
  })
}
function layer(body,title="Course packs",back=null){
  document.querySelector(".nisi-pack-layer")?.remove();
  const el=document.createElement("div");el.className="evia-tools-layer nisi-pack-layer";
  el.innerHTML=`<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-pack-back>‹ Back</button><b>${esc(title)}</b><span></span></div><div class="evia-tools-body">${body}</div></section>`;
  document.body.appendChild(el);el.querySelector("[data-pack-back]").onclick=back||(()=>el.remove());return el
}
function manager(back=null){
  const xs=list(),t=timeline();
  const body=`<p class="evia-tools-kicker">Installed locally</p><h2>Course packs</h2><p class="evia-tools-copy">Install only the qualifications used on this device. Removing a course pack does not delete learner evidence, targets or learning records.</p>
  <button class="evia-tools-primary" data-pack-add>Add course pack</button>
  <div class="nisi-pack-list">${xs.length?xs.map(p=>{
    const activeNow=t.courseId===p.id,ps=pathways(p);
    return `<div class="nisi-pack-card"><span><b>${esc(p.title)}</b><small>${esc(p.standard||p.standardId||p.id)}${p.version?` · v${esc(p.version)}`:""}${ps.length?` · ${ps.length} pathways`:""}</small></span><em>${activeNow?"In use":"Installed"}</em><div><button type="button" data-pack-use="${esc(p.id)}">Use</button><button type="button" data-pack-remove="${esc(p.id)}">Remove</button></div></div>`
  }).join(""):'<div class="nisi-pack-empty">No imported course packs yet.</div>'}</div>
  <input type="file" data-pack-file accept=".nisi,.json,application/json" hidden>`;
  const el=layer(body,"Course packs",back);
  const input=el.querySelector("[data-pack-file]");
  el.querySelector("[data-pack-add]").onclick=()=>input.click();
  input.onchange=async()=>{
    const file=input.files?.[0];input.value="";if(!file)return;
    try{const pack=install(await readFile(file));message(el,`${pack.title} installed.`);setTimeout(()=>manager(back),500)}
    catch(e){message(el,e?.message||"Course pack could not be installed.",true)}
  };
  el.querySelectorAll("[data-pack-use]").forEach(b=>b.onclick=()=>choosePathwayAndActivate(b.dataset.packUse,back));
  el.querySelectorAll("[data-pack-remove]").forEach(b=>b.onclick=()=>confirmRemove(b.dataset.packRemove,back));
  return el
}
function message(el,text,error=false){
  let n=el.querySelector(".nisi-pack-message");if(!n){n=document.createElement("div");n.className="nisi-pack-message";el.querySelector(".evia-tools-body")?.prepend(n)}
  n.classList.toggle("is-error",error);n.textContent=text
}
function choosePathwayAndActivate(id,back){
  const pack=get(id),ps=pathways(pack);
  if(!ps.length){activate(id);location.reload();return}
  const el=layer(`<p class="evia-tools-kicker">${esc(pack.title)}</p><h2>Choose pathway</h2><div class="nisi-pack-choices">${ps.map(p=>`<button type="button" class="evia-tools-row" data-pack-path="${esc(p.id)}"><span><b>${esc(p.title)}</b><small>Use this pathway on this device</small></span><i>›</i></button>`).join("")}</div>`,"Choose pathway",()=>manager(back));
  el.querySelectorAll("[data-pack-path]").forEach(b=>b.onclick=()=>{activate(id,b.dataset.packPath);location.reload()})
}
function confirmRemove(id,back){
  const pack=get(id);if(!pack)return manager(back);
  const activeNow=timeline().courseId===id;
  const el=layer(`<p class="evia-tools-kicker">Remove course definition</p><h2>${esc(pack.title)}</h2><p class="evia-tools-copy">This removes only the installed course pack. Learner evidence, RPL, targets and learning records are deliberately left on this device.</p>${activeNow?'<div class="nisi-pack-warning">This course is currently in use. Install or choose another course before removing it.</div>':`<button class="evia-tools-primary" data-pack-confirm-remove>Remove course pack</button>`}`,"Remove course",()=>manager(back));
  el.querySelector("[data-pack-confirm-remove]")?.addEventListener("click",()=>{remove(id);manager(back)})
}
function syntheticResponse(part){
  const a=active();if(!a)return null;
  const data=courseData(a.pack,a.pathway);if(!data.length)return null;
  const size=Math.ceil(data.length/3),start=(part-1)*size,end=part===3?data.length:Math.min(data.length,start+size),chunk=data.slice(start,end);
  const body=`import type { SiteCategory } from "./evia-data-types";\nexport const SITE_DATA_${part}:SiteCategory[]=${JSON.stringify(chunk)};\n`;
  return new Response(body,{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}})
}
window.fetch=async function(input,init){
  try{
    const u=typeof input==="string"?input:input?.url||"";
    const m=String(u).match(/(?:^|\/)app\/nisi-pack-active-([123])\.ts(?:\?|$)/);
    if(m){const r=syntheticResponse(Number(m[1]));if(r)return r}
  }catch{}
  return originalFetch(input,init)
};
const initial=active();
if(initial?.pack?.courseType==="nvq"&&initial.pack.nvqMeta)window.EviaTrowelMeta=initial.pack.nvqMeta;
if(initial?.pathway?.nvqMeta)window.EviaTrowelMeta=initial.pathway.nvqMeta;
window.EviaCoursePacks={schemaVersion:SCHEMA,list,get,active,profile,courseOptions,install,remove,activate,manager,normalize};
})();