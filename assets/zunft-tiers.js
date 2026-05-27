/* cache-bust 2026-05-27 16:47:57 UTC */
/**
 * Zunft Quantity Tiers — vanilla JS.
 * Reads variant_id from the live PDP <input name="id"> at click time.
 * NO fallback to first-available variant (cf. audit-11 RCA).
 */
(function () {
  'use strict';
  const ROOT = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  const ADD_URL = ROOT.replace(/\/$/, '') + '/cart/add.js';

  function readVariantId() {
    // Strategy 1: URL ?variant= param (most reliable across themes, works in Customizer preview).
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('variant');
      if (fromUrl && /^\d+$/.test(fromUrl)) {
        console.debug('[zunft-tiers] variant_id from URL:', fromUrl);
        return fromUrl;
      }
    } catch (e) {}

    // Strategy 2: hidden <input name="id"> in any cart-add form.
    // Customizer preview may set disabled=true → we now accept disabled inputs too.
    const sels = [
      'product-form form[action*="/cart/add"] input[name="id"]',
      'form[action*="/cart/add"] input[name="id"]',
      'form[action$="/cart/add"] input[name="id"]',
    ];
    for (const s of sels) {
      for (const n of document.querySelectorAll(s)) {
        const v = (n.value || '').trim();
        if (v && /^\d+$/.test(v)) {
          if (n.disabled) console.debug('[zunft-tiers] variant_id from disabled input:', v);
          else console.debug('[zunft-tiers] variant_id from input:', v, 'via', s);
          return v;
        }
      }
    }

    // Strategy 3: <select name='id'> fallback (some themes use a select instead of radios).
    for (const sel of document.querySelectorAll('select')) {
      if (sel.name === 'id' || /\[id\]$/.test(sel.name || '')) {
        const v = (sel.value || '').trim();
        if (v && /^\d+$/.test(v)) {
          console.debug('[zunft-tiers] variant_id from <select>:', v);
          return v;
        }
      }
    }

    console.warn('[zunft-tiers] could not read variant_id from URL, inputs, or selects');
    return null;
  }

  function cartEl() {
    return document.querySelector('cart-drawer') || document.querySelector('cart-notification');
  }

  function sectionsToFetch() {
    const c = cartEl();
    if (c && typeof c.getSectionsToRender === 'function') {
      try { return c.getSectionsToRender().map((s) => s.id); } catch (e) { return []; }
    }
    return [];
  }

  function showStatus(root, msg, isError) {
    const el = root.querySelector('[data-zunft-tiers-status]');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('zunft-tiers__status--error', !!isError);
    el.classList.toggle('zunft-tiers__status--ok', !isError);
  }

  function setLoading(btn, on) {
    const sp = btn.querySelector('.zunft-tiers__spinner');
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (sp) sp.hidden = !on;
  }

  async function addToCart(variantId, qty) {
    const sections = sectionsToFetch();
    const body = { items: [{ id: Number(variantId), quantity: Number(qty) }] };
    if (sections.length) { body.sections = sections; body.sections_url = window.location.pathname; }
    const res = await fetch(ADD_URL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status) {
      throw new Error(data.description || data.message || 'Hinzufügen fehlgeschlagen.');
    }
    return data;
  }

  function refreshCart(response) {
    const c = cartEl();
    if (c && typeof c.renderContents === 'function') {
      try { c.renderContents(response); return; } catch (e) { /* fall through */ }
    }
    if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS) {
      try { window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'zunft-tiers', cartData: response }); } catch (e) {}
    }
  }

  function onTierClick(root, btn) {
    const qty = parseInt(btn.dataset.tierQty, 10);
    const label = btn.dataset.tierLabel || (qty + ' Stk.');
    if (!qty || qty < 1) { showStatus(root, 'Ungültige Menge.', true); return; }
    const variantId = readVariantId();
    if (!variantId) {
      showStatus(root, 'Bitte wähle zuerst Deine Zunft (oben auf der Seite), dann erneut klicken.', true);
      return;
    }
    setLoading(btn, true);
    showStatus(root, label + ' wird hinzugefügt …', false);
    addToCart(variantId, qty)
      .then((response) => {
        showStatus(root, label + ' im Warenkorb. Rabatt wird automatisch verrechnet.', false);
        refreshCart(response);
        const c = cartEl();
        if (c && typeof c.open === 'function') { try { c.open(); } catch (_) {} }
      })
      .catch((err) => {
        const msg = (err && err.message) ? err.message : 'Hinzufügen fehlgeschlagen.';
        showStatus(root, msg, true);
        if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS) {
          try { window.publish(window.PUB_SUB_EVENTS.cartError, { source: 'zunft-tiers', productVariantId: variantId, message: msg }); } catch (_) {}
        }
      })
      .finally(() => setLoading(btn, false));
  }

  function init() {
    document.querySelectorAll('[data-zunft-tiers]').forEach((root) => {
      if (root.dataset.zunftTiersBound === '1') return;
      root.dataset.zunftTiersBound = '1';
      root.querySelectorAll('[data-zunft-tier-button]').forEach((btn) => {
        btn.addEventListener('click', () => onTierClick(root, btn));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
