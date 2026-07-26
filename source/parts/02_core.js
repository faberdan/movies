<script>
/* ============ Faber Film Archive — app ============ */
'use strict';
const DATA = window.__DATA__;
const IMG = 'https://image.tmdb.org/t/p/w342';
const IMG_LG = 'https://image.tmdb.org/t/p/w500';
const IMG_PROF = 'https://image.tmdb.org/t/p/w185';

/* ---------- helpers ---------- */
const esc = s => s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr = s => esc(s).replace(/`/g,'&#96;');
const pct = v => v == null ? null : Math.round(v * 100) + '%';
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['’‘]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const fmtRuntime = mins => { if (mins == null) return null; const h = Math.floor(mins/60), m = mins%60; return h ? `${h}h ${m}m` : `${m}m`; };
const fmtDate = ts => { if(!ts) return null; const d = new Date(ts); return d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}); };
const plur = (n,s,p) => n === 1 ? s : (p || s+'s');

/* ---------- derived data ---------- */
const MOVIES = DATA.movies;
const NIM = DATA.notInMaster;
const byId = {};
MOVIES.forEach(m => {
  byId[m.id] = m;
  m.decade = m.year ? Math.floor(m.year/10)*10 : null;
  m.totalWins = (m.oscarWins||0) + (m.baftaWin === 'Yes' ? 1 : 0);
  m.totalNoms = (m.oscarNoms||0);
  m.hasAward = !!(m.oscarBP || m.oscarWins || m.oscarNoms || m.baftaWin === 'Yes');
  m.castNames = (m.cast||[]).map(c => c.n);
  m._search = [norm(m.title), norm(m.director), m.genres.map(norm).join(' '),
    norm(m.summary||'').slice(0,600),
    m.oscarWinCats.map(norm).join(' '), m.oscarNomCats.map(norm).join(' '),
    (m.awardsDetail||[]).map(a=>norm(a.category)).join(' '),
    m.castNames.map(norm).join(' ')].join(' | ');
});
const uniqSorted = arr => [...new Set(arr)].sort((a,b)=>a.localeCompare(b));
const ALL_GENRES = uniqSorted(MOVIES.flatMap(m => m.genres));
const ALL_DIRECTORS = uniqSorted(MOVIES.flatMap(m => m.directors));
const ALL_FEELS = uniqSorted(MOVIES.flatMap(m => m.feels));
const ALL_SERVICES = uniqSorted(MOVIES.flatMap(m => m.services));
const ALL_DECADES = uniqSorted(MOVIES.filter(m=>m.decade).map(m => String(m.decade))).map(Number);
const ALL_ACTORS = uniqSorted(MOVIES.flatMap(m => m.castNames));
const HAS_CAST = ALL_ACTORS.length > 0;

/* ---------- search ---------- */
function searchMovies(q) {
  const nq = norm(q);
  if (!nq) return [];
  const terms = nq.split(' ').filter(Boolean);
  const scored = [];
  for (const m of MOVIES) {
    if (!terms.every(t => m._search.includes(t))) continue;
    let score = 0;
    const nt = norm(m.title);
    if (nt === nq) score += 100;
    else if (nt.startsWith(nq)) score += 60;
    else if (nt.includes(nq)) score += 40;
    if (norm(m.director).includes(nq)) score += 30;
    if (m.castNames.some(c => norm(c).includes(nq))) score += 24;
    if (m.genres.some(g => norm(g).includes(nq))) score += 12;
    score += (m.imdb||0);
    scored.push([score, m]);
  }
  scored.sort((a,b) => b[0]-a[0] || a[1].title.localeCompare(b[1].title));
  return scored.map(x => x[1]);
}

/* ---------- sorting ---------- */
const SORTS = {
  'title':    {label:'Title A–Z',    fn:(a,b)=>a.title.localeCompare(b.title)},
  'newest':   {label:'Newest release', fn:(a,b)=>(b.year||0)-(a.year||0) || a.title.localeCompare(b.title)},
  'oldest':   {label:'Oldest release', fn:(a,b)=>(a.year||9999)-(b.year||9999) || a.title.localeCompare(b.title)},
  'imdb':     {label:'Highest IMDb',  fn:(a,b)=>(b.imdb??-1)-(a.imdb??-1)},
  'rtc':      {label:'Highest RT Critics', fn:(a,b)=>(b.rtCritics??-1)-(a.rtCritics??-1)},
  'rta':      {label:'Highest RT Audience', fn:(a,b)=>(b.rtAudience??-1)-(a.rtAudience??-1)},
  'shortest': {label:'Shortest runtime', fn:(a,b)=>(a.runtime??1e9)-(b.runtime??1e9)},
  'longest':  {label:'Longest runtime', fn:(a,b)=>(b.runtime??-1)-(a.runtime??-1)},
  'added':    {label:'Recently added', fn:(a,b)=>(b.addedTs||0)-(a.addedTs||0) || a.title.localeCompare(b.title)},
  'wins':     {label:'Most award wins', fn:(a,b)=>b.totalWins-a.totalWins || b.totalNoms-a.totalNoms},
  'noms':     {label:'Most nominations', fn:(a,b)=>b.totalNoms-a.totalNoms || b.totalWins-a.totalWins},
};

/* ---------- filters ---------- */
const MULTI_KEYS = ['decade','genre','status','wa','feel','service','runtime'];
const emptyF = () => ({ q:'', decade:[], genre:[], status:[], wa:[], feel:[], service:[], runtime:[],
  director:'', actor:'', fav:'', type:'', obp:'', oscw:false, oscn:false, bafta:false,
  imdbMin:0, rtcMin:0, rtaMin:0, sort:'title' });

function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const params = new URLSearchParams(qs || '');
  return { path, params };
}
function filtersFromParams(p) {
  const f = emptyF();
  for (const k of MULTI_KEYS) { const v = p.get(k); if (v) f[k] = v.split('|').filter(Boolean); }
  for (const k of ['q','director','actor','fav','type','obp','sort']) { const v = p.get(k); if (v) f[k] = v; }
  for (const k of ['oscw','oscn','bafta']) if (p.get(k) === '1') f[k] = true;
  for (const k of ['imdbMin','rtcMin','rtaMin']) { const v = parseFloat(p.get(k)); if (v) f[k] = v; }
  if (!SORTS[f.sort]) f.sort = 'title';
  return f;
}
function paramsFromFilters(f) {
  const p = new URLSearchParams();
  for (const k of MULTI_KEYS) if (f[k].length) p.set(k, f[k].join('|'));
  for (const k of ['q','director','actor','fav','type','obp']) if (f[k]) p.set(k, f[k]);
  for (const k of ['oscw','oscn','bafta']) if (f[k]) p.set(k, '1');
  for (const k of ['imdbMin','rtcMin','rtaMin']) if (f[k]) p.set(k, f[k]);
  if (f.sort !== 'title') p.set('sort', f.sort);
  return p;
}
const browseHash = f => { const qs = paramsFromFilters(f).toString(); return '#/browse' + (qs ? '?' + qs : ''); };

const RUNTIME_BUCKETS = { 'u90':{label:'< 90 min', test:r=>r<90}, '90-120':{label:'90–120', test:r=>r>=90&&r<=120},
  '120-150':{label:'120–150', test:r=>r>120&&r<=150}, 'o150':{label:'150+ min', test:r=>r>150} };

function applyFilters(f) {
  let list = f.q ? searchMovies(f.q) : MOVIES.slice();
  list = list.filter(m => {
    if (f.decade.length && !f.decade.includes(String(m.decade))) return false;
    if (f.genre.length && !f.genre.every(g => m.genres.includes(g))) return false;
    if (f.status.length && !f.status.includes(m.status || '(none)')) return false;
    if (f.wa.length && !f.wa.includes(m.watchAgain || '(none)')) return false;
    if (f.feel.length && !f.feel.some(x => m.feels.includes(x))) return false;
    if (f.service.length && !f.service.some(x => m.services.includes(x))) return false;
    if (f.runtime.length && !(m.runtime != null && f.runtime.some(k => RUNTIME_BUCKETS[k].test(m.runtime)))) return false;
    if (f.director && !m.directors.includes(f.director)) return false;
    if (f.actor && !m.castNames.includes(f.actor)) return false;
    if (f.fav === 'Yes' && m.favorite !== 'Yes') return false;
    if (f.fav === 'No' && m.favorite !== 'No') return false;
    if (f.type && m.type !== f.type) return false;
    if (f.obp === 'Winner' && m.oscarBP !== 'Winner') return false;
    if (f.obp === 'Nominee' && m.oscarBP !== 'Nominee') return false;
    if (f.obp === 'Any' && !m.oscarBP) return false;
    if (f.oscw && !(m.oscarWins > 0)) return false;
    if (f.oscn && !(m.oscarNoms > 0)) return false;
    if (f.bafta && m.baftaWin !== 'Yes') return false;
    if (f.imdbMin && !(m.imdb >= f.imdbMin)) return false;
    if (f.rtcMin && !(m.rtCritics != null && m.rtCritics*100 >= f.rtcMin)) return false;
    if (f.rtaMin && !(m.rtAudience != null && m.rtAudience*100 >= f.rtaMin)) return false;
    return true;
  });
  if (!(f.q && f.sort === 'title')) list.sort(SORTS[f.sort].fn); // keep relevance order for pure search
  return list;
}

/* ---------- card ---------- */
const STATUS_CLASS = { 'Watched':'watched', 'Up Next':'upnext', 'For Later':'later', 'Not Gonna':'notgonna' };
function posterHTML(m, cls) {
  const ph = `<div class="poster-ph" ${m.poster?'style="display:none"':''}>
      <div><div class="ph-title">${esc(m.title)}</div><div class="ph-rule"></div></div>
      <div class="ph-year">${esc(m.year||'')}</div></div>`;
  const img = m.poster ? `<img loading="lazy" src="${IMG}${attr(m.poster)}" alt="${attr(m.title)} poster"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  return `<div class="poster ${cls||''}">${img}${ph}</div>`;
}
function cardHTML(m) {
  const awards = m.oscarBP === 'Winner' ? '★ BEST PICTURE' : (m.baftaWin === 'Yes' ? '★ BAFTA' : (m.oscarBP === 'Nominee' ? 'BP NOMINEE' : ''));
  const posterCls = awards && !m.poster ? 'badged' : '';
  const rt = [];
  if (m.imdb != null) rt.push(`<span title="IMDb rating"><span class="k">IMDb</span> ${m.imdb.toFixed(1)}</span>`);
  if (m.rtCritics != null) rt.push(`<span title="Rotten Tomatoes critics"><span class="k">RT</span> ${pct(m.rtCritics)}</span>`);
  if (m.rtAudience != null) rt.push(`<span title="RT audience"><span class="k">AUD</span> ${pct(m.rtAudience)}</span>`);
  const meta = [m.year, m.genres.slice(0,2).join(', '), fmtRuntime(m.runtime)].filter(Boolean);
  return `<a class="mcard" href="#/movie/${attr(m.id)}" aria-label="${attr(m.title)}${m.year?' ('+m.year+')':''}">
    ${posterHTML(m, posterCls)}
    ${m.favorite === 'Yes' ? '<div class="badge-fav" title="Favorite">♥</div>' : ''}
    ${awards ? `<div class="badge-award">${awards}</div>` : ''}
    <div class="mcard-body">
      <div class="t">${esc(m.title)}</div>
      <div class="m">${meta.map(esc).join(' · ')}</div>
      ${rt.length ? `<div class="ratings">${rt.join('')}</div>` : ''}
      ${m.status ? `<div class="status-dot ${STATUS_CLASS[m.status]||''}">${esc(m.status)}</div>` : ''}
    </div></a>`;
}
const rowHTML = list => `<div class="row-scroll">${list.map(cardHTML).join('')}</div>`;
const gridHTML = list => `<div class="grid">${list.map(cardHTML).join('')}</div>`;

