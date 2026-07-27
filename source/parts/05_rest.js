<script>
/* ---------- collections ---------- */
const COLL_GRADS = {
  picks:'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  status:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  awards:'linear-gradient(135deg,#d4a72c,#a37716)',
  ratings:'linear-gradient(135deg,#10b981,#047857)',
  feel:'linear-gradient(135deg,#ec4899,#be185d)',
  service:'linear-gradient(135deg,#f59e0b,#d97706)',
};
const COLL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>';
function viewCollections() {
  const count = f => applyFilters(f).length;
  const card = (grad, t, f) => count(f) === 0 ? '' :
    `<a class="coll-card" style="background:${grad}" href="${browseHash(f)}">${COLL_ICON}<span class="t">${t}</span></a>`;
  const F = emptyF;
  const groups = [];
  groups.push(['My picks', COLL_GRADS.picks, [
    ['Favorites', {...F(), fav:'Yes'}],
    ['Watch Again — Yes', {...F(), wa:['Yes']}],
    ['Watch Again — Maybe', {...F(), wa:['Maybe']}],
    ['New, not yet rated', {...F(), wa:['New']}],
  ]]);
  groups.push(['By status', COLL_GRADS.status, [
    ['Watched', {...F(), status:['Watched']}],
    ['Up Next', {...F(), status:['Up Next']}],
    ['For Later', {...F(), status:['For Later']}],
    ['Not Gonna', {...F(), status:['Not Gonna']}],
    ['No status yet', {...F(), status:['(none)']}],
  ]]);
  groups.push(['Awards', COLL_GRADS.awards, [
    ['Best Picture Winners', {...F(), obp:'Winner', sort:'newest'}],
    ['Best Picture Nominees', {...F(), obp:'Nominee', sort:'newest'}],
    ['BAFTA Best Film Winners', {...F(), bafta:true, sort:'newest'}],
    ['Oscar Winners', {...F(), oscw:true, sort:'wins'}],
  ]]);
  groups.push(['Ratings', COLL_GRADS.ratings, [
    ['IMDb 8.2+', {...F(), imdbMin:8.2, sort:'imdb'}],
    ['Critics 95%+', {...F(), rtcMin:95, sort:'rtc'}],
    ['Recently Added', {...F(), sort:'added'}],
  ]]);
  const feelGroup = ALL_FEELS.map(x => [x, {...F(), feel:[x]}]);
  if (feelGroup.length) groups.push(['By feel', COLL_GRADS.feel, feelGroup]);
  const svcGroup = ALL_SERVICES.map(x => [x, {...F(), service:[x]}]);
  if (svcGroup.length) groups.push(['By service', COLL_GRADS.service, svcGroup]);
  return `<div class="wrap"><h1 class="page-title g-coll">Collections</h1>
    ${groups.map(([t, grad, items]) => {
      const c = items.map(([label, f]) => card(grad, esc(label), f)).filter(Boolean);
      return c.length ? `<h2 class="coll-group-title">${t}</h2><div class="coll-grid">${c.join('')}</div>` : '';
    }).join('')}
  </div>`;
}

/* ---------- dashboard ---------- */
function hbarChart(title, pairs, note) {
  const max = Math.max(...pairs.map(p => p[1]), 1);
  return `<div class="chart-card"><h3>${title}</h3><div class="bars-h">
    ${pairs.map(([l,v]) => `<div class="brow"><div class="blabel" title="${attr(l)}">${esc(l)}</div>
      <div class="btrack"><div class="bfill" style="width:${(v/max*100).toFixed(1)}%"></div></div>
      <div class="bval">${v}</div></div>`).join('')}</div>
    ${note ? `<div class="chart-note">${note}</div>` : ''}</div>`;
}
function vbarChart(title, pairs) {
  const max = Math.max(...pairs.map(p => p[1]), 1);
  return `<div class="chart-card"><h3>${title}</h3>
    <div class="vbars">${pairs.map(([l,v]) => `<div class="vbar" title="${attr(l)}: ${v}">
      <div class="vv">${v}</div><div class="vfill" style="height:${Math.max(v/max*100,1.5).toFixed(1)}%"></div>
      <div class="vl">${esc(l)}</div></div>`).join('')}</div></div>`;
}
function viewDashboard() {
  const watched = MOVIES.filter(m => m.status === 'Watched').length;
  const favs = MOVIES.filter(m => m.favorite === 'Yes').length;
  const later = MOVIES.filter(m => m.status === 'For Later').length;
  const upnext = MOVIES.filter(m => m.status === 'Up Next').length;
  const again = MOVIES.filter(m => m.watchAgain === 'Yes').length;
  const avg = (arr) => arr.length ? arr.reduce((s,x)=>s+x,0)/arr.length : null;
  const avgImdb = avg(MOVIES.map(m=>m.imdb).filter(x=>x!=null));
  const avgRtc = avg(MOVIES.map(m=>m.rtCritics).filter(x=>x!=null));
  const avgRta = avg(MOVIES.map(m=>m.rtAudience).filter(x=>x!=null));
  const oscarWins = MOVIES.reduce((s,m)=>s+(m.oscarWins||0),0);
  const oscarNoms = MOVIES.reduce((s,m)=>s+(m.oscarNoms||0),0);
  const bpW = MOVIES.filter(m=>m.oscarBP==='Winner').length;
  const bpN = MOVIES.filter(m=>m.oscarBP==='Nominee').length;
  const baftaW = MOVIES.filter(m=>m.baftaWin==='Yes').length;
  const kpi = (v,l,gold) => `<div class="kpi ${gold?'gold':''}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  const countBy = fn => { const map = {}; MOVIES.forEach(m => { const ks = fn(m); (Array.isArray(ks)?ks:[ks]).forEach(k => { if (k!=null) map[k]=(map[k]||0)+1; }); }); return map; };
  const dec = countBy(m => m.decade);
  const decPairs = ALL_DECADES.map(d => [String(d).slice(2)+'s', dec[d]||0]);
  const gen = countBy(m => m.genres);
  const genSorted = Object.entries(gen).sort((a,b)=>b[1]-a[1]);
  const genPairs = genSorted.slice(0,12);
  const genRest = genSorted.slice(12).reduce((s,x)=>s+x[1],0);
  const st = countBy(m => m.status || 'No status');
  const stPairs = Object.entries(st).sort((a,b)=>b[1]-a[1]);
  const sv = countBy(m => m.services.length ? m.services : null);
  const svPairs = Object.entries(sv).sort((a,b)=>b[1]-a[1]);
  return `<div class="wrap"><h1 class="page-title g-dash">Dashboard</h1>
    <div class="kpis">
      ${kpi(MOVIES.length,'Titles')}${kpi(watched,'Watched')}${kpi(favs,'Favorites',1)}
      ${kpi(upnext,'Up Next')}${kpi(later,'For Later')}${kpi(again,'Watch Again: Yes')}
    </div>
    <div class="kpis">
      ${kpi(avgImdb?avgImdb.toFixed(1)+'<span class="sm"> /10</span>':'—','Avg IMDb')}
      ${kpi(avgRtc?Math.round(avgRtc*100)+'<span class="sm">%</span>':'—','Avg RT Critics')}
      ${kpi(avgRta?Math.round(avgRta*100)+'<span class="sm">%</span>':'—','Avg RT Audience')}
      ${kpi(oscarWins,'Oscar wins',1)}${kpi(oscarNoms,'Oscar nominations',1)}
      ${kpi(bpW,'Best Picture winners',1)}${kpi(bpN,'Best Picture nominees')}${kpi(baftaW,'BAFTA Best Film winners',1)}
    </div>
    <div class="charts">
      ${vbarChart('Titles by decade', decPairs)}
      ${hbarChart('Titles by genre', genPairs, genRest ? `${genRest} further genre taggings fall outside the top 12.` : '')}
      ${hbarChart('Titles by status', stPairs)}
      ${svPairs.length ? hbarChart('Titles by service', svPairs, 'Only titles with a recorded service.') : ''}
    </div>
    <p class="note" style="margin-top:16px">Award figures reflect what's recorded in the workbook: Best Picture data plus category detail where available, and BAFTA Best Film winners only.</p>
  </div>`;
}

/* ---------- not in master ---------- */
function nimItemHTML(r) {
  const meta = [];
  if (r.status) meta.push(`<span class="pill">${esc(r.status)}</span>`);
  if (r.favorite === 'Yes') meta.push('<span class="pill gold">Favorite</span>');
  if (r.watchAgain) meta.push(`<span class="pill">Again: ${esc(r.watchAgain)}</span>`);
  if (r.oscarBP) meta.push(`<span class="pill gold">Best Picture ${esc(r.oscarBP)}</span>`);
  if (r.oscarWins) meta.push(`<span class="pill gold">${r.oscarWins} Oscar ${plur(r.oscarWins,'win')}</span>`);
  if (r.oscarNoms) meta.push(`<span class="pill">${r.oscarNoms} ${plur(r.oscarNoms,'nomination')}</span>`);
  if (r.baftaWin === 'Yes') meta.push('<span class="pill gold">BAFTA Best Film</span>');
  r.services.forEach(s => meta.push(`<span class="pill">${esc(s)}</span>`));
  if (r.link) meta.push(`<a class="pill" href="${attr(r.link)}" target="_blank" rel="noopener">Link ↗</a>`);
  if (r.trailer) meta.push(`<a class="pill" href="${attr(r.trailer)}" target="_blank" rel="noopener">Trailer ↗</a>`);
  return `<div class="nim-item"><div class="top">
      <span class="t">${r.title ? esc(r.title) : 'Untitled — row ' + esc(r.sourceRow)}</span>
      ${r.year ? `<span class="y">${r.year}</span>` : ''}</div>
    ${r.summary ? `<div class="sum">${esc(r.summary)}</div>` : ''}
    ${meta.length ? `<div class="meta">${meta.join('')}</div>` : ''}</div>`;
}
function viewNIM(params) {
  const src = params.get('src') || 'Notion Database';
  const q = params.get('q') || '';
  const notion = NIM.filter(r => r.source === 'Notion Database');
  const named = notion.filter(r => r.title), untitled = notion.filter(r => !r.title);
  const tabs = [
    ['Notion Database', 'Notion'],
    ['Oscars', 'Oscars'],
    ['BAFTA', 'BAFTA'],
  ];
  let list = NIM.filter(r => r.source === src);
  if (q) { const nq = norm(q); list = list.filter(r => norm(r.title||'').includes(nq) || norm(r.summary||'').includes(nq)); }
  let body;
  if (src === 'Notion Database' && !q) {
    body = `<div class="nim-list">${named.map(nimItemHTML).join('')}</div>
      ${untitled.length ? `<h2 class="coll-group-title">Untitled records</h2>
      <div class="nim-list">${untitled.map(nimItemHTML).join('')}</div>` : ''}`;
  } else {
    body = list.length ? `<div class="nim-list">${list.map(nimItemHTML).join('')}</div>`
      : `<div class="empty"><div class="big">No records match</div></div>`;
  }
  return `<div class="wrap"><h1 class="page-title g-nim">Not in Master</h1>
    <div class="tabs" role="tablist">${tabs.map(([k,l]) =>
      `<button class="tab ${src===k?'on':''}" role="tab" aria-selected="${src===k}" data-src="${attr(k)}">${l}</button>`).join('')}</div>
    <input type="search" id="nimSearch" value="${attr(q)}" placeholder="Filter" aria-label="Filter records"
      style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:9px 14px;margin-bottom:8px">
    ${body}
    <p class="note">Records from imported sources that couldn't be confidently matched to the master database. If one of these is a movie you own under a different title or year, fix it in the spreadsheet and rebuild.</p>
  </div>`;
}
function wireNIM(params) {
  document.querySelectorAll('.tab[data-src]').forEach(b => b.addEventListener('click', () => {
    const p = new URLSearchParams(); p.set('src', b.dataset.src);
    location.hash = '#/notinmaster?' + p.toString();
  }));
  const inp = document.getElementById('nimSearch');
  let t; inp?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => {
    const p = new URLSearchParams(); p.set('src', params.get('src') || 'Notion Database');
    if (inp.value.trim()) p.set('q', inp.value.trim());
    const pos = inp.selectionStart;
    location.hash = '#/notinmaster?' + p.toString();
    requestAnimationFrame(() => { const el = document.getElementById('nimSearch'); if (el) { el.focus(); el.setSelectionRange(pos,pos); } });
  }, 350); });
}

/* ---------- about ---------- */
function viewAbout() {
  const meta = DATA.meta;
  const withPoster = MOVIES.filter(m => m.poster).length;
  const withCast = MOVIES.filter(m => (m.cast||[]).length).length;
  return `<div class="wrap"><h1 class="page-title">About the Data</h1>
  <div class="about-block"><h3>Source</h3>
    <p>Everything here comes from <b style="color:var(--ink)">${esc(meta.source)}</b>. The portal is a read-only view — to change a rating, status, or note, edit the spreadsheet and rebuild.</p>
    <table>
      <tr><td>Master movies</td><td>${meta.masterCount}</td></tr>
      <tr><td>Award records joined to master titles</td><td>${meta.awardRecords}</td></tr>
      <tr><td>Records in Not in Master</td><td>${meta.notInMasterCount}</td></tr>
      ${withPoster ? `<tr><td>Titles with poster artwork</td><td>${withPoster}</td></tr>` : ''}
      ${withCast ? `<tr><td>Titles with cast data</td><td>${withCast}</td></tr>` : ''}
    </table></div>
  <div class="about-block"><h3>Award data coverage</h3>
    <p><b style="color:var(--ink)">Oscars:</b> ${esc(meta.oscarScope)}</p>
    <p><b style="color:var(--ink)">BAFTA:</b> ${esc(meta.baftaScope)}</p>
    <p>A blank award field means no record in the source — never "zero nominations." The portal hides blanks rather than guessing.</p></div>
  <div class="about-block"><h3>Matching rules</h3>
    <p>Movies were matched across tabs using normalized title + year, deliberately conservatively, so remakes and similarly-titled films never merge. Unmatched records live in <a href="#/notinmaster">Not in Master</a>.</p>
    <p>Personal fields (Favorite?, Watch Again?, Feel, Summary, Notion Status) are shown exactly as written in the spreadsheet.</p></div>
  ${withPoster ? `<div class="about-block"><h3>Artwork</h3><p>Poster artwork and cast data supplied by <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div>` : ''}
  <div class="about-block"><h3>Updating</h3>
    <p>Replace the workbook, re-run <code>python3 build.py</code>, and re-upload the regenerated <code>index.html</code>.</p></div>
  </div>`;
}

/* ---------- theme + nav ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch(e) { return null; } },
  set(k,v) { try { localStorage.setItem(k,v); } catch(e) {} },
};
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark';
  document.querySelector('#themeToggle .ic-sun').style.display = dark ? 'none' : '';
  document.querySelector('#themeToggle .ic-moon').style.display = dark ? '' : 'none';
  document.getElementById('themeLabel').textContent = dark ? 'Light mode' : 'Dark mode';
}
applyTheme(store.get('ffa-theme') === 'dark' ? 'dark' : 'light');
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next); store.set('ffa-theme', next);
});
if (store.get('ffa-nav') === 'collapsed') document.body.classList.add('nav-collapsed');
document.getElementById('collapseToggle').addEventListener('click', () => {
  document.body.classList.toggle('nav-collapsed');
  store.set('ffa-nav', document.body.classList.contains('nav-collapsed') ? 'collapsed' : 'open');
});
document.getElementById('menuBtn').addEventListener('click', () => document.body.classList.add('nav-open'));
document.getElementById('scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
document.getElementById('navlinks').addEventListener('click', () => document.body.classList.remove('nav-open'));

/* ---------- boot ---------- */
wireSearchBox('navSearch', 'navSuggest');
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    e.preventDefault(); document.getElementById('navSearch').focus();
  }
});
render();
</script>
</body>
</html>
