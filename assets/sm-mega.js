/* Neues Mega-Menü und Handy-Menü (erst auf ?view=neu), aus dem Prototyp übernommen */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const mg = $('#smmMg');
  if (mg && !mg.dataset.on) {
    mg.dataset.on = '1';
    const hdr = mg.closest('header') || document.querySelector('header'), box = $('.mg-box', mg), inner = $('.mg-in', mg), ink = $('.smm-ink');
    const btns = $$('.smm-nb[data-p]');
    const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let cur = null, tOpen = 0, tClose = 0, tClean = 0, openY = 0;
    const fit = () => { box.style.height = cur ? inner.offsetHeight + 'px' : '0px'; };
    const moveInk = b => { if (!ink) return; if (!b) { ink.style.opacity = '0'; return; } const n = ink.parentElement.getBoundingClientRect(), r = b.getBoundingClientRect(); ink.style.left = (r.left - n.left) + 'px'; ink.style.width = r.width + 'px'; ink.style.opacity = '1'; };
    const open = id => {
      clearTimeout(tClose); clearTimeout(tClean);
      if (cur === id) return;
      $$('.mg-p', mg).forEach(p => p.classList.toggle('on', p.id === id));
      btns.forEach(b => b.setAttribute('aria-expanded', String(b.dataset.p === id)));
      cur = id; openY = scrollY; mg.classList.add('on'); mg.setAttribute('aria-hidden', 'false');
      moveInk(btns.find(b => b.dataset.p === id)); fit();
    };
    const close = () => {
      clearTimeout(tOpen); if (!cur) return;
      cur = null; mg.classList.remove('on'); mg.setAttribute('aria-hidden', 'true');
      btns.forEach(b => b.setAttribute('aria-expanded', 'false')); moveInk(null); fit();
      tClean = setTimeout(() => { if (!cur) $$('.mg-p.on', mg).forEach(p => p.classList.remove('on')); }, 450);
    };
    btns.forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); if (FINE) open(b.dataset.p); else if (cur === b.dataset.p) close(); else open(b.dataset.p); });
      b.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); open(b.dataset.p); const a = $('#' + b.dataset.p + ' a'); if (a) setTimeout(() => a.focus(), 30); } });
      if (FINE) {
        b.addEventListener('mouseenter', () => { clearTimeout(tOpen); clearTimeout(tClose); tOpen = setTimeout(() => open(b.dataset.p), cur ? 60 : 140); });
        b.addEventListener('mouseleave', () => clearTimeout(tOpen));
      }
    });
    if (FINE && hdr) {
      hdr.addEventListener('mouseleave', () => { clearTimeout(tOpen); tClose = setTimeout(close, 260); });
      hdr.addEventListener('mouseenter', () => clearTimeout(tClose));
    }
    document.addEventListener('click', e => { if (!cur) return; if (e.target.closest('#smmMg a') || (!e.target.closest('#smmMg') && !e.target.closest('.smm-nb'))) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { const b = btns.find(x => x.dataset.p === cur); close(); if (b) b.focus(); } });
    mg.addEventListener('focusout', e => { if (cur && hdr && !hdr.contains(e.relatedTarget)) close(); });
    addEventListener('scroll', () => { if (cur && Math.abs(scrollY - openY) > 80) close(); }, { passive: true });
    addEventListener('resize', () => { if (cur) { fit(); moveInk(btns.find(b => b.dataset.p === cur)); } });

    // Vorschau-Spalte: großes Bild zum Menüpunkt unter der Maus
    $$('.mg-prev', mg).forEach(pv => {
      const panel = pv.closest('.mg-p'), im = $('img.big', pv), t = $('.cap b', pv), s = $('.cap span', pv), l = $('.cap a', pv);
      const def = { src: im.getAttribute('src'), k: 'px', t: t.textContent, s: s.textContent, h: l.getAttribute('href'), lt: l.textContent };
      let tt = 0, tw = 0;
      const show = (src, k, title, sub, href, lt) => {
        if (im.getAttribute('src') !== src) { im.classList.add('sw'); clearTimeout(tw); tw = setTimeout(() => { im.src = src; im.className = 'big' + (k && k !== 'foto' ? ' ' + k : ''); requestAnimationFrame(() => im.classList.remove('sw')); }, 110); }
        t.textContent = title; s.textContent = sub; s.hidden = !sub; l.setAttribute('href', href); l.textContent = lt;
      };
      $$('a[data-pi]', panel).forEach(a => {
        const go = () => { if (!a.dataset.pi) return; clearTimeout(tt); show(a.dataset.pi, a.dataset.pk, a.dataset.pt, '', a.getAttribute('href'), (pv.dataset.sub || 'Ansehen') + ' →'); };
        a.addEventListener('mouseenter', go); a.addEventListener('focus', go);
      });
      panel.addEventListener('mouseleave', () => { tt = setTimeout(() => show(def.src, def.k, def.t, def.s, def.h, def.lt), 260); });
    });
  }

  // Handy-Menü
  const mob = $('#smmMob'), burger = $('.smm-burger');
  if (mob && burger && !mob.dataset.on) {
    mob.dataset.on = '1';
    document.body.appendChild(mob);
    const lock = on => document.body.classList.toggle('overflow-hidden-tablet', on);
    const openM = () => { mob.hidden = false; burger.setAttribute('aria-expanded', 'true'); lock(true); setTimeout(() => { const x = $('.mob-x', mob); if (x) x.focus(); }, 40); };
    const closeM = () => { mob.hidden = true; burger.setAttribute('aria-expanded', 'false'); lock(false); burger.focus(); };
    burger.addEventListener('click', openM);
    mob.addEventListener('click', e => {
      if (e.target.closest('.mob-x')) return closeM();
      const h = e.target.closest('.acc-h[aria-controls]');
      if (h) { const b = document.getElementById(h.getAttribute('aria-controls')), on = h.getAttribute('aria-expanded') !== 'true'; h.setAttribute('aria-expanded', String(on)); if (b) b.hidden = !on; return; }
      if (e.target.closest('a')) { mob.hidden = true; burger.setAttribute('aria-expanded', 'false'); lock(false); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mob.hidden) closeM(); });
    addEventListener('resize', () => { if (!mob.hidden && innerWidth >= 990) closeM(); });
  }
})();
