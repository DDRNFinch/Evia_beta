(()=>{
"use strict";

const HISTORY_KEY="evia-arp-discussion-v1";
const PRACTICE_SIZE=5;
const PROMPTS=["What","How","Why","Check","Example"];
const STRENGTH_LABELS={
  1:"Correct but brief",
  2:"Clear explanation",
  3:"Well reasoned",
  4:"Thorough"
};
const STRENGTH_FEEDBACK={
  1:"The main point is correct, but an assessor would need more detail. Add why it matters, how you checked it and a real workplace example.",
  2:"This is clear and correct. Strengthen it by explaining the check you made and the result.",
  3:"This is a strong response with a reason and a check. A workplace example or portfolio reference would make it more convincing.",
  4:"This is a thorough discussion response because it combines the correct point, reasoning, a check and workplace evidence."
};
const STOP_WORDS=new Set(["about","after","again","against","also","and","are","because","been","before","being","between","could","from","have","into","must","only","other","should","that","the","their","them","then","there","these","they","this","through","using","what","when","where","which","while","with","would","your"]);
let session=null;
let voice=null;
let patchQueued=false;

function esc(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))
}

function sentence(value){
  const text=String(value??"").trim();
  if(!text)return "";
  return /[.!?]$/.test(text)?text:text+"."
}

function body(){
  return document.querySelector(".evia-arp-layer .evia-tools-body")
}

function shuffled(items){
  const output=[...items];
  for(let index=output.length-1;index>0;index--){
    const pick=Math.floor(Math.random()*(index+1));
    [output[index],output[pick]]=[output[pick],output[index]]
  }
  return output
}

function followUpFor(question){
  const followUps=[
    "Why is that approach important on a live job?",
    "How would you check that the work or control was correct?",
    "What could happen if that point was missed?",
    "Which workplace example or portfolio evidence would support your answer?"
  ];
  const hash=String(question.id||question.prompt||"").split("").reduce((total,char)=>total+char.charCodeAt(0),0);
  return followUps[hash%followUps.length]
}

function responsesFor(question){
  const core=sentence(question.options?.[Number(question.correctIndex)]);
  const reason=sentence(question.explanation);
  return [
    {
      strength:1,
      label:STRENGTH_LABELS[1],
      text:core,
      feedback:STRENGTH_FEEDBACK[1]
    },
    {
      strength:2,
      label:STRENGTH_LABELS[2],
      text:core+" "+reason,
      feedback:STRENGTH_FEEDBACK[2]
    },
    {
      strength:3,
      label:STRENGTH_LABELS[3],
      text:core+" "+reason+" I would also explain the relevant job information and the check I used before continuing.",
      feedback:STRENGTH_FEEDBACK[3]
    },
    {
      strength:4,
      label:STRENGTH_LABELS[4],
      text:core+" "+reason+" I would connect this to a workplace example, describe the check and result, and explain anything I recorded or reported.",
      feedback:STRENGTH_FEEDBACK[4]
    }
  ]
}

function discussionItems(bank){
  if(!bank||!Array.isArray(bank.questions))return [];
  return bank.questions.map(question=>({
    id:String(question.id).replace("-Q","-D"),
    sourceQuestionId:question.id,
    topic:question.topic,
    mapsTo:[...(question.mapsTo||[])],
    prompt:question.prompt,
    coreAnswer:question.options?.[Number(question.correctIndex)]||"",
    reason:question.explanation||"",
    responses:responsesFor(question),
    followUp:followUpFor(question)
  }))
}

function history(){
  try{
    const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||"{}");
    return parsed&&typeof parsed==="object"?parsed:{}
  }catch{return{}}
}

function historyFor(id){
  const item=history()[id];
  return item&&typeof item==="object"?item:{attempts:0,bestScore:0,lastScore:0}
}

function saveAttempt(id,mode,score,total){
  const all=history(),before=historyFor(id),percent=Math.round(score/Math.max(1,total)*100);
  const modes={...(before.modes||{})};
  modes[mode]=Number(modes[mode]||0)+1;
  all[id]={
    attempts:Number(before.attempts||0)+1,
    bestScore:Math.max(Number(before.bestScore||0),score),
    bestPercent:Math.max(Number(before.bestPercent||0),percent),
    lastScore:score,
    lastPercent:percent,
    lastMode:mode,
    modes,
    updatedAt:Date.now()
  };
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(all))}catch{}
  return all[id]
}

