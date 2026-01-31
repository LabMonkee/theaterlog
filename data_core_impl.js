/*
  data_core_impl.js

  Tombstone wrapper: the full implementation was moved to ./data_core_ops.js
  to make the codebase easier to maintain.

  The original large implementation has been removed from this file.
  Removed pieces include (examples/tombstones below):

  // removed function persistLastLocation() {}
  // removed function persist() {}
  // removed function getState() {}
  // removed function searchExternalShows() {}
  // removed function setFilter() {}
  // removed function setSort() {}
  // removed function query() {}
  // removed function computeStatus() {}
  // removed function addReview() {}
  // removed function updateReview() {}
  // removed function removeReview() {}
  // removed function getById() {}
  // removed function importShows() {}
  // removed function importArray() {}
  // removed function exportJSON() {}
  // removed function exportReport() {}
  // removed function shareReport() {}
  // removed function startEdit() {}
  // removed function showAddForm() {}
  // removed function closePanel() {}
  // removed function getLastLocation() {}

  The wrapper below re-exports the implementation from data_core_ops.js
  so existing imports (./data_core_impl.js) keep working.
*/

import { createInitData } from "./data_core_ops.js";

export function initData(deps){
  return createInitData(deps);
}