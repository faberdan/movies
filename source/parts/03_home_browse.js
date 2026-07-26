<script>
/* ---------- home ---------- */
const TILE_ICONS = {
  browse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
  coll:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>',
  nim:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 6h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z"/></svg>',
};
function viewHome() {
  return `<div class="wrap hub">
    <div class="hub-tiles">
      <a class="hub-tile t-browse" href="#/browse">${TILE_ICONS.browse}<span class="t">Browse</span></a>
      <a class="hub-tile t-coll" href="#/collections">${TILE_ICONS.coll}<span class="t">Collections</span></a>
      <a class="hub-tile t-dash" href="#/dashboard">${TILE_ICONS.dash}<span class="t">Dashboard</span></a>
    </div>
  </div>`;
}
function wireHome() {}

/* ---------- search suggest ---------- */
let suggestSel = -1;
function closeSuggest() { document.querySelectorAll('.suggest').forEach(el => { el.hidden = true; }); suggestSel = -1; }
function wireSearchBox(inputId, sugId) {
  const inp = document.getElementById(inputId), sug = document.getElementById(sugId);
  if (!inp) return;
  const go = q => { location.hash = browseHash({...emptyF(), q}); };
  inp.addEventListener('input', () => {
    const q = inp.value.trim(); suggestSel = -1;
    if (q.length < 2) { sug.hidden = true; return; }
    const res = searchMovies(q).slice(0, 8);
    if (!res.length) { sug.innerHTML = `<span class="s-more" style="color:var(--ink-3)">No matches for “${esc(q)}”</span>`; sug.hidden = false; return; }
    sug.innerHTML = res.map(m => `<a href="#/movie/${attr(m.id)}">
        ${m.poster ? `<img class="s-thumb" src="${IMG}${attr(m.poster)}" alt="">` : `<div class="s-thumb ph">${esc((m.title[0]||'').toUpperCase())}</div>`}
        <div><div class="s-title">${esc(m.title)}</div>
        <div class="s-meta">${[m.year, m.director].filter(Boolean).map(esc).join(' · ')}</div></div></a>`).join('')
      + `<a class="s-more" href="${browseHash({...emptyF(), q})}">See all results →</a>`;
    sug.hidden = false;
  });
  inp.addEventListener('keydown', e => {
    const items = sug.hidden ? [] : [...sug.querySelectorAll('a')];
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); suggestSel = Math.min(suggestSel+1, items.length-1); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); suggestSel = Math.max(suggestSel-1, -1); }
    else if (e.key === 'Enter') { e.preventDefault();
      if (suggestSel >= 0 && items[suggestSel]) location.hash = items[suggestSel].getAttribute('href').slice(1);
      else if (inp.value.trim()) go(inp.value.trim());
      inp.blur(); closeSuggest(); return; }
    else if (e.key === 'Escape') { closeSuggest(); inp.blur(); return; }
    else return;
    items.forEach((el,i) => el.classList.toggle('sel', i === suggestSel));
    if (suggestSel >= 0) items[suggestSel].scrollIntoView({block:'nearest'});
  });
  inp.addEventListener('blur', () => setTimeout(closeSuggest, 180));
}

