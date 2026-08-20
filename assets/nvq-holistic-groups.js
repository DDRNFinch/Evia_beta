(() => {
  'use strict';

  let scheduled = false;

  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  function groupTitle(group) {
    const representative = group.slice().sort((left, right) => clean(left.text).length - clean(right.text).length)[0];
    let value = clean(representative?.text || 'Holistically mapped assessment criteria')
      .replace(/^(describe|explain|state|identify|list|outline|demonstrate)\s+(how|the|ways?|methods?|why|what)?\s*/i, '')
      .replace(/\bin relation to\b.*$/i, '')
      .replace(/\brelating to\b.*$/i, '')
      .replace(/[.;:]\s*$/, '');
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length > 8) value = `${words.slice(0, 8).join(' ')}…`;
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Holistically mapped ACs';
  }

  function scoreRange(group, analysis) {
    const ids = new Set(group.map((criterion) => criterion.id));
    const scores = (analysis.autoPairs || [])
      .filter((pair) => ids.has(pair.left.id) && ids.has(pair.right.id))
      .map((pair) => Number(pair.score) || 0)
      .filter((score) => score >= 80);
    if (!scores.length) return '80%+';
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    return high === low ? `${high}%` : `${high}–${low}%`;
  }

  function refParts(ref) {
    const match = String(ref || '').match(/^(\d+)[\/-](.+)$/);
    return match ? [Number(match[1]), match[2]] : [Number.MAX_SAFE_INTEGER, String(ref || '')];
  }

  function sortCriteria(left, right) {
    const [leftUnit, leftAc] = refParts(left.ref);
    const [rightUnit, rightAc] = refParts(right.ref);
    return leftUnit - rightUnit || String(leftAc).localeCompare(String(rightAc), undefined, { numeric: true });
  }

  function renderGroup(group, analysis) {
    const sorted = group.slice().sort(sortCriteria);
    const kind = sorted[0]?.kind === 'knowledge' ? 'Knowledge' : 'Practical';
    const range = scoreRange(sorted, analysis);
    const rows = sorted.map((criterion) => `
      <label class="nvq-auto-group-row">
        <input type="checkbox" checked disabled aria-label="${escapeHtml(criterion.ref)} automatically mapped">
        <span><strong>${escapeHtml(criterion.ref)}</strong><small>${escapeHtml(criterion.unitTitle || `Unit ${criterion.unitNumber}`)}</small></span>
      </label>`).join('');
    return `
      <article class="nvq-auto-group">
        <header><strong>${kind} · ${escapeHtml(groupTitle(sorted))}</strong><small>${range} automatic match · ${sorted.length} ACs</small></header>
        <div>${rows}</div>
      </article>`;
  }

  function apply() {
    scheduled = false;
    const overlay = document.getElementById('evia-nvq-builder-overlay');
    const analysis = overlay?.__nvqState?.analysis;
    if (!overlay || !analysis) return;

    const details = [...overlay.querySelectorAll('.nvq-details')]
      .find((item) => /^Automatic mappings/i.test(clean(item.querySelector(':scope > summary')?.textContent))
        || /^Automatic holistic mappings/i.test(clean(item.querySelector(':scope > summary')?.textContent)));
    const list = details?.querySelector('.nvq-match-list');
    if (!details || !list || list.dataset.holisticGroups === 'true') return;

    const groups = (analysis.autoGroups || [])
      .filter((group) => Array.isArray(group) && group.length > 1)
      .sort((left, right) => {
        const kind = Number(left[0]?.kind === 'knowledge') - Number(right[0]?.kind === 'knowledge');
        if (kind) return kind;
        if (right.length !== left.length) return right.length - left.length;
        return sortCriteria(left.slice().sort(sortCriteria)[0], right.slice().sort(sortCriteria)[0]);
      });

    const summary = details.querySelector(':scope > summary');
    if (summary) summary.textContent = `Automatic holistic mappings · 80%+ · ${groups.length} group${groups.length === 1 ? '' : 's'}`;
    list.dataset.holisticGroups = 'true';
    list.innerHTML = groups.length
      ? `<p class="nvq-auto-group-intro">Each group becomes one learner evidence activity while keeping every original Unit and AC reference.</p>${groups.map((group) => renderGroup(group, analysis)).join('')}`
      : '<div class="nvq-empty">No automatic cross-Unit groups were found.</div>';
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  const style = document.createElement('style');
  style.textContent = `
    .nvq-auto-group-intro { margin:0; padding:.72rem .86rem; border-bottom:1px solid rgba(70,70,76,.055); color:#8c8990; font-size:.57rem; line-height:1.45; }
    .nvq-auto-group { border-bottom:1px solid rgba(70,70,76,.06); }
    .nvq-auto-group:last-child { border-bottom:0; }
    .nvq-auto-group > header { display:grid; gap:.12rem; padding:.72rem .86rem .55rem; }
    .nvq-auto-group > header strong { color:#555359; font-size:.64rem; font-weight:620; line-height:1.35; }
    .nvq-auto-group > header small { color:#8f8c92; font-size:.55rem; font-weight:390; }
    .nvq-auto-group > div { display:grid; padding:0 .86rem .66rem; }
    .nvq-auto-group-row { display:grid; grid-template-columns:auto minmax(0,1fr); gap:.55rem; align-items:center; min-height:2rem; cursor:default; }
    .nvq-auto-group-row input { margin:0; accent-color:#efc33d; opacity:1; }
    .nvq-auto-group-row span { display:flex; min-width:0; align-items:baseline; gap:.42rem; }
    .nvq-auto-group-row strong { flex:0 0 auto; color:#5b595f; font-size:.61rem; font-weight:610; }
    .nvq-auto-group-row small { overflow:hidden; color:#97949a; font-size:.54rem; font-weight:370; text-overflow:ellipsis; white-space:nowrap; }
  `;
  document.head.appendChild(style);

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', () => setTimeout(schedule, 0), true);
  schedule();
})();
