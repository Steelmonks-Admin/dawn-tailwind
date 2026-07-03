/**
 * SteelMonks — Zepto Personalizer → Cart-Drawer Sync (J.1f, 2026-07)
 *
 * Problem: Zepto (Product Personalizer) adds items via jQuery XHR under
 * "Stay on page" mode, but never re-renders the theme cart drawer. The
 * drawer keeps its server-rendered state from page load (often empty).
 *
 * Fix: intercept XMLHttpRequest calls to /cart/add. After the last add
 * settles (debounced, Zepto may fire several adds for add-ons), fetch the
 * cart-drawer + cart-icon-bubble sections fresh, swap them in, close the
 * Zepto modal and open the drawer.
 *
 * Scope: only XHR (jQuery/Zepto). The theme's own product-form uses fetch
 * and keeps rendering the drawer itself — no double handling.
 */
(function () {
  'use strict';

  var refreshTimer = null;

  function parseSection(html, selector) {
    try {
      return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function closeZeptoModal() {
    try {
      var modal = document.querySelector('.pplr_crop-modal, #pplr_myModal, .pplr_modal');
      if (modal && getComputedStyle(modal).display !== 'none') {
        var closeBtn = modal.querySelector('[class*="close"], [class*="Close"]');
        if (closeBtn) {
          closeBtn.click();
        } else {
          modal.style.display = 'none';
        }
      }
    } catch (e) { /* non-critical */ }
  }

  function refreshDrawer() {
    fetch('/?sections=cart-drawer,cart-icon-bubble')
      .then(function (res) { return res.json(); })
      .then(function (sections) {
        var drawerHost = document.querySelector('cart-drawer');
        var drawerInner = document.getElementById('CartDrawer');
        var freshHost = parseSection(sections['cart-drawer'], 'cart-drawer');
        var freshInner = parseSection(sections['cart-drawer'], '#CartDrawer');
        if (drawerInner && freshInner) drawerInner.innerHTML = freshInner.innerHTML;
        if (drawerHost && freshHost) {
          drawerHost.className = freshHost.className;
        }
        var bubble = document.getElementById('cart-icon-bubble');
        var freshBubbleRoot = parseSection(sections['cart-icon-bubble'], 'div.shopify-section, div');
        if (bubble && freshBubbleRoot) bubble.innerHTML = freshBubbleRoot.innerHTML;

        closeZeptoModal();
        if (drawerHost && typeof drawerHost.open === 'function') {
          drawerHost.open();
        }
      })
      .catch(function (e) { console.warn('[sm-drawer-sync]', e); });
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshDrawer, 600);
  }

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__smIsCartAdd = typeof url === 'string' && url.indexOf('/cart/add') !== -1;
    return origOpen.apply(this, arguments);
  };

  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this.__smIsCartAdd) {
      this.addEventListener('load', function () {
        if (this.status >= 200 && this.status < 300) scheduleRefresh();
      });
    }
    return origSend.apply(this, arguments);
  };
})();
