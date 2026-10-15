/* Produktseite: übernimmt Text und Hausnummer von der Kollektionsseite (sm-coll-schild.js) oder aus dem Link (?strasse=…&nr=…).
   1. Trägt den Text in die Textfelder des Personalisierers (Zepto) ein, sobald sie da sind. Gibt es für das Produkt ein Design, gilt dessen Zuordnung
      (SMSchild.felder: Feldname wie im Produkt, Hauptzeile bei mehreren Textfeldern, Schreibweise wie auf dem Schild; Beispielzeilen werden nie eingetragen).
      Sonst über den Feldnamen: „Hausnummer“, „Hausnummer oder Text“, „Deine Hausnummer“, „Nummer“ bekommen die Nummer; „Straßenname“, „Name oder Wunschtext“,
      „Familienname oder Wunschtext“, „Straßenname oder Wunschtext“, „Wunschtext“, „Dein Nachname“, „Name - oben“ den Text; „Straßenname und Hausnummer“
      und „Adresse“ beides. Auswahlfelder (Farbe, Befestigung, Material, Zunftzeichen Auswahl, Hausnummer Auswahl, Buchstabenauswahl) bleiben unberührt.
      Zwei Regeln wie in sm-coll-schild.js: Namensschilder ohne Nummernfeld bekommen nur den Text, nicht die Nummer (nrIn). Kam der Besucher aus einer
      Kollektion mit „Straße oder Wunschtext“ (sm_schild.m = s), steht der Text bei Schildern mit Straßen- und Namenszeile in der Straßenzeile (zeile).
      Was der Besucher selbst ändert oder löscht, bleibt so, auch wenn der Personalisierer seinen Block neu aufbaut.
      Länge: Zepto-Textfelder tragen ihre Grenze in data-maxlength (kein maxlength), mehrzeilige zusätzlich maxline. Ein Wert, der nicht hineinpasst, wird nie
      eingetragen (Zepto würde ihn beim nächsten Tastendruck abschneiden); das Feld bleibt dem Besucher, der Satz der Vorschau nennt Wert und Grenze.
      Zähler: Zepto zählt in einem verzögerten Schritt (300 bis 500 ms), den jeder weitere Aufruf seines Eingabe-Handlers für irgendein Feld abbricht.
      Deshalb bekommt jedes eingetragene Feld danach der Reihe nach noch einmal input und keyup (je nach Produkt hört Zepto auf das eine oder andere),
      700 ms Abstand. Den Zähler selbst schreibt das Skript nicht: Zepto zählt je nach Produkt verbleibende oder benutzte Zeichen.
   2. Zeigt über dem Knopf zum Personalisieren das eigene Schild, wenn es für das Produkt ein Design gibt: die Lupe (SMSchild.lupe: Wand im Maßstab des
      Hausfotos, das Schild so groß, dass die Namenszeile wenn möglich etwa 11 px Versalhöhe hat) und die Tür-Szene im festen Maßstab wie auf den Karten
      (SMSchild.szene) mit dem Maß unten links, dazu der Satz. Breite Schilder: Lupe in voller Breite, darunter die Szene, der Satz fließt um sie herum.
      Hohe Schilder (Breite unter 1,6 Höhen): Lupe und Szene nebeneinander, der Satz darunter. Höhe der Lupe 84 bis 180 px je nach Schild, neben der Szene
      so hoch wie die Szene (höchstens 200 px). Oberfläche und Größe folgen der Auswahl auf der Seite. Zeigt der Personalisierer keinen Knopf, sondern
      seine Felder direkt auf der Seite (einzelne Zeichen), steht die Vorschau über dem Kaufknopf.
      Der Satz sagt, was eingetragen wird oder wurde (alles, ein Teil, nichts, was zu lang ist); vor dem Öffnen des Personalisierers aus dem Design vorhergesagt.
      Einzelne Zeichen (Design einzeln, z. B. Modern): jedes Zeichen ist ein eigenes Teil und eine eigene Bestellzeile. Der Satz nennt den Preis je Teil
      (gewählte Variante) und die Summe wie auf der Karte und sagt der Reihe nach, welche Zeichen einzeln in den Warenkorb kommen: „Wähl unten die 1 und
      leg sie in den Warenkorb, dann genauso die 2 und die 8.“ Steht das erste Zeichen schon im Auswahlfeld (Vorgabe von Zepto oder vom Besucher gewählt),
      sagt er das. Das Auswahlfeld selbst bleibt unberührt, auch hier: ein Vorwählen beim Ankommen (chooseimage) startete Zeptos eigene Vorschau, das erste
      Produktbild wurde zur einzelnen Ziffer, und beim Rollen deckte eine feste Vorschau (.pplrabs, oben 281 px auf dem Handy) diese Box und das Auswahlfeld zu.
      Die löst jetzt erst der Besucher mit seiner eigenen Wahl aus.
   3. Kam der Besucher aus einer Kollektion (Referrer), nennt der Knopf „Zurück zu … Kollektion“ diese Kollektion. Ändert er die Variante, behält der Link
      schild=1 (und strasse, nr), damit ein Neuladen die Vorschau wieder zeigt.
   Läuft nur, wenn der Link ?schild=1 oder ?strasse / ?nr trägt; sonst endet das Skript sofort.
   Am script-Tag: data-asset (Asset-Ordner), data-js (sm-schild.js), data-handle (Produkt), data-ver (Stand der Zeichendaten). */
