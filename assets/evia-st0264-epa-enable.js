(()=>{
"use strict";
const api=window.EviaCourseContext;
if(!api||typeof api.current!=="function")return;
const current=api.current.bind(api);
api.current=function(){
  const c=current();
  if(!c)return c;
  const st0264=String(c.courseId||"").toLowerCase()==="st0264-v1-4"||String(c.packFamilyId||"").toUpperCase()==="ST0264";
  if(!st0264||String(c.courseType||"apprenticeship")==="nvq")return c;
  return c.epaConfigured===true?c:{...c,epaConfigured:true}
};
})();
