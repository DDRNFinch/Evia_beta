(()=>{
"use strict";
const TIMELINE_KEY="evia-course-timeline";
const PACK_KEY="nisi-installed-course-packs-v1";
const NVQ_MIGRATION_MARKER="nisi-6570-pack-migration-v1";
const proto=Storage.prototype;
const betaStorage=window.__EVIA_BETA_STORAGE__||null;
const original=betaStorage?{
  getItem:function(key){return betaStorage.readLocalRaw(key)},
  setItem:function(key,value){return betaStorage.writeLocalRaw(key,value)},
  removeItem:function(key){return betaStorage.removeLocalRaw(key)}
}:{getItem:proto.getItem,setItem:proto.setItem,removeItem:proto.removeItem};
const brickCodes=[...Array.from({length:31},(_,i)=>`K${i+1}`),...Array.from({length:22},(_,i)=>`S${i+1}`),...Array.from({length:6},(_,i)=>`B${i+1}`)];
const siteCodes=[...Array.from({length:29},(_,i)=>`K${i+1}`),"K40",...Array.from({length:22},(_,i)=>`S${i+1}`),...Array.from({length:5},(_,i)=>`B${i+1}`)];
const joinerCodes=[...Array.from({length:20},(_,i)=>`K${i+1}`),...Array.from({length:11},(_,i)=>`K${i+30}`),...Array.from({length:13},(_,i)=>`S${i+1}`),...Array.from({length:8},(_,i)=>`S${i+23}`),...Array.from({length:5},(_,i)=>`B${i+1}`)];
let noCourseAnnounced=false;
function timeline(){try{const x=JSON.parse(original.getItem.call(localStorage,TIMELINE_KEY)||"null");return x&&typeof x==="object"?x:{}}catch{return{}}}
function installedPack(id){try{const all=JSON.parse(original.getItem.call(localStorage,PACK_KEY)||"{}");return all&&typeof all==="object"?all[String(id||"")]||null:null}catch{return null}}
function migrationFailed(){try{return JSON.parse(original.getItem.call(localStorage,NVQ_MIGRATION_MARKER)||"null")?.status==="failed-safe"}catch{return false}}
function trowelRollbackProfile(t){
  const m=window.EviaTrowelMeta;if(!m)return null;
  const option=m.routeUnits?.[t.pathway]?t.pathway:"thin";
  const units=m.routeUnits[option]||m.routeUnits.thin||[];
  const codes=units.flatMap(u=>m.unitCodes?.[String(u)]||[]);
  return{
    courseId:"6570-05",courseTitle:"Trowel Occupations Level 3 — 6570-05",pathway:option,pathwayTitle:m.optionTitles?.[option]||"",
    storageSuffix:`6570-05-${option}`,dataPrefix:`evia-trowel-${option}-data`,codes,totalKsb:codes.length,
    courseType:"nvq",coverageLabel:"AC",learningLabel:"GLH",fourthLabel:"Units",glhTargetHours:Number(m.glhTargetHours)||847,
    tqtHours:Number(m.tqtHours)||1470,units,epaConfigured:false,rollbackSafetyNet:true
  };
}
function noCourseProfile(){
  if(!noCourseAnnounced){document.documentElement.classList.add("evia-no-course-pending");noCourseAnnounced=true}
  return{
    courseId:"__no_course__",courseTitle:"",pathway:null,pathwayTitle:"",storageSuffix:"__no_course__",
    dataPrefix:"evia-no-course-data",codes:["SETUP"],totalKsb:1,courseType:"none",coverageLabel:"",learningLabel:"",
    fourthLabel:"",otjMinimumHours:1,epaConfigured:false,noCourse:true
  };
}
function current(){
  const t=timeline(),pack=installedPack(t.courseId);
  if(pack&&window.EviaCoursePacks?.profile){
    const p=window.EviaCoursePacks.profile(pack,t.pathway);if(p)return p
  }
  if(t.courseId==="6570-05"&&migrationFailed()){
    const p=trowelRollbackProfile(t);if(p)return p
  }
  if(t.courseId==="st0264-v1-4"){
    if(t.pathway==="architectural-joiner")return{
      courseId:"st0264-v1-4",courseTitle:"Carpentry & Joinery — ST0264 v1.4",pathway:"architectural-joiner",pathwayTitle:"Architectural Joiner",
      storageSuffix:"st0264-aj",dataPrefix:"evia-carpentry-joiner-data",codes:joinerCodes,totalKsb:joinerCodes.length,otjMinimumHours:557,epaConfigured:false
    };
    return{
      courseId:"st0264-v1-4",courseTitle:"Carpentry & Joinery — ST0264 v1.4",pathway:"site-carpenter",pathwayTitle:"Site Carpenter",
      storageSuffix:"st0264-site",dataPrefix:"evia-carpentry-site-data",codes:siteCodes,totalKsb:siteCodes.length,otjMinimumHours:557,epaConfigured:false
    };
  }
  if(t.courseId==="st0095-v1-2")return{
    courseId:"st0095-v1-2",courseTitle:"Bricklayer — ST0095 v1.2",pathway:null,pathwayTitle:"",
    storageSuffix:"",dataPrefix:"evia-site-data",codes:brickCodes,totalKsb:brickCodes.length,otjMinimumHours:578,epaConfigured:true
  };
  return noCourseProfile();
}
const redirected=new Set([
  "evia-selfobs-live-v3","evia-selfobs-day-v3","evia-selfobs-recap-v3",
  "evia-rpl-ksbs-v1","evia-epa-practice-v1","evia-epa-checks",
  "evia-otj-entries","evia-otj-college-v1",
  "evia-glh-entries","evia-targets-v1"
]);
function physical(key){
  const text=String(key),c=current();
  return c.storageSuffix&&redirected.has(text)?`${text}::${c.storageSuffix}`:text;
}
proto.getItem=function(key){return original.getItem.call(this,physical(key))};
proto.setItem=function(key,value){return original.setItem.call(this,physical(key),value)};
proto.removeItem=function(key){return original.removeItem.call(this,physical(key))};
window.EviaCourseContext={current,physicalKey:physical,originalStorage:original};
})();