function readiness(score,total){
  const percent=Math.round(score/Math.max(1,total)*100);
  if(percent>=85)return {label:"Strong",copy:"You consistently chose or demonstrated detailed answers with checks and workplace evidence."};
  if(percent>=70)return {label:"Secure",copy:"Your answers are secure. Add a workplace result or portfolio example more consistently."};
  if(percent>=50)return {label:"Developing",copy:"Your technical points are useful, but more explanation and checking detail is needed."};
  return {label:"Building",copy:"Keep the correct point, then build each answer with how, why, a check and an example."}
}

function queuePatch(){
  if(patchQueued)return;
  patchQueued=true;
  setTimeout(()=>{
    patchQueued=false;
    if(!document.querySelector(".evia-arp-layer")&&voice)releaseVoice();
    patchDiscussionRow()
  },0)
}

function patchDiscussionRow(){
  const button=document.querySelector('.evia-arp-layer [data-arp-option="discussion"]');
  if(!button)return;
  const small=button.querySelector("small");
  const copy="Learn, practise and speak through 24 trade scenarios";
  if(small&&small.textContent!==copy)small.textContent=copy;
  if(button.getAttribute("aria-label")!=="Open Discussion Coach")button.setAttribute("aria-label","Open Discussion Coach")
}

function returnToArp(){
  releaseVoice();
  session=null;
  window.EviaArp?.open?.();
  setTimeout(patchDiscussionRow,0)
}

async function currentBank(){
  if(!window.EviaArp?.currentBank)throw Error("The ARP course bank is not ready.");
  return window.EviaArp.currentBank()
}

async function renderDiscussionHome(){
  releaseVoice();
  session=null;
  const target=body();
  if(!target)return;
  target.innerHTML='<div class="evia-arp-loading">Loading this course’s discussion scenarios…</div>';
  try{
    const bank=await currentBank(),items=discussionItems(bank),record=historyFor(bank.enrolmentId);
    target.innerHTML=
      '<p class="evia-tools-kicker">ARP · Discussion</p>'+
      '<h2>Discussion Coach</h2>'+
      '<p class="evia-tools-copy">Build stronger trade answers, practise saying them aloud and prepare for assessor follow-up questions.</p>'+
      '<div class="evia-arp-summary"><b>'+esc(bank.courseTitle)+'</b><span>'+items.length+' mapped scenarios · 5 questions per practice'+(record.attempts?' · best '+Number(record.bestScore||0)+'/20':'')+'</span></div>'+
      '<div class="evia-arp-modes">'+
        '<button type="button" class="evia-arp-mode" data-discussion-mode="learn"><b>Learn</b><small>Instantly see why an answer is correct, clear, well reasoned or thorough.</small><i>›</i></button>'+
        '<button type="button" class="evia-arp-mode" data-discussion-mode="practice"><b>Practice</b><small>Complete five unseen graded scenarios, then speak your weakest answer aloud.</small><i>›</i></button>'+
        '<button type="button" class="evia-arp-mode" data-discussion-mode="mock"><b>Mock Discussion</b><small>Answer five questions aloud without choices, then compare and self-check.</small><i>›</i></button>'+
      '</div>'+
      '<div class="evia-arp-strength-key">'+
        '<span><b>1 · Correct but brief</b>Main point only</span>'+
        '<span><b>2 · Clear</b>Point and reason</span>'+
        '<span><b>3 · Well reasoned</b>Reason and check</span>'+
        '<span><b>4 · Thorough</b>Check and evidence</span>'+
      '</div>'+
      '<p class="evia-arp-disclaimer">This is private practice and does not predict an official assessment grade.</p>'+
      '<button type="button" class="evia-arp-secondary" data-discussion-back>Back to ARP</button>';
    target.querySelectorAll("[data-discussion-mode]").forEach(button=>button.addEventListener("click",()=>startDiscussion(button.dataset.discussionMode)));
    target.querySelector("[data-discussion-back]")?.addEventListener("click",returnToArp)
  }catch(error){
    target.innerHTML=
      '<p class="evia-tools-kicker">ARP · Discussion</p><h2>Discussion bank unavailable</h2>'+
      '<p class="evia-tools-copy">'+esc(error?.message||error)+'</p>'+
      '<button type="button" class="evia-arp-secondary" data-discussion-back>Back to ARP</button>';
    target.querySelector("[data-discussion-back]")?.addEventListener("click",returnToArp)
  }
}

