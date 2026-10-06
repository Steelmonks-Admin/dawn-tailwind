/* Bruder Funke. Lädt erst nach einem Klick auf einen Mönch-Einstieg (Loader in snippets/sm-monk.liquid).
   Ohne KI-Adresse (Theme-Einstellung sm_monk_ai_url) ist alles geskriptet: Knöpfe, echte Shopdaten aus
   /collections/<handle>?view=moench, keine Anfragen an Dritte.
   KI-Modus (Abschnitt "KI-Modus" unten): die geskripteten Abläufe bleiben, dazu Freitext, Bestellstatus und die Weitergabe
   an das Team über den cs-assistant (/assistant/v1). Server- und Modelltext erscheint nur als Text (textContent), Links nur
   nach Prüfung (safeHref), Navigation nur nach einem Klick.
   Speicher: nur sessionStorage "smMonk", und erst nach einem Klick (Deep Links: erst nach der ersten Eingabe im Mönch).
   Der Testcode liegt getrennt in sessionStorage "smMonkTc" (vom Loader). Eingaben in Formularen werden nie gespeichert. */
(function () {
'use strict';
if (window.SMMK) return;
const d = document, CT = d.getElementById('smMonkCtx');
if (!CT) return;
let CTX = {};
try { CTX = JSON.parse(CT.textContent); } catch (e) { return; }

/* ---------- Einstellungen ---------- */
// Der Tag "internal production" steuert nur die Fertigung und steht auf sichtbaren Bestsellern (Signet Anhänger,
// Zunftanhänger, Eisernes Kreuz). Darum wird er NICHT ausgefiltert. Schalter bleibt für den Fall, dass sich das ändert.
const HIDE_INTERNAL_TAG = false;
const HELPER_TYPE = /^(Meilenstein|PPLR_HIDDEN_PRODUCT|Befestigungsset|Versand|Sonderanfertigung|Gravur|Gift Cards|Geschenkverpackung)$/;
const HELPER_HANDLE = /gratisversand|10-discount|mystery-geschenk|item-personalization|gravur|zusaetzlich|zusatzlich|zusatsliche|befestigung|geschenkt|ewige-rose/;

/* ---------- Posen: Quellgröße, Fuß (fx, fy), Kopf (hx, hy), Hand (ax, ay) ---------- */
const POSES = {
  sketch:  {w:410,h:420,fx:214,fy:406,hx:203,hy:7,  ax:336,ay:186},
  search:  {w:232,h:420,fx:115,fy:418,hx:129,hy:4,  ax:150,ay:120},
  curator: {w:415,h:420,fx:110,fy:377,hx:97, hy:95, ax:250,ay:152, cw:256},
  measure: {w:420,h:410,fx:157,fy:401,hx:150,hy:62, ax:220,ay:150},
  pc:      {w:353,h:420,fx:101,fy:418,hx:101,hy:5,  ax:200,ay:250},
  shrug:   {w:352,h:420,fx:144,fy:418,hx:144,hy:4,  ax:220,ay:200},
  coffee:  {w:238,h:420,fx:110,fy:418,hx:110,hy:4,  ax:150,ay:150},
  chest:   {w:350,h:420,fx:175,fy:418,hx:175,hy:30, ax:175,ay:120},
  rail:    {w:66, h:120,fx:33, fy:119,hx:33, hy:2,  ax:40, ay:40, mini:1}
};
const ASSETS = {sketch:'sm-px4_monk_sketch.webp', search:'sm-px3_monk_search.webp', curator:'sm-px4_monk_curator.webp', measure:'sm-px4_monk_measure.webp', pc:'sm-px2_monk_pc.webp',
  shrug:'sm-px3_monk_shrug.webp', coffee:'sm-px3_monk_coffee.webp', chest:'sm-px2_chest.webp', lupe:'sm-pxm_lupe.webp'};
const asset = k => (k === 'rail' ? S.railSrc : (CTX.ab || '') + (ASSETS[k] || ''));
/* Gleiche Körperhöhe in jeder Pose: (fy - hy) x bodyScale entspricht den 399 Quellpixeln der Skizze */
Object.keys(POSES).forEach(k => { const p = POSES[k]; p.bs = p.mini ? 1 : Math.max(1, Math.min(1.45, 399 / Math.max(1, p.fy - p.hy))); });
/* Kurator ohne Galerie: nur Mönch, Hand und Zeigestab bleiben sichtbar (Quellpixel, umgerechnet in Prozent von 415 x 420).
   Enger als der erste Entwurf, damit kein Streifen von Rahmen und Pfosten stehen bleibt. */
const CURATOR_CLIP = 'polygon(' + [[0,0],[145,0],[145,191],[196,191],[249,148],[256,149],[256,155],[206,197],[206,218],[178,224],[178,342],[164,342],[164,420],[0,420]].map(([x, y]) => (x / 415 * 100).toFixed(2) + '% ' + (y / 420 * 100).toFixed(2) + '%').join(',') + ')';
/* Requisiten-Posen: Staub und Plopp beim Wechsel, nie damit laufen */
const PROP = {pc:1, chest:1, measure:1};
/* Gesicht je Pose in Quellpixeln: Augen [x,y,w,h], Mund [x,y,w,h]. Pc, Kaffee und Truhe haben keins. */
const FACE = {
  sketch:  {eyes:[[198,61,16,13],[221,55,16,14]], mouth:[210,81,24,13]},
  shrug:   {eyes:[[129,60,18,9],[154,67,18,8]], mouth:[128,82,34,13]},
  search:  {eyes:[[150,112,22,22]], mouth:[113,142,32,15]},
  measure: {eyes:[[150,122,17,13],[170,116,13,14]], mouth:[162,138,22,14]},
  curator: {eyes:[[101,134,14,12],[117,130,10,13]], mouth:[108,150,20,11]}
};
const SKIN = [0xfa,0xb6,0x79], LID = [0x68,0x32,0x1e], BEARD = [0xd1,0x8c,0x64];

/* ---------- Zielgruppen: "Name|Kollektions-Handles|1 = auch als Chip im Hero" ---------- */
const AUD_CFG = ['Handwerker|geschenke-fur-handwerker,zunftzeichen|1', 'Feuerwehr|feuerwehr-geschenke|1', 'Paare|geschenke-fur-paare|1', 'Familie|geschenke-fur-familien|1',
  'Zuhause|einweihungsgeschenke|1', 'Für ihn|gechenke-fur-ihn', 'Für sie|geschenke-fur-sie', 'Eltern|geschenke-fur-eltern', 'Soldaten|geschenke-fuer-bundeswehr-soldaten-und-veteranen',
  'THW|thw-geschenke', 'Tierfreunde|pferde-geschenke,tiere-aus-metall', 'Motorrad|motorrad-geschenke', 'Garten|rost-gartendeko',
  /* Hobbys: erscheinen nur, wenn das Regal mindestens zwei Stücke in einem Budget hergibt (okBudgets) */
  'Angler|angeln-geschenkideen', 'Fußballer|fussball-geschenke', 'Musiker|geschenke-fur-musiker', 'Sportler|geschenke-fur-sportler,geschenke-fuer-sportler',
  'Grillfans|grillgeschenke-und-dekoration', 'Garage und Werkstatt|garagenschilder'];
const WHO = {Handwerker:['für Handwerker','sparks'], Feuerwehr:['für Feuerwehrleute','sparks'], Paare:['für Paare','petals'], Familie:['für Familien','twinkle'], Zuhause:['fürs Zuhause','dust'],
  'Für ihn':['für ihn','sparks'], 'Für sie':['für sie','petals'], Eltern:['für Eltern','twinkle'], Soldaten:['für Soldaten','sparks'], THW:['für THW-Helfer','sparks'],
  Tierfreunde:['für Tierfreunde','petals'], Motorrad:['für Motorradfahrer','dust'], Garten:['für den Garten','petals'],
  Angler:['für Angler','sparks'], 'Fußballer':['für Fußballer','confetti'], Musiker:['für Musiker','twinkle'], Sportler:['für Sportler','sparks'],
  Grillfans:['für Grillfans','sparks'], 'Garage und Werkstatt':['für Garage und Werkstatt','sparks']};
/* Beispiel für den Wunschtext, nur bei Stücken mit freiem Text (z = 1) */
const AUD_EX = {Feuerwehr:'z. B. mit Name und Wache', Handwerker:'z. B. mit Name und Gewerk', Paare:'z. B. mit Euren Namen', Familie:'z. B. mit allen Namen', Zuhause:'z. B. mit Eurem Familiennamen',
  THW:'z. B. mit Name und Ortsverband', Soldaten:'z. B. mit Name und Einheit'};
const AUD = AUD_CFG.map(s => { const p = String(s).split('|'), x = WHO[p[0]] || ['für ' + p[0], 'twinkle']; return {l:p[0], hs:(p[1] || '').split(',').filter(Boolean), who:x[0], hero:p[2] === '1', fx:x[1]}; });
const audBy = l => AUD.find(a => a.l === l);
/* Längere Knopfbeschriftung, wo der Kurzname mehrdeutig ist */
const AUD_LBL = {'Für sie':'Für sie (Frau, Freundin, Mama)', 'Für ihn':'Für ihn (Mann, Freund, Papa)'};
const audChip = a => AUD_LBL[a.l] || a.l;
const audByColl = c => AUD.find(a => a.hs.includes(c));
/* Quelle für „Nr. 1 bei …“ und die Leitzeile, je Zielgruppe (erste Kollektion) */
const SRC = {Feuerwehr:'Feuerwehr-Geschenken', Handwerker:'Handwerker-Geschenken', Paare:'Geschenken für Paare', Familie:'Familiengeschenken', Zuhause:'Einweihungsgeschenken',
  THW:'THW-Geschenken', Soldaten:'Geschenken für Soldaten', Motorrad:'Motorrad-Geschenken', Angler:'Geschenken für Angler', Musiker:'Geschenken für Musiker', Sportler:'Geschenken für Sportler'};
const BELIEBT = {l:'Beliebt', hs:['beliebt'], who:'aus der Beliebt-Liste', hero:false, fx:'twinkle', src:'den beliebtesten Stücken'};


/* ---------- Texte: je Schlüssel zwei oder drei Varianten, gewählt mit einem Zufallswert pro Seitenaufruf (nichts gespeichert) ---------- */
const SEED = Math.floor(Math.random() * 9973);
const LINES = {
  hello:['Grüß Dich, ich bin Bruder Funke! Ich helfe Dir mit Knöpfen weiter.',
    'Grüß Dich, ich bin Bruder Funke! Ich zeig Dir alles mit ein paar Knöpfen.'],
  late:['Noch wach? Die Werkstatt schläft, ich nicht.'],
  back:['Schön, dass Du wieder da bist.', 'Da bist Du ja wieder.'],
  who:['Für wen suchst Du?', 'Wen willst Du beschenken?'],
  Handwerker:['Handwerk hat goldenen Boden. Bei uns ist er aus Stahl.', 'Handwerker? Da sprühen bei mir die Funken.'],
  Feuerwehr:['Feuerwehr? Da brenn ich für.', 'Feuerwehr, da kenn ich mich aus.'],
  Paare:['Ach, die Liebe. Da wird sogar Stahl weich.', 'Für zwei? Da wird mir ganz warm ums Herz.'],
  Familie:['Familie geht immer. Am liebsten mit allen Namen drauf.', 'Für die ganze Familie? Schöne Idee.'],
  Zuhause:['Neues Zuhause? Dann fehlt nur noch das Schild an der Tür.', 'Fürs Zuhause, da hab ich was im Regal.'],
  budget:['Und was darf es kosten? Ich verrat\'s auch keinem.', 'Und was darf es ungefähr kosten?'],
  search:['Moment, ich kletter mal ins oberste Regal.', 'Moment, ich schau ins Regal.', 'Moment, ich blätter kurz durchs Regal.'],
  itemGet:['Zack, im Korb. Ich hätte es genauso gemacht.', 'Gute Wahl! Liegt im Warenkorb.'],
  learn:['Das lerne ich noch. Such Dir solange was aus.'],
  err:['Da hakt was. Versuch es gleich noch mal oder nimm einen Knopf.'],
  slow:['Das dauert gerade länger als sonst. Versuch es gleich noch mal oder nimm einen Knopf.']
};
function line(k, fb){ const L = LINES[k]; if (!L) return fb || ''; return L[(SEED + k.length) % L.length]; }
const audLine = a => LINES[a.l] ? line(a.l) : `Geschenke ${a.who}, gute Wahl.`;

/* ---------- Zentrale Fakten: aus snippets/sm-fakt.liquid (key 'json', Shop-Metafelder steelmonks.fakt_*).
   Die Grundwerte hier sind dieselben wie dort. Der Mönch nennt nie ein Lieferdatum, nur Werktage und den Versandtag. ---------- */
const F = Object.assign({versandfertigMin:2, versandfertigMax:5, versandtag:'Freitag', entwurfMin:1, entwurfMax:2, sonderMin:7, sonderMax:10,
  gratisversandAbCent:9900, versandSonderDeCent:495, versandSonderEuCent:1490, montageFreiAbCent:15000, befestigungssetPreisCent:945}, CTX.f && typeof CTX.f === 'object' ? CTX.f : {});
const span = (a, b) => a === b ? String(a) : a + ' bis ' + b;
/* wie sm-fakt *_werktagen: „in 2 bis 5 Werktagen“, „in 1 Werktag“ */
const inWd = (a, b) => 'in ' + span(a, b) + (a === b && a === 1 ? ' Werktag' : ' Werktagen');
const euro = c => (c / 100).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
/* volle Euro ohne Nachkommastellen, wie sm-fakt: „99 €“ */
const euroR = c => euro(c).replace(',00 €', ' €');
/* Gutscheinbeträge wie auf der Gutscheinseite (snippets/sm-fp-gutschein.liquid, „Betrag wählen“); kein Fakt-Metafeld */
const GUTSCHEIN = 'Gutscheine gibt es über 25, 50, 75, 100, 150 oder 200 €, einlösbar im ganzen Sortiment und gültig bis zum Ende des dritten Jahres nach dem Kauf.';
const GUTSCHEIN_MIN_CENT = 2500;
/* Shop-Artikel: versandfertig in Werktagen, verschickt am Versandtag, kein Datum */
function shipLine(){ return `Shop-Artikel sind meist ${inWd(F.versandfertigMin, F.versandfertigMax)} versandfertig. Wir verschicken jeden ${F.versandtag} mit DHL. Einen festen Liefertermin sagen wir nicht zu.`; }
function shipCost(){ return `Für Bestellungen im Shop ist der Versand ab ${euroR(F.gratisversandAbCent)} gratis, darunter siehst Du die Kosten im Warenkorb. Sonderanfertigungen kosten immer ${euro(F.versandSonderDeCent)} Versand in Deutschland und ${euro(F.versandSonderEuCent)} in die EU.`; }
/* 1. November bis 24. Dezember: früh bestellen, ohne Datum */
function xmasLine(){
  const now = new Date(), y = now.getFullYear();
  if (now < new Date(y, 10, 1) || now > new Date(y, 11, 24, 23, 59)) return '';
  return 'Für Weihnachten bestell lieber früh. Express gibt es bei uns nicht. Wenn es eilt, frag vorher unser Team, wie es gerade aussieht.';
}
const noExpress = () => 'Express gibt es bei uns nicht. Wenn es eilt, frag vorher unser Team, wie es gerade aussieht.';
/* Sonderanfertigung: erster Entwurf, Fertigung nach Freigabe, nächster Versandtag, Versand immer bezahlt.
   pre steht vor dem ersten Satz (Wappenseite: „Für ein individuell entworfenes Wappen:“). */
function sonderLines(pre){
  return [`${pre ? pre + ' ' : ''}Den ersten Entwurf bekommst Du meist ${inWd(F.entwurfMin, F.entwurfMax)}, bei aufwendigen Motiven dauert es länger.`,
    `Nach Deiner Freigabe fertigen wir ${inWd(F.sonderMin, F.sonderMax)} und verschicken am nächsten ${F.versandtag} mit DHL.`,
    `Bestellt wird über das Angebot unseres Teams, nicht im Warenkorb. Der Versand kostet ${euro(F.versandSonderDeCent)} in Deutschland und ${euro(F.versandSonderEuCent)} in die EU.`];
}

/* ---------- Zustand ---------- */
const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
const S = {
  out:false, pose:'sketch', facing:1, calm:false, reduced:mqRM.matches, sound:false, classic:false,
  mobile:false, busy:false, typing:false, anims:0, waitAdv:false, skip:false, greeted:false,
  ax:0, ay:0, tilt:0, lag:0, idleState:null, lastInput:performance.now(), prevPose:null, hidden:false,
  yield:false, active:false, lift:0, railSrc:'', aud:null, budget:null, shown:new Set(), pool:null, trigger:null, used:false,
  ox:0, tuck:false, anchor:null, duck:false, done:{}, zOpened:false, fast:false, dealt:false, compose:false, typed:false,
  patrolDone:false, micro:0, t0:0, outcome:'', keepBand:false, mouth:false, blink:false
};
let SS = {};
const SKEY = 'smMonk';
function ssRead(){ if (!S.used) return SS; try { return JSON.parse(sessionStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } }
/* Vor der ersten Eingabe (nur bei Deep Links möglich) bleibt alles im Speicher der Seite, nichts in sessionStorage */
function ssUpd(p){ SS = Object.assign(ssRead(), p); if (!S.used) return; try { sessionStorage.setItem(SKEY, JSON.stringify(SS)); } catch (e) {} }

/* ---------- Messung: nur dataLayer, erst nach der ersten Eingabe, nie getippter Text ---------- */
let TURN = 0, QUEUE = [];
function dl(ev){ try { (window.dataLayer = window.dataLayer || []).push(ev); } catch (e) {} }
function push(event, extra){
  const ev = Object.assign({event}, extra || {}, {sm_page_type:pageKind(), sm_turn:TURN});
  if (!S.used){ if (event === 'sm_monk_open') QUEUE.unshift(ev); else QUEUE.push(ev); if (QUEUE.length > 40) QUEUE.length = 40; return; }
  dl(ev);
  if (event === 'sm_monk_step' && ev.sm_step) aiEvent('step', {step:String(ev.sm_step)});
  else if (event === 'sm_monk_close') aiEvent('close', {outcome:String(ev.sm_outcome || 'none'), turns:+ev.sm_turns || 0});
}
function ecomm(event, list, items){
  push(event, {ecommerce:{item_list_id:'sm_monk', item_list_name:list, items:items.map((p, i) => ({item_id:p.h, item_name:p.t, item_variant:p.cv && p.cv.l ? fmtSize(p.cv.l) : '', index:p.idx != null ? p.idx : i, price:+(((p.cv ? p.cv.c : p.p) || 0) / 100).toFixed(2)}))}});
}
function markUsed(){
  if (S.used) return; S.used = true;
  let st = {}; try { st = JSON.parse(sessionStorage.getItem(SKEY)) || {}; } catch (e) {}
  SS = Object.assign(st, SS, {u:1}); S.fast = !!st.op; SS.op = (st.op || 0) + 1;
  if (S.compose) SS.ci = 1;
  try { sessionStorage.setItem(SKEY, JSON.stringify(SS)); } catch (e) {}
  if (SS.rb == null) checkCart();
  const q = QUEUE; QUEUE = []; q.forEach(dl);
}

const $ = (s, r) => (r || d).querySelector(s);
const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
const R = Math.round;
const ABORT = {abort:1};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.now();
const vpW = () => d.documentElement.clientWidth || innerWidth;
const vpH = () => innerHeight;
const vis = e => !!(e && e.getClientRects().length && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* '22.5cm' wird '22,5 cm' */
const fmtSize = v => String(v || '').trim().replace(/(\d)\.(\d)/g, '$1,$2').replace(/(\d)\s*(cm|mm|m)\b/gi, '$1 $2');

let stage, actor, box, bbody, choicesEl, sp, faceC, emoteEl, lagEl, turnEl, flipEl, sqEl, ppEl, trayEl, fxC, fxB, shadowC, spotEl, qmEl, dockEl, dockWrap, dockSay, srlog, padEl, menuEl, composeEl, inputEl;
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
const still = () => S.reduced || S.classic;

/* ---------- Geometrie ---------- */
function vr(el){ const a = el.getBoundingClientRect(); return {x:a.left, y:a.top, w:a.width, h:a.height}; }
function sc(){ return S.mobile ? 1/3 : 1/2; }
/* Skalierung je Pose inklusive Körperhöhen-Ausgleich (bodyScale) */
function poseScale(n){ const p = POSES[n] || POSES.sketch; return p.mini ? 1 : sc() * p.bs; }
function boxOn(){ return box && box.classList.contains('on'); }
function boxH(){ return boxOn() ? box.offsetHeight : 0; }
function measureBoxH(){ const v = box.style.visibility; box.style.visibility = 'hidden'; box.classList.add('on'); const hh = box.offsetHeight; box.classList.remove('on'); box.style.visibility = v; return hh; }
function home(){
  if (S.mobile){ const bh = boxH() || measureBoxH(); return {x:S.mx == null ? mobX0() : S.mx, y:vpH() - S.lift - bh}; }
  return {x:24 + 88 + S.ox, y:vpH() - 24 - S.lift};
}
/* Handy: Der Mönch läuft auf der Oberkante des Sheets. S.mx ist sein Platz dort (null = Startplatz links). */
function mobX0(){ return 12 + R(175 / 3); }
function clampMx(x, pose){
  const n = pose || S.pose, p = POSES[n] || POSES.sketch, s = poseScale(n), wd = p.cw || p.w, half = R(Math.max(p.fx, wd - p.fx) * s);
  return Math.max(8 + half, Math.min(vpW() - 8 - half, R(x)));
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
    if (!vis(e) || e.hidden || (e.id === 'smNlTz' && S.mobile && boxOn())) return; const r = e.getBoundingClientRect();
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
const PAL = {'#':'#1b1d22','r':'#e0303a','y':'#ffd23f','l':'#ff6b1f','w':'#ffffff','b':'#3b8cff','d':'#6b5a2a','o':'#1b1d22'};
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
const MARKER = ["ooooooooo","olllllllo","olllllllo",".olllllo.","..olllo..","...olo...","....o...."];
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
/* Pop-in .4, 1.25, 1 in drei Stufen, danach ein leises Wackeln */
function popIn(c){
  if (still()) return;
  c.animate([{transform:'translateY(6px) scale(.4)'}, {transform:'translateY(2px) scale(1.25)'}, {transform:'translateY(0) scale(1)'}], {duration:200, easing:'steps(3,end)'});
  c.animate([{transform:'translateY(0)'}, {transform:'translateY(-1px)'}], {duration:800, delay:200, iterations:Infinity, easing:'steps(2,end)'});
}
/* Schatten: Kern plus heller Rand, liest sich auf Nacht und Papier */
function drawShadow(){
  const c = shadowC; c.width = 30; c.height = 6; const x = c.getContext('2d'); x.clearRect(0,0,30,6);
  const rows = [[8,22],[3,27],[1,29],[3,27],[8,22]];
  x.fillStyle = 'rgba(255,255,255,.10)'; rows.forEach(([a,b], y) => { x.fillRect(a - 1, y, b - a + 2, 1); }); x.fillRect(8, 5, 14, 1);
  x.fillStyle = 'rgba(0,0,0,.42)'; rows.forEach(([a,b], y) => { x.fillRect(a, y, b - a, 1); });
}

/* ---------- Partikel: hinten (Staub, Dampf, Bodenwolken) und vorne (Funken, Glitzer, Konfetti) ---------- */
const FX = {cell:3, parts:[], ems:[], raf:0, cf:null, cb:null, dark:false};
const FXC = {
  dust:['#cfc6b4','#b9ae98','#e6dfd0'], sparks:['#fff1e8','#ff6b1f','#ff8a1f','#ffffff'],
  confetti:['#e0303a','#ff6b1f','#3b8cff','#36c46b','#ff7ad9','#ffffff'], twinkle:['#ffffff','#fff1e8','#bfe0ff'],
  petals:['#ffb3c8','#ff8fb1','#ffd6e2'], steam:['rgba(255,255,255,.75)','rgba(255,255,255,.55)'], conv:['#ffffff','#ff8a1f']
};
const BACK = {dust:1, steam:1, ground:1};
function fxResize(){ [fxC, fxB].forEach(c => { const cw = Math.ceil(vpW() / FX.cell), ch = Math.ceil(vpH() / FX.cell); c.width = cw; c.height = ch; c.style.width = (cw * FX.cell) + 'px'; c.style.height = (ch * FX.cell) + 'px'; }); }
function spawn(type, x, y, o){
  o = o || {};
  const r = Math.random, cols = type === 'ground' ? (FX.dark ? ['#6d675e', '#8a8378'] : FXC.dust) : (FXC[type] || FXC.dust), col = cols[Math.floor(r() * cols.length)];
  const p = {type, x, y, vx:0, vy:0, g:0, life:40, age:0, col, size:1, ph:r() * 6};
  if (type === 'dust'){ p.vx = (r() - .5) * 3.2; p.vy = -r() * 1.4; p.g = .03; p.life = 24 + r() * 18; p.size = r() < .4 ? 2 : 1; }
  if (type === 'ground'){ const dir = o.dir || (r() < .5 ? -1 : 1); p.vx = dir * (1.5 + r() * 1.5); p.vy = -(.2 + r() * .6); p.g = .05; p.life = 18 + r() * 8; p.size = 2; p.y0 = y; p.top = y - (S.mobile ? 12 : 18); }
  if (type === 'sparks'){ p.vx = (r() - .5) * 7; p.vy = -r() * 6 - 1; p.g = .32; p.life = 16 + r() * 16; }
  if (type === 'confetti'){ p.vx = (r() - .5) * 6; p.vy = -r() * 7 - 2; p.g = .16; p.life = 80 + r() * 40; p.size = r() < .5 ? 2 : 1; }
  if (type === 'twinkle'){ p.vx = (r() - .5) * 1.2; p.vy = (r() - .5) * 1.2; p.life = 22 + r() * 14; p.size = 2; }
  if (type === 'petals'){ p.vx = (r() - .5) * 2; p.vy = -r() * 2; p.g = .03; p.life = 80 + r() * 40; p.size = 2; }
  if (type === 'steam'){ p.vx = (r() - .5) * .5; p.vy = -.5 - r() * .5; p.g = -.004; p.life = 50 + r() * 30; p.size = r() < .5 ? 2 : 1; }
  if (type === 'conv'){ p.x = x + o.dx; p.y = y + o.dy; p.vx = -o.dx / 8; p.vy = -o.dy / 8; p.life = 8; p.size = 2; }
  FX.parts.push(p);
}
const fxOff = () => S.reduced || S.classic || S.calm || S.hidden || S.yield || !built;
function burst(type, x, y, n){ if (fxOff()) return; for (let i = 0; i < (n || 14); i++) spawn(type, x, y); fxRun(); }
/* Bodenstaub an den Füßen: dir -1 links, 1 rechts, 0 beide Seiten */
function groundDust(x, y, n, dir){ if (fxOff()) return; for (let i = 0; i < (n || 6); i++) spawn('ground', x, y, {dir:dir || (i % 2 ? 1 : -1)}); fxRun(); }
/* Hintergrund unter den Füßen: einmal pro Landung, für dunklen Staub auf dunklem Grund */
function sampleGround(x, y){
  try {
    let e = d.elementFromPoint(Math.max(0, Math.min(vpW() - 1, x)), Math.max(0, Math.min(vpH() - 1, y + 2)));
    while (e && e !== d.documentElement){ const c = getComputedStyle(e).backgroundColor, m = c.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > .1)){ const [r, g, b] = m.map(Number); FX.dark = (r * .299 + g * .587 + b * .114) < 110; return; } e = e.parentElement; }
    FX.dark = false;
  } catch (e) {}
}
function emitter(type, getXY, rate){ const e = {type, getXY, rate:rate || .3}; if (still()) return e; FX.ems.push(e); fxRun(); return e; }
function stopEmitter(e){ FX.ems = FX.ems.filter(x => x !== e); }
function fxRun(){ if (!FX.raf && !S.hidden) FX.raf = requestAnimationFrame(fxStep); }
function fxStep(){
  FX.raf = 0; const cell = FX.cell; FX.cf.clearRect(0, 0, fxC.width, fxC.height); FX.cb.clearRect(0, 0, fxB.width, fxB.height);
  if (!still() && !S.yield) for (const e of FX.ems){ if (Math.random() < e.rate){ const q = e.getXY(); if (q) spawn(e.type, q.x, q.y); } }
  FX.parts = FX.parts.filter(p => p.age < p.life);
  for (const p of FX.parts){
    p.age++; p.vy += p.g; p.x += p.vx; p.y += p.vy;
    if (p.type === 'confetti' || p.type === 'petals'){ p.vx *= .97; p.x += Math.sin(p.age / 5 + p.ph) * .6; if (p.vy > 2.2) p.vy = 2.2; }
    if (p.type === 'steam') p.x += Math.sin(p.age / 8 + p.ph) * .3;
    if (p.type === 'ground'){ p.vx *= .9; if (p.y > p.y0){ p.y = p.y0; p.vy = 0; } if (p.y < p.top) p.y = p.top; p.size = p.age > p.life * .55 ? 1 : 2; }
    const x = BACK[p.type] ? FX.cb : FX.cf;
    let a = 1 - p.age / p.life; if (p.type === 'twinkle') a = (Math.floor(p.age / 4) % 2) ? .3 : 1;
    x.globalAlpha = Math.max(0, Math.min(1, p.type === 'steam' ? a * .9 : a + .25));
    x.fillStyle = p.col;
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    if (p.type === 'twinkle'){ x.fillRect(cx - 1, cy, 3, 1); x.fillRect(cx, cy - 1, 1, 3); } else x.fillRect(cx, cy - p.size + 1, p.size, p.size);
  }
  FX.cf.globalAlpha = 1; FX.cb.globalAlpha = 1;
  if ((FX.parts.length || FX.ems.length) && !S.hidden) fxRun();
}
function fxClear(){ FX.parts = []; FX.ems = []; if (FX.cf){ FX.cf.clearRect(0, 0, fxC.width, fxC.height); FX.cb.clearRect(0, 0, fxB.width, fxB.height); } }

/* ---------- Ton (aus, bis der Besucher ihn einschaltet; nie im ruhigen Modus). Alles über einen Master mit Kompressor. ---------- */
const SND = {ctx:null, out:null};
function ac(){
  if (!S.sound || S.calm) return null;
  try {
    if (!SND.ctx){
      const c = SND.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = c.createGain(); g.gain.value = .6; const k = c.createDynamicsCompressor(); g.connect(k).connect(c.destination); SND.out = g;
    }
    if (SND.ctx.state === 'suspended') SND.ctx.resume();
  } catch (e) { return null; }
  return SND.ctx;
}
function tone(f, dur, type, vol, f2, at){
  const c = ac(); if (!c) return; const t = c.currentTime + (at || 0); dur = dur || .04;
  const o = c.createOscillator(), g = c.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol || .035, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(SND.out); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, f){
  const c = ac(); if (!c) return; const t = c.currentTime;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const s = c.createBufferSource(); s.buffer = b; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); bp.frequency.exponentialRampToValueAtTime(f * 3, t + dur);
  const g = c.createGain(); g.gain.value = vol; s.connect(bp).connect(g).connect(SND.out); s.start(t);
}
/* Stimme: Dreieck um 118 Hz mit 4 Hz Vibrato, Tonhöhe je Vokal, am Satzende drei Halbtöne tiefer */
const VOW = {a:0, 'ä':1, e:2, i:4, o:-1, 'ö':0, u:-3, 'ü':3};
function voice(v, last){
  const c = ac(); if (!c) return; const t = c.currentTime, semi = (VOW[v] || 0) - (last ? 3 : 0), f = 118 * Math.pow(2, semi / 12);
  const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(f, t); lfo.frequency.value = 4; lg.gain.value = f * .03; lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.09, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + (last ? .14 : .08));
  o.connect(g).connect(SND.out); o.start(t); lfo.start(t); o.stop(t + .18); lfo.stop(t + .18);
}
function sfx(n, i){
  if (!S.sound || S.calm) return;
  if (n === 'whoosh') noise(.32, .05, 500);
  if (n === 'thud') tone(110, .12, 'sine', .12, 40);
  if (n === 'pop') tone(330, .06, 'square', .03, 660);
  if (n === 'deal') noise(.06, .06, 2400);
  if (n === 'sparkle') [880, 1175, 1568].forEach((f, k) => tone(f, .07, 'square', .025, 0, k * .07));
  if (n === 'laser') tone(1400, .18, 'square', .02, 500);
  if (n === 'charge') tone(400, .12, 'square', .02, 1600);
  if (n === 'tick') tone(1600, .012, 'square', .018);
  if (n === 'confirm') { tone(784, .06, 'square', .025); tone(1175, .09, 'square', .025, 0, .06); }
  if (n === 'open') [523, 659, 784].forEach((f, k) => tone(f, .06, 'square', .022, 0, k * .05));
  if (n === 'close') [784, 659, 523].forEach((f, k) => tone(f, .06, 'square', .022, 0, k * .05));
  if (n === 'chime2') { tone(988, .1, 'triangle', .05); tone(1319, .16, 'triangle', .05, 0, .1); }
  if (n === 'step') tone(i % 2 ? 1100 : 900, .025, 'square', .012);
}
/* Kleine Fanfaren zu den Emotes */
function sting(kind){
  if (!S.sound || S.calm) return;
  if (kind === '!') { tone(523, .05, 'square', .025); tone(784, .08, 'square', .025, 0, .05); }
  if (kind === '?') tone(440, .16, 'square', .022, 660);
  if (kind === 'bulb') { tone(1568, .05, 'triangle', .04); tone(2093, .12, 'triangle', .035, 0, .05); }
  if (kind === 'sweat') tone(660, .2, 'triangle', .03, 330);
  if (kind === 'heart') { tone(659, .12, 'sine', .05); tone(988, .2, 'sine', .04, 0, .1); }
}

/* ---------- Aufbau der Bühne (erst beim ersten Öffnen) ---------- */
/* Statuszeile unter dem Namen. Im KI-Modus mit Sitzung: STATUS_AI (applyAiUi). */
const STATUS = 'Kundenberater', STATUS_AI = 'Kundenberater';
const SVG = b => '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + b + '</svg>';
const SPK = '<path d="M2 6h3v-1h1v-1h1v-1h1v-1h2v12h-2v-1h-1v-1h-1v-1h-1v-1h-3z"/>';
const ICO = {
  soundOff:SVG(SPK + '<rect x="11" y="6" width="1" height="1"/><rect x="15" y="6" width="1" height="1"/><rect x="12" y="7" width="1" height="1"/><rect x="14" y="7" width="1" height="1"/><rect x="13" y="8" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="14" y="9" width="1" height="1"/><rect x="11" y="10" width="1" height="1"/><rect x="15" y="10" width="1" height="1"/>').replace('<svg', '<svg class="off"'),
  soundOn:SVG(SPK + '<rect x="11" y="6" width="2" height="4"/><rect x="14" y="4" width="2" height="8"/>').replace('<svg', '<svg class="on"'),
  menu:SVG('<rect x="1" y="7" width="3" height="3"/><rect x="6" y="7" width="3" height="3"/><rect x="11" y="7" width="3" height="3"/>'),
  close:SVG('<rect x="2" y="2" width="2" height="2"/><rect x="2" y="12" width="2" height="2"/><rect x="4" y="4" width="2" height="2"/><rect x="4" y="10" width="2" height="2"/><rect x="6" y="6" width="2" height="2"/><rect x="6" y="8" width="2" height="2"/><rect x="8" y="6" width="2" height="2"/><rect x="8" y="8" width="2" height="2"/><rect x="10" y="4" width="2" height="2"/><rect x="10" y="10" width="2" height="2"/><rect x="12" y="2" width="2" height="2"/><rect x="12" y="12" width="2" height="2"/>'),
  arrow:SVG('<path d="M1 7h9v-1h-1v-1h-1v-1h-1v-2h2v1h1v1h1v1h1v1h1v1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-2h1v-1h1v-1h1v-1h-9z"/>')
};
const TAXL = 'Alle Preise inkl. MwSt., zzgl. <a href="/pages/versandbedingungen">Versand</a>';
function build(){
  if (built) return; built = true;
  stage = h('div'); stage.id = 'smMonk';
  stage.innerHTML =
    '<canvas class="smmk-shadow" aria-hidden="true"></canvas><canvas class="smmk-fxb" aria-hidden="true"></canvas>' +
    '<div class="smmk-actor" aria-hidden="true"><div class="lag"><div class="turn"><div class="flip"><div class="sq"><div class="pp"><div class="bob"><img class="sp" alt=""><canvas class="face"></canvas></div></div></div></div></div><div class="emote"></div></div></div>' +
    /* Nicht modaler Dialog: das Attribut open schaltet zusammen mit .on, show() wird nie gerufen (kein Fokussprung) */
    '<dialog class="smmk-box" aria-labelledby="smmkName">' +
      '<span class="smmk-hav" aria-hidden="true"></span>' +
      '<p class="smmk-plate"><b id="smmkName">Bruder Funke</b><span class="smmk-tag" aria-hidden="true">Test</span></p>' +
      '<div class="smmk-tools"><button type="button" data-tool="sound" aria-label="Ton" aria-pressed="false">' + ICO.soundOff + ICO.soundOn + '</button><button type="button" data-tool="menu" aria-label="Menü" aria-haspopup="menu" aria-expanded="false">' + ICO.menu + '</button><button type="button" data-tool="close" aria-label="Schließen">' + ICO.close + '</button></div>' +
      '<div class="smmk-menu" role="menu" aria-label="Einstellungen" hidden><button type="button" role="menuitemcheckbox" aria-checked="true" data-m="motion">Animationen <span class="st" aria-hidden="true">An</span></button><button type="button" role="menuitemcheckbox" aria-checked="false" data-m="classic">Klassische Ansicht <span class="st" aria-hidden="true">Aus</span></button><button type="button" role="menuitem" data-m="human">Mit Mensch sprechen</button></div>' +
      '<p class="smmk-sub">' + esc(STATUS) + '</p>' +
      '<div class="smmk-body" tabindex="-1"></div>' +
      '<div class="smmk-adv" aria-hidden="true">&#9660;</div>' +
      '<div class="smmk-choices" role="group" aria-label="Antworten"></div>' +
      '<form class="smmk-compose" hidden><input type="text" maxlength="200" enterkeyhint="send" autocomplete="off" placeholder="Oder schreib mir, wen Du beschenken willst …" aria-label="Frage an Bruder Funke"><button type="submit" aria-label="Senden">' + ICO.arrow + '</button><p class="smmk-legal"></p></form>' +
    '</dialog>' +
    '<div class="smmk-tray"></div><canvas class="smmk-fx" aria-hidden="true"></canvas>';
  d.body.appendChild(stage);
  actor = $('.smmk-actor', stage); box = $('.smmk-box', stage); bbody = $('.smmk-body', stage); choicesEl = $('.smmk-choices', stage);
  sp = $('img.sp', actor); faceC = $('canvas.face', actor); emoteEl = $('.emote', actor); lagEl = $('.lag', actor); turnEl = $('.turn', actor); flipEl = $('.flip', actor); sqEl = $('.sq', actor); ppEl = $('.pp', actor);
  trayEl = $('.smmk-tray', stage); fxC = $('.smmk-fx', stage); fxB = $('.smmk-fxb', stage); shadowC = $('.smmk-shadow', stage); menuEl = $('.smmk-menu', stage); composeEl = $('.smmk-compose', stage); inputEl = $('input', composeEl);
  FX.cf = fxC.getContext('2d'); FX.cb = fxB.getContext('2d');
  spotEl = h('div', 'smmk-spot');
  qmEl = bitmapCanvas(MARKER, 3); qmEl.className = 'smmk-qm'; qmEl.setAttribute('aria-hidden', 'true');
  /* Während der Mönch wartet (Zepto, Warenkorb), hält ein offener Dialog um den Kopf das Newsletter-Popup zurück */
  dockWrap = h('dialog', 'smmk-yd'); dockWrap.setAttribute('aria-label', 'Bruder Funke wartet');
  dockEl = h('button', 'smmk-dock'); dockEl.type = 'button'; dockEl.setAttribute('aria-label', 'Bruder Funke wartet kurz'); dockEl.innerHTML = '<img alt="" src="' + esc(asset('lupe')) + '">';
  dockWrap.append(dockEl, h('span', 'smmk-dock-emo'));
  dockSay = h('div', 'smmk-dock-say'); dockSay.setAttribute('aria-hidden', 'true');
  srlog = h('div', 'smmk-vh'); srlog.setAttribute('role', 'log'); srlog.setAttribute('aria-live', 'polite');
  padEl = h('div', 'smmk-pad'); padEl.setAttribute('aria-hidden', 'true');
  [spotEl, qmEl, dockWrap, dockSay, srlog, padEl].forEach(e => d.body.appendChild(e));
  drawShadow(); bind(); applyViewport();
  stage.classList.toggle('rm', S.reduced); syncMenu();
  preload();
}

/* ---------- Posen vorladen: jede einmal dekodieren, damit beim Wechsel kein leeres Bild aufblitzt ---------- */
const IMG = {};
let preloaded = null;
function preload(){
  if (preloaded) return preloaded;
  preloaded = Promise.all(Object.keys(ASSETS).filter(k => k !== 'lupe').map(k => { const im = new Image(); im.decoding = 'async'; im.src = asset(k); IMG[k] = im; return (im.decode ? im.decode() : Promise.resolve()).catch(() => {}); }));
  return preloaded;
}
function ready(n){ const im = IMG[n]; if (!im || n === 'rail') return Promise.resolve(); return Promise.race([(im.decode ? im.decode() : Promise.resolve()).catch(() => {}), sleep(1200)]); }

/* ---------- Darsteller ---------- */
function placeActor(x, y){ S.ax = R(x); S.ay = R(y); actor.style.transform = `translate3d(${S.ax}px,${S.ay}px,0)`; placeShadow(S.ax, S.ay); }
const shadowXY = (x, y) => { const k = S.mobile ? 3 : 4; return `translate(${R(x - 15 * k)}px,${R(y - 2.5 * k - 1)}px)`; };
function placeShadow(x, y, show){
  const k = S.mobile ? 3 : 4;
  shadowC.style.width = (30 * k) + 'px'; shadowC.style.height = (6 * k) + 'px';
  shadowC.style.transform = shadowXY(x, y);
  shadowC.style.display = (show !== false) && S.out && !S.classic ? 'block' : 'none';
}
/* Schatten reagiert auf Höhe: schmaler und blasser, je höher er springt */
function shadowHop(dy, ms){ if (still()) return; anim(shadowC, [{scale:'1 1', opacity:1}, {scale:`${Math.max(.5, 1 - dy * .02)} 1`, opacity:Math.max(.35, 1 - dy * .05)}, {scale:'1 1', opacity:1}], {duration:ms, easing:'steps(3,end)'}); }
function applyPoseGeom(n){
  const p = POSES[n] || POSES.sketch, s = poseScale(n);
  const geo = {width:(p.w * s) + 'px', height:(p.h * s) + 'px', left:R(-p.fx * s) + 'px', top:R(-p.fy * s) + 'px'};
  Object.assign(sp.style, geo); Object.assign(faceC.style, geo);
  sp.style.clipPath = faceC.style.clipPath = n === 'curator' ? CURATOR_CLIP : '';
  emoteEl.style.transform = `translate(${R(S.facing * (p.hx - p.fx) * s) - 16}px,${R((p.hy - p.fy) * s) - 40}px)`;
}
function swapSrc(n){
  const im = IMG[n]; sp.src = n === 'rail' ? asset('rail') : (im && im.src) || asset(n);
  applyPoseGeom(n); faceFor(n);
}
/* Posenwechsel ohne Verschwinden: ein kurzer Stauch-Streck-Hüpfer, Bildtausch am tiefsten Punkt */
async function setPose(n, o){
  o = o || {};
  if (S.pose === n){ applyPoseGeom(n); return; }
  S.pose = n;
  await ready(n);
  if (S.pose !== n) return;
  if (!S.out || o.pop === false || still()){ swapSrc(n); return; }
  const a = anim(sqEl, [{transform:'scale(1,1)'}, {transform:'scale(1.08,.86)', offset:.35}, {transform:'scale(.96,1.06)', offset:.7}, {transform:'scale(1,1)'}], {duration:240, easing:'steps(4,end)'});
  emoteEl.style.visibility = 'hidden';
  await sleep(84);
  if (S.pose === n) swapSrc(n);
  emoteEl.style.visibility = '';
  if (PROP[n] && o.dust !== false){ groundDust(S.ax, S.ay, 6); sfx('pop'); }
  await a;
}
function handPoint(){ const p = POSES[S.pose], s = poseScale(S.pose); return {x:S.ax + S.facing * (p.ax - p.fx) * s, y:S.ay + (p.ay - p.fy) * s}; }
function headPoint(){ const p = POSES[S.pose], s = poseScale(S.pose); return {x:S.ax + S.facing * (p.hx - p.fx) * s, y:S.ay + (p.hy - p.fy) * s}; }

/* ---------- Gesicht: Mund und Lider als Pixel-Flicken über dem Sprite ---------- */
const FACEP = {};
function facePatch(n){
  if (FACEP[n] !== undefined) return FACEP[n];
  const f = FACE[n], im = IMG[n]; if (!f || !im || !im.naturalWidth) return null;
  FACEP[n] = null;
  try {
    const c = d.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d', {willReadFrequently:true}); x.drawImage(im, 0, 0);
    /* Mundinneres und Augen erkennen (weiß oder blau, rot, dunkel mit b >= g), mit Haut, Bart und Lidstrich übermalen. Rest bleibt durchsichtig. */
    const mk = (r, eye) => {
      const [rx, ry, rw, rh] = r, src = x.getImageData(rx, ry, rw, rh), D = src.data, out = x.createImageData(rw, rh), O = out.data, hits = [];
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++){ const k = (j * rw + i) * 4, R0 = D[k], G = D[k + 1], B = D[k + 2], A = D[k + 3]; if (A > 100 && ((R0 > 190 && G > 180 && B > 170) || B >= G)) hits.push([i, j]); }
      if (!hits.length) return null;
      const ys = hits.map(q => q[1]), xs = hits.map(q => q[0]), mid = (Math.min(...ys) + Math.max(...ys)) >> 1, x0 = Math.min(...xs), x1 = Math.max(...xs);
      const put = (i, j, c3) => { const k = (j * rw + i) * 4; O[k] = c3[0]; O[k + 1] = c3[1]; O[k + 2] = c3[2]; O[k + 3] = 255; };
      hits.forEach(([i, j]) => put(i, j, eye || j <= mid ? SKIN : BEARD));
      for (let i = x0 + (eye ? 1 : 2); i <= x1 - (eye ? 1 : 2); i++){ put(i, mid, LID); put(i, Math.min(rh - 1, mid + 1), LID); }
      return {d:out, x:rx, y:ry};
    };
    FACEP[n] = {mouth:mk(f.mouth, false), eyes:f.eyes.map(e => mk(e, true)).filter(Boolean)};
  } catch (e) { FACEP[n] = null; }
  return FACEP[n];
}
let faceN = '';
function faceFor(n){ const p = POSES[n] || POSES.sketch; faceN = n; if (faceC.width !== p.w) faceC.width = p.w; if (faceC.height !== p.h) faceC.height = p.h; drawFace(); }
function drawFace(){
  if (!faceC) return; const x = faceC.getContext('2d'); x.clearRect(0, 0, faceC.width, faceC.height);
  if (still() || !S.out) return;
  const f = FACE[faceN] ? facePatch(faceN) : null; if (!f) return;
  if (!S.mouth && f.mouth) x.putImageData(f.mouth.d, f.mouth.x, f.mouth.y);
  if (S.blink) f.eyes.forEach(e => x.putImageData(e.d, e.x, e.y));
}
function mouth(open){ if (S.mouth === open) return; S.mouth = open; drawFace(); }
/* Blinzeln alle 2,5 bis 6 s, manchmal doppelt; nur wenn er draußen steht und nichts tut */
let blinkT = 0;
function blinkLoop(){
  clearTimeout(blinkT);
  blinkT = setTimeout(async () => {
    if (S.out && !S.busy && !S.typing && !S.hidden && !S.yield && !still() && !S.calm){
      const n = Math.random() < .15 ? 2 : 1;
      for (let i = 0; i < n; i++){ S.blink = true; drawFace(); await sleep(110); S.blink = false; drawFace(); if (i < n - 1) await sleep(120); }
    }
    blinkLoop();
  }, 2500 + Math.random() * 3500);
}

