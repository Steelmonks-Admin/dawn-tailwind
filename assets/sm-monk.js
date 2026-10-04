/* Bruder Funke, Testversion ohne KI und ohne Backend.
   Lädt erst nach einem Klick auf einen Mönch-Einstieg (Loader in snippets/sm-monk.liquid).
   Alles ist geskriptet: Knöpfe, echte Shopdaten aus /collections/<handle>?view=moench, keine Anfragen an Dritte.
   Speicher: nur sessionStorage "smMonk", und erst nach einem Klick. */
(function () {
'use strict';
if (window.SMMK) return;
const d = document, CT = d.getElementById('smMonkCtx');
if (!CT) return;
let CTX = {};
try { CTX = JSON.parse(CT.textContent); } catch (e) { return; }

/* ---------- Einstellungen ---------- */
// Produkte mit dem Tag "internal production" sind echte Bestseller (z. B. DFV-Signet Anhänger). Hilfsprodukte fallen
// schon im JSON-Template über Typ, Tags und Handles heraus. Auf true setzen, um den Tag trotzdem auszuschließen.
const HIDE_INTERNAL_TAG = false;
const HELPER_TYPE = /^(Meilenstein|PPLR_HIDDEN_PRODUCT|Befestigungsset|Versand|Sonderanfertigung|Gravur|Gift Cards|Geschenkverpackung)$/;
const HELPER_HANDLE = /gratisversand|10-discount|mystery-geschenk|item-personalization|gravur|zusaetzlich|zusatzlich|zusatsliche|befestigung|geschenkt|ewige-rose/;

/* ---------- Posen: Quellgröße, Fuß (fx, fy), Kopf (hx, hy), Hand (ax, ay) ---------- */
const POSES = {
  sketch:  {w:410,h:420,fx:214,fy:406,hx:203,hy:7,  ax:336,ay:186},
  search:  {w:232,h:420,fx:115,fy:418,hx:129,hy:4,  ax:150,ay:120},
  curator: {w:415,h:420,fx:110,fy:377,hx:97, hy:95, ax:246,ay:165},
  measure: {w:420,h:410,fx:157,fy:401,hx:150,hy:62, ax:220,ay:150},
  pc:      {w:353,h:420,fx:101,fy:418,hx:101,hy:5,  ax:200,ay:250},
  shrug:   {w:352,h:420,fx:144,fy:418,hx:144,hy:4,  ax:220,ay:200},
  coffee:  {w:238,h:420,fx:110,fy:418,hx:110,hy:4,  ax:150,ay:150},
  chest:   {w:350,h:420,fx:175,fy:418,hx:175,hy:30, ax:175,ay:120},
  rail:    {w:66, h:120,fx:33, fy:119,hx:33, hy:2,  ax:40, ay:40, mini:1}
};
const asset = k => (k === 'rail' ? S.railSrc : (CTX.ab || '') + ((CTX.a || {})[k] || ''));

/* ---------- Zielgruppen aus der Konfiguration: "Name|handles|für wen|hero|fx" ---------- */
const WHO = {Handwerker:['für Handwerker','sparks'], Feuerwehr:['für Feuerwehrleute','sparks'], Paare:['für Paare','petals'], Familie:['für Familien','twinkle'], Zuhause:['fürs Zuhause','dust'],
  'Für Ihn':['für ihn','sparks'], 'Für Sie':['für sie','petals'], Eltern:['für Eltern','twinkle'], Soldaten:['für Soldaten','sparks'], THW:['für THW-Helfer','sparks'],
  Sportler:['für Sportler','twinkle'], Tierfreunde:['für Tierfreunde','petals'], Motorrad:['für Motorradfahrer','dust'], Garten:['für den Garten','petals']};
const AUD = (CTX.aud || []).map(s => { const p = String(s).split('|'), x = WHO[p[0]] || ['für ' + p[0], 'twinkle']; return {l:p[0], hs:(p[1] || '').split(',').filter(Boolean), who:x[0], hero:p[2] === '1', fx:x[1]}; });
const audBy = l => AUD.find(a => a.l === l);
const audByColl = c => AUD.find(a => a.hs.includes(c));

/* ---------- Zustand ---------- */
const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
const S = {
  out:false, pose:'sketch', facing:1, calm:false, reduced:mqRM.matches, sound:false, classic:false,
  mobile:false, busy:false, typing:false, anims:0, waitAdv:false, skip:false, greeted:false,
  ax:0, ay:0, tilt:0, lag:0, idleState:null, lastInput:performance.now(), prevPose:null, hidden:false,
  yield:false, active:false, lift:0, railSrc:'', aud:null, budget:null, shown:new Set(), pool:null, trigger:null, used:false
};
let SS = {};
const SKEY = 'smMonk';
function ssRead(){ try { return JSON.parse(sessionStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } }
function ssUpd(p){ SS = Object.assign(ssRead(), p); try { sessionStorage.setItem(SKEY, JSON.stringify(SS)); } catch (e) {} }

const $ = (s, r) => (r || d).querySelector(s);
const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
const R = Math.round;
const ABORT = {abort:1};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vpW = () => d.documentElement.clientWidth || innerWidth;
const vpH = () => innerHeight;
const vis = e => !!(e && e.getClientRects().length && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur = c => (c / 100).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
const push = (event, extra) => { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({event}, extra || {})); } catch (e) {} };

let stage, actor, box, bbody, choicesEl, sp, emoteEl, lagEl, turnEl, flipEl, sqEl, ppEl, trayEl, fxC, shadowC, spotEl, blurEl, qmEl, dockEl, dockSay, srlog, padEl, menuEl;
let built = false;

/* ---------- Ablauf-Token: ein neuer Ablauf bricht den alten ab ---------- */
let TOK = {dead:false};
function newFlow(){ TOK.dead = true; TOK = {dead:false}; return TOK; }
async function aw(p){ const t = TOK; const r = await p; if (t.dead) throw ABORT; return r; }
const w = ms => aw(sleep(ms));
function go(fn){
  const t = newFlow(); S.busy = true;
  Promise.resolve().then(fn).catch(e => { if (e !== ABORT) console.error('[Bruder Funke]', e); }).finally(() => { if (TOK === t) S.busy = false; });
}
function anim(el, kf, opts){
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(kf, opts); S.anims++;
  return a.finished.then(() => {}, () => {}).finally(() => { S.anims--; });
}
function h(tag, cls, html){ const e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/* ---------- Geometrie ---------- */
function vr(el){ const a = el.getBoundingClientRect(); return {x:a.left, y:a.top, w:a.width, h:a.height}; }
function sc(){ return S.mobile ? 1/3 : 1/2; }
function poseScale(n){ return POSES[n].mini ? 1 : sc(); }
function boxOn(){ return box && box.classList.contains('on'); }
function boxH(){ return boxOn() ? box.offsetHeight : 0; }
function measureBoxH(){ const v = box.style.visibility; box.style.visibility = 'hidden'; box.classList.add('on'); const hh = box.offsetHeight; box.classList.remove('on'); box.style.visibility = v; return hh; }
function home(){
  if (S.mobile){ const bh = boxH() || measureBoxH(); return {x:12 + R(175/3), y:vpH() - S.lift - bh}; }
  return {x:24 + 88, y:vpH() - 24 - S.lift};
}
function headerBottom(){
  const hd = $('sticky-header') || $('.section-header') || $('header');
  if (!hd) return 0; const r = hd.getBoundingClientRect(); return Math.max(0, r.bottom);
}
/* Shopify-Vorschauleiste und klebende Kaufleisten: Bühne um deren Höhe anheben */
function calcLift(){
  let l = 0; const H = vpH();
  const pv = d.getElementById('PBarNextFrameWrapper') || d.getElementById('preview-bar-iframe');
  if (pv && vis(pv)){ const r = pv.getBoundingClientRect(); if (r.top < H && r.bottom > H - 4) l = Math.max(l, H - r.top); }
  $$('.pin-tiers-sticky, .smx .sticky-buy, #smNlTz').forEach(e => {
    if (!vis(e) || e.hidden) return; const r = e.getBoundingClientRect();
    if (r.top < H && r.bottom > H - 220 && r.height < 200) l = Math.max(l, H - r.top + 8);
  });
  return Math.max(0, Math.min(180, R(l)));
}
/* Trusted-Shops-Badge (unten rechts, oberste Ebene) */
function tsEl(){
  const H = vpH(), W = vpW(), tc = $('[id^="trustbadge-container"]');
  if (tc) return tc;
  return $$('body > *, body > * > *').find(e => {
    if (e.id === 'smMonk' || e.closest('#smMonk') || /pd-cookie|PBarNext|preview-bar/i.test((e.className || '') + ' ' + e.id)) return false;
    const s = getComputedStyle(e); if (s.position !== 'fixed' || (+s.zIndex || 0) < 2147483000) return false;
    const r = e.getBoundingClientRect(); return r.width > 20 && r.width < 200 && r.height > 20 && r.right > W - 140 && r.bottom > H - 260;
  }) || null;
}

/* ---------- Pixel-Bitmaps ---------- */
const PAL = {'#':'#1b1d22','r':'#e0303a','y':'#ffd23f','w':'#ffffff','b':'#3b8cff','d':'#6b5a2a','o':'#1b1d22'};
const ICONS = {
  '!':["....##....","....##....","....##....","....##....","....##....","....##....","..........","....##....","....##....",".........."],
  '?':["..####....",".##..##...",".....##...","....##....","...##.....","...##.....","..........","...##.....","...##.....",".........."],
  '…':["..........","..........","..........","..........","..........","##..##..##","##..##..##","..........","..........",".........."],
  'heart':["..........",".rr...rr..","rrrr.rrrr.","rrwrrrrrr.","rrrrrrrrr.",".rrrrrrr..","..rrrrr...","...rrr....","....r.....",".........."],
  'bulb':["...yyyy...","..yyyyyy..",".yywyyyyy.",".ywyyyyyy.",".yyyyyyyy.","..yyyyyy..","...yyyy...","...dddd...","...dddd...","....dd...."],
  'sweat':["....b.....","....b.....","...bbb....","...bbb....","..bbwbb...","..bwbbb...","..bbbbb...","...bbb....","..........",".........."],
  'zzz':["..........","....####..",".......#..","......#...",".....####.","####......","...#......","..#.......",".#........","####......"],
  'note':["....####..","....#..#..","....#..#..","....#..#..","....#..#..",".###..##..","####.###..",".##..##...","..........",".........."]
};
const MARKER = ["ooooooooo","oyyyyyyyo","oyyyyyyyo",".oyyyyyo.","..oyyyo..","...oyo...","....o...."];
function bitmapCanvas(rows, scale){
  const hh = rows.length, wd = rows[0].length;
  const c = d.createElement('canvas'); c.width = wd; c.height = hh; const x = c.getContext('2d');
  rows.forEach((row, y) => { for (let i = 0; i < row.length; i++){ const ch = row[i]; if (ch !== '.'){ x.fillStyle = PAL[ch] || '#000'; x.fillRect(i, y, 1, 1); } } });
  c.style.width = (wd * scale) + 'px'; c.style.height = (hh * scale) + 'px'; return c;
}
function emoteCanvas(kind){
  const c = d.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
  x.fillStyle = '#1b1d22'; x.fillRect(1,0,14,1); x.fillRect(1,13,14,1); x.fillRect(0,1,1,12); x.fillRect(15,1,1,12);
  x.fillStyle = '#fff'; x.fillRect(1,1,14,12);
  x.fillStyle = '#1b1d22'; x.fillRect(6,14,4,1); x.fillRect(7,15,2,1); x.fillStyle = '#fff'; x.fillRect(7,13,2,1);
  (ICONS[kind] || ICONS['!']).forEach((row, yy) => { for (let i = 0; i < row.length; i++){ const ch = row[i]; if (ch !== '.'){ x.fillStyle = ch === '#' ? '#1b1d22' : (PAL[ch] || '#000'); x.fillRect(3 + i, 2 + yy, 1, 1); } } });
  c.className = 'smmk-emo'; return c;
}
function drawShadow(){
  const c = shadowC; c.width = 30; c.height = 5; const x = c.getContext('2d'); x.clearRect(0,0,30,5);
  [[8,22],[3,27],[1,29],[3,27],[8,22]].forEach(([a,b], y) => { x.fillStyle = 'rgba(9,10,12,.26)'; x.fillRect(a, y, b - a, 1); });
}

/* ---------- Partikel ---------- */
const FX = {ctx:null, cell:3, parts:[], ems:[], raf:0};
const FXC = {
  dust:['#cfc6b4','#b9ae98','#e6dfd0'], sparks:['#fff3b0','#ffd23f','#ff8a1f','#ffffff'],
  confetti:['#e0303a','#ffd23f','#3b8cff','#36c46b','#ff7ad9','#ffffff'], twinkle:['#ffffff','#fff3b0','#bfe0ff'],
  petals:['#ffb3c8','#ff8fb1','#ffd6e2'], steam:['rgba(255,255,255,.75)','rgba(255,255,255,.55)']
};
function fxResize(){ const cw = Math.ceil(vpW() / FX.cell), ch = Math.ceil(vpH() / FX.cell); fxC.width = cw; fxC.height = ch; fxC.style.width = (cw * FX.cell) + 'px'; fxC.style.height = (ch * FX.cell) + 'px'; }
function spawn(type, x, y){
  const r = Math.random, cols = FXC[type] || FXC.dust, col = cols[Math.floor(r() * cols.length)];
  const p = {type, x, y, vx:0, vy:0, g:0, life:40, age:0, col, size:1, ph:r() * 6};
  if (type === 'dust'){ p.vx = (r() - .5) * 3.2; p.vy = -r() * 1.4; p.g = .03; p.life = 24 + r() * 18; p.size = r() < .4 ? 2 : 1; }
  if (type === 'sparks'){ p.vx = (r() - .5) * 7; p.vy = -r() * 6 - 1; p.g = .32; p.life = 16 + r() * 16; }
  if (type === 'confetti'){ p.vx = (r() - .5) * 6; p.vy = -r() * 7 - 2; p.g = .16; p.life = 80 + r() * 40; p.size = r() < .5 ? 2 : 1; }
  if (type === 'twinkle'){ p.vx = (r() - .5) * 2; p.vy = (r() - .5) * 2; p.life = 26 + r() * 18; p.size = 2; }
  if (type === 'petals'){ p.vx = (r() - .5) * 2; p.vy = -r() * 2; p.g = .03; p.life = 80 + r() * 40; p.size = 2; }
  if (type === 'steam'){ p.vx = (r() - .5) * .5; p.vy = -.5 - r() * .5; p.g = -.004; p.life = 50 + r() * 30; p.size = r() < .5 ? 2 : 1; }
  FX.parts.push(p);
}
function burst(type, x, y, n){ if (S.reduced || S.classic || S.hidden || S.yield || !built) return; for (let i = 0; i < (n || 14); i++) spawn(type, x, y); fxRun(); }
function emitter(type, getXY, rate){ const e = {type, getXY, rate:rate || .3}; if (S.classic || S.reduced) return e; FX.ems.push(e); fxRun(); return e; }
function stopEmitter(e){ FX.ems = FX.ems.filter(x => x !== e); }
function fxRun(){ if (!FX.raf && !S.hidden) FX.raf = requestAnimationFrame(fxStep); }
function fxStep(){
  FX.raf = 0; const x = FX.ctx, cell = FX.cell; x.clearRect(0, 0, fxC.width, fxC.height);
  if (!S.reduced && !S.classic && !S.yield) for (const e of FX.ems){ if (Math.random() < e.rate){ const q = e.getXY(); if (q) spawn(e.type, q.x, q.y); } }
  FX.parts = FX.parts.filter(p => p.age < p.life);
  for (const p of FX.parts){
    p.age++; p.vy += p.g; p.x += p.vx; p.y += p.vy;
    if (p.type === 'confetti' || p.type === 'petals'){ p.vx *= .97; p.x += Math.sin(p.age / 5 + p.ph) * .6; if (p.vy > 2.2) p.vy = 2.2; }
    if (p.type === 'steam') p.x += Math.sin(p.age / 8 + p.ph) * .3;
    let a = 1 - p.age / p.life; if (p.type === 'twinkle') a = (Math.floor(p.age / 4) % 2) ? .3 : 1;
    x.globalAlpha = Math.max(0, Math.min(1, p.type === 'steam' ? a * .9 : a + .25));
    x.fillStyle = p.col;
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    if (p.type === 'twinkle'){ x.fillRect(cx - 1, cy, 3, 1); x.fillRect(cx, cy - 1, 1, 3); } else x.fillRect(cx, cy, p.size, p.size);
  }
  x.globalAlpha = 1;
  if ((FX.parts.length || FX.ems.length) && !S.hidden) fxRun();
}
function fxClear(){ FX.parts = []; FX.ems = []; if (FX.ctx) FX.ctx.clearRect(0, 0, fxC.width, fxC.height); }

/* ---------- Ton (aus, bis der Besucher ihn einschaltet; nie im ruhigen Modus) ---------- */
const SND = {ctx:null};
function ac(){
  if (!S.sound || S.calm) return null;
  try {
    if (!SND.ctx) SND.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (SND.ctx.state === 'suspended') SND.ctx.resume();
  } catch (e) { return null; }
  return SND.ctx;
}
function tone(f, dur, type, vol, f2){
  const c = ac(); if (!c) return; const t = c.currentTime; dur = dur || .04;
  const o = c.createOscillator(), g = c.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol || .035, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, f){
  const c = ac(); if (!c) return; const t = c.currentTime;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const s = c.createBufferSource(); s.buffer = b; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); bp.frequency.exponentialRampToValueAtTime(f * 3, t + dur);
  const g = c.createGain(); g.gain.value = vol; s.connect(bp).connect(g).connect(c.destination); s.start(t);
}
function blip(first){ if (first){ tone(88, .07, 'square', .03); return; } const base = 110 + Math.random() * 30, semi = Math.random() * 4 - 2; tone(base * Math.pow(2, semi / 12), .04); }
function sfx(n){
  if (!S.sound || S.calm) return;
  if (n === 'whoosh') noise(.32, .05, 500);
  if (n === 'thud') tone(110, .12, 'sine', .12, 40);
  if (n === 'pop') tone(330, .06, 'square', .03, 660);
  if (n === 'deal') noise(.06, .06, 2400);
  if (n === 'sparkle') [880, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, .07, 'square', .025), i * 70));
  if (n === 'laser') tone(1400, .18, 'square', .02, 500);
}

