(()=>{
"use strict";
const SOURCE="./assets/evia-trowel-data.js?v=31";
function buildFrom(D,option){
  const m=window.EviaTrowelMeta;if(!m)throw new Error("Trowel qualification map is unavailable");
  const route=m.routeUnits?.[option]?option:"thin",allowed=new Set(m.routeUnits?.[route]||[]);
  function cat(x){
    return{id:x[0],title:x[1],jobs:x[2].map(j=>({
      id:j[0],title:j[1],_units:(j[2]||[]).filter(u=>allowed.has(u)),
      opps:(j[3]||[]).map(o=>({id:o[0],title:o[1],instruction:o[2],question:o[3],themes:o[4]||[],codes:[],bundle:x[1],...(o[5]==="talk"?{media:"talk"}:{})}))
    }))}
  }
  const optional=D.optional?.[route];if(!optional)throw new Error(`Missing Trowel optional route: ${route}`);
  const data=[...(D.common||[]),optional].map(cat),opps=[];
  data.forEach(c=>c.jobs.forEach(j=>j.opps.forEach(o=>opps.push({o,units:j._units}))));
  const expected=(m.routeUnits?.[route]||[]).flatMap(u=>m.unitCodes?.[String(u)]||[]);
  for(const code of expected){
    const theme=m.codeTheme?.[code],unit=Number(m.codeUnit?.[code]),candidates=opps.filter(x=>x.o.themes.includes(theme));
    const target=candidates.find(x=>x.units.includes(unit))||candidates[0];
    if(!target)throw new Error(`No Trowel evidence route for ${code} (${theme})`);
    target.o.codes.push(code)
  }
  data.forEach(c=>c.jobs.forEach(j=>delete j._units));
  const mapped=data.flatMap(c=>c.jobs.flatMap(j=>j.opps.flatMap(o=>o.codes))),unique=new Set(mapped);
  if(mapped.length!==expected.length||unique.size!==expected.length||expected.some(code=>!unique.has(code)))throw new Error(`Trowel AC mapping audit failed: ${unique.size}/${expected.length}`);
  return data
}
function parseSource(source){
  const start=source.indexOf("const D=");let end=source.indexOf("\nfunction build",start);if(end<0)end=source.indexOf("function build",start);
  if(start<0||end<0)throw new Error("Trowel source data could not be read");
  let raw=source.slice(start+8,end).trim();if(raw.endsWith(";"))raw=raw.slice(0,-1);
  return JSON.parse(raw)
}
function install(D){
  const api={build:option=>buildFrom(D,option)};
  for(const option of ["thin","repair","specialist","drainage"])api.build(option);
  window.EviaTrowelData=api;return api
}
function syncLoad(){
  const xhr=new XMLHttpRequest();xhr.open("GET",SOURCE,false);xhr.send(null);
  if(!((xhr.status>=200&&xhr.status<300)||xhr.status===0)||!xhr.responseText)throw new Error(`Trowel source ${xhr.status}`);
  return install(parseSource(xhr.responseText))
}
try{
  const api=syncLoad();window.EviaTrowelDataReady=Promise.resolve(api)
}catch(syncError){
  console.warn("Evia Trowel synchronous loader fallback",syncError);
  window.EviaTrowelDataReady=fetch(SOURCE,{cache:"no-store"}).then(response=>{if(!response.ok)throw new Error(`Trowel source ${response.status}`);return response.text()}).then(source=>install(parseSource(source))).catch(error=>{console.error("Evia Trowel loader",error);throw error})
}
})();