/* ---------- Emotes ---------- */
let emoteTimer = 0, emoteCur = null, emoteKind = '';
function emote(kind, ms){
  clearTimeout(emoteTimer);
  const old = emoteCur; emoteCur = null; emoteKind = kind || '';
  if (old){
    if (!kind && !still()){
      const r = old.getBoundingClientRect(); burst('twinkle', r.left + 4, r.top + 4, 1); burst('twinkle', r.right - 4, r.top + 8, 1);
      old.getAnimations().forEach(a => a.cancel());
      old.animate([{transform:'scale(1)'}, {transform:'scale(.5)'}, {transform:'scale(0)'}], {duration:120, easing:'steps(2,end)', fill:'forwards'}).finished.then(() => old.remove(), () => old.remove());
    } else old.remove();
  }
  if (!kind) return;
  const c = emoteCanvas(kind); emoteEl.append(c); emoteCur = c; popIn(c); sting(kind);
  if (ms !== 0) emoteTimer = setTimeout(() => { if (emoteCur === c) emote(null); }, ms || 1500);
}
function setFacing(f){ S.facing = f; flipEl.style.transform = `scaleX(${f})`; applyPoseGeom(S.pose); }
async function paperTurn(f){
  if (S.facing === f) return;
  if (S.reduced){ setFacing(f); return; }
  /* Umdrehen wie ein Papierfigürchen, aber flach: scaleX in Stufen um den Fußpunkt, .turn trägt nur die Neigung */
  const s0 = S.facing;
  await anim(flipEl, [{transform:`scaleX(${s0})`}, {transform:`scaleX(${(s0 * .5).toFixed(2)})`}, {transform:'scaleX(0.05)'}], {duration:80, easing:'steps(2,end)'});
  setFacing(f);
  await anim(flipEl, [{transform:`scaleX(${(f * .05).toFixed(2)})`}, {transform:`scaleX(${(f * .5).toFixed(2)})`}, {transform:`scaleX(${f})`}], {duration:80, easing:'steps(2,end)'});
  applyTilt();
}
/* Kurzer Blick zur Seite (neue Antworten, Karte unter dem Zeiger), danach zurück */
let glanceT = 0;
async function glance(x, ms){
  if (!S.out || still() || S.busy && S.anims > 0) return;
  const f = x >= S.ax ? 1 : -1; if (f === S.facing) return;
  clearTimeout(glanceT); const back = S.facing; await paperTurn(f);
  glanceT = setTimeout(() => { if (S.out && !S.anims && S.facing === f) paperTurn(back); }, ms || 600);
}
function showActor(on){
  S.out = on; actor.style.display = on ? 'block' : 'none';
  d.documentElement.classList.toggle('smmk-out', on);
  $$('[data-smmk="open"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
  placeShadow(S.ax, S.ay, on);
  if (!on){ emote(null); mouth(false); } else drawFace();
}
/* Neigung als Scherung: Füße bleiben stehen, Pixelzeilen bleiben waagerecht */
function applyTilt(){ const t = (S.out && !S.mobile && !S.reduced) ? Math.max(-3, Math.min(3, S.tilt)) : 0; turnEl.style.transform = t ? `skewX(${(-t).toFixed(1)}deg)` : ''; }
/* Kleiner Hüpfer mit Landestauchung, der Schatten wird dabei schmaler */
async function hop(dy, ms){
  if (still() || !S.out) return; ms = ms || 160;
  shadowHop(dy, ms * .75);
  await anim(ppEl, [{transform:'translateY(0)'}, {transform:`translateY(${-dy}px)`}, {transform:'translateY(0)'}], {duration:ms * .75, easing:'steps(3,end)'});
  await anim(sqEl, [{transform:'scale(1.1,.9)'}, {transform:'scale(1,1)'}], {duration:ms * .25, easing:'steps(2,end)'});
}
function landSquash(){ return anim(sqEl, [{transform:'scale(1.14,.82)'}, {transform:'scale(.94,1.08)'}, {transform:'scale(1,1)'}], {duration:200, easing:'steps(3,end)'}); }
const stretch = (sx, sy) => anim(sqEl, [{transform:`scale(${sx},${sy})`}, {transform:`scale(${sx},${sy})`}], {duration:70});

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
    const px = O.x + (q.x - O.x) / f, py = O.y + (q.y - O.y) / f, k = Math.min(1.6, sz.H / spriteH / f);
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
  POSES.rail = {w:nw, h:nh, fx:R(nw / 2), fy:nh - 1, hx:R(nw / 2), hy:2, ax:R(nw * .6), ay:R(nh * .4), mini:1, bs:1};
}
/* Landung: Bodenwolken links und rechts, Hintergrund einmal abtasten */
function landFx(x, y){ sampleGround(x, y); actor.classList.toggle('dk', FX.dark); sfx('thud'); groundDust(x - 10, y, 4, -1); groundDust(x + 10, y, 4, 1); }
/* Auftritt: Ducken, „!“, Absprung aus der Leiste, Landung. o.apex läuft am höchsten Punkt (Handy: Sheet fährt hoch). */
async function leapOut(landPose, o){
  o = o || {};
  const rs = railSprite();
  if (!rs || S.reduced) return poofIn(landPose, o);
  await ready(landPose);
  const rr = vr(rs), from = {x:rr.x + rr.w / 2, y:rr.y + rr.h};
  useRail(rs);
  const ex = emoteCanvas('!'); ex.style.position = 'absolute'; ex.style.transformOrigin = '50% 100%'; ex.style.left = R(from.x - 16) + 'px'; ex.style.top = R(rr.y - 36) + 'px'; stage.append(ex);
  if (!still()) ex.animate([{transform:'scale(.4)'}, {transform:'scale(1.25)'}, {transform:'scale(1)'}], {duration:200, easing:'steps(3,end)'});
  sting('!');
  /* Die Leiste setzt ihren Mönch mit translateX(-50%): diese Verschiebung bleibt in jedem Bild erhalten, abgebrochen wird nur die eigene Animation */
  const rb = railBase(rs), duckA = rs.animate ? rs.animate([{transform:rb + 'translateY(0) scaleY(1)'}, {transform:rb + 'translateY(3px) scaleY(.9)'}], {duration:200, easing:'steps(2,end)', fill:'forwards'}) : null;
  if (duckA) await duckA.finished.catch(() => {});
  if (duckA) duckA.cancel(); ex.remove();
  S.pose = 'rail'; sp.src = asset('rail'); setFacing(1); applyPoseGeom('rail'); faceFor('rail');
  showActor(true);
  const to = home(); placeShadow(to.x, to.y, true);
  const O = {x:to.x, y:to.y - 100}; stage.style.perspectiveOrigin = `${O.x}px ${O.y}px`;
  const h0 = rr.h, h1 = drawnH(landPose);
  const path = arcPath(from, to, 50, S.mobile ? 40 : 70);
  const sizeAt = t => { const e = t * t; return {H:h0 + (h1 - h0) * e, z:-300 * (1 - e)}; };
  const skf = []; for (let i = 0; i <= 10; i++){ const t = i / 10; skf.push({offset:t, opacity:t < .5 ? 0 : (t - .5) * 2, transform:shadowXY(to.x, to.y) + ` scale(${(.2 + .8 * t).toFixed(2)})`}); }
  sfx('whoosh');
  anim(shadowC, skf, {duration:650});
  stretch(.9, 1.15);
  const k1 = flightKF(path, 0, .5, O, sizeAt, POSES.rail.h, 0, 90);
  actor.style.transform = k1[k1.length - 1].transform;
  await aw(anim(actor, k1, {duration:325, easing:'linear'}));
  const ap = o.apex ? o.apex() : null;
  S.pose = landPose; swapSrc(landPose); flipEl.style.transform = 'scaleX(-1)';
  const k2 = flightKF(path, .5, 1, O, sizeAt, h1, 90, 180);
  actor.style.transform = k2[k2.length - 1].transform;
  await aw(anim(actor, k2, {duration:325, easing:'linear'}));
  setFacing(1); placeActor(to.x, to.y);
  landFx(to.x, to.y);
  await landSquash();
  if (ap) await ap;
  if (S.mobile){ const hm = home(); if (hm.y !== S.ay) placeActor(hm.x, hm.y); }
}
/* 404: Sprung aus dem Bild auf der Seite (Fußpunkt unten Mitte), Pose bleibt das Schulterzucken */
async function leapFromImg(im, pose, o){
  o = o || {};
  if (!im || S.reduced || still()){ if (im) im.style.visibility = 'hidden'; return poofIn(pose, o); }
  await ready(pose);
  const r = vr(im), from = {x:r.x + r.w / 2, y:r.y + r.h};
  S.pose = pose; swapSrc(pose); setFacing(1); showActor(true); im.style.visibility = 'hidden';
  const to = home(), h0 = r.h || 210, h1 = drawnH(pose);
  actor.style.transform = `translate3d(${R(from.x)}px,${R(from.y)}px,0) scale(${(h0 / h1).toFixed(3)})`;
  placeShadow(to.x, to.y, true);
  const O = {x:to.x, y:to.y - 100}, path = arcPath(from, to, 70, 0), sizeAt = t => ({H:h0 + (h1 - h0) * t, z:0});
  await anim(sqEl, [{transform:'scale(1.08,.9)'}, {transform:'scale(1.08,.9)'}], {duration:160});
  stretch(.9, 1.15); sfx('whoosh');
  const kf = flightKF(path, 0, 1, O, sizeAt, h1, 0, 0);
  actor.style.transform = kf[kf.length - 1].transform;
  const ap = o.apex ? setTimeout(o.apex, 260) : 0;
  await aw(anim(actor, kf, {duration:520, easing:'linear'}));
  clearTimeout(ap);
  placeActor(to.x, to.y); landFx(to.x, to.y); await landSquash();
}
/* Abgang: zwei Hüpfer, Notenzeichen, Absprung zurück in die Leiste */
async function leapBack(){
  const rs = railSprite();
  if (!rs || S.reduced){ await poofOut(); return; }
  await paperTurn(1);
  emote('note', 900); sfx('chime2');
  await hop(6, 160); await hop(6, 160);
  const rr = vr(rs), to = {x:rr.x + rr.w / 2, y:rr.y + rr.h}, from = {x:S.ax, y:S.ay};
  useRail(rs);
  const cur = S.pose, h1 = drawnH(cur), h0 = rr.h;
  groundDust(from.x, from.y, 4);
  stretch(.92, 1.12);
  const O = {x:from.x, y:from.y - 100}; stage.style.perspectiveOrigin = `${O.x}px ${O.y}px`;
  const path = arcPath(from, to, 50, S.mobile ? 40 : 70);
  const sizeAt = t => { const e = 1 - (1 - t) * (1 - t); return {H:h1 + (h0 - h1) * e, z:-300 * e}; };
  sfx('whoosh');
  anim(shadowC, [{opacity:1}, {opacity:0}], {duration:300, fill:'forwards'});
  const k1 = flightKF(path, 0, .5, O, sizeAt, h1, 0, 90);
  actor.style.transform = k1[k1.length - 1].transform;
  await anim(actor, k1, {duration:325, easing:'linear'});
  S.pose = 'rail'; sp.src = asset('rail'); applyPoseGeom('rail'); faceFor('rail'); flipEl.style.transform = 'scaleX(-1)';
  const k2 = flightKF(path, .5, 1, O, sizeAt, POSES.rail.h, 90, 180);
  actor.style.transform = k2[k2.length - 1].transform;
  await anim(actor, k2, {duration:325, easing:'linear'});
  shadowC.getAnimations().forEach(a => a.cancel());
  showActor(false); setFacing(1);
  /* die Leiste fängt ihn auf: kurzer Plopp und vier Staubzellen */
  sfx('pop'); groundDust(to.x, to.y, 4);
  const rb = railBase(rs);
  await anim(rs, [{transform:rb + 'translateY(0) scale(1)'}, {transform:rb + 'translateY(2px) scale(1.1,.88)'}, {transform:rb + 'translateY(0) scale(1)'}], {duration:240, easing:'steps(3,end)'});
}
/* Grundtransform des Leisten-Mönchs (translateX(-50%) aus dem CSS). Sein Gehen nutzt translate und rotate, das bleibt unberührt. */
function railBase(rs){ try { const t = getComputedStyle(rs).transform; return t && t !== 'none' ? t + ' ' : ''; } catch (e) { return ''; } }
async function poofIn(pose, o){
  o = o || {};
  await ready(pose);
  const to = home(); showActor(true); setFacing(1); placeActor(to.x, to.y);
  S.pose = pose; swapSrc(pose); sampleGround(to.x, to.y); actor.classList.toggle('dk', FX.dark);
  if (o.apex) o.apex();
  if (S.reduced || still()) return anim(actor, [{opacity:0}, {opacity:1}], {duration:150});
  groundDust(to.x, to.y, 8); burst('twinkle', headPoint().x, headPoint().y, 4); sfx('pop');
  return anim(ppEl, [{transform:'translateY(-14px) scale(.9,1.1)', opacity:0}, {transform:'translateY(0) scale(1.1,.9)', opacity:1, offset:.6}, {transform:'scale(1)', opacity:1}], {duration:240, easing:'steps(4,end)'});
}
async function poofOut(){
  if (!S.out) return;
  if (!S.reduced && !still()){ groundDust(S.ax, S.ay, 6); await anim(ppEl, [{transform:'scale(1)', opacity:1}, {transform:'scale(.5)', opacity:0}], {duration:200, easing:'steps(3,end)', fill:'forwards'}); }
  else await anim(actor, [{opacity:1}, {opacity:0}], {duration:150});
  ppEl.getAnimations().forEach(a => a.cancel());
  showActor(false);
}
/* Gehen als Schrittfolge: Kontakt, Schwebe, Kontakt; 3-px-Raster, Ausholen vorher, Nachfedern danach */
async function walkTo(x, o){
  o = o || {};
  if (PROP[S.pose] || S.pose === 'coffee' || S.pose === 'chest' || S.pose === 'rail') await aw(setPose('sketch', {dust:false}));
  x = clampMx(x); const dx = x - S.ax; if (Math.abs(dx) < 3) return;
  if (S.reduced){ placeActor(x, S.ay); return; }
  const dir = Math.sign(dx);
  await paperTurn(dir);
  actor.classList.add('walk'); if (!o.keepBox) box.classList.add('away');
  const speed = (S.mobile ? 170 : 220) * (o.fast ? 2 : 1), stepMs = o.fast ? 120 : 180, stepPx = speed * stepMs / 1000;
  S.walkStop = null;
  await anim(sqEl, [{transform:`skewX(${4 * dir}deg) scale(1.03,.97)`}, {transform:`skewX(${4 * dir}deg) scale(1.03,.97)`}], {duration:80});
  let cx = S.ax, i = 0;
  try {
    while (dir > 0 ? cx < x : cx > x){
      if (S.walkStop != null) break;
      const nx = dir > 0 ? Math.min(x, cx + stepPx) : Math.max(x, cx - stepPx), sk = (i % 2 ? 3 : -3) * dir;
      const from = `translate3d(${R(cx)}px,${S.ay}px,0)`, to = `translate3d(${R(nx)}px,${S.ay}px,0)`;
      actor.style.transform = to; shadowC.style.transform = shadowXY(nx, S.ay);
      const n = Math.max(1, R(Math.abs(nx - cx) / 3));
      anim(shadowC, [{transform:shadowXY(cx, S.ay)}, {transform:shadowXY(nx, S.ay)}], {duration:stepMs, easing:`steps(${n},end)`});
      anim(sqEl, [{transform:`scale(1.04,.95) skewX(${sk}deg)`}, {transform:`translateY(-4px) scale(.98,1.03) skewX(${sk}deg)`, offset:.5}, {transform:`scale(1.04,.95) skewX(${sk}deg)`}], {duration:stepMs, easing:'steps(3,end)'});
      await anim(actor, [{transform:from}, {transform:to}], {duration:stepMs, easing:`steps(${n},end)`});
      cx = nx; S.ax = R(cx); i++;
      groundDust(cx - dir * 10, S.ay, 3, -dir); sfx('step', i);
    }
  } finally { actor.classList.remove('walk'); }
  if (S.walkStop != null){ x = S.walkStop; S.walkStop = null; }
  placeActor(x, S.ay); if (S.mobile) S.mx = x;
  await anim(sqEl, [{transform:`translateX(${3 * dir}px) skewX(${-2 * dir}deg)`}, {transform:'none'}], {duration:100, easing:'steps(2,end)'});
}
/* Handy: zu einem Ziel auf der Sheet-Kante laufen. Requisiten-Posen gehen als Skizze und wechseln am Ziel zurück. */
const HEAVY = {curator:1, measure:1, pc:1, chest:1, coffee:1};
async function stroll(x, o){
  o = o || {};
  if (!S.mobile || !S.out || S.reduced || S.classic) return false;
  const keep = S.pose, tx = clampMx(x, o.pose || keep);
  if (Math.abs(tx - S.ax) < 24) return false;
  if (HEAVY[keep] && keep !== 'curator') await aw(setPose('sketch', {dust:false}));
  await walkTo(tx); box.classList.remove('away');
  if (o.face) await paperTurn(o.face);
  if (HEAVY[keep] && o.back !== false && S.pose !== keep) await aw(setPose(keep));
  return true;
}
/* Handy, Leerlauf: einmal pro Seite ein kurzer Rundgang. Jede Eingabe hält ihn sofort an (wake). */
async function patrol(){
  S.patrolling = true; S.patrolDone = true;
  try {
    const x0 = S.ax, lo = clampMx(0, 'sketch'), hi = clampMx(vpW(), 'sketch');
    const far = (hi - S.ax) >= (S.ax - lo) ? hi - R((hi - S.ax) * .2) : lo + R((S.ax - lo) * .2);
    if (HEAVY[S.pose]) await setPose('sketch', {dust:false});
    if (!S.patrolling) return;
    await walkTo(far, {keepBox:true});
    if (!S.patrolling) return;
    emote('?', 1000); await sleep(1200);
    if (!S.patrolling) return;
    await paperTurn(-S.facing); await sleep(700);
    if (!S.patrolling) return;
    await walkTo(x0, {keepBox:true});
    if (!S.patrolling) return;
    await paperTurn(1);
  } catch (e) { if (e !== ABORT) throw e; } finally { S.patrolling = false; }
}

