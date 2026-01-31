import { el, toggleSettings, closeSettings } from "./ui_helpers.js";
import { initList } from "./ui_list.js";
import { initPanel } from "./ui_panel.js";

/**
 * Orchestrator for the UI. Initializes list and panel modules.
 */
export function initUI({ rootId = 'app', a11yId = 'a11y-live', data }) {
  const root = document.getElementById(rootId);
  const a11yLive = document.getElementById(a11yId);

  const uiState = {
    discoverMode: false,
    discoverResults: [],
    discoverLoading: false
  };

  function announce(message) {
    if (a11yLive) {
      a11yLive.textContent = '';
      setTimeout(() => a11yLive.textContent = message, 50);
    }
  }

  const app = el('div', { class: 'app' });
  root.innerHTML = '';
  root.append(app);

  function renderAll() {
    listModule.render();
    panelModule.render();
  }

  // Modules
  const listContainer = el('div', { class: 'list', id: 'list', role: 'list', 'aria-live': 'polite' });
  const panelContainer = el('div', { class: 'panel', id: 'panel' });

  const listModule = initList({
    container: listContainer,
    data,
    onSelect: (id) => {
      data.startEdit(id);
      renderAll();
    }
  });

  const panelModule = initPanel({
    container: panelContainer,
    appElement: app,
    data,
    uiState,
    onUpdate: renderAll,
    announce
  });

  // Topbar
  // theme helper: apply dark high-contrast mode by toggling class on documentElement and persisting
  function applyTheme(enabled) {
    try {
      if (enabled) document.documentElement.classList.add('dark-contrast');
      else document.documentElement.classList.remove('dark-contrast');
      localStorage.setItem('theaterlog.darkHighContrast', enabled ? '1' : '0');
    } catch (e) { console.warn('theme persist failed', e); }
  }
  // initialize theme from storage
  try {
    const saved = localStorage.getItem('theaterlog.darkHighContrast') === '1';
    applyTheme(saved);
  } catch (e){}

  const topbar = el('div', { class: 'topbar' },
    el('div', { class: 'brand' },
      // golden star logo
      el('div', { class: 'logo', role: 'img', 'aria-label': 'Theaterlog logo' },
        el('span', { class: 'icon', style: 'font-size:24px;line-height:1;' }, '★')
      )
    ),
    el('div', { class: 'controls', role: 'tablist', 'aria-label': 'Hoofdtabbladen' },
      el('button', { class: 'btn', title: 'Nieuw', onClick: () => { data.showAddForm(); renderAll(); announce('Nieuw formulier geopend'); } }, el('span', { class: 'icon', style: 'font-size:22px; line-height:1;' }, '＋')),
      el('div', { style: 'position:relative;' },
        el('button', { class: 'btn', title: 'Instellingen', id: 'settings_btn', onClick: (e) => { e.stopPropagation(); toggleSettings(); } }, el('span', { class: 'icon' }, '⚙️')),
        el('div', { id: 'settings_menu', role: 'menu', 'aria-hidden': 'true', style: 'position:absolute;right:0;top:56px;display:none;min-width:240px;border-radius:10px;padding:8px;z-index:60' },
          el('div', { style: 'padding:6px 8px;display:flex;flex-direction:column;gap:8px;' },
            el('button', { class: 'btn ghost', style: 'justify-content:flex-start', onClick: () => {
              closeSettings();
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/json';
              input.onchange = async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                  const payload = JSON.parse(await file.text());
                  const arr = Array.isArray(payload) ? payload : (Array.isArray(payload.reviews) ? payload.reviews : []);
                  // Use data.importArray if available so we merge safely instead of replacing
                  if (typeof data.importArray === 'function') {
                    const res = data.importArray(arr);
                    renderAll();
                    announce(`${res.added} items geïmporteerd, ${res.skipped} overgeslagen`);
                  } else {
                    // fallback: add individually (legacy)
                    arr.forEach(it => data.addReview(it));
                    renderAll();
                    announce('Items geïmporteerd');
                  }
                } catch (err) { alert('Fout bij importeren'); }
              };
              input.click();
            } }, 'Importeren'),
            el('button', { class: 'btn ghost', style: 'justify-content:flex-start', onClick: () => { data.exportJSON(); closeSettings(); } }, 'Exporteren'),
            el('button', { class: 'btn ghost', style: 'justify-content:flex-start', onClick: async () => { 
                // Offer choice: e-mail or download; call data.shareReport with explicit mode
                try {
                  const useEmail = confirm('Deel rapport per e-mail? OK = E-mail, Annuleren = Download');
                  const ok = await data.shareReport(useEmail ? 'email' : 'download');
                  if (ok) announce('Rapport gedeeld of gedownload');
                  else alert('Kon rapport niet genereren');
                } catch (e) {
                  alert('Kon rapport niet genereren');
                } finally {
                  closeSettings();
                }
              } }, 'Deel rapport'),
            // Dark high-contrast toggle
            el('label', { style: 'display:flex;align-items:center;gap:8px;margin-top:6px;cursor:pointer;padding:6px;border-radius:8px;' },
              (() => {
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.id = 'dark_switch';
                chk.checked = localStorage.getItem('theaterlog.darkHighContrast') === '1';
                chk.title = 'Donker hoog contrast';
                chk.setAttribute('aria-label', 'Donker hoog contrast');
                chk.addEventListener('change', (e) => applyTheme(e.target.checked));
                return chk;
              })(),
              el('span', { class: 'icon', title: 'Donker hoog contrast', 'aria-hidden': 'true', style: 'font-size:20px;line-height:1;' }, '🌓')
            )
          )
        )
      )
    )
  );

  const searchRow = el('div', { class: 'row' },
    el('div', { class: 'search' },
      el('span', { class: 'icon' }, '🔎'),
      el('input', { placeholder: 'Zoek titel, artiest, locatie of tekst', oninput: e => { data.setFilter(e.target.value); renderAll(); } })
    ),
    el('select', { class: 'select', onchange: e => { data.setSort(e.target.value); renderAll(); } },
      el('option', { value: 'newest' }, 'Nieuwste'),
      el('option', { value: 'oldest' }, 'Oudste'),
      el('option', { value: 'rating' }, 'Score')
    )
  );

  const content = el('div', { class: 'content' }, listContainer, panelContainer);
  app.append(topbar, searchRow, content);

  renderAll();

  return { renderList: listModule.render, renderPanel: panelModule.render, announce, closeSettings };
}

/* Tombstones:
   // removed function renderList() {} (moved to ui_list.js)
   // removed function openDetail() {} (moved to ui_panel.js via onSelect)
   // removed function renderPanel() {} (moved to ui_panel.js)
   // removed function resetForm() {} (deprecated by re-render logic)
   // removed function submitForm() {} (moved to ui_panel.js)
   // removed function performDiscoverSearch() {} (moved to ui_panel.js)
   // removed discoverMode variables (moved to internal uiState)
*/