/* ---------- Aufbau der Bühne (erst beim ersten Öffnen) ---------- */
function build(){
  if (built) return; built = true;
  stage = h('div'); stage.id = 'smMonk';
  stage.innerHTML =
    '<canvas class="smmk-shadow" aria-hidden="true"></canvas>' +
    '<div class="smmk-actor" aria-hidden="true"><div class="lag"><div class="turn"><div class="flip"><div class="sq"><div class="pp"><div class="bob"><img class="sp" alt=""></div></div></div></div></div><div class="emote"></div></div></div>' +
    '<section class="smmk-box" role="dialog" aria-modal="false" aria-labelledby="smmkName">' +
      '<p class="smmk-plate"><b id="smmkName">Bruder Funke</b> <small><span class="dot1">· </span>Testversion, noch ohne KI</small></p>' +
      '<div class="smmk-tools"><button type="button" data-tool="sound" aria-label="Ton" aria-pressed="false">&#9834;</button><button type="button" data-tool="menu" aria-label="Menü" aria-expanded="false">&#8943;</button><button type="button" data-tool="close" aria-label="Schließen">&#215;</button></div>' +
      '<div class="smmk-menu" hidden><button type="button" data-m="sound">Ton an/aus</button><button type="button" data-m="motion">Animationen an/aus</button><button type="button" data-m="classic">Klassische Ansicht</button><button type="button" data-m="human">Mit Mensch sprechen</button></div>' +
      '<div class="smmk-body" tabindex="-1"></div>' +
      '<div class="smmk-adv" aria-hidden="true">&#9660;</div>' +
      '<div class="smmk-choices" role="group" aria-label="Antworten"></div>' +
    '</section>' +
    '<div class="smmk-tray"></div><canvas class="smmk-fx" aria-hidden="true"></canvas>';
  d.body.appendChild(stage);
  actor = $('.smmk-actor', stage); box = $('.smmk-box', stage); bbody = $('.smmk-body', stage); choicesEl = $('.smmk-choices', stage);
  sp = $('img.sp', actor); emoteEl = $('.emote', actor); lagEl = $('.lag', actor); turnEl = $('.turn', actor); flipEl = $('.flip', actor); sqEl = $('.sq', actor); ppEl = $('.pp', actor);
  trayEl = $('.smmk-tray', stage); fxC = $('.smmk-fx', stage); shadowC = $('.smmk-shadow', stage); menuEl = $('.smmk-menu', stage);
  FX.ctx = fxC.getContext('2d');
  spotEl = h('div', 'smmk-spot'); blurEl = h('div', 'smmk-spotblur');
  qmEl = bitmapCanvas(MARKER, 3); qmEl.className = 'smmk-qm'; qmEl.setAttribute('aria-hidden', 'true');
  dockEl = h('button', 'smmk-dock'); dockEl.type = 'button'; dockEl.setAttribute('aria-label', 'Bruder Funke wartet kurz'); dockEl.innerHTML = '<img alt="" src="' + esc(asset('lupe')) + '">';
  dockSay = h('div', 'smmk-dock-say'); dockSay.setAttribute('aria-hidden', 'true');
  srlog = h('div', 'smmk-vh'); srlog.setAttribute('role', 'log'); srlog.setAttribute('aria-live', 'polite');
  padEl = h('div', 'smmk-pad'); padEl.setAttribute('aria-hidden', 'true');
  [blurEl, spotEl, qmEl, dockEl, dockSay, srlog, padEl].forEach(e => d.body.appendChild(e));
  drawShadow(); bind(); applyViewport();
  stage.classList.toggle('rm', S.reduced);
}