/* ---------- Laser, Spotlight, Questmarker ---------- */
let laserEls = [], spotState = null, qmTarget = null;
function clearLaser(){ laserEls.forEach(e => e.remove()); laserEls = []; }
/* Platz, den Mönch und Box am unteren Rand belegen. Die Box wächst nach dem Zeigen meist um eine Zeile, daher Reserve. */
const GROUP_W = 660;
function overlapsGroup(r){ return r.x < S.ox + GROUP_W + 12 && r.x + r.w > S.ox - 12; }
function groupTop(){
  /* Reserve: die Box wächst nach dem Zeigen meist noch um Zeilen und Knöpfe. Desktop: ihre volle Höhe (min(60 %, 400 px)).
     Handy: die echte Sheet-Höhe plus der Kurator, mit dem er zeigt (er ist größer als die Skizze). */
  const bh = Math.max(boxOn() ? box.offsetHeight : 0, S.mobile ? R(vpH() * .42) : Math.min(R(vpH() * .6), 400)) + (S.mobile ? 0 : 24);
  const ah = S.out && !S.classic ? Math.max(drawnH(S.pose), S.mobile ? drawnH('curator') : 0) + 8 : 0;
  return S.mobile ? vpH() - S.lift - bh - ah : vpH() - S.lift - 24 - Math.max(bh, ah);
}
function reveal(el, smooth){
  const r = vr(el), top = headerBottom() + 44;
  let bottom = vpH() - S.lift - 40;
  if (S.mobile || overlapsGroup(r)) bottom = Math.min(bottom, groupTop() - 12);
  const ts = S.mobile ? null : tsRect(); if (ts && r.x + r.w > ts.left - 8) bottom = Math.min(bottom, ts.top - 12);
  if (r.y < top || r.y + r.h > bottom){
    let dy = r.y - top;
    if (r.h < bottom - top && r.y > top) dy = r.y + r.h - bottom;
    /* Kurze Seite: unten Platz schaffen, damit sich das Ziel über Mönch und Box schieben lässt */
    const room = d.documentElement.scrollHeight - vpH() - scrollY;
    if (dy > room){ S.padX = (S.padX || 0) + R(dy - room) + 8; sheetCheck(); }
    window.scrollBy({top:R(dy), behavior:smooth && !S.reduced ? 'smooth' : 'auto'});
    return true;
  }
  return false;
}
/* Oberkante eines Bereichs knapp unter den Header holen (Produktseite: Titel und Preis bleiben sichtbar) */
function scrollTopTo(el){ if (!el) return; const r = el.getBoundingClientRect(), t = headerBottom() + 12; if (Math.abs(r.top - t) > 24) window.scrollBy(0, R(r.top - t)); }
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
/* Box faltet sich zur Spitze ihres Zipfels und wieder auf */
const FOLD = [{transform:'scale(1,1)', opacity:1}, {transform:'scale(1,.05)', opacity:1, offset:.6}, {transform:'scale(.2,.05)', opacity:0}];
const folded = () => anim(box, FOLD, {duration:200, easing:'steps(4,end)', fill:'forwards'});
const unfolded = () => anim(box, FOLD.slice().reverse().map((k, i) => Object.assign({}, k, {offset:[0, .45, 1][i]})), {duration:220, easing:'steps(5,end)'});
/* Ältere Zeilen weg, damit die Box beim Zeigen kurz bleibt */
function trimLines(){ if (S.classic || S.typed || !bbody) return; const ls = $$('.smmk-line, .smmk-echo, .smmk-src', bbody); ls.slice(0, -1).forEach(n => n.remove()); }
/* Desktop: Liegt das Ziel hinter Mönch und Box, wechseln beide auf die andere Seite, wenn es dort frei ist */
function sideOx(right){ if (!right) return 0; const ts = tsRect(), lim = ts ? ts.left - 16 : vpW() - 24; return Math.max(0, R(lim - 650)); }
function setOx(ox){ S.ox = ox; stage.style.setProperty('--ox', ox + 'px'); }
/* Seitenwechsel: Box falten, im Laufschritt hinüber, Box daneben wieder aufklappen */
async function moveSide(ox){
  if (ox === S.ox) return;
  if (!S.out || S.reduced || S.classic){ setOx(ox); if (S.out){ const hm = home(); placeActor(hm.x, hm.y); } if (trayEl.style.display !== 'none') placeTray(); return; }
  const showBox = boxOn() && box.style.visibility !== 'hidden';
  if (showBox){ await aw(folded()); box.style.visibility = 'hidden'; }
  try { await walkTo(24 + 88 + ox, {fast:true}); setOx(ox); const hm = home(); placeActor(hm.x, hm.y); await paperTurn(1); }
  finally { if (showBox){ box.getAnimations().forEach(a => a.cancel()); box.style.visibility = ''; } box.classList.remove('away'); }
  if (showBox) await aw(unfolded());
  if (trayEl.style.display !== 'none') placeTray();
}
async function dodge(el){
  if (S.mobile || !el) return;
  const r = vr(el); if (!overlapsGroup(r)) return;
  const alt = sideOx(!S.ox); if (alt === S.ox) return;
  if (r.x > alt + GROUP_W + 12 || r.x + r.w < alt - 12) await moveSide(alt);
}
/* Steht der Mönch nach dem Zeigen noch auf dem Ziel (hohe Ziele, Handy), tritt er bis zur nächsten Antwort beiseite */
function duck(on){ if (!actor || S.duck === on) return; S.duck = on; actor.style.visibility = shadowC.style.visibility = on ? 'hidden' : ''; }
function spriteHits(els){ if (!S.out || S.classic) return false; const b = sp.getBoundingClientRect(); return els.some(e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width && r.left < b.right - 6 && r.right > b.left + 6 && r.top < b.bottom - 6 && r.bottom > b.top + 6; }); }
async function laserAt(el, o){
  o = o || {};
  if (!el) return;
  S.avoid = [el].concat(o.avoid || []);
  await laserCore(el, o);
  duckCheck();
}
function duckCheck(){ if (spotState && S.avoid && spriteHits(S.avoid)) duck(true); }
/* Pixelstern an der Stabspitze beim Aufladen */
function flashStar(p){
  const s = h('div', 'smmk-flash'); s.setAttribute('aria-hidden', 'true'); s.style.transform = `translate(${R(p.x - 3)}px,${R(p.y - 3)}px)`; stage.append(s);
  setTimeout(() => s.remove(), 120);
}
/* Einschlag: quadratischer Pixelring, der sich in drei Stufen weitet und verblasst */
function impactRing(x, y){
  if (still()) return;
  const r = h('div', 'smmk-ring'); r.setAttribute('aria-hidden', 'true'); r.style.left = R(x) + 'px'; r.style.top = R(y) + 'px'; stage.append(r);
  r.animate([{width:'12px', height:'12px', margin:'-6px 0 0 -6px', opacity:1}, {width:'36px', height:'36px', margin:'-18px 0 0 -18px', opacity:0}], {duration:210, easing:'steps(3,end)', fill:'forwards'}).finished.then(() => r.remove(), () => r.remove());
}
async function laserCore(el, o){
  const spot = o.spot !== false, dim = o.dim !== false;
  spotOff(); trimLines(); if (o.dodge !== false) await dodge(o.area || el); reveal(o.area || el); await w(80);
  if (S.mobile && o.walk !== false && !S.calm){
    const r0 = vr(o.aim || el), cx = r0.x + r0.w / 2;
    await stroll(cx - 44, {face: cx >= S.ax ? 1 : -1, pose:'curator'});
    if (S.out && !still()){ const f = cx >= S.ax ? 1 : -1; if (S.facing !== f) await paperTurn(f); }
  }
  if (S.reduced || S.classic || S.calm || !S.out){ const ap0 = aimPoint(vr(o.aim || el)); if (spot) spotOn(el, {dim:false, stat:true}); return ap0; }
  /* gezeigt wird immer mit dem Kurator-Stab */
  if (o.pose !== false && S.pose !== 'curator') await aw(setPose('curator', {dust:false}));
  const ap = aimPoint(vr(o.aim || el)), tx = ap.x, ty = ap.y;
  const hp = handPoint();
  const fold = boxOn() && box.style.visibility !== 'hidden' && crossesBox(hp, ap);
  if (fold){ await aw(folded()); box.style.visibility = 'hidden'; }
  const unfold = () => { box.getAnimations().forEach(a => a.cancel()); box.style.visibility = ''; };
  const beam = h('div', 'smmk-beam'); beam._to = {x:tx, y:ty};
  const fade = () => { if (!beam.isConnected) return; anim(beam, [{opacity:1}, {opacity:0}], {duration:160, easing:'steps(2,end)', fill:'forwards'}).then(() => { beam.remove(); laserEls = laserEls.filter(e => e !== beam); }); };
  try {
    /* Aufladen: drei Funken laufen zur Stabspitze, ein weißer Stern blitzt */
    sfx('charge');
    if (!fxOff()){ [[-18, -10], [14, -16], [-6, 18]].forEach(([dx, dy]) => spawn('conv', hp.x, hp.y, {dx, dy})); fxRun(); }
    await w(60); flashStar(hp); await w(60);
    const segs = aimBeam(beam, hp);
    stage.append(beam); laserEls.push(beam); sfx('laser');
    burst('sparks', hp.x, hp.y, 6);
    for (const s of segs){ s.style.opacity = 1; await w(55); }
    impactRing(tx, ty); burst('sparks', tx, ty, 22); sfx('sparkle');
    if (spot) await spotOn(el, {dim, iris:true});
    if (spot || fold){ setTimeout(fade, 350); await w(330); } else setTimeout(fade, Math.min(o.keep || 700, 700));
  } catch (e){ beam.remove(); if (fold) unfold(); throw e; }
  if (fold){ unfold(); await aw(unfolded()); }
  return ap;
}
/* Spotlight: Blende zieht sich in vier Stufen vom Dreifachen auf das Ziel zusammen, das Abdunkeln kommt in zwei Stufen */
function spotOn(el, o){
  o = o || {}; spotOff();
  const r = vr(el), pad = 8, top = o.marker ? 40 : pad;
  const x = R(r.x - pad), y = R(r.y - top), wd = R(r.w + pad * 2), ht = R(r.h + pad + top);
  const br = getComputedStyle(el).borderTopLeftRadius || '0', bv = parseFloat(br) || 0, tr = /%/.test(br) ? Math.min(r.w, r.h) * bv / 100 : bv;
  spotEl.style.setProperty('--r', R(Math.min(tr + pad, Math.min(wd, ht) / 2)) + 'px');
  Object.assign(spotEl.style, {display:'block', left:x + 'px', top:y + 'px', width:wd + 'px', height:ht + 'px'});
  const flat = o.dim === false || S.mobile;
  spotEl.classList.toggle('flat', flat);
  spotEl.classList.toggle('static', !!o.stat || S.reduced);
  spotState = {el, t:now()};
  if (!o.iris || still()) return Promise.resolve();
  const k0 = {left:R(x - wd) + 'px', top:R(y - ht) + 'px', width:wd * 3 + 'px', height:ht * 3 + 'px'}, k1 = {left:x + 'px', top:y + 'px', width:wd + 'px', height:ht + 'px'};
  if (!flat){ k0.boxShadow = '0 0 0 9999px rgba(11,12,14,.2)'; k1.boxShadow = '0 0 0 9999px rgba(11,12,14,.45)'; }
  return anim(spotEl, [k0, k1], {duration:200, easing:'steps(4,end)'});
}
function spotOff(){ if (!spotEl) return; spotEl.getAnimations().forEach(a => a.cancel()); spotEl.style.display = 'none'; spotState = null; }
/* Questmarker fällt aus 40 px und federt zweimal nach */
function markerOn(el){
  qmTarget = el; qmEl.classList.add('on'); placeMarker();
  qmEl.getAnimations().forEach(a => a.cancel());
  if (S.reduced) return;
  qmEl.animate([{marginTop:'-40px'}, {marginTop:'0px', offset:.45}, {marginTop:'-10px', offset:.65}, {marginTop:'0px', offset:.8}, {marginTop:'-3px', offset:.9}, {marginTop:'0px'}], {duration:440, easing:'steps(8,end)'})
    .finished.then(() => { if (qmTarget === el) qmEl.animate([{marginTop:'0px'}, {marginTop:'-8px'}], {duration:300, iterations:Infinity, direction:'alternate', easing:'steps(2,end)'}); }, () => {});
}
function placeMarker(){
  if (!qmTarget) return;
  if (S.yield || !qmTarget.isConnected || !vis(qmTarget)){ qmEl.style.visibility = 'hidden'; return; }
  const r = qmTarget.getBoundingClientRect(); qmEl.style.visibility = '';
  qmEl.style.transform = `translate(${R(r.left + r.width / 2 - 13)}px,${R(r.top - 30)}px)`;
}
function markerOff(){ qmTarget = null; if (qmEl){ qmEl.classList.remove('on'); qmEl.getAnimations().forEach(a => a.cancel()); } }

/* ---------- Dialogbox ---------- */
function setBoxOpen(on){ box.classList.toggle('on', on); if (on) box.setAttribute('open', ''); else box.removeAttribute('open'); }
/* Desktop: klappt vom Zipfel aus auf. Handy: Sheet fährt in vier Stufen hoch. */
function openBox(){
  if (boxOn()) return Promise.resolve();
  setBoxOpen(true); sheetCheck(); sfx('open');
  if (S.reduced) return anim(box, [{opacity:0}, {opacity:1}], {duration:150});
  if (S.mobile) return anim(box, [{transform:'translateY(100%)'}, {transform:'translateY(0)'}], {duration:200, easing:'steps(4,end)'});
  return unfolded();
}
function closeMenu(refocus){
  menuEl.hidden = true; const mb = $('.smmk-tools [data-tool=menu]', stage); mb.setAttribute('aria-expanded', 'false');
  if (refocus && boxOn()) try { mb.focus({preventScroll:true}); } catch (e) {}
}
function closeBox(){ setBoxOpen(false); box.classList.remove('wait', 'away'); box.getAnimations().forEach(a => a.cancel()); box.style.visibility = ''; closeMenu(false); clearTray(); S.padX = 0; sheetCheck(); }
/* Abgang der Box: faltet sich in den Mönch hinein, statt einfach zu verschwinden */
async function foldAway(){
  if (!boxOn()) return;
  sfx('close');
  if (!S.reduced && box.style.visibility !== 'hidden') await (S.mobile ? anim(box, [{transform:'translateY(0)'}, {transform:'translateY(100%)'}], {duration:200, easing:'steps(4,end)', fill:'forwards'}) : folded());
  closeBox();
}
/* Neue Runde: Knopf-Runden leeren die Box wie Spieldialoge. Im Tippmodus bleiben die letzten drei Wechsel stehen. */
let xid = 0;
function newTurn(echo, o){
  o = o || {};
  clearTray(); clearLaser(); S.anchor = null; duck(false);
  S.typed = !!o.typed;
  if (!S.classic){
    if (S.typed){ xid++; $$('[data-x]', bbody).forEach(n => { if (+n.dataset.x < xid - 2) n.remove(); }); $$(':scope > :not([data-x])', bbody).forEach(n => n.remove()); }
    else bbody.innerHTML = '';
  }
  choicesEl.innerHTML = '';
  if (echo){ const e = h('div', 'smmk-echo'); const s = h('span'); s.textContent = echo; e.append(s); addNode(e); }
}
/* Scrollt den Text ans Ende, außer eine Zeile soll oben stehen bleiben (Handy: Empfehlungen) */
function scrollBody(){ if (!bbody) return; const a = S.anchor; if (a && a.isConnected) bbody.scrollTop = a.previousElementSibling ? Math.max(0, a.getBoundingClientRect().top - bbody.getBoundingClientRect().top + bbody.scrollTop - 6) : 0; else bbody.scrollTop = bbody.scrollHeight; bodyFade(); }
/* Angeschnittene ältere Zeilen laufen oben weich aus, statt am Statustext zu kleben */
function bodyFade(){ bbody.classList.toggle('fade', bbody.scrollTop > 2); }
function addNode(n){ if (S.typed) n.dataset.x = xid; bbody.append(n); scrollBody(); return n; }
let advResolve = null, lineSeq = 0;
function advanceNow(){ if (advResolve){ const r = advResolve; advResolve = null; r(); } }
/* Mund und Stimme folgen dem Text: Vokal = offen (mit Ton), Konsonanten im Wechsel, Pausen und Satzzeichen zu */
const VOWELS = /[aeiouäöüAEIOUÄÖÜ]/;
function lastVowel(text, i){ for (let j = i + 1; j < text.length; j++){ const c = text[j]; if (VOWELS.test(c)) return false; if ('.!?'.includes(c)) return true; } return true; }
async function typeInto(el, text){
  S.typing = true; S.skip = false;
  const anim0 = !still() && S.out;
  try {
    if (still()){ el.textContent = text; }
    else {
      let i = 0, lastBounce = 0;
      const dt = S.fast ? 12 : 20;
      while (i < text.length){
        if (S.skip) break;
        if (S.hidden || S.yield){ await w(120); continue; }
        const ch = text[i++]; el.textContent = text.slice(0, i);
        if (anim0){
          if (VOWELS.test(ch)){
            mouth(true); voice(ch.toLowerCase(), lastVowel(text, i - 1));
            if (now() - lastBounce > 110){ lastBounce = now(); anim(sqEl, [{transform:'scale(1,1)'}, {transform:'scale(1.02,.97)'}], {duration:120, easing:'steps(2,end)'}); }
          } else mouth(false);
          if ('.!?'.includes(ch)) anim(ppEl, [{transform:'translateY(0)'}, {transform:'translateY(2px)'}, {transform:'translateY(0)'}], {duration:160, easing:'steps(2,end)'});
        }
        let dl = dt; if ('.!?:'.includes(ch)) dl += 150; else if (ch === ',') dl += 70;
        if (i % 6 === 0) scrollBody();
        await w(dl);
      }
      el.textContent = text;
    }
  } finally { S.typing = false; mouth(false); }
  scrollBody();
}
function announce(text){ const p = h('p'); p.textContent = text; srlog.append(p); srlog.removeAttribute('aria-busy'); }
/* Zeilen: Text oder {t, pose, emote, emoteMs, minMs}. o.onStart läuft, sobald die erste Zeile zu tippen beginnt
   (Knöpfe und Karten erscheinen damit sofort, der Text läuft weiter und lässt sich überspringen). */
async function speak(lines, o){
  o = o || {};
  lines = [].concat(lines).filter(Boolean);
  for (let i = 0; i < lines.length; i++){
    const L = typeof lines[i] === 'string' ? {t:lines[i]} : lines[i];
    /* KI-Gruß: wartet höchstens kurz auf die Sitzung, der Text steht erst danach fest; leer heißt überspringen */
    if (L.wait) await aw(L.wait);
    const tx = String(L.t || ''); if (!tx) continue;
    if (L.pose && S.out) await aw(setPose(L.pose));
    if (L.emote && S.out) emote(L.emote, L.emoteMs || 1600);
    $$('.smmk-line', bbody).forEach(n => n.classList.add('old'));
    let target;
    if (S.classic){
      const row = h('div', 'smmk-cmsg'); const av = h('div', 'smmk-av'); av.style.backgroundImage = `url(${asset('lupe')})`; const col = h('div'); row.append(av, col);
      target = h('p', 'smmk-line'); col.append(target); addNode(row);
    } else target = addNode(h('p', 'smmk-line'));
    /* KI-Hinweis: bleibt oben in der Box stehen, auch wenn danach Formular oder Knöpfe folgen */
    if (L.anchor){ S.anchor = target; scrollBody(); }
    target.setAttribute('aria-hidden', 'true');
    const t0 = now();
    srlog.setAttribute('aria-busy', 'true');
    if (o.onStart){ const f = o.onStart; o.onStart = null; f(); }
    try { await typeInto(target, tx); } catch (e){ srlog.removeAttribute('aria-busy'); throw e; }
    announce(tx);
    target.removeAttribute('aria-hidden'); target.id = 'smmkLn' + (++lineSeq); box.setAttribute('aria-describedby', target.id);
    if (L.minMs){ const rest = L.minMs - (now() - t0); if (rest > 0) await w(rest); }
    if (i < lines.length - 1 && !S.classic && !S.reduced){
      box.classList.add('wait'); S.waitAdv = true;
      const pause = Math.min(900, 450 + tx.length * 8);
      await aw(Promise.race([sleep(pause), new Promise(r => { advResolve = r; })]));
      advResolve = null; S.waitAdv = false; box.classList.remove('wait');
    }
  }
  if (o.onStart) o.onStart();
  S.lastInput = now();
}
/* Antworten: {l, f} oder {l, href} (Navigation); pri = der eine Hauptweg, link = leiser Ausgang; id = Schritt für die Messung */
const EXITS = /^(Was anderes suchen|Mit Mensch sprechen|Danke|Nein danke|Schließen|Nein)$/;
let chFocusT = 0, chDots = false;
function choices(list, o){
  o = o || {}; const host = o.host || choicesEl;
  choicesEl.innerHTML = ''; host.innerHTML = '';
  list.filter(Boolean).forEach(c => {
    const lk = c.link || (c.link !== 0 && !c.pri && EXITS.test(c.l));
    const b = h('button', 'smmk-ch' + (lk ? ' lk' : '') + (c.pri ? ' pri' : '')); b.type = 'button'; b.textContent = c.l;
    b.addEventListener('click', () => {
      if (b.disabled) return; $$('.smmk-ch', host).forEach(x => { x.disabled = true; }); markUsed();
      S.lastInput = now(); TURN++; sfx('confirm');
      if (S.typing) S.skip = true;
      if (c.id) push('sm_monk_step', {sm_step:c.id, sm_value:c.v != null ? c.v : c.l});
      if (c.echo !== false) newTurn('Du: ' + c.l); else newTurn();
      go(c.f || (() => navTo(c.href, c.cue, c.say)));
    });
    /* Vorladen, sobald ein Knopf angepeilt wird (Zeiger, Finger, Tastatur): das Regal liegt beim Klick schon bereit */
    if (c.pre){ const pf = () => { if (!b._pre){ b._pre = 1; c.pre(); } }; ['pointerenter', 'touchstart', 'focus'].forEach(ev => b.addEventListener(ev, pf, {passive:true})); }
    host.append(b);
  });
  S.lastInput = now(); chDots = false;
  host.classList.toggle('many', list.filter(Boolean).length > 8);
  requestAnimationFrame(scrollBody);
  if (!S.mobile && list.length && boxOn()){ const r = vr(choicesEl); glance(r.x + r.w / 2, 600); }
  if (o.focus !== false && list.length) focusFirst(host);
}
function focusFirst(host){ const b = $('.smmk-ch:not(:disabled)', host || choicesEl); if (b) try { b.focus({preventScroll:true}); } catch (e) {} }
/* Sprechen und Antworten in einem: Knöpfe erscheinen mit der ersten Zeile, der Fokus springt erst am Ende */
async function ask(lines, list, o){
  o = o || {};
  await speak(lines, {onStart:() => choices(list, Object.assign({}, o, {focus:false}))});
  keepClear();
  if (o.focus !== false) focusFirst(o.host);
}
/* Nach dem Sprechen ist die Box meist gewachsen: liegt sie (oder am Handy der Mönch auf dem Sheet) über dem gezeigten Ziel,
   rückt die Seite so weit nach, dass das Ziel frei liegt und unter dem Header bleibt. Erst wenn das nicht reicht, tritt er beiseite. */
function keepClear(){
  if (!spotState || S.yield || !boxOn() || box.style.visibility === 'hidden') return;
  const el = spotState.el; if (!el || !el.isConnected) return;
  const r = vr(el), b = vr(box);
  let lim = (r.x < b.x + b.w && r.x + r.w > b.x) ? b.y - 12 : Infinity;
  if (S.mobile && S.out && !S.classic){ duck(false); const sr = sp.getBoundingClientRect(); if (sr.height && r.x < sr.right && r.x + r.w > sr.left) lim = Math.min(lim, sr.top - 8); }
  const over = r.y + r.h + 8 - lim;
  if (over > 2){
    const dy = R(Math.min(over, r.y - 8 - (headerBottom() + 8)));
    if (dy > 2){
      const room = d.documentElement.scrollHeight - vpH() - scrollY;
      if (dy > room){ S.padX = (S.padX || 0) + R(dy - room) + 8; sheetCheck(); }
      try { window.scrollBy({top:dy, behavior:'instant'}); } catch (e) { window.scrollBy(0, dy); }
      spotOn(el, {dim:!spotEl.classList.contains('flat'), stat:spotEl.classList.contains('static')});
      if (qmTarget) placeMarker();
    }
  }
  duckCheck();
}
function allChoices(){ return $$('.smmk-choices .smmk-ch', stage); }
function focusLog(){ try { bbody.focus({preventScroll:true}); } catch (e) {} }
/* Quelle unter einer Antwort: „Mehr dazu: …“ */
function sourceLine(src){ if (!src || !src.l) return; const p = h('p', 'smmk-src'); p.append('Mehr dazu: '); if (src.href){ const a = h('a'); a.href = src.href; a.textContent = src.l; p.append(a); } else p.append(src.l); addNode(p); }

/* Handy: Seite bleibt über dem Sheet scrollbar. Das Trusted-Shops-Badge bleibt sichtbar und klickbar:
   Knöpfe und Eingabe im Sheet lassen seine Ecke frei (--tsw Breite, --tsh Höhe der Ecke über der Sheet-Unterkante). */
function sheetCover(){ return (S.mobile && boxOn() && !S.yield) ? box.offsetHeight + 150 : 0; }
let tsKeep = '';
function sheetCheck(){
  padEl.style.height = (sheetCover() + (S.padX || 0)) + 'px';
  const want = S.mobile && boxOn() && !S.yield;
  d.documentElement.classList.toggle('smmk-sheet', want);
  let tw = 0, th = 0;
  if (want){
    const t = tsRect(), bb = vpH() - S.lift - (parseFloat(stage.style.getPropertyValue('--kb')) || 0);
    if (t && t.bottom > bb - 400 && t.top < bb && t.left > vpW() / 2){ tw = R(vpW() - t.left + 6); th = R(bb - t.top + 2); }
  }
  const k = tw + ',' + th; if (k !== tsKeep){ tsKeep = k; stage.style.setProperty('--tsw', tw + 'px'); stage.style.setProperty('--tsh', th + 'px'); }
}
function rideSheet(){
  if (!S.mobile || !S.out || !boxOn()) return;
  if (actor.getAnimations().some(a => a !== rideSheet.a && a.playState === 'running')) return;
  const hm = home(); if (hm.y === S.ay && hm.x === S.ax) return;
  /* Truhe und Kachel fahren mit der Sheet-Kante mit */
  const dy = hm.y - S.ay;
  [propEl, floatTile].forEach(e => { if (!e) return; if (e === propEl) e.style.top = (parseFloat(e.style.top) + dy) + 'px'; else e.style.marginTop = ((parseFloat(e.style.marginTop) || 0) + dy) + 'px'; });
  const from = actor.style.transform; placeActor(hm.x, hm.y); duckCheck();
  laserEls.forEach(b => { if (b.isConnected && b._to) aimBeam(b, handPoint()); });
  if (!S.reduced && !S.hidden && from) rideSheet.a = actor.animate([{transform:from}, {transform:actor.style.transform}], {duration:120, easing:'steps(2,end)'});
}

/* ---------- Kartenstapel ---------- */
function tsRect(){
  const t = tsEl(); if (!t) return null;
  const inner = $$('*', t).find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width > 20) || $('button', t) || t;
  const r = inner.getBoundingClientRect(); return r.width > 0 ? r : null;
}
/* Desktop: Karten neben der Box, wenn sie dort Platz haben (bis vor das Trusted-Shops-Badge). Sonst cw = 0:
   dann eine flache Leiste aus drei Zeilen über der Box. */
