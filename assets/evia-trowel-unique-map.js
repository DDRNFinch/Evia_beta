(()=>{
"use strict";
const units={
 read_drawings_plan_the_work:[303,300,701,235],select_materials_resources:[300,235,234],prepare_tools_ppe_work_area:[102,235,234,701],plan_sequence_programme:[303,300,502],work_with_the_site_team:[102,234,235,303,300,313,502,701],
 establish_datum_levels:[701],set_out_straight_lines_right_angles:[701],set_out_an_opening_or_feature:[701,235],set_out_curves_angles:[701],
 build_cavity_walling:[235,102],build_solid_or_block_walling:[235,102],form_an_opening_lintel_detail:[235,234],install_dpc_insulation_ties_vents:[235,234],form_cills_copings_cappings:[235],finish_joints_protect_the_work:[235,234,313],
 start_masonry_cladding:[234],install_cladding_support_cavity_details:[234,828],form_a_cladding_opening:[234],finish_protect_cladding:[234],
 build_a_pier:[313],build_an_arch:[313,701],build_decorative_walling:[313],build_curved_masonry:[313,701],
 set_out_thin_joint_masonry:[238,701],build_thin_joint_walling:[238],form_thin_joint_openings_details:[238],
 identify_masonry_defects:[690],prepare_a_masonry_repair:[690],repair_or_replace_masonry:[690],
 install_a_support_angle_or_soffit_system:[828],install_a_fire_barrier_wind_post_or_starter:[828],
 set_out_drainage:[837],install_drainage_components:[837],test_the_drainage:[837]
};
const base=window.EviaTrowelData?.build;if(typeof base!=="function")return;
window.EviaTrowelData.build=function(option){
  const m=window.EviaTrowelMeta,data=base(option);if(!m)return data;
  const route=m.routeUnits?.[option]?option:"thin",expected=(m.routeUnits?.[route]||[]).flatMap(u=>m.unitCodes?.[String(u)]||[]),opps=[];
  data.forEach(c=>c.jobs.forEach(j=>j.opps.forEach(o=>{o.codes=[];opps.push({o,jobId:j.id,units:units[j.id]||[]})})));
  for(const code of expected){
    const theme=m.codeTheme?.[code],unit=Number(m.codeUnit?.[code]);
    const candidates=opps.filter(x=>x.o.themes?.includes(theme));
    const target=candidates.find(x=>x.units.includes(unit))||candidates[0];
    if(!target)throw new Error(`No Trowel evidence route for ${code} (${theme})`);
    target.o.codes.push(code)
  }
  const mapped=data.flatMap(c=>c.jobs.flatMap(j=>j.opps.flatMap(o=>o.codes))),unique=new Set(mapped);
  if(mapped.length!==expected.length||unique.size!==expected.length||expected.some(code=>!unique.has(code)))throw new Error(`Trowel AC mapping audit failed: ${unique.size}/${expected.length}`);
  return data
};
})();