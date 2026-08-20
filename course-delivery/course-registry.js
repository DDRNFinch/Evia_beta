(()=>{
"use strict";
const REGISTRY_URL="./course-delivery/registry-v1.json";
const QR_PREFIX="EVIA1:";
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

async function registry(force=false){
  if(cache&&!force)return cache;
  const response=await fetch(`${REGISTRY_URL}?v=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Course registry unavailable (${response.status}).`);
  const data=await response.json();
  if(data?.eviaCourseRegistry!==1||!Array.isArray(data.courses))throw new Error("Course registry is invalid.");
  const seen=new Set();
  for(const item of data.courses){
    const id=normalizeInput(item?.enrolmentId);
    if(!id||seen.has(id))throw new Error(`Duplicate or invalid enrolment ID: ${id||"unknown"}`);
    seen.add(id);
    if(normalizeInput(item?.qrPayload)!==`${QR_PREFIX}${id}`)throw new Error(`QR payload mismatch for ${id}.`);
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