async function startDiscussion(mode){
  releaseVoice();
  const target=body();
  if(!target)return;
  target.innerHTML='<div class="evia-arp-loading">Preparing five course-specific scenarios…</div>';
  try{
    const bank=await currentBank();
    const questions=shuffled(discussionItems(bank)).slice(0,PRACTICE_SIZE).map(question=>({
      ...question,
      responses:shuffled(question.responses)
    }));
    session={kind:"discussion",mode,bank,questions,index:0,results:[],saved:false};
    if(mode==="mock")renderMockQuestion();else renderChoiceQuestion()
  }catch(error){
    target.innerHTML='<h2>Discussion bank unavailable</h2><p class="evia-tools-copy">'+esc(error?.message||error)+'</p><button type="button" class="evia-arp-secondary" data-discussion-home>Back</button>';
    target.querySelector("[data-discussion-home]")?.addEventListener("click",renderDiscussionHome)
  }
}

function renderChoiceQuestion(){
  const target=body();
  if(!target||!session)return;
  const question=session.questions[session.index],number=session.index+1,progress=Math.round((session.index/PRACTICE_SIZE)*100);
  target.innerHTML=
    '<div class="evia-arp-meta"><span>'+esc(session.mode==="learn"?"Guided learning":"Practice set")+' · '+number+' of '+PRACTICE_SIZE+'</span><span>'+esc(session.bank.courseTitle)+'</span></div>'+
    '<div class="evia-arp-track" aria-hidden="true"><span style="width:'+progress+'%"></span></div>'+
    '<p class="evia-arp-topic">'+esc(question.topic||"Trade discussion")+'</p>'+
    '<h2 class="evia-arp-question">'+esc(question.prompt)+'</h2>'+
    '<p class="evia-tools-copy">'+(session.mode==="learn"?"Every response is factually correct. Choose the one with the strongest discussion depth.":"Choose the response you would be most confident developing in front of an assessor.")+'</p>'+
    '<div class="evia-arp-options">'+question.responses.map(response=>
      '<button type="button" class="evia-arp-answer" data-discussion-strength="'+response.strength+'">'+esc(response.text)+'</button>'
    ).join("")+'</div>'+
    '<div data-discussion-feedback></div>';
  target.querySelectorAll("[data-discussion-strength]").forEach(button=>button.addEventListener("click",()=>selectDiscussionResponse(Number(button.dataset.discussionStrength))))
}

function selectDiscussionResponse(strength){
  if(!session)return;
  const question=session.questions[session.index];
  if(session.results.some(result=>result.id===question.id))return;
  session.results.push({id:question.id,topic:question.topic,strength,question});
  if(session.mode==="practice"){
    session.index+=1;
    if(session.index>=PRACTICE_SIZE)renderDiscussionResult();else renderChoiceQuestion();
    return
  }
  const target=body(),selected=question.responses.find(response=>response.strength===strength);
  target?.querySelectorAll("[data-discussion-strength]").forEach(button=>{
    const value=Number(button.dataset.discussionStrength);
    button.disabled=true;
    if(value===4)button.classList.add("is-strongest");
    if(value===strength)button.classList.add("is-selected");
    const note=document.createElement("small");
    note.textContent=STRENGTH_LABELS[value];
    button.appendChild(note)
  });
  const feedback=target?.querySelector("[data-discussion-feedback]");
  if(!feedback)return;
  feedback.innerHTML=
    '<div class="evia-arp-feedback"><b>'+esc(selected.label)+' · '+strength+'/4</b>'+esc(selected.feedback)+
    '<small>Maps to '+esc((question.mapsTo||[]).join(" · "))+'</small></div>'+
    '<button type="button" class="evia-tools-primary" data-discussion-next>'+(session.index+1===PRACTICE_SIZE?"See result":"Next scenario")+'</button>';
  feedback.querySelector("[data-discussion-next]")?.addEventListener("click",()=>{
    session.index+=1;
    if(session.index>=PRACTICE_SIZE)renderDiscussionResult();else renderChoiceQuestion()
  })
}

