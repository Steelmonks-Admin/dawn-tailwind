/* Steelmonks – Sonderanfertigung, Wappen, Firmenschild, Galerie (aus dem Prototyp erzeugt, sm-port) */
(function(){
'use strict';
const ROOT = document.querySelector('.smx[data-smx]'); if (!ROOT) return;
const DATA = JSON.parse(document.getElementById('smxData').textContent);
const IMG = DATA.img, D = { sonder_gal: DATA.gal }, current = ROOT.dataset.smx;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;
const eur = v => new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(v);
const num = v => new Intl.NumberFormat('de-DE').format(v);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img = k => IMG[k] ? new URL(IMG[k], location.href).href : '';
const PAGES = {};
function toast(msg){ let t = $('.toast', ROOT); if (!t){ t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); ROOT.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
/* Lightbox */
const MODAL = document.createElement('div'); MODAL.className = 'modal'; MODAL.id = 'modal'; MODAL.hidden = true;
MODAL.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button class="modal-x" id="modalX" type="button" aria-label="Schließen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div id="modalBody"></div></div>';
ROOT.appendChild(MODAL);
function openModal(html){ $('#modalBody').innerHTML = html; MODAL.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => $('#modalX').focus(), 30); }
function closeModal(){ MODAL.hidden = true; document.body.style.overflow = ''; }
MODAL.addEventListener('click', e => { if (e.target === MODAL || e.target.closest('#modalX')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !MODAL.hidden) closeModal(); });
/* ——— Pixel-Animationen: Partikel im Pixel-Stil über den Pixel-Bildern ———
   Markup: <span class="pxfx" data-fx="sparks:.6:.67:14;steam:.8:.4:3"><img …></span>
   Typ:x:y:Rate (pro Sekunde). Läuft nur, wenn sichtbar, und nie bei „Bewegung reduzieren“. */
const PXFX = (() => {
  const COL = { sparks:['#fff3b0','#ffd34d','#ff9a2e','#ff6b1f'], steam:['rgba(255,255,255,.9)','rgba(230,230,230,.75)'], confetti:['#ff6b1f','#6f9bff','#f5ae2e','#1c7f47','#e84d8a','#ffffff'], petals:['#f7b6c8','#f49ab3','#fcd3de','#ffffff'], twinkle:['#ffffff','#fff8c4','#ffe066'], dust:['#e8e4dc','#cfcac0','#ffffff'] };
  const items = new Set();
  let running = false;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { const it = e.target._pxfx; if (it) it.vis = e.isIntersecting; }), { rootMargin:'60px' }) : null;
  function parse(s){ return s.split(';').filter(Boolean).map(p => { const [type, x, y, rate] = p.split(':'); return { type, x:+x, y:+y, rate:+(rate || 4), acc:Math.random() }; }); }
  function attach(el){
    if (RM || el._pxfx) return;
    const cv = document.createElement('canvas'); cv.className = 'pxfx-cv'; cv.setAttribute('aria-hidden', 'true'); el.appendChild(cv);
    const it = { el, cv, ctx:cv.getContext('2d'), em:parse(el.dataset.fx || ''), parts:[], vis:!io, w:0, h:0, ps:3 };
    el._pxfx = it; items.add(it); if (io) io.observe(el); loop();
    return it;
  }
  function size(it){ const r = it.el.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height); if (w !== it.w || h !== it.h){ it.w = w; it.h = h; it.cv.width = w; it.cv.height = h; it.ps = Math.max(2, Math.round(Math.min(w, 420) / 70)); } }
  function spawn(it, type, x, y){
    const s = it.ps, c = COL[type] || COL.sparks, col = c[Math.floor(Math.random() * c.length)], R = Math.random;
    const p = { type, x, y, col, t:0, sz:s * (R() < .3 ? 2 : 1) };
    if (type === 'sparks'){ Object.assign(p, { vx:(R() * 2.4 - 1.2) * s * .6, vy:-(R() * 1.8 + .4) * s * .6, g:.09 * s, life:18 + R() * 20 }); }
    else if (type === 'steam'){ Object.assign(p, { vx:0, vy:-.35 * s, g:0, life:50 + R() * 40, ph:R() * 6, sz:s * (R() < .5 ? 1 : 2) }); }
    else if (type === 'confetti'){ Object.assign(p, { vx:(R() * 3 - 1.5) * s, vy:-(R() * 3 + 2) * s, g:.14 * s, life:60 + R() * 40 }); }
    else if (type === 'petals'){ Object.assign(p, { x:R() * it.w, y:-s * 2, vx:.15 * s, vy:(.25 + R() * .3) * s, g:0, life:9999, ph:R() * 6 }); }
    else if (type === 'twinkle'){ Object.assign(p, { x:x + (R() - .5) * it.w * .16, y:y + (R() - .5) * it.h * .1, vx:0, vy:0, g:0, life:26 }); }
    else if (type === 'dust'){ Object.assign(p, { vx:(R() * 1.6 - .2) * s * .5, vy:(R() * 1.2 - .8) * s * .5, g:.02 * s, life:16 + R() * 14 }); }
    it.parts.push(p);
  }
  function burst(el, type, fx, fy, n){ const it = el._pxfx || attach(el); if (!it) return; size(it); for (let i = 0; i < n; i++) spawn(it, type, fx * it.w, fy * it.h); it.vis = true; loop(); }
  function step(it, dt){
    size(it); const { ctx, ps } = it; ctx.clearRect(0, 0, it.w, it.h);
    it.em.forEach(e => { e.acc += e.rate * dt; while (e.acc >= 1){ e.acc -= 1; spawn(it, e.type, e.x * it.w, e.y * it.h); } });
    it.parts = it.parts.filter(p => {
      p.t++; p.vy += p.g; p.x += p.vx + (p.type === 'steam' || p.type === 'petals' ? Math.sin((p.t / 14) + p.ph) * ps * .25 : 0); p.y += p.vy;
      if (p.t > p.life || p.y > it.h + 10 || p.x < -10 || p.x > it.w + 10) return false;
      const a = p.type === 'petals' ? 1 : Math.max(0, 1 - p.t / p.life);
      ctx.globalAlpha = p.type === 'steam' ? a * .8 : a; ctx.fillStyle = p.col;
      const X = Math.round(p.x / ps) * ps, Y = Math.round(p.y / ps) * ps;
      if (p.type === 'twinkle'){ const k = p.t < 13 ? p.t / 13 : (26 - p.t) / 13, L = Math.round(k * 2) * ps; ctx.fillRect(X, Y, ps, ps); if (L){ ctx.fillRect(X - L, Y, L, ps); ctx.fillRect(X + ps, Y, L, ps); ctx.fillRect(X, Y - L, ps, L); ctx.fillRect(X, Y + ps, ps, L); } }
      else ctx.fillRect(X, Y, p.sz, p.sz);
      return true;
    });
    ctx.globalAlpha = 1;
  }
  let last = 0;
  function frame(n){
    const dt = Math.min(.05, (n - (last || n)) / 1000); last = n; let any = false;
    items.forEach(it => { if (!it.el.isConnected){ items.delete(it); if (io) io.unobserve(it.el); return; } if (it.vis && it.el.offsetParent !== null){ step(it, dt); any = true; } });
    if (items.size && !document.hidden) requestAnimationFrame(frame); else { running = false; last = 0; }
  }
  function loop(){ if (!running && !RM){ running = true; requestAnimationFrame(frame); } }
  function scan(root){ $$('[data-fx]', root || document).forEach(attach); }
  if (!RM && 'MutationObserver' in window){ let q = false; new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; scan(); }); }).observe(document.body, { childList:true, subtree:true }); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  return { scan, burst, attach };
})();
function celebrate(imgKey, title, sub){
  const u = document.createElement('div'); u.className = 'unlock fixed'; u.innerHTML = '<span class="pxfx" data-fx=""><img src="' + img(imgKey) + '" alt=""></span><b>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '');
  ROOT.appendChild(u); const w = u.querySelector('.pxfx');
  if (!RM){ PXFX.attach(w); setTimeout(() => PXFX.burst(w, 'confetti', .5, .3, 60), 120); }
  setTimeout(() => u.classList.add('go'), 1700); setTimeout(() => u.remove(), 2300);
}

/* ——— Oberflächen als echte Texturen ——— */
const TX = { 'Schwarz (RAL 9005)':'schwarz', 'Anthrazit (RAL 7016)':'anthrazit', 'Edelstahl':'edelstahl', 'Cortenstahl (Rost)':'corten', 'Weiß (RAL 9010)':'weiss', 'Gold':'gold',
  'Schwarz pulverbeschichtet':'schwarz', 'Anthrazit pulverbeschichtet':'anthrazit', 'Weiß pulverbeschichtet':'weiss', 'Cortenstahl Optik':'corten', 'Satinierter Edelstahl':'edelstahl', 'Schwarz':'schwarz', 'Anthrazit':'anthrazit', 'Cortenstahl':'corten', 'Weiß':'weiss' };
