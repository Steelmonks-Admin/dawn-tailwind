/* Schilder-Werkstatt auf der Kollektionsseite (snippets/sm-coll-schild.liquid): Text, Hausnummer, Farbe (Oberfläche) und Größe, dazu Kategorie,
   Sortierung und Filter der Liste in einem einzigen Bedienelement.
   Jede Karte (.cc mit data-h = Produkt-Handle), für die es ein Design in sm-ss-designs.json gibt, zeigt statt des Fotos die Tür-Szene:
   die Hauswand im festen Maßstab (SMSchild.szene, 250 × 250 cm mit ganzer Tür), das Schild mit dem eigenen Text maßstäblich daneben,
   unten links eine Lupe mit demselben Schild in lesbarer Größe (SMSchild.lupe), darin ein Maßband mit Strichen alle 10 cm, dazu das Maß
   und den Preis der passenden Variante (im Geldformat des Shops, data-geld). Karten ohne Design oder ohne passenden Text behalten ihr Foto („Beispielfoto“).
   Die Lupe vergrößert höchstens sechsfach (die breite zehnfach), kleine Schilder stehen dann kleiner darin; unter anderthalbfach entfällt sie.
   Ausnahme: kleine Schrift (Namenszeilen an Hausnummern) darf bis zum Rand der Lupe vergrößert werden, damit sie lesbar wird (lupe).
   Edelstahl, Weiß und Gold hängen an der dunklen Wand, alles andere an der hellen.
   Zwei Arten (data-modus): strasse = erst Straße oder Wunschtext, dann Nr.; nummer = erst Hausnummer, dann Name oder Straße.
   Farbe und Größe stehen sofort da: Listen und Vorauswahl aus sm-coll-beliebt.js (window.SMCBeliebt, gebaut aus den Bestellungen der letzten zwölf Monate,
   die beliebteste Wahl trägt die Marke „Beliebt“). Nach dem Laden rechnet regler() die Listen aus den echten Produkten der Kollektion (products.json) neu.
   Schon ohne Eingabe holt die Seite, sobald der Browser Luft hat, Produkte und Designs (nur Daten, vorladen): jede Karte mit Design zeigt dann den Preis
   der gewählten Farbe und Größe mit der Größe in einer Mono-Zeile darunter, ein Wechsel von Farbe oder Größe ändert die Preise sichtbar.
   Solange die Größe nur aus „Beliebt“ kommt (nicht gewählt, nicht im Link), hängt ein Produkt, das sie nicht führt oder bei ihr einen Hinweis
   bekäme (kleine Schrift), in seiner eigenen beliebtesten Größe, wenn die besser ist; das Maß auf der Lupe trägt dann „beliebt“. Kein eigener Hinweis:
   orange Hinweise bleiben für gewählte Größen und echte Abweichungen, die kleine Schrift allein nennt in diesem Zustand nur das Probehängen.
   Größe ist der Wert der Größen-Option, wie immer sie heißt (Breite, Höhe, Durchmesser, Größe, Länge). Fehlt einem Produkt die gewählte Größe,
   nimmt es die nächstkleinere, sonst seine kleinste, und sagt das auf der Karte. Emaille wählt die Platte nach der Textlänge. Einzelne Zeichen (frei, einzeln):
   Preis mal Anzahl der Zeichen. Vorrang der Vorauswahl: Link (o=, g=) vor der letzten Eingabe dieser Sitzung vor „Beliebt“.
   Eine Größe, die im Probehängen gewählt wird, gilt nur für dieses eine Produkt (EIG); die Größe der Werkstatt gilt für alle und hebt sie wieder auf.
   Auswahllisten (wahl): Knopf mit aria-haspopup und aria-expanded öffnet eine Liste als Popover (oberste Ebene, über allem, auch über dem Trusted-Shops-Abzeichen),
   am Handy als Blatt von unten. Pfeiltasten, Pos1, Ende, Eingabe, Leertaste; Escape und ein Tipp daneben schließen, der Fokus geht zurück auf den Knopf.
   Kategorie und Sortierung bedienen sm-coll.js (Klick auf li data-tab, change am versteckten select data-sort), der Filter ist dessen Preis-Regler und „ab 4,8 ★“.
   Der Preis-Regler filtert nach dem Preis, den die Karten zeigen: mit Eingabe reicht er von den gezeigten Preisen (preisSpanne), ohne wieder vom „ab“-Preis.
   Schlanke Leiste (leiste): sobald das Element ganz aus dem Bild gescrollt ist (seine Unterkante über der der Leiste) und etwas eingegeben ist, steht oben
   am Fenster der eigene Text als Pille (führt zurück zur Eingabe) mit Farbe und Größe, am Rechner rechts die Trefferzahl.
   Der Kopf des Shops klebt hier nicht (body mit overflow-x: hidden); falls doch, sitzt die Leiste darunter.
   Gezeichnet werden nur Karten in der Nähe des Bildausschnitts (IntersectionObserver), der Rest beim Scrollen.
   Welche Lupe eine Karte zeigt, entscheidet jede Karte für sich nach ihrem Text (lupenwahl). Die breite Lupe endet auf breiten Karten vor dem Haus-Symbol,
   das so auf jeder Karte unten rechts steht. Handy: eine Spalte, sobald etwas eingegeben ist (Schalter für zwei Spalten in der Zeile der Liste; bleibt dort
   eine Schrift auch in der Lupe zu klein, sagt die Karte „In einer Spalte lesbar“); ein Tipp ins Feld schiebt das Element an den oberen Rand,
   damit die Karten darunter sichtbar bleiben, die Eingabetaste führt zu den Karten.
   Zeichnen, Schriften, Hausfotos und Produktdaten werden erst bei der ersten Eingabe geladen; bis die Hausfotos da sind, bleibt das Produktfoto.
   Dazu: der Mönch sagt kurze Sätze (sagen), der erste fertige Entwurf wird in der Lupe „gelasert“ (Klasse sms-cut), „Idee würfeln“ füllt Beispiele ein,
   das Haus-Symbol öffnet das Probehängen (Dialog: dieselbe Szene groß mit Maßlinie, oder das ganze Haus mit dem Mönch als Maßstab).
   Der Link jeder Karte führt mit ?schild=1 auf die Produktseite (mit Design dazu ?variant=…); den Text übergibt sessionStorage (sm_schild: s, n, o, g,
   m = Art, e = eigene Größen) und, für einen neuen Tab ohne sessionStorage, localStorage (sm_schild_l, je Seite eine Kennung, im Link als schild=<Kennung>).
   sm-schild-pdp.js trägt ihn dort in den Personalisierer ein.
   Felder, die im Personalisierer nur Ziffern oder nur Buchstaben und Ziffern nehmen (Design: erlaubt), zeichnet die Karte so, wie der Personalisierer
   sie stehen ließe, und sagt es im Hinweis („Nr. nur Ziffern“); die Produktseite trägt so eine Nummer nicht ein.
   Einstieg von außen: ?strasse=…&nr=…&o=<Oberfläche>&g=<cm>&d=<Produkt>; mit d= gilt g= auch als eigene Größe dieses Produkts. */
