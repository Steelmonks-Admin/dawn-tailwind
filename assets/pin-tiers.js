/**
 * Anstecker-Mengenstaffel.
 *
 * Setzt nur die Stueckzahl im Warenkorbformular und rechnet die Ersparnis vor.
 * Der Rabatt selbst kommt aus den automatischen Shopify-Rabatten und zaehlt
 * produktuebergreifend ueber alle Anstecker im Warenkorb.
 *
 * Set-Varianten haben einen eigenen Paketpreis und sind nicht in der Staffel;
 * fuer die schaltet das Widget die Prozente ab und passt den Hinweis an.
 */
(function () {
  'use strict';

  var HINT_DEFAULT =
    'Du kannst verschiedene Motive mischen, der Rabatt wird im Warenkorb automatisch abgezogen.';
  var HINT_SET =
    'Dieses Set hat bereits einen Paketpreis. Die Mengenstaffel gilt für einzelne Anstecker.';
  var NOTE_DEFAULT = 'Gilt für alle Anstecker zusammen';
  var NOTE_SET = 'Set mit festem Paketpreis';

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
    var ids = (root.getAttribute('data-eligible-ids') || '').split(',').filter(Boolean);
    if (!ids.length) return root.getAttribute('data-eligible') === '1';
    var current = selectedVariantId(root);
    if (!current) return root.getAttribute('data-eligible') === '1';
    return ids.indexOf(current) !== -1;
  }

  function bestDiscount(root, qty) {
    var best = 0;
    root.querySelectorAll('[data-pin-tier]').forEach(function (btn) {
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

    root.querySelectorAll('[data-pin-tier]').forEach(function (btn) {
      var exact = parseInt(btn.getAttribute('data-qty'), 10) === qty;
      btn.classList.toggle('pin-tiers__pill--active', exact);
      btn.setAttribute('aria-pressed', exact ? 'true' : 'false');
    });

    var free = root.querySelector('[data-pin-tiers-free]');
    if (free && document.activeElement !== free) {
      var onPill = !!root.querySelector('[data-pin-tier][data-qty="' + qty + '"]');
      free.value = onPill ? '' : String(qty);
    }

    var note = root.querySelector('[data-pin-tiers-note]');
    if (note) note.textContent = eligible ? NOTE_DEFAULT : NOTE_SET;
    var hint = root.querySelector('[data-pin-tiers-hint]');
    if (hint) hint.textContent = eligible ? HINT_DEFAULT : HINT_SET;

    var out = root.querySelector('[data-pin-tiers-result]');
    if (!out) return;
    var unit = parseInt(root.getAttribute('data-unit-price'), 10);
    if (!unit || isNaN(unit)) {
      out.textContent = qty + ' Stück';
      return;
    }
    var full = unit * qty;
    var discount = eligible ? bestDiscount(root, qty) : 0;
    var pays = Math.round(full * (1 - discount / 100));
    if (discount > 0) {
      out.innerHTML = '<b>' + qty + ' Stück: ' + euro(pays) + '</b> '
        + '<span class="pin-tiers__strike">' + euro(full) + '</span> '
        + '<span class="pin-tiers__save">· ' + euro(full - pays) + ' gespart</span>';
    } else {
      out.innerHTML = '<b>' + qty + ' Stück: ' + euro(full) + '</b>';
    }
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

    root.querySelectorAll('[data-pin-tier]').forEach(function (btn) {
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
