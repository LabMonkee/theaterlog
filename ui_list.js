import { el } from "./ui_helpers.js";

/**
 * Logic for rendering the list of reviews on the left/main screen.
 */
export function initList({ container, data, onSelect }) {
  function render() {
    container.innerHTML = '';
    const items = data.query();

    if (items.length === 0) {
      container.append(el('div', { class: 'empty' }, 'Geen reviews gevonden — voeg er een toe.'));
      return;
    }

    for (const r of items) {
      const status = data.computeStatus(r);
      const statusClass = 'status-' + String(status).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      const card = el('div', {
        class: `review-card ${statusClass}`,
        role: 'listitem',
        tabindex: '0',
        onclick: () => onSelect(r.id),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } },
        'aria-label': `${r.title} — ${r.director || ''}. ${r.info || ''}. Status: ${status}`
      },
        el('div', { class: 'meta' },
          el('div', { class: 'title-row' },
            el('div', {},
              el('div', { class: 'title' }, r.title),
              el('div', { class: 'sub', style: 'margin-top:6px; font-weight:700;' }, r.director || '—'),
              el('div', { class: 'sub', style: 'margin-top:4px; color:var(--muted); font-weight:400;' }, r.location || '—')
            ),
            el('div', { style: 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:110px;' },
              el('div', { class: 'sub', style: 'text-align:right;' }, r.date ? new Date(r.date).toLocaleDateString() : ''),
              el('div', {}, el('div', { class: 'tag', style: 'margin-top:4px;' }, status)),
              el('div', {}, el('div', { class: 'stars' }, '★'.repeat(Math.round(r.rating || 0)) || '—'))
            )
          ),
          el('div', { class: 'tags' },
            ...(r.tags || []).map(t => el('div', { class: 'tag' }, t))
          )
        )
      );
      container.append(card);
    }
  }

  return { render };
}