(function(){
  var me=document.currentScript, q=new URLSearchParams(location.search), st=null, t0=Date.now();
  if(!q.get('schild')&&!q.get('strasse')&&!q.get('nr')) return;
  try{ st=JSON.parse(sessionStorage.getItem('sm_schild')||'null'); }catch(e){}
  var s=(q.get('strasse')||(st&&st.s)||'').replace(/\s+/g,' ').trim().slice(0,40), n=(q.get('nr')||(st&&st.n)||'').replace(/[^0-9A-Za-z\/-]/g,'').slice(0,6);
  if(!s&&!n) return;
  var mono=s.charAt(0).toUpperCase(), D=null, FD=null, erst='', fertig=false; if(!/[A-Z]/.test(mono)) mono='A';
  var NIE=/farbe|befestigung|material|zunftzeichen|auswahl/;   // Auswahlfelder und alles, was keine freie Eingabe ist
  var STR=/stra(ß|ss)e/i;
  // BEN: Felder (nach Namen), die der Besucher selbst angefasst hat: die trägt das Skript nie wieder ein. Der Merker steht hier und nicht am Element,
  // weil der Personalisierer seine Felder neu aufbaut. Erkannt an einer echten Eingabe (input) oder daran, dass ein Feld, in dem der Text schon stand, leer ist.
  // EIN: Felder, die das Skript gefüllt hat (Name: Rolle nr oder st), LANG: Felder, in die der Wert nicht passt ({r, v, max}), X: Zusätze für den Satz
  var BEN={}, EIN={}, LANG={}, X={}, zeiten=[], satz=null;
  document.addEventListener('input',function(e){ var t=e.target; if(e.isTrusted&&t&&t.name&&/(^|\s)pplr_text(\s|$)/.test(t.className||'')){ BEN[t.name]=1; sagen(); } },true);
  function nrIn(d){ var sm=d.sm||{}, l=sm.st||sm.txt||''; return !SMSchild.single(d)||(l?/hausnummer|adresse/i.test(l):d.props.some(function(p){ return p.role==='st'; })); }
  function zeile(d){
    var tf=d.props.filter(function(p){ return p.role!=='nr'; }), z=tf.filter(function(p){ return STR.test(p.prop); })[0], c={}, k;
    if(!st||st.m!=='s'||d.haupt||tf.length<2||!z) return d;
    for(k in d) c[k]=d[k]; c.haupt=z.prop; c.offen=tf.filter(function(p){ return p!==z&&!p.vor; }).map(function(p){ return p.prop; }); return c;
  }

  // Feldname ohne Tags, ohne führendes - oder _, klein geschrieben („properties[-Hausnummer]“ wird „hausnummer“)
  function etikett(name){ var m=/^properties\[([\s\S]*)\]$/.exec((name||'').replace(/<[^>]*>/g,'')); return m?putz(m[1]):null; }
  function putz(t){ return t.replace(/^[-_\s]+/,'').trim().toLowerCase(); }
  // Beschriftung des Felds im Personalisierer (erstes b im Label, ohne Hinweis). Manche Produkte heißen im Warenkorb anders als im Label
  // (Botanisch: Label „Dein Nachname“, Feld properties[Nachname]); das Design kennt das Label
  function beschrift(el){
    var w=el.closest&&el.closest('.pplr-wrapper'), lb=w&&w.querySelector('.pplrlabel'), b=lb&&lb.querySelector('b'), t=b?b.textContent:lb&&lb.firstChild?lb.firstChild.textContent:'';
    t=putz(t||''); return t||null;
  }
  function rolle(l){
    if(/stra(ß|ss)enname und hausnummer|^adresse$/.test(l)) return 'beides';
    if(/hausnummer|^nummer$/.test(l)) return 'nr';
    if(/stra(ß|ss)enname|wunschtext|nachname|^name - oben$/.test(l)) return 'st';
    return null;
  }
  // Rolle für den Satz: nr (Nummernfeld des Designs oder nach dem Namen), sonst st
  function art(l){ var sm=D&&D.sm||{}; return rolle(l)==='nr'||(sm.nr&&putz(sm.nr)===l)?'nr':'st'; }
  // Wert für ein Feld. Mit Design: was SMSchild.felder für diesen Feldnamen liefert; Felder, die das Design nicht kennt, nur für eine Rolle, die es nicht selbst belegt.
  // Ohne Design: nach dem Feldnamen, der Text nur in das erste Textfeld (bei zwei Namenszeilen bleibt die zweite frei)
  function wert(l){
    var r=rolle(l), v;
    if(FD){ if(FD.w[l]!=null) return FD.w[l]; if(!r||(r==='nr'?FD.nr:FD.tx)) return ''; }
    if(FD&&FD.str!=null) return r==='st'&&STR.test(l)?FD.str:r==='nr'?n:'';   // Text gehört in die Straßenzeile: nur das Feld mit „Straße“ im Namen bekommt ihn
    if(r==='st'){ if(erst&&erst!==l) return ''; erst=l; }
    v=r==='nr'?n:r==='st'?s:r==='beides'?(s+(n?' '+n:'')).trim():'';
    return v;
  }
  // Länge wie im Personalisierer: Schriftzeichen (Graphem), ohne Zeilenumbrüche. Grenze: data-maxlength (Zepto), sonst maxlength
  function zeichen(t){ try{ return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(t)).length; }catch(e){ return Array.from(t).length; } }
  function grenze(el){ var m=parseInt(el.getAttribute('data-maxlength'),10); return m>0?m:el.maxLength>0?el.maxLength:0; }
  function zeilenZahl(el){ return parseInt(el.getAttribute('maxline'),10)||1; }
  // Felder mit einer Zeile bekommen keinen Zeilenumbruch (felder setzt ihn bei zweizeiligen Namen), sonst schnitte Zepto die zweite Zeile ab
  function einzeilig(el,v){ return zeilenZahl(el)>1?v:v.replace(/\s*\n\s*/g,' '); }
  // passt der Wert? Mehrzeilige Felder: höchstens maxline Zeilen, jede höchstens Grenze / maxline Zeichen (so teilt Zepto die Grenze auf)
  function passt(el,v){
    var m=grenze(el), z=zeilenZahl(el), t=v.split('\n');
    if(!m) return true;
    if(z>1) return t.length<=z&&t.every(function(x){ return zeichen(x)<=m/z; });
    return zeichen(v.replace(/\n/g,''))<=m;
  }
  function taste(){ try{ return new KeyboardEvent('keyup',{bubbles:true,key:'Unidentified'}); }catch(e){ return new Event('keyup',{bubbles:true}); } }
  // Wert setzen wie eine Eingabe: input und keyup (darauf hört Zepto über oninput und onkeyup), change für alle anderen
  function setzen(el,v){
    var proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(taste()); el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  // Zähler: Felder der Reihe nach noch einmal input und keyup, 700 ms Abstand (Zepto zählt nach 300 bis 500 ms, ein Aufruf für das nächste Feld bricht das ab)
  var zq=[], zt=0;
  function zaehlen(els){ els.forEach(function(el){ if(zq.indexOf(el)<0) zq.push(el); }); if(!zt) zt=setTimeout(naechst,700); }
  function naechst(){
    var el=zq.shift(); zt=0; if(!el) return;
    if(el.isConnected&&!BEN[el.name]){ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(taste()); }
    if(zq.length) zt=setTimeout(naechst,700);
  }
  // nur leere Textfelder, die der Besucher nicht selbst angefasst hat: wer den Text ändert oder löscht, behält seine Eingabe, auch nach einem Umbau des Blocks.
  // smsHat am Element (kein Attribut, geht bei einem Umbau verloren): in diesem Feld stand der Text schon. Ist es jetzt leer, hat der Besucher ihn gelöscht;
  // ein neu aufgebautes leeres Feld wird dagegen wieder gefüllt. Passt der Wert nicht in das Feld, bleibt es leer (LANG).
  // Verwirft der Personalisierer die Werte immer wieder (mehr als fünf Durchgänge in fünf Sekunden), hört das Skript auf
  function fuellen(){
    if(!fertig) return;
    var jetzt=Date.now(), neu=[];
    if(zeiten.length>5&&jetzt-zeiten[zeiten.length-6]<5000) return;
    [].forEach.call(document.querySelectorAll('textarea.pplr_text,input.pplr_text'),function(el){
      if(BEN[el.name]||(el.type&&!/^(text|textarea|search|)$/.test(el.type))) return;
      var l=etikett(el.name), lb=beschrift(el); if(l==null||NIE.test(l)||(lb&&NIE.test(lb))) return;
      if(FD&&FD.w[l]==null&&lb&&FD.w[lb]!=null) l=lb;
      var v=wert(l), r=art(l); if(!v) return;
      v=einzeilig(el,v);
      if(!passt(el,v)){ LANG[el.name]={r:r,v:r==='nr'?n:s,max:grenze(el)}; return; }
      delete LANG[el.name];
      if(el.value){ if(el.value===v){ EIN[el.name]=r; el.smsHat=1; } return; }
      if(el.smsHat){ BEN[el.name]=1; return; }
      EIN[el.name]=r; el.smsHat=1; neu.push(el); setzen(el,v);
    });
    if(neu.length){ zeiten.push(jetzt); zaehlen(neu); }
    sagen();
  }

  // Block des Personalisierers an seinem Platz in der Produktspalte (nicht der kurz an den Seitenanfang gehängte, nicht das Zuschneide-Fenster)
  function zblock(){
    var h=document.querySelector('.product-personalizer'), blk=h&&(h.closest('.shopify-app-block')||h);
    return blk&&blk.parentNode&&blk.parentNode!==document.body&&!blk.closest('.pplr_crop-modal')?blk:null;
  }
  // Felder direkt auf der Seite statt hinter dem Knopf „Jetzt Personalisieren“? Einmal mit Knopf gesehen, gilt der Block als Block mit Knopf
  // (solange das Fenster des Personalisierers offen ist, kann der Knopf fehlen)
  var KN=false;
  function knopf(blk){ if(blk&&blk.querySelector('.pplr-btn')) KN=true; return KN; }
  function direkt(blk){ return !!(blk&&!knopf(blk)&&blk.querySelector('.pplr-wrapper')); }
  // Grenze vor dem Öffnen, aus dem Design: maxJe für die gewählte Größe, sonst maxNr oder maxSt (0: unbekannt)
  function gIndex(){
    var nm=[D.opt].concat(GROESSEN).filter(Boolean), i, r;
    for(i=0;i<nm.length;i++){ r=[].slice.call(document.querySelectorAll('input[type=radio][name="'+nm[i]+'"]')); if(r.length) return r.map(function(x){ return x.checked; }).indexOf(true); }
    return -1;
  }
  function vorGrenze(r){ var je=D.maxJe&&D.maxJe[r], i=gIndex(); return je&&je.length&&i>=0&&je[i]>0?je[i]:r==='nr'?D.maxNr||0:D.maxSt||0; }
  // Was das Skript eintragen wird, solange der Personalisierer seine Felder noch nicht gebaut hat (Zepto baut sie erst beim Öffnen)
  function erwartet(){
    var e=[], k, r;
    if(!FD||!D) return e;
    for(k in FD.w) if(FD.w[k]&&!NIE.test(k)){ r=art(k); e.push({r:r,v:r==='nr'?n:s,w:FD.w[k],max:vorGrenze(r)}); }
    if(FD.str) e.push({r:'st',v:s,w:FD.str,max:vorGrenze('st')});
    return e;
  }
  // Einzelne Zeichen (D.einzeln). X.zeichen: die Stücke, wie sie gezeichnet sind (Q.zeichen), X.bad: Zeichen, die das Produkt nicht anbietet.
  // Preis je Stück: Variante im Kaufformular, Preis aus den Variantendaten der Seite (Cent). KAUF: ein Kaufknopf wurde gedrückt (danach sagt der Satz
  // nicht mehr, das erste Zeichen sei schon gewählt)
  var VJ=null, KAUF=false;
  function preis(){
    var f=document.querySelector('product-form form[action*="/cart/add"]')||document.querySelector('form[action*="/cart/add"]'), el=f&&f.querySelector('[name=id]'), id=el?+el.value:0, v;
    if(!id) return 0;
    if(!VJ){
      [].some.call(document.querySelectorAll('variant-radios script[type="application/json"],variant-selects script[type="application/json"]'),function(s){ try{ VJ=JSON.parse(s.textContent); }catch(e){ VJ=null; } return VJ&&VJ.length; });
      if(!VJ||!VJ.length) try{ VJ=ShopifyAnalytics.meta.product.variants; }catch(e){ VJ=[]; }
    }
    v=(VJ||[]).filter(function(x){ return +x.id===id; })[0];
    return v&&+v.price>0?+v.price:0;
  }
  function eur(c){ var e=c/100; try{ return e.toLocaleString('de-DE',{minimumFractionDigits:c%100?2:0,maximumFractionDigits:2})+' €'; }catch(x){ return (c%100?e.toFixed(2):''+e).replace('.',',')+' €'; } }
  // ein Stück im Satz: [Akkusativ, Nominativ, Pronomen Akkusativ]: die 1 (Ziffer), das A (Buchstabe), den Schrägstrich
  function stueck(c){ return /[0-9]/.test(c)?['die '+c,'die '+c,'sie']:c==='/'?['den Schrägstrich','der Schrägstrich','ihn']:['das '+c,'das '+c,'es']; }
  function reihe(a){ return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' und '+a[a.length-1]; }
  // Auswahlfeld des Personalisierers für die Nummer (verstecktes Feld mit dem gewählten Zeichen), nur an seinem Platz in der Produktspalte
  function wahlFeld(){
    var nm='properties['+(D&&D.sm&&D.sm.nr||'')+']', blk=zblock();
    return blk?[].filter.call(blk.querySelectorAll('input.pplr_imgg,input.pplr_monogram'),function(x){ return x.name===nm; })[0]||null:null;
  }
  // [fett, Rest]: Preis je Teil und Summe, dann die Reihenfolge. Steht das erste Zeichen schon im Auswahlfeld (Vorgabe oder Wahl des Besuchers), sagt der Satz das
  function einzelSatz(wo){
    var z=Array.from(X.zeichen), n=z.length, p=preis(), h=wahlFeld(), a=stueck(z[0]), zahl=['','ein','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf'][n]||n, b, t, rest=[], i, bad;
    if(n>1) b=(/^[0-9]+$/.test(X.zeichen)?'Jede Ziffer':'Jedes Zeichen')+' ist ein eigenes Teil'+(p?' zu '+eur(p)+', '+(n===2?'beide':'alle '+zahl)+' zusammen '+eur(p*n):'')+'.';
    else b=p?a[1].charAt(0).toUpperCase()+a[1].slice(1)+' kostet '+eur(p)+'.':'';
    for(i=1;i<n;i++) rest.push((z.slice(0,i).indexOf(z[i])>=0?'noch einmal ':'')+stueck(z[i])[0]);
    t=h&&h.value===z[0]&&!KAUF?'Unten ist '+a[1]+' schon gewählt: leg '+a[2]+' in den Warenkorb':'Wähl '+wo+' '+a[0]+' und leg '+a[2]+' in den Warenkorb';
    t+=(rest.length?', dann genauso '+reihe(rest):'')+'.';
    bad=(X.bad||[]).filter(function(c,k,l){ return c&&!/\s/.test(c)&&l.indexOf(c)===k; });
    if(bad.length) t+=' „'+bad.join('“ und „')+'“ gibt es bei diesem Schild nicht.';
    return [b,t];
  }
  document.addEventListener('click',function(e){
    var t=e.target; if(!e.isTrusted||!t||!t.closest) return;
    if(t.closest('[name=add],button[type=submit]')&&t.closest('form[action*="/cart/add"],product-form')) KAUF=true;
  },true);
  document.addEventListener('submit',function(e){ if(e.target&&e.target.matches&&e.target.matches('form[action*="/cart/add"]')) KAUF=true; },true);
  // Satz der Vorschau: was wirklich in den Feldern steht, vor dem Öffnen die Vorhersage. Eine Rolle zählt als zu lang, wenn kein Feld sie aufnehmen konnte
  function sagen(){
    if(!satz) return;
    var blk=zblock(), wo=direkt(blk)?'unten':'im nächsten Schritt', E={}, L={}, k, t='', z;
    if(document.querySelector('textarea.pplr_text,input.pplr_text')){
      for(k in EIN) E[EIN[k]]=1;
      for(k in LANG) if(!EIN[k]&&!BEN[k]&&!E[LANG[k].r]) L[LANG[k].r]=L[LANG[k].r]||LANG[k];
    } else erwartet().forEach(function(e){ if(e.max&&zeichen(e.w.replace(/\n/g,''))>e.max) L[e.r]=L[e.r]||e; else E[e.r]=1; });
    for(k in L) if(E[k]) delete L[k];
    if(D&&D.einzeln&&X.zeichen){ z=einzelSatz(wo); satz.textContent=''; if(z[0]){ k=document.createElement('b'); k.textContent=z[0]; satz.appendChild(k); } satz.appendChild(document.createTextNode((z[0]?' ':'')+z[1])); return; }
    if(L.nr) t+='Deine Nummer '+L.nr.v+' ist für dieses Schild zu lang, hier passen höchstens '+L.nr.max+' Zeichen. ';
    if(L.st) t+='Dein Text „'+L.st.v+'“ ist für dieses Schild zu lang, hier passen höchstens '+L.st.max+' Zeichen. ';
    z=E.st?'Dein Text':'Deine Nummer';
    if((L.nr||L.st)&&(E.st||E.nr)) t+=z+' steht '+wo+' schon drin, '+(L.nr?'die Nummer':'den Text')+' trägst Du dort selbst ein.';
    else if(L.nr&&L.st) t+='Trag beides '+wo+' selbst ein.';
    else if(L.nr) t+='Trag sie '+wo+' selbst ein.';
    else if(L.st) t+='Trag ihn '+wo+' kürzer ein.';
    else if(E.st||E.nr) t=z+' steht '+wo+' schon drin.';
    else t=D&&D.einzeln?'Deine Zeichen wählst Du '+wo+' einzeln aus.':'Trag Deinen Text '+wo+' ein.';
    if(X.platz) t+=' Die Beispielzeile ersetzt Du dort durch Deinen Text.';
    if(X.offen) t+=' '+X.offen+' ist noch frei, die füllst Du dort selbst.';
    satz.textContent=t;
  }
  // Vorschau des eigenen Schilds vor dem Block des Personalisierers. Der Personalisierer baut seinen Bereich beim Laden und beim Öffnen um
  // und hängt ihn dabei kurz an den Seitenanfang. Deshalb sitzt die Vorschau vor seinem Block (nicht darin) und wird nur gesetzt,
  // wenn der Block an seinem Platz in der Produktspalte steht; nach jedem Umbau prüft der Beobachter die Stelle erneut.
  // Zeigt der Block seine Felder direkt (kein Knopf, z. B. einzelne Zeichen) und steht der Kaufknopf davor, kommt die Vorschau über den Kaufknopf.
  // Ist der Block noch leer, wartet das Skript bis zu drei Sekunden, damit die Vorschau nicht erst an einer Stelle erscheint und dann springt
  var box=null;
  function einsetzen(){
    if(!box) return;
    var blk=zblock(), ziel, f;
    if(!blk) return;
    ziel=blk;
    if(!knopf(blk)){
      if(!blk.querySelector('.pplr-wrapper')&&Date.now()-t0<3000) return;
      f=blk.parentNode.querySelector('product-form')||[].filter.call(blk.parentNode.querySelectorAll('form[action*="/cart/add"]'),function(x){ return x.querySelector('[name=add],[type=submit]'); })[0];
      for(;f&&f.parentNode!==blk.parentNode;f=f.parentNode);
      if(f&&(f.compareDocumentPosition(blk)&Node.DOCUMENT_POSITION_FOLLOWING)) ziel=f;
    }
    if(box.nextElementSibling!==ziel){ ziel.parentNode.insertBefore(box,ziel); if(box.smsMalen) box.smsMalen(); }
    sagen();
  }
  var tmr; new MutationObserver(function(){ clearTimeout(tmr); tmr=setTimeout(function(){ fuellen(); einsetzen(); },120); }).observe(document.body,{childList:true,subtree:true});
  setTimeout(einsetzen,3100);

  // Zurück-Knopf: die Kollektion, aus der der Besucher kam (Referrer derselben Seite), statt der im Theme hinterlegten. Titel aus /collections/<handle>.json
  (function(){
    var m=/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?collections\/([^\/?#]+)\/?$/.exec((function(){ try{ var u=new URL(document.referrer); return u.origin===location.origin?u.pathname:''; }catch(e){ return ''; } })());
    if(!m||m[1]==='all') return;
    fetch('/collections/'+m[1]+'.json').then(function(r){ return r.ok?r.json():null; }).then(function(j){
      var c=j&&j.collection; if(!c||!c.title) return;
      [].forEach.call(document.querySelectorAll('.button-back-to-collection'),function(w){
        var bc=w.querySelector('.button-back-to-collection__text a[href^="/collections/"]:not([href="/collections/all"])'), alt=bc?bc.textContent.trim():'';
        [].forEach.call(w.querySelectorAll('a.button-back-to-collection__button'),function(a){ if(alt&&a.textContent.indexOf(alt)>=0) a.textContent=a.textContent.replace(alt,c.title); a.setAttribute('href','/collections/'+c.handle); });
        if(bc){ bc.textContent=c.title; bc.setAttribute('href','/collections/'+c.handle); }
      });
    }).catch(function(){});
  })();

  var m=location.pathname.match(/\/products\/([^\/?#]+)/), handle=me&&me.dataset.handle||(m?decodeURIComponent(m[1]):''), A=me?me.dataset.asset:'';
  function ohne(){ fertig=true; fuellen(); }   // kein Design oder Laden misslungen: Zuordnung nur über die Feldnamen
  // Variante gewechselt: Dawn schreibt die Adresse neu (nur ?variant=…). schild=1 (und strasse, nr aus dem Link) kommen wieder dazu
  document.addEventListener('change',function(e){
    if(!e.target||!e.target.closest||!e.target.closest('variant-radios,variant-selects')) return;
    var u=new URLSearchParams(location.search), neu=false;
    ['schild','strasse','nr'].forEach(function(k){ if(q.get(k)&&!u.get(k)){ u.set(k,q.get(k)); neu=true; } });
    if(neu) try{ history.replaceState(history.state,'',location.pathname+'?'+u.toString()+location.hash); }catch(x){}
  });
  if(!handle||!me||!me.dataset.js){ ohne(); return; }
  var TX=['schwarz','anthrazit','edelstahl','corten','weiss','gold'], HAUS=[A+'sm-ss-haus-1.jpg',A+'sm-ss-haus-2.jpg'], GROESSEN=['Breite','Höhe','Durchmesser','Größe','Länge'];
  var css='.sms-pdp{margin:0 0 12px;padding:10px;border-radius:14px;background:#f6f5f1;border:1px solid rgba(11,12,14,.12);text-align:left}'+
    '.sms-pdp-lp,.sms-pdp-sz{position:relative;overflow:hidden;background:#cfcdc8 no-repeat}.sms-pdp-lp.d,.sms-pdp-sz.d{background-color:#33363a}'+
    '.sms-pdp-lp{border-radius:10px;box-shadow:inset 0 0 0 1px rgba(11,12,14,.14)}.sms-pdp-sz{aspect-ratio:1/1;border-radius:8px}'+
    '.sms-pdp-auf{position:absolute}'+
    '.sms-pdp svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(calc(var(--c,1px)*.14) calc(var(--c,1px)*.55) calc(var(--c,1px)*.2) rgba(0,0,0,.5)) drop-shadow(calc(var(--c,1px)*.3) calc(var(--c,1px)*1.4) calc(var(--c,1px)*1) rgba(0,0,0,.28))}'+
    '.sms-pdp .e svg{filter:brightness(1.12) contrast(1.04) drop-shadow(calc(var(--c,1px)*.14) calc(var(--c,1px)*.55) calc(var(--c,1px)*.2) rgba(0,0,0,.6))}'+
    '.sms-pdp-ma{position:absolute;left:4px;bottom:4px;padding:.15em .45em;border-radius:5px;background:rgba(246,245,241,.94);color:#0b0c0e;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}'+
    '.sms-pdp-u{display:flow-root;margin-top:10px}.sms-pdp-u .sms-pdp-sz{float:left;width:30%;max-width:150px;margin:0 12px 4px 0}'+
    '.sms-pdp.h{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,min(40%,200px));gap:10px;align-items:start}.sms-pdp.h .sms-pdp-u{display:contents}.sms-pdp.h .sms-pdp-u .sms-pdp-sz{float:none;width:auto;max-width:none;margin:0}'+
    '.sms-pdp.h .sms-pdp-lp{grid-column:1;grid-row:1}.sms-pdp.h .sms-pdp-sz{grid-column:2;grid-row:1}.sms-pdp.h p{grid-column:1/-1}'+
    '.sms-pdp p{margin:0;font-size:13.5px;line-height:1.45;color:#4f5458}.sms-pdp b{color:#0b0c0e}';
  function gewaehlt(name){ var r=document.querySelector('input[type=radio][name="'+name+'"]:checked')||document.querySelector('select[name="options['+name+']"]'); return r?r.value:''; }
  function cm(x){ return (Math.round(x*10)/10+'').replace('.',','); }
  function kasten(b){ return 'left:'+b.left+'%;top:'+b.top+'%;width:'+b.width+'%;height:'+b.height+'%'; }
  // Lupe: FX, FY Anteil der Lupe, den das Schild höchstens füllt; PMAX px je cm (mehr macht nur den Putz unscharf, 13 reicht für die Namenszeile eines 10 cm hohen Schilds); KZIEL Versalhöhe der Namenszeile in px,
  // für die die Lupe wächst (zwischen HMIN und HMAX); HMIN ein Viertel der Breite (84 bis 120 px), neben der Szene so hoch wie die Szene
  var FX=.9, FY=.8, PMAX=13, KZIEL=11, HMAXPX=180;
  new Promise(function(ok,no){ if(window.SMSchild) return ok(); var sc=document.createElement('script'); sc.src=me.dataset.js; sc.onload=function(){ ok(); }; sc.onerror=no; document.head.appendChild(sc); })
    .then(function(){
      var tex=TX.map(function(k){ return A+'sm-ss-tex-'+k+'.jpg'; });
      return SMSchild.init({asset:A,tex:tex,deco:{ornament:A+'sm-ss-ornament.png',katze:A+'sm-ss-katze.png'},ver:me.dataset.ver}).load(function(d){ return d.handle===handle; });
    })
    .then(function(){
      var d0=SMSchild.get(handle); if(!d0){ ohne(); return; }
      // Zuordnung des Designs: Werte je Feldname, und ob es Nummer und Text selbst belegt. nd: die Nummer, wie sie dieses Schild bekommt (Namensschilder: keine)
      var d=D=zeile(d0), nd=nrIn(d)?n:'', w=SMSchild.felder(d,s,nd,mono), sm=d.sm||{}; FD={w:{},nr:false,tx:false};
      Object.keys(w).forEach(function(k){ FD.w[putz(k)]=w[k]; });
      d.props.forEach(function(p){ if(sm[p.role]&&w[sm[p.role]]!=null){ if(p.role==='nr') FD.nr=true; else FD.tx=true; } });
      // Straßenzeile statt Hauptzeile: das Design kennt je Rolle nur einen Feldnamen (den der Namenszeile), deshalb geht der Text hier über den Feldnamen mit „Straße“
      if(d!==d0){ d.props.forEach(function(p){ if(p.role!=='nr'&&sm[p.role]) delete FD.w[putz(sm[p.role])]; if(p.prop===d.haupt) FD.str=s?SMSchild.cased(s,p.case):''; }); FD.tx=false; }
      fertig=true; fuellen();
      var stl=document.createElement('style'); stl.textContent=css; document.head.appendChild(stl);
      var neu=document.createElement('div'); neu.className='sms-pdp';
      var esc=document.createElement('div'); esc.textContent=d.props.some(function(p){ return p.role!=='nr'; })?(s+' '+nd).trim():nd;   // reine Hausnummern zeigen nur die Nummer
      neu.innerHTML='<div class="sms-pdp-lp" role="img"></div><div class="sms-pdp-u"><div class="sms-pdp-sz" aria-hidden="true"></div><p><b>Dein Schild: „'+esc.innerHTML+'“</b><br><span></span> <span></span></p></div>';
      var lp=neu.firstChild, sz=neu.querySelector('.sms-pdp-sz'), info=neu.querySelector('p span'), breit=0; satz=info.nextElementSibling;
      function zeichnen(){
        var of=gewaehlt('Oberfläche'), o=of?SMSchild.surfaceIndex(of):st&&st.o>=0?st.o:0, gt='', wo, Q, Z, L, svg, voll, nenn, mass, LW, S, b, sw, sh, pc, H, cap, cx, rw, sv, g, p, off;
        [d.opt].concat(GROESSEN).some(function(k){ return k&&(gt=gewaehlt(k)); });
        if(!gt&&st&&st.g>0) gt=st.g;
        if(o<0||d.emaille) o=0;
        wo=o; if(!of&&d.hinten&&!d.emaille){ wo=d.hinten.surface||0; o=d.flaeche>0?d.flaeche:wo===2?0:2; }   // zwei Lagen ohne Oberflächen-Option: vorn Edelstahl, Wand nach der hinteren Lage (wie sm-coll-schild.js)
        if(wo===5) wo=4;   // Gold hängt an der dunklen Wand wie auf den Karten: auf der hellen sind Texte, die aus goldenen Platten geschnitten sind, kaum zu lesen
        Q=SMSchild.zeichne(d,{text:s,nr:nd,mono:mono},gt||undefined); Z=Q.leer?null:SMSchild.szene(Q,wo);
        neu.hidden=!Z; if(!Z) return;
        svg=SMSchild.svg(Q,o);
        nenn=d.mass==='h'?Q.hoehe:Q.breite; gt=parseFloat((''+gt).replace(',','.'))||0; voll=gt>0&&nenn>=gt*.985;
        mass=d.emaille?cm(Q.breite)+' × '+cm(Q.hoehe)+' cm':voll&&d.mass==='d'?'Ø '+cm(gt)+' cm':(voll?'':'ca. ')+(voll&&d.mass!=='h'?cm(gt):Math.round(Q.breite))+' × '+(voll&&d.mass==='h'?cm(gt):Math.round(Q.hoehe))+' cm';
        // Lupe LW breit: px je cm (pc) so, dass die Namenszeile KZIEL px erreicht, mindestens so, dass das Schild die kleinste Lupe füllt,
        // höchstens PMAX und so breit, wie die Lupe ist. Die Höhe folgt dem Schild (HMIN bis HMAX), ein hohes Schild wird in der höchsten Lupe kleiner.
        // Hohe Schilder (h): Lupe und Szene nebeneinander, die Lupe mindestens so hoch wie die Szene breit ist
        b=Z.box; sw=b.width/Z.cm; sh=b.height/Z.cm; cap=(Q.letter||0)*Q.cm;
        var hoch=sw<sh*1.6, IW=Math.max(0,neu.clientWidth-20)||320, HMIN, HMAX=Math.min(HMAXPX,Math.round(IW*.5)), pw;
        neu.className='sms-pdp'+(hoch?' h':'');
        LW=lp.clientWidth||(hoch?Math.round(IW-Math.min(IW*.4,200)-10):IW); breit=IW;
        HMIN=hoch?Math.round(sz.clientWidth||Math.min(IW*.4,200)):Math.max(84,Math.min(120,Math.round(IW*.25))); if(HMAX<HMIN) HMAX=HMIN; pw=LW*FX/sw;
        pc=Math.min(PMAX,pw,Math.max(cap>0?KZIEL/cap:0,Math.min(pw,HMIN*FY/sh)));
        H=Math.max(HMIN,Math.min(HMAX,Math.round(sh*pc/FY))); pc=Math.min(pc,H*FY/sh);
        L=SMSchild.lupe(Z,{w:100,h:100*H/LW,fx:sw*pc/LW,fy:sh*pc/H});
        // Tür aus der Lupe halten: reicht der Ausschnitt über den Türrahmen, rückt er nach links, das Schild steht dann rechts der Mitte
        cx=(b.left+b.width/2)/Z.cm; rw=LW/pc; sv=Math.max(0,Math.min(cx+rw/2-(Z.door/Z.cm-1),(rw-sw)/2));
        if(sv>0){ g=parseFloat(L.size)/100*LW; p=L.pos.split(' '); off=(LW-g)*parseFloat(p[0])/100; L.pos=((off+sv*pc)/(LW-g)*100).toFixed(3)+'% '+p[1]; L.box.left=Math.round((L.box.left+sv*pc/LW*100)*100)/100; }
        lp.className='sms-pdp-lp'+(Z.i?' d':'')+(o===2?' e':'');
        lp.style.cssText='height:'+H+'px;background-image:url("'+HAUS[Z.i]+'");background-size:'+L.size+';background-position:'+L.pos+';--c:'+pc.toFixed(3)+'px';
        lp.innerHTML='<div class="sms-pdp-auf" style="'+kasten(L.box)+'">'+svg+'</div>';
        S=sz.clientWidth||Math.round(Math.min(IW*.3,150));
        sz.className='sms-pdp-sz'+(Z.i?' d':'')+(o===2?' e':'');
        sz.style.cssText='background-image:url("'+HAUS[Z.i]+'");background-size:'+Z.size+';background-position:'+Z.pos+';--c:'+(S/250).toFixed(3)+'px';
        sz.innerHTML='<div class="sms-pdp-auf" style="'+kasten(Z.box)+'">'+svg+'</div><span class="sms-pdp-ma">'+mass+'</span>';   // Maß unten links in der Szene wie auf den Karten ohne Lupe
        neu.dataset.kap=(cap*pc).toFixed(1);   // Versalhöhe der Namenszeile in der Lupe, px (für Prüfungen)
        info.textContent='Die Tür daneben ist 2,10 m hoch.'; lp.setAttribute('aria-label','Dein Schild: '+esc.textContent+', '+mass);
        X.platz=!!Q.platzhalter; X.offen=s&&d.offen&&d.offen.length?(/name/i.test(d.offen[0])?'Die Namenszeile':'Eine Zeile'):'';
        X.zeichen=d.einzeln&&Q.zeichen||''; X.bad=Q.bad||[];
        sagen();
      }
      neu.smsMalen=zeichnen;
      box=neu; einsetzen(); if(!neu.parentNode) zeichnen();
      document.addEventListener('change',function(e){ var nm=e.target&&e.target.name||''; if(nm.indexOf('Oberfläche')>=0||GROESSEN.concat([d.opt||'']).some(function(k){ return k&&nm.indexOf(k)>=0; })) zeichnen(); });
      var rt; addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ if(neu.parentNode&&neu.clientWidth&&neu.clientWidth-20!==breit) zeichnen(); },150); });
    }).catch(ohne);
})();
