(()=>{
"use strict";
const REGISTRY_URL="./course-delivery/registry-v1.json";
const QR_PREFIX="EVIA1:";
const REGISTRY_VERSION="83";
const BUNDLED_COURSES=[
  {
    enrolmentId:"ST0095",qrPayload:"EVIA1:ST0095",title:"Bricklayer — ST0095",shortTitle:"Bricklayer",
    courseType:"apprenticeship",qualificationId:"ST0095",pathwayId:null,packageFamilyId:"ST0095",
    packageId:"st0095-v1-2",currentPackageVersion:"1.2",packagePath:"../course-packs/Bricklayer_ST0095_v1.2.nisi",
    questionBankPath:"question-banks/ST0095-v1.json",practicalBankPath:"practical-banks/ST0095-v1.json",content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  },
  {
    enrolmentId:"ST0264-SITE",qrPayload:"EVIA1:ST0264-SITE",title:"Site Carpenter — ST0264",shortTitle:"Site Carpenter",
    courseType:"apprenticeship",qualificationId:"ST0264",pathwayId:"site-carpenter",packageFamilyId:"ST0264",
    packageId:"st0264-v1-4",currentPackageVersion:"1.4",packagePath:"../course-packs/Carpentry_Joinery_ST0264_v1.4.nisi",
    questionBankPath:"question-banks/ST0264-SITE-v1.json",practicalBankPath:"practical-banks/ST0264-SITE-v1.json",content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  },
  {
    enrolmentId:"ST0264-AJ",qrPayload:"EVIA1:ST0264-AJ",title:"Architectural Joiner — ST0264",shortTitle:"Architectural Joiner",
    courseType:"apprenticeship",qualificationId:"ST0264",pathwayId:"architectural-joiner",packageFamilyId:"ST0264",
    packageId:"st0264-v1-4",currentPackageVersion:"1.4",packagePath:"../course-packs/Carpentry_Joinery_ST0264_v1.4.nisi",
    questionBankPath:"question-banks/ST0264-AJ-v1.json",practicalBankPath:"practical-banks/ST0264-AJ-v1.json",content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  },
  {
    enrolmentId:"6570-05-THIN",qrPayload:"EVIA1:6570-05-THIN",title:"Trowel Occupations Level 3 — Thin Joint",shortTitle:"Thin Joint",
    courseType:"nvq",qualificationId:"6570-05",pathwayId:"thin",packageFamilyId:"6570-05",packageId:"6570-05",
    currentPackageVersion:"1",packagePath:"../course-packs/Trowel_Occupations_6570-05_v1.nisi",questionBankPath:"question-banks/6570-05-THIN-v1.json",practicalBankPath:"practical-banks/6570-05-THIN-v1.json",
    content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  },
  {
    enrolmentId:"6570-05-REPAIR",qrPayload:"EVIA1:6570-05-REPAIR",title:"Trowel Occupations Level 3 — Repair & Maintenance",shortTitle:"Repair & Maintenance",
    courseType:"nvq",qualificationId:"6570-05",pathwayId:"repair",packageFamilyId:"6570-05",packageId:"6570-05",
    currentPackageVersion:"1",packagePath:"../course-packs/Trowel_Occupations_6570-05_v1.nisi",questionBankPath:"question-banks/6570-05-REPAIR-v1.json",practicalBankPath:"practical-banks/6570-05-REPAIR-v1.json",
    content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  },
  {
    enrolmentId:"6570-05-SPECIALIST",qrPayload:"EVIA1:6570-05-SPECIALIST",title:"Trowel Occupations Level 3 — Specialist Masonry",shortTitle:"Specialist Masonry",
    courseType:"nvq",qualificationId:"6570-05",pathwayId:"specialist",packageFamilyId:"6570-05",packageId:"6570-05",
    currentPackageVersion:"1",packagePath:"../course-packs/Trowel_Occupations_6570-05_v1.nisi",questionBankPath:"question-banks/6570-05-SPECIALIST-v1.json",practicalBankPath:"practical-banks/6570-05-SPECIALIST-v1.json",
    content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  },
  {
    enrolmentId:"6570-05-DRAINAGE",qrPayload:"EVIA1:6570-05-DRAINAGE",title:"Trowel Occupations Level 3 — Drainage",shortTitle:"Drainage",
    courseType:"nvq",qualificationId:"6570-05",pathwayId:"drainage",packageFamilyId:"6570-05",packageId:"6570-05",
    currentPackageVersion:"1",packagePath:"../course-packs/Trowel_Occupations_6570-05_v1.nisi",questionBankPath:"question-banks/6570-05-DRAINAGE-v1.json",practicalBankPath:"practical-banks/6570-05-DRAINAGE-v1.json",
    content:{course:"available",multipleChoice:"available-24-question-bank",discussion:"available-24-scenario-coach",practical:"available-12-task-coach"},releaseChannel:"beta",publishable:true
  }
];
let cache=null;

function normalizeInput(value){
  return String(value??"").trim().toUpperCase();
}

function enrolmentIdFromInput(value){
  const text=normalizeInput(value);
  if(!text)return null;
  const id=text.startsWith(QR_PREFIX)?text.slice(QR_PREFIX.length):text;
  if(!/^[A-Z0-9-]+$/.test(id))return null;
  return id;
}

function validate(data){
  if(data?.eviaCourseRegistry!==1||!Array.isArray(data.courses))throw new Error("Course registry is invalid.");
  const seen=new Set();
  for(const item of data.courses){
    const id=normalizeInput(item?.enrolmentId);
    if(!id||seen.has(id))throw new Error(`Duplicate or invalid enrolment ID: ${id||"unknown"}`);
    seen.add(id);
    if(normalizeInput(item?.qrPayload)!==`${QR_PREFIX}${id}`)throw new Error(`QR payload mismatch for ${id}.`);
  }
  return data
}

async function registry(force=false){
  if(cache&&!force)return cache;
  let data;
  try{
    const response=await fetch(`${REGISTRY_URL}?v=${REGISTRY_VERSION}`,{cache:"no-store"});
    if(!response.ok)throw new Error(`Course registry unavailable (${response.status}).`);
    data=validate(await response.json())
  }catch(error){
    console.warn("Evia course registry fallback",error);
    data=validate({eviaCourseRegistry:1,registryVersion:1,updated:"2026-08-21",qrFormat:"EVIA1:<enrolmentId>",courses:BUNDLED_COURSES})
  }
  cache=data;
  return data;
}

async function resolve(value,{requirePublishable=true}={}){
  const id=enrolmentIdFromInput(value);
  if(!id)return {ok:false,reason:"invalid-code"};
  let data;
  try{data=await registry()}catch(error){return{ok:false,reason:"registry-unavailable",error:String(error?.message||error)}}
  const course=data.courses.find(item=>normalizeInput(item.enrolmentId)===id);
  if(!course)return {ok:false,reason:"unknown-course",enrolmentId:id};
  if(requirePublishable&&course.publishable!==true)return {ok:false,reason:"course-not-ready",enrolmentId:id,course};
  if(requirePublishable&&!course.packagePath)return {ok:false,reason:"package-unavailable",enrolmentId:id,course};
  return {ok:true,enrolmentId:id,course};
}

window.EviaCourseRegistry={
  QR_PREFIX,
  registry,
  resolve,
  enrolmentIdFromInput,
  clearCache(){cache=null}
};
})();
