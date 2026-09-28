/* Steelmonks Newsletter-Popup (Gratis-Versand): Teaser, Auslöser, Ausschlüsse, Anmeldung über die Klaviyo-Client-API */
(function(){
'use strict';
const R = document.getElementById('smNl'); if (!R) return;

// Test-Modus: solange LIVE = false, erscheint das Popup nur mit ?smnl=test (normale Regeln) oder ?smnl=open (sofort)
const LIVE = false;
const DELAY_MOBILE = 30000, DELAY_DESKTOP = 40000, SCROLL_SHARE = 0.5, PAUSE_DAYS = 14;
const EXCLUDE = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:cart|account|checkouts?|pages\/(?:kontakt|vertrag-widerrufen|impressum|agb-s|datenschutzerklarung|widerrufsbelehrung|versandbedingungen|newsletter|werkstatt|anfragen|dein-wappen|dein-firmenschild|sendungsverfolgung))(?:\/|$)/;

const store = (s) => ({ get(k){ try { return s.getItem(k); } catch(e){ return null; } }, set(k, v){ try { s.setItem(k, v); } catch(e){} } });
const LS = store(window.localStorage), SS = store(window.sessionStorage);
const q = new URLSearchParams(location.search);
const mode = q.get('smnl');
if (mode === 'test' || mode === 'open') SS.set('smNlTest', '1');
const testing = SS.get('smNlTest') === '1';
if (!LIVE && !testing) return;
const force = mode === 'open';

// Bekannte Abonnenten: Klick aus einer Klaviyo-Mail oder bereits über Klaviyo identifiziert
if (q.has('_kx') || /klaviyo/i.test(q.get('utm_source') || '') || /^e-?mail$/i.test(q.get('utm_medium') || '')) LS.set('smNl', 'known');
try {
  const m = document.cookie.match(/(?:^|;\s*)__kla_id=([^;]+)/);
  if (m && /\$exchange_id|\$email/.test(atob(decodeURIComponent(m[1])))) LS.set('smNl', 'known');
} catch(e){}

if (!force) {
  if (LS.get('smNl')) return;
  if (Date.now() - (+LS.get('smNlClosed') || 0) < PAUSE_DAYS * 864e5) return;
  if (EXCLUDE.test(location.pathname)) return;
}

const $ = (id) => document.getElementById(id);
const dlg = $('smNlDlg'), back = $('smNlBack'), tz = $('smNlTz'), form = $('smNlForm'), mail = $('smNlMail'), err = $('smNlErr');
const mq = matchMedia('(max-width: 749px)');
const push = (event) => { try { (window.dataLayer = window.dataLayer || []).push({ event }); } catch(e){} };
let isOpen = false, lastFocus = null, hiddenLayers = [], done = false;

const loadImages = () => R.querySelectorAll('img[data-src]').forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
// Ein anderes Fenster ist offen (Warenkorb, Menü, Personalisierer, Klaviyo-Formular)?
const busy = () => {
  if (document.body.classList.contains('overflow-hidden') || document.documentElement.classList.contains('overflow-hidden')) return true;
  return Array.from(document.querySelectorAll('[aria-modal="true"], dialog[open], .klaviyo-form')).some(el => !R.contains(el) && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
};
// Schwebende Elemente anderer Anbieter (z. B. Bewertungs-Badge) liegen sonst über dem Popup
const hideLayers = () => {
  hiddenLayers = [];
  document.querySelectorAll('body > *:not(#smNl), body > * > *').forEach(el => {
    if (R.contains(el) || el.contains(R)) return;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' && (+s.zIndex || 0) >= 2147483000 && s.visibility !== 'hidden') { hiddenLayers.push([el, el.style.visibility]); el.style.visibility = 'hidden'; }
  });
};
const showLayers = () => { hiddenLayers.forEach(([el, v]) => { el.style.visibility = v; }); hiddenLayers = []; };

function open(source){
  if (isOpen || done) return;
  if (!force && busy()) { setTimeout(() => open(source), 8000); return; }
  isOpen = true; SS.set('smNlShown', '1'); loadImages();
  lastFocus = document.activeElement;
  R.hidden = false; tz.hidden = true; back.hidden = false; dlg.hidden = false;
  hideLayers();
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => R.classList.add('in')));
  setTimeout(() => (mq.matches ? dlg : mail).focus({ preventScroll: true }), 60);
  push('newsletter_popup_view'); push('newsletter_popup_view_' + source);
}
function close(reason){
  if (!isOpen) return;
  isOpen = false; R.classList.remove('in');
  if (!done) { LS.set('smNlClosed', String(Date.now())); push('newsletter_popup_close'); }
  setTimeout(() => { dlg.hidden = true; back.hidden = true; R.hidden = true; showLayers(); document.documentElement.style.overflow = ''; }, 320);
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

R.addEventListener('click', (e) => { if (e.target.closest('[data-smnl-close]')) close('button'); });
back.addEventListener('click', () => close('backdrop'));
$('smNlTeaser').addEventListener('click', () => open('teaser'));
$('smNlTeaserX').addEventListener('click', () => { tz.hidden = true; R.hidden = true; LS.set('smNlClosed', String(Date.now())); push('newsletter_teaser_close'); });
document.addEventListener('keydown', (e) => {
  if (!isOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); close('escape'); return; }
  if (e.key !== 'Tab') return;
  const f = Array.from(dlg.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')).filter(el => !el.closest('[hidden]') && el.getClientRects().length);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = mail.value.trim(), btn = form.querySelector('button');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.'; mail.setAttribute('aria-invalid', 'true'); mail.focus(); return; }
  err.textContent = ''; mail.removeAttribute('aria-invalid'); btn.disabled = true;
  // signup 'var3' startet in Klaviyo „Flow 2 (Free Shipping)“ mit dem WelcomeShipping-Code
  fetch('https://a.klaviyo.com/client/subscriptions?company_id=' + encodeURIComponent(R.dataset.company), {
    method: 'POST', headers: { 'Content-Type': 'application/vnd.api+json', 'revision': '2025-01-15' },
    body: JSON.stringify({ data: { type: 'subscription', attributes: { custom_source: 'Popup Website', profile: { data: { type: 'profile', attributes: { email, properties: { signup: 'var3' } } } } }, relationships: { list: { data: { type: 'list', id: R.dataset.list } } } } })
  }).then(r => {
    if (!r.ok) throw new Error(r.status);
    done = true; LS.set('smNl', 'sub');
    $('smNlStepForm').hidden = true; $('smNlStepOk').hidden = false;
    const px = $('smNlPx'); if (px && px.dataset.ok) px.src = px.dataset.ok;
    $('smNlHok').focus({ preventScroll: true });
    push('newsletter_popup');
  }).catch(() => { btn.disabled = false; err.textContent = 'Das hat leider nicht geklappt. Bitte versuch es noch einmal.'; });
});

// Auslöser
if (force) { R.hidden = false; open('test'); return; }
if (SS.get('smNlShown')) return;
const t0 = +SS.get('smNlT0') || Date.now(); SS.set('smNlT0', String(t0));
const arm = () => {
  if (mq.matches) {
    setTimeout(() => { if (!isOpen && !done) { R.hidden = false; tz.hidden = false; } }, 4000);
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0 && scrollY / h >= SCROLL_SHARE) { removeEventListener('scroll', onScroll); open('scroll'); }
    };
    addEventListener('scroll', onScroll, { passive: true });
    setTimeout(() => open('time'), Math.max(0, DELAY_MOBILE - (Date.now() - t0)));
  } else {
    setTimeout(() => open('time'), Math.max(0, DELAY_DESKTOP - (Date.now() - t0)));
    const onLeave = (e) => { if (e.clientY <= 0 && !e.relatedTarget) { document.removeEventListener('mouseout', onLeave); open('exit'); } };
    setTimeout(() => document.addEventListener('mouseout', onLeave), 8000);
  }
};
if (document.readyState === 'complete') arm(); else addEventListener('load', arm, { once: true });
})();
