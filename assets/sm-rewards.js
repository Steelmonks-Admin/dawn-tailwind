/* Steelmonks Belohnungs-Pfad: Kopfleiste, Panel im Warenkorb mit Pixel-Mönch, Marker-Produkte, Mystery-Gift-Attribut, Ereignisse für GA4 */
(function () {
  'use strict';
  const cfgEl = document.getElementById('smr-config');
  if (!cfgEl || window.SMR) return;
  let C;
  try { C = JSON.parse(cfgEl.textContent); } catch (e) { return; }

  const rate = parseFloat(window.Shopify && Shopify.currency && Shopify.currency.rate) || 1;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROOT = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  const JSONH = { 'Content-Type': 'application/json', Accept: 'application/json' };

  // Stufen: Beträge und Marker kommen aus der Konfiguration (Schwellen später testbar), Texte stehen hier
  const T = [
    { id: 'free_shipping', short: 'bis zum Gratisversand', m: 'bis Gratisversand', lead: 'dann ist Dein Versand kostenlos', done: 'Gratisversand gesichert', toast: 'Gratisversand freigeschaltet!', hint: 'Dein Versand ist jetzt kostenlos.', img: C.img.jakob, icon: 'truck' },
    { id: 'discount_10', short: 'für 10 € Rabatt', m: 'für 10 € Rabatt', lead: 'dann gibt es 10 € Rabatt', done: '10 € Rabatt gesichert', toast: '10 € Rabatt freigeschaltet!', hint: 'Wird automatisch abgezogen.', img: C.img.tag, icon: 'tag' },
    { id: 'mystery_gift', short: 'für das Mystery Gift', m: 'für Mystery Gift', lead: 'dann legen wir ein Mystery Gift dazu', done: 'Mystery Gift ist dabei', toast: 'Mystery Gift freigeschaltet!', hint: 'Wir legen Dir eine Überraschung ins Paket.', img: C.img.chest, icon: 'chest' }
  ].map((t, i) => Object.assign(t, C.tiers[i], { cents: Math.round(C.tiers[i].at * 100 * rate) }, { label: ['Gratisversand', '10 € Rabatt', 'Mystery Gift'][i], tile: [C.img.jakob, C.img.tileDiscount, C.img.tileMystery][i], title: ['Versand', '10 € Rabatt', 'Mystery Gift'][i], on: ['kostenlos', 'freigeschaltet', 'ist dabei'][i] }));
  const MAX = T[T.length - 1].cents;
  const MARK = new Set(T.map((t) => t.marker));
  const SIGN = /schild(er)?$|^(monogramm|wappen)$/i, NOSIGN = /klingel|stra(ß|ss)en/i;

  const store = (s) => ({ get(k) { try { return s.getItem(k); } catch (e) { return null; } }, set(k, v) { try { s.setItem(k, v); } catch (e) {} } });
  const SS = store(window.sessionStorage);
  const push = (event, data) => { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, data)); } catch (e) {} };
  const money = (c) => (c / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const amt = (c) => (c / 100).toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  // Pixel-Symbole als SVG (eine Zeile je Pixelreihe)
  const PX = {
    truck: ['#######.....', '#######.###.', '#######.#..#', '#######.#..#', '############', '############', '.##.....##..', '.##.....##..'],
    tag: ['..##########', '.###########', '###..#######', '###..#######', '.###########', '..##########'],
    chest: ['.#########.', '###########', '###########', '...........', '#####.#####', '####...####', '#####.#####', '###########', '###########'],
    check: ['.......##', '......##.', '##...##..', '.##.##...', '..###....', '...#.....'],
    lock: ['.###.', '#...#', '#...#', '#####', '##.##', '##.##', '#####']
  };
  const svg = (k) => {
    const r = PX[k], w = r[0].length, h = r.length;
    let d = '';
    r.forEach((row, y) => { for (let x = 0; x < w;) { if (row[x] !== '#') { x++; continue; } const s = x; while (x < w && row[x] === '#') x++; d += 'M' + s + ' ' + y + 'h' + (x - s) + 'v1h-' + (x - s) + 'z'; } });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  };

  // Zustand aus /cart.js: Marker zählen nicht mit
  function derive(cart) {
    const items = cart.items.filter((i) => !MARK.has(i.variant_id));
    const used = new Set();
    (cart.cart_level_discount_applications || []).forEach((d) => used.add(String(d.title || '').toUpperCase()));
    items.forEach((i) => (i.line_level_discount_allocations || []).forEach((a) => used.add(String((a.discount_application || {}).title || '').toUpperCase())));
    // Ein gültiger Code ohne Abzug im Warenkorb ist ein Versandcode (Newsletter-Code, nur DE/AT)
    const shipCode = C.codeCountries.indexOf(C.country) > -1 && (cart.discount_codes || []).some((d) => d.applicable && !used.has(String(d.code).toUpperCase()));
    // Wie Shopify die Mindestbeträge prüft: nach Artikelrabatten und Rabattcodes, ohne den automatischen 10-€-Rabatt selbst
    const codes = (cart.cart_level_discount_applications || []).filter((d) => d.type === 'discount_code').reduce((s, d) => s + (d.total_allocated_amount || 0), 0);
    return { total: Math.max(0, cart.items_subtotal_price - codes), count: items.reduce((s, i) => s + i.quantity, 0), items, shipCode, cart };
  }
  function view(st) {
    const reached = T.map((t) => st.count > 0 && st.total >= t.cents);
    const shipFree = reached[0] || (st.count > 0 && st.shipCode);
    const next = T.find((t, i) => !reached[i] && !(i === 0 && shipFree));
    return { reached, shipFree, next, total: st.total, empty: !st.count, gap: next ? next.cents - st.total : 0, p: Math.max(0, Math.min(1, st.total / MAX)), level: reached.filter(Boolean).length };
  }

  let S = null;
  // Pixel-Mönch je Stufe: leer (Karton), sucht (Lupe), ab 99 € Skizze, ab 149 € am Laser, ab 199 € Kaffeepause
  const monk = (v) => (v.empty ? 'karton' : ['lupe', 'skizze', 'laser', 'kaffee'][v.level]);

  // Schiene mit Stationen und Mönch; mode: bar (Kopfleiste), mini und big (Warenkorb: Stationen oben, Mönch läuft darunter auf eigenem Pfad)
  function railHTML(v, mode, p) {
    const big = mode === 'big';
    const pos = (x) => ' style="--p:' + x.toFixed(4) + '"';
    let h = '<span class="smr-track"><span class="smr-fill"' + pos(p) + '></span></span>';
    T.forEach((t, i) => {
      const f = t.cents / MAX, done = i === 0 ? v.shipFree : v.reached[i], cls = done ? ' is-done' : '';
      if (mode === 'p') {
        h += '<span class="smr-node smr-node--' + (i + 1) + cls + '"' + pos(f) + '><img src="' + C.img.icons[i] + '" alt="" width="17" height="17"></span>' +
          '<small class="smr-lbl' + cls + '"' + pos(f) + '>' + (i === 0 && done && !v.reached[0] ? 'Code' : amt(t.cents)) + '</small>';
      } else if (big) {
        h += '<span class="smr-node smr-node--big' + cls + '"' + pos(f) + '><img src="' + t.img + '" alt="" decoding="async"><i class="smr-badge">' + svg(done ? 'check' : 'lock') + '</i></span>' +
          '<span class="smr-dot' + cls + '"' + pos(f) + '></span>' +
          '<small class="smr-lbl' + cls + '"' + pos(f) + '>' + (i === 0 && done && !v.reached[0] ? 'Code' : amt(t.cents)) + '</small>';
      } else {
        h += '<span class="smr-node smr-node--' + (i + 1) + cls + '"' + pos(f) + '><img src="' + C.img.icons[i] + '" alt="" width="16" height="16"></span>' + (mode === 'mini' ? '<span class="smr-dot' + cls + '"' + pos(f) + '></span>' : '');
      }
    });
    return h + '<img class="smr-monk smr-monk--' + monk(v) + '" src="' + C.img.monks[monk(v)] + '" alt="" decoding="async"' + pos(p) + '>';
  }
  // Neu zeichnen, dann läuft der Mönch von der alten zur neuen Stelle
  function monkFrac(v, box) {
    const W = Math.max(120, box.clientWidth - 32), g = 26 / W, f = T.map((t) => t.cents / MAX), t = v.empty ? 0 : v.total;
    const seg = (a, b, x0, x1) => x0 + (x1 - x0) * Math.max(0, Math.min(1, (t - a) / (b - a)));
    if (t <= 0) return 0;
    if (t < T[0].cents) return seg(0, T[0].cents, 0, f[0] - g);
    if (t < T[1].cents) return seg(T[0].cents, T[1].cents, f[0] + g, f[1] - g);
    if (t < T[2].cents) return seg(T[1].cents, T[2].cents, f[1] + g, f[2] - g);
    return f[2] - g;
  }
  function paintRail(box, v, mode) {
    const key = mode === 'bar' ? 'smrPh' : 'smrPb', old = box.querySelector('.smr-monk');
    let from = old ? parseFloat(old.style.getPropertyValue('--p')) : parseFloat(SS.get(key));
    if (isNaN(from)) from = mode === 'bar' ? v.p : 0;
    box.innerHTML = railHTML(v, mode, from);
    const to = mode === 'p' ? monkFrac(v, box) : v.p;
    v = Object.assign({}, v, { p: to });
    SS.set(key, String(v.p));
    if (Math.abs(from - v.p) < 0.002) return;
    const monk = box.querySelector('.smr-monk'), fill = box.querySelector('.smr-fill');
    void box.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      monk.style.setProperty('--p', v.p.toFixed(4)); fill.style.setProperty('--p', (mode === 'p' ? Math.max(0, Math.min(1, v.total / MAX)) : v.p).toFixed(4));
      if (!RM) { monk.classList.add('is-walking'); setTimeout(() => monk.classList.remove('is-walking'), 1000); }
    }));
  }

  // Kopfleiste
  function paintBar(st) {
    const bar = document.querySelector('[data-smr-bar]');
    if (!bar) return;
    const v = view(st), text = bar.querySelector('[data-smr-text]');
    let l, s;
    if (!st.count) {
      l = 'Gratisversand ab <b>' + amt(T[0].cents) + '</b> · 10 € Rabatt ab <b>' + amt(T[1].cents) + '</b> · Mystery Gift ab <b>' + amt(T[2].cents) + '</b>';
      s = 'Gratisversand ab <b>' + amt(T[0].cents) + '</b>';
    } else if (v.next) {
      s = 'Noch <b>' + money(v.gap) + '</b> ' + v.next.m;
      l = (v.shipFree ? '<span class="smr-ok">' + svg('check') + (v.reached[0] ? 'Versand kostenlos' : 'Versand mit Code kostenlos') + '</span> ' : '') + 'Noch <b>' + money(v.gap) + '</b> ' + v.next.short;
    } else {
      l = '<span class="smr-ok">' + svg('check') + 'Alles freigeschaltet:</span> Gratisversand, 10 € Rabatt und Mystery Gift';
      s = '<span class="smr-ok">' + svg('check') + 'Alle Belohnungen freigeschaltet</span>';
    }
    text.innerHTML = '<span class="smr-l">' + l + '</span><span class="smr-s">' + s + '</span>';
    bar.classList.toggle('is-empty', !st.count);
    bar.setAttribute('aria-label', text.querySelector('.smr-l').textContent + '. Warenkorb öffnen');
    paintRail(bar.querySelector('[data-smr-rail]'), v, 'bar');
  }

  // Desktop-Zeitstrahl über die volle Breite: der Mönch läuft bei jedem Seitenaufruf vom linken Rand los wie bisher,
  // an den Kreisen ist er genau bei 99, 149 und 199 €, danach geht es bis 95 % der Breite weiter
  const strip = document.querySelector('[data-smr-strip]');
  let stripX = null, stripTotal = null;
  function stripGeom() {
    const line = strip.querySelector('.milestones__timeline'), L = line.getBoundingClientRect().left, W = line.clientWidth;
    return { W, cs: [...strip.querySelectorAll('[data-smr-pt]')].map((p) => { const r = p.getBoundingClientRect(); return r.left + r.width / 2 - L; }) };
  }
  function stripPos(total, g) {
    // Zwischen den Kreisen bleibt er stehen, nicht dahinter (Abstand d): ab 99 € rechts neben dem ersten Kreis usw.
    const d = 40, c = g.cs, seg = (a, b, x0, x1) => x0 + (x1 - x0) * Math.max(0, Math.min(1, (total - a) / (b - a)));
    if (total <= 0) return 22;
    if (total < T[0].cents) return seg(0, T[0].cents, 22, c[0] - d);
    if (total < T[1].cents) return seg(T[0].cents, T[1].cents, c[0] + d, c[1] - d);
    if (total < T[2].cents) return seg(T[1].cents, T[2].cents, c[1] + d, c[2] - d);
    return seg(T[2].cents, Math.round(T[2].cents * 1.5), c[2] + d, g.W * 0.95);
  }
  function paintStrip(st, instant) {
    if (!strip || !strip.offsetParent) return;
    const v = view(st), g = stripGeom(), x = stripPos(st.count ? st.total : 0, g);
    const m = strip.querySelector('[data-smr-monk]'), fill = strip.querySelector('[data-smr-fill]'), k = monk(v);
    if (m.dataset.k !== k) { m.src = C.img.monks[k]; m.dataset.k = k; }
    strip.querySelectorAll('[data-smr-pt]').forEach((p) => {
      const i = +p.dataset.smrPt, t = T[i], done = i === 0 ? v.shipFree : v.reached[i];
      const txt = done ? (i === 0 && !v.reached[0] ? 'Versand mit Deinem Code kostenlos' : t.done + '!')
        : st.count ? 'Noch ' + money(t.cents - st.total) + ' ' + t.short : ['Gratisversand', '10 € Rabatt', 'Mystery Gift'][i] + ' ab ' + amt(t.cents);
      p.classList.toggle('is-done', done);
      p.querySelector('[data-smr-tip]').textContent = txt;
      p.setAttribute('aria-label', txt);
    });
    const from = stripX === null ? 0 : stripX, dist = Math.abs(x - from);
    const dur = RM || instant ? 0 : Math.min(8, Math.max(0.6, 8 * dist / g.W));
    [m, fill].forEach((el) => { el.style.transitionDuration = dur + 's'; });
    if (stripX === null) { m.style.left = '0px'; fill.style.width = '0px'; void m.offsetWidth; }
    requestAnimationFrame(() => { m.style.left = x + 'px'; fill.style.width = x + 'px'; });
    if (dur && dist > 2) { m.classList.add('is-walking'); clearTimeout(m._w); m._w = setTimeout(() => m.classList.remove('is-walking'), dur * 1000); }
    stripX = x;
    // Text zur nächsten Stufe kurz zeigen: nach einer Warenkorb-Änderung und einmal je Sitzung nach dem Laufen
    const changed = stripTotal !== null && S && st.total !== stripTotal;
    if (S) stripTotal = st.total;
    if (v.next && st.count && (changed || (S && !SS.get('smrRemind')))) {
      SS.set('smrRemind', '1');
      const p = strip.querySelector('[data-smr-pt="' + T.indexOf(v.next) + '"]');
      clearTimeout(strip._r);
      strip._r = setTimeout(() => { p.classList.add('is-remind'); setTimeout(() => p.classList.remove('is-remind'), 4500); }, changed ? 400 : Math.max(1500, dur * 1000));
    }
  }
  if (strip) {
    let rz = 0;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S) { stripX = null; paintStrip(S, true); } }, 200); });
  }

  // Passt dazu: kleine Artikel ohne Personalisierung, die die Lücke zur nächsten Stufe schließen
  function addons(st, v) {
    const pids = new Set(st.items.map((i) => i.product_id));
    const hasSign = st.items.some((i) => SIGN.test(i.product_type || '') && !NOSIGN.test(i.product_type || ''));
    const hasMount = st.items.some((i) => /befestigungsset/i.test(i.product_type || '') || Object.keys(i.properties || {}).some((k) => /befestig/i.test(k + ' ' + i.properties[k]) && !/nein|ohne/i.test(String(i.properties[k]))));
    const retter = st.items.some((i) => /feuerwehr|thw|retter|rettung/i.test((i.product_type || '') + ' ' + (i.product_title || '')));
    let list = C.addons.filter((a) => !pids.has(a.pid) && (a.rule === 'mount' ? hasSign && !hasMount : a.rule === 'retter' ? retter : true));
    const small = v.next && v.gap <= C.gapMax * 100 * rate;
    if (!small) list = list.filter((a) => a.rule === 'mount');
    const g = v.next ? v.gap : 0;
    list.sort((a, b) => (a.rule === 'mount') !== (b.rule === 'mount') ? (a.rule === 'mount' ? -1 : 1)
      : (a.price >= g) !== (b.price >= g) ? (a.price >= g ? -1 : 1) : a.price >= g ? a.price - b.price : b.price - a.price);
    return list;
  }
  function addonsHTML(st, v, max) {
    const list = addons(st, v).slice(0, max);
    if (!list.length) return '';
    const closes = v.next && list.every((a) => a.price >= v.gap);
    return '<div class="smr-gap"><p class="smr-gap__h">' + (closes ? 'Damit ' + v.next.lead.replace(/^dann /, '') + ':' : 'Passt dazu') + '</p>' +
      list.map((a) => '<div class="smr-add"><img src="' + esc(a.img) + '" alt="" width="44" height="44" loading="lazy"><span class="smr-add__t"><b>' + esc(a.title) + '</b><small>' + esc(a.sub) + '</small></span>' +
        '<button type="button" class="smr-add__b" data-smr-add="' + a.id + '" data-smr-key="' + esc(a.key) + '" aria-label="' + esc(a.title) + ' für ' + money(a.price) + ' hinzufügen">+ ' + money(a.price) + '</button></div>').join('') + '</div>';
  }

  // Panel im Warenkorb (Drawer und Seite /cart) wie im Prototyp; Liquid liefert frische Summe und Anzahl als Attribute
  let panelLevel = null;
  function tilesHTML(v) {
    return '<div class="smr-tiles">' + T.map((t, i) => {
      const on = i === 0 ? v.shipFree : v.reached[i], code = i === 0 && on && !v.reached[0];
      const pop = on && panelLevel !== null && i >= panelLevel && i < v.level;
      return '<div class="smr-tile' + (on ? ' is-on' : '') + (pop ? ' is-pop' : '') + '"><span class="smr-tile__img' + (i === 0 ? ' smr-tile__img--px' : '') + '"><img src="' + t.tile + '" alt="" loading="lazy"></span>' +
        '<i class="smr-tile__lock">' + svg(on ? 'check' : 'lock') + '</i><b>' + t.title + '</b><span>' + (on ? (code ? 'mit Deinem Code' : t.on) : 'ab ' + amt(t.cents)) + '</span></div>';
    }).join('') + '</div>';
  }
  function upsellHTML(st, v) {
    const a = addons(st, v).filter((x) => x.key !== 'bag')[0];
    if (!a) return '';
    const closes = v.next && a.price >= v.gap;
    const px = a.rule === 'mount' ? C.img.luisLadder : C.img.duoPin;
    return '<div class="smc-up"><img class="px" src="' + px + '" alt="" loading="lazy"><img class="ph" src="' + esc(a.img) + '" alt="" loading="lazy">' +
      '<span><b>' + esc(a.title) + '</b><small>' + esc(a.pitch || a.sub) + '</small>' + (closes ? '<small class="go">Damit ' + v.next.lead.replace(/^dann /, '') + '.</small>' : '') + '</span>' +
      '<button type="button" class="smc-pill" data-smr-add="' + a.id + '" data-smr-key="' + esc(a.key) + '" aria-label="' + esc(a.title) + ' für ' + money(a.price) + ' hinzufügen">+ ' + money(a.price) + '</button></div>';
  }
  function paintPanel(p) {
    const dt = parseInt(p.dataset.total, 10), dc = parseInt(p.dataset.count, 10);
    let st = S ? Object.assign({}, S) : { total: 0, count: 0, items: [], shipCode: false };
    // Dawn hat schon neu gerendert, der Abgleich läuft noch: ohne Vorschläge zeichnen, sonst steht kurz ein gerade gekaufter Artikel drin
    const fresh = !!S && (isNaN(dt) || dt === S.total) && (isNaN(dc) || dc === S.count);
    if (!isNaN(dt)) st.total = dt;
    if (!isNaN(dc)) st.count = dc;
    const host = p.closest('cart-drawer') || p.closest('cart-items'), up = host ? host.querySelector('[data-smr-upsell]') : null;
    if (!st.count) { p.hidden = true; p.innerHTML = ''; if (up) { up.hidden = true; up.innerHTML = ''; } return; }
    const v = view(st);
    p.innerHTML = '<div class="smr-card smr-card--p">' +
      '<p class="smr-lead">' + (v.next ? 'Noch <b>' + money(v.gap) + '</b> bis <b>' + v.next.label + '</b>' : '<b>Alle Belohnungen freigeschaltet!</b>') + '</p>' +
      '<div class="smr-rail smr-rail--p" aria-hidden="true"></div>' + tilesHTML(v) +
      (!up && fresh ? upsellHTML(st, v) : '') + '</div>';
    panelLevel = v.level;
    p.hidden = false;
    paintRail(p.querySelector('.smr-rail'), v, 'p');
    if (up) { const h = fresh ? upsellHTML(st, v) : ''; if (h || fresh) { up.innerHTML = h; up.hidden = !h; } }
    const open = p.closest('cart-drawer') ? p.closest('cart-drawer').classList.contains('active') : true;
    if (open) (up || p).querySelectorAll('[data-smr-key]').forEach((b) => once('gv_' + b.dataset.smrKey, () => push('sm_gapfill_view', { sm_item: b.dataset.smrKey, sm_gap: v.gap / 100 })));
  }
  const once = (k, fn) => { if (SS.get('smrE_' + k)) return; SS.set('smrE_' + k, '1'); fn(); };

  // Versandhinweis im Warenkorb-Fuß kennt den Newsletter-Code nicht (Liquid sieht keine Versandcodes)
  function paintNotes() {
    if (!S || !S.shipCode || view(S).reached[0]) return;
    document.querySelectorAll('.cart-freeship-confirm--open').forEach((n) => { n.classList.remove('cart-freeship-confirm--open'); n.innerHTML = '&#10003; Versand mit Deinem Code kostenlos'; });
    document.querySelectorAll('[data-smc-ship]:not([data-free])').forEach((n) => { n.setAttribute('data-free', ''); n.innerHTML = '<span>Versand</span><span class="smc-ok">kostenlos mit Code</span>'; });
  }
  function mountAll() {
    document.querySelectorAll('[data-smr-panel]').forEach((p) => { if (p.dataset.smrOn !== (S ? 's' : 'l')) { p.dataset.smrOn = S ? 's' : 'l'; paintPanel(p); } });
    paintNotes();
    document.querySelectorAll('[data-smc-xs]:not([data-on])').forEach((b) => { b.dataset.on = '1'; paintXS(b); });
  }
  // Die Personalisierungs-App (pplr) schreibt cart.item_count in die Zahl am Warenkorb-Symbol, also mit Markern; hier korrigieren
  let bubbleFixes = 0;
  function fixBubble() {
    if (!S || !S.count || S.count > 99) return;
    const sp = document.querySelector('#cart-icon-bubble .cart-count-bubble span[aria-hidden]');
    if (sp && sp.textContent.trim() !== String(S.count)) sp.textContent = String(S.count);
  }
  const bubbleEl = document.getElementById('cart-icon-bubble');
  if (bubbleEl) new MutationObserver(() => { if (bubbleFixes++ < 20) fixBubble(); }).observe(bubbleEl, { childList: true, subtree: true, characterData: true });
  function renderAll() {
    bubbleFixes = 0; fixBubble();
    // Mobile Kassen-Leiste auf /cart (Dawn-Abschnitt, wird nach Änderungen nicht neu gerendert)
    const sv = document.querySelector('.cart-sticky-checkout__value');
    if (sv && S) sv.textContent = money(S.cart.total_price);
    if (S) { paintBar(S); paintStrip(S); }
    document.querySelectorAll('[data-smr-panel]').forEach((p) => { p.dataset.smrOn = 's'; paintPanel(p); });
    paintNotes();
  }

  // Freischalt-Moment: Hinweis und Pixel-Konfetti, nur wenn eine Stufe in dieser Sitzung neu erreicht wird
  function celebrate(st) {
    const v = view(st), prev = SS.get('smrLvl');
    SS.set('smrLvl', String(v.level));
    if (prev === null || v.level <= +prev) return;
    for (let i = +prev; i < v.level; i++) push('sm_reward_reached', { sm_reward: T[i].id, sm_cart_value: st.total / 100 });
    const t = T[v.level - 1];
    const d = document.createElement('div');
    d.className = 'smr-toast'; d.setAttribute('role', 'status');
    d.innerHTML = '<img src="' + t.img + '" alt=""><span><b>' + t.toast + '</b><small>' + t.hint + '</small></span>';
    document.body.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('in')));
    setTimeout(() => { d.classList.remove('in'); setTimeout(() => d.remove(), 400); }, 3800);
    if (RM) return;
    const drawer = document.querySelector('cart-drawer.active');
    const o = (drawer && drawer.querySelector('.smr-card')) || document.querySelector('.cart__items .smr-card') || document.querySelector('[data-smr-bar]');
    const r = o ? o.getBoundingClientRect() : { left: innerWidth / 2 - 120, width: 240, top: 90, height: 0 };
    const box = document.createElement('div');
    box.className = 'smr-confetti'; box.setAttribute('aria-hidden', 'true');
    const cols = ['#0044cc', '#6f9bff', '#f5ae2e', '#ff6b1f', '#eef0f2', '#1c7f47'];
    for (let i = 0; i < 44; i++) {
      const s = document.createElement('i'), z = [4, 6, 8][i % 3];
      s.style.cssText = 'left:' + (r.left + r.width * Math.random()) + 'px;top:' + (r.top + Math.min(r.height, 120) * 0.5) + 'px;width:' + z + 'px;height:' + z + 'px;background:' + cols[i % cols.length];
      box.appendChild(s);
      const dx = (Math.random() * 2 - 1) * 130, up = -(40 + Math.random() * 100), down = 180 + Math.random() * 240;
      s.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + dx * 0.5 + 'px,' + up + 'px)', opacity: 1, offset: 0.3 }, { transform: 'translate(' + dx + 'px,' + down + 'px) rotate(' + 90 * Math.ceil(Math.random() * 4) + 'deg)', opacity: 0 }],
        { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2200);
  }

  // Marker-Produkte (0 €) und Warenkorb-Attribut für das Mystery Gift an den Warenkorb anpassen
  async function getCart() {
    const r = await fetch(ROOT + 'cart.js', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!r.ok) throw new Error('cart ' + r.status);
    return r.json();
  }
  async function ensure(cart, st) {
    const adds = [], updates = {};
    T.forEach((t) => {
      const want = st.count > 0 && st.total >= t.cents, lines = cart.items.filter((i) => i.variant_id === t.marker);
      if (want && !lines.length) adds.push({ id: t.marker, quantity: 1 });
      lines.forEach((l, k) => { const q = want && k === 0 ? 1 : 0; if (l.quantity !== q) updates[l.key] = q; });
    });
    const attrs = cart.attributes || {}, want = st.count > 0 && st.total >= T[2].cents ? C.giftValue : '';
    const attrChange = (attrs[C.giftAttr] || '') !== want;
    let changed = false;
    if (Object.keys(updates).length || attrChange) {
      const body = { updates };
      if (attrChange) body.attributes = { [C.giftAttr]: want };
      changed = (await fetch(ROOT + 'cart/update.js', { method: 'POST', headers: JSONH, body: JSON.stringify(body) })).ok || changed;
    }
    if (adds.length) changed = (await fetch(ROOT + 'cart/add.js', { method: 'POST', headers: JSONH, body: JSON.stringify({ items: adds }) })).ok || changed;
    return changed;
  }
  // Nach Marker-Änderungen neu rendern, sonst stimmen Dawns Zeilennummern im Drawer nicht mehr
  function refreshViews() {
    const di = document.querySelector('cart-drawer-items');
    if (di && typeof di.onCartUpdate === 'function') di.onCartUpdate();
    const ci = document.querySelector('cart-items');
    if (ci && typeof ci.onCartUpdate === 'function') ci.onCartUpdate();
  }

  let running = null, queued = false;
  async function syncOnce() {
    let cart = await getCart(), st = derive(cart);
    if (await ensure(cart, st)) { cart = await getCart(); st = derive(cart); S = st; refreshViews(); }
    S = st;
    renderAll();
    celebrate(st);
  }
  function sync() {
    if (running) { queued = true; return running; }
    running = (async () => {
      try { do { queued = false; await syncOnce(); } while (queued); } catch (e) { /* Leiste bleibt beim letzten Stand */ } finally { running = null; }
    })();
    return running;
  }
  let t0 = 0;
  const soon = () => { clearTimeout(t0); t0 = setTimeout(sync, 120); };

  // Kasse erst nach dem Abgleich, damit Marker und Mystery-Gift-Attribut sicher in der Bestellung landen
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (!running || !f || !/^(CartDrawer-Form|cart)$/.test(f.id) || f.dataset.smrWait) return;
    e.preventDefault();
    f.dataset.smrWait = '1';
    const sub = e.submitter;
    Promise.race([running, new Promise((r) => setTimeout(r, 2500))]).then(() => { try { f.requestSubmit(sub || undefined); } catch (x) { f.submit(); } });
  }, true);

  // Passt dazu: hinzufügen, im Drawer direkt neu rendern
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-smr-add]');
    if (!b) return;
    e.preventDefault();
    if (b.disabled) return;
    b.disabled = true; b.classList.add('is-busy');
    const v = S ? view(S) : null, drawer = document.querySelector('cart-drawer'), inDrawer = !!(drawer && drawer.contains(b));
    try {
      const body = { items: [{ id: +b.dataset.smrAdd, quantity: 1 }] };
      if (inDrawer) { body.sections = 'cart-drawer,cart-icon-bubble'; body.sections_url = location.pathname; }
      const r = await fetch(ROOT + 'cart/add.js', { method: 'POST', headers: JSONH, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || j.status) throw new Error(j.description || r.status);
      push('sm_gapfill_add', { sm_item: b.dataset.smrKey, sm_gap: v ? v.gap / 100 : null, sm_next_reward: v && v.next ? v.next.id : null });
      if (inDrawer && typeof drawer.renderContents === 'function' && j.sections) drawer.renderContents(j);
      else { location.reload(); return; }
      soon();
    } catch (err) {
      b.disabled = false; b.classList.remove('is-busy'); b.textContent = 'Nicht verfügbar';
    }
  });

  // Änderungen unter den Artikeln (Geschenktüte, Nachricht) nicht an Dawn weitergeben: Dawn hält jede Änderung im Warenkorb für eine Mengenänderung
  document.addEventListener('change', async (e) => {
    if (!e.target.closest || !e.target.closest('.smc-extras')) return;
    e.stopPropagation();
    const c = e.target.closest('[data-smc-gift]');
    if (!c) return;
    const lab = c.closest('.smc-gift'), drawer = document.querySelector('cart-drawer'), on = c.checked;
    if (lab) lab.classList.add('is-busy');
    const sections = { sections: 'cart-drawer,cart-icon-bubble', sections_url: location.pathname };
    try {
      const r = on
        ? await fetch(ROOT + 'cart/add.js', { method: 'POST', headers: JSONH, body: JSON.stringify(Object.assign({ items: [{ id: +c.dataset.smcGift, quantity: 1 }] }, sections)) })
        : await fetch(ROOT + 'cart/change.js', { method: 'POST', headers: JSONH, body: JSON.stringify(Object.assign({ id: c.dataset.smcKey, quantity: 0 }, sections)) });
      const j = await r.json();
      if (!r.ok || j.status) throw new Error(j.description || r.status);
      push('sm_gift_wrap', { sm_on: on });
      if (drawer && drawer.contains(c) && typeof drawer.renderContents === 'function' && j.sections) drawer.renderContents(j); else { location.reload(); return; }
      soon();
    } catch (x) { c.checked = !on; if (lab) lab.classList.remove('is-busy'); }
  }, true);

  // Empfehlungen im Drawer: Shopify-Empfehlungen zum ersten Artikel, als Karten mit Link (personalisierte Produkte brauchen die Produktseite)
  const xsCache = {};
  const imgW = (u, w) => (u ? (u.indexOf('//') === 0 ? 'https:' + u : u) + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w : '');
  async function paintXS(box) {
    const pid = box.dataset.smcXs;
    if (!pid) return;
    if (!xsCache[pid]) {
      try { const r = await fetch(ROOT + 'recommendations/products.json?product_id=' + pid + '&limit=10&intent=related'); xsCache[pid] = ((await r.json()).products || []); } catch (e) { xsCache[pid] = []; }
    }
    const inCart = new Set((S ? S.items : []).map((i) => i.product_id));
    // Keine Hilfsprodukte des Personalisierers (Gravur-Aufpreise), keine Versand- oder Sonderanfertigungs-Posten
    const skip = /^(PPLR_HIDDEN_PRODUCT|Sonderanfertigung|Versand|Gravur|Befestigungsset)$/i;
    const cards = xsCache[pid].filter((p) => p.available && !inCart.has(p.id) && p.price >= 500 && p.featured_image && !skip.test(p.type || '') && !/gravur auf der|einseitige gravur|beidseitige gravur/i.test(p.title)).slice(0, 6);
    if (!cards.length) { box.hidden = true; return; }
    box.querySelector('.smc-xs__row').innerHTML = cards.map((p) => '<a class="smc-xs__card" href="' + esc(p.url) + '" data-smc-xs-card="' + p.id + '"><img src="' + esc(imgW(p.featured_image, 300)) + '" alt="" loading="lazy" width="136" height="136"><div><b>' + esc(p.title) + '</b><span>' + (p.price_varies ? 'ab ' : '') + money(p.price) + '</span><em>Ansehen</em></div></a>').join('');
    box.hidden = false;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-smc-xs-card]');
    if (a) push('sm_xsell_click', { sm_product_id: +a.dataset.smcXsCard });
  });

  // Kopfleiste und Zeitstrahl öffnen den Drawer
  document.addEventListener('click', (e) => {
    const bar = e.target.closest('[data-smr-bar], [data-smr-strip]');
    const drawer = document.querySelector('cart-drawer');
    if (!bar || !drawer || typeof drawer.open !== 'function' || /\/cart\/?$/.test(location.pathname)) return;
    e.preventDefault();
    drawer.open(bar);
  });

  // Neu gerenderte Panels (Dawn ersetzt Drawer-Inhalt und Warenkorb-Zeilen) sofort füllen
  const mo = new MutationObserver(mountAll);
  const watch = () => document.querySelectorAll('cart-drawer, cart-items, #main-cart-footer, .cart__footer').forEach((n) => {
    if (n.dataset.smrWatch) return;
    n.dataset.smrWatch = '1';
    mo.observe(n, { childList: true, subtree: true });
  });
  const drawerEl = document.querySelector('cart-drawer');
  if (drawerEl) new MutationObserver(() => {
    if (!drawerEl.classList.contains('active') || !S || !S.count) return;
    once('panel_view', () => push('sm_reward_panel_view', { sm_level: view(S).level, sm_cart_value: S.total / 100 }));
    drawerEl.querySelectorAll('[data-smr-key]').forEach((b) => once('gv_' + b.dataset.smrKey, () => push('sm_gapfill_view', { sm_item: b.dataset.smrKey, sm_gap: view(S).gap / 100 })));
  }).observe(drawerEl, { attributes: true, attributeFilter: ['class'] });

  window.SMR = { sync, state: () => S, view: () => (S ? view(S) : null) };

  // Start: sofort aus Liquid-Werten zeichnen, dann mit /cart.js abgleichen
  const bar = document.querySelector('[data-smr-bar]');
  if (bar) paintBar({ total: +bar.dataset.total || 0, count: +bar.dataset.count || 0, items: [], shipCode: false });
  if (strip) paintStrip({ total: +strip.dataset.total || 0, count: +strip.dataset.count || 0, items: [], shipCode: false });
  watch(); mountAll();
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') subscribe(PUB_SUB_EVENTS.cartUpdate, soon);
  document.addEventListener('sm:cart-changed', soon);
  addEventListener('pageshow', (e) => { if (e.persisted) soon(); });
  sync();
})();
