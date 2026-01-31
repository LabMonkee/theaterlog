import { el, ratingField } from "./ui_helpers.js";

/**
 * Logic for the right-hand panel: Details, Add/Edit Form, and Discover view.
 */
export function initPanel({ container, appElement, data, uiState, onUpdate, announce }) {
  
  async function performDiscoverSearch(query) {
    if (!query) return;
    uiState.discoverLoading = true;
    render();
    try {
      uiState.discoverResults = await data.searchExternalShows(query);
      announce(`${uiState.discoverResults.length} voorstellingen gevonden`);
    } catch (e) {
      alert("Fout bij ophalen agenda. Controleer de spelling van de theaternaam of probeer een andere locatie.");
      uiState.discoverResults = [];
    } finally {
      uiState.discoverLoading = false;
      render();
    }
  }

  // helper to create a minimal ICS file and trigger download
  function createAndDownloadICS(item){
    try{
      const dtstart = item.date ? new Date(item.date) : new Date();
      const dtend = new Date(dtstart.getTime() + 2*60*60*1000); // default 2h event
      function toICSTime(d){ return d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z'; }
      const uid = `theaterlog-${Math.random().toString(36).slice(2,10)}@local`;
      const title = (item.title || 'Voorstelling').replace(/\r?\n/g,' ');
      const description = ((item.body || '') + '\n' + (item.info || '')).replace(/\r?\n/g,' ');
      const location = item.location || '';
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//theaterlog//NL',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toICSTime(new Date())}`,
        `DTSTART:${toICSTime(dtstart)}`,
        `DTEND:${toICSTime(dtend)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (title.replace(/[^\w\d\-]+/g,'_') || 'voorstelling') + '.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(err){
      console.error('ICS error', err);
      alert('Kon niet naar agenda exporteren.');
    }
  }

  function submitForm(editingItem) {
    const title = container.querySelector('#f_title')?.value.trim() || '';
    if (!title) { alert('Titel is verplicht'); return; }
    
    const director = container.querySelector('#f_director')?.value.trim() || '';
    const location = container.querySelector('#f_location')?.value.trim() || '';
    const info = container.querySelector('#f_info')?.value.trim() || '';
    const dateInput = container.querySelector('#f_date')?.value;
    const date = dateInput ? new Date(dateInput).getTime() : Date.now();
    const tagsRaw = container.querySelector('#f_tags')?.value.trim() || '';
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const body = container.querySelector('#f_body')?.value.trim() || '';
    const starWrap = container.querySelector('#starwrap')?.parentElement;
    const rating = starWrap && starWrap.getValue ? starWrap.getValue() : 0;

    if (editingItem) {
      data.updateReview(editingItem.id, { title, director, location, info, date, tags, body, rating });
      announce('Review opgeslagen');
    } else {
      data.addReview({ title, director, location, info, date, tags, body, rating });
      announce('Review opgeslagen');
    }
    
    data.closePanel();
    onUpdate();
  }

  function renderDiscover() {
    container.innerHTML = '';
    container.append(
      el('div', { class: 'title-row' },
        el('div', { class: 'title' }, 'Voorstellingen ontdekken'),
        el('button', { class: 'btn ghost', onClick: () => { uiState.discoverMode = false; onUpdate(); } }, el('span', { class: 'icon', style: 'font-size:20px; line-height:1;' }, '✕'))
      ),
      el('div', { class: 'sub', style: 'margin-bottom:12px' }, 'Zoek op theaternaam of plak een directe URL naar een agenda.'),
      el('div', { class: 'search', style: 'margin-bottom:16px; border: 1px solid var(--accent); flex:none;' },
        el('input', {
          id: 'discover_search',
          placeholder: 'Naam theater of volledige URL',
          onkeydown: (e) => { if (e.key === 'Enter') performDiscoverSearch(e.target.value); }
        }),
        el('button', { class: 'btn primary', style: 'min-height:36px; padding:0 12px;', onClick: () => performDiscoverSearch(container.querySelector('#discover_search').value) }, 'Zoek')
      )
    );

    if (uiState.discoverLoading) {
      container.append(el('div', { class: 'empty' }, 'Bezig met ophalen...'));
      return;
    }

    if (!uiState.discoverResults || uiState.discoverResults.length === 0) {
      container.append(el('div', { class: 'empty' }, 'Geen resultaten. Zoek op een theaternaam of stad.'));
      return;
    }

    const list = el('div', { style: 'flex:1; overflow:auto; display:flex; flex-direction:column; gap:8px;' });
    uiState.discoverResults.forEach(item => {
      const isAdded = data.getState().reviews.some(r => r.title === item.title && r.date === item.date);
      list.append(
        el('div', { class: 'import-item' },
          el('div', { class: 'info' },
            el('div', { class: 'title', style: 'font-size:17px;' }, item.title),
            el('div', { class: 'sub' }, item.date ? new Date(item.date).toLocaleDateString() : 'Geen datum')
          ),
          // action buttons: add to list + add to calendar
          el('div', { style: 'display:flex;gap:8px;align-items:center;' },
            el('button', {
              class: `btn-add ${isAdded ? 'added' : ''}`,
              title: isAdded ? 'Al in lijst' : 'Voeg toe aan lijst',
              onclick: (e) => {
                if (isAdded) return;
                data.addReview(item);
                e.currentTarget.classList.add('added');
                e.currentTarget.textContent = '✓';
                announce(`${item.title} toegevoegd`);
                onUpdate();
              }
            }, isAdded ? '✓' : '＋'),
            el('button', {
              class: 'btn ghost',
              title: 'Toevoegen aan agenda',
              onclick: (e) => {
                createAndDownloadICS(item);
                announce('Kalenderbestand gedownload');
              },
              style: 'min-width:40px; padding:8px; border-radius:8px;'
            }, '📅')
          )
        )
      );
    });
    container.append(list);
  }

  function render() {
    container.innerHTML = '';
    container.setAttribute('role', 'region');
    container.setAttribute('tabindex', '-1');

    const state = data.getState();

    if (uiState.discoverMode) {
      container.style.display = '';
      container.classList.add('fullscreen');
      appElement.classList.add('add-mode');
      renderDiscover();
      return;
    }

    appElement.classList.toggle('add-mode', state.showAdd || state.editing);

    if (!state.showAdd && !state.selected) {
      container.style.display = 'none';
      container.classList.remove('fullscreen');
      return;
    } else {
      container.style.display = '';
    }

    if (state.showAdd || state.editing) container.classList.add('fullscreen');
    else container.classList.remove('fullscreen');

    const panelTop = el('div', { class: 'title-row', style: 'align-items:center;' },
      el('div', {}, ''),
      el('div', {}, el('button', { class: 'btn ghost', onClick: () => { data.closePanel(); uiState.discoverMode = false; onUpdate(); } }, el('span', { class: 'icon', style: 'font-size:20px; line-height:1;' }, '✕')))
    );
    container.append(panelTop);

    if (state.selected && !state.editing) {
      const r = data.getById(state.selected);
      if (!r) { data.closePanel(); onUpdate(); return; }
      const status = data.computeStatus(r);
      const statusClass = 'status-' + String(status).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      container.append(
        el('div', { class: 'title-row' },
          el('div', {},
            el('div', { class: 'title' }, r.title),
            el('div', { class: 'sub', style: 'margin-top:6px; font-weight:700;' }, r.director || 'Naam artiest of theatergroep onbekend'),
            el('div', { class: 'sub', style: 'margin-top:4px; font-weight:400; color:var(--gold);' }, r.location || '')
          ),
          el('div', { style: 'display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:120px;' },
            el('div', { class: 'sub' }, r.date ? new Date(r.date).toLocaleDateString() : ''),
            el('div', {}, el('div', { class: `tag ${statusClass}` }, status))
          )
        ),
        (function(){
          const infoText = r.info || '';
          const infoNode = el('div', { class: 'sub', style: 'margin-top:8px; opacity:0.8; font-style:italic;' });
          // detect a URL (http(s) or www)
          const urlMatch = infoText.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/i);
          if(urlMatch){
            let href = urlMatch[0];
            if(!/^https?:\/\//i.test(href)) href = 'https://' + href;
            const link = el('a', { href: href, target: '_blank', rel: 'noopener noreferrer', style: 'color:var(--accent); text-decoration:underline;' }, infoText);
            infoNode.append(link);
          } else {
            infoNode.append(infoText || '');
          }
          return infoNode;
        })(),
        el('div', { style: 'margin-top:8px;' }, el('div', { class: 'stars' }, '★'.repeat(Math.round(r.rating || 0)))),
        el('div', { class: 'field' }, el('label', {}, 'Tags'), el('div', { class: 'tags' }, ...(r.tags || []).map(t => el('div', { class: 'tag' }, t)))),
        el('div', { class: 'field' }, el('label', {}, 'Notities'), el('div', { style: 'white-space:pre-wrap;' }, r.body || el('div', { class: 'sub' }, 'Geen notities'))),
        el('div', { class: 'row-actions' },
          el('button', { class: 'btn', onClick: () => { data.closePanel(); onUpdate(); } }, 'Sluiten'),
          el('button', { class: 'btn', onClick: () => { createAndDownloadICS(r); announce('Kalenderbestand gedownload'); } }, 'Toevoegen aan agenda'),
          el('button', { class: 'btn', onClick: () => { data.startEdit(state.selected); onUpdate(); } }, 'Bewerk'),
          el('button', { class: 'btn danger', onClick: () => { data.removeReview(r.id); onUpdate(); } }, 'Verwijder')
        )
      );
      setTimeout(() => container.focus(), 80);
      return;
    }

    // Form mode
    const editingItem = state.selected && state.editing ? data.getById(state.selected) : null;
    // build form fields and keep references for dynamic preview of info links
    const titleInput = el('input', { type: 'text', id: 'f_title', value: editingItem ? editingItem.title : '', placeholder: 'Naam van de voorstelling' });
    const directorInput = el('input', { type: 'text', id: 'f_director', value: editingItem ? editingItem.director : '', placeholder: 'Optioneel' });
    const locationInput = el('input', { type: 'text', id: 'f_location', value: editingItem ? (editingItem.location || '') : (data.getLastLocation?.() || ''), placeholder: 'Bv. Stadsschouwburg' });
    const infoInput = el('input', { type: 'text', id: 'f_info', value: editingItem ? (editingItem.info || '') : '', placeholder: 'Extra info of link' });
    const dateInput = el('input', { type: 'date', id: 'f_date', value: editingItem && editingItem.date ? new Date(editingItem.date).toISOString().slice(0, 10) : '' });
    const tagsInput = el('input', { type: 'text', id: 'f_tags', value: editingItem ? (editingItem.tags || []).join(', ') : '', placeholder: 'drama, komedie, fysiek' });
    const bodyTextarea = el('textarea', { id: 'f_body', placeholder: 'Schrijf hier je ervaringen...' }, editingItem ? (editingItem.body || '') : '');

    // preview area for clickable links (under the Info field)
    const infoPreview = el('div', { class: 'sub', style: 'margin-top:6px; margin-bottom:12px; opacity:0.95;' }, '');

    // helper to detect URL and render clickable anchor or plain text
    function updateInfoPreview() {
      const v = (infoInput.value || '').trim();
      infoPreview.innerHTML = '';
      if (!v) return;
      const urlMatch = v.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/i);
      if (urlMatch) {
        let href = urlMatch[0];
        if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
        const a = el('a', { href: href, target: '_blank', rel: 'noopener noreferrer', style: 'color:var(--accent); text-decoration:underline;' }, v);
        infoPreview.append(a);
      } else {
        // not a URL: show plain text (keeps same look as other subtexts)
        infoPreview.textContent = v;
      }
    }
    infoInput.addEventListener('input', updateInfoPreview);
    // initialize preview with existing value
    setTimeout(updateInfoPreview, 0);

    const form = el('div', {},
      el('div', { class: 'field' }, el('label', {}, 'Titel'), titleInput),
      el('div', { class: 'field' }, el('label', {}, 'Naam van artiest of theatergroep'), directorInput),
      el('div', { class: 'field' }, el('label', {}, 'Lokatie'), locationInput),
      el('div', { class: 'field' }, el('label', {}, 'Info'), infoInput, infoPreview),
      el('div', { class: 'field' }, el('label', {}, 'Datum (bezoek)'), dateInput),
      ratingField(editingItem ? editingItem.rating : 0),
      el('div', { class: 'field' }, el('label', {}, 'Tags (komma-gescheiden)'), tagsInput),
      el('div', { class: 'field' }, el('label', {}, 'Notities (jouw review / verslag)'), bodyTextarea),
      el('div', { class: 'row-actions' },
        el('button', { class: 'btn', onClick: () => { if (editingItem) { data.removeReview(editingItem.id); data.closePanel(); announce('Review verwijderd'); onUpdate(); } } }, 'Verwijder'),
        el('button', { class: 'btn', onClick: () => { data.closePanel(); onUpdate(); } }, 'Sluiten'),
        el('button', { class: 'btn primary', onClick: () => { submitForm(editingItem); } }, 'Opslaan')
      )
    );
    container.append(form);
    setTimeout(() => container.querySelector('#f_title')?.focus(), 120);
  }

  return { render };
}