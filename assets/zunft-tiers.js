/**
 * Zunft Quantity Tiers — quantity-setter variant.
 * Pills set the cart-form's quantity input. The existing main "In den Warenkorb"
 * button handles add-to-cart with the correct variant (no /cart/add.js call here).
 * Discounts are applied by Shopify-native automatic discount rules at checkout.
 */
(function () {
  'use strict';

  function findQtyInput() {
    // Look in the main cart-add form (not the installment one).
    const candidates = [
      'form[action*="/cart/add"]:not(.installment) input[name="quantity"]',
      'form[action*="/cart/add"] input[name="quantity"]',
      'product-form input[name="quantity"]',
    ];
    for (const s of candidates) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function ensureQtyInput() {
    let input = findQtyInput();
    if (input) return input;
    // No native quantity input — inject a hidden one into the main cart-add form.
    const form = document.querySelector('form[action*="/cart/add"]:not(.installment)')
              || document.querySelector('form[action*="/cart/add"]');
    if (!form) return null;
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'quantity';
    input.value = '1';
    input.setAttribute('data-injected-by', 'zunft-tiers');
    form.appendChild(input);
    console.debug('[zunft-tiers] injected hidden quantity input into', form.id || '(unnamed form)');
    return input;
  }

  function setQty(qty) {
    const input = ensureQtyInput();
    if (!input) {
      console.warn('[zunft-tiers] no cart-add form found, cannot set quantity');
      return false;
    }
    input.value = String(qty);
    // Fire events so theme-level price calculators / quantity-selector UI updates.
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    console.debug('[zunft-tiers] quantity set to', qty);
    return true;
  }

  function setActivePill(root, btn) {
    root.querySelectorAll('[data-zunft-tier-button]').forEach((b) => {
      b.classList.toggle('zunft-tiers__pill--active', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
  }

  function showStatus(root, msg, isError) {
    const el = root.querySelector('[data-zunft-tiers-status]');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('zunft-tiers__status--error', !!isError);
    el.classList.toggle('zunft-tiers__status--ok', !isError);
  }

  function onPillClick(root, btn) {
    const qty = parseInt(btn.dataset.tierQty, 10);
    if (!qty || qty < 1) { showStatus(root, 'Ungültige Menge.', true); return; }
    const ok = setQty(qty);
    if (!ok) {
      showStatus(root, 'Konnte Stückzahl nicht setzen — bitte Seite neu laden.', true);
      return;
    }
    setActivePill(root, btn);
    const discount = parseInt(btn.dataset.tierDiscount || '0', 10);
    if (discount > 0) {
      showStatus(root, qty + ' Anstecker ausgewählt · ' + discount + '% Rabatt im Warenkorb', false);
    } else {
      showStatus(root, qty + ' Anstecker ausgewählt', false);
    }
  }

  function init() {
    document.querySelectorAll('[data-zunft-tiers]').forEach((root) => {
      if (root.dataset.zunftTiersBound === '1') return;
      root.dataset.zunftTiersBound = '1';
      root.querySelectorAll('[data-zunft-tier-button]').forEach((btn) => {
        btn.addEventListener('click', (e) => { e.preventDefault(); onPillClick(root, btn); });
      });
      // Mark tier 1 (qty=1) as active by default to mirror initial form state.
      const firstPill = root.querySelector('[data-zunft-tier-button][data-tier-qty="1"]')
                    || root.querySelector('[data-zunft-tier-button]');
      if (firstPill) firstPill.classList.add('zunft-tiers__pill--active');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
