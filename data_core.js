/*
  data_core.js

  Tombstone: large implementation moved to data_core_impl.js to keep this file small
  and make future maintenance easier.

  // removed full initData implementation — moved to ./data_core_impl.js
  // removed functions: persistLastLocation(), persist(), getState(), searchExternalShows()
  // removed: setFilter(), setSort(), query(), computeStatus()
  // removed CRUD: addReview(), updateReview(), removeReview(), getById()
  // removed import/export: importShows(), importArray(), exportJSON(), exportReport(), shareReport()
  // removed UI actions: startEdit(), showAddForm(), closePanel()
  // removed getLastLocation()
*/

import { initData as initDataImpl } from "./data_core_impl.js";

export function initData(deps){
  return initDataImpl(deps);
}