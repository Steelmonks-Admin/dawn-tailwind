/* Steelmonks Schilder-Werkstatt: gemeinsame Darstellung für Kollektionsseite und Produktseite (Straßenschilder, Hausnummern, Hausschilder).
   Übernommen aus dem WesterWerk-Theme (ww-sign.js), dort für Konfigurator, Artikelseite und Warenkorb gebaut.
   Hier: Designs je Steelmonks-Produkt aus sm-ss-designs.json statt fest im Code, Dateinamen mit sm-, Oberflächen in Steelmonks-Reihenfolge.
   Daten: sm-ss-designs.json (Geometrie), sm-ssf-<schrift>.json (Umrisse; wahlweise bind und bindZeichen: Punkt und Komma an den Buchstaben davor, siehe run),
   sm-ss-*.png (Formen und Motive).
   Ablauf: init, load, dann Q=zeichne(design, {text, nr, mono}, groesse) und svg(Q, oberflaeche); szene, house und wand hängen Q maßstäblich an die Hauswand.

   Arten eines Designs. Welche Art gezeichnet wird, steht allein in den Daten, nie am Produkt-Handle:
     Foto     t, nr | st | line: {f, h, align, x0, x1}, deco: {img, x, w, h, sink, ext}      nach Produktfoto vermessen, 1 = Schildbreite, t = Stegdicke
              deco.mitte [a, b], luft, max: Verzierung aus zwei Hälften, die der Nummer weichen (siehe build; setzt deco.x 0 und w 1 voraus)
              nr.h1: Ziffernhöhe (wie nr.h) für eine Nummer aus genau einem Zeichen, ohne h1 gilt nr.h
     band     band: {f, nh, nw, mitte, pos, t, min, case}                                  zwei Balken, Name davor, große Nummer dahinter, 1000 = Schildbreite
              nh: Höhe der Nummer (Standard 640), nw: größte Breite der Nummer (800), mitte: Mitte der Nummer (520), pos: Bandmitte als Anteil der
              Nummernhöhe von oben (0.61), t: Balkendicke (15), min: Mindestlänge der Balken als Anteil der Schildbreite (0, mit 1 immer die gewählte Breite)
     z        z, layers: [{img, x, y, w, h, mono}], fields, bbox, line, decoX, keepL, clear, mono, row, nrScale, hmax, plate
              fields: [{prop, role, f, fs, x, y, w, h, align, case, cut, anc, at, zeile, zeilen, zab, sperr}]  Zepto-Leinwand, 1000 = Leinwand (Angaben in Prozent)
              plate: Hausnummernschild, alle Felder höchstens in der Zepto-Schriftgröße fs; line: Linie endet 7 mm hinter der Schrift; row: eine Zeile
              line: Felder in derselben Zeile halten Wortabstand; ein Feld auf der Linie (sit) und eines darunter (hang) sind nie dieselbe Zeile
              hmax (row): Versalhöhe höchstens hmax × Breite der Form (Standard 0.1); mono: Monogramm, Buchstabe A bis Z (Ä Ö Ü wie A O U, sonst A)
              anc: center (ganze Schrift mittig im Rahmen), versal (Größe wie center, aber die Großbuchstaben stehen mittig im Rahmen: Umlautpunkte
                   und Unterlängen verschieben die Zeile nicht), sit (steht auf at: Grundlinie = at + 3, auch ohne Balken als feste Grundlinie),
                   hang (hängt unter at), between (zwischen den Linien at[0] und at[1], siehe lay; mehrere Felder übereinander: jedes schließt seinen Abstand)
              vers: bei anc hang hängt die Zeile mit der Oberkante der Großbuchstaben an der Linie statt mit der Oberkante der Schrift: bei Umlauten
                   hängen dann alle Buchstaben an der Linie (ein Stück), die Punkte liegen in der Linie oder ragen knapp darüber
              zeilen: Textfeld mit bis zu so vielen Zeilen (im Personalisierer ein Textfeld mit maxline), zab: Abstand der Grundlinien in Versalhöhen (siehe block)
              sperr: zusätzlicher Abstand je Zeichen in Versalhöhen (gesperrte Schrift, etwa 0.2)
              layers: eine Ebene mit wahl: Feldname tauscht ihr Bild nach der Auswahl (siehe Auswahlfelder)
     band2    band2: {f, min, b, h, t}                                                     große Nummer, davor gerahmtes Band mit Namen, 1000 = Nummernhöhe
              b: Breite des Bands als Anteil der Nummernbreite (Standard 1.04), h: Höhe des Bands (240), t: Dicke des Rahmens (36)
              min: Mindestbreite des Bands als Anteil der Nummernhöhe (Standard 1), damit eine einzelne Ziffer kein Schild ergibt, das höher als breit ist
     platew   platew: {f, digit, margin, r}                                                Platte wächst mit der Nummer, 1000 = Plattenhöhe, r: Eckenradius (Standard 22, 0 = scharfe Ecken)
     linew    linew: {f, extra, min}                                                       Nummer auf Linie, 1000 = Ziffernhöhe
              min: Mindestlänge der Linie als Anteil der Ziffernhöhe (Standard 0): eine einzelne Ziffer steht dann mittig auf einer längeren Linie
     frei     frei: {f, case, abstand}                                                     frei stehende Zeichen, 1000 = Zeichenhöhe
     emaille  emaille: {masse, hb, r, rand, linie, kehle, punkt, farben, fields: [{prop, role, f, case, y, h, w, sperr}]}   farbige Platte, 1000 = Plattenbreite
              ohne Größen-Option (opt) gibt es nur die Platte aus masse: eine mitgegebene Größe zählt dann nicht
     hinten   zu jeder Art dazu: hinten: {surface, rand, r, layers}                         zweite Lage hinter dem Schild in eigener Oberfläche
   Schreibweise (case): 1 wie eingegeben, 2 Großbuchstaben (ß wird SS), 3 Kleinbuchstaben, 4 Wortanfänge groß, 5 Großbuchstaben, ß bleibt ß.
   Für jede Art: handle, props: [{role, prop, case, vor, zeile}] mit role nr, st oder txt, haupt (Feldname des Hauptfelds),
     sm (Feldnamen im Personalisierer je Rolle, wörtlich wie im Produkt, auch mit - oder _ davor: „-Hausnummer“),
     mass (b: Größe ist die Breite, h: Höhe, d: Durchmesser), opt (Name der Größen-Option), maxNr, maxSt.
     vor: Vorgabe des Personalisierers für ein Textfeld neben dem Hauptfeld, in der Werkstatt als Platzhalter gezeigt (Q.platzhalter, bei z blasser gezeichnet).
       Steht vor (von Hand) am Hauptfeld selbst, zeigt es die Vorgabe, wenn nur eine Nummer eingegeben ist. Steht vor (von Hand) am Nummernfeld
       (nur band2 und z), zeigt es die Vorgabe blass, wenn nur ein Text eingegeben ist.
     nrPflicht: 1, wenn es das Schild nur mit Hausnummer gibt: ohne eingegebene Nummer ist Q.leer wahr (die Karte behält ihr Foto).
     zeile: Nummernfeld, das eine freie zweite Zeile ist (Hausschild: „EST. 2021“), ohne Ziffernhöhe in Q.nrH.
     maxJe: {st | nr: [Zeichen je Wert der Größen-Option]}, wenn der Personalisierer je Größe ein eigenes Feld mit eigener Länge hat (Emaille); maxSt und maxNr nennen dann den größten Wert.
     einzeln: die Nummer ist im Personalisierer eine Auswahl, je Stück ein Zeichen (einzelne Ziffern). felder liefert die ganze Nummer; die Stücke, wie sie
       gezeichnet sind (Schreibweise des Produkts, ohne Leerzeichen und ohne Zeichen, die es nicht anbietet), stehen in Q.zeichen (Q.teile Stück).
     flaeche: Oberfläche des Schilds, wenn das Produkt keine Oberflächen-Option hat (Nummer wie surfaceIndex). fest: {Feldname: Wert}, Angaben, die der
       Personalisierer unverändert in die Bestellung schreibt (Emaille: Schriftart).
   Auswahlfelder: Felder des Personalisierers mit Bildauswahl, die die Zeichnung ändern. Die Seite nennt sie in eingabe.wahl = {Feldname im Produkt: gewählter Wert},
     ohne Angabe oder mit unbekanntem Wert gilt die Vorgabe. Was gilt, steht in Q.wahl; felder(d, text, nr, mono, wahl) gibt es mit in die Bestellung.
       farbe: {sm: Feldname, vor: Vorgabe, wahl: {Name: [Grund, Schrift]}}                   Farbe einer Emaille-Platte
       paare: [{name, vorn, hinten}], Feldname in sm.paar, das erste Paar ist die Vorgabe     Oberflächen der beiden Lagen (hinten). Q.vorn: Oberfläche vorn, svg(Q) nimmt sie
       wahl:  {Feldname: {vor: Vorgabe, opt: {Name: Bild}}}, an der Ebene wahl: Feldname      Motiv einer Ebene (Zunftzeichen)

   Hauswand. Eine Montageregel für alle drei Ansichten, damit Karte und Probehängen dasselbe zeigen (Maße in cm, Schild = Ausschnitt von svg(Q)):
     rechte Schildkante 30 cm links vom Türrahmen, Schildmitte 175 cm über dem Boden. Das Schild wächst nach links und gleichmäßig nach oben und unten.
     Breiter als 116 cm: links bleiben 4 cm bis zum Rand der Szene, das Schild rückt dafür zur Tür, höchstens bis auf 8 cm an den Rahmen (reicht bis 138 cm).
     Höher als 110 cm: die Oberkante bleibt 8 cm unter dem oberen Rand der Szene (230 cm über dem Boden), das Schild hängt entsprechend tiefer.
     Verkleinert wird nie, der Maßstab ist fest. Was dann nicht mehr passt (breiter als 138 cm oder höher als 230 cm), läuft links oder unten aus der Szene: klemme 2.
     Zum Einordnen: Straßenschilder gibt es bis 110 cm Breite, Hausnummern bis 50 cm Höhe, „Straße vor Nummer“ wird bei 70 cm Breite rund 60 cm hoch. Das hängt alles ohne Klemme.
   szene(Q, oberflaeche)   feste Szene der Karten: Quadrat von 250 × 250 cm, 150 cm Wand links vom Türrahmen und 100 cm Tür, 12 cm Pflaster unter der Bodenlinie und 238 cm darüber.
                           Q muss mit Größe gezeichnet sein (Q.cm), sonst null. Die Oberfläche wählt nur die Wand; bei zwei Lagen zählt
                           die hintere, äußere Platte (Q.hinten.surface), auch in house und wand. Ergebnis:
                             i       Hausfoto wie wandIndex: 0 helle Wand, 1 dunkle Wand (Edelstahl, Weiß)
                             size    background-size für einen quadratischen Kasten („172.32% auto“), pos: background-position dazu. Je Hausfoto immer gleich
                             box     {left, top, width, height}: Kasten für svg(Q) in Prozent des Quadrats, Zahlen mit zwei Nachkommastellen
                             cm      Prozent der Kastenbreite je cm (0.4). Schrifthöhe in Pixeln auf der Karte: Q.letter × Q.cm × cm / 100 × Kartenbreite
                             door    Türrahmen in Prozent von links (60), ground: Bodenlinie in Prozent von oben (95.2)
                             klemme  0 Regel ohne Abstrich, 1 zur Tür oder nach unten gerückt und ganz zu sehen, 2 passt nicht in die Szene
   lupe(Z, {w, h, fx, fy}) Lupe zur Szene Z: dieselbe Wand näher, das Schild in der Mitte. w, h: Kasten der Lupe in Prozent der Karte; fx, fy: Anteil des Kastens,
                           den das Schild höchstens füllt (Standard 0.86 und 0.72). Ergebnis: size, pos (Hintergrund des Lupenkastens),
                           box (Kasten für svg(Q) in Prozent der Lupe), f (Vergrößerung gegenüber der Wand; unter 1.2 lohnt die Lupe nicht)
   house(Q, breiteCm, oberflaeche, hausfotos, seitenverhaeltnis)   Probehängen nah: Ausschnitt bis zur Tür, wächst mit dem Schild. wand(Q, breiteCm, oberflaeche): ganzes Hausfoto. */
