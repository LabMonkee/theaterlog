/*
  Facade data module (data.js)
  Refactored: the heavy implementation has been moved to data_store.js to keep this file small.
  Tombstones below mark removed/relocated functions for developer reference.
*/

import { initData as initDataImpl } from "./data_store.js";

export function initData(deps){
  return initDataImpl(deps);
}

/* Tombstones — moved to data_store.js:
   // removed large implementation block that contained:
   // - state variables (reviews, filterText, sortBy, selected, etc.)
   // - persistLastLocation(), persist(), getState()
   // - searchExternalShows()
   // - setFilter(), setSort(), query()
   // - computeStatus()
   // - addReview(), updateReview(), removeReview(), getById()
   // - importShows(), importArray()
   // - exportJSON(), exportReport()
   // - shareReport()
   // - startEdit(), showAddForm(), closePanel()
   // - getLastLocation()
*/