/**
 * Zunft Quantity Tiers — inline quantity setter.
 * Pills + free-input set the cart-form's quantity field.
 * Add-to-cart is handled by the existing main "In den Warenkorb" button.
 * Discounts apply via Shopify-native automatic discount rules at checkout.
 */
(function () {
  'use strict';

  function findQtyInput() {
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
    const form = document.querySelector('form[action*="/cart/add"]:not(.installment)')
              || document.querySelector('form[action*="/cart/add"]');
    if (!form) return null;
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'quantity';
    input.value = '1';
    input.setAttribute('data-injected-by', 'zunft-tiers');
    form.appendChild(input);
    return input;
  }

  function setQty(qty) {
    const input = ensureQtyInput();
    if (!input) return false;
    input.value = String(qty);
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    return true;
  }

  function findDiscountForQty(root, qty) {
    let best = 0;
    root.querySelectorAll('[data-zunft-tier-button]').forEach((btn) => {
      const tq = parseInt(btn.dataset.tierQty, 10);
      const td = parseInt(btn.dataset.tierDiscount, 10) || 0;
      if (!isNaN(tq) && qty >= tq && td > best) best = td;
    });
    return best;
  }

  function setActive(root, activeBtn, activeFree) {
    root.querySelectorAll('[data-zunft-tier-button]').forEach((b) => {
      b.classList.toggle('zunft-tiers__pill--active', b === activeBtn);
      b.setAttribute('aria-pressed', b === activeBtn ? 'true' : 'false');
    });
    const free = root.querySelector('[data-zunft-tier-free]');
    if (free) free.classList.toggle('is-active', activeFree === true);
  }

  function showStatus(root, qty) {
    const el = root.querySelector('[data-zunft-tiers-status]');
    if (!el) return;
    const d = findDiscountForQty(root, qty);
    const msg = d > 0
      ? qty + ' Stück ausgewählt · ' + d + '% Rabatt im Warenkorb'
      : qty + ' Stück ausgewählt';
    el.hidden = false;
    el.textContent = msg;
    el.classList.add('zunft-tiers__status--ok');
    el.classList.remove('zunft-tiers__status--error');
  }

  function onPillClick(root, btn) {
    const qty = parseInt(btn.dataset.tierQty, 10);
    if (!qty || qty < 1) return;
    if (!setQty(qty)) return;
    setActive(root, btn, false);
    const free = root.querySelector('[data-zunft-tier-free]');
    if (free) free.value = '';
    showStatus(root, qty);
  }

  function onFreeInput(root, input) {
    const v = parseInt((input.value || '').trim(), 10);
    if (!v || v < 1) {
      // empty / invalid — fall back to qty 1 in form, don't visually activate
      setQty(1);
      setActive(root, root.querySelector('[data-zunft-tier-button][data-tier-qty="1"]'), false);
      return;
    }
    // Match-or-activate-free: if v equals a preset qty, highlight that pill instead
    let match = null;
    root.querySelectorAll('[data-zunft-tier-button]').forEach((btn) => {
      if (parseInt(btn.dataset.tierQty, 10) === v) match = btn;
    });
    setQty(v);
    if (match) {
      setActive(root, match, false);
      input.value = '';
    } else {
      setActive(root, null, true);
    }
    showStatus(root, v);
  }

  function init() {
    document.querySelectorAll('[data-zunft-tiers]').forEach((root) => {
      if (root.dataset.zunftTiersBound === '1') return;
      root.dataset.zunftTiersBound = '1';
      root.querySelectorAll('[data-zunft-tier-button]').forEach((btn) => {
        btn.addEventListener('click', (e) => { e.preventDefault(); onPillClick(root, btn); });
      });
      const free = root.querySelector('[data-zunft-tier-free]');
      if (free) {
        free.addEventListener('input', () => onFreeInput(root, free));
        free.addEventListener('change', () => onFreeInput(root, free));
      }
      // Mark qty 1 active by default to mirror initial form state.
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
