(()=>{
"use strict";
const COURSE=window.EviaCourseContext?.current?.()||{
  courseId:"st0095-v1-2",dataPrefix:"evia-site-data",codes:[...Array.from({length:31},(_,i)=>`K${i+1}`),...Array.from({length:22},(_,i)=>`S${i+1}`),...Array.from({length:6},(_,i)=>`B${i+1}`)],totalKsb:59,otjMinimumHours:578,epaConfigured:true,pathway:null
};
const CODES=[...COURSE.codes];
const STORE="evia-selfobs-live-v3",DAY="evia-selfobs-day-v3",RECAP="evia-selfobs-recap-v3",DB="evia-self-observation-media",DBS="files";
let DATA=[],entries=read(STORE,[]),dayIds=read(DAY,[]),recap=read(RECAP,null),open=false,view="home",cat=null,job=null,opp=null,photo=null,photoUrl="",mode="type",typed="",audio=null,recorder=null,stream=null,chunks=[],tab="new",toastTimer=null;
const $=q=>document.querySelector(q),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function read(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function dots(n){n=Math.max(0,Math.round(Number(n)||0));if(!n)return"";return n>5?`o x ${n}`:"o".repeat(n)}
function fresh(){return entries.filter(e=>!e.downloadedAt)}
function archived(){return entries.filter(e=>e.downloadedAt)}
function today(){return entries.filter(e=>dayIds.includes(e.id))}
function count(field,id){return entries.filter(e=>e[field]===id).length}
function counts(){const x={};CODES.forEach(c=>x[c]=0);entries.forEach(e=>(Array.isArray(e?.codes)?e.codes:[]).forEach(c=>{if(c in x)x[c]=(x[c]||0)+1}));return x}
function touched(){const x=counts();return CODES.filter(c=>x[c]>0).length}
function findCat(id){return DATA.find(x=>x.id===id)}
function findJob(c,id){return c?.jobs.find(x=>x.id===id)}
function findOpp(j,id){return j?.opps.find(x=>x.id===id)}
function timeline(){try{const t=JSON.parse(localStorage.getItem("evia-course-timeline")||"null");if(!t?.startDate||!t?.endDate)return 0;const s=new Date(t.startDate).getTime(),e=new Date(t.endDate).getTime();return e>s?Math.round(Math.max(0,Math.min(1,(Date.now()-s)/(e-s)))*100):0}catch{return 0}}
function otj(){
  try{
    const xs=JSON.parse(localStorage.getItem("evia-otj-entries")||"[]"),college=JSON.parse(localStorage.getItem("evia-otj-college-v1")||"{}");
    const learner=(Array.isArray(xs)?xs:[]).reduce((n,x)=>n+(Number.isFinite(Number(x?.durationMinutes))?Number(x.durationMinutes):Math.round((Number(x?.hours)||0)*60)),0);
    const collegeMinutes=Math.max(0,Number(college?.hours)||0)*60+Math.max(0,Math.min(59,Number(college?.minutes)||0));
    const required=Math.max(1,Number(COURSE.otjMinimumHours)||578)*60;
    return Math.round(Math.min(1,(learner+collegeMinutes)/required)*100)
  }catch{return 0}
}
function epa(){if(COURSE.epaConfigured===false)return 0;try{const x=JSON.parse(localStorage.getItem("evia-epa-checks")||"{}");const n=Array.isArray(x)?x.length:Object.values(x||{}).filter(Boolean).length;return Math.round(Math.min(1,n/6)*100)}catch{return 0}}
function arch(label,pct){return `<button class="progress-arch" data-arch="${label}"><svg viewBox="0 0 100 68"><path class="arch-track" d="M14 54 A36 36 0 0 1 86 54"/><path class="arch-value" d="M14 54 A36 36 0 0 1 86 54" pathLength="100" stroke-dasharray="${pct} 100"/></svg><span class="arch-label">${label}</span><span class="arch-number">${pct}%</span></button>`}
function shell(){
  const name=(localStorage.getItem("evia-full-name")||"").trim();
  return `<main class="evia-app selfobs is-ready${open?" is-open":""}"><div class="ambient ambient-one"></div><div class="ambient ambient-two"></div><div class="self-top"><b>Evia</b><small>${esc(name||"Apprentice assistant")}</small></div><button class="self-evidence" data-quick>Evidence · ${fresh().length} new</button><button class="evia-anchor" data-evia><span class="evia-float"><span class="evia-halo"></span><span class="evia-face expression-idle"><span class="evia-eyes"><span class="evia-eye eye-left"></span><span class="evia-eye eye-right"></span></span></span></span></button><div class="self-invite">Tap me to get started</div><section class="menu-stage"><div class="self-panel"></div></section><section class="progress-dock"><div class="progress-row">${arch("TOC",timeline())}${arch("KSB",Math.round(touched()/CODES.length*100))}${arch("OTJ",otj())}${arch("EPA",epa())}</div></section><div class="app-toast"></div><input id="selfPhoto" type="file" accept="image/*" capture="environment" hidden></main>`
}
function title(a,b=""){return `<h2 class="self-title">${esc(a)}</h2>${b?`<p class="self-copy">${esc(b)}</p>`:""}`}
function pill(a,b="",n=0,attrs=""){return `<button class="option-row" ${attrs}><span class="option-row-copy"><span>${esc(a)}</span>${b?`<small>${esc(b)}</small>`:""}</span><span class="self-side">${n?`<b>${dots(n)}</b>`:""}<i>›</i></span></button>`}
function back(){return `<button class="self-back" data-action="back">‹ Back</button>`}
function recapText(){
  const n=today().length;
  if(n)return `You’ve collected ${n} evidence moment${n===1?"":"s"} today. Pick the job you’re doing now.`;
  if(recap?.count)return `Last time you collected ${recap.count} evidence moment${recap.count===1?"":"s"}. You now have evidence against ${touched()} of ${CODES.length} KSBs.`;
  return COURSE.pathway==="architectural-joiner"?"Tell me what you’re doing in the workshop. I’ll show you the evidence you could get from that job.":"Tell me what you’re doing on site. I’ll show you the evidence you could get from that job."
}
function mount(){document.getElementById("root").innerHTML=shell();bindShell();render()}
function bindShell(){
  $("[data-evia]").onclick=()=>{open=!open;if(!open){view="home";cat=job=opp=null}mount()};
  $("[data-quick]").onclick=()=>{open=true;view="evidence";mount()};
  document.querySelectorAll("[data-arch]").forEach(b=>b.onclick=()=>{if(b.dataset.arch==="KSB"){open=true;view="coverage";mount()}else toast(`${b.dataset.arch} is still available from the arch bar.`)});
  $("#selfPhoto").onchange=e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;photo=f;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(f);render()}
}
function render(){const p=$(".self-panel");if(!p||!open)return;if(view==="home")home(p);else if(view==="jobs")jobs(p);else if(view==="opps")opps(p);else if(view==="capture")capture(p);else if(view==="question")question(p);else if(view==="answer")answer(p);else if(view==="evidence")evidence(p);else if(view==="coverage")coverage(p);else if(view==="day")day(p);bindPanel()}
function home(p){
  const heading=COURSE.pathway==="architectural-joiner"?"What are you doing in the workshop today?":"What are you doing on site today?";
  let h=title(heading,recapText())+'<div class="self-list">';
  DATA.forEach(c=>h+=pill(c.title,`${c.jobs.length} ${COURSE.pathway==="architectural-joiner"?"workshop":"site"} tasks`,count("categoryId",c.id),`data-cat="${c.id}"`));
  h+=`</div><div class="self-mini"><button data-action="evidence"><strong>Evidence</strong><span>${fresh().length} new evidence</span></button><button data-action="coverage"><strong>Course coverage</strong><span>${touched()} of ${CODES.length} evidenced</span></button></div>`;
  p.innerHTML=h
}
function jobs(p){p.innerHTML=back()+title(cat.title,"Choose the task closest to what you’re doing today.")+'<div class="self-list">'+cat.jobs.map(j=>pill(j.title,"",count("jobId",j.id),`data-job="${j.id}"`)).join("")+"</div>"}
function opps(p){p.innerHTML=back()+title(job.title,`There are ${job.opps.length} useful things you could get from this job. Get the ones you can and leave the rest.`)+'<div class="self-list">'+job.opps.map(o=>pill(o.title,o.instruction,count("opportunityId",o.id),`data-opp="${o.id}"`)).join("")+`</div><div class="self-actions"><button class="self-button primary" data-action="submit">Submit this job & go home</button><button class="self-button" data-action="finish">Finish for today</button></div>`}
function clearCapture(){if(photoUrl)URL.revokeObjectURL(photoUrl);photo=null;photoUrl="";typed="";audio=null;mode="type";stopRec(true)}
function capture(p){p.innerHTML=back()+title(opp.title,opp.instruction)+`<div class="self-card photo"><span>One clear photo</span><button class="self-button primary" data-pick>${photo?"Change photo":"Take / choose photo"}</button>${photoUrl?`<img src="${photoUrl}" alt="Evidence preview">`:""}</div><button class="self-button primary" data-action="next" ${photo?"":"disabled"}>Continue</button>`}
function question(p){p.innerHTML=back()+title(opp.title)+`<div class="self-question">${esc(opp.question)}</div><div class="self-actions"><button class="self-button primary" data-mode="talk">Talk</button><button class="self-button" data-mode="type">Type</button></div>`}
function answer(p){
  if(mode==="type")p.innerHTML=back()+title("Keep it short",opp.question)+`<textarea id="selfText" placeholder="A sentence or two is enough.">${esc(typed)}</textarea><button class="self-button primary" data-action="save">Save evidence</button>`;
  else p.innerHTML=back()+title("Talk about it",opp.question)+`<div class="self-card record"><span>${audio?"Answer recorded":recorder&&recorder.state==="recording"?"Recording…":"Ready to record"}</span><div class="self-actions">${recorder&&recorder.state==="recording"?'<button class="self-button primary" data-action="stop">Stop</button>':'<button class="self-button primary" data-action="record">Start recording</button>'}<button class="self-button" data-mode="type">Type instead</button></div></div>${audio?'<button class="self-button primary" data-action="save">Save evidence</button>':""}`
}
function evidence(p){
  const list=tab==="new"?fresh():archived(),groups={};list.forEach(e=>(groups[e.bundle]||(groups[e.bundle]=[])).push(e));
  let h=back()+title("Evidence",tab==="new"?"Only new evidence is included in the next download.":"Downloaded evidence stays here and still counts towards your yellow evidence marks.")+`<div class="self-tabs"><button class="${tab==="new"?"on":""}" data-tab="new">New evidence · ${fresh().length}</button><button class="${tab==="downloaded"?"on":""}" data-tab="downloaded">Downloaded · ${archived().length}</button></div>`;
  if(tab==="new")h+=`<button class="self-button primary" data-action="download" ${list.length?"":"disabled"}>Download new evidence</button>`;
  Object.keys(groups).sort().forEach(g=>{h+=`<div class="self-card group"><strong>${esc(g)} <em>${dots(groups[g].length)}</em></strong>`;groups[g].forEach(e=>h+=`<div class="self-entry"><b>${esc(e.title)} · ${esc(e.jobTitle)}</b><span>${esc(e.answerText||"Voice answer")}</span><small>${(e.codes||[]).join(" · ")} · ${new Date(e.createdAt).toLocaleDateString("en-GB")}</small></div>`);h+="</div>"});
  if(!list.length)h+='<div class="self-card"><span>Nothing here yet.</span></div>';p.innerHTML=h
}
function coverage(p){const x=counts();p.innerHTML=back()+title("Course coverage","Nothing is marked complete. Yellow marks only show how many times you have evidenced each KSB. Tap any code to get a suitable photo or question.")+`<div class="self-ksbs">${CODES.map(c=>`<button data-code="${c}"><b>${c}</b><span>${dots(x[c]||0)}</span></button>`).join("")}</div>`}
function day(p){p.innerHTML=title("That’s enough for today",recap?.count?`You collected ${recap.count} evidence moment${recap.count===1?"":"s"}. I’ll remind you next time.`:"Nothing was forced or marked missing.")+`<button class="self-button primary" data-action="home">Back home</button>`}
function bindPanel(){
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{cat=findCat(b.dataset.cat);view="jobs";render()});
  document.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>{job=findJob(cat,b.dataset.job);view="opps";render()});
  document.querySelectorAll("[data-opp]").forEach(b=>b.onclick=()=>{opp=findOpp(job,b.dataset.opp);clearCapture();view=opp.media==="talk"?"question":"capture";render()});
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;view="answer";render()});
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
  document.querySelectorAll("[data-code]").forEach(b=>b.onclick=()=>routeCode(b.dataset.code));
  document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action));
  const pick=$("[data-pick]");if(pick)pick.onclick=()=>$("#selfPhoto").click();
  const ta=$("#selfText");if(ta)ta.oninput=e=>typed=e.target.value
}
function goBack(){if(view==="jobs")view="home";else if(view==="opps")view="jobs";else if(view==="capture"||view==="question")view="opps";else if(view==="answer")view="question";else view="home";render()}
async function action(a){
  if(a==="back")goBack();
  else if(a==="next"){view="question";render()}
  else if(a==="save")save();
  else if(a==="record")startRec();
  else if(a==="stop")stopRec();
  else if(a==="submit"){cat=job=opp=null;view="home";open=false;mount();toast("Job submitted. Start another job whenever you’re ready.")}
  else if(a==="finish")finish();
  else if(a==="home"){view="home";render()}
  else if(a==="evidence"){view="evidence";render()}
  else if(a==="coverage"){view="coverage";render()}
  else if(a==="download")download()
}
function openDb(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(DBS))q.result.createObjectStore(DBS,{keyPath:"id"})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function storeBlob(blob,name,type){const db=await openDb(),id=`m-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;await new Promise((res,rej)=>{const t=db.transaction(DBS,"readwrite");t.objectStore(DBS).put({id,blob,name,type});t.oncomplete=res;t.onerror=()=>rej(t.error)});db.close();return id}
async function getBlob(id){if(!id)return null;const db=await openDb();const v=await new Promise((res,rej)=>{const q=db.transaction(DBS,"readonly").objectStore(DBS).get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});db.close();return v}
async function save(){
  if(opp.media!=="talk"&&!photo){toast("Add one photo first.");return}
  if(mode==="type"&&(typed.trim().match(/\S+/g)||[]).length<3){toast("Just add a little more so I know what you mean.");return}
  if(mode==="talk"&&!audio){toast("Record a short answer first.");return}
  try{
    const now=Date.now(),photoId=photo?await storeBlob(photo,photo.name||`${opp.id}.jpg`,photo.type||"image/jpeg"):null,audioId=audio?await storeBlob(audio,`${opp.id}.webm`,audio.type||"audio/webm"):null;
    const e={id:`e-${now}-${Math.random().toString(36).slice(2,7)}`,createdAt:now,courseId:COURSE.courseId,pathway:COURSE.pathway||null,categoryId:cat.id,categoryTitle:cat.title,jobId:job.id,jobTitle:job.title,opportunityId:opp.id,title:opp.title,bundle:opp.bundle,question:opp.question,codes:[...opp.codes],answerMode:mode,answerText:mode==="type"?typed.trim():null,photoId,audioId,downloadedAt:null};
    entries.unshift(e);dayIds.push(e.id);write(STORE,entries);write(DAY,dayIds);clearCapture();view="opps";mount();open=true;$(".evia-app").classList.add("is-open");render();toast("Evidence saved. About one minute, done.")
  }catch(e){console.error(e);toast("That evidence could not be saved.")}
}
function finish(){const n=today().length;recap={at:Date.now(),count:n,touched:touched()};write(RECAP,recap);dayIds=[];write(DAY,dayIds);cat=job=opp=null;view="day";render()}
function routeCode(code){for(const c of DATA)for(const j of c.jobs)for(const o of j.opps)if(o.codes.includes(code)){cat=c;job=j;opp=o;clearCapture();view=o.media==="talk"?"question":"capture";render();toast(`Here’s a way to gather more ${code} evidence.`);return}}
async function startRec(){
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){toast("Microphone isn’t available here. Use Type instead.");return}
  try{stopRec(true);stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{audio=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});stream?.getTracks().forEach(t=>t.stop());stream=null;recorder=null;render()};recorder.start(250);render()}catch{toast("Microphone permission wasn’t available. Use Type instead.")}
}
function stopRec(silent=false){if(recorder&&recorder.state!=="inactive"){if(silent)recorder.onstop=null;try{recorder.stop()}catch{}}stream?.getTracks().forEach(t=>t.stop());stream=null;if(silent)recorder=null}
function crc32(d){let c=0xffffffff;for(const b of d){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^(0xedb88320&-(c&1))}return(c^0xffffffff)>>>0}
function catBytes(ps){const n=ps.reduce((a,p)=>a+p.length,0),o=new Uint8Array(n);let x=0;ps.forEach(p=>{o.set(p,x);x+=p.length});return o}
function le16(v){return new Uint8Array([v&255,v>>>8&255])}
function le32(v){return new Uint8Array([v&255,v>>>8&255,v>>>16&255,v>>>24&255])}
function zip(fs){const en=new TextEncoder(),ls=[],cs=[];let off=0;for(const f of fs){const n=en.encode(f.name),cr=crc32(f.data),l=catBytes([le32(0x04034b50),le16(20),le16(0),le16(0),le16(0),le16(0),le32(cr),le32(f.data.length),le32(f.data.length),le16(n.length),le16(0),n,f.data]);ls.push(l);cs.push(catBytes([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(cr),le32(f.data.length),le32(f.data.length),le16(n.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(off),n]));off+=l.length}const l=catBytes(ls),c=catBytes(cs);return new Blob([l,c,catBytes([le32(0x06054b50),le16(0),le16(0),le16(fs.length),le16(fs.length),le32(c.length),le32(l.length),le16(0)])],{type:"application/zip"})}
const csv=s=>/[",\r\n]/.test(String(s))?`"${String(s).replace(/"/g,'""')}"`:String(s??""),safe=s=>String(s).replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").slice(0,50)||"evidence";
async function download(){
  const list=fresh();if(!list.length){toast("There is no new evidence waiting for download.");return}
  try{
    const en=new TextEncoder(),fs=[],rows=[["Date","Job","Evidence","Question","Answer","KSBs"]];
    for(let i=0;i<list.length;i++){const e=list[i],pre=`${String(i+1).padStart(2,"0")}-${safe(e.title)}`,ans=e.answerMode==="type"?(e.answerText||""):"See audio";rows.push([new Date(e.createdAt).toLocaleString("en-GB"),e.jobTitle,e.title,e.question,ans,e.codes.join(" ")]);const p=await getBlob(e.photoId),a=await getBlob(e.audioId);if(p)fs.push({name:`${pre}-photo.${p.type?.split("/")[1]||"jpg"}`,data:new Uint8Array(await p.blob.arrayBuffer())});if(a)fs.push({name:`${pre}-answer.webm`,data:new Uint8Array(await a.blob.arrayBuffer())})}
    fs.unshift({name:"Evia-New-Evidence.csv",data:en.encode(rows.map(r=>r.map(csv).join(",")).join("\r\n"))});
    const u=URL.createObjectURL(zip(fs)),a=document.createElement("a");a.href=u;a.download=`Evia-New-Evidence-${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);
    const now=Date.now();entries=entries.map(e=>!e.downloadedAt?{...e,downloadedAt:now}:e);write(STORE,entries);tab="downloaded";view="evidence";mount();open=true;$(".evia-app").classList.add("is-open");render();toast(`${list.length} evidence item${list.length===1?"":"s"} moved to Downloaded.`)
  }catch(e){console.error(e);toast("The evidence download could not be built.")}
}
function toast(m){const t=$(".app-toast");if(!t)return;clearTimeout(toastTimer);t.textContent=m;t.classList.add("is-visible");toastTimer=setTimeout(()=>t.classList.remove("is-visible"),2600)}
async function loadData(){
  try{
    const prefix=COURSE.dataPrefix||"evia-site-data";
    const parts=await Promise.all([1,2,3].map(async n=>{
      const t=await fetch(`./app/${prefix}-${n}.ts?v=26`,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.text()});
      const m=t.match(/export const SITE_DATA_\d+:SiteCategory\[\]=(.*);\s*$/s);if(!m)throw Error("data parse");return JSON.parse(m[1])
    }));
    DATA=parts.flat();
    const mapped=new Set(DATA.flatMap(c=>c.jobs.flatMap(j=>j.opps.flatMap(o=>o.codes))));
    if(mapped.size!==CODES.length||CODES.some(c=>!mapped.has(c)))throw Error(`only ${mapped.size}/${CODES.length} mapped`);
    mount()
  }catch(e){console.error(e);document.getElementById("root").innerHTML='<main class="evia-app selfobs is-ready"><div class="self-load-error">Evia could not load the course map. Refresh once and try again.</div></main>'}
}
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=26").catch(()=>{}));
loadData();
})();