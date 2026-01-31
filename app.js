/*
  Bootstrapping file: app.js now initializes the refactored modules.
  Tombstones for removed functions are included below to help locate moved logic.
*/

import { nanoid } from "nanoid";
import { loadReviews, saveReviews } from "./storage.js";
import { initUI } from "./ui.js";
import { initData } from "./data.js";
import { fetchTheaterShows } from "./fetcher.js";

// initialize data module with storage helpers
const data = initData({ loadReviews, saveReviews, nanoid, fetchTheaterShows });

// initialize UI and wire it to data layer
initUI({ rootId: 'app', a11yId: 'a11y-live', data });

/* Tombstones — functions and large blocks moved out to modules:
   // removed function announce() {}
   // removed function el() {}
   // removed large UI construction and renderList()/renderPanel() implementations
   // removed computeStatus() {}
   // removed starInput() {}
   // removed fetchTheaterShows() {} (moved to fetcher.js)
   // removed other helper and form handling functions (moved to ui.js / data.js)
*/