(function(){ const st = document.createElement('style'); st.textContent = [...new Set(Object.values(TX))].map(k => '.tx-' + k + '{background-image:url("' + img('tx_' + k) + '")}').join(''); document.head.appendChild(st); })();
const txI = (v, px) => TX[v] ? '<i class="tx tx-' + TX[v] + '" title="' + esc(v) + '"' + (px ? ' style="width:' + px + 'px;height:' + px + 'px"' : '') + '></i>' : '';

/* ——— Sonderanfertigung · Wappen · Firmenschild · Galerie ——— */
const SG = D.sonder_gal || [];
const sgBy = c => SG.filter(g => g.cat === c);

/* Einblenden beim Scrollen */
const RV = 'IntersectionObserver' in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); RV.unobserve(e.target); } }), { rootMargin:'0px 0px -8% 0px', threshold:.08 }) : null;
function rv(root){ $$('[data-rv]:not(.in)', root || document).forEach(el => RV ? RV.observe(el) : el.classList.add('in')); }

/* Überschriften Wort für Wort */
function splitWords(root){
  $$('[data-split]', root).forEach(h => {
    if (h.dataset.done) return; h.dataset.done = '1'; let i = 0;
    const walk = n => { [...n.childNodes].forEach(c => {
      if (c.nodeType === 3){ const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)){ f.appendChild(document.createTextNode(w)); return; } const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = w; f.appendChild(s); }); c.replaceWith(f); }
      else if (c.nodeType === 1) walk(c);
    }); };
    walk(h);
  });
}

/* Zahlen hochzählen */
const CNT = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; CNT.unobserve(e.target); countUp(e.target); }), { threshold:.4 }) : null;
function countUp(el){ const to = +el.dataset.count; if (RM){ el.textContent = num(to); return; } const t0 = performance.now(), dur = 1400; const f = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = num(Math.round(to * ease(p))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
function counters(root){ $$('[data-count]', root).forEach(el => CNT ? CNT.observe(el) : null); }

/* Sticky-Leiste: sichtbar, wenn der erste Bildschirm vorbei ist und das Formular nicht im Bild */
function saSticky(r, bar, hero, form){
  const st = { hero:true, form:false };
  const upd = () => { const on = current === r && !st.hero && !st.form; bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', on ? 'false' : 'true'); };
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(es => es.forEach(e => { st.hero = e.isIntersecting || e.boundingClientRect.top > 0; upd(); })).observe(hero);
  if (form) new IntersectionObserver(es => es.forEach(e => { st.form = e.isIntersecting; upd(); }), { rootMargin:'0px 0px -20% 0px' }).observe(form);
}

/* Schild-Silhouette als Maske (Wappen-Form mit Ausschnitten) */
const SOLID = 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116"><path fill="#fff" d="M6 6h88v46c0 33-22 52-44 60C28 104 6 85 6 52z"/></svg>') + '")';
const MATS = [['Schwarz (RAL 9005)','pulverbeschichtet'],['Anthrazit (RAL 7016)','pulverbeschichtet'],['Weiß (RAL 9010)','pulverbeschichtet'],['Gold','beschichtet'],['Cortenstahl (Rost)','Optik, wetterfest'],['Edelstahl','satiniert']];
const txUrl = v => 'url("' + img('tx_' + (TX[v] || 'schwarz')) + '")';
const CREST_TOP = 'url("' + img('mask_crest_top') + '")', CREST_PLATE = 'url("' + img('mask_crest_plate') + '")';
const plateOf = m => ['Schwarz (RAL 9005)','Anthrazit (RAL 7016)','Cortenstahl (Rost)'].includes(m) ? 'Gold' : 'Schwarz (RAL 9005)';
const shortMat = m => m.replace(/ \(.*\)/, '');
const PARTNERS = ['Kreishandwerkerschaft Hellweg-Lippe','Technisches Hilfswerk','Pro Heraldica','Deutscher Feuerwehrverband','OTLG','Spaten','San Miguel'];
function logoTiles(){ const L = PARTNERS.map((n, i) => img('sg_logo_' + i) ? '<span class="lg" title="' + esc(n) + '"><img src="' + img('sg_logo_' + i) + '" alt="' + esc(n) + '" loading="lazy"></span>' : '').join(''); return L + L; }
function ideas(el, list, topic){
  el.innerHTML = list.map((x, i) => '<article class="sa-idea" data-rv style="--d:' + (i % 4 * .06) + 's"><img src="' + img(x[0]) + '" alt="" loading="lazy"><div><small>' + esc(x[2]) + '</small><b>' + esc(x[1]) + '</b><button class="btn btn-p btn-s" type="button" data-idea="' + i + '">Das will ich</button></div></article>').join('');
  el.addEventListener('click', e => { const b = e.target.closest('[data-idea]'); if (!b) return; const x = list[+b.dataset.idea]; askFor({ topic: x[6] || topic, desc: x[1], size: x[3] || null, mat: x[4] || null, multi: !!x[5] }); });
}

/* Bild groß ansehen, mit Blättern und „So etwas anfragen“ */
const CAT_TOPIC = { wappen:'wappen', gross:'sonst', firma:'firma', verein:'firma', serie:'serie', privat:'privat', detail:'sonst' };
const CAT_NAME = { wappen:'Wappen', gross:'Großformat', firma:'Firmen & Logos', verein:'Feuerwehr & Vereine', serie:'Serie & Merch', privat:'Privat & Geschenke', detail:'Details' };
function lightbox(list, i){
  const g = list[i]; if (!g) return;
  const self = g.cat === 'privat' || g.cat === 'wappen';
  openModal('<div class="ga-lb"><img src="' + img(g.k) + '" alt="' + esc(g.cap) + '"><div class="info"><span class="mono" style="color:var(--ink-3)">' + esc(CAT_NAME[g.cat] || '') + ' · ' + (i + 1) + ' / ' + list.length + '</span><h2 id="modalTitle" style="font-size:20px;font-weight:600;line-height:1.3">' + esc(g.cap) + '</h2><p class="muted" style="font-size:14.4px">Wir fertigen Dir etwas Ähnliches – nach Deiner Idee, in Deiner Größe.</p><button class="btn btn-p" type="button" data-lbask>So etwas anfragen</button>' + (self ? '<a class="link" href="/pages/werkstatt" data-lbclose>Oder bis 75 cm selbst gestalten</a>' : '') + '<div class="nav"><button class="btn btn-g btn-s" type="button" data-lbnav="-1">‹ Zurück</button><button class="btn btn-g btn-s" type="button" data-lbnav="1">Weiter ›</button></div></div></div>');
  const body = $('#modalBody');
  body.onclick = e => {
    const n = e.target.closest('[data-lbnav]'); if (n){ lightbox(list, (i + +n.dataset.lbnav + list.length) % list.length); return; }
    if (e.target.closest('[data-lbask]')){ closeModal(); askFor({ topic:CAT_TOPIC[g.cat] || 'sonst', ref:{ k:g.k, cap:g.cap } }); return; }
    if (e.target.closest('[data-lbclose]')) closeModal();
  };
  body.onkeydown = null;
  document.onkeydown = e => { if ($('#modal').hidden){ document.onkeydown = null; return; } if (e.key === 'ArrowRight') lightbox(list, (i + 1) % list.length); if (e.key === 'ArrowLeft') lightbox(list, (i - 1 + list.length) % list.length); };
}

/* Zur Anfrage springen, mit Vorauswahl – auf der passenden Seite */
const FORMS = {};
const PAGE_URL = { sonderanfertigung:'/pages/anfragen', wappen:'/pages/dein-wappen', firmenschild:'/pages/dein-firmenschild', galerie:'/pages/fotogalerie' };
const ss = { get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }, set(k, v){ try { sessionStorage.setItem(k, v); } catch(e){} }, del(k){ try { sessionStorage.removeItem(k); } catch(e){} } };
function askFor(pre){
  const r = current === 'wappen' || current === 'firmenschild' ? current : 'sonderanfertigung';
  const target = { sonderanfertigung:'saForm', wappen:'wpForm', firmenschild:'fsForm' }[r];
  if (current === r){ FORMS[r] && FORMS[r].set(pre); const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'start' }); return; }
  ss.set('smxPrefill', JSON.stringify(pre)); location.href = PAGE_URL[r] + '#' + target;
}
document.addEventListener('click', e => {
  const sc = e.target.closest('[data-scroll]'); if (sc && ROOT.contains(sc)){ e.preventDefault(); const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'start' }); return; }
  const a = e.target.closest('a[href]'); if (!a || !ROOT.contains(a)) return;
  if (a.dataset.topic) ss.set('smxPrefill', JSON.stringify({ topic:a.dataset.topic }));
  if (a.dataset.gcat) ss.set('smxGcat', a.dataset.gcat);
  const u = new URL(a.href, location.href);
  if (u.pathname === location.pathname && u.hash){
    const el = document.getElementById(u.hash.slice(1)); if (!el) return;
    e.preventDefault(); el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'start' });
    if (a.dataset.topic && FORMS[current]){ FORMS[current].set({ topic:a.dataset.topic }); ss.del('smxPrefill'); }
    if (a.dataset.gcat && GAL.set){ GAL.set(a.dataset.gcat); ss.del('smxGcat'); }
  }
});

