/* Neue Kollektionsseite: Untergruppen (Reiter in der Filterleiste), Sortierung, Preis-Regler, „ab 4,8 ★“, Top 3 und „Weitere anzeigen“,
   alles im Browser auf den serverseitig ausgegebenen Karten (.cc mit data-type, data-p, data-r, data-n, data-o, data-i).
   Auf den Seiten mit Schilder-Werkstatt stehen die Untergruppen als Einträge einer Auswahlliste (li role="option" mit data-tab, gewählt: aria-selected)
   statt als Reiter (aria-pressed), die Sortierung bleibt im versteckten select data-sort; die Werkstatt (sm-coll-schild.js) bedient beide nur über Klick und change.
   Preis-Regler: ganz rechts heißt „Alle Preise“ (kein Filter), sonst „Preis bis …“. Die Werkstatt setzt min und max des Reglers auf die Preise, die ihre Karten
   zeigen, und meldet input; hier wird nur gelesen. data-minv und data-maxe (falls da) zeigen die Enden der Spanne.
   Auf den übrigen Kollektionen ist die Sortierung eine eigene Auswahlliste wie in der Werkstatt, nur hell (Knopf data-sortk mit Mono-Beschriftung über einer
   Liste role="listbox", gebaut aus dem versteckten select data-sort, das die Quelle bleibt): Pfeiltasten, Pos1, Ende, Eingabe, Leertaste, Escape, Tipp daneben.
   Treffer (data-hits): die Zahl fett, damit sie auch klein in der Leiste der Werkstatt lesbar bleibt. */
