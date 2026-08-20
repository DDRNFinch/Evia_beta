(() => {
  'use strict';

  const COURSE_KEY = 'evia-course';
  const EVIDENCE_KEY = 'evia-evidence-records';
  const HOURS_KEY = 'evia-otj-entries';
  const RPL_KEY = 'evia-rpl-codes';
  let scheduled = false;

  const read = (key, fallback) => {
    try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; }
    catch { return fallback; }
  };
  const course = () => read(COURSE_KEY, null);
  const isNvq = (value = course()) => Boolean(value && (value.courseKind === 'nvq' || value.nvq?.version));
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const words = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
  const fmt = (value) => {
    const rounded = Math.round((Number(value) || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };
  const setText = (element, value) => {
    if (element && element.textContent !== String(value)) element.textContent = String(value);
  };
  const setAttr = (element, name, value) => {
    if (element && element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value));
  };

  function recordComplete(record) {
    if (!record) return false;
    if (record.method === 'photo') return (record.fileIds || []).length >= 3;
    if (record.method === 'video' || record.method === 'audio') return (record.fileIds || []).length >= 1;
    if (record.method === 'written' || record.method === 'reflection') return words(record.text) >= 30;
    return Boolean(record.witness?.name?.trim() && record.witness?.role?.trim() && record.witness?.date && record.witness?.signature?.strokes?.length && words(record.witness?.testimony) >= 30);
  }

  function stats() {
    const c = course();
    if (!isNvq(c)) return null;
    const evidence = read(EVIDENCE_KEY, []);
    const rpl = new Set(read(RPL_KEY, []));
    const completeCodes = new Set(evidence.filter(recordComplete).map((record) => record.ksbCode));
    rpl.forEach((code) => completeCodes.add(code));
    const clusters = Array.isArray(c.nvq?.clusters) ? c.nvq.clusters : [];
    const allRefs = new Set();
    const completeRefs = new Set();
    clusters.forEach((cluster) => {
      (cluster.criteriaRefs || []).forEach((ref) => allRefs.add(ref));
      if (completeCodes.has(cluster.code)) (cluster.criteriaRefs || []).forEach((ref) => completeRefs.add(ref));
    });
    const acTotal = Number(c.nvq?.criteriaCount) || allRefs.size;
    const acDone = completeRefs.size;
    const acProgress = acTotal ? clamp((acDone / acTotal) * 100) : 0;
    const entries = read(HOURS_KEY, []);
    const logged = entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
    const glhTarget = Number(c.nvq?.glhTotal ?? c.qualification?.glh) || 0;
    const glhProgress = glhTarget ? clamp((logged / glhTarget) * 100) : 0;
    const unitGlh = new Map((c.nvq?.units || []).map((unit) => [String(unit.number), Number(unit.glh) || 0]));
    const unitStats = new Map((c.units || []).map((unit) => {
      const loggedUnit = entries.filter((entry) => entry.unitId === unit.id).reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
      const target = unitGlh.get(String(unit.number)) || 0;
      return [unit.id, { logged: loggedUnit, target, progress: target ? clamp((loggedUnit / target) * 100) : 0 }];
    }));
    return { c, acTotal, acDone, acProgress, logged, glhTarget, glhProgress, unitStats };
  }

  function textSwap(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement?.closest('script,style')) return;
      let text = node.nodeValue || '';
      text = text.replace(/Off The Job/g, 'Guided Learning Hours')
        .replace(/Off-the-job training/g, 'Guided learning hours')
        .replace(/off-the-job training/g, 'guided learning hours')
        .replace(/off-the-job/g, 'guided learning')
        .replace(/\bOTJ\b/g, 'GLH')
        .replace(/\bKSBs\b/g, 'ACs')
        .replace(/\bKSB\b/g, 'AC');
      if (text !== node.nodeValue) node.nodeValue = text;
    });
  }

  function apply() {
    scheduled = false;
    const s = stats();
    document.documentElement.classList.toggle('evia-nvq-course', Boolean(s));
    if (!s) return;

    const row = document.querySelector('.progress-row');
    if (row) {
      row.classList.add('nvq-progress-row');
      [...row.querySelectorAll('.progress-arch')].forEach((arch) => {
        const label = arch.querySelector('.arch-label');
        const code = (label?.textContent || '').trim();
        if (code === 'EPA') { arch.hidden = true; return; }
        arch.hidden = false;
        const number = arch.querySelector('.arch-number');
        if (code === 'KSB' || code === 'AC') {
          setText(label, 'AC');
          setText(number, `${s.acProgress}%`);
          setAttr(arch, 'aria-label', `Assessment criteria evidence: ${s.acProgress}%. Open AC details`);
        } else if (code === 'OTJ' || code === 'GLH') {
          setText(label, 'GLH');
          setText(number, `${s.glhProgress}%`);
          setAttr(arch, 'aria-label', `Guided learning hours: ${s.glhProgress}%. Open GLH details`);
        }
      });
    }

    textSwap(document.body);

    document.querySelectorAll('.progress-summary-main').forEach((main) => {
      const label = main.querySelector('span')?.textContent || '';
      const strong = main.querySelector('strong');
      const small = main.querySelector('small');
      if (/AC evidence|Portfolio coverage/i.test(label) && strong) {
        setText(strong, `${s.acProgress}%`);
        setText(small, `${s.acDone} of ${s.acTotal} ACs evidenced`);
      }
      if (/Guided Learning|GLH/i.test(label) && strong) {
        setText(strong, `${s.glhProgress}%`);
        setText(small, `${fmt(s.logged)} of ${fmt(s.glhTarget)} GLH recorded`);
      }
    });

    document.querySelectorAll('.option-row').forEach((button) => {
      const text = button.textContent || '';
      if (/EPA Practice/i.test(text)) button.hidden = true;
      if (/Guided Learning Hours/i.test(text)) {
        setText(button.querySelector('small'), `${fmt(s.logged)} of ${fmt(s.glhTarget)} hours recorded`);
      }
    });

    document.querySelectorAll('.unit-otj-item').forEach((item) => {
      const unitView = item.closest('.progress-workspace, .view-content, .menu-panel');
      const pageText = unitView?.textContent || document.body.textContent || '';
      const unit = (s.c.units || []).find((candidate) => pageText.includes(candidate.title));
      if (!unit) return;
      const u = s.unitStats.get(unit.id);
      if (!u) return;
      setText(item.querySelector('.ksb-description-copy strong'), `Record GLH ${fmt(u.logged)}/${u.target ? fmt(u.target) : '—'}hrs`);
      setText(item.querySelector('.ksb-description-copy small'), u.target ? 'Guided learning allocated to this Unit' : 'No Unit GLH target supplied');
      setText(item.querySelector('.status-dot'), u.progress >= 100 ? '✓' : '');
    });

    document.querySelectorAll('.unit-otj-mini').forEach((mini) => {
      const rowEl = mini.closest('button, article, li, .option-row');
      const rowText = rowEl?.textContent || '';
      const unit = (s.c.units || []).find((candidate) => rowText.includes(candidate.title));
      setText(mini.querySelector('b'), 'GLH');
      if (!unit) return;
      const u = s.unitStats.get(unit.id);
      if (!u) return;
      setAttr(mini, 'aria-label', `GLH: ${u.progress}% complete for this Unit`);
      const pie = mini.querySelector('i');
      if (pie) {
        pie.classList.toggle('nvq-glh-complete', u.progress >= 100);
        setText(pie, u.progress >= 100 ? '✓' : '');
        const background = u.progress < 100
          ? `conic-gradient(from -90deg, #efc33d 0deg ${u.progress * 3.6}deg, rgba(80,79,75,.2) ${u.progress * 3.6}deg 360deg)`
          : 'transparent';
        if (pie.style.background !== background) pie.style.background = background;
      }
    });

    document.querySelectorAll('.onboarding-panel h1').forEach((title) => {
      if (/Four arches/i.test(title.textContent || '')) setText(title, 'Three arches. One clear view.');
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('storage', schedule);
  document.addEventListener('click', () => setTimeout(schedule, 0), true);
  schedule();
})();