/* ——— Anfrage in drei Schritten (baut auf den Werkstatt-Bausteinen .wk auf) ——— */
const IQ_TOPICS = [['wappen','Wappen','sg_dein_014'],['firma','Firmenschild / Logo','sg_tpl_1e9c55'],['serie','Serie / Merchandise','sg_merc_008'],['privat','Geschenk / Privat','sg_anfr_016'],['sonst','Etwas anderes','sg_merc_004']];
const IQ_EX = { wappen:['Unser Familienwappen nach einer alten Urkunde','Ein neues Wappen mit Eiche und Löwe','Wappen in zwei Lagen, Gold auf Schwarz'], firma:['Unser Logo für den Eingang, für draußen','Empfangsschild in Edelstahl','Logo in Gold auf Schwarz fürs Büro'], serie:['200 Schlüsselanhänger mit Vereinslogo','Kartenhalter als Kundengeschenk','Jubiläums-Pins für 50 Mitarbeiter'], privat:['Porträt unseres Hundes nach Foto','Monogramm zur Hochzeit','Unser Haus als Silhouette'], sonst:['Buchstaben für eine Hochzeit, 1 m hoch','Ein Motiv für unser Gartentor'] };
const IQ_SIZES = ['22,5 cm','45 cm','55 cm','75 cm','100 cm','Größer als 100 cm','Andere Größe'];
const IQ_MATS = ['Schwarz (RAL 9005)','Anthrazit (RAL 7016)','Weiß (RAL 9010)','Gold','Cortenstahl (Rost)','Edelstahl','Andere RAL-Farbe','Weiß ich noch nicht'];
const IQ_MATL = { 'Cortenstahl (Rost)':'Cortenstahl-Optik', 'Edelstahl':'Edelstahl satiniert' };
const IQ_QTY = ['1','2 – 49','50 – 499','500+'];
const IQ_WHEN = ['Kein fester Termin','In etwa 4 Wochen','Zu einem Anlass'];
const IQ_PX = ['px4_monk_sketch','px2_monk_pc','px3_jakob_letter'];
/* Größe aus Rechner/Vorschau auf die Auswahlliste abbilden */
function iqSize(v){ if (!v) return ['', '']; const t = String(v).replace('.', ','); if (IQ_SIZES.includes(t)) return [t, '']; const n = parseFloat(t.replace(',', '.')); if (n > 100) return ['Größer als 100 cm', t]; return ['Andere Größe', t]; }
function inquiry(root, opt){
  opt = opt || {};
  const T0 = Date.now();
  const S = { step:1, topic:opt.topic || '', desc:'', ref:null, calc:null, size:'', sizeX:'', mat:'', matX:'', multi:false, qty:'', when:'', files:[], rights:false, name:'', email:'' };
  const needQty = () => S.topic === 'serie' || S.topic === 'firma';
  const topicName = () => (IQ_TOPICS.find(t => t[0] === S.topic) || [0, '–'])[1];
  const sizeTxt = () => S.size && S.size !== 'Andere Größe' ? S.size + (S.sizeX ? ' (' + S.sizeX + ')' : '') : (S.sizeX || '–');
  const matTxt = () => (S.mat === 'Andere RAL-Farbe' ? (S.matX ? 'RAL / Farbe: ' + S.matX : 'Andere RAL-Farbe') : (IQ_MATL[S.mat] || S.mat || '–')) + (S.multi ? ' · mehrlagig' : '');
  const xp = () => Math.min(100, (S.topic ? 20 : 0) + (S.desc.trim().length >= 8 || S.ref || S.calc ? 20 : 0) + (S.size ? 15 : 0) + (S.mat ? 15 : 0) + (/.+@.+\..+/.test(S.email) ? 20 : 0) + (S.name.trim() ? 10 : 0));
  const chip = (grp, v, cur) => '<button type="button" data-' + grp + '="' + esc(v) + '" aria-pressed="' + (cur === v) + '">' + esc(v) + '</button>';
  const opts = (list, cur, ph) => '<option value="">' + ph + '</option>' + list.map(v => '<option' + (v === cur ? ' selected' : '') + '>' + esc(IQ_MATL[v] || v) + '</option>').join('');
  /* So kommt die Anfrage als Zendesk-Ticket an: gegliederter Text, Feld: Wert pro Zeile */
  function ticket(){
    const subj = 'Anfrage ' + topicName() + (S.size ? ' · ' + sizeTxt() : '') + (S.name ? ' – ' + S.name : '');
    const sec = [
      ['PROJEKT', [['Thema', topicName()], ['Idee', S.desc.trim() || '–'], ['Beispiel aus der Galerie', S.ref ? S.ref.cap : '']]],
      ['DETAILS', [['Größe', sizeTxt()], ['Oberfläche', matTxt()], ...Object.entries(S.calc || {}), ['Stückzahl', needQty() ? (S.qty || '–') : ''], ['Termin', S.when || 'nicht angegeben']]],
      ['DATEIEN', [['Anhänge', S.files.length ? S.files.length + ' – ' + S.files.map(f => f.name).join(', ') : 'keine']]],
      ['KONTAKT', [['Name', S.name || '–'], ['E-Mail', S.email || '–']]],
      ['HERKUNFT', [['Seite', 'steelmonks.com/pages/' + ({ sonderanfertigung:'anfragen', wappen:'dein-wappen', firmenschild:'dein-firmenschild', galerie:'fotogalerie' }[current] || current)], ['Formular', 'Sonderanfertigung, 3 Schritte']]]
    ].map(s => [s[0], s[1].filter(r => r[1])]);
    const text = 'NEUE ANFRAGE ÜBER DIE WEBSITE\n\n' + sec.map(s => s[0] + '\n' + s[1].map(r => r[0] + ': ' + r[1]).join('\n')).join('\n\n');
    const fields = [['Thema', topicName()], ['Größe', S.size || '–'], ['Oberfläche', IQ_MATL[S.mat] || S.mat || '–'], ['Lagen', (S.calc && S.calc.Lagen) || (S.multi ? '2 oder mehr' : '1')], ['Vorlage', (S.calc && S.calc.Vorlage) || '–'], ['Richtpreis', (S.calc && S.calc.Richtpreis) || '–'], ['Stückzahl', S.qty || '–']];
    return { subj, text, fields, tags:['website-anfrage', 'thema-' + (S.topic || 'sonst')], rows: sec.flatMap(s => s[1]) };
  }
  function head(){ return '<ol class="wk-steps" aria-label="Fortschritt">' + ['Idee','Details','Kontakt'].map((t, i) => '<li class="' + (S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : '') + '"><i></i>' + (i + 1) + ' · ' + t + '</li>').join('') + '</ol><div class="iq-xp"><span>Anfrage</span><span class="bar"><b style="--x:' + xp() + '%"></b></span><span>' + xp() + ' %</span></div>'; }
  function draw(){
    let h = head();
    if (S.step === 1){
      h += '<span class="l">Worum geht\'s?</span><div class="iq-car"><button type="button" class="nv l" data-cv="-1" aria-label="Zurück">‹</button><div class="iq-topics" role="group" aria-label="Thema">' + IQ_TOPICS.map(t => '<button type="button" data-tp="' + t[0] + '" aria-pressed="' + (S.topic === t[0]) + '"><img src="' + img(t[2]) + '" alt=""><span>' + esc(t[1]) + '</span></button>').join('') + '</div><button type="button" class="nv r" data-cv="1" aria-label="Weiter">›</button></div>';
      if (S.ref) h += '<div class="iq-ref"><img src="' + img(S.ref.k) + '" alt=""><span>Beispiel: <b>' + esc(S.ref.cap) + '</b></span><button type="button" data-unref aria-label="Beispiel entfernen">✕</button></div>';
      if (S.calc) h += '<div class="iq-ref"><span>Aus dem ' + (S.calc.Richtpreis ? 'Preis-Rechner' : 'Logo-Vorschau') + ': <b>' + esc(Object.values(S.calc).join(' · ')) + '</b></span><button type="button" data-uncalc aria-label="Entfernen">✕</button></div>';
      h += '<label class="l" for="' + root.id + 'D">Beschreib Deine Idee <small>' + S.desc.length + ' / 800</small></label><textarea id="' + root.id + 'D" maxlength="800" placeholder="Was soll entstehen, wofür, wie groß ungefähr?">' + esc(S.desc) + '</textarea>';
      h += '<div class="wk-ex" role="group" aria-label="Beispiele">' + (IQ_EX[S.topic] || IQ_EX.sonst).map(x => '<button type="button" data-ex="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>';
      h += '<div class="wk-go"><p class="wk-err" data-err role="alert"></p><button class="btn btn-p" type="button" data-next>Weiter zu den Details</button><p>Dauert etwa 2 Minuten · unverbindlich</p></div>';
    } else if (S.step === 2){
      h += '<div class="iq-f"><div><label class="l" for="' + root.id + 'S">Größe (Breite)</label><div class="iq-sel"><select id="' + root.id + 'S" data-sel="size">' + opts(IQ_SIZES, S.size, 'Bitte wählen') + '</select></div>' + (S.size === 'Andere Größe' || S.size === 'Größer als 100 cm' ? '<input type="text" id="' + root.id + 'SX" data-x="sizeX" value="' + esc(S.sizeX) + '" placeholder="z. B. 120 × 80 cm" style="margin-top:8px">' : '') + '</div>';
      h += '<div><label class="l" for="' + root.id + 'M">Material &amp; Farbe</label><div class="iq-sel">' + (TX[S.mat] ? '<i class="tx tx-' + TX[S.mat] + '"></i>' : '') + '<select id="' + root.id + 'M" data-sel="mat">' + '<option value="">Bitte wählen</option>' + IQ_MATS.map(v => '<option value="' + esc(v) + '"' + (v === S.mat ? ' selected' : '') + '>' + esc(IQ_MATL[v] || v) + '</option>').join('') + '</select></div>' + (S.mat === 'Andere RAL-Farbe' ? '<input type="text" id="' + root.id + 'MX" data-x="matX" value="' + esc(S.matX) + '" placeholder="RAL-Nummer oder Farbe, z. B. RAL 3020" style="margin-top:8px">' : '') + '<label class="wk-bolt" style="margin-top:8px"><input type="checkbox" data-multi' + (S.multi ? ' checked' : '') + '><span>Mehrlagig, mit mehreren Farben oder Materialien</span></label></div>';
      if (needQty()) h += '<div><span class="l">Stückzahl</span><div class="wk-chips">' + IQ_QTY.map(v => chip('qt', v, S.qty)).join('') + '</div></div>';
      h += '<div><span class="l">Bis wann? <small>optional</small></span><div class="wk-chips">' + IQ_WHEN.map(v => chip('wh', v, S.when)).join('') + '</div></div>';
      const f0 = S.files[0];
      h += '<div class="wk-up"><div class="th">' + (f0 && f0.url ? '<img src="' + f0.url + '" alt="">' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>') + '</div><div class="t">' + (S.files.length ? esc(S.files.map(f => f.name).join(', ')) : 'Fotos, Skizze oder Datei') + '<small>' + (S.files.length ? S.files.length + ' Datei(en) · kommen als Anhang ins Ticket' : 'optional · bis zu 5 Dateien, JPG, PNG, PDF, SVG') + '</small></div><label class="btn btn-g btn-s" style="color:#fff" for="' + root.id + 'F">' + (S.files.length ? 'Ändern' : 'Hinzufügen') + '</label><input id="' + root.id + 'F" type="file" multiple accept="image/*,application/pdf,.svg,.ai,.eps,.dxf" class="sr"></div>';
      if (S.files.length) h += '<label class="wk-rights"><input type="checkbox" data-rights' + (S.rights ? ' checked' : '') + '><span>Ich besitze die Rechte an diesen Dateien oder darf sie nutzen.</span></label>';
      h += '</div><div class="wk-nav"><button class="wk-link" type="button" data-back>← Idee ändern</button><button class="btn btn-p" type="button" data-next>Weiter zum Kontakt</button></div><p class="wk-err" data-err role="alert" style="margin-top:8px"></p>';
    } else if (S.step === 3){
      h += '<div class="iq-f"><div class="two"><div><label class="l" for="' + root.id + 'N">Name</label><input type="text" id="' + root.id + 'N" autocomplete="name" value="' + esc(S.name) + '"></div><div><label class="l" for="' + root.id + 'E">E-Mail <small>für Dein Angebot</small></label><input type="email" id="' + root.id + 'E" autocomplete="email" value="' + esc(S.email) + '"></div></div>';
      const tk = ticket();
      h += '<div class="iq-sum">' + tk.rows.filter(r => !['Seite','Idee','Formular','Name','E-Mail'].includes(r[0])).map(r => '<div><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></div>').join('') + '</div>';
      h += '<p class="wk-err" data-err role="alert"></p><button class="btn btn-p btn-shine" type="button" data-send style="width:100%;padding-block:1em">Anfrage senden · unverbindlich</button><p style="font-size:11.84px;color:var(--steel)">Wir nutzen Deine Angaben nur für diese Anfrage. <a class="link" href="https://steelmonks.com/policies/privacy-policy" style="color:inherit">Datenschutz</a></p><div class="wk-nav"><button class="wk-link" type="button" data-back>← Details ändern</button></div></div>';
      h += '<label class="sa-hp" aria-hidden="true">Website <input type="text" tabindex="-1" autocomplete="off" data-hp></label>';
    } else {
      const tk = ticket();
      h = '<div class="iq-done"><span class="pxfx pxa-bob" data-fx="confetti:.5:.3:4"><img src="' + img('px3_duo_highfive') + '" alt="Pixel-Art: Jakob und Luis geben sich ein High Five"></span><h3>Deine Anfrage ist raus!</h3><p>Danke' + (S.name ? ', ' + esc(S.name.split(' ')[0]) : '') + '. Wir schauen uns Deine Idee an und melden uns an <b>' + esc(S.email) + '</b> mit Fragen oder direkt mit dem Angebot.</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center"><a class="btn btn-p" href="/pages/fotogalerie">Inspiration in der Galerie</a><button class="btn btn-g" type="button" data-again style="color:#fff">Weitere Anfrage</button></div>';
      h += '</div>';
    }
    root.innerHTML = '<div class="wk" style="margin-top:0">' + h + '</div>';
    const pxs = root.closest('.sa-form') && $('.side .pxfx img', root.closest('.sa-form')); if (pxs && S.step <= 3 && pxs.dataset.img === 'px4_monk_sketch') pxs.src = img(IQ_PX[S.step - 1]);
    PXFX.scan(root);
  }
  const err = m => { const e = $('[data-err]', root); if (e) e.textContent = m; };
  function read(){ const d = $('#' + root.id + 'D'); if (d) S.desc = d.value; const n = $('#' + root.id + 'N'); if (n){ S.name = n.value; S.email = $('#' + root.id + 'E').value.trim(); } $$('[data-x]', root).forEach(i => S[i.dataset.x] = i.value); }
  root.addEventListener('input', e => { read(); if (e.target.tagName === 'TEXTAREA'){ const s = $('label small', root); if (s) s.textContent = S.desc.length + ' / 800'; } const b = $('.iq-xp .bar b', root); if (b){ b.style.setProperty('--x', xp() + '%'); $('.iq-xp span:last-child', root).textContent = xp() + ' %'; } });
  root.addEventListener('change', e => {
    if (e.target.type === 'file' && e.target.files.length){ S.files = [...e.target.files].filter(f => f.size <= 20e6).slice(0, 5).map(f => ({ name:f.name, file:f, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' })); read(); draw(); return; }
    if (e.target.dataset.sel){ read(); S[e.target.dataset.sel] = e.target.value; draw(); const nx = $('[data-x]', root); if (nx && (e.target.value === 'Andere Größe' || e.target.value === 'Größer als 100 cm' || e.target.value === 'Andere RAL-Farbe')) nx.focus(); return; }
    if (e.target.matches('[data-multi]')) S.multi = e.target.checked;
    if (e.target.matches('[data-rights]')) S.rights = e.target.checked;
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; read();
    if (b.dataset.cv){ const t = $('.iq-topics', root); t.scrollBy({ left: +b.dataset.cv * 160, behavior: RM ? 'auto' : 'smooth' }); return; }
    if (b.dataset.tp){ S.topic = b.dataset.tp; const sl = $('.iq-topics', root).scrollLeft; draw(); $('.iq-topics', root).scrollLeft = sl; return; }
    if (b.dataset.ex != null){ S.desc = (S.desc.trim() ? S.desc.trim() + '. ' : '') + b.dataset.ex; draw(); const t = $('textarea', root); if (t){ t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
    if (b.hasAttribute('data-unref')){ S.ref = null; draw(); return; }
    if (b.hasAttribute('data-uncalc')){ S.calc = null; draw(); return; }
    for (const [a, k] of [['qt','qty'],['wh','when']]) if (b.dataset[a] != null){ S[k] = S[k] === b.dataset[a] ? '' : b.dataset[a]; draw(); return; }
    if (b.hasAttribute('data-back')){ S.step--; draw(); return; }
    if (b.hasAttribute('data-next')){
      if (S.step === 1 && !S.topic){ err('Bitte wähl zuerst ein Thema.'); return; }
      if (S.step === 1 && S.desc.trim().length < 8 && !S.ref && !S.calc){ err('Ein, zwei Sätze zu Deiner Idee helfen uns sehr.'); $('textarea', root).focus(); return; }
      if (S.step === 2 && S.files.length && !S.rights){ err('Bitte bestätige die Rechte an den Dateien.'); return; }
      S.step++; draw(); root.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block:'nearest' }); return;
    }
    if (b.hasAttribute('data-send')){
      if (!/.+@.+\..+/.test(S.email)){ err('Bitte gib Deine E-Mail-Adresse an, damit wir Dir das Angebot schicken können.'); $('#' + root.id + 'E').focus(); return; }
      const hp = $('[data-hp]', root); if (hp && hp.value){ S.step = 4; draw(); return; }
      if (Date.now() - T0 < 2500){ err('Einen Moment bitte – und dann noch einmal senden.'); return; }
      b.disabled = true; b.textContent = S.files.length ? 'Dateien werden hochgeladen …' : 'Wird gesendet …';
      sendInquiry(S, ticket()).then(() => {
        S.step = 4; draw(); celebrate('px3_duo_highfive', 'Anfrage ist raus!', 'Wir melden uns mit Deinem Angebot');
        try { (window.dataLayer = window.dataLayer || []).push({ event:'sonder_anfrage', thema:S.topic, seite:current, dateien:S.files.length }); } catch(x){}
      }).catch(() => { b.disabled = false; b.textContent = 'Anfrage senden · unverbindlich'; err('Das Senden hat leider nicht geklappt. Bitte versuch es noch einmal oder schreib uns an info@steelmonks.com.'); });
      return;
    }
    if (b.hasAttribute('data-again')){ Object.assign(S, { step:1, desc:'', ref:null, size:'', sizeX:'', mat:'', matX:'', multi:false, qty:'', when:'', files:[], rights:false }); draw(); }
  });
  draw();
  return { set(p){ if (!p) return; if (S.step === 4) S.step = 1; ['topic','mat','qty','desc'].forEach(k => { if (p[k] != null) S[k] = p[k]; }); if (p.calc) S.calc = p.calc; if (p.size != null){ const z = iqSize(p.size); S.size = z[0]; S.sizeX = z[1]; } if (S.mat && !IQ_MATS.includes(S.mat)){ S.matX = S.mat; S.mat = 'Andere RAL-Farbe'; } if (p.ref) S.ref = p.ref; if (p.multi != null) S.multi = p.multi; if (p.step) S.step = p.step; draw(); } };
}
const ZD = 'https://steelmonkssupport.zendesk.com/api/v2/';
async function sendInquiry(S, tk){
  try {
    const uploads = [];
    for (const f of S.files){
      if (!f.file) continue;
      const r = await fetch(ZD + 'uploads.json?filename=' + encodeURIComponent(f.name), { method:'POST', headers:{ 'Content-Type': f.file.type || 'application/binary' }, body:f.file });
      if (!r.ok) throw new Error('upload ' + r.status);
      uploads.push((await r.json()).upload.token);
    }
    const name = S.name.trim() || S.email.split('@')[0];
    const r = await fetch(ZD + 'requests.json', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ request:{ requester:{ name, email:S.email }, subject:tk.subj, comment:{ body:tk.text, uploads }, tags:tk.tags } }) });
    if (r.status !== 201 && r.status !== 200) throw new Error('request ' + r.status);
  } catch(e){
    // Rückfall: Shopify-Kontaktformular (ohne Dateien), damit keine Anfrage verloren geht
    const fd = new FormData(); fd.append('form_type', 'contact'); fd.append('utf8', '✓');
    fd.append('contact[email]', S.email); fd.append('contact[Name]', S.name); fd.append('contact[body]', tk.subj + '\n\n' + tk.text + (S.files.length ? '\n\nHinweis: Dateien konnten nicht übertragen werden, bitte beim Kunden anfragen.' : ''));
    const r2 = await fetch('/contact', { method:'POST', body:fd, credentials:'same-origin' });
    if (!r2.ok) throw e;
  }
}
function mountForm(r, id, preset){ const el = document.getElementById(id); if (!el) return; FORMS[r] = inquiry(el, preset); }
function pageFx(root){ splitWords(root); rv(root); counters(root); PXFX.scan(root); }

/* Sonderanfertigung */
PAGES.sonderanfertigung = function(){
  const root = $('#p-sonder');
  const show = SG.filter(g => g.big || ['anfr_016','dein_012','merc_003','anfr_022'].includes(g.k.slice(3)));
  $('#saShow').innerHTML = show.map((g, i) => { const m = g.cap.match(/(\d+\s×\s\d+\scm)/); return '<figure data-rv style="--d:' + (i % 3 * .08) + 's"><img src="' + img(g.k) + '" alt="' + esc(g.cap) + '" loading="lazy">' + (m ? '<span class="sa-size">' + m[1] + '</span>' : '') + '<figcaption><span>' + esc(g.cap) + '</span><button class="btn btn-p btn-s" type="button" data-shask="' + i + '">So etwas anfragen</button></figcaption></figure>'; }).join('');
  $('#saShow').addEventListener('click', e => { const b = e.target.closest('[data-shask]'); if (b){ const g = show[+b.dataset.shask]; askFor({ topic:CAT_TOPIC[g.cat] || 'sonst', ref:{ k:g.k, cap:g.cap } }); return; } const f = e.target.closest('figure'); if (f) lightbox(show, [...f.parentNode.children].indexOf(f)); });
  $$('[data-shw]', root).forEach(b => b.addEventListener('click', () => $('#saShow').scrollBy({ left: +b.dataset.shw * $('#saShow').clientWidth * .66, behavior: RM ? 'auto' : 'smooth' })));
  // Material
  let mat = MATS[0][0], multi = false;
  const l1 = $('#saShape .l1'), l2 = $('#saShape .l2');
  l1.style.setProperty('--m', CREST_TOP); l2.style.setProperty('--m', CREST_PLATE);
  const drawMat = () => {
    $('#saSw').innerHTML = MATS.map(m => '<button type="button" data-sm="' + esc(m[0]) + '" aria-pressed="' + (m[0] === mat) + '"><i class="tx tx-' + TX[m[0]] + '"></i><span>' + esc(m[0].replace(' (Rost)', '')) + '<small>' + esc(m[1]) + '</small></span></button>').join('');
    const pl = plateOf(mat); l1.style.backgroundImage = txUrl(mat); l2.style.backgroundImage = txUrl(pl);
    $('#saPrev').classList.toggle('multi', multi); $('#saMulti').setAttribute('aria-pressed', multi);
    $('#saPrevL').textContent = multi ? shortMat(mat) + ' auf ' + shortMat(pl) + ' · 2 Lagen' : mat + ' · 1 Lage';
    $('#saMatGo').textContent = 'Mit ' + shortMat(mat) + (multi ? ' auf ' + shortMat(pl) : '') + ' anfragen';
  };
  $('#saSw').addEventListener('click', e => { const b = e.target.closest('[data-sm]'); if (!b) return; mat = b.dataset.sm; drawMat(); if (!RM){ const s = $('#saShape'); s.style.transform = 'scale(.94) rotate(-2deg)'; setTimeout(() => s.style.transform = '', 180); } });
  $('#saMulti').addEventListener('click', () => { multi = !multi; drawMat(); });
  $('#saMatGo').addEventListener('click', () => askFor({ mat, multi }));
  drawMat();
  $('#saSerieGo').addEventListener('click', () => askFor({ topic:'serie' }));
  const KINDS = [['Anhänger','sg_merc_014'],['Kartenhalter','sg_merc_008'],['Wandschilder','sg_tpl_2ae3eb'],['Visitenkarten','sg_merc_009'],['Wappen','sg_dein_014'],['Zigarrenhalter',''],['Pins','sg_tpl_de5bfe'],['Einzigartiges','sg_merc_004']];
  const CIGAR = '<svg viewBox="0 0 64 28" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><rect x="4" y="11" width="44" height="9" rx="4.5"/><path d="M36 11v9M48 13h6M52 9c3-2 3-5 6-6M55 15c3-1 4-4 7-4"/></svg>';
  $('#saKinds').innerHTML = KINDS.map((k, i) => '<button type="button" data-kind="' + esc(k[0]) + '" data-rv style="--d:' + (i % 4 * .05) + 's">' + (k[1] ? '<img src="' + img(k[1]) + '" alt="" loading="lazy">' : '<i class="ic tx-corten">' + CIGAR + '</i>') + '<span>' + esc(k[0]) + '</span></button>').join('');
  $('#saKinds').addEventListener('click', e => { const b = e.target.closest('[data-kind]'); if (b) askFor({ topic:'serie', desc:'Serie: ' + b.dataset.kind + ' mit unserem Logo' }); });
  $('#saLogos').innerHTML = logoTiles();
  // Ablauf: Fortschritt beim Scrollen
  const q = $('#saQuest'), lis = $$('li', q);
  const onScroll = () => { if (current !== 'sonderanfertigung') return; const r = q.getBoundingClientRect(), vh = innerHeight; const p = clamp((vh * .75 - r.top) / (r.height + vh * .25), 0, 1); q.style.setProperty('--p', p.toFixed(3)); lis.forEach((li, i) => li.classList.toggle('on', p >= i / lis.length + .05)); };
  addEventListener('scroll', onScroll, { passive:true }); onScroll();
  mountForm('sonderanfertigung', 'saForm', {});
  saSticky('sonderanfertigung', $('#saSticky'), $('#saHero'), $('#saFormSec'));
  pageFx(root);
};

/* Wappen */
PAGES.wappen = function(){
  const root = $('#p-wappen');
  // Wappen-Preis: Schildpreis nach Größe und Oberfläche (Werkstatt-Tabelle) + Vorlage (50/150/250 €).
  // Zwei Lagen: teurere Lage voll, günstigere Lage zu 50 %. 100 cm und ab drei Lagen im Angebot.
  const VOR = [['datei','Fertige Datei',50,'Vektor oder gute Grafik'],['foto','Foto / Zeichnung',150,'wir zeichnen neu'],['neu','Keine Vorlage',250,'Neuentwurf']];
  const SIZE = [[22.5,59,69],[45,89,99],[55,99,129],[75,169,199],[100,null,null]];
  const LAGEN = [[1,'1 Lage','einfarbig'],[2,'2 Lagen','2. Lage zu 50 %'],[3,'3 oder mehr','im Angebot']];
  const PREM = ['Cortenstahl (Rost)','Edelstahl'], BOLT = 9.45;
  const S = { v:'foto', s:55, m:'Schwarz (RAL 9005)', m2:'Gold', lagen:1, bolt:false }; let shown = 0;
  const cmS = v => String(v).replace('.', ',') + ' cm', eur0 = v => eur(v).replace(',00', '');
  const btn = (grp, k, cur, b, sm, pre) => '<button type="button" data-' + grp + '="' + k + '" aria-pressed="' + (String(k) === String(cur)) + '">' + (pre || '') + '<b>' + b + '</b><small>' + sm + '</small></button>';
  const layerPrice = (size, mat) => { const s = SIZE.find(x => x[0] === size); return s[PREM.includes(mat) ? 2 : 1]; };
  function price(){
    const v = VOR.find(x => x[0] === S.v), p1 = layerPrice(S.s, S.m), p2 = S.lagen === 2 ? layerPrice(S.s, S.m2) : 0;
    const open = p1 == null || S.lagen >= 3 || (S.lagen === 2 && p2 == null);
    const full = S.lagen === 2 ? Math.max(p1, p2) : p1, half = S.lagen === 2 ? Math.min(p1, p2) / 2 : 0;
    return { v, p1, p2, full, half, open, total: open ? null : full + half + v[2] + (S.bolt ? BOLT : 0) };
  }
  const shield = $('#wpShield'), top = $('#wpShieldTop'); shield.style.setProperty('--m', CREST_PLATE); top.style.setProperty('--m', CREST_TOP);
  function draw(){
    const p = price();
    $('#wpVor').innerHTML = VOR.map(x => btn('v', x[0], S.v, x[1], '+ ' + eur0(x[2]) + ' · ' + x[3])).join('');
    $('#wpSize').innerHTML = SIZE.map(x => btn('s', x[0], S.s, cmS(x[0]), x[1] == null ? 'im Angebot' : eur0(x[PREM.includes(S.m) ? 2 : 1]))).join('');
    $('#wpMat').innerHTML = MATS.map(m => btn('m', m[0], S.m, shortMat(m[0]), PREM.includes(m[0]) ? 'Premium' : m[1], txI(m[0], 22))).join('');
    $('#wpLagen').innerHTML = LAGEN.map(x => btn('lg', x[0], S.lagen, x[1], x[2])).join('');
    $('#wpMat2G').hidden = S.lagen !== 2;
    $('#wpMat2').innerHTML = MATS.map(m => btn('m2', m[0], S.m2, shortMat(m[0]), PREM.includes(m[0]) ? 'Premium' : m[1], txI(m[0], 22))).join('');
    $('#wpSizeL').textContent = cmS(S.s) + ' breit';
    const L = [];
    if (S.lagen === 2 && !p.open){
      const firstIs1 = p.p1 >= p.p2, mf = firstIs1 ? S.m : S.m2, mh = firstIs1 ? S.m2 : S.m;
      L.push(['Lage ' + (firstIs1 ? 1 : 2) + ' · ' + cmS(S.s) + ' · ' + shortMat(mf), eur(p.full)], ['Lage ' + (firstIs1 ? 2 : 1) + ' · ' + shortMat(mh) + ' · 50 %', eur(p.half)]);
    } else L.push([cmS(S.s) + ' · ' + shortMat(S.m) + (S.lagen === 2 ? ' + ' + shortMat(S.m2) : S.lagen >= 3 ? ' · 3+ Lagen' : ''), p.open ? 'im Angebot' : eur(p.full)]);
    L.push(['Vorlage: ' + p.v[1], eur(p.v[2])]);
    if (S.bolt) L.push(['Unsichtbare Befestigung', eur(BOLT)]);
    L.push(['Bis zu 3 Entwürfe', 'inklusive']);
    $('#wpBreak').innerHTML = L.map(r => '<div><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></div>').join('');
    if (p.total == null){ shown = 0; $('#wpPrice').textContent = 'im Angebot'; $('#wpPrice').classList.add('ask'); $('#wpStickyP').textContent = 'Dein Wappen · Preis im Angebot'; }
    else { $('#wpPrice').classList.remove('ask'); tween(p.total); $('#wpStickyP').textContent = 'Dein Wappen · ' + eur(p.total); }
    const sc = $('#wpScale'), H = sc.clientHeight || 230, K = (H - 28) / 225;
    $('.man', sc).style.height = (175 * K) + 'px';
    [shield, top].forEach(el => { el.style.width = (S.s * K) + 'px'; el.style.bottom = (18 + (150 - S.s * 1.07 / 2) * K) + 'px'; });
    top.style.backgroundImage = txUrl(S.m); shield.style.backgroundImage = txUrl(S.lagen >= 2 ? S.m2 : S.m); shield.style.opacity = S.lagen >= 2 ? 1 : 0;
    $('#wpDim').textContent = cmS(S.s) + ' · Mensch 175 cm';
  }
  function tween(to){ const el = $('#wpPrice'), from = shown; shown = to; if (RM || !from){ el.textContent = eur(to); return; } const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / 500); el.textContent = eur(from + (to - from) * ease(k)); if (k < 1) requestAnimationFrame(f); else el.textContent = eur(to); }; requestAnimationFrame(f); }
  root.addEventListener('click', e => { const b = e.target.closest('[data-v],[data-s],[data-m],[data-m2],[data-lg]'); if (!b || !b.closest('#wpCalc')) return; if (b.dataset.v) S.v = b.dataset.v; if (b.dataset.s) S.s = +b.dataset.s; if (b.dataset.m) S.m = b.dataset.m; if (b.dataset.m2) S.m2 = b.dataset.m2; if (b.dataset.lg){ S.lagen = +b.dataset.lg; if (S.lagen === 2 && S.m2 === S.m) S.m2 = plateOf(S.m); } draw(); });
  $('#wpBolt').addEventListener('change', e => { S.bolt = e.target.checked; draw(); });
  $('#wpGo').addEventListener('click', () => { const p = price(); askFor({ topic:'wappen', size:cmS(S.s), mat:S.m, multi:S.lagen > 1, calc:{ Vorlage:p.v[1], Lagen: S.lagen === 2 ? '2 – ' + shortMat(S.m) + ' auf ' + shortMat(S.m2) : S.lagen >= 3 ? '3 oder mehr' : '1', Befestigung: S.bolt ? 'unsichtbar (+9,45 €)' : 'ohne', Richtpreis: p.total != null ? eur(p.total) + ' laut Rechner' : 'im Angebot' } }); });
  // Laufband
  const W = sgBy('wappen').concat(SG.filter(g => g.k === 'sg_anfr_028' || g.k === 'sg_tpl_1508f4'));
  const half = Math.ceil(W.length / 2), row = (list, off) => list.map((g, i) => '<img src="' + img(g.k) + '" alt="' + esc(g.cap) + '" data-wi="' + (i + off) + '" loading="lazy">').join('');
  $('#wpMq1').innerHTML = row(W.slice(0, half), 0) + row(W.slice(0, half), 0); $('#wpMq2').innerHTML = row(W.slice(half), half) + row(W.slice(half), half);
  root.addEventListener('click', e => { const im = e.target.closest('[data-wi]'); if (im) lightbox(W, +im.dataset.wi); });
  ideas($('#wpIdeas'), [
    ['sg_anfr_023','Unser altes Familienwappen nach Urkunde neu gezeichnet','Vorlage: Foto oder Scan','55 cm'],
    ['sg_dein_014','Wappen in zwei Lagen, Gold auf Schwarz','Mehrlagig','75 cm','Gold',true],
    ['sg_dein_058','Ein neues, modernes Wappen mit Tier und Initialen','Neuentwurf','45 cm'],
    ['sg_dein_012','Wappen in Cortenstahl-Optik für den Hauseingang','Für draußen','55 cm','Cortenstahl (Rost)'],
    ['sg_dein_065','Hof- oder Vereinswappen für die Hauswand','Groß','100 cm'],
    ['sg_anfr_028','Wappen in Übergröße, mehrteilig gefertigt','Größer als 3 × 2 m','Größer als 100 cm']
  ], 'wappen');
  mountForm('wappen', 'wpForm', { topic:'wappen' });
  saSticky('wappen', $('#wpSticky'), $('#wpHero'), $('#wpForm'));
  pageFx(root); requestAnimationFrame(draw); addEventListener('resize', () => current === 'wappen' && draw());
};

/* Firmenschild */
PAGES.firmenschild = function(){
  const root = $('#p-firma'), scene = $('#fsScene'), sign = $('#fsSign');
  const S = { mat:'Schwarz (RAL 9005)', cm:100, wall:'beton', float:true, ar:1, logo:'Zahnrad' };
  // Beispiel-Logos werden im Browser gezeichnet (keine fremden Marken)
  const DEMO = {
    'Zahnrad': c => { c.lineWidth = 0; c.beginPath(); for (let i = 0; i < 16; i++){ const a = i * Math.PI / 8, r = i % 2 ? 150 : 185; c.lineTo(300 + Math.cos(a) * r, 230 + Math.sin(a) * r); } c.closePath(); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(300, 230, 80, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; c.font = '900 92px "Big Shoulders Stencil Display", Impact, sans-serif'; c.textAlign = 'center'; c.fillText('MEISTERBETRIEB', 300, 530); return 600 / 580; },
    'Berg & Name': c => { c.beginPath(); c.moveTo(40, 330); c.lineTo(210, 90); c.lineTo(290, 200); c.lineTo(360, 120); c.lineTo(560, 330); c.closePath(); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(210, 90); c.lineTo(250, 146); c.lineTo(225, 160); c.lineTo(205, 140); c.lineTo(180, 158); c.closePath(); c.fill(); c.globalCompositeOperation = 'source-over'; c.font = '700 70px Poppins, sans-serif'; c.textAlign = 'center'; c.fillText('Alpenhof', 300, 440); c.fillRect(120, 470, 360, 8); return 600 / 500; },
    'Monogramm': c => { c.lineWidth = 26; c.beginPath(); c.arc(300, 260, 230, 0, 7); c.stroke(); c.lineWidth = 8; c.beginPath(); c.arc(300, 260, 195, 0, 7); c.stroke(); c.font = '700 230px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KB', 300, 272); return 1; }
  };
  function maskFromCanvas(cv){ return 'url("' + cv.toDataURL('image/png') + '")'; }
  function demo(name){ const cv = document.createElement('canvas'); cv.width = 600; cv.height = 600; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.strokeStyle = '#fff'; const ar = DEMO[name](c); const t = trim(cv); S.ar = t.width / t.height || ar; sign.style.setProperty('--m', maskFromCanvas(t)); S.logo = name; drawCtl(); layout(); }
  function trim(cv){ const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0; for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2){ if (d[(y * cv.width + x) * 4 + 3] > 20){ if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } } if (x1 <= x0) return cv; const o = document.createElement('canvas'); o.width = x1 - x0 + 4; o.height = y1 - y0 + 4; o.getContext('2d').drawImage(cv, x0 - 2, y0 - 2, o.width, o.height, 0, 0, o.width, o.height); return o; }
  function fromImage(im){
    const W = 700, sc = Math.min(1, W / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc) || W; cv.height = Math.round(im.height * sc) || W;
    const c = cv.getContext('2d'); c.drawImage(im, 0, 0, cv.width, cv.height); const id = c.getImageData(0, 0, cv.width, cv.height), d = id.data;
    let transp = 0, sum = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4){ if (d[i + 3] < 200) transp++; sum += (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11); }
    const useAlpha = transp > n * .05, avg = sum / n, darkOnLight = avg > 128;
    for (let i = 0; i < d.length; i += 4){ const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; let a = useAlpha ? d[i + 3] : (darkOnLight ? (l < avg * .78 ? 255 : 0) : (l > avg * 1.25 ? 255 : 0)); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a; }
    c.putImageData(id, 0, 0); const t = trim(cv); S.ar = t.width / t.height; sign.style.setProperty('--m', maskFromCanvas(t)); S.logo = 'eigenes'; drawCtl(); layout();
  }
  $('#fsFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { fromImage(im); $('#fsUpT').innerHTML = esc(f.name) + '<small>bleibt in Deinem Browser · dunkle Flächen = Metall</small>'; toast('Dein Logo hängt jetzt an der Wand'); }; im.src = u; });
  function drawCtl(){
    $('#fsDemo').innerHTML = Object.keys(DEMO).map(k => '<button class="chip" type="button" data-dl="' + k + '" aria-pressed="' + (S.logo === k) + '">' + k + '</button>').join('');
    $('#fsMat').innerHTML = MATS.map(m => '<button class="chip" type="button" data-fm="' + esc(m[0]) + '" aria-pressed="' + (S.mat === m[0]) + '"><i class="tx tx-' + TX[m[0]] + '"></i>' + esc(m[0].replace(/ \(.*\)/, '')) + '</button>').join('');
    $('#fsWall').innerHTML = [['beton','Beton'],['weiss','Weiß'],['holz','Holz'],['dunkel','Dunkel']].map(w => '<button class="chip" type="button" data-fw="' + w[0] + '" aria-pressed="' + (S.wall === w[0]) + '">' + w[1] + '</button>').join('') + '<button class="chip" type="button" data-ff aria-pressed="' + S.float + '">Mit Wandabstand</button>';
    sign.style.backgroundImage = txUrl(S.mat); scene.dataset.wall = S.wall; scene.classList.toggle('float', S.float);
    $('#fsSizes').innerHTML = [22.5,45,55,75,100,150,200,300].map(v => '<button class="chip" type="button" data-fsz="' + v + '" aria-pressed="' + (S.cm === v) + '">' + cmTxt(v) + '</button>').join('');
    $('#fsGo').textContent = 'So anfragen: ' + cmTxt(S.cm) + ', ' + shortMat(S.mat);
  }
  function cmTxt(v){ return v >= 200 ? String(v / 100).replace('.', ',') + ' m' : String(v).replace('.', ',') + ' cm'; }
  function layout(){ const k = Math.min(scene.clientHeight * .74 / 210, scene.clientWidth * .5 / S.cm, scene.clientHeight * .7 / (S.cm / S.ar)); scene.style.setProperty('--k', k.toFixed(3)); scene.style.setProperty('--cm', S.cm); scene.style.setProperty('--ar', S.ar.toFixed(3)); const h = k * S.cm / S.ar; const cm = $('#fsCm'); cm.style.top = (scene.clientHeight * .40 + h / 2 + 10) + 'px'; cm.textContent = cmTxt(S.cm) + ' breit' + (S.cm > 300 ? ' · mehrteilig' : ''); $('#fsCmL').textContent = cmTxt(S.cm); }
  root.addEventListener('click', e => {
    const z = e.target.closest('[data-fsz]'); if (z){ S.cm = +z.dataset.fsz; $('#fsSize').value = Math.round(S.cm); drawCtl(); layout(); return; }
    const b = e.target.closest('[data-dl],[data-fm],[data-fw],[data-ff]'); if (!b) return;
    if (b.dataset.dl){ demo(b.dataset.dl); return; }
    if (b.dataset.fm) S.mat = b.dataset.fm; if (b.dataset.fw) S.wall = b.dataset.fw; if (b.hasAttribute('data-ff')) S.float = !S.float; drawCtl();
  });
  $('#fsSize').addEventListener('input', e => { S.cm = +e.target.value; layout(); drawCtl(); });
  $('#fsGo').addEventListener('click', () => askFor({ topic:'firma', size: cmTxt(S.cm), mat:S.mat, calc:{ Breite:cmTxt(S.cm), Montage: S.float ? 'mit Wandabstand' : 'flach an der Wand', Wand: { beton:'Beton', weiss:'Weiß', holz:'Holz', dunkel:'Dunkel' }[S.wall] } }));
  document.fonts && document.fonts.ready ? document.fonts.ready.then(() => demo('Zahnrad')) : demo('Zahnrad');
  addEventListener('resize', () => current === 'firmenschild' && layout());
  // Einsatz-Tabs
  const USE = [
    ['Eingang & Fassade','sg_tpl_e7a1c7','Draußen zählt Wetterfestigkeit: Edelstahl, Cortenstahl oder pulverbeschichteter Stahl. Mit Wandabstand wirft das Logo einen Schatten und wirkt hochwertig.',['Edelstahl','Cortenstahl','pulverbeschichtet','mit Wandabstand']],
    ['Empfang & Büro','sg_tpl_1e9c55','Das erste, was Besucher sehen: Dein Logo in zwei Farben oder mehrlagig, groß an der Wand hinter dem Empfang.',['mehrlagig','zweifarbig','bis 150 cm']],
    ['Laden & Gastro','sg_anfr_000','Ob Barbershop, Café oder Praxis: ein Schild mit Charakter, gern in Gold auf Schwarz.',['Gold','Schwarz','Einzelstück']],
    ['Jubiläum & Team','sg_merc_006','Zum Firmenjubiläum oder als Dankeschön: Anhänger, Kartenhalter oder Schilder mit Eurem Logo – auch in Serie.',['Serie','Geschenkbox','Staffelpreise']],
    ['Verein & Feuerwehr','sg_anfr_041','Wachen-Embleme, Jubiläumsschilder und Vereinslogos – für die Wache, das Vereinsheim oder als Geschenk.',['Emblem','Jubiläum','Gründungsjahr']]
  ];
  let u = 0;
  const drawUse = () => { $('#fsTabs').innerHTML = USE.map((x, i) => '<button class="chip" type="button" role="tab" data-ut="' + i + '" aria-selected="' + (i === u) + '" aria-pressed="' + (i === u) + '">' + esc(x[0]) + '</button>').join(''); const x = USE[u], im = $('#fsUseImg'); im.style.opacity = 0; setTimeout(() => { im.src = img(x[1]); im.alt = x[0]; im.style.opacity = 1; }, RM ? 0 : 160); $('#fsUseT').textContent = x[0]; $('#fsUseP').textContent = x[2]; $('#fsUseF').innerHTML = x[3].map(f => '<span>' + esc(f) + '</span>').join(''); $('#fsUseGo').textContent = 'Für ' + x[0] + ' anfragen'; };
  $('#fsTabs').addEventListener('click', e => { const b = e.target.closest('[data-ut]'); if (b){ u = +b.dataset.ut; drawUse(); } });
  $('#fsUseGo').addEventListener('click', () => askFor({ topic: u === 3 ? 'serie' : 'firma', desc:'Einsatz: ' + USE[u][0] }));
  drawUse();
  const R = sgBy('firma').concat(sgBy('verein'));
  $('#fsRefs').innerHTML = R.map((g, i) => '<button type="button" data-fr="' + i + '" aria-label="' + esc(g.cap) + '" data-rv style="--d:' + (i % 5 * .05) + 's"><img src="' + img(g.k) + '" alt="" loading="lazy"></button>').join('');
  $('#fsLogos').innerHTML = logoTiles();
  $('#fsRefs').addEventListener('click', e => { const b = e.target.closest('[data-fr]'); if (b) lightbox(R, +b.dataset.fr); });
  ideas($('#fsIdeas'), [
    ['sg_tpl_e7a1c7','Logo-Schild für den Eingang, wetterfest','Eingang & Fassade','75 cm','Edelstahl'],
    ['sg_tpl_1e9c55','Empfangsschild in zwei Farben hinter dem Tresen','Empfang & Büro','100 cm','',true],
    ['sg_anfr_000','Laden- oder Gastroschild in Gold auf Schwarz','Laden & Gastro','55 cm','Gold',true],
    ['sg_merc_006','Jubiläums-Anhänger fürs ganze Team','Serie mit Staffelpreis','','',false,'serie'],
    ['sg_anfr_041','Wachen-Emblem für Feuerwehr oder Verein','Verein & Feuerwehr','55 cm','Schwarz (RAL 9005)'],
    ['sg_anfr_011','Großes Logo über 3 m, mehrteilig','Objektbeschilderung','Größer als 100 cm']
  ], 'firma');
  mountForm('firmenschild', 'fsForm', { topic:'firma' });
  saSticky('firmenschild', $('#fsSticky'), $('#fsHero'), $('#fsForm'));
  pageFx(root);
};

