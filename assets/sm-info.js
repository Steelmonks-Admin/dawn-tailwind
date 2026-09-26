/* Steelmonks – Montage & Pflege, Oberflächen (aus dem Prototyp erzeugt) */
(function(){
'use strict';
const ROOT = document.querySelector('.smx[data-info]'); if (!ROOT) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => new Intl.NumberFormat('de-DE').format(v);
let IMG = {}; try { IMG = JSON.parse(document.getElementById('smInfoImg').textContent); } catch(e){}
const img = k => IMG[k] || '';
const io = 'IntersectionObserver' in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -6% 0px' }) : null;
const reveal = root => $$('[data-rv]:not(.in)', root).forEach(el => io ? io.observe(el) : el.classList.add('in'));
const PAGES = {};
/* Montage & Pflege · Oberflächen */
PAGES.media = function(){
  const root = ROOT, btn = $('#inNbBtn'), nb = $('#inNb');
  const show = open => { nb.hidden = !open; btn.setAttribute('aria-expanded', open); if (open) reveal(nb); };
  btn.addEventListener('click', () => show(nb.hidden));
  root.addEventListener('click', e => { const a = e.target.closest('[data-nb]'); if (!a) return; e.preventDefault(); show(true); const y = nb.getBoundingClientRect().top + scrollY - 90; scrollTo({ top:y, behavior: RM ? 'auto' : 'smooth' }); });
  reveal(root);
};
PAGES.oberflaechen = function(){
  const root = ROOT;
  // Anteile: Stück mit Oberflächen-Angabe seit 2020, nach verkauften Stück gewichtet
  const N = 63765;
  const F = [
    { k:'schwarz', n:'Schwarz', code:'RAL 9005', typ:'Pulverbeschichtung', img:'of_schwarz', c:'#16181a', share:34.7,
      t:'Feinstrukturiert und matt. Klassisch und zeitlos – passt zu modernen wie traditionellen Räumen und wirkt professionell.',
      kv:[['Optik','Matt, feine Struktur'],['Verändert sich','Nein'],['Draußen','Geeignet']], data:'Beim Zunftschild wählen <b>57 %</b> Schwarz.' },
    { k:'anthrazit', n:'Anthrazit', code:'RAL 7016', typ:'Pulverbeschichtung', img:'of_anthrazit', c:'#3a4046', share:27.0,
      t:'Seidenmatt in einem dunklen Grauton. Elegant und minimalistisch – und widerstandsfähig gegen Wind und Wetter.',
      kv:[['Optik','Seidenmatt, dunkelgrau'],['Verändert sich','Nein'],['Draußen','Geeignet']], data:'Bei Hausnummern mit Namen die erste Wahl: <b>54 %</b>.' },
    { k:'edelstahl', n:'Edelstahl', code:'satiniert', typ:'Edelstahl', img:'of_edelstahl', c:'#b9bdc1', share:24.8, wide:true,
      t:'Satiniert: eine feine, gleichmäßige Schleifstruktur mit seidigem, silbernem Schimmer. Rostet nicht und behält seinen Ton – auch im Freien.',
      kv:[['Optik','Seidiger Silberschimmer'],['Verändert sich','Nein'],['Draußen','Geeignet']], data:'Beim Familienschild Baum des Lebens: <b>20 %</b>.' },
    { k:'corten', n:'Cortenstahl', code:'Rost', typ:'Cortenstahl', img:'of_corten', c:'#8a4a22', share:9.7, wide:true,
      t:'Wetterfester Baustahl, der an der Luft eine schützende Rostpatina bildet. Der warme Braunton verändert sich über die Jahre, Kratzer schließen sich von selbst. Zu 100 % recycelbar.',
      kv:[['Optik','Rostpatina, warmes Braun'],['Verändert sich','Ja, dunkelt nach'],['Draußen','Ideal']], data:'Rund <b>18 Monate</b> bis zur fertigen Patina.' },
    { k:'weiss', n:'Weiß', code:'RAL 9010', typ:'Pulverbeschichtung', img:'of_weiss', c:'#eeeeea', share:2.0,
      t:'Reines, helles Weiß – freundlich und klar, besonders auf dunklen Wänden.',
      kv:[['Optik','Hell, reinweiß'],['Verändert sich','Nein'],['Draußen','Geeignet']], data:'' },
    { k:'gold', n:'Gold', code:'goldfarben', typ:'Pulverbeschichtung', img:'of_gold', c:'#b59a52', share:1.9,
      t:'Goldfarbene Pulverbeschichtung für festliche Anlässe und edle Akzente.',
      kv:[['Optik','Goldfarben'],['Verändert sich','Nein'],['Draußen','Geeignet']], data:'' }
  ];
  let cur = 'schwarz';
  const pct = v => (v >= 10 ? Math.round(v) : v.toFixed(1).replace('.', ',')) + ' %';
  $('#ofBar').innerHTML = F.map(f => '<i style="background:' + f.c + '" data-w="' + f.share + '" title="' + esc(f.n) + ' ' + pct(f.share) + '"></i>').join('');
  $('#ofLg').innerHTML = F.map(f => '<span><i style="background:' + f.c + '"></i>' + esc(f.n) + ' ' + pct(f.share) + '</span>').join('');
  $('#ofN').textContent = num(N);
  requestAnimationFrame(() => $$('#ofBar i').forEach(i => i.style.width = i.dataset.w + '%')); setTimeout(() => $$('#ofBar i').forEach(i => i.style.width = i.dataset.w + '%'), 400);
  $('#ofGrid').innerHTML = F.map(f => '<button type="button" role="tab" data-of="' + f.k + '" aria-selected="false"><span class="c" style="background-image:url(' + img(f.img) + ')"></span><span class="t"><b>' + esc(f.n) + '</b><small>' + esc(f.code) + '</small><em>' + pct(f.share) + '</em></span></button>').join('');
  function draw(){
    const f = F.find(x => x.k === cur);
    $$('#ofGrid [data-of]').forEach(b => b.setAttribute('aria-selected', b.dataset.of === cur));
    $('#ofPanel').innerHTML = '<span class="sw" style="background-image:url(' + img(f.img) + ')" role="img" aria-label="Oberfläche ' + esc(f.n) + '"></span><div class="of-info"><p class="eyebrow">' + esc(f.typ) + ' · ' + esc(f.code) + '</p><h3>' + esc(f.n) + '</h3><p>' + esc(f.t) + '</p><div class="of-kv">' + f.kv.map(x => '<div><small>' + esc(x[0]) + '</small><b>' + esc(x[1]) + '</b></div>').join('') + '</div><p class="of-data"><b>' + pct(f.share) + '</b> aller Bestellungen seit 2020' + (f.data ? ' · ' + f.data : '') + '</p></div>';
  }
  root.addEventListener('click', e => { const b = e.target.closest('#ofGrid [data-of]'); if (!b) return; cur = b.dataset.of; draw(); const p = $('#ofPanel').getBoundingClientRect(); if (p.bottom > innerHeight) scrollBy({ top: p.bottom - innerHeight + 24, behavior: RM ? 'auto' : 'smooth' }); });
  draw();
  const rows = [['Material', f => f.typ === 'Pulverbeschichtung' ? 'Metall, pulverbeschichtet' : f.typ], ['Farbton', f => f.code], ['Optik', f => f.kv[0][1]], ['Verändert sich', f => f.kv[1][1]], ['Draußen', f => f.kv[2][1]], ['Anteil der Bestellungen', f => pct(f.share)]];
  $('#ofTbl').innerHTML = '<thead><tr><th></th>' + F.map(f => '<th><img src="' + img(f.img) + '" alt="">' + esc(f.n) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr><th>' + esc(r[0]) + '</th>' + F.map(f => '<td>' + esc(r[1](f)) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  reveal(root);
};

if (PAGES[ROOT.dataset.info]) PAGES[ROOT.dataset.info]();
if (location.hash){ const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView({ block:'start' }), 150); }
})();
