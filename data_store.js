import { initData as initDataCore } from "./data_core.js";

/*
  data_store.js
  Lightweight wrapper that keeps the same API surface while the full implementation
  has been moved to data_core.js for maintainability.
  
  Tombstones — implementation moved to data_core.js:
  // removed state variables (reviews, filterText, sortBy, selected, etc.)
  // removed persistLastLocation(), persist(), getState()
  // removed searchExternalShows()
  // removed setFilter(), setSort(), query()
  // removed computeStatus()
  // removed addReview(), updateReview(), removeReview(), getById()
  // removed importShows(), importArray()
  // removed exportJSON(), exportReport()
  // removed shareReport()
  // removed startEdit(), showAddForm(), closePanel()
  // removed getLastLocation()
*/

export function initData(deps){
  return initDataCore(deps);
}