function weakestResult(results){
  return results.reduce((weakest,current)=>!weakest||current.strength<weakest.strength?current:weakest,null)
}

function resultRows(results){
  return '<div class="evia-arp-result-list">'+results.map((result,index)=>
    '<div class="evia-arp-result-row"><b>'+(index+1)+'</b><span>'+esc(result.topic||"Trade discussion")+'</span><strong>'+result.strength+'/4</strong></div>'
  ).join("")+'</div>'
}

function renderDiscussionResult(){
  const target=body();
  if(!target||!session)return;
  const score=session.results.reduce((total,result)=>total+Number(result.strength||0),0),total=PRACTICE_SIZE*4;
  if(!session.saved){
    session.record=saveAttempt(session.bank.enrolmentId,session.mode,score,total);
    session.saved=true
  }
  const level=readiness(score,total),weakest=weakestResult(session.results);
  target.innerHTML=
    '<p class="evia-tools-kicker">'+esc(session.mode==="mock"?"Mock complete":"Discussion complete")+'</p>'+
    '<h2>'+esc(level.label)+' discussion response</h2>'+
    '<div class="evia-arp-score"><div><strong>'+score+'/'+total+'</strong><span>discussion strength</span></div></div>'+
    '<p class="evia-tools-copy">'+esc(level.copy)+'</p>'+
    resultRows(session.results)+
    (session.mode==="practice"&&weakest?
      '<div class="evia-arp-summary"><b>Voice rehearsal selected</b><span>'+esc(weakest.topic)+' was your least detailed response. Practise that one aloud next.</span></div>'+
      '<button type="button" class="evia-tools-primary" data-discussion-voice>Practise weakest answer aloud</button>':"")+
    '<div class="evia-arp-actions">'+
      '<button type="button" class="evia-arp-secondary" data-discussion-retry>Try another '+esc(session.mode==="mock"?"mock":session.mode==="learn"?"guided set":"practice set")+'</button>'+
      '<button type="button" class="evia-arp-secondary" data-discussion-home>Discussion home</button>'+
    '</div>'+
    '<p class="evia-arp-disclaimer">This readiness score is for practice only and is not an official EPA or qualification grade.</p>';
  target.querySelector("[data-discussion-voice]")?.addEventListener("click",()=>renderPracticeVoice(weakest));
  target.querySelector("[data-discussion-retry]")?.addEventListener("click",()=>startDiscussion(session.mode));
  target.querySelector("[data-discussion-home]")?.addEventListener("click",renderDiscussionHome)
}

function speakQuestion(text){
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  try{
    window.speechSynthesis.cancel();
    const utterance=new window.SpeechSynthesisUtterance(String(text));
    utterance.lang="en-GB";
    utterance.rate=.94;
    window.speechSynthesis.speak(utterance)
  }catch{}
}

function promptMarkup(){
  return '<div class="evia-arp-prompt-grid" aria-label="Answer structure">'+PROMPTS.map(prompt=>'<span>'+prompt+'</span>').join("")+'</div>'
}

function recorderMarkup(){
  return '<div class="evia-arp-voice-card">'+
    '<b>Speak for about 60–90 seconds</b>'+
    '<p>Use What, How, Why, Check and Example. Evia does not upload the audio or add it to your portfolio. Any transcript shown is supplied by your browser.</p>'+
    '<div class="evia-arp-voice-controls">'+
      '<button type="button" data-voice-start>Start voice answer</button>'+
      '<button type="button" class="secondary" data-voice-stop disabled>Stop and review</button>'+
      '<button type="button" class="secondary" data-voice-play>Play question</button>'+
      '<button type="button" class="secondary" data-voice-skip>Answered aloud without recording</button>'+
    '</div>'+
    '<div class="evia-arp-voice-status" data-voice-status aria-live="polite">Your recording stays in this practice screen and is discarded when you leave it.</div>'+
  '</div>'
}

function stopTracks(stream){
  try{stream?.getTracks?.().forEach(track=>track.stop())}catch{}
}

function stopRecognition(state){
  if(!state?.recognition)return;
  try{state.recognition.stop()}catch{}
}

