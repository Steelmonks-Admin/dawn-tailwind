/* Steelmonks – Footer-Seiten: Einblenden, Inhaltsverzeichnis, FAQ-Filter, Gutschein, Newsletter, Online-Widerruf */
(function(){
'use strict';
const R = document.querySelector('.smx[data-fp]'); if (!R) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const ss = { get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }, set(k, v){ try { sessionStorage.setItem(k, v); } catch(e){} }, del(k){ try { sessionStorage.removeItem(k); } catch(e){} } };
const go = el => { if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 140, behavior: RM ? 'auto' : 'smooth' }); };

/* Einblenden */
const io = 'IntersectionObserver' in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -6% 0px' }) : null;
$$('[data-rv]', R).forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* Service-Navigation: aktive Seite sichtbar */
// nur die Leiste waagerecht verschieben: scrollIntoView hat beim Laden auch die ganze Seite nach unten geschoben
const cur = $('.ft-nav [aria-current]', R); if (cur) requestAnimationFrame(() => { const w = cur.closest('.wrap'); if (w) w.scrollLeft += cur.getBoundingClientRect().left - w.getBoundingClientRect().left - (w.clientWidth - cur.offsetWidth) / 2; });

/* Rechtstexte: Inhaltsverzeichnis aus den H2 */
$$('.ft-doc', R).forEach(doc => {
  const body = $('.ft-body', doc), toc = $('.ft-toc', doc); if (!body || !toc) return;
  const hs = $$('h2', body);
  if (hs.length < 2){ toc.hidden = true; return; }
  hs.forEach((h, i) => { if (!h.id) h.id = 'abschnitt-' + (i + 1); });
  $('ol', toc).innerHTML = hs.map(h => '<li><a href="#' + h.id + '">' + esc(h.textContent.trim()) + '</a></li>').join('');
  toc.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); go(document.getElementById(a.getAttribute('href').slice(1))); });
});

/* Steelmonks-Story: Pfeile */
const st = $('#abStory', R), sn = $$('[data-sn]', R);
if (st && sn.length){
  const upd = () => { sn[0].disabled = st.scrollLeft < 8; sn[1].disabled = st.scrollLeft + st.clientWidth >= st.scrollWidth - 8; };
  sn.forEach(b => b.addEventListener('click', () => { const c = st.firstElementChild; st.scrollBy({ left: +b.dataset.sn * ((c ? c.offsetWidth : 260) + 14) * 2, behavior: RM ? 'auto' : 'smooth' }); }));
  st.addEventListener('scroll', upd, { passive:true }); upd();
}

/* Gutschein: Betrag live auf der Karte */
const gc = $('#ftGcForm', R);
if (gc){
  const upd = () => { const c = $('input[name=id]:checked', gc); if (!c) return; $('#ftGcAmt').textContent = c.dataset.amt; $('#ftGcBuy').textContent = 'Gutschein über ' + c.dataset.amt + ' kaufen'; };
  gc.addEventListener('change', upd); upd();
}

/* FAQ: Suche und Themen */
const fq = $('#ftFaqQ', R), fc = $('#ftFaqC', R);
if (fq && fc){
  let cat = 'Alle';
  const run = () => {
    const q = fq.value.trim().toLowerCase(); let n = 0;
    $$('#ftFaq details', R).forEach(d => { const on = (cat === 'Alle' || d.dataset.c === cat) && (!q || d.textContent.toLowerCase().includes(q)); d.hidden = !on; if (on) n++; if (q && on) d.open = true; });
    $$('#ftFaq .ft-faq-g', R).forEach(g => g.hidden = !$$('details:not([hidden])', g).length);
    $('#ftFaqNone', R).hidden = n > 0;
  };
  fc.addEventListener('click', e => { const b = e.target.closest('[data-fc]'); if (!b) return; cat = b.dataset.fc; $$('[data-fc]', fc).forEach(x => x.setAttribute('aria-pressed', x === b)); run(); });
  let t; fq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
}

/* Newsletter (gleiche Klaviyo-Liste wie im Footer) */
const nl = $('#ftNl', R);
if (nl){
  nl.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#ftNlE', nl), email = input.value.trim(), btn = $('button', nl);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ input.focus(); return; }
    btn.disabled = true;
    // signup 'var3' startet in Klaviyo den Flow „Flow 2 (Free Shipping)“ mit dem WelcomeShipping-Code (wie das Popup)
    fetch('https://a.klaviyo.com/client/subscriptions?company_id=' + encodeURIComponent(nl.dataset.company), {
      method:'POST', headers:{ 'Content-Type':'application/vnd.api+json', 'revision':'2025-01-15' },
      body: JSON.stringify({ data:{ type:'subscription', attributes:{ custom_source:'Newsletter-Seite', profile:{ data:{ type:'profile', attributes:{ email, properties:{ signup:'var3' } } } } }, relationships:{ list:{ data:{ type:'list', id: nl.dataset.list } } } } })
    }).then(r => { if (!r.ok) throw new Error(r.status); nl.hidden = true; $('#ftNlOk', R).hidden = false; try { (window.dataLayer = window.dataLayer || []).push({ event:'newsletter_seite' }); } catch(x){} })
      .catch(() => { btn.disabled = false; alert('Das hat leider nicht geklappt. Bitte versuch es noch einmal.'); });
  });
}