(function(){
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  $$('[data-smc]').forEach(root => {
    const grid = $('[data-grid]', root), empty = $('[data-empty]', root), more = $('[data-more]', root), moreRow = $('[data-morerow]', root);
    const cards = $$('.cc', grid), step = +root.dataset.step || 16;
    const shownTabs = $$('[data-tab]', root).map(b => b.dataset.tab).filter(t => t !== '*' && t !== '~weitere');
    const st = { tab:'*', max:Infinity, top:false, sort:root.dataset.defaultSort || 'pop', all:false };
    const num = (el, k) => +el.dataset[k] || 0;
    const SORT = {
      new:(a, b) => num(a, 'i') - num(b, 'i'),
      pop:(a, b) => num(b, 'o') - num(a, 'o') || num(b, 'n') - num(a, 'n') || num(a, 'i') - num(b, 'i'),
      rating:(a, b) => num(b, 'r') - num(a, 'r') || num(b, 'n') - num(a, 'n') || num(a, 'i') - num(b, 'i'),
      reviews:(a, b) => num(b, 'n') - num(a, 'n') || num(a, 'i') - num(b, 'i'),
      asc:(a, b) => num(a, 'p') - num(b, 'p') || num(a, 'i') - num(b, 'i'),
      desc:(a, b) => num(b, 'p') - num(a, 'p') || num(a, 'i') - num(b, 'i')
    };
    const match = el => {
      const t = el.dataset.type;
      if (st.tab === '~weitere' ? shownTabs.includes(t) : st.tab !== '*' && t !== st.tab) return false;
      if (num(el, 'p') > st.max) return false;
      if (st.top && num(el, 'r') < 480) return false;
      return true;
    };
    function badges(list){
      $$('.tags[data-topb]', grid).forEach(t => t.remove());
      $$('.pcard .tags', grid).forEach(t => { if (/^Top \d$/.test(t.textContent.trim())) t.remove(); });
      if (st.sort !== 'pop') return;
      list.slice(0, 3).forEach((el, i) => { if (!num(el, 'o')) return; const ph = $('.ph', el); if (!ph) return; const s = document.createElement('span'); s.className = 'tags'; s.dataset.topb = ''; s.innerHTML = '<span class="badge hot">Top ' + (i + 1) + '</span>'; ph.appendChild(s); });
    }
    function draw(){
      const list = cards.filter(match).sort(SORT[st.sort]);
      const set = new Set(list), lim = st.all ? list.length : step;
      cards.slice().sort(SORT[st.sort]).forEach(el => grid.insertBefore(el, empty));
      cards.forEach(el => { el.hidden = !set.has(el) || list.indexOf(el) >= lim; });
      empty.hidden = list.length > 0;
      const rest = list.length - lim;
      moreRow.hidden = rest <= 0;
      if (rest > 0) more.firstChild.nodeValue = 'Weitere ' + rest + ' anzeigen ';
      $$('[data-hits]', root).forEach(h => { h.innerHTML = '<b>' + list.length + '</b> Treffer'; });
      badges(list);
    }
    $$('[data-tab]', root).forEach(b => b.addEventListener('click', () => {
      st.tab = b.dataset.tab; st.all = false;
      $$('[data-tab]', root).forEach(x => x.setAttribute(x.getAttribute('role') === 'option' ? 'aria-selected' : 'aria-pressed', x === b)); draw();
    }));
    const sort = $('[data-sort]', root); if (sort) sort.addEventListener('change', () => { st.sort = sort.value; draw(); });
    const sk = $('[data-sortk]', root); if (sk && sort) auswahl(sk, sort);
    const fm = $('[data-fmore]', root), panel = fm && document.getElementById(fm.getAttribute('aria-controls'));
    if (fm && panel) fm.addEventListener('click', () => { panel.hidden = !panel.hidden; fm.setAttribute('aria-expanded', !panel.hidden); });
    const max = $('[data-max]', root), maxT = $$('[data-maxt]', root), minV = $$('[data-minv]', root), maxE = $$('[data-maxe]', root);
    function preis(){
      const v = +max.value, alle = v >= +max.max;
      st.max = alle ? Infinity : v * 100;
      const t = alle ? 'Alle Preise' : 'Preis bis ' + v + ' €';
      maxT.forEach(l => { l.innerHTML = alle ? t : 'Preis bis <b class="tnum">' + v + ' €</b>'; });
      max.setAttribute('aria-valuetext', t);
      minV.forEach(e => { e.textContent = max.min + ' €'; }); maxE.forEach(e => { e.textContent = max.max + ' €'; });
    }
    if (max){ max.addEventListener('input', () => { preis(); draw(); }); preis(); }
    const top = $('[data-top]', root); if (top) top.addEventListener('change', () => { st.top = top.checked; draw(); });
    if (more) more.addEventListener('click', () => { st.all = true; draw(); });
    draw();
  });
  // Helle Auswahlliste für die Sortierung (Kollektionen ohne Werkstatt). btn: Knopf mit aria-controls, sel: das versteckte select (Quelle und change)
  function auswahl(btn, sel){
    const KURZ = { pop:'Beliebteste', rating:'Beste Bewertung', reviews:'Meiste Bewertungen', asc:'Preis aufsteigend', desc:'Preis absteigend', new:'Neueste' };
    const wert = $('[data-sortv]', btn), ul = document.createElement('ul');
    ul.id = btn.getAttribute('aria-controls'); ul.className = 'smc-dd-l'; ul.setAttribute('role', 'listbox'); ul.setAttribute('aria-label', 'Sortieren'); ul.tabIndex = -1; ul.hidden = true;
    Array.from(sel.options).forEach(o => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.tabIndex = -1; li.dataset.v = o.value; li.textContent = o.textContent; ul.appendChild(li); });
    btn.parentNode.appendChild(ul);
    const opts = () => $$('[role="option"]', ul);
    function zeigen(){ wert.textContent = KURZ[sel.value] || sel.options[sel.selectedIndex].textContent; opts().forEach(li => li.setAttribute('aria-selected', String(li.dataset.v === sel.value))); }
    function auf(){ ul.hidden = false; btn.setAttribute('aria-expanded', 'true'); (ul.querySelector('[aria-selected="true"]') || opts()[0]).focus({ preventScroll:true }); }
    function zu(fokus){ if (ul.hidden) return; ul.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (fokus) btn.focus({ preventScroll:true }); }
    function nimm(li){ zu(true); if (sel.value !== li.dataset.v){ sel.value = li.dataset.v; sel.dispatchEvent(new Event('change', { bubbles:true })); } zeigen(); }
    btn.addEventListener('click', () => { if (ul.hidden) auf(); else zu(true); });
    btn.addEventListener('keydown', e => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && ul.hidden){ e.preventDefault(); auf(); } });
    ul.addEventListener('click', e => { const li = e.target.closest('[role="option"]'); if (li) nimm(li); });
    ul.addEventListener('keydown', e => {
      const o = opts(), i = o.indexOf(document.activeElement);
      if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); zu(true); }
      else if (/^(ArrowDown|ArrowUp|Home|End)$/.test(e.key)){ e.preventDefault(); o[e.key === 'Home' ? 0 : e.key === 'End' ? o.length - 1 : Math.max(0, Math.min(o.length - 1, (i < 0 ? 0 : i) + (e.key === 'ArrowDown' ? 1 : -1)))].focus(); }
      else if ((e.key === 'Enter' || e.key === ' ') && i >= 0){ e.preventDefault(); nimm(o[i]); }
      else if (e.key === 'Tab') zu(false);
    });
    ul.addEventListener('focusout', e => { const r = e.relatedTarget; if (r && !ul.contains(r) && r !== btn) zu(false); });
    document.addEventListener('pointerdown', e => { if (!ul.hidden && !ul.contains(e.target) && !btn.contains(e.target)) zu(false); }, true);
    sel.addEventListener('change', zeigen);
    zeigen();
  }
})();
