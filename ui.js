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
        el('div', { id: 'settings_menu', role: 'menu', 'aria-hidden': 'true', style: 'position:absolute;right:0;top:56px;display:none;min-width:320px;border-radius:10px;padding:8px;z-index:60' },
          el('div', { style: 'padding:6px 8px;display:flex;flex-direction:column;gap:8px;' },
            el('button', { class: 'btn ghost', style: 'justify-content:flex-start', onClick: () => {
              closeSettings();
              const input = document.createElement('input');
              input.type = 'file';
              // Accept JSON and common CSV/text formats so CSV files are selectable in file pickers
              input.accept = 'application/json, text/csv, .csv, text/plain';
              input.onchange = async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  let arr = [];
                  // Try JSON first
                  try {
                    const payload = JSON.parse(text);
                    arr = Array.isArray(payload) ? payload : (Array.isArray(payload.reviews) ? payload.reviews : []);
                  } catch (jerr) {
                    // If not JSON, try simple CSV parser (handles header + quoted fields)
                    function parseCSV(csvText){
                      // Normalize line endings and remove BOM if present
                      csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
                      if(!csvText) return [];
                      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
                      if(lines.length < 1) return [];
                      // parse header
                      const headerLine = lines.shift();
                      // simple CSV split that respects double quotes
                      const splitLine = (line) => {
                        const res = [];
                        let cur = '';
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                          const ch = line[i];
                          if (ch === '"' ) {
                            if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue; }
                            inQuotes = !inQuotes;
                            continue;
                          }
                          if (ch === ',' && !inQuotes) { res.push(cur); cur = ''; continue; }
                          cur += ch;
                        }
                        res.push(cur);
                        return res.map(s => s.trim());
                      };
                      const headers = splitLine(headerLine).map(h => h.replace(/^"|"$/g,'').trim());
                      return lines.map(l => {
                        const cols = splitLine(l).map(c => c.replace(/^"|"$/g,''));
                        const obj = {};
                        for (let i = 0; i < headers.length; i++) {
                          obj[headers[i]] = cols[i] || '';
                        }
                        return obj;
                      });
                    }

                    const csvRows = parseCSV(text);
                    // Map CSV columns to internal review shape (best-effort)
                    arr = csvRows.map(row => {
                      // Accept common Dutch headers used by the exporter: Voorstelling, Artiest, Score, Notitie
                      const title = row['Voorstelling'] || row['Title'] || row['Naam'] || '';
                      const director = row['Artiest'] || row['Artist'] || row['Director'] || '';
                      const ratingRaw = row['Score'] || row['Rating'] || row['Score'] || '';
                      const rating = Number((ratingRaw || '').replace(/[^0-9\.]/g, '')) || 0;
                      const body = row['Notitie'] || row['Notitie'] || row['Note'] || row['Notities'] || '';
                      return { title: title.trim(), director: director.trim(), rating, body: (body || '').trim(), date: null, tags: [] };
                    });
                  }

                  if (!Array.isArray(arr)) arr = [];

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
                } catch (err) {
                  console.error('Import error', err);
                  alert('Fout bij importeren. Bestand kon niet worden gelezen.');
                }
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
            // Help / User guide button
            el('button', { class: 'btn ghost', style: 'justify-content:flex-start', onClick: (e) => {
              const help = document.getElementById('settings_help_text');
              if(!help) return;
              const isHidden = help.style.display === 'none' || help.style.display === '';
              help.style.display = isHidden ? 'block' : 'none';
            } }, 'Gebruikershandleiding'),
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
            ),
            // Hidden help content (togglable)
            el('div', { id: 'settings_help_text', style: 'display:none;padding:8px;border-radius:8px;background:rgba(0,0,0,0.03);color:var(--card);font-size:13px;white-space:pre-wrap;overflow:auto;max-height:360px;margin-top:6px;' },
`Gebruikershandleiding: installeren & overzetten (smartphone)

Je data blijft op je telefoon. Volg deze korte stappen.

iPhone (Safari)
1. Open Theaterlog in Safari.
2. Tik op het Deel-icoon onderaan.
3. Kies 'Zet op beginscherm' → 'Voeg toe'.

Android (Chrome)
1. Open Theaterlog in Chrome.
2. Tik op de drie puntjes (menu).
3. Kies 'Toevoegen aan startscherm' of 'App installeren' → bevestig.

Gegevens overzetten
Oude telefoon: Instellingen → Exporteren → deel theaterlog.json.
Nieuwe telefoon: Instellingen → Importeren → selecteer theaterlog.json.

Tip: Maak af en toe een export voor een reservekopie.`)
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