function trayGeom(n){
  const br = vr(box), ts = tsRect(), lim = ts ? ts.left - 12 : vpW() - 12;
  const fits = cw => br.x + br.w + 26 + n * cw + (n - 1) * 12 <= lim, room = R(lim - (br.x + br.w + 26));
  return {br, lim, cw:fits(180) ? 180 : fits(150) ? 150 : 0, col:room >= 220 ? Math.min(320, room) : 0};
}
function placeTray(){
  const n = $$('.smmk-card, .smmk-row', trayEl).length || 3, g = trayGeom(n), br = g.br;
  let left;
  if (trayEl.classList.contains('col')){
    trayEl.style.setProperty('--sw', (g.col || 220) + 'px');
    left = R(br.x + br.w + 26); trayEl.style.bottom = (24 + S.lift) + 'px';
  } else if (trayEl.classList.contains('strip')){
    left = Math.max(16, R(br.x - 240));
    trayEl.style.setProperty('--sw', Math.max(300, Math.min(960, R(g.lim - left))) + 'px');
    trayEl.style.bottom = (24 + S.lift + box.offsetHeight + 18) + 'px';
  } else if (g.cw){
    trayEl.style.setProperty('--cw', g.cw + 'px');
    left = R(br.x + br.w + 26); trayEl.style.bottom = (24 + S.lift) + 'px';
  } else {
    const tw = n * 150 + (n - 1) * 12; trayEl.style.setProperty('--cw', '150px');
    left = Math.max(12, Math.min(R(br.x), R(g.lim - tw))); trayEl.style.bottom = (24 + S.lift + box.offsetHeight + 22) + 'px';
  }
  trayEl.style.left = left + 'px';
}
function clearTray(){ if (!trayEl) return; trayEl.innerHTML = ''; trayEl.style.display = 'none'; trayEl.classList.remove('strip', 'col'); $$('.smmk-fly', stage).forEach(e => e.remove()); }
/* Karte fliegt verdeckt aus der Hand und dreht sich im letzten Drittel um */
function flyOut(el, hp, kfFn, dur){
  const r = vr(el);
  const fly = h('div', 'smmk-fly'); fly.setAttribute('aria-hidden', 'true');
  fly.style.width = R(r.w) + 'px'; fly.style.left = R(r.x) + 'px'; fly.style.top = R(r.y) + 'px';
  fly.style.setProperty('--cw', R(r.w) + 'px');
  const c = el.cloneNode(true); c.style.opacity = 1; c.classList.add('flip'); $$('button, a', c).forEach(b => { b.tabIndex = -1; }); fly.append(c); stage.append(fly);
  const dx = R(hp.x - (r.x + r.w / 2)), dy = R(hp.y - (r.y + r.h / 2));
  c.animate([{transform:'rotateY(180deg)'}, {transform:'rotateY(180deg)', offset:.7}, {transform:'rotateY(90deg)', offset:.85}, {transform:'rotateY(0deg)'}], {duration:dur, easing:'steps(6,end)'});
  return anim(fly, kfFn(dx, dy), {duration:dur, easing:'cubic-bezier(.2,.8,.3,1)'}).then(() => {
    el.style.opacity = 1; fly.remove();
    /* Landen: leicht schief, in zwei Bildern gerade */
    if (!still()){ const t = ((Math.random() * 3) - 1.5).toFixed(1); el.animate([{transform:`rotate(${t}deg)`}, {transform:`rotate(${(t / 2).toFixed(1)}deg)`}, {transform:'none'}], {duration:140, easing:'steps(2,end)'}); }
    return r;
  });
}
/* Wie auf der Seite: ab 1.000 auf Hunderter, ab 100 auf Zehner abgerundet, mit „+“; unter 10 nichts */
function fmtCount(n){
  n = +n || 0;
  if (n >= 1000) return (Math.floor(n / 100) * 100).toLocaleString('de-DE') + '+ Bestellungen';
  if (n >= 100) return (Math.floor(n / 10) * 10) + '+ Bestellungen';
  if (n >= 10) return n + ' Bestellungen';
  return '';
}
/* Ein Grund für die Zeile unter dem Preis: Rang in der Kollektion, sonst Bestellzahl, sonst der Wunschtext */
function whyLine(p, a){
  if (typeof p.why === 'string' && p.why) return p.why;
  if (p.r === 0 || p.r === 1){ const src = p.src || (a && SRC[a.l] && p.ch === a.hs[0] ? SRC[a.l] : p.ct ? '„' + p.ct + '“' : ''); if (src) return `Nr. ${p.r + 1} bei ${src}`; }
  const c = fmtCount(p.n); if (c) return c;
  if (p.z) return 'Mit Deinem Wunschtext graviert' + (a && AUD_EX[a.l] ? ', ' + AUD_EX[a.l] : '');
  return '';
}
/* Abzeichen nur, wenn es etwas sagt, das der Grund nicht schon sagt */
function badgeOf(p, why){ if (p.over) return 'Etwas über Budget'; return p.z && !/Wunschtext|Deinem Text|Deinen Text|graviert/i.test(why) ? 'Mit Deinem Text' : ''; }
/* Produkttyp nur, wenn er nicht schon im Titel steht und nicht Standard oder Besonderes Produkt ist */
function typeOf(p){ const y = String(p.y || '').trim(); if (!y || /^(Standard|Besonderes Produkt)$/i.test(y)) return ''; const t = String(p.t || '').toLowerCase(); return y.split(/[\s-]+/).some(wd => wd.length > 3 && t.includes(wd.toLowerCase())) ? '' : y; }
/* Wie auf der Seite mit bis zu zwei Stellen, nie aufgerundet; schwache Bewertungen zeigt der Mönch nicht */
function rating(p){
  const rv = parseFloat(p.rv), rc = +p.rc || 0;
  if (rc < 10 || !rv || rv < 4.5) return '';
  return (Math.floor(rv * 100 + 1e-6) / 100).toLocaleString('de-DE', {minimumFractionDigits:1, maximumFractionDigits:2}) + ' (' + rc + ')';
}
/* Gewählte Größe und Preis: '22,5 cm · € 59,00', sonst ab-Preis */
function priceHtml(p){
  if (p.cv && p.cv.l) return `<span class="smmk-price">${esc(fmtSize(p.cv.l))} · ${esc(euro(p.cv.c))}</span>`;
  return `<span class="smmk-price">${esc((p.q > p.p ? 'ab ' : '') + euro(p.p))}</span>`;
}
/* „größer bis“ nur bei Stücken mit Größen: teuerste Größe (je Größe die günstigste Variante) */
function moreHtml(p){ if (!p.cv || !Array.isArray(p.v)) return ''; const top = Math.max(...p.v.map(v => +v[1])); return top > p.cv.c ? `<small class="smmk-up">größer bis ${esc(euro(top))}</small>` : ''; }
function metaHtml(p){ const r = rating(p); return priceHtml(p) + (r ? ` · <span class="smmk-rt"><span class="smmk-star">★</span> ${esc(r)}</span>` : ''); }
/* Immer mit Variante: die gewählte Größe, sonst die erste verfügbare (Feld d aus collection.moench) */
const linkOf = p => { const v = p.cv && p.cv.id ? p.cv.id : +p.d || 0; return p.u + (v ? '?variant=' + v : ''); };
function showBtn(p, label){
  const b = h('button', 'smmk-show', (label ? esc(label) + ' ' : '') + ICO.arrow); b.type = 'button';
  b.setAttribute('aria-label', 'Zeig es mir: ' + p.t); b.addEventListener('click', () => showIt(p, b)); return b;
}
/* Zeile: Handy und schmale Desktop-Leiste */
function rowEl(p, a){
  const r = h('div', 'smmk-row'), why = whyLine(p, a);
  r.dataset.h = p.h;
  r.innerHTML = `${p.i ? `<img class="im" src="${esc(p.i)}" alt="" width="56" height="56">` : '<span class="im" aria-hidden="true"></span>'}<div><b>${esc(p.t)}</b><small>${metaHtml(p)}</small>${moreHtml(p)}${why ? `<small class="smmk-eb">${esc(why)}</small>` : ''}</div>`;
  r.append(showBtn(p)); return r;
}
/* Karte: Bild, Typ, Titel, Preiszeile, Grund, höchstens ein Abzeichen, Knopf */
function cardEl(p, a){
  const c = h('div', 'smmk-card'), why = whyLine(p, a), bdg = badgeOf(p, why), ty = typeOf(p);
  c.dataset.h = p.h;
  c.innerHTML = `${p.i ? `<img class="im" src="${esc(p.i)}" alt="" width="168" height="126">` : '<span class="im" aria-hidden="true"></span>'}<div class="in">${ty ? `<span class="smmk-ty">${esc(ty)}</span>` : ''}<b class="ti">${esc(p.t)}</b><span class="smmk-meta">${metaHtml(p)}</span>${moreHtml(p)}${why ? `<span class="smmk-eb">${esc(why)}</span>` : ''}${bdg ? `<span class="smmk-bdg">${esc(bdg)}</span>` : ''}</div>`;
  $('.in', c).append(showBtn(p, 'Zeig es mir')); return c;
}
/* Zeigt der Besucher auf eine Karte, schaut der Mönch hin; eine Glühbirne höchstens einmal je Karte */
function cardHover(el){
  const on = () => { el.classList.add('hov'); if (S.mobile || !S.out || S.busy && S.anims) return; const r = vr(el); glance(r.x + r.w / 2, 1200); if (!el._bulb){ el._bulb = 1; emote('bulb', 900); } };
  const off = () => el.classList.remove('hov');
  el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
  el.addEventListener('focusin', on); el.addEventListener('focusout', off);
}
const flick = () => anim(sqEl, [{transform:'none'}, {transform:'skewX(-6deg) translateX(4px)'}, {transform:'none'}], {duration:160, easing:'steps(2,end)'});
/* o.instant: Karten liegen sofort da, ohne Flug (Zurück zu den Vorschlägen) */
async function dealCards(items, a, list, o){
  o = o || {};
  items.forEach(p => S.shown.add(p.h)); S.dealt = true;
  ssUpd({recs:Array.from(new Set((SS.recs || []).concat(items.map(p => p.h)))).slice(-24)});
  ecomm('view_item_list', list || ((a ? a.l : 'hier') + '|' + (S.budget || '')), items);
  const quick = o.instant || still() || !S.out;
  if (S.mobile){
    /* Handy: nur die Leitzeile bleibt über den Zeilen stehen, damit Zeilen und Knöpfe ins Sheet passen */
    if (!S.classic && !S.typed){ const ls = $$('.smmk-line, .smmk-echo, .smmk-src', bbody), lead0 = $$('.smmk-line', bbody).pop(); ls.forEach(n => { if (n !== lead0) n.remove(); }); }
    const wrap = addNode(h('div', 'smmk-rows'));
    const els = items.map(p => { const r = rowEl(p, a); r.style.opacity = 0; wrap.append(r); cardHover(r); return r; });
    addNode(h('p', 'smmk-taxl', TAXL));
    const lead = $$('.smmk-line', bbody).pop(); S.anchor = lead || wrap;
    scrollBody(); rideSheet();
    const hp = handPoint(), flights = [];
    for (const r of els){
      if (quick){ r.style.opacity = 1; continue; }
      sfx('deal');
      flick();
      flights.push(flyOut(r, hp, (dx, dy) => [{transform:`translate(${dx}px,${dy}px) scale(.2)`, opacity:0}, {transform:`translate(${R(dx * .85)}px,${R(dy * .85)}px) scale(.3)`, opacity:1, offset:.1}, {transform:'none', opacity:1}], 420).then(rr => burst('sparks', rr.x + 30, rr.y + rr.h / 2, 8)));
      await w(120);
    }
    await aw(Promise.all(flights)); await w(150); return;
  }
  const hp = handPoint();
  /* Karten neben der Box; passt das nicht, eine Spalte aus Zeilen neben der Box; erst dann die Leiste über der Box */
  const g0 = trayGeom(items.length), mode = g0.cw ? '' : g0.col ? 'col' : 'strip';
  trayEl.classList.toggle('strip', mode === 'strip'); trayEl.classList.toggle('col', mode === 'col');
  trayEl.innerHTML = '<div class="tcards"></div><p class="smmk-taxl">' + TAXL + '</p>'; trayEl.style.display = 'flex';
  const cards = $('.tcards', trayEl);
  const els = items.map(p => { const c = mode ? rowEl(p, a) : cardEl(p, a); c.style.opacity = 0; cards.append(c); cardHover(c); return c; });
  placeTray(); const flights = [];
  for (const c of els){
    if (quick){ c.style.opacity = 1; continue; }
    sfx('deal');
    flick();
    flights.push(flyOut(c, hp, (dx, dy) => [{transform:`translate(${dx}px,${dy}px) scale(.15)`, opacity:0}, {transform:`translate(${R(dx * .88)}px,${R(dy * .88 - 12)}px) scale(.24)`, opacity:1, offset:.1}, {transform:`translate(${R(dx * .35)}px,${R(dy * .35 - 40)}px) scale(.7)`, opacity:1, offset:.55}, {transform:'none', opacity:1}], 480).then(r => burst('sparks', r.x + r.w / 2, r.y + 30, 10)));
    await w(120);
  }
  await aw(Promise.all(flights)); await w(150);
}

