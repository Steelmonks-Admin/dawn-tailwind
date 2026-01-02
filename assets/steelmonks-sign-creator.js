document.addEventListener('DOMContentLoaded', () => {
  // console.log('Steelmonks Sign Creator loaded', sid);

  // ? Helper function to get an element by its ID
  function el(id) {
    return document.getElementById(id);
  }

  var upload = el('smc-upload-' + sid);
  var uploadLabel = el('smc-upload-label-' + sid);
  var uploadPrevImg = el('smc-upload-preview-' + sid);
  var uploadPrevEmpty = el('smc-upload-preview-empty-' + sid);

  var desc = el('smc-desc-' + sid);
  var finish = el('smc-finish-' + sid);
  var size = el('smc-size-' + sid);

  var pill = el('smc-pill-' + sid);
  var pillText = el('smc-pill-text-' + sid);

  var priceVal = el('smc-price-' + sid);
  var previewKicker = el('smc-preview-kicker-' + sid);

  var previewArea = el('smc-preview-area-' + sid);
  var previewEmpty = el('smc-preview-empty-' + sid);
  var previewImg = el('smc-preview-img-' + sid);

  var previewOverlay = el('smc-preview-overlay-' + sid);
  var previewOverlayTitle = el('smc-preview-overlay-title-' + sid);
  var previewOverlaySub = el('smc-preview-overlay-sub-' + sid);

  var etaWrap = el('smc-eta-' + sid);
  var etaLabel = el('smc-eta-label-' + sid);
  var etaTime = el('smc-eta-time-' + sid);

  var ctaBtn = el('smc-cta-btn-' + sid);
  var ctaLabel = el('smc-cta-label-' + sid);
  var resetBtn = el('smc-reset-btn-' + sid);

  var propImg = el('smc-prop-img-' + sid);
  var propDesc = el('smc-prop-desc-' + sid);
  var propFinish = el('smc-prop-finish-' + sid);
  var propSize = el('smc-prop-size-' + sid);
  var propRoute = el('smc-prop-route-' + sid);
  var propGen = el('smc-prop-gen-' + sid);
  var propPrice = el('smc-prop-price-' + sid);

  var modal = el('smc-modal-' + sid);
  var modalBackdrop = el('smc-modal-backdrop-' + sid);
  var modalClose = el('smc-modal-close-' + sid);
  var modalDl = el('smc-modal-dl-' + sid);

  var modalTitle = el('smc-modal-title-' + sid);
  var modalPreview = el('smc-modal-preview-' + sid);
  var modalImg = el('smc-modal-img-' + sid);
  var modalCopy = el('smc-modal-copy-' + sid);
  var modalText = el('smc-modal-text-' + sid);
  var modalAdd = el('smc-modal-add-' + sid);
  var modalAddLabel = el('smc-modal-add-label-' + sid);
  var modalLink = el('smc-modal-link-' + sid);
  var modalFoot = el('smc-modal-foot-' + sid);
  var modalActions = el('smc-modal-actions-' + sid);

  var modalHold = el('smc-modal-hold-' + sid);
  var modalHoldTime = el('smc-modal-hold-time-' + sid);
  var modalHoldBarfill = el('smc-modal-hold-barfill-' + sid);

  var generatorId = '';
  var lastMockUrl = '';
  var lastEntUrl = '';

  var checkoutReady = false;

  var priceReady = false;
  var priceRequested = false;
  var pendingPriceValue = '';

  var state = 'init';
  var locked = false;

  var etaTick = null;
  var etaEndsAt = 0;

  var holdTick = null;
  var holdEndsAt = 0;

  var pollInFlight = false;

  var timerPriceA = null;
  var timerEntwurf = null;
  var timerMock = null;
  var mockPoll = null;
  var mockPollEndsAt = 0;

  var previewDone = false;
  var previewInFlight = false;

  var forceMockLoading = false;
  var runStartedAt = 0;

  var TOTAL_MS = 120000;
  var FETCH_TIMEOUT_MS = 25000;

  var TIME_PRICE_MS = 5000;
  var TIME_ENTWURF_POLL_MS = 70000;

  var MOCK_POLL_START_MS = 90000;
  var MOCK_POLL_END_MS = 240000;
  var MOCK_POLL_EVERY_MS = 10000;

  var DEFAULT_ENDPOINTS = {
    run: '/apps/creator/run-creator',
    preview: '/apps/creator/run-creator-preview',
    price: '/apps/creator/get-creator-price',
    sign: '/apps/creator/get-creator-sign',
    product: '/apps/creator/get-creator-product',
  };

  var ENDPOINTS = (function () {
    var cfg = window.SMCREATOR_ENDPOINTS || {};
    var merged = {};
    Object.keys(DEFAULT_ENDPOINTS).forEach(function (k) {
      merged[k] = DEFAULT_ENDPOINTS[k];
    });
    try {
      Object.keys(cfg).forEach(function (k) {
        if (cfg[k] != null && String(cfg[k]).trim() !== '') {
          merged[k] = cfg[k];
        }
      });
    } catch (_e) {}
    return merged;
  })();

  function fmtMMSS(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  function stopEta() {
    if (etaTick) clearInterval(etaTick);
    etaTick = null;
    etaEndsAt = 0;
    if (etaWrap) etaWrap.style.display = 'none';
  }

  function onEtaFinished() {
    if (state === 'creating' && !lastMockUrl) {
      forceMockLoading = true;
      setPillState('work', 'Vorschau wird geladen');
      setPreviewOverlay(true, 'Vorschau wird geladen', 'Bitte warten');
      setPreviewLoading(true);
    }
  }

  function startEta(label, ms) {
    stopEta();
    etaEndsAt = Date.now() + ms;
    if (etaLabel) etaLabel.textContent = label || 'Geschätzte Zeit';
    if (etaWrap) etaWrap.style.display = 'flex';
    function tick() {
      var left = etaEndsAt - Date.now();
      if (etaTime) etaTime.textContent = fmtMMSS(left);
      if (left <= 0) {
        stopEta();
        onEtaFinished();
      }
    }
    tick();
    etaTick = setInterval(tick, 1000);
  }

  function stopHold() {
    if (holdTick) clearInterval(holdTick);
    holdTick = null;
    holdEndsAt = 0;
    if (modalHold) modalHold.style.display = 'none';
  }

  function startHold30() {
    stopHold();
    holdEndsAt = Date.now() + 30 * 60 * 1000;
    if (modalHold) modalHold.style.display = 'block';
    function tick() {
      var left = holdEndsAt - Date.now();
      if (modalHoldTime) modalHoldTime.textContent = fmtMMSS(left);
      var total = 30 * 60 * 1000;
      var pct = Math.max(0, Math.min(1, left / total));
      if (modalHoldBarfill)
        modalHoldBarfill.style.width = (pct * 100).toFixed(2) + '%';
      if (left <= 0) {
        if (modalHoldTime) modalHoldTime.textContent = '00:00';
        if (modalHoldBarfill) modalHoldBarfill.style.width = '0%';
        clearInterval(holdTick);
        holdTick = null;
      }
    }
    tick();
    holdTick = setInterval(tick, 1000);
  }

  function setPillState(kind, text) {
    if (pill) pill.setAttribute('data-state', kind || 'idle');
    if (pillText) pillText.textContent = text || 'Bereit';
  }

  function setPreviewLoading(on) {
    if (!previewArea) return;
    previewArea.setAttribute('data-loading', on ? '1' : '0');
  }

  function setSoftBlur(on) {
    if (!previewArea) return;
    previewArea.setAttribute('data-softblur', on ? '1' : '0');
  }

  function setFade(on) {
    if (!previewArea) return;
    previewArea.setAttribute('data-fade', on ? '1' : '0');
  }

  function setPreviewOverlay(on, title, sub) {
    if (previewOverlay) previewOverlay.style.display = on ? 'flex' : 'none';
    if (previewOverlayTitle && title) previewOverlayTitle.textContent = title;
    if (previewOverlaySub && sub) previewOverlaySub.textContent = sub;
  }

  function setClickable(on) {
    if (!previewArea) return;
    previewArea.setAttribute('data-clickable', on ? '1' : '0');
  }

  function setModalPreviewLoading(on) {
    if (!modalPreview) return;
    modalPreview.setAttribute('data-loading', on ? '1' : '0');
  }

  function hasImage() {
    return !!(upload && upload.files && upload.files[0]);
  }

  function routeValue() {
    return hasImage() ? 'Edit' : 'Generate';
  }

  function lockInputs(on) {
    if (!upload || !desc || !finish || !size) return;
    locked = !!on;

    upload.disabled = locked;
    desc.disabled = locked;
    finish.disabled = locked;
    size.disabled = locked;

    if (resetBtn) resetBtn.style.display = locked ? 'inline-flex' : 'none';
  }

  function updateProps() {
    if (propDesc) propDesc.value = desc && desc.value ? desc.value : '';
    if (propFinish)
      propFinish.value = finish && finish.value ? finish.value : '';
    if (propSize) propSize.value = size && size.value ? size.value : '';
    if (propRoute) propRoute.value = routeValue();
    if (propGen) propGen.value = generatorId || '';
    if (propImg)
      propImg.value =
        upload && upload.files && upload.files[0] ? upload.files[0].name : '';
    if (propPrice) propPrice.value = pendingPriceValue || '';
  }

  function normalizePriceDisplay(p) {
    var s = p == null ? '' : String(p).trim();
    if (!s) return '';
    if (s.indexOf('€') !== -1) return s;
    if (/[0-9]/.test(s)) return s + ' €';
    return s;
  }

  function applyPriceDisplay() {
    if (!priceVal) return;
    if (pendingPriceValue) {
      if (lastMockUrl) {
        priceVal.textContent = pendingPriceValue;
      } else {
        priceVal.textContent = 'Preis berechnet';
      }
    } else {
      priceVal.textContent = 'Den Preis berechnen wir nach dem Entwurf.';
    }
  }

  function setPrice(txt) {
    var out = normalizePriceDisplay(txt);
    if (out) {
      pendingPriceValue = out;
      priceReady = true;
      updateProps();
      applyPriceDisplay();
      if (state === 'creating' && !lastMockUrl) {
        setPillState('work', 'Preis berechnet');
      }
      return;
    }
    pendingPriceValue = '';
    priceReady = false;
    updateProps();
    applyPriceDisplay();
  }

  function setPriceCalculating() {
    if (priceVal) priceVal.textContent = 'Preis wird berechnet…';
    pendingPriceValue = '';
    priceReady = false;
    updateProps();
  }

  function setCta(label, enabled) {
    if (ctaLabel) ctaLabel.textContent = label || 'Entwurf erstellen';
    if (ctaBtn) ctaBtn.disabled = !enabled;
  }

  function setCtaFromState() {
    if (state === 'init') {
      var ok = desc && desc.value && desc.value.trim().length >= 5;
      setCta('Entwurf erstellen', ok && !locked);
      return;
    }
    if (state === 'creating') {
      setCta('Wird erstellt', false);
      return;
    }
    if (state === 'ready') {
      setCta('Schild ansehen', true);
      return;
    }
    setCta('Wird erstellt', false);
  }

  function showPreview(url) {
    if (!url) return;
    if (previewImg) {
      setFade(true);
      previewImg.onload = function () {
        setFade(false);
        previewImg.onload = null;
      };
      previewImg.src = url;
      previewImg.classList.remove('smc__preview-img--hidden');
    }
    if (previewEmpty) previewEmpty.style.display = 'none';
  }

  function showPlaceholder(text) {
    if (previewEmpty) {
      previewEmpty.textContent = text || 'Starte zuerst den Entwurf';
      previewEmpty.style.display = 'block';
    }
    if (previewImg) previewImg.classList.add('smc__preview-img--hidden');
  }

  function handleUploadUI() {
    if (!upload || !uploadLabel) return;

    if (upload.files && upload.files[0]) {
      uploadLabel.textContent = upload.files[0].name;
      var file = upload.files[0];

      if (file.type && file.type.indexOf('image') === 0) {
        var r = new FileReader();
        r.onload = function (e) {
          if (uploadPrevImg && uploadPrevEmpty) {
            uploadPrevImg.src = e && e.target ? e.target.result : '';
            uploadPrevImg.style.display = 'block';
            uploadPrevEmpty.style.display = 'none';
          }
        };
        r.readAsDataURL(file);
      }
    } else {
      uploadLabel.textContent = 'Noch kein Upload';
      if (uploadPrevImg && uploadPrevEmpty) {
        uploadPrevImg.removeAttribute('src');
        uploadPrevImg.style.display = 'none';
        uploadPrevEmpty.style.display = 'flex';
      }
    }
  }

  function formDataPayload(extra) {
    var fd = new FormData();

    if (upload && upload.files && upload.files[0])
      fd.append('Bild', upload.files[0]);
    else fd.append('Bild', '');

    fd.append('Beschreibung', desc && desc.value ? desc.value : '');
    fd.append('Oberfläche', finish && finish.value ? finish.value : '');
    fd.append('Größe', size && size.value ? size.value : '');
    fd.append('Route', routeValue());

    fd.append('generator_id', generatorId || '');
    fd.append('section_id', sid);

    if (extra && typeof extra === 'object') {
      try {
        Object.keys(extra).forEach(function (k) {
          fd.append(k, extra[k]);
        });
      } catch (_e) {}
    }

    return fd;
  }

  async function postText(url, fd) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var t = null;
    if (ctrl) {
      t = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (_e) {}
      }, FETCH_TIMEOUT_MS);
    }

    var res = await fetch(url, {
      method: 'POST',
      body: fd,
      signal: ctrl ? ctrl.signal : undefined,
    });

    if (t) clearTimeout(t);

    var text = await res.text();
    if (!res.ok) throw new Error(text || 'HTTP ' + res.status);
    return text || '';
  }

  function tryParseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function extractIdFromText(text) {
    var m = text.match(/"id"\s*:\s*"([^"]+)"/i);
    return m ? m[1] : '';
  }

  function toGoogleDriveUrl(id) {
    if (!id) return '';
    return 'https://lh3.googleusercontent.com/d/' + id;
  }

  function normalizeImageUrl(candidate) {
    if (!candidate) return '';
    var c = String(candidate).trim();
    if (/^https?:\/\//i.test(c)) return c;
    if (/^[a-zA-Z0-9_-]{10,}$/.test(c)) return toGoogleDriveUrl(c);
    return '';
  }

  function extractField(j, key) {
    function pick(o) {
      if (!o || typeof o !== 'object') return '';
      if (o[key] != null) return String(o[key]);
      return '';
    }
    if (!j) return '';
    if (Array.isArray(j) && j[0]) return pick(j[0]);
    return pick(j);
  }

  function extractPriceValue(j, raw) {
    var keys = [
      'Preis',
      'preis',
      'price',
      'display_price',
      'price_display',
      'amount',
      'value',
    ];
    function pick(o) {
      if (!o || typeof o !== 'object') return '';
      for (var i = 0; i < keys.length; i++) {
        if (o[keys[i]] != null && String(o[keys[i]]).trim() !== '')
          return String(o[keys[i]]);
      }
      return '';
    }
    if (j) {
      if (Array.isArray(j) && j[0]) {
        var p0 = pick(j[0]);
        if (p0) return p0;
      }
      var p = pick(j);
      if (p) return p;
    }
    var m = raw && raw.match(/\d+([.,]\d+)?\s?€|€\s?\d+([.,]\d+)?/);
    return m ? m[0] : '';
  }

  function clearTimers() {
    if (timerPriceA) clearTimeout(timerPriceA);
    if (timerEntwurf) clearTimeout(timerEntwurf);
    if (timerMock) clearTimeout(timerMock);
    timerPriceA = timerEntwurf = timerMock = null;

    if (mockPoll) clearInterval(mockPoll);
    mockPoll = null;
    mockPollEndsAt = 0;
  }

  function lockScroll(on) {
    try {
      if (on) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    } catch (_e) {}
  }

  function setModalMode(mode) {
    if (modal) modal.setAttribute('data-mode', mode || 'product');
  }

  function closeModal() {
    if (modal) modal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (((modal && modal.getAttribute('data-mode')) || '') === 'product') {
      stopHold();
    }
  }

  async function downloadUrl(url, filename) {
    if (!url) return;
    var name =
      filename || 'steelmonks-vorschau-' + (generatorId || 'download') + '.png';
    try {
      var res = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!res.ok) throw new Error('download');
      var blob = await res.blob();
      var obj = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = obj;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        try {
          URL.revokeObjectURL(obj);
        } catch (_e) {}
      }, 8000);
    } catch (_e) {
      try {
        var a2 = document.createElement('a');
        a2.href = url;
        a2.download = name;
        document.body.appendChild(a2);
        a2.click();
        a2.remove();
      } catch (_e2) {
        window.open(url, '_blank');
      }
    }
  }

  function openModalViewer(kind, url) {
    if (!url) return;
    setModalMode('viewer');

    if (modalTitle) modalTitle.textContent = kind || 'Vorschau';

    if (modalCopy) modalCopy.style.display = 'none';
    if (modalActions) modalActions.style.display = 'none';
    if (modalFoot) modalFoot.style.display = 'none';
    if (modalHold) modalHold.style.display = 'none';

    if (modalImg) modalImg.src = url;

    if (modalDl) {
      modalDl.style.display = 'inline-flex';
      modalDl.onclick = function () {
        downloadUrl(
          url,
          'steelmonks-vorschau-' + (generatorId || 'download') + '.png',
        );
      };
    }

    if (modal) modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  }

  function openModalProduct() {
    setModalMode('product');

    if (modalCopy) modalCopy.style.display = 'flex';
    if (modalActions) modalActions.style.display = 'flex';
    if (modalFoot) modalFoot.style.display = 'block';

    if (modalTitle) modalTitle.textContent = 'Schild ansehen';
    if (modalImg && lastMockUrl) modalImg.src = lastMockUrl;

    if (modalText)
      modalText.textContent =
        'Dein Schild ist bereit – wir erstellen gerade dein Produkt.';

    if (modalDl) {
      modalDl.style.display = 'inline-flex';
      modalDl.onclick = function () {
        if (lastMockUrl)
          downloadUrl(
            lastMockUrl,
            'steelmonks-vorschau-' + (generatorId || 'download') + '.png',
          );
      };
    }

    if (modal) modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  }

  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape') closeModal();
  });

  function statusToPill(status) {
    var s = (status || '').trim();

    if (forceMockLoading && !lastMockUrl) {
      if (
        s === 'Entwurf ist fertig' ||
        s === 'Design ist Fertig' ||
        s === 'Entwurf ist fertig.' ||
        s === 'Design ist fertig'
      ) {
        return;
      }
    }

    if (!s) {
      setPillState('work', 'Bitte warten');
      return;
    }
    if (s === 'Fehlgeschlagen') {
      setPillState('bad', 'Fehlgeschlagen');
      return;
    }
    if (s === 'Vorschau ist fertig') {
      setPillState('ok', 'Vorschau ist fertig');
      return;
    }
    if (s === 'Entwurf ist fertig') {
      setPillState('work', 'Entwurf ist fertig');
      return;
    }
    setPillState('work', s);
  }

  async function runPriceOnce() {
    if (!generatorId) return;
    if (priceRequested) return;
    priceRequested = true;
    try {
      var raw = await postText(ENDPOINTS.price, formDataPayload());
      var j = tryParseJson(raw);
      var p = extractPriceValue(j, raw);
      if (p) setPrice(p);
    } catch (_e) {
      priceRequested = true;
    }
  }

  async function runCreatorPreviewOnce(reason) {
    if (!generatorId) return;
    if (previewDone) return;
    if (previewInFlight) return;

    previewInFlight = true;
    try {
      var fd = formDataPayload({ reason: reason || '' });
      await postText(ENDPOINTS.preview, fd);
      previewDone = true;
    } catch (_e) {
    } finally {
      previewInFlight = false;
    }
  }

  async function fetchSignOnce(mode) {
    if (!generatorId) return null;
    if (pollInFlight) return null;
    pollInFlight = true;
    try {
      var raw = await postText(ENDPOINTS.sign, formDataPayload());
      var j = tryParseJson(raw);

      var statusText = (extractField(j, 'Status') || '').trim();
      statusToPill(statusText);

      var signPrice = extractField(j, 'Preis');
      if (signPrice && !pendingPriceValue) {
        setPrice(signPrice);
      }

      if (statusText === 'Fehlgeschlagen') {
        stopEta();
        clearTimers();
        setPreviewLoading(false);
        setPreviewOverlay(false);
        setClickable(false);
        setSoftBlur(false);
        showPlaceholder('Fehlgeschlagen. Bitte Neu anfangen');
        pollInFlight = false;
        return { failed: true, json: j };
      }

      if (mode === 'entwurf' || mode === 'any') {
        var entUrl = normalizeImageUrl(extractField(j, 'Entwurf'));
        if (entUrl) {
          lastEntUrl = entUrl;
          setPreviewLoading(false);
          setClickable(false);
          setSoftBlur(true);
          showPreview(entUrl);
          setPreviewOverlay(
            true,
            'Wir finalisieren dein Design',
            'Bitte warten',
          );
        }
      }

      if (mode === 'mock' || mode === 'any') {
        var mockUrl = normalizeImageUrl(extractField(j, 'Mock Up'));
        if (mockUrl) {
          lastMockUrl = mockUrl;

          forceMockLoading = false;

          stopEta();
          clearTimers();

          setPreviewLoading(false);
          setSoftBlur(false);
          setPreviewOverlay(false);
          setClickable(true);

          applyPriceDisplay();

          if (previewKicker) previewKicker.textContent = 'Vorschau';
          showPreview(mockUrl);

          state = 'ready';
          setCtaFromState();

          pollInFlight = false;
          return { ok: true, mock: true, json: j };
        }
      }

      pollInFlight = false;
      return { ok: true, json: j };
    } catch (_e) {
      pollInFlight = false;
      return null;
    }
  }

  function startMockPollingWindow() {
    if (mockPoll) return;

    var hardStart = runStartedAt
      ? runStartedAt + MOCK_POLL_START_MS
      : Date.now();
    var hardEnd = runStartedAt
      ? runStartedAt + MOCK_POLL_END_MS
      : Date.now() + 150000;

    mockPollEndsAt = hardEnd;

    if (Date.now() >= hardStart) {
      fetchSignOnce('mock');
    }

    mockPoll = setInterval(async function () {
      if (!generatorId) return;
      if (Date.now() > mockPollEndsAt) {
        clearInterval(mockPoll);
        mockPoll = null;
        return;
      }
      await fetchSignOnce('mock');
    }, MOCK_POLL_EVERY_MS);
  }

  async function startRunCreator() {
    var d = desc && desc.value ? desc.value.trim() : '';
    if (d.length < 5) return;

    checkoutReady = false;

    priceReady = false;
    priceRequested = false;
    pendingPriceValue = '';

    generatorId = '';
    lastMockUrl = '';
    lastEntUrl = '';

    previewDone = false;
    previewInFlight = false;

    forceMockLoading = false;
    runStartedAt = Date.now();

    stopEta();
    stopHold();
    clearTimers();
    closeModal();

    setClickable(false);
    setSoftBlur(false);

    setPriceCalculating();
    setPillState('work', 'Wir starten…');
    lockInputs(true);

    state = 'creating';
    setCtaFromState();

    if (previewKicker) previewKicker.textContent = 'Vorschau';
    showPlaceholder('Wir erstellen gerade deine Vorschau');
    setPreviewLoading(true);
    setFade(false);
    setPreviewOverlay(true, 'Bitte warten', 'Wir erstellen deine Vorschau');

    startEta('Geschätzte Zeit', TOTAL_MS);

    updateProps();

    try {
      var raw = await postText(ENDPOINTS.run, formDataPayload());
      var id = extractIdFromText(raw);

      if (!id) {
        generatorId = '';
        updateProps();

        stopEta();
        clearTimers();
        setPreviewLoading(false);
        setPreviewOverlay(false);
        showPlaceholder('Starte zuerst den Entwurf');

        state = 'init';
        setCtaFromState();
        setPillState('bad', 'Es fehlt eine ID, bitte Neu anfangen');
        lockInputs(true);
        return;
      }

      generatorId = id;
      updateProps();

      setPillState('work', 'Wird erstellt');

      runCreatorPreviewOnce('Sofort nach run-creator');

      timerPriceA = setTimeout(function () {
        setPillState('work', 'Preis wird berechnet');
        runPriceOnce();
      }, TIME_PRICE_MS);

      timerEntwurf = setTimeout(async function () {
        setPillState('work', 'Entwurf wird geladen');
        await fetchSignOnce('entwurf');
      }, TIME_ENTWURF_POLL_MS);

      timerMock = setTimeout(function () {
        setPillState('work', 'Finale Vorschau wird geladen');
        startMockPollingWindow();
      }, MOCK_POLL_START_MS);
    } catch (_e) {
      generatorId = '';
      updateProps();

      stopEta();
      clearTimers();

      setPreviewLoading(false);
      setPreviewOverlay(false);
      showPlaceholder('Starte zuerst den Entwurf');

      state = 'init';
      setCtaFromState();
      setPillState('bad', 'Fehler beim Start, bitte Neu anfangen');
      lockInputs(true);
    }
  }

  function safeProductJsonUrl(productUrl) {
    try {
      var u = new URL(productUrl, window.location.origin);
      return u.origin + u.pathname.replace(/\/$/, '') + '.js';
    } catch (_e) {
      return '';
    }
  }

  async function addToCartFromProductUrl(productUrl) {
    var jsonUrl = safeProductJsonUrl(productUrl);
    if (!jsonUrl) return { ok: false };

    var pRes = await fetch(jsonUrl, {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!pRes.ok) return { ok: false };

    var p = await pRes.json();
    var variants = p && p.variants ? p.variants : [];
    if (!variants.length) return { ok: false };

    var v =
      variants.find(function (x) {
        return x && x.available;
      }) || variants[0];
    if (!v || !v.id) return { ok: false };

    var properties = {
      Beschreibung: desc && desc.value ? desc.value : '',
      Oberfläche: finish && finish.value ? finish.value : '',
      Größe: size && size.value ? size.value : '',
      Route: routeValue(),
      'Generator ID': generatorId || '',
      Preis: pendingPriceValue || '',
    };

    var payload = { id: v.id, quantity: 1, properties: properties };

    var addRes = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
    });

    if (!addRes.ok) return { ok: false };
    return { ok: true };
  }

  async function startProductModal() {
    if (!generatorId || !lastMockUrl) return;

    setPillState('work', 'Produkt wird vorbereitet');
    setModalPreviewLoading(true);

    if (modalLink) {
      modalLink.href = '#';
      modalLink.style.display = 'none';
    }
    if (modalFoot) modalFoot.textContent = '';
    if (modalAdd) modalAdd.disabled = true;

    openModalProduct();

    try {
      var raw = await postText(ENDPOINTS.product, formDataPayload());
      var j = tryParseJson(raw);

      var productUrl = (
        extractField(j, 'Product URL') ||
        extractField(j, 'product_url') ||
        extractField(j, 'url') ||
        ''
      ).trim();
      var productName = (
        extractField(j, 'Product Name') ||
        extractField(j, 'product_name') ||
        extractField(j, 'name') ||
        ''
      ).trim();

      setModalPreviewLoading(false);

      if (!productUrl) {
        setPillState('bad', 'Produkt Link fehlt');
        if (modalText) modalText.textContent = 'Kein Product URL erhalten.';
        if (modalAdd) modalAdd.disabled = false;
        return;
      }

      if (modalLink) {
        modalLink.href = productUrl;
        modalLink.style.display = 'none';
      }
      if (modalFoot) modalFoot.textContent = productUrl;

      setPillState('ok', 'Produkt bereit');

      if (modalText)
        modalText.textContent = productName ? productName : 'Produkt bereit';

      startHold30();

      checkoutReady = false;
      if (modalAddLabel) modalAddLabel.textContent = 'Zum Warenkorb hinzufügen';
      if (modalAdd) {
        modalAdd.disabled = false;
        modalAdd.onclick = async function () {
          if (checkoutReady) {
            window.location.href = '/checkout';
            return;
          }

          try {
            if (modalAdd) modalAdd.setAttribute('data-loading', '1');
            setModalPreviewLoading(true);
            setPillState('work', 'Wird in den Warenkorb gelegt');

            var added = await addToCartFromProductUrl(productUrl);

            setModalPreviewLoading(false);
            if (modalAdd) modalAdd.setAttribute('data-loading', '0');

            if (added && added.ok) {
              checkoutReady = true;
              setPillState('ok', 'Im Warenkorb');

              if (modalText) {
                modalText.textContent = productName
                  ? productName
                  : 'Produkt bereit';
              }
              if (modalAddLabel) modalAddLabel.textContent = 'Zum Checkout';
              return;
            }

            setPillState('ok', 'Weiter');
            if (modalText)
              modalText.textContent =
                'Öffne das Produkt und lege es dort in den Warenkorb.';
          } catch (_e) {
            setModalPreviewLoading(false);
            if (modalAdd) modalAdd.setAttribute('data-loading', '0');
            setPillState('bad', 'Warenkorb Fehler');
            if (modalText)
              modalText.textContent =
                'Beim Hinzufügen zum Warenkorb ist etwas schiefgelaufen.';
          }
        };
      }
    } catch (_e) {
      setModalPreviewLoading(false);
      setPillState('bad', 'Produkt Fehler');
      if (modalText)
        modalText.textContent =
          'Beim Erstellen des Produkts ist etwas schiefgelaufen.';
      if (modalAdd) modalAdd.disabled = false;
    }
  }

  function resetAll() {
    clearTimers();
    stopEta();
    stopHold();

    generatorId = '';
    lastMockUrl = '';
    lastEntUrl = '';
    checkoutReady = false;

    priceReady = false;
    priceRequested = false;
    pendingPriceValue = '';

    previewDone = false;
    previewInFlight = false;

    forceMockLoading = false;
    runStartedAt = 0;

    setClickable(false);
    setSoftBlur(false);
    lockInputs(false);

    setPillState('idle', 'Bereit');
    if (priceVal)
      priceVal.textContent = 'Den Preis berechnen wir nach dem Entwurf.';

    if (previewKicker) previewKicker.textContent = 'Vorschau';
    showPlaceholder('Starte zuerst den Entwurf');
    setPreviewLoading(false);
    setPreviewOverlay(false);
    setFade(false);

    if (modal) modal.setAttribute('aria-hidden', 'true');
    lockScroll(false);

    state = 'init';
    setCtaFromState();
    updateProps();
  }

  if (resetBtn) resetBtn.addEventListener('click', resetAll);

  if (upload)
    upload.addEventListener('change', function () {
      if (locked) return;
      handleUploadUI();
      updateProps();
    });

  if (desc)
    desc.addEventListener('input', function () {
      if (locked) return;
      setCtaFromState();
      updateProps();
    });

  if (finish)
    finish.addEventListener('change', function () {
      if (locked) return;
      updateProps();
    });
  if (size)
    size.addEventListener('change', function () {
      if (locked) return;
      updateProps();
    });

  if (previewArea)
    previewArea.addEventListener('click', function () {
      if (!lastMockUrl) return;
      if (previewArea.getAttribute('data-clickable') !== '1') return;
      openModalViewer('Vorschau', lastMockUrl);
    });

  if (ctaBtn)
    ctaBtn.addEventListener('click', function () {
      if (state === 'init') startRunCreator();
      else if (state === 'ready') startProductModal();
    });

  handleUploadUI();
  updateProps();
  if (priceVal)
    priceVal.textContent = 'Den Preis berechnen wir nach dem Entwurf.';
  setPillState('idle', 'Bereit');
  if (previewKicker) previewKicker.textContent = 'Vorschau';
  showPlaceholder('Starte zuerst den Entwurf');
  setPreviewLoading(false);
  setSoftBlur(false);
  setPreviewOverlay(false);
  setFade(false);

  lockInputs(false);
  state = 'init';
  setCtaFromState();
});