/* Online-Widerruf (§ 356a BGB): Formular → „Widerruf bestätigen“ → Eingangsbestätigung */
const wf = $('#wrForm', R);
if (wf){
  const ok = $('#wrOk', R), err = $('#wrErr', R), steps = $$('#wrSteps li', R);
  const done = d => {
    steps.forEach(li => li.classList.add('on')); wf.hidden = true; ok.hidden = false;
    ok.innerHTML = '<p class="eyebrow" style="color:var(--ok)">Eingangsbestätigung</p><h2>Dein Widerruf ist bei uns eingegangen.</h2><dl><dt>Eingang</dt><dd>' + esc(d.time) + '</dd><dt>Name</dt><dd>' + esc(d.name) + '</dd><dt>Bestellnummer</dt><dd>' + esc(d.order) + '</dd><dt>Umfang</dt><dd>' + esc(d.umf) + '</dd>' + (d.why ? '<dt>Grund</dt><dd>' + esc(d.why) + '</dd>' : '') + '</dl><p>Diese Bestätigung mit Inhalt, Datum und Uhrzeit schicken wir Dir auch per E-Mail an <b>' + esc(d.mail) + '</b>. Ob und in welchem Umfang der Widerruf wirksam ist, prüfen wir noch und melden uns bei Dir.</p>';
    go(ok);
  };
  // Rückkehr nach dem Absenden
  if (/[?&]contact_posted=true/.test(location.search)){
    let d = null; try { d = JSON.parse(ss.get('smWiderruf') || 'null'); } catch(e){}
    ss.del('smWiderruf'); history.replaceState(null, '', location.pathname);
    if (d) done(d);
  }
  wf.addEventListener('change', e => { if (e.target.name === 'contact[Umfang]') $('#wrItems', wf).hidden = e.target.value !== 'Einzelne Artikel'; });
  wf.addEventListener('submit', e => {
    const name = $('#wrName', wf).value.trim(), order = $('#wrOrder', wf).value.trim(), mail = $('#wrMail', wf).value.trim();
    if (!name || !order || !/.+@.+\..+/.test(mail)){ e.preventDefault(); err.textContent = 'Bitte gib Name, Bestellnummer und E-Mail-Adresse an.'; return; }
    err.textContent = '';
    const u = ($('input[name="contact[Umfang]"]:checked', wf) || {}).value || 'Gesamte Bestellung', items = $('#wrItems', wf).value.trim(), why = $('#wrWhy', wf).value;
    const now = new Date(), time = now.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }) + ', ' + now.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) + ' Uhr';
    const umf = u + (u === 'Einzelne Artikel' && items ? ': ' + items : '');
    $('#wrTime', wf).value = time;
    $('#wrBody', wf).value = 'Hiermit widerrufe ich den von mir abgeschlossenen Vertrag.\nName: ' + name + '\nBestellnummer: ' + order + '\nE-Mail: ' + mail + '\nUmfang: ' + umf + (why ? '\nGrund (freiwillig): ' + why : '') + '\nAbgesendet über die Online-Widerrufsfunktion am ' + time + '.';
    ss.set('smWiderruf', JSON.stringify({ name, order, mail, umf, why, time }));
  });
}

/* Trusted Shops: aktuelle Note (letzte 12 Monate) und Gesamtzahl aus dem öffentlichen Feed, sonst bleiben die Werte aus dem Theme */
const tsR = $$('[data-ts-rating]', R), tsN = $$('[data-ts-count]', R);
if (tsR.length || tsN.length){
  const apply = g => { if (!g) return; if (g.r) tsR.forEach(el => { el.textContent = g.r.toFixed(2).replace('.', ','); }); if (g.n) tsN.forEach(el => { el.textContent = new Intl.NumberFormat('de-DE').format(g.n); }); };
  let c = null; try { c = JSON.parse(sessionStorage.getItem('smhTs') || 'null'); } catch (e) {}
  if (c) apply(c);
  else fetch('https://integrations.etrusted.com/feeds/grades/v1/channels/chl-056f6db9-2266-48bf-8c7b-44c1673f979d/touchpoints/all/feed.json', { credentials:'omit' })
    .then(r => r.ok ? r.json() : null).then(d => { if (!d || !d.grades) return; const g = { r: (d.grades['365days'] || {}).rating, n: (d.grades.overall || {}).count }; if (!g.r || !g.n) return; apply(g); try { sessionStorage.setItem('smhTs', JSON.stringify(g)); } catch (e) {} }).catch(() => {});
}
})();