/* Galerie */
const GAL = {};
PAGES.galerie = function(){
  const root = $('#p-galerie'), ORDER = ['alle','wappen','firma','privat','serie','verein','gross','detail'];
  let cat = 'alle';
  const list = () => cat === 'alle' ? SG : SG.filter(g => g.cat === cat);
  $('#gaN').textContent = SG.length;
  const drawF = () => { $('#gaFilter').innerHTML = ORDER.map(c => { const n = c === 'alle' ? SG.length : sgBy(c).length; return '<button class="chip" type="button" data-gc="' + c + '" aria-pressed="' + (c === cat) + '">' + (c === 'alle' ? 'Alle' : CAT_NAME[c]) + ' <small>' + n + '</small></button>'; }).join(''); };
  $('#gaGrid').innerHTML = SG.map((g, i) => '<figure class="' + (g.big ? 'big' : '') + '" data-gi="' + i + '" data-cat="' + g.cat + '" tabindex="0" role="button" aria-label="' + esc(g.cap) + '" data-rv style="--d:' + (i % 4 * .06) + 's"><img src="' + img(g.k) + '" alt="" loading="lazy" width="' + g.w + '" height="' + g.h + '"><span class="k">' + esc(CAT_NAME[g.cat]) + '</span><figcaption>' + esc(g.cap) + '</figcaption></figure>').join('');
  GAL.set = c => { cat = ORDER.includes(c) ? c : 'alle'; drawF(); $$('#gaGrid figure').forEach(f => { const on = cat === 'alle' || f.dataset.cat === cat; f.hidden = !on; if (on && !RM){ f.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('in'))); } }); };
  $('#gaFilter').addEventListener('click', e => { const b = e.target.closest('[data-gc]'); if (b) GAL.set(b.dataset.gc); });
  const open = f => { const L = list(), g = SG[+f.dataset.gi]; lightbox(L, L.indexOf(g)); };
  $('#gaGrid').addEventListener('click', e => { const f = e.target.closest('figure'); if (f) open(f); });
  $('#gaGrid').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('figure')){ e.preventDefault(); open(e.target); } });
  const go = () => askFor({ topic: CAT_TOPIC[cat] || '' });
  $('#gaGo').addEventListener('click', go); $('#gaGo2').addEventListener('click', go);
  const G = []; for (let i = 1; i <= 24; i++) if (img('wg_' + String(i).padStart(2, '0'))) G.push('<img src="' + img('wg_' + String(i).padStart(2, '0')) + '" alt="Werkstatt-Schild eines Kunden" loading="lazy">');
  $('#gaWk').innerHTML = G.join('') + G.join('');
  drawF();
  saSticky('galerie', $('#gaSticky'), $('#gaHero'), null);
  pageFx(root);

};

/* Start */
if (PAGES[current]) PAGES[current]();
const pre = ss.get('smxPrefill'); if (pre){ ss.del('smxPrefill'); try { FORMS[current] && FORMS[current].set(JSON.parse(pre)); } catch(e){} }
const gc = ss.get('smxGcat'); if (gc && GAL.set){ ss.del('smxGcat'); GAL.set(gc); }
if (location.hash){ const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView({ block:'start' }), 150); }
})();