/* ---------- Produktdaten (gleiche Herkunft, ohne Backend) ---------- */
const COLL = {};
const collUrl = (hd, pg) => '/collections/' + encodeURIComponent(hd) + '?view=moench&sort_by=best-selling' + (pg ? '&page=' + pg : '');
const getJson = u => fetch(u, {credentials:'same-origin'}).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
/* Mehr als 60 Stücke: Seite 2 dazu (höchstens zwei Seiten) */
function fetchColl(hd){
  if (!COLL[hd]) COLL[hd] = getJson(collUrl(hd))
    .then(j => (+j.n > 60 && Array.isArray(j.p)) ? getJson(collUrl(hd, 2)).then(j2 => Object.assign(j, {p:j.p.concat(Array.isArray(j2.p) ? j2.p : [])})).catch(() => j) : j)
    .catch(e => { delete COLL[hd]; throw e; });
  return COLL[hd];
}
async function loadPool(handles){
  const res = await Promise.allSettled(handles.map(fetchColl)), seen = new Map();
  res.forEach((r, k) => {
    if (r.status !== 'fulfilled' || !r.value || !Array.isArray(r.value.p)) return;
    r.value.p.forEach((p, i) => { const o = seen.get(p.h); if (!o || i < o.pos) seen.set(p.h, Object.assign({}, p, {pos:i, ct:r.value.ti || '', ch:handles[k], r:p.r != null ? +p.r : null})); });
  });
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
/* Schwach bewertete Stücke (unter 4 Sternen bei mindestens 5 Bewertungen) rutschen ans Ende */
const weak = p => (+p.rc || 0) >= 5 && parseFloat(p.rv) > 0 && parseFloat(p.rv) < 4;
/* Preisbänder. Ein Stück passt über seine Größen: gewählt wird die teuerste verfügbare Größe im Band. */
const BANDS = {b15:{l:'bis 15 €', lo:0, hi:1500, s:'bis 15 €'}, b30:{l:'15 bis 30 €', lo:1500, hi:3000, s:'zwischen 15 und 30 €'},
  b60:{l:'30 bis 60 €', lo:3000, hi:6000, s:'zwischen 30 und 60 €'}, b60p:{l:'über 60 €', lo:6000, hi:Infinity, s:'über 60 €'}};
const OLDB = {'30':'b30', '60':'b60', mehr:'b60p'};
const bandOf = b => typeof b === 'object' && b ? b : BANDS[OLDB[b] || b] || null;
/* Unter 10 € (Anstecker, Aufnäher): nie auf einem Geschenkplatz, nur als „Kleinigkeit dazu?“ */
const isMini = p => p.p < 1000;
const variantsOf = p => (Array.isArray(p.v) && p.v.length) ? p.v.map(v => ({id:v[0], c:+v[1], l:v[2]})) : [{id:0, c:+p.p, l:''}];
function fitOf(p, b){
  const B = bandOf(b), V = variantsOf(p), mx = L => L.reduce((m, v) => v.c > m.c ? v : m);
  if (!B) return {fit:1, v:null};
  const inB = V.filter(v => v.c > B.lo && v.c <= B.hi);
  if (inB.length) return {fit:1, v:mx(inB)};
  if (B.hi !== Infinity){ const below = V.filter(v => v.c <= B.lo && v.c >= .4 * B.hi); if (below.length) return {fit:.5, v:mx(below)}; }
  return {fit:0, v:null};
}
/* Punkte = ln(Bestellungen + 1) x Passung; Passung 1 im Band, 0,5 knapp darunter */
function scored(pool, b, all){
  const B = bandOf(b), mini = !!(B && B.mini);
  return pool.filter(p => (mini || !isMini(p)) && (all || !S.shown.has(p.h))).map(p => { const f = fitOf(p, b); return Object.assign({}, p, {fit:f.fit, cv:f.v && f.v.id ? f.v : null, sc:Math.log((+p.n || 0) + 1) * f.fit}); })
    .filter(p => p.fit > 0).sort((x, y) => (weak(x) - weak(y)) || (y.sc - x.sc) || (x.pos - y.pos));
}
/* Erst alles im Band; Stücke knapp darunter füllen nur auf, wenn das Band keine drei hergibt, und stehen immer hinten */
function pick(pool, b){
  const L = scored(pool || [], b), inB = L.filter(p => p.fit === 1), lo = L.filter(p => p.fit < 1);
  if (L.length < 2) return {tier:'none', items:[]};
  const items = inB.length >= 3 ? diverse(inB, 3) : inB.concat(diverse(lo, 3 - inB.length));
  return {tier:'ok', items};
}
/* Ein Band erscheint nur mit mindestens zwei passenden Stücken, eins davon mitten im Band */
const bandOk = (list, b) => { const L = scored(list, b, true); return L.length >= 2 && L.some(p => p.fit === 1); };
const okBudgets = (list, not) => Object.keys(BANDS).filter(b => b !== not && (!list || bandOk(list, b)));
const bandCount = (list, b) => scored(list, b).filter(p => p.fit === 1).length;
const minis = list => (list || []).filter(p => isMini(p) && !S.shown.has(p.h)).sort((x, y) => (weak(x) - weak(y)) || ((+y.n || 0) - (+x.n || 0)) || (x.pos - y.pos));
/* Variante zu einer gespeicherten Karte wiederfinden (Zurück zu meinen Vorschlägen) */
function withFit(p, b){ const f = fitOf(p, b); return Object.assign({}, p, {fit:f.fit, cv:f.v && f.v.id ? f.v : null}); }

/* ---------- Seitenkontext ---------- */
const SIZE_RE = /Durchmesser|Größe|Groesse|Breite|Höhe|Länge|Format|Size/i;
function pageKind(){
  const t = CTX.t, pg = CTX.pg || '', c = CTX.c || '';
  if (t === 'index') return 'home';
  if (t === 'product') return CTX.gc ? 'pdpgc' : CTX.pz ? 'pdp' : 'pdpq';
  if (t === 'collection') return audByColl(c) ? 'acoll' : 'coll';
  if (t === 'cart') return (+CTX.n > 0) ? 'cart' : 'cartEmpty';
  if (t === 'search') return CTX.z ? 'searchZero' : searchQ() ? 'search' : 'other';
  if (t === '404') return '404';
  if (t === 'page'){
    if (/^(sendungsverfolgung|deine-bestellung)$/.test(pg)) return 'track';
    if (pg === 'fragen') return 'faq';
    if (pg === 'kontakt') return 'kontakt';
    if (/^(anfragen|dein-firmenschild)$/.test(pg)) return 'sonder';
    if (pg === 'dein-wappen') return 'wappen';
  }
  if ((t === 'article' || t === 'blog') && artAud()) return 'article';
  return 'other';
}
function searchQ(){ try { return (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 60); } catch (e) { return ''; } }
/* Ratgeber-Blogs: nutzliches-fur-die-feuerwehr, nutzliches-fur-handwerker (Vorlagen-Suffix ratgeber-feuerwehr auf der Liste) */
function artAud(){ const k = (CTX.b || '') + ' ' + (CTX.s || ''); return /feuerwehr/.test(k) ? 'Feuerwehr' : /handwerk/.test(k) ? 'Handwerker' : null; }
const isWappen = () => /^(familienwappen|modernes-wappen|dein-wunsch-wappen)$/.test(CTX.h || '') || CTX.c === 'wappen';
const visibleOne = sel => $$(sel).find(vis) || null;
async function waitFor(fn, ms){ const t0 = now(); let e = fn(); while (!e && now() - t0 < ms){ await w(150); e = fn(); } return e; }
const legendOf = f => { const lg = $('legend, label', f); return lg ? lg.textContent.trim().split('\n')[0].trim() : ''; };
function optionSets(){ return $$('main variant-radios fieldset, main variant-selects fieldset, main fieldset.product-form__input, main variant-selects .product-form__input').filter(vis).filter((f, i, a) => a.indexOf(f) === i); }
function sizeFieldset(){ return optionSets().find(f => SIZE_RE.test(legendOf(f))) || null; }
function sizeLabels(fs){ return fs ? $$('input[type=radio]', fs).map(i => ({v:i.value, input:i, label:fs.querySelector(`label[for="${CSS.escape(i.id)}"]`)})) : []; }
/* Erste Optionsgruppe mit mehreren Werten, die nicht die Größe ist (Design, Oberfläche) */
function otherOptionSet(){ const sz = sizeFieldset(); return optionSets().find(f => f !== sz && ($$('input[type=radio]', f).length > 1 || $$('option', f).length > 1)) || null; }
function productInfo(){ return visibleOne('main product-info, main .product__info-wrapper, main .product__info-container') || visibleOne('main h1'); }
function atcButton(){ return visibleOne('main .product-form__submit, main [name="add"], .product-form__submit'); }
async function pdpTarget(pers){
  if (CTX.gc){ const v = visibleOne('#ftAmts, main .ft-amts, main variant-selects, main variant-radios, main .product-form__input'); if (v) return {el:v, kind:'amount'}; }
  if (pers && !S.zOpened){ const z = await waitFor(() => visibleOne('.pplr-c-button'), 6000); if (z) return {el:z, kind:'pers'}; }
  const q = visibleOne('.pin-tiers, .smk-quantity'); if (q) return {el:q, kind:'qty'};
  const a = atcButton(); if (a) return {el:a, kind:'atc'};
  return null;
}
/* Produktdaten der Seite: erst nach einem Klick, gleiche Herkunft */
let PRODJ = null;
function prodJson(){ if (!PRODJ && CTX.h) PRODJ = getJson('/products/' + encodeURIComponent(CTX.h) + '.js').catch(e => { PRODJ = null; throw e; }); return PRODJ || Promise.reject(new Error('kein Produkt')); }
function selectedVariantId(){ const i = $('main form[action*="/cart/add"] [name="id"]'); return i ? +i.value : 0; }
/* Je Größe die günstigste verfügbare Variante, aus /products/<handle>.js */
async function sizeTable(fs){
  const pj = await prodJson(), name = legendOf(fs).toLowerCase();
  const opts = (pj.options || []).map(o => typeof o === 'string' ? o : o.name);
  let oi = opts.findIndex(o => String(o).toLowerCase() === name); if (oi < 0) oi = opts.findIndex(o => SIZE_RE.test(o));
  if (oi < 0) return null;
  const by = new Map();
  (pj.variants || []).forEach(v => { if (!v.available) return; const val = v.options[oi]; const o = by.get(val); if (!o || v.price < o.c) by.set(val, {v:val, c:v.price, id:v.id}); });
  const order = sizeLabels(fs).map(s => s.v);
  const rows = order.map(v => by.get(v)).filter(Boolean);
  const sel = (pj.variants || []).find(v => v.id === selectedVariantId());
  return {rows, oi, sel, pj};
}
const bestsellerSize = fs => { const l = fs && $('label.custom-size-highlight', fs); return l ? (l.getAttribute('label-name') || l.textContent).trim() : ''; };
function faqGroup(g){ return $(`.ft-faq-g[data-g="${g}"]`); }
function contactForm(){ return visibleOne('main form[action*="/contact"], main #ContactForm, main .contact form, main form[action*="contact"]') || visibleOne('main form'); }

/* ---------- Runden: eine Form, die später auch eine Server-Antwort (/turn) unverändert darstellt ---------- */
/* {say:[{t, emote, pose}], mood, chips:[{id, l, pri, link, href, cue}], cards, actions:[{name, target}], form, source:{l, href}} */
const CHIP = {};
function chipOf(c){ if (c.f || c.href) return c; const fn = CHIP[c.id]; return Object.assign({}, c, {f:fn ? () => fn(c) : () => routeText(c.l)}); }
async function act(a){
  if (!a) return;
  if (a.name === 'pose'){ if (POSES[a.target]) await aw(setPose(a.target)); return; }
  const el = typeof a.target === 'string' ? visibleOne(a.target) : a.target; if (!el) return;
  if (a.name === 'open' && el.tagName === 'DETAILS') el.open = true;
  if (a.name === 'laser') await laserAt(el, {spot:true, dim:false, aim:a.aim, keep:1600});
  if (a.name === 'marker') markerOn(el);
  if (a.name === 'dodge') await dodge(el);
}
async function render(t){
  t = t || {};
  if (t.mood === 'calm') S.calm = true; else if (t.mood) S.calm = false;
  for (const a of t.actions || []) await act(a);
  const say = [].concat(t.say || []).filter(Boolean).map(s => typeof s === 'string' ? {t:s} : s);
  const chips = (t.chips || []).filter(Boolean).map(chipOf);
  const cards = !!(t.cards && t.cards.length), later = cards || !!t.source;
  /* Karten fliegen schon, während die Leitzeile tippt; Knöpfe ohne Karten erscheinen mit der ersten Zeile */
  let dealP = null;
  const deal = () => { dealP = dealCards(t.cards, t.aud, t.list, t.deal); dealP.catch(() => {}); };
  if (say.length) await speak(say, {onStart:() => { if (cards) deal(); else if (!later && chips.length) choices(chips, {focus:false}); }});
  else if (cards) deal();
  if (dealP) await dealP;
  if (t.source) sourceLine(t.source);
  if (later || !say.length) choices(chips, {focus:false});
  if (t.form === 'compose' && S.compose) try { inputEl.focus({preventScroll:true}); } catch (e) {}
  else if (t.focus === 'show'){ const b = $$('.smmk-show', stage).find(x => !x.disabled && x.offsetParent !== null); if (b) try { b.focus({preventScroll:true}); } catch (e) {} }
  else if (chips.length) focusFirst();
  keepClear();
}
/* Denkpause um jede asynchrone Quelle: Lupe, „…“, mindestens 400 ms; Fehler und Zeitüberschreitung mit festen Zeilen */
async function think(job, o){
  o = o || {}; const t0 = now(), prev = S.pose;
  if (S.out){ actor.classList.add('sway'); await aw(setPose('search')); emote('…', 0); }
  let res = null, err = null;
  try { res = await aw(Promise.race([Promise.resolve(job), sleep(o.ms || 9000).then(() => { throw new Error('timeout'); })])); }
  catch (e){ if (e === ABORT) throw e; err = e; }
  const rest = 400 - (now() - t0); if (rest > 0) await w(rest);
  actor.classList.remove('sway'); if (emoteKind === '…') emote(null);
  if (err){ if (S.out){ await aw(setPose('shrug')); emote('sweat', 1800); } return {err, line:/timeout/.test(err.message) ? line('slow') : line('err')}; }
  if (o.back !== false && S.out) await aw(setPose(o.pose || (prev === 'search' ? 'sketch' : prev)));
  return {res};
}
function helpfulChips(topic){
  return [{l:'Ja', pri:1, id:'helpful', f:async () => { push('sm_monk_answer', {sm_topic:topic, sm_helpful:1}); spotOff(); await aw(setPose('sketch')); emote('heart', 1600); await ask('Freut mich! Wenn noch was ist, frag einfach.', [{l:'Andere Frage', f:() => faqTopics()}, {l:'Geschenk finden', f:() => giftStep1()}, {l:'Schließen', f:() => exitFlow()}]); }},
    {l:'Nein', f:async () => { push('sm_monk_answer', {sm_topic:topic, sm_helpful:0}); spotOff(); await ask('Schade. Unser Team hilft Dir gern persönlich weiter.', [{l:'Mit Mensch sprechen', pri:1, link:0, f:() => human(FAQ_T[topic] || '')}, {l:'Andere Frage', f:() => faqTopics()}]); }}];
}

/* ---------- Abläufe ---------- */
async function ensureOut(pose, how, o){
  o = o || {};
  if (S.out){ const was = boxOn(); await openBox(); if (!was) focusLog(); if (S.pose !== pose) await aw(setPose(pose)); return; }
  if (!boxOn()) newTurn();
  for (let i = 0; i < 150 && S.yield; i++) await w(200);
  /* alle Posen laden im Hintergrund, gewartet wird nur auf die Landepose */
  preload(); await aw(ready(pose));
  if (!railSprite() && how === 'leap') how = 'poof';
  /* Würde die Landung das Ziel verdecken, erst sanft scrollen */
  if (o.target && vis(o.target)){ const r = vr(o.target); if ((S.mobile || overlapsGroup(r)) && r.y + r.h > groupTop() - 12){ if (reveal(o.target, true)) await w(260); } }
  if (!S.t0) S.t0 = now();
  const apex = S.mobile ? () => openBox() : null;
  if (how === 'leap') await aw(leapOut(pose, {apex}));
  else if (how === 'img') await aw(leapFromImg(o.img, pose, {apex}));
  else await aw(poofIn(pose, {apex}));
  await aw(openBox());
  blinkLoop();
  focusLog();
}
function hello(){
  /* KI-Modus: der Hinweis des Servers (KI, kein Mensch, OpenAI) ist der Gruß, einmal je KI-Sitzung */
  if (aiUsable() && !(SS.ai && SS.ai.sid && SS.ai.nt)){ S.greeted = true; return [aiHello()]; }
  if (S.greeted || SS.g){ S.greeted = true; return []; }
  S.greeted = true; ssUpd({g:1});
  const hr = new Date().getHours();
  return [hr >= 22 || hr < 6 ? line('late') : line('hello')];
}
/* Sitzung mit Vorschlägen: beim erneuten Öffnen geht es dort weiter */
function sessAud(s){ return s && s.aud ? (audBy(s.aud) || (s.aud === BELIEBT.l ? BELIEBT : null)) : null; }
function sessionChips(){
  const s = ssRead(), a = sessAud(s); if (!a || !Array.isArray(s.last) || !s.last.length) return [];
  const B = BANDS[s.b];
  return [{l:'Zurück zu meinen Vorschlägen', pri:1, id:'back_recs', f:() => resumeCards()},
    B ? {l:`Mehr ${a.who}`, id:'more', v:s.b, f:() => { S.shown = new Set(s.shown || []); return cardsFlow(a, s.b); }} : null].filter(Boolean);
}
function menuList(){
  return [{l:'Geschenk finden', id:'gift_start', f:() => giftStep1()}, {l:'Wo ist meine Bestellung?', id:'order', f:() => orderFlow()}, {l:'Frage stellen', id:'faq', f:() => faqTopics()}, {l:'Mit Mensch sprechen', f:() => human()}];
}
async function menuStep(pre){ await ensureOut('sketch', 'poof'); await ask((pre || []).concat(['Wobei kann ich Dir helfen?']), menuList()); }
/* „Was anderes suchen“: Zielgruppe und Budget bleiben, gefragt wird nur, was sich ändert */
async function changeStep(){
  const a = S.aud || sessAud(ssRead());
  if (!a) return giftStep1();
  await ensureOut('sketch', 'poof');
  await ask({t:'Klar. Was soll anders sein?', emote:'?'}, [
    {l:'Für jemand anderen', pri:1, id:'change_aud', f:() => { S.keepBand = true; if (!S.budget) S.budget = ssRead().b || null; return giftStep1(); }},
    {l:'Anderes Budget', id:'gift_budget', f:() => budgetStep(a, true)},
    {l:'Ganz was anderes', f:() => menuStep()},
    Object.assign({}, SONDER_CH, {link:0}), Object.assign({}, GUTSCHEIN_CH, {l:'Gutschein verschenken', link:0})]);
}
function closeEv(outcome){ if (!S.t0) return; push('sm_monk_close', {sm_outcome:outcome || 'none', sm_turns:TURN, sm_ms:R(now() - S.t0)}); S.t0 = 0; }
async function navTo(href, cue, say){
  const sh = href ? safeHref(href) : null;
  if (!sh) return;
  if (sh.ext){ openExt(sh.ext); return; }
  if (say !== false && S.out) await speak(say || 'Ich bring Dich hin.');
  const u = new URL(sh.path, location.origin);
  /* Fortsetzen auf der nächsten Seite: der Loader erkennt #moench-r, ohne vorher in den Speicher zu schauen */
  if (cue){ ssUpd({cue:Object.assign({u:u.pathname}, cue)}); u.hash = 'moench-r'; }
  /* Zurück-Taste: diese Seite merkt sich die Vorschläge über denselben Hash */
  if (S.dealt && Array.isArray(SS.last) && SS.last.length){ try { history.replaceState(history.state, '', location.pathname + location.search + '#moench-r'); } catch (e) {} ssUpd({back:{u:location.pathname, k:'cards'}}); }
  closeEv(/^\/products\//.test(u.pathname) ? 'product' : /^\/cart/.test(u.pathname) ? 'cart' : /kontakt/.test(u.pathname) ? 'contact' : 'none');
  clearTray(); markerOff(); spotOff(); clearProp(true);
  if (S.out) await aw(poofOut());
  closeBox();
  location.assign(u.pathname + u.search + u.hash);
}
async function opener(){
  const k = pageKind(), ses = sessionChips();
  if (ses.length && /^(home|acoll|coll|other|404|searchZero|search|article)$/.test(k)){
    await ensureOut('sketch', k === '404' ? 'poof' : 'leap'); newTurn();
    return ask([...hello(), {t:line('back') + ' Sollen wir bei Deinen Vorschlägen weitermachen?', emote:'bulb'}], ses.concat([{l:'Was anderes suchen', f:() => changeStep()}, {l:'Nein danke', f:() => exitFlow()}]));
  }
  if (k === 'home') return giftStep1(hello());
  if (k === 'acoll'){
    /* erst ins Regal schauen, dann nur versprechen, was sich auch füllen lässt */
    const a = audByColl(CTX.c);
    await ensureOut('sketch', 'leap'); newTurn();
    const r = await think(poolOf(a));
    const ok = r.res ? okBudgets(r.res) : [];
    if (r.res) S.pool = {a, list:r.res};
    if (!ok.length){ await speak(hello()); return emptyShelf(a); }
    await speak([...hello(), {t:audLine(a) + ' ' + (ok.length > 1 ? 'Sag mir noch Dein Budget, dann zeig ich Dir die meistbestellten.' : 'Ich zeig Dir die meistbestellten.'), emote:'bulb'}]);
    return offerBudgets(a, ok);
  }
  if (k === 'coll'){
    if (isWappen()){
      /* Wappen entstehen nach Vorlage: keine Favoriten versprechen, direkt zum Rechner */
      await ensureOut('measure', 'leap'); newTurn();
      return ask([...hello(), {t:'Familienwappen und Modernes Wappen kannst Du direkt bestellen. Für Dein eigenes Wappen rechnet Dir der Wappen-Rechner den Preis aus. Soll ich Dich hinbringen?', emote:'bulb'}],
        [Object.assign(wappenChoice(), {pri:1}), {l:'Geschenk für jemanden', f:() => giftStep1()}, {l:'Mit Mensch sprechen', f:() => human()}, {l:'Nein danke', f:() => exitFlow()}]);
    }
    const here = {l:(($('main h1') || {}).textContent || 'diese Kategorie').trim(), hs:[CTX.c], who:'hier', hero:false, fx:'twinkle', src:'dieser Kategorie'};
    await ensureOut('sketch', 'leap'); newTurn();
    const r = await think(poolOf(here));
    const ok = r.res ? okBudgets(r.res) : [];
    if (r.res) S.pool = {a:here, list:r.res};
    if (!ok.length) return ask([...hello(), {t:'Schau Dich hier gern in Ruhe um. Soll ich Dir lieber ein Geschenk für jemanden raussuchen?', emote:'?'}], [{l:'Geschenk für jemanden', f:() => giftStep1()}, {l:'Mit Mensch sprechen', f:() => human()}, {l:'Nein danke', f:() => exitFlow()}]);
    return ask([...hello(), {t:'Hier gibt es viel zu sehen. Soll ich Dir die meistbestellten aus dieser Kategorie zeigen?', emote:'?'}], [{l:'Ja, zeig her', pri:1, f:() => budgetStep(here)}, {l:'Geschenk für jemanden', f:() => giftStep1()}, {l:'Nein danke', f:() => exitFlow()}]);
  }
  if (k === 'pdp' || k === 'pdpq' || k === 'pdpgc') return productOpener(k === 'pdp');
  if (k === 'wappen'){
    await ensureOut('measure', 'leap'); newTurn();
    return ask([...hello(), 'Für Dein Wappen rechnet Dir der Rechner hier auf der Seite den Preis aus. Bei Fragen zu Deiner Vorlage hilft Dir unser Team gern weiter.'], [{l:'Wie lange dauert es?', id:'sonder_when', f:() => sonderTiming()}, {l:'Mit Mensch sprechen', f:() => human()}, {l:'Schließen', f:() => exitFlow()}]);
  }
  if (k === 'cart') return cartOpener();
  if (k === 'cartEmpty') return emptyCart();
  if (k === 'track') return orderFlow(hello());
  if (k === 'faq') return faqTopics(hello());
  if (k === 'kontakt'){
    await ensureOut('sketch', 'leap'); newTurn();
    return ask([...hello(), 'Bevor Du schreibst: Vielleicht kann ich Dir direkt helfen. Sonst ist das Formular hier genau richtig.'], [{l:'Zum Formular', pri:1, f:() => kontaktGuide()}, {l:'Wo ist meine Bestellung?', f:() => orderFlow()}, {l:'Eine Frage', f:() => faqTopics()}, {l:'Sonderanfertigung', href:'/pages/anfragen', cue:{k:'sonder'}}]);
  }
  if (k === 'sonder'){
    await ensureOut('sketch', 'leap'); newTurn();
    return ask([...hello(), {t:'Eine eigene Idee? Beschreib sie hier im Formular. Unser Team meldet sich mit einem Angebot bei Dir, bestellt wird darüber und nicht im Warenkorb.', emote:'bulb'}], [{l:'Zeig mir das Formular', pri:1, f:() => sonderGuide()}, {l:'Wie lange dauert es?', id:'sonder_when', f:() => sonderTiming()}, {l:'Lieber ein fertiges Geschenk', f:() => giftStep1()}, {l:'Schließen', f:() => exitFlow()}]);
  }
  if (k === 'article'){
    const a = audBy(artAud());
    await ensureOut('sketch', 'leap'); newTurn();
    return ask([...hello(), {t:`Du liest über ${a.l === 'Feuerwehr' ? 'die Feuerwehr' : 'das Handwerk'}? Ich zeig Dir gern Geschenkideen, die oft bestellt werden.`, emote:'bulb'}], [{l:'Zeig her', pri:1, f:() => budgetStep(a)}, {l:'Nein danke', f:() => exitFlow()}]);
  }
  if (k === 'searchZero'){
    await ensureOut('search', 'leap'); newTurn(); actor.classList.add('sway');
    try { await speak([...hello(), {t:'Dazu finde ich nichts im Regal. Für wen suchst Du denn? Dann zeig ich Dir, was oft bestellt wird.', emote:'?'}]); } finally { actor.classList.remove('sway'); }
    return audienceStep();
  }
  if (k === 'search') return searchOpener();
  if (k === '404') return notFound();
  await ensureOut('sketch', 'leap'); newTurn();
  await menuStep(hello());
}
/* Suchergebnisse: die Suche wörtlich zurückgeben (als Text, nie als HTML) und den ersten beiden Treffern ausweichen */
async function searchOpener(){
  const q = searchQ();
  const res = $$('main .product-grid > li, main #product-grid > li, main .grid__item, main .card-wrapper').filter(vis).slice(0, 2);
  await ensureOut('sketch', 'leap', {target:res[0]}); newTurn();
  if (res.length && !S.mobile){ const a = vr(res[0]), b = vr(res[res.length - 1]); if (overlapsGroup({x:Math.min(a.x, b.x), w:Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x)})) await dodge(res[res.length - 1]); }
  await ask([...hello(), {t:`Du suchst nach „${q}“? Ich helf Dir beim Aussuchen.`, emote:'bulb'}], [{l:'Für wen ist es?', pri:1, id:'gift_start', f:() => giftStep1()}, {l:'Wie lange dauert es?', f:() => shipAnswer()}, {l:'Nein danke', f:() => exitFlow()}]);
}
async function notFound(){
  const inl = $('.smmk-404'), im = inl && !S.out ? $(':scope > img', inl) : null;
  await ensureOut('shrug', im && vis(im) ? 'img' : 'leap', {img:im}); newTurn();
  await ask([...hello(), {t:'Hier ist leider nichts. Selbst mein Karton ist leer. Wonach suchst Du?', emote:'?'}], [{l:'Geschenk finden', pri:1, id:'gift_start', f:() => giftStep1()}, {l:'Frage stellen', f:() => faqTopics()}, {l:'Mit Mensch sprechen', f:() => human()}]);
}
function audienceList(){ return AUD.filter(a => a.hero).map(a => ({l:audChip(a), id:'gift_aud', v:a.l, pre:() => poolOf(a).catch(() => {}), f:() => pickAudience(a)})).concat([{l:'Jemand anderes', id:'gift_aud', v:'andere', f:() => someoneElse()}]); }
async function audienceStep(pre){ await ask((pre || []).concat([{t:line('who'), emote:'?'}]), audienceList()); }
async function giftStep1(pre){
  S.calm = false; spotOff(); markerOff(); clearProp(true);
  const fc = $('#fchips'), fcv = fc && vis(fc) ? fc : null;
  await ensureOut('sketch', 'leap', {target:fcv});
  if (S.ox) await moveSide(0);
  if (fcv && S.out && !S.mobile){ const fr = vr(fcv); S.tilt = fr.x + fr.w / 2 > S.ax ? 3 : -3; applyTilt(); }
  hookHeroChips(fcv);
  await render({say:(pre || []).map(t => typeof t === 'string' ? {t} : t).concat([{t:line('who'), emote:'?'}]), chips:audienceList()});
  /* Startseite: die Chips im Hero bleiben über Mönch und Box sichtbar */
  if (fcv && !S.mobile) requestAnimationFrame(() => reveal(fcv));
}
/* Weitere Gruppen nur, wenn ihr Regal mindestens ein Budget füllen kann */
async function someoneElse(pre){
  await ensureOut('sketch', 'leap');
  const cand = AUD.filter(a => !a.hero);
  const r = await think(Promise.all(cand.map(a => poolOf(a).catch(() => null))), {ms:8000});
  let L = cand;
  if (r.res){ const keep = cand.filter((a, i) => r.res[i] && okBudgets(r.res[i]).length); if (keep.length) L = keep; }
  await ask((pre || []).concat([{t:'Für wen denn? Such Dir eine Gruppe aus.', emote:'?'}]), L.map(a => ({l:audChip(a), id:'gift_aud', v:a.l, f:() => pickAudience(a)})).concat([{l:'Zurück', f:() => giftStep1()}]));
}
/* Klickt der Besucher während der Frage "Für wen suchst Du?" selbst einen Hero-Chip, gilt das als Antwort.
   Nur echte Klicks (isTrusted) und nur solange die Zielgruppen-Knöpfe in der Box stehen. */
function hookHeroChips(fc){
  if (!fc || CTX.t !== 'index' || fc._smmkHook) return;
  fc._smmkHook = true;
  fc.addEventListener('click', e => {
    if (!e.isTrusted || !S.out) return;
    const c = e.target.closest('.chip[data-aud]'); if (!c) return;
    const asking = choicesEl && [...choicesEl.querySelectorAll('.smmk-ch')].some(b => b.textContent.trim() === 'Jemand anderes');
    if (!asking) return;
    const a = AUD.find(x => x.hero && x.l.toLowerCase() === c.textContent.trim().toLowerCase());
    if (a){ TURN++; push('sm_monk_step', {sm_step:'gift_aud', sm_value:a.l}); newTurn('Du: ' + a.l); go(() => pickAudience(a, true)); }
  });
}
function heroChip(a){ return $$('#fchips .chip').find(c => !c.hasAttribute('data-smmk') && c.textContent.trim().toLowerCase() === a.l.toLowerCase()) || null; }
async function pickAudience(a, clicked){
  S.aud = a; S.shown = new Set(); S.pool = null;
  poolOf(a).catch(() => {}); /* das Regal lädt schon, während der Mönch zum Chip geht */
  const chip = CTX.t === 'index' && !clicked ? heroChip(a) : null;
  if (chip && vis(chip)){
    try { chip.scrollIntoView({block:'nearest', inline:'center'}); } catch (e) {}
    reveal(chip); await w(60);
    const first = !ssRead().hc; ssUpd({hc:1});
    const homeX = home().x; let boxAway = false;
    if (first && !S.mobile && !still()){
      /* erster Geschenkweg der Sitzung: neben den Chip laufen, nicht drauf */
      const cr = vr(chip); const maxX = vpW() - 140 - 160, reach = R(((POSES.curator.cw || POSES.curator.w) - POSES.curator.fx) * poseScale('curator')) + 12;
      let target = Math.max(homeX, Math.min(maxX, cr.x - reach));
      if (Math.abs(target - homeX) < 40) target = homeX;
      if (target - homeX > 60){ boxAway = true; await aw(folded()); box.style.visibility = 'hidden'; }
      await walkTo(target, {keepBox:true});
      if (S.facing !== 1) await paperTurn(1);
    } else if (first && S.mobile && !still()){
      const cr = vr(chip), cx = cr.x + cr.w / 2;
      await stroll(cx - 44, {pose:'curator', face: cx >= S.ax ? 1 : -1});
    } else if (!S.mobile){ const cr = vr(chip); S.tilt = cr.x + cr.w / 2 > S.ax ? 3 : -3; applyTilt(); }
    await laserAt(chip, {spot:false, keep:700, dodge:false, walk:first});
    chip.click(); sfx('sparkle');
    const fig = $('#finderPx'); if (fig && vis(fig)){ const r = vr(fig); burst(a.fx, r.x + r.w / 2, r.y + r.h * .6, 18); }
    await w(400); clearLaser();
    if (!S.mobile && !still() && S.ax !== homeX){ await aw(setPose('sketch', {dust:false})); await walkTo(homeX, {keepBox:true}); await paperTurn(1); }
    else await aw(setPose('sketch'));
    box.classList.remove('away');
    if (boxAway){ box.getAnimations().forEach(x => x.cancel()); box.style.visibility = ''; await aw(unfolded()); }
    S.tilt = 0; applyTilt();
    await speak({t:audLine(a) + (S.mobile ? '' : ' Daneben siehst Du schon die Favoriten.'), emote:'bulb'});
  } else {
    await ensureOut('sketch', 'poof');
    await speak({t:audLine(a), emote:'bulb'});
  }
  return budgetStep(a);
}
const POOLS = {};
function poolOf(a){
  const key = a.hs.join(',');
  if (!POOLS[key]) POOLS[key] = loadPool(a.hs).catch(e => { delete POOLS[key]; throw e; });
  return POOLS[key];
}
async function budgetStep(a, ask2){
  S.aud = a; spotOff(); markerOff(); await ensureOut('sketch', 'poof');
  const r = await think(poolOf(a));
  if (r.err){ await speak(r.line); return ask('Was darf es ungefähr kosten?', budgetChoices(a, Object.keys(BANDS))); }
  S.pool = {a, list:r.res};
  const ok = okBudgets(r.res);
  if (!ok.length) return emptyShelf(a);
  if (!ask2 && S.keepBand && S.budget && ok.includes(S.budget)){ S.keepBand = false; return cardsFlow(a, S.budget); }
  S.keepBand = false;
  if (ok.length === 1) return cardsFlow(a, ok[0]);
  return ask(line('budget'), budgetChoices(a, ok));
}
function offerBudgets(a, ok){
  if (ok.length === 1) return cardsFlow(a, ok[0]);
  return ask([], budgetChoices(a, ok));
}
/* Hauptweg ist die Preisspanne mit den meisten passenden Stücken im Regal */
function budgetChoices(a, ok){
  const list = S.pool && S.pool.a === a ? S.pool.list : null;
  const best = list ? ok.reduce((m, b) => bandCount(list, b) > bandCount(list, m) ? b : m, ok[0]) : null;
  return ok.map(b => ({l:BANDS[b].l, id:'gift_budget', v:b, pri:b === best ? 1 : 0, f:() => cardsFlow(a, b)}));
}
async function emptyShelf(a){
  await ensureOut('sketch', 'poof');
  await aw(setPose('shrug')); emote('sweat', 2000);
  await ask('Fertiges hab ich dafür gerade nichts im Regal. Zwei Ideen: ein Gutschein über 25, 50, 75, 100, 150 oder 200 €, einlösbar im ganzen Sortiment, oder eine Sonderanfertigung nach Deiner Idee, dafür macht Dir unser Team ein Angebot.',
    [{l:'Gutschein verschenken', id:'gutschein', href:'/products/steelmonks-geschenkgutschein'}, {l:'Sonderanfertigung', id:'sonder', href:'/pages/anfragen', cue:{k:'sonder'}}, {l:'Andere Gruppe', f:() => giftStep1()}]);
}
const srcOf = a => a.src || SRC[a.l] || `Geschenken ${a.who}`;
/* Leitzeile nennt Quelle und die echte Sortierung (Bestellungen, gewichtet nach Passung zum Budget) */
function leadLine(a, items, B){
  const desc = items.every((p, i) => i === 0 || (+items[i - 1].n || 0) >= (+p.n || 0));
  const below = items.some(p => p.fit < 1);
  return `Aus ${srcOf(a)} ${B.s}, ` + (desc ? 'die meistbestellten zuerst' : 'oft bestellt und passend zum Budget') + (below ? '. Manches liegt etwas darunter' : '') + ':';
}
async function cardsFlow(a, budget){
  S.aud = a; S.budget = budget; S.calm = false; S.keepBand = false; spotOff(); markerOff();
  const B = bandOf(budget) || BANDS.b60p;
  await ensureOut('sketch', 'poof');
  const job = (S.pool && S.pool.a === a) ? Promise.resolve(S.pool.list) : poolOf(a);
  const [, r] = await Promise.all([speak({t:line('search')}), think(job, {pose:'sketch'})]);
  if (r.err){
    return ask(r.line + ' In der Kollektion findest Du aber alles.', [{l:'Zur Kollektion', pri:1, id:'all', href:'/collections/' + a.hs[0]}, {l:'Zurück', f:() => giftStep1()}]);
  }
  S.pool = {a, list:r.res};
  const res = pick(r.res, budget);
  if (res.tier === 'none'){
    await aw(setPose('shrug')); emote('sweat', 2000);
    const alt = typeof budget === 'string' ? okBudgets(r.res, budget) : [];
    const other = alt.length ? {l:'Anderes Budget', id:'gift_budget', f:() => budgetStep(a, true)} : {l:'Andere Gruppe', f:() => giftStep1()};
    /* Kleines Budget: der kleinste Gutschein (25 €) und eine Sonderanfertigung lägen darüber */
    if (B.hi < GUTSCHEIN_MIN_CENT) return ask(`${B.s.charAt(0).toUpperCase() + B.s.slice(1)} finde ich dafür gerade nichts Fertiges.`, [Object.assign(other, {pri:1}), alt.length ? {l:'Andere Gruppe', f:() => giftStep1()} : null, {l:'Schließen', f:() => exitFlow()}]);
    return ask('Dafür finde ich nichts Fertiges. Zwei Ideen: ein Gutschein über 25, 50, 75, 100, 150 oder 200 €, einlösbar im ganzen Sortiment, oder eine Sonderanfertigung nach Deiner Idee, dafür macht Dir unser Team ein Angebot.',
      [{l:'Gutschein verschenken', id:'gutschein', href:'/products/steelmonks-geschenkgutschein'}, {l:'Sonderanfertigung', id:'sonder', href:'/pages/anfragen', cue:{k:'sonder'}}, other]);
  }
  await aw(setPose('sketch'));
  const hd = headPoint(); burst('twinkle', hd.x, hd.y + 8, 6); sfx('sparkle');
  remember(a, budget, res.items);
  await render({say:[{t:leadLine(a, res.items, B), emote:'bulb'}], cards:res.items, aud:a, list:a.l + '|' + (B.l || ''), chips:cardChips(a), focus:'show'});
}
function remember(a, budget, items){
  const B = bandOf(budget);
  ssUpd({aud:a.l, b:typeof budget === 'string' ? (OLDB[budget] || budget) : null, cap:B && B.hi !== Infinity ? B.hi : null, last:items.map(p => p.h).slice(0, 3), lp:items.slice(0, 3).map(cardData), shown:Array.from(S.shown).concat(items.map(p => p.h)).slice(-30)});
}
/* Kartendaten für das Zurückkommen: nur, was Karte und Link brauchen (keine Besucherdaten) */
const CARD_KEYS = ['h', 't', 'u', 'p', 'q', 'i', 'z', 'n', 'y', 'rv', 'rc', 'r', 'ch', 'ct', 'src', 'v', 'd', 'pos'];
function cardData(p){ const o = {}; CARD_KEYS.forEach(k => { if (p[k] != null) o[k] = p[k]; }); return o; }
function cardChips(a){
  const list = S.pool ? S.pool.list : null, more = !!list && pick(list, S.budget).tier !== 'none';
  const c = [];
  if (more) c.push({l:'Andere Vorschläge', id:'more', f:() => moreCards(a)});
  else if (list && typeof S.budget === 'string' && okBudgets(list, S.budget).length) c.push({l:'Anderes Budget', id:'gift_budget', f:() => budgetStep(a, true)});
  if (minis(list).length) c.push({l:'Kleinigkeit dazu?', id:'kleinigkeit', f:() => miniCards(a)});
  if (a.hs[0]) c.push({l:'Alle ansehen', link:1, id:'all', href:'/collections/' + a.hs[0], say:'Ich bring Dich zur ganzen Kollektion.'});
  c.push({l:'Was anderes suchen', link:1, f:() => changeStep()});
  /* Handy: höchstens vier Knöpfe unter den Zeilen; Sonderanfertigung und Gutschein stehen dann unter „Was anderes suchen“ */
  if (!S.mobile) c.push(SONDER_CH, GUTSCHEIN_CH);
  return c;
}
const SONDER_CH = {l:'Sonderanfertigung', link:1, id:'sonder', href:'/pages/anfragen', cue:{k:'sonder'}, say:'Für eigene Ideen gibt es unsere Sonderanfertigung: Unser Team macht Dir ein Angebot, bestellt wird darüber und nicht im Warenkorb. Ich bring Dich hin.'};
const GUTSCHEIN_CH = {l:'Gutschein', link:1, id:'gutschein', href:'/products/steelmonks-geschenkgutschein', say:GUTSCHEIN + ' Ich bring Dich hin.'};
async function moreCards(a){
  const res = pick(S.pool ? S.pool.list : [], S.budget), B = bandOf(S.budget) || BANDS.b60p;
  if (res.tier === 'none') return ask('Mehr hab ich in dem Budget gerade nicht. In der ganzen Kollektion findest Du alles.', [{l:'Zur Kollektion', id:'all', href:'/collections/' + a.hs[0]}, {l:'Was anderes suchen', f:() => changeStep()}]);
  remember(a, S.budget, res.items);
  await render({say:[{t:leadLine(a, res.items, B), emote:'bulb'}], cards:res.items, aud:a, list:a.l + '|' + B.l, chips:cardChips(a), focus:'show'});
}
async function miniCards(a){
  const items = minis(S.pool ? S.pool.list : []).slice(0, 3);
  if (!items.length) return cardChips(a);
  /* ab-Preis stimmt immer; manche Kleinigkeiten gibt es in größeren Ausführungen auch über 10 € */
  const lo = Math.min(...items.map(p => +p.p || 0));
  await render({say:[{t:`Kleinigkeiten ab ${euro(lo)} aus ${srcOf(a)}, die meistbestellten zuerst:`, emote:'bulb'}], cards:items, aud:a, list:a.l + '|Kleinigkeiten', chips:cardChips(a), focus:'show'});
}
/* Zurück zu meinen Vorschlägen: dieselben drei Karten noch einmal austeilen, ohne neu zu fragen */
async function resumeCards(){
  const s = ssRead(), a = sessAud(s);
  if (!a || !Array.isArray(s.last) || !s.last.length) return giftStep1();
  S.aud = a; S.budget = s.b || (s.cap ? {l:'bis ' + euro(s.cap), lo:0, hi:s.cap, s:'bis ' + euro(s.cap), mini:1} : null); S.shown = new Set(s.shown || []);
  const fit = p => withFit(p, S.budget || 'b60p'), list = a.l + '|' + ((bandOf(S.budget) || {}).l || '');
  /* Das Regal lädt im Hintergrund, die gemerkten Karten liegen sofort wieder da (ohne Denkpause und ohne Flug) */
  const job = (S.pool && S.pool.a === a) ? Promise.resolve(S.pool.list) : poolOf(a); job.catch(() => {});
  const kept = Array.isArray(s.lp) && s.lp.length ? s.lp.filter(p => p && p.h && p.u).map(fit) : [];
  await ensureOut('sketch', 'poof');
  if (kept.length){
    await render({say:[{t:'Da sind wir wieder. Hier sind Deine Vorschläge.', emote:'bulb'}], cards:kept, deal:{instant:true}, aud:a, list, focus:'show'});
    let L = null; try { L = await aw(Promise.race([job, sleep(6000).then(() => null)])); } catch (e){ if (e === ABORT) throw e; }
    if (L) S.pool = {a, list:L};
    choices(cardChips(a), {focus:false});
    return;
  }
  const r = await think(job, {pose:'sketch'});
  if (r.err) return ask(r.line, [{l:'Zur Kollektion', id:'all', href:'/collections/' + a.hs[0]}, {l:'Was anderes suchen', f:() => changeStep()}]);
  S.pool = {a, list:r.res};
  const items = s.last.map(hd => r.res.find(p => p.h === hd)).filter(Boolean).map(fit);
  if (!items.length) return budgetStep(a);
  await render({say:[{t:'Da sind wir wieder. Hier sind Deine Vorschläge.', emote:'bulb'}], cards:items, deal:{instant:true}, aud:a, list, chips:cardChips(a), focus:'show'});
}
function showIt(p, btn){
  $$('.smmk-show', stage).forEach(b => { b.disabled = true; });
  markUsed(); TURN++;
  ecomm('select_item', (S.aud ? S.aud.l : 'hier') + '|' + ((bandOf(S.budget) || {}).l || ''), [p]);
  newTurn('Du: Zeig es mir');
  const B = bandOf(S.budget);
  go(() => navTo(linkOf(p), {k:'pdp', h:p.h, z:p.z, t:p.t, cap:B && B.hi !== Infinity ? B.hi : null, v:p.cv ? p.cv.id : 0, s:p.cv ? p.cv.l : ''}, 'Ich bring Dich hin.'));
}
function wappenChoice(){ return {l:'Wappen-Preis berechnen', href:'/pages/dein-wappen', say:'Den Preis rechnet Dir unser Wappen-Rechner aus. Ich bring Dich hin.'}; }

/* ---------- Produktseite: Leitfaden und Checkliste ---------- */
async function productOpener(pers){
  await ensureOut('sketch', 'leap'); newTurn(); S.done = {};
  if (CTX.gc) return ask([...hello(), {t:GUTSCHEIN + ' Soll ich Dir zeigen, wo Du den Betrag wählst?', emote:'bulb'}], [{l:'Zeig mir, wo', pri:1, f:() => pdpGuide(false)}, {l:'Lieber ein Geschenk finden', f:() => giftStep1()}, {l:'Danke', f:() => exitFlow()}]);
  /* Sonderanfertigung (nur Produkttyp Sonderanfertigung): wird nie im Warenkorb gekauft, sondern über ein Angebot */
  if (isCustomPdp()){
    const wp = /wappen/.test(CTX.h || '');
    return ask([...hello(), {t:'Das ist eine Sonderanfertigung. Die kaufst Du nicht im Warenkorb: Du schickst uns Deine Idee, und unser Team macht Dir ein Angebot.', emote:'bulb'}],
      [wp ? Object.assign(wappenChoice(), {pri:1}) : {l:'Zur Anfrage', pri:1, id:'sonder', href:'/pages/anfragen', cue:{k:'sonder'}, say:'Ich bring Dich zur Anfrage.'}, {l:'Wie lange dauert es?', id:'sonder_when', f:() => sonderTiming()}, {l:'Mit Mensch sprechen', f:() => human()}, {l:'Was anderes suchen', f:() => changeStep()}]);
  }
  const ses = sessionChips();
  const intro = pers ? 'Dieses Stück wird mit Deinem Wunschtext graviert. Soll ich Dir zeigen, wie es geht?' : 'Dieses Stück gibt es ohne Gravur, direkt zum Bestellen. Soll ich Dir zeigen, wo?';
  const c = ses.concat([{l:pers ? 'Ja, zeig es mir' : 'Zeig mir, wo', pri:ses.length ? 0 : 1, f:() => pdpGuide(pers)}]);
  if (sizeFieldset()) c.push({l:'Welche Größe passt?', id:'pdp_size', f:() => sizeAnswer(pers)});
  c.push({l:'Wie lange dauert es?', id:'pdp_when', f:() => whenAnswer(pers)});
  if (isWappen()) c.push(wappenChoice());
  c.push({l:'Was anderes suchen', f:() => changeStep()});
  return ask([...hello(), {t:intro, emote:'bulb'}], c);
}
/* Nächster Schritt der Checkliste: erst Text eingeben (bis der Zepto-Dialog einmal offen war), dann in den Warenkorb */
function nextStep(pers){
  const z = pers && !S.zOpened && !CTX.gc ? visibleOne('.pplr-c-button') : null;
  if (z) return {l:'Jetzt Text eingeben', id:'pdp_pers', f:async () => { watchZepto(); spotOff(); markerOff(); await laserAt(z, {spot:true, dim:false}); markerOn(z); await ask('Klick hier auf Jetzt personalisieren und gib Deinen Text ein. Die Vorschau siehst Du sofort.', productChoices(pers)); }};
  return {l:'In den Warenkorb', id:'pdp_atc', f:async () => { spotOff(); markerOff(); const a = atcButton(); if (a){ await laserAt(a, {spot:true, dim:false}); markerOn(a); } await ask(a ? 'Hier legst Du es in den Warenkorb.' : 'Den Warenkorb-Knopf finde ich gerade nicht, schau gleich unter dem Preis.', productChoices(pers)); }};
}
/* Checkliste: der nächste Schritt zuerst, beantwortete Fragen fallen raus, der Leitfaden bleibt erreichbar */
function productChoices(pers, o){
  o = o || {};
  const ses = o.session ? sessionChips() : [], nx = nextStep(pers);
  nx.pri = ses.length ? 0 : 1;
  const c = ses.concat([nx]);
  if (!S.done.size && !CTX.gc && sizeFieldset()) c.push({l:'Welche Größe passt?', id:'pdp_size', f:() => sizeAnswer(pers)});
  if (!S.done.when && !CTX.gc) c.push({l:'Wie lange dauert es?', id:'pdp_when', f:() => whenAnswer(pers)});
  c.push({l:'Zeig mir alles noch mal', link:1, f:() => pdpGuide(pers)});
  if (!o.session){ const s2 = sessionChips()[0]; if (s2) c.push(Object.assign({}, s2, {pri:0, link:1})); }
  c.push({l:'Was anderes suchen', f:() => { markerOff(); spotOff(); return changeStep(); }});
  return c;
}
/* Zepto-Personalisierer: erst nach dem Klick des Besuchers beobachten, ob der Dialog einmal aufging */
let zObs = null;
function zeptoOpen(){ return $$('.pplr_crop-modal, #pplr_myModal').some(e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getBoundingClientRect().height > 0; }); }
function watchZepto(){
  if (zObs || S.zOpened) return;
  let raf = 0;
  zObs = new MutationObserver(() => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (zeptoOpen()){ S.zOpened = true; zObs.disconnect(); zObs = null; } }); });
  zObs.observe(d.body, {childList:true, subtree:true, attributes:true, attributeFilter:['style', 'class']});
  setTimeout(() => { if (zObs){ zObs.disconnect(); zObs = null; } }, 180000);
}
/* Zwischen zwei Zeige-Schritten kurz stehen lassen (Klick oder Enter geht weiter) */
async function hold(ms){
  if (S.classic) return;
  box.classList.add('wait'); S.waitAdv = true;
  try { await aw(Promise.race([sleep(ms || 1400), new Promise(r => { advResolve = r; })])); }
  finally { advResolve = null; S.waitAdv = false; box.classList.remove('wait'); }
}
async function pdpGuide(pers, fromCue, cue){
  cue = cue || {};
  await ensureOut('curator', 'poof'); if (fromCue) newTurn();
  S.done = S.done || {};
  /* Titel und Preis bleiben oben sichtbar */
  scrollTopTo(productInfo()); await w(150);
  /* Die Karte versprach eine Größe; das Bestseller-Skript der Seite wählt sonst die Bestseller-Größe */
  const fs = sizeFieldset();
  if (cue.s && fs){ const it = sizeLabels(fs).find(s => s.v === cue.s); if (it && !it.input.checked){ (it.label || it.input).click(); await w(450); } }
  const cap = cue.cap != null ? cue.cap : (ssRead().cap || null);
  if (cap && fs && !CTX.gc){
    let tb = null; try { tb = await aw(sizeTable(fs)); } catch (e){ if (e === ABORT) throw e; }
    if (tb && tb.sel && tb.sel.price > cap){
      const fit = tb.rows.filter(r => r.c <= cap).pop();
      if (fit){
        const bs = bestsellerSize(fs), bsr = bs && tb.rows.find(r => r.v === bs), lab = sizeLabels(fs).find(s => s.v === fit.v);
        await laserAt(fs, {spot:true, dim:false, aim:lab && lab.label || fs});
        await speak(`Für Dein Budget passt ${fmtSize(fit.v)} für ${euro(fit.c)}.` + (bsr && bsr.v !== fit.v ? ` Am häufigsten genommen wird hier ${fmtSize(bsr.v)} für ${euro(bsr.c)}.` : ''));
        await hold(2200);
      }
    }
  }
  const og = otherOptionSet();
  if (og){ await laserAt(og, {spot:true, dim:false}); await speak(legendOf(og) ? `Unter „${legendOf(og)}“ wählst Du die Ausführung.` : 'Hier wählst Du die Ausführung.'); await hold(1400); }
  const tg = await pdpTarget(pers);
  if (!tg){ await aw(setPose('sketch')); return ask('Da bist Du. Hier oben findest Du alles zum Produkt.', productChoices(pers, {session:fromCue})); }
  await laserAt(tg.el, {spot:true, dim:false, keep:2200, avoid:tg.kind === 'qty' || tg.kind === 'amount' ? [atcButton()] : []});
  markerOn(tg.el);
  if (tg.kind === 'pers') watchZepto();
  const say = tg.kind === 'amount' ? 'Hier wählst Du den Betrag. Nach der Zahlung bekommst Du den Code per E-Mail.'
    : tg.kind === 'pers' ? 'Hier klickst Du auf Jetzt personalisieren und gibst Deinen Text ein. Die Vorschau siehst Du sofort.'
    : tg.kind === 'qty' ? 'Hier wählst Du die Menge und legst es in den Warenkorb.' : 'Hier legst Du es in den Warenkorb.';
  await ask(say, productChoices(pers, {session:fromCue}));
}
/* Größe: Beschriftungen von der Seite, Preise aus /products/<handle>.js, Bestseller-Abzeichen aus dem DOM */
async function sizeAnswer(pers){
  spotOff(); markerOff(); await ensureOut('measure', 'poof');
  const fs = sizeFieldset();
  if (!fs) return ask('Dieses Stück gibt es nur in einer Größe.', productChoices(pers));
  S.done.size = true;
  const r = await think(sizeTable(fs), {ms:6000, pose:'measure'});
  const tb = r.res, rows = tb ? tb.rows : [], say = [];
  const bs = bestsellerSize(fs), bsr = bs && rows.find(x => x.v === bs), lo = rows[0], hi = rows[rows.length - 1];
  if (rows.length > 1){
    if (bsr){
      let t = `Am häufigsten genommen: ${fmtSize(bsr.v)} für ${euro(bsr.c)}.`;
      if (bsr !== lo) t += ` Kleiner geht ab ${euro(lo.c)} (${fmtSize(lo.v)})` + (bsr !== hi ? `, groß bis ${euro(hi.c)} (${fmtSize(hi.v)}).` : '.');
      else if (bsr !== hi) t += ` Groß geht bis ${euro(hi.c)} (${fmtSize(hi.v)}).`;
      say.push(t);
    } else say.push(`Es gibt ${rows.length} Größen, von ${fmtSize(lo.v)} für ${euro(lo.c)} bis ${fmtSize(hi.v)} für ${euro(hi.c)}.`);
    const cap = ssRead().cap; if (cap){ const fit = rows.filter(x => x.c <= cap).pop(); if (fit) say.push(`Für Dein Budget passt ${fmtSize(fit.v)} für ${euro(fit.c)}.`); }
  } else say.push(`Die Größe wählst Du hier bei ${legendOf(fs) || 'Größe'}.`);
  /* steht so in den FAQ („Wie werden eure Größen angegeben?“) */
  say.push('Gemessen wird bei eckigen Stücken die längste Seite, bei runden der Durchmesser.');
  const lab = sizeLabels(fs).find(s => s.v === (bsr ? bsr.v : '')) || sizeLabels(fs).find(s => s.input.checked);
  await render({actions:[{name:'pose', target:'measure'}, {name:'laser', target:fs, aim:lab && lab.label}], say:say.slice(0, 3), chips:productChoices(pers)});
}
/* Lieferzeit: zentrale Fakten (versandfertig in Werktagen, Versandtag), nie ein Datum */
function oberflaeche(){ const f = optionSets().find(x => /Oberfl/i.test(legendOf(x))); const i = f && $('input:checked', f); return i ? i.value : ''; }
function shipSay(){
  const say = [shipLine()];
  /* steht so in den FAQ („Wie lange dauert die Herstellung?“), ohne Zahl */
  if (/corten/i.test(oberflaeche())) say.push('Cortenstahl dauert ein paar Tage länger, weil wir ihn vorrosten.');
  say.push(xmasLine() || noExpress());
  return say;
}
/* Produktseite einer Sonderanfertigung: nur Produkttyp Sonderanfertigung (Hilfsprodukt für Draft Orders nach dem Angebot).
   dein-wunsch-* sind normale personalisierte Shop-Artikel mit Warenkorb und laufen über den Shop-Ablauf. */