function releaseVoice(){
  const state=voice;
  if(!state)return;
  state.cancelled=true;
  if(state.timer)clearInterval(state.timer);
  try{
    if(state.recorder&&state.recorder.state!=="inactive")state.recorder.stop()
  }catch{}
  stopTracks(state.stream);
  try{state.recognition?.abort?.()}catch{}
  if(state.url)try{URL.revokeObjectURL(state.url)}catch{}
  voice=null
}

function startRecognition(state){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition)return;
  try{
    const recognition=new Recognition();
    recognition.lang="en-GB";
    recognition.continuous=true;
    recognition.interimResults=false;
    recognition.onresult=event=>{
      let addition="";
      for(let index=event.resultIndex;index<event.results.length;index++){
        if(event.results[index].isFinal)addition+=" "+event.results[index][0].transcript
      }
      state.transcript=(state.transcript+addition).trim()
    };
    recognition.onerror=()=>{};
    recognition.start();
    state.recognition=recognition
  }catch{}
}

async function startVoiceRecording(onReady){
  const target=body(),status=target?.querySelector("[data-voice-status]"),startButton=target?.querySelector("[data-voice-start]"),stopButton=target?.querySelector("[data-voice-stop]");
  const nav=window.navigator;
  const Recorder=window.MediaRecorder;
  if(!nav?.mediaDevices?.getUserMedia||!Recorder){
    if(status)status.textContent="Voice recording is unavailable here. Say the answer aloud, then use the comparison option.";
    return
  }
  releaseVoice();
  try{
    const stream=await nav.mediaDevices.getUserMedia({audio:true});
    const types=["audio/webm;codecs=opus","audio/mp4","audio/webm"];
    const mimeType=typeof Recorder.isTypeSupported==="function"?(types.find(type=>Recorder.isTypeSupported(type))||""):"";
    const recorder=mimeType?new Recorder(stream,{mimeType}):new Recorder(stream);
    const state={recorder,stream,chunks:[],startedAt:Date.now(),transcript:"",cancelled:false,url:null,recognition:null,timer:null};
    voice=state;
    recorder.addEventListener("dataavailable",event=>{if(event.data?.size)state.chunks.push(event.data)});
    recorder.addEventListener("stop",()=>{
      if(state.timer)clearInterval(state.timer);
      stopTracks(state.stream);
      stopRecognition(state);
      if(state.cancelled)return;
      const duration=Math.max(1,Math.round((Date.now()-state.startedAt)/1000));
      const blob=new Blob(state.chunks,{type:recorder.mimeType||"audio/webm"});
      state.url=URL.createObjectURL(blob);
      if(status){status.classList.remove("is-recording");status.textContent="Recording ready to review."}
      setTimeout(()=>{if(!state.cancelled)onReady({url:state.url,duration,transcript:state.transcript.trim()})},220)
    });
    recorder.start(250);
    startRecognition(state);
    if(startButton)startButton.disabled=true;
    if(stopButton)stopButton.disabled=false;
    if(status){status.classList.add("is-recording");status.textContent="Recording · 0:00"}
    state.timer=setInterval(()=>{
      const seconds=Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));
      if(status)status.textContent="Recording · "+Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0")
    },500)
  }catch{
    if(status)status.textContent="Microphone access was not available. Say the answer aloud, then use the comparison option."
  }
}

function stopVoiceRecording(){
  const state=voice;
  if(!state?.recorder||state.recorder.state==="inactive")return;
  const target=body(),stopButton=target?.querySelector("[data-voice-stop]"),status=target?.querySelector("[data-voice-status]");
  if(stopButton)stopButton.disabled=true;
  if(status)status.textContent="Preparing your recording…";
  try{state.recorder.stop()}catch{}
}

function bindRecorder(question,onReady){
  const target=body();
  target?.querySelector("[data-voice-start]")?.addEventListener("click",()=>startVoiceRecording(onReady));
  target?.querySelector("[data-voice-stop]")?.addEventListener("click",stopVoiceRecording);
  target?.querySelector("[data-voice-play]")?.addEventListener("click",()=>speakQuestion(question.prompt));
  target?.querySelector("[data-voice-skip]")?.addEventListener("click",()=>{releaseVoice();onReady(null)})
}

function words(value){
  return [...new Set(String(value||"").toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter(word=>word.length>3&&!STOP_WORDS.has(word)))]
}

