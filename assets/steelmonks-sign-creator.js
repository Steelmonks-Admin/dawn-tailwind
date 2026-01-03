document.addEventListener('DOMContentLoaded', () => {
  // ============================================================================
  // Configuration & Constants
  // ============================================================================
  const TIMING = {
    TOTAL_MS: 120000,
    FETCH_TIMEOUT_MS: 25000,
    TIME_PRICE_MS: 5000,
    TIME_ENTWURF_POLL_MS: 70000,
    MOCK_POLL_START_MS: 90000,
    MOCK_POLL_END_MS: 240000,
    MOCK_POLL_EVERY_MS: 10000,
    HOLD_DURATION_MS: 30 * 60 * 1000,
  };

  const DEFAULT_ENDPOINTS = {
    run: '/apps/creator/run-creator',
    preview: '/apps/creator/run-creator-preview',
    price: '/apps/creator/get-creator-price',
    sign: '/apps/creator/get-creator-sign',
    product: '/apps/creator/get-creator-product',
  };

  const ENDPOINTS = (() => {
    const cfg = window.SMCREATOR_ENDPOINTS || {};
    const merged = { ...DEFAULT_ENDPOINTS };
    try {
      Object.keys(cfg).forEach((k) => {
        if (cfg[k] != null && String(cfg[k]).trim() !== '') {
          merged[k] = cfg[k];
        }
      });
    } catch {}
    return merged;
  })();

  const STATUS_TEXTS = {
    FAILED: 'Fehlgeschlagen',
    PREVIEW_READY: 'Vorschau ist fertig',
    DESIGN_READY: [
      'Entwurf ist fertig',
      'Design ist Fertig',
      'Entwurf ist fertig.',
      'Design ist fertig',
    ],
  };

  // ============================================================================
  // Utility Functions
  // ============================================================================
  const el = (id) => document.getElementById(id);
  const cls = (element, className) => element.classList.add(className);

  const fmtMMSS = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const tryParseJson = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const extractIdFromText = (text) => {
    const m = text.match(/"id"\s*:\s*"([^"]+)"/i);
    return m ? m[1] : '';
  };

  const toGoogleDriveUrl = (id) =>
    id ? `https://lh3.googleusercontent.com/d/${id}` : '';

  const normalizeImageUrl = (candidate) => {
    if (!candidate) return '';
    const c = String(candidate).trim();
    if (/^https?:\/\//i.test(c)) return c;
    if (/^[a-zA-Z0-9_-]{10,}$/.test(c)) return toGoogleDriveUrl(c);
    return '';
  };

  const extractField = (j, key) => {
    const pick = (o) =>
      o && typeof o === 'object' && o[key] != null ? String(o[key]) : '';
    if (!j) return '';
    if (Array.isArray(j) && j[0]) return pick(j[0]);
    return pick(j);
  };

  const extractPriceValue = (j, raw) => {
    const keys = [
      'Preis',
      'preis',
      'price',
      'display_price',
      'price_display',
      'amount',
      'value',
    ];
    const pick = (o) => {
      if (!o || typeof o !== 'object') return '';
      for (const key of keys) {
        if (o[key] != null && String(o[key]).trim() !== '')
          return String(o[key]);
      }
      return '';
    };

    if (j) {
      if (Array.isArray(j) && j[0]) {
        const p0 = pick(j[0]);
        if (p0) return p0;
      }
      const p = pick(j);
      if (p) return p;
    }
    const m = raw && raw.match(/\d+([.,]\d+)?\s?€|€\s?\d+([.,]\d+)?/);
    return m ? m[0] : '';
  };

  const normalizePriceDisplay = (p) => {
    const s = p == null ? '' : String(p).trim();
    if (!s) return '';
    if (s.includes('€')) return s;
    if (/[0-9]/.test(s)) return `${s} €`;
    return s;
  };

  const safeProductJsonUrl = (productUrl) => {
    try {
      const u = new URL(productUrl, window.location.origin);
      return `${u.origin}${u.pathname.replace(/\/$/, '')}.js`;
    } catch {
      return '';
    }
  };

  // ============================================================================
  // DOM Elements
  // ============================================================================
  const elements = {
    // Form inputs
    upload: el('smc-upload'),
    uploadLabel: el('smc-upload-label'),
    uploadPrevImg: el('smc-upload-preview'),
    uploadPrevEmpty: el('smc-upload-preview-empty'),
    desc: el('smc-desc'),
    finish: el('smc-finish'),
    size: el('smc-size'),

    // Status pill
    pill: el('smc-pill'),
    pillText: el('smc-pill-text'),

    // Price
    priceVal: el('smc-price'),

    // Preview
    previewKicker: el('smc-preview-kicker'),
    previewArea: el('smc-preview-area'),
    previewEmpty: el('smc-preview-empty'),
    previewImg: el('smc-preview-img'),
    previewOverlay: el('smc-preview-overlay'),
    previewOverlayTitle: el('smc-preview-overlay-title'),
    previewOverlaySub: el('smc-preview-overlay-sub'),

    // ETA
    etaWrap: el('smc-eta'),
    etaLabel: el('smc-eta-label'),
    etaTime: el('smc-eta-time'),

    // Buttons
    ctaBtn: el('smc-cta-btn'),
    ctaLabel: el('smc-cta-label'),
    resetBtn: el('smc-reset-btn'),
    openBtn: el('smc-open-btn'),
    closeBtn: el('smc-close-btn'),

    // Hidden form properties
    propImg: el('smc-prop-img'),
    propDesc: el('smc-prop-desc'),
    propFinish: el('smc-prop-finish'),
    propSize: el('smc-prop-size'),
    propRoute: el('smc-prop-route'),
    propGen: el('smc-prop-gen'),
    propPrice: el('smc-prop-price'),

    // Modal
    modal: el('smc-modal'),
    modalBackdrop: el('smc-modal-backdrop'),
    modalClose: el('smc-modal-close'),
    modalDl: el('smc-modal-dl'),
    modalTitle: el('smc-modal-title'),
    modalPreview: el('smc-modal-preview'),
    modalImg: el('smc-modal-img'),
    modalCopy: el('smc-modal-copy'),
    modalText: el('smc-modal-text'),
    modalAdd: el('smc-modal-add'),
    modalAddLabel: el('smc-modal-add-label'),
    modalLink: el('smc-modal-link'),
    modalFoot: el('smc-modal-foot'),
    modalActions: el('smc-modal-actions'),
    modalHold: el('smc-modal-hold'),
    modalHoldTime: el('smc-modal-hold-time'),
    modalHoldBarfill: el('smc-modal-hold-barfill'),

    // Main containers
    smc: el('smc'),
    smcContainer: el('smc-container'),
  };

  // Set placeholder text
  if (elements.desc) {
    elements.desc.placeholder = `Lass Deiner Vorstellung freien Lauf. Probier doch:
• Ein schönes Familienschild mit unserem Labradoodle wie aus dem Foto
• Mein Familienwappen wie aus der Zeichnung
• Mach mir ein Schild für meinen Bruder, er liebt Schlagzeug und Croissants
• Oder ein Hausschild mit der Nummer 22 und einem Ritter`;
  }

  // ============================================================================
  // State Management
  // ============================================================================
  const state = {
    current: 'init',
    locked: false,
    generatorId: '',
    lastMockUrl: '',
    lastEntUrl: '',
    checkoutReady: false,
    priceReady: false,
    priceRequested: false,
    pendingPriceValue: '',
    previewDone: false,
    previewInFlight: false,
    forceMockLoading: false,
    runStartedAt: 0,
    pollInFlight: false,
  };

  const timers = {
    etaTick: null,
    etaEndsAt: 0,
    holdTick: null,
    holdEndsAt: 0,
    priceA: null,
    entwurf: null,
    mock: null,
    mockPoll: null,
    mockPollEndsAt: 0,
  };

  // ============================================================================
  // Timer Management
  // ============================================================================
  const timerManager = {
    clearAll() {
      if (timers.etaTick) clearInterval(timers.etaTick);
      if (timers.holdTick) clearInterval(timers.holdTick);
      if (timers.priceA) clearTimeout(timers.priceA);
      if (timers.entwurf) clearTimeout(timers.entwurf);
      if (timers.mock) clearTimeout(timers.mock);
      if (timers.mockPoll) clearInterval(timers.mockPoll);

      Object.assign(timers, {
        etaTick: null,
        etaEndsAt: 0,
        holdTick: null,
        holdEndsAt: 0,
        priceA: null,
        entwurf: null,
        mock: null,
        mockPoll: null,
        mockPollEndsAt: 0,
      });
    },

    stopEta() {
      if (timers.etaTick) clearInterval(timers.etaTick);
      timers.etaTick = null;
      timers.etaEndsAt = 0;
      if (elements.etaWrap) elements.etaWrap.style.display = 'none';
    },

    startEta(label, ms, onFinish) {
      this.stopEta();
      timers.etaEndsAt = Date.now() + ms;
      if (elements.etaLabel)
        elements.etaLabel.textContent = label || 'Geschätzte Zeit';
      if (elements.etaWrap) elements.etaWrap.style.display = 'flex';

      const tick = () => {
        const left = timers.etaEndsAt - Date.now();
        if (elements.etaTime) elements.etaTime.textContent = fmtMMSS(left);
        if (left <= 0) {
          this.stopEta();
          if (onFinish) onFinish();
        }
      };

      tick();
      timers.etaTick = setInterval(tick, 1000);
    },

    stopHold() {
      if (timers.holdTick) clearInterval(timers.holdTick);
      timers.holdTick = null;
      timers.holdEndsAt = 0;
      if (elements.modalHold) elements.modalHold.style.display = 'none';
    },

    startHold30() {
      this.stopHold();
      timers.holdEndsAt = Date.now() + TIMING.HOLD_DURATION_MS;
      if (elements.modalHold) elements.modalHold.style.display = 'block';

      const tick = () => {
        const left = timers.holdEndsAt - Date.now();
        const total = TIMING.HOLD_DURATION_MS;
        const pct = Math.max(0, Math.min(1, left / total));

        if (elements.modalHoldTime)
          elements.modalHoldTime.textContent = fmtMMSS(left);
        if (elements.modalHoldBarfill) {
          elements.modalHoldBarfill.style.width = `${(pct * 100).toFixed(2)}%`;
        }

        if (left <= 0) {
          if (elements.modalHoldTime)
            elements.modalHoldTime.textContent = '00:00';
          if (elements.modalHoldBarfill)
            elements.modalHoldBarfill.style.width = '0%';
          clearInterval(timers.holdTick);
          timers.holdTick = null;
        }
      };

      tick();
      timers.holdTick = setInterval(tick, 1000);
    },
  };

  // ============================================================================
  // UI Updates
  // ============================================================================
  const ui = {
    setPillState(kind, text) {
      if (elements.pill)
        elements.pill.setAttribute('data-state', kind || 'idle');
      if (elements.pillText) elements.pillText.textContent = text || 'Bereit';
    },

    setPreviewState(attr, value) {
      if (!elements.previewArea) return;
      elements.previewArea.setAttribute(attr, value ? '1' : '0');
    },

    setPreviewLoading(on) {
      this.setPreviewState('data-loading', on);
    },

    setSoftBlur(on) {
      this.setPreviewState('data-softblur', on);
    },

    setFade(on) {
      this.setPreviewState('data-fade', on);
    },

    setClickable(on) {
      this.setPreviewState('data-clickable', on);
    },

    setPreviewOverlay(on, title, sub) {
      if (elements.previewOverlay)
        elements.previewOverlay.style.display = on ? 'flex' : 'none';
      if (elements.previewOverlayTitle && title)
        elements.previewOverlayTitle.textContent = title;
      if (elements.previewOverlaySub && sub)
        elements.previewOverlaySub.textContent = sub;
    },

    showPreview(url) {
      if (!url || !elements.previewImg) return;
      this.setFade(true);
      elements.previewImg.onload = () => {
        this.setFade(false);
        elements.previewImg.onload = null;
      };
      elements.previewImg.src = url;
      elements.previewImg.classList.remove('smc__preview-img--hidden');
      if (elements.previewEmpty) elements.previewEmpty.style.display = 'none';
    },

    showPlaceholder(text) {
      if (elements.previewEmpty) {
        elements.previewEmpty.textContent = text || 'Starte zuerst den Entwurf';
        elements.previewEmpty.style.display = 'block';
      }
      if (elements.previewImg)
        elements.previewImg.classList.add('smc__preview-img--hidden');
    },

    setModalPreviewLoading(on) {
      if (elements.modalPreview) {
        elements.modalPreview.setAttribute('data-loading', on ? '1' : '0');
      }
    },

    lockInputs(on) {
      const inputs = [
        elements.upload,
        elements.desc,
        elements.finish,
        elements.size,
      ];
      if (inputs.some((el) => !el)) return;

      state.locked = !!on;
      inputs.forEach((input) => {
        if (input) input.disabled = state.locked;
      });

      if (elements.resetBtn) {
        elements.resetBtn.style.display = state.locked ? 'inline-flex' : 'none';
      }
    },

    lockScroll(on) {
      try {
        const value = on ? 'hidden' : '';
        document.documentElement.style.overflow = value;
        document.body.style.overflow = value;
      } catch {}
    },

    setCta(label, enabled) {
      if (elements.ctaLabel)
        elements.ctaLabel.textContent = label || 'Entwurf erstellen';
      if (elements.ctaBtn) elements.ctaBtn.disabled = !enabled;
    },

    setCtaFromState() {
      switch (state.current) {
        case 'init': {
          const ok = elements.desc?.value?.trim().length >= 5;
          this.setCta('Entwurf erstellen', ok && !state.locked);
          break;
        }
        case 'creating':
          this.setCta('Wird erstellt', false);
          break;
        case 'ready':
          this.setCta('Schild ansehen', true);
          break;
        default:
          this.setCta('Wird erstellt', false);
      }
    },

    applyPriceDisplay() {
      if (!elements.priceVal) return;
      if (state.pendingPriceValue) {
        elements.priceVal.textContent = state.lastMockUrl
          ? state.pendingPriceValue
          : 'Preis berechnet';
      } else {
        elements.priceVal.textContent =
          'Den Preis berechnen wir nach dem Entwurf.';
      }
    },
  };

  // ============================================================================
  // Form & Data Management
  // ============================================================================
  const formData = {
    hasImage() {
      return !!elements.upload?.files?.[0];
    },

    routeValue() {
      return this.hasImage() ? 'Edit' : 'Generate';
    },

    updateProps() {
      if (elements.propDesc)
        elements.propDesc.value = elements.desc?.value || '';
      if (elements.propFinish)
        elements.propFinish.value = elements.finish?.value || '';
      if (elements.propSize)
        elements.propSize.value = elements.size?.value || '';
      if (elements.propRoute) elements.propRoute.value = this.routeValue();
      if (elements.propGen) elements.propGen.value = state.generatorId || '';
      if (elements.propImg) {
        elements.propImg.value = elements.upload?.files?.[0]?.name || '';
      }
      if (elements.propPrice)
        elements.propPrice.value = state.pendingPriceValue || '';
    },

    createPayload(extra = {}) {
      const fd = new FormData();
      const file = elements.upload?.files?.[0];

      fd.append('Bild', file || '');
      fd.append('Beschreibung', elements.desc?.value || '');
      fd.append('Oberfläche', elements.finish?.value || '');
      fd.append('Größe', elements.size?.value || '');
      fd.append('Route', this.routeValue());
      fd.append('generator_id', state.generatorId || '');
      fd.append('section_id', sid);

      try {
        Object.keys(extra).forEach((k) => {
          if (extra[k] != null) fd.append(k, extra[k]);
        });
      } catch {}

      return fd;
    },

    handleUploadUI() {
      if (!elements.upload || !elements.uploadLabel) return;

      const file = elements.upload.files?.[0];
      if (file) {
        elements.uploadLabel.textContent = file.name;

        if (file.type?.startsWith('image')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (elements.uploadPrevImg && elements.uploadPrevEmpty) {
              elements.uploadPrevImg.src = e.target?.result || '';
              elements.uploadPrevImg.style.display = 'block';
              elements.uploadPrevEmpty.style.display = 'none';
            }
          };
          reader.readAsDataURL(file);
        }
      } else {
        elements.uploadLabel.textContent = 'Noch kein Upload';
        if (elements.uploadPrevImg && elements.uploadPrevEmpty) {
          elements.uploadPrevImg.removeAttribute('src');
          elements.uploadPrevImg.style.display = 'none';
          elements.uploadPrevEmpty.style.display = 'flex';
        }
      }
    },
  };

  // ============================================================================
  // Price Management
  // ============================================================================
  const priceManager = {
    set(txt) {
      const out = normalizePriceDisplay(txt);
      if (out) {
        state.pendingPriceValue = out;
        state.priceReady = true;
        formData.updateProps();
        ui.applyPriceDisplay();
        if (state.current === 'creating' && !state.lastMockUrl) {
          ui.setPillState('work', 'Preis berechnet');
        }
      } else {
        state.pendingPriceValue = '';
        state.priceReady = false;
        formData.updateProps();
        ui.applyPriceDisplay();
      }
    },

    setCalculating() {
      if (elements.priceVal)
        elements.priceVal.textContent = 'Preis wird berechnet…';
      state.pendingPriceValue = '';
      state.priceReady = false;
      formData.updateProps();
    },
  };

  // ============================================================================
  // API Communication
  // ============================================================================
  const api = {
    async postText(url, fd) {
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      let timeoutId = null;

      if (ctrl) {
        timeoutId = setTimeout(() => {
          try {
            ctrl.abort();
          } catch {}
        }, TIMING.FETCH_TIMEOUT_MS);
      }

      try {
        const res = await fetch(url, {
          method: 'POST',
          body: fd,
          signal: ctrl?.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);
        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        return text;
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        throw error;
      }
    },

    async runPriceOnce() {
      if (!state.generatorId || state.priceRequested) return;
      state.priceRequested = true;

      try {
        const raw = await this.postText(
          ENDPOINTS.price,
          formData.createPayload(),
        );
        const j = tryParseJson(raw);
        const p = extractPriceValue(j, raw);
        if (p) priceManager.set(p);
      } catch {
        // Keep priceRequested as true on error
      }
    },

    async runCreatorPreviewOnce(reason = '') {
      if (!state.generatorId || state.previewDone || state.previewInFlight)
        return;

      state.previewInFlight = true;
      try {
        const fd = formData.createPayload({ reason });
        await this.postText(ENDPOINTS.preview, fd);
        state.previewDone = true;
      } catch {
        // Silent failure
      } finally {
        state.previewInFlight = false;
      }
    },

    async fetchSignOnce(mode) {
      if (!state.generatorId || state.pollInFlight) return null;

      state.pollInFlight = true;
      try {
        const raw = await this.postText(
          ENDPOINTS.sign,
          formData.createPayload(),
        );
        const j = tryParseJson(raw);
        const statusText = (extractField(j, 'Status') || '').trim();

        statusManager.updateFromStatus(statusText);

        const signPrice = extractField(j, 'Preis');
        if (signPrice && !state.pendingPriceValue) {
          priceManager.set(signPrice);
        }

        if (statusText === STATUS_TEXTS.FAILED) {
          this.handleFailure();
          return { failed: true, json: j };
        }

        if (mode === 'entwurf' || mode === 'any') {
          const entUrl = normalizeImageUrl(extractField(j, 'Entwurf'));
          if (entUrl) {
            state.lastEntUrl = entUrl;
            ui.setPreviewLoading(false);
            ui.setClickable(false);
            ui.setSoftBlur(true);
            ui.showPreview(entUrl);
            ui.setPreviewOverlay(
              true,
              'Wir finalisieren dein Design',
              'Bitte warten',
            );
          }
        }

        if (mode === 'mock' || mode === 'any') {
          const mockUrl = normalizeImageUrl(extractField(j, 'Mock Up'));
          if (mockUrl) {
            state.lastMockUrl = mockUrl;
            state.forceMockLoading = false;

            timerManager.stopEta();
            timerManager.clearAll();

            ui.setPreviewLoading(false);
            ui.setSoftBlur(false);
            ui.setPreviewOverlay(false);
            ui.setClickable(true);
            ui.applyPriceDisplay();

            if (elements.previewKicker)
              elements.previewKicker.textContent = 'Vorschau';
            ui.showPreview(mockUrl);

            state.current = 'ready';
            ui.setCtaFromState();

            return { ok: true, mock: true, json: j };
          }
        }

        return { ok: true, json: j };
      } catch {
        return null;
      } finally {
        state.pollInFlight = false;
      }
    },

    handleFailure() {
      timerManager.stopEta();
      timerManager.clearAll();
      ui.setPreviewLoading(false);
      ui.setPreviewOverlay(false);
      ui.setClickable(false);
      ui.setSoftBlur(false);
      ui.showPlaceholder('Fehlgeschlagen. Bitte Neu anfangen');
    },

    startMockPollingWindow() {
      if (timers.mockPoll) return;

      const hardStart = state.runStartedAt
        ? state.runStartedAt + TIMING.MOCK_POLL_START_MS
        : Date.now();
      const hardEnd = state.runStartedAt
        ? state.runStartedAt + TIMING.MOCK_POLL_END_MS
        : Date.now() + 150000;

      timers.mockPollEndsAt = hardEnd;

      if (Date.now() >= hardStart) {
        this.fetchSignOnce('mock');
      }

      timers.mockPoll = setInterval(async () => {
        if (!state.generatorId || Date.now() > timers.mockPollEndsAt) {
          clearInterval(timers.mockPoll);
          timers.mockPoll = null;
          return;
        }
        await this.fetchSignOnce('mock');
      }, TIMING.MOCK_POLL_EVERY_MS);
    },

    async startRunCreator() {
      const descText = elements.desc?.value?.trim() || '';
      if (descText.length < 5) return;

      // Reset state
      Object.assign(state, {
        current: 'creating',
        locked: false,
        generatorId: '',
        lastMockUrl: '',
        lastEntUrl: '',
        checkoutReady: false,
        priceReady: false,
        priceRequested: false,
        pendingPriceValue: '',
        previewDone: false,
        previewInFlight: false,
        forceMockLoading: false,
        runStartedAt: Date.now(),
        pollInFlight: false,
      });

      timerManager.stopEta();
      timerManager.stopHold();
      timerManager.clearAll();
      modalManager.close();

      ui.setClickable(false);
      ui.setSoftBlur(false);
      priceManager.setCalculating();
      ui.setPillState('work', 'Wir starten…');
      ui.lockInputs(true);
      ui.setCtaFromState();

      if (elements.previewKicker)
        elements.previewKicker.textContent = 'Vorschau';
      ui.showPlaceholder('Wir erstellen gerade deine Vorschau');
      ui.setPreviewLoading(true);
      ui.setFade(false);
      ui.setPreviewOverlay(
        true,
        'Bitte warten',
        'Wir erstellen deine Vorschau',
      );

      timerManager.startEta('Geschätzte Zeit', TIMING.TOTAL_MS, () => {
        if (state.current === 'creating' && !state.lastMockUrl) {
          state.forceMockLoading = true;
          ui.setPillState('work', 'Vorschau wird geladen');
          ui.setPreviewOverlay(true, 'Vorschau wird geladen', 'Bitte warten');
          ui.setPreviewLoading(true);
        }
      });

      formData.updateProps();

      try {
        const raw = await this.postText(
          ENDPOINTS.run,
          formData.createPayload(),
        );
        const id = extractIdFromText(raw);

        if (!id) {
          this.handleCreationFailure('Es fehlt eine ID, bitte Neu anfangen');
          return;
        }

        state.generatorId = id;
        formData.updateProps();
        ui.setPillState('work', 'Wird erstellt');

        this.runCreatorPreviewOnce('Sofort nach run-creator');

        timers.priceA = setTimeout(() => {
          ui.setPillState('work', 'Preis wird berechnet');
          this.runPriceOnce();
        }, TIMING.TIME_PRICE_MS);

        timers.entwurf = setTimeout(async () => {
          ui.setPillState('work', 'Entwurf wird geladen');
          await this.fetchSignOnce('entwurf');
        }, TIMING.TIME_ENTWURF_POLL_MS);

        timers.mock = setTimeout(() => {
          ui.setPillState('work', 'Finale Vorschau wird geladen');
          this.startMockPollingWindow();
        }, TIMING.MOCK_POLL_START_MS);
      } catch {
        this.handleCreationFailure('Fehler beim Start, bitte Neu anfangen');
      }
    },

    handleCreationFailure(message) {
      state.generatorId = '';
      formData.updateProps();
      timerManager.stopEta();
      timerManager.clearAll();
      ui.setPreviewLoading(false);
      ui.setPreviewOverlay(false);
      ui.showPlaceholder('Starte zuerst den Entwurf');
      state.current = 'init';
      ui.setCtaFromState();
      ui.setPillState('bad', message);
      ui.lockInputs(true);
    },

    async addToCartFromProductUrl(productUrl) {
      const jsonUrl = safeProductJsonUrl(productUrl);
      if (!jsonUrl) return { ok: false };

      try {
        const pRes = await fetch(jsonUrl, {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!pRes.ok) return { ok: false };

        const p = await pRes.json();
        const variants = p?.variants || [];
        if (!variants.length) return { ok: false };

        const v = variants.find((x) => x?.available) || variants[0];
        if (!v?.id) return { ok: false };

        const properties = {
          Beschreibung: elements.desc?.value || '',
          Oberfläche: elements.finish?.value || '',
          Größe: elements.size?.value || '',
          Route: formData.routeValue(),
          'Generator ID': state.generatorId || '',
          Preis: state.pendingPriceValue || '',
        };

        const addRes = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ id: v.id, quantity: 1, properties }),
          credentials: 'same-origin',
        });

        return { ok: addRes.ok };
      } catch {
        return { ok: false };
      }
    },
  };

  // ============================================================================
  // Status Management
  // ============================================================================
  const statusManager = {
    updateFromStatus(statusText) {
      const s = (statusText || '').trim();

      if (state.forceMockLoading && !state.lastMockUrl) {
        if (STATUS_TEXTS.DESIGN_READY.includes(s)) return;
      }

      if (!s) {
        ui.setPillState('work', 'Bitte warten');
        return;
      }

      switch (s) {
        case STATUS_TEXTS.FAILED:
          ui.setPillState('bad', 'Fehlgeschlagen');
          break;
        case STATUS_TEXTS.PREVIEW_READY:
          ui.setPillState('ok', 'Vorschau ist fertig');
          break;
        case STATUS_TEXTS.DESIGN_READY[0]:
          ui.setPillState('work', 'Entwurf ist fertig');
          break;
        default:
          ui.setPillState('work', s);
      }
    },
  };

  // ============================================================================
  // Modal Management
  // ============================================================================
  const modalManager = {
    setMode(mode) {
      if (elements.modal)
        elements.modal.setAttribute('data-mode', mode || 'product');
    },

    close() {
      if (elements.modal) elements.modal.setAttribute('aria-hidden', 'true');
      ui.lockScroll(false);
      const mode = elements.modal?.getAttribute('data-mode') || '';
      if (mode === 'product') timerManager.stopHold();
    },

    async downloadUrl(url, filename) {
      if (!url) return;
      const name =
        filename ||
        `steelmonks-vorschau-${state.generatorId || 'download'}.png`;

      try {
        const res = await fetch(url, { method: 'GET', mode: 'cors' });
        if (!res.ok) throw new Error('download');

        const blob = await res.blob();
        const obj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = obj;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => {
          try {
            URL.revokeObjectURL(obj);
          } catch {}
        }, 8000);
      } catch {
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch {
          window.open(url, '_blank');
        }
      }
    },

    openViewer(kind, url) {
      if (!url) return;
      this.setMode('viewer');

      if (elements.modalTitle)
        elements.modalTitle.textContent = kind || 'Vorschau';
      if (elements.modalCopy) elements.modalCopy.style.display = 'none';
      if (elements.modalActions) elements.modalActions.style.display = 'none';
      if (elements.modalFoot) elements.modalFoot.style.display = 'none';
      if (elements.modalHold) elements.modalHold.style.display = 'none';
      if (elements.modalImg) elements.modalImg.src = url;

      if (elements.modalDl) {
        elements.modalDl.style.display = 'inline-flex';
        elements.modalDl.onclick = () => {
          this.downloadUrl(
            url,
            `steelmonks-vorschau-${state.generatorId || 'download'}.png`,
          );
        };
      }

      if (elements.modal) elements.modal.setAttribute('aria-hidden', 'false');
      ui.lockScroll(true);
    },

    openProduct() {
      this.setMode('product');

      if (elements.modalCopy) elements.modalCopy.style.display = 'flex';
      if (elements.modalActions) elements.modalActions.style.display = 'flex';
      if (elements.modalFoot) elements.modalFoot.style.display = 'block';
      if (elements.modalTitle)
        elements.modalTitle.textContent = 'Schild ansehen';
      if (elements.modalImg && state.lastMockUrl)
        elements.modalImg.src = state.lastMockUrl;
      if (elements.modalText) {
        elements.modalText.textContent =
          'Dein Schild ist bereit – wir erstellen gerade dein Produkt.';
      }

      if (elements.modalDl) {
        elements.modalDl.style.display = 'inline-flex';
        elements.modalDl.onclick = () => {
          if (state.lastMockUrl) {
            this.downloadUrl(
              state.lastMockUrl,
              `steelmonks-vorschau-${state.generatorId || 'download'}.png`,
            );
          }
        };
      }

      if (elements.modal) elements.modal.setAttribute('aria-hidden', 'false');
      ui.lockScroll(true);
    },

    async startProductModal() {
      if (!state.generatorId || !state.lastMockUrl) return;

      ui.setPillState('work', 'Produkt wird vorbereitet');
      ui.setModalPreviewLoading(true);

      if (elements.modalLink) {
        elements.modalLink.href = '#';
        elements.modalLink.style.display = 'none';
      }
      if (elements.modalFoot) elements.modalFoot.textContent = '';
      if (elements.modalAdd) elements.modalAdd.disabled = true;

      this.openProduct();

      try {
        const raw = await api.postText(
          ENDPOINTS.product,
          formData.createPayload(),
        );
        const j = tryParseJson(raw);

        const productUrl = (
          extractField(j, 'Product URL') ||
          extractField(j, 'product_url') ||
          extractField(j, 'url') ||
          ''
        ).trim();

        const productName = (
          extractField(j, 'Product Name') ||
          extractField(j, 'product_name') ||
          extractField(j, 'name') ||
          ''
        ).trim();

        ui.setModalPreviewLoading(false);

        if (!productUrl) {
          ui.setPillState('bad', 'Produkt Link fehlt');
          if (elements.modalText)
            elements.modalText.textContent = 'Kein Product URL erhalten.';
          if (elements.modalAdd) elements.modalAdd.disabled = false;
          return;
        }

        if (elements.modalLink) {
          elements.modalLink.href = productUrl;
          elements.modalLink.style.display = 'none';
        }
        if (elements.modalFoot) elements.modalFoot.textContent = productUrl;

        ui.setPillState('ok', 'Produkt bereit');
        if (elements.modalText) {
          elements.modalText.textContent = productName || 'Produkt bereit';
        }

        timerManager.startHold30();
        state.checkoutReady = false;

        if (elements.modalAddLabel) {
          elements.modalAddLabel.textContent = 'Zum Warenkorb hinzufügen';
        }

        if (elements.modalAdd) {
          elements.modalAdd.disabled = false;
          elements.modalAdd.onclick = async () => {
            if (state.checkoutReady) {
              window.location.href = '/checkout';
              return;
            }

            try {
              if (elements.modalAdd)
                elements.modalAdd.setAttribute('data-loading', '1');
              ui.setModalPreviewLoading(true);
              ui.setPillState('work', 'Wird in den Warenkorb gelegt');

              const added = await api.addToCartFromProductUrl(productUrl);

              ui.setModalPreviewLoading(false);
              if (elements.modalAdd)
                elements.modalAdd.setAttribute('data-loading', '0');

              if (added?.ok) {
                state.checkoutReady = true;
                ui.setPillState('ok', 'Im Warenkorb');
                if (elements.modalText) {
                  elements.modalText.textContent =
                    productName || 'Produkt bereit';
                }
                if (elements.modalAddLabel)
                  elements.modalAddLabel.textContent = 'Zum Checkout';
              } else {
                ui.setPillState('ok', 'Weiter');
                if (elements.modalText) {
                  elements.modalText.textContent =
                    'Öffne das Produkt und lege es dort in den Warenkorb.';
                }
              }
            } catch {
              ui.setModalPreviewLoading(false);
              if (elements.modalAdd)
                elements.modalAdd.setAttribute('data-loading', '0');
              ui.setPillState('bad', 'Warenkorb Fehler');
              if (elements.modalText) {
                elements.modalText.textContent =
                  'Beim Hinzufügen zum Warenkorb ist etwas schiefgelaufen.';
              }
            }
          };
        }
      } catch {
        ui.setModalPreviewLoading(false);
        ui.setPillState('bad', 'Produkt Fehler');
        if (elements.modalText) {
          elements.modalText.textContent =
            'Beim Erstellen des Produkts ist etwas schiefgelaufen.';
        }
        if (elements.modalAdd) elements.modalAdd.disabled = false;
      }
    },
  };

  // ============================================================================
  // Reset & Initialization
  // ============================================================================
  const resetAll = () => {
    timerManager.clearAll();
    timerManager.stopEta();
    timerManager.stopHold();

    Object.assign(state, {
      current: 'init',
      locked: false,
      generatorId: '',
      lastMockUrl: '',
      lastEntUrl: '',
      checkoutReady: false,
      priceReady: false,
      priceRequested: false,
      pendingPriceValue: '',
      previewDone: false,
      previewInFlight: false,
      forceMockLoading: false,
      runStartedAt: 0,
      pollInFlight: false,
    });

    ui.setClickable(false);
    ui.setSoftBlur(false);
    ui.lockInputs(false);
    ui.setPillState('idle', 'Bereit');

    if (elements.priceVal) {
      elements.priceVal.textContent =
        'Den Preis berechnen wir nach dem Entwurf.';
    }
    if (elements.previewKicker) elements.previewKicker.textContent = 'Vorschau';
    ui.showPlaceholder('Starte zuerst den Entwurf');
    ui.setPreviewLoading(false);
    ui.setPreviewOverlay(false);
    ui.setFade(false);

    if (elements.modal) elements.modal.setAttribute('aria-hidden', 'true');
    ui.lockScroll(false);
    ui.setCtaFromState();
    formData.updateProps();
  };

  // ============================================================================
  // Event Listeners
  // ============================================================================
  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', () => {
      document.body.style.overflow = 'auto';
      elements.smc?.classList.add('smc--scale-down');
    });
  }

  if (elements.modalBackdrop) {
    elements.modalBackdrop.addEventListener('click', () =>
      modalManager.close(),
    );
  }

  if (elements.modalClose) {
    elements.modalClose.addEventListener('click', () => modalManager.close());
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (e?.key === 'Escape') modalManager.close();
    },
    { passive: true },
  );

  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', resetAll);
  }

  if (elements.upload) {
    elements.upload.addEventListener('change', () => {
      if (state.locked) return;
      formData.handleUploadUI();
      formData.updateProps();
    });
  }

  if (elements.desc) {
    elements.desc.addEventListener(
      'input',
      () => {
        if (state.locked) return;
        ui.setCtaFromState();
        formData.updateProps();
      },
      { passive: true },
    );
  }

  if (elements.finish) {
    elements.finish.addEventListener('change', () => {
      if (state.locked) return;
      formData.updateProps();
    });
  }

  if (elements.size) {
    elements.size.addEventListener('change', () => {
      if (state.locked) return;
      formData.updateProps();
    });
  }

  if (elements.previewArea) {
    elements.previewArea.addEventListener('click', () => {
      if (!state.lastMockUrl) return;
      if (elements.previewArea.getAttribute('data-clickable') !== '1') return;
      modalManager.openViewer('Vorschau', state.lastMockUrl);
    });
  }

  if (elements.ctaBtn) {
    elements.ctaBtn.addEventListener('click', () => {
      if (state.current === 'init') {
        api.startRunCreator();
      } else if (state.current === 'ready') {
        modalManager.startProductModal();
      }
    });
  }

  // ============================================================================
  // Animations (Closing, Opening)
  // ============================================================================
  if (elements.smc && elements.openBtn && elements.closeBtn) {
    // Open Button (scales up the whole container: #sm-sign-creator then #smc)
    elements.openBtn.addEventListener('click', () => {
      elements.smcContainer.style.opacity = '1';
      elements.smcContainer.style.visibility = 'visible';
      elements.smc.setAttribute('aria-hidden', 'false');
      setTimeout(() => {
        elements.smc.style.transform = 'scale(1)';
      }, 300);

      // Set body overflow to hidden
      document.body.style.overflow = 'hidden';
    });

    // Close Button (scales down the whole container: #smc then #sm-sign-creator )
    elements.closeBtn.addEventListener('click', () => {
      elements.smc.style.transform = 'scale(0)';
      setTimeout(() => {
        elements.smcContainer.style.opacity = '0';
        elements.smcContainer.style.visibility = 'hidden';
        elements.smc.setAttribute('aria-hidden', 'true');
      }, 300);

      // Set body overflow back to auto
      document.body.style.overflow = 'auto';
    });
  }

  // ============================================================================
  // Initialization
  // ============================================================================
  formData.handleUploadUI();
  formData.updateProps();

  if (elements.priceVal) {
    elements.priceVal.textContent = 'Den Preis berechnen wir nach dem Entwurf.';
  }

  ui.setPillState('idle', 'Bereit');

  if (elements.previewKicker) elements.previewKicker.textContent = 'Vorschau';
  ui.showPlaceholder('Starte zuerst den Entwurf');
  ui.setPreviewLoading(false);
  ui.setSoftBlur(false);
  ui.setPreviewOverlay(false);
  ui.setFade(false);
  ui.lockInputs(false);
  ui.setCtaFromState();
});