(function(){
  var root=document.querySelector('[data-sms]'); if(!root) return;
  var smc=root.closest('[data-smc]'), grid=smc&&smc.querySelector('[data-grid]'); if(!grid) return;
  function $(s){ return root.querySelector(s); }
  var inS=$('[data-sms-s]'), inN=$('[data-sms-n]'), clr=$('[data-sms-x]'), say=$('[data-sms-say]'), pix=$('[data-sms-pix]'), idee=$('[data-sms-idee]'), live=$('[data-sms-live]');
  var spalten=$('[data-sms-sp]'), leiste=$('[data-sms-leiste]'), pillT=$('[data-sms-pill-t]'), sortSel=$('[data-sort]'), maxIn=$('[data-max]'), topIn=$('[data-top]');
  var NR=root.dataset.modus==='nummer', A=root.dataset.asset, KEY='sm_schild', RUHIG=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var HANDY=window.matchMedia?matchMedia('(max-width: 760px)'):{matches:false};   // Handy: Listen als Blatt von unten, Element beim Tippen an den oberen Rand
  var NAMES=['Schwarz','Anthrazit','Edelstahl','Cortenstahl','Weiß','Gold'], TX=['schwarz','anthrazit','edelstahl','corten','weiss','gold'];   // Reihenfolge wie SMSchild.surfaceIndex
  var OTXT=['Schwarz, der Klassiker.','Anthrazit, ruhig und modern.','Edelstahl, auf dunkler Wand am schönsten.','Cortenstahl mit echter Rostoberfläche.','Weiß, klar und hell, hier auf dunkler Wand.','Gold, für den großen Auftritt, hier auf dunkler Wand.'];
  var TEX=TX.map(function(n){ return A+'sm-ss-tex-'+n+'.jpg'; }), HAUS=[A+'sm-ss-haus-1.jpg',A+'sm-ss-haus-2.jpg'], HW=1168/880;   // HW: Seitenverhältnis der Hausfotos
  var POSE={lupe:66,skizze:117,laser:111,mass:123,kaffee:68};   // Breite der Pixel-Figur bei 120 px Höhe (im Kasten fester Größe, damit nichts springt)
  var IDEEN=NR?[['Familie Sommer','7'],['Lindenhof','12a'],['Krüger','24'],['Haus am See','3'],['Neumann','42'],['Villa Sonnenschein','108']]
    :[['Wolke','7'],['Omas Garten','1'],['Papas Werkstatt','1'],['Heimathafen','3'],['Lieblingsplatz','1'],['Am Feierabend','5'],['Unser Zuhause','24'],['Zur Feuerstelle','8']];
  // Beliebt: je Kollektion die meistbestellte Oberfläche und Größe (Vorauswahl, Marke „Beliebt“) und die Listen vor dem Laden; je Produkt dasselbe fürs Probehängen
  var BEL=window.SMCBeliebt||{}, BK=(BEL.k||{})[root.dataset.coll]||{}, BP=BEL.p||{}, POP_O=TX.indexOf(BK.o), POP_G=+BK.g||0;
  // Lupe in Prozent der Bildfläche: n neben der Tür, s breit (schmale Karten, lange Texte). fx, fy: Anteil, den das Schild darin höchstens füllt.
  // fm: stärker vergrößert die Lupe nie. Kleine Schilder (10 cm) stehen dann kleiner in der Lupe statt bis zu 17-fach auf verwaschenem Putz, und die Lupe
  // zeigt selbst, ob ein Schild 10 oder 30 cm misst. Sechsfach neben der Tür; zehnfach in der breiten Lupe, die auf schmalen Karten steht (dort ist das
  // in px derselbe Maßstab wie sechsfach auf einer breiten Karte) und sonst nur, wenn die Schrift neben der Tür zu klein bliebe.
  // h: hohe und runde Schilder mit Textzeile (3 Zeiliges Schild hochkant, Botanisch, Nummer über Namen): die flache Lupe füllen sie nur in der Höhe, die Schrift
  // bliebe klein. Dort ist die Lupe neben der Tür höher (50 % statt 34 %, endet weiter unter dem Schild an der Wand), die Schrift steht bis 1,7-mal größer darin
  var LP={n:{w:55,h:34,fx:.86,fy:.72,fm:6},s:{w:94,h:34,fx:.92,fy:.78,fm:10},h:{w:55,h:50,fx:.86,fy:.84,fm:6}};
  var FMIN=1.5,   // vergrößert die Lupe weniger als anderthalbfach, entfällt sie: das Schild ist an der Wand groß genug, die Lupe wiederholte es nur (ohne).
      FKL=1.2,    // Ausnahme: Schilder mit Schrift, die an der Wand unter LGUT px hoch bleibt, behalten die Lupe bis hinunter zu 1,2-fach,
      LGUT=12,    // denn dort macht sie den eigenen Text noch lesbarer (Straßenschilder in 90 cm). Reine Hausnummern in 50 cm brauchen sie nicht
      CMIN=230,   // Karten schmaler als 230 px bekommen immer die breite Lupe
      LMIN=8,     // bleibt die Schrift in der Lupe neben der Tür unter 8 px, bekommt die Karte die breite Lupe (wenn die sie spürbar größer zeigt)
      K2=6.5,     // zwei Spalten am Handy: unter so vielen px Schrifthöhe in der Lupe der Hinweis „In einer Spalte lesbar“
      LCM=5.8,    // Schrifthöhe in cm mal Vergrößerung, ab der die Schrift in der Lupe lesbar ist: 8 px auf einer Karte von 343 px (eine Spalte am Handy).
                  // Bleibt eine Zeile darunter (Namen an Hausnummern, oft unter 1 cm), darf die Lupe bis zum Rand vergrößern, höchstens 2,5-mal mehr als fm
      GROESSE=/^(Breite|Höhe|Durchmesser|Größe|Länge)$/;
  var START=say.innerHTML;
  var HAUS_ICON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>';
  var LUPE_ICON='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="6.7" cy="6.7" r="4.4"/><path d="m10.2 10.2 4 4"/></svg>';
  var st={s:'',n:'',o:0,g:0}, ready=null, DES={}, PROD={}, OPT={}, SCH={}, cards={}, nah={}, alt={}, BILD={}, FL=[], GR=[], GNAME=BK.gname||'Größe';
  var EIG={};   // eigene Größe einzelner Produkte (Handle: cm), im Probehängen gewählt. Für alle anderen gilt st.g
  var gWahl=false;   // Größe selbst gewählt (Liste, Link g=, schon in dieser Sitzung): dann gilt st.g für jede Karte. Sonst darf ein Produkt seine beliebteste nehmen
  var lager=true, tmr, tmrFx, tmrSay, tmrGr, tmrOrd, tmrLive, ordOffen=false, fxOffen=true, schmal=false, KW=0, anz=0, ideeNr=Math.floor(Math.random()*IDEEN.length);
  var dlg=null, dlgH=null, dlgGanz=false, offen=null, rootSicht=true, listeSicht=false, obenRaf=0;
  var prodP=null, desP=null, vorP=null, gepreist=false;   // Produkte und Designs vorab (Preise ohne Eingabe), gepreist: Karten zeigen den Preis der gewählten Variante
  [].forEach.call(grid.querySelectorAll('.cc[data-h]'),function(cc){ cards[cc.dataset.h]=cc; });
  // Listen vor dem Laden (sm-coll-beliebt.js), Vorauswahl die beliebteste Wahl
  FL=(BK.fl||[]).map(function(n){ return TX.indexOf(n); }).filter(function(i){ return i>=0; });
  GR=(BK.gr||[]).map(Number).filter(function(x){ return x>0; });
  st.o=POP_O>=0?POP_O:FL.length?FL[0]:0; st.g=POP_G||GR[0]||0;

  // Preis im Geldformat des Shops (data-geld = shop.money_format, z. B. „€ {{amount_with_comma_separator}}“), damit er aussieht wie auf den Karten ohne Schild.
  // Der Platzhalter sagt, wie die Zahl geschrieben wird: mit oder ohne Nachkommastellen, Komma oder Punkt, Tausender mit Punkt, Komma, Hochkomma oder Leerzeichen.
  // Der Preis wird als HTML eingesetzt, deshalb läuft das Format durch esc
  var GELD=esc(/\{\{\s*\w+\s*\}\}/.test(root.dataset.geld||'')?root.dataset.geld:'€ {{amount_with_comma_separator}}');
  function eur(c){
    return GELD.replace(/\{\{\s*(\w+)\s*\}\}/,function(m,k){
      var p=(c/100).toFixed(/no_decimals/.test(k)?0:2).split('.'), t=/comma/.test(k)?'.':/apostrophe/.test(k)?'\'':/space/.test(k)?' ':',';
      return p[0].replace(/\B(?=(\d{3})+(?!\d))/g,t)+(p[1]?(/comma|^amount_with_space/.test(k)?',':'.')+p[1]:'');
    });
  }
  function cent(p){ return Math.round(parseFloat(p)*100)||0; }
  function esc(t){ var d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
  function zahl(t){ return parseFloat((''+(t==null?'':t)).replace(',','.'))||0; }   // „30cm“, „22.5cm“, „20cm x ca. 17cm“, „40 x 15 cm (…)“: die erste Zahl
  function cm(x){ return (Math.round(x*10)/10+'').replace('.',','); }
  function aktiv(){ return !!(st.s||st.n); }
  function text(){ return (NR?st.n+' '+st.s:st.s+' '+st.n).trim(); }
  // Schilder ohne Nummernfeld: die Nummer steht nur dann mit in der Textzeile, wenn das Feld eine Adresse aufnimmt („Straßenname und Hausnummer“, „Adresse“).
  // Namensschilder („Wunschtext“, „Name - oben“) bekommen nur den Text, wie auf der Produktseite (sm-schild-pdp.js, gleiche Regel)
  function nrIn(d){ var sm=d.sm||{}, l=sm.st||sm.txt||''; return !SMSchild.single(d)||(l?/hausnummer|adresse/i.test(l):d.props.some(function(p){ return p.role==='st'; })); }
  // Mehrere Textzeilen, eine davon für die Straße (3 Zeiliges Schild: Straße, Nummer, Familienname): in der Straßen-Art gehört der Text in die Straßenzeile.
  // In der Nummern-Art und wenn das Design seine Hauptzeile selbst nennt (haupt), bleibt es bei der Regel des Designs. Gleiche Regel in sm-schild-pdp.js.
  // offen: die Textzeilen, die dabei leer bleiben (keine Vorgabe des Personalisierers): die Karte nennt sie, gefüllt werden sie auf der Produktseite
  function zeile(d){
    var tf=d.props.filter(function(p){ return p.role!=='nr'; }), z=tf.filter(function(p){ return /stra(ß|ss)e/i.test(p.prop); })[0], c={}, k;
    if(NR||d.haupt||tf.length<2||!z) return d;
    for(k in d) c[k]=d[k]; c.haupt=z.prop; c.offen=tf.filter(function(p){ return p!==z&&!p.vor; }).map(function(p){ return p.prop; }); return c;
  }
  function mono(){ return st.s; }   // der Zeichner nimmt den ersten Buchstaben (Ä wird A, Ziffer oder leer A), wie auf der Produktseite
  // Die Blase wechselt sofort, ihre Höhe bleibt (CSS: zwei Zeilen fest), deshalb springt beim Tippen nichts. Vorgelesen (aria-live) wird aus einem eigenen,
  // unsichtbaren Element und erst nach ms: jede neue Zeile verwirft die noch nicht vorgelesene. ms unter 0: diese Zeile gar nicht
  function sagen(t,pose,ms){
    if(t!=null&&say.innerHTML!==t) say.innerHTML=t;
    if(pose&&pix.dataset.pose!==pose){ pix.dataset.pose=pose; pix.width=POSE[pose]; pix.src=A+'sm-pxm_'+pose+'.webp'; }
    clearTimeout(tmrLive); if(live&&!(ms<0)) tmrLive=setTimeout(function(){ var x=say.textContent; if(live.textContent!==x) live.textContent=x; },ms||250);
  }
  // Bilder vorab holen (Hausfotos, Texturen, Formen), damit keine Karte ein Schild auf leerer Fläche zeigt. Nach ms geht es auch ohne weiter
  function bild(u){ return BILD[u]||(BILD[u]=new Promise(function(ok){ var i=new Image(); i.onload=i.onerror=function(){ ok(); }; i.src=u; })); }
  function warten(l,ms){ return Promise.race([Promise.all(l.map(bild)),new Promise(function(ok){ setTimeout(ok,ms); })]); }

  // Nummer einer Oberfläche wie SMSchild.surfaceIndex (dieselbe Regel), hier eigen, weil die Preise ohne Eingabe schon vor dem Zeichner gebraucht werden
  function flaeche(t){ t=t||''; return /Schwarz/i.test(t)?0:/Anthrazit/i.test(t)?1:/Edelstahl/i.test(t)?2:/Corten/i.test(t)?3:/Wei(ß|ss)/i.test(t)?4:/Gold/i.test(t)?5:-1; }
  // Optionen eines Produkts: si, gi = Platz von Oberfläche und Größe, fl = Oberflächen (Nummern), gv = Größen als Text der Option, gn = als Zahl in cm
  function optionen(h){
    var d=DES[h], p=PROD[h], O={si:-1,gi:-1,fl:null,gv:null,gn:null}, k=-1;
    if(!p) return O;
    p.options.forEach(function(x,i){ if(x.name==='Oberfläche') O.si=i; else if(x.name===d.opt) O.gi=i; else if(GROESSE.test(x.name)) k=i; });
    if(O.gi<0) O.gi=k;
    if(O.si>=0) O.fl=p.options[O.si].values.map(flaeche);
    if(O.gi>=0){ O.gv=p.options[O.gi].values; O.gn=O.gv.map(zahl); }
    return O;
  }
  // Emaille: die Platte richtet sich nach der Textlänge (maxJe des Designs, sonst „(8-12 Buchstaben)“ im Text der Option).
  // Ergebnis: [Platz der Größe, erlaubte Zeichen auf der größten Platte, falls der Text auch dort nicht passt (sonst 0), 'Nummer' oder 'Text']
  function platte(d,O){
    var je=d.maxJe||{}, nr=!je.st&&!!je.nr, m=je.st||je.nr, l=nr?st.n.length:(SMSchild.single(d)&&nrIn(d)?text():st.s).length, i;
    if(!m) m=O.gv.map(function(t){ var x=/(\d+)\s*Buchstaben/.exec(t); return x?+x[1]:0; });
    for(i=0;i<m.length;i++) if(l<=m[i]) return [i,0];
    return [Math.max(0,m.length-1),m[m.length-1]||0,nr?'Nummer':'Text'];
  }
  // Was eine Karte zeigt: Oberfläche (bietet das Produkt die gewählte nicht an: seine erste; farbige Platten und Produkte ohne die Option: keine Wahl),
  // Größe (fehlt die gewählte: die nächstkleinere, sonst die kleinste; Emaille nach Textlänge) und die Variante dazu.
  // zg: die gewünschte Größe (die eigene des Produkts aus dem Probehängen, sonst die der Werkstatt). gf sagt, warum die gezeigte davon abweicht:
  // 1 = größer gibt es das Produkt nicht, 2 = diese Größe fehlt ihm, gezeigt ist die nächstkleinere, 3 = kleiner gibt es das Produkt nicht
  function wahl(h,zw){
    var d=DES[h], p=PROD[h], O=OPT[h]||{}, zg=zw||(O.gn&&O.gn.indexOf(EIG[h])>=0?EIG[h]:st.g), W={o:st.o,g:zg,gt:zg,zg:zg,gf:0,v:null,of:false,lang:''}, i=-1, min=0, max=0;
    if(!p) return W;
    // Ohne Oberflächen-Option: die Oberfläche des Designs (flaeche, falls die Daten sie nennen), sonst Schwarz. Zwei Lagen (hinten): vorn Edelstahl auf dunkler
    // hinterer Platte wie auf dem Produktfoto, sonst wäre die ausgeschnittene Nummer nicht zu sehen; die Wand richtet sich dann nach der hinteren Lage
    if(!O.fl||d.emaille){ i=d.hinten&&!d.emaille?d.hinten.surface||0:-1; W.o=d.flaeche>0?d.flaeche:i<0?0:i===2?0:2; if(i>=0) W.wand=i; i=-1; }
    else if(O.fl.indexOf(st.o)<0){ W.o=O.fl[0]<0?0:O.fl[0]; W.of=true; }
    if(O.gv){
      if(d.emaille){ i=platte(d,O); if(i[1]) W.lang=zuLang(i[2],i[1]); i=i[0]; }
      else { O.gn.forEach(function(x,k){ if(x<=zg&&(i<0||x>O.gn[i])) i=k; if(x<O.gn[min]) min=k; if(x>O.gn[max]) max=k; }); if(i<0) i=min; W.gf=O.gn[i]===zg?0:O.gn[i]>zg?3:i===max?1:2; }
      W.g=O.gn[i]; W.gt=O.gv[i];
    } else W.g=W.gt=0;
    p.variants.forEach(function(v){
      var ov=[v.option1,v.option2,v.option3];
      if(W.v||(O.fl&&!d.emaille&&flaeche(ov[O.si])!==W.o)||(O.gv&&ov[O.gi]!==W.gt)) return;
      W.v=v;
    });
    return W;
  }
  // Breite Lupe: auf schmalen Karten (unter CMIN) über 94 % der Breite, darüber endet sie 42 px früher, damit das Haus-Symbol (36 px) auf jeder Karte
  // unten rechts stehen kann und nicht über die Lupe in die Bildmitte springen muss
  function lpS(){ return KW>=CMIN?{w:+(94-4200/KW).toFixed(2),h:LP.s.h,fx:LP.s.fx,fy:LP.s.fy,fm:LP.s.fm}:LP.s; }
  // Lohnt die Lupe L (S.Ln oder S.Ls) für das Schild S nicht, wenn die Bildfläche C px breit ist? Regel bei FMIN. C unbekannt (0): nur nach der Vergrößerung
  function ohne(S,L,C){ var w=S.cap*C/250; return L.f<FMIN&&!(L.f>=FKL&&w>0&&w<LGUT); }
  // Breite der Bildfläche einer Karte in px (alle Karten sind gleich breit)
  function kartenbreite(){ var ph=null; reihenfolge().some(function(cc){ ph=cc.querySelector('.ph'); return ph&&ph.clientWidth; }); return ph?ph.clientWidth:0; }
  // Lupe zu einer Szene, höchstens fm-fach: darüber bekommt SMSchild.lupe einen entsprechend kleineren Anteil des Kastens für das Schild.
  // cap: Schrifthöhe der Textzeile in cm. Bliebe sie bei fm unlesbar (cap × fm unter LCM), gilt das Nötige, höchstens 2,5 × fm; mehr als den Kasten füllt
  // das Schild nie. So stehen Namen an Hausnummern größer in der Lupe, ohne dass große Schilder anders aussehen
  function lupe(Z,L,cap){ var r=SMSchild.lupe(Z,L), fm=L.fm, k; if(cap>0&&cap*fm<LCM) fm=Math.min(LCM/cap,L.fm*2.5); k=fm/r.f; return k<1?SMSchild.lupe(Z,{w:L.w,h:L.h,fx:L.fx*k,fy:L.fy*k}):r; }
  // Hinweis „zu lang“ in zwei Fassungen: ausgeschrieben, und kurz für schmale Karten (dort hat der Hinweis nur eine Zeile)
  function zuLang(was,n){ return [was+' hier höchstens '+n+' Zeichen',(was==='Nummer'?'Nr.':was)+' max. '+n+' Zeichen']; }
  // alles, was Karte und Probehängen über ein Schild wissen müssen. leer: mit dieser Eingabe gibt es nichts zu zeigen (Karte behält ihr Foto).
  // o: Oberfläche des Schilds, wo: Oberfläche, nach der die Wand gewählt wird (meist dieselbe). Gold hängt an der dunklen Wand (wo = Weiß): auf der hellen
  // sind Texte, die aus einer goldenen Platte geschnitten sind, kaum zu lesen (heller Putz in Gold), und alle goldenen Schilder sollen an derselben Wand hängen.
  // txt: was dieses Schild von der Eingabe wirklich zeigt, für Probehängen und Vorlesen. Ohne Textzeile nur die Nummer, mit einer einzigen Zeile für beides
  // erst der Text, dann die Nummer (wie gezeichnet), Namensschilder ohne die Nummer. nurNr, nurTx: ein Teil der Eingabe hat auf diesem Schild keinen Platz
  // Steht die Größe nur aus „Beliebt“ fest (gWahl falsch, keine eigene aus dem Probehängen) und führt das Produkt sie nicht oder bekäme es bei ihr
  // den Hinweis kleiner Schrift, hängt es in seiner eigenen beliebtesten Größe (sm-coll-beliebt.js, p), wenn die wirklich besser ist: das Produkt hat die
  // Größe nicht, oder die Schrift wird größer (auch wenn sie dort noch unter 3 cm bleibt). Die Karte sagt das ohne eigenen Hinweis: das Maß auf der Lupe
  // trägt dann die Marke „beliebt“ (bel). Die kleine Schrift allein ist in diesem Zustand nur eine Auskunft und steht im Probehängen, nicht auf der Karte:
  // orange Hinweise auf der Karte bleiben für eine Größe, die der Besucher selbst gewählt hat, und für echte Abweichungen
  function schild(h){
    var S=bauen(h), b=+((BP[h]||{}).g)||0, T=null, R;
    if(!S||S.leer||gWahl||EIG[h]!=null) return S;
    if(b&&b!==S.W.g&&(S.W.gf||S.kl)&&((OPT[h]||{}).gn||[]).indexOf(b)>=0){ T=bauen(h,b); if(!T||T.leer||T.W.gf||(!S.W.gf&&!(T.cap>S.cap))) T=null; }
    R=T||S;
    if(T){ R.auto=true; R.bel=true; }
    // hinDlg: was das Probehängen als Satz sagt (dort trägt die Größe schon die Marke „Beliebt“)
    if(R.nurKl){ R.hinDlg=R.hin; R.hin=''; R.kurz=''; }
    else if(T&&!R.hin) R.hinDlg='';
    return R;
  }
  // Zeichen aus t, die das Feld der Rolle k nicht nimmt (Zeichenregel d.erlaubt, jedes einmal)
  function weg(d,k,t){ return Array.from(t).filter(function(c,i,l){ return SMSchild.erlaubt(d,k,c)!==c&&l.indexOf(c)===i; }); }
  function bauen(h,zw){
    var d=DES[h]; if(!d) return null;
    // Zeichenregel des Personalisierers (d.erlaubt): gezeichnet wird, was das Feld annimmt (aus 12a wird in einem Feld nur für Ziffern 12), die Karte sagt es (zei).
    // Ein einziges Textfeld nimmt auch die Nummer auf und hat dessen Regel. Die Produktseite trägt so einen Wert nicht ein und sagt dasselbe
    var W=wahl(h,zw), nr=nrIn(d)?st.n:'', hatTx=d.props.some(function(x){ return x.role!=='nr'; }), ein=SMSchild.single(d), tr=(d.sm||{}).st?'st':'txt';
    var sZ=SMSchild.erlaubt(d,tr,st.s), nZ=SMSchild.erlaubt(d,ein?tr:'nr',nr), wN=weg(d,ein?tr:'nr',nr), wS=weg(d,tr,st.s), tx=!hatTx?nZ:ein?(sZ+' '+nZ).trim():(NR?nZ+' '+sZ:sZ+' '+nZ).trim();
    var zei=wN.length?(!ein&&(d.erlaubt||{}).nr==='ziffern'?['Hausnummer hier nur aus Ziffern','Nr. nur Ziffern']:['Hausnummer hier ohne „'+wN.join(' ')+'“','Nr. ohne „'+wN.join(' ')+'“']):
      wS.length?['Text hier ohne „'+wS.join(' ')+'“','Text ohne „'+wS.join(' ')+'“']:null;
    var Q=SMSchild.zeichne(d,{text:sZ,nr:nZ,mono:mono()},W.gt||undefined), wo=W.wand!=null?W.wand:W.o===5?4:W.o, Z=Q.leer?null:SMSchild.szene(Q,wo);
    if(!Z) return {leer:true,d:d};
    var V=W.v, gr=cm(W.g)+' cm';   // geschütztes Leerzeichen: im Hinweis der Karte bricht die Zeile nie zwischen Zahl und cm
    var nenn=d.mass==='h'?Q.hoehe:Q.breite, voll=W.g>0&&nenn>=W.g*.985, b=Math.round(Q.breite), hh=Math.round(Q.hoehe), cap=(Q.letter||0)*Q.cm, mass, bt;
    // Maß: der gewählte Wert ohne „ca.“, wenn das Schild ihn ausfüllt (ab 98,5 %); sonst das sichtbare Maß mit „ca.“. Jede Gestaltung wird vor der Fertigung noch angepasst.
    // bt: die Breite, wie sie im Maß steht; die Maßlinie im Probehängen schreibt dieselbe Zahl
    bt=voll&&d.mass!=='h'&&d.mass!=='d'?cm(W.g):d.emaille?cm(Q.breite):''+b;
    if(d.emaille) mass=cm(Q.breite)+' × '+cm(Q.hoehe)+' cm';
    else if(voll&&d.mass==='d') mass='Ø '+cm(W.g)+' cm';
    else mass=(voll?'':'ca. ')+bt+' × '+(voll&&d.mass==='h'?cm(W.g):hh)+' cm';
    var hatSt=d.props.some(function(x){ return x.role==='st'; }), hoch=cap>0&&Z.box.height>Z.box.width*.5;   // hoch: Lupe LP.h
    // klein: Hinweis „Schrift unter 3 cm“ bei Schildern mit Straßenzeile, die man von der Straße aus lesen will; name: eine Namenszeile (ohne Straßenzeile),
    // die unter 1 cm hoch ist, nennt ihre echte Höhe, damit niemand eine größere Schrift erwartet, als das Schild trägt
    var stk=d.frei||d.einzeln?Q.teile||st.n.replace(/\s/g,'').length||1:1, klein=cap>0&&cap<3&&hatSt, name=!hatSt&&cap>0&&cap<1&&!!st.s, maxNr=SMSchild.maxNr(d), tl=(SMSchild.single(d)?tx:st.s).length;
    // bsp: Zeile, die statt einer Eingabe die Vorgabe des Personalisierers zeigt (Q.platzhalter). Sie wird als Beispiel benannt und nie als Text des Kunden weitergegeben
    var bsp=Q.platzhalter?d.props.filter(function(x){ return x.prop===Q.platzhalter[0]; }).map(function(x){ return x.vor; })[0]:'';
    // ohne: die Textzeile des Schilds ist leer, weil nur die Nummer eingegeben ist. Die Karte sagt das, statt eine leere Fläche unerklärt zu zeigen
    var ohne=!st.s&&hatTx, frei=!ohne&&d.offen&&d.offen.length?(/name/i.test(d.offen[0])?'Namenszeile noch frei':'Eine Zeile noch frei'):'';
    var fehlt=(Q.bad||[]).filter(function(c,i,l){ return l.indexOf(c)===i; });   // Zeichen, die die Schrift dieses Schilds nicht hat (jedes einmal)
    // Abweichung von der Wahl (Oberfläche, Größe, auch beides) in zwei Fassungen, und kurz als Zusatz zum Beispiel-Hinweis
    var ab=W.of?(W.gf?['Hier '+NAMES[W.o]+', '+gr,'Hier '+(W.o===3?'Corten':NAMES[W.o])+', '+gr]:['Nicht in '+NAMES[st.o]+', hier '+NAMES[W.o],'Hier in '+NAMES[W.o]]):
      W.gf===1?['Hier höchstens '+gr]:W.gf===2?['Nicht in '+cm(W.zg)+' cm, hier '+gr,'Hier nur '+gr]:W.gf===3?['Hier ab '+gr]:null;
    var abK=W.of?(W.o===3?'Corten':NAMES[W.o])+(W.gf?', '+gr:''):W.gf?gr:'';
    // kleine Schrift, als Zusatz zur Abweichung oder allein (zuletzt)
    var kl=klein?'Schrift unter 3\u00a0cm':name?'Name nur '+cm(cap)+'\u00a0cm hoch':'';
    // Ein Hinweis je Karte, der wichtigste zuerst: was nicht passt (Länge, fehlende Zeichen), dann eine Beispielzeile auf dem Schild (mit der Abweichung
    // von der Wahl im selben Satz, sonst stünde „GRUBER“ unerklärt da), dann die Abweichung allein, dann was noch fehlt, zuletzt die kleine Schrift.
    // Je Hinweis [ausgeschrieben, kurz]: die kurze Fassung (etwa 21 Zeichen) steht auf schmalen Karten in einer Zeile am oberen Bildrand. Fehlt sie, ist die erste kurz genug
    var hin=!SMSchild.single(d)&&st.n.length>maxNr?zuLang('Nummer',maxNr):zei?zei:W.lang?W.lang:d.maxSt&&tl>d.maxSt?zuLang('Text',d.maxSt):
      fehlt.length?['„'+fehlt.join(' ')+'“ '+(fehlt.length>1?'fehlen':'fehlt')+' in dieser Schrift','Schrift ohne „'+fehlt.join(' ')+'“']:
      bsp?['„'+bsp+'“ ist ein Beispiel'+(abK?', hier '+abK:''),'„'+bsp+'“ Beispiel'+(abK?', '+abK:'')]:
      ab?(kl?[ab[0]+', '+kl,ab[1]||ab[0]]:ab):ohne?[NR?'Name fehlt noch':'Text fehlt noch']:frei?[frei]:kl?[kl]:[];
    var ls=lpS();
    return {d:d,W:W,Q:Q,Z:Z,o:W.o,wo:wo,hoch:hoch,Ln:lupe(Z,hoch?LP.h:LP.n,cap),Ls:lupe(Z,ls,cap),lsw:ls.w,kl:!!kl,nurKl:!!kl&&hin[0]===kl,mass:mass,breite:b,bt:bt,cap:cap,klein:klein,ohne:ohne,frei:frei,stk:stk,hin:hin[0]||'',kurz:hin[1]||'',ab:ab?ab[0]:'',txt:tx,nurNr:!!st.s&&!hatTx,nurTx:!!st.n&&!nr,bsp:bsp?'„'+bsp+'“ ist ein Beispiel':'',
      preis:V?cent(V.price)*stk:0, vorher:V?cent(V.compare_at_price)*stk:0, je:V?cent(V.price):0, href:ziel(cards[h].querySelector('.pcard'),V)};
  }
  // Link einer Karte zur Produktseite, solange die Werkstatt etwas zeigt: ?schild=… sagt sm-schild-pdp.js, dass es den Text eintragen soll (auch bei Karten
  // ohne Design, dort nach den Feldnamen), dazu die Variante, wenn die Karte eine zeigt. schild trägt die Kennung dieser Seite (LID): unter ihr steht der Stand
  // in localStorage, so findet ihn auch ein neuer Tab (Mittelklick, Cmd+Klick, lange drücken und „In neuem Tab öffnen“), der kein sessionStorage bekommt.
  // Die Adresse selbst steht nicht im Link (sie ginge sonst mit jeder Seitenadresse an Statistik und Werbenetze); nur ohne localStorage reist sie dort mit
  function ziel(a,V){ return (a.dataset.smsHref||a.getAttribute('href')).split('?')[0]+'?'+(V?'variant='+V.id+'&':'')+'schild='+(llager?LID:'1'+'&strasse='+encodeURIComponent(st.s)+'&nr='+encodeURIComponent(st.n)+'&m='+(NR?'n':'s')); }
  // Preis; z: Zeile unter dem Preis auf der Karte (Größe der gezeigten Variante, Mono), sonst wie bisher die Stückzahl dahinter (Probehängen)
  function preisHtml(S,z){ return (S.vorher>S.preis?'<s>'+eur(S.vorher)+'</s> ':'')+eur(S.preis)+(z?'<small class="sms-gr">'+z+'</small>':S.stk>1?' <small class="sms-je">'+S.stk+' Zeichen</small>':''); }
  // Zeile unter dem Preis einer gezeichneten Karte: die Größe der Variante, bei einzelnen Zeichen dazu die Anzahl
  function grZeile(W,stk,je){ return (W.g?cm(W.g)+' cm':'')+(stk>1?(W.g?' · ':'')+stk+' Zeichen':je?(W.g?' · ':'')+'je Zeichen':''); }
  // Preis einer Karte ohne Zeichnung (keine Eingabe, oder diese Karte kann mit der Eingabe nichts zeigen): die Variante der gewählten Farbe und Größe,
  // nach denselben Regeln wie mit Text (wahl, nächstkleinere Größe; steht die Größe nur aus „Beliebt“ fest und fehlt sie dem Produkt, seine beliebteste).
  // Emaille wählt die Platte nach der Textlänge, dort bleibt der „ab“-Preis. Die Zeile darunter nennt Größe und, wenn sie abweicht, die Farbe
  function leerPreis(h){
    var d=DES[h], W, T, b, je;
    if(!d||!PROD[h]||d.emaille) return null;
    W=wahl(h); b=+((BP[h]||{}).g)||0;
    if(W.gf&&!gWahl&&EIG[h]==null&&b&&((OPT[h]||{}).gn||[]).indexOf(b)>=0){ T=wahl(h,b); if(!T.gf&&T.v) W=T; }
    if(!W.v) return null;
    je=!!(d.frei||d.einzeln);
    return {W:W,preis:cent(W.v.price),vorher:cent(W.v.compare_at_price),stk:1,z:grZeile(W,1,je)+(W.of?(W.g||je?' · ':'')+NAMES[W.o]:'')};
  }

  // Größen und Oberflächen der Werkstatt aus dem, was die Produkte mit Design anbieten. Größen: was mindestens ein Fünftel dieser Produkte führt,
  // höchstens acht Werte (sonst fallen die seltensten mittleren weg, kleinste und größte bleiben); seltene Größen erreicht man über die nächstkleinere.
  // Gleiche Regel baut tools/beliebt_asset.py für die Listen vor dem Laden. Fehlt die gewählte Wahl in den echten Listen: die beliebteste, sonst die erste
  // Oberfläche und die Größe, die die meisten Produkte führen (aber nicht die allerkleinste)
  function regler(){
    var zo={}, zg={}, n=0, namen={}, top=0, gd;
    Object.keys(DES).forEach(function(h){
      var O=OPT[h]=optionen(h), d=DES[h];
      if(O.fl&&!d.emaille) O.fl.forEach(function(i){ if(i>=0) zo[i]=1; });
      if(O.gn&&!d.emaille){ n++; namen[PROD[h].options[O.gi].name]=1; O.gn.forEach(function(x){ if(x>0) zg[x]=(zg[x]||0)+1; }); }
    });
    function auf(a,b){ return a-b; }
    FL=Object.keys(zo).map(Number).sort(auf);
    GR=Object.keys(zg).map(Number).filter(function(x){ return n<5||zg[x]>=n*.2; }).sort(auf);
    while(GR.length>8){ var k=1; GR.forEach(function(x,i){ if(i>0&&i<GR.length-1&&zg[x]<zg[GR[k]]) k=i; }); GR.splice(k,1); }
    GR.forEach(function(x){ top=Math.max(top,zg[x]); });
    gd=GR.filter(function(x,i){ return zg[x]===top&&(i>0||GR.length===1); })[0]||GR[0]||0;
    if(FL.indexOf(st.o)<0) st.o=FL.indexOf(POP_O)>=0?POP_O:FL.length?FL[0]:0;
    if(GR.indexOf(st.g)<0) st.g=GR.indexOf(POP_G)>=0?POP_G:gd;
    namen=Object.keys(namen); GNAME=namen.length===1?namen[0]:'Größe';
    etiketten();
  }

  // Produkte der Kollektion (Optionen, Varianten, Preise) und die Designs als Daten, ohne Zeichnen, Schriften und Fotos: genug für die Preise der Karten
  // ohne Eingabe (vorladen). Beide einmal; schlägt eine Anfrage fehl, versucht der nächste Aufruf es neu. Die Designs lädt SMSchild später selbst noch einmal
  // (dieselbe Adresse, aus dem Cache des Browsers) und ersetzt diese hier
  function produkte(){
    if(!prodP){
      prodP=fetch(((window.Shopify&&Shopify.routes&&Shopify.routes.root)||'/')+'collections/'+root.dataset.coll+'/products.json?limit=250').then(function(r){ if(!r.ok) throw new Error('products.json '+r.status); return r.json(); })
        .then(function(j){ (j.products||[]).forEach(function(p){ PROD[p.handle]=p; }); });
      prodP.catch(function(){ prodP=null; });
    }
    return prodP;
  }
  function entwuerfe(){
    if(!desP){
      desP=(window.SMSchild&&SMSchild.designs().length?Promise.resolve(SMSchild.designs()):fetch(A+'sm-ss-designs.json?v='+root.dataset.ver).then(function(r){ if(!r.ok) throw new Error('sm-ss-designs.json '+r.status); return r.json(); }).then(function(j){ return j.designs||[]; }))
        .then(function(all){ all.forEach(function(d){ if(cards[d.handle]&&!DES[d.handle]) DES[d.handle]=zeile(d); }); });
      desP.catch(function(){ desP=null; });
    }
    return desP;
  }
  function vorladen(){
    if(!vorP){ vorP=Promise.all([produkte(),entwuerfe()]).then(function(){ regler(); }); vorP.catch(function(){ vorP=null; }); }
    return vorP;
  }
  function laden(){
    if(ready) return ready;
    root.classList.add('is-load');
    var p1=new Promise(function(ok,no){ if(window.SMSchild) return ok(); var s=document.createElement('script'); s.src=root.dataset.js; s.onload=function(){ ok(); }; s.onerror=no; document.head.appendChild(s); })
      .then(function(){ return SMSchild.init({asset:A,tex:TEX,deco:{ornament:A+'sm-ss-ornament.png',katze:A+'sm-ss-katze.png'},ver:root.dataset.ver}).load(function(d){ return !!cards[d.handle]; }); })
      .then(function(all){ all.forEach(function(d){ if(cards[d.handle]) DES[d.handle]=zeile(d); }); });
    ready=Promise.all([p1,produkte()]).then(function(){
      regler();
      var l=HAUS.concat([TEX[st.o],TEX[0]]);
      Object.keys(DES).forEach(function(h){ (DES[h].layers||[]).forEach(function(L){ if(L.img&&!L.mono) l.push(A+'sm-ss-'+L.img+'.png'); }); });
      // Ausschnitt der Wand je Hausfoto (helle Wand, dunkle Wand), für alle Karten gleich: einmal als Variable am Rahmen statt als Stil an jeder Karte
      [0,2].forEach(function(o,i){ var Z=SMSchild.szene({cm:1,x0:0,x1:1,y0:0,y1:1},o); if(Z){ smc.style.setProperty('--sms-g'+i,Z.size); smc.style.setProperty('--sms-p'+i,Z.pos); } });
      return warten(l,4000);
    }).then(function(){ root.classList.remove('is-load'); },function(e){ root.classList.remove('is-load'); ready=null; throw e; });
    return ready;
  }

  function kasten(b){ return 'left:'+b.left+'%;top:'+b.top+'%;width:'+b.width+'%;height:'+b.height+'%'; }
  // Die Szene einer Karte. Je Karte stehen nur die Werte des Schilds im Stil: Ausschnitt der Lupe (--gn, --pn neben der Tür, --gs, --ps breit),
  // Breite des Schilds in der Lupe (--wn, --ws), Vergrößerung (--fn, --fs, für den Schatten in cm) und 10 cm in Prozent der Schildbreite (--z, Maßband).
  // Welche Lupe gilt, entscheidet die Klasse sms-breit an der Karte (lupenwahl); sms-ohne-n und sms-ohne-s: diese Lupe lohnt nicht (ohne), lupenwahl hält
  // beide Klassen aktuell, wenn sich die Kartenbreite ändert
  // opt: fx (Laser), i (Platz in der Reihe), gross (Probehängen: Maßlinie unter dem Schild statt Fächer), C (Breite der Bildfläche in px, sonst die der Karten)
  function szene(S,opt){
    var Z=S.Z, b=Z.box, n=S.Ln, s=S.Ls, svg=SMSchild.svg(S.Q,S.o), z=(1000*Z.cm/b.width).toFixed(2), u=b.top+b.height+.8, lt=100-3-(S.hoch?LP.h.h:LP.n.h), lr=3+LP.n.w, r=b.left+b.width, C=opt.C||KW;
    var h='<div class="sms-st sms-w'+Z.i+(S.o===2?' sms-o2':'')+(S.hoch?' sms-hoch':'')+(ohne(S,n,C)?' sms-ohne-n':'')+(ohne(S,s,C)?' sms-ohne-s':'')+(opt.fx?' sms-cut':'')+(opt.gross?' sms-gross':'')+
      '" style="--gn:'+n.size+';--pn:'+n.pos+';--gs:'+s.size+';--ps:'+s.pos+';--wn:'+n.box.width+'%;--ws:'+s.box.width+'%;--fn:'+n.f+';--fs:'+s.f+';--bw:'+S.lsw+'%;--z:'+z+'%'+(opt.fx?';--i:'+(opt.i||0):'')+'">';
    h+='<div class="sms-auf" aria-hidden="true" style="'+kasten(b)+'">'+svg+'</div>';
    if(opt.gross) h+='<i class="sms-ml" style="left:'+b.left+'%;top:'+(b.top+b.height+.6).toFixed(2)+'%;width:'+b.width+'%"><b>'+S.bt+' cm</b></i>';
    else h+='<svg class="sms-kg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="'+b.left+','+u+' '+r+','+u+' '+lr+','+lt+' 3,'+lt+'"/><path d="M'+b.left+' '+u+'L3 '+lt+'M'+r+' '+u+'L'+lr+' '+lt+'"/></svg>';
    h+='<div class="sms-lp"><i class="sms-kn"></i><div class="sms-lp-auf">'+SMSchild.svg(S.Q,S.o).replace('aria-label="Vorschau"','aria-label="Dein Schild: '+esc(S.txt).replace(/"/g,'&quot;')+'"')+'</div><i class="sms-ma'+(b.width/Z.cm<=70?' sms-halb':'')+'" title="Ein Strich je 10 cm"></i></div>';
    // Maß als Reiter auf der Lupe; hängt die Karte in der eigenen beliebtesten Größe des Produkts (schild, bel), dahinter die Marke „beliebt“ (Punkt und Wort,
    // auf schmalen Karten nur der Punkt). Hinweis: orange; ohne Hinweis einer, der nur in zwei Spalten am Handy erscheint (lupenwahl, sms-k2, grau)
    h+='<span class="sms-dim">'+LUPE_ICON+S.mass+(S.bel?'<b class="sms-dim-bel">beliebt</b>':'')+'</span>'+(S.hin?'<span class="sms-warn'+(S.neutral?' sms-neutral':'')+'"'+(S.kurz?' data-k="'+esc(S.kurz).replace(/"/g,'&quot;')+'"':'')+'><span>'+esc(S.hin)+'</span></span>':
      opt.gross?'':'<span class="sms-warn sms-neutral sms-1sp"><span>In einer Spalte lesbar</span></span>');
    return h+'</div>';
  }
  function reihenfolge(){ return [].filter.call(grid.children,function(el){ return el.classList.contains('cc')&&!el.hidden; }); }

  // Eine Karte zeichnen: Szene aus SCH[h] einsetzen oder, wenn es nichts zu zeigen gibt, wieder das Foto
  function karte(h,fx,i){
    var cc=cards[h], ph=cc.querySelector('.ph'), S=SCH[h], vor=ph&&ph.querySelector('.sms-st'), hb=cc.querySelector('.sms-hbw'), t;
    alt[h]=false; if(!ph) return;
    if(!S||S.leer){ if(vor) vor.remove(); if(hb) hb.remove(); cc.classList.remove('sms-an','sms-on','sms-os','sms-breit','sms-ecke'); return; }
    t=document.createElement('div'); t.innerHTML=szene(S,{fx:fx,i:i}); t=t.firstChild;
    if(vor) ph.replaceChild(t,vor); else ph.insertBefore(t,ph.firstChild);
    if(!hb){
      hb=document.createElement('div'); hb.className='sms-hbw';
      hb.innerHTML='<button type="button" class="sms-hb" title="An der Hauswand probehängen" aria-label="An der Hauswand probehängen">'+HAUS_ICON+'</button>';
      cc.appendChild(hb);
    }
    cc.classList.add('sms-an'); cc.classList.toggle('sms-on',ohne(S,S.Ln,KW)); cc.classList.toggle('sms-os',ohne(S,S.Ls,KW));
    // sms-ecke: die Ecke oben links wird gebraucht (oranger Hinweis auf schmalen Karten, oder ein großes Schild reicht bis unter das Abzeichen „Top 1“):
    // das Abzeichen weicht dort. Für eine graue Auskunft weicht es nie
    cc.classList.toggle('sms-ecke',(!!S.hin&&!S.neutral)||(S.Z.box.top<19&&S.Z.box.left<38));
  }
  // Welche Lupe eine Karte zeigt (Klasse sms-breit an der Karte). Auf schmalen Karten (unter CMIN, zwei Spalten auf dem Handy; Klasse sms-schmal am Raster)
  // immer die breite. Sonst die Lupe neben der Tür, damit die ganze Tür zu sehen ist; die breite nur, wenn die Schrift neben der Tür unter LMIN px bliebe
  // und die breite Lupe sie mindestens ein Fünftel größer zeigt. Jede Karte entscheidet für sich und nur nach dem, was sie gerade zeigt:
  // derselbe Text gibt immer dasselbe Bild, gleich was vorher getippt wurde, und ein langer Name verdeckt nicht auf allen Karten die Tür.
  // Dazu der Maßstab der Karte (--sms-cm = 1 cm in px) für die Schatten in cm, und ob eine Lupe bei dieser Kartenbreite überhaupt lohnt (ohne):
  // sms-on und sms-os an der Karte, sms-ohne-n und sms-ohne-s an ihrer Szene
  function lupenwahl(){
    var C=kartenbreite(), sm; if(!C) return;
    KW=C; grid.style.setProperty('--sms-cm',(C/250).toFixed(3)+'px');
    sm=C<CMIN; if(sm!==schmal){ schmal=sm; grid.classList.toggle('sms-schmal',sm); }
    Object.keys(SCH).forEach(function(h){
      var S=SCH[h], cc=cards[h], sz, w, on, os, vn, vs; if(!S||S.leer) return;
      w=S.cap*C/250; on=ohne(S,S.Ln,C); os=ohne(S,S.Ls,C); vn=w*(on?1:S.Ln.f); vs=w*(os?1:S.Ls.f);   // Schrifthöhe in px: an der Wand, neben der Tür, in der breiten Lupe
      cc.classList.toggle('sms-breit',sm||(w>0&&vn<LMIN&&vs>=vn*1.2));
      // zwei Spalten am Handy: bleibt die Textzeile auch in der Lupe unter K2 px, sagt die Karte, dass eine Spalte sie lesbar zeigt
      cc.classList.toggle('sms-k2',sm&&!!st.s&&!S.hin&&w>0&&vs<K2);
      sz=cc.querySelector('.ph>.sms-st'); if(!sz) return;
      cc.classList.toggle('sms-on',on); cc.classList.toggle('sms-os',os); sz.classList.toggle('sms-ohne-n',on); sz.classList.toggle('sms-ohne-s',os);
    });
  }

  // Preis-Regler (sm-coll.js filtert nach data-p): von den Preisen, die die Karten zeigen (Variante der gewählten Farbe und Größe, sonst der „ab“-Preis),
  // links der niedrigste Preis auf 5 € aufgerundet (ganz links bleibt so mindestens eine Karte), rechts auf 10 € aufgerundet;
  // solange keine Karte einen Variantenpreis zeigt (Produkte noch nicht geladen) die Spanne des Abschnitts (data-min0, data-max0).
  // neu: Farbe oder Größe gewechselt, der Regler geht auf „Alle Preise“. Sonst bleibt ein gesetzter Wert, in die neue Spanne geklemmt; ganz rechts bleibt ganz rechts.
  // Geändert wird nur, wenn sich etwas ändert; dann meldet der Regler input, sm-coll.js schreibt Beschriftung und Treffer neu
  function preisSpanne(neu){
    if(!maxIn) return;
    var lo=Infinity, hi=0, mn, mx, v=+maxIn.value, alle=v>=+maxIn.max;
    if(aktiv()||gepreist) Object.keys(cards).forEach(function(h){ var c=+cards[h].dataset.p||0; if(c>0){ lo=Math.min(lo,c); hi=Math.max(hi,c); } });
    if(hi>0){ mn=Math.ceil(lo/500)*5; mx=Math.max(Math.ceil(hi/1000)*10,mn+10); }
    else { mn=+maxIn.dataset.min0||10; mx=+maxIn.dataset.max0||+maxIn.max; }
    if(+maxIn.min===mn&&+maxIn.max===mx&&!(neu&&!alle)) return;
    maxIn.min=mn; maxIn.max=mx; maxIn.value=neu||alle?mx:Math.min(mx,Math.max(mn,v));
    maxIn.dispatchEvent(new Event('input',{bubbles:true}));
  }
  // sm-coll.js sortiert und filtert nach data-p, zeichnet aber nur nach seinen eigenen Bedienelementen neu. Ändert die Werkstatt Preise, während nach Preis
  // sortiert oder gefiltert wird, stößt sie das Neuzeichnen dort an (change am Sortierfeld). Beim Tippen erst nach einer Pause (ms), damit die Karten nicht springen
  function ordnen(ms){
    clearTimeout(tmrOrd);
    if(!sortSel||!(/^(asc|desc)$/.test(sortSel.value)||(maxIn&&+maxIn.value<+maxIn.max))){ ordOffen=false; return; }
    tmrOrd=setTimeout(function(){ ordOffen=false; sortSel.dispatchEvent(new Event('change',{bubbles:true})); },ms||0);
  }
  // fx: der Laser schneidet die Schilder der Reihe nach frei (beim ersten fertigen Entwurf, beim Würfeln, beim Einstieg über einen Link)
  // ms: Wartezeit, bevor nach geänderten Preisen neu sortiert und gefiltert wird (ordnen)
  // neuP: Farbe oder Größe gewechselt, der Preis-Regler geht auf „Alle Preise“ (preisSpanne)
  function malen(fx,ms,neuP){
    var an=aktiv(), R={n:0,rest:0,leer:0,klein:0,kg:{},kn:{},ohneO:0,name:0,nurNr:0,nurTx:0,fehlt:{},preise:0}, platz={}, k=0;
    reihenfolge().forEach(function(cc){ if(nah[cc.dataset.h]!==false) platz[cc.dataset.h]=k++; });
    smc.classList.toggle('sms-aktiv',an);
    KW=kartenbreite()||KW;   // einmal vor dem Zeichnen messen (auf dem Handy stellt sms-aktiv gerade erst auf eine Spalte um)
    Object.keys(cards).forEach(function(h){
      var cc=cards[h], a=cc.querySelector('.pcard'); if(!a) return;
      var pr=cc.querySelector('.price'), S, P=null, ph, pv, gx;
      if(pr&&pr.dataset.smsAlt==null) pr.dataset.smsAlt=pr.innerHTML;
      if(a.dataset.smsHref==null) a.dataset.smsHref=a.getAttribute('href');
      if(cc.dataset.smsP==null) cc.dataset.smsP=cc.dataset.p||'';
      S=SCH[h]=an?schild(h):null;
      if(!S||S.leer) P=leerPreis(h);   // ohne Zeichnung: Preis der gewählten Farbe und Größe (sobald Produkte und Designs da sind), sonst der „ab“-Preis
      // sm-coll.js sortiert und filtert nach data-p: das ist immer der Preis, den die Karte zeigt
      pv=S&&!S.leer&&S.W.v?''+S.preis:P?''+P.preis:cc.dataset.smsP;
      if(pv!==cc.dataset.smsP) R.preise++;
      if(cc.dataset.p!==pv){ cc.dataset.p=pv; ordOffen=true; }
      cc.classList.toggle('sms-foto',an&&(!S||!!S.leer));
      if(!S||S.leer){
        // Foto bleibt: als Beispielfoto beschriftet, oder mit dem, was dem Schild zum Zeichnen fehlt. Der Link trägt trotzdem schild=1,
        // damit die Produktseite den Text einträgt (Produkte ohne Design: nach den Feldnamen)
        if(an&&(ph=cc.querySelector('.ph'))) ph.dataset.smsL=!S?'Beispielfoto':!st.n&&S.d.props.some(function(x){ return x.role==='nr'; })?'Braucht eine Hausnummer':!st.s?(NR?'Braucht einen Namen':'Braucht einen Text'):'Beispielfoto';
        if(pr) pr.innerHTML=P?preisHtml(P,P.z):pr.dataset.smsAlt;
        // ohne Eingabe führt der Link zur gezeigten Variante, damit die Produktseite mit Farbe, Größe und Preis der Karte öffnet
        a.setAttribute('href',an?ziel(a,P&&P.W.v):P?a.dataset.smsHref.split('?')[0]+'?variant='+P.W.v.id:a.dataset.smsHref);
        if(an){ if(S) R.leer++; else R.rest++; }
        karte(h); return;
      }
      S.Q.bad.forEach(function(c){ R.fehlt[c]=1; });
      R.n++; if(S.W.of) R.ohneO++; if(S.ohne) R.name++; if(S.nurNr) R.nurNr++; if(S.nurTx) R.nurTx++;
      // kleine Schrift: bei welcher Größe, und welche größere das Schild anbietet (für den Rat des Mönchs)
      if(S.klein){ R.klein++; R.kg[S.W.g]=1; gx=0; ((OPT[h]||{}).gn||[]).forEach(function(x){ if(x>S.W.g&&(!gx||x<gx)) gx=x; }); if(gx) R.kn[gx]=(R.kn[gx]||0)+1; }
      if(pr) pr.innerHTML=S.W.v?preisHtml(S,grZeile(S.W,S.stk,false)):pr.dataset.smsAlt;
      a.setAttribute('href',S.href);
      if(nah[h]!==false) karte(h,fx&&!RUHIG,Math.min(platz[h]||0,14)); else alt[h]=true;   // weiter weg: erst zeichnen, wenn die Karte in die Nähe kommt
    });
    lupenwahl(); anz=R.n; gepreist=R.preise>0;
    preisSpanne(neuP);
    if(pillT) pillT.textContent=text();
    sicht();
    if(dlg&&dlg.open){ if(an&&SCH[dlgH]&&!SCH[dlgH].leer) dlgMalen(); else dlg.close(); }
    if(ordOffen) ordnen(ms);
    return R;
  }

  // Der Mönch sagt kurz, was gerade passiert. Keine Zahlen über andere Kunden, keine Zählerei der Karten: was auf einer Karte fehlt, sagt die Karte selbst.
  // Höchstens zwei kurze Zeilen (die Blase hat feste Höhe). was: tipp, fx, idee, o, g, eg (eigene Größe im Probehängen), start, leer, link
  function kommentar(was,R){
    clearTimeout(tmrSay);
    if(!aktiv()){ sagen(START,'lupe'); return; }
    var name='<b>„'+esc(text())+'“</b>', t, pose='skizze', kn=0, fehlt=st.n?(NR?'einen Namen':'einen Text'):'eine Hausnummer';
    if(!R.n){ sagen(st.n?'Damit kann ich hier noch nichts zeichnen.':'Dafür brauche ich noch Deine Hausnummer.','lupe',was==='tipp'?1000:0); return; }
    if(was==='fx'||was==='idee'||was==='link'){
      sagen(was==='idee'?'Wie wäre es mit '+name+'?':'Der Laser läuft …','laser',-1);   // vorgelesen wird erst die Zeile danach
      tmrSay=setTimeout(function(){ sagen(R.leer?'Fertig. Manche Schilder brauchen noch '+fehlt+'.':'Fertig. Jedes Schild hängt im echten Maßstab.','kaffee'); },RUHIG?0:900+Math.min(R.n,14)*70);
      return;
    }
    if(was==='o'){ t=OTXT[st.o]; pose='laser'; }
    else if(was==='g'){ t='<b>'+cm(st.g)+' cm</b>'+(MASSWORT[GNAME]||'')+'. Die Tür daneben ist 2,10 m hoch.'; pose='mass'; }
    else if(was==='eg'&&SCH[dlgH]&&!SCH[dlgH].leer){ t='Dieses Schild hängt jetzt in <b>'+cm(SCH[dlgH].W.g)+' cm</b>.'; pose='mass'; }
    else if(was==='start') { t='Da bist Du wieder. Dein Text hängt schon.'; pose='kaffee'; }
    else t=R.leer?'Manche Schilder brauchen noch '+fehlt+'.':'Ich zeichne mit. Die Lupe zeigt die Schrift.';
    // Lange Texte: ab welcher Größe die Schrift auf den meisten betroffenen Schildern 3 cm erreicht (nur ein Rat, keine Zählerei)
    Object.keys(R.kn).forEach(function(x){ if(!kn||R.kn[x]>R.kn[kn]) kn=+x; });
    if(was==='tipp'&&R.klein>1&&R.klein>=R.n/4&&kn){ t='Langer Text. '+(GR.indexOf(kn)>=0?'Ab '+cm(kn)+' cm liest man ihn besser.':'Größer liest man ihn besser.'); pose='mass'; }
    if(was==='tipp'&&st.n==='42') t='Die 42, die Antwort auf alles.';
    if(was==='tipp'&&/steelmonks/i.test(st.s)) t='Die Adresse kenne ich gut.';
    sagen(t,pose,was==='tipp'?1000:0);   // beim Tippen erst nach einer Sekunde Ruhe vorlesen
  }

  // Stand für die Produktseite: sessionStorage (dieser Tab, auch für die Rückkehr) und localStorage unter der Kennung dieser Seite (LKEY: {LID: Stand},
  // für neue Tabs, siehe ziel). In localStorage nur mit Eingabe, höchstens acht Seiten und sechs Stunden; ohne Eingabe fällt der Eintrag dieser Seite weg
  var LID=Math.random().toString(36).slice(2,10)||'x', LKEY='sm_schild_l', llager=true;
  function merkenL(o){
    try{
      var L=JSON.parse(localStorage.getItem(LKEY)||'null')||{}, jetzt=Date.now();
      if(o) L[LID]=o; else delete L[LID];
      Object.keys(L).filter(function(x){ return !(L[x]&&jetzt-(L[x].t||0)<6*3600*1000); }).forEach(function(x){ delete L[x]; });
      Object.keys(L).sort(function(a,b){ return L[b].t-L[a].t; }).slice(8).forEach(function(x){ delete L[x]; });
      if(Object.keys(L).length) localStorage.setItem(LKEY,JSON.stringify(L)); else localStorage.removeItem(LKEY);
      llager=true;
    }catch(e){ llager=false; }
  }
  function merken(){
    var o=aktiv()||gWahl?{s:st.s,n:st.n,o:st.o,g:st.g,gw:gWahl?1:0,m:NR?'n':'s',e:EIG,t:Date.now()}:null;
    try{
      if(o) sessionStorage.setItem(KEY,JSON.stringify(o));
      else sessionStorage.removeItem(KEY);
      lager=true;
    }catch(e){ lager=false; }
    merkenL(aktiv()?o:null);
  }
  function lesen(){
    var n=inN.value.replace(/[^0-9A-Za-z\/-]/g,'').slice(0,6);
    if(n!==inN.value) inN.value=n;
    st.s=inS.value.replace(/\s+/g,' ').trim().slice(0,40); st.n=n;
    (NR?inN:inS).enterKeyHint=(NR?inS:inN).value?'done':'next';   // Eingabetaste im ersten Feld: weiter zum zweiten, solange das leer ist
    clr.hidden=!inS.value; root.classList.toggle('hat-text',!!inS.value);   // im Textfeld: Kreuz, sobald dort etwas steht, sonst (Handy) der Würfel
  }
  function fehler(e){ if(window.console&&e) console.warn('Schilder-Werkstatt:',e&&e.stack||e); sagen('Die Vorschau lädt gerade nicht. Auf der Produktseite geht es.','lupe'); }
  function neu(was){
    lesen(); merken();
    clearTimeout(tmr); clearTimeout(tmrFx);
    if(!aktiv()){ fxOffen=true; EIG={}; if(!ready){ malen(false); kommentar(was,{}); leerPreise(); return; } }
    var lasern=(was==='idee'||was==='link')&&aktiv();
    if(lasern) fxOffen=false;
    tmr=setTimeout(function(){
      laden().then(function(){ return was==='o'?warten([TEX[st.o]],1500):0; }).then(function(){
        merken();   // Oberfläche und Größe stehen erst nach dem Laden fest
        kommentar(was,malen(lasern,was==='tipp'?700:0,was==='o'||was==='g'));
        if(offenNach&&aktiv()){ zeigen(offenNach); offenNach=null; }
      }).catch(fehler);
    },was==='tipp'?140:0);
    // nach einer Tipp-Pause: der erste fertige Entwurf wird gelasert (bei „Bewegung reduzieren“ ohne Laser, der Mönch erklärt trotzdem)
    if(was==='tipp'&&fxOffen&&aktiv()) tmrFx=setTimeout(function(){ if(!aktiv()) return; fxOffen=false; laden().then(function(){ kommentar('fx',malen(true)); }).catch(fehler); },850);
  }
  // Farbe und Größe ohne Eingabe: Auswahl merken, die Karten zeigen den Preis der neuen Variante (malen ohne Text, leerPreis), der Preis-Regler geht auf
  // „Alle Preise“. Der Mönch sagt kurz, was die Wahl bedeutet (gezeichnet wird erst mit Text)
  var MASSWORT={Breite:' breit',Höhe:' hoch',Durchmesser:' im Durchmesser',Länge:' lang'};
  function ohneText(was){
    merken();
    sagen(was==='o'?OTXT[st.o]+' Tipp Deinen Text, dann siehst Du es.':'<b>'+cm(st.g)+' cm</b>'+(MASSWORT[GNAME]||'')+', die Preise passen jetzt. Tipp Deinen Text.',was==='o'?'laser':'mass');
    vorladen().then(function(){ if(!aktiv()) malen(false,0,true); }).catch(function(){});
  }
  // Ohne Eingabe: Produkte und Designs holen, sobald der Browser Luft hat, dann zeigen die Karten den Preis der vorgewählten Farbe und Größe
  function leerPreise(){
    if(aktiv()) return;
    vorladen().then(function(){ if(!aktiv()) malen(false); }).catch(function(e){ if(window.console) console.warn('Schilder-Werkstatt, Preise:',e&&e.message||e); });
  }

  // ---- Auswahllisten ----
  // Knöpfe data-wahl (o Farbe, g Größe, k Kategorie, s Sortieren, f Filter) und je eine Liste .sms-pop[data-pop]. Farbe und Größe gibt es zweimal (Element und Leiste),
  // beide öffnen dieselbe Liste an ihrer Stelle. Listen und Leiste hängen am Rahmen (data-smc), nicht in der Werkstatt: dort hielte deren Stapelkontext
  // (isolation) sie unter den Karten. Mit Popover-API (popover="manual") liegen sie in der obersten Ebene, sonst fest mit hohem z-index
  var POPAPI=typeof HTMLElement!=='undefined'&&HTMLElement.prototype.hasOwnProperty('popover');
  var POPS={}, KNOEPFE=[].slice.call(root.querySelectorAll('[data-wahl]'));
  [].forEach.call(root.querySelectorAll('[data-pop]'),function(p){ POPS[p.dataset.pop]=p; smc.appendChild(p); if(POPAPI){ p.setAttribute('popover','manual'); p.hidden=false; } });
  if(leiste){ smc.appendChild(leiste); leiste.hidden=false; }
  var SORTKURZ={pop:'Beliebteste',rating:'Beste Bewertung',reviews:'Meiste Bewertungen',asc:'Preis aufsteigend',desc:'Preis absteigend','new':'Neueste'};
  var BEL_TAG='<b class="sms-bel">Beliebt</b>';
  function opt(v,inhalt,an,bel){ return '<li role="option" tabindex="-1" data-v="'+v+'" aria-selected="'+an+'">'+inhalt+(bel?BEL_TAG:'')+'</li>'; }
  // Inhalt der Listen o, g, s (k kommt fertig aus dem Abschnitt) nach dem aktuellen Stand; nur neu schreiben, wenn sich etwas geändert hat
  function fuellen(k){
    var p=POPS[k], ul=p&&p.querySelector('[data-liste]'), h='';
    if(!ul) return;
    if(k==='o') h=FL.map(function(i){ return opt(i,'<i class="tx tx-'+TX[i]+'"></i><span>'+NAMES[i]+'</span>',i===st.o,i===POP_O); }).join('');
    else if(k==='g'){
      // Größe mit einem Balken im festen Maßstab (110 cm = ganze Spur), bei Breiten dazu bei 1 m ein kleines Tür-Zeichen (eine Haustür ist etwa 1 m breit):
      // wie groß neben der Tür, auf einen Blick. Die erste Zeile sagt einmal „Türbreite“. Am Handy stehen die Größen als Kacheln (CSS, Blatt), drei je Reihe ab fünf
      var mx=Math.max(110,GR[GR.length-1]||0), tuer=GNAME==='Breite';
      h=GR.map(function(x,i){ return opt(x,'<span class="sms-gw">'+cm(x)+' cm</span><span class="sms-gb" aria-hidden="true"><i style="width:'+(x/mx*100).toFixed(1)+'%"></i>'+(tuer?'<s style="left:'+(100/mx*100).toFixed(1)+'%"></s>':'')+'</span>'+(tuer&&i===0?'<span class="sms-tb">Türbreite</span>':''),x===st.g,x===POP_G); }).join('');
      p.classList.toggle('sms-g3',GR.length>=5); p.classList.toggle('sms-tuer',tuer);
    }
    else if(k==='s') h=[].map.call(sortSel.options,function(o){ return opt(o.value,'<span>'+esc(o.textContent)+'</span>',o.value===sortSel.value,false); }).join('');
    else return;
    if(ul._h!==h){ ul._h=h; ul.innerHTML=h; }
    if(k==='g'){ var tt=p.querySelector('.sms-pop-t'), tx=GNAME+' in cm'; if(tt.textContent!==tx) tt.textContent=tx; }
  }
  // Beschriftung aller Knöpfe nach dem Stand: Farbe mit Farbpunkt, Größe in cm, „Beliebt“ neben der gewählten, wenn sie die beliebteste ist
  function etiketten(){
    KNOEPFE.forEach(function(b){
      var k=b.dataset.wahl, w=b.querySelector('[data-wert]'), bel=b.querySelector('.sms-bel'), dot=b.querySelector('[data-dot]'), sel, t;
      if(k==='o'){ w.textContent=NAMES[st.o]||''; if(dot) dot.className='tx tx-'+TX[st.o]; if(bel) bel.hidden=st.o!==POP_O; b.hidden=FL.length<2; }
      else if(k==='g'){ w.textContent=st.g?cm(st.g)+' cm':''; if(bel) bel.hidden=st.g!==POP_G; b.hidden=GR.length<2; var gn=b.querySelector('[data-gname]'); if(gn) gn.textContent=GNAME; var gs=b.querySelector('[data-gname-sr]'); if(gs) gs.textContent=GNAME+': '; }
      else if(k==='s'){ w.textContent=SORTKURZ[sortSel.value]||sortSel.options[sortSel.selectedIndex].textContent; }
      else if(k==='k'){ sel=POPS.k&&POPS.k.querySelector('[aria-selected="true"]'); if(sel){ t=sel.querySelector('span'); w.innerHTML=esc(t?t.textContent:sel.textContent)+(sel.querySelector('small')?'<small>'+esc(sel.querySelector('small').textContent)+'</small>':''); } }
      // Filter ohne Wahl: was sich filtern lässt (Preis, Sterne), grau; mit Wahl der Wert in Orange. Nicht „Alle“: das stünde direkt neben „Kategorie Alle“
      else if(k==='f'){ var f=[]; if(maxIn&&+maxIn.value<+maxIn.max) f.push('bis '+maxIn.value+' €'); if(topIn&&topIn.checked) f.push('ab 4,8 ★'); w.textContent=f.length?f.join(', '):'Preis, ★'; b.classList.toggle('is-an',f.length>0); }
    });
    ['o','g','s'].forEach(function(k){ if(offen&&offen.k===k) fuellen(k); });
  }
  // Lage der offenen Liste: am Rechner unter dem Knopf (passt sie nicht darunter: darüber), am Handy als Blatt von unten über die ganze Breite
  function lage(){
    if(!offen) return;
    var p=offen.pop, inn=p.firstElementChild, b=offen.btn.getBoundingClientRect(), vw=document.documentElement.clientWidth, vh=innerHeight, w, h, l, t;
    if(p.classList.contains('sms-blatt')){ p.style.left=p.style.top=''; return; }
    // Knöpfe in der rechten Hälfte des Elements (Kategorie, Sortieren, Filter): die Liste endet bündig mit dem Knopf, sonst beginnt sie mit ihm
    var r=root.getBoundingClientRect(), rechts=root.contains(offen.btn)&&b.left+b.width/2>r.left+r.width/2;
    w=inn.offsetWidth; h=inn.offsetHeight; l=Math.min(Math.max(8,rechts?b.right-w:b.left),vw-8-w); t=b.bottom+6;
    if(t+h>vh-8&&b.top-6-h>8) t=b.top-6-h;
    p.style.left=Math.round(l)+'px'; p.style.top=Math.round(t)+'px';
  }
  function auf(k,btn){
    var p=POPS[k], z; if(!p) return;
    if(offen&&offen.pop===p&&offen.btn===btn){ zu(true); return; }
    if(offen) zu(false);
    fuellen(k); offen={k:k,pop:p,btn:btn};
    KNOEPFE.concat(btn).forEach(function(x){ if(x.getAttribute('aria-controls')===p.id) x.setAttribute('aria-expanded',String(x===btn)); });
    p.classList.toggle('sms-blatt',HANDY.matches); p.classList.add('is-auf');
    if(POPAPI){ try{ p.showPopover(); }catch(e){} } else p.hidden=false;
    lage();
    z=p.querySelector('[role="option"][aria-selected="true"]')||p.querySelector('[role="option"]')||p.querySelector('input,button');
    if(z) z.focus({preventScroll:true});
  }
  function zu(fokus){
    if(!offen) return; var o=offen; offen=null;
    o.btn.setAttribute('aria-expanded','false');
    o.pop.classList.remove('is-auf');
    if(POPAPI){ try{ o.pop.hidePopover(); }catch(e){} } else o.pop.hidden=true;
    if(fokus) o.btn.focus({preventScroll:true});
  }
  // Wahl in einer Liste: o und g gelten für alle Karten (eigene Größen aus dem Probehängen entfallen), k bedient sm-coll.js (Klick am li data-tab,
  // läuft schon), s setzt das versteckte select und meldet change
  // Erst schließen (der Fokus geht zurück auf den Knopf), dann anwenden: etiketten() schreibt eine offene Liste neu
  function waehlen(k,li){
    var v=li.dataset.v;
    [].forEach.call(li.parentNode.children,function(x){ x.setAttribute('aria-selected',String(x===li)); });
    zu(true);
    if(k==='o'||k==='g'){ v=parseFloat(v); if(k==='g'){ EIG={}; gWahl=true; } st[k]=v; etiketten(); if(aktiv()) neu(k); else ohneText(k); }
    else if(k==='s'&&sortSel.value!==v){ sortSel.value=v; sortSel.dispatchEvent(new Event('change',{bubbles:true})); }
    etiketten();
  }
  KNOEPFE.forEach(function(b){
    b.addEventListener('click',function(){ auf(b.dataset.wahl,b); });
    b.addEventListener('keydown',function(e){ if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!(offen&&offen.btn===b)){ e.preventDefault(); auf(b.dataset.wahl,b); } });
  });
  Object.keys(POPS).forEach(function(k){
    var p=POPS[k];
    p.addEventListener('click',function(e){
      var li=e.target.closest('[role="option"]');
      if(e.target===p){ zu(true); return; }   // Blatt am Handy: Tipp auf die abgedunkelte Fläche
      if(e.target.closest('[data-pop-zu]')){ zu(true); return; }
      if(li&&p.contains(li)) waehlen(k,li);
    });
    p.addEventListener('keydown',function(e){
      var o=[].slice.call(p.querySelectorAll('[role="option"]')), i=o.indexOf(document.activeElement), n;
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); zu(true); return; }
      if(!o.length){
        // Filter: Tab bleibt im Kasten, bis er zu ist; hinter dem letzten Feld (und vor dem ersten) geht es zurück auf den Knopf
        var f=[].filter.call(p.querySelectorAll('input,button'),function(x){ return !x.disabled&&x.offsetParent; });
        if(e.key==='Tab'&&f.length&&(e.shiftKey?document.activeElement===f[0]:document.activeElement===f[f.length-1])){ e.preventDefault(); zu(true); }
        return;
      }
      if(/^(ArrowDown|ArrowUp|Home|End)$/.test(e.key)){
        e.preventDefault(); n=e.key==='Home'?0:e.key==='End'?o.length-1:Math.max(0,Math.min(o.length-1,(i<0?0:i)+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)));
        o[n].focus();
      }
      else if((e.key==='Enter'||e.key===' ')&&i>=0){ e.preventDefault(); o[i].click(); }
      else if(e.key==='Tab'){ e.preventDefault(); zu(true); }
    });
    // Fokus verlässt die Liste zu einem anderen Bedienelement (Tab, Fokus von außen): zu, ohne den Fokus zurückzuholen. Geht er an einen Vorfahren
    // (main#MainContent mit tabindex -1, body: so endet ein Tipp auf Text oder auf die abgedunkelte Fläche), bleibt sie offen: schließen tun dann
    // der Klick daneben (pointerdown unten) und der Tipp auf die Fläche (click oben), die den Fokus auf den Knopf zurückgeben
    p.addEventListener('focusout',function(e){ var r=e.relatedTarget; if(offen&&offen.pop===p&&r&&!p.contains(r)&&!r.contains(p)&&r!==offen.btn) zu(false); });
  });
  // Tipp oder Klick außerhalb schließt (am Rechner gleich beim Drücken, damit der Klick dort trotzdem wirkt; die Fläche hinter dem Blatt schließt beim Klick)
  document.addEventListener('pointerdown',function(e){
    if(!offen) return; var t=e.target;
    if(t===offen.pop||(offen.pop.contains(t))||offen.btn.contains(t)) return;
    zu(false);
  },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&offen) zu(true); });
  window.addEventListener('scroll',function(){ if(offen&&!offen.pop.classList.contains('sms-blatt')) lage(); },{passive:true});
  if(maxIn) maxIn.addEventListener('input',etiketten);
  if(topIn) topIn.addEventListener('change',etiketten);
  if(sortSel) sortSel.addEventListener('change',etiketten);

  // ---- Schlanke Leiste oben ----
  // Sichtbar, solange etwas eingegeben ist, die Liste im Bild ist und das Element ganz darüber: seine Unterkante liegt über der Unterkante der Leiste,
  // sonst säße die Leiste auf der eigenen Auswahlzeile. Sie sitzt unter dem Kopf des Shops, falls der klebt (--sms-oben, gemessen beim Scrollen),
  // sonst am oberen Rand (am Rechner schwebend 8 px darunter, CSS). Ein Tipp auf die Pille führt zur Eingabe zurück und setzt den Fokus hinein
  function leisteZeigen(){
    if(!leiste) return;
    var an=aktiv()&&!rootSicht&&listeSicht;
    smc.classList.toggle('sms-weg',!rootSicht);
    if(an===leiste.classList.contains('is-an')) return;
    leiste.classList.toggle('is-an',an);
    if(!an&&offen&&leiste.contains(offen.btn)) zu(false);
  }
  function oben(){
    var h=document.querySelector('.shopify-section-header-sticky'), w=h&&(h.querySelector('.header-wrapper')||h), b=w?Math.round(w.getBoundingClientRect().bottom):0;
    b=Math.max(0,Math.min(b,140)); if(smc.style.getPropertyValue('--sms-oben')!==b+'px') smc.style.setProperty('--sms-oben',b+'px');
  }
  function sicht(){
    obenRaf=0; if(!leiste) return;
    oben();
    var u=(parseFloat(getComputedStyle(leiste).top)||0)+(leiste.offsetHeight||56);
    rootSicht=root.getBoundingClientRect().bottom>u+2;
    leisteZeigen();
  }
  if(leiste){
    window.addEventListener('scroll',function(){ if(!obenRaf) obenRaf=requestAnimationFrame(sicht); },{passive:true});
    window.addEventListener('resize',function(){ if(!obenRaf) obenRaf=requestAnimationFrame(sicht); });
  }
  if('IntersectionObserver' in window) new IntersectionObserver(function(en){ listeSicht=en[0].isIntersecting; sicht(); }).observe(smc.querySelector('.c-list')||grid);
  if(leiste) leiste.querySelector('[data-sms-pill]').addEventListener('click',function(){
    var f=!inS.value&&!NR?inS:!inN.value?inN:NR?inN:inS;
    window.scrollTo({top:Math.max(0,scrollY+root.getBoundingClientRect().top-12),behavior:RUHIG?'auto':'smooth'});
    f.focus({preventScroll:true});
  });

  // Probehängen: ein Schild groß. „An der Tür“ ist dieselbe Szene wie auf der Karte (gleicher Maßstab, gleiche Montage), mit Maßlinie;
  // „Ganzes Haus“ zeigt das ganze Hausfoto mit dem Mönch (1,75 m) als Maßstab. Oberflächen und Größen sind hier die des einen Produkts,
  // die meistbestellte dieses Produkts trägt die Marke „Beliebt“ (sm-coll-beliebt.js, nur Produkte mit genug Bestellungen)
  function dlgBauen(){
    dlg=document.createElement('dialog'); dlg.className='sms-dlg'; dlg.setAttribute('aria-label','Probehängen an der Hauswand');
    dlg.innerHTML='<div class="sms-dlg-in"><div class="sms-dlg-stage" data-stage></div><div class="sms-dlg-side">'+
      '<button type="button" class="sms-dlg-x" data-zu aria-label="Schließen">×</button>'+
      '<p class="sms-eyebrow">Probehängen</p><h2 data-titel></h2><p class="sms-dlg-dim" data-dim></p>'+
      '<div class="sms-grp" role="group" aria-label="Oberfläche" data-sms-grp="o"></div>'+
      '<div class="sms-grp" role="group" data-sms-grp="g"></div>'+
      '<div class="sms-grp" role="group" aria-label="Ansicht"><button type="button" data-sicht="tuer">An der Tür</button><button type="button" data-sicht="ganz">Ganzes Haus</button></div>'+
      '<div class="sms-dlg-kauf"><p class="sms-dlg-preis" data-preis></p><a class="btn btn-p" data-cta href="#">Dieses Schild gestalten</a></div>'+
      '<div class="sms-dlg-nav"><button type="button" class="btn btn-g btn-s" data-nav="-1">Vorheriges</button><button type="button" class="btn btn-g btn-s" data-nav="1">Nächstes Design</button></div>'+
      '<button type="button" class="sms-dlg-link" data-teilen></button></div></div>';
    smc.appendChild(dlg);
    dlg.addEventListener('click',function(e){
      if(e.target===dlg||e.target.closest('[data-zu]')){ dlg.close(); return; }
      var s=e.target.closest('[data-sicht]'), n=e.target.closest('[data-nav]'), bt=e.target.closest('[data-teilen]'), g=e.target.closest('[data-sms-grp]'), b=e.target.closest('button'), k, v;
      if(s){ dlgGanz=s.dataset.sicht==='ganz'; dlgMalen(); }
      else if(n){
        var l=reihenfolge().map(function(c){ return c.dataset.h; }).filter(function(h){ return SCH[h]&&!SCH[h].leer; }), i=l.indexOf(dlgH);
        if(l.length){ dlgH=l[(i+parseInt(n.dataset.nav,10)+l.length)%l.length]; dlgMalen(); }
      }
      else if(bt){
        // g: die Größe, in der dieses Schild hier hängt (Emaille wählt die Platte selbst, dort die Größe der Werkstatt)
        var T=SCH[dlgH]||{}, u=location.origin+location.pathname+'?strasse='+encodeURIComponent(st.s)+'&nr='+encodeURIComponent(st.n)+'&o='+TX[st.o]+'&g='+(T.W&&T.W.g&&!T.d.emaille?T.W.g:st.g)+'&d='+encodeURIComponent(dlgH);
        (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ bt.textContent='Link kopiert'; },function(){ bt.textContent='Kopieren ging hier nicht'; });
      }
      else if(g&&b&&g.contains(b)){
        // Größe im Probehängen: nur für dieses Produkt (es bietet oft Größen, die die Werkstatt nicht hat). Die Oberfläche gilt für alle
        k=g.dataset.smsGrp; v=parseFloat(b.dataset.v);
        if(k==='g'){ EIG[dlgH]=v; neu('eg'); return; }
        st.o=v; etiketten(); neu('o');
      }
    });
  }
  // Knöpfe einer Gruppe im Probehängen: nur neu bauen, wenn es andere sind (anderes Produkt), sonst nur umschalten.
  // So bleibt der Tastatur-Fokus auf dem Knopf, der gerade gedrückt wurde
  function gruppe(g,html,wert){
    if(g._h!==html){ g._h=html; g.innerHTML=html; }
    [].forEach.call(g.children,function(b){ b.setAttribute('aria-pressed',b.dataset.v===String(wert)); });
  }
  // Die Bühne ist auf dem Handy flacher als breit (4:3, CSS), damit Titel, Auswahl und Kaufen ins Fenster passen. Die Szene bleibt ein Quadrat mit festem
  // Maßstab, so hoch wie die Bühne; was die Bühne breiter ist, zeigt mehr vom selben Hausfoto: links bis zu 20 % der Szenenbreite Wand (weiter links
  // beginnt im Foto ein Fenster), der Rest rechts neben der Tür. Dafür liegt das Hausfoto auf der Bühne (nicht auf der Szene): Ausschnitt der quadratischen
  // Szene (Z.size, Z.pos) umgerechnet auf die Bühne mit k = Breite durch Höhe. Bei k = 1 ist es derselbe Ausschnitt.
  // --sms-x: so weit sitzt die Szene vom linken Rand (Lupe und Maß rücken um so viel nach links an den Rand der Bühne), --sms-r: so weit vom rechten
  function dlgMalen(){
    var S=SCH[dlgH], O=OPT[dlgH]||{}, stage=dlg.querySelector('[data-stage]'), C=stage.clientWidth||600, go=dlg.querySelector('[data-sms-grp="o"]'), gg=dlg.querySelector('[data-sms-grp="g"]'), nm, H, k, g, p, B=BP[dlgH]||{}, bo=TX.indexOf(B.o);
    stage.className='sms-dlg-stage'+(dlgGanz?' ganz':' sms-w'+S.Z.i);
    if(dlgGanz){
      // Der Mönch steht neben dem Türblatt vor dem Glasfeld, damit die Tür frei bleibt, von der die Zeile darunter spricht: 97 cm rechts von der linken Kante
      // des Türrahmens, höchstens aber so weit, dass er noch ganz im Foto steht (mb = seine Breite in Prozent der Fotobreite)
      var W=SMSchild.wand(S.Q,S.W.g,S.wo), mb=175*W.cm*POSE.lupe/120/HW;
      stage.style.cssText='--sms-cm:'+(C/HW*W.cm/100).toFixed(3)+'px';
      stage.innerHTML='<div class="sms-dlg-haus sms-w'+W.i+(S.o===2?' sms-o2':'')+'"><div class="sms-auf" style="left:'+W.left.toFixed(2)+'%;top:'+W.top.toFixed(2)+'%;width:'+W.width.toFixed(2)+'%;height:'+W.height.toFixed(2)+'%">'+SMSchild.svg(S.Q,S.o)+'</div>'+
        '<img class="sms-dlg-monk" src="'+A+'sm-pxm_lupe.webp" alt="" style="left:'+Math.min(W.door+97*W.cm/HW,99.5-mb).toFixed(2)+'%;bottom:'+(100-W.ground).toFixed(2)+'%;height:'+(175*W.cm).toFixed(2)+'%"></div>'+
        '<p class="sms-dlg-cap"><span><b>Bruder Funke misst 1,75 m.</b> Dein Schild hängt 30 cm neben dem Türrahmen, die Mitte auf 1,75 m Höhe. Die Tür ist 2,10 m hoch.</span></p>';
    } else {
      H=Math.min(C,stage.clientHeight||C); k=C/H; var el=Math.min(k-1,.2); g=parseFloat(S.Z.size)/100; p=S.Z.pos.split(' ').map(parseFloat);
      stage.style.cssText='--sms-cm:'+(H/250).toFixed(3)+'px;--sms-x:'+(el*H).toFixed(1)+'px;--sms-r:'+((k-1-el)*H).toFixed(1)+'px;background-size:'+(g/k*100).toFixed(2)+'% auto;background-position:'+((el+(1-g)*p[0]/100)/(k-g)*100).toFixed(2)+'% '+p[1]+'%';
      // Im Probehängen steht unter dem Schild die Maßlinie; die hohe Lupe (sms-hoch) reichte bis an ihre Beschriftung. Hier gilt die flache Lupe, die Bühne ist groß genug
      if(S.hoch){ var T={}, x; for(x in S) T[x]=S[x]; T.hoch=false; T.Ln=lupe(S.Z,LP.n,S.cap); S=T; }
      stage.innerHTML=szene(S,{gross:true,C:H});
    }
    dlg.querySelector('[data-titel]').textContent=(cards[dlgH].querySelector('h3')||{}).textContent||'';
    // Hinweise der Karte als Sätze: der Beispiel-Hinweis der Karte trägt die Abweichung mit, hier steht sie als eigener Satz
    var hd=S.hinDlg!=null?S.hinDlg:S.hin;
    nm=['<b>„'+esc(S.txt)+'“</b>, '+S.mass]; if(hd&&hd.indexOf(S.bsp||'\u0000')!==0&&hd!==S.frei) nm.push(esc(hd)); else if(S.ab) nm.push(esc(S.ab)); if(S.bsp) nm.push(esc(S.bsp)+', Deinen Text für diese Zeile trägst Du auf der Produktseite ein');
    if(S.frei) nm.push(S.frei+', die trägst Du auf der Produktseite ein');
    dlg.querySelector('[data-dim]').innerHTML=nm.join('. ')+(nm.length>1?'.':'');
    dlg.querySelector('[data-preis]').innerHTML=S.W.v?preisHtml(S)+(S.stk>1?' <small class="sms-je">je '+eur(S.je)+'</small>':''):'';
    dlg.querySelector('[data-cta]').setAttribute('href',S.href);
    dlg.querySelector('[data-teilen]').textContent='Link zu diesem Schild kopieren';
    // Auswahl dieses Produkts: seine Oberflächen und seine Größen (Emaille: die Platte folgt der Textlänge, keine Wahl)
    go.hidden=!O.fl||S.d.emaille; gg.hidden=!O.gn||S.d.emaille;
    if(!go.hidden) gruppe(go,O.fl.filter(function(i){ return i>=0; }).sort(function(a,b){ return a-b; }).map(function(i){ return '<button type="button" data-v="'+i+'"><i class="tx tx-'+TX[i]+'"></i>'+NAMES[i]+(i===bo?BEL_TAG:'')+'</button>'; }).join(''),S.o);
    if(!gg.hidden){
      nm=PROD[dlgH].options[O.gi].name; gg.setAttribute('aria-label',nm);
      gruppe(gg,O.gn.map(function(x){ return '<button type="button" data-v="'+x+'">'+cm(x)+' cm'+(x===B.g?BEL_TAG:'')+'</button>'; }).join(''),S.W.g);
    }
    [].forEach.call(dlg.querySelectorAll('[data-sicht]'),function(b){ b.setAttribute('aria-pressed',(b.dataset.sicht==='ganz')===dlgGanz); });
  }
  function zeigen(h){
    if(!SCH[h]||SCH[h].leer) return;
    if(offen) zu(false);
    if(!dlg) dlgBauen();
    dlgH=h;
    if(!dlg.open){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open',''); }
    dlgMalen();
  }
  grid.addEventListener('click',function(e){ var b=e.target.closest('.sms-hb'); if(b){ e.preventDefault(); zeigen(b.closest('.cc').dataset.h); } });

  // Nur Karten in der Nähe des Bildausschnitts zeichnen; kommt eine Karte mit veraltetem Stand näher, wird sie nachgezogen
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(en){ en.forEach(function(e){ var h=e.target.dataset.h; nah[h]=e.isIntersecting; if(e.isIntersecting&&alt[h]) karte(h); }); },{rootMargin:'400px 0px'});
    Object.keys(cards).forEach(function(h){ io.observe(cards[h]); });
  }
  window.addEventListener('resize',function(){ clearTimeout(tmrGr); tmrGr=setTimeout(function(){
    if(offen){ offen.pop.classList.toggle('sms-blatt',HANDY.matches); lage(); }
    // Kartenbreite geändert: neu zeichnen (die breite Lupe hängt an der Breite, lpS), sonst nur die Lupen neu wählen
    if(aktiv()&&ready){ var c=kartenbreite(); if(c&&Math.abs(c-KW)>4) malen(false); else lupenwahl(); if(dlg&&dlg.open&&SCH[dlgH]&&!SCH[dlgH].leer) dlgMalen(); }
  },150); });

  // Zu den Karten nach der Eingabetaste: nur, wenn die erste Reihe nicht schon im oberen Teil des Fensters steht.
  // Wie weit unter den oberen Rand (Leiste), steht als scroll-margin-top am Raster (CSS)
  function zuKarten(immer){
    if(immer||grid.getBoundingClientRect().top>innerHeight*.45) grid.scrollIntoView({behavior:RUHIG?'auto':'smooth',block:'start'});
  }
  // Handy: ein Tipp ins Feld schiebt das Element an den oberen Rand. Bei offener Tastatur bleiben so Eingabe und die ersten Karten darunter im Bild
  // (ohne das lägen die Karten unter der Tastatur). Nur wenn das Element nicht schon oben steht
  function hoch(){
    if(!HANDY.matches) return;
    setTimeout(function(){ var t=root.getBoundingClientRect().top; if(Math.abs(t-8)>24) window.scrollTo({top:Math.max(0,scrollY+t-8),behavior:RUHIG?'auto':'smooth'}); },60);
  }

  [inS,inN].forEach(function(i){
    i.addEventListener('input',function(){ neu('tipp'); });
    i.addEventListener('focus',function(){ laden().catch(function(){}); },{once:true});
    i.addEventListener('focus',function(e){ if(!root.contains(e.relatedTarget)) hoch(); });
    // Eingabetaste: im ersten Feld weiter zum zweiten, solange das leer ist; sonst ist die Eingabe fertig, die Tastatur geht zu und die Seite fährt zu den Karten
    i.addEventListener('keydown',function(e){
      var zw=NR?inS:inN; if(e.key!=='Enter') return;
      e.preventDefault();
      if(i!==zw&&!zw.value){ zw.focus(); return; }
      i.blur(); if(aktiv()) zuKarten(HANDY.matches);
    });
  });
  clr.addEventListener('click',function(){ inS.value=''; inN.value=''; neu('leer'); (NR?inN:inS).focus(); });
  idee.addEventListener('click',function(){
    ideeNr=(ideeNr+1)%IDEEN.length; inS.value=IDEEN[ideeNr][0]; inN.value=IDEEN[ideeNr][1];
    idee.classList.remove('rollt'); void idee.offsetWidth; idee.classList.add('rollt');
    neu('idee');
  });
  // Handy (bis 560 px, CSS): eine Spalte mit großen Bildern (ganze Tür, lesbare Schrift), sobald die Werkstatt etwas zeigt. Das ist die Vorgabe,
  // weil in zwei Spalten bei jedem dritten Schild der Name auch in der Lupe unter 7 px bleibt. Wer zwei Spalten wählt, behält sie für die Sitzung.
  // Der Schalter ist ein Knopf (gedrückt: zwei Spalten) in der Zeile der Liste
  function spalte(v){
    v=v==='2'?'2':'1'; grid.classList.toggle('sms-eins',v==='1');
    if(spalten){ spalten.setAttribute('aria-pressed',String(v==='2')); spalten.title=v==='2'?'Eine Spalte, größere Bilder':'Zwei Spalten'; spalten.querySelector('.sr').textContent='Zwei Spalten'; }
  }
  if(spalten){ spalten.hidden=false; spalten.addEventListener('click',function(){
    var v=spalten.getAttribute('aria-pressed')==='true'?'1':'2';
    spalte(v); try{ sessionStorage.setItem(KEY+'_sp',v); }catch(e2){}
    if(aktiv()&&ready){ malen(false); if(v==='2'&&grid.querySelector('.cc.sms-k2:not([hidden])')) sagen('Kleine Schrift liest Du in einer Spalte besser.','lupe'); }
  }); }

  // Einstieg: Adresse aus dem Link (E-Mail, geteilter Link) oder die letzte Eingabe dieser Sitzung; sonst die beliebteste Farbe und Größe
  var q=new URLSearchParams(location.search), vorher=null, sp='1', link=!!(q.get('strasse')||q.get('nr')), offenNach=null;
  try{ vorher=JSON.parse(sessionStorage.getItem(KEY)||'null'); sp=sessionStorage.getItem(KEY+'_sp'); }catch(e){ lager=false; }
  spalte(sp);
  if(vorher&&Date.now()-(vorher.t||0)<6*3600*1000&&!link){
    inS.value=vorher.s||''; inN.value=vorher.n||''; if(vorher.o>=0&&vorher.o<6) st.o=vorher.o; if(vorher.g>0) st.g=vorher.g; gWahl=!!vorher.gw;
    if(vorher.e&&typeof vorher.e==='object') Object.keys(vorher.e).forEach(function(h){ if(vorher.e[h]>0) EIG[h]=+vorher.e[h]; });
  }
  if(link){ inS.value=(q.get('strasse')||'').slice(0,40); inN.value=(q.get('nr')||'').slice(0,6); offenNach=q.get('d'); }
  // o= und g= aus dem Link gewinnen immer (auch ohne Text); g gilt für die Werkstatt, wenn sie diese Größe hat (sonst nimmt regler() die beliebteste),
  // und mit d= in jedem Fall für das gezeigte Produkt
  if(TX.indexOf(q.get('o'))>=0) st.o=TX.indexOf(q.get('o'));
  if(zahl(q.get('g'))>0){ st.g=zahl(q.get('g')); gWahl=true; if(offenNach) EIG[offenNach]=st.g; }
  etiketten();
  if(inS.value||inN.value) neu(link?'link':'start');
  else (window.requestIdleCallback||function(f){ return setTimeout(f,400); })(leerPreise,{timeout:900});
})();
