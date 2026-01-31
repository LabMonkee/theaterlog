/*
  ui_helpers.js
  Extracted helper utilities for ui.js:
  - el: small DOM helper
  - ratingField: encapsulated star rating widget
  - renderDiscover: discovery panel renderer (reads discover state via arguments)
  - settings helpers: toggleSettings, closeSettings, outsideClick
*/

export function el(tag, props = {}, ...children){
  const isLikelyPropsObject = props && typeof props === 'object' && !props.nodeType && !('tagName' in props) && !Array.isArray(props);
  if(!isLikelyPropsObject){
    children = [props, ...children];
    props = {};
  }
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if(k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if(k === 'html'){
      node.innerHTML = v;
    } else {
      if(typeof k === 'string' && k.trim().length > 0) node.setAttribute(k, v);
    }
  });
  children.flat().forEach(c=>{
    if(c == null) return;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  if(node.classList && node.classList.contains('icon')){
    node.setAttribute('aria-hidden','true');
    node.tabIndex = -1;
  }
  return node;
}

export function ratingField(initial = 0){
  let value = Number(initial) || 0;
  const starwrap = el('div',{id:'starwrap', style:'display:flex;gap:6px;'},
    ...Array.from({length:5}).map((_,i)=> {
      // clicking the same star toggles it off (sets to 0) to allow a "0 stars" option
      return el('button',{
        class:'btn ghost',
        type:'button',
        onclick: ()=>{ value = (value === i+1) ? 0 : (i+1); update(); }
      }, el('span',{class:'icon'}, i < value ? '★' : '☆'));
    })
  );
  const label = el('div',{id:'starlabel', class:'sub'}, String(value));
  function update(){
    const buttons = starwrap.querySelectorAll('button');
    buttons.forEach((b,idx)=> b.querySelector('.icon').textContent = idx < value ? '★' : '☆');
    // show a clearer empty state marker for zero
    label.textContent = value === 0 ? '0' : String(value);
  }
  update();
  const container = el('div',{style:'display:flex;gap:8px;align-items:center;'}, starwrap, label);
  container.getValue = ()=> value;
  container.setValue = v=>{ value = Number(v) || 0; update(); };
  return container;
}

// removed function renderDiscoverFactory() {} (logic moved to ui_panel.js)

/* Simple settings menu helpers (operates on #settings_menu and #settings_btn) */
export function toggleSettings(){
  const btn = document.getElementById('settings_btn');
  const menu = document.getElementById('settings_menu');
  if(!menu || !btn) return;
  const isOpen = menu.style.display === '' || menu.style.display === 'block';
  if(isOpen) closeSettings();
  else {
    menu.style.display = 'block';
    menu.setAttribute('aria-hidden','false');
    btn.setAttribute('aria-expanded','true');
    setTimeout(()=> window.addEventListener('click', outsideClick));
  }
}
export function closeSettings(){
  const btn = document.getElementById('settings_btn');
  const menu = document.getElementById('settings_menu');
  if(menu) { menu.style.display = 'none'; menu.setAttribute('aria-hidden','true'); }
  if(btn) btn.setAttribute('aria-expanded','false');
  window.removeEventListener('click', outsideClick);
}
export function outsideClick(e){
  const menu = document.getElementById('settings_menu');
  const btn = document.getElementById('settings_btn');
  if(!menu) return;
  if(menu.contains(e.target) || (btn && btn.contains(e.target))) return;
  closeSettings();
}