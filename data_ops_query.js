/**
 * Logic for filtering, sorting and status computation.
 */

export function computeStatus(r) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
  const d = r.date || 0;
  
  // If user already filled score or notes -> seen
  if ((r.rating && r.rating > 0) || (r.body && r.body.trim())) return 'Gezien';
  // If event is today -> needs filling
  if (d >= startOfToday && d <= endOfToday) return 'Invullen';
  // If event is in the future -> planned
  if (d > endOfToday) return 'Gepland';
  // Past events without notes/rating
  return 'Nog invullen';
}

export function performQuery(reviews, { filterText, filterTag, sortBy }) {
  let items = reviews.slice();
  
  if (filterText) {
    const q = filterText.toLowerCase();
    items = items.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.director || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q) ||
      (r.info || '').toLowerCase().includes(q) ||
      (r.body || '').toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  
  if (filterTag) {
    items = items.filter(r => (r.tags || []).includes(filterTag));
  }
  
  if (sortBy === 'newest') items.sort((a, b) => (b.date || 0) - (a.date || 0));
  else if (sortBy === 'oldest') items.sort((a, b) => (a.date || 0) - (b.date || 0));
  else if (sortBy === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  return items;
}