(() => {
  'use strict';

  const STYLE_ID = 'evia-nvq-reduction-preview-style';
  const PREVIEW_CLASS = 'nvq-reduction-preview';
  let scheduled = false;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const markers = [
    ...'abcdefghijklmnopqrstuvwxyz'.split(''),
    'aa','bb','cc','dd','ee','ff','gg','hh','ii','jj','kk','ll','mm','nn','oo','pp','qq','rr','ss','tt','uu','vv','ww','xx','yy','zz'
  ];
  const markerIndex = new Map(markers.map((marker, index) => [marker, index]));
  const markerPattern = new RegExp(`\\b(${markers.slice().sort((a,b) => b.length - a.length).join('|')})\\s+(?=[A-Za-z])`, 'g');

  function splitList(text) {
    const source = String(text || '');
    const matches = [...source.matchAll(markerPattern)].map((match) => ({ marker: match[1], index: match.index, end: match.index + match[0].length }));
    let best = [];
    for (let start = 0; start < matches.length; start += 1) {
      if (matches[start].marker !== 'a') continue;
      const sequence = [];
      let expected = 0;
      for (let cursor = start; cursor < matches.length; cursor += 1) {
        const index = markerIndex.get(matches[cursor].marker);
        if (index === expected) {
          sequence.push(matches[cursor]);
          expected += 1;
        } else if (sequence.length) break;
      }
      if (sequence.length > best.length) best = sequence;
    }
    if (best.length < 2) return null;
    const parent = clean(source.slice(0, best[0].index).replace(/[:;,-]+$/, ''));
    const items = best.map((match, index) => ({
      marker: match.marker,
      text: clean(source.slice(match.end, index + 1 < best.length ? best[index + 1].index : source.length)),
    })).filter((item) => item.text);
    return items.length >= 2 ? { parent, items } : null;
  }

  const unitDefinitions = [
    { name: 'Safety & Site Practice', order: 1 },
    { name: 'Information, Planning & Resources', order: 2 },
    { name: 'Setting Out & Accuracy', order: 3 },
    { name: 'Masonry Construction', order: 4 },
    { name: 'Components & Protection', order: 5 },
    { name: 'Architectural & Decorative Masonry', order: 6 },
    { name: 'Repair & Maintenance', order: 7 },
    { name: 'Quality, Completion & Communication', order: 8 },
  ];

  const concepts = [
    ['Safety & Site Practice', 'PPE, RPE & safety controls', /\b(ppe|rpe|local exhaust ventilation|protective measures|safety control equipment|health and safety control equipment)\b/i],
    ['Safety & Site Practice', 'Access & working at height', /\b(access equipment|work at height|working at height|below ground|confined spaces)\b/i],
    ['Safety & Site Practice', 'Plant & machinery', /\bplant and machinery\b/i],
    ['Safety & Site Practice', 'Emergencies & accident response', /\b(emergenc|accident reporting|fires?|spillages?|injur)\b/i],
    ['Safety & Site Practice', 'Protect work, housekeeping & waste', /\b(protect the work|surrounding area|clear and tidy|clean work space|dispose of waste|waste)\b/i],
    ['Safety & Site Practice', 'Legislation, guidance & site rules', /\b(current legislation|statutory regulations?|official guidance|site rules?|security procedures?)\b/i],

    ['Information, Planning & Resources', 'Drawings & specifications', /\b(drawings?|specifications?)\b/i],
    ['Information, Planning & Resources', 'Method statements & risk assessments', /\b(method statements?|risk assessments?)\b/i],
    ['Information, Planning & Resources', 'Schedules, instructions & information', /\b(schedules?|instructions?|electronic data|sketches|information sources?|manufacturers? information)\b/i],
    ['Information, Planning & Resources', 'Select materials, components & fixings', /\b(materials?|components?|fixings?)\b/i],
    ['Information, Planning & Resources', 'Use tools & equipment', /\b(hand and power tools|power tools|tools? and equipment|setting out equipment|equipment)\b/i],
    ['Information, Planning & Resources', 'Resource quality, suitability & defects', /\b(characteristics?|limitations?|defects?|conform to the specification|quality of resources)\b/i],
    ['Information, Planning & Resources', 'Quantities, dimensions & wastage', /\b(calculate|quantity|quantities|wastage|dimensions?|length|area)\b/i],
    ['Information, Planning & Resources', 'Work methods & sequence', /\b(methods? of work|work method|sequence of work|work activities|plan for their own sequence)\b/i],

    ['Setting Out & Accuracy', 'Measure & mark out', /\b(measur|mark(?:ing)? out)\b/i],
    ['Setting Out & Accuracy', 'Level, plumb & align', /\b(levell?|levelled|plumb|align)\b/i],
    ['Setting Out & Accuracy', 'Position, fix & secure', /\b(position|fix(?:ing)?|secur(?:e|ing))\b/i],
    ['Setting Out & Accuracy', 'Datums, lines, angles & profiles', /\b(datum|straight lines?|angles?|curves?|trammels?|templates?|profiles?|transfer lines?|transpos|ranging lines?)\b/i],

    ['Masonry Construction', 'Lay masonry', /\b(lay|laying)\b/i],
    ['Masonry Construction', 'Cavity construction', /\b(cavity wall|cavities|integrity of cavities)\b/i],
    ['Masonry Construction', 'Wall ties', /\bwall ties?\b/i],
    ['Masonry Construction', 'Lintels', /\blintels?\b/i],
    ['Masonry Construction', 'Movement joints', /\bmovement joints?\b/i],
    ['Masonry Construction', 'Wind posts', /\bwind posts?\b/i],
    ['Masonry Construction', 'Openings', /\bopenings?\b/i],
    ['Masonry Construction', 'Masonry support & temporary works', /\b(masonry support angles?|prop and support|support structures?|temporary works?|temporary structures?)\b/i],
    ['Masonry Construction', 'Joint finishes & pointing', /\b(joint finishes?|pointing systems?|pointing)\b/i],
    ['Masonry Construction', 'Mix & use mortar', /\bmortars?\b/i],
    ['Masonry Construction', 'Brick, block & walling', /\b(brick|blocks?|walling|masonry structures?|cladding)\b/i],

    ['Components & Protection', 'Insulation', /\binsulation\b/i],
    ['Components & Protection', 'DPC, cloak systems & cavity trays', /\b(damp-proof|dpc|cloak systems?|cavity trays?)\b/i],
    ['Components & Protection', 'Fire barriers & breaks', /\bfire barriers?|fire breaks?\b/i],
    ['Components & Protection', 'Weep holes & vents', /\b(weep holes?|vents?)\b/i],

    ['Architectural & Decorative Masonry', 'Arches & decorative features', /\b(arches?|architectural|decorative|chimney stacks?|fireplaces?)\b/i],
    ['Architectural & Decorative Masonry', 'Curved, splayed & ramped masonry', /\b(curved|splayed|ramped)\b/i],
    ['Architectural & Decorative Masonry', 'Traditional & historic masonry', /\b(historical|traditional build|special interest|local styles?)\b/i],
    ['Architectural & Decorative Masonry', 'Reinforcement & specialist fixings', /\b(reinforcement|cramps?|specialist masonry)\b/i],

    ['Repair & Maintenance', 'Prepare, repair & restore masonry', /\b(repair|restore|existing masonry|dress surfaces?|replacement)\b/i],
    ['Repair & Maintenance', 'Remove & make good existing work', /\b(remove|removal|make good)\b/i],

    ['Quality, Completion & Communication', 'Work programme, productivity & deadlines', /\b(work programme|deadlines?|allocated time|productivity|time scales?|estimated time)\b/i],
    ['Quality, Completion & Communication', 'Quality & installation requirements', /\b(quality requirements?|installation quality|quality standards?|check quality)\b/i],
    ['Quality, Completion & Communication', 'Communication & teamwork', /\b(communicat|team|other occupations|working relationships?|relevant people|relevant personnel)\b/i],
    ['Quality, Completion & Communication', 'Equality, diversity & customer needs', /\b(equality|diversity|customer|user needs)\b/i],
  ];

  function sourceTask(unitTitle) {
    const title = clean(unitTitle).replace(/\s+in the workplace$/i, '');
    if (/erecting masonry cladding/i.test(title)) return 'Masonry cladding';
    if (/erecting masonry structures/i.test(title)) return 'Masonry structures';
    if (/architectural and decorative/i.test(title)) return 'Architectural & decorative masonry';
    if (/setting out/i.test(title)) return 'Setting out';
    if (/repairing and maintaining/i.test(title)) return 'Repair & maintenance';
    if (/health, safety and welfare/i.test(title)) return 'Health & safety';
    if (/occupational method of work/i.test(title)) return 'Work method';
    if (/work activities and resources/i.test(title)) return 'Planning & resources';
    if (/working relationships/i.test(title)) return 'Working relationships';
    return title || 'Course task';
  }

  function expandCriteria(criteria) {
    const elements = [];
    criteria.forEach((criterion) => {
      const split = splitList(criterion.text);
      if (split) {
        split.items.forEach((item) => elements.push({
          ref: `${criterion.ref}${item.marker}`,
          baseRef: criterion.ref,
          text: item.text,
          parent: split.parent,
          kind: criterion.kind,
          unitNumber: criterion.unitNumber,
          unitTitle: criterion.unitTitle,
          task: sourceTask(criterion.unitTitle),
        }));
      } else {
        elements.push({
          ref: criterion.ref,
          baseRef: criterion.ref,
          text: criterion.text,
          parent: '',
          kind: criterion.kind,
          unitNumber: criterion.unitNumber,
          unitTitle: criterion.unitTitle,
          task: sourceTask(criterion.unitTitle),
        });
      }
    });
    return elements;
  }

  function matchConcept(element) {
    for (const [unit, title, pattern] of concepts) {
      if (pattern.test(element.text)) return { unit, title };
    }
    for (const [unit, title, pattern] of concepts) {
      if (element.parent && pattern.test(element.parent)) return { unit, title };
    }
    return null;
  }

  function buildPreview(analysis) {
    const elements = expandCriteria(analysis.criteria || []);
    const groups = new Map();
    const unmatched = [];
    elements.forEach((element) => {
      const concept = matchConcept(element);
      if (!concept) { unmatched.push(element); return; }
      const key = `${concept.unit}|${concept.title}|${element.kind}`;
      if (!groups.has(key)) groups.set(key, { ...concept, kind: element.kind, elements: [] });
      groups.get(key).elements.push(element);
    });

    const units = unitDefinitions.map((definition) => ({ ...definition, groups: [] }));
    const unitMap = new Map(units.map((unit) => [unit.name, unit]));
    [...groups.values()].forEach((group) => unitMap.get(group.unit)?.groups.push(group));
    units.forEach((unit) => unit.groups.sort((left, right) => right.elements.length - left.elements.length || left.title.localeCompare(right.title)));

    return { elements, unmatched, units, reducedGroups: [...groups.values()] };
  }

  function renderGroup(group) {
    const tasks = [...new Set(group.elements.map((element) => element.task))];
    const refs = [...new Set(group.elements.map((element) => element.ref))];
    const visibleRefs = refs.slice(0, 6);
    const extra = refs.length - visibleRefs.length;
    const kind = group.kind === 'practical' ? 'Practical' : 'Knowledge';
    const taskCopy = tasks.length === 1 ? tasks[0] : `${tasks.length} different tasks`;
    const refCopy = `${visibleRefs.join(' · ')}${extra > 0 ? ` · +${extra}` : ''}`;
    const taskList = tasks.slice(0, 5).join(' · ');
    const moreTasks = tasks.length > 5 ? ` · +${tasks.length - 5}` : '';
    return `
      <div class="nvq-reduced-row">
        <input type="checkbox" checked disabled aria-label="${escapeHtml(group.title)} included in reduction preview">
        <span>
          <strong>${escapeHtml(group.title)}</strong>
          <small>${kind} · ${taskCopy} · ${refs.length} AC element${refs.length === 1 ? '' : 's'}</small>
          ${tasks.length > 1 ? `<em>${escapeHtml(taskList)}${escapeHtml(moreTasks)}</em>` : ''}
          <i>${escapeHtml(refCopy)}</i>
        </span>
      </div>`;
  }

  function renderUnit(unit, index) {
    if (!unit.groups.length) return '';
    const elementCount = unit.groups.reduce((sum, group) => sum + group.elements.length, 0);
    const taskCount = new Set(unit.groups.flatMap((group) => group.elements.map((element) => element.task))).size;
    return `
      <details class="nvq-reduction-unit"${index < 3 ? ' open' : ''}>
        <summary>
          <span><strong>${String(index + 1).padStart(2, '0')} · ${escapeHtml(unit.name)}</strong><small>${unit.groups.length} reduced activit${unit.groups.length === 1 ? 'y' : 'ies'} · ${elementCount} AC elements · ${taskCount} task${taskCount === 1 ? '' : 's'}</small></span>
        </summary>
        <div class="nvq-reduced-list">${unit.groups.map(renderGroup).join('')}</div>
      </details>`;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #evia-nvq-builder-overlay .${PREVIEW_CLASS} { display:grid; gap:.72rem; margin-top:.9rem; }
      #evia-nvq-builder-overlay .nvq-reduction-heading { padding:.84rem .9rem; border:1px solid rgba(255,255,255,.9); border-radius:1.1rem; background:rgba(255,255,255,.64); }
      #evia-nvq-builder-overlay .nvq-reduction-heading > span { display:block; margin-bottom:.16rem; color:#9a969d; font-size:.58rem; font-weight:560; }
      #evia-nvq-builder-overlay .nvq-reduction-heading h3 { margin:0 0 .28rem; color:#48474b; font-size:.82rem; font-weight:620; }
      #evia-nvq-builder-overlay .nvq-reduction-heading p { margin:0; color:#7e7b82; font-size:.64rem; line-height:1.48; }
      #evia-nvq-builder-overlay .nvq-reduction-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.42rem; margin-top:.68rem; }
      #evia-nvq-builder-overlay .nvq-reduction-summary span { display:grid; gap:.08rem; padding:.54rem .45rem; border-radius:.78rem; background:rgba(118,118,128,.055); text-align:center; }
      #evia-nvq-builder-overlay .nvq-reduction-summary strong { color:#555359; font-size:.82rem; font-weight:650; }
      #evia-nvq-builder-overlay .nvq-reduction-summary small { color:#8f8c92; font-size:.52rem; line-height:1.25; }
      #evia-nvq-builder-overlay .nvq-reduction-unit { overflow:hidden; border:1px solid rgba(255,255,255,.9); border-radius:1rem; background:rgba(255,255,255,.56); }
      #evia-nvq-builder-overlay .nvq-reduction-unit > summary { display:flex; align-items:center; justify-content:space-between; padding:.72rem .82rem; cursor:pointer; list-style:none; }
      #evia-nvq-builder-overlay .nvq-reduction-unit > summary::-webkit-details-marker { display:none; }
      #evia-nvq-builder-overlay .nvq-reduction-unit > summary span { display:grid; gap:.1rem; }
      #evia-nvq-builder-overlay .nvq-reduction-unit > summary strong { color:#555359; font-size:.66rem; font-weight:610; }
      #evia-nvq-builder-overlay .nvq-reduction-unit > summary small { color:#949097; font-size:.54rem; font-weight:390; }
      #evia-nvq-builder-overlay .nvq-reduction-unit[open] > summary { border-bottom:1px solid rgba(70,70,76,.055); }
      #evia-nvq-builder-overlay .nvq-reduced-list { display:grid; }
      #evia-nvq-builder-overlay .nvq-reduced-row { display:grid; grid-template-columns:auto minmax(0,1fr); gap:.58rem; align-items:start; padding:.68rem .82rem; border-bottom:1px solid rgba(70,70,76,.05); }
      #evia-nvq-builder-overlay .nvq-reduced-row:last-child { border-bottom:0; }
      #evia-nvq-builder-overlay .nvq-reduced-row input { margin-top:.08rem; accent-color:#efc33d; opacity:1; }
      #evia-nvq-builder-overlay .nvq-reduced-row > span { display:grid; gap:.12rem; min-width:0; }
      #evia-nvq-builder-overlay .nvq-reduced-row strong { color:#56545a; font-size:.62rem; font-weight:610; }
      #evia-nvq-builder-overlay .nvq-reduced-row small { color:#858189; font-size:.56rem; line-height:1.35; }
      #evia-nvq-builder-overlay .nvq-reduced-row em { color:#8f8b92; font-size:.53rem; font-style:normal; line-height:1.35; }
      #evia-nvq-builder-overlay .nvq-reduced-row i { color:#aaa6ac; font-size:.49rem; font-style:normal; line-height:1.35; }
      #evia-nvq-builder-overlay .nvq-reduction-foot { margin:0; padding:.1rem .14rem 0; color:#9a969d; font-size:.54rem; line-height:1.42; }
      @media (max-width:560px) { #evia-nvq-builder-overlay .nvq-reduction-summary { grid-template-columns:repeat(3,minmax(0,1fr)); } }
    `;
    document.head.appendChild(style);
  }

  function apply() {
    scheduled = false;
    const overlay = document.getElementById('evia-nvq-builder-overlay');
    const analysis = overlay?.__nvqState?.analysis;
    if (!overlay || !analysis) return;
    const target = overlay.querySelector('[data-nvq-results]');
    if (!target) return;

    const existing = target.querySelector(`.${PREVIEW_CLASS}`);
    existing?.remove();

    const preview = buildPreview(analysis);
    const covered = preview.elements.length - preview.unmatched.length;
    const container = document.createElement('section');
    container.className = PREVIEW_CLASS;
    container.innerHTML = `
      <div class="nvq-reduction-heading">
        <span>Reduction mapping preview</span>
        <h3>Proposed Evia learner Units</h3>
        <p>Repeated requirements are collapsed into learner activities. Where the same skill appears in different work, Evia keeps the task coverage visible rather than treating it as one generic occurrence.</p>
        <div class="nvq-reduction-summary">
          <span><strong>${analysis.criteria.length}</strong><small>Official ACs</small></span>
          <span><strong>${preview.elements.length}</strong><small>AC elements after a/b/c split</small></span>
          <span><strong>${preview.reducedGroups.length}</strong><small>Proposed reduced activities</small></span>
        </div>
      </div>
      ${preview.units.map(renderUnit).join('')}
      <p class="nvq-reduction-foot">${covered} AC elements are represented in this first reduction pass. ${preview.unmatched.length} remain task-specific and would stay separate until reviewed, so Evia does not force unrelated requirements together.</p>`;

    const automatic = [...target.querySelectorAll('.nvq-details')].find((item) => /Automatic holistic mappings|Automatic mappings/i.test(item.querySelector(':scope > summary')?.textContent || ''));
    if (automatic) target.insertBefore(container, automatic);
    else target.appendChild(container);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  addStyles();
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-analyse-nvq], [data-rerun-mapping]')) setTimeout(schedule, 0);
  });
  new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) return;
    const overlay = document.getElementById('evia-nvq-builder-overlay');
    if (overlay?.__nvqState?.analysis && !overlay.querySelector(`.${PREVIEW_CLASS}`)) schedule();
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
