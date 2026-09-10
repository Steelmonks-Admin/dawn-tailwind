/**
 * Mengenstaffel-Widget (Anstecker und Baum-/Gartenstecker).
 *
 * Setzt nur die Stueckzahl im Warenkorbformular und rechnet die Ersparnis vor.
 * Der Rabatt selbst kommt aus den automatischen Shopify-Rabatten und zaehlt
 * produktuebergreifend ueber alle Artikel der jeweiligen Gruppe im Warenkorb.
 *
 * Stufen, Preise und alle Texte kommen aus data-Attributen des Snippets,
 * damit dieselbe Datei beide Gruppen bedient. Bei den Ansteckern haben
 * Set-Varianten einen eigenen Paketpreis und sind nicht in der Staffel; dort
 * schaltet das Widget die Prozente ab und tauscht die Texte.
 */
(function () {
  'use strict';

  /* Die Texte liefert das Snippet ueber data-Attribute, damit dasselbe Skript
     Anstecker und Baumstecker bedienen kann. */
  function txt(root, key, fallback) {
    return root.getAttribute('data-' + key) || fallback;
  }

  function euro(cents) {
    return (cents / 100).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '\u00A0€';
  }

  /* Die PDP traegt mehrere Warenkorb-Formulare (Empfehlungen, Sticky-Leiste).
     Deshalb strikt ueber die Form-ID des Hauptprodukts gehen. */
  function productForm(root) {
    var id = root && root.getAttribute('data-form-id');
    var byId = id && document.getElementById(id);
    if (byId) return byId;
    var host = root && root.closest('.product__info-container, .product');
    return (host && host.querySelector('form[action*="/cart/add"]:not(.installment)'))
      || document.querySelector('form[action*="/cart/add"]:not(.installment)')
      || document.querySelector('form[action*="/cart/add"]');
  }

  /* Der Zepto-Personalizer haengt auf personalisierbaren Ansteckern ein zweites
     verstecktes Mengenfeld (.prvw_custom_quantity_clone_Pro) in dasselbe Formular.
     /cart/add.js wertet das letzte aus - wer nur das erste setzt, verschickt die
     falsche Menge (Fund 10.09.2026: Kachel 4 geklickt, 1 Stueck im Warenkorb).
     Deshalb immer ALLE Mengenfelder schreiben. */
  function quantityFields(root) {
    var form = productForm(root);
    if (!form) return [];
    var all = [].slice.call(form.querySelectorAll('input[name="quantity"], select[name="quantity"]'));
    var foreign = all.filter(function (el) {
      return el.getAttribute('data-injected-by') !== 'pin-tiers';
    });
    if (foreign.length) {
      // Sobald das Theme oder eine App ein echtes Feld stellt, unser eigenes raus.
      all.filter(function (el) {
        return el.getAttribute('data-injected-by') === 'pin-tiers';
      }).forEach(function (el) { el.remove(); });
      return foreign;
    }
    if (all.length) return all;
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'quantity';
    input.value = '1';
    input.setAttribute('data-injected-by', 'pin-tiers');
    form.appendChild(input);
    return [input];
  }

  function selectedVariantId(root) {
    var form = productForm(root);
    var input = form && form.querySelector('input[name="id"], select[name="id"]');
    return input ? String(input.value || '') : '';
  }

  function isEligible(root) {
    if (root.getAttribute('data-all-eligible') === '1') return true;
    var ids = (root.getAttribute('data-eligible-ids') || '').split(',').filter(Boolean);
    if (!ids.length) return root.getAttribute('data-eligible') === '1';
    var current = selectedVariantId(root);
    if (!current) return root.getAttribute('data-eligible') === '1';
    return ids.indexOf(current) !== -1;
  }

  /* Die Sticky-Leiste haengt am body, nicht mehr im Widget. Beide Pill-Saetze
     muessen aber gemeinsam angesteuert werden. */
  function pills(root) {
    var list = [].slice.call(root.querySelectorAll('[data-pin-tier]'));
    if (root._stickyEl) {
      list = list.concat([].slice.call(root._stickyEl.querySelectorAll('[data-pin-tier]')));
    }
    return list;
  }

  function bestDiscount(root, qty) {
    var best = 0;
    pills(root).forEach(function (btn) {
      var q = parseInt(btn.getAttribute('data-qty'), 10);
      var d = parseFloat(btn.getAttribute('data-discount')) || 0;
      if (!isNaN(q) && qty >= q && d > best) best = d;
    });
    return best;
  }

  function render(root, qty) {
    if (!qty || qty < 1) qty = 1;
    var eligible = isEligible(root);
    root.setAttribute('data-eligible', eligible ? '1' : '0');

    pills(root).forEach(function (btn) {
      var exact = parseInt(btn.getAttribute('data-qty'), 10) === qty;
      btn.classList.toggle('pin-tiers__pill--active', exact);
      btn.setAttribute('aria-pressed', exact ? 'true' : 'false');
    });

    var free = root.querySelector('[data-pin-tiers-free]');
    if (free && document.activeElement !== free) {
      var onPill = !!root.querySelector('[data-pin-tier][data-qty="' + qty + '"]');
      free.value = onPill ? '' : String(qty);
    }

    var title = root.querySelector('.pin-tiers__title');
    if (title) title.textContent = eligible ? txt(root, 'title', '') : txt(root, 'title-set', '');
    var note = root.querySelector('[data-pin-tiers-note]');
    if (note) note.textContent = eligible ? txt(root, 'note', '') : txt(root, 'note-set', '');
    var hint = root.querySelector('[data-pin-tiers-hint]');
    if (hint) hint.textContent = eligible ? txt(root, 'hint', '') : txt(root, 'hint-set', '');

    var ziele = [root.querySelector('[data-pin-tiers-result]')];
    if (root._stickyEl) ziele.push(root._stickyEl.querySelector('[data-pin-tiers-sticky-result]'));
    ziele = ziele.filter(Boolean);
    if (!ziele.length) return;

    var unit = parseInt(root.getAttribute('data-unit-price'), 10);
    var html;
    if (!unit || isNaN(unit)) {
      html = qty + ' Stück';
    } else {
      var full = unit * qty;
      var discount = eligible ? bestDiscount(root, qty) : 0;
      var pays = Math.round(full * (1 - discount / 100));
      if (discount > 0) {
        html = '<b>' + qty + ' Stück: ' + euro(pays) + '</b> '
          + '<span class="pin-tiers__strike">' + euro(full) + '</span>'
          + '<span class="pin-tiers__save">' + euro(full - pays) + ' gespart</span>';
      } else {
        html = '<b>' + qty + ' Stück: ' + euro(full) + '</b>';
      }
    }
    ziele.forEach(function (el) { el.innerHTML = html; });
  }

  function readVariantPrice(root) {
    var form = productForm(root);
    var scope = (form && form.closest('.product, .product__info-container')) || document;
    var el = scope.querySelector('.price__regular .price-item--regular')
      || scope.querySelector('.price-item--sale')
      || scope.querySelector('.price-item--regular');
    if (!el) return;
    var raw = (el.textContent || '')
      .replace(/[^\d,.]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    var cents = Math.round(parseFloat(raw) * 100);
    if (!isNaN(cents) && cents > 0) root.setAttribute('data-unit-price', String(cents));
  }

  /* Die kompakte Leiste wandert an den body, weil position:fixed sonst an einem
     transformierten Vorfahren der Produktinfo haengen bleiben kann. Sichtbar ist
     sie immer dann, wenn das grosse Widget nicht im Bild steht, also auch direkt
     beim Aufruf der Seite. Ueber der theme-eigenen Produktleiste, nie darauf. */
  function setupSticky(root) {
    var sticky = root.querySelector('[data-pin-tiers-sticky]');
    if (!sticky) return;
    document.body.appendChild(sticky);
    root._stickyEl = sticky;

    function themeBarHeight() {
      var bar = document.querySelector('product-sticky-bar, .product__sticky-bar');
      if (!bar) return 0;
      var s = window.getComputedStyle(bar);
      if (s.display === 'none' || s.visibility === 'hidden') return 0;
      var r = bar.getBoundingClientRect();
      var sichtbar = window.innerHeight - r.top;
      return sichtbar > 0 ? Math.min(sichtbar, r.height) : 0;
    }

    /* Das schwebende Trusted-Shops-Siegel sitzt unten rechts und wuerde sonst
       die Preiszeile verdecken. Wir messen es und halten den Platz frei. */
    function badgeWidth() {
      var badge = document.querySelector('[id^="trustbadge-container-"]');
      if (!badge) return 0;
      var kandidaten = [badge].concat([].slice.call(badge.querySelectorAll('*')));
      var breiteste = 0;
      kandidaten.forEach(function (el) {
        var s = window.getComputedStyle(el);
        if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden') return;
        var r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 20) return;
        if (r.bottom < window.innerHeight - 220) return;
        var ragtRein = window.innerWidth - r.left;
        if (ragtRein > breiteste) breiteste = ragtRein;
      });
      /* Rueckgabe ist das komplette rechte Polster inklusive Sicherheitsabstand,
         nicht nur die Siegelbreite. Ohne Siegel das normale Polster. */
      return breiteste > 0 ? Math.ceil(breiteste) + 6 : 13;
    }

    var geplant = false;
    function platzieren() {
      geplant = false;
      sticky.style.setProperty('--pt-sticky-bottom', themeBarHeight() + 'px');
      sticky.style.setProperty('--pt-sticky-right', badgeWidth() + 'px');
    }
    function anstossen() {
      if (geplant) return;
      geplant = true;
      window.requestAnimationFrame(platzieren);
    }
    window.addEventListener('scroll', anstossen, { passive: true });
    window.addEventListener('resize', anstossen);
    platzieren();

    function zeigen(an) {
      if (window.matchMedia('(min-width: 750px)').matches) an = false;
      if (an) platzieren();
      sticky.hidden = !an;
    }

    if ('IntersectionObserver' in window) {
      /* Nicht isIntersecting abfragen: das ist schon bei einem sichtbaren Pixel
         wahr. Entscheidend ist, ob genug vom Widget im Bild steht. */
      new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) { zeigen(e.intersectionRatio < 0.35); });
      }, { threshold: [0, 0.2, 0.35, 0.5, 1] }).observe(root);
    } else {
      window.addEventListener('scroll', function () {
        var r = root.getBoundingClientRect();
        zeigen(r.bottom < 60 || r.top > window.innerHeight - 60);
      }, { passive: true });
    }
    zeigen(true);
  }


  /* ---------------------------------------------------------------------
     Sprung zur Motivauswahl. Aus der Sticky-Leiste heraus sieht man nur die
     Stueckzahl, nicht das Motiv. Der Knopf bringt einen zurueck zur Auswahl
     und hebt sie kurz hervor.
     --------------------------------------------------------------------- */
  function variantPicker(root) {
    var form = productForm(root);
    var scope = (form && form.closest('.product__info-container, .product')) || document;
    return scope.querySelector('variant-selects, variant-radios')
      || scope.querySelector('.product-form__input');
  }

  function setupJump(root) {
    var knopf = root._stickyEl && root._stickyEl.querySelector('[data-pin-tiers-jump]');
    if (!knopf) return;
    knopf.addEventListener('click', function () {
      var ziel = variantPicker(root);
      if (!ziel) return;
      ziel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ziel.classList.remove('pin-tiers-ziel-blitz');
      /* Reflow erzwingen, sonst startet die Animation beim zweiten Klick nicht neu. */
      void ziel.offsetWidth;
      ziel.classList.add('pin-tiers-ziel-blitz');
      setTimeout(function () { ziel.classList.remove('pin-tiers-ziel-blitz'); }, 1600);
      var erstes = ziel.querySelector('select, input[type="radio"], button');
      if (erstes && typeof erstes.focus === 'function') {
        setTimeout(function () { try { erstes.focus({ preventScroll: true }); } catch (e) {} }, 420);
      }
    });
  }

  /* ---------------------------------------------------------------------
     Mehrfach-Auswahl. Setzt Mengen je Motiv und legt alles mit einem
     einzigen /cart/add.js hinein. Das ist nur zulaessig, weil die betroffenen
     Produkte nicht personalisiert werden. Traegt der Warenkorb-Knopf einen
     Personalisierungs-Text, faellt der Bereich aus.
     --------------------------------------------------------------------- */
  function personalisiert(root) {
    var form = productForm(root);
    var btn = form && form.querySelector('.product-form__submit, [type="submit"]');
    var t = btn ? (btn.textContent || '') : '';
    return /ersonalisier/i.test(t);
  }

  function setupMulti(root) {
    var panel = root.querySelector('[data-pin-tiers-multi]');
    var toggle = root.querySelector('[data-pin-tiers-multi-toggle]');
    if (!panel || !toggle) return;

    if (personalisiert(root)) {
      toggle.remove();
      panel.remove();
      return;
    }

    var zeilen = [].slice.call(panel.querySelectorAll('[data-pin-multi-row]'));
    var summe = panel.querySelector('[data-pin-tiers-multi-sum]');
    var addBtn = panel.querySelector('[data-pin-tiers-multi-add]');
    var status = panel.querySelector('[data-pin-tiers-multi-status]');

    function auswahl() {
      var raus = [];
      zeilen.forEach(function (z) {
        var feld = z.querySelector('[data-pin-multi-qty]');
        var n = parseInt(feld.value, 10);
        if (isNaN(n) || n < 0) n = 0;
        if (n > 0) {
          raus.push({
            id: z.getAttribute('data-variant-id'),
            qty: n,
            preis: parseInt(z.getAttribute('data-variant-price'), 10) || 0
          });
        }
        if (n > 0) z.setAttribute('data-gewaehlt', ''); else z.removeAttribute('data-gewaehlt');
      });
      return raus;
    }

    function neuRechnen() {
      var gewaehlt = auswahl();
      var stueck = 0, voll = 0;
      gewaehlt.forEach(function (g) { stueck += g.qty; voll += g.qty * g.preis; });

      addBtn.disabled = stueck === 0;
      if (stueck === 0) {
        summe.textContent = 'Noch nichts gewählt';
        addBtn.textContent = 'In den Warenkorb legen';
        return;
      }

      var rabatt = bestDiscount(root, stueck);
      var zahlt = Math.round(voll * (1 - rabatt / 100));
      var wort = stueck === 1 ? 'Stück' : 'Stück';
      if (rabatt > 0) {
        summe.innerHTML = '<b>' + stueck + ' ' + wort + ': ' + euro(zahlt) + '</b> '
          + '<span class="pin-tiers__strike">' + euro(voll) + '</span>'
          + '<span class="pin-tiers__save">' + euro(voll - zahlt) + ' gespart</span>';
      } else {
        summe.innerHTML = '<b>' + stueck + ' ' + wort + ': ' + euro(voll) + '</b>';
      }
      addBtn.textContent = stueck + ' ' + wort + ' in den Warenkorb';
    }

    zeilen.forEach(function (z) {
      var feld = z.querySelector('[data-pin-multi-qty]');
      z.querySelector('[data-pin-multi-minus]').addEventListener('click', function () {
        feld.value = String(Math.max(0, (parseInt(feld.value, 10) || 0) - 1));
        neuRechnen();
      });
      z.querySelector('[data-pin-multi-plus]').addEventListener('click', function () {
        feld.value = String(Math.max(0, (parseInt(feld.value, 10) || 0) + 1));
        neuRechnen();
      });
      feld.addEventListener('input', neuRechnen);
    });

    toggle.addEventListener('click', function () {
      var offen = panel.hidden;
      panel.hidden = !offen;
      toggle.setAttribute('aria-expanded', offen ? 'true' : 'false');
      if (offen) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    addBtn.addEventListener('click', function () {
      var gewaehlt = auswahl();
      if (!gewaehlt.length) return;
      addBtn.disabled = true;
      var vorher = addBtn.textContent;
      addBtn.textContent = 'Wird hinzugefügt …';
      if (status) { status.hidden = true; status.removeAttribute('data-fehler'); }

      fetch('/cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: gewaehlt.map(function (g) { return { id: Number(g.id), quantity: g.qty }; })
        })
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.description || j.message || 'Fehler'); });
        return r.json();
      }).then(function () {
        /* Zum Warenkorb schicken statt am Drawer zu basteln: der Shop macht das
           auf Mobil ohnehin so, und der Rabatt ist dort sofort sichtbar. */
        window.location.href = '/cart';
      }).catch(function (e) {
        addBtn.disabled = false;
        addBtn.textContent = vorher;
        if (status) {
          status.textContent = 'Das hat nicht geklappt: ' + (e && e.message ? e.message : 'unbekannter Fehler');
          status.setAttribute('data-fehler', '');
          status.hidden = false;
        }
      });
    });

    neuRechnen();
  }

  function init(root) {
    if (root.hasAttribute('data-pin-tiers-ready')) return;
    root.setAttribute('data-pin-tiers-ready', '');
    root.dataset.qty = '1';

    /* Das Theme rendert das Produktformular bei Variantenwechseln neu. Eine einmal
       gemerkte Referenz auf das Mengenfeld zeigt danach ins Leere, deshalb wird die
       gewaehlte Menge im Widget gehalten und vor jedem Absenden frisch geschrieben. */
    function syncQty() {
      var qty = String(parseInt(root.dataset.qty, 10) || 1);
      quantityFields(root).forEach(function (el) {
        if (el.value === qty) return;
        el.value = qty;
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      });
    }

    function apply(qty) {
      if (!qty || qty < 1) qty = 1;
      root.dataset.qty = String(qty);
      syncQty();
      render(root, qty);
    }

    setupSticky(root);
    setupJump(root);
    setupMulti(root);

    pills(root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(parseInt(btn.getAttribute('data-qty'), 10) || 1);
      });
    });

    var free = root.querySelector('[data-pin-tiers-free]');
    if (free) {
      free.addEventListener('input', function () {
        var q = parseInt(free.value, 10);
        if (!isNaN(q) && q >= 1) apply(q);
      });
    }

    // Capture-Phase am document: laeuft vor den Handlern des Themes und vor Zepto.
    document.addEventListener('submit', function (e) {
      if (e.target === productForm(root)) syncQty();
    }, true);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('.product-form__submit, [type="submit"], .pplr_add_to_cart')) syncQty();
    }, true);

    // Variantenwechsel: Preis und Rabattfaehigkeit neu einlesen, Menge nachziehen.
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.closest || t === free) return;
      if (t.getAttribute && t.getAttribute('name') === 'quantity') {
        var manual = parseInt(t.value, 10);
        if (!isNaN(manual) && manual >= 1 && String(manual) !== root.dataset.qty) {
          root.dataset.qty = String(manual);
          render(root, manual);
        }
        return;
      }
      if (!t.closest('variant-selects, variant-radios, form[action*="/cart/add"]')) return;
      setTimeout(function () {
        readVariantPrice(root);
        syncQty();
        render(root, parseInt(root.dataset.qty, 10) || 1);
      }, 300);
    });

    readVariantPrice(root);
    syncQty();
    render(root, 1);
  }

  function boot() {
    document.querySelectorAll('[data-pin-tiers]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', boot);
})();
