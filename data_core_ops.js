/*
  data_core_ops.js
  Main logic orchestrator for data operations.
  Heavier functional logic moved to:
  - data_ops_query.js (Filtering/Sorting/Status)
  - data_ops_io.js (Import/Export/Sharing)
*/

import { computeStatus, performQuery } from "./data_ops_query.js";
import { searchExternalShows, handleImportArray, generateCSV, performShareReport } from "./data_ops_io.js";

export function createInitData({ loadReviews, saveReviews, nanoid, fetchTheaterShows }){
  let reviews = loadReviews() || [];
  let filterText = '';
  let filterTag = '';
  let sortBy = 'newest';
  let selected = null;
  let showAdd = false;
  let editing = false;

  // remember last used location across sessions
  const LAST_LOCATION_KEY = 'theaterlog.lastLocation.v1';
  let lastLocation = (function(){
    try{ return localStorage.getItem(LAST_LOCATION_KEY) || ''; }catch(e){ return ''; }
  })();

  function persistLastLocation(v){
    lastLocation = v || '';
    try{ localStorage.setItem(LAST_LOCATION_KEY, lastLocation); }catch(e){}
  }

  function persist(){ saveReviews(reviews); }

  function getState(){ return { reviews, filterText, filterTag, sortBy, selected, showAdd, editing, lastLocation }; }

  // removed function searchExternalShows() {} -> moved to data_ops_io.js
  const searchExternal = (q) => searchExternalShows(q, fetchTheaterShows);

  function setFilter(v){ filterText = v || ''; }
  function setSort(v){ sortBy = v || 'newest'; }

  // removed function query() {} logic -> moved to data_ops_query.js
  function query(){
    return performQuery(reviews, { filterText, filterTag, sortBy });
  }

  // removed function computeStatus() {} -> moved to data_ops_query.js
  const getStatus = (r) => computeStatus(r);

  function addReview(item){
    // conservative duplicate detection
    try {
      const title = item && item.title ? String(item.title).trim().toLowerCase() : '';
      const dateVal = item && item.date ? (typeof item.date === 'number' ? item.date : (new Date(item.date)).getTime()) : null;

      const duplicate = reviews.some(r => {
        const rTitle = (r.title||'').trim().toLowerCase();
        if(!title || rTitle !== title) return false;
        const rDate = r.date || null;
        if(!rDate && !dateVal) return true;
        if(rDate && dateVal){
          const rd = new Date(rDate);
          const nd = new Date(dateVal);
          return rd.getFullYear() === nd.getFullYear() && rd.getMonth() === nd.getMonth() && rd.getDate() === nd.getDate();
        }
        return false;
      });

      if(duplicate) return null;

      const newItem = { id: nanoid(), ...item };
      reviews.push(newItem);
      if(item && item.location) persistLastLocation(item.location);
      persist();
      return newItem;
    } catch (e) {
      const newItem = { id: nanoid(), ...item };
      reviews.push(newItem);
      if(item && item.location) persistLastLocation(item.location);
      persist();
      return newItem;
    }
  }

  function updateReview(id, updates){
    reviews = reviews.map(r => r.id === id ? { ...r, ...updates } : r);
    if(updates && updates.location) persistLastLocation(updates.location);
    persist();
  }

  function removeReview(id){
    reviews = reviews.filter(r=> r.id !== id);
    persist();
  }

  function getById(id){ return reviews.find(r=> r.id === id); }

  // removed function importShows() {} -> merged logic into importArray/data_ops_io
  async function importShows(theaterId){
    const items = await searchExternal(theaterId);
    const res = importArray(items);
    return res.added > 0 ? reviews.slice(-res.added) : [];
  }

  // removed function importArray() {} logic -> moved to data_ops_io.js
  function importArray(arr){
    const res = handleImportArray(reviews, arr, { nanoid, onPersistLocation: persistLastLocation });
    reviews = res.newReviews;
    if (res.added > 0) persist();
    return { added: res.added, skipped: res.skipped };
  }

  // removed function exportJSON() {} -> logic moved here/helpers
  function exportJSON(){
    const data = JSON.stringify(reviews, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theaterlog.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // removed function exportReport() {} -> combined with shareReport using generateCSV
  async function exportReport(){
    const csv = generateCSV(reviews);
    return performShareReport(csv, 'download');
  }

  // removed function shareReport() {} logic -> moved to data_ops_io.js
  async function shareReport(mode = 'auto'){
    const csv = generateCSV(reviews);
    return performShareReport(csv, mode);
  }

  function startEdit(id){ selected = id; editing = true; showAdd = false; }
  function showAddForm(){ selected = null; editing = false; showAdd = true; }
  function closePanel(){ selected = null; editing = false; showAdd = false; }

  return {
    getState,
    query,
    computeStatus: getStatus,
    addReview,
    updateReview,
    removeReview,
    getById,
    importShows,
    importArray,
    exportJSON,
    exportReport,
    shareReport,
    startEdit,
    showAddForm,
    closePanel,
    setFilter,
    setSort,
    getLastLocation: () => lastLocation,
    searchExternalShows: searchExternal
  };
}