/* ---------- router ---------- */
const $main = () => document.querySelector('main');
function render() {
  const { path, params } = parseHash();
  const seg = path.split('/').filter(Boolean);
  document.querySelectorAll('#navlinks a').forEach(a => a.classList.remove('active'));
  const mark = k => { const el = document.querySelector(`#navlinks a[data-nav="${k}"]`); if (el) el.classList.add('active'); };
  closeSuggest();
  let html = '';
  if (!seg.length) { mark('home'); html = viewHome(); }
  else if (seg[0] === 'browse') { mark('browse'); html = viewBrowse(filtersFromParams(params)); }
  else if (seg[0] === 'movie' && byId[seg[1]]) { html = viewDetail(byId[seg[1]]); }
  else if (seg[0] === 'collections') { mark('collections'); html = viewCollections(); }
  else if (seg[0] === 'dashboard') { mark('dashboard'); html = viewDashboard(); }
  else if (seg[0] === 'notinmaster') { mark('notinmaster'); html = viewNIM(params); }
  else if (seg[0] === 'about') { mark('about'); html = viewAbout(); }
  else { html = `<div class="wrap"><div class="empty"><div class="big">Page not found</div><a class="btn" style="margin-top:14px" href="#/">Back home</a></div></div>`; }
  $main().innerHTML = html;
  document.body.classList.remove('nav-open');
  window.scrollTo(0, 0);
  if (seg[0] === 'browse') wireBrowse(filtersFromParams(params));
  if (!seg.length) wireHome();
  if (seg[0] === 'notinmaster') wireNIM(params);
}
window.addEventListener('hashchange', render);
</script>
