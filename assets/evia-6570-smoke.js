(()=>{
"use strict";
const COURSE_ID="6570-05",MARKER="nisi-6570-smoke-v1",MAPPING_REVISION=2;
const ROUTES={
  thin:{acs:238,units:[102,234,235,303,300,313,502,701,238]},
  repair:{acs:239,units:[102,234,235,303,300,313,502,701,690]},
  specialist:{acs:239,units:[102,234,235,303,300,313,502,701,828]},
  drainage:{acs:240,units:[102,234,235,303,300,313,502,701,837]}
};
const ISOLATED_KEYS=["evia-selfobs-live-v3","evia-rpl-ksbs-v1","evia-glh-entries","evia-targets-v1"];
function save(value){try{localStorage.setItem(MARKER,JSON.stringify(value))}catch{}return value}
function mapStats(path,allowed){
  const mapped=new Set(),ids=new Set(),unknown=new Set(),assignments=[];let jobs=0,opportunities=0,empty=0,holistic=0;
  (path.siteData||[]).forEach(cat=>{(cat.jobs||[]).forEach(job=>{jobs++;(job.opps||[]).forEach(op=>{
    opportunities++;const id=`${cat.id}/${job.id}/${op.id}`;if(ids.has(id))throw Error(`duplicate evidence point ${id}`);ids.add(id);
    const codes=(op.codes||[]).map(String);
    if(!codes.length){if(op.holistic===true)holistic++;else empty++}
    codes.forEach(code=>{assignments.push(code);mapped.add(code);if(!allowed.has(code))unknown.add(code)})
  })})});
  return{categories:(path.siteData||[]).length,jobs,opportunities,mapped:mapped.size,assignments:assignments.length,duplicates:assignments.length-new Set(assignments).size,holistic,empty,unknown:[...unknown]}
}
function run(){
  try{
    const packs=window.EviaCoursePacks,context=window.EviaCourseContext,pack=packs?.get?.(COURSE_ID);
    if(!pack)return save({status:"not-installed",checkedAt:Date.now()});
    const errors=[],routes={},suffixes=new Set(),options=packs.courseOptions?.().find(x=>x.id===COURSE_ID);
    if(!options||options.pathways?.length!==4)errors.push("course selector does not expose four NVQ pathways");
    if(pack.courseType!=="nvq"||pack.coverageLabel!=="AC"||pack.learningLabel!=="GLH"||pack.fourthLabel!=="Units")errors.push("NVQ labels/type");
    if(Number(pack.mappingRevision)!==MAPPING_REVISION)errors.push("NVQ mapping revision");
    if(Number(pack.glhTargetHours)!==847||Number(pack.tqtHours)!==1470)errors.push("GLH/TQT totals");
    for(const [route,expected] of Object.entries(ROUTES)){
      const path=pack.pathways?.find(x=>x.id===route),profile=packs.profile?.(pack,route);
      if(!path||!profile){errors.push(`${route}: missing pathway/profile`);continue}
      const codes=(path.codes||[]).map(String),allowed=new Set(codes),stats=mapStats(path,allowed),unitCodes=(pack.nvqMeta?.unitCodes||{});
      suffixes.add(profile.storageSuffix);
      if(codes.length!==expected.acs||allowed.size!==expected.acs)errors.push(`${route}: AC total`);
      if(stats.mapped!==expected.acs||stats.assignments!==expected.acs||stats.duplicates||stats.empty||stats.unknown.length)errors.push(`${route}: exact evidence map coverage`);
      if(JSON.stringify((profile.units||[]).map(Number))!==JSON.stringify(expected.units))errors.push(`${route}: unit route`);
      if(profile.storageSuffix!==`6570-05-${route}`)errors.push(`${route}: storage suffix`);
      if(profile.courseType!=="nvq"||profile.coverageLabel!=="AC"||profile.learningLabel!=="GLH"||profile.fourthLabel!=="Units")errors.push(`${route}: profile labels`);
      if(Number(profile.glhTargetHours)!==847||Number(profile.tqtHours)!==1470)errors.push(`${route}: profile GLH/TQT`);
      const official=expected.units.flatMap(unit=>unitCodes[String(unit)]||[]).map(String);
      if(official.length!==expected.acs||official.some(code=>!allowed.has(code)))errors.push(`${route}: Unit → AC metadata`);
      routes[route]={...stats,acs:codes.length,units:profile.units,storageSuffix:profile.storageSuffix}
    }
    if(suffixes.size!==4)errors.push("pathway storage is not isolated");
    const active=context?.current?.();
    if(active?.courseId===COURSE_ID){
      ISOLATED_KEYS.forEach(key=>{const expected=`${key}::${active.storageSuffix}`,actual=context.physicalKey?.(key);if(actual!==expected)errors.push(`active storage redirect ${key}`)});
    }
    ["evia-nvq.js","evia-rpl-course.js","evia-compact-export.js"].forEach(name=>{if(!document.querySelector(`script[src*="${name}"]`))errors.push(`missing integration script ${name}`)});
    const result={status:errors.length?"failed":"passed",checkedAt:Date.now(),errors,routes,activePathway:active?.courseId===COURSE_ID?active.pathway:null};
    if(errors.length)console.error("Evia 6570-05 smoke audit",result);else console.info("Evia 6570-05 smoke audit passed",result);
    return save(result)
  }catch(error){
    const result={status:"failed",checkedAt:Date.now(),errors:[String(error?.message||error)]};
    console.error("Evia 6570-05 smoke audit",result);return save(result)
  }
}
window.Evia6570Smoke={run,status:()=>{try{return JSON.parse(localStorage.getItem(MARKER)||"null")}catch{return null}}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
})();
