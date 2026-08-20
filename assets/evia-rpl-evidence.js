(()=>{
"use strict";
const RPL_KEY="evia-rpl-ksbs-v1";
const MAP={
  safe_area:["K1","K3","S1","S7","B1"],ppe:["K2","S2","B1"],safe_system:["K3","S1"],ppe_controls:["K2","S2","B1"],dust_control:["K1","K2","S1"],work_area:["K1","K3","S7"],
  mortar_materials:["K20","S14"],mortar_mix:["K20","S14"],mortar_consistency:["K20","S14"],
  select_materials:["K8","S6"],estimate_qty:["K12","S6"],building_parts:["K6","K8"],
  segregate:["K4","S3","B2"],prevent_contam:["K4","S3","B2"],efficient_use:["K4","B2"],
  use_hand_tool:["K13","S8"],look_after_tool:["K13","S9"],use_power_tool:["K14","S8"],power_controls:["K1","K14","S1"],
  read_drawing:["K10","S5"],digital_info:["K11","S5"],standards_info:["K7","S4"],
  setout_line:["K21","S10"],setout_opening:["K21","S10"],profiles_gauge:["K21","S10"],setout_drawing:["K10","S5"],
  solid_setout:["K16","S13"],building_principles:["K6"],standards:["K7","S4"],mmc:["K9"],
  cavity_stretcher:["K22","S11"],cavity_return:["K22","S11","B3"],close_cavity:["K22","S11"],cavity_quality:["K6","K22","S11","B3"],
  solid_build:["K16","S13"],bond:["K15","S13"],rake:["K30","S22"],cut_brick:["K29","S15"],gable_tools:["K13","S8","S9"],gable_safe:["K1","K2","K3","S1","S2","S7","B1"],gable_protect:["K25","S17","B3"],decorative_detail:["K18"],pier:["K18"],
  lintel:["K22","S11"],soldiers:["K23","S11"],brick_edge_sill:["K23","S11"],opening_close:["K22","S11"],wall_ties:["K22","S11"],insulation:["K5","K22","S11"],thermal_detail:["K5"],dpc:["K6","K22","S11"],cavity_tray:["K6","K22","S11"],weep_holes:["K22","S11"],fire_stop:["K6","K22","S11"],movement:["K19"],special_course:["K23"],
  joint_finish:["K17","S12"],joint_compare:["K17","S12"],spot_defect:["K24","B3"],make_repair:["K24","S16","B3"],protect_repair:["K25","S17"],cover_work:["K25","S17","B3"],protect_materials:["K25","S17"],
  site_communication:["K26","S18"],ask_check:["K26","S18"],team_task:["K27","S20","B6"],wider_team:["K27","S20","B6"],inclusive_work:["K28","S19","B4"],wellbeing_support:["K31","S21"],wellbeing_first:["B1"],learn_new:["B5"],take_ownership:["B3"]
};
function rpl(){
  try{const v=JSON.parse(localStorage.getItem(RPL_KEY)||"[]");return new Set(Array.isArray(v)?v:[])}catch{return new Set()}
}
function patch(){
  const set=rpl();
  document.querySelectorAll("button[data-opp]").forEach(btn=>{
    const codes=MAP[btn.dataset.opp]||[];
    const matched=codes.filter(c=>set.has(c));
    let mark=btn.querySelector(".evia-rpl-evidence-marks");
    if(!matched.length){mark?.remove();btn.classList.remove("evia-rpl-evidence-complete");return}
    if(!mark){
      mark=document.createElement("span");
      mark.className="evia-rpl-evidence-marks";
      const side=btn.querySelector(".self-side");
      const arrow=side?.querySelector("i");
      if(side&&arrow)side.insertBefore(mark,arrow);else if(side)side.appendChild(mark);else btn.appendChild(mark);
    }
    const text="o".repeat(matched.length);
    if(mark.textContent!==text)mark.textContent=text;
    mark.setAttribute("aria-label",`${matched.length} KSB${matched.length===1?"":"s"} recognised as prior learning`);
    mark.title=`RPL: ${matched.join(" · ")}`;
    btn.classList.toggle("evia-rpl-evidence-complete",codes.length>0&&matched.length===codes.length);
  });
}
const observer=new MutationObserver(patch);
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener("load",patch);
window.addEventListener("pageshow",patch);
window.addEventListener("storage",e=>{if(e.key===RPL_KEY)patch()});
document.addEventListener("click",()=>setTimeout(patch,0),true);
setTimeout(patch,250);
})();