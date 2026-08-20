(()=>{
"use strict";
const original=Document.prototype.createElement;
if(original.__eviaPreserveMedia)return;
function createElement(name,options){
  const el=original.call(this,name,options);
  const tag=String(name||"").toLowerCase();
  if(tag==="video"||tag==="audio"){
    try{Object.defineProperty(el,"captureStream",{value:undefined,writable:true,configurable:true})}catch{}
    try{Object.defineProperty(el,"mozCaptureStream",{value:undefined,writable:true,configurable:true})}catch{}
  }
  return el;
}
Object.defineProperty(createElement,"__eviaPreserveMedia",{value:true});
Document.prototype.createElement=createElement;
})();