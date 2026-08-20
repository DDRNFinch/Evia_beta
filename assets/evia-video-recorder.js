(()=>{
"use strict";

const VIDEO_BITS_PER_SECOND=1370000;
const AUDIO_BITS_PER_SECOND=96000;
let active=null;

function preferredMime(){
  if(typeof MediaRecorder==="undefined")return "";
  const types=[
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm"
  ];
  return types.find(type=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(type))||"";
}
function extension(type){return String(type||"").includes("mp4")?"mp4":"webm"}
function clock(ms){
  const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}
function stopTracks(stream){try{stream?.getTracks?.().forEach(track=>track.stop())}catch{}}
function nativeFallback(input){
  if(!input)return;
  try{input.value=""}catch{}
  input.setAttribute("type","file");
  input.setAttribute("capture","environment");
  input.setAttribute("accept","video/*");
  input.click();
}
function closeActive(){
  if(!active)return;
  clearInterval(active.timer);
  try{if(active.recorder&&active.recorder.state!=="inactive")active.recorder.stop()}catch{}
  stopTracks(active.stream);
  active.layer?.remove();
  active=null;
}
function deliver(input,file){
  if(!input||!file)return false;
  try{
    if(typeof input.onchange==="function"){
      input.onchange({target:{files:[file],value:""}});
      requestAnimationFrame(()=>replaceVideoPreview(file));
      return true;
    }
  }catch{}
  try{
    const dt=new DataTransfer();
    dt.items.add(file);
    input.files=dt.files;
    input.dispatchEvent(new Event("change",{bubbles:true}));
    requestAnimationFrame(()=>replaceVideoPreview(file));
    return true;
  }catch{}
  return false;
}
function replaceVideoPreview(file){
  if(!file?.type?.startsWith("video/"))return;
  const img=document.querySelector(".self-card.photo img");
  if(!img||!String(img.src||"").startsWith("blob:"))return;
  const video=document.createElement("video");
  video.src=img.src;
  video.controls=true;
  video.playsInline=true;
  video.preload="metadata";
  video.setAttribute("aria-label","Evidence video preview");
  img.replaceWith(video);
}
function errorScreen(layer,message,input){
  const body=layer.querySelector(".evia-video-body");
  if(!body)return;
  body.innerHTML=`<div class="evia-video-error"><b>Video camera unavailable</b><span>${message}</span><button type="button" data-video-phone>Use phone camera</button><button type="button" data-video-cancel>Cancel</button></div>`;
  body.querySelector("[data-video-phone]").onclick=()=>{layer.remove();active=null;nativeFallback(input)};
  body.querySelector("[data-video-cancel]").onclick=closeActive;
}

async function open(input){
  if(active)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
    nativeFallback(input);
    return;
  }

  const layer=document.createElement("div");
  layer.className="evia-video-layer";
  layer.innerHTML=`
    <div class="evia-video-body">
      <div class="evia-video-top"><button type="button" data-video-cancel>Cancel</button><b>Record video</b><span></span></div>
      <div class="evia-video-loading">Opening camera and microphone…</div>
    </div>`;
  document.body.appendChild(layer);
  active={layer,stream:null,recorder:null,timer:null};
  layer.querySelector("[data-video-cancel]").onclick=closeActive;

  let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:"environment"},
        width:{ideal:1280,max:1280},
        height:{ideal:720,max:1280},
        frameRate:{ideal:30,max:30}
      },
      audio:{channelCount:{ideal:1},echoCancellation:true,noiseSuppression:true}
    });
  }catch(err){
    errorScreen(layer,"Allow Evia to use both the camera and microphone, or use the phone camera instead.",input);
    return;
  }
  if(!active||active.layer!==layer){stopTracks(stream);return}
  active.stream=stream;
  if(!stream.getVideoTracks().length||!stream.getAudioTracks().length){
    stopTracks(stream);
    active.stream=null;
    errorScreen(layer,"Evia needs both camera and microphone access so the evidence video includes sound.",input);
    return;
  }

  const body=layer.querySelector(".evia-video-body");
  body.innerHTML=`
    <div class="evia-video-top"><button type="button" data-video-cancel>Cancel</button><b>Record video</b><span></span></div>
    <div class="evia-video-preview-wrap"><video class="evia-video-preview" autoplay muted playsinline></video><div class="evia-video-time" data-video-time>0:00</div></div>
    <div class="evia-video-controls"><span data-video-status>Ready · camera + microphone</span><button type="button" class="evia-video-record" data-video-record>Start recording</button></div>`;
  const preview=body.querySelector("video");
  preview.srcObject=stream;
  try{await preview.play()}catch{}
  body.querySelector("[data-video-cancel]").onclick=closeActive;
  body.querySelector("[data-video-record]").onclick=()=>startRecording(input);
}

function startRecording(input){
  if(!active?.stream)return;
  const {layer,stream}=active;
  const button=layer.querySelector("[data-video-record]"),status=layer.querySelector("[data-video-status]"),time=layer.querySelector("[data-video-time]");
  if(!button||button.dataset.recording==="1")return;
  const mime=preferredMime();
  const options={videoBitsPerSecond:VIDEO_BITS_PER_SECOND,audioBitsPerSecond:AUDIO_BITS_PER_SECOND};
  if(mime)options.mimeType=mime;
  let recorder;
  try{recorder=new MediaRecorder(stream,options)}catch{
    try{recorder=new MediaRecorder(stream)}catch{
      errorScreen(layer,"This phone could not start the Evia recorder. Use the phone camera instead.",input);
      return;
    }
  }
  if(!recorder.stream?.getAudioTracks?.().length){
    errorScreen(layer,"The microphone was not available. Evia will not save a silent evidence video.",input);
    return;
  }
  active.recorder=recorder;
  const chunks=[];
  const started=Date.now();
  button.dataset.recording="1";
  button.textContent="Stop & use video";
  button.classList.add("is-recording");
  status.textContent="Recording · audio on";
  const tick=()=>{if(time)time.textContent=clock(Date.now()-started)};
  tick();
  active.timer=setInterval(tick,250);
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=()=>{
    clearInterval(active?.timer);
    if(active)active.timer=null;
    status.textContent="Recording problem · try again";
    button.dataset.recording="";
    button.textContent="Start recording";
    button.classList.remove("is-recording");
  };
  recorder.onstop=()=>{
    if(!active||active.recorder!==recorder)return;
    clearInterval(active.timer);active.timer=null;
    stopTracks(stream);
    active.stream=null;
    const type=recorder.mimeType||mime||chunks[0]?.type||"video/webm";
    const blob=new Blob(chunks,{type});
    if(blob.size<1024){
      errorScreen(layer,"The recording could not be saved. Please try again or use the phone camera.",input);
      return;
    }
    const file=new File([blob],`evia-video-${Date.now()}.${extension(type)}`,{type,lastModified:Date.now()});
    const ok=deliver(input,file);
    layer.remove();
    active=null;
    if(!ok)nativeFallback(input);
  };
  recorder.start(1000);
  button.onclick=()=>{
    if(recorder.state!=="inactive"){
      button.disabled=true;
      status.textContent="Saving video…";
      recorder.stop();
    }
  };
}

window.EviaVideoCapture={open,videoBitsPerSecond:VIDEO_BITS_PER_SECOND,audioBitsPerSecond:AUDIO_BITS_PER_SECOND};
})();