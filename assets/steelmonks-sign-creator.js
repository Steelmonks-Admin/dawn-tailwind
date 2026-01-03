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
    } catch (error) {
      logger.error('Failed to merge custom endpoints configuration', error);
    }
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

  // ============================================================================
  // Logger Utility
  // ============================================================================
  const logger = {
    styles: {
      smc: 'font-weight: bold; color: #87CEEB;', // Light blue (sky blue)
      reset: '',
    },

    log(message, ...args) {
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `%cSMC%c: ${message}`,
          this.styles.smc,
          this.styles.reset,
          ...args,
        );
      }
    },

    error(message, error, ...args) {
      if (typeof console !== 'undefined') {
        if (console.error) {
          console.error(
            `%cSMC%c: ${message}`,
            this.styles.smc,
            this.styles.reset,
            ...args,
          );
          if (error) console.error('Error details:', error);
        } else {
          this.log(`ERROR - ${message}`, error, ...args);
        }
      }
    },

    warn(message, ...args) {
      if (typeof console !== 'undefined') {
        if (console.warn) {
          console.warn(
            `%cSMC%c: ${message}`,
            this.styles.smc,
            this.styles.reset,
            ...args,
          );
        } else {
          this.log(`WARN - ${message}`, ...args);
        }
      }
    },

    info(message, ...args) {
      this.log(`INFO - ${message}`, ...args);
    },

    debug(message, ...args) {
      if (window.location.search.includes('debug=true')) {
        this.log(`DEBUG - ${message}`, ...args);
      }
    },
  };

  const fmtMMSS = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const tryParseJson = (text) => {
    try {
      return JSON.parse(text);
    } catch (error) {
      logger.error('Failed to parse JSON', error, {
        text: text?.substring(0, 100),
      });
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
    } catch (error) {
      logger.error('Failed to create product JSON URL', error, { productUrl });
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
    try {
      elements.desc.placeholder = `Lass Deiner Vorstellung freien Lauf. Probier doch:
• Ein schönes Familienschild mit unserem Labradoodle wie aus dem Foto
• Mein Familienwappen wie aus der Zeichnung
• Mach mir ein Schild für meinen Bruder, er liebt Schlagzeug und Croissants
• Oder ein Hausschild mit der Nummer 22 und einem Ritter`;
    } catch (error) {
      logger.error('Failed to set placeholder text', error);
    }
  } else {
    logger.warn('Description element not found');
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

  // ============================================================================
  // LocalStorage Persistence
  // ============================================================================
  const STORAGE_KEY = 'steelmonks-sign-creator-state';
  const STORAGE_TIMER_KEY = 'steelmonks-sign-creator-timer';
  const STORAGE_FORM_KEY = 'steelmonks-sign-creator-form';

  const storageManager = {
    saveState() {
      try {
        const stateToSave = {
          current: state.current,
          generatorId: state.generatorId,
          lastMockUrl: state.lastMockUrl,
          lastEntUrl: state.lastEntUrl,
          checkoutReady: state.checkoutReady,
          priceReady: state.priceReady,
          pendingPriceValue: state.pendingPriceValue,
          previewDone: state.previewDone,
          runStartedAt: state.runStartedAt,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        logger.debug('State saved to localStorage', stateToSave);
      } catch (error) {
        logger.error('Failed to save state to localStorage', error);
      }
    },

    loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        logger.debug('State loaded from localStorage', parsed);
        return parsed;
      } catch (error) {
        logger.error('Failed to load state from localStorage', error);
        return null;
      }
    },

    clearState() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TIMER_KEY);
        localStorage.removeItem(STORAGE_FORM_KEY);
        logger.debug('State cleared from localStorage');
      } catch (error) {
        logger.error('Failed to clear state from localStorage', error);
      }
    },

    saveTimer(etaEndsAt) {
      try {
        if (etaEndsAt && etaEndsAt > Date.now()) {
          localStorage.setItem(
            STORAGE_TIMER_KEY,
            JSON.stringify({ etaEndsAt }),
          );
          logger.debug('Timer saved to localStorage', { etaEndsAt });
        } else {
          localStorage.removeItem(STORAGE_TIMER_KEY);
        }
      } catch (error) {
        logger.error('Failed to save timer to localStorage', error);
      }
    },

    loadTimer() {
      try {
        const saved = localStorage.getItem(STORAGE_TIMER_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        // Only return if timer hasn't expired
        if (parsed.etaEndsAt && parsed.etaEndsAt > Date.now()) {
          logger.debug('Timer loaded from localStorage', parsed);
          return parsed;
        } else {
          localStorage.removeItem(STORAGE_TIMER_KEY);
          return null;
        }
      } catch (error) {
        logger.error('Failed to load timer from localStorage', error);
        return null;
      }
    },

    saveFormData() {
      try {
        const formToSave = {
          description: elements.desc?.value || '',
          finish: elements.finish?.value || '',
          size: elements.size?.value || '',
          uploadFileName: elements.upload?.files?.[0]?.name || '',
          uploadDataUrl: null, // Will be set if file exists
        };

        // Save file as data URL if it exists
        const file = elements.upload?.files?.[0];
        if (file && file.type?.startsWith('image')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              formToSave.uploadDataUrl = e.target?.result || null;
              localStorage.setItem(
                STORAGE_FORM_KEY,
                JSON.stringify(formToSave),
              );
              logger.debug('Form data saved to localStorage');
            } catch (error) {
              logger.error(
                'Failed to save form data URL to localStorage',
                error,
              );
            }
          };
          reader.onerror = (error) => {
            logger.error('FileReader error while saving form', error);
            // Save without image
            localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formToSave));
          };
          reader.readAsDataURL(file);
        } else {
          localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formToSave));
          logger.debug('Form data saved to localStorage (no image)');
        }
      } catch (error) {
        logger.error('Failed to save form data to localStorage', error);
      }
    },

    loadFormData() {
      try {
        const saved = localStorage.getItem(STORAGE_FORM_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        logger.debug('Form data loaded from localStorage', {
          hasDescription: !!parsed.description,
          hasFinish: !!parsed.finish,
          hasSize: !!parsed.size,
          hasImage: !!parsed.uploadDataUrl,
        });
        return parsed;
      } catch (error) {
        logger.error('Failed to load form data from localStorage', error);
        return null;
      }
    },

    restoreFormData(formDataObj) {
      if (!formDataObj) return;

      try {
        // Restore description
        if (formDataObj.description && elements.desc) {
          elements.desc.value = formDataObj.description;
        }

        // Restore finish
        if (formDataObj.finish && elements.finish) {
          elements.finish.value = formDataObj.finish;
        }

        // Restore size
        if (formDataObj.size && elements.size) {
          elements.size.value = formDataObj.size;
        }

        // Restore image preview if available
        if (
          formDataObj.uploadDataUrl &&
          elements.uploadPrevImg &&
          elements.uploadPrevEmpty
        ) {
          elements.uploadPrevImg.src = formDataObj.uploadDataUrl;
          elements.uploadPrevImg.style.display = 'block';
          elements.uploadPrevEmpty.style.display = 'none';
          if (elements.uploadLabel) {
            elements.uploadLabel.textContent =
              formDataObj.uploadFileName || 'Bild hochgeladen';
          }
          logger.debug('Image preview restored from localStorage');
        }

        formData.updateProps();
        logger.debug('Form data restored from localStorage');
      } catch (error) {
        logger.error('Failed to restore form data', error);
      }
    },
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
      storageManager.saveTimer(null);
      if (elements.etaWrap) elements.etaWrap.style.display = 'none';
    },

    startEta(label, ms, onFinish) {
      this.stopEta();
      timers.etaEndsAt = Date.now() + ms;
      storageManager.saveTimer(timers.etaEndsAt);
      if (elements.etaLabel)
        elements.etaLabel.textContent = label || 'Geschätzte Zeit';
      if (elements.etaWrap) elements.etaWrap.style.display = 'flex';

      const tick = () => {
        try {
          const left = timers.etaEndsAt - Date.now();
          if (elements.etaTime) elements.etaTime.textContent = fmtMMSS(left);
          if (left <= 0) {
            this.stopEta();
            logger.debug('ETA timer finished');
            if (onFinish) {
              try {
                onFinish();
              } catch (error) {
                logger.error('Error in ETA finish callback', error);
              }
            }
          }
        } catch (error) {
          logger.error('Error in ETA tick', error);
        }
      };

      tick();
      timers.etaTick = setInterval(tick, 1000);
    },

    restoreEta() {
      const savedTimer = storageManager.loadTimer();
      if (savedTimer && savedTimer.etaEndsAt) {
        timers.etaEndsAt = savedTimer.etaEndsAt;
        const left = timers.etaEndsAt - Date.now();
        if (left > 0) {
          if (elements.etaLabel)
            elements.etaLabel.textContent = 'Geschätzte Zeit';
          if (elements.etaWrap) elements.etaWrap.style.display = 'flex';

          const tick = () => {
            try {
              const remaining = timers.etaEndsAt - Date.now();
              if (elements.etaTime)
                elements.etaTime.textContent = fmtMMSS(remaining);
              if (remaining <= 0) {
                this.stopEta();
                logger.debug('Restored ETA timer finished');
              }
            } catch (error) {
              logger.error('Error in restored ETA tick', error);
            }
          };

          tick();
          timers.etaTick = setInterval(tick, 1000);
          logger.debug('ETA timer restored from localStorage', { left });
          return true;
        } else {
          storageManager.saveTimer(null);
        }
      }
      return false;
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
        try {
          const left = timers.holdEndsAt - Date.now();
          const total = TIMING.HOLD_DURATION_MS;
          const pct = Math.max(0, Math.min(1, left / total));

          if (elements.modalHoldTime)
            elements.modalHoldTime.textContent = fmtMMSS(left);
          if (elements.modalHoldBarfill) {
            elements.modalHoldBarfill.style.width = `${(pct * 100).toFixed(
              2,
            )}%`;
          }

          if (left <= 0) {
            logger.debug('Hold timer finished');
            if (elements.modalHoldTime)
              elements.modalHoldTime.textContent = '00:00';
            if (elements.modalHoldBarfill)
              elements.modalHoldBarfill.style.width = '0%';
            clearInterval(timers.holdTick);
            timers.holdTick = null;
          }
        } catch (error) {
          logger.error('Error in hold timer tick', error);
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
      if (!url || !elements.previewImg) {
        logger.warn('Cannot show preview: missing URL or preview element', {
          url,
          hasElement: !!elements.previewImg,
        });
        return;
      }
      try {
        this.setFade(true);
        elements.previewImg.onload = () => {
          try {
            this.setFade(false);
            elements.previewImg.onload = null;
            logger.debug('Preview image loaded successfully', { url });
          } catch (error) {
            logger.error('Error in preview image onload handler', error);
          }
        };
        elements.previewImg.onerror = (error) => {
          logger.error('Failed to load preview image', error, { url });
          this.setFade(false);
        };
        elements.previewImg.src = url;
        elements.previewImg.classList.remove('smc__preview-img--hidden');
        if (elements.previewEmpty) elements.previewEmpty.style.display = 'none';
      } catch (error) {
        logger.error('Failed to show preview', error, { url });
      }
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
      } catch (error) {
        logger.error('Failed to lock/unlock scroll', error, { on });
      }
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
      } catch (error) {
        logger.error('Failed to append extra form data fields', error, {
          extra,
        });
      }

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
            try {
              if (elements.uploadPrevImg && elements.uploadPrevEmpty) {
                elements.uploadPrevImg.src = e.target?.result || '';
                elements.uploadPrevImg.style.display = 'block';
                elements.uploadPrevEmpty.style.display = 'none';
                logger.debug('File preview loaded', {
                  fileName: file.name,
                  size: file.size,
                });
              }
            } catch (error) {
              logger.error('Failed to display file preview', error, {
                fileName: file.name,
              });
            }
          };
          reader.onerror = (error) => {
            logger.error('FileReader error', error, { fileName: file.name });
          };
          try {
            reader.readAsDataURL(file);
          } catch (error) {
            logger.error('Failed to read file as data URL', error, {
              fileName: file.name,
            });
          }
        } else {
          logger.warn('Invalid file type uploaded', {
            fileName: file.name,
            type: file.type,
          });
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
        storageManager.saveState();
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
            logger.warn('Request timeout, aborting', { url });
          } catch (error) {
            logger.error('Failed to abort request', error, { url });
          }
        }, TIMING.FETCH_TIMEOUT_MS);
      }

      try {
        logger.debug('Sending POST request', {
          url,
          hasFile: !!fd.get?.('Bild'),
        });
        const res = await fetch(url, {
          method: 'POST',
          body: fd,
          signal: ctrl?.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);
        const text = await res.text();

        if (!res.ok) {
          logger.error(
            'Request failed',
            new Error(text || `HTTP ${res.status}`),
            {
              url,
              status: res.status,
              statusText: res.statusText,
            },
          );
          throw new Error(text || `HTTP ${res.status}`);
        }

        logger.debug('Request successful', { url, status: res.status });
        return text;
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
          logger.error('Network request failed', error, { url });
        }
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
        if (p) {
          priceManager.set(p);
          logger.info('Price fetched successfully', { price: p });
        } else {
          logger.warn('Price value not found in response', {
            raw: raw?.substring(0, 200),
          });
        }
      } catch (error) {
        logger.error('Failed to fetch price', error);
        // Keep priceRequested as true on error
      }
    },

    async runCreatorPreviewOnce(reason = '') {
      if (!state.generatorId || state.previewDone || state.previewInFlight)
        return;

      state.previewInFlight = true;
      try {
        const fd = formData.createPayload({ reason });
        logger.debug('Triggering preview generation', { reason });
        await this.postText(ENDPOINTS.preview, fd);
        state.previewDone = true;
        logger.info('Preview generation triggered successfully', { reason });
      } catch (error) {
        logger.error('Failed to trigger preview generation', error, { reason });
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
        if (statusText) {
          logger.debug('Status update received', { statusText, mode });
        }

        statusManager.updateFromStatus(statusText);

        const signPrice = extractField(j, 'Preis');
        if (signPrice && !state.pendingPriceValue) {
          priceManager.set(signPrice);
        }

        if (statusText === STATUS_TEXTS.FAILED) {
          logger.error(
            'Creator workflow reported failure',
            new Error('Status: Fehlgeschlagen'),
            { json: j },
          );
          this.handleFailure();
          return { failed: true, json: j };
        }

        if (mode === 'entwurf' || mode === 'any') {
          const entUrl = normalizeImageUrl(extractField(j, 'Entwurf'));
          if (entUrl) {
            logger.info('Draft (Entwurf) received', { entUrl, mode });
            state.lastEntUrl = entUrl;
            storageManager.saveState();
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
            storageManager.saveState();

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
            storageManager.saveState();
            ui.setCtaFromState();

            logger.info('Mock-up received, workflow complete', {
              mockUrl,
              generatorId: state.generatorId,
            });

            return { ok: true, mock: true, json: j };
          }
        }

        return { ok: true, json: j };
      } catch (error) {
        logger.error('Failed to fetch sign status', error, { mode });
        return null;
      } finally {
        state.pollInFlight = false;
      }
    },

    handleFailure() {
      logger.error('Creator workflow failure detected');
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
        try {
          if (!state.generatorId || Date.now() > timers.mockPollEndsAt) {
            logger.debug('Mock polling window ended', {
              hasGeneratorId: !!state.generatorId,
              timeExceeded: Date.now() > timers.mockPollEndsAt,
            });
            clearInterval(timers.mockPoll);
            timers.mockPoll = null;
            return;
          }
          await this.fetchSignOnce('mock');
        } catch (error) {
          logger.error('Error in mock polling interval', error);
        }
      }, TIMING.MOCK_POLL_EVERY_MS);
    },

    async startRunCreator() {
      const descText = elements.desc?.value?.trim() || '';
      if (descText.length < 5) {
        logger.warn('Cannot start creator: description too short', {
          length: descText.length,
        });
        return;
      }

      logger.info('Starting creator workflow', {
        hasImage: formData.hasImage(),
        descriptionLength: descText.length,
      });

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
      storageManager.saveState();
      storageManager.saveFormData();

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
        // Validate required variables
        if (typeof sid === 'undefined') {
          logger.error('Section ID (sid) is undefined - check Liquid template');
          this.handleCreationFailure('Konfigurationsfehler: Section ID fehlt');
          return;
        }

        logger.debug('Creating payload for run-creator', {
          hasImage: formData.hasImage(),
          sectionId: sid,
          descriptionLength: elements.desc?.value?.trim().length || 0,
        });

        let payload;
        try {
          payload = formData.createPayload();
          logger.debug('Payload created successfully');
        } catch (payloadError) {
          logger.error('Failed to create form payload', payloadError, {
            hasUpload: !!elements.upload,
            hasDesc: !!elements.desc,
            hasFinish: !!elements.finish,
            hasSize: !!elements.size,
            sectionId: sid,
          });
          throw payloadError;
        }

        logger.debug('Sending request to run-creator endpoint', {
          url: ENDPOINTS.run,
          endpointExists: !!ENDPOINTS.run,
        });

        let raw;
        try {
          raw = await this.postText(ENDPOINTS.run, payload);
          logger.debug('Received response from run-creator', {
            responseLength: raw?.length || 0,
            preview: raw?.substring(0, 100),
          });
        } catch (postError) {
          logger.error('Request to run-creator endpoint failed', postError, {
            url: ENDPOINTS.run,
            endpoint: ENDPOINTS.run,
            errorName: postError?.name,
            errorMessage: postError?.message,
          });
          throw postError;
        }

        if (!raw || typeof raw !== 'string') {
          logger.error('Invalid response from backend', {
            rawType: typeof raw,
            rawValue: raw,
            rawLength: raw?.length,
          });
          this.handleCreationFailure('Ungültige Antwort vom Server');
          return;
        }

        let id;
        try {
          id = extractIdFromText(raw);
          logger.debug('Attempted to extract ID from response', {
            idFound: !!id,
            idValue: id || null,
          });
        } catch (extractError) {
          logger.error('Failed to extract ID from response', extractError, {
            rawPreview: raw?.substring(0, 200),
          });
          throw extractError;
        }

        if (!id) {
          logger.error('No generator ID returned from backend', {
            raw: raw?.substring(0, 200),
            rawLength: raw?.length,
            endpoint: ENDPOINTS.run,
          });
          this.handleCreationFailure('Es fehlt eine ID, bitte Neu anfangen');
          return;
        }

        logger.info('Generator ID received', { generatorId: id });

        state.generatorId = id;
        storageManager.saveState();
        formData.updateProps();
        ui.setPillState('work', 'Wird erstellt');

        this.runCreatorPreviewOnce('Sofort nach run-creator');

        timers.priceA = setTimeout(() => {
          try {
            ui.setPillState('work', 'Preis wird berechnet');
            this.runPriceOnce();
          } catch (error) {
            logger.error('Error in price fetch timeout callback', error);
          }
        }, TIMING.TIME_PRICE_MS);

        timers.entwurf = setTimeout(async () => {
          try {
            ui.setPillState('work', 'Entwurf wird geladen');
            await this.fetchSignOnce('entwurf');
          } catch (error) {
            logger.error('Error in entwurf fetch timeout callback', error);
          }
        }, TIMING.TIME_ENTWURF_POLL_MS);

        timers.mock = setTimeout(() => {
          try {
            ui.setPillState('work', 'Finale Vorschau wird geladen');
            this.startMockPollingWindow();
          } catch (error) {
            logger.error('Error in mock polling start timeout callback', error);
          }
        }, TIMING.MOCK_POLL_START_MS);

        logger.info('Creator workflow started successfully', {
          generatorId: state.generatorId,
          hasImage: formData.hasImage(),
        });
      } catch (error) {
        logger.error('Failed to start creator workflow', error, {
          errorName: error?.name,
          errorMessage: error?.message,
          errorStack: error?.stack?.substring(0, 200),
          endpoint: ENDPOINTS.run,
          sectionId: typeof sid !== 'undefined' ? sid : 'UNDEFINED',
          hasImage: formData.hasImage(),
          descriptionLength: elements.desc?.value?.trim().length || 0,
        });
        this.handleCreationFailure('Fehler beim Start, bitte Neu anfangen');
      }
    },

    handleCreationFailure(message) {
      logger.error('Creator workflow failed', new Error(message));
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
        logger.debug('Fetching product JSON', { jsonUrl });
        const pRes = await fetch(jsonUrl, {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!pRes.ok) {
          logger.error(
            'Failed to fetch product JSON',
            new Error(`HTTP ${pRes.status}`),
            {
              jsonUrl,
              status: pRes.status,
            },
          );
          return { ok: false };
        }

        const p = await pRes.json();
        const variants = p?.variants || [];
        if (!variants.length) {
          logger.error('Product has no variants', { jsonUrl, productData: p });
          return { ok: false };
        }

        const v = variants.find((x) => x?.available) || variants[0];
        if (!v?.id) {
          logger.error('No valid variant found', {
            variantsCount: variants.length,
            jsonUrl,
          });
          return { ok: false };
        }

        logger.debug('Found variant for cart', {
          variantId: v.id,
          available: v.available,
        });

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

        const success = addRes.ok;
        if (success) {
          logger.info('Product added to cart successfully', {
            productUrl,
            variantId: v.id,
          });
        } else {
          logger.error(
            'Failed to add product to cart',
            new Error(`HTTP ${addRes.status}`),
            {
              productUrl,
              variantId: v.id,
              status: addRes.status,
            },
          );
        }
        return { ok: success };
      } catch (error) {
        logger.error('Exception while adding product to cart', error, {
          productUrl,
        });
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
          } catch (error) {
            logger.error('Failed to revoke object URL', error);
          }
        }, 8000);
      } catch (error) {
        logger.warn('Blob download failed, trying direct link', error, {
          url,
          filename: name,
        });
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          logger.info('Download initiated via direct link', {
            url,
            filename: name,
          });
        } catch (fallbackError) {
          logger.error(
            'Direct link download failed, opening in new tab',
            fallbackError,
            { url },
          );
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
      if (elements.modalImg) {
        try {
          elements.modalImg.onerror = (error) => {
            logger.error('Failed to load modal image', error, { url });
          };
          elements.modalImg.src = url;
        } catch (error) {
          logger.error('Failed to set modal image source', error, { url });
        }
      }

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
      if (elements.modalImg && state.lastMockUrl) {
        try {
          elements.modalImg.onerror = (error) => {
            logger.error('Failed to load product modal image', error, {
              url: state.lastMockUrl,
            });
          };
          elements.modalImg.src = state.lastMockUrl;
        } catch (error) {
          logger.error('Failed to set product modal image source', error, {
            url: state.lastMockUrl,
          });
        }
      }
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
      if (!state.generatorId || !state.lastMockUrl) {
        logger.warn('Cannot start product modal: missing requirements', {
          hasGeneratorId: !!state.generatorId,
          hasMockUrl: !!state.lastMockUrl,
        });
        return;
      }

      logger.info('Starting product modal', {
        generatorId: state.generatorId,
        mockUrl: state.lastMockUrl,
      });

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
                storageManager.saveState();
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
            } catch (error) {
              logger.error('Exception while adding to cart in modal', error, {
                productUrl,
              });
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
      } catch (error) {
        logger.error('Failed to start product modal', error);
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
    try {
      logger.info('Resetting application state');
      timerManager.clearAll();
      timerManager.stopEta();
      timerManager.stopHold();
      storageManager.clearState();

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
      if (elements.previewKicker)
        elements.previewKicker.textContent = 'Vorschau';
      ui.showPlaceholder('Starte zuerst den Entwurf');
      ui.setPreviewLoading(false);
      ui.setPreviewOverlay(false);
      ui.setFade(false);

      if (elements.modal) elements.modal.setAttribute('aria-hidden', 'true');
      ui.lockScroll(false);
      ui.setCtaFromState();
      formData.updateProps();

      logger.info('Application state reset complete');
    } catch (error) {
      logger.error('Error during reset', error);
    }
  };

  // ============================================================================
  // Event Listeners
  // ============================================================================
  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', () => {
      try {
        document.body.style.overflow = 'auto';
        elements.smc?.classList.add('smc--scale-down');
        logger.debug('Close button clicked');
      } catch (error) {
        logger.error('Error handling close button click', error);
      }
    });
  }

  if (elements.modalBackdrop) {
    elements.modalBackdrop.addEventListener('click', () => {
      try {
        logger.debug('Modal backdrop clicked, closing modal');
        modalManager.close();
      } catch (error) {
        logger.error('Error closing modal via backdrop', error);
      }
    });
  }

  if (elements.modalClose) {
    elements.modalClose.addEventListener('click', () => {
      try {
        logger.debug('Modal close button clicked');
        modalManager.close();
      } catch (error) {
        logger.error('Error closing modal via close button', error);
      }
    });
  }

  document.addEventListener(
    'keydown',
    (e) => {
      try {
        if (e?.key === 'Escape') {
          logger.debug('Escape key pressed, closing modal');
          modalManager.close();
        }
      } catch (error) {
        logger.error('Error handling escape key', error);
      }
    },
    { passive: true },
  );

  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', () => {
      try {
        logger.debug('Reset button clicked');
        resetAll();
      } catch (error) {
        logger.error('Error handling reset button click', error);
      }
    });
  }

  if (elements.upload) {
    elements.upload.addEventListener('change', () => {
      try {
        if (state.locked) {
          logger.debug('Upload change ignored: form locked');
          return;
        }
        formData.handleUploadUI();
        formData.updateProps();
        storageManager.saveFormData();
        logger.debug('File upload changed');
      } catch (error) {
        logger.error('Error handling file upload change', error);
      }
    });
  }

  if (elements.desc) {
    elements.desc.addEventListener(
      'input',
      () => {
        try {
          if (state.locked) return;
          ui.setCtaFromState();
          formData.updateProps();
          storageManager.saveFormData();
        } catch (error) {
          logger.error('Error handling description input', error);
        }
      },
      { passive: true },
    );
  }

  if (elements.finish) {
    elements.finish.addEventListener('change', () => {
      if (state.locked) return;
      formData.updateProps();
      storageManager.saveFormData();
    });
  }

  if (elements.size) {
    elements.size.addEventListener('change', () => {
      if (state.locked) return;
      formData.updateProps();
      storageManager.saveFormData();
    });
  }

  if (elements.previewArea) {
    elements.previewArea.addEventListener('click', () => {
      try {
        if (!state.lastMockUrl) {
          logger.debug('Preview area clicked but no mock URL available');
          return;
        }
        if (elements.previewArea.getAttribute('data-clickable') !== '1') {
          logger.debug('Preview area clicked but not clickable');
          return;
        }
        logger.debug('Opening preview viewer', { mockUrl: state.lastMockUrl });
        modalManager.openViewer('Vorschau', state.lastMockUrl);
      } catch (error) {
        logger.error('Error handling preview area click', error);
      }
    });
  }

  if (elements.ctaBtn) {
    elements.ctaBtn.addEventListener('click', () => {
      try {
        logger.debug('CTA button clicked', { currentState: state.current });
        if (state.current === 'init') {
          api.startRunCreator();
        } else if (state.current === 'ready') {
          modalManager.startProductModal();
        }
      } catch (error) {
        logger.error('Error handling CTA button click', error, {
          currentState: state.current,
        });
      }
    });
  }

  // ============================================================================
  // Animations (Closing, Opening)
  // ============================================================================
  if (elements.smc && elements.openBtn && elements.closeBtn) {
    // Open Button (scales up the whole container: #sm-sign-creator then #smc)
    elements.openBtn.addEventListener('click', () => {
      try {
        logger.debug('Open button clicked, showing creator');
        elements.smcContainer.style.opacity = '1';
        elements.smcContainer.style.visibility = 'visible';
        elements.smc.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          try {
            elements.smc.style.transform = 'scale(1)';
          } catch (error) {
            logger.error('Error in open animation timeout', error);
          }
        }, 300);

        // Set body overflow to hidden
        document.body.style.overflow = 'hidden';
      } catch (error) {
        logger.error('Error handling open button click', error);
      }
    });

    // Close Button (scales down the whole container: #smc then #sm-sign-creator )
    elements.closeBtn.addEventListener('click', () => {
      try {
        logger.debug('Close button clicked, hiding creator');
        elements.smc.style.transform = 'scale(0)';
        setTimeout(() => {
          try {
            elements.smcContainer.style.opacity = '0';
            elements.smcContainer.style.visibility = 'hidden';
            elements.smc.setAttribute('aria-hidden', 'true');
          } catch (error) {
            logger.error('Error in close animation timeout', error);
          }
        }, 300);

        // Set body overflow back to auto
        document.body.style.overflow = 'auto';
      } catch (error) {
        logger.error(
          'Error handling close button click in animation handler',
          error,
        );
      }
    });
  }

  // ============================================================================
  // Initialization
  // ============================================================================
  logger.info('Steelmonks Sign Creator initializing...');

  try {
    // Try to restore state from localStorage
    const savedState = storageManager.loadState();
    const savedFormData = storageManager.loadFormData();

    if (savedState) {
      logger.info('Restoring state from localStorage', savedState);
      // Restore state values
      Object.assign(state, {
        current: savedState.current || 'init',
        generatorId: savedState.generatorId || '',
        lastMockUrl: savedState.lastMockUrl || '',
        lastEntUrl: savedState.lastEntUrl || '',
        checkoutReady: savedState.checkoutReady || false,
        priceReady: savedState.priceReady || false,
        pendingPriceValue: savedState.pendingPriceValue || '',
        previewDone: savedState.previewDone || false,
        runStartedAt: savedState.runStartedAt || 0,
      });

      // Restore form data if available
      if (savedFormData) {
        storageManager.restoreFormData(savedFormData);
      }

      // Restore preview if we have a mock URL
      if (state.lastMockUrl) {
        ui.showPreview(state.lastMockUrl);
        ui.setClickable(true);
        if (state.current === 'ready') {
          ui.setPillState('ok', 'Entwurf ist fertig');
          // If product is ready and checkout is ready, show modal
          if (state.checkoutReady && modalManager) {
            // Don't auto-open modal, let user click preview to open it
            // But ensure the preview is visible and clickable
          }
        } else {
          ui.setPillState('work', 'Wird erstellt');
        }
      } else if (state.lastEntUrl) {
        ui.showPreview(state.lastEntUrl);
        ui.setSoftBlur(true);
        ui.setPillState('work', 'Wird erstellt');
      }

      // Restore price if available
      if (state.priceReady && state.pendingPriceValue) {
        ui.applyPriceDisplay();
      }

      // Restore timer if available
      timerManager.restoreEta();

      // Update UI based on restored state
      ui.setCtaFromState();
      formData.updateProps();
    } else {
      // No saved state, initialize normally
      formData.handleUploadUI();
      formData.updateProps();

      if (elements.priceVal) {
        elements.priceVal.textContent =
          'Den Preis berechnen wir nach dem Entwurf.';
      }

      ui.setPillState('idle', 'Bereit');

      if (elements.previewKicker)
        elements.previewKicker.textContent = 'Vorschau';
      ui.showPlaceholder('Starte zuerst den Entwurf');
      ui.setPreviewLoading(false);
      ui.setSoftBlur(false);
      ui.setPreviewOverlay(false);
      ui.setFade(false);
      ui.lockInputs(false);
      ui.setCtaFromState();
    }

    logger.info('Steelmonks Sign Creator initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Steelmonks Sign Creator', error);
    ui.setPillState('bad', 'Initialisierungsfehler');
  }
});