function hasModelWords(transcript,model){
  const spoken=new Set(words(transcript)),wanted=words(model);
  if(!wanted.length)return false;
  const matches=wanted.filter(word=>spoken.has(word)).length;
  return matches>=Math.max(1,Math.ceil(wanted.length*.24))
}

function coverageFlags(question,transcript){
  const text=String(transcript||"").toLowerCase();
  return {
    what:hasModelWords(text,question.coreAnswer),
    how:/\b(use|used|using|follow|followed|apply|applied|fit|fitted|install|installed|set|prepare|prepared|remove|removed|protect|protected|stop|report|reported)\b/.test(text),
    why:hasModelWords(text,question.reason)||/\b(because|therefore|means|prevent|prevents|reduce|reduces|avoid|ensures?|important)\b/.test(text),
    check:/\b(check|checked|confirm|confirmed|inspect|inspected|measure|measured|test|tested|verify|verified|level|plumb|square|datum|record|reported)\b/.test(text),
    example:/\b(example|evidence|portfolio|site|workplace|job|when i|i have|result|recorded|reported)\b/.test(text)
  }
}

function coverageMarkup(question,transcript){
  if(!transcript)return '<p class="evia-tools-copy">Listen back and compare your answer with the five-point guide below.</p>';
  const flags=coverageFlags(question,transcript);
  return '<div class="evia-arp-coverage">'+Object.entries(flags).map(([key,heard])=>
    '<span class="'+(heard?"heard":"")+'"><i>'+(heard?"✓":"·")+'</i>'+esc(key[0].toUpperCase()+key.slice(1))+'</span>'
  ).join("")+'</div>'
}

function audioMarkup(recording){
  if(!recording?.url)return "";
  return '<audio class="evia-arp-audio" controls preload="metadata" src="'+esc(recording.url)+'"></audio>'+
    '<p class="evia-arp-disclaimer">Recorded answer: '+recording.duration+' seconds'+(recording.duration<45?" · Try adding more explanation and a workplace example.":recording.duration>110?" · Aim to keep the next answer more focused.":" · Good rehearsal length.")+'</p>'
}

function transcriptMarkup(recording){
  if(!recording?.transcript)return "";
  return '<div class="evia-arp-transcript"><b>Device transcript</b><br>'+esc(recording.transcript)+'</div>'
}

function renderPracticeVoice(result){
  releaseVoice();
  const target=body();
  if(!target||!result)return;
  const question=result.question;
  target.innerHTML=
    '<p class="evia-tools-kicker">Voice rehearsal</p>'+
    '<h2>'+esc(result.topic)+'</h2>'+
    '<p class="evia-tools-copy">'+esc(question.prompt)+'</p>'+
    promptMarkup()+recorderMarkup()+
    '<button type="button" class="evia-arp-secondary" data-voice-back>Back to result</button>';
  bindRecorder(question,recording=>renderPracticeVoiceReview(result,recording));
  target.querySelector("[data-voice-back]")?.addEventListener("click",()=>{releaseVoice();renderDiscussionResult()})
}

function renderPracticeVoiceReview(result,recording){
  const target=body();
  if(!target)return;
  const question=result.question,strong=question.responses.find(response=>response.strength===4);
  target.innerHTML=
    '<p class="evia-tools-kicker">Voice review</p><h2>Compare your answer</h2>'+
    audioMarkup(recording)+transcriptMarkup(recording)+coverageMarkup(question,recording?.transcript)+
    '<div class="evia-arp-feedback"><b>Your earlier response · '+result.strength+'/4</b>'+esc(STRENGTH_FEEDBACK[result.strength])+'</div>'+
    '<div class="evia-arp-guide"><b>Thorough answer guide</b>'+esc(strong.text)+'</div>'+
    '<div class="evia-arp-followup"><b>Evia follow-up</b>'+esc(question.followUp)+'</div>'+
    '<p class="evia-tools-copy">Answer the follow-up aloud before finishing. Keep it focused on something you actually did or checked.</p>'+
    '<div class="evia-arp-actions">'+
      '<button type="button" class="evia-tools-primary" data-voice-retry>Record it again</button>'+
      '<button type="button" class="evia-arp-secondary" data-voice-finish>Finish discussion practice</button>'+
    '</div>';
  target.querySelector("[data-voice-retry]")?.addEventListener("click",()=>{releaseVoice();renderPracticeVoice(result)});
  target.querySelector("[data-voice-finish]")?.addEventListener("click",()=>{releaseVoice();renderDiscussionHome()})
}

