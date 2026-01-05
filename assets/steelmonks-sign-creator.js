document.addEventListener('DOMContentLoaded', () => {
  // ============================================================================
  // ! Configuration & Constants
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
  // ! Logger Utility
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

  // ============================================================================
  // ! Utility Functions
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
  // ! DOM Elements
  // ============================================================================
  const elements = {
    // Navigation
    slider: el('smc-slider'),
    page1: el('smc-page-1'),
    page2: el('smc-page-2'),
    page3: el('smc-page-3'),

    // Form inputs
    upload: el('smc-upload'),
    uploadLabel: el('smc-upload-label'),
    uploadPrevImg: el('smc-upload-preview'),
    uploadPrevEmpty: el('smc-upload-preview-empty'),
    desc: el('smc-desc'),
    finish: el('smc-finish'),
    size: el('smc-size'),
    note: el('smc-note'), // New note field

    // Status pill
    pill: el('smc-pill'),
    pillText: el('smc-pill-text'),

    // Price
    priceVal: el('smc-price'), // Moved to Page 3

    // Preview (Page 2)
    previewLoading: el('smc-preview-loading'),
    previewEmpty: el('smc-preview-empty'),
    previewImg: el('smc-preview-img'),
    previewDownload: el('smc-preview-download'),
    previewShare: el('smc-preview-share'),

    // Result (Page 3)
    resultImg: el('smc-result-img'),
    productName: el('smc-product-name'),
    atcTrigger: el('smc-atc-trigger'),
    backBtn: el('smc-back-btn'),

    // ETA
    etaWrap: el('smc-eta'),
    etaLabel: el('smc-eta-label'),
    etaTime: el('smc-eta-time'),

    // Buttons
    ctaBtn: el('smc-cta-btn'),
    ctaLabel: el('smc-cta-label'),
    resetBtn: el('smc-reset-btn'),
    openBtn: el('smc-open-btn'),
    continueBtn: el('smc-continue-btn'),
    continueLabel: el('smc-continue-label'),

    // Hidden form properties
    propImg: el('smc-prop-img'),
    propDesc: el('smc-prop-desc'),
    propFinish: el('smc-prop-finish'),
    propSize: el('smc-prop-size'),
    propRoute: el('smc-prop-route'),
    propGen: el('smc-prop-gen'),
    propPrice: el('smc-prop-price'),
    propNote: el('smc-prop-note'), // New prop for note

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
  // ! State Management
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
    generatedProductUrl: '',
    generatedProductName: '',
    hasGeneratedDesign: false,
    cooldown: null, // Timestamp when cooldown expires (current time + 5 minutes)
  };

  // ============================================================================
  // ! LocalStorage Persistence
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
          generatedProductUrl: state.generatedProductUrl,
          generatedProductName: state.generatedProductName,
          hasGeneratedDesign: state.hasGeneratedDesign,
          cooldown: state.cooldown,
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
          note: elements.note?.value || '',
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
          hasNote: !!parsed.note,
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

        // Restore note
        if (formDataObj.note && elements.note) {
          elements.note.value = formDataObj.note;
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
  // ! Timer Management
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
  // ! UI Updates
  // ============================================================================
  const ui = {
    setPillState(kind, text) {
      if (elements.pill)
        elements.pill.setAttribute('data-state', kind || 'idle');
      if (elements.pillText) elements.pillText.textContent = text || 'Bereit';
    },

    setPreviewLoading(on) {
      if (elements.previewLoading) {
        elements.previewLoading.style.display = on ? 'flex' : 'none';
      }
    },

    showPreview(url) {
      if (!url) {
        this.showPlaceholder('Keine Vorschau verfügbar');
        return;
      }

      // Show loading state
      this.setPreviewLoading(true);
      if (elements.previewEmpty) {
        elements.previewEmpty.style.display = 'none';
      }

      // Update page 2 preview
      if (elements.previewImg) {
        elements.previewImg.onload = () => {
          // Hide loading and empty states when image loads
          this.setPreviewLoading(false);
          if (elements.previewEmpty) {
            elements.previewEmpty.style.display = 'none';
          }
          // Show image and enable download, share, and continue buttons
          elements.previewImg.classList.remove('twcss-hidden');
          if (elements.previewDownload)
            elements.previewDownload.disabled = false;
          if (elements.previewShare) elements.previewShare.disabled = false;
          // Enable continue button when preview is available
          if (elements.continueBtn && state.current === 'creating') {
            elements.continueBtn.disabled = false;
          }
          logger.debug('Preview image loaded successfully', { url });
        };
        elements.previewImg.onerror = () => {
          logger.error('Failed to load preview image', { url });
          this.setPreviewLoading(false);
          if (elements.previewEmpty) {
            elements.previewEmpty.textContent =
              'Fehler beim Laden der Vorschau';
            elements.previewEmpty.style.display = 'block';
          }
          // Keep buttons disabled on error
          if (elements.previewDownload)
            elements.previewDownload.disabled = true;
          if (elements.previewShare) elements.previewShare.disabled = true;
        };
        elements.previewImg.src = url;
      }

      // Update page 3 preview
      if (elements.resultImg) {
        elements.resultImg.src = url;
      }
    },

    showPlaceholder(text) {
      if (elements.previewEmpty) {
        elements.previewEmpty.textContent = text || 'Starte zuerst den Entwurf';
        elements.previewEmpty.style.display = 'block';
      }
      if (elements.previewImg) {
        elements.previewImg.classList.add('twcss-hidden');
      }
      // Disable buttons when showing placeholder
      if (elements.previewDownload) elements.previewDownload.disabled = true;
      if (elements.previewShare) elements.previewShare.disabled = true;
      this.setPreviewLoading(false);
    },

    lockInputs(on) {
      const inputs = [
        elements.upload,
        elements.desc,
        elements.finish,
        elements.size,
        elements.note,
      ];
      if (inputs.some((el) => !el)) return;

      state.locked = !!on;
      inputs.forEach((input) => {
        if (input) input.disabled = state.locked;
      });

      if (elements.resetBtn) {
        // Only show reset button on page 1 if not locked, or if state is not init?
        // Actually reset is available via back button on page 3 or direct reset on page 1
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
      // Only updates CTA button state without navigation
      switch (state.current) {
        case 'init': {
          // If a design has been generated and we're back on page 1, show "Weiter →"
          if (
            state.hasGeneratedDesign &&
            (state.lastMockUrl || state.lastEntUrl)
          ) {
            this.setCta('Weiter →', true);
            return;
          }

          const ok = elements.desc?.value?.trim().length >= 5;

          // Check for cooldown
          const cooldownInfo = this.checkCooldown();
          if (cooldownInfo.isOnCooldown) {
            this.setCta(cooldownInfo.countdownText, false);
            return;
          }

          // Default: "Entwurf erstellen"
          this.setCta('Entwurf erstellen', ok && !state.locked);
          break;
        }
        case 'creating':
          // Show "Weiter →" when creating (user can navigate to preview page)
          this.setCta('Weiter →', true);
          break;
        case 'ready':
          // Show "Weiter →" when ready (user can navigate to preview page)
          this.setCta('Weiter →', true);
          break;
        default:
          this.setCta('Wird erstellt', false);
      }
    },

    checkCooldown() {
      if (!state.cooldown) {
        return { isOnCooldown: false, countdownText: '' };
      }

      const now = Date.now();
      const remaining = state.cooldown - now;

      if (remaining <= 0) {
        // Cooldown expired, clear it
        state.cooldown = null;
        storageManager.saveState();
        return { isOnCooldown: false, countdownText: '' };
      }

      // Calculate minutes and seconds
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const countdownText = `Bitte warten (${String(minutes).padStart(
        2,
        '0',
      )}:${String(seconds).padStart(2, '0')})`;

      return { isOnCooldown: true, countdownText };
    },

    navigateTo(page) {
      if (!elements.slider) return;

      let translateX = '0%';
      switch (page) {
        case 1:
          translateX = '0%';
          break;
        case 2:
          translateX = '-100%';
          break;
        case 3:
          translateX = '-200%';
          break;
        default:
          translateX = '0%';
      }

      // Set opacity for all pages: fade out inactive pages, fade in active page
      const pages = [elements.page1, elements.page2, elements.page3];
      pages.forEach((pageEl, index) => {
        if (pageEl) {
          const targetPage = page - 1; // Convert to 0-based index
          if (index === targetPage) {
            // Fade in the active page
            pageEl.style.opacity = '0';
            pageEl.style.transition = 'opacity 0.3s ease-in-out';
            // Use requestAnimationFrame to ensure the opacity: 0 is applied before transitioning to 1
            requestAnimationFrame(() => {
              if (pageEl) {
                pageEl.style.opacity = '1';
              }
            });
          } else {
            // Fade out inactive pages
            pageEl.style.opacity = '0';
            pageEl.style.transition = 'opacity 0.3s ease-in-out';
          }
        }
      });

      elements.slider.style.transform = `translateX(${translateX})`;
      logger.debug('Navigating to page', { page, translateX });
    },

    updateUIFromState() {
      logger.debug('updateUIFromState called', { current: state.current });

      // Navigation
      switch (state.current) {
        case 'init':
          this.navigateTo(1);
          break;
        case 'creating':
          logger.debug('Navigating to page 2 (creating state)');
          this.navigateTo(2);
          // Enable continue button when we have a preview
          if (elements.continueBtn) {
            elements.continueBtn.disabled =
              !state.lastMockUrl && !state.lastEntUrl;
          }
          break;
        case 'ready':
          this.navigateTo(3);
          if (state.generatedProductName && elements.productName) {
            elements.productName.textContent = state.generatedProductName;
          }
          // Enable continue button when ready
          if (elements.continueBtn) {
            elements.continueBtn.disabled = false;
          }
          // Update backBtn state (Neu anfangen) based on cooldown
          if (typeof updateBackBtnState === 'function') {
            updateBackBtnState();
          }
          break;
        default:
          logger.warn('Unknown state in updateUIFromState', {
            current: state.current,
          });
          this.navigateTo(1);
      }

      // CTA State
      this.setCtaFromState();
    },

    applyPriceDisplay() {
      if (!elements.priceVal) return;
      if (state.pendingPriceValue && state.priceReady) {
        // Always show the calculated price when available
        elements.priceVal.textContent = state.pendingPriceValue;
      } else {
        elements.priceVal.textContent =
          'Den Preis berechnen wir nach dem Entwurf.';
      }
    },
  };

  // ============================================================================
  // ! Form & Data Management
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
      if (elements.propNote && elements.note)
        elements.propNote.value = elements.note.value || '';
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
  // ! Price Management
  // ============================================================================
  const PRICE_MATRIX = {
    // Material prices by size (in euros)
    'Schwarz pulverbeschichtet': {
      '22,5 cm': 59,
      '45 cm': 89,
      '55 cm': 99,
      '75 cm': 169,
      '75 cm+': 0, // Custom pricing
    },
    'Anthrazit pulverbeschichtet': {
      '22,5 cm': 59,
      '45 cm': 89,
      '55 cm': 99,
      '75 cm': 169,
      '75 cm+': 0,
    },
    'Weiß pulverbeschichtet': {
      '22,5 cm': 59,
      '45 cm': 89,
      '55 cm': 99,
      '75 cm': 169,
      '75 cm+': 0,
    },
    Gold: {
      '22,5 cm': 59,
      '45 cm': 89,
      '55 cm': 99,
      '75 cm': 169,
      '75 cm+': 0,
    },
    'Cortenstahl Optik': {
      '22,5 cm': 69,
      '45 cm': 99,
      '55 cm': 129,
      '75 cm': 199,
      '75 cm+': 0,
    },
    'Satinierter Edelstahl': {
      '22,5 cm': 69,
      '45 cm': 99,
      '55 cm': 129,
      '75 cm': 199,
      '75 cm+': 0,
    },
  };

  const calculatePrice = (material, size) => {
    if (!material || !size) return null;

    const materialPrices = PRICE_MATRIX[material];
    if (!materialPrices) {
      logger.warn('Unknown material for price calculation', { material });
      return null;
    }

    const price = materialPrices[size];
    if (price === undefined) {
      logger.warn('Unknown size for price calculation', { material, size });
      return null;
    }

    // Custom pricing for 75 cm+
    if (price === 0 && size === '75 cm+') {
      return null; // Return null to indicate custom pricing needed
    }

    return price;
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '';
    // Format with two decimal places and comma as decimal separator
    const formatted = Number(price).toFixed(2).replace('.', ',');
    return `${formatted} €`;
  };

  const priceManager = {
    calculate(material, size) {
      const price = calculatePrice(material, size);
      const formattedPrice = formatPrice(price);

      if (formattedPrice) {
        // Valid price calculated
        state.pendingPriceValue = formattedPrice;
        state.priceReady = true;
        storageManager.saveState(); // Save to localStorage
        formData.updateProps();
        ui.applyPriceDisplay(); // Update UI immediately
        if (state.current === 'creating' && !state.lastMockUrl) {
          ui.setPillState('work', 'Preis berechnet');
        }
        logger.debug('Price calculated and saved', {
          material,
          size,
          price,
          formattedPrice,
        });
        return formattedPrice;
      } else {
        // No valid price (missing material/size or custom pricing needed)
        const wasPriceReady = state.priceReady;
        state.pendingPriceValue = '';
        state.priceReady = false;
        storageManager.saveState(); // Save cleared state to localStorage
        formData.updateProps();

        // Update UI with appropriate message
        if (!material || !size) {
          // Missing material or size
          if (elements.priceVal) {
            elements.priceVal.textContent =
              'Den Preis berechnen wir nach dem Entwurf.';
          }
        } else {
          // Custom pricing needed (75 cm+)
          if (elements.priceVal) {
            elements.priceVal.textContent = 'Preis auf Anfrage';
          }
        }

        logger.debug('Price calculation returned null', {
          material,
          size,
          hasMaterial: !!material,
          hasSize: !!size,
        });
        return null;
      }
    },

    set(txt) {
      // Legacy method for backward compatibility - can still accept text
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
  // ! API Communication
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

    runPriceOnce() {
      // Calculate price locally based on material and size
      const material = elements.finish?.value || '';
      const size = elements.size?.value || '';

      if (!material || !size) {
        logger.warn('Cannot calculate price: missing material or size', {
          hasMaterial: !!material,
          hasSize: !!size,
        });
        return;
      }

      const calculatedPrice = priceManager.calculate(material, size);
      if (calculatedPrice) {
        logger.info('Price calculated locally', {
          material,
          size,
          price: calculatedPrice,
        });
      } else {
        logger.debug('Price calculation returned null (custom pricing)', {
          material,
          size,
        });
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
            ui.showPreview(entUrl);
          }
        }

        if (mode === 'mock' || mode === 'any') {
          const mockUrl = normalizeImageUrl(extractField(j, 'Mock Up'));
          if (mockUrl) {
            state.lastMockUrl = mockUrl;
            state.forceMockLoading = false;

            // Start preparing product info immediately
            this.prepareProduct();

            timerManager.stopEta();
            timerManager.clearAll();

            ui.setPreviewLoading(false);
            ui.applyPriceDisplay();
            ui.showPreview(mockUrl);

            state.current = 'ready';

            // ! RATE LIMIT
            // Mark that a design has been generated and set cooldown (5 minutes)
            state.hasGeneratedDesign = true;
            state.cooldown = Date.now() + 5 * 60 * 1000; // 5 minutes from now

            storageManager.saveState();

            ui.setPillState('ok', 'Fertig!');

            // Wait 3 seconds then move to page 3
            logger.info(
              'Mock received, waiting 3s before switching to result page',
            );
            setTimeout(() => {
              ui.updateUIFromState();
            }, 3000);

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

    async prepareProduct() {
      try {
        logger.info('Fetching product info...');
        const raw = await this.postText(
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

        if (productName) {
          state.generatedProductName = productName;
          if (elements.productName)
            elements.productName.textContent = productName;
        }

        if (productUrl) {
          state.generatedProductUrl = productUrl;
        }

        state.checkoutReady = true;
        storageManager.saveState();
        logger.info('Product info prepared', { productName, productUrl });
      } catch (error) {
        logger.error('Failed to prepare product info', error);
      }
    },

    handleFailure() {
      logger.error('Creator workflow failure detected');
      timerManager.stopEta();
      timerManager.clearAll();
      ui.setPreviewLoading(false);
      ui.showPlaceholder('Fehlgeschlagen. Bitte Neu anfangen');
      state.current = 'init';
      ui.updateUIFromState();
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

      // Check for cooldown
      const cooldownInfo = ui.checkCooldown();
      if (cooldownInfo.isOnCooldown) {
        logger.warn('Cannot start creator: still on cooldown', {
          cooldownText: cooldownInfo.countdownText,
        });
        ui.setCtaFromState(); // Update button with countdown
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
        generatedProductUrl: '',
        generatedProductName: '',
      });

      logger.info('State set to creating', {
        current: state.current,
        runStartedAt: state.runStartedAt,
        timestamp: new Date().toISOString(),
      });

      storageManager.saveState();

      // Verify state was saved correctly
      const savedState = storageManager.loadState();
      if (savedState && savedState.current !== 'creating') {
        logger.error('State was not saved correctly!', {
          expected: 'creating',
          actual: savedState.current,
          savedState: savedState,
        });
      } else {
        logger.debug('State verified in localStorage', {
          current: savedState?.current,
        });
      }

      storageManager.saveFormData();

      timerManager.stopEta();
      timerManager.stopHold();
      timerManager.clearAll();

      priceManager.setCalculating();
      ui.setPillState('work', 'Wir starten…');
      ui.lockInputs(true);

      // Verify state is still 'creating' before updating UI
      if (state.current !== 'creating') {
        logger.error('State changed before UI update!', {
          expected: 'creating',
          actual: state.current,
        });
        state.current = 'creating';
        storageManager.saveState();
      }

      ui.updateUIFromState(); // Navigate to page 2

      logger.debug('UI updated after setting state to creating', {
        current: state.current,
      });

      ui.showPlaceholder('Wir erstellen gerade deine Vorschau');
      ui.setPreviewLoading(true);

      timerManager.startEta('Geschätzte Zeit', TIMING.TOTAL_MS, () => {
        if (state.current === 'creating' && !state.lastMockUrl) {
          state.forceMockLoading = true;
          ui.setPillState('work', 'Vorschau wird geladen');
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

        // Ensure state is still 'creating' after receiving generator ID
        if (state.current !== 'creating') {
          logger.warn(
            'State was not creating when generator ID received, resetting',
            {
              current: state.current,
              generatorId: id,
            },
          );
          state.current = 'creating';
        }

        storageManager.saveState();
        formData.updateProps();
        ui.setPillState('work', 'Wird erstellt');

        logger.debug('State after generator ID', {
          current: state.current,
          generatorId: state.generatorId,
        });

        this.runCreatorPreviewOnce('Sofort nach run-creator');

        // Calculate price immediately (no API call needed)
        timers.priceA = setTimeout(() => {
          try {
            ui.setPillState('work', 'Preis wird berechnet');
            this.runPriceOnce();
          } catch (error) {
            logger.error('Error in price calculation callback', error);
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

    // ...
  };

  // ============================================================================
  // ! Status Management
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
  // ! Download & Share Helpers
  // ============================================================================
  const downloadHelper = {
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

        logger.info('Preview downloaded successfully', { filename: name });
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
          logger.info('Preview downloaded via direct link', { filename: name });
        } catch (fallbackError) {
          logger.error(
            'Direct link download failed, opening in new tab',
            fallbackError,
          );
          window.open(url, '_blank');
        }
      }
    },
  };

  const shareHelper = {
    async shareUrl(url, title = 'Mein personalisiertes Schild') {
      if (!url) return false;

      // Try Web Share API first (mobile-friendly)
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: 'Schau dir mein personalisiertes Schild an!',
            url: url,
          });
          logger.info('Shared via Web Share API');
          return true;
        } catch (error) {
          // User cancelled or error occurred
          if (error.name !== 'AbortError') {
            logger.warn(
              'Web Share API failed, falling back to clipboard',
              error,
            );
          } else {
            return false; // User cancelled
          }
        }
      }

      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        logger.info('URL copied to clipboard');
        // Show a brief feedback (you could add a toast notification here)
        if (elements.previewShare) {
          const originalText = elements.previewShare.textContent;
          elements.previewShare.textContent = 'Kopiert!';
          setTimeout(() => {
            if (elements.previewShare) {
              elements.previewShare.textContent = originalText;
            }
          }, 2000);
        }
        return true;
      } catch (error) {
        logger.error('Failed to copy URL to clipboard', error);
        // Last resort: show URL in alert
        alert(`Link zum Teilen:\n${url}`);
        return false;
      }
    },
  };

  // ============================================================================
  // ! Reset & Initialization
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
        generatedProductUrl: '',
        generatedProductName: '',
      });

      ui.lockInputs(false);
      ui.setPillState('idle', 'Bereit');

      if (elements.priceVal) {
        elements.priceVal.textContent =
          'Den Preis berechnen wir nach dem Entwurf.';
      }
      ui.showPlaceholder('Starte zuerst den Entwurf');
      ui.setPreviewLoading(false);

      ui.lockScroll(false);
      ui.updateUIFromState();
      formData.updateProps();

      logger.info('Application state reset complete');
    } catch (error) {
      logger.error('Error during reset', error);
    }
  };

  // ============================================================================
  // ! Event Listeners
  // ============================================================================
  // Back to configuration button handler (page 2) - navigates to page 1, doesn't change state
  const backToConfigBtn = document.querySelector('[data-back-to-config]');
  if (backToConfigBtn) {
    backToConfigBtn.addEventListener('click', () => {
      try {
        logger.debug(
          'Back to configuration button clicked - navigating to page 1',
          {
            currentState: state.current,
          },
        );
        // Only navigate to page 1, do NOT change state
        ui.navigateTo(1);
        ui.setCtaFromState(); // Update button text based on current state
      } catch (error) {
        logger.error(
          'Error handling back to configuration button click',
          error,
        );
      }
    });
  }

  // Close button handlers (using data-close-button attribute)
  // These will close the modal
  const closeButtons = document.querySelectorAll('[data-close-button]');
  closeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      try {
        // Close the modal
        document.body.style.overflow = 'auto';
        elements.smc?.classList.add('smc--scale-down');
        logger.debug('Close button clicked');
      } catch (error) {
        logger.error('Error handling close button click', error);
      }
    });
  });

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

  if (elements.backBtn) {
    elements.backBtn.addEventListener('click', () => {
      try {
        logger.debug('Neu anfangen button clicked');

        // Check for cooldown - if on cooldown, don't allow reset
        const cooldownInfo = ui.checkCooldown();
        if (cooldownInfo.isOnCooldown) {
          logger.warn('Cannot reset: still on cooldown', {
            cooldownText: cooldownInfo.countdownText,
          });
          return;
        }

        logger.info('Resetting state for new design');
        timerManager.clearAll();
        timerManager.stopEta();

        // Clear all generation state including preview URLs
        // Reset hasGeneratedDesign so CTA button goes back to "Entwurf erstellen"
        Object.assign(state, {
          current: 'init',
          locked: false,
          generatorId: '',
          lastMockUrl: '',
          lastEntUrl: '',
          checkoutReady: false,
          priceReady: false,
          previewDone: false,
          runStartedAt: 0,
          generatedProductUrl: '',
          generatedProductName: '',
          hasGeneratedDesign: false, // Reset so CTA button shows "Entwurf erstellen"
          // Keep cooldown - rate limit persists across resets
        });
        storageManager.saveState();

        ui.lockInputs(false);
        ui.setPillState('idle', 'Bereit');
        ui.showPlaceholder('Starte zuerst den Entwurf');
        ui.setPreviewLoading(false);
        ui.updateUIFromState(); // Navigate to page 1
        ui.setCtaFromState(); // Update button text back to "Entwurf erstellen"
      } catch (error) {
        logger.error('Error handling Neu anfangen button click', error);
      }
    });
  }

  // Function to update backBtn state based on cooldown
  const updateBackBtnState = () => {
    if (!elements.backBtn) return;

    const cooldownInfo = ui.checkCooldown();
    if (cooldownInfo.isOnCooldown) {
      elements.backBtn.disabled = true;
      // Extract countdown time from the text (format: "Bitte warten (MM:SS)")
      const countdownMatch =
        cooldownInfo.countdownText.match(/\((\d{2}:\d{2})\)/);
      const countdownTime = countdownMatch ? countdownMatch[1] : '';
      // Update button text with countdown
      if (!elements.backBtn.hasAttribute('data-original-text')) {
        elements.backBtn.setAttribute('data-original-text', 'Neu anfangen');
      }
      elements.backBtn.textContent = `Neu anfangen (${countdownTime})`;
    } else {
      elements.backBtn.disabled = false;
      // Restore original text
      const originalText =
        elements.backBtn.getAttribute('data-original-text') || 'Neu anfangen';
      elements.backBtn.textContent = originalText;
      elements.backBtn.removeAttribute('data-original-text');
    }
  };

  if (elements.atcTrigger) {
    elements.atcTrigger.addEventListener('click', async () => {
      try {
        logger.debug('ATC trigger clicked');
        if (!state.generatedProductUrl) {
          // If we don't have a product URL yet (maybe prepareProduct failed), try again?
          // Or fallback to base product add?
          logger.warn('No generated product URL found');

          // Fallback: Submit the base form with properties?
          // The form is on Page 1.
          // But we are on Page 3.
          // We can submit the form programmatically?
          // The form action is cart/add.
          // Let's try adding the generated product if available, else fail.

          // If we have state.generatedProductUrl, use api.addToCartFromProductUrl
          // Wait, api.addToCartFromProductUrl was adding a NEW variant.
          // If we just want to add the current product with properties, we can submit the form #smc-form.
          // User said: "which shall include... the name of the product (the api provides that)".
          // Usually this means we are creating a custom product.

          // Let's try to prepare product again if missing
          await api.prepareProduct();
        }

        if (state.generatedProductUrl) {
          ui.setPillState('work', 'In den Warenkorb...');
          const res = await api.addToCartFromProductUrl(
            state.generatedProductUrl,
          );
          if (res.ok) {
            ui.setPillState('ok', 'Im Warenkorb');
            window.location.href = '/checkout'; // Or open cart drawer?
          } else {
            ui.setPillState('bad', 'Fehler');
          }
        } else {
          ui.setPillState('bad', 'Produkt nicht bereit');
        }
      } catch (error) {
        logger.error('Error handling ATC click', error);
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

  if (elements.note) {
    elements.note.addEventListener(
      'input',
      () => {
        try {
          if (state.locked) return;
          formData.updateProps();
          storageManager.saveFormData();
        } catch (error) {
          logger.error('Error handling note input', error);
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
      // Calculate and update price immediately when material changes
      const material = elements.finish.value || '';
      const size = elements.size?.value || '';
      priceManager.calculate(material, size);
    });
  }

  if (elements.size) {
    elements.size.addEventListener('change', () => {
      if (state.locked) return;
      formData.updateProps();
      storageManager.saveFormData();
      // Calculate and update price immediately when size changes
      const material = elements.finish?.value || '';
      const size = elements.size.value || '';
      priceManager.calculate(material, size);
    });
  }

  if (elements.ctaBtn) {
    elements.ctaBtn.addEventListener('click', () => {
      try {
        logger.debug('CTA button clicked', { currentState: state.current });
        const buttonText = elements.ctaLabel?.textContent?.trim() || '';

        // If button says "Weiter →", navigate to page 2 (preview)
        if (buttonText === 'Weiter →' || buttonText.includes('Weiter')) {
          logger.debug('Continue button clicked, navigating to page 2');
          // Always navigate to page 2 when "Weiter →" is clicked
          // If state is creating or ready, we can navigate directly
          if (state.current === 'creating' || state.current === 'ready') {
            ui.navigateTo(2);
          } else if (
            state.current === 'init' &&
            (state.lastMockUrl || state.lastEntUrl)
          ) {
            // If on init but have preview, navigate to page 2
            ui.navigateTo(2);
          }
          return;
        }

        // Otherwise, if on init state, start creating a new design
        if (state.current === 'init') {
          api.startRunCreator();
        }
      } catch (error) {
        logger.error('Error handling CTA button click', error, {
          currentState: state.current,
        });
      }
    });
  }

  // Download button (Page 2)
  if (elements.previewDownload) {
    elements.previewDownload.addEventListener('click', async () => {
      try {
        const url = state.lastMockUrl || state.lastEntUrl;
        if (!url) {
          logger.warn('No preview URL available for download');
          return;
        }
        logger.debug('Download button clicked', { url });
        await downloadHelper.downloadUrl(
          url,
          `steelmonks-vorschau-${state.generatorId || 'download'}.png`,
        );
      } catch (error) {
        logger.error('Error handling download button click', error);
      }
    });
  }

  // Share button (Page 2)
  if (elements.previewShare) {
    elements.previewShare.addEventListener('click', async () => {
      try {
        const url = state.lastMockUrl || state.lastEntUrl;
        if (!url) {
          logger.warn('No preview URL available for sharing');
          return;
        }
        logger.debug('Share button clicked', { url });
        await shareHelper.shareUrl(url, 'Mein personalisiertes Schild');
      } catch (error) {
        logger.error('Error handling share button click', error);
      }
    });
  }

  // Continue button (Page 2) - navigates to page 3, doesn't change state
  if (elements.continueBtn) {
    elements.continueBtn.addEventListener('click', () => {
      try {
        logger.debug('Continue button clicked - navigating to page 3', {
          currentState: state.current,
        });
        // Only navigate to page 3, do NOT change state
        ui.navigateTo(3);
      } catch (error) {
        logger.error('Error handling continue button click', error);
      }
    });
  }

  // ============================================================================
  // ! Animations (Closing, Opening)
  // ============================================================================
  if (elements.smc && elements.openBtn) {
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

    // Close Button handlers (using data-close-button attribute)
    // This allows multiple close buttons across different pages
    const closeButtonsForAnimation = document.querySelectorAll(
      '[data-close-button]',
    );
    closeButtonsForAnimation.forEach((btn) => {
      btn.addEventListener('click', () => {
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
    });
  }

  // ============================================================================
  // ! Initialization
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
        generatedProductUrl: savedState.generatedProductUrl || '',
        generatedProductName: savedState.generatedProductName || '',
        hasGeneratedDesign: savedState.hasGeneratedDesign || false,
        cooldown: savedState.cooldown || null,
      });

      // Restore form data if available
      if (savedFormData) {
        storageManager.restoreFormData(savedFormData);
      }

      // Restore preview if we have a mock URL
      if (state.lastMockUrl) {
        ui.showPreview(state.lastMockUrl);
        if (state.current === 'ready') {
          ui.setPillState('ok', 'Entwurf ist fertig');
          // Enable continue button when ready
          if (elements.continueBtn) {
            elements.continueBtn.disabled = false;
          }
        } else {
          ui.setPillState('work', 'Wird erstellt');
        }
      } else if (state.lastEntUrl) {
        ui.showPreview(state.lastEntUrl);
        ui.setPillState('work', 'Wird erstellt');
      }

      // Start cooldown countdown if on cooldown
      if (state.cooldown) {
        const cooldownInterval = setInterval(() => {
          const cooldownInfo = ui.checkCooldown();
          if (!cooldownInfo.isOnCooldown) {
            clearInterval(cooldownInterval);
            // Update button text when cooldown expires
            if (state.current === 'init') {
              ui.setCtaFromState();
            }
            // Update backBtn state when cooldown expires
            if (
              state.current === 'ready' &&
              typeof updateBackBtnState === 'function'
            ) {
              updateBackBtnState();
            }
          } else {
            // Update button text with countdown
            if (state.current === 'init' && elements.ctaBtn) {
              ui.setCtaFromState();
            }
            // Update backBtn state with countdown
            if (
              state.current === 'ready' &&
              typeof updateBackBtnState === 'function'
            ) {
              updateBackBtnState();
            }
          }
        }, 1000); // Update every second
      }

      // Restore price if available, or calculate if material and size are set
      if (state.priceReady && state.pendingPriceValue) {
        ui.applyPriceDisplay();
      } else if (elements.finish?.value && elements.size?.value) {
        // Calculate price if we have material and size but no saved price
        priceManager.calculate(elements.finish.value, elements.size.value);
      }

      // Restore timer if available
      timerManager.restoreEta();

      // Update UI based on restored state
      ui.updateUIFromState();
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

      ui.showPlaceholder('Starte zuerst den Entwurf');
      ui.setPreviewLoading(false);
      ui.lockInputs(false);
      ui.updateUIFromState(); // Should go to page 1

      // Calculate price if material and size are available
      if (elements.finish?.value && elements.size?.value) {
        priceManager.calculate(elements.finish.value, elements.size.value);
      }
    }

    logger.info('Steelmonks Sign Creator initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Steelmonks Sign Creator', error);
    ui.setPillState('bad', 'Initialisierungsfehler');
  }
});
