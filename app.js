/*
  Bootstrapping file: app.js now initializes the refactored modules.
  Tombstones for removed functions are included below to help locate moved logic.
*/

import { nanoid } from "nanoid";
import { loadReviews, saveReviews } from "./storage.js";
import { initUI } from "./ui.js";
import { initData } from "./data.js";
import { fetchTheaterShows } from "./fetcher.js";

try {
  // initialize data module with storage helpers
  const data = initData({ loadReviews, saveReviews, nanoid, fetchTheaterShows });

  // initialize UI and wire it to data layer
  initUI({ rootId: 'app', a11yId: 'a11y-live', data });
} catch (err) {
  console.error('App initialization failed:', err);
  // show a minimal visible error so users know something went wrong
  const root = document.getElementById('app');
  if (root) {
    root.innerHTML = '';
    const pre = document.createElement('pre');
    pre.style.padding = '18px';
    pre.style.margin = '12px';
    pre.style.borderRadius = '8px';
    pre.style.background = '#fff4f4';
    pre.style.color = '#600';
    pre.textContent = 'Fout bij opstarten van de app. Open de console voor details.\n\n' + (err && err.stack ? err.stack : String(err));
    root.appendChild(pre);
  } else {
    alert('Fout bij opstarten van de app. Open de console voor details.');
  }
}

/* Tombstones — functions and large blocks moved out to modules:
   // removed function announce() {}
   // removed function el() {}
   // removed large UI construction and renderList()/renderPanel() implementations
   // removed computeStatus() {}
   // removed starInput() {}
   // removed fetchTheaterShows() {} (moved to fetcher.js)
   // removed other helper and form handling functions (moved to ui.js / data.js)
*/