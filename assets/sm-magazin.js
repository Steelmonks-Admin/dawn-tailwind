/* Steelmonks Magazin: Einblenden, „Mehr Artikel laden“, Live-Suche, Story-Pfeile */
(function(){
'use strict';
const R = document.querySelector('.smx[data-mag]'); if (!R) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const ROOT = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
let TOP = []; try { TOP = JSON.parse(R.dataset.topics || '[]'); } catch(e){}

/* Einblenden beim Scrollen */
const io = 'IntersectionObserver' in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -6% 0px' }) : null;
const reveal = root => $$('[data-rv]:not(.in)', root).forEach(el => io ? io.observe(el) : el.classList.add('in'));
reveal(R);

/* Mehr Artikel laden: nächste Seite nachladen, der Link bleibt für Suchmaschinen */
const grid = $('#blGrid'), more = $('#blMore'), SID = R.dataset.section;
if (more) more.addEventListener('click', async e => {
  e.preventDefault(); if (more.getAttribute('aria-busy') === 'true') return;
  const label = more.textContent; more.setAttribute('aria-busy', 'true'); more.textContent = 'Lädt …';
  try {
    const u = new URL(more.href, location.href); u.searchParams.set('section_id', SID);
    const r = await fetch(u, { credentials:'same-origin' }); if (!r.ok) throw new Error(r.status);
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    $$('#blGrid > *', doc).forEach(x => grid.append(x)); reveal(grid);
    const nx = $('#blMore', doc);
    if (nx){ more.href = nx.getAttribute('href'); more.textContent = label; more.removeAttribute('aria-busy'); }
    else more.remove();
  } catch(x){ location.href = more.href; }
});

/* Live-Suche über Shopifys Artikelsuche; Enter führt zur vollen Trefferliste */
const q = $('#blQ'), status = $('#blStatus');
const text = h => { const d = document.createElement('div'); d.innerHTML = String(h || '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' '); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
const cut = (s, n) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + ' …' : s;
const clean = t => String(t || '').replace(/^[\p{Extended_Pictographic}️‍\s]+|[\p{Extended_Pictographic}️‍\s]+$/gu, '') || t;
const pxUrl = (R.querySelector('.bl-empty img, .bl-rub img') || {}).src || '';
function card(a, i){
  const tags = Array.isArray(a.tags) ? a.tags : [];
  const tp = tags.find(t => TOP.includes(t)) || '';
  const im = a.image ? '<span class="im"><img src="' + esc(a.image + (a.image.includes('?') ? '&' : '?') + 'width=420') + '" alt="" loading="lazy" width="420" height="280"></span>' : '<span class="im ph">' + (pxUrl ? '<img src="' + esc(pxUrl) + '" alt="">' : '') + '</span>';
  const mins = Math.max(2, Math.round(text(a.body).split(' ').length / 200));
  return '<a class="bl-card in" href="' + esc(a.url) + '" style="--d:' + (i % 3 * .06) + 's">' + im + '<span class="bd">' + (tp ? '<span class="tp">' + esc(tp) + '</span>' : '') + '<b>' + esc(clean(a.title)) + '</b><span class="x">' + esc(cut(text(a.summary_html) || text(a.body), 150)) + '</span><span class="mt">' + mins + ' Min. Lesezeit<i>Lesen →</i></span></span></a>';
}
let saved = null, ctl = null, t0 = null;
function restore(){
  if (!saved) return;
  grid.replaceChildren(...saved.nodes); status.innerHTML = saved.status; if (saved.more) saved.more.hidden = false; saved = null;
}
async function run(v){
  if (v.length < 2){ restore(); return; }
  if (!saved) saved = { nodes:[...grid.children], status:status.innerHTML, more:$('.bl-more', R) };
  if (ctl) ctl.abort(); ctl = new AbortController();
  try {
    const u = ROOT + 'search/suggest.json?q=' + encodeURIComponent(v) + '&resources[type]=article&resources[limit]=10';
    const r = await (await fetch(u, { signal:ctl.signal, credentials:'same-origin' })).json();
    const A = (r.resources && r.resources.results && r.resources.results.articles) || [];
    grid.innerHTML = A.length ? A.map(card).join('') : '<div class="bl-empty">' + (pxUrl ? '<img src="' + esc(pxUrl) + '" alt="">' : '') + '<b>Dazu haben wir noch nichts geschrieben.</b><span class="muted">Frag uns einfach direkt – wir antworten innerhalb von zwei Werktagen.</span><a class="btn btn-p btn-s" href="/pages/kontakt">Frage stellen</a></div>';
    if (saved.more) saved.more.hidden = true;
    const all = ROOT + 'search?type=article&q=' + encodeURIComponent(v);
    status.innerHTML = '<span>' + (A.length ? '<b>' + A.length + '</b> Top-Treffer' : 'Keine Treffer') + ' zu „' + esc(v) + '“' + (A.length ? ' · <a href="' + esc(all) + '">Alle Treffer anzeigen</a>' : '') + '</span><button class="sa-quiet" type="button" data-clear>Suche zurücksetzen</button>';
  } catch(e){ /* abgebrochen oder offline: Enter führt weiter zur normalen Suche */ }
}
if (q){
  q.addEventListener('input', () => { clearTimeout(t0); t0 = setTimeout(() => run(q.value.trim()), 180); });
  q.addEventListener('keydown', e => { if (e.key === 'Escape'){ q.value = ''; restore(); } });
}
if (status) status.addEventListener('click', e => { if (e.target.closest('[data-clear]')){ q.value = ''; restore(); q.focus(); } });

/* Story-Serie: Pfeile */
const st = $('#blStory'), sn = $$('[data-sn]', R);
if (st && sn.length){
  const upd = () => { sn[0].disabled = st.scrollLeft < 8; sn[1].disabled = st.scrollLeft + st.clientWidth >= st.scrollWidth - 8; };
  sn.forEach(b => b.addEventListener('click', () => { const c = st.firstElementChild; st.scrollBy({ left: +b.dataset.sn * ((c ? c.offsetWidth : 260) + 14) * 2, behavior: RM ? 'auto' : 'smooth' }); }));
  st.addEventListener('scroll', upd, { passive:true }); addEventListener('resize', upd); upd();
}
})();
