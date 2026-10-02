/* Steelmonks Startseite (neu): Verhalten der SM-Start-Abschnitte, aus dem Prototyp übernommen */
(function(){
  'use strict';
  if (window.SMH) return; window.SMH = true;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  /* Höhe des festen Headers (mit Zeitstrahl) als --smh-hdr, damit die Story-Bühne darunter klebt statt verdeckt zu werden */
  const hdrEl = document.querySelector('.shopify-section-header-sticky, [id$="__header"]');
  if (hdrEl){ const setH = () => document.documentElement.style.setProperty('--smh-hdr', Math.round(hdrEl.getBoundingClientRect().height) + 'px'); setH(); if (window.ResizeObserver) new ResizeObserver(setH).observe(hdrEl); }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/* Pixel-Animationen: Partikel im Pixel-Stil über den Pixel-Bildern
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
  function scan(root){ $$('.smh [data-fx]', root || document).forEach(attach); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  return { scan, burst, attach };
})();
  /* Einstieg: „Für wen?“ wechselt Sprechblase, Pixel-Figur und Kartenstapel; Pfeile drehen den Stapel */
  const fc = $('#fchips'), deck = $('#deck');
  if (fc && deck){
    let order = [0, 1, 2];
    const set = () => $('.deck-set:not([hidden])', deck);
    const place = () => { const s = set(); if (s) $$('.dcard', s).forEach((c, i) => { c.dataset.pos = order.indexOf(i); }); };
    const turn = d => { const n = set() ? $$('.dcard', set()).length : 0; if (n < 2) return; order = d > 0 ? [order[2], order[0], order[1]] : [order[1], order[2], order[0]]; place(); };
    $('#dNext') && $('#dNext').addEventListener('click', () => turn(1));
    $('#dPrev') && $('#dPrev').addEventListener('click', () => turn(-1));
    fc.addEventListener('click', e => {
      const b = e.target.closest('[data-aud]'); if (!b) return;
      $$('[data-aud]', fc).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $$('.deck-set', deck).forEach(s => { s.hidden = s.dataset.set !== b.dataset.aud; });
      order = [0, 1, 2]; place();
      if (b.dataset.say) $('#finderSay').textContent = b.dataset.say;
      const av = $('#finderPx'); if (av && b.dataset.px){ av.classList.remove('pxa-pop'); void av.offsetWidth; av.src = b.dataset.px; av.classList.add('pxa-pop'); }
    });
  }

  /* Scroll-Story: eigener Text auf der Schnittvorlage, dann Laser, Farbe, Wand */
  const story = $('#entstehung');
  if (story){
    const MEAS = $('#meas'), F_DISP = 'Poppins, Segoe UI, system-ui, sans-serif';
    const textWidth = (t, size, weight, spacing) => { MEAS.setAttribute('font-family', F_DISP); MEAS.setAttribute('font-size', size); MEAS.setAttribute('font-weight', weight); MEAS.setAttribute('letter-spacing', spacing || 0); MEAS.textContent = t || ' '; try { return MEAS.getComputedTextLength() || (t || ' ').length * size * .5; } catch (e){ return (t || ' ').length * size * .5; } };
    const setText = () => {
      const t1 = ($('#storyText').value || ' ').toUpperCase(), t2 = ($('#storyText2').value || '').toUpperCase();
      let f1 = 118; const w1 = textWidth(t1, f1, 800, 0); if (w1 > 500) f1 = Math.max(40, f1 * 500 / w1);
      let f2 = 34; const w2 = t2 ? textWidth(t2, f2, 800, 8) : 0; if (w2 > 400) f2 = Math.max(16, f2 * 400 / w2);
      const y1 = t2 ? 150 + f1 * .36 : 170 + f1 * .36;
      ['s1', 'sb1'].forEach(id => { const el = $('#' + id); el.textContent = t1; el.setAttribute('font-size', f1.toFixed(1)); el.setAttribute('y', y1.toFixed(1)); });
      ['s2', 'sb2'].forEach(id => { const el = $('#' + id); el.textContent = t2; el.setAttribute('font-size', f2.toFixed(1)); });
    };
    $('#storyText').addEventListener('input', setText); $('#storyText2').addEventListener('input', setText);
    (document.fonts && document.fonts.load ? document.fonts.load('800 110px Poppins') : Promise.resolve()).then(setText, setText);
    const steps = $$('#steps li'), rail = $$('#srail button');
    let last = -1, tick = false;
    const upd = () => {
      tick = false;
      const r = story.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const total = story.offsetHeight - innerHeight, p = clamp(-r.top / Math.max(1, total), 0, 1), q = p * 4, st = Math.min(3, Math.floor(q));
      if (st !== last){ steps.forEach((li, i) => li.classList.toggle('on', i === st)); rail.forEach((b, i) => b.classList.toggle('on', i === st)); last = st; }
      rail.forEach((b, i) => { b.querySelector('b').style.width = (clamp(q - i, 0, 1) * 100) + '%'; });
      $('#sBlue').setAttribute('opacity', clamp(1.25 - q, 0, 1).toFixed(3));
      $('#sMetal').setAttribute('opacity', clamp((q - .8) * 3, 0, 1).toFixed(3));
      const cut = clamp((q - 1.08) / .8, 0, 1), x = 20 + 560 * cut;
      $('#sLr').setAttribute('width', x.toFixed(1)); $('#sRr').setAttribute('x', x.toFixed(1)); $('#sRr').setAttribute('width', (600 - x).toFixed(1));
      const las = cut > 0 && cut < 1; $('#sLaser').setAttribute('opacity', las ? '1' : '0'); if (las){ $('#sBeam').setAttribute('x', (x - 1.5).toFixed(1)); $('#sBeamW').setAttribute('x', (x - 13).toFixed(1)); }
      $('#sColor').setAttribute('opacity', clamp((q - 2.05) / .7, 0, 1).toFixed(3));
      const w = clamp((q - 3) / .55, 0, 1); $('#sWall').style.opacity = w.toFixed(3);
      if (w > .05) $('#sShadowG').setAttribute('filter', 'url(#sShadow)'); else $('#sShadowG').removeAttribute('filter');
      $('#sRo').classList.toggle('light', w > .5);
      $('#sRoL').textContent = ['Schnittvorlage · 2 mm Stahl', 'Laserschnitt · ' + Math.round(cut * 100) + ' %', 'Pulverbeschichtung', 'Unsichtbare Befestigung · wetterfest'][st];
    };
    addEventListener('scroll', () => { if (!tick){ tick = true; requestAnimationFrame(upd); } }, { passive:true }); upd();
    rail.forEach((b, i) => b.addEventListener('click', () => { const total = story.offsetHeight - innerHeight; scrollTo({ top: story.getBoundingClientRect().top + scrollY + total * ((i + .55) / 4), behavior: RM ? 'auto' : 'smooth' }); }));
  }

  /* Werkstatt: Beispiel wählen, der Regler fährt kurz auf und zeigt Vorlage und Schild */
  const tabs = $('#werkTabs'), cmp = $('#cmp');
  if (tabs && cmp){
    const range = $('#cmpRange'), A = $('#cmpA'), B = $('#cmpB'), kind = $('#promptKind'), text = $('#promptText'), kids = Array.from(tabs.children);
    const setPos = v => { cmp.style.setProperty('--pos', v + '%'); range.value = Math.round(v); };
    const show = (i, focus) => {
      const b = kids[i]; kids.forEach((x, j) => { x.setAttribute('aria-selected', String(j === i)); x.tabIndex = j === i ? 0 : -1; });
      A.src = b.dataset.a; B.src = b.dataset.b; kind.textContent = b.dataset.kind; text.textContent = b.dataset.text; if (focus) b.focus();
      if (RM) return setPos(50);
      const t0 = performance.now(); const go = n => { const t = clamp((n - t0) / 900, 0, 1); setPos(12 + 38 * ease(t)); if (t < 1) requestAnimationFrame(go); }; requestAnimationFrame(go);
    };
    kids.forEach((b, i) => b.addEventListener('click', () => show(i)));
    tabs.addEventListener('keydown', e => { const i = kids.findIndex(b => b.getAttribute('aria-selected') === 'true'); if (e.key === 'ArrowRight'){ e.preventDefault(); show((i + 1) % kids.length, true); } if (e.key === 'ArrowLeft'){ e.preventDefault(); show((i - 1 + kids.length) % kids.length, true); } });
    range.addEventListener('input', () => setPos(+range.value));
    setPos(50);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { if (es[0].isIntersecting){ io.disconnect(); show(0); } }, { threshold:.3 }) : null;
    if (io) io.observe(cmp); else show(0);
  }

  /* Anstecker: Stapel zum Durchblättern */
  const pd = $('#pdeck'), pl = $('#pinsList');
  if (pd && pl){
    const figs = $$('figure', pd), n = figs.length; let top = 0;
    const lay = () => { figs.forEach((f, i) => { const k = (i - top + n) % n; f.style.zIndex = 10 - k; f.style.transform = 'translate(calc(-50% + ' + (k * 34) + 'px), calc(-50% + ' + (k * -10) + 'px)) rotate(' + (k * 6 - 3) + 'deg) scale(' + (1 - k * .06) + ')'; f.style.filter = 'brightness(' + (1 - k * .14) + ')'; }); $$('[data-pin]', pl).forEach((b, i) => b.setAttribute('aria-pressed', String(i === top))); };
    pd.addEventListener('click', () => { top = (top + 1) % n; lay(); });
    pl.addEventListener('click', e => { const b = e.target.closest('[data-pin]'); if (b){ top = +b.dataset.pin; lay(); } });
    lay();
  }

  /* Wimmelbild: versteckte Stellen finden */
  const pxw = $('#pxw');
  if (pxw){
    const say = $('#pxSay'), hint = $('#pxHint'), cnt = $('#pxCount'), all = $$('.hs', pxw).length, seen = new Set();
    pxw.addEventListener('click', e => {
      const b = e.target.closest('[data-who]'); if (!b) return;
      seen.add(b.dataset.who); b.classList.add('seen'); if (hint) hint.classList.add('off');
      say.textContent = ''; if (b.dataset.t){ const s = document.createElement('b'); s.textContent = b.dataset.t + ': '; say.appendChild(s); } say.appendChild(document.createTextNode(b.dataset.fact || ''));
      say.hidden = false;
      const r = b.getBoundingClientRect(), pr = pxw.getBoundingClientRect(), sw = Math.min(300, pr.width * .6);
      say.style.left = clamp(r.left + r.width / 2 - pr.left - sw / 2, 8, pr.width - sw - 8) + 'px';
      say.style.top = (r.top - pr.top > pr.height * .45 ? Math.max(8, r.top - pr.top - 120) : r.bottom - pr.top + 8) + 'px';
      cnt.textContent = seen.size === all ? 'Alle ' + all + ' gefunden. Stark!' : seen.size + ' von ' + all + ' entdeckt';
    });
  }

  /* Steelmonks-Story: Reihe mit Pfeilen blättern */
  $$('.smh .bl-story').forEach(st => {
    const scope = st.closest('section'), sn = $$('[data-sn]', scope);
    const upd = () => { if (sn.length < 2) return; sn[0].disabled = st.scrollLeft < 8; sn[1].disabled = st.scrollLeft + st.clientWidth >= st.scrollWidth - 8; };
    sn.forEach(b => b.addEventListener('click', () => st.scrollBy({ left: +b.dataset.sn * ((st.firstElementChild ? st.firstElementChild.offsetWidth : 260) + 14) * 2, behavior: RM ? 'auto' : 'smooth' })));
    st.addEventListener('scroll', upd, { passive:true }); upd();
  });

  /* Bewertungen: nach Produkt filtern („Alle“ zeigt je Produkt zwei), Kundenfotos groß */
  const rc = $('#revChips'), qs = $('#homeQuotes');
  if (rc && qs){
    const Q = $$('.quote', qs);
    const draw = k => {
      const per = {}; let shown = 0;
      Q.forEach(q => { let on; if (k === 'alle'){ per[q.dataset.rp] = (per[q.dataset.rp] || 0) + 1; on = per[q.dataset.rp] <= 2 && shown < 8; } else on = q.dataset.rp === k && shown < 8; q.hidden = !on; if (on) shown++; });
    };
    rc.addEventListener('click', e => { const b = e.target.closest('[data-rp]'); if (!b) return; $$('[data-rp]', rc).forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(b.dataset.rp); qs.scrollLeft = 0; });
    draw('alle');
  }
  const lb = $('#smhLb'), ugc = $('#homeUgc');
  if (lb && ugc){
    document.body.appendChild(lb.parentElement);
    let back = null;
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; if (back) back.focus(); };
    ugc.addEventListener('click', e => {
      const b = e.target.closest('[data-ugc]'); if (!b) return; back = b;
      $('img', lb).src = b.dataset.src; $('.stars', lb).textContent = '★'.repeat(+b.dataset.stars || 5);
      $('q', lb).textContent = b.dataset.text || 'Ohne Text'; $('.mono', lb).textContent = (b.dataset.date ? b.dataset.date + ' · ' : '') + 'verifizierte Bewertung';
      lb.hidden = false; document.body.style.overflow = 'hidden'; $('.smh-lb__x', lb).focus();
    });
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.smh-lb__x')) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) close(); });
  }

  /* Trusted Shops: aktuelle Note (letzte 12 Monate) und Gesamtzahl aus dem öffentlichen Feed, sonst bleiben die Werte aus dem Theme */
  const tsR = $$('[data-ts-rating]'), tsN = $$('[data-ts-count]');
  if (tsR.length || tsN.length){
    const apply = g => { if (!g) return; if (g.r) tsR.forEach(el => { el.textContent = g.r.toFixed(2).replace('.', ','); }); if (g.n) tsN.forEach(el => { el.textContent = new Intl.NumberFormat('de-DE').format(g.n); }); };
    let c = null; try { c = JSON.parse(sessionStorage.getItem('smhTs') || 'null'); } catch (e) {}
    if (c) apply(c);
    else fetch('https://integrations.etrusted.com/feeds/grades/v1/channels/chl-056f6db9-2266-48bf-8c7b-44c1673f979d/touchpoints/all/feed.json', { credentials:'omit' })
      .then(r => r.ok ? r.json() : null).then(d => { if (!d || !d.grades) return; const g = { r: (d.grades['365days'] || {}).rating, n: (d.grades.overall || {}).count }; if (!g.r || !g.n) return; apply(g); try { sessionStorage.setItem('smhTs', JSON.stringify(g)); } catch (e) {} }).catch(() => {});
  }

  PXFX.scan(document);
})();
