<script>
/* ---------- home ---------- */
const TILE_ICONS = {
  browse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
  coll:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>',
  nim:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 6h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z"/></svg>',
};
function viewHome() {
  const favorites = MOVIES.filter(m => m.favorite === 'Yes');
  const watchNext = MOVIES.filter(m => m.status === 'Up Next' || m.status === 'For Later')
    .sort((a,b) => (a.status === 'Up Next' ? 0 : 1) - (b.status === 'Up Next' ? 0 : 1));
  const recent = MOVIES.filter(m => m.addedTs).sort(SORTS.added.fn).slice(0, 14);
  const bpWinners = MOVIES.filter(m => m.oscarBP === 'Winner').sort(SORTS.newest.fn);
  const section = (title, list, moreHref) => !list.length ? '' :
    `<section class="section"><div class="section-head"><h2>${title}</h2>
     ${moreHref ? `<a class="more" href="${moreHref}">View all →</a>` : ''}</div>
     ${rowHTML(list.slice(0, 14))}</section>`;
  return `<div class="wrap hub">
    <div class="hub-tiles">
      <a class="hub-tile t-browse" href="#/browse">${TILE_ICONS.browse}<span class="t">Browse</span></a>
      <a class="hub-tile t-coll" href="#/collections">${TILE_ICONS.coll}<span class="t">Collections</span></a>
      <a class="hub-tile t-dash" href="#/dashboard">${TILE_ICONS.dash}<span class="t">Dashboard</span></a>
      <a class="hub-tile t-nim" href="#/notinmaster">${TILE_ICONS.nim}<span class="t">Not in Master</span></a>
    </div>
    ${section('Watch next', watchNext, browseHash({...emptyF(), status:['Up Next','For Later']}))}
    ${section('Favorites', favorites, browseHash({...emptyF(), fav:'Yes'}))}
    ${section('Best Picture winners', bpWinners, browseHash({...emptyF(), obp:'Winner', sort:'newest'}))}
    ${section('Recently added', recent, browseHash({...emptyF(), sort:'added'}))}
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

/* ---------- browse ---------- */
function chipSet(title, key, values, f, labels) {
  if (!values.length) return '';
  return `<h3>${title}</h3><div class="fchips">${values.map(v =>
    `<button class="fchip ${f[key].includes(String(v)) ? 'on' : ''}" data-fk="${key}" data-fv="${attr(v)}">${esc(labels ? labels(v) : v)}</button>`).join('')}</div>`;
}
function viewBrowse(f) {
  const list = applyFilters(f);
  const active = activeChips(f);
  const sortOpts = Object.entries(SORTS).map(([k,s]) => `<option value="${k}" ${f.sort===k?'selected':''}>${s.label}</option>`).join('');
  return `<div class="wrap">
  <h1 class="page-title g-browse">Browse</h1>
  <div class="browse-layout">
    <aside class="filters" id="filterPanel" aria-label="Filters">
      <h3>Decade</h3><div class="fchips">${ALL_DECADES.map(d =>
        `<button class="fchip ${f.decade.includes(String(d))?'on':''}" data-fk="decade" data-fv="${d}">${d}s</button>`).join('')}</div>
      ${chipSet('Genre','genre',ALL_GENRES,f)}
      ${chipSet('Notion status','status',['Watched','Up Next','For Later','Not Gonna','(none)'],f)}
      <h3>Favorite</h3><div class="fchips">
        <button class="fchip ${f.fav==='Yes'?'on':''}" data-fs="fav" data-fv="Yes">♥ Favorites</button></div>
      ${chipSet('Watch again?','wa',['Yes','Maybe','No','New','(none)'],f)}
      ${chipSet('Runtime','runtime',Object.keys(RUNTIME_BUCKETS),f,k=>RUNTIME_BUCKETS[k].label)}
      <h3>Minimum IMDb</h3>
      <input type="range" id="imdbMin" min="0" max="9" step="0.5" value="${f.imdbMin}" aria-label="Minimum IMDb rating">
      <div class="range-val" id="imdbMinVal">${f.imdbMin ? '≥ '+f.imdbMin : 'Any'}</div>
      <h3>Minimum RT Critics</h3>
      <input type="range" id="rtcMin" min="0" max="100" step="5" value="${f.rtcMin}" aria-label="Minimum Rotten Tomatoes critics score">
      <div class="range-val" id="rtcMinVal">${f.rtcMin ? '≥ '+f.rtcMin+'%' : 'Any'}</div>
      <h3>Minimum RT Audience</h3>
      <input type="range" id="rtaMin" min="0" max="100" step="5" value="${f.rtaMin}" aria-label="Minimum Rotten Tomatoes audience score">
      <div class="range-val" id="rtaMinVal">${f.rtaMin ? '≥ '+f.rtaMin+'%' : 'Any'}</div>
      <h3>Director</h3>
      <select id="directorSel" aria-label="Filter by director"><option value="">Any director</option>
        ${ALL_DIRECTORS.map(d => `<option ${f.director===d?'selected':''} value="${attr(d)}">${esc(d)}</option>`).join('')}</select>
      ${HAS_CAST ? `<h3>Actor</h3><select id="actorSel" aria-label="Filter by actor"><option value="">Any actor</option>
        ${ALL_ACTORS.map(d => `<option ${f.actor===d?'selected':''} value="${attr(d)}">${esc(d)}</option>`).join('')}</select>` : ''}
      <h3>Awards</h3><div class="fchips">
        <button class="fchip ${f.obp==='Winner'?'on':''}" data-fs="obp" data-fv="Winner">BP Winner</button>
        <button class="fchip ${f.obp==='Nominee'?'on':''}" data-fs="obp" data-fv="Nominee">BP Nominee</button>
        <button class="fchip ${f.oscw?'on':''}" data-fb="oscw">Oscar winner</button>
        <button class="fchip ${f.oscn?'on':''}" data-fb="oscn">Oscar nominee</button>
        <button class="fchip ${f.bafta?'on':''}" data-fb="bafta">BAFTA Best Film</button></div>
      ${chipSet('Feel','feel',ALL_FEELS,f)}
      ${chipSet('Service','service',ALL_SERVICES,f)}
      <h3>Type</h3><div class="fchips">
        <button class="fchip ${f.type==='Movie'?'on':''}" data-fs="type" data-fv="Movie">Movie</button>
        <button class="fchip ${f.type==='TV'?'on':''}" data-fs="type" data-fv="TV">TV</button></div>
      <button class="btn-clear" id="clearFilters">Clear all filters</button>
    </aside>
    <div>
      <div class="browse-top">
        <button class="btn-filter-toggle" id="toggleFilters" aria-expanded="false">☰ Filters</button>
        <span class="count"><b>${list.length}</b> ${plur(list.length,'title')}${f.q ? ` for “${esc(f.q)}”` : ''}</span>
        <span class="spacer"></span>
        <label class="sr-only" for="sortSel">Sort by</label>
        <select id="sortSel">${sortOpts}</select>
      </div>
      ${active.length ? `<div class="active-chips">${active.join('')}
        <button class="achip clearall" id="clearAll2">Clear all ✕</button></div>` : ''}
      ${list.length ? gridHTML(list) : `<div class="empty"><div class="big">Nothing matches those filters</div>
        <p>Try removing a filter or two.</p></div>`}
    </div>
  </div></div>`;
}
function activeChips(f) {
  const chips = [];
  const add = (label, mutate) => chips.push(`<span class="achip">${label}<button data-clear aria-label="Remove filter ${attr(label)}">✕</button></span>`) && clearFns.push(mutate);
  var clearFns = activeChips._fns = [];
  if (f.q) add(`“${esc(f.q)}”`, x => x.q = '');
  f.decade.forEach(d => add(`${d}s`, x => x.decade = x.decade.filter(v=>v!==d)));
  f.genre.forEach(g => add(esc(g), x => x.genre = x.genre.filter(v=>v!==g)));
  f.status.forEach(s => add(esc(s==='(none)'?'No status':s), x => x.status = x.status.filter(v=>v!==s)));
  if (f.fav) add('♥ Favorites', x => x.fav = '');
  f.wa.forEach(s => add('Again: '+esc(s), x => x.wa = x.wa.filter(v=>v!==s)));
  f.feel.forEach(s => add(esc(s), x => x.feel = x.feel.filter(v=>v!==s)));
  f.service.forEach(s => add(esc(s), x => x.service = x.service.filter(v=>v!==s)));
  f.runtime.forEach(s => add(esc(RUNTIME_BUCKETS[s].label), x => x.runtime = x.runtime.filter(v=>v!==s)));
  if (f.director) add(esc(f.director), x => x.director = '');
  if (f.actor) add(esc(f.actor), x => x.actor = '');
  if (f.type) add(esc(f.type), x => x.type = '');
  if (f.obp) add('BP '+esc(f.obp), x => x.obp = '');
  if (f.oscw) add('Oscar winner', x => x.oscw = false);
  if (f.oscn) add('Oscar nominee', x => x.oscn = false);
  if (f.bafta) add('BAFTA Best Film', x => x.bafta = false);
  if (f.imdbMin) add('IMDb ≥ '+f.imdbMin, x => x.imdbMin = 0);
  if (f.rtcMin) add('Critics ≥ '+f.rtcMin+'%', x => x.rtcMin = 0);
  if (f.rtaMin) add('Audience ≥ '+f.rtaMin+'%', x => x.rtaMin = 0);
  return chips;
}
function wireBrowse(f) {
  const nav = () => { location.hash = browseHash(f).slice(1); };
  document.querySelectorAll('[data-fk]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.fk, v = btn.dataset.fv;
    f[k] = f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]; nav();
  }));
  document.querySelectorAll('[data-fs]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.fs, v = btn.dataset.fv;
    f[k] = f[k] === v ? '' : v; nav();
  }));
  document.querySelectorAll('[data-fb]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.fb; f[k] = !f[k]; nav();
  }));
  const range = (id, key, fmt) => { const el = document.getElementById(id); if (!el) return;
    el.addEventListener('input', () => { document.getElementById(id+'Val').textContent = +el.value ? fmt(el.value) : 'Any'; });
    el.addEventListener('change', () => { f[key] = +el.value; nav(); }); };
  range('imdbMin','imdbMin', v=>'≥ '+v); range('rtcMin','rtcMin', v=>'≥ '+v+'%'); range('rtaMin','rtaMin', v=>'≥ '+v+'%');
  const sel = (id, key) => { const el = document.getElementById(id); if (!el) return;
    el.addEventListener('change', () => { f[key] = el.value; nav(); }); };
  sel('directorSel','director'); sel('actorSel','actor'); sel('sortSel','sort');
  const clear = () => { const q = f.q; f = emptyF(); f.q = q; nav(); };
  document.getElementById('clearFilters')?.addEventListener('click', clear);
  document.getElementById('clearAll2')?.addEventListener('click', () => { f = emptyF(); nav(); });
  const fns = activeChips._fns || [];
  document.querySelectorAll('.achip [data-clear]').forEach((btn, i) => btn.addEventListener('click', e => {
    e.preventDefault(); fns[i] && fns[i](f); nav();
  }));
  const tf = document.getElementById('toggleFilters');
  tf?.addEventListener('click', () => { const p = document.getElementById('filterPanel');
    p.classList.toggle('open'); tf.setAttribute('aria-expanded', p.classList.contains('open')); });
}
</script>
