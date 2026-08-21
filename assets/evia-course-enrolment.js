(()=>{
"use strict";
const RECEIPT_KEY="evia-course-enrolment-v1";
const REGISTRY_FILE="./course-delivery/registry-v1.json";
let stream=null,scanTimer=null,detector=null,installing=false,observer=null,nativeDetectorSupport=null,decodeCanvas=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function course(){return window.EviaCourseContext?.current?.()||null}
function noCourse(){return course()?.noCourse===true}
function stopCamera(){
  if(scanTimer){clearTimeout(scanTimer);scanTimer=null}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  detector=null
}
function style(){
  if(document.getElementById("evia-enrolment-style"))return;
  const s=document.createElement("style");s.id="evia-enrolment-style";s.textContent=`
  html.evia-no-course-pending #root{visibility:hidden}
  .evia-no-course-home .self-invite{max-width:18rem;text-align:center}
  .evia-enrol-layer .evia-tools-body{padding-bottom:max(2rem,env(safe-area-inset-bottom))}
  .evia-enrol-camera{position:relative;overflow:hidden;border-radius:1.5rem;background:#171717;aspect-ratio:3/4;margin:1rem 0}
  .evia-enrol-camera video{width:100%;height:100%;object-fit:cover;display:block}
  .evia-enrol-camera .frame{position:absolute;inset:17%;border:2px solid rgba(255,255,255,.92);border-radius:1.2rem;box-shadow:0 0 0 999px rgba(0,0,0,.2);pointer-events:none}
  .evia-enrol-camera .frame:before,.evia-enrol-camera .frame:after{content:"";position:absolute;left:12%;right:12%;height:1px;background:rgba(255,255,255,.55)}
  .evia-enrol-camera .frame:before{top:33%}.evia-enrol-camera .frame:after{bottom:33%}
  .evia-enrol-status{min-height:1.4rem;margin:.65rem 0;font-size:.82rem;line-height:1.35;color:#5f5f62}
  .evia-enrol-status.is-error{color:#8f2d2d}
  .evia-enrol-actions{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin:.8rem 0}
  .evia-enrol-secondary{width:100%;min-height:3rem;border:0;border-radius:999px;background:rgba(255,255,255,.68);font:inherit}
  .evia-enrol-manual{display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,.08)}
  .evia-enrol-manual.is-open{display:block}
  .evia-enrol-manual label{display:block;font-size:.78rem;margin-bottom:.45rem;color:#6b6b6d}
  .evia-enrol-manual input{width:100%;box-sizing:border-box;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.8);border-radius:1rem;padding:.9rem 1rem;font:inherit;text-transform:uppercase;outline:none}
  .evia-enrol-manual input:focus{border-color:rgba(0,0,0,.28)}
  @media(max-width:360px){.evia-enrol-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(s)
}
function homeHtml(){
  const name=(localStorage.getItem("evia-full-name")||"").trim();
  return `<main class="evia-app selfobs is-ready evia-no-course-home"><div class="ambient ambient-one"></div><div class="ambient ambient-two"></div><div class="self-top"><b>Evia</b><small>${esc(name||"Apprentice assistant")}</small></div><button class="evia-anchor" data-evia-enrol aria-label="Add your course"><span class="evia-float"><span class="evia-halo"></span><span class="evia-face expression-idle"><span class="evia-eyes"><span class="evia-eye eye-left"></span><span class="evia-eye eye-right"></span></span></span></span></button><div class="self-invite">Tap me to add your course</div><section class="menu-stage"><div class="self-panel"></div></section><div class="app-toast"></div></main>`
}
function mount(){
  if(!noCourse())return false;
  style();stopCamera();document.querySelector(".evia-enrol-layer")?.remove();
  const root=document.getElementById("root");if(!root)return false;
  root.innerHTML=homeHtml();document.documentElement.classList.remove("evia-no-course-pending");
  root.querySelector("[data-evia-enrol]")?.addEventListener("click",openScanner);
  return true
}
function ensureMounted(){
  if(!noCourse())return;
  const root=document.getElementById("root");if(root&&!root.querySelector(".evia-no-course-home")&&!document.querySelector(".evia-enrol-layer"))mount()
}
function closeScanner(){stopCamera();document.querySelector(".evia-enrol-layer")?.remove();ensureMounted()}
function scannerHtml(){return `<section class="evia-tools-screen"><div class="evia-tools-head"><button type="button" data-enrol-back>‹ Back</button><b>Add course</b><span></span></div><div class="evia-tools-body"><p class="evia-tools-kicker">Course QR</p><h2>Scan your course</h2><p class="evia-tools-copy">Point the camera at the Evia QR for your qualification. You only need to do this once.</p><div class="evia-enrol-camera"><video data-enrol-video playsinline muted autoplay></video><span class="frame" aria-hidden="true"></span></div><div class="evia-enrol-status" data-enrol-status>Starting camera…</div><div class="evia-enrol-actions"><button type="button" class="evia-enrol-secondary" data-enrol-photo>Choose QR image</button><button type="button" class="evia-enrol-secondary" data-enrol-manual-toggle>Enter course code</button></div><div class="evia-enrol-manual" data-enrol-manual><label for="eviaCourseCode">Course code</label><input id="eviaCourseCode" data-enrol-code inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. ST0095"><button type="button" class="evia-tools-primary" data-enrol-submit>Install course</button></div><input type="file" accept="image/*" data-enrol-file hidden></div></section>`}
function status(text,error=false){const n=document.querySelector("[data-enrol-status]");if(!n)return;n.textContent=text;n.classList.toggle("is-error",error)}
async function supportsDetector(){
  if(nativeDetectorSupport!==null)return nativeDetectorSupport;
  if(typeof window.BarcodeDetector!=="function")return nativeDetectorSupport=false;
  try{const xs=await window.BarcodeDetector.getSupportedFormats?.();return nativeDetectorSupport=!Array.isArray(xs)||xs.includes("qr_code")}catch{return nativeDetectorSupport=true}
}
function supportsJsQr(){return typeof window.jsQR==="function"}
function sourceSize(source){
  return{width:Number(source?.videoWidth||source?.naturalWidth||source?.width||0),height:Number(source?.videoHeight||source?.naturalHeight||source?.height||0)}
}
function decodeWithJsQr(source){
  if(!supportsJsQr())return null;
  const size=sourceSize(source);if(!size.width||!size.height)return null;
  const maxSide=960,scale=Math.min(1,maxSide/Math.max(size.width,size.height)),width=Math.max(1,Math.round(size.width*scale)),height=Math.max(1,Math.round(size.height*scale));
  decodeCanvas=decodeCanvas||document.createElement("canvas");decodeCanvas.width=width;decodeCanvas.height=height;
  const context=decodeCanvas.getContext("2d",{willReadFrequently:true});if(!context)return null;
  context.drawImage(source,0,0,width,height);const pixels=context.getImageData(0,0,width,height);
  return window.jsQR(pixels.data,width,height,{inversionAttempts:"attemptBoth"})?.data||null
}
async function decodeSource(source){
  if(await supportsDetector()){
    try{const reader=detector||new window.BarcodeDetector({formats:["qr_code"]});const found=await reader.detect(source);const raw=found?.[0]?.rawValue;if(raw)return raw}catch(error){console.debug("Evia native QR decode",error)}
  }
  return decodeWithJsQr(source)
}
async function imageFromFile(file){
  if(typeof window.createImageBitmap==="function"){
    const image=await window.createImageBitmap(file);return{image,close(){image.close?.()}}
  }
  const url=URL.createObjectURL(file),image=new window.Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error("The QR image could not be opened."));image.src=url});
    return{image,close(){URL.revokeObjectURL(url)}}
  }catch(error){URL.revokeObjectURL(url);throw error}
}
async function openScanner(){
  if(!noCourse()||document.querySelector(".evia-enrol-layer"))return;
  style();const layer=document.createElement("div");layer.className="evia-tools-layer evia-enrol-layer";layer.innerHTML=scannerHtml();document.body.appendChild(layer);
  layer.querySelector("[data-enrol-back]").onclick=closeScanner;
  layer.querySelector("[data-enrol-manual-toggle]").onclick=()=>{const box=layer.querySelector("[data-enrol-manual]");box.classList.toggle("is-open")};
  layer.querySelector("[data-enrol-submit]").onclick=()=>installFromInput(layer.querySelector("[data-enrol-code]")?.value||"");
  layer.querySelector("[data-enrol-code]").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();installFromInput(e.currentTarget.value)}});
  const file=layer.querySelector("[data-enrol-file]");layer.querySelector("[data-enrol-photo]").onclick=()=>file.click();file.onchange=async()=>{const f=file.files?.[0];file.value="";if(f)await scanImage(f)};
  await startCamera(layer.querySelector("[data-enrol-video]"))
}
async function startCamera(video){
  if(!navigator.mediaDevices?.getUserMedia){status("Camera scanning is not available here. Enter your course code instead.",true);return}
  const native=await supportsDetector();if(!native&&!supportsJsQr()){status("The QR reader did not load. Enter your course code instead.",true);return}
  try{
    detector=native?new window.BarcodeDetector({formats:["qr_code"]}):null;
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:1280}},audio:false});
    if(!document.body.contains(video)){stopCamera();return}
    video.srcObject=stream;await video.play();status("Ready — hold the QR inside the square.");scanLoop(video)
  }catch(error){console.error("Evia course camera",error);status("Camera could not start. Allow camera access or enter your course code instead.",true)}
}
async function scanLoop(video){
  if(!stream||installing||!document.body.contains(video))return;
  try{
    if(video.readyState>=2){const raw=await decodeSource(video);if(raw){await installFromInput(raw);return}}
  }catch(error){console.debug("Evia QR scan",error)}
  scanTimer=setTimeout(()=>scanLoop(video),220)
}
async function scanImage(file){
  if(!(await supportsDetector())&&!supportsJsQr()){status("The QR reader did not load. Enter the course code instead.",true);return}
  let loaded=null;
  try{
    status("Reading QR image…");loaded=await imageFromFile(file);const raw=await decodeSource(loaded.image);
    if(!raw){status("I could not find an Evia QR in that image.",true);return}await installFromInput(raw)
  }catch(error){console.error("Evia QR image",error);status("That QR image could not be read. Try another image or enter the course code.",true)}finally{loaded?.close?.()}
}
function packageUrl(path){const base=new URL(REGISTRY_FILE,document.baseURI);return new URL(String(path||""),base).href}
function verifyRegistryPack(pack,entry){
  if(String(pack.id)!==String(entry.packageId))throw Error("The downloaded course ID does not match the QR.");
  if(String(pack.version||"")!==String(entry.currentPackageVersion||""))throw Error("The downloaded course version does not match the registry.");
  const family=String(pack.familyId||pack.standardId||pack.id||"");if(family!==String(entry.packageFamilyId||""))throw Error("The downloaded course family does not match the QR.");
  if(entry.qualificationId&&String(pack.standardId||pack.familyId||"")!==String(entry.qualificationId))throw Error("The downloaded qualification does not match the QR.")
}
async function installFromInput(value){
  if(installing)return;installing=true;stopCamera();status("Checking course…");
  try{
    if(!window.EviaCourseRegistry?.resolve)throw Error("The course registry is not ready.");
    if(!window.EviaCoursePacks?.install||!window.EviaCoursePacks?.activate)throw Error("The course installer is not ready.");
    const resolved=await window.EviaCourseRegistry.resolve(value,{requirePublishable:true});
    if(!resolved.ok){
      if(resolved.reason==="invalid-code")throw Error("That is not a valid Evia course code.");
      if(resolved.reason==="unknown-course")throw Error("That course code is not recognised.");
      if(resolved.reason==="course-not-ready")throw Error("That course is not ready to install yet.");
      if(resolved.reason==="registry-unavailable")throw Error("Evia could not reach the course registry. Check your internet connection and try again.");
      throw Error("That course cannot be installed yet.")
    }
    const entry=resolved.course;status(`Downloading ${entry.shortTitle||entry.title}…`);
    const response=await fetch(packageUrl(entry.packagePath),{cache:"no-store"});if(!response.ok)throw Error(`Course download failed (${response.status}).`);
    const raw=await response.json();const normalized=window.EviaCoursePacks.normalize?window.EviaCoursePacks.normalize(raw):raw;verifyRegistryPack(normalized,entry);
    status("Verifying and installing course…");const installed=window.EviaCoursePacks.install(raw);window.EviaCoursePacks.activate(installed.id,entry.pathwayId||"");
    localStorage.setItem(RECEIPT_KEY,JSON.stringify({enrolmentId:resolved.enrolmentId,packageId:installed.id,packageVersion:String(installed.version||""),installedAt:Date.now()}));
    status(`${entry.shortTitle||entry.title} installed. Opening Evia…`);await new Promise(r=>setTimeout(r,450));location.reload()
  }catch(error){console.error("Evia course install",error);installing=false;status(error?.message||"The course could not be installed.",true)}
}
function start(){
  style();if(!noCourse()){document.documentElement.classList.remove("evia-no-course-pending");return}
  mount();
  const root=document.getElementById("root");if(root&&!observer){observer=new MutationObserver(()=>requestAnimationFrame(ensureMounted));observer.observe(root,{childList:true})}
}
window.EviaCourseEnrolment={mount,openScanner,installFromInput,stopCamera,noCourse};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
window.addEventListener("pagehide",stopCamera);
})();
