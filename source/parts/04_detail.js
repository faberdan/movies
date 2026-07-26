<script>
/* ---------- movie detail ---------- */
function viewDetail(m) {
  const meta = [];
  if (m.director) meta.push(`Directed by <b>${esc(m.director)}</b>`);
  if (m.runtime != null) meta.push(fmtRuntime(m.runtime));
  if (m.type) meta.push(esc(m.type));
  const scores = [];
  const sc = (v,l) => scores.push(`<div class="score"><div class="v">${v}</div><div class="l">${l}</div></div>`);
  if (m.imdb != null) sc(m.imdb.toFixed(1), 'IMDb / 10');
  if (m.rtCritics != null) sc(pct(m.rtCritics), 'RT Critics');
  if (m.rtAudience != null) sc(pct(m.rtAudience), 'RT Audience');

  const personal = [];
  const pi = (l,v) => personal.push(`<div class="pi"><div class="l">${l}</div><div class="v">${v}</div></div>`);
  if (m.status) pi('Status', esc(m.status));
  if (m.favorite) pi('Favorite', m.favorite === 'Yes' ? '♥ Yes' : esc(m.favorite));
  if (m.watchAgain) pi('Watch again?', esc(m.watchAgain));
  if (m.feels.length) pi('Feel', m.feels.map(esc).join(', '));
  if (m.services.length) pi('Where', m.services.map(esc).join(', '));

  /* awards */
  let awardsHTML = '';
  if (m.hasAward || (m.awardsDetail||[]).length) {
    let banner = '';
    if (m.oscarBP === 'Winner') banner = `<div class="award-banner"><span class="tro">🏆</span><div><b>Academy Award — Best Picture Winner</b>${m.oscarYear ? `<span style="color:var(--ink-2)"> · ${m.oscarYear} Oscar year</span>` : ''}</div></div>`;
    else if (m.oscarBP === 'Nominee') banner = `<div class="award-banner"><span class="tro">🎬</span><div><b>Best Picture Nominee</b>${m.oscarYear ? `<span style="color:var(--ink-2)"> · ${m.oscarYear} Oscar year</span>` : ''}</div></div>`;
    if (m.baftaWin === 'Yes') banner += `<div class="award-banner"><span class="tro">🎭</span><div><b>BAFTA Best Film Winner</b>${m.baftaYear ? `<span style="color:var(--ink-2)"> · ${m.baftaYear}</span>` : ''}</div></div>`;
    const cols = [];
    if (m.oscarWinCats.length) cols.push(`<div class="award-list"><h4>Oscar wins <span class="n">(${m.oscarWins ?? m.oscarWinCats.length})</span></h4>
      <ul>${m.oscarWinCats.map(c => `<li><span>${esc(c)}</span><span class="res won">WON</span></li>`).join('')}</ul></div>`);
    else if (m.oscarWins) cols.push(`<div class="award-list"><h4>Oscar wins <span class="n">(${m.oscarWins})</span></h4>
      <p style="color:var(--ink-3);font-size:13px">Categories not recorded in source data.</p></div>`);
    if (m.oscarNomCats.length) cols.push(`<div class="award-list"><h4>Oscar nominations <span class="n">(${m.oscarNoms ?? m.oscarNomCats.length})</span></h4>
      <ul>${m.oscarNomCats.map(c => `<li><span>${esc(c)}</span><span class="res nom">NOMINATED</span></li>`).join('')}</ul></div>`);
    const detail = (m.awardsDetail||[]);
    let timeline = '';
    if (detail.length) {
      const bodies = [...new Set(detail.map(a => a.body))];
      timeline = `<div class="award-list" style="margin-top:16px"><h4>Recorded award history — ${bodies.map(esc).join(' & ')}</h4>
        <ul>${detail.slice().sort((a,b)=>(a.body||'').localeCompare(b.body||'')||( a.category||'').localeCompare(b.category||'')).map(a =>
          `<li><span>${esc(a.body)}${a.category ? ' — '+esc(a.category) : ''}${a.filmYear ? ` <span style="color:var(--ink-3)">(${a.filmYear})</span>` : ''}</span>
           <span class="res ${a.result==='Won'?'won':'nom'}">${esc((a.result||'').toUpperCase())}</span></li>`).join('')}</ul></div>`;
    }
    awardsHTML = `<div class="awards-box"><h2>Awards</h2>${banner}
      ${cols.length ? `<div class="award-cols">${cols.join('')}</div>` : ''}${timeline}
      <p class="note">Oscar data covers Best Picture nominees/winners plus category detail where the source provided it. BAFTA data covers Best Film winners only — absence of a record here doesn't mean a film won nothing.</p></div>`;
  }

  /* cast */
  let castHTML = '';
  if ((m.cast||[]).length) {
    castHTML = `<div class="subsec"><h2>Cast</h2><div class="cast-row">${m.cast.map(c => `
      <a class="cast-chip" href="${browseHash({...emptyF(), actor:c.n})}" title="More with ${attr(c.n)}">
        ${c.p ? `<img class="av" src="${IMG_PROF}${attr(c.p)}" alt="" loading="lazy">` : `<div class="av ph">${esc((c.n[0]||'').toUpperCase())}</div>`}
        <div class="nm">${esc(c.n)}</div>${c.c ? `<div class="ch">${esc(c.c)}</div>` : ''}</a>`).join('')}</div></div>`;
  }

  /* discovery rows */
  const disc = [];
  if (m.director) {
    const same = MOVIES.filter(x => x.id !== m.id && x.directors.some(d => m.directors.includes(d))).sort(SORTS.imdb.fn);
    if (same.length) disc.push({ title:`More from ${esc(m.directors[0])}`, list:same,
      href: browseHash({...emptyF(), director:m.directors[0]}) });
  }
  if ((m.cast||[]).length) {
    const castSet = new Set(m.castNames);
    const shared = MOVIES.filter(x => x.id !== m.id && x.castNames.some(n => castSet.has(n)))
      .map(x => [x.castNames.filter(n => castSet.has(n)).length, x])
      .sort((a,b) => b[0]-a[0] || (b[1].imdb||0)-(a[1].imdb||0)).map(x => x[1]);
    if (shared.length) disc.push({ title:'Shared cast', list:shared });
  }
  if (m.oscarYear != null) {
    const cls = MOVIES.filter(x => x.id !== m.id && x.oscarYear === m.oscarYear).sort((a,b)=>(b.oscarWins||0)-(a.oscarWins||0));
    if (cls.length) disc.push({ title:`Oscar class of ${m.oscarYear}`, list:cls,
      sub:'Other Best Picture contenders from the same Oscar year in the archive.' });
  }
  if (m.genres.length) {
    const gset = new Set(m.genres);
    const sim = MOVIES.filter(x => x.id !== m.id)
      .map(x => [x.genres.filter(g => gset.has(g)).length, x])
      .filter(x => x[0] >= Math.min(2, m.genres.length))
      .sort((a,b) => b[0]-a[0] || (b[1].imdb||0)-(a[1].imdb||0)).map(x => x[1]);
    if (sim.length) disc.push({ title:'Similar by genre', list:sim,
      href: browseHash({...emptyF(), genre:[...m.genres].slice(0,2), sort:'imdb'}) });
  }
  const discHTML = disc.map(d => `<div class="subsec"><div class="section-head"><h2>${d.title}</h2>
      ${d.href ? `<a class="more" href="${d.href}">View all →</a>` : ''}</div>
      ${rowHTML(d.list.slice(0,14))}</div>`).join('');

  return `<div class="wrap">
    <div class="detail-hero">
      <div class="poster-col">${posterHTML({...m, poster: m.poster})}</div>
      <div>
        <h1 class="d-title">${esc(m.title)}${m.year ? `<span class="yr">${m.year}</span>` : ''}</h1>
        <div class="d-meta">${meta.join('<span style="color:var(--ink-3)">·</span>')}</div>
        ${m.genres.length ? `<div class="pill-row">${m.genres.map(g =>
          `<a class="pill" href="${browseHash({...emptyF(), genre:[g]})}">${esc(g)}</a>`).join('')}
          ${m.oscarBP === 'Winner' ? '<span class="pill gold">🏆 Best Picture</span>' : ''}
          ${m.baftaWin === 'Yes' ? '<span class="pill gold">BAFTA Best Film</span>' : ''}</div>` : ''}
        ${scores.length ? `<div class="score-row">${scores.join('')}</div>` : ''}
        ${personal.length ? `<div class="personal-box">${personal.join('')}</div>` : ''}
        ${m.summary ? `<p class="d-summary">${esc(m.summary)}</p>` : ''}
        <div class="d-actions">
          ${m.trailer ? `<a class="btn primary" href="${attr(m.trailer)}" target="_blank" rel="noopener">▶ Watch trailer</a>` : ''}
          ${m.link ? `<a class="btn" href="${attr(m.link)}" target="_blank" rel="noopener">Open movie link ↗</a>` : ''}
        </div>
      </div>
    </div>
    ${awardsHTML}${castHTML}${discHTML}
    <a class="backlink" href="#/browse">← Back to browse</a>
  </div>`;
}
</script>