const isCustomPdp = () => CTX.t === 'product' && CTX.ty === 'Sonderanfertigung';
async function whenAnswer(pers){
  if (isCustomPdp()) return sonderTiming();
  spotOff(); markerOff(); await ensureOut('sketch', 'poof'); await aw(setPose('sketch'));
  S.done.when = true;
  const c = CTX.t === 'product' ? productChoices(pers === undefined ? !!CTX.pz : pers) : menuList();
  /* Gutschein: kein Paket, der Code kommt nach der Zahlung */
  if (CTX.gc) return render({say:['Ein Gutschein kommt nicht als Paket: Nach der Zahlung bekommst Du den Code per E-Mail.'], chips:c});
  /* Das Akkordeon „Produktionszeit“ auf der Produktseite wird nicht mehr aufgeklappt: sein Text verspricht „die besten Versandoptionen“,
     das passt nicht zu „kein Express, kein fester Liefertermin“. Die Fakten kommen nur aus sm-fakt. */
  await render({say:shipSay(), chips:[c[0], {l:'Versandbedingungen', link:1, href:'/pages/versandbedingungen'}, {l:'Mit Mensch sprechen', f:() => human('Lieferzeit')}].concat(c.slice(1))});
}
async function shipAnswer(){
  const k = pageKind();
  if (k === 'sonder' || k === 'wappen' || isCustomPdp()) return sonderTiming();
  await ensureOut('sketch', 'poof');
  await render({say:shipSay().concat([shipCost()]).slice(0, 3), source:{l:'Versandbedingungen', href:'/pages/versandbedingungen'}});
  await ask('Hat das geholfen?', helpfulChips('Versand'));
}
/* Sonderanfertigung: Entwurf, Fertigung nach Freigabe, Versandtag, Versandkosten */
async function sonderTiming(){
  spotOff(); markerOff(); await ensureOut('sketch', 'poof'); await aw(setPose('sketch'));
  const k = pageKind();
  const go1 = k === 'sonder' ? {l:'Zeig mir das Formular', pri:1, f:() => sonderGuide()} : k === 'wappen' ? null : /wappen/.test(CTX.h || '') ? Object.assign(wappenChoice(), {pri:1}) : {l:'Zur Anfrage', pri:1, id:'sonder', href:'/pages/anfragen', cue:{k:'sonder'}, say:'Ich bring Dich zur Anfrage.'};
  /* Wappenseite: dort gibt es auch fertige Wappen zum festen Preis im Shop */
  const say = k === 'wappen' ? [`Fertige Wappen aus dem Shop sind meist ${inWd(F.versandfertigMin, F.versandfertigMax)} versandfertig und gehen jeden ${F.versandtag} mit DHL raus.`].concat(sonderLines('Für ein individuell entworfenes Wappen:')) : sonderLines();
  await ask(say, [go1, {l:'Mit Mensch sprechen', f:() => human('Sonderanfertigung')}, {l:'Schließen', f:() => exitFlow()}]);
}
/* Bestellung: ruhiger Modus. Im KI-Modus fragt der Server nach Bestellnummer und E-Mail (Formular), sonst zeigt der Mönch den Weg. */
async function orderFlow(pre){
  S.calm = true; markerOff(); spotOff();
  /* Handy: ohne Schreibtisch, der würde auf dem Sheet die Fragen darüber verdecken */
  const pz = S.mobile ? 'sketch' : 'pc';
  await ensureOut(pz, 'leap'); await aw(setPose(pz, {dust:false}));
  if (aiUsable()){
    if (pre && pre.length) await speak(pre);
    return aiTurn({chip:'order'}, {fallback:() => orderLocal()});
  }
  return orderLocal(pre);
}
async function orderLocal(pre){
  S.calm = true;
  const pz = S.mobile ? 'sketch' : 'pc';
  await ensureOut(pz, 'leap'); await aw(setPose(pz, {dust:false}));
  await speak((pre || []).concat(['Ich helfe Dir gern. Selbst nachschauen kann ich Bestellungen hier noch nicht.']));
  const back = {l:'Andere Frage', f:async () => { S.calm = false; await aw(setPose('sketch')); await menuStep(['Klar.']); }};
  if (pageKind() === 'track'){
    const acc = visibleOne('main details') || visibleOne('main .accordion__item');
    /* „Hier unten“ meint die ganze Liste: sie rückt über Box und Mönch, gezeigt wird auf die erste Frage */
    if (acc) await laserAt(acc, {spot:true, dim:false, keep:1600, area:listArea(acc)});
    /* Handy: an den rechten Rand, dort stehen nur die Plus-Zeichen, die Fragen beginnen links */
    if (acc && S.mobile) await stroll(vpW(), {face:-1});
    return ask('Hier unten beantworten wir die häufigsten Fragen zu Sendungsnummer und Versand. Und unser Team schaut gern persönlich nach.', [{l:'Kontakt', href:'/pages/kontakt', cue:{k:'kontakt', topic:'Meine Bestellung'}, say:'Ich bring Dich zum Kontaktformular.'}, back, {l:'Danke', f:() => exitFlow()}]);
  }
  await ask('Auf der Seite Sendungsverfolgung findest Du die Antworten zu Sendungsnummer und Versand. Und unser Team schaut gern persönlich nach.', [{l:'Zur Sendungsverfolgung', pri:1, href:'/pages/sendungsverfolgung', say:'Ich bring Dich hin.'}, {l:'Kontakt', href:'/pages/kontakt', cue:{k:'kontakt', topic:'Meine Bestellung'}, say:'Ich bring Dich zum Kontaktformular.'}, back]);
}
/* Die gezeigte Frage und die zwei folgenden als ein Bereich (für reveal und dodge), solange er höchstens halb so hoch wie das Fenster ist */
function listArea(el){
  const all = $$('main details, main .accordion__item').filter(vis), i = all.indexOf(el), L = i < 0 ? [] : all.slice(i, i + 3);
  if (L.length < 2) return el;
  const U = () => { const rs = L.map(e => e.getBoundingClientRect()), x = Math.min(...rs.map(r => r.left)), y = Math.min(...rs.map(r => r.top)); return new DOMRect(x, y, Math.max(...rs.map(r => r.right)) - x, Math.max(...rs.map(r => r.bottom)) - y); };
  return U().height <= vpH() * .5 ? {getBoundingClientRect:U} : el;
}
/* FAQ: Themen führen zur FAQ-Seite, dort zitiert der Mönch die geöffnete Antwort */
const FAQ = [['Versand und Lieferzeit', 'Versand', 'zu Versand und Lieferzeit'], ['Bestellung und Bezahlung', 'Bestellung', 'zu Bestellung und Bezahlung'],
  ['Material und Produkte', 'Produkte', 'zu Material und Produkten'], ['Montage', 'Montage', 'zur Montage'], ['Rückgabe', 'Rückgabe', 'zur Rückgabe']];
const FAQ_T = {}; FAQ.forEach(f => { FAQ_T[f[1]] = f[0]; });
async function faqTopics(pre){
  S.calm = false;
  await ensureOut('sketch', 'leap');
  const onFaq = pageKind() === 'faq', topics = FAQ.map(([l, g]) => ({l, id:'faq_topic', v:g, f:() => faqShow(g, l)})), hu = {l:'Mit Mensch sprechen', f:() => human()};
  await ask((pre || []).concat([onFaq ? 'Such Dir ein Thema aus, dann zeig ich Dir die Antworten hier auf der Seite. Oder schreib direkt unserem Team.' : 'Worum geht es? Ich bring Dich zu den passenden Antworten.']), topics.concat([hu]));
}
/* Ganze Sätze bis höchstens max Zeichen (mindestens einer), damit Einschränkungen wie „für Shop-Bestellungen“ nicht abreißen */
function capSentences(t, max){ const s = String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/); let out = ''; for (const x of s){ if (out && (out + ' ' + x).length > max) break; out = out ? out + ' ' + x : x; } return out; }
async function faqShow(g, label, fromCue){
  if (pageKind() !== 'faq') return navTo('/pages/fragen', {k:'faq', g, l:label}, 'Ich bring Dich zu den Antworten.');
  if (fromCue){ await ensureOut('search', 'poof'); newTurn(); push('sm_monk_step', {sm_step:'faq_topic', sm_value:g}); }
  await Promise.all([speak({t:'Ich blätter kurz nach.'}), think(sleep(200), {pose:S.mobile ? 'sketch' : 'curator'})]);
  /* den Themen-Chip der Seite selbst klicken, damit ihr eigener gedrückter Zustand gilt */
  const chip = $(`#ftFaqC [data-fc="${g}"]`); if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
  await w(120);
  const grp = faqGroup(g);
  if (!grp) return ask('Die Gruppe finde ich gerade nicht. Schau gern in die Liste hier auf der Seite.', [{l:'Andere Frage', f:() => faqTopics()}, {l:'Mit Mensch sprechen', f:() => human()}]);
  return faqQuote(g, 0);
}
/* FAQ-Antworten, die eine Vorlaufzeit oder Laufzeit nennen („mindestens 4 Wochen vorher“, „3 bis 5 Werktage“ Versand), spricht der
   Mönch nicht nach: die Frage nach einem festen Datum beantworten die zentralen Fakten, Laufzeit-Sätze fallen weg. */
const FAQ_DROP = /mindestens \d+ Wochen vorher|dauert der Versand|Versand dauert|Der dauert/i;
function faqSafe(q, ans){
  if (/bestimmten Datum|festen Termin/i.test(q)) return ['Express gibt es bei uns nicht, und einen festen Liefertermin sagen wir nicht zu.', shipLine().replace(' Einen festen Liefertermin sagen wir nicht zu.', ''), 'Wenn es eilt, frag vorher unser Team, wie es gerade aussieht.'].join(' ');
  const s = String(ans || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/);
  return s.filter(x => !FAQ_DROP.test(x)).join(' ') || shipLine();
}
async function faqQuote(g, idx){
  const grp = faqGroup(g), dets = grp ? $$('details', grp) : [], det = dets[idx];
  if (!det) return faqTopics();
  dets.forEach(x => { if (x !== det && x._smmk) x.open = false; }); det._smmk = 1;
  if (!S.classic && !S.typed) $$('.smmk-line, .smmk-src', bbody).forEach(n => n.remove());
  /* der erste Absatz der Antwort, ganz (die FAQ rendert die Fakten über sm-fakten-text) */
  const para = $$(':scope > :not(summary)', det).find(n => n.textContent.trim()), ans = faqSafe(($('summary', det) || {}).textContent || '', para ? para.textContent : '');
  const next = dets.slice(idx + 1, idx + 3).map((x, k) => { const q = ($('summary', x).textContent || '').trim(); return {l:q.length > 58 ? q.slice(0, 56).replace(/\s+\S*$/, '') + ' …' : q, id:'faq_q', v:g, f:() => faqQuote(g, idx + 1 + k)}; });
  await render({actions:[{name:'open', target:det}, {name:'laser', target:det}], say:[{t:capSentences(ans, 600), emote:'bulb'}], source:{l:`${g} (FAQ)`}});
  await ask('Hat das geholfen?', helpfulChips(g).concat(next));
}
async function human(topic){
  S.calm = true; markerOff(); spotOff();
  push('sm_monk_step', {sm_step:'human'});
  if (pageKind() === 'kontakt') return kontaktGuide(false, topic);
  /* KI-Modus: Weitergabe mit Einwilligung (Formular vom Server); ist die Weitergabe aus, zeigt der Server die Kontaktseite */
  if (aiUsable()) return aiTurn({chip:'human'}, {fallback:() => humanLocal(topic)});
  return humanLocal(topic);
}
async function humanLocal(topic){
  S.calm = true;
  await ensureOut('sketch', 'poof'); await aw(setPose('sketch'));
  await speak('Unser Team hilft Dir gern persönlich und antwortet innerhalb von zwei Werktagen. Ich bring Dich zur Kontaktseite.');
  await w(300);
  return navTo('/pages/kontakt', {k:'kontakt', topic:topic || ''}, false);
}
async function kontaktGuide(fromCue, topic){
  S.calm = true;
  await ensureOut('sketch', fromCue ? 'poof' : 'leap'); if (fromCue) newTurn();
  const f = contactForm();
  if (f) await laserAt(f, {spot:true, dim:false, keep:1600});
  S.calm = false;
  const c = [];
  /* Thema erst nach dem Klick eintragen, nur in ein leeres Feld, keine persönlichen Daten */
  if (f && topic) c.push({l:'Thema eintragen', pri:1, f:async () => {
    const ta = f.querySelector('[name="contact[body]"]') || f.querySelector('textarea'), nm = f.querySelector('[name="contact[name]"]') || f.querySelector('input[type="text"]');
    if (ta && !ta.value.trim()){ ta.value = 'Thema: ' + topic; ta.dispatchEvent(new Event('input', {bubbles:true})); }
    await ask('Erledigt. Jetzt fehlen nur noch Name, E-Mail und Deine Nachricht.', [{l:'Danke', f:() => exitFlow()}], {focus:false});
    if (nm) try { nm.focus(); } catch (e) {}
  }});
  c.push({l:'Danke', f:() => exitFlow()}, {l:'Doch lieber ein Geschenk finden', f:() => giftStep1()});
  await ask(f ? 'Hier schreibst Du unserem Team. Wir antworten innerhalb von zwei Werktagen.' + (topic ? ` Soll ich das Thema „${topic}“ schon eintragen?` : '') : 'Auf dieser Seite erreichst Du unser Team. Wir antworten innerhalb von zwei Werktagen.', c);
}
async function sonderGuide(fromCue){
  await ensureOut('sketch', fromCue ? 'poof' : 'leap'); if (fromCue) newTurn();
  const f = visibleOne('#saForm') || visibleOne('main form');
  if (f) await laserAt(f, {spot:true, dim:false, keep:1600});
  await ask(f ? 'Hier beschreibst Du Deine Idee. Ein Foto oder eine Skizze hilft unserem Team sehr. Danach meldet sich unser Team mit einem Angebot.' : 'Auf dieser Seite beschreibst Du Deine Idee, unser Team meldet sich mit einem Angebot.', [{l:'Danke', f:() => exitFlow()}, {l:'Wie lange dauert es?', id:'sonder_when', f:() => sonderTiming()}, {l:'Lieber ein fertiges Geschenk', f:() => giftStep1()}]);
}

/* ---------- Warenkorb: was die Seite schon weiß ---------- */
function cartJs(){ return fetch('/cart.js', {credentials:'same-origin', cache:'no-store'}).then(r => r.json()); }
const hasPersText = c => (c.items || []).some(i => i.properties && Object.keys(i.properties).some(k => k[0] !== '_' && String(i.properties[k] || '').trim()));
async function cartOpener(){
  /* Warenkorb und Regal parallel: den Lückenfüller bietet er nur an, wenn mindestens zwei Stücke in die Lücke passen */
  const shelf = poolOf(gapAud()).catch(() => null);
  await ensureOut('sketch', 'leap'); newTurn();
  let c = null; try { c = await aw(cartJs()); } catch (e){ if (e === ABORT) throw e; }
  const say = [...hello()], chips = [];
  if (c){
    /* wie snippets/sm-cart-basis.liquid: Zwischensumme minus Rabattcodes (automatische Rabatte zählen nicht) */
    const basis = (c.items_subtotal_price || 0) - (c.cart_level_discount_applications || []).filter(x => x && x.type === 'discount_code').reduce((sm, x) => sm + (x.total_allocated_amount || 0), 0);
    const gap = F.gratisversandAbCent - basis;
    if (gap > 0){
      const L = await aw(Promise.race([shelf, sleep(2500).then(() => null)]));
      if (L && pick(L, gapBand(gap)).tier !== 'none'){ say.push(`Noch ${euro(gap)} bis zum Gratisversand. Soll ich Dir was Passendes dafür suchen?`); chips.push({l:'Ja, such mir was', pri:1, id:'cart_gap', v:R(gap / 100), f:() => gapFlow(gap)}); }
      else say.push(`Noch ${euro(gap)} bis zum Gratisversand.`);
    }
    else say.push('Der Versand ist für Dich gratis.');
    if (hasPersText(c)) say.push('Schau Dir Deinen Text noch mal an, er steht unter dem Artikel.');
  }
  /* die Warenkorb-Zeilen bleiben frei */
  const li = visibleOne('main .cart-item'); if (li){ await dodge(li); reveal(li); }
  /* Geschenkverpackung: Beschriftung und Preis von der Seite, angehakt wird nie */
  const gw = visibleOne('main .smc-gift');
  if (gw){
    const tt = (($('b', gw) || {}).textContent || 'Als Geschenk verpacken').trim(), sm = (($('small', gw) || {}).textContent || '').trim();
    await laserAt(gw, {spot:true, dim:false});
    say.push(`${tt} kannst Du hier${sm ? ': ' + sm : ''}. Das Häkchen setzt Du selbst.`);
  }
  say.push(shipLine());
  await ask(say, chips.concat([{l:'Noch ein Geschenk finden', f:() => giftStep1()}, {l:'Versandbedingungen', link:1, href:'/pages/versandbedingungen'}, {l:'Mit Mensch sprechen', f:() => human()}]));
}
/* Lückenfüller zum Gratisversand: hier zählen auch die Kleinigkeiten unter 10 € */
const gapBand = gap => { const t = 'bis ' + euro(gap); return {l:t, lo:0, hi:gap, s:t, mini:1}; };
const gapAud = () => sessAud(ssRead()) || BELIEBT;
function gapFlow(gap){ return cardsFlow(gapAud(), gapBand(gap)); }
async function emptyCart(){
  await ensureOut('sketch', 'leap'); newTurn();
  const jl = visibleOne('main .smc-mini') || visibleOne('main .smc-empty__body');
  if (jl) await laserAt(jl, {spot:true, dim:false, keep:900});
  const ses = sessionChips();
  await ask([...hello(), {t:'Jakob hat schon Vorschläge, ich such Dir gern gezielter.', emote:'bulb'}], ses.concat([{l:'Ja, such mir was', pri:ses.length ? 0 : 1, id:'gift_start', f:() => giftStep1()}, {l:'Nein danke', f:() => exitFlow()}]));
}

