(()=>{
"use strict";
const COURSE_ID="6570-05";
const MARKER="nisi-6570-pack-migration-v1";
const TIMELINE_KEY="evia-course-timeline";
const MAPPING_REVISION=2;
const ROUTES=["thin","repair","specialist","drainage"];
const EXPECTED={
  thin:{acs:238,units:[102,234,235,303,300,313,502,701,238]},
  repair:{acs:239,units:[102,234,235,303,300,313,502,701,690]},
  specialist:{acs:239,units:[102,234,235,303,300,313,502,701,828]},
  drainage:{acs:240,units:[102,234,235,303,300,313,502,701,837]}
};
let busy=false;
function read(k,d){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
function timeline(){const x=read(TIMELINE_KEY,{});return x&&typeof x==="object"?x:{}}
function meta(){const m=window.EviaTrowelMeta;if(!m)throw Error("Trowel NVQ metadata is unavailable.");return m}
function dataApi(){const d=window.EviaTrowelData;if(!d?.build)throw Error("Trowel NVQ learner map is unavailable.");return d}
function clone(x){return JSON.parse(JSON.stringify(x))}
function routeCodes(route,m=meta()){
  const units=m.routeUnits?.[route];if(!Array.isArray(units)||!units.length)throw Error(`Missing NVQ route units for ${route}.`);
  return units.flatMap(unit=>m.unitCodes?.[String(unit)]||[]).map(String)
}
function descriptions(codes){const out={};for(const code of codes)out[code]=window.EviaTrowelACText?.describe?.(code)||`Assessment criterion ${code}`;return out}
function packedMap(route,m,d){
  const live=d.build(route),siteData=clone(live);let holisticPrompts=0;
  siteData.forEach(cat=>(cat.jobs||[]).forEach(job=>(job.opps||[]).forEach(op=>{
    if(Array.isArray(op.codes)&&op.codes.length)return;
    op.codes=[];op.holistic=true;holisticPrompts++
  })));
  return{live,siteData,holisticPrompts}
}
function stripMapping(data){const x=clone(data);x.forEach(cat=>(cat.jobs||[]).forEach(job=>(job.opps||[]).forEach(op=>{delete op.codes;delete op.holistic})));return x}
function mappingsPreserved(packed,live){
  for(let ci=0;ci<live.length;ci++)for(let ji=0;ji<(live[ci].jobs||[]).length;ji++)for(let oi=0;oi<(live[ci].jobs[ji].opps||[]).length;oi++){
    const before=(live[ci].jobs[ji].opps[oi].codes||[]).map(String),after=(packed[ci]?.jobs?.[ji]?.opps?.[oi]?.codes||[]).map(String),holistic=packed[ci]?.jobs?.[ji]?.opps?.[oi]?.holistic===true;
    if(JSON.stringify(before)!==JSON.stringify(after))return false;
    if(!before.length&&!holistic)return false;
    if(before.length&&holistic)return false
  }
  return true
}
function path(route,m,d){
  const expected=EXPECTED[route],units=(m.routeUnits?.[route]||[]).map(Number),codes=routeCodes(route,m),maps=packedMap(route,m,d),siteData=maps.siteData;
  return{
    id:route,title:String(m.optionTitles?.[route]||route),compatStorageSuffix:`6570-05-${route}`,
    codes,codeDescriptions:descriptions(codes),siteData,units,
    glhTargetHours:Number(m.glhTargetHours)||847,tqtHours:Number(m.tqtHours)||1470,epaConfigured:false,
    expectedAcCount:expected.acs,holisticPrompts:maps.holisticPrompts
  }
}
function makePack(){
  const m=meta(),d=dataApi();
  return{
    nisiCoursePack:1,schemaVersion:1,id:COURSE_ID,familyId:COURSE_ID,version:"1",mappingRevision:MAPPING_REVISION,
    title:String(m.title||"Trowel Occupations Level 3 — 6570-05"),shortTitle:String(m.shortTitle||"Trowel Occupations"),
    standard:"6570-05",standardId:"6570-05",choiceLabel:"Optional unit",courseType:"nvq",
    coverageLabel:"AC",learningLabel:"GLH",fourthLabel:"Units",glhTargetHours:Number(m.glhTargetHours)||847,
    tqtHours:Number(m.tqtHours)||1470,epaConfigured:false,nvqMeta:clone(m),
    pathways:ROUTES.map(route=>path(route,m,d))
  }
}
function stats(data,codes){
  const allowed=new Set(codes),mapped=new Set(),all=[],ids=new Set(),empty=[],unknown=[];let jobs=0,opportunities=0,holistic=0;
  (data||[]).forEach(cat=>{jobs+=(cat.jobs||[]).length;(cat.jobs||[]).forEach(job=>(job.opps||[]).forEach(op=>{
    opportunities++;const id=`${cat.id}/${job.id}/${op.id}`;if(ids.has(id))throw Error(`Duplicate NVQ evidence point ${id}.`);ids.add(id);
    const xs=(op.codes||[]).map(String);if(!xs.length){if(op.holistic===true)holistic++;else empty.push(id)}xs.forEach(code=>{all.push(code);mapped.add(code);if(!allowed.has(code))unknown.push(code)})
  }))});
  return{categories:(data||[]).length,jobs,opportunities,mapped:mapped.size,assignments:all.length,holistic,empty,unknown:[...new Set(unknown)],missing:codes.filter(code=>!mapped.has(code)),duplicates:all.length-new Set(all).size}
}
function verifyPack(raw){
  const m=meta(),d=dataApi(),pack=window.EviaCoursePacks?.normalize?window.EviaCoursePacks.normalize(raw):raw,errors=[],routes={};
  if(pack.id!==COURSE_ID)errors.push("course ID");
  if(pack.courseType!=="nvq")errors.push("course type");
  if(Number(pack.mappingRevision)!==MAPPING_REVISION)errors.push("mapping revision");
  if(Number(pack.glhTargetHours)!==847)errors.push("847 GLH target");
  if(Number(pack.tqtHours)!==1470)errors.push("1470 TQT");
  if(pack.coverageLabel!=="AC"||pack.learningLabel!=="GLH"||pack.fourthLabel!=="Units")errors.push("NVQ labels");
  if(pack.epaConfigured!==false)errors.push("EPA disabled");
  if(JSON.stringify(pack.nvqMeta)!==JSON.stringify(m))errors.push("NVQ metadata parity");
  for(const route of ROUTES){
    const p=pack.pathways?.find(x=>x.id===route),expected=EXPECTED[route],live=d.build(route);
    if(!p){errors.push(`${route} pathway`);continue}
    const codes=routeCodes(route,m),s=stats(p.siteData,codes);routes[route]=s;
    if(p.compatStorageSuffix!==`6570-05-${route}`)errors.push(`${route} storage compatibility`);
    if(JSON.stringify((p.units||[]).map(Number))!==JSON.stringify(expected.units))errors.push(`${route} unit route`);
    if(codes.length!==expected.acs||new Set(codes).size!==expected.acs)errors.push(`${route} ${expected.acs} AC codes`);
    if(JSON.stringify(p.codes)!==JSON.stringify(codes))errors.push(`${route} AC order`);
    if(JSON.stringify(stripMapping(p.siteData))!==JSON.stringify(stripMapping(live)))errors.push(`${route} learner route parity`);
    if(!mappingsPreserved(p.siteData,live))errors.push(`${route} AC mapping parity`);
    if(s.mapped!==expected.acs||s.assignments!==expected.acs||s.missing.length||s.unknown.length||s.empty.length||s.duplicates)errors.push(`${route} AC mapping audit`);
    if(Object.keys(p.codeDescriptions||{}).length!==expected.acs)errors.push(`${route} AC descriptions`)
  }
  if((pack.pathways||[]).length!==ROUTES.length)errors.push("four pathways");
  return{pack,result:{ok:!errors.length,errors,routes}}
}
function build(){return makePack()}
function verify(){return verifyPack(build())}
function installed(){return window.EviaCoursePacks?.get?.(COURSE_ID)||null}
function migrate(){
  if(busy)return false;busy=true;
  try{
    const t=timeline();if(t.courseId!==COURSE_ID)return false;
    const current=installed();if(current&&Number(current.mappingRevision)===MAPPING_REVISION)return true;
    if(!window.EviaCoursePacks?.install)throw Error("Course pack engine is not ready.");
    const {pack,result}=verify();if(!result.ok)throw Error(`6570-05 pack parity failed: ${result.errors.join(", ")}`);
    window.EviaCoursePacks.install(pack);
    write(MARKER,{status:"verified-and-installed",verifiedAt:Date.now(),version:pack.version,mappingRevision:MAPPING_REVISION,glhTargetHours:847,tqtHours:1470,routes:result.routes});
    setTimeout(()=>location.reload(),80);return true
  }catch(error){
    console.error("Evia 6570-05 course-pack migration",error);
    write(MARKER,{status:"failed-safe",checkedAt:Date.now(),message:String(error?.message||error)});return false
  }finally{busy=false}
}
function cleanPack(pack){const x=clone(pack||{});delete x.installedAt;delete x.updatedAt;return x}
function exportPack(){
  const pack=installed();if(!pack)return false;
  const blob=new Blob([JSON.stringify(cleanPack(pack),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="Trowel_Occupations_6570-05_v1.nisi";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return true
}
window.Evia6570PackMigration={build,verify,migrate,status:()=>read(MARKER,null),exportPack};
migrate();
})();
