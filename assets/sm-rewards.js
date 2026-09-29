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
  ].map((t, i) => Object.assign(t, C.tiers[i], { cents: Math.round(C.tiers[i].at * 100 * rate) }));
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
    return { reached, shipFree, next, empty: !st.count, gap: next ? next.cents - st.total : 0, p: Math.max(0, Math.min(1, st.total / MAX)), level: reached.filter(Boolean).length };
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
      if (big) {
        h += '<span class="smr-node smr-node--big' + cls + '"' + pos(f) + '><img src="' + t.img + '" alt="" decoding="async"><i class="smr-badge">' + svg(done ? 'check' : 'lock') + '</i></span>' +
          '<span class="smr-dot' + cls + '"' + pos(f) + '></span>' +
          '<small class="smr-lbl' + cls + '"' + pos(f) + '>' + (i === 0 && done && !v.reached[0] ? 'Code' : amt(t.cents)) + '</small>';
      } else {
        h += '<span class="smr-node' + cls + '"' + pos(f) + '>' + svg(t.icon) + '</span>' + (mode === 'mini' ? '<span class="smr-dot' + cls + '"' + pos(f) + '></span>' : '');
      }
    });
    return h + '<img class="smr-monk smr-monk--' + monk(v) + '" src="' + C.img.monks[monk(v)] + '" alt="" decoding="async"' + pos(p) + '>';
  }
  // Neu zeichnen, dann läuft der Mönch von der alten zur neuen Stelle
  function paintRail(box, v, mode) {
    const key = mode === 'bar' ? 'smrPh' : 'smrPb', old = box.querySelector('.smr-monk');
    let from = old ? parseFloat(old.style.getPropertyValue('--p')) : parseFloat(SS.get(key));
    if (isNaN(from)) from = mode === 'bar' ? v.p : 0;
    box.innerHTML = railHTML(v, mode, from);
    SS.set(key, String(v.p));
    if (Math.abs(from - v.p) < 0.002) return;
    const monk = box.querySelector('.smr-monk'), fill = box.querySelector('.smr-fill');
    void box.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      monk.style.setProperty('--p', v.p.toFixed(4)); fill.style.setProperty('--p', v.p.toFixed(4));
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

  // Panel im Warenkorb (Drawer und Seite /cart); Liquid liefert frische Summe und Anzahl als Attribute
  function paintPanel(p) {
    const dt = parseInt(p.dataset.total, 10), dc = parseInt(p.dataset.count, 10);
    let st = S ? Object.assign({}, S) : { total: 0, count: 0, items: [], shipCode: false };
    // Dawn hat schon neu gerendert, der Abgleich läuft noch: ohne Vorschläge zeichnen, sonst steht kurz ein gerade gekaufter Artikel drin
    const fresh = !!S && (isNaN(dt) || dt === S.total) && (isNaN(dc) || dc === S.count);
    if (!isNaN(dt)) st.total = dt;
    if (!isNaN(dc)) st.count = dc;
    if (!st.count) { p.hidden = true; p.innerHTML = ''; return; }
    const v = view(st), chips = [];
    // Große Schiene mit Bildern nur mit genug Platz (Seite /cart, hohe Fenster); im Drawer auf dem Handy kompakt, damit die Artikel sichtbar bleiben
    const big = !p.closest('cart-drawer') || matchMedia('(min-width: 750px) and (min-height: 1000px)').matches;
    if (v.reached[0]) chips.push(T[0].done);
    else if (v.shipFree) chips.push('Versand mit Deinem Code kostenlos');
    if (v.reached[1]) chips.push(T[1].done);
    if (v.reached[2]) chips.push(T[2].done);
    p.innerHTML = '<div class="smr-card' + (big ? '' : ' smr-card--compact') + '">' +
      (big ? '<p class="smr-top"><span>Dein Belohnungspfad</span><span>' + v.level + ' von ' + T.length + ' freigeschaltet</span></p>' : '') +
      '<p class="smr-lead">' + (v.next ? 'Noch <b>' + money(v.gap) + '</b>, ' + v.next.lead + '.' : 'Alles freigeschaltet: <b>Gratisversand, 10 € Rabatt und Mystery Gift</b>.') + '</p>' +
      '<div class="smr-rail' + (big ? ' smr-rail--big' : ' smr-rail--mini') + '" aria-hidden="true"></div>' +
      (big && chips.length ? '<p class="smr-chips">' + chips.map((c) => '<span>' + svg('check') + c + '</span>').join('') + '</p>' : '') +
      (fresh ? addonsHTML(st, v, big ? 2 : 1) : '') + '</div>';
    p.hidden = false;
    paintRail(p.querySelector('.smr-rail'), v, big ? 'big' : 'mini');
    const open = p.closest('cart-drawer') ? p.closest('cart-drawer').classList.contains('active') : true;
    if (open) p.querySelectorAll('[data-smr-key]').forEach((b) => once('gv_' + b.dataset.smrKey, () => push('sm_gapfill_view', { sm_item: b.dataset.smrKey, sm_gap: v.gap / 100 })));
  }
  const once = (k, fn) => { if (SS.get('smrE_' + k)) return; SS.set('smrE_' + k, '1'); fn(); };

  // Versandhinweis im Warenkorb-Fuß kennt den Newsletter-Code nicht (Liquid sieht keine Versandcodes)
  function paintNotes() {
    if (!S || !S.shipCode || view(S).reached[0]) return;
    document.querySelectorAll('.cart-freeship-confirm--open').forEach((n) => { n.classList.remove('cart-freeship-confirm--open'); n.innerHTML = '&#10003; Versand mit Deinem Code kostenlos'; });
  }
  function mountAll() {
    document.querySelectorAll('[data-smr-panel]').forEach((p) => { if (p.dataset.smrOn !== (S ? 's' : 'l')) { p.dataset.smrOn = S ? 's' : 'l'; paintPanel(p); } });
    paintNotes();
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
    if (S) paintBar(S);
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

  // Kopfleiste öffnet den Drawer
  document.addEventListener('click', (e) => {
    const bar = e.target.closest('[data-smr-bar]');
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
  watch(); mountAll();
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') subscribe(PUB_SUB_EVENTS.cartUpdate, soon);
  document.addEventListener('sm:cart-changed', soon);
  addEventListener('pageshow', (e) => { if (e.persisted) soon(); });
  sync();
})();
