/**
 * SteelMonks — Zepto Personalizer → Cart-Drawer Sync (J.1f, 2026-07)
 *
 * After a Zepto (jQuery/XHR) /cart/add succeeds: close the personalizer
 * modal, re-fetch the cart-drawer + cart-icon-bubble sections and open the
 * drawer. Retries when the freshly rendered drawer lags behind /cart.js
 * (Safari cache / propagation races). Only intercepts XHR — the theme's
 * own fetch-based product-form keeps handling itself.
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

  function applySections(sections) {
    var drawerHost = document.querySelector('cart-drawer');
    var drawerInner = document.getElementById('CartDrawer');
    var freshHost = parseSection(sections['cart-drawer'], 'cart-drawer');
    var freshInner = parseSection(sections['cart-drawer'], '#CartDrawer');
    if (drawerInner && freshInner) drawerInner.innerHTML = freshInner.innerHTML;
    if (drawerHost && freshHost) drawerHost.className = freshHost.className;
    var bubble = document.getElementById('cart-icon-bubble');
    var freshBubbleRoot = parseSection(sections['cart-icon-bubble'], 'div.shopify-section, div');
    if (bubble && freshBubbleRoot) bubble.innerHTML = freshBubbleRoot.innerHTML;
  }

  function refreshDrawer(attempt) {
    // Mobile: the drawer open/refresh path is flaky in iOS WebKit.
    // Send users to the (optimized) cart page instead - server-rendered, always correct.
    if (window.matchMedia('(max-width: 749px)').matches) {
      closeZeptoModal();
      window.location.href = '/cart';
      return;
    }
    attempt = attempt || 0;
    var bust = 'sm_ts=' + Date.now();
    Promise.all([
      fetch('/cart.js?' + bust, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.json(); }),
      fetch('/?sections=cart-drawer,cart-icon-bubble&' + bust, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.json(); })
    ]).then(function (results) {
      var cart = results[0];
      var sections = results[1];
      var freshInner = parseSection(sections['cart-drawer'], '#CartDrawer');
      var renderedItems = freshInner ? freshInner.querySelectorAll('.cart-item').length : 0;

      if (cart.item_count > 0 && renderedItems === 0 && attempt < 3) {
        setTimeout(function () { refreshDrawer(attempt + 1); }, 800);
        return;
      }

      applySections(sections);
      closeZeptoModal();
      var drawerHost = document.querySelector('cart-drawer');
      if (drawerHost && typeof drawerHost.open === 'function') drawerHost.open();
    }).catch(function (e) { console.warn('[sm-drawer-sync]', e); });
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { refreshDrawer(0); }, 600);
  }

  // eTrusted injects star widgets into cart items via script (forces 82px
  // height, CSS cannot win against its injected !important styles).
  // Cleanest fix pending app-config change: remove them on sight.
  function killCartItemRatings() {
    document.querySelectorAll('.cart-item__details etrusted-widget').forEach(function (el) {
      el.remove();
    });
  }
  killCartItemRatings();
  new MutationObserver(killCartItemRatings).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

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
