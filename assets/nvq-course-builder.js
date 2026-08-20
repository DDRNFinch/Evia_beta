(() => {
  'use strict';

  const BUILDER_ID = 'evia-nvq-builder-overlay';
  const OPTION_ID = 'evia-nvq-builder-option';
  const ACTIVE_CLASS = 'evia-nvq-active';
  const COURSE_KEY = 'evia-course';
  const NOTICE_KEY = 'evia-nvq-builder-notice';

  const stopWords = new Set([
    'a','an','and','are','as','at','be','been','being','by','for','from','in','into','is','it','of','on','or','that','the','their','them','these','this','those','to','using','when','where','which','while','with','within','work','working','given','relating','relevant','required','requirements','appropriate'
  ]);

  const practicalStarts = /^(apply|assemble|build|carry|check|clean|complete|comply|construct|demonstrate|erect|establish|handle|identify and use|inspect|install|maintain|mark|measure|mix|monitor|move|operate|organise|place|position|prepare|protect|record|remove|repair|select|set out|store|use|work)\b/i;
  const knowledgeStarts = /^(define|describe|detail|discuss|explain|give|identify|indicate|interpret|list|name|outline|recognise|state|summarise|specify|why|how|what)\b/i;
  const practicalHints = /\b(erect|construct|install|set out|measure|mix|apply|use tools|use equipment|maintain|protect|position|prepare|handle|store|complete|comply|demonstrate|repair|mark out|assemble|work safely|safe working|check quality|inspect)\b/i;
  const knowledgeHints = /\b(describe|explain|state|identify|list|outline|why|how|methods?|information|legislation|regulations?|guidance|manufacturer|specification|purpose|types?|characteristics?|limitations?|hazards?|risks?|procedures?)\b/i;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'nvq-course';

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value ?? '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function getCourse() {
    try { return JSON.parse(localStorage.getItem(COURSE_KEY) || 'null'); }
    catch { return null; }
  }

  function isNvqCourse(course = getCourse()) {
    return Boolean(course && (course.courseKind === 'nvq' || course.nvq?.version));
  }

  function classifyCriterion(text, explicitType = '') {
    const given = clean(explicitType).toLowerCase();
    if (/practical|skill|performance/.test(given)) return 'practical';
    if (/knowledge|theory|underpinning/.test(given)) return 'knowledge';
    const wording = clean(text);
    if (practicalStarts.test(wording)) return 'practical';
    if (knowledgeStarts.test(wording)) return 'knowledge';
    const practical = (wording.match(new RegExp(practicalHints.source, 'ig')) || []).length;
    const knowledge = (wording.match(new RegExp(knowledgeHints.source, 'ig')) || []).length;
    return knowledge > practical ? 'knowledge' : 'practical';
  }

  function stemToken(token) {
    let value = token;
    if (value.length > 6 && value.endsWith('ing')) value = value.slice(0, -3);
    else if (value.length > 5 && value.endsWith('ed')) value = value.slice(0, -2);
    else if (value.length > 5 && value.endsWith('es')) value = value.slice(0, -2);
    else if (value.length > 4 && value.endsWith('s')) value = value.slice(0, -1);
    return value;
  }

  function wordSet(text) {
    const tokens = clean(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
      .filter((token) => token.length > 1 && !stopWords.has(token))
      .map(stemToken);
    return new Set(tokens);
  }

  function wordMatch(leftText, rightText) {
    const left = wordSet(leftText);
    const right = wordSet(rightText);
    if (left.size < 3 || right.size < 3) return 0;
    let intersection = 0;
    left.forEach((token) => { if (right.has(token)) intersection += 1; });
    const dice = (2 * intersection) / (left.size + right.size);
    const containment = intersection / Math.min(left.size, right.size);
    return Math.round((dice * 0.65 + containment * 0.35) * 100);
  }

  function conciseTitle(text) {
    let value = clean(text)
      .replace(/^(describe|explain|state|identify|list|outline|demonstrate)\s+(how|the|ways?|methods?|why|what)?\s*/i, '')
      .replace(/\brelating to the work and resources\b.*$/i, '')
      .replace(/\bwhen (?:erecting|constructing|installing|preparing|maintaining|repairing)\b.*$/i, '')
      .replace(/[.;:]\s*$/, '');
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length > 9) value = `${words.slice(0, 9).join(' ')}…`;
    if (!value) value = clean(text).split(/\s+/).slice(0, 9).join(' ');
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function parseCsvLine(line) {
    const fields = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) {
        fields.push(current.trim()); current = '';
      } else current += char;
    }
    fields.push(current.trim());
    return fields;
  }

  function criterionRecord(unit, code, text, outcome = '', type = '') {
    const criterionCode = clean(code).replace(/^AC\s*/i, '');
    return {
      id: `${unit.number}:${criterionCode}`,
      unitNumber: String(unit.number),
      unitTitle: unit.title,
      code: criterionCode,
      ref: `${unit.number}/${criterionCode}`,
      outcome: clean(outcome),
      text: clean(text),
      kind: classifyCriterion(text, type),
    };
  }

  function parseStructuredJson(parsed, raw) {
    const root = parsed?.qualification && Array.isArray(parsed?.units) ? parsed : (parsed?.nvq?.units ? {
      qualification: parsed.qualification || parsed.nvq.qualification || {},
      units: parsed.nvq.units,
    } : parsed);
    if (!root || !Array.isArray(root.units)) return null;
    const qualification = typeof root.qualification === 'object' && root.qualification ? root.qualification : {};
    const title = clean(root.qualificationTitle || qualification.title || root.title || 'NVQ / Diploma');
    const number = clean(root.qualificationNumber || qualification.number || root.number || '');
    const units = [];
    root.units.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const unitNumber = clean(item.number ?? item.unitNumber ?? item.code ?? `${index + 1}`);
      const unit = {
        number: unitNumber,
        title: clean(item.title || item.name || `Unit ${unitNumber}`),
        glh: Number(item.glh ?? item.guidedLearningHours ?? 0) || 0,
        criteria: [],
      };
      const direct = Array.isArray(item.criteria) ? item.criteria : Array.isArray(item.assessmentCriteria) ? item.assessmentCriteria : [];
      direct.forEach((criterion, criterionIndex) => {
        if (typeof criterion === 'string') {
          const match = criterion.match(/^\s*(?:AC\s*)?([0-9]+(?:\.[0-9A-Za-z]+)+)\s*[-:|–—]?\s*(.*)$/i);
          if (match && match[2]) unit.criteria.push(criterionRecord(unit, match[1], match[2]));
          else unit.criteria.push(criterionRecord(unit, `${criterionIndex + 1}.1`, criterion));
        } else if (criterion && typeof criterion === 'object') {
          unit.criteria.push(criterionRecord(unit, criterion.code || criterion.id || `${criterionIndex + 1}.1`, criterion.text || criterion.description || criterion.title || '', criterion.outcome || criterion.learningOutcome || '', criterion.type || criterion.kind || ''));
        }
      });
      const outcomes = Array.isArray(item.outcomes) ? item.outcomes : Array.isArray(item.learningOutcomes) ? item.learningOutcomes : [];
      outcomes.forEach((outcome, outcomeIndex) => {
        if (!outcome || typeof outcome !== 'object') return;
        const outcomeCode = clean(outcome.code || outcome.id || `LO${outcomeIndex + 1}`);
        const outcomeTitle = clean(outcome.title || outcome.description || outcomeCode);
        const criteria = Array.isArray(outcome.criteria) ? outcome.criteria : Array.isArray(outcome.assessmentCriteria) ? outcome.assessmentCriteria : [];
        criteria.forEach((criterion, criterionIndex) => {
          if (typeof criterion === 'string') {
            const match = criterion.match(/^\s*(?:AC\s*)?([0-9]+(?:\.[0-9A-Za-z]+)+)\s*[-:|–—]?\s*(.*)$/i);
            unit.criteria.push(criterionRecord(unit, match?.[1] || `${outcomeIndex + 1}.${criterionIndex + 1}`, match?.[2] || criterion, `${outcomeCode} ${outcomeTitle}`));
          } else if (criterion && typeof criterion === 'object') {
            unit.criteria.push(criterionRecord(unit, criterion.code || criterion.id || `${outcomeIndex + 1}.${criterionIndex + 1}`, criterion.text || criterion.description || criterion.title || '', `${outcomeCode} ${outcomeTitle}`, criterion.type || criterion.kind || ''));
          }
        });
      });
      unit.criteria = unit.criteria.filter((criterion) => criterion.text);
      if (unit.criteria.length) units.push(unit);
    });
    if (!units.length) return null;
    return { title, number, units, raw, sourceFormat: 'json' };
  }

  function parseCsv(raw) {
    const lines = raw.replace(/\r/g, '').split('\n').filter((line) => line.trim());
    if (lines.length < 2) return null;
    const headers = parseCsvLine(lines[0]).map((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const find = (...names) => headers.findIndex((header) => names.includes(header));
    const indexes = {
      unit: find('unit','unitnumber','unitcode'), title: find('unittitle','unitname'), glh: find('glh','guidedlearninghours'),
      lo: find('lo','learningoutcome','outcome'), ac: find('ac','assessmentcriterion','assessmentcriteria','accode'), text: find('text','wording','description','criterion'), type: find('type','kind','classification'),
      qTitle: find('qualification','qualificationtitle'), qNumber: find('qualificationnumber','qualificationcode'),
    };
    if (indexes.unit < 0 || indexes.ac < 0 || indexes.text < 0) return null;
    const map = new Map();
    let title = 'NVQ / Diploma';
    let number = '';
    lines.slice(1).forEach((line) => {
      const fields = parseCsvLine(line);
      const unitNumber = clean(fields[indexes.unit]);
      if (!unitNumber) return;
      if (indexes.qTitle >= 0 && clean(fields[indexes.qTitle])) title = clean(fields[indexes.qTitle]);
      if (indexes.qNumber >= 0 && clean(fields[indexes.qNumber])) number = clean(fields[indexes.qNumber]);
      if (!map.has(unitNumber)) map.set(unitNumber, { number: unitNumber, title: clean(indexes.title >= 0 ? fields[indexes.title] : '') || `Unit ${unitNumber}`, glh: Number(indexes.glh >= 0 ? fields[indexes.glh] : 0) || 0, criteria: [] });
      const unit = map.get(unitNumber);
      unit.criteria.push(criterionRecord(unit, fields[indexes.ac], fields[indexes.text], indexes.lo >= 0 ? fields[indexes.lo] : '', indexes.type >= 0 ? fields[indexes.type] : ''));
    });
    const units = [...map.values()].filter((unit) => unit.criteria.length);
    return units.length ? { title, number, units, raw, sourceFormat: 'csv' } : null;
  }

  function parseText(raw) {
    const lines = raw.replace(/\r/g, '').split('\n');
    let title = 'NVQ / Diploma';
    let number = '';
    const units = [];
    let currentUnit = null;
    let currentOutcome = '';

    lines.forEach((rawLine) => {
      const line = clean(rawLine.replace(/^[-•*]\s*/, ''));
      if (!line) return;
      let match = line.match(/^qualification(?:\s+title)?\s*[:|–—-]\s*(.+)$/i);
      if (match) { title = clean(match[1]); return; }
      match = line.match(/^qualification\s+(?:number|code)\s*[:|–—-]\s*(.+)$/i);
      if (match) { number = clean(match[1]); return; }
      match = line.match(/^unit\s+([A-Za-z0-9.-]+)\s*(?:[:|–—-]\s*(.*))?$/i);
      if (match) {
        let unitTitle = clean(match[2] || `Unit ${match[1]}`);
        let glh = 0;
        const glhMatch = unitTitle.match(/(?:\||·|,)\s*GLH\s*[:=]?\s*([0-9.]+)\s*$/i);
        if (glhMatch) { glh = Number(glhMatch[1]) || 0; unitTitle = clean(unitTitle.slice(0, glhMatch.index)); }
        currentUnit = { number: clean(match[1]), title: unitTitle, glh, criteria: [] };
        units.push(currentUnit); currentOutcome = ''; return;
      }
      if (!currentUnit) return;
      match = line.match(/^GLH\s*[:=|-]?\s*([0-9.]+)/i);
      if (match) { currentUnit.glh = Number(match[1]) || 0; return; }
      match = line.match(/^(?:LO|Learning Outcome)\s*([A-Za-z0-9.]+)?\s*[:|–—-]?\s*(.*)$/i);
      if (match) { currentOutcome = clean(`${match[1] ? `LO${match[1]}` : 'LO'} ${match[2] || ''}`); return; }
      match = line.match(/^(?:AC\s*)?([0-9]+(?:\.[0-9A-Za-z]+)+)\s*(?:[:|–—-]\s*|\s+)(.+)$/i);
      if (match) currentUnit.criteria.push(criterionRecord(currentUnit, match[1], match[2], currentOutcome));
    });

    const usable = units.filter((unit) => unit.criteria.length);
    return usable.length ? { title, number, units: usable, raw, sourceFormat: 'text' } : null;
  }

  function parseQualification(raw) {
    const text = String(raw || '').trim();
    if (!text) throw new Error('Add a qualification file or paste the Unit and AC wording first.');
    try {
      const parsed = JSON.parse(text);
      const structured = parseStructuredJson(parsed, text);
      if (structured) return structured;
    } catch { /* Plain text or CSV is expected too. */ }
    const firstLine = text.replace(/\r/g, '').split('\n').find((line) => line.trim()) || '';
    if (firstLine.includes(',') && /unit/i.test(firstLine) && /(?:ac|criterion)/i.test(firstLine)) {
      const csv = parseCsv(text);
      if (csv) return csv;
    }
    const plain = parseText(text);
    if (plain) return plain;
    throw new Error('I could not recognise the Units and ACs. Use Unit headings followed by numbered ACs, or upload a structured JSON/CSV file.');
  }

  function flattenCriteria(qualification) {
    return qualification.units.flatMap((unit) => unit.criteria.map((criterion) => ({ ...criterion, unitTitle: unit.title })));
  }

  class UnionFind {
    constructor(items) { this.parent = new Map(items.map((item) => [item.id, item.id])); }
    find(id) {
      const parent = this.parent.get(id);
      if (parent === id) return id;
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    union(a, b) {
      const left = this.find(a); const right = this.find(b);
      if (left !== right) this.parent.set(right, left);
    }
  }

  function analyseMatches(qualification) {
    const criteria = flattenCriteria(qualification);
    const union = new UnionFind(criteria);
    const autoPairs = [];
    const reviewPairs = [];
    for (let i = 0; i < criteria.length; i += 1) {
      for (let j = i + 1; j < criteria.length; j += 1) {
        const left = criteria[i]; const right = criteria[j];
        if (left.unitNumber === right.unitNumber || left.kind !== right.kind) continue;
        const score = wordMatch(left.text, right.text);
        if (score >= 80) { union.union(left.id, right.id); autoPairs.push({ left, right, score }); }
        else if (score >= 50) reviewPairs.push({ left, right, score });
      }
    }
    const autoGroups = new Map();
    criteria.forEach((criterion) => {
      const root = union.find(criterion.id);
      if (!autoGroups.has(root)) autoGroups.set(root, []);
      autoGroups.get(root).push(criterion);
    });
    return { criteria, union, autoPairs: autoPairs.sort((a,b) => b.score-a.score), reviewPairs: reviewPairs.sort((a,b) => b.score-a.score), autoGroups: [...autoGroups.values()] };
  }

  function clusterWithDecisions(analysis, selectedPairs) {
    const union = new UnionFind(analysis.criteria);
    analysis.autoPairs.forEach((pair) => union.union(pair.left.id, pair.right.id));
    selectedPairs.forEach((pairIndex) => {
      const pair = analysis.reviewPairs[pairIndex];
      if (pair) union.union(pair.left.id, pair.right.id);
    });
    const groups = new Map();
    analysis.criteria.forEach((criterion) => {
      const root = union.find(criterion.id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(criterion);
    });
    return [...groups.values()];
  }

  function buildCourse(qualification, analysis, selectedPairs) {
    const groups = clusterWithDecisions(analysis, selectedPairs);
    const seed = 1000 + (hashString(`${qualification.number}|${qualification.title}`) % 7000);
    let practicalIndex = 0;
    let knowledgeIndex = 0;
    const clusters = groups.map((criteria) => {
      const kind = criteria[0].kind;
      const ordinal = kind === 'practical' ? ++practicalIndex : ++knowledgeIndex;
      const numeric = seed * 100 + ordinal;
      const code = `${kind === 'practical' ? 'S' : 'K'}${numeric}`;
      const displayCode = `${kind === 'practical' ? 'P' : 'K'}${ordinal}`;
      const representative = criteria.slice().sort((a,b) => a.text.length - b.text.length)[0];
      return { id: `cluster-${code}`, code, displayCode, kind, title: conciseTitle(representative.text), criteria };
    });

    const units = qualification.units.map((unit, index) => {
      const items = [];
      clusters.forEach((cluster) => {
        const localCriteria = cluster.criteria.filter((criterion) => criterion.unitNumber === String(unit.number));
        if (!localCriteria.length) return;
        items.push({
          code: cluster.code,
          type: cluster.kind === 'practical' ? 'Skill' : 'Knowledge',
          title: cluster.title,
          description: localCriteria.map((criterion) => `${criterion.code} · ${criterion.text}`).join('\n'),
        });
      });
      const practical = items.filter((item) => item.type === 'Skill').length;
      const knowledge = items.filter((item) => item.type === 'Knowledge').length;
      const parsedNumber = Number.parseInt(String(unit.number).replace(/[^0-9]/g, ''), 10);
      return {
        id: `nvq-unit-${String(unit.number).replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() || index + 1}`,
        number: Number.isFinite(parsedNumber) ? parsedNumber : index + 1,
        title: unit.title,
        summary: `${practical} Practical · ${knowledge} Knowledge${unit.glh ? ` · ${unit.glh} GLH` : ''}`,
        ksbs: items,
      };
    });

    const totalGlh = qualification.units.reduce((sum, unit) => sum + (Number(unit.glh) || 0), 0);
    return {
      createdAt: Date.now(),
      mappingVersion: 1,
      sourceType: 'file',
      rawKsbs: qualification.raw,
      units,
      inputCounts: { knowledge: knowledgeIndex, skills: practicalIndex, behaviours: 0 },
      courseKind: 'nvq',
      qualification: { title: qualification.title, number: qualification.number, glh: totalGlh },
      nvq: {
        version: 1,
        sourceFormat: qualification.sourceFormat,
        matchThresholds: { automatic: 80, review: 50 },
        criteriaCount: analysis.criteria.length,
        glhTotal: totalGlh,
        units: qualification.units,
        clusters: clusters.map((cluster) => ({
          id: cluster.id, code: cluster.code, displayCode: cluster.displayCode, kind: cluster.kind, title: cluster.title,
          criteriaRefs: cluster.criteria.map((criterion) => criterion.ref),
        })),
        reviewDecisions: selectedPairs.map((index) => {
          const pair = analysis.reviewPairs[index];
          return pair ? { left: pair.left.ref, right: pair.right.ref, score: pair.score, mapped: true } : null;
        }).filter(Boolean),
      },
    };
  }

  function downloadCourse(course) {
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const number = course.qualification?.number ? `${slug(course.qualification.number)}-` : '';
    anchor.href = url;
    anchor.download = `${number}${slug(course.qualification?.title || 'nvq-course')}.evia-nvq`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function selectedReviewPairs(overlay) {
    return [...overlay.querySelectorAll('[data-review-pair]:checked')].map((input) => Number(input.dataset.reviewPair)).filter(Number.isFinite);
  }

  function renderAnalysis(overlay, state) {
    const target = overlay.querySelector('[data-nvq-results]');
    if (!target || !state.qualification || !state.analysis) return;
    const { qualification, analysis } = state;
    const practical = analysis.criteria.filter((item) => item.kind === 'practical').length;
    const knowledge = analysis.criteria.filter((item) => item.kind === 'knowledge').length;
    const autoMappedCriteria = new Set(analysis.autoPairs.flatMap((pair) => [pair.left.id, pair.right.id])).size;
    const autoRows = analysis.autoPairs.slice(0, 40).map((pair) => `<div class="nvq-match-row"><strong>${pair.score}%</strong><span>${escapeHtml(pair.left.ref)} ↔ ${escapeHtml(pair.right.ref)}</span><small>${escapeHtml(pair.left.text)}<br>${escapeHtml(pair.right.text)}</small></div>`).join('');
    const reviewRows = analysis.reviewPairs.map((pair, index) => `<label class="nvq-review-row"><input type="checkbox" data-review-pair="${index}"><span><strong>${pair.score}% · ${escapeHtml(pair.left.ref)} ↔ ${escapeHtml(pair.right.ref)}</strong><small>${escapeHtml(pair.left.text)}<br>${escapeHtml(pair.right.text)}</small></span></label>`).join('');
    const classifyRows = analysis.criteria.map((criterion, index) => `<label class="nvq-classify-row"><span><strong>${escapeHtml(criterion.ref)}</strong><small>${escapeHtml(criterion.text)}</small></span><select data-classify-index="${index}" aria-label="Classification for ${escapeHtml(criterion.ref)}"><option value="practical"${criterion.kind === 'practical' ? ' selected' : ''}>Practical</option><option value="knowledge"${criterion.kind === 'knowledge' ? ' selected' : ''}>Knowledge</option></select></label>`).join('');

    target.innerHTML = `
      <section class="nvq-analysis-block">
        <h3>${escapeHtml(qualification.title)}</h3>
        <p>${escapeHtml(qualification.number || 'Qualification number not supplied')} · ${qualification.units.length} Units</p>
        <div class="nvq-summary-grid">
          <span><strong>${analysis.criteria.length}</strong><small>Assessment criteria</small></span>
          <span><strong>${practical}</strong><small>Practical</small></span>
          <span><strong>${knowledge}</strong><small>Knowledge</small></span>
          <span><strong>${autoMappedCriteria}</strong><small>ACs auto-mapped ≥80%</small></span>
        </div>
      </section>
      <details class="nvq-details"><summary>Review Practical / Knowledge classification</summary><div class="nvq-classification-list">${classifyRows}</div><button type="button" class="nvq-secondary" data-rerun-mapping>Re-run holistic mapping</button></details>
      <section class="nvq-analysis-block">
        <h3>Needs your decision · 50–79%</h3>
        <p>${analysis.reviewPairs.length ? 'Tick only the pairs that genuinely describe the same competence or knowledge.' : 'No borderline matches need a decision.'}</p>
        <div class="nvq-review-list">${reviewRows || '<div class="nvq-empty">Nothing to review.</div>'}</div>
      </section>
      <details class="nvq-details"><summary>Automatic mappings · 80%+</summary><div class="nvq-match-list">${autoRows || '<div class="nvq-empty">No automatic cross-Unit matches were found.</div>'}</div></details>
      <div class="nvq-builder-actions"><button type="button" class="make-course-button" data-build-nvq>Build learner course</button></div>
      <div data-nvq-built></div>`;
  }

  function renderBuilt(overlay, state, course) {
    const selected = selectedReviewPairs(overlay);
    const clusters = course.nvq?.clusters || [];
    const practicalActivities = clusters.filter((item) => item.kind === 'practical').length;
    const knowledgeActivities = clusters.filter((item) => item.kind === 'knowledge').length;
    const target = overlay.querySelector('[data-nvq-built]');
    if (!target) return;
    state.course = course;
    target.innerHTML = `<section class="nvq-built-block"><h3>Course ready</h3><p>${state.analysis.criteria.length} official ACs have been reduced to ${clusters.length} learner evidence activities while keeping every original Unit and AC in the mapping data.</p><div class="nvq-summary-grid"><span><strong>${practicalActivities}</strong><small>Practical activities</small></span><span><strong>${knowledgeActivities}</strong><small>Knowledge activities</small></span><span><strong>${selected.length}</strong><small>Manual mappings</small></span><span><strong>${course.nvq.glhTotal || '—'}</strong><small>Total GLH in file</small></span></div><div class="nvq-builder-actions"><button type="button" class="nvq-secondary" data-download-nvq>Download course file</button><button type="button" class="make-course-button" data-use-nvq>Use this course in Evia</button></div></section>`;
  }

  function openBuilder() {
    document.getElementById(BUILDER_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = BUILDER_ID;
    overlay.className = 'nvq-builder-overlay';
    overlay.innerHTML = `<div class="nvq-builder-card" role="dialog" aria-modal="true" aria-labelledby="nvq-builder-title"><header class="nvq-builder-header"><div><span>Course Builder</span><h2 id="nvq-builder-title">NVQ / Diploma</h2></div><button type="button" aria-label="Close NVQ Course Builder" data-close-nvq>×</button></header><div class="nvq-builder-body"><div class="nvq-builder-intro"><p>Upload one qualification file containing all mandatory Units and your chosen optional Unit. Evia preserves Unit numbers and official AC wording, separates Practical and Knowledge, auto-maps matches at 80%+, and lets you decide matches from 50–79%.</p></div><div class="nvq-input-grid"><label><span>Qualification title</span><input type="text" data-q-title placeholder="Level 3 NVQ Diploma in Trowel Occupations"></label><label><span>Qualification number</span><input type="text" data-q-number placeholder="6570-03"></label></div><label class="nvq-file-row"><input type="file" data-nvq-file accept=".txt,.csv,.json,.nvq,.evia-nvq,.evianvq,text/plain,application/json,text/csv"><span><strong data-nvq-file-name>Choose qualification file</strong><small>TXT, CSV or structured JSON · processed on this device</small></span></label><label class="nvq-source-label"><span>Or paste the qualification structure</span><textarea data-nvq-source rows="12" placeholder="Qualification: Level 3 NVQ Diploma in Trowel Occupations\nQualification number: 6570-03\n\nUnit 234 - Erecting masonry cladding in the workplace | GLH 120\nLO1 - Interpret the given information...\n1.1 Interpret drawings, specifications and schedules...\n1.2 Extract relevant information...\n\nUnit 235 - Erecting masonry structures in the workplace | GLH 160\n..."></textarea></label><p class="nvq-error" data-nvq-error role="alert"></p><div class="nvq-builder-actions"><button type="button" class="make-course-button" data-analyse-nvq>Analyse qualification</button></div><div data-nvq-results></div></div></div>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add('nvq-builder-open');
    const state = { raw: '', qualification: null, analysis: null, course: null };
    overlay.__nvqState = state;

    overlay.addEventListener('click', (event) => {
      const close = event.target.closest('[data-close-nvq]');
      if (close || event.target === overlay) {
        overlay.remove(); document.documentElement.classList.remove('nvq-builder-open'); return;
      }
      if (event.target.closest('[data-analyse-nvq]')) {
        const error = overlay.querySelector('[data-nvq-error]'); error.textContent = '';
        try {
          const raw = overlay.querySelector('[data-nvq-source]').value || state.raw;
          const qualification = parseQualification(raw);
          const title = clean(overlay.querySelector('[data-q-title]').value);
          const number = clean(overlay.querySelector('[data-q-number]').value);
          if (title) qualification.title = title;
          if (number) qualification.number = number;
          if (!overlay.querySelector('[data-q-title]').value) overlay.querySelector('[data-q-title]').value = qualification.title;
          if (!overlay.querySelector('[data-q-number]').value) overlay.querySelector('[data-q-number]').value = qualification.number;
          state.qualification = qualification; state.analysis = analyseMatches(qualification); state.course = null;
          renderAnalysis(overlay, state);
        } catch (problem) { error.textContent = problem?.message || 'I could not analyse that qualification.'; }
        return;
      }
      if (event.target.closest('[data-rerun-mapping]')) {
        if (!state.qualification || !state.analysis) return;
        overlay.querySelectorAll('[data-classify-index]').forEach((select) => {
          const criterion = state.analysis.criteria[Number(select.dataset.classifyIndex)];
          if (criterion) {
            criterion.kind = select.value;
            const source = state.qualification.units.flatMap((unit) => unit.criteria).find((item) => item.id === criterion.id);
            if (source) source.kind = select.value;
          }
        });
        state.analysis = analyseMatches(state.qualification); state.course = null; renderAnalysis(overlay, state); return;
      }
      if (event.target.closest('[data-build-nvq]')) {
        if (!state.qualification || !state.analysis) return;
        const selected = selectedReviewPairs(overlay);
        const course = buildCourse(state.qualification, state.analysis, selected);
        renderBuilt(overlay, state, course);
        overlay.querySelector('[data-nvq-built]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return;
      }
      if (event.target.closest('[data-download-nvq]')) { if (state.course) downloadCourse(state.course); return; }
      if (event.target.closest('[data-use-nvq]')) {
        if (!state.course) return;
        try {
          localStorage.setItem(COURSE_KEY, JSON.stringify(state.course));
          localStorage.setItem(NOTICE_KEY, `${state.course.qualification?.title || 'NVQ course'} is ready in Evia.`);
          window.location.reload();
        } catch { overlay.querySelector('[data-nvq-error]').textContent = 'This device could not save the course locally.'; }
      }
    });

    overlay.querySelector('[data-nvq-file]').addEventListener('change', async (event) => {
      const file = event.target.files?.[0]; if (!file) return;
      overlay.querySelector('[data-nvq-file-name]').textContent = file.name;
      const error = overlay.querySelector('[data-nvq-error]'); error.textContent = '';
      if (file.size > 4 * 1024 * 1024) { error.textContent = 'Choose a qualification file smaller than 4 MB.'; return; }
      try { state.raw = await file.text(); overlay.querySelector('[data-nvq-source]').value = state.raw; }
      catch { error.textContent = 'I could not read that file on this device.'; }
    });
  }

  function injectBuilderOption() {
    const containers = [...document.querySelectorAll('.course-method-pills')];
    const container = containers.find((element) => /Let Evia Build It/i.test(element.textContent || ''));
    if (!container || container.querySelector(`#${OPTION_ID}`)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.id = OPTION_ID; button.className = 'option-row';
    button.innerHTML = '<span class="option-row-copy"><span>Build NVQ / Diploma</span><small>Upload Units and ACs · holistic mapping</small></span>';
    button.addEventListener('click', openBuilder);
    container.appendChild(button);
  }

  function adaptNvqLabels() {
    const course = getCourse();
    document.body.classList.toggle(ACTIVE_CLASS, isNvqCourse(course));
    if (!isNvqCourse(course)) return;
    const clusterMap = new Map((course.nvq?.clusters || []).map((item) => [item.code, item.displayCode]));
    document.querySelectorAll('.ksb-code').forEach((element) => {
      const current = clean(element.textContent);
      if (clusterMap.has(current)) element.textContent = clusterMap.get(current);
    });
    document.querySelectorAll('.unit-dot-group').forEach((group) => {
      const label = group.querySelector('b');
      if (!label) return;
      if (clean(label.textContent) === 'S') label.textContent = 'P';
      if (clean(label.textContent) === 'B' && !group.querySelector('i')) group.style.display = 'none';
    });
    const exactReplacements = new Map([
      ['KSB Progress', 'AC Progress'], ['Knowledge, Skills & Behaviours', 'Assessment Criteria'], ['Skills', 'Practical'], ['Skill', 'Practical'],
    ]);
    document.querySelectorAll('h1,h2,h3,h4,.section-label,.builder-kicker,.option-row-copy > span').forEach((element) => {
      const value = clean(element.textContent);
      if (exactReplacements.has(value)) element.textContent = exactReplacements.get(value);
    });
  }

  function showSavedNotice() {
    let message = '';
    try { message = localStorage.getItem(NOTICE_KEY) || ''; if (message) localStorage.removeItem(NOTICE_KEY); } catch {}
    if (!message) return;
    const toast = document.createElement('div'); toast.className = 'nvq-saved-toast'; toast.textContent = message; document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('is-visible'), 20);
    setTimeout(() => { toast.classList.remove('is-visible'); setTimeout(() => toast.remove(), 220); }, 3200);
  }

  function enhance() { injectBuilderOption(); adaptNvqLabels(); }
  const scheduleEnhance = () => { setTimeout(enhance, 0); setTimeout(enhance, 90); setTimeout(enhance, 260); };
  document.addEventListener('click', scheduleEnhance, true);
  document.addEventListener('change', scheduleEnhance, true);
  window.addEventListener('pageshow', scheduleEnhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { scheduleEnhance(); showSavedNotice(); });
  else { scheduleEnhance(); showSavedNotice(); }
})();