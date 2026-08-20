(()=>{
"use strict";
const SCHEMA_KEY="evia-data-schema-version";
const PERSIST_KEY="evia-storage-persistence";
const CURRENT_SCHEMA=1;

function readSchema(){
  const n=Number(localStorage.getItem(SCHEMA_KEY)||0);
  return Number.isFinite(n)&&n>=0?n:0;
}

function migrateLearnerData(){
  // Migrations are deliberately additive. Existing learner records, evidence,
  // media references and progress keys are never cleared or replaced here.
  let version=readSchema();
  if(version<1){
    // Schema 1 adopts all existing Evia localStorage/IndexedDB data as-is.
    version=1;
    localStorage.setItem(SCHEMA_KEY,String(version));
  }
  if(version>CURRENT_SCHEMA){
    // A newer data schema must never be downgraded by an older app shell.
    return;
  }
}

async function requestPersistentStorage(){
  if(!navigator.storage?.persist)return false;
  try{
    if(await navigator.storage.persisted?.()){
      localStorage.setItem(PERSIST_KEY,"granted");
      return true;
    }
    const granted=await navigator.storage.persist();
    localStorage.setItem(PERSIST_KEY,granted?"granted":"best-effort");
    return granted;
  }catch{
    try{localStorage.setItem(PERSIST_KEY,"best-effort")}catch{}
    return false;
  }
}

try{migrateLearnerData()}catch(e){console.debug("Evia data migration",e)}

// Ask once on load, then retry on the first deliberate interaction because
// some browsers are more willing to grant persistence after user engagement.
window.addEventListener("load",()=>{requestPersistentStorage()},{once:true});
let retried=false;
function retryPersistence(){
  if(retried)return;
  retried=true;
  requestPersistentStorage();
}
document.addEventListener("pointerdown",retryPersistence,{once:true,capture:true});
document.addEventListener("keydown",retryPersistence,{once:true,capture:true});
})();