function renderMockQuestion(){
  releaseVoice();
  const target=body();
  if(!target||!session)return;
  if(session.index>=PRACTICE_SIZE){renderDiscussionResult();return}
  const question=session.questions[session.index],number=session.index+1,progress=Math.round((session.index/PRACTICE_SIZE)*100);
  target.innerHTML=
    '<div class="evia-arp-meta"><span>Mock question '+number+' of '+PRACTICE_SIZE+'</span><span>'+esc(session.bank.courseTitle)+'</span></div>'+
    '<div class="evia-arp-track" aria-hidden="true"><span style="width:'+progress+'%"></span></div>'+
    '<p class="evia-arp-topic">'+esc(question.topic)+'</p>'+
    '<h2 class="evia-arp-question">'+esc(question.prompt)+'</h2>'+
    '<p class="evia-tools-copy">No answer choices are shown in Mock Discussion. Speak naturally and support the answer with your own work.</p>'+
    promptMarkup()+recorderMarkup()+
    '<button type="button" class="evia-arp-secondary" data-mock-exit>Exit mock</button>';
  bindRecorder(question,recording=>renderMockReview(question,recording));
  target.querySelector("[data-mock-exit]")?.addEventListener("click",renderDiscussionHome)
}

function checklistMarkup(flags){
  const labels={
    what:"I gave the correct action or main point.",
    how:"I explained how I would apply it.",
    why:"I explained why it matters.",
    check:"I described a check or confirmation.",
    example:"I linked it to work or portfolio evidence."
  };
  return '<div class="evia-arp-checklist">'+Object.entries(labels).map(([key,label])=>
    '<label class="evia-arp-check"><input type="checkbox" data-mock-check="'+key+'" '+(flags?.[key]?"checked":"")+'><span>'+esc(label)+'</span></label>'
  ).join("")+'</div>'
}

function renderMockReview(question,recording){
  const target=body();
  if(!target||!session)return;
  const strong=question.responses.find(response=>response.strength===4),flags=recording?.transcript?coverageFlags(question,recording.transcript):null;
  target.innerHTML=
    '<p class="evia-tools-kicker">Mock self-check</p><h2>'+esc(question.topic)+'</h2>'+
    audioMarkup(recording)+transcriptMarkup(recording)+
    '<div class="evia-arp-guide"><b>Thorough answer guide</b>'+esc(strong.text)+'</div>'+
    '<div class="evia-arp-followup"><b>Evia follow-up</b>'+esc(question.followUp)+'</div>'+
    '<p class="evia-tools-copy">'+(flags?"Evia has suggested the points heard in the device transcript. Adjust the checks after listening back.":"Listen back or reflect on what you said, then check the points you genuinely covered.")+'</p>'+
    checklistMarkup(flags)+
    '<button type="button" class="evia-tools-primary" data-mock-score>Score and continue</button>';
  target.querySelector("[data-mock-score]")?.addEventListener("click",()=>{
    const covered=target.querySelectorAll("[data-mock-check]:checked").length;
    const strength=covered<=1?1:covered===2?2:covered<=4?3:4;
    session.results.push({id:question.id,topic:question.topic,strength,question});
    session.index+=1;
    releaseVoice();
    if(session.index>=PRACTICE_SIZE)renderDiscussionResult();else renderMockQuestion()
  })
}

function onDiscussionClick(event){
  if(event.target?.closest?.('.evia-arp-layer [data-arp-back]'))releaseVoice();
  const button=event.target?.closest?.('.evia-arp-layer [data-arp-option="discussion"]');
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  renderDiscussionHome()
}

function ready(){
  patchDiscussionRow();
  document.addEventListener("click",onDiscussionClick,true);
  if(window.MutationObserver&&document.body){
    const observer=new window.MutationObserver(queuePatch);
    observer.observe(document.body,{childList:true,subtree:true})
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("pageshow",queuePatch);
window.addEventListener("pagehide",releaseVoice);
window.EviaArpDiscussion={
  open:renderDiscussionHome,
  start:startDiscussion,
  discussionItems,
  responsesFor,
  coverageFlags
};
})();
