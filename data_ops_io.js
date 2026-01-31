/**
 * Logic for Importing and Exporting data.
 */

export async function searchExternalShows(query, fetchTheaterShows) {
  const items = await fetchTheaterShows(query);
  return items.map(it => ({
    title: it.title || 'Onbekende voorstelling',
    director: it.director || '',
    location: it.theatre || '',
    info: it.body || query || '',
    body: '',
    date: it.date ? new Date(it.date).getTime() : null,
    tags: it.tags || [],
    rating: 0
  }));
}

export function handleImportArray(reviews, arr, { nanoid, onPersistLocation }) {
  if (!Array.isArray(arr)) return { added: 0, skipped: 0, newReviews: reviews };
  
  const currentReviews = [...reviews];
  const addedItems = [];
  let skipped = 0;

  for (const it of arr) {
    try {
      const title = (it && it.title) ? String(it.title).trim() : '';
      const dateVal = it && it.date ? (typeof it.date === 'number' ? it.date : (new Date(it.date)).getTime()) : null;

      const duplicate = currentReviews.some(r => {
        const rTitle = (r.title || '').trim().toLowerCase();
        const newTitle = title.trim().toLowerCase();
        if (!newTitle || rTitle !== newTitle) return false;
        const rDate = r.date || null;
        if (!rDate && !dateVal) return true;
        if (rDate && dateVal) {
          const rd = new Date(rDate);
          const nd = new Date(dateVal);
          return rd.getFullYear() === nd.getFullYear() && rd.getMonth() === nd.getMonth() && rd.getDate() === nd.getDate();
        }
        return false;
      });

      if (duplicate) {
        skipped++;
        continue;
      }

      const newItem = {
        id: nanoid(),
        title: title || (it && it.name) || 'Onbekende voorstelling',
        director: it.director || it.artiest || '',
        location: it.location || it.theatre || '',
        info: it.info || it.body || '',
        body: (it.body && typeof it.body === 'string') ? it.body : '',
        date: (dateVal !== null) ? dateVal : ((it && it.date) ? (new Date(it.date)).getTime() : Date.now()),
        tags: Array.isArray(it.tags) ? it.tags : (typeof it.tags === 'string' ? it.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        rating: (typeof it.rating === 'number') ? it.rating : 0
      };
      
      currentReviews.push(newItem);
      if (newItem.location && onPersistLocation) onPersistLocation(newItem.location);
      addedItems.push(newItem);
    } catch (e) {
      skipped++;
    }
  }
  return { added: addedItems.length, skipped, newReviews: currentReviews };
}

function esc(v, isNote = false) {
  if (v == null) return '';
  let s = String(v).replace(/\r?\n/g, ' ');
  if (isNote) {
    const max = 240;
    if (s.length > max) s = s.slice(0, max - 1) + '…';
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function generateCSV(reviews) {
  const source = Array.isArray(reviews) ? reviews.slice() : [];
  const rows = source.sort((a, b) => {
    const ra = (a && typeof a.rating === 'number') ? a.rating : 0;
    const rb = (b && typeof b.rating === 'number') ? b.rating : 0;
    if (rb !== ra) return rb - ra;
    return String((a && a.title) || '').localeCompare(String((b && b.title) || ''));
  }).map(r => {
    const ratingVal = (r && typeof r.rating === 'number') ? r.rating : 0;
    return [esc(r && r.title), esc(r && r.director), esc(ratingVal), esc((r && r.body) || '', true)].join(',');
  });
  const header = ['Voorstelling', 'Artiest', 'Score', 'Notitie'].join(',');
  return [header, ...rows].join('\r\n');
}

export async function performShareReport(csv, mode = 'auto') {
  const filename = 'theaterlog_rapport.csv';

  // download helper
  async function doDownload() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  if (mode === 'download') {
    return doDownload();
  }

  // Try to share as a file attachment when explicitly requested for email
  if (mode === 'email') {
    try {
      if (window.navigator?.canShare && typeof window.File === 'function') {
        const file = new File([csv], filename, { type: 'text/csv' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Theaterlog rapport', text: 'Zie bijgevoegde rapport' });
          return true;
        }
      }
    } catch (e) {
      console.warn('Share-as-file failed', e);
    }
    // If file attachment via Web Share API isn't available, fall back to downloading the file
    // (mailto cannot attach files from the browser reliably)
    return doDownload();
  }

  // Auto/Share: prefer native share with files, otherwise download
  try {
    if (window.navigator?.canShare && typeof window.File === 'function') {
      const file = new File([csv], filename, { type: 'text/csv' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Theaterlog rapport', text: 'Zie bijgevoegde rapport' });
        return true;
      }
    }
  } catch (e) { console.warn('Share failed', e); }

  return doDownload();
}