(function(){
  if(window.SMSchild) return;
  var W=window.SMSchild={}, G={}, ALIAS={}, ASSET='', TEX=[], DECO={}, VER='1', uid=0, ALL=null;
  var OVER=0.7;   // Linie endet 7 mm hinter der äußersten Kante der Schrift (beim W: obere Spitzen)
  var NAHT=1.02;   // Nummer zwischen zwei Linien (anc between): füllt den Abstand und greift dazu je 1 % in beide Linien
  var PAD=[4,4,4,6];   // Luft um das Schild im Bildausschnitt: links, oben, rechts, unten (Q.pad, wenn eine Art davon abweicht)
  var FLAECHE=['#1b1c1e','#3a3f44','#c6c9cb','#8b4a27','#f2f1ed','#b59b47'];   // Ersatzfarbe, falls init für eine Oberfläche keine Textur bekommt
  function J(u){ return fetch(u).then(function(r){ if(!r.ok) throw r.status; return r.json(); }); }
  function fk(k){ return ALIAS[k]||k; }
  // tex: Texturen in der Reihenfolge der Oberflächen (siehe surfaceIndex)
  W.init=function(o){ ASSET=o.asset; TEX=o.tex; DECO=o.deco||{}; if(o.ver) VER=o.ver; return W; };
  // nur: optionale Auswahl (Funktion je Design), damit die Produktseite nur ihre eigenen Schriften lädt.
  // mehr: zusätzliche Designs (Prüfseiten, Kalibrieren); ein Design mit einem schon geladenen Handle ersetzt dieses
  W.load=function(nur,mehr){
    var p=ALL?Promise.resolve():J(ASSET+'sm-ss-designs.json?v='+VER).then(function(j){ ALIAS=j.fonts||{}; ALL=j.designs; });
    return p.then(function(){
      (mehr||[]).forEach(function(d){ var i=ALL.indexOf(W.get(d.handle)); if(i<0) ALL.push(d); else ALL[i]=d; });
      var need={}; ALL.forEach(function(d){ if(nur&&!nur(d)) return; fontsOf(d).forEach(function(k){ if(!G[k]) need[k]=1; }); });
      return Promise.all(Object.keys(need).map(function(k){ return J(ASSET+'sm-ssf-'+k+'.json?v='+VER).then(function(j){ G[k]=j; }); }));
    }).then(function(){ return ALL; });
  };
  function fontsOf(d){ var o=[];
    (d.fields||[]).concat(d.emaille?d.emaille.fields:[]).forEach(function(f){ o.push(fk(f.f)); });
    ['nr','st','line','band','band2','platew','linew','frei'].forEach(function(k){ if(d[k]&&d[k].f) o.push(fk(d[k].f)); });
    return o; }
  W.designs=function(){ return ALL||[]; };
  W.get=function(h){ return (ALL||[]).filter(function(d){ return d.handle===h; })[0]||null; };
  W.ready=function(d){ return fontsOf(d).every(function(k){ return !!G[k]; }); };
  W.maxNr=function(d){ return d.maxNr||5; };
  W.single=function(d){ return !d.props.some(function(p){ return p.role==='nr'; }); };
  W.cased=cased;
  // Buchstabe des Monogramms: Masken gibt es für A bis Z. Ä, Ö, Ü werden A, O, U, Kleinbuchstaben groß, alles andere (Ziffer, leer) A
  function monoBuchstabe(m){ m=txt(m).charAt(0).toUpperCase(); m={'Ä':'A','Ö':'O','Ü':'U'}[m]||m; return /^[A-Z]$/.test(m)?m:'A'; }
  function cased(t,c){ if(c==='2') return t.toUpperCase(); if(c==='5') return t.split('ß').map(function(x){ return x.toUpperCase(); }).join('ß'); if(c==='3') return t.toLowerCase(); if(c==='4') return t.replace(/(^|[\s-])(\S)/g,function(m,a,b){return a+b.toUpperCase();}); return t; }
  // Welches Feld welchen Text bekommt: nr die Nummer, st und txt den Text. Gibt es kein Nummernfeld, steht beides zusammen im Textfeld.
  // Mehrere Textfelder: die Eingabe steht im Hauptfeld (d.haupt, sonst das mit der größten Schrift). Für die anderen gibt es in der Werkstatt
  // keine Eingabe: sie zeigen ihre Vorgabe aus dem Personalisierer (p.vor) als Platzhalter, sobald etwas eingegeben ist, statt einer leeren Zeile.
  // ph: Liste, in die die Feldnamen der Platzhalter kommen. Platzhalter sind keine Eingabe: felder gibt sie nicht weiter.
  // Trägt das Hauptfeld selbst eine Vorgabe (p.vor, nur von Hand in der Design-Datei), zeigt es sie als Platzhalter, wenn nur eine Nummer eingegeben ist
  // (Stolze Nummer auf Namen: 7 über NEUMANN statt einer leeren Zeile zwischen den Linien). Ohne vor am Hauptfeld bleibt alles, wie es war.
  // Trägt das Nummernfeld eine Vorgabe (p.vor, von Hand, nur band2 und z zeichnen sie), zeigt es sie blass, wenn nur ein Text eingegeben ist
  // (Name vor der Nummer: Jäger vor einer blassen 22 statt eines Bands ohne Nummer, das es nicht zu kaufen gibt).
  function werte(d,text,nr,ph){
    var v={}, tf=d.props.filter(function(p){ return p.role!=='nr'; }), one=tf.length===d.props.length, h=d.haupt, fs=-1;
    if(!h&&tf.length>1) (d.fields||[]).forEach(function(f){ if(f.role!=='nr'&&f.fs>fs){ fs=f.fs; h=f.prop; } });
    if(!h&&tf.length) h=tf[0].prop;
    d.props.forEach(function(p){
      v[p.prop]=p.role==='nr'?nr:p.prop===h?(one?(text+(nr?' '+nr:'')).trim():text):'';
      if(p.role!=='nr'&&p.vor&&(p.prop!==h?text||nr:!one&&!text&&nr)){ v[p.prop]=p.vor; if(ph) ph.push(p.prop); }
      else if(p.role==='nr'&&p.vor&&(d.band2||d.z)&&tf.length&&text&&!nr){ v[p.prop]=p.vor; if(ph) ph.push(p.prop); }
    });
    return v;
  }
  // Nummer und Text aus den Werten je Feld (jeweils das erste gefüllte Feld)
  function nach(d,vals){
    var o={nr:'',tx:''};
    d.props.forEach(function(p){ var v=txt(vals[p.prop]).trim(); if(!v) return; if(p.role==='nr'){ if(!o.nr) o.nr=v; } else if(!o.tx) o.tx=v; });
    return o;
  }
  // Werte je Feld des Steelmonks-Personalisierers (Feldname wie im Produkt, Schreibweise wie auf dem Schild). Platzhalter und leere Felder kommen nicht vor.
  // Ein Feld mit mehreren Zeilen (zeilen) bekommt den Text mit dem Zeilenumbruch der Zeichnung. wahl (wie eingabe.wahl, {} für die Vorgaben): dann kommen
  // auch die Auswahlfelder (Farbe, Material, Zunftzeichen) und die festen Angaben des Designs (fest) dazu. Ohne wahl bleibt die Ausgabe, wie sie war
  W.felder=function(d,street,nr,mono,wahl){
    var o={}, sm=d.sm||{}, ph=[], v=werte(d,txt(street).trim(),txt(nr).trim(),ph), A, k;   // Leerzeichen am Rand zählen nicht, wie in zeichne
    d.props.forEach(function(p){ var x=v[p.prop], name=sm[p.role]; if(x&&name&&ph.indexOf(p.prop)<0) o[name]=umbruch(d,p,cased(x,p.case)); });
    if(d.mono&&sm.mono) o[sm.mono]=monoBuchstabe(mono);   // der Buchstabe, der gezeichnet wird
    if(wahl){ A=auswahl(d,wahl).f; for(k in A) o[k]=A[k]; for(k in d.fest||{}) o[k]=d.fest[k]; }
    return o;
  };
  // Auswahlfelder (Beschreibung im Dateikopf). w: {Feldname: gewählter Wert}. Ergebnis: f = {Feldname: was gilt}, farben (Emaille), paar (zwei Lagen),
  // bild = {Feldname: Bild der Ebene}. Bilder kommen nur aus den Daten des Designs, nie aus der Eingabe
  function hat(o,k){ return k!=null&&Object.prototype.hasOwnProperty.call(o||{},k); }
  function auswahl(d,w){
    var o={f:{},bild:{}}, F=d.farbe, P=d.paare, n, k;
    w=w||{};
    if(F&&F.wahl){ n=hat(F.wahl,w[F.sm])?w[F.sm]:F.vor; o.farben=F.wahl[n]; if(F.sm) o.f[F.sm]=n; }
    if(P&&P.length){ k=d.sm&&d.sm.paar; o.paar=P.filter(function(x){ return k&&x.name===w[k]; })[0]||P[0]; if(k) o.f[k]=o.paar.name; }
    for(k in d.wahl||{}){ n=hat(d.wahl[k].opt,w[k])?w[k]:d.wahl[k].vor; if(hat(d.wahl[k].opt,n)){ o.bild[k]=d.wahl[k].opt[n]; o.f[k]=n; } }
    return o;
  }
  // Text eines mehrzeiligen Felds so, wie er gezeichnet wird: Zeilen mit Zeilenumbruch getrennt (so steht er im Textfeld des Personalisierers)
  function umbruch(d,p,t){
    var f=(d.z&&!d.line&&d.fields||[]).filter(function(x){ return x.prop===p.prop&&x.zeilen>1; })[0], r;
    if(!f||!G[fk(f.f)]) return t;
    r=rahmen(d,f); return block(f,t,r[1]-r[0],f.h*10,r[2]).zeilen.join('\n');
  }
  // sp: zusätzlicher Abstand je Zeichen in Schrifteinheiten (gesperrte Schrift)
  // Schrift mit Tabelle bind (Unterschneidung für Punkt und Komma, etwa marionhangpunkt): steht ein Zeichen aus F.bindZeichen (Standard „.,“) hinter einem
  // Zeichen der Tabelle, rückt es um bind[davor] Einheiten nach links (negativ: nach rechts), so dass es den Buchstaben davor berührt (ST., PROF., FAM.).
  // Der Text danach rückt mit und behält den Abstand der Schrift. Schriften ohne bind zeichnen wie bisher.
  function run(font,txt,sp){
    var F=G[fk(font)], pen=0, items=[], x0=Infinity, x1=-Infinity, y0=0, yb=0, bad=[], it=-Infinity, ib=Infinity, un=[], bz=F.bind?F.bindZeichen||'.,':'';
    for(var i=0;i<txt.length;i++){ var c=txt[i], g=F.chars[c];
      if(bz&&i&&bz.indexOf(c)>=0&&F.bind[txt[i-1]]!=null) pen-=F.bind[txt[i-1]];
      if(!g){ if(c.trim()) bad.push(c); g=F.chars[' ']; if(!g){ pen+=300; continue; } }
      if(g.d){ items.push({d:g.d,x:pen}); x0=Math.min(x0,pen+g.x0); x1=Math.max(x1,pen+g.x1); y0=Math.min(y0,-g.y1); yb=Math.max(yb,-g.y0);
        if(/[0-9A-Z]/.test(c)){ it=Math.max(it,-g.y1); ib=Math.min(ib,-g.y0); }
        if(g.y0<-100) un.push(c); }
      pen+=g.a+(sp||0); }
    // it, ib: Ober- und Unterkante, die jede Ziffer und jeder Großbuchstabe des Texts erreicht (ohne Überhänge einzelner Zeichen)
    // un: Zeichen, die mehr als 100 Einheiten (10 % der Versalhöhe) unter die Grundlinie reichen (g j p q y, Klammern, Schrägstrich, je nach Schrift)
    return {items:items,x0:items.length?x0:0,x1:items.length?x1:0,w:items.length?x1-x0:0,top:y0,bot:yb,it:it>-Infinity?it:y0,ib:it>-Infinity?ib:yb,bad:bad,F:F,un:un};
  }
  function place(spec,txt,ref){
    var R=run(spec.f,txt); if(!R.w) return null;
    var refH=ref==='digit'?R.F.digitH:1000, avail=spec.x1-spec.x0;
    var k=Math.min(spec.h/refH, avail/R.w), w=R.w*k;
    var left=spec.align==='left'?spec.x0:spec.align==='right'?spec.x1-w:(spec.x0+spec.x1)/2-w/2;
    return {R:R,k:k,tx:left-R.x0*k,h:refH*k,w:w,left:left,top:R.top*k,bad:R.bad};
  }
  function glyphs(R,k,tx,ty){
    var s='<g transform="translate('+tx+' '+ty+') scale('+k+')">';
    R.items.forEach(function(it){ s+='<path transform="translate('+it.x+' '+(it.y||0)+')" d="'+it.d+'"/>'; });
    return s+'</g>';
  }
  // Textfeld mit mehreren Zeilen (f.zeilen, im Personalisierer ein Textfeld mit maxline): alle Zeilen gleich groß und mittig untereinander,
  // Grundlinien im Abstand f.zab × Versalhöhe (Standard 1.5). Geteilt wird am Zeilenumbruch der Eingabe. Ohne Umbruch und bei mehreren Wörtern
  // in zwei Zeilen am Leerzeichen, das die längere Zeile am kürzesten macht, aber nur, wenn die Schrift damit größer wird als in einer Zeile
  // (bw, bh: Rahmen des Felds, kmax: Obergrenze aus fs). Ergebnis wie run, dazu zeilen (die Texte) und je Zeichen der Zeilenversatz y.
  function block(f,t,bw,bh,kmax){
    var Z=t.split(/\s*[\r\n]+\s*/).filter(function(x){ return x; }), ab=(f.zab||1.5)*1000, n=f.zeilen, A, B, C, V, i;
    function setze(L){
      var R=L.map(function(x){ return run(f.f,x,(f.sperr||0)*1000); }), w=0, o={items:[],x0:0,bad:[],F:R[0].F,zeilen:L};
      R.forEach(function(r){ w=Math.max(w,r.w); o.bad=o.bad.concat(r.bad); });
      R.forEach(function(r,j){ r.items.forEach(function(it){ o.items.push({d:it.d,x:it.x+(w-r.w)/2-r.x0,y:j*ab}); }); });
      o.x1=o.w=w; o.top=R[0].top; o.bot=(R.length-1)*ab+R[R.length-1].bot; o.it=o.top; o.ib=o.bot;
      o.k=w?Math.min(bw/w,bh/(o.bot-o.top),kmax):0; return o;
    }
    if(Z.length>n) Z=Z.slice(0,n-1).concat(Z.slice(n-1).join(' '));
    if(!Z.length) Z=[''];
    A=setze(Z); V=Z.length===1?Z[0].split(/\s+/):[];
    for(i=1;i<V.length;i++){ C=setze([V.slice(0,i).join(' '),V.slice(i).join(' ')]); if(!B||C.k>B.k||(C.k===B.k&&C.w<B.w)) B=C; }
    return B&&B.k>A.k*1.001?B:A;
  }
  // Rahmen eines Felds und Obergrenze der Schrift, wie buildZ sie für Designs ohne Linie setzt
  function rahmen(d,f){ var a=Math.max((f.x-f.w/2)*10,d.bbox[0]*10), b=Math.min((f.x+f.w/2)*10,d.bbox[2]*10); return [a,b,f.role==='nr'||d.plate?f.fs*1000/540/G[fk(f.f)].em:Infinity]; }
  function bild(L,img){ return '<image href="'+ASSET+'sm-ss-'+(img||L.img)+'.png" x="'+L.x*10+'" y="'+L.y*10+'" width="'+L.w*10+'" height="'+L.h*10+'" preserveAspectRatio="none"/>'; }
  function cp(o){ var c={}; for(var k in o) c[k]=o[k]; return c; }
  function txt(t){ return t==null?'':''+t; }   // Eingaben dürfen fehlen oder Zahlen sein
  function build(d,street,nr,wcm){
    var parts=[], bad=[], L={}, up=function(t){return t.toUpperCase();}, mm=OVER/(wcm||50);
    var dl=d.line&&cp(d.line), ds=d.st&&cp(d.st), dn=d.nr&&cp(d.nr);
    if(dl){ dl.x0=mm; dl.x1=1-mm; } if(ds){ ds.x0=mm; ds.x1=1-mm; }
    if(dn){ if(dn.align==='right') dn.x1=1-mm; else if(dn.align==='left') dn.x0=mm; }
    if(dl){
      var p=place(dl,up(street+(nr?' '+nr:'')),'cap'); if(p){ p.y=d.t*.15; parts.push(p); bad=bad.concat(p.bad); L.letter=p.h; L.top=p.y+p.top; }
      L.bottom=d.t;
    } else {
      // nr.h1: Ziffernhöhe für eine Nummer aus genau einem Zeichen (Shopbild „7 AM SEEE“: eine Ziffer steht größer als zwei bis vier)
      // Die Nummer steht auf der Linie: Zeichen mit Unterlänge reichen durch die Linie in den Namen (L.unter, Q.unter)
      if(nr){ if(dn.h1&&nr.length===1) dn.h=dn.h1; var pn=place(dn,nr,'digit'); if(pn){ pn.y=d.t*.2; pn.nrTeil=1; parts.push(pn); bad=bad.concat(pn.bad); L.top=pn.y+pn.top; L.unter=pn.R.un; } }
      if(street){ var ps=place(ds,up(street),'cap'); if(ps){ ps.y=d.t-d.t*.2+ps.h; parts.push(ps); bad=bad.concat(ps.bad); L.letter=ps.h; L.bottom=ps.y+ps.h*0.03;
        L.top=Math.min(L.top==null?0:L.top,ps.y+ps.top); } }   // Akzente und Punkte über der Linie gehören in den Ausschnitt (ohne Nummer wurden sie oben abgeschnitten)
      if(L.bottom==null) L.bottom=d.t;
    }
    // deco.mitte [a, b]: innere Enden der beiden Hälften der Verzierung im Bild (Anteil der Schildbreite). Dann weicht die Verzierung der Nummer:
    // jede Hälfte wird um ihr äußeres Ende auf der Linie gleichmäßig skaliert, bis sie luft (deco.luft, Standard 0.012) vor der Nummer endet.
    // Lange Nummern bekommen kleinere Verzierungen, eine einzelne Ziffer größere (höchstens deco.max, Standard 1.15), die Nummer behält ihre Höhe.
    var vz=null, pz=parts.filter(function(p){ return p.nrTeil; })[0];
    if(d.deco&&d.deco.mitte&&pz){ var lu=d.deco.luft==null?.012:d.deco.luft, mx=d.deco.max||1.15, n0=pz.left-lu, n1=pz.left+pz.w+lu;
      vz=[n0,n1,Math.min(mx,n0/d.deco.mitte[0]),Math.min(mx,(1-n1)/(1-d.deco.mitte[1]))]; }
    if(d.deco){ var dt=(-d.deco.h+d.deco.sink)*(vz?Math.max(vz[2],vz[3]):1); L.top=Math.min(L.top==null?0:L.top,dt); }
    if(L.top==null) L.top=0;
    L.top-=.004; L.bottom+=.006;
    // Linie: 7 mm über die äußerste Schriftkante hinaus; Motive (Katze, Ornamente) stehen immer auf der Linie
    var bl=1, br=0; parts.forEach(function(p){ bl=Math.min(bl,p.left-mm); br=Math.max(br,p.left+p.w+mm); });
    if(!parts.length){ bl=0; br=1; }
    if(d.deco&&d.deco.ext){ bl=Math.min(bl,d.deco.ext[0]); br=Math.max(br,d.deco.ext[1]); }
    bl=Math.max(0,bl); br=Math.min(1,br);
    var S=1000, cid='smsc'+(++uid), m='', bildD=d.deco?'<image href="'+DECO[d.deco.img]+'" x="'+(d.deco.x*S)+'" y="'+((-d.deco.h+d.deco.sink)*S)+'" width="'+(d.deco.w*S)+'" height="'+(d.deco.h*S)+'" preserveAspectRatio="none"/>':'';
    function halb(id,x0,x1,tr){ return x1>x0?'<clipPath id="'+id+'"><rect x="'+x0*S+'" y="-1000" width="'+(x1-x0)*S+'" height="2000"/></clipPath><g clip-path="url(#'+id+')">'+(tr?'<g transform="'+tr+'">'+bildD+'</g>':bildD)+'</g>':''; }
    if(vz) m+=halb(cid,bl,vz[0],'scale('+vz[2]+')')+halb(cid+'b',vz[1],br,'translate('+S+' 0) scale('+vz[3]+') translate(-'+S+' 0)');
    else if(d.deco) m+=halb(cid,bl,br,'');
    m+='<rect x="'+bl*S+'" y="0" width="'+(br-bl)*S+'" height="'+(d.t*S)+'"/>';   // Linie nach dem Bild: es deckt sonst ihre oberen Einheiten ab
    parts.forEach(function(p){ m+=glyphs(p.R,p.k*S,p.tx*S,p.y*S); });
    var o={white:m,black:'',x0:bl*S-4,x1:br*S+4,y0:L.top*S,y1:L.bottom*S,phys:S,barW:(br-bl)*S,letter:(L.letter||0)*S,bad:bad};
    if(L.unter&&L.unter.length) o.unter=L.unter;
    return o;
  }
  // ph: Feldnamen der Platzhalter (werte). Sie werden blasser gezeichnet und zählen für Q.letter nur, wenn kein eingegebenes Textfeld Text hat
  function buildZ(d,vals,mono,wcm,wb,ph){
    var white='', black='', bad=[], bb=d.bbox, x0=bb[0]*10, y0=bb[1]*10, x1=bb[2]*10, y1=bb[3]*10, letter=0, lph=0, nrH=0, solid=[], cut=[], clear='', unter=[];
    var B0=bb[0]*10, B1=bb[2]*10, mU=d.line?OVER/(wcm||50)*(B1-B0):0, tx0=Infinity, tx1=-Infinity;   // Linien-Schilder: 7 mm Überstand
    d.layers.forEach(function(L){ var img=L.mono?'mono-'+monoBuchstabe(mono):L.wahl&&wb&&wb[L.wahl]||L.img;   // wb: Bilder der Auswahlfelder
      white+='<image href="'+ASSET+'sm-ss-'+img+'.png" x="'+L.x*10+'" y="'+L.y*10+'" width="'+L.w*10+'" height="'+L.h*10+'" preserveAspectRatio="none"/>'; });
    // Felder setzen; Linien-Schilder: äußere Felder bis 7 mm vor das Linienende, Felder in derselben Zeile mit Abstand
    function lay(f,bx0,bx1){
      var raw=txt(vals[f.prop]).trim(); if(!raw) return null;
      var R=f.zeilen>1?block(f,cased(raw,f.case),bx1-bx0,f.h*10,rahmen(d,f)[2]):run(f.f,cased(raw,f.case),(f.sperr||0)*1000); if(!R.w) return {bad:R.bad};
      var bw=bx1-bx0, bh=f.h*10, ih=R.bot-R.top, k=Math.min(bw/R.w, bh/ih);
      if(f.anc==='between'){
        // Nummer zwischen zwei Linien der Form (verzierte Hausnummer, Rahmen): jede Ziffer reicht von Linie zu Linie und greift oben und unten
        // um 1 % des Abstands hinein, damit alles ein Stück bleibt. Die Zeile wird höchstens so breit wie Feld und Form und steht mittig
        // zur Form. Passt sie nur schmaler, rücken die Linien zusammen (zu), statt dass die Nummer frei dazwischen hängt.
        // Textfeld zwischen zwei Linien (Name bei „Stolze Nummer“): genauso, gemessen wird aber bis zur Oberkante von Umlautpunkten und Akzenten,
        // damit sie unter der oberen Linie zu sehen sind und nicht in ihr verschwinden („MÜLLER“ wird dann etwas kleiner als „MULLER“).
        // Als Punkt oder Akzent gilt, was mehr als 5 % über die Großbuchstaben ragt (runde Buchstaben ragen nur gut 1 % über).
        var ab=f.at[1]-f.at[0], it=f.role!=='nr'&&R.top<R.it*1.05?R.top:R.it, hz=R.ib-it, kb, wb; bw=Math.min(bw,B1-B0); kb=Math.min(bw/R.w,ab*NAHT/hz); wb=R.w*kb;
        return {f:f,R:R,k:kb,w:wb,left:(B0+B1)/2-wb/2,ty:(f.at[0]+f.at[1])/2-(it+R.ib)/2*kb,bad:R.bad,zu:Math.max(0,ab-hz*kb/NAHT),mitte:(f.at[0]+f.at[1])/2};
      }
      if(f.role==='nr'||d.plate) k=Math.min(k,f.fs*1000/540/R.F.em);   // Zepto: fs in pt auf 720er-Leinwand (Hausnummernschilder: alle Felder)
      var w=R.w*k, left=f.align==='left'?bx0:f.align==='right'?bx1-w:(bx0+bx1)/2-w/2, ty;
      if(f.anc==='sit') ty=f.at+3;
      else if(f.anc==='hang') ty=f.at-3-(f.vers?R.it:R.top)*k;
      else if(f.anc==='versal') ty=f.y*10+bh/2-(R.it+R.ib)/2*k;   // Größe wie center (ganze Schrift passt in den Rahmen), gesetzt nach den Großbuchstaben
      else ty=f.y*10+bh/2-(R.top+R.bot)/2*k;
      return {f:f,R:R,k:k,w:w,left:left,ty:ty,bad:R.bad};
    }
    var P=d.fields.map(function(f){
      var bx0=(f.x-f.w/2)*10, bx1=(f.x+f.w/2)*10;
      if(d.line){ if(bx0-B0<60&&!d.keepL) bx0=B0+mU; if(B1-bx1<60) bx1=B1-mU; }
      else { bx0=Math.max(bx0,B0); bx1=Math.min(bx1,B1); }   // kein Feld ragt seitlich über die Form hinaus (die gewählte Breite ist die der Form)
      return {f:f,bx0:bx0,bx1:bx1,o:lay(f,bx0,bx1)};
    });
    // Ein Feld, das auf der Linie steht (sit), und eines, das darunter hängt (hang, at nicht über dem sit-Feld), liegen auf verschiedenen Seiten der Linie
    // und sind nie eine Zeile: eine Unterlänge der Nummer (12g, (12), 12/1) läuft durch die Linie, wie der Personalisierer sie zeichnet, statt den Namen zu stauchen
    function seiten(a,b){ return a.f.anc==='sit'&&b.f.anc==='hang'&&b.f.at>=a.f.at; }
    if(d.line) P.forEach(function(a){ P.forEach(function(b){
      if(a===b||!a.o||!b.o||!a.o.R||!b.o.R||a.o.left>=b.o.left||a.f.anc==='between'||b.f.anc==='between') return;   // zwischen zwei Linien steht ein Feld allein
      if(seiten(a,b)||seiten(b,a)) return;
      var ay0=a.o.ty+(a.f.vers?a.o.R.it:a.o.R.top)*a.o.k, ay1=a.o.ty+a.o.R.bot*a.o.k, by0=b.o.ty+(b.f.vers?b.o.R.it:b.o.R.top)*b.o.k, by1=b.o.ty+b.o.R.bot*b.o.k;
      if(Math.min(ay1,by1)-Math.max(ay0,by0)<=0) return;   // nicht in derselben Zeile
      var gap=0.6*Math.min(ay1-ay0,by1-by0);   // Wortabstand wie auf dem Produktfoto
      if(a.o.left+a.o.w>b.o.left-gap){ a.bx1=Math.min(a.bx1,b.o.left-gap); a.o=lay(a.f,a.bx0,a.bx1); }
    }); });
    // between: die beiden Linien eines Felds rücken um sein zu zusammen, die Höhe des Schilds sinkt um die Summe (zu). Die Form wird an jeder Zeilenmitte
    // geteilt, die Stücke rücken von oben und unten zusammen. Mehrere Felder übereinander (Doppelnamen: zwei Namen zwischen drei Linien): jede Zeile schließt
    // ihren eigenen Abstand, o.dy ist der Versatz der Zeile, ruck(y) der Versatz eines Punkts der Form. Bei einem Feld: obere Hälfte nach unten, untere nach oben
    var ZW=P.filter(function(p){ return p.o&&p.o.zu!=null; }).sort(function(a,b){ return a.o.mitte-b.o.mitte; }), zu=0;
    ZW.forEach(function(p){ zu+=p.o.zu; });
    function ruck(y){ var s=zu/2; ZW.forEach(function(p){ if(p.o.mitte<=y) s-=p.o.zu; }); return s; }
    if(zu){
      var form=white, cl='', gs='', ya=-5000, sv=zu/2, acc=0;
      ZW.forEach(function(p){ p.o.dy=zu/2-acc-p.o.zu/2; acc+=p.o.zu; });
      ZW.concat([null]).forEach(function(p){
        var c=p?p.o.mitte+p.o.dy:0, id='smsc'+(++uid);
        cl+='<clipPath id="'+id+'"><rect x="-5000" y="'+ya+'" width="10000" height="'+(p?c-ya:5000)+'"/></clipPath>';
        gs+='<g clip-path="url(#'+id+')"><g transform="translate(0 '+sv+')">'+form+'</g></g>';
        ya=c; if(p) sv-=p.o.zu;
      });
      white=cl+gs; y0+=zu/2; y1-=zu/2;
    }
    var Y0=y0, Y1=y1;
    P.forEach(function(p){
      var o=p.o; if(!o) return; bad=bad.concat(o.bad); if(!o.R) return;
      var f=o.f, R=o.R, k=o.k, w=o.w, left=o.left, ty=o.ty, zw=f.anc==='between', g;
      if(zu) ty+=zw?o.dy:ruck(ty);
      g=glyphs(R,k,left-R.x0*k,ty);
      if(zw){ var cz='smsc'+(++uid); g='<clipPath id="'+cz+'"><rect x="-5000" y="'+Y0+'" width="10000" height="'+(Y1-Y0)+'"/></clipPath><g clip-path="url(#'+cz+')">'+g+'</g>'; }   // Überhänge enden an der Außenkante der Form
      var pz=ph&&ph.indexOf(f.prop)>=0;
      if(pz) g='<g opacity=".4">'+g+'</g>';   // Platzhalter (Vorgabe statt Eingabe): blasser, damit er nicht wie der eigene Text aussieht
      (f.cut?cut:solid).push({role:f.role,g:g});
      if(f.role!=='nr'){ if(pz) lph=Math.max(lph,1000*k); else letter=Math.max(letter,1000*k); } else if(!f.zeile) nrH=Math.max(nrH,R.F.digitH*k);
      if(f.role==='nr'&&f.anc==='sit'&&!pz&&R.un) unter=unter.concat(R.un);   // Nummer steht auf einem Balken: Unterlängen verschwinden darin oder laufen hindurch
      x0=Math.min(x0,left); x1=Math.max(x1,left+w); if(!zw){ y0=Math.min(y0,ty+R.top*k); y1=Math.max(y1,ty+R.bot*k); }
      tx0=Math.min(tx0,left); tx1=Math.max(tx1,left+w);
    });
    if(d.line&&tx1>tx0){
      var bl=tx0-mU, br=tx1+mU; if(d.decoX){ bl=Math.min(bl,d.decoX[0]); br=Math.max(br,d.decoX[1]); }
      bl=Math.max(B0,bl); br=Math.min(B1,br);
      var cid='smsc'+(++uid);
      white='<clipPath id="'+cid+'"><rect x="'+bl+'" y="0" width="'+(br-bl)+'" height="1000"/></clipPath><g clip-path="url(#'+cid+')">'+white+'</g>';
      x0=Math.min(bl,tx0); x1=Math.max(br,tx1);
    }
    if(d.clear) clear='<rect x="'+(x0-50)+'" y="'+d.clear[0]+'" width="'+(x1-x0+100)+'" height="'+(d.clear[1]-d.clear[0])+'" fill="#000"/>';
    solid.forEach(function(p){ if(p.role==='nr') white+=p.g; });
    var after=''; solid.forEach(function(p){ if(p.role!=='nr') after+=p.g; });
    cut.forEach(function(p){ black+=p.g; });
    if(!letter) letter=lph;   // Q.letter nennt die Zeile des Kunden, die Zeile des Platzhalters nur, wenn es sonst keine gibt
    var o={white:white+'</g>'+clear+'<g fill="#fff">'+after,black:black,x0:x0-4,x1:x1+4,y0:y0-4,y1:y1+6,phys:(bb[2]-bb[0])*10,physH:(bb[3]-bb[1])*10-zu,letter:letter,nrH:nrH,bad:bad};
    if(unter.length) o.unter=unter;
    return o;
  }
  // Einzeilige Schilder: Straße und Nummer als eine Zeile, Wortabstand 0,5 × Schrifthöhe, Zeile füllt die Breite bis auf je 7 mm,
  // Linie 7 mm über die Schrift hinaus. Ziffern so hoch wie die Großbuchstaben, bei nrScale entsprechend höher (groß/klein).
  function buildRow(d,street,nr,wcm){
    var bb=d.bbox, B0=bb[0]*10, B1=bb[2]*10, mU=OVER/(wcm||50)*(B1-B0), white='', bad=[], ns=d.nrScale||1;
    var fs=d.fields.filter(function(f){return f.role!=='nr';})[0], fn=d.fields.filter(function(f){return f.role==='nr';})[0];
    var Rs=street?run(fs.f,cased(street,fs.case)):null, Rn=nr?run(fn.f,cased(nr,fn.case)):null;
    if(Rs) bad=bad.concat(Rs.bad); if(Rn) bad=bad.concat(Rn.bad);
    var ws=Rs&&Rs.w?Rs.w/1000:0, wn=Rn&&Rn.w?Rn.w/Rn.F.digitH*ns:0, gap=(ws&&wn)?0.5:0;
    var H=(ws+gap+wn)>0?Math.min((B1-B0-2*mU)/(ws+gap+wn),(d.hmax||0.1)*(B1-B0)):0;   // Schrifthöhe (Versal), höchstens hmax × Breite (Standard 0.1)
    var base=fs.at+3, x=B0+mU, g='', top=-H, bot=0;   // top/bot: Oberlängen (Umlautpunkte) und Unterlängen (g, p, y) mitnehmen
    if(ws){ var ks=H/1000; g+=glyphs(Rs,ks,x-Rs.x0*ks,base); x+=Rs.w*ks+gap*H; top=Math.min(top,Rs.top*ks); bot=Math.max(bot,Rs.bot*ks); }
    if(wn){ var kn=H*ns/Rn.F.digitH; g+=glyphs(Rn,kn,x-Rn.x0*kn,base); x+=Rn.w*kn; top=Math.min(top,Rn.top*kn); bot=Math.max(bot,Rn.bot*kn); }
    var tx0=B0+mU, tx1=x, bl=Math.max(B0,tx0-mU), br=Math.min(B1,tx1+mU), cid='smsc'+(++uid);
    d.layers.forEach(function(L){ white+='<image href="'+ASSET+'sm-ss-'+L.img+'.png" x="'+L.x*10+'" y="'+L.y*10+'" width="'+L.w*10+'" height="'+L.h*10+'" preserveAspectRatio="none"/>'; });
    white='<clipPath id="'+cid+'"><rect x="'+bl+'" y="0" width="'+(br-bl)+'" height="1000"/></clipPath><g clip-path="url(#'+cid+')">'+white+'</g>'+g;
    return {white:white,black:'',x0:bl-4,x1:br+4,y0:base+top-8,y1:Math.max(bb[3]*10,base+bot)+6,pad:[4,8,4,6],phys:B1-B0,barW:br-bl,letter:H,nrH:H*ns,bad:bad};
  }
  // „Straße vor Nummer“ nach Produktfoto: zwei Balken über volle Breite, Name füllt die Breite und greift in beide Balken,
  // Balkenabstand passt sich der Schrift an; große Nummer dahinter, im Band ausgespart.
  // Der Name wird nie breiter als die Balken ohne je 7 mm (vorher ragte ein langer Name um 0,5 % seiner Breite darüber und wurde am Rand abgeschnitten).
  // hs: Höhe des Namens, mit Umlautpunkten oder Akzenten (mehr als 5 % über den Großbuchstaben) bis zu deren Oberkante: die Punkte hängen dann
  // sichtbar am oberen Balken, die Buchstaben stehen auf dem unteren (wie bei band2), statt dass die Punkte im Balken verschwinden.
  function buildBand(d,street,nr,wcm){
    var B=d.band, S=1000, t=B.t||15, white='', bad=[], letter=0, y0=0, y1=0, mU=OVER/(wcm||50)*S, nl=500, nr2=500, ql=1e9, qr=-1e9, mx=B.mitte==null?520:B.mitte;
    var Rs=street?run(B.f,cased(street,B.case||'2')):null, Rn=nr?run(B.f,nr):null, gap=122, k2=0, hs=1000;
    if(Rs&&Rs.w){ bad=bad.concat(Rs.bad); hs=-Rs.top>1050?-Rs.top:1000; k2=Math.min((S-2*mU)/Rs.w,165/hs); gap=hs*k2-5; letter=1000*k2-5; }
    var nh=B.nh||640, bandTop, numTop=0;
    if(Rn&&Rn.w){ bad=bad.concat(Rn.bad); var kn=Math.min(nh/Rn.F.digitH,(B.nw||800)/Rn.w); nh=Rn.F.digitH*kn;
      bandTop=numTop+nh*(B.pos||.61)-(gap/2+t); white+=glyphs(Rn,kn,mx-(Rn.x0+Rn.w/2)*kn,numTop+nh); y1=numTop+nh+Math.max(0,Rn.bot)*kn; ql=mx-Rn.w*kn/2; qr=mx+Rn.w*kn/2; }
    else { bandTop=0; y1=gap+2*t; }
    var cut='<rect x="-50" y="'+(bandTop+t)+'" width="1100" height="'+gap+'" fill="#000"/>';
    var name=''; if(k2){ name=glyphs(Rs,k2,500-(Rs.x0+Rs.w/2)*k2,bandTop+t+gap+2.5); nl=500-Rs.w*k2/2; nr2=500+Rs.w*k2/2; }
    var bl=Math.max(0,Math.min(nl,ql,500-(B.min||0)*S/2)-mU), br=Math.min(S,Math.max(nr2,qr,500+(B.min||0)*S/2)+mU);   // Balken 7 mm über Name und Nummer hinaus, mindestens min
    var bars='<rect x="'+bl+'" y="'+bandTop+'" width="'+(br-bl)+'" height="'+t+'"/><rect x="'+bl+'" y="'+(bandTop+t+gap)+'" width="'+(br-bl)+'" height="'+t+'"/>';
    // Ausschnitt unten nach der Tinte: runde Ziffern (0, 3, 6, 8, 9) reichen etwas unter die Grundlinie, ein Komma im Namen unter den unteren Balken
    y0=Math.min(numTop,bandTop); y1=Math.max(y1,bandTop+2*t+gap,k2?bandTop+t+gap+2.5+Math.max(0,Rs.bot)*k2:0);
    return {white:white+'</g>'+cut+'<g fill="#fff">'+bars+name,black:'',x0:Math.min(bl,ql)-4,x1:Math.max(br,qr)+4,y0:y0-4,y1:y1+6,phys:S,barW:br-bl,letter:letter,bad:bad};
  }
  // „Name vor der Nummer“ nach Produktfoto: große Nummer, davor ein gerahmtes Band über die Nummernbreite (Mitte auf 55 %),
  // Name füllt das Band und greift oben und unten in den Rahmen; Nummer im Band ausgespart. Einheiten: Nummernhöhe = 1000.
  // Das Band ist mindestens so breit, wie die Nummer hoch ist (band2.min × Nummernhöhe, Standard 1): eine einzelne oder schmale Nummer („7“, „11“)
  // steht mittig im Band, und das Schild wird nie höher als die gewählte Breite. Ohne diese Grenze wäre eine „1“ bei Breite 30 cm über 80 cm hoch.
  // Ohne Nummer gibt es nur das Band: Ausschnitt und Q.hoehe meinen dann das Band allein.
  // ph: Feldnamen der Platzhalter (werte). Ist die Nummer ein Platzhalter (vor am Nummernfeld, nur ein Name eingegeben), wird sie blasser gezeichnet
  function buildBand2(d,vals,ph){
    var N=nach(d,vals), bad=[], white='', Rn=run(d.band2.f,N.nr), Rs=run(d.band2.f,N.tx.toUpperCase());
    var pn=ph&&d.props.some(function(p){ return p.role==='nr'&&ph.indexOf(p.prop)>=0; });
    bad=bad.concat(Rn.bad,Rs.bad);
    var B=d.band2, nh=1000, kn=Rn.w?nh/Rn.F.digitH:1, nw=Rn.w?Rn.w*kn:900, t=B.t||36, bh=B.h||240, mb=(B.min==null?1:B.min)*nh;
    var bx0=B.b?nw*(1-B.b)/2:-0.02*nw, bx1=B.b?nw*(1+B.b)/2:nw*1.02; if(bx1-bx0<mb){ bx0=nw/2-mb/2; bx1=nw/2+mb/2; }
    // hs: Höhe des Namens, mit Umlautpunkten oder Akzenten (mehr als 5 % über den Großbuchstaben) bis zu deren Oberkante, damit sie im Band zu sehen sind.
    // Begrenzt die Breite den Namen (lange Namen), wird das Band so niedrig wie der Name: er greift weiter oben und unten in den Rahmen, kein Buchstabe steht lose im Band
    var inW=bx1-bx0-2*t-24, gap=bh-2*t, hs=-Rs.top>1050?-Rs.top:1000, ks=Rs.w?Math.min(inW/Rs.w,(gap+6)/hs):0;
    if(ks&&hs*ks<gap+6){ gap=hs*ks-6; bh=gap+2*t; }
    var bt=nh*.55-bh/2;
    if(Rn.w) white+=pn?'<g opacity=".4">'+glyphs(Rn,kn,-Rn.x0*kn,nh)+'</g>':glyphs(Rn,kn,-Rn.x0*kn,nh);
    var cut='<rect x="'+(bx0+t)+'" y="'+(bt+t)+'" width="'+(bx1-bx0-2*t)+'" height="'+gap+'" fill="#000"/>';
    var frame='<rect x="'+bx0+'" y="'+bt+'" width="'+(bx1-bx0)+'" height="'+t+'"/><rect x="'+bx0+'" y="'+(bt+bh-t)+'" width="'+(bx1-bx0)+'" height="'+t+'"/><rect x="'+bx0+'" y="'+bt+'" width="'+t+'" height="'+bh+'"/><rect x="'+(bx1-t)+'" y="'+bt+'" width="'+t+'" height="'+bh+'"/>';
    var name='', letter=0;
    if(ks){ letter=1000*ks; name=glyphs(Rs,ks,(bx0+bx1)/2-(Rs.x0+Rs.w/2)*ks,bt+t+gap/2+hs/2*ks+3); }
    return {white:white+'</g>'+cut+'<g fill="#fff">'+frame+name,black:'',x0:(Rn.w?Math.min(bx0,0):bx0)-4,x1:(Rn.w?Math.max(bx1,nw):bx1)+4,y0:(Rn.w?Math.min(0,bt):bt)-4,y1:(Rn.w?Math.max(nh,bt+bh):bt+bh)+6,phys:Rn.w?Math.max(bx1-bx0,nw):bx1-bx0,physH:Rn.w?nh:bh,letter:letter,nrH:Rn.w?nh:0,bad:bad};
  }
  // „Hausnummernschild“: Platte wächst mit der Nummer (Breite = Rand margin × Höhe + Laufweite, Ziffern digit × Höhe, ausgeschnitten). Einheiten: Plattenhöhe = 1000.
  function buildPlateW(d,vals){
    var P=d.platew, R=run(P.f,nach(d,vals).nr.toUpperCase()), dh=P.digit*1000, k=R.w?dh/R.F.digitH:1, rw=R.w?R.w*k:600, Wd=P.margin*1000+rw;
    var r=P.r==null?22:P.r, plate='<rect x="0" y="0" width="'+Wd+'" height="1000" rx="'+r+'" ry="'+r+'"/>', cut=R.w?glyphs(R,k,Wd/2-(R.x0+R.w/2)*k,500+dh/2):'';
    return {white:plate,black:cut,x0:-6,x1:Wd+6,y0:-6,y1:1008,pad:[6,6,6,8],phys:Wd,physH:1000,letter:0,nrH:dh,bad:R.bad};
  }
  // „Hausnummer auf Linie“. Einheiten: Ziffernhöhe = 1000. g: gewählte Größe in cm.
  // mass h (Steelmonks, Größe ist die Höhe): die Linie steht je Seite um extra / 2 × Ziffernhöhe über, wie auf Produktfoto und Personalisierer-Bild
  // (rund 12 % der Ziffernhöhe), bei jeder Größe. mass b (WesterWerk, Größe ist die Breite): Linie = Nummer + je 7 mm Überstand.
  function buildLine(d,vals,g){
    var R=run(d.linew.f,nach(d,vals).nr.toUpperCase()), dh=1000, k=R.w?dh/R.F.digitH:1, rw=R.w?R.w*k:700, ext=d.linew.extra*dh/2;
    if(d.mass!=='h'){ g=g||20; if(g>2*OVER) ext=OVER*rw/(g-2*OVER); }
    ext=Math.max(ext,((d.linew.min||0)*dh-rw)/2);   // Mindestlänge der Linie: eine einzelne 7 auf einer Linie von ihrer eigenen Breite liest sich wie ein Z
    var gl=R.w?glyphs(R,k,ext-R.x0*k,0):'', bar='<rect x="0" y="-8" width="'+(rw+2*ext)+'" height="95"/>';
    return {white:gl+bar,black:'',x0:-6,x1:rw+2*ext+6,y0:-dh-10,y1:95,pad:[6,10,6,8],phys:rw+2*ext,physH:dh+87,letter:0,nrH:dh,bad:R.bad};
  }
  // Frei stehende Zeichen ohne Platte und ohne Linie (einzelne Ziffern wie „Modern“): jedes Zeichen für sich, Ziffernhöhe 1000 = gewählte Höhe.
  // frei: {f: Schrift, case: Schreibweise, abstand: Lücke zwischen den Zeichen als Anteil der Zeichenhöhe (Standard 0,12)}.
  // Q.teile: Anzahl der Stücke, Q.zeichen: die gezeichneten Zeichen der Reihe nach (Schreibweise des Produkts, ohne Leerzeichen und ohne Zeichen,
  // die der Schrift fehlen: die stehen in Q.bad). Je Stück eine Bestellzeile.
  // eingabe.klein (zwischen 0 und 1, etwa 20 / 30): Buchstaben werden um diesen Faktor kleiner gezeichnet als Ziffern und Schrägstrich, auf derselben
  // Grundlinie (Empfehlung im Shop: Buchstaben eine Größe kleiner bestellen). Q.klein: Anzahl der kleiner gezeichneten Stücke, ohne eingabe.klein 0.
  function buildFrei(d,vals,e){
    var P=d.frei, N=nach(d,vals), t=cased(N.nr||N.tx,P.case||'1'), gap=(P.abstand==null?.12:P.abstand)*1000, x=0, g='', bad=[], top=-1000, bot=0, n=0, kl=e.klein>0&&e.klein<1?e.klein:1, nk=0, z='', sp=0;
    for(var i=0;i<t.length;i++){
      var R=run(P.f,t[i]), k=1000/R.F.digitH; bad=bad.concat(R.bad);
      // Leerzeichen zwischen zwei Stücken: doppelte Lücke. Ein Zeichen, das das Produkt nicht anbietet (Q.bad, kein Stück, kein Preis), zählt zwischen zwei
      // Stücken ebenso („12-14“ wie „12 14“), am Anfang und am Ende lässt es keine Lücke („12d“ bleibt so breit wie „12“)
      if(!R.w){ if((/\s/.test(t[i])||R.bad.length)&&n) sp++; continue; }
      if(kl<1&&!/[0-9\/]/.test(t[i])){ k*=kl; nk++; }
      if(n) x+=gap*(1+sp); sp=0; g+=glyphs(R,k,x-R.x0*k,0); x+=R.w*k; top=Math.min(top,R.top*k); bot=Math.max(bot,R.bot*k); n++; z+=t[i];
    }
    if(!n) x=600;
    return {white:g,black:'',x0:-4,x1:x+4,y0:top-4,y1:bot+6,phys:x,physH:1000,letter:0,nrH:1000,teile:n,zeichen:z,klein:nk,bad:bad};
  }
  // Emaille: farbige Platte mit runden Ecken, umlaufender Linie und Schrift in der zweiten Farbe, ohne Oberflächen-Textur (Q.farbig). 1000 = Plattenbreite.
  // emaille: {masse: [Breite, Höhe] in cm, hb: 1 wenn die Größen-Option Höhe × Breite nennt, r: Eckenradius, rand: Abstand der Linie vom Rand,
  //   linie: Dicke der Linie (alles cm, linie 0 = keine), kehle: Ecken der Linie nach innen gerundet, Radius in cm auf der Linienmitte um die Ecke
  //   des Linienrechtecks, punkt: [Durchmesser, Abstand der Mitte vom Rand] in cm, je ein Punkt in den vier Ecken in der Schriftfarbe, farben: [Grund, Schrift],
  //   fields: [{prop, role, f, case, y: Mitte der Zeile, h: Höhe der Großbuchstaben oder Ziffern (beides Anteil der Plattenhöhe), w: nutzbare Breite (Anteil der Plattenbreite)}]}
  // Größe: groesse als [Breite, Höhe] in cm oder als Text der Größen-Option („40 x 15 cm“). hb gilt nur für den Text der Option, ein Feld ist immer [Breite, Höhe].
  //   Nur eine Zahl (Breite, oder [0, Höhe]): die andere Seite folgt dem Seitenverhältnis von masse, die Platte wird nie verzerrt. Ohne Größe gilt masse.
  //   Farben: eingabe.farben, sonst die im Feld Farbe gewählte (eingabe.wahl, Tabelle farbe des Designs), sonst emaille.farben. Q.nrH: Ziffernhöhe.
  function buildEmaille(d,vals,gz,e,alsText,A){
    var P=d.emaille, m=P.masse||[40,15], a=gz[0]>0?gz[0]:0, b=gz[1]>0?gz[1]:0; if(P.hb&&b&&alsText){ var t=a; a=b; b=t; }
    if(a&&!b) b=a*m[1]/m[0]; else if(b&&!a) a=b*m[0]/m[1];
    var bw=a||m[0], S=1000/bw, H=(b||m[1])*S, c=[e.farben,A.farben,P.farben].filter(function(x){ return x&&x.length>1; })[0]||['#1f3f9a','#fff'], r=(P.r==null?1:P.r)*S, rd=(P.rand==null?.8:P.rand)*S, li=(P.linie==null?.25:P.linie)*S;
    var bad=[], letter=0, nrH=0, id='smse'+(++uid), pl='<rect x="0" y="0" width="1000" height="'+H+'" rx="'+r+'" ';
    var s='<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>'+pl+'fill="'+c[0]+'"/>';
    if(li){ var q=Math.min((P.kehle||0)*S,500-rd,H/2-rd), xb=1000-rd, yb=H-rd, bg='A'+q+' '+q+' 0 0 0 ';
      s+=(q>0?'<path d="M'+(rd+q)+' '+rd+'H'+(xb-q)+bg+xb+' '+(rd+q)+'V'+(yb-q)+bg+(xb-q)+' '+yb+'H'+(rd+q)+bg+rd+' '+(yb-q)+'V'+(rd+q)+bg+(rd+q)+' '+rd+'Z"':'<rect x="'+rd+'" y="'+rd+'" width="'+(1000-2*rd)+'" height="'+(H-2*rd)+'" rx="'+Math.max(0,r-rd)+'"')+' fill="none" stroke="'+c[1]+'" stroke-width="'+li+'"/>'; }
    if(P.punkt){ var pr=P.punkt[0]*S/2, pa=P.punkt[1]*S; [[pa,pa],[1000-pa,pa],[pa,H-pa],[1000-pa,H-pa]].forEach(function(z){ s+='<circle cx="'+z[0]+'" cy="'+z[1]+'" r="'+pr+'" fill="'+c[1]+'"/>'; }); }
    s+='<g fill="'+c[1]+'">';
    P.fields.forEach(function(f){
      var raw=txt(vals[f.prop]).trim(); if(!raw) return;
      var R=run(f.f,cased(raw,f.case),(f.sperr||0)*1000); bad=bad.concat(R.bad); if(!R.w) return;
      var ref=f.role==='nr'?R.F.digitH:1000, k=Math.min((f.h||.5)*H/ref,(f.w||.8)*1000/R.w);
      if(f.role!=='nr') letter=Math.max(letter,1000*k); else nrH=Math.max(nrH,ref*k);
      s+=glyphs(R,k,500-(R.x0+R.w/2)*k,(f.y==null?.5:f.y)*H+ref*k/2);
    });
    return {farbig:s+'</g>'+pl+'fill="url(#'+id+')"/>',white:'',black:'',x0:-4,x1:1004,y0:-4,y1:H+6,phys:1000,physH:H,cm:bw/1000,letter:letter,nrH:nrH,bad:bad};
  }
  // Zweite Lage hinter dem Schild in eigener Oberfläche (zweischichtige Hausnummern): Q.hinten = {white, black, surface}, svg zeichnet sie zuerst.
  // hinten: {surface: Oberfläche der hinteren Lage, rand: [links, oben, rechts, unten] Überstand der hinteren Platte über das Schild in Zeicheneinheiten
  //   (negativ = kürzer als das Schild), r: Eckenradius, layers: eigene Formen wie bei z}. Die Größe des Produkts meint beide Lagen zusammen,
  //   auch bei Emaille: dort gilt die gewählte Breite für beide Lagen, der Maßstab (Q.cm) wird entsprechend kleiner.
  //   Oberfläche der hinteren Lage: eingabe.hinten, sonst die des gewählten Paars (paare, eingabe.wahl), sonst hinten.surface.
  function hinten(d,Q,e,paar){
    var H=d.hinten, p=Q.pad||PAD, r=H.rand, s='', X0=Q.x0+p[0], Y0=Q.y0+p[1], X1=Q.x1-p[2], Y1=Q.y1-p[3], a=[X0,Y0,X1,Y1];
    function dazu(x,y,w,h){ a=[Math.min(a[0],x),Math.min(a[1],y),Math.max(a[2],x+w),Math.max(a[3],y+h)]; }
    if(r){ s+='<rect x="'+(X0-r[0])+'" y="'+(Y0-r[1])+'" width="'+(X1-X0+r[0]+r[2])+'" height="'+(Y1-Y0+r[1]+r[3])+'" rx="'+(H.r||0)+'"/>'; dazu(X0-r[0],Y0-r[1],X1-X0+r[0]+r[2],Y1-Y0+r[1]+r[3]); }
    (H.layers||[]).forEach(function(L){ s+=bild(L); dazu(L.x*10,L.y*10,L.w*10,L.h*10); });
    Q.hinten={white:s,black:'',surface:e.hinten!=null?e.hinten:paar?paar.hinten:H.surface||0};
    var vor=Q.phys; Q.phys+=a[2]-a[0]-(X1-X0); if(Q.physH) Q.physH+=a[3]-a[1]-(Y1-Y0); if(Q.cm) Q.cm*=vor/Q.phys;
    Q.x0=a[0]-p[0]; Q.y0=a[1]-p[1]; Q.x1=a[2]+p[2]; Q.y1=a[3]+p[3];
  }
  function zahlen(g){ if(typeof g==='string') g=(g.replace(/,/g,'.').match(/\d+(\.\d+)?/g)||[]).map(parseFloat); return Array.isArray(g)?g:[g]; }
  // Der eine Einstieg für alle Arten. eingabe: {text, nr, mono}. Wahlweise dazu: werte (Text je Feldname statt text und nr, etwa für alle Felder der Produktseite),
  //   wahl ({Feldname: Wert} für Auswahlfelder: Farbe, Material, Zunftzeichen; siehe Dateikopf), klein (frei: Faktor für Buchstaben),
  //   farben (Emaille: [Grund, Schrift], geht vor wahl), hinten (Oberfläche der zweiten Lage, geht vor wahl).
  // groesse: Wert der Größen-Option in cm, als Zahl oder als Text der Option („30cm“). Je nach d.mass ist das die Breite (b), die Höhe (h) oder der Durchmesser (d).
  //   Emaille: [Breite, Höhe] oder der Text der Option („40 x 15 cm“); eine einzelne Zahl ist die Breite, die Höhe folgt dem Seitenverhältnis von emaille.masse.
  // Ergebnis Q: white, black (Masken), Ausschnitt x0 bis y1, bad (Zeichen, die der Schrift fehlen), leer (kein Feld hat Text bekommen),
  //   platzhalter (Feldnamen, die statt einer Eingabe die Vorgabe des Personalisierers zeigen; fehlt, wenn es keine gibt),
  //   wahl ({Feldname: was bei den Auswahlfeldern gilt}; fehlt ohne Auswahlfelder), vorn (Oberfläche vorn bei Designs mit paare),
  //   unter (Zeichen der Hausnummer mit Unterlänge, wenn die Nummer auf einem Balken oder einer Linie steht: z mit anc sit, Foto; die Unterlänge
  //   verschwindet im Balken oder läuft hindurch, etwa „g“ in „12g“; fehlt, wenn es keine gibt),
  //   mit Größe dazu cm (cm je Zeicheneinheit) sowie breite und hoehe des sichtbaren Schilds in cm, ungerundet.
  W.zeichne=function(d,e,groesse){
    e=e||{}; var gz=zahlen(groesse), g=gz[0]>0?gz[0]:0, text=txt(e.text).trim(), nr=txt(e.nr).trim(), bb=d.bbox, Q, zf=0;
    var ph=[], v=e.werte||werte(d,text,nr,ph), N=e.werte?nach(d,v):{tx:text,nr:nr}, A=auswahl(d,e.wahl), k;
    var wcm=(d.mass==='h'?(bb?g*(bb[2]-bb[0])/(bb[3]-bb[1]):0):g)||undefined;   // Breite der Zeichenfläche in cm, für den Überstand von 7 mm
    if(d.emaille&&!d.opt) gz=[];   // Emaille ohne Größen-Option gibt es nur in der Größe aus emaille.masse: eine mitgegebene Größe (etwa die gemerkte Breite der Werkstatt) zählt nicht
    if(d.emaille) Q=buildEmaille(d,v,gz,e,typeof groesse==='string',A);
    else if(d.frei) Q=buildFrei(d,v,e);
    else if(d.band) Q=buildBand(d,N.tx,N.nr,wcm);
    else if(d.band2) Q=buildBand2(d,v,ph);
    else if(d.platew) Q=buildPlateW(d,v);
    else if(d.linew) Q=buildLine(d,v,g);
    else if(!d.z) Q=build(d,N.tx,N.nr,wcm);
    else if(d.row) Q=buildRow(d,N.tx,N.nr,wcm);
    else { Q=buildZ(d,v,e.mono,wcm,A.bild,ph); zf=1; }
    if(d.hinten) hinten(d,Q,e,A.paar);
    var p=Q.pad||PAD, bw=Q.x1-Q.x0-p[0]-p[2], bh=Q.y1-Q.y0-p[1]-p[3];
    // mass h: gewählt ist die Höhe. Zepto-Designs: die sichtbare Höhe, auch wenn Schrift über die Form hinaus steht. Sonst die Höhe der Art (Q.physH)
    if(!Q.cm&&g) Q.cm=d.mass==='h'?g/(zf?bh:Q.physH||bh):g/Q.phys;
    if(Q.cm){ Q.breite=bw*Q.cm; Q.hoehe=bh*Q.cm; }
    function hatText(q){ return txt(v[q.prop]).trim()&&ph.indexOf(q.prop)<0; }
    Q.leer=!d.props.some(hatText);
    // nrPflicht: das Schild gibt es nur mit Hausnummer (Nummer ist Teil der Form, etwa „No.“ der Maske). Ohne eingegebene Nummer ist es leer wie ohne Eingabe
    if(d.nrPflicht&&!d.props.some(function(q){ return q.role==='nr'&&hatText(q); })) Q.leer=true;
    if(ph.length) Q.platzhalter=ph;
    for(k in A.f){ Q.wahl=A.f; break; }
    if(A.paar) Q.vorn=A.paar.vorn;
    return Q;
  };
  // Wie bisher: Straße, Nummer, Monogramm und Breite in cm einzeln
  W.geom=function(d,street,nr,mono,wcm){ return W.zeichne(d,{text:street,nr:nr,mono:mono},wcm); };
  // surface: Oberfläche des Schilds. Fehlt sie, gilt bei Designs mit paare die vordere Oberfläche des gewählten Paars (Q.vorn), sonst Schwarz
  W.svg=function(Q,surface){
    if(surface==null&&Q.vorn!=null) surface=Q.vorn;
    var vx=Q.x0, vy=Q.y0, vw=Q.x1-Q.x0, vh=Q.y1-Q.y0, box='x="'+vx+'" y="'+vy+'" width="'+vw+'" height="'+vh+'"';
    var s='<svg viewBox="'+vx+' '+vy+' '+vw+' '+vh+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Vorschau">';
    function lage(q,o){
      var id='smsg'+(++uid), th=Math.max(vw*0.35,vh), tex=TEX[o];
      return ['<pattern id="'+id+'p" patternUnits="userSpaceOnUse" x="'+vx+'" y="'+vy+'" width="'+vw+'" height="'+th+'">'+
        (tex?'<image href="'+tex+'" x="0" y="0" width="'+vw+'" height="'+th+'" preserveAspectRatio="xMidYMid slice"/>':'<rect width="'+vw+'" height="'+th+'" fill="'+FLAECHE[o]+'"/>')+'</pattern>'+
        '<mask id="'+id+'m" maskUnits="userSpaceOnUse" '+box+'><rect '+box+' fill="#000"/><g fill="#fff">'+q.white+'</g><g fill="#000">'+q.black+'</g></mask>',
        '<rect '+box+' fill="url(#'+id+'p)" mask="url(#'+id+'m)"/>'];
    }
    function ok(o){ return o>=0&&o<6?o:0; }
    var h=Q.hinten?lage(Q.hinten,ok(Q.hinten.surface)):['',''], a;   // hintere Lage zuerst, Ausschnitte der vorderen zeigen sie
    if(Q.farbig) return s+(Q.hinten?'<defs>'+h[0]+'</defs>'+h[1]:'')+Q.farbig+'</svg>';   // Emaille: farbige Zeichnung, die Oberfläche spielt keine Rolle
    a=lage(Q,ok(surface));
    return s+'<defs>'+h[0]+a[0]+'</defs>'+h[1]+a[1]+'</svg>';
  };
  // Oberflächen mit festen Nummern: 0 Schwarz, 1 Anthrazit, 2 Edelstahl, 3 Cortenstahl, 4 Weiß, 5 Gold. Unbekannter Text: -1
  W.surfaceIndex=function(t){ t=t||''; return /Schwarz/i.test(t)?0:/Anthrazit/i.test(t)?1:/Edelstahl/i.test(t)?2:/Corten/i.test(t)?3:/Wei(ß|ss)/i.test(t)?4:/Gold/i.test(t)?5:-1; };
  // Welches Hausfoto passt: 1 = dunkle Wand für Edelstahl und Weiß, sonst 0 = helle Wand
  W.wandIndex=function(surface){ return surface===2||surface===4?1:0; };
  // Wand für szene, house und wand: bei zwei Lagen zählt die hintere, äußere Platte (Q.hinten.surface), sonst die übergebene Oberfläche
  function wandVon(Q,surface){ return W.wandIndex(Q.hinten?Q.hinten.surface:surface); }
  // Hauswand. HOUSES: je Hausfoto (1168 × 880) k = Anteil der Bildhöhe je cm (Türblatt 210 cm), ground = Bodenlinie, door = linke Kante des Türrahmens.
  // Der Maßstab kommt aus Q.cm (von zeichne); widthCm gilt nur noch, wenn Q ohne Größe gezeichnet wurde.
  var HOUSES=[{k:0.647/210,ground:0.833,door:0.600},{k:0.609/210,ground:0.812,door:0.623}], IW=1168, IH=880;
  // Montage und Szene in cm: ab = rechte Schildkante links vom Türrahmen, mitte = Schildmitte über dem Boden. S = Kante der quadratischen Szene,
  // wand = Wand links vom Türrahmen, oben = Szene über dem Boden. rand, luft: Abstand zum linken und oberen Rand der Szene, tuer: kleinster Abstand zum Türrahmen
  var MONT={ab:30,mitte:175,S:250,wand:150,oben:238,rand:4,luft:8,tuer:8};
  // Wo das Schild hängt (Regel im Dateikopf). sw, sh: Schild in cm; ab, mitte wie in MONT, nach dem Klemmen; k: 0 Regel, 1 gerückt, 2 passt nicht in die Szene
  function haengen(Q,cmu){
    var sw=(Q.x1-Q.x0)*cmu, sh=(Q.y1-Q.y0)*cmu, ab=MONT.ab, mi=MONT.mitte, k=0;
    if(sw>MONT.wand-MONT.rand-ab){ ab=Math.max(MONT.tuer,MONT.wand-MONT.rand-sw); k=1; }
    if(mi+sh/2>MONT.oben-MONT.luft){ mi=MONT.oben-MONT.luft-sh/2; k=1; }
    if(ab+sw>MONT.wand||mi-sh/2<MONT.oben-MONT.S) k=2;
    return {sw:sw,sh:sh,ab:ab,mitte:mi,k:k};
  }
  function r2(x){ return Math.round(x*100)/100; }
  // Feste Szene für die Karten (Beschreibung und Ergebnis im Dateikopf)
  W.szene=function(Q,surface){
    if(!Q||!Q.cm) return null;
    var i=wandVon(Q,surface), H=HOUSES[i], pc=H.k*IH, M=haengen(Q,Q.cm), pr=100/MONT.S, ww=MONT.S*pc, wl=H.door*IW-MONT.wand*pc, wt=H.ground*IH-MONT.oben*pc;
    return {i:i,size:r2(IW/ww*100)+'% auto',pos:r2(wl/(IW-ww)*100)+'% '+r2(wt/(IH-ww)*100)+'%',
      box:{left:r2((MONT.wand-M.ab-M.sw)*pr),top:r2((MONT.oben-M.mitte-M.sh/2)*pr),width:r2(M.sw*pr),height:r2(M.sh*pr)},
      cm:pr,door:MONT.wand*pr,ground:MONT.oben*pr,klemme:M.k};
  };
  // Lupe zur Szene (Beschreibung im Dateikopf): Ausschnitt rwc cm breit um die Schildmitte, im Seitenverhältnis des Lupenkastens
  W.lupe=function(Z,L){
    var H=HOUSES[Z.i], pc=H.k*IH, b=Z.box, sw=b.width/Z.cm, sh=b.height/Z.cm, q=L.h/L.w, rwc=Math.max(sw/(L.fx||.86),sh/(L.fy||.72)/q), rw=rwc*pc, rh=rw*q;
    var rl=H.door*IW-MONT.wand*pc+(b.left+b.width/2)/Z.cm*pc-rw/2, rt=H.ground*IH-MONT.oben*pc+(b.top+b.height/2)/Z.cm*pc-rh/2;
    return {size:r2(IW/rw*100)+'% auto',pos:r2(rl/(IW-rw)*100)+'% '+r2(rt/(IH-rh)*100)+'%',f:r2(L.w/100*MONT.S/rwc),
      box:{left:r2(50-sw/rwc*50),top:r2(50-sh/rwc/q*50),width:r2(sw/rwc*100),height:r2(sh/rwc/q*100)}};
  };
  // Probehängen nah: Ausschnitt des Hausfotos bis zur Tür, wächst mit dem Schild. Lage des Schilds nach der Montageregel
  W.house=function(Q,widthCm,surface,houseImgs,aspect){
    var i=wandVon(Q,surface), H=HOUSES[i], pc=H.k*IH, cmu=Q.cm||widthCm/Q.phys, ar=aspect||9/16, M=haengen(Q,cmu);
    var sw=(Q.x1-Q.x0)*cmu*pc, sh=(Q.y1-Q.y0)*cmu*pc, sx=H.door*IW-M.ab*pc-sw, sy=H.ground*IH-M.mitte*pc-sh/2;
    var L0=sx-30*pc, R0=H.door*IW+40*pc, ww=Math.min(IW,R0-L0), wh=ww*ar; if(wh>IH){wh=IH;ww=wh/ar;}
    var wl=Math.min(Math.max(L0,0),IW-ww), wt=Math.min(Math.max(sy+sh/2-wh*.42,0),IH-wh);
    return {bg:houseImgs[i],size:(IW/ww*100).toFixed(2)+'% auto',pos:(ww<IW?(wl/(IW-ww)*100).toFixed(2):0)+'% '+(wh<IH?(wt/(IH-wh)*100).toFixed(2):0)+'%',
      box:{left:((sx-wl)/ww*100).toFixed(2),width:(sw/ww*100).toFixed(2),top:((sy-wt)/wh*100).toFixed(2),height:(sh/wh*100).toFixed(2)}};
  };
  // Ganzes Haus: Lage des Schilds in Prozent des Hausfotos, dazu Bodenlinie, Türkante und Maßstab (Prozent der Bildhöhe je cm). Gleiche Montageregel
  W.wand=function(Q,widthCm,surface){
    var i=wandVon(Q,surface), H=HOUSES[i], pc=H.k*IH, cmu=Q.cm||widthCm/Q.phys, M=haengen(Q,cmu);
    var sw=(Q.x1-Q.x0)*cmu*pc, sh=(Q.y1-Q.y0)*cmu*pc, sx=H.door*IW-M.ab*pc-sw, sy=H.ground*IH-M.mitte*pc-sh/2;
    return {i:i,left:sx/IW*100,top:sy/IH*100,width:sw/IW*100,height:sh/IH*100,ground:H.ground*100,door:H.door*100,cm:pc/IH*100};
  };
})();
