(() => {
  'use strict';

  const stopWords = new Set([
    'a','an','and','are','as','at','be','been','being','by','for','from','in','into','is','it','of','on','or','that','the','their','them','these','this','those','to','using','when','where','which','while','with','within','work','working','given','relating','relevant','required','requirements','appropriate'
  ]);

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function stemToken(token) {
    let value = token;
    if (value.length > 6 && value.endsWith('ing')) value = value.slice(0, -3);
    else if (value.length > 5 && value.endsWith('ed')) value = value.slice(0, -2);
    else if (value.length > 5 && value.endsWith('es')) value = value.slice(0, -2);
    else if (value.length > 4 && value.endsWith('s')) value = value.slice(0, -1);
    return value;
  }

  function normaliseWord(word) {
    const token = String(word || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (token.length <= 1 || stopWords.has(token)) return '';
    return stemToken(token);
  }

  function comparableWords(text) {
    return new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .map(normaliseWord)
        .filter(Boolean)
    );
  }

  function boldNonMatchingWords(text, otherText) {
    const otherWords = comparableWords(otherText);
    return String(text || '')
      .split(/([A-Za-z0-9]+)/g)
      .map((part) => {
        const token = normaliseWord(part);
        const safe = escapeHtml(part);
        if (!token || otherWords.has(token)) return safe;
        return `<b>${safe}</b>`;
      })
      .join('');
  }

  function readPair(small) {
    const parts = [''];
    small.childNodes.forEach((node) => {
      if (node.nodeName === 'BR') {
        parts.push('');
        return;
      }
      parts[parts.length - 1] += node.textContent || '';
    });
    return parts.map((part) => part.trim()).filter(Boolean).slice(0, 2);
  }

  function stylePair(row) {
    const small = row.querySelector('small');
    if (!small || small.dataset.nvqDiffApplied === 'true') return;
    const [left, right] = readPair(small);
    if (!left || !right) return;

    small.innerHTML = [
      `<span class="nvq-diff-line">${boldNonMatchingWords(left, right)}</span>`,
      `<span class="nvq-diff-line">${boldNonMatchingWords(right, left)}</span>`,
    ].join('');
    small.dataset.nvqDiffApplied = 'true';
  }

  function applyDifferences() {
    document.querySelectorAll('#evia-nvq-builder-overlay .nvq-review-row, #evia-nvq-builder-overlay .nvq-match-row')
      .forEach(stylePair);
  }

  function addStyles() {
    if (document.getElementById('evia-nvq-diff-style')) return;
    const style = document.createElement('style');
    style.id = 'evia-nvq-diff-style';
    style.textContent = `
      #evia-nvq-builder-overlay .nvq-diff-line { display: block; }
      #evia-nvq-builder-overlay .nvq-diff-line + .nvq-diff-line { margin-top: 0.72rem; }
      #evia-nvq-builder-overlay .nvq-diff-line b { font-weight: 750; color: inherit; }
    `;
    document.head.appendChild(style);
  }

  addStyles();

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-analyse-nvq], [data-rerun-mapping]')) {
      setTimeout(applyDifferences, 0);
    }
  });

  window.addEventListener('load', () => setTimeout(applyDifferences, 0), { once: true });
})();
