/* Neue Kollektionsseite: Untergruppen (Reiter in der Filterleiste), Sortierung, Preis-Regler, „ab 4,8 ★“, Top 3 und „Weitere anzeigen“,
   alles im Browser auf den serverseitig ausgegebenen Karten (.cc mit data-type, data-p, data-r, data-n, data-o, data-i). */
(function(){
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  $$('[data-smc]').forEach(root => {
    const grid = $('[data-grid]', root), empty = $('[data-empty]', root), more = $('[data-more]', root), moreRow = $('[data-morerow]', root);
    const cards = $$('.cc', grid), step = +root.dataset.step || 16;
    const shownTabs = $$('[data-tab]', root).map(b => b.dataset.tab).filter(t => t !== '*' && t !== '~weitere');
    const st = { tab:'*', max:Infinity, top:false, sort:'pop', all:false };
    const num = (el, k) => +el.dataset[k] || 0;
    const SORT = {
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
      $$('[data-hits]', root).forEach(h => { h.textContent = list.length + ' Treffer'; });
      badges(list);
      // Handy: Tipp als Karte nach dem vierten sichtbaren Produkt
      const tipm = $('[data-tipm]', grid);
      if (tipm){ const vis = list.slice(0, lim); grid.insertBefore(tipm, vis.length > 4 ? vis[4] : empty); tipm.hidden = !vis.length; }
    }
    $$('[data-tab]', root).forEach(b => b.addEventListener('click', () => {
      st.tab = b.dataset.tab; st.all = false;
      $$('[data-tab]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); draw();
    }));
    const sort = $('[data-sort]', root); if (sort) sort.addEventListener('change', () => { st.sort = sort.value; draw(); });
    const fm = $('[data-fmore]', root), panel = fm && document.getElementById(fm.getAttribute('aria-controls'));
    if (fm && panel) fm.addEventListener('click', () => { panel.hidden = !panel.hidden; fm.setAttribute('aria-expanded', !panel.hidden); });
    const max = $('[data-max]', root), maxV = $('[data-maxv]', root);
    if (max) max.addEventListener('input', () => { const v = +max.value; st.max = v >= +max.max ? Infinity : v * 100; maxV.textContent = v + ' €'; draw(); });
    const top = $('[data-top]', root); if (top) top.addEventListener('change', () => { st.top = top.checked; draw(); });
    if (more) more.addEventListener('click', () => { st.all = true; draw(); });
    draw();
  });
})();
