/* Steelmonks Magazin – Artikel: Inhaltsverzeichnis, Einblenden, Teilen */
(function(){
'use strict';
const R = document.querySelector('.smx[data-mag-art]'); if (!R) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/* Einblenden */
const io = 'IntersectionObserver' in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -6% 0px' }) : null;
$$('[data-rv]', R).forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* Inhaltsverzeichnis aus den H2 des Artikels */
const body = $('#arBody'), H = body ? $$('h2', body).filter(h => h.textContent.trim()) : [];
if (H.length >= 3){
  const slug = t => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  H.forEach((h, i) => { if (!h.id) h.id = slug(h.textContent) || 'teil-' + (i + 1); });
  const li = H.map(h => '<li><a href="#' + h.id + '">' + esc(h.textContent.trim()) + '</a></li>').join('');
  const toc = $('#arToc'), tm = $('#arTocM');
  if (toc){ $('ol', toc).innerHTML = li; toc.hidden = false; }
  if (tm){ $('ol', tm).innerHTML = li; tm.hidden = false; tm.addEventListener('click', e => { if (e.target.closest('a')) tm.open = false; }); }
  if ('IntersectionObserver' in window && toc){
    const links = $$('a', toc), on = id => links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
    const hio = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) on(e.target.id); }); }, { rootMargin:'-20% 0px -70% 0px' });
    H.forEach(h => hio.observe(h));
  }
}

/* Teilen */
$$('[data-share]', R).forEach(b => b.addEventListener('click', async () => {
  const data = { title: document.title, url: location.href.split('#')[0] };
  try {
    if (navigator.share){ await navigator.share(data); return; }
    await navigator.clipboard.writeText(data.url); const t = b.textContent; b.textContent = 'Link kopiert'; setTimeout(() => b.textContent = t, 1800);
  } catch(e){}
}));
})();