/* ---------- browse: filter dropdowns ---------- */
const AWARD_OPTS = [
  {k:'obpW', label:'Best Picture Winner'},
  {k:'obpN', label:'Best Picture Nominee'},
  {k:'oscw', label:'Oscar winner'},
  {k:'oscn', label:'Oscar nominee'},
  {k:'bafta', label:'BAFTA Best Film'},
];
function awardOn(f, k) {
  if (k === 'obpW') return f.obp === 'Winner';
  if (k === 'obpN') return f.obp === 'Nominee';
  return !!f[k];
}
function awardToggle(f, k) {
  if (k === 'obpW') f.obp = f.obp === 'Winner' ? '' : 'Winner';
  else if (k === 'obpN') f.obp = f.obp === 'Nominee' ? '' : 'Nominee';
  else f[k] = !f[k];
}
function ddDefs() {
  const defs = [
    {key:'genre',  label:'Genre',  kind:'multi', opts: ALL_GENRES.map(v=>[v,v])},
    {key:'decade', label:'Decade', kind:'multi', opts: ALL_DECADES.map(d=>[String(d), d+'s'])},
    {key:'status', label:'Status', kind:'multi', opts: [['Watched','Watched'],['Up Next','Up Next'],['For Later','For Later'],['Not Gonna','Not Gonna'],['(none)','No status']]},
    {key:'wa',     label:'Watch Again', kind:'multi', opts: [['Yes','Yes'],['Maybe','Maybe'],['No','No'],['New','New'],['(none)','Not set']]},
    {key:'awards', label:'Awards', kind:'awards'},
    {key:'director', label:'Director', kind:'single', opts: ALL_DIRECTORS, search:true},
  ];
  if (HAS_CAST) defs.push({key:'actor', label:'Actor', kind:'single', opts: ALL_ACTORS, search:true});
  defs.push({key:'ratings', label:'Ratings', kind:'ratings'});
  defs.push({key:'runtime', label:'Runtime', kind:'multi', opts: Object.keys(RUNTIME_BUCKETS).map(k=>[k, RUNTIME_BUCKETS[k].label])});
  if (ALL_FEELS.length) defs.push({key:'feel', label:'Feel', kind:'multi', opts: ALL_FEELS.map(v=>[v,v])});
  if (ALL_SERVICES.length) defs.push({key:'service', label:'Service', kind:'multi', opts: ALL_SERVICES.map(v=>[v,v])});
  defs.push({key:'type', label:'Type', kind:'multi1', opts: [['Movie','Movie'],['TV','TV']]});
  return defs;
}
function ddCount(f, d) {
  if (d.kind === 'multi') return f[d.key].length;
  if (d.kind === 'multi1') return f[d.key] ? 1 : 0;
  if (d.kind === 'single') return f[d.key] ? 1 : 0;
  if (d.kind === 'awards') return AWARD_OPTS.filter(o => awardOn(f, o.k)).length;
  if (d.kind === 'ratings') return (f.imdbMin?1:0)+(f.rtcMin?1:0)+(f.rtaMin?1:0);
  return 0;
}
function ddPanelHTML(f, d) {
  const row = (on, label, dk, dv) => `<button class="dd-opt ${on?'on':''}" role="option" aria-selected="${on}" data-dk="${attr(dk)}" data-dv="${attr(dv)}"><span class="chk">${on?'✓':''}</span>${esc(label)}</button>`;
  if (d.kind === 'multi') return d.opts.map(([v,l]) => row(f[d.key].includes(v), l, d.key, v)).join('');
  if (d.kind === 'multi1') return d.opts.map(([v,l]) => row(f[d.key] === v, l, '_single:'+d.key, v)).join('');
  if (d.kind === 'awards') return AWARD_OPTS.map(o => row(awardOn(f, o.k), o.label, '_award', o.k)).join('');
  if (d.kind === 'single') {
    const sel = f[d.key];
    const list = d.opts.filter(v => v !== sel).map(v => row(false, v, '_single:'+d.key, v)).join('');
    return `<input type="text" class="dd-search" placeholder="Search ${d.label.toLowerCase()}s" aria-label="Search ${attr(d.label)}"><div class="dd-list">${sel ? row(true, sel, '_single:'+d.key, sel) : ''}${list}</div>`;
  }
  if (d.kind === 'ratings') {
    const slider = (id, label, val, max, step, fmt) => `<div class="dd-slider"><label for="dds-${id}">${label}</label>
      <input type="range" id="dds-${id}" data-rk="${id}" min="0" max="${max}" step="${step}" value="${val}">
      <span class="rv" id="ddsv-${id}">${val ? fmt(val) : 'Any'}</span></div>`;
    return slider('imdbMin','IMDb', f.imdbMin, 9, 0.5, v=>'≥ '+v)
      + slider('rtcMin','RT Critics', f.rtcMin, 100, 5, v=>'≥ '+v+'%')
      + slider('rtaMin','RT Audience', f.rtaMin, 100, 5, v=>'≥ '+v+'%');
  }
  return '';
}
function viewBrowse(f) {
  const list = applyFilters(f);
  const sortOpts = Object.entries(SORTS).map(([k,s]) => `<option value="${k}" ${f.sort===k?'selected':''}>${s.label}</option>`).join('');
  const dds = ddDefs().map(d => { const n = ddCount(f, d);
    return `<div class="dd" data-dd="${d.key}">
      <button class="dd-btn ${n?'has':''}" aria-haspopup="listbox" aria-expanded="false">${d.label}${n?`<span class="dd-n">${n}</span>`:''}<span class="dd-car">▾</span></button>
      <div class="dd-panel" role="listbox" hidden>${ddPanelHTML(f, d)}</div></div>`;
  }).join('');
  return `<div class="wrap">
  <h1 class="page-title g-browse">Browse</h1>
  <div class="filter-bar">
    ${dds}
    <button class="dd-btn fav-toggle ${f.fav==='Yes'?'has':''}" id="favToggle">♥ Favorites</button>
    <span class="spacer"></span>
    <label class="sr-only" for="sortSel">Sort by</label>
    <select id="sortSel">${sortOpts}</select>
  </div>
  <div class="active-chips" id="activeChips"></div>
  <div class="browse-top"><span class="count" id="resCount"></span></div>
  <div id="resGrid"></div>
  </div>`;
}
function wireBrowse(f) {
  const grid = document.getElementById('resGrid');
  const syncURL = () => { try { history.replaceState(null, '', location.pathname + location.search + browseHash(f)); } catch(e) {} };
  const closeAll = () => document.querySelectorAll('.dd-panel').forEach(p => { p.hidden = true; p.parentNode.querySelector('.dd-btn').setAttribute('aria-expanded','false'); });

  function renderChips() {
    const chips = activeChips(f), fns = activeChips._fns || [];
    const el = document.getElementById('activeChips');
    el.innerHTML = chips.length ? chips.join('') + '<button class="achip clearall" id="clearAll2">Clear all ✕</button>' : '';
    el.querySelectorAll('.achip [data-clear]').forEach((btn, i) => btn.addEventListener('click', () => { fns[i] && fns[i](f); update(true); }));
    document.getElementById('clearAll2')?.addEventListener('click', () => { f = emptyF(); update(true); });
  }
  function renderButtons() {
    ddDefs().forEach(d => {
      const dd = document.querySelector(`.dd[data-dd="${d.key}"]`); if (!dd) return;
      const n = ddCount(f, d), btn = dd.querySelector('.dd-btn');
      btn.classList.toggle('has', n > 0);
      btn.innerHTML = `${d.label}${n?`<span class="dd-n">${n}</span>`:''}<span class="dd-car">▾</span>`;
    });
    document.getElementById('favToggle').classList.toggle('has', f.fav === 'Yes');
  }
  function update(rebuildPanels) {
    const list = applyFilters(f);
    document.getElementById('resCount').innerHTML = `<b>${list.length}</b> ${plur(list.length,'title')}${f.q ? ` for “${esc(f.q)}”` : ''}`;
    grid.innerHTML = list.length ? gridHTML(list) : `<div class="empty"><div class="big">Nothing matches those filters</div><p>Remove a filter or two.</p></div>`;
    renderChips(); renderButtons(); syncURL();
    if (rebuildPanels) ddDefs().forEach(d => {
      const p = document.querySelector(`.dd[data-dd="${d.key}"] .dd-panel`);
      if (p && p.hidden) p.innerHTML = ddPanelHTML(f, d);
    });
  }
  function refreshPanel(d, panel) { panel.innerHTML = ddPanelHTML(f, d); wirePanel(d, panel); }
  function wirePanel(d, panel) {
    panel.querySelectorAll('.dd-opt').forEach(opt => opt.addEventListener('click', () => {
      const dk = opt.dataset.dk, dv = opt.dataset.dv;
      if (dk === '_award') awardToggle(f, dv);
      else if (dk.startsWith('_single:')) { const k = dk.slice(8); f[k] = f[k] === dv ? '' : dv; }
      else f[dk] = f[dk].includes(dv) ? f[dk].filter(x => x !== dv) : [...f[dk], dv];
      update(false); refreshPanel(d, panel);
      if (d.kind === 'single') closeAll();
    }));
    const s = panel.querySelector('.dd-search');
    if (s) { s.addEventListener('input', () => {
        const nq = norm(s.value);
        panel.querySelectorAll('.dd-list .dd-opt').forEach(o => { o.style.display = !nq || norm(o.dataset.dv).includes(nq) ? '' : 'none'; });
      });
      setTimeout(() => s.focus(), 30);
    }
    panel.querySelectorAll('input[type=range]').forEach(r => {
      r.addEventListener('input', () => { const k = r.dataset.rk;
        document.getElementById('ddsv-'+k).textContent = +r.value ? (k==='imdbMin' ? '≥ '+r.value : '≥ '+r.value+'%') : 'Any'; });
      r.addEventListener('change', () => { f[r.dataset.rk] = +r.value; update(false); });
    });
  }
  ddDefs().forEach(d => {
    const dd = document.querySelector(`.dd[data-dd="${d.key}"]`); if (!dd) return;
    const btn = dd.querySelector('.dd-btn'), panel = dd.querySelector('.dd-panel');
    btn.addEventListener('click', e => { e.stopPropagation();
      const open = !panel.hidden; closeAll();
      if (!open) { refreshPanel(d, panel); panel.hidden = false; btn.setAttribute('aria-expanded','true'); }
    });
    panel.addEventListener('click', e => e.stopPropagation());
  });
  document.getElementById('favToggle').addEventListener('click', () => { f.fav = f.fav === 'Yes' ? '' : 'Yes'; update(true); });
  document.getElementById('sortSel').addEventListener('change', e => { f.sort = e.target.value; update(true); });
  if (window.__ddDocClose) document.removeEventListener('click', window.__ddDocClose);
  window.__ddDocClose = () => closeAll();
  document.addEventListener('click', window.__ddDocClose);
  if (window.__ddEsc) document.removeEventListener('keydown', window.__ddEsc);
  window.__ddEsc = e => { if (e.key === 'Escape') closeAll(); };
  document.addEventListener('keydown', window.__ddEsc);
  update(true);
}
function activeChips(f) {
  const chips = [];
  var clearFns = activeChips._fns = [];
  const add = (label, mutate) => { chips.push(`<span class="achip">${label}<button data-clear aria-label="Remove filter">✕</button></span>`); clearFns.push(mutate); };
  if (f.q) add(`“${esc(f.q)}”`, x => x.q = '');
  f.decade.forEach(d => add(`${d}s`, x => x.decade = x.decade.filter(v=>v!==d)));
  f.genre.forEach(g => add(esc(g), x => x.genre = x.genre.filter(v=>v!==g)));
  f.status.forEach(s => add(esc(s==='(none)'?'No status':s), x => x.status = x.status.filter(v=>v!==s)));
  if (f.fav) add('♥ Favorites', x => x.fav = '');
  f.wa.forEach(s => add('Again: '+esc(s==='(none)'?'not set':s), x => x.wa = x.wa.filter(v=>v!==s)));
  f.feel.forEach(s => add(esc(s), x => x.feel = x.feel.filter(v=>v!==s)));
  f.service.forEach(s => add(esc(s), x => x.service = x.service.filter(v=>v!==s)));
  f.runtime.forEach(s => add(esc(RUNTIME_BUCKETS[s].label), x => x.runtime = x.runtime.filter(v=>v!==s)));
  if (f.director) add(esc(f.director), x => x.director = '');
  if (f.actor) add(esc(f.actor), x => x.actor = '');
  if (f.type) add(esc(f.type), x => x.type = '');
  if (f.obp) add('Best Picture '+esc(f.obp), x => x.obp = '');
  if (f.oscw) add('Oscar winner', x => x.oscw = false);
  if (f.oscn) add('Oscar nominee', x => x.oscn = false);
  if (f.bafta) add('BAFTA Best Film', x => x.bafta = false);
  if (f.imdbMin) add('IMDb ≥ '+f.imdbMin, x => x.imdbMin = 0);
  if (f.rtcMin) add('Critics ≥ '+f.rtcMin+'%', x => x.rtcMin = 0);
  if (f.rtaMin) add('Audience ≥ '+f.rtaMin+'%', x => x.rtaMin = 0);
  return chips;
}
</script>
