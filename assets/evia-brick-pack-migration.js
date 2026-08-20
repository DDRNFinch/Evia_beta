(()=>{
"use strict";
const COURSE_ID="st0095-v1-2";
const PACK_URL="./course-packs/Bricklayer_ST0095_v1.2.nisi?v=37";
const MARKER="nisi-brick-pack-migration-v1";
const PACK_KEY="nisi-installed-course-packs-v1";
const TIMELINE_KEY="evia-course-timeline";
let busy=false;
function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function timeline(){const x=read(TIMELINE_KEY,{});return x&&typeof x==="object"?x:{}}
function installed(){const x=read(PACK_KEY,{});return x&&typeof x==="object"?x[COURSE_ID]||null:null}
function parsePart(text){const m=String(text||"").match(/export const SITE_DATA_\d+:SiteCategory\[\]=(.*);\s*$/s);if(!m)throw Error("Could not read the current Bricklayer course map.");return JSON.parse(m[1])}
function mappedCodes(data){const out=new Set();(data||[]).forEach(c=>(c.jobs||[]).forEach(j=>(j.opps||[]).forEach(o=>(o.codes||[]).forEach(code=>out.add(String(code))))));return out}
function compare(pack,builtin){
  const errors=[];
  if(pack.id!==COURSE_ID)errors.push("course ID");
  if(String(pack.version)!=="1.2")errors.push("version");
  if(Number(pack.otjMinimumHours)!==578)errors.push("OTJ minimum");
  if(Number(pack.gatewayBufferMonths)!==3)errors.push("gateway buffer");
  if(pack.compatStorageSuffix!=="")errors.push("storage compatibility");
  if(JSON.stringify(pack.siteData)!==JSON.stringify(builtin))errors.push("learner course map");
  const codes=Array.isArray(pack.codes)?pack.codes.map(String):[],mapped=mappedCodes(pack.siteData);
  if(codes.length!==59||new Set(codes).size!==59)errors.push("59 KSB codes");
  if(codes.some(code=>!mapped.has(code))||mapped.size!==59)errors.push("KSB mapping coverage");
  if(Object.keys(pack.codeDescriptions||{}).length!==59)errors.push("KSB descriptions");
  return{ok:!errors.length,errors,categories:builtin.length,jobs:builtin.reduce((n,c)=>n+(c.jobs||[]).length,0),opportunities:builtin.reduce((n,c)=>n+(c.jobs||[]).reduce((m,j)=>m+(j.opps||[]).length,0),0),codes:mapped.size}
}
async function fetchJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error(`Could not load ${url} (${r.status}).`);return r.json()}
async function fetchText(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error(`Could not load ${url} (${r.status}).`);return r.text()}
async function verifyStaticPack(){
  const raw=await fetchJson(PACK_URL),pack=window.EviaCoursePacks?.normalize?window.EviaCoursePacks.normalize(raw):raw;
  const parts=await Promise.all([1,2,3].map(n=>fetchText(`./app/evia-site-data-${n}.ts?v=37`).then(parsePart)));
  const result=compare(pack,parts.flat());
  return{pack,result}
}
async function migrate(){
  if(busy)return false;busy=true;
  try{
    const t=timeline();if(t.courseId!==COURSE_ID)return false;
    if(installed())return true;
    if(!window.EviaCoursePacks?.install)throw Error("Course pack engine is not ready.");
    const {pack,result}=await verifyStaticPack();
    if(!result.ok)throw Error(`Bricklayer pack parity failed: ${result.errors.join(", ")}`);
    window.EviaCoursePacks.install(pack);
    write(MARKER,{status:"verified-and-installed",verifiedAt:Date.now(),version:"1.2",...result});
    setTimeout(()=>location.reload(),80);
    return true
  }catch(error){
    console.error("Evia Bricklayer course-pack migration",error);
    write(MARKER,{status:"failed-safe",checkedAt:Date.now(),message:String(error?.message||error)});
    return false
  }finally{busy=false}
}
function cleanPack(pack){const x=JSON.parse(JSON.stringify(pack||{}));delete x.installedAt;delete x.updatedAt;return x}
function safeName(pack){return `${String(pack?.shortTitle||pack?.title||"Course").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}_${String(pack?.standardId||pack?.id||"course").replace(/[^A-Za-z0-9.-]+/g,"_")}_v${String(pack?.version||"1").replace(/[^A-Za-z0-9.-]+/g,"_")}.nisi`}
function exportPack(id){
  const pack=window.EviaCoursePacks?.get?.(id);if(!pack)return;
  const blob=new Blob([JSON.stringify(cleanPack(pack),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=safeName(pack);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)
}
function patchManager(){
  const layer=document.querySelector(".nisi-pack-layer");if(!layer)return;
  layer.querySelectorAll(".nisi-pack-card").forEach(card=>{
    if(card.querySelector("[data-pack-export]"))return;
    const use=card.querySelector("[data-pack-use]"),buttons=use?.parentElement,id=use?.getAttribute("data-pack-use");if(!buttons||!id)return;
    const b=document.createElement("button");b.type="button";b.setAttribute("data-pack-export",id);b.textContent="Export";b.onclick=()=>exportPack(id);buttons.insertBefore(b,buttons.querySelector("[data-pack-remove]"))
  })
}
function ready(){migrate();patchManager();if(!document.body.__eviaBrickPackObserved){document.body.__eviaBrickPackObserved=true;new MutationObserver(()=>requestAnimationFrame(patchManager)).observe(document.body,{childList:true,subtree:true})}}
window.EviaBrickPackMigration={verify:verifyStaticPack,migrate,status:()=>read(MARKER,null),exportPack};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("pageshow",patchManager);
})();