/* ---------- Darsteller ---------- */
function placeActor(x, y){ S.ax = R(x); S.ay = R(y); actor.style.transform = `translate3d(${S.ax}px,${S.ay}px,0)`; placeShadow(S.ax, S.ay); }
function placeShadow(x, y, show){
  const k = S.mobile ? 3 : 4, wd = 30 * k, ht = 5 * k;
  shadowC.style.width = wd + 'px'; shadowC.style.height = ht + 'px';
  shadowC.style.transform = `translate(${R(x - wd / 2)}px,${R(y - ht / 2 - 1)}px)`;
  shadowC.style.display = (show !== false) && S.out && !S.classic ? 'block' : 'none';
}
function applyPoseGeom(n){
  const p = POSES[n], s = poseScale(n);
  sp.style.width = (p.w * s) + 'px'; sp.style.height = (p.h * s) + 'px';
  sp.style.left = R(-p.fx * s) + 'px'; sp.style.top = R(-p.fy * s) + 'px';
  emoteEl.style.transform = `translate(${R(S.facing * (p.hx - p.fx) * s) - 16}px,${R((p.hy - p.fy) * s) - 40}px)`;
}
async function setPose(n, o){
  o = o || {}; const pop = o.pop !== false, dust = o.dust !== false;
  const changed = S.pose !== n; S.pose = n;
  sp.src = asset(n); applyPoseGeom(n);
  if (!pop || !S.out || !changed) return;
  if (dust) burst('dust', S.ax, S.ay - 4, 12);
  sfx('pop');
  if (S.reduced) return anim(ppEl, [{opacity:0}, {opacity:1}], {duration:150});
  return anim(ppEl, [{transform:'scale(.6)', opacity:0}, {transform:'scale(1)', opacity:1}], {duration:450, easing:'steps(4,end)'});
}
function handPoint(){ const p = POSES[S.pose], s = poseScale(S.pose); return {x:S.ax + S.facing * (p.ax - p.fx) * s, y:S.ay + (p.ay - p.fy) * s}; }
function headPoint(){ const p = POSES[S.pose], s = poseScale(S.pose); return {x:S.ax + S.facing * (p.hx - p.fx) * s, y:S.ay + (p.hy - p.fy) * s}; }
let emoteTimer = 0;
function emote(kind, ms){
  clearTimeout(emoteTimer); emoteEl.innerHTML = '';
  if (!kind) return;
  const c = emoteCanvas(kind); emoteEl.append(c);
  if (!S.reduced) c.animate([{transform:'translateY(6px) scale(.5)', opacity:0}, {transform:'translateY(0) scale(1)', opacity:1}], {duration:240, easing:'steps(3,end)'});
  if (ms !== 0) emoteTimer = setTimeout(() => { emoteEl.innerHTML = ''; }, ms || 1500);
}
function talk(on){ actor.classList.toggle('talk', on); }
function setFacing(f){ S.facing = f; flipEl.style.transform = `scaleX(${f})`; applyPoseGeom(S.pose); }
async function paperTurn(f){
  if (S.facing === f) return;
  if (S.reduced){ setFacing(f); return; }
  await anim(turnEl, [{transform:'rotateY(0deg)'}, {transform:'rotateY(90deg)'}], {duration:80, easing:'steps(2,end)'});
  setFacing(f);
  await anim(turnEl, [{transform:'rotateY(-90deg)'}, {transform:'rotateY(0deg)'}], {duration:80, easing:'steps(2,end)'});
}
function showActor(on){
  S.out = on; actor.style.display = on ? 'block' : 'none';
  d.documentElement.classList.toggle('smmk-out', on);
  $$('[data-smmk="open"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
  placeShadow(S.ax, S.ay, on);
  if (!on){ emote(null); talk(false); }
}
function applyTilt(){ const t = (S.out && !S.mobile && !S.reduced) ? R(S.tilt) : 0; turnEl.style.transform = t ? `rotate(${t}deg)` : ''; }

/* Sprungbahn: echter Hüpfer mit seitlichem Schwung */
function arcPath(from, to, rise, swing){
  const D = to.y - from.y, peakY = Math.min(from.y, to.y) - rise, Hp = from.y - peakY;
  const b = -2 * Hp - Math.sqrt(Math.max(0, 4 * Hp * Hp + 4 * Hp * D)), a = D - b;
  return t => ({x:from.x + (to.x - from.x) * t + swing * Math.sin(Math.PI * t), y:from.y + b * t + a * t * t});
}
function flightKF(path, t0, t1, O, sizeAt, spriteH, ry0, ry1){
  const N = 12, kf = [];
  for (let i = 0; i <= N; i++){
    const u = i / N, t = t0 + (t1 - t0) * u, q = path(t), sz = sizeAt(t), f = 800 / (800 - sz.z);
    const px = O.x + (q.x - O.x) / f, py = O.y + (q.y - O.y) / f, k = Math.min(1, sz.H / spriteH / f);
    kf.push({offset:u, transform:`translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${sz.z.toFixed(1)}px) rotateY(${(ry0 + (ry1 - ry0) * u).toFixed(1)}deg) scale(${k.toFixed(3)})`});
  }
  return kf;
}
const drawnH = n => R(POSES[n].h * poseScale(n));
/* Der Mönch aus der Belohnungsleiste: welcher ist gerade sichtbar? */
function railSprite(){
  return $$('[data-smr-mmonk], [data-smr-monk]').find(e => { if (!e.getClientRects().length) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < vpH() && getComputedStyle(e).display !== 'none'; }) || null;
}
function useRail(rs){
  S.railSrc = rs.currentSrc || rs.src;
  const nw = rs.naturalWidth || 66, nh = rs.naturalHeight || 120;
  POSES.rail = {w:nw, h:nh, fx:R(nw / 2), fy:nh - 1, hx:R(nw / 2), hy:2, ax:R(nw * .6), ay:R(nh * .4), mini:1};
}
/* Auftritt: Sprung aus der Leiste */
async function leapOut(landPose){
  const rs = railSprite(); const to = home();
  if (!rs || S.reduced){ return poofIn(landPose); }
  const rr = vr(rs), from = {x:rr.x + rr.w / 2, y:rr.y + rr.h};
  useRail(rs);
  const ex = emoteCanvas('!'); ex.style.position = 'absolute'; ex.style.transform = `translate(${R(from.x - 16)}px,${R(rr.y - 36)}px)`; stage.append(ex);
  sfx('pop');
  await anim(rs, [{transform:'translateY(0) scaleY(1)'}, {transform:'translateY(2px) scaleY(.95)'}], {duration:220, easing:'steps(2,end)', fill:'forwards'});
  rs.getAnimations().forEach(a => a.cancel()); ex.remove();
  S.pose = 'rail'; sp.src = asset('rail'); setFacing(1); applyPoseGeom('rail');
  showActor(true); placeShadow(to.x, to.y, true);
  const O = {x:to.x, y:to.y - 100}; stage.style.perspectiveOrigin = `${O.x}px ${O.y}px`;
  const h0 = rr.h, h1 = drawnH(landPose);
  const path = arcPath(from, to, 50, S.mobile ? 40 : 70);
  const sizeAt = t => { const e = t * t; return {H:h0 + (h1 - h0) * e, z:-300 * (1 - e)}; };
  const skf = []; for (let i = 0; i <= 10; i++){ const t = i / 10; skf.push({offset:t, opacity:t < .5 ? 0 : (t - .5) * 2, transform:`translate(${R(to.x - 60)}px,${R(to.y - 10)}px) scale(${(.2 + .8 * t).toFixed(2)})`}); }
  sfx('whoosh');
  anim(shadowC, skf, {duration:650});
  const k1 = flightKF(path, 0, .5, O, sizeAt, POSES.rail.h, 0, 90);
  actor.style.transform = k1[k1.length - 1].transform;
  await aw(anim(actor, k1, {duration:325, easing:'linear'}));
  S.pose = landPose; sp.src = asset(landPose); applyPoseGeom(landPose); flipEl.style.transform = 'scaleX(-1)';
  const k2 = flightKF(path, .5, 1, O, sizeAt, h1, 90, 180);
  actor.style.transform = k2[k2.length - 1].transform;
  await aw(anim(actor, k2, {duration:325, easing:'linear'}));
  setFacing(1); placeActor(to.x, to.y);
  sfx('thud'); burst('dust', to.x, to.y - 3, 26); burst('twinkle', to.x, to.y - h1 * .6, 6);
  await anim(sqEl, [{transform:'scale(1.14,.82)'}, {transform:'scale(.94,1.08)'}, {transform:'scale(1,1)'}], {duration:200, easing:'steps(3,end)'});
}
/* Abgang: winken, zurück in die Leiste */
async function leapBack(){
  const rs = railSprite();
  if (!rs || S.reduced){ await poofOut(); return; }
  const rr = vr(rs), to = {x:rr.x + rr.w / 2, y:rr.y + rr.h}, from = {x:S.ax, y:S.ay};
  useRail(rs);
  await anim(sqEl, [{transform:'rotate(0deg)'}, {transform:'rotate(-7deg)'}, {transform:'rotate(6deg)'}, {transform:'rotate(-7deg)'}, {transform:'rotate(6deg)'}, {transform:'rotate(0deg)'}], {duration:700, easing:'steps(5,end)'});
  const cur = S.pose, h1 = drawnH(cur), h0 = rr.h;
  burst('dust', from.x, from.y - 3, 16);
  await anim(sqEl, [{transform:'scale(1.1,.85)'}, {transform:'scale(1,1)'}], {duration:120, easing:'steps(2,end)'});
  const O = {x:from.x, y:from.y - 100}; stage.style.perspectiveOrigin = `${O.x}px ${O.y}px`;
  const path = arcPath(from, to, 50, S.mobile ? 40 : 70);
  const sizeAt = t => { const e = 1 - (1 - t) * (1 - t); return {H:h1 + (h0 - h1) * e, z:-300 * e}; };
  sfx('whoosh');
  anim(shadowC, [{opacity:1}, {opacity:0}], {duration:300, fill:'forwards'});
  const k1 = flightKF(path, 0, .5, O, sizeAt, h1, 0, 90);
  actor.style.transform = k1[k1.length - 1].transform;
  await anim(actor, k1, {duration:325, easing:'linear'});
  S.pose = 'rail'; sp.src = asset('rail'); applyPoseGeom('rail'); flipEl.style.transform = 'scaleX(-1)';
  const k2 = flightKF(path, .5, 1, O, sizeAt, POSES.rail.h, 90, 180);
  actor.style.transform = k2[k2.length - 1].transform;
  await anim(actor, k2, {duration:325, easing:'linear'});
  shadowC.getAnimations().forEach(a => a.cancel());
  showActor(false); setFacing(1);
  burst('twinkle', to.x, to.y - 20, 8);
  await anim(rs, [{transform:'scale(.6)', opacity:0}, {transform:'scale(1)', opacity:1}], {duration:300, easing:'steps(3,end)'});
}
async function poofIn(pose){
  const to = home(); showActor(true); setFacing(1); placeActor(to.x, to.y);
  S.pose = pose; sp.src = asset(pose); applyPoseGeom(pose);
  burst('dust', to.x, to.y - 20, 26); burst('twinkle', to.x, to.y - 60, 8); sfx('pop');
  if (S.reduced) return anim(actor, [{opacity:0}, {opacity:1}], {duration:150});
  return anim(ppEl, [{transform:'scale(.6)', opacity:0}, {transform:'scale(1)', opacity:1}], {duration:450, easing:'steps(4,end)'});
}
async function poofOut(){
  if (!S.out) return;
  burst('dust', S.ax, S.ay - 20, 22);
  if (!S.reduced) await anim(ppEl, [{transform:'scale(1)', opacity:1}, {transform:'scale(.5)', opacity:0}], {duration:240, easing:'steps(3,end)', fill:'forwards'});
  else await anim(actor, [{opacity:1}, {opacity:0}], {duration:150});
  ppEl.getAnimations().forEach(a => a.cancel());
  showActor(false);
}
async function walkTo(x){
  x = R(x); const dx = x - S.ax; if (!dx) return;
  if (S.reduced){ placeActor(x, S.ay); return; }
  await paperTurn(dx > 0 ? 1 : -1);
  actor.classList.add('walk'); box.classList.add('away');
  const dur = Math.abs(dx) / .26, steps = Math.max(2, R(Math.abs(dx) / 3));
  const k = S.mobile ? 3 : 4;
  anim(shadowC, [{transform:`translate(${R(S.ax - 15 * k)}px,${R(S.ay - 2.5 * k - 1)}px)`}, {transform:`translate(${R(x - 15 * k)}px,${R(S.ay - 2.5 * k - 1)}px)`}], {duration:dur, easing:`steps(${steps},end)`});
  const dustE = emitter('dust', () => { const m = new DOMMatrixReadOnly(getComputedStyle(actor).transform); return {x:m.m41 - 10 * Math.sign(dx), y:S.ay - 2}; }, .25);
  await anim(actor, [{transform:`translate3d(${S.ax}px,${S.ay}px,0)`}, {transform:`translate3d(${x}px,${S.ay}px,0)`}], {duration:dur, easing:`steps(${steps},end)`});
  stopEmitter(dustE); actor.classList.remove('walk');
  placeActor(x, S.ay);
}

/* ---------- Laser, Spotlight, Questmarker ---------- */
let laserEls = [], spotState = null, qmTarget = null;
function clearLaser(){ laserEls.forEach(e => e.remove()); laserEls = []; }
function reveal(el){
  const r = vr(el), top = headerBottom() + 60;
  let bottom = S.mobile ? vpH() - S.lift - Math.max(boxH(), vpH() * .42) - 20 : vpH() - S.lift - 40;
  if (!S.mobile && boxOn()){ const b = vr(box); if (r.x < b.x + b.w + 16 && r.x + r.w > b.x - 16) bottom = Math.min(bottom, b.y - 16); }
  if (r.y < top || r.y + r.h > bottom){
    let dy = r.y - top;
    if (r.h < bottom - top && r.y > top) dy = r.y + r.h - bottom;
    window.scrollBy(0, R(dy));
  }
}
function aimPoint(r){
  let x = r.x + r.w / 2, y = r.y + r.h / 2;
  if (boxOn() && !S.mobile){
    const b = vr(box), m = 10;
    if (x > b.x - m && x < b.x + b.w + m && y > b.y - m && y < b.y + b.h + m){
      if (r.x + r.w > b.x + b.w + 24) x = (Math.max(r.x, b.x + b.w + m) + r.x + r.w) / 2;
      else if (r.x < b.x - 24) x = (r.x + Math.min(r.x + r.w, b.x - m)) / 2;
      else if (r.y < b.y - 24) y = (r.y + Math.min(r.y + r.h, b.y - m)) / 2;
    }
  }
  return {x, y};
}
function crossesBox(hp, ap){
  const b = vr(box), m = 4;
  for (let i = 1; i < 40; i++){ const x = hp.x + (ap.x - hp.x) * i / 40, y = hp.y + (ap.y - hp.y) * i / 40; if (x > b.x - m && x < b.x + b.w + m && y > b.y - m && y < b.y + b.h + m) return true; }
  return false;
}
function aimBeam(beam, hp){
  const t = beam._to, dx = t.x - hp.x, dy = t.y - hp.y, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
  beam.style.width = R(L) + 'px';
  beam.style.transform = `translate(${R(hp.x)}px,${R(hp.y)}px) rotate(${ang.toFixed(2)}deg)`;
  let segs = $$('.smmk-seg', beam);
  if (!segs.length){ for (let i = 0; i < 4; i++){ const s = h('div', 'smmk-seg'); beam.append(s); segs.push(s); } }
  segs.forEach((s, i) => { s.style.left = R(i * L / 4) + 'px'; s.style.width = Math.ceil(L / 4) + 'px'; });
  return segs;
}
const folded = () => anim(box, [{transform:'scale(1,1)', opacity:1}, {transform:'scale(1,.05)', opacity:1, offset:.6}, {transform:'scale(.2,.05)', opacity:0}], {duration:200, easing:'steps(4,end)', fill:'forwards'});
const unfolded = () => anim(box, [{transform:'scale(.2,.05)', opacity:0}, {transform:'scale(1,.05)', opacity:1, offset:.45}, {transform:'scale(1,1)', opacity:1}], {duration:220, easing:'steps(5,end)'});
async function laserAt(el, o){
  o = o || {}; const spot = o.spot !== false, dim = o.dim !== false;
  if (!el) return;
  spotOff(); reveal(el); await w(80);
  const ap = aimPoint(vr(o.aim || el)), tx = ap.x, ty = ap.y;
  if (S.reduced || S.classic || !S.out){ if (spot) spotOn(el, {dim:false, stat:true}); return; }
  const hp = handPoint();
  const fold = boxOn() && box.style.visibility !== 'hidden' && crossesBox(hp, ap);
  if (fold){ await aw(folded()); box.style.visibility = 'hidden'; }
  const unfold = () => { box.getAnimations().forEach(a => a.cancel()); box.style.visibility = ''; };
  const beam = h('div', 'smmk-beam'); beam._to = {x:tx, y:ty};
  const fade = () => { if (!beam.isConnected) return; anim(beam, [{opacity:1}, {opacity:0}], {duration:160, easing:'steps(2,end)', fill:'forwards'}).then(() => { beam.remove(); laserEls = laserEls.filter(e => e !== beam); }); };
  try {
    const segs = aimBeam(beam, hp);
    stage.append(beam); laserEls.push(beam); sfx('laser');
    burst('sparks', hp.x, hp.y, 6);
    for (const s of segs){ s.style.opacity = 1; await w(55); }
    burst('sparks', tx, ty, 22); sfx('sparkle');
    if (spot) spotOn(el, {dim});
    if (spot || fold){ setTimeout(fade, 350); await w(530); } else setTimeout(fade, Math.min(o.keep || 700, 700));
  } catch (e){ beam.remove(); if (fold) unfold(); throw e; }
  if (fold){ unfold(); await aw(unfolded()); }
}
function spotOn(el, o){
  o = o || {}; spotOff();
  const r = vr(el), pad = 8, top = o.marker ? 40 : pad;
  const x = R(r.x - pad), y = R(r.y - top), wd = R(r.w + pad * 2), ht = R(r.h + pad + top);
  Object.assign(spotEl.style, {display:'block', left:x + 'px', top:y + 'px', width:wd + 'px', height:ht + 'px'});
  spotEl.classList.toggle('flat', o.dim === false || S.mobile);
  spotEl.classList.toggle('static', !!o.stat || S.reduced);
  if (o.dim !== false && !S.mobile && !S.reduced && !o.stat){
    blurEl.style.display = 'block';
    blurEl.style.clipPath = `path(evenodd,'M0 0H${vpW()}V${vpH()}H0Z M${x} ${y}H${x + wd}V${y + ht}H${x}Z')`;
  } else blurEl.style.display = 'none';
  spotState = {el, t:performance.now()};
}
function spotOff(){ if (!spotEl) return; spotEl.style.display = 'none'; blurEl.style.display = 'none'; spotState = null; }
function markerOn(el){
  qmTarget = el; qmEl.classList.add('on'); placeMarker();
  qmEl.getAnimations().forEach(a => a.cancel());
  if (!S.reduced) qmEl.animate([{marginTop:'0px'}, {marginTop:'-8px'}], {duration:300, iterations:Infinity, direction:'alternate', easing:'steps(2,end)'});
}
function placeMarker(){
  if (!qmTarget) return;
  if (S.yield || !qmTarget.isConnected || !vis(qmTarget)){ qmEl.style.visibility = 'hidden'; return; }
  const r = qmTarget.getBoundingClientRect(); qmEl.style.visibility = '';
  qmEl.style.transform = `translate(${R(r.left + r.width / 2 - 13)}px,${R(r.top - 30)}px)`;
}
function markerOff(){ qmTarget = null; if (qmEl){ qmEl.classList.remove('on'); qmEl.getAnimations().forEach(a => a.cancel()); } }

/* ---------- Dialogbox ---------- */
function openBox(){
  if (boxOn()) return Promise.resolve();
  box.classList.add('on'); sheetCheck();
  if (S.mobile && S.out) placeActor(home().x, home().y);
  if (S.reduced) return anim(box, [{opacity:0}, {opacity:1}], {duration:150});
  return anim(box, [{transform:'scale(.2,.05)', opacity:0}, {transform:'scale(1,.05)', opacity:1, offset:.45}, {transform:'scale(1,1)', opacity:1}], {duration:260, easing:'steps(5,end)'});
}
function closeMenu(refocus){
  menuEl.hidden = true; const mb = $('.smmk-tools [data-tool=menu]', stage); mb.setAttribute('aria-expanded', 'false');
  if (refocus && boxOn()) try { mb.focus({preventScroll:true}); } catch (e) {}
}
function closeBox(){ box.classList.remove('on', 'wait', 'away'); closeMenu(false); clearTray(); sheetCheck(); }
function newTurn(echo){
  clearTray(); clearLaser();
  if (!S.classic) bbody.innerHTML = '';
  choicesEl.innerHTML = '';
  if (echo){ const e = h('div', 'smmk-echo'); const s = h('span'); s.textContent = echo; e.append(s); bbody.append(e); }
}
function addNode(n){ bbody.append(n); bbody.scrollTop = bbody.scrollHeight; return n; }
let advResolve = null, lineSeq = 0;
function advanceNow(){ if (advResolve){ const r = advResolve; advResolve = null; r(); } }
async function typeInto(el, text){
  S.typing = true; S.skip = false; talk(true);
  try {
    if (S.reduced || S.classic){ el.textContent = text; }
    else {
      let i = 0;
      while (i < text.length){
        if (S.skip) break;
        if (S.hidden || S.yield){ await w(120); continue; }
        const ch = text[i++]; el.textContent = text.slice(0, i);
        if (S.sound && !S.calm && i % 3 === 1) blip(i === 1);
        let dl = 20; if ('.!?:'.includes(ch)) dl += 150; else if (ch === ',') dl += 70;
        if (i % 6 === 0) bbody.scrollTop = bbody.scrollHeight;
        await w(dl);
      }
      el.textContent = text;
    }
  } finally { S.typing = false; talk(false); }
  bbody.scrollTop = bbody.scrollHeight;
}
function announce(text){ const p = h('p'); p.textContent = text; srlog.append(p); srlog.removeAttribute('aria-busy'); }
/* Zeilen: Text oder {t, pose, emote, emoteMs, minMs} */
async function speak(lines){
  lines = [].concat(lines);
  for (let i = 0; i < lines.length; i++){
    const L = typeof lines[i] === 'string' ? {t:lines[i]} : lines[i];
    if (L.pose && S.out) await aw(setPose(L.pose));
    if (L.emote && S.out) emote(L.emote, L.emoteMs || 1600);
    $$('.smmk-line', bbody).forEach(n => n.classList.add('old'));
    let target;
    if (S.classic){
      const row = h('div', 'smmk-cmsg'); const av = h('div', 'smmk-av'); av.style.backgroundImage = `url(${asset('lupe')})`; const col = h('div'); row.append(av, col);
      target = h('p', 'smmk-line'); col.append(target); addNode(row);
    } else target = addNode(h('p', 'smmk-line'));
    target.setAttribute('aria-hidden', 'true');
    const t0 = performance.now();
    srlog.setAttribute('aria-busy', 'true');
    try { await typeInto(target, L.t); } catch (e){ srlog.removeAttribute('aria-busy'); throw e; }
    announce(L.t);
    target.removeAttribute('aria-hidden'); target.id = 'smmkLn' + (++lineSeq); box.setAttribute('aria-describedby', target.id);
    if (L.minMs){ const rest = L.minMs - (performance.now() - t0); if (rest > 0) await w(rest); }
    if (i < lines.length - 1 && !S.classic && !S.reduced){
      box.classList.add('wait'); S.waitAdv = true;
      const pause = Math.min(2400, 650 + L.t.length * 16);
      await aw(Promise.race([sleep(pause), new Promise(r => { advResolve = r; })]));
      advResolve = null; S.waitAdv = false; box.classList.remove('wait');
    }
  }
}
/* Antworten: {l, f} oder {l, href} (Navigation); pri = Hauptknopf, link = Textlink */
function choices(list, o){
  o = o || {}; const host = o.host || choicesEl;
  choicesEl.innerHTML = ''; host.innerHTML = '';
  list.forEach(c => {
    const b = h('button', 'smmk-ch' + (c.link ? ' lk' : '') + (c.pri ? ' pri' : '')); b.type = 'button'; b.textContent = c.l;
    b.addEventListener('click', () => {
      if (b.disabled) return; $$('.smmk-ch', host).forEach(x => { x.disabled = true; });
      S.lastInput = performance.now();
      if (c.echo !== false) newTurn('Du: ' + c.l); else newTurn();
      go(c.f || (() => navTo(c.href, c.cue, c.say)));
    });
    host.append(b);
  });
  requestAnimationFrame(() => { bbody.scrollTop = bbody.scrollHeight; });
  if (o.focus !== false && list.length){ try { host.firstChild.focus({preventScroll:true}); } catch (e) {} }
}
function allChoices(){ return $$('.smmk-choices .smmk-ch, .smmk-tray .tlinks .smmk-ch', stage); }
function focusLog(){ try { bbody.focus({preventScroll:true}); } catch (e) {} }

/* Handy: Seite bleibt über dem Sheet scrollbar, Trusted-Shops-Badge macht kurz Platz */
let tsHidden = null;
function sheetCover(){ return (S.mobile && boxOn() && !S.yield) ? box.offsetHeight + 150 : 0; }
function sheetCheck(){
  padEl.style.height = sheetCover() + 'px';
  const want = S.mobile && boxOn() && !S.yield;
  d.documentElement.classList.toggle('smmk-sheet', want);
  if (want && !tsHidden){ const t = tsEl(); if (t && !/^trustbadge-container/.test(t.id)){ tsHidden = [t, t.style.opacity]; t.style.opacity = '0'; } }
  if (!want && tsHidden){ tsHidden[0].style.opacity = tsHidden[1]; tsHidden = null; }
}
function rideSheet(){
  if (!S.mobile || !S.out || !boxOn()) return;
  if (actor.getAnimations().some(a => a !== rideSheet.a && a.playState === 'running')) return;
  const hm = home(); if (hm.y === S.ay && hm.x === S.ax) return;
  const from = actor.style.transform; placeActor(hm.x, hm.y);
  laserEls.forEach(b => { if (b.isConnected && b._to) aimBeam(b, handPoint()); });
  if (!S.reduced && !S.hidden && from) rideSheet.a = actor.animate([{transform:from}, {transform:actor.style.transform}], {duration:120, easing:'steps(2,end)'});
}

/* ---------- Kartenstapel ---------- */
function tsRect(){
  const t = tsEl(); if (!t) return null;
  const inner = $$('*', t).find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width > 20) || $('button', t) || t;
  const r = inner.getBoundingClientRect(); return r.width > 0 ? r : null;
}
function placeTray(){
  const br = vr(box), ts = tsRect(), lim = ts ? ts.left - 12 : vpW() - 12;
  const n = $$('.smmk-card', trayEl).length || 3;
  const fits = cw => br.x + br.w + 26 + n * cw + (n - 1) * 12 <= lim;
  let cw = 172, side = true;
  if (!fits(172)){ if (fits(150)) cw = 150; else side = false; }
  trayEl.style.setProperty('--cw', cw + 'px');
  if (side){ trayEl.style.left = R(br.x + br.w + 26) + 'px'; trayEl.style.bottom = (24 + S.lift) + 'px'; }
  else { trayEl.style.left = R(br.x) + 'px'; trayEl.style.bottom = (24 + S.lift + box.offsetHeight + 22) + 'px'; }
}
function clearTray(){ if (!trayEl) return; trayEl.innerHTML = ''; trayEl.style.display = 'none'; $$('.smmk-fly', stage).forEach(e => e.remove()); }
function flyOut(el, hp, kfFn, dur){
  const r = vr(el);
  const fly = h('div', 'smmk-fly'); fly.setAttribute('aria-hidden', 'true');
  fly.style.width = R(r.w) + 'px'; fly.style.left = R(r.x) + 'px'; fly.style.top = R(r.y) + 'px';
  fly.style.setProperty('--cw', R(r.w) + 'px');
  const c = el.cloneNode(true); c.style.opacity = 1; $$('button, a', c).forEach(b => { b.tabIndex = -1; }); fly.append(c); stage.append(fly);
  const dx = R(hp.x - (r.x + r.w / 2)), dy = R(hp.y - (r.y + r.h / 2));
  return anim(fly, kfFn(dx, dy), {duration:dur, easing:'cubic-bezier(.2,.8,.3,1)'}).then(() => { el.style.opacity = 1; fly.remove(); return r; });
}
function fmtCount(n){
  if (n >= 1000) return 'Über ' + (Math.floor(n / 100) * 100).toLocaleString('de-DE') + '-mal bestellt.';
  if (n >= 100) return 'Über ' + (Math.floor(n / 10) * 10) + '-mal bestellt.';
  if (n >= 10) return n + '-mal bestellt.';
  return '';
}
function whyLine(p){
  const a = fmtCount(+p.n || 0);
  const b = p.z ? 'Mit Deinem Text graviert.' : 'Direkt bestellbar, ohne Gravur.';
  return a ? a + ' ' + b : b;
}
function rating(p){ const rv = parseFloat(p.rv), rc = +p.rc || 0; return (rc >= 10 && rv) ? ' · ★ ' + rv.toFixed(1).replace('.', ',') + ' (' + rc + ')' : ''; }
const priceTxt = p => (p.q > p.p ? 'ab ' : '') + eur(p.p);
async function dealCards(items){
  items.forEach(p => S.shown.add(p.h));
  ssUpd({recs:Array.from(new Set((SS.recs || []).concat(items.map(p => p.h)))).slice(-24)});
  if (S.mobile){
    const wrap = addNode(h('div', 'smmk-rows'));
    const els = items.map(p => {
      const r = h('div', 'smmk-row');
      r.innerHTML = `<img class="im" src="${esc(p.i)}" alt="" width="48" height="48"><div><b>${esc(p.t)}</b><small>${priceTxt(p)} · inkl. MwSt., zzgl. Versand${esc(rating(p))}</small><small>${p.over ? '<em style="color:#7a5a00">Knapp über Budget</em> · ' : ''}${p.z ? '<em>Mit Deinem Text</em> · ' : ''}${esc(fmtCount(+p.n || 0) || 'Direkt bestellbar.')}</small></div>`;
      const btn = h('button', 'smmk-show', 'Zeig es mir'); btn.type = 'button'; btn.setAttribute('aria-label', 'Zeig es mir: ' + p.t); btn.addEventListener('click', () => showIt(p, btn)); r.append(btn);
      r.style.opacity = 0; wrap.append(r); return r;
    });
    bbody.scrollTop = bbody.scrollHeight; rideSheet();
    const hp = handPoint(), flights = [];
    for (const r of els){
      sfx('deal');
      if (S.reduced || S.classic || !S.out){ r.style.opacity = 1; continue; }
      flights.push(flyOut(r, hp, (dx, dy) => [{transform:`translate(${dx}px,${dy}px) scale(.2) rotate(-12deg)`, opacity:0}, {transform:`translate(${R(dx * .85)}px,${R(dy * .85)}px) scale(.3) rotate(-10deg)`, opacity:1, offset:.1}, {transform:'none', opacity:1}], 420).then(rr => burst('sparks', rr.x + 30, rr.y + rr.h / 2, 8)));
      await w(120);
    }
    await aw(Promise.all(flights)); await w(150); return;
  }
  const hp = handPoint();
  trayEl.innerHTML = '<div class="tcards"></div><div class="tlinks" role="group" aria-label="Weitere Wege"></div>'; trayEl.style.display = 'flex';
  const cards = $('.tcards', trayEl);
  const els = items.map(p => {
    const c = h('div', 'smmk-card');
    c.innerHTML = `<img class="im" src="${esc(p.i)}" alt="" width="172" height="118"><div class="in"><b class="ti">${esc(p.t)}</b><div><span class="smmk-price">${priceTxt(p)}</span><span class="smmk-tax">${esc(rating(p))}</span></div><div class="smmk-tax">inkl. MwSt., zzgl. <a href="/policies/shipping-policy">Versand</a></div><div>${p.over ? '<span class="smmk-bdg fav">Knapp über Budget</span>' : ''}${p.z ? '<span class="smmk-bdg">Mit Deinem Text</span>' : ''}</div><div class="smmk-why">${esc(whyLine(p))}</div></div>`;
    const btn = h('button', 'smmk-show', 'Zeig es mir'); btn.type = 'button'; btn.setAttribute('aria-label', 'Zeig es mir: ' + p.t); btn.addEventListener('click', () => showIt(p, btn)); $('.in', c).append(btn);
    c.style.opacity = 0; cards.append(c); return c;
  });
  placeTray(); const flights = [];
  for (const c of els){
    sfx('deal');
    if (S.reduced || S.classic || !S.out){ c.style.opacity = 1; continue; }
    flights.push(flyOut(c, hp, (dx, dy) => [{transform:`translate(${dx}px,${dy}px) scale(.15) rotate(-24deg)`, opacity:0}, {transform:`translate(${R(dx * .88)}px,${R(dy * .88 - 12)}px) scale(.24) rotate(-18deg)`, opacity:1, offset:.1}, {transform:`translate(${R(dx * .35)}px,${R(dy * .35 - 40)}px) scale(.7) rotate(8deg)`, opacity:1, offset:.55}, {transform:'none', opacity:1}], 480).then(r => burst('sparks', r.x + r.w / 2, r.y + 30, 10)));
    await w(120);
  }
  await aw(Promise.all(flights)); await w(150);
}

/* ---------- Produktdaten (gleiche Herkunft, ohne Backend) ---------- */
const COLL = {};
function fetchColl(hd){
  if (!COLL[hd]) COLL[hd] = fetch('/collections/' + encodeURIComponent(hd) + '?view=moench&sort_by=best-selling', {credentials:'same-origin'})
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .catch(e => { delete COLL[hd]; throw e; });
  return COLL[hd];
}
async function loadPool(handles){
  const res = await Promise.allSettled(handles.map(fetchColl)), seen = new Map();
  res.forEach(r => { if (r.status !== 'fulfilled' || !r.value || !Array.isArray(r.value.p)) return; r.value.p.forEach((p, i) => { const o = seen.get(p.h); if (!o || i < o.pos) seen.set(p.h, Object.assign({}, p, {pos:i})); }); });
  if (!seen.size && res.every(r => r.status === 'rejected')) throw new Error('keine Daten');
  return Array.from(seen.values()).filter(p => p.p > 0 && p.i && !HELPER_HANDLE.test(p.h) && !HELPER_TYPE.test(p.y || '') && !(HIDE_INTERNAL_TAG && p.ip));
}
function fam(y){ y = y || ''; if (/Anstecker|Pin/i.test(y)) return 'pin'; if (/Anh[äa]nger|Halskette|Erkennungsmarke/i.test(y)) return 'anh'; if (/Feuerzeug/i.test(y)) return 'zip'; return y; }
function diverse(L, n){
  const out = [], fams = new Set();
  for (const p of L){ const f = fam(p.y); if (fams.has(f)) continue; fams.add(f); out.push(p); if (out.length === n) return out; }
  for (const p of L){ if (out.length >= n) break; if (!out.includes(p)) out.push(p); }
  return out;
}
function pick(pool, budget){
  const cap = budget === '30' ? 3000 : budget === '60' ? 6000 : Infinity;
  const L = pool.filter(p => !S.shown.has(p.h)).sort((a, b) => (b.n - a.n) || (a.pos - b.pos));
  let inB = L.filter(p => p.p <= cap);
  if (budget === 'mehr'){ const hi = L.filter(p => p.p >= 3000); if (hi.length >= 2) inB = hi; }
  let items = diverse(inB, 3), tier = 'ok';
  if (items.length < 2 && cap !== Infinity){
    const near = L.filter(p => p.p > cap && p.p <= cap * 1.2).map(p => Object.assign({}, p, {over:1}));
    items = diverse(inB.concat(near), 3); tier = 'near';
  }
  if (items.length < 2) return {tier:'none', items:[]};
  return {tier, items};
}

/* ---------- Seitenkontext ---------- */
const SIZE_RE = /Durchmesser|Größe|Groesse|Breite|Höhe|Länge|Format/i;
function pageKind(){
  const t = CTX.t, pg = CTX.pg || '', c = CTX.c || '';
  if (t === 'index') return 'home';
  if (t === 'product'){ if (/^(familienwappen|modernes-wappen|dein-wunsch-wappen)$/.test(CTX.h || '')) return 'wappen'; return CTX.pz ? 'pdp' : 'pdpq'; }
  if (t === 'collection'){ if (c === 'wappen') return 'wappen'; return audByColl(c) ? 'acoll' : 'coll'; }
  if (t === 'cart') return (+CTX.n > 0) ? 'cart' : 'cartEmpty';
  if (t === 'search') return CTX.z ? 'searchZero' : 'other';
  if (t === '404') return '404';
  if (t === 'page'){
    if (/^(sendungsverfolgung|deine-bestellung)$/.test(pg)) return 'track';
    if (pg === 'fragen') return 'faq';
    if (pg === 'kontakt') return 'kontakt';
    if (/^(anfragen|dein-firmenschild)$/.test(pg)) return 'sonder';
    if (pg === 'dein-wappen') return 'wappen';
  }
  if ((t === 'article' || t === 'blog') && /ratgeber-(feuerwehr|handwerk)/.test(CTX.b || '')) return 'article';
  return 'other';
}
const visibleOne = sel => $$(sel).find(vis) || null;
async function waitFor(fn, ms){ const t0 = performance.now(); let e = fn(); while (!e && performance.now() - t0 < ms){ await w(150); e = fn(); } return e; }
function sizeFieldset(){ return $$('main fieldset, product-info fieldset, variant-selects .product-form__input').filter(vis).find(f => { const lg = $('legend, label', f); return lg && SIZE_RE.test(lg.textContent); }) || null; }
async function pdpTarget(pers){
  if (pers){ const z = await waitFor(() => visibleOne('.pplr-c-button'), 6000); if (z) return {el:z, kind:'pers'}; }
  const q = visibleOne('.pin-tiers, .smk-quantity'); if (q) return {el:q, kind:'qty'};
  const a = visibleOne('main .product-form__submit, main [name="add"], .product-form__submit'); if (a) return {el:a, kind:'atc'};
  return null;
}
function faqGroup(g){ return $(`.ft-faq-g[data-g="${g}"]`); }
function contactForm(){ return visibleOne('main form[action*="/contact"], main #ContactForm, main .contact form, main form[action*="contact"]') || visibleOne('main form'); }

