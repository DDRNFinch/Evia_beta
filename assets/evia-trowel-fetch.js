(()=>{
"use strict";
const nativeFetch=window.fetch.bind(window);
function current(){return window.EviaCourseContext?.current?.()}
async function dataApi(){
  if(window.EviaTrowelDataReady)await window.EviaTrowelDataReady;
  return window.EviaTrowelData||null
}
window.fetch=async function(input,init){
  const raw=typeof input==="string"?input:input?.url||"";
  const m=String(raw).match(/(?:^|\/)app\/evia-trowel-(thin|repair|specialist|drainage)-data-(1|2|3)\.ts(?:\?|$)/);
  if(m){
    try{
      const course=current(),option=course?.courseType==="nvq"?(course.pathway||m[1]):m[1],part=Number(m[2]),api=await dataApi();
      const data=part===1?(api?.build?.(option)||[]):[];
      if(part===1&&!data.length)throw new Error("Trowel course data is empty");
      const text=`import type{SiteCategory}from"./evia-data-types";export const SITE_DATA_${part}:SiteCategory[]=${JSON.stringify(data)};`;
      return new Response(text,{status:200,headers:{"Content-Type":"text/plain;charset=utf-8","Cache-Control":"no-store"}})
    }catch(e){
      console.error("Evia Trowel data",e);
      return new Response("Trowel course data failed to load",{status:500,headers:{"Content-Type":"text/plain;charset=utf-8","Cache-Control":"no-store"}})
    }
  }
  return nativeFetch(input,init)
};
})();