/* ---------- Item get: nach einem Klick auf den Mönch landet etwas im Warenkorb ---------- */
let floatTile = null, propEl = null, pendingGet = null;
/* Bilder aus /cart.js zeigen auf cdn.shopify.com: auf den eigenen /cdn/shop-Pfad umschreiben, damit nichts an Dritte geht */
function sameOrigin(u){ u = String(u || '').replace(/^(https?:)?\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\/\d+\//, '/cdn/shop/'); return /^\//.test(u) && !/^\/\//.test(u) ? u + (u.includes('?') ? '&' : '?') + 'width=160' : ''; }
function realCount(cart){ return (cart.items || []).filter(i => !HELPER_TYPE.test(i.product_type || '') && !HELPER_HANDLE.test(i.handle || '')).reduce((s, i) => s + (i.quantity || 0), 0); }
let cartT = 0, cartBusy = false;
function cartSoon(){ if (!S.used) return; clearTimeout(cartT); cartT = setTimeout(checkCart, 700); }
async function checkCart(){
  if (cartBusy) return cartSoon(); cartBusy = true;
  try {
    const c = await cartJs();
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
const drawerOpen = () => { const x = $('cart-drawer'); return !!(x && x.classList.contains('active')); };
function dockHeart(){ if (!dockEl || !dockEl.classList.contains('on')) return; const s = $('.smmk-dock-emo', dockWrap); s.innerHTML = ''; const c = emoteCanvas('heart'); s.append(c); popIn(c); sting('heart'); setTimeout(() => { s.innerHTML = ''; }, 2400); }
let celebrating = false;
/* Warenkorb-Drawer offen: nur ein Herz am Kopf. Das volle Item get nur, wenn der Drawer innerhalb von 10 s zugeht. */
async function waitAndCelebrate(){
  if (celebrating) return; celebrating = true;
  try {
    if (drawerOpen()){
      dockHeart();
      const t0 = now(); while (drawerOpen() && now() - t0 < 10000) await sleep(200);
      if (drawerOpen()){ pendingGet = null; return; }
    }
    for (let i = 0; i < 600 && (S.yield || blockedNow()); i++) await sleep(200);
  } finally { celebrating = false; }
  if (!pendingGet) return;
  const g = pendingGet; pendingGet = null;
  build(); go(() => itemGet(g));
}
function clearProp(dust){
  if (floatTile){ floatTile.remove(); floatTile = null; }
  if (!propEl) return; const p = propEl; propEl = null;
  if (dust && !still()){ const r = vr(p); groundDust(r.x + r.w / 2, r.y + r.h, 6); p.animate([{transform:'scale(1)'}, {transform:'scale(1.15,.8)'}, {transform:'scale(0)'}], {duration:180, easing:'steps(3,end)', fill:'forwards'}).finished.then(() => p.remove(), () => p.remove()); }
  else p.remove();
}
async function itemGet(g){
  S.calm = false; spotOff(); markerOff(); S.outcome = 'cart';
  /* War er schon zu, beginnt hier eine neue Sitzung: erst sm_monk_open, dann der Schritt */
  if (!S.out && !S.t0){ S.t0 = now(); TURN = 0; push('sm_monk_open', {sm_entry:'item_get'}); }
  push('sm_monk_step', {sm_step:'item_get', sm_recommended:g.rec ? 1 : 0});
  await ensureOut(S.out ? S.pose : 'sketch', 'poof'); newTurn();
  await aw(setPose('sketch'));
  clearProp(false);
  /* Truhe als eigenes Requisit auf dem Boden neben ihm */
  const k = S.mobile ? .25 : .35, cw = R(350 * k), ch = R(420 * k);
  const cx = Math.max(cw / 2 + 8, Math.min(vpW() - cw / 2 - 8, S.ax + 70 * S.facing));
  propEl = h('img', 'smmk-prop'); propEl.alt = ''; propEl.src = asset('chest'); Object.assign(propEl.style, {width:cw + 'px', height:ch + 'px', left:R(cx - cw / 2) + 'px', top:R(S.ay - ch) + 'px'});
  stage.append(propEl);
  const mouthP = {x:cx, y:S.ay - ch * .6};
  if (!still()){
    await anim(propEl, [{transform:'translateY(-80px)', opacity:0}, {transform:'translateY(0) scale(1.15,.8)', opacity:1, offset:.7}, {transform:'scale(1)', opacity:1}], {duration:260, easing:'steps(4,end)'});
    groundDust(cx - cw / 2, S.ay, 3, -1); groundDust(cx + cw / 2, S.ay, 3, 1); sfx('thud');
    await anim(propEl, [{transform:'scaleY(1)'}, {transform:'scaleY(1.1)'}, {transform:'scaleY(1)'}], {duration:160, easing:'steps(2,end)'});
  }
  const hd = headPoint(), tx = R(cx - 36), ty = R(hd.y - 70 - 28);
  if (!S.classic && g.img){
    floatTile = h('div', 'smmk-floaty', `<img alt="" src="${esc(sameOrigin(g.img))}">`); stage.append(floatTile); floatTile.style.transform = `translate(${tx}px,${ty}px)`;
    if (!S.reduced) anim(floatTile, [{transform:`translate(${R(mouthP.x - 36)}px,${R(mouthP.y - 28)}px) scale(.3)`, opacity:0}, {transform:`translate(${R((mouthP.x + tx + 36) / 2 - 36 + 10)}px,${R(ty - 24)}px) scale(.85)`, opacity:1, offset:.6}, {transform:`translate(${tx}px,${ty}px) scale(1)`, opacity:1}], {duration:520, easing:'steps(6,end)'});
    else anim(floatTile, [{opacity:0}, {opacity:1}], {duration:150});
  }
  sfx('sparkle'); burst('confetti', mouthP.x, mouthP.y, 40);
  await w(300);
  await hop(14, 220); await hop(14, 220);
  emote('heart', 2600);
  await ask(g.rec ? 'Gute Wahl! Das wird ein schönes Geschenk.' : line('itemGet'), [
    CTX.t === 'cart' ? {l:'Weiter stöbern', f:() => exitFlow()} : {l:'Zum Warenkorb', pri:1, f:() => openCart()},
    {l:'Noch ein Geschenk finden', f:async () => { clearProp(true); return giftStep1(); }},
    {l:CTX.t === 'cart' ? 'Danke' : 'Weiter stöbern', f:() => exitFlow()}
  ]);
}
async function openCart(){
  clearProp(true);
  const dr = $('cart-drawer');
  if (dr && typeof dr.open === 'function' && !S.mobile){ await exitFlow(); dr.open(); return; }
  return navTo('/cart', null, 'Ich bring Dich hin.');
}
/* Abgang */
async function exitFlow(){
  spotOff(); markerOff(); clearLaser(); clearTray(); steamOff(); clearProp(true);
  closeEv(S.outcome || 'none'); S.outcome = '';
  const inl = $('.smmk-404');
  S.tuck = false;
  const inlBack = () => { const im = inl && $(':scope > img', inl); if (im) im.style.visibility = ''; };
  if (!S.out){ closeBox(); S.active = false; inlBack(); setOx(0); setYield(''); return; }
  newTurn(); S.calm = false;
  if (S.pose !== 'sketch' && S.pose !== 'rail') await aw(setPose('sketch', {dust:false}));
  await foldAway();
  await aw(leapBack());
  S.mx = null; S.idleState = null; S.active = false; setYield(''); setOx(0);
  /* erst den 404-Block wieder zeigen, dann den Fokus zurück an den Auslöser */
  inlBack();
  const tr = S.trigger && S.trigger.isConnected && vis(S.trigger) ? S.trigger : $$('[data-smmk="open"]').find(vis);
  if (tr) try { tr.focus({preventScroll:true}); } catch (e) {}
}

/* ---------- Freitext (nur mit ?moench_input=1): lokaler Schlagwort-Router, kein Netz, keine KI ---------- */
const ROUTE_AUD = [[/feuerwehr/, 'Feuerwehr'], [/\bthw\b/, 'THW'], [/bundeswehr|soldat/, 'Soldaten'], [/handwerk|tischler|schreiner|maurer|zimmerer|elektriker|dachdecker|schlosser|schmied/, 'Handwerker'],
  [/hochzeit|verlob|jahrestag|valentin|\bpaar/, 'Paare'], [/angel|angler/, 'Angler'], [/fu(ß|ss)ball/, 'Fußballer'], [/musik/, 'Musiker'], [/sport|fitness|läufer/, 'Sportler'],
  [/grill/, 'Grillfans'], [/garage|werkstatt/, 'Garage und Werkstatt'], [/motorrad|biker/, 'Motorrad'], [/garten/, 'Garten'], [/pferd|hund|katze|tier/, 'Tierfreunde'],
  [/familie/, 'Familie'], [/umzug|einzug|eigenheim|zuhause/, 'Zuhause'], [/eltern/, 'Eltern']];
async function routeText(text){
  const t = String(text || '').toLowerCase();
  await ensureOut('sketch', 'poof');
  const m = ROUTE_AUD.find(([re]) => re.test(t)), a = m ? audBy(m[1]) : null;
  const hit = k => { push('sm_monk_free', {sm_matched:1, sm_route:k}); };
  if (a){ hit('aud'); return pickAudience(a, true); }
  if (/geburtstag|geschenk/.test(t)){ hit('gift'); return audienceStep(); }
  if (/bestellung|paket|sendung/.test(t)){ hit('order'); return orderFlow(); }
  if (/rückgabe|ruckgabe|storno|kaputt/.test(t)){ hit('human'); return human('Rückgabe'); }
  if (/größe|groesse|groß|klein/.test(t) && CTX.t === 'product'){ hit('size'); return sizeAnswer(!!CTX.pz); }
  if (/lieferzeit|wann|versand|liefer/.test(t)){ hit('ship'); return CTX.t === 'product' ? whenAnswer(!!CTX.pz) : shipAnswer(); }
  push('sm_monk_free', {sm_matched:0});
  await aw(setPose('shrug')); emote('?', 1400);
  await render({say:[line('learn')], chips:menuList(), form:'compose'});
}

/* ---------- KI-Modus (cs-assistant, /assistant/v1). Nur mit Theme-Einstellung sm_monk_ai_url; ohne sie bleibt alles geskriptet.
   Grenzen (Audit B): Server- und Modelltext nur als textContent oder value, Links nur über safeHref, Navigation nur nach Klick,
   keine Cookies und keine Zusatz-Header, kein automatisches Wiederholen von /turn, /order oder /handoff, E-Mail, Bestellnummer,
   Name, Notiz und getippter Text nie in Speicher, URL, dataLayer oder /event. ---------- */
const AI_URL = (() => {
  try {
    const raw = String(CTX.ai || '').trim(); if (!raw) return '';
    const u = new URL(raw);
    if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return '';
    return (u.origin + u.pathname).replace(/\/+$/, '').replace(/\/assistant\/v1$/, '');
  } catch (e) { return ''; }
})();
const AI = {paused:false, down:false, challenge:false, busy:false, notice:'', entry:'other', ts:'', lastText:0, lastChips:[], evOff:false, lastMode:''};
let SESS_P = null;
const NOTICE = 'Grüß Dich! Ich bin Bruder Funke, Dein digitaler Kundenberater bei Steelmonks. Frag mich, was Du wissen willst, ich kann mich aber auch mal irren.';
const PRIVACY = '/pages/datenschutzerklarung';
function testCode(){ try { const c = sessionStorage.getItem('smMonkTc') || ''; return /^[A-Za-z0-9_-]{16,128}$/.test(c) ? c : ''; } catch (e) { return ''; } }
/* An: Adresse gesetzt und Modus live, oder Modus test mit Testcode in diesem Tab */
function aiOn(){ if (!AI_URL) return false; const m = CTX.am || 'test'; return m === 'live' || (m === 'test' && !!testCode()); }
/* Nutzbar: an, nicht pausiert, Dienst erreichbar (eine Sitzung entsteht bei Bedarf) */
const aiUsable = () => aiOn() && !AI.paused && !AI.down;
const aiSess = () => (SS.ai && SS.ai.sid) ? SS.ai : null;
/* Freitext an: Sitzung im Modus live; nach einer abgelaufenen Sitzung bleibt das Feld bis zur neuen offen */
const aiMode = () => aiSess() ? SS.ai.mode : AI.lastMode;
const aiLive = () => aiUsable() && aiMode() === 'live';

/* Eine Anfrage: JSON, nur Content-Type, ohne Cookies und ohne Referrer; nie eine Ausnahme nach außen */
async function api(path, body, ms){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 10000);
  try {
    const r = await fetch(AI_URL + '/assistant/v1' + path, {method:'POST', mode:'cors', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:ctl.signal});
    let j = null; try { j = await r.json(); } catch (e) {}
    return {status:r.status, j:j && typeof j === 'object' && !Array.isArray(j) ? j : {}};
  } catch (e) { return {status:0, j:{}, err:ctl.signal.aborted ? 'timeout' : 'net'}; }
  finally { clearTimeout(t); }
}

/* Seitenkontext für den Server: nur Slugs, Wahrheitswerte, Warenkorbzahl und Pfad; nie Titel, Preise, Suche oder Hash */
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,119}$/;
function srvCtx(){
  const o = {};
  [['t', CTX.t], ['s', CTX.s], ['h', CTX.h], ['c', CTX.c], ['pg', CTX.pg], ['b', CTX.b]].forEach(([k, v]) => { if (typeof v === 'string' && SLUG_RE.test(v.toLowerCase())) o[k] = v.toLowerCase(); });
  o.pers = !!+CTX.pz; o.zero = !!+CTX.z;
  const n = +CTX.n; if (Number.isInteger(n) && n >= 0) o.n = Math.min(999, n);
  /* Pfad nur für öffentliche Seiten: Kundenseiten (/account/reset/<id>/<token>, /account/activate/...) tragen ein Token */
  const pa = location.pathname;
  if (!/^customers\//.test(String(CTX.t || '')) && /^\/(|cart|search|(products|collections|pages|blogs|policies)\/[A-Za-z0-9/_.%-]{1,180})$/.test(pa) && !/(^|\/)\.\.?(\/|$)/.test(pa)) o.path = pa;
  return o;
}
/* Einstieg in der Sprache des Servers (guard.ENTRIES) */
const ENTRY = {header:'header', mega:'mega_gift', mobile_menu:'mobile_card', hero:'hero_chip', pdp_cta:'pdp_cta', track:'track_cta', faq_card:'faq_card', '404':'notfound', deeplink:'deeplink', resume:'resume', dock:'dock'};
function entryOf(src){
  if (ENTRY[src]) return ENTRY[src];
  const k = pageKind();
  return k === 'kontakt' ? 'kontakt' : k === 'cartEmpty' ? 'cart_empty' : k === 'searchZero' ? 'search_zero' : 'other';
}

/* Sitzung: wiederverwenden, solange sie gilt (60 min, 20 min ohne Kontakt); sonst eine neue, nur nach Klick oder Deep Link */
function ensureSession(){
  if (!aiOn() || AI.down) return Promise.resolve(null);
  const a = SS.ai || {};
  if (a.sid && a.exp > Date.now() + 30000 && Date.now() - (a.at || 0) < 19 * 60000) return Promise.resolve(a);
  if (a.p && Date.now() - a.p < 5 * 60000){ AI.paused = true; applyAiUi(); return Promise.resolve(null); }
  if (SESS_P) return SESS_P;
  SESS_P = (async () => {
    const body = {entry:AI.entry, ctx:srvCtx()}, tc = testCode();
    if (tc) body.test_code = tc;
    if (AI.ts){ body.turnstile = AI.ts; AI.ts = ''; }
    const r = await api('/session', body, 8000), j = r.j;
    if (r.status === 200 && typeof j.sid === 'string' && j.sid && j.sid.length < 400 && (j.mode === 'live' || j.mode === 'chips')){
      const ttl = Math.max(60, Math.min(3600, +j.expires_in || 3600));
      const ho = j.handoff && typeof j.handoff === 'object' && typeof j.handoff.consent_version === 'string' ? {v:j.handoff.consent_version.slice(0, 40), ts:j.handoff.turnstile === true} : null;
      ssUpd({ai:{sid:j.sid, exp:Date.now() + ttl * 1000, at:Date.now(), mode:j.mode, test:j.test === true, ho}});
      AI.notice = typeof j.notice === 'string' && j.notice.trim() ? j.notice.trim().slice(0, 400) : NOTICE;
      AI.paused = false; AI.challenge = false;
      /* Messung: nach einem 401 der alten Sitzung wieder an; nach 429 oder Pause bleibt sie für diese Seite aus */
      if (AI.evOff === 'auth') AI.evOff = false;
      /* Der Code gilt nur im Testbetrieb; eine Live-Sitzung braucht ihn nicht mehr */
      if (tc && j.test !== true) try { sessionStorage.removeItem('smMonkTc'); } catch (e) {}
      applyAiUi();
      aiEvent('open', {entry:AI.entry});
      return SS.ai;
    }
    if (r.status === 200 && j.challenge === 'turnstile') AI.challenge = true;
    else if (r.status === 200 && j.mode === 'paused'){ AI.paused = true; ssUpd({ai:{p:Date.now()}}); }
    else AI.down = true;
    applyAiUi();
    return null;
  })().finally(() => { SESS_P = null; });
  return SESS_P;
}
/* Sitzung für eine Aktion: verlangt der Server Turnstile, löst der Besucher es einmal, dann ein zweiter Versuch */
async function needSession(){
  let s = await aw(ensureSession());
  if (!s && AI.challenge && CTX.tk){ const tok = await challengeSession(); if (tok){ AI.ts = tok; s = await aw(ensureSession()); } }
  return s;
}
function dropSid(){ if (SS.ai && SS.ai.mode) AI.lastMode = SS.ai.mode; ssUpd({ai:null}); applyAiUi(); }
function touchSid(mode){ const s = aiSess(); if (!s) return; const m = mode === 'live' || mode === 'chips' ? mode : s.mode; ssUpd({ai:Object.assign({}, s, {at:Date.now(), mode:m})}); applyAiUi(); }

/* Plakette, Testmarke, Eingabefeld und Hinweis je nach Sitzung */
function applyAiUi(){
  if (!built) return;
  const s = aiSess(), on = aiUsable() && (!!s || !!AI.lastMode), live = on && aiMode() === 'live';
  stage.classList.toggle('ai', on); stage.classList.toggle('aitest', on && !!s && s.test === true);
  const sub = $('.smmk-sub', stage); if (sub) sub.textContent = on ? STATUS_AI : STATUS;
  const lg = $('.smmk-legal', composeEl);
  if (live){
    inputEl.maxLength = 500; inputEl.placeholder = 'Oder schreib mir einfach …';
    if (!lg.firstChild){ const a = h('a'); a.href = PRIVACY; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Datenschutz'; lg.append('Digitaler Berater mit KI, kann sich irren. ', a); }
  } else {
    inputEl.maxLength = 200; inputEl.placeholder = 'Oder schreib mir, wen Du beschenken willst …'; lg.textContent = '';
  }
  /* ohne KI nur das alte Stichwortfeld (?moench_input=1) */
  composeEl.hidden = !(live || (S.compose && !on && !aiUsable()));
  sheetCheck();
}
/* Gruß im KI-Modus: wartet höchstens 2,5 s auf die Sitzung, dann der Hinweis des Servers (oder der geskriptete Gruß) */
function aiHello(){
  let v = null;
  const wait = Promise.race([ensureSession(), sleep(2500)]).catch(() => null);
  return {wait, anchor:true, get t(){
    if (v != null) return v;
    const s = aiSess();
    if (s && aiUsable()){ v = s.nt ? '' : (AI.notice || NOTICE); if (!s.nt) ssUpd({ai:Object.assign({}, s, {nt:1}), g:1}); return v; }
    if (SS.g){ v = ''; return v; }
    ssUpd({g:1}); const hr = new Date().getHours(); v = hr >= 22 || hr < 6 ? line('late') : line('hello'); return v;
  }};
}

/* Erlaubte Ziele: Shop-Pfade (auch von steelmonks.com als absolute Adresse) und die DHL-Sendungsverfolgung */
const SHOP_HOSTS = [location.host, 'steelmonks.com', 'www.steelmonks.com'];
const PATH_OK = /^\/(pages|policies|products|collections|blogs)\/[A-Za-z0-9/_.%-]{1,150}$/;
const DHL_RE = /^https:\/\/www\.dhl\.de\/de\/privatkunden\/pakete-empfangen\/verfolgen\.html\?piececode=[A-Za-z0-9]{6,40}$/;
function safeHref(href){
  if (typeof href !== 'string' || !href || href.length > 400) return null;
  if (DHL_RE.test(href)) return {ext:href};
  let u; try { u = new URL(href, location.origin); } catch (e) { return null; }
  if (!SHOP_HOSTS.includes(u.host)) return null;
  if (u.origin !== location.origin && u.protocol !== 'https:') return null;
  if (/\.\./.test(u.pathname) || !(u.pathname === '/' || u.pathname === '/cart' || PATH_OK.test(u.pathname))) return null;
  const q = /^\?variant=\d{1,20}$/.test(u.search) ? u.search : '';
  return {path:u.pathname + q};
}
function openExt(u){ if (DHL_RE.test(u)) try { window.open(u, '_blank', 'noopener,noreferrer'); } catch (e) {} }
/* Kartenbild: nur über den eigenen /cdn/shop-Pfad (keine Anfrage an Dritte) */
function cardImg(u){
  u = String(u || '');
  const m = u.match(/^https:\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\/\d+\/([A-Za-z0-9/_.%-]+)/) || u.match(/^\/cdn\/shop\/([A-Za-z0-9/_.%-]+)/);
  if (!m) return '';
  /* keine Punkt-Segmente, auch nicht kodiert, keine leeren Segmente: das Bild bleibt unter /cdn/shop/ */
  const rest = m[1];
  if (/%(2e|2f|5c)/i.test(rest) || rest.split('/').some(x => !x || /^\.+$/.test(x))) return '';
  let x; try { x = new URL('/cdn/shop/' + rest, location.origin); } catch (e) { return ''; }
  return x.origin === location.origin && x.pathname === '/cdn/shop/' + rest ? x.pathname + '?width=400' : '';
}

/* ---------- Antwort des Servers in die Form des Mönchs ---------- */
const EMOTES = new Set(['!', '?', '…', 'heart', 'bulb', 'sweat', 'zzz', 'note']);
/* eigene Schlüssel nur (kein constructor, toString oder __proto__ aus einer Serverantwort) */
const OWN = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const MOOD_POSE = {idle:'sketch', talking:'sketch', listening:'sketch', pointing:'sketch', celebrating:'sketch', thinking:'search', presenting:'curator',
  measuring:'measure', scriptorium:'pc', workshop:'pc', not_sure:'shrug', paused:'coffee'};
const CHIP_RE = /^[a-z_]{2,20}(?::[a-z0-9_-]{1,40}){0,2}$/;
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
function poseOf(m){ const p = (typeof m === 'string' && OWN(MOOD_POSE, m) && MOOD_POSE[m]) || 'sketch'; return S.mobile && (p === 'pc' || p === 'curator') ? 'sketch' : p; }
function srvLines(j){
  return (Array.isArray(j.lines) ? j.lines : []).slice(0, 3).map(l => (l && typeof l === 'object') ? {t:str(l.t, 280).trim(), emote:EMOTES.has(l.emote) ? l.emote : undefined} : null).filter(l => l && l.t);
}
function srvChip(c){
  if (!c || typeof c !== 'object') return null;
  const id = typeof c.id === 'string' && CHIP_RE.test(c.id) ? c.id : '', l = str(c.l, 60).trim();
  if (!id || !l) return null;
  if (c.href != null){
    const sh = safeHref(c.href); if (!sh) return null;
    if (sh.ext) return {l, id:'ki_link', v:'dhl', f:() => { openExt(sh.ext); return aiAfterExt(); }};
    return {l, id:'ki_link', v:id.split(':')[0], href:sh.path, say:'Ich bring Dich hin.'};
  }
  /* „Schreib uns“ / „Zur Kontaktseite“ ohne Adresse: direkt zur Kontaktseite */
  if (id === 'kontakt') return {l, id:'ki_link', v:'kontakt', href:'/pages/kontakt', say:'Ich bring Dich zur Kontaktseite.'};
  return {l, id:'ki_chip', v:id.split(':')[0], f:() => aiTurn({chip:id})};
}
async function aiAfterExt(){ await ask('Die Sendungsverfolgung von DHL ist in einem neuen Tab offen.', AI.lastChips.filter(c => c.v !== 'dhl').concat([{l:'Schließen', f:() => exitFlow()}]).slice(0, 4)); }
/* Handle einer Karte: Kleinbuchstaben, Ziffern, Bindestrich, dazu Nicht-ASCII-Buchstaben und -Zeichen wie „®“ (Zippo®-Produkte).
   Sicher kodiert: jedes kodierte Zeichen muss ein Byte über 0x7F sein, also nie Leerzeichen, Schrägstrich, Punkt, Prozent, ? oder #.
   Gleiche Regel wie assistant_catalog.CARD_HANDLE im Dienst. */
const CARD_H_RE = /^[\p{Ll}\p{Lo}\p{Nd}\p{So}][\p{Ll}\p{Lo}\p{Nd}\p{So}-]{0,119}$/u;
function cardHandle(v){
  if (typeof v !== 'string' || v.length > 120 || !CARD_H_RE.test(v)) return '';
  let enc; try { enc = encodeURIComponent(v); } catch (e) { return ''; }
  return /^(?:[a-z0-9-]|%[89A-F][0-9A-F])+$/.test(enc) ? v : '';
}
function srvCard(c){
  if (!c || typeof c !== 'object') return null;
  const hd = cardHandle(c.h), t = str(c.t, 160).trim(), sh = safeHref(c.u), p = Math.round(+c.p || 0);
  if (!hd || !t || !sh || !sh.path || !/^\/(products|collections)\//.test(sh.path) || !(p > 0)) return null;
  const q = Math.round(+c.q || 0);
  return {h:hd, t, y:str(c.y, 60), u:sh.path, i:cardImg(c.i), p, q:q > p ? q : p, z:c.z ? 1 : 0, n:Math.max(0, Math.round(+c.n || 0)), rv:+c.rv || 0, rc:Math.max(0, Math.round(+c.rc || 0)),
    why:str(c.why, 120).trim(), over:c.over ? 1 : 0};
}
/* Zeigen auf der Seite: Ziele je Seitenart wie assistant_output.HIGHLIGHTS, plus eigene Prüfung hier */
const HERO_AUD = ['handwerker', 'feuerwehr', 'paare', 'familie', 'zuhause'];
const FAQ_G = {versand:'Versand', bestellung:'Bestellung', produkte:'Produkte', montage:'Montage', rueckgabe:'Rückgabe'};
const HL = {home:['home.finder', 'home.deck'].concat(HERO_AUD.map(a => 'home.chip.' + a)), pdp:['pdp.personalize', 'pdp.options', 'pdp.price', 'pdp.qty'],
  cart:['cart.shipping'], faq:Object.keys(FAQ_G).map(g => 'faq.group.' + g), sonder:['sonder.form'], track:['track.top']};
const GUIDE = {'pdp.personalize':'.pplr-c-button, main .product-form__submit', 'pdp.options':'main variant-radios fieldset, main variant-selects fieldset', 'pdp.price':'main .price',
  'pdp.qty':'.pin-tiers, .smk-quantity', 'home.finder':'#finder', 'home.deck':'#deck', 'cart.shipping':'.cart-freeship-confirm', 'sonder.form':'#saForm', 'track.top':'#smmkTrack'};
function guideEl(tg){
  if (tg.startsWith('faq.group.')) return faqGroup(FAQ_G[tg.slice(10)] || '');
  if (tg.startsWith('home.chip.')){ const a = AUD.find(x => x.hero && x.l.toLowerCase() === tg.slice(10)); return a ? heroChip(a) : null; }
  return GUIDE[tg] ? visibleOne(GUIDE[tg]) : null;
}
function srvActions(list){
  const pk = pageKind(), page = /^pdp/.test(pk) ? 'pdp' : pk === 'cartEmpty' ? 'cart' : pk, out = [];
  (Array.isArray(list) ? list : []).slice(0, 2).forEach(a => {
    if (!a || typeof a !== 'object') return;
    if (a.do === 'highlight' && typeof a.target === 'string' && (HL[page] || []).includes(a.target)){ const el = guideEl(a.target); if (el && vis(el)) out.push({name:'laser', target:el}); }
    else if (a.do === 'pick_audience' && page === 'home' && HERO_AUD.includes(a.aud)){ const au = AUD.find(x => x.hero && x.l.toLowerCase() === a.aud), ch = au && heroChip(au); if (ch && vis(ch)) out.push({name:'laser', target:ch}, {name:'tap', target:ch}); }
    else if (a.do === 'show_products' && Array.isArray(a.handles)){ const hd = a.handles.find(x => typeof x === 'string' && S.shown.has(x)); const el = hd && $$('.smmk-card, .smmk-row', stage).find(e => e.dataset.h === hd); if (el) out.push({name:'laser', target:el}); }
  });
  return out;
}
const PARCEL = {eingegangen:0, bei_uns:1, unterwegs:2, zugestellt:3};
function parcelPath(state){
  if (typeof state !== 'string' || !OWN(PARCEL, state)) return;
  const ol = h('ol', 'smmk-parcel'); ol.setAttribute('aria-label', 'Stand Deiner Bestellung');
  ['Eingegangen', 'In der Werkstatt', 'Unterwegs', 'Zugestellt'].forEach((l, i) => { const li = h('li'); li.textContent = l; if (i <= PARCEL[state]) li.className = 'on'; if (i === PARCEL[state]) li.setAttribute('aria-current', 'step'); ol.append(li); });
  addNode(ol);
}
/* Schild-Vorschau: nur der Wortlaut des Besuchers (sign_text), als Stahlschild, nie als Stimme des Mönchs */
function signPreview(list){
  const L = (Array.isArray(list) ? list : []).slice(0, 4).map(x => str(x, 80).trim()).filter(Boolean); if (!L.length) return;
  const f = h('figure', 'smmk-sign'), pl = h('div', 'pl'), cap = h('figcaption');
  f.setAttribute('aria-label', 'Vorschau Deines Textes');
  L.forEach(t => { const sp2 = h('span'); sp2.textContent = t; pl.append(sp2); });
  cap.textContent = 'Vorschau Deines Textes'; f.append(pl, cap); addNode(f);
  announce('Vorschau: ' + L.join(', '));
  if (!still()){ const r = vr(pl); burst('sparks', r.x + r.w / 2, r.y + 6, 10); sfx('sparkle'); }
}
function orderInfo(v){
  if (!v || typeof v !== 'object') return;
  const items = (Array.isArray(v.items) ? v.items : []).map(x => str(x, 80).trim()).filter(Boolean).slice(0, 5);
  const dm = str(v.placed_on, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = (dm ? `Bestellt am ${dm[3]}.${dm[2]}.${dm[1]}` : '') + (items.length ? (dm ? ': ' : '') + items.join(', ') : '');
  if (t){ const p = h('p', 'smmk-oi'); p.textContent = t; addNode(p); }
}
/* Eine Antwort darstellen: Pose aus mood, Zeigen, Zeilen, Karten, Schild, Paketweg, Formular, Knöpfe */
async function aiRender(j, o){
  o = o || {};
  const mood = typeof j.mood === 'string' ? j.mood : 'talking', form = j.form === 'order' || j.form === 'handoff' ? j.form : '';
  S.calm = mood === 'scriptorium' || mood === 'paused' || !!form;
  spotOff(); markerOff();
  if (S.out) await aw(setPose(poseOf(mood)));
  for (const a of srvActions(j.actions)){ if (a.name === 'tap'){ try { a.target.click(); } catch (e) {} } else await act(a); }
  const say = srvLines(j), cards = (Array.isArray(j.cards) ? j.cards : []).slice(0, 3).map(srvCard).filter(Boolean);
  let chips = (Array.isArray(j.chips) ? j.chips : []).slice(0, 8).map(srvChip).filter(Boolean);
  if (chips.length && !form && !EXITS.test(chips[0].l)) chips[0] = Object.assign({}, chips[0], {pri:1});
  let dealP = null;
  const deal = () => { dealP = dealCards(cards, null, 'sm_monk_ki'); dealP.catch(() => {}); };
  if (say.length) await speak(say, {onStart:() => { if (cards.length) deal(); }});
  else if (cards.length) deal();
  if (dealP) await dealP;
  if (o.view){ orderInfo(o.view); parcelPath(o.view.state); }
  else { const pp = (Array.isArray(j.actions) ? j.actions : []).find(a => a && a.do === 'parcel_path'); if (pp) parcelPath(pp.state); }
  signPreview(j.sign_text);
  let fEl = null;
  if (form === 'order') fEl = orderForm(j.prefill);
  else if (form === 'handoff'){
    fEl = handoffForm(j.prefill);
    if (!fEl){ await speak({t:'Gerade kann ich das leider nicht weitergeben. Schreib uns bitte über die Kontaktseite, wir antworten innerhalb von zwei Werktagen.', emote:'sweat'}); chips = [{l:'Zur Kontaktseite', pri:1, id:'ki_link', v:'kontakt', href:'/pages/kontakt', say:'Ich bring Dich zur Kontaktseite.'}]; }
  }
  if (!chips.length && composeEl.hidden && !fEl) chips = [{l:'Schließen', f:() => exitFlow()}];
  AI.lastChips = chips;
  choices(chips, {focus:false});
  if (j.mode === 'chips' || j.mode === 'live') touchSid(j.mode);
  if (fEl){ const i = $('input:not([type=checkbox]), textarea', fEl); if (i) try { i.focus({preventScroll:true}); } catch (e) {} }
  else if (cards.length){ const b = $$('.smmk-show', stage).find(x => !x.disabled && x.offsetParent !== null); if (b) try { b.focus({preventScroll:true}); } catch (e) {} }
  else if (o.typed && !composeEl.hidden) try { inputEl.focus({preventScroll:true}); } catch (e) {}
  else if (chips.length) focusFirst();
  keepClear();
}
/* Ruhige Rückfallzeile mit den letzten Knöpfen (oder dem Menü) */
async function aiCalm(text, chips){
  if (S.out){ await aw(setPose('shrug')); emote('sweat', 1800); }
  await ask(text, (chips && chips.length ? chips : AI.lastChips.length ? AI.lastChips : menuList()));
}
async function aiPausedTurn(){
  AI.paused = true; ssUpd({ai:{p:Date.now()}}); applyAiUi();
  S.calm = true; spotOff(); markerOff(); clearTray();
  if (S.out){ await aw(setPose('coffee')); emote('zzz', 2400); }
  await ask(['Der Mönch macht gerade Pause.', 'Mit Knöpfen helfe ich Dir trotzdem weiter.'], menuList());
}
const LOST = 'Ich hab kurz den Faden verloren, frag mich gern noch mal.';
/* Ein Zug: Knopf {chip} oder Freitext {text}. Nie automatisch wiederholt, außer einmal ein Knopf nach abgelaufener Sitzung. */
async function aiTurn(input, o){
  o = o || {};
  if (AI.busy) return;
  AI.busy = true; let retry = false;
  try {
    await ensureOut(S.out ? S.pose : 'sketch', 'poof');
    const s = await needSession();
    if (!s){ AI.busy = false; return await (o.fallback ? o.fallback() : AI.paused ? aiPausedTurn() : aiCalm(line('err'), menuList())); }
    if (input.text){ AI.lastText = now(); composeEl.classList.add('busy'); }
    const r = await think(api('/turn', {sid:s.sid, input, ctx:srvCtx()}, 20000), {ms:21000, back:false});
    const x = r.res || {status:0, j:{}, err:'timeout'}, j = x.j;
    if (x.status === 401){
      dropSid();
      if (input.chip && !o.retried){ retry = true; return; }
      if (input.text && !inputEl.value) inputEl.value = input.text;
      return await aiCalm(LOST);
    }
    if (x.status === 0){ if (input.text && !inputEl.value) inputEl.value = input.text; return await aiCalm(x.err === 'timeout' ? line('slow') : line('err')); }
    if (x.status === 400 && j.error === 'too_long') return await aiCalm('Das ist mir zu lang. Schreib es bitte kürzer, höchstens 500 Zeichen.');
    if (x.status !== 200) return await aiCalm(line('err'));
    if (j.mode === 'paused' || j.ok === false) return await aiPausedTurn();
    return await aiRender(j, {typed:!!input.text});
  } finally {
    AI.busy = false; composeEl.classList.remove('busy');
    if (retry) go(() => aiTurn(input, Object.assign({}, o, {retried:true})));
  }
}

/* ---------- Formulare: Bestellstatus und Weitergabe an das Team (nichts davon wird gespeichert) ---------- */
function fld(label, el){ const w = h('label', 'smmk-f'), s = h('span'); s.textContent = label; w.append(s, el); return w; }
function inp(tag, attrs){ const i = d.createElement(tag === 'textarea' ? 'textarea' : 'input'); if (tag !== 'textarea') i.type = tag; Object.keys(attrs || {}).forEach(k => i.setAttribute(k, attrs[k])); return i; }
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
function orderForm(pre){
  const f = h('form', 'smmk-form smmk-order'); f.noValidate = true; f.setAttribute('aria-label', 'Bestellung nachschauen');
  /* der Hinweis „Zum Schutz Deiner Daten …“ steht schon in der Zeile des Servers */
  const on = inp('text', {maxlength:'40', autocomplete:'off', autocapitalize:'characters', spellcheck:'false', placeholder:'SM-12345', required:''});
  const em = inp('email', {maxlength:'254', autocomplete:'email', spellcheck:'false', inputmode:'email', required:''});
  const pn = pre && typeof pre === 'object' ? str(pre.order_no, 20) : '';
  if (/^#?SM-\d{4,6}(-DE)?$/i.test(pn)) on.value = pn;
  const err = h('p', 'smmk-ferr'); err.setAttribute('role', 'alert');
  const b = h('button', 'smmk-ch pri'); b.type = 'submit'; b.textContent = 'Nachschauen';
  f.append(fld('Bestellnummer', on), fld('E-Mail aus der Bestellung', em), err, b);
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (AI.busy || f._sent) return;
    const ov = on.value.trim(), mv = em.value.trim();
    if (!ov){ err.textContent = 'Bitte gib Deine Bestellnummer ein.'; on.focus(); return; }
    if (!EMAIL_RE.test(mv)){ err.textContent = 'Bitte gib die E-Mail-Adresse aus der Bestellung ein.'; em.focus(); return; }
    f._sent = true; on.value = ''; em.value = ''; f.remove();
    markUsed(); TURN++; S.lastInput = now(); push('sm_monk_step', {sm_step:'order_lookup'});
    newTurn('Du: Bestellnummer und E-Mail gesendet');
    go(() => aiOrder(ov, mv));
  });
  addNode(f); return f;
}
async function aiOrder(orderNo, email){
  if (AI.busy) return;
  AI.busy = true;
  try {
    const s = await needSession();
    if (!s){ AI.busy = false; return await (AI.paused ? aiPausedTurn() : orderLocal()); }
    const r = await think(api('/order', {sid:s.sid, order_no:orderNo, email}, 12000), {ms:13000, back:false});
    orderNo = ''; email = '';
    const x = r.res || {status:0, j:{}, err:'timeout'}, j = x.j, again = {l:'Nochmal versuchen', pri:1, id:'ki_chip', v:'order', f:() => aiTurn({chip:'order'})};
    if (x.status === 401){ dropSid(); return await aiCalm(LOST, [again, {l:'Mit Mensch sprechen', f:() => human('Meine Bestellung')}]); }
    if (x.status === 0) return await aiCalm(x.err === 'timeout' ? line('slow') : line('err'), [again, {l:'Mit Mensch sprechen', f:() => human('Meine Bestellung')}]);
    if (x.status !== 200) return await aiCalm(line('err'), [again]);
    if (j.mode === 'paused' && !Array.isArray(j.lines)) return await aiPausedTurn();
    const v = j.ok === true && j.view && typeof j.view === 'object' ? j.view : null;
    if (v && S.out){ S.calm = false; burst('twinkle', headPoint().x, headPoint().y, 6); }
    return await aiRender(j, {view:v});
  } finally { AI.busy = false; }
}
/* Cloudflare Turnstile: lädt erst, wenn der Server es verlangt (Weitergabe oder Sitzungsprüfung) */
let TS_P = null;
function loadTs(){
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!TS_P) TS_P = new Promise((res, rej) => {
    const sc = d.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true;
    sc.onload = () => window.turnstile ? res(window.turnstile) : rej(new Error('turnstile'));
    sc.onerror = () => { TS_P = null; rej(new Error('turnstile')); };
    d.head.appendChild(sc);
  });
  return TS_P;
}
async function tsWidget(slot, onTok){
  try { const T = await loadTs(); return T.render(slot, {sitekey:CTX.tk, appearance:'interaction-only', language:'de', callback:t => onTok(typeof t === 'string' ? t : ''), 'expired-callback':() => onTok(''), 'error-callback':() => onTok('')}); }
  catch (e) { return null; }
}
async function challengeSession(){
  if (!CTX.tk) return '';
  const slot = h('div', 'smmk-ts');
  await speak('Kurz noch eine Sicherheitsprüfung, dann geht es weiter.');
  addNode(slot);
  let done = null; const p = new Promise(r => { done = r; });
  const id = await aw(tsWidget(slot, t => { if (t) done(t); }));
  if (id == null){ slot.remove(); return ''; }
  let tok = '';
  try { tok = await aw(Promise.race([p, sleep(90000).then(() => '')])); }
  finally { slot.remove(); try { window.turnstile.remove(id); } catch (e) {} }
  return tok;
}
const TOPICS = ['bestellung', 'reklamation', 'sonderanfertigung', 'frage', 'sonstiges'];
function handoffForm(pre){
  const s = aiSess(), ho = s && s.ho;
  if (!ho || !ho.v || (ho.ts && !CTX.tk)) return null;
  pre = pre && typeof pre === 'object' ? pre : {};
  const f = h('form', 'smmk-form smmk-ho'); f.noValidate = true; f.setAttribute('aria-label', 'An unser Team weitergeben');
  const em = inp('email', {maxlength:'254', autocomplete:'email', spellcheck:'false', inputmode:'email', required:''});
  const nm = inp('text', {maxlength:'80', autocomplete:'name'});
  const sm = inp('textarea', {maxlength:'600', rows:'3'}); sm.value = str(pre.summary, 600);
  const nt = inp('textarea', {maxlength:'1000', rows:'2'});
  const topic = TOPICS.includes(pre.topic) ? pre.topic : 'frage';
  const ok = inp('checkbox', {}), okL = h('label', 'smmk-fok'), okS = h('span');
  okS.textContent = 'Ja, einverstanden: Gespräch und E-Mail gehen an unseren Kundenservice.'; okL.append(ok, okS);
  const ts = ho.ts ? h('div', 'smmk-ts') : null;
  const err = h('p', 'smmk-ferr'); err.setAttribute('role', 'alert');
  const b = h('button', 'smmk-ch pri'); b.type = 'submit'; b.textContent = 'Weitergeben'; b.disabled = true;
  const note = h('p', 'smmk-fnote'); note.textContent = 'Nur die E-Mail ist Pflicht. Den Text oben kannst Du ändern.';
  f.append(fld('Deine E-Mail', em), fld('Name (freiwillig)', nm), fld('Worum geht es?', sm), fld('Möchtest Du noch etwas ergänzen? (freiwillig)', nt), note);
  if (ts) f.append(ts);
  f.append(okL, err, b);
  let tok = '', wid = null;
  /* Einwilligung nur durch echte Eingabe: Zeiger oder Taste am Haken (oder seinem Text) und am Knopf (oder Enter im Formular).
     requestSubmit() und click() aus einem Skript erzeugen kein echtes pointerdown oder keydown. */
  const hu = {ok:false, send:0};
  ['pointerdown', 'keydown'].forEach(ev => okL.addEventListener(ev, e => { if (e.isTrusted) hu.ok = true; }));
  b.addEventListener('pointerdown', e => { if (e.isTrusted) hu.send = now(); });
  f.addEventListener('keydown', e => { if (e.isTrusted && (e.key === 'Enter' || e.key === ' ') && (e.target === b || e.target.tagName === 'INPUT')) hu.send = now(); });
  ok.addEventListener('change', () => { b.disabled = !ok.checked; });
  if (ts) tsWidget(ts, t => { tok = t; }).then(id => { wid = id; if (id == null){ err.textContent = 'Die Sicherheitsprüfung lädt gerade nicht. Schreib uns gern über die Kontaktseite.'; } });
  const lock = on => { f.setAttribute('aria-busy', on ? 'true' : 'false'); $$('input, textarea, button', f).forEach(x => { x.disabled = on || (x === b && !ok.checked); }); };
  const resetTs = () => { tok = ''; if (wid != null) try { window.turnstile.reset(wid); } catch (e) {} };
  f.addEventListener('submit', e => {
    e.preventDefault();
    /* Einwilligung nur durch den Besucher selbst: angehakt und abgeschickt */
    if (AI.busy || f._sent || !e.isTrusted || !ok.checked || !hu.ok || now() - hu.send > 3000) return;
    hu.send = 0;
    const mv = em.value.trim();
    if (!EMAIL_RE.test(mv)){ err.textContent = 'Bitte gib Deine E-Mail-Adresse ein.'; em.focus(); return; }
    if (ts && !tok){ err.textContent = 'Einen Moment, die Sicherheitsprüfung läuft noch.'; return; }
    err.textContent = ''; f._sent = true; lock(true);
    markUsed(); TURN++; S.lastInput = now(); push('sm_monk_step', {sm_step:'handoff_send'});
    const body = {consent:true, consent_version:ho.v, email:mv, name:nm.value.trim().slice(0, 80), note:nt.value.trim().slice(0, 1000), summary:sm.value.trim().slice(0, 600), topic};
    if (ts) body.turnstile = tok;
    go(() => aiHandoff(body, {f, em, err, ok, lock, resetTs, drop:() => { if (wid != null) try { window.turnstile.remove(wid); } catch (x) {} wid = null; }}));
  });
  addNode(f); return f;
}
async function aiHandoff(body, ui){
  const clear = () => { $$('input:not([type=checkbox]), textarea', ui.f).forEach(x => { x.value = ''; }); ui.ok.checked = false; ui.drop(); ui.f.remove(); };
  const reopen = msg => { ui.f._sent = false; ui.lock(false); ui.resetTs(); if (msg) ui.err.textContent = msg; };
  if (AI.busy) return reopen();
  AI.busy = true;
  try {
    const s = aiSess();
    if (!s){ reopen(LOST); return; }
    const r = await think(api('/handoff', Object.assign({sid:s.sid}, body), 10000), {ms:11000, back:false});
    const x = r.res || {status:0, j:{}, err:'timeout'}, j = x.j;
    if (x.status === 401){ dropSid(); reopen('Ich hab kurz den Faden verloren. Schick es bitte noch einmal ab.'); ensureSession(); return; }
    if (x.status === 400 && j.error === 'consent'){ dropSid(); clear(); return await aiCalm('Da hat sich gerade etwas geändert. Frag mich bitte noch einmal nach dem Team.', [{l:'Mit Mensch sprechen', pri:1, f:() => human()}]); }
    if (x.status === 0){ reopen(x.err === 'timeout' ? 'Das dauert gerade zu lange. Versuch es gleich noch einmal.' : 'Da hakt was. Versuch es gleich noch einmal.'); return; }
    if (x.status !== 200){ reopen('Da hakt was. Versuch es gleich noch einmal.'); return; }
    if (j.challenge === 'turnstile'){ reopen('Bitte bestätige noch kurz die Sicherheitsprüfung.'); return; }
    if (j.error === 'email'){ reopen(str(j.lines && j.lines[0] && j.lines[0].t, 280) || 'Die E-Mail-Adresse sieht nicht ganz richtig aus.'); try { ui.em.focus(); } catch (e) {} return; }
    if (j.mode === 'paused' && !Array.isArray(j.lines)){ clear(); return await aiPausedTurn(); }
    clear(); newTurn();
    if (j.ok === true){ S.calm = false; if (S.out && !still()){ const hp = headPoint(); burst('confetti', hp.x, hp.y, 30); } }
    return await aiRender(j);
  } finally { AI.busy = false; }
}
/* Freitext abschicken: höchstens 500 Zeichen, nicht schneller als alle 1,5 s, nie gespeichert */
function aiCompose(){
  const t = inputEl.value.replace(/\s+/g, ' ').trim().slice(0, 500); if (!t) return;
  if (AI.busy || now() - AI.lastText < 1500) return;
  inputEl.value = ''; markUsed(); TURN++; S.lastInput = now();
  push('sm_monk_step', {sm_step:'free_text'});
  newTurn('Du: ' + t, {typed:true}); go(() => aiTurn({text:t}));
}
/* Messung an den Server: nur Namen und kurze Tokens, nie Text, E-Mail oder Bestellnummer */
function aiEvent(name, props){
  const s = aiSess(); if (!aiUsable() || AI.evOff || !s || s.exp < Date.now()) return;
  const p = {};
  Object.keys(props || {}).slice(0, 8).forEach(k => {
    const v = props[k]; if (!/^[a-z][a-z0-9_]{0,23}$/.test(k)) return;
    if (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v) && Math.abs(v) <= 1e6)) p[k] = v;
    else if (typeof v === 'string' && /^[a-z0-9_.:-]{1,40}$/.test(v) && !/\d{4,}/.test(v)) p[k] = v;
  });
  api('/event', {sid:s.sid, name, props:p}, 5000).then(x => { if (x.status === 401) AI.evOff = AI.evOff || 'auth'; else if (x.status === 429 || x.j.mode === 'paused') AI.evOff = true; });
}

/* ---------- Leerlauf: Gewicht verlagern, summen, Kaffee, dann Zzz ---------- */
let steamE = null;
function steamOn(){ steamOff(); steamE = emitter('steam', () => { if (S.pose !== 'coffee' || !S.out) return null; const s = poseScale('coffee'); return {x:S.ax + (148 - 110) * s * S.facing, y:S.ay + (175 - 418) * s}; }, .18); }
function steamOff(){ if (steamE) stopEmitter(steamE); steamE = null; }
function idleCheck(){
  if (!S.out || S.busy || S.typing || S.hidden || S.yield || S.calm || S.anims > 0 || spotState) return;
  if (S.microBase !== S.lastInput){ S.microBase = S.lastInput; S.micro = 0; }
  const idle = now() - S.lastInput;
  if (!still()){
    if (S.mobile && boxOn() && !S.idleState && !S.patrolDone && !S.patrolling && idle >= 12000 && idle < 19000){ patrol(); return; }
    if (!S.idleState && S.micro < 1 && idle >= 9000){ S.micro = 1; hop(2, 140); return; }
    if (!S.idleState && S.micro < 2 && idle >= 14000){ S.micro = 2; emote('note', 1400); return; }
  }
  if (idle >= 20000 && !S.idleState && !S.patrolling){ S.idleState = 'coffee'; S.prevPose = S.pose; emote(null); setPose('coffee'); steamOn(); }
  else if (idle >= 80000 && S.idleState === 'coffee'){ S.idleState = 'zzz'; emote('zzz', 0); }
}
function wake(){
  S.lastInput = now();
  if (S.patrolling){
    S.patrolling = false;
    if (actor.classList.contains('walk')){ const m = new DOMMatrixReadOnly(getComputedStyle(actor).transform); S.walkStop = R(m.m41); }
    const mine = a => !(typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation);
    actor.getAnimations().filter(mine).forEach(a => a.cancel()); shadowC.getAnimations().filter(mine).forEach(a => a.cancel());
    box.classList.remove('away'); emote(null);
  }
  if (S.idleState){ const back = S.prevPose && S.prevPose !== 'coffee' ? S.prevPose : 'sketch'; S.idleState = null; emote(null); steamOff(); setPose(back); emote('!', 900); }
}

/* ---------- Andere Ebenen haben Vorrang: Warenkorb, Menü, Newsletter, Zepto, Cookie-Banner ---------- */
function cookieBanner(){
  const b = $('.pd-cookie-banner-window'); if (!b) return null;
  const s = getComputedStyle(b); const r = b.getBoundingClientRect();
  return (s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && r.height > 0 && !b.classList.contains('cc-invisible')) ? b : null;
}
function blockedNow(){
  if (S.tuck) return 'tuck';
  const de = d.documentElement, bd = d.body;
  if (bd.classList.contains('overflow-hidden') || de.classList.contains('overflow-hidden') || de.classList.contains('smnl-open')) return 'layer';
  const mob = $('#smmMob'); if (mob && !mob.hidden) return 'layer';
  if (drawerOpen()) return 'layer';
  if (zeptoOpen()) return 'layer';
  if (cookieBanner()) return 'cookie';
  /* eigene Dialoge (Box und Warte-Kopf) zählen nicht */
  if ($$('dialog[open]').some(e => !e.closest('#smMonk') && !e.classList.contains('smmk-yd') && vis(e))) return 'layer';
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
  if (S.mobile && boxOn()) sheetCheck();
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
  const dockOn = on && (S.out || boxOn() || S.active);
  dockEl.classList.toggle('on', dockOn);
  /* Solange der Mönch aktiv ist (auch beim Auftritt und während er wartet), hält ein offener, beschrifteter Dialog das Newsletter-Popup zurück */
  const hold = dockOn || !!S.active;
  if (hold !== dockWrap.hasAttribute('open')){ if (hold) dockWrap.setAttribute('open', ''); else dockWrap.removeAttribute('open'); }
  if (dockOn) dockWrap.removeAttribute('aria-hidden'); else dockWrap.setAttribute('aria-hidden', 'true');
  /* Dock knapp über dem Cookie-Banner, nicht mitten über der Seite */
  const cb = why === 'cookie' ? cookieBanner() : null, cbTop = cb ? cb.getBoundingClientRect().top : 0;
  const dt = cb && cbTop > 160 ? R(cbTop - 62) + 'px' : '';
  if (dockEl.style.top !== dt){ dockEl.style.top = dt; dockSay.style.top = dt ? R(cbTop - 56) + 'px' : ''; }
  if (why === 'cookie'){ dockSay.classList.add('on'); dockSay.textContent = 'Wähl erst kurz Deine Cookies, dann bin ich gleich da.'; }
  else if (why !== 'tuck' || !dockOn) dockSay.classList.remove('on');
}
/* Der Mönch verdeckt nie das fokussierte Element (WCAG 2.4.11): er macht Platz und wartet am Rand */
function coversEl(t){
  const r = t.getBoundingClientRect(); if (!r.width || !r.height) return false;
  const rs = [];
  if (boxOn() && box.style.visibility !== 'hidden') rs.push(box.getBoundingClientRect());
  if (S.out && !S.classic && !S.duck && sp) rs.push(sp.getBoundingClientRect());
  if (trayEl && trayEl.style.display !== 'none') rs.push(trayEl.getBoundingClientRect());
  if (propEl) rs.push(propEl.getBoundingClientRect());
  return rs.some(b => b.width && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
}
function tuck(){
  if (S.tuck) return; S.tuck = true; poll();
  dockSay.textContent = 'Ich mach Dir Platz. Tipp mich an, dann bin ich wieder da.'; dockSay.classList.add('on');
  setTimeout(() => { if (S.tuck) dockSay.classList.remove('on'); }, 3500);
}
function untuck(){ if (!S.tuck) return; S.tuck = false; dockSay.classList.remove('on'); poll(); focusLog(); }
/* Handy: Eingabefeld bleibt über der Tastatur */
function kbFix(){
  if (!stage) return;
  let kb = 0; const vv = window.visualViewport;
  const ae = d.activeElement;
  if (S.mobile && vv && ae && stage.contains(ae) && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) kb = Math.max(0, R(innerHeight - vv.height - vv.offsetTop));
  stage.style.setProperty('--kb', kb + 'px'); sheetCheck();
}

/* ---------- Bedienung ---------- */
let kbSwallow = null;
function bind(){
  box.addEventListener('click', e => { if (e.target.closest('button,input,textarea,a,form,select')) return; if (S.typing) S.skip = true; else advanceNow(); });
  /* Dialog nie per Escape vom Browser schließen lassen, das regelt der Mönch selbst */
  box.addEventListener('cancel', e => e.preventDefault());
  $$('.smmk-tools button', stage).forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.tool;
    if (t === 'close') go(() => exitFlow());
    if (t === 'sound') setSound(!S.sound);
    if (t === 'menu'){ if (!menuEl.hidden) return closeMenu(true); syncMenu(); menuEl.hidden = false; b.setAttribute('aria-expanded', 'true'); $('button', menuEl).focus(); }
  }));
  $$('button', menuEl).forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.m; closeMenu(m !== 'human');
    if (m === 'motion'){ S.reduced = !S.reduced; stage.classList.toggle('rm', S.reduced); d.documentElement.classList.toggle('smmk-rm', S.reduced); if (S.reduced) fxClear(); drawFace(); }
    if (m === 'classic'){ S.classic = !S.classic; stage.classList.toggle('classic', S.classic); if (S.classic){ fxClear(); clearLaser(); } placeShadow(S.ax, S.ay, S.out); drawFace(); }
    if (m === 'human'){ newTurn('Du: Mit Mensch sprechen'); go(() => human()); }
    syncMenu();
  }));
  /* Menü mit Pfeiltasten, wie es role=menu verspricht */
  menuEl.addEventListener('keydown', e => {
    const bs = $$('button', menuEl), i = bs.indexOf(d.activeElement); if (i < 0) return;
    const n = {ArrowDown:i + 1, ArrowUp:i - 1, Home:0, End:bs.length - 1}[e.key]; if (n == null) return;
    e.preventDefault(); e.stopPropagation(); bs[(n + bs.length) % bs.length].focus();
  });
  /* Freitext: Enter sendet, nie ein Seiten-Reload; getippter Text geht nie in die Messung. KI-Modus: an den Server (500 Zeichen),
     sonst der lokale Stichwort-Router (200 Zeichen) */
  composeEl.addEventListener('submit', e => {
    e.preventDefault();
    if (aiLive()) return aiCompose();
    const t = inputEl.value.replace(/\s+/g, ' ').trim().slice(0, 200); if (!t) return;
    inputEl.value = ''; markUsed(); TURN++; S.lastInput = now();
    newTurn('Du: ' + t, {typed:true}); go(() => routeText(t));
  });
  inputEl.addEventListener('focus', () => {
    kbFix();
    if (!S.out || S.busy) return;
    if (S.idleState) wake();
    const r = vr(box); glance(r.x + r.w / 2, 1500);
    if (!S.mobile && !S.reduced){ S.tilt = r.x > S.ax ? 2 : -2; applyTilt(); }
  });
  inputEl.addEventListener('blur', () => { kbFix(); S.tilt = 0; applyTilt(); });
  /* Formularfelder im Mönch (Bestellung, Weitergabe): Tastatur am Handy wie beim Eingabefeld */
  box.addEventListener('focusin', e => { if (e.target !== inputEl && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) kbFix(); });
  box.addEventListener('focusout', e => { if (e.target !== inputEl && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) setTimeout(kbFix, 50); });
  if (window.visualViewport){ visualViewport.addEventListener('resize', kbFix); visualViewport.addEventListener('scroll', kbFix); }
  dockEl.addEventListener('click', () => { if (S.tuck) return untuck(); dockSay.classList.add('on'); if (!cookieBanner()) dockSay.textContent = 'Ich warte, bis das Fenster zu ist.'; });
  d.addEventListener('focusin', e => {
    const t = e.target; if (S.tuck || S.yield || (!S.out && !boxOn()) || !t || t === d.body || !t.closest || t.closest('#smMonk, .smmk-dock, [data-smmk]')) return;
    requestAnimationFrame(() => { if (d.activeElement === t && coversEl(t)) tuck(); });
  });
  /* Antworten: leiser Tick beim Zeigen; bleibt der Fokus über 4 s auf den Knöpfen, einmal „…“ */
  let lastTick = null;
  const tick = e => { const b = e.target.closest && e.target.closest('.smmk-ch, .smmk-show'); if (b && b !== lastTick){ lastTick = b; sfx('tick'); } };
  choicesEl.addEventListener('pointerover', tick); choicesEl.addEventListener('focusin', tick);
  choicesEl.addEventListener('focusin', () => {
    clearTimeout(chFocusT);
    chFocusT = setTimeout(() => { if (!chDots && choicesEl.contains(d.activeElement) && !S.typing && !S.busy && S.out){ chDots = true; emote('…', 1200); } }, 4000);
  });
  choicesEl.addEventListener('focusout', () => clearTimeout(chFocusT));
  stage.addEventListener('pointerdown', () => markUsed(), true);
  stage.addEventListener('keydown', () => markUsed(), true);
  d.addEventListener('keydown', e => {
    if (!S.out && !boxOn()) return;
    S.lastInput = now(); if (S.idleState || S.patrolling) wake();
    if (e.key === 'Escape'){
      if (S.yield) return;
      /* in einem Formularfeld schließt Escape nicht den Mönch, das Getippte bleibt stehen */
      const fe = d.activeElement;
      if (fe && fe !== inputEl && stage.contains(fe) && /^(INPUT|TEXTAREA)$/.test(fe.tagName)){ fe.blur(); focusLog(); return; }
      if (spotState || qmTarget){ spotOff(); markerOff(); return; }
      if (!menuEl.hidden){ closeMenu(true); return; }
      if (S.out || boxOn()) go(() => exitFlow());
      return;
    }
    const ae = d.activeElement;
    const inCh = ae && ae.closest && (ae.closest('.smmk-choices') || ae.matches('.smmk-show'));
    if (inCh && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)){
      const bs = $$('.smmk-show', stage).filter(b => !b.disabled && b.offsetParent !== null).concat(allChoices().filter(b => !b.disabled));
      const i = bs.indexOf(ae); if (i < 0) return;
      const n = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
      bs[n].focus(); e.preventDefault(); return;
    }
    /* Weiter mit Enter oder Leertaste nur, wenn der Fokus in der Box oder auf der Seite selbst liegt; Links und Knöpfe der Seite bleiben unberührt */
    if ((e.key === 'Enter' || e.key === ' ') && boxOn() && !S.yield && (ae === box || ae === bbody || ae === d.body || !ae)){
      if (S.typing){ S.skip = true; e.preventDefault(); kbSwallow = e.key; } else if (S.waitAdv){ advanceNow(); e.preventDefault(); kbSwallow = e.key; }
    }
  });
  d.addEventListener('keyup', e => { if (kbSwallow && e.key === kbSwallow){ e.preventDefault(); kbSwallow = null; } });
  ['pointerdown', 'wheel', 'touchstart'].forEach(ev => d.addEventListener(ev, () => { S.lastInput = now(); if (S.idleState || S.patrolling) wake(); }, {passive:true, capture:true}));
  d.addEventListener('pointerdown', e => { if (spotState && now() - spotState.t > 250 && !e.target.closest('#smMonk')){ spotOff(); } if (qmTarget && !e.target.closest('#smMonk') && e.target.closest('a,button,input,label,select')) markerOff(); }, true);
  /* Klick auf „Jetzt personalisieren“: ab dann beobachten, ob der Zepto-Dialog aufgeht */
  d.addEventListener('click', e => { if (S.active && e.isTrusted && e.target.closest && e.target.closest('.pplr-c-button')) watchZepto(); }, true);
  /* Desktop: Blick zum Zeiger, wenn der länger als 700 ms auf der anderen Seite bleibt */
  let tiltRaf = 0, px = 0, lastMove = 0, otherSince = 0;
  d.addEventListener('pointermove', e => {
    if (now() - lastMove > 400){ S.lastInput = now(); if (S.idleState || S.patrolling) wake(); }
    lastMove = now();
    if (S.mobile || S.reduced || !S.out) return; px = e.clientX;
    if (!tiltRaf) tiltRaf = requestAnimationFrame(() => {
      tiltRaf = 0; if (S.anims > 0 && actor.getAnimations().length) return;
      S.tilt = Math.max(-3, Math.min(3, (px - S.ax) / vpW() * 12)); applyTilt();
      const side = px >= S.ax ? 1 : -1;
      if (side !== S.facing && !S.busy && !S.typing && !S.classic){ if (!otherSince) otherSince = now(); else if (now() - otherSince > 700){ otherSince = 0; glance(px, 1500); } }
      else otherSince = 0;
    });
  }, {passive:true});
  let lastTop = scrollY, lagRaf = 0;
  addEventListener('scroll', () => {
    const dy = scrollY - lastTop; lastTop = scrollY;
    if (spotState && now() - spotState.t > 300) spotOff();
    if (qmTarget) placeMarker();
    if (S.mobile || S.reduced || !S.out) return;
    S.lag = Math.max(-8, Math.min(8, S.lag - dy * .35));
    if (!lagRaf) lagRaf = requestAnimationFrame(function spring(){ S.lag *= .82; if (Math.abs(S.lag) < .5) S.lag = 0; lagEl.style.transform = `translateY(${R(S.lag)}px)`; lagRaf = S.lag ? requestAnimationFrame(spring) : 0; });
  }, {passive:true});
  bbody.addEventListener('scroll', bodyFade, {passive:true});
  new ResizeObserver(() => { sheetCheck(); rideSheet(); if (!S.mobile && $('.smmk-card, .smmk-row', trayEl)) placeTray(); }).observe(box);
  addEventListener('resize', applyViewport);
  d.addEventListener('visibilitychange', () => {
    S.hidden = d.hidden;
    d.getAnimations().forEach(a => { try { if (a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#smMonk')){ if (S.hidden) a.pause(); else a.play(); } } catch (e) {} });
    if (!S.hidden) fxRun();
  });
  try { mqRM.addEventListener('change', () => { S.reduced = mqRM.matches; stage.classList.toggle('rm', S.reduced); syncMenu(); drawFace(); }); } catch (e) {}
  setInterval(idleCheck, 500);
  setInterval(poll, 400);
}
function syncMenu(){
  if (!menuEl) return;
  [['motion', !S.reduced], ['classic', S.classic]].forEach(([m, on]) => { const b = $(`[data-m="${m}"]`, menuEl); if (!b) return; b.setAttribute('aria-checked', String(on)); $('.st', b).textContent = on ? 'An' : 'Aus'; });
}
function setSound(on){ S.sound = on; if (on) ac(); $$('.smmk-tools [data-tool=sound]', stage).forEach(b => b.setAttribute('aria-pressed', String(S.sound))); }
function applyViewport(){
  const was = S.mobile; S.mobile = innerWidth < 750;
  stage.classList.toggle('m', S.mobile);
  fxResize(); S.lift = calcLift(); stage.style.setProperty('--lift', S.lift + 'px');
  if (S.out){ applyPoseGeom(S.pose); const hm = home(); placeActor(hm.x, hm.y); }
  sheetCheck(); kbFix();
  if (was !== S.mobile){ clearTray(); S.mx = null; }
}

/* ---------- Öffentliche Schnittstelle für den Loader ---------- */
function start(intent, el){
  build(); S.active = true; poll();
  const k = String(intent || 'open'), deep = el === 'url';
  const entry = el && el.nodeType === 1 ? (el.getAttribute('data-smmk-src') || k) : deep ? (k === 'resume' ? 'resume' : 'deeplink') : String(el || k);
  if (!deep || k === 'resume') markUsed();
  if (el && el.nodeType === 1) S.trigger = el;
  S.lastInput = now();
  /* Eingabefeld nur mit ?moench_input=1, nach dem ersten Klick für die Sitzung gemerkt */
  S.compose = S.compose || /[?&]moench_input=1\b/.test(location.search) || !!ssRead().ci;
  composeEl.hidden = !S.compose; if (S.compose && S.used && !SS.ci) ssUpd({ci:1});
  /* KI-Modus: Sitzung erst jetzt (Klick oder Deep Link), nie beim Vorladen; eine gültige wird wiederverwendet */
  if (aiOn()){ AI.entry = entryOf(entry); if (aiUsable()) ensureSession(); }
  applyAiUi();
  /* Deep Link: ?moench= verschwindet aus der Adresse, sobald der Ablauf startet */
  if (deep && k !== 'resume' && (/[?&]moench=/.test(location.search) || /^#moench/.test(location.hash))){ try { const u = new URL(location.href); u.searchParams.delete('moench'); if (/^#moench/.test(u.hash)) u.hash = ''; history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) {} }
  const mob = $('#smmMob'), menuWas = !!(mob && !mob.hidden); if (menuWas){ const x = $('.mob-x', mob); if (x) x.click(); }
  if (k === 'resume') return resume();
  /* Schon draußen: nur der Kopf im Header schickt ihn weg. Jeder andere Einstieg (Menü, Seite) holt ihn zurück nach vorn. */
  if (k === 'open' && (S.out || boxOn())){
    const hdr = el && el.nodeType === 1 && el.getAttribute('data-smmk-src') === 'header';
    if (hdr && !menuWas && !S.yield && !S.tuck){ go(() => exitFlow()); return; }
    untuck(); if (S.out){ hop(6, 160); emote('!', 900); }
    if ($('.smmk-ch:not(:disabled)', choicesEl)) focusFirst(); else focusLog();
    return;
  }
  S.t0 = now(); TURN = 0; S.outcome = '';
  push('sm_monk_open', {sm_entry:entry});
  go(async () => {
    if ((k === 'gift' || k === 'geschenk') && pageKind() === 'acoll') return opener();
    if (k === 'gift' || k === 'geschenk'){ await ensureOut('sketch', 'leap', {target:$('#fchips')}); newTurn(); return giftStep1(hello()); }
    if (k === 'someone'){ await ensureOut('sketch', 'leap'); newTurn(); return someoneElse(hello()); }
    if (k === 'order' || k === 'bestellung'){ await ensureOut(S.mobile ? 'sketch' : 'pc', 'leap'); newTurn(); return orderFlow(hello()); }
    if (k === 'faq'){ await ensureOut('sketch', 'leap'); newTurn(); return faqTopics(hello()); }
    if (k === 'product'){ return productOpener(!!CTX.pz); }
    if (k === '404'){ return notFound(); }
    if (k === 'human'){ await ensureOut('sketch', 'leap'); newTurn(); return human(); }
    return opener();
  });
}
function resume(){
  try { if (location.hash === '#moench-r') history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
  const st = ssRead(); SS = st;
  const cue = st.cue; if (cue) ssUpd({cue:null});
  const go2 = (fn, pause) => { S.greeted = true; S.t0 = now(); TURN = 0; push('sm_monk_open', {sm_entry:'resume'}); go(async () => { if (pause !== 0) await sleep(400); for (let i = 0; i < 40 && blockedNow() === 'cookie'; i++) await sleep(250); return fn(); }); };
  if (cue && cue.u === location.pathname){
    if (cue.k === 'pdp') return go2(() => pdpGuide(!!(cue.z && CTX.pz !== 0), true, cue));
    if (cue.k === 'faq') return go2(() => faqShow(cue.g, cue.l, true));
    if (cue.k === 'kontakt') return go2(() => kontaktGuide(true, cue.topic || ''));
    if (cue.k === 'sonder') return go2(() => sonderGuide(true));
  }
  /* Zurück-Taste auf die Seite mit den Vorschlägen: dieselben Karten, ohne neu zu fragen */
  if (st.back && st.back.u === location.pathname && st.back.k === 'cards'){ ssUpd({back:null}); return go2(() => resumeCards(), 0); }
  checkCart();
}
/* bfcache: beim Verlassen die Box zurücksetzen, beim Zurückkommen mit den Vorschlägen wieder öffnen */
addEventListener('pagehide', () => {
  if (!built) return;
  newFlow(); S.busy = false; S.typing = false; clearTray(); spotOff(); markerOff(); clearLaser(); clearProp(false);
  if (boxOn()) closeBox(); if (S.out) showActor(false); S.active = false; setYield('');
});
addEventListener('pageshow', e => {
  if (!e.persisted) return;
  const s = (() => { try { return JSON.parse(sessionStorage.getItem(SKEY)) || {}; } catch (x) { return {}; } })();
  if (s.u && s.back && s.back.u === location.pathname) start('resume', 'url');
});
window.SMMK = {open:start, version:'ki-1', shipLine, render, ai:() => ({on:aiOn(), usable:aiUsable(), live:aiLive(), mode:aiSess() ? aiSess().mode : null, test:aiSess() ? aiSess().test === true : null, paused:AI.paused, down:AI.down}), state:() => ({out:S.out, pose:S.pose, ax:S.ax, ay:S.ay, home:built ? home() : null, lift:S.lift, yield:S.yield, mobile:S.mobile, busy:S.busy, typing:S.typing, facing:S.facing, turn:TURN, why:built ? blockedNow() : '', active:d.activeElement ? (d.activeElement.className || d.activeElement.tagName) : '', anims:built ? actor.getAnimations().map(a => a.playState) : []})};
const q = window.smMonkQ; window.smMonkQ = {push:a => start(a[0], a[1])};
if (Array.isArray(q)) q.forEach(a => start(a[0], a[1]));
d.addEventListener('sm:cart-changed', cartSoon);
try { if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') subscribe(PUB_SUB_EVENTS.cartUpdate, cartSoon); } catch (e) {}
})();