/* ---------- Abläufe ---------- */
async function ensureOut(pose, how){
  if (S.out){ const was = boxOn(); await openBox(); if (!was) focusLog(); if (S.pose !== pose) await aw(setPose(pose)); return; }
  if (!boxOn()) newTurn();
  for (let i = 0; i < 150 && S.yield; i++) await w(200);
  if (!railSprite()) how = 'poof';
  let opening = null;
  if (S.mobile){ opening = openBox(); if (how !== 'leap') await aw(opening); }
  if (how === 'leap') await aw(leapOut(pose)); else await aw(poofIn(pose));
  await aw(opening || openBox());
  focusLog();
}
function hello(){
  if (S.greeted || SS.g) { S.greeted = true; return []; }
  S.greeted = true; ssUpd({g:1});
  return ['Grüß Dich! Ich bin Bruder Funke, der Mönch von Steelmonks.', 'Das hier ist meine Testversion: Ich helfe Dir mit Knöpfen, noch ohne KI.'];
}
function mainMenu(){
  choices([
    {l:'Geschenk finden', f:() => giftStep1()},
    {l:'Wo ist meine Bestellung?', f:() => orderFlow()},
    {l:'Frage stellen', f:() => faqTopics()},
    {l:'Mit Mensch sprechen', f:() => human()}
  ]);
}
async function navTo(href, cue, say){
  if (!href) return;
  if (say !== false && S.out) await speak(say || 'Ich bring Dich hin.');
  if (cue) ssUpd({cue:Object.assign({u:new URL(href, location.href).pathname}, cue)});
  clearTray(); markerOff(); spotOff();
  if (S.out) await aw(poofOut());
  closeBox();
  location.assign(href);
}
async function opener(){
  const k = pageKind();
  if (k === 'home') return giftStep1(hello());
  if (k === 'acoll'){ const a = audByColl(CTX.c); await ensureOut('sketch', 'leap'); newTurn(); await speak([...hello(), {t:`Geschenke ${a.who}, da kenn ich mich aus. Sag mir noch Dein Budget, dann zeig ich Dir die drei beliebtesten.`, emote:'bulb'}]); return budgetChips(a); }
  if (k === 'coll'){
    await ensureOut('sketch', 'leap'); newTurn();
    await speak([...hello(), {t:'Hier gibt es viel zu sehen. Soll ich Dir die drei beliebtesten aus dieser Kategorie zeigen?', emote:'?'}]);
    const here = {l:(($('main h1') || {}).textContent || 'diese Kategorie').trim(), hs:[CTX.c], who:'hier', hero:false, fx:'twinkle'};
    return choices([{l:'Ja, zeig her', f:() => budgetStep(here)}, {l:'Geschenk für jemanden', f:() => giftStep1()}, {l:'Nein danke', f:() => exitFlow()}]);
  }
  if (k === 'pdp' || k === 'pdpq') return productOpener(k === 'pdp');
  if (k === 'wappen'){
    await ensureOut('measure', 'leap'); newTurn();
    await speak([...hello(), 'Für Wappen rechnet Dir der Rechner hier auf der Seite den Preis aus. Bei Fragen zu Deiner Vorlage hilft Dir unser Team gern weiter.']);
    return choices([{l:'Mit Mensch sprechen', f:() => human()}, {l:'Schließen', f:() => exitFlow()}]);
  }
  if (k === 'cart'){
    await ensureOut('sketch', 'leap'); newTurn();
    await speak([...hello(), 'Alles drin? Wenn Du Fragen zu Versand oder Lieferzeit hast, findest Du die Antworten in unseren Versandbedingungen.']);
    return choices([{l:'Versandbedingungen', href:'/pages/versandbedingungen'}, {l:'Noch ein Geschenk finden', f:() => giftStep1()}, {l:'Mit Mensch sprechen', f:() => human()}]);
  }
  if (k === 'cartEmpty'){
    await ensureOut('sketch', 'leap'); newTurn();
    await speak([...hello(), {t:'Noch leer hier. Soll ich Dir in drei Klicks ein Geschenk raussuchen?', emote:'bulb'}]);
    return choices([{l:'Ja, gern', f:() => giftStep1()}, {l:'Nein danke', f:() => exitFlow()}]);
  }
  if (k === 'track') return orderFlow(hello());
  if (k === 'faq') return faqTopics(hello());
  if (k === 'kontakt'){
    await ensureOut('sketch', 'leap'); newTurn();
    await speak([...hello(), 'Bevor Du schreibst: Vielleicht kann ich Dir direkt helfen. Sonst ist das Formular hier genau richtig.']);
    return choices([{l:'Wo ist meine Bestellung?', f:() => orderFlow()}, {l:'Eine Frage', f:() => faqTopics()}, {l:'Sonderanfertigung', href:'/pages/anfragen', cue:{k:'sonder'}}, {l:'Zum Formular', f:() => kontaktGuide()}]);
  }
  if (k === 'sonder'){
    await ensureOut('sketch', 'leap'); newTurn();
    await speak([...hello(), {t:'Eine eigene Idee? Beschreib sie hier im Formular. Unser Team meldet sich mit einem Angebot bei Dir.', emote:'bulb'}]);
    return choices([{l:'Zeig mir das Formular', f:() => sonderGuide()}, {l:'Lieber ein fertiges Geschenk', f:() => giftStep1()}, {l:'Schließen', f:() => exitFlow()}]);
  }
  if (k === 'article'){
    const a = audBy(/feuerwehr/.test(CTX.b) ? 'Feuerwehr' : 'Handwerker');
    await ensureOut('sketch', 'leap'); newTurn();
    await speak([...hello(), {t:`Du liest über ${a.l === 'Feuerwehr' ? 'die Feuerwehr' : 'das Handwerk'}? Ich hab drei Geschenkideen, die oft bestellt werden.`, emote:'bulb'}]);
    return choices([{l:'Zeig her', f:() => budgetStep(a)}, {l:'Nein danke', f:() => exitFlow()}]);
  }
  if (k === 'searchZero'){
    await ensureOut('search', 'leap'); newTurn(); stage.querySelector('.smmk-actor').classList.add('sway');
    await speak([...hello(), {t:'Dazu finde ich nichts im Regal. Für wen suchst Du denn? Dann zeig ich Dir, was oft bestellt wird.', emote:'?'}]);
    actor.classList.remove('sway');
    return audienceChips();
  }
  if (k === '404') return notFound();
  await ensureOut('sketch', 'leap'); newTurn();
  await speak([...hello(), 'Wobei kann ich Dir helfen?']);
  mainMenu();
}
async function notFound(){
  const inl = $('.smmk-404');
  if (inl && !S.out){ const im = $('img', inl); if (im){ const r = vr(im); burst('dust', r.x + r.w / 2, r.y + r.h * .7, 26); } inl.style.visibility = 'hidden'; }
  await ensureOut('shrug', inl ? 'poof' : 'leap'); newTurn();
  await speak([...hello(), {t:'Hier ist leider nichts. Selbst mein Karton ist leer. Wonach suchst Du?', emote:'?'}]);
  choices([{l:'Geschenk finden', f:() => giftStep1()}, {l:'Frage stellen', f:() => faqTopics()}, {l:'Mit Mensch sprechen', f:() => human()}]);
}
function audienceChips(){
  choices(AUD.filter(a => a.hero).map(a => ({l:a.l, f:() => pickAudience(a)})).concat([{l:'Jemand anderes', f:() => someoneElse()}]));
}
async function giftStep1(pre){
  S.calm = false;
  await ensureOut('sketch', 'leap');
  const fc = $('#fchips');
  if (fc && vis(fc) && S.out && !S.mobile){ const fr = vr(fc); S.tilt = fr.x + fr.w / 2 > S.ax ? 8 : -8; applyTilt(); }
  await speak((pre || []).concat([{t:'Für wen suchst Du?', emote:'?'}]));
  push('sm_monk_step', {sm_step:'gift_start'});
  audienceChips();
}
async function someoneElse(pre){
  await ensureOut('sketch', 'leap');
  await speak((pre || []).concat([{t:'Für wen denn? Such Dir eine Gruppe aus.', emote:'?'}]));
  choices(AUD.filter(a => !a.hero).map(a => ({l:a.l, f:() => pickAudience(a)})).concat([{l:'Zurück', f:() => giftStep1()}]));
}
function heroChip(a){ return $$('#fchips .chip').find(c => !c.hasAttribute('data-smmk') && c.textContent.trim().toLowerCase() === a.l.toLowerCase()) || null; }
async function pickAudience(a){
  S.aud = a; S.shown = new Set(); S.pool = null;
  const chip = CTX.t === 'index' ? heroChip(a) : null;
  if (chip && vis(chip)){
    try { chip.scrollIntoView({block:'nearest', inline:'center'}); } catch (e) {}
    reveal(chip); await w(60);
    const homeX = home().x; let boxAway = false;
    if (!S.mobile && !S.reduced && !S.classic){
      const cr = vr(chip); const maxX = vpW() - 140 - 160;
      let target = Math.max(homeX, Math.min(maxX, cr.x + cr.w / 2 - 100));
      if (Math.abs(target - homeX) < 40){ target = homeX; S.tilt = cr.x + cr.w / 2 > S.ax ? 8 : -8; applyTilt(); }
      if (target - homeX > 60){ boxAway = true; await aw(folded()); box.style.visibility = 'hidden'; }
      await walkTo(target);
      if (S.facing !== 1) await paperTurn(1);
    }
    await aw(setPose('curator'));
    await laserAt(chip, {spot:false, keep:700});
    chip.click(); sfx('sparkle');
    const fig = $('#finderPx'); if (fig && vis(fig)){ const r = vr(fig); burst(a.fx, r.x + r.w / 2, r.y + r.h * .6, 18); }
    await w(500); clearLaser();
    if (!S.mobile && !S.reduced && !S.classic && S.ax !== homeX){ await aw(setPose('sketch', {dust:false})); await walkTo(homeX); await paperTurn(1); }
    else await aw(setPose('sketch'));
    box.classList.remove('away');
    if (boxAway){ box.getAnimations().forEach(x => x.cancel()); box.style.visibility = ''; await aw(unfolded()); }
    S.tilt = 0; applyTilt();
    await speak({t:(a.l === 'Feuerwehr' ? 'Feuerwehr, da kenn ich mich aus.' : a.l + ', gute Wahl.') + ' Oben siehst Du schon die Favoriten.', emote:'bulb'});
  } else {
    await ensureOut('sketch', 'poof');
    await speak({t:(a.l === 'Feuerwehr' ? 'Feuerwehr, da kenn ich mich aus.' : a.l + ', gute Wahl.'), emote:'bulb'});
  }
  return budgetStep(a, true);
}
async function budgetStep(a, noPre){
  S.aud = a; await ensureOut('sketch', 'poof');
  await speak('Und was darf es ungefähr kosten?');
  budgetChips(a);
}
function budgetChips(a){
  S.aud = a;
  choices([{l:'bis 30 €', f:() => cardsFlow(a, '30')}, {l:'bis 60 €', f:() => cardsFlow(a, '60')}, {l:'darf mehr sein', f:() => cardsFlow(a, 'mehr')}]);
}
async function cardsFlow(a, budget){
  S.aud = a; S.budget = budget; S.calm = false;
  push('sm_monk_step', {sm_step:'gift_cards', sm_audience:a.l, sm_budget:budget});
  await ensureOut('sketch', 'poof');
  actor.classList.add('sway'); await aw(setPose('search'));
  let pool = null, err = null;
  const t0 = performance.now();
  const job = (S.pool && S.pool.a === a) ? Promise.resolve(S.pool.list) : loadPool(a.hs);
  job.catch(() => {});
  try {
    await speak({t:'Moment, ich schau ins Regal.', emote:'…', emoteMs:900, minMs:500});
    pool = await aw(job);
  } catch (e){ if (e === ABORT) throw e; err = e; }
  if (performance.now() - t0 < 500) await w(500 - (performance.now() - t0));
  actor.classList.remove('sway');
  if (err || !pool){
    await aw(setPose('shrug')); emote('sweat', 2000);
    await speak('Das Regal klemmt gerade. Schau gern direkt in die Kollektion, da findest Du alles.');
    return choices([{l:'Zur Kollektion', href:'/collections/' + a.hs[0]}, {l:'Zurück', f:() => giftStep1()}]);
  }
  S.pool = {a, list:pool};
  const res = pick(pool, budget);
  if (res.tier === 'none'){
    await aw(setPose('shrug')); emote('sweat', 2000);
    await speak('Dafür finde ich nichts Fertiges. Zwei Ideen: ein Gutschein, bei dem Du den Betrag selbst wählst, oder eine Sonderanfertigung nach Deiner Idee.');
    return choices([{l:'Gutschein verschenken', href:'/products/steelmonks-geschenkgutschein'}, {l:'Sonderanfertigung', href:'/pages/anfragen', cue:{k:'sonder'}}, {l:'Anderes Budget', f:() => budgetStep(a)}]);
  }
  await aw(setPose('sketch'));
  const hd = headPoint(); burst('twinkle', hd.x, hd.y + 30, 24); sfx('sparkle');
  const top = res.items[0] && +res.items[0].n >= 100;
  await speak({t:(res.tier === 'near' ? 'Eins liegt knapp über Deinem Budget, ist aber der Favorit. ' : '') + (a.who === 'hier' ? (top ? 'Das wird hier am häufigsten bestellt:' : 'Das passt gut:') : (top ? `Das bestellen die meisten ${a.who}:` : `Das passt gut ${a.who}:`)), emote:'bulb'});
  burst(a.fx, S.ax, S.ay - 80, 12);
  await dealCards(res.items);
  cardLinks(a);
}
function cardLinks(a){
  const host = (!S.mobile && $('.tlinks', trayEl) && trayEl.style.display !== 'none') ? $('.tlinks', trayEl) : choicesEl;
  choices([
    {l:'Andere Vorschläge', link:1, f:async () => {
      const res = pick(S.pool ? S.pool.list : [], S.budget);
      if (res.tier === 'none'){ await speak('Mehr hab ich in dem Budget gerade nicht. In der ganzen Kollektion findest Du alles.'); return choices([{l:'Zur Kollektion', href:'/collections/' + a.hs[0]}, {l:'Anderes Budget', f:() => budgetStep(a)}, {l:'Andere Gruppe', f:() => giftStep1()}]); }
      await speak(res.tier === 'near' ? 'Eins liegt knapp über Deinem Budget, ist aber beliebt.' : 'Hier sind noch ein paar, die oft bestellt werden.');
      await dealCards(res.items); cardLinks(a);
    }},
    {l:'Alle ansehen', link:1, href:'/collections/' + a.hs[0], say:'Ich bring Dich zur ganzen Kollektion.'},
    {l:'Eigene Idee? Sonderanfertigung', link:1, href:'/pages/anfragen', cue:{k:'sonder'}, say:'Für eigene Ideen gibt es unsere Sonderanfertigung. Ich bring Dich hin.'},
    {l:'Gutschein verschenken', link:1, href:'/products/steelmonks-geschenkgutschein', say:'Ein Gutschein geht immer. Den Betrag wählst Du selbst.'}
  ], {focus:false, host});
  const b = $$('.smmk-show', stage).find(x => !x.disabled && x.offsetParent !== null);
  if (b) try { b.focus({preventScroll:true}); } catch (e) {}
}
function showIt(p, btn){
  $$('.smmk-show', stage).forEach(b => { b.disabled = true; });
  push('sm_monk_step', {sm_step:'show_product', sm_handle:p.h});
  newTurn('Du: Zeig es mir');
  go(() => navTo(p.u, {k:'pdp', h:p.h, z:p.z, t:p.t}, 'Ich bring Dich hin.'));
}
async function productOpener(pers){
  await ensureOut('sketch', 'leap'); newTurn();
  if (pers){
    await speak([...hello(), {t:'Dieses Stück wird mit Deinem Wunschtext graviert. Soll ich Dir zeigen, wo Du ihn eingibst?', emote:'bulb'}]);
    const c = [{l:'Ja, zeig es mir', f:() => pdpGuide(true)}];
    if (sizeFieldset()) c.push({l:'Welche Größe passt?', f:() => sizeAnswer()});
    c.push({l:'Wann kommt es an?', f:() => whenAnswer()}, {l:'Was anderes suchen', f:() => giftStep1()});
    return choices(c);
  }
  await speak([...hello(), {t:'Den gibt es ohne Gravur, direkt zum Bestellen. Brauchst Du mehrere, zum Beispiel für den ganzen Verein? Die Menge wählst Du direkt hier.', emote:'bulb'}]);
  return choices([{l:'Zeig mir, wo', f:() => pdpGuide(false)}, {l:'Versand und Lieferzeit', f:() => whenAnswer()}, {l:'Was anderes suchen', f:() => giftStep1()}]);
}
async function pdpGuide(pers, fromCue){
  if (fromCue) await ensureOut('curator', 'poof'); else { await ensureOut('sketch', 'poof'); await aw(setPose('curator')); }
  if (fromCue) newTurn();
  const tg = await pdpTarget(pers);
  if (!tg){ await aw(setPose('sketch')); await speak('Da bist Du. Hier oben findest Du alles zum Produkt.'); return productChips(pers); }
  markerOn(tg.el);
  await laserAt(tg.el, {spot:true, keep:2200});
  if (tg.kind === 'pers') await speak('Hier klickst Du auf Jetzt personalisieren und gibst Deinen Text ein. Die Vorschau siehst Du sofort.');
  else if (tg.kind === 'qty') await speak('Hier wählst Du die Menge und legst es in den Warenkorb.');
  else await speak('Hier legst Du es in den Warenkorb.');
  productChips(pers);
}
function productChips(pers){
  const c = [];
  if (sizeFieldset()) c.push({l:'Welche Größe passt?', f:() => sizeAnswer(pers)});
  c.push({l:'Wann kommt es an?', f:() => whenAnswer(pers)}, {l:'Was anderes suchen', f:() => { markerOff(); spotOff(); return giftStep1(); }}, {l:'Danke', f:() => exitFlow()});
  choices(c);
}
async function sizeAnswer(pers){
  spotOff(); markerOff(); await ensureOut('measure', 'poof'); await aw(setPose('measure'));
  const fs = sizeFieldset();
  if (!fs){ await speak('Dieses Stück gibt es nur in einer Größe.'); return productChips(pers); }
  const lg = ($('legend, label', fs).textContent || 'Größe').trim().split('\n')[0].trim();
  const sel = $('input:checked + label', fs) || fs;
  await laserAt(fs, {spot:true, keep:2000, aim:sel});
  await speak(`Die Größe wählst Du hier bei ${lg}. Der Preis passt sich direkt an, so siehst Du sofort, was welche Größe kostet.`);
  productChips(pers);
}
async function whenAnswer(pers){
  spotOff(); markerOff(); await ensureOut('sketch', 'poof'); await aw(setPose('sketch'));
  await speak('Wir fertigen jedes Stück selbst in unserer Werkstatt. Wie lange Fertigung und Versand gerade dauern und was der Versand kostet, steht in unseren Versandbedingungen.');
  const c = [{l:'Versandbedingungen', href:'/pages/versandbedingungen'}];
  if (CTX.t === 'product') c.push({l:'Zurück zum Produkt', f:async () => { await speak('Klar. Was möchtest Du noch wissen?'); productChips(pers === undefined ? !!CTX.pz : pers); }});
  else c.push({l:'Andere Frage', f:async () => { await speak('Wobei kann ich Dir helfen?'); mainMenu(); }});
  choices(c);
}
/* Bestellung: ruhiger Modus, die Testversion kann noch nicht nachschauen */
async function orderFlow(pre){
  S.calm = true; markerOff(); spotOff();
  push('sm_monk_step', {sm_step:'order'});
  await ensureOut('pc', 'leap'); await aw(setPose('pc'));
  await speak((pre || []).concat(['Ich helfe Dir gern. In meiner Testversion kann ich Bestellungen aber noch nicht selbst nachschauen.']));
  const onTrack = pageKind() === 'track';
  if (onTrack){
    const acc = visibleOne('main details') || visibleOne('main .accordion__item');
    if (acc){ await aw(setPose('curator')); await laserAt(acc, {spot:true, dim:false, keep:1600}); }
    await speak('Hier unten beantworten wir die häufigsten Fragen zu Sendungsnummer und Versand. Und unser Team schaut gern persönlich nach.');
    return choices([{l:'Kontakt', href:'/pages/kontakt', cue:{k:'kontakt'}, say:'Ich bring Dich zum Kontaktformular.'}, {l:'Andere Frage', f:async () => { S.calm = false; await aw(setPose('sketch')); await speak('Klar. Worum geht es?'); mainMenu(); }}, {l:'Danke', f:() => exitFlow()}]);
  }
  await speak('Auf der Seite Sendungsverfolgung findest Du die Antworten zu Sendungsnummer und Versand. Und unser Team schaut gern persönlich nach.');
  choices([{l:'Zur Sendungsverfolgung', href:'/pages/sendungsverfolgung', say:'Ich bring Dich hin.'}, {l:'Kontakt', href:'/pages/kontakt', cue:{k:'kontakt'}, say:'Ich bring Dich zum Kontaktformular.'}, {l:'Andere Frage', f:async () => { S.calm = false; await aw(setPose('sketch')); await speak('Klar. Worum geht es?'); mainMenu(); }}]);
}
/* FAQ: Themen führen zur FAQ-Seite und markieren dort die passende Gruppe */
const FAQ = [['Versand und Lieferzeit', 'Versand'], ['Bestellung und Bezahlung', 'Bestellung'], ['Material und Produkte', 'Produkte'], ['Montage', 'Montage'], ['Rückgabe', 'Rückgabe']];
async function faqTopics(pre){
  S.calm = false;
  await ensureOut('sketch', 'leap');
  await speak((pre || []).concat([pageKind() === 'faq' ? 'Frag mich einfach. Ich such Dir die Antwort raus.' : 'Worum geht es? Ich bring Dich zu den passenden Antworten.']));
  choices(FAQ.map(([l, g]) => ({l, f:() => faqShow(g, l)})).concat([{l:'Mit Mensch sprechen', f:() => human()}]));
}
async function faqShow(g, label, fromCue){
  if (pageKind() !== 'faq') return navTo('/pages/fragen', {k:'faq', g, l:label}, 'Ich bring Dich zu den Antworten.');
  if (fromCue){ await ensureOut('search', 'poof'); newTurn(); }
  push('sm_monk_step', {sm_step:'faq', sm_topic:g});
  actor.classList.add('sway'); await aw(setPose('search'));
  await speak({t:'Ich blätter kurz nach.', emote:'…', emoteMs:900, minMs:500});
  actor.classList.remove('sway');
  const chip = $(`#ftFaqC [data-fc="${g}"]`); if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
  await w(120);
  const grp = faqGroup(g);
  await aw(setPose(S.mobile ? 'sketch' : 'curator'));
  if (!grp){ await speak('Die Gruppe finde ich gerade nicht. Schau gern in die Liste hier auf der Seite.'); return faqAfter(); }
  const det = $('details', grp); if (det) det.open = true;
  await laserAt(grp, {spot:true, dim:false, keep:1400});
  const q = det ? ($('summary', det).textContent || '').trim() : '';
  await speak({t:`Hier sind unsere Antworten zu ${label || g}.` + (q ? ` Die erste Frage hab ich Dir schon aufgeklappt: „${q}“` : ''), emote:'bulb'});
  await speak('Hat das geholfen?');
  faqAfter();
}
function faqAfter(){
  choices([
    {l:'Ja, danke', f:async () => { spotOff(); await aw(setPose('sketch')); emote('heart', 1600); await speak('Freut mich! Wenn noch was ist, frag einfach.'); choices([{l:'Andere Frage', f:() => faqTopics()}, {l:'Schließen', f:() => exitFlow()}]); }},
    {l:'Andere Frage', f:() => { spotOff(); return faqTopics(); }},
    {l:'Nein, ich frag das Team', f:() => { spotOff(); return human(); }}
  ]);
}
async function human(){
  S.calm = true; markerOff(); spotOff();
  push('sm_monk_step', {sm_step:'human'});
  if (pageKind() === 'kontakt') return kontaktGuide();
  await ensureOut('sketch', 'poof'); await aw(setPose('sketch'));
  await speak('Unser Team hilft Dir gern persönlich und antwortet innerhalb von zwei Werktagen. Ich bring Dich zur Kontaktseite.');
  await w(300);
  return navTo('/pages/kontakt', {k:'kontakt'}, false);
}
async function kontaktGuide(fromCue){
  S.calm = true;
  await ensureOut('sketch', fromCue ? 'poof' : 'leap'); if (fromCue) newTurn();
  const f = contactForm();
  if (f){ await aw(setPose('curator')); await laserAt(f, {spot:true, dim:false, keep:1600}); }
  await speak(f ? 'Hier schreibst Du unserem Team. Wir antworten innerhalb von zwei Werktagen.' : 'Auf dieser Seite erreichst Du unser Team. Wir antworten innerhalb von zwei Werktagen.');
  S.calm = false;
  choices([{l:'Danke', f:() => exitFlow()}, {l:'Doch lieber ein Geschenk finden', f:() => giftStep1()}]);
}
async function sonderGuide(fromCue){
  await ensureOut('sketch', fromCue ? 'poof' : 'leap'); if (fromCue) newTurn();
  const f = visibleOne('#saForm') || visibleOne('main form');
  if (f){ await aw(setPose('curator')); await laserAt(f, {spot:true, dim:false, keep:1600}); }
  await speak(f ? 'Hier beschreibst Du Deine Idee. Ein Foto oder eine Skizze hilft unserem Team sehr.' : 'Auf dieser Seite beschreibst Du Deine Idee, unser Team meldet sich mit einem Angebot.');
  choices([{l:'Danke', f:() => exitFlow()}, {l:'Lieber ein fertiges Geschenk', f:() => giftStep1()}]);
}
/* Item get: nach einem Klick auf den Mönch landet etwas im Warenkorb */
let floatTile = null, pendingGet = null;
/* Bilder aus /cart.js zeigen auf cdn.shopify.com: auf den eigenen /cdn/shop-Pfad umschreiben, damit nichts an Dritte geht */
function sameOrigin(u){ u = String(u || '').replace(/^(https?:)?\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\/\d+\//, '/cdn/shop/'); return /^\//.test(u) && !/^\/\//.test(u) ? u + (u.includes('?') ? '&' : '?') + 'width=160' : ''; }
function realCount(cart){ return (cart.items || []).filter(i => !HELPER_TYPE.test(i.product_type || '') && !HELPER_HANDLE.test(i.handle || '')).reduce((s, i) => s + (i.quantity || 0), 0); }
let cartT = 0, cartBusy = false;
function cartSoon(){ if (!S.used) return; clearTimeout(cartT); cartT = setTimeout(checkCart, 700); }
async function checkCart(){
  if (cartBusy) return cartSoon(); cartBusy = true;
  try {
    const c = await (await fetch('/cart.js', {credentials:'same-origin', cache:'no-store'})).json();
    const rc = realCount(c), prev = ssRead().rb;
    ssUpd({rb:rc, nb:c.item_count});
    if (prev != null && rc > prev){
      const recs = SS.recs || [];
      const it = (c.items || []).find(i => recs.includes(i.handle)) || (c.items || []).find(i => !HELPER_TYPE.test(i.product_type || '') && !HELPER_HANDLE.test(i.handle || ''));
      pendingGet = {img:it && it.image ? it.image : '', rec:!!(it && recs.includes(it.handle))};
      waitAndCelebrate();
    }
  } catch (e) {} finally { cartBusy = false; }
}
let celebrating = false;
async function waitAndCelebrate(){
  if (celebrating) return; celebrating = true;
  for (let i = 0; i < 600 && (S.yield || blockedNow()); i++) await sleep(200);
  celebrating = false;
  if (!pendingGet) return;
  const g = pendingGet; pendingGet = null;
  build(); go(() => itemGet(g));
}
async function itemGet(g){
  S.calm = false; spotOff(); markerOff();
  push('sm_monk_step', {sm_step:'item_get', sm_recommended:g.rec ? 1 : 0});
  await ensureOut(S.out ? S.pose : 'sketch', 'poof'); newTurn();
  await aw(setPose('chest'));
  const hd = headPoint();
  if (floatTile){ floatTile.remove(); floatTile = null; }
  const tx = R(hd.x - 39), ty0 = R(S.ay - 120 * sc() * 2 * .45), ty1 = R(hd.y - 132);
  if (!S.classic && g.img){ floatTile = h('div', 'smmk-floaty', `<img alt="" src="${esc(sameOrigin(g.img))}">`); stage.append(floatTile); floatTile.style.transform = `translate(${tx}px,${ty1}px)`; }
  if (!S.reduced && floatTile) anim(floatTile, [{transform:`translate(${tx}px,${ty0}px) scale(.3)`, opacity:0}, {transform:`translate(${tx}px,${ty1}px) scale(1)`, opacity:1}], {duration:600, easing:'steps(6,end)'});
  sfx('sparkle');
  for (let i = 0; i < 4; i++) burst('confetti', S.ax + (i - 1.5) * 50, hd.y - 80, 34);
  burst('twinkle', tx + 39, ty1 + 20, 12);
  emote('heart', 2600);
  await speak(g.rec ? 'Gute Wahl! Das wird ein schönes Geschenk.' : 'Gute Wahl! Liegt im Warenkorb.');
  const onCart = CTX.t === 'cart';
  choices([
    onCart ? {l:'Weiter stöbern', f:() => exitFlow()} : {l:'Zum Warenkorb', f:() => openCart()},
    {l:'Noch ein Geschenk finden', f:async () => { if (floatTile){ floatTile.remove(); floatTile = null; } await aw(setPose('sketch')); return giftStep1(); }},
    {l:onCart ? 'Danke' : 'Weiter stöbern', f:() => exitFlow()}
  ]);
}
async function openCart(){
  if (floatTile){ floatTile.remove(); floatTile = null; }
  const dr = $('cart-drawer');
  if (dr && typeof dr.open === 'function' && !S.mobile){ await exitFlow(); dr.open(); return; }
  return navTo('/cart', null, 'Ich bring Dich hin.');
}
/* Abgang */
async function exitFlow(){
  spotOff(); markerOff(); clearLaser(); clearTray(); steamOff();
  if (floatTile){ floatTile.remove(); floatTile = null; }
  if (!S.out){ closeBox(); S.active = false; return; }
  newTurn(); S.calm = false;
  if (S.pose !== 'sketch' && S.pose !== 'rail') await aw(setPose('sketch', {dust:false}));
  emote('note', 900);
  closeBox();
  await aw(leapBack());
  S.idleState = null; S.active = false; setYield('');
  const tr = S.trigger && S.trigger.isConnected && vis(S.trigger) ? S.trigger : $$('[data-smmk="open"]').find(vis);
  if (tr) try { tr.focus({preventScroll:true}); } catch (e) {}
  const inl = $('.smmk-404'); if (inl) inl.style.visibility = '';
}

/* ---------- Leerlauf: Kaffee, dann Zzz ---------- */
let steamE = null;
function steamOn(){ steamOff(); steamE = emitter('steam', () => { if (S.pose !== 'coffee' || !S.out) return null; const s = poseScale('coffee'); return {x:S.ax + (148 - 110) * s * S.facing, y:S.ay + (175 - 418) * s}; }, .18); }
function steamOff(){ if (steamE) stopEmitter(steamE); steamE = null; }
function idleCheck(){
  if (!S.out || S.busy || S.typing || S.hidden || S.yield || S.calm || S.anims > 0 || spotState) return;
  const idle = performance.now() - S.lastInput;
  if (idle >= 20000 && !S.idleState){ S.idleState = 'coffee'; S.prevPose = S.pose; emote(null); setPose('coffee'); steamOn(); }
  else if (idle >= 80000 && S.idleState === 'coffee'){ S.idleState = 'zzz'; emote('zzz', 0); }
}
function wake(){
  S.lastInput = performance.now();
  if (S.idleState){ const back = S.prevPose && S.prevPose !== 'coffee' ? S.prevPose : 'sketch'; S.idleState = null; emote(null); steamOff(); setPose(back); emote('!', 900); }
}

/* ---------- Andere Ebenen haben Vorrang: Warenkorb, Menü, Newsletter, Zepto, Cookie-Banner ---------- */
function cookieBanner(){
  const b = $('.pd-cookie-banner-window'); if (!b) return null;
  const s = getComputedStyle(b); const r = b.getBoundingClientRect();
  return (s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && r.height > 0 && !b.classList.contains('cc-invisible')) ? b : null;
}
function blockedNow(){
  const de = d.documentElement, bd = d.body;
  if (bd.classList.contains('overflow-hidden') || de.classList.contains('overflow-hidden') || de.classList.contains('smnl-open')) return 'layer';
  const mob = $('#smmMob'); if (mob && !mob.hidden) return 'layer';
  const dr = $('cart-drawer'); if (dr && dr.classList.contains('active')) return 'layer';
  const z = $$('.pplr_crop-modal, #pplr_myModal').find(e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getBoundingClientRect().height > 0; }); if (z) return 'layer';
  if (cookieBanner()) return 'cookie';
  if ($$('dialog[open]').some(vis)) return 'layer';
  return '';
}
function poll(){
  if (!built) return;
  const nl = calcLift();
  if (nl !== S.lift){
    S.lift = nl; stage.style.setProperty('--lift', nl + 'px');
    if (S.out && S.anims <= 0){ const hm = home(); placeActor(hm.x, hm.y); }
    if (trayEl.style.display !== 'none' && !S.mobile) placeTray();
  }
  const why = (S.out || boxOn() || S.active) ? blockedNow() : '';
  setYield(why);
  if (qmTarget) placeMarker();
}
function setYield(why){
  const on = !!why;
  if (on !== S.yield){
    S.yield = on;
    stage.classList.toggle('smmk-yield', on);
    if (on){ spotOff(); if (qmEl) qmEl.style.visibility = 'hidden'; }
    else if (S.out && !S.reduced) anim(sqEl, [{transform:'translateY(0)'}, {transform:'translateY(-10px)'}, {transform:'translateY(0)'}], {duration:240, easing:'steps(3,end)'});
    sheetCheck();
  }
  dockEl.classList.toggle('on', on && (S.out || boxOn() || S.active));
  dockSay.classList.toggle('on', why === 'cookie');
  if (why === 'cookie') dockSay.textContent = 'Wähl erst kurz Deine Cookies, dann bin ich gleich da.';
}

/* ---------- Bedienung ---------- */
let kbSwallow = null;
function bind(){
  box.addEventListener('click', e => { if (e.target.closest('button,input,textarea,a,form,select')) return; if (S.typing) S.skip = true; else advanceNow(); });
  $$('.smmk-tools button', stage).forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.tool;
    if (t === 'close') go(() => exitFlow());
    if (t === 'sound') setSound(!S.sound);
    if (t === 'menu'){ if (!menuEl.hidden) return closeMenu(true); menuEl.hidden = false; b.setAttribute('aria-expanded', 'true'); $('button', menuEl).focus(); }
  }));
  $$('button', menuEl).forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.m; closeMenu(m !== 'human');
    if (m === 'sound') setSound(!S.sound);
    if (m === 'motion'){ S.reduced = !S.reduced; stage.classList.toggle('rm', S.reduced); d.documentElement.classList.toggle('smmk-rm', S.reduced); if (S.reduced) fxClear(); }
    if (m === 'classic'){ S.classic = !S.classic; stage.classList.toggle('classic', S.classic); if (S.classic){ fxClear(); clearLaser(); } placeShadow(S.ax, S.ay, S.out); }
    if (m === 'human'){ newTurn('Du: Mit Mensch sprechen'); go(() => human()); }
  }));
  dockEl.addEventListener('click', () => { dockSay.classList.add('on'); if (!cookieBanner()) dockSay.textContent = 'Ich warte, bis das Fenster zu ist.'; });
  d.addEventListener('keydown', e => {
    if (!S.out && !boxOn()) return;
    S.lastInput = performance.now(); if (S.idleState) wake();
    if (e.key === 'Escape'){
      if (S.yield) return;
      if (spotState || qmTarget){ spotOff(); markerOff(); return; }
      if (!menuEl.hidden){ closeMenu(true); return; }
      if (S.out || boxOn()) go(() => exitFlow());
      return;
    }
    const ae = d.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && (S.typing || S.waitAdv) && !(ae && ae.closest && ae.closest('#smMonk, input, textarea, select'))){
      e.preventDefault(); kbSwallow = e.key; if (S.typing) S.skip = true; else advanceNow(); return;
    }
    const inCh = ae && ae.closest && (ae.closest('.smmk-choices, .smmk-tray .tlinks') || ae.matches('.smmk-show'));
    if (inCh && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)){
      const bs = $$('.smmk-show', stage).filter(b => !b.disabled && b.offsetParent !== null).concat(allChoices().filter(b => !b.disabled));
      const i = bs.indexOf(ae); if (i < 0) return;
      const n = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
      bs[n].focus(); e.preventDefault(); return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && boxOn() && (ae === box || ae === bbody || ae === d.body)){
      if (S.typing){ S.skip = true; e.preventDefault(); } else if (S.waitAdv){ advanceNow(); e.preventDefault(); }
    }
  });
  d.addEventListener('keyup', e => { if (kbSwallow && e.key === kbSwallow){ e.preventDefault(); kbSwallow = null; } });
  ['pointerdown', 'wheel', 'touchstart'].forEach(ev => d.addEventListener(ev, () => { S.lastInput = performance.now(); if (S.idleState) wake(); }, {passive:true, capture:true}));
  d.addEventListener('pointerdown', e => { if (spotState && performance.now() - spotState.t > 250 && !e.target.closest('#smMonk')){ spotOff(); } if (qmTarget && !e.target.closest('#smMonk') && e.target.closest('a,button,input,label,select')) markerOff(); }, true);
  let tiltRaf = 0, px = 0, lastMove = 0;
  d.addEventListener('pointermove', e => {
    if (performance.now() - lastMove > 400){ S.lastInput = performance.now(); if (S.idleState) wake(); }
    lastMove = performance.now();
    if (S.mobile || S.reduced || !S.out) return; px = e.clientX;
    if (!tiltRaf) tiltRaf = requestAnimationFrame(() => { tiltRaf = 0; if (S.anims > 0 && actor.getAnimations().length) return; S.tilt = Math.max(-8, Math.min(8, (px - S.ax) / vpW() * 24)); applyTilt(); });
  }, {passive:true});
  let lastTop = scrollY, lagRaf = 0;
  addEventListener('scroll', () => {
    const dy = scrollY - lastTop; lastTop = scrollY;
    if (spotState && performance.now() - spotState.t > 300) spotOff();
    if (qmTarget) placeMarker();
    if (S.mobile || S.reduced || !S.out) return;
    S.lag = Math.max(-8, Math.min(8, S.lag - dy * .35));
    if (!lagRaf) lagRaf = requestAnimationFrame(function spring(){ S.lag *= .82; if (Math.abs(S.lag) < .5) S.lag = 0; lagEl.style.transform = `translateY(${R(S.lag)}px)`; lagRaf = S.lag ? requestAnimationFrame(spring) : 0; });
  }, {passive:true});
  new ResizeObserver(() => { sheetCheck(); rideSheet(); if (!S.mobile && $('.smmk-card', trayEl)) placeTray(); }).observe(box);
  addEventListener('resize', applyViewport);
  d.addEventListener('visibilitychange', () => {
    S.hidden = d.hidden;
    d.getAnimations().forEach(a => { try { if (a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#smMonk')){ if (S.hidden) a.pause(); else a.play(); } } catch (e) {} });
    if (!S.hidden) fxRun();
  });
  try { mqRM.addEventListener('change', () => { S.reduced = mqRM.matches; stage.classList.toggle('rm', S.reduced); }); } catch (e) {}
  setInterval(idleCheck, 500);
  setInterval(poll, 400);
}
function setSound(on){ S.sound = on; if (on) ac(); $$('.smmk-tools [data-tool=sound]', stage).forEach(b => b.setAttribute('aria-pressed', String(S.sound))); }
function applyViewport(){
  const was = S.mobile; S.mobile = innerWidth < 750;
  stage.classList.toggle('m', S.mobile);
  fxResize(); S.lift = calcLift(); stage.style.setProperty('--lift', S.lift + 'px');
  if (S.out){ applyPoseGeom(S.pose); const hm = home(); placeActor(hm.x, hm.y); }
  sheetCheck();
  if (was !== S.mobile) clearTray();
}

/* ---------- Öffentliche Schnittstelle für den Loader ---------- */
function start(intent, el){
  build(); S.active = true; poll();
  if (!S.used){ S.used = true; SS = ssRead(); ssUpd({u:1}); if (SS.rb == null) checkCart(); push('sm_monk_open', {sm_entry:intent}); }
  if (el && el.nodeType === 1) S.trigger = el;
  S.lastInput = performance.now();
  const mob = $('#smmMob'); if (mob && !mob.hidden){ const x = $('.mob-x', mob); if (x) x.click(); }
  const k = String(intent || 'open');
  if (k === 'resume') return resume();
  if (k === 'open' && (S.out || boxOn())){ go(() => exitFlow()); return; }
  go(async () => {
    if (k === 'gift' || k === 'geschenk'){ await ensureOut('sketch', 'leap'); newTurn(); return giftStep1(hello()); }
    if (k === 'someone'){ await ensureOut('sketch', 'leap'); newTurn(); return someoneElse(hello()); }
    if (k === 'order' || k === 'bestellung'){ await ensureOut('pc', 'leap'); newTurn(); return orderFlow(hello()); }
    if (k === 'faq'){ await ensureOut('sketch', 'leap'); newTurn(); return faqTopics(hello()); }
    if (k === 'product'){ return productOpener(!!CTX.pz); }
    if (k === '404'){ return notFound(); }
    if (k === 'human'){ await ensureOut('sketch', 'leap'); newTurn(); return human(); }
    return opener();
  });
}
function resume(){
  const st = ssRead(); SS = st;
  const cue = st.cue; if (cue) ssUpd({cue:null});
  if (cue && cue.u === location.pathname){
    S.greeted = true;
    go(async () => {
      await sleep(400);
      for (let i = 0; i < 40 && blockedNow() === 'cookie'; i++) await sleep(250);
      if (cue.k === 'pdp') return pdpGuide(!!(cue.z && CTX.pz !== 0), true);
      if (cue.k === 'faq') return faqShow(cue.g, cue.l, true);
      if (cue.k === 'kontakt') return kontaktGuide(true);
      if (cue.k === 'sonder') return sonderGuide(true);
    });
    return;
  }
  checkCart();
}
window.SMMK = {open:start, version:'test-1', state:() => ({out:S.out, pose:S.pose, ax:S.ax, ay:S.ay, home:built ? home() : null, lift:S.lift, yield:S.yield, mobile:S.mobile, busy:S.busy, typing:S.typing, anims:built ? actor.getAnimations().map(a => a.playState) : []})};
const q = window.smMonkQ; window.smMonkQ = {push:a => start(a[0], a[1])};
if (Array.isArray(q)) q.forEach(a => start(a[0], a[1]));
d.addEventListener('sm:cart-changed', cartSoon);
try { if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') subscribe(PUB_SUB_EVENTS.cartUpdate, cartSoon); } catch (e) {}
})();
