document.addEventListener('DOMContentLoaded', () => {
  // ============================================================================
  // ! Configuration & Constants
  // ============================================================================
  const TIMING = {
    TOTAL_MS: 180000,
    FETCH_TIMEOUT_MS: 25000,
    TIME_PRICE_MS: 5000,
    FIRST_DRAFT_CHECK_DELAY_MS: 70000, // When to first check for draft preview (70 seconds)
    FINAL_MOCK_CHECK_START_MS: 90000, // When to start checking for final mockup (90 seconds)
    FINAL_MOCK_CHECK_END_MS: 240000, // When to stop checking for final mockup (240 seconds)
    FINAL_MOCK_CHECK_INTERVAL_MS: 20000, // How often to check for final mockup (every 20 seconds)
    HOLD_DURATION_MS: 30 * 60 * 1000,
  };

  const DEFAULT_ENDPOINTS = {
    run: '/apps/creator/run-creator',
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
      // Silent fail
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

  // ============================================================================
  // ! Utility Functions
  // ============================================================================
  const el = (id) => document.getElementById(id);

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
      return '';
    }
  };

  /**
   * Ensures preview images are loaded if they don't exist yet.
   * This function is called after state is loaded to fetch preview images
   * that might be missing from the saved state.
   */
  const ensurePreviewLoaded = async () => {
    console.log('ensurePreviewLoaded');
    // Only fetch if we have a generator ID but no preview URLs
    if (!state.generatorId) {
      return;
    }


    // If we already have a mock URL, we're good
    if (state.lastMockUrl) {
      return;
    }

    // If we have a draft URL but no mock URL, try to fetch mock
    if (state.lastDraftUrl && !state.lastMockUrl) {
      // We're in the process of generating, try to fetch mock
      try {
        await api.fetchSignOnce('mock');
      } catch (error) {
        // Silently fail - preview might not be ready yet
      }
      return;
    }

    // If we have neither URL but have a generator ID, we're in the creation process
    // Try to fetch any available preview
    if (!state.lastDraftUrl && !state.lastMockUrl) {
      try {
        await api.fetchSignOnce('any');
      } catch (error) {
        // Silently fail - preview might not be ready yet
      }
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
    resetBtn: el('smc-reset-btn'),

    // Form inputs
    upload: el('smc-upload'),
    uploadLabel: el('smc-upload-label'),
    uploadPrevImg: el('smc-upload-preview'),
    uploadPrevEmpty: el('smc-upload-preview-empty'),
    desc: el('smc-desc'),
    finish: el('smc-finish'),
    size: el('smc-size'),
    note: el('smc-note'), // New note field
    type: el('smc-type'), // New type field
    bolts: el('smc-bolts'), // New bolts/mounting field

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
    previewActions: el('smc-preview-actions'),

    // Result (Page 3)
    resultImg: el('smc-result-img'),
    productName: el('smc-product-name'),
    confirmBtn: el('smc-confirm-btn'),
    confirmBtnWrap: el('smc-confirm-btn-wrap'),
    backBtn: el('smc-back-btn'),

    // Form and popup
    form: el('smc-form'),
    variantIdInput: el('smc-variant-id'),
    confirmationPopup: document.querySelector('[data-cart-confirmation-popup]'),
    confirmationPopupClose: document.querySelector('[data-cart-confirmation-popup-close]'),
    confirmationPopupBackdrop: document.querySelector('[data-cart-confirmation-popup-backdrop]'),

    // ETA
    etaWrap: el('smc-eta'),
    etaLabel: el('smc-eta-label'),
    etaTime: el('smc-eta-time'),

    // Buttons
    ctaBtn: el('smc-cta-btn'),
    ctaLabel: el('smc-cta-label'),
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
    propType: el('smc-prop-type'), // New prop for type
    propBolts: el('smc-prop-bolts'), // New prop for bolts/mounting

    // Info modal
    smcInfoModal: el('smc-info-modal'),

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
    } catch (error) {}
  } else {
  }

  // ============================================================================
  // ! State Management
  // ============================================================================
  // Skip preview loading in development and load preset generated state
  let isDevelopment;
  if (window.location.hostname.includes('localhost' || '127.0.0.1')) {
    isDevelopment = true;
  }

  const state = {
    current: 'init',
    locked: false,
    generatorId: '',
    lastMockUrl: '',
    lastDraftUrl: '',
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
    generatedProductId: '',
    generatedVariantId: '',
    hasGeneratedDesign: false,
    designConfirmed: false,
    cooldown: null, // Timestamp when cooldown expires (current time + 30 seconds)
  };

  // ============================================================================
  // ! LocalStorage Persistence
  // ============================================================================
  const STORAGE_KEY = 'steelmonks-sign-creator-state-123';
  const STORAGE_TIMER_KEY = 'steelmonks-sign-creator-timer-123';
  const STORAGE_FORM_KEY = 'steelmonks-sign-creator-form-123';

  const storageManager = {
    saveState() {
      try {
        const stateToSave = {
          current: state.current,
          generatorId: state.generatorId,
          lastMockUrl: state.lastMockUrl,
          lastDraftUrl: state.lastDraftUrl,
          priceReady: state.priceReady,
          pendingPriceValue: state.pendingPriceValue,
          previewDone: state.previewDone,
          runStartedAt: state.runStartedAt,
          generatedProductUrl: state.generatedProductUrl,
          generatedProductName: state.generatedProductName,
          generatedProductId: state.generatedProductId,
          generatedVariantId: state.generatedVariantId,
          hasGeneratedDesign: state.hasGeneratedDesign,
          designConfirmed: state.designConfirmed,
          cooldown: state.cooldown,
          // Add timestamp if it doesn't exist (for new state) or preserve existing one
          createdAt: this.getCreatedAt() || Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (error) {}
    },

    getCreatedAt() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return parsed.createdAt || null;
      } catch (error) {
        return null;
      }
    },

    isStateExpired() {
      const createdAt = this.getCreatedAt();
      if (!createdAt) return false; // No timestamp means it's a new state or old format

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const isExpired = now - createdAt > twentyFourHours;

      if (isExpired) {
        // State expired
      }

      return isExpired;
    },

    loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);

        // If loaded state doesn't have createdAt, add it now for future expiration checks
        if (!parsed.createdAt) {
          parsed.createdAt = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      } catch (error) {
        return null;
      }
    },

    clearState() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TIMER_KEY);
        localStorage.removeItem(STORAGE_FORM_KEY);
      } catch (error) {}
    },

    saveTimer(etaEndsAt) {
      try {
        if (etaEndsAt && etaEndsAt > Date.now()) {
          localStorage.setItem(
            STORAGE_TIMER_KEY,
            JSON.stringify({ etaEndsAt }),
          );
        } else {
          localStorage.removeItem(STORAGE_TIMER_KEY);
        }
      } catch (error) {}
    },

    loadTimer() {
      try {
        const saved = localStorage.getItem(STORAGE_TIMER_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        // Only return if timer hasn't expired
        if (parsed.etaEndsAt && parsed.etaEndsAt > Date.now()) {
          return parsed;
        } else {
          localStorage.removeItem(STORAGE_TIMER_KEY);
          return null;
        }
      } catch (error) {
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
          type: elements.type?.value || '',
          bolts: elements.bolts?.value || '',
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
            } catch (error) {}
          };
          reader.onerror = (error) => {
            // Save without image
            localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formToSave));
          };
          reader.readAsDataURL(file);
        } else {
          localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formToSave));
        }
      } catch (error) {}
    },

    loadFormData() {
      try {
        const saved = localStorage.getItem(STORAGE_FORM_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (error) {
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

        // Restore type
        if (formDataObj.type && elements.type) {
          elements.type.value = formDataObj.type;
        }

        // Restore bolts/mounting
        if (formDataObj.bolts && elements.bolts) {
          elements.bolts.value = formDataObj.bolts;
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
        }

        formData.updateProps();
      } catch (error) {}
    },
  };

  const timers = {
    etaTick: null,
    etaEndsAt: 0,
    holdTick: null,
    holdEndsAt: 0,
    priceA: null,
    draftCheck: null, // Timer for first draft preview check
    finalMockCheckStart: null, // Timer to start checking for final mockup
    finalMockCheck: null, // Interval for checking final mockup
    finalMockCheckEndsAt: 0, // When to stop checking for final mockup
  };

  // ============================================================================
  // ! Timer Management
  // ============================================================================
  const timerManager = {
    clearAll() {
      if (timers.etaTick) clearInterval(timers.etaTick);
      if (timers.holdTick) clearInterval(timers.holdTick);
      if (timers.priceA) clearTimeout(timers.priceA);
      if (timers.draftCheck) clearTimeout(timers.draftCheck);
      if (timers.finalMockCheckStart) clearTimeout(timers.finalMockCheckStart);
      if (timers.finalMockCheck) clearInterval(timers.finalMockCheck);

      Object.assign(timers, {
        etaTick: null,
        etaEndsAt: 0,
        holdTick: null,
        holdEndsAt: 0,
        priceA: null,
        draftCheck: null,
        finalMockCheckStart: null,
        finalMockCheck: null,
        finalMockCheckEndsAt: 0,
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
            if (onFinish) {
              try {
                onFinish();
              } catch (error) {}
            }
          }
        } catch (error) {}
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
              }
            } catch (error) {}
          };

          tick();
          timers.etaTick = setInterval(tick, 1000);
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
        // Reset src to force reload if needed, though usually not needed if URL is different
        elements.previewImg.src = '';

        elements.previewImg.onload = () => {
          // Hide loading and empty states when image loads
          this.setPreviewLoading(false);
          if (elements.previewEmpty) {
            elements.previewEmpty.style.display = 'none';
          }
        };
        elements.previewImg.onerror = () => {
          this.setPreviewLoading(false);
          if (elements.previewEmpty) {
            elements.previewEmpty.textContent =
              'Fehler beim Laden der Vorschau';
            elements.previewEmpty.style.display = 'block';
          }
          // Keep buttons disabled on error and hide container
          if (elements.previewActions)
            elements.previewActions.classList.add('twcss-hidden');
          if (elements.previewDownload)
            elements.previewDownload.disabled = true;
          if (elements.previewShare) elements.previewShare.disabled = true;
        };

        // Force update the src attribute
        elements.previewImg.src = url;

        // Show image and enable buttons immediately (don't wait for onload)
        elements.previewImg.classList.remove('twcss-hidden');

        if (elements.previewActions)
          elements.previewActions.classList.remove('twcss-hidden');
        if (elements.previewDownload) elements.previewDownload.disabled = false;
        if (elements.previewShare) elements.previewShare.disabled = false;

        // Enable continue button when preview is available
        if (elements.continueBtn && state.current === 'creating') {
          elements.continueBtn.disabled = false;
        }
      }

      // Update page 3 preview immediately as well
      if (elements.resultImg) {
        elements.resultImg.src = url;
        elements.resultImg.classList.remove('twcss-hidden');
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
      // Disable buttons when showing placeholder and hide container
      if (elements.previewActions)
        elements.previewActions.classList.add('twcss-hidden');
      if (elements.previewDownload) elements.previewDownload.disabled = true;
      if (elements.previewShare) elements.previewShare.disabled = true;
      this.setPreviewLoading(false);
    },

    lockInputs(on) {
      state.locked = !!on;
    },

    lockScroll(on) {
      try {
        const value = on ? 'hidden' : '';
        document.documentElement.style.overflow = value;
        document.body.style.overflow = value;
      } catch (error) {}
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
          if (state.generatedVariantId || state.generatedProductUrl) {
            this.setCta('Weiter →', true);
            return;
          }

          if (
            state.hasGeneratedDesign &&
            (state.lastMockUrl || state.lastDraftUrl)
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
    },

    updateUIFromState() {
      // Navigation
      switch (state.current) {
        case 'init':
          this.navigateTo(1);
          break;
        case 'creating':
          this.navigateTo(2);
          // Enable continue button when we have a preview
          if (elements.continueBtn) {
            elements.continueBtn.disabled =
              !state.lastMockUrl && !state.lastDraftUrl;
          }

          // If we manually navigate to page 3 while in 'creating', show Confirm button
          // Actually updateUIFromState is usually called with a reason or implicitly by state change.
          // But navigation between pages can be manual.
          // If the user clicks "Continue", navigateTo(3) is called directly.
          // But updateUIFromState is NOT called.
          // We need to handle page 3 UI elements.
          // The navigateTo function handles opacity.
          // The visibility of buttons on page 3 depends on state.
          // Since "creating" + mock means we are ready to confirm.
          // We should update buttons whenever we are on page 3 or about to go there.
          // But updateUIFromState switches on state.current.

          // If we manually navigate to page 3 while in 'creating', show Confirm button
          // Actually updateUIFromState is usually called with a reason or implicitly by state change.
          // But navigation between pages can be manual.
          // If the user clicks "Continue", navigateTo(3) is called directly.
          // But updateUIFromState is NOT called.
          // We need to handle page 3 UI elements.
          // The navigateTo function handles opacity.
          // The visibility of buttons on page 3 depends on state.
          // Since "creating" + mock means we are ready to confirm.
          // We should update buttons whenever we are on page 3 or about to go there.
          // But updateUIFromState switches on state.current.

          // If state is creating, we expect to be on page 1 or 2.
          // But user can click continue to go to 3.
          // We should handle the buttons visibility:
          if (elements.confirmBtnWrap)
            elements.confirmBtnWrap.classList.remove('hidden');

          // Re-enable confirm button explicitly if not confirmed yet
          if (elements.confirmBtn && !state.designConfirmed) {
            elements.confirmBtn.disabled = false;
          }

          // CRITICAL FIX: If product is already generated (e.g. state reset but data persists, or late mockup arrival handled weirdly),
          // don't show confirm button again.
          if (
            state.generatedVariantId ||
            state.generatedProductUrl ||
            state.designConfirmed
          ) {
            if (elements.confirmBtnWrap)
              elements.confirmBtnWrap.classList.add('hidden');
            // Automatically add to cart if we arrive here and product is ready?
            // Or just show ATC?
            // If we are navigating to page 3 and product is ready, show ATC.
            // ATC trigger is removed.
          }

          break;
        case 'ready':
          this.navigateTo(3);
          if (state.generatedProductName && elements.productName) {
            elements.productName.textContent = state.generatedProductName;
          }

          // Show ATC button, Hide Confirm button
          // ATC trigger is removed
          if (elements.confirmBtnWrap)
            elements.confirmBtnWrap.classList.add('hidden');

          // If we have a variant ID, assume product is already created and hide Confirm button forever to prevent duplicates
          // Actually, if we are in 'ready' state, Confirm button is already hidden by above lines.
          // But if we are in 'creating' state and mockup arrives late, we might need to check if product is already created.

          if (
            state.generatedVariantId ||
            state.generatedProductUrl ||
            state.designConfirmed
          ) {
            if (elements.confirmBtnWrap)
              elements.confirmBtnWrap.classList.add('hidden');
            // ATC trigger is removed
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
          this.navigateTo(1);
      }

      // CTA State
      this.setCtaFromState();
    },

    applyPriceDisplay() {
      if (!elements.priceVal) return;

      // If we have a pending price, show it regardless of priceReady flag
      // because calculate() sets pendingPriceValue but might not always trigger updateUIFromState immediately
      // Actually priceReady is set by calculate() so it should be fine.
      // But let's log to see what's happening
      if (state.pendingPriceValue) {
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
      if (elements.propType && elements.type)
        elements.propType.value = elements.type.value || '';
      if (elements.propBolts && elements.bolts)
        elements.propBolts.value = elements.bolts.value || '';
    },

    createPayload(extra = {}) {
      const fd = new FormData();
      const file = elements.upload?.files?.[0];

      // Ensure price is calculated and current before sending
      const material = elements.finish?.value || '';
      const size = elements.size?.value || '';
      const bolts = elements.bolts?.value || '';
      if (material && size) {
        priceManager.calculate(material, size, bolts);
      }

      fd.append('Bild', file || '');
      fd.append('Beschreibung', elements.desc?.value || '');
      fd.append('Oberfläche', elements.finish?.value || '');
      fd.append('Größe', elements.size?.value || '');
      fd.append('Type', elements.type?.value || '');
      fd.append('Route', this.routeValue());
      fd.append('generator_id', state.generatorId || '');
      fd.append('section_id', sid);

      // Append boolean value for mounting set
      const hasMountingSet = bolts === 'Befestigung';
      fd.append('Befestigung', String(hasMountingSet));

      // Pass the calculated price to the API
      if (state.pendingPriceValue) {
        fd.append(
          'Preis',
          Number(
            state.pendingPriceValue.replace('€', '').trim().replace(',', '.'),
          ),
        );
      }

      try {
        Object.keys(extra).forEach((k) => {
          if (extra[k] != null) fd.append(k, extra[k]);
        });
      } catch (error) {}

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
              }
            } catch (error) {}
          };
          reader.onerror = (error) => {};
          try {
            reader.readAsDataURL(file);
          } catch (error) {}
        } else {
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
  const priceManager = {
    _calculatePrice(material, size, bolts = '') {
      if (!material || !size) return null;

      const materialPrices = PRICE_MATRIX[material];
      if (!materialPrices) {
        return null;
      }

      const price = materialPrices[size];
      if (price === undefined) {
        return null;
      }

      // Custom pricing for 75 cm+
      if (price === 0 && size === '75 cm+') {
        return null; // Return null to indicate custom pricing needed
      }

      // Add mounting set cost if "Befestigung" is selected
      let totalPrice = price;
      if (bolts === 'Befestigung') {
        totalPrice += 9.45;
      }

      return totalPrice;
    },

    _formatPrice(price) {
      if (price === null || price === undefined) return '';
      // Format with two decimal places and comma as decimal separator
      const formatted = Number(price).toFixed(2).replace('.', ',');
      return `${formatted} €`;
    },

    calculate(material, size, bolts = '') {
      const price = this._calculatePrice(material, size, bolts);
      const formattedPrice = this._formatPrice(price);

      if (formattedPrice) {
        // Valid price calculated
        state.pendingPriceValue = formattedPrice;
        state.priceReady = true;
        storageManager.saveState(); // Save to localStorage
        formData.updateProps();
        ui.applyPriceDisplay(); // Update UI immediately
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
          } catch (error) {}
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

        if (!res.ok) {
          throw new Error(text || `HTTP ${res.status}`);
        }
        return text;
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
          // Network error
        }
        throw error;
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

        if (mode === 'draft' || mode === 'any') {
          const draftUrl = normalizeImageUrl(extractField(j, 'Entwurf'));
          if (draftUrl) {
            state.lastDraftUrl = draftUrl;
            storageManager.saveState();
            ui.setPreviewLoading(false);
            ui.showPreview(draftUrl);
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
            ui.applyPriceDisplay();

            // Explicitly update preview elements with the new URL
            ui.showPreview(mockUrl);

            // Also update result image if on page 3 or preparing for it
            if (elements.resultImg) {
              elements.resultImg.src = mockUrl;
              elements.resultImg.classList.remove('twcss-hidden');
            }

            // state.current = 'ready';

            // ! RATE LIMIT
            // Mark that a design has been generated and set cooldown (30 seconds)
            state.hasGeneratedDesign = true;
            state.cooldown = Date.now() + 30 * 1000; // 30 seconds from now

            storageManager.saveState();

            // Enable continue button to allow user to proceed to confirmation
            if (elements.continueBtn) {
              elements.continueBtn.disabled = false;
            }

            // Update UI to ensure buttons are correct
            ui.updateUIFromState();
            return { ok: true, mock: true, json: j };
          }
        }

        return { ok: true, json: j };
      } catch (error) {
        return null;
      } finally {
        state.pollInFlight = false;
      }
    },

    async prepareProduct() {
      try {
        const raw = await this.postText(
          ENDPOINTS.product,
          formData.createPayload(),
        );
        const j = tryParseJson(raw);
        // Check if we received only a URL (string or object with just url)
        // Case 1: Simple object { "Product URL": "..." }
        // Case 2: Array [{ product: ... }]

        let productUrl = '';
        let productId = '';
        let variantId = '';
        let productName = '';

        // Helper to extract from various possible keys
        const getVal = (obj, keys) => {
          if (!obj) return '';
          for (const k of keys) {
            if (obj[k] != null) return obj[k];
          }
          return '';
        };

        const urlKeys = ['Product URL', 'product_url', 'url'];
        const idKeys = ['Product ID', 'product_id', 'id'];
        const varIdKeys = ['Variant ID', 'variant_id', 'variant'];
        const nameKeys = ['Product Name', 'product_name', 'name', 'title'];

        // Normalize input to work with
        // If j is array, use first element. If object, use it directly.
        const data = Array.isArray(j) && j[0] ? j[0] : j;

        // 1. Try to extract from top level or data.product
        // In the new webhook format: { "Product URL": "...", "product_id": "...", "variant_id": "..." }
        // These are at the top level of 'data'.
        // We also support the old format: { product: { ... } } via rootProduct check.
        const rootProduct = data?.product || data;

        productUrl =
          getVal(data, urlKeys) || getVal(rootProduct, urlKeys) || '';
        if (!productUrl && rootProduct?.handle) {
          productUrl = `/products/${rootProduct.handle}`;
        }
        productUrl = String(productUrl).trim();

        productId = getVal(data, idKeys) || getVal(rootProduct, idKeys) || '';
        if (!productId && rootProduct?.id) productId = rootProduct.id;
        productId = String(productId).trim();

        variantId =
          getVal(data, varIdKeys) || getVal(rootProduct, varIdKeys) || '';
        // If no variant ID found, look inside variants array
        if (
          !variantId &&
          rootProduct?.variants &&
          Array.isArray(rootProduct.variants) &&
          rootProduct.variants.length > 0
        ) {
          variantId = rootProduct.variants[0].id;
        }
        variantId = String(variantId).trim();

        productName =
          getVal(data, nameKeys) || getVal(rootProduct, nameKeys) || '';
        productName = String(productName).trim();

        // Fallback: If we only have URL but no IDs, fetch product JSON
        if (productUrl && (!productId || !variantId)) {
          try {
            const jsonUrl = safeProductJsonUrl(productUrl);
            if (jsonUrl) {
              const res = await fetch(jsonUrl);
              if (res.ok) {
                const pJson = await res.json();
                const pData = pJson.product || pJson;

                if (!productId) productId = String(pData.id || '').trim();
                if (!productName)
                  productName = String(pData.title || '').trim();

                if (!variantId && pData.variants && pData.variants.length > 0) {
                  variantId = String(pData.variants[0].id).trim();
                }
              }
            }
          } catch (e) {}
        }

        if (productName) {
          state.generatedProductName = productName;
          if (elements.productName)
            elements.productName.textContent = productName;
        }

        if (productUrl) {
          state.generatedProductUrl = productUrl;
        }

        if (productId) {
          state.generatedProductId = productId;
        }

        if (variantId) {
          state.generatedVariantId = variantId;
        }

        storageManager.saveState();
      } catch (error) {}
    },

    handleFailure() {
      timerManager.stopEta();
      timerManager.clearAll();
      ui.setPreviewLoading(false);
      ui.showPlaceholder('Fehlgeschlagen. Bitte Neu anfangen');
      state.current = 'init';
      ui.updateUIFromState();
    },

    startCheckingForFinalMock() {
      if (timers.finalMockCheck) return;

      const checkStartTime = state.runStartedAt
        ? state.runStartedAt + TIMING.FINAL_MOCK_CHECK_START_MS
        : Date.now();
      const checkEndTime = state.runStartedAt
        ? state.runStartedAt + TIMING.FINAL_MOCK_CHECK_END_MS
        : Date.now() + 150000;

      timers.finalMockCheckEndsAt = checkEndTime;

      // Check immediately if we're past the start time
      if (Date.now() >= checkStartTime) {
        this.fetchSignOnce('mock');
      }

      // Set up interval to check for final mockup
      timers.finalMockCheck = setInterval(async () => {
        try {
          if (!state.generatorId || Date.now() > timers.finalMockCheckEndsAt) {
            clearInterval(timers.finalMockCheck);
            timers.finalMockCheck = null;
            return;
          }
          await this.fetchSignOnce('mock');
        } catch (error) {}
      }, TIMING.FINAL_MOCK_CHECK_INTERVAL_MS);
    },

    async startRunCreator() {
      const descText = elements.desc?.value?.trim() || '';
      if (descText.length < 5) {
        return;
      }

      // Check for cooldown
      const cooldownInfo = ui.checkCooldown();
      if (cooldownInfo.isOnCooldown) {
        ui.setCtaFromState(); // Update button with countdown
        return;
      }

      // Reset state
      Object.assign(state, {
        current: 'creating',
        locked: false,
        generatorId: '',
        lastMockUrl: '',
        lastDraftUrl: '',
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

      storageManager.saveState();
      storageManager.saveFormData();

      timerManager.stopEta();
      timerManager.stopHold();
      timerManager.clearAll();

      priceManager.setCalculating();
      ui.setPillState('work', 'Wir starten…');
      ui.lockInputs(true);

      // Verify state is still 'creating' before updating UI
      if (state.current !== 'creating') {
        state.current = 'creating';
        storageManager.saveState();
      }

      ui.updateUIFromState(); // Navigate to page 2
      ui.showPlaceholder('Wir erstellen gerade deine Vorschau');
      ui.setPreviewLoading(true);

      timerManager.startEta('Geschätzte Zeit', TIMING.TOTAL_MS, () => {
        if (state.current === 'creating' && !state.lastMockUrl) {
          state.forceMockLoading = true;
          ui.setPreviewLoading(true);
        }
      });

      formData.updateProps();

      try {
        // Validate required variables
        if (typeof sid === 'undefined') {
          this.handleFailure();
          return;
        }

        let payload;
        try {
          payload = formData.createPayload();
        } catch (payloadError) {
          throw payloadError;
        }
        let raw;
        try {
          raw = await this.postText(ENDPOINTS.run, payload);
        } catch (postError) {
          throw postError;
        }

        if (!raw || typeof raw !== 'string') {
          this.handleFailure();
          return;
        }

        let id;
        try {
          id = extractIdFromText(raw);
        } catch (extractError) {
          throw extractError;
        }

        if (!id) {
          this.handleFailure();
          return;
        }
        state.generatorId = id;

        // Ensure state is still 'creating' after receiving generator ID
        if (state.current !== 'creating') {
          state.current = 'creating';
        }

        storageManager.saveState();
        formData.updateProps();
        // Check for draft preview after delay
        timers.draftCheck = setTimeout(async () => {
          try {
            await this.fetchSignOnce('draft');
          } catch (error) {}
        }, TIMING.FIRST_DRAFT_CHECK_DELAY_MS);

        // Start checking for final mockup after delay
        timers.finalMockCheckStart = setTimeout(() => {
          try {
            // ui.setPillState('work', 'Finale Vorschau wird geladen');
            this.startCheckingForFinalMock();
          } catch (error) {}
        }, TIMING.FINAL_MOCK_CHECK_START_MS);
      } catch (error) {
        this.handleFailure();
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
          } catch (error) {}
        }, 8000);
      } catch (error) {
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (fallbackError) {
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
          return true;
        } catch (error) {
          // User cancelled or error occurred
          if (error.name !== 'AbortError') {
          } else {
            return false; // User cancelled
          }
        }
      }

      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
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
      timerManager.clearAll();
      timerManager.stopEta();
      timerManager.stopHold();
      storageManager.clearState();

      Object.assign(state, {
        current: 'init',
        locked: false,
        generatorId: '',
        lastMockUrl: '',
        lastDraftUrl: '',
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
        generatedProductId: '',
        generatedVariantId: '',
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
    } catch (error) {}
  };

  // ============================================================================
  // ! Event Listeners
  // ============================================================================
  // Back to configuration button handler (page 2) - navigates to page 1, doesn't change state
  const backToConfigBtn = document.querySelector('[data-back-to-config]');
  if (backToConfigBtn) {
    backToConfigBtn.addEventListener('click', () => {
      try {
        // Only navigate to page 1, do NOT change state
        ui.navigateTo(1);
        ui.setCtaFromState(); // Update button text based on current state
      } catch (error) {}
    });
  }

  // Info button handlers (using data-info-button attribute to toggle hidden class on smc-info-modal)
  const infoButton = document.querySelectorAll('[data-info-button]');
  infoButton.forEach((btn) => {
    btn.addEventListener('click', () => {
      elements.smcInfoModal?.classList.toggle('hidden');
    });
  });

  // Reset button handler
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', () => {
      try {
        let result = confirm('Hiermit fängst Du den Prozess von vorne an. Deinen bestehenden Entwurf können wir für Dich wiederherstellen, schreib und einfach an diese Email: Info@Steelmonks.com');
        if (result) {
          resetAll();
        // Update UI based on state
        ui.updateUIFromState();
        }
      } catch (error) {}
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
      } catch (error) {}
    });
  });

  if (elements.backBtn) {
    elements.backBtn.addEventListener('click', () => {
      try {
        // Check for cooldown - if on cooldown, don't allow reset
        const cooldownInfo = ui.checkCooldown();
        if (cooldownInfo.isOnCooldown) {
          return;
        }
        timerManager.clearAll();
        timerManager.stopEta();

        // Clear all generation state including preview URLs
        // Reset hasGeneratedDesign so CTA button goes back to "Entwurf erstellen"
        Object.assign(state, {
          current: 'init',
          locked: false,
          generatorId: '',
          lastMockUrl: '',
          lastDraftUrl: '',
          priceReady: false,
          previewDone: false,
          runStartedAt: 0,
          generatedProductUrl: '',
          generatedProductName: '',
          generatedProductId: '',
          generatedVariantId: '',
          hasGeneratedDesign: false, // Reset so CTA button shows "Entwurf erstellen"
          designConfirmed: false,
          // Keep cooldown - rate limit persists across resets
        });
        storageManager.saveState();

        ui.lockInputs(false);
        ui.setPillState('idle', 'Bereit');
        ui.showPlaceholder('Starte zuerst den Entwurf');
        ui.setPreviewLoading(false);

        ui.updateUIFromState(); // Navigate to page 1
        ui.setCtaFromState(); // Update button text back to "Entwurf erstellen"
      } catch (error) {}
    });
  }

  // Function to update backBtn state based on cooldown
  const updateBackBtnState = () => {
    if (!elements.backBtn) return;

    // Check for cooldown
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

  // Start a regular interval to update the cooldown timer on the button
  // This ensures the timer ticks down even if no state changes happen
  setInterval(() => {
    // Always update the button state (button is always visible, only disabled during cooldown)
    updateBackBtnState();
  }, 1000);

  // Form submission handler (Page 3 confirm button submits the form)
  if (elements.form) {
    elements.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        // DataLayer event for adding to cart
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'werkstatt-add-to-cart',
          variantId: state.generatedVariantId,
          productId: state.generatedProductId,
          productName: state.generatedProductName,
          price: state.pendingPriceValue
        });

        // Show loading state on button
        const originalText = elements.confirmBtn?.textContent;
        if (elements.confirmBtn) {
          elements.confirmBtn.textContent = 'Produkt wird erstellt...';
          elements.confirmBtn.disabled = true;
        }

        ui.setPillState('work', 'Produkt wird erstellt');

        // Check if product is already created to avoid duplication
        if (!state.generatedVariantId) {
          // Call prepareProduct only if needed
          await api.prepareProduct();
        }

        // Check if product was created successfully (or already existed)
        if (state.generatedVariantId || state.generatedProductUrl) {
          // Update variant ID in form before submission
          if (elements.variantIdInput) {
            elements.variantIdInput.value = state.generatedVariantId;
          }

          // Transition to ready state and confirm design
          state.current = 'ready';
          state.designConfirmed = true;
          storageManager.saveState();

          // Update UI to show/hide buttons based on new state
          ui.updateUIFromState();

          // Submit form data via AJAX
          const formDataObj = new FormData(elements.form);

          try {
            const res = await fetch('/cart/add.js', {
              method: 'POST',
              body: formDataObj,
            });

            if (res.ok) {
              const data = await res.json();
              ui.setPillState('ok', 'Im Warenkorb');

              // Fetch full cart data to trigger tracking events
              try {
                const cartRes = await fetch('/cart.js');
                if (cartRes.ok) {
                  const cartData = await cartRes.json();
                  
                  // Publish cartUpdate event to trigger Analizify and Meta Pixel tracking
                  // This is the same event that product-form.js publishes, which tracking scripts listen to
                  if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
                    publish(PUB_SUB_EVENTS.cartUpdate, {
                      source: 'steelmonks-sign-creator',
                      productVariantId: state.generatedVariantId,
                      cartData: cartData,
                    });
                  } else {
                    console.warn('publish is not defined, source: fb29o3487ytr234rty2fbo3478yr28');
                  }
                  
                  // Push to dataLayer for Google Tag Manager / Google Analytics
                  if (window.dataLayer) {
                    const addedItem = cartData.items?.find(item => item.variant_id === state.generatedVariantId);
                    if (addedItem) {
                      window.dataLayer.push({
                        event: 'add_to_cart',
                        ecommerce: {
                          currency: cartData.currency || 'EUR',
                          value: (addedItem.final_price / 100).toFixed(2),
                          items: [{
                            item_id: addedItem.variant_id?.toString(),
                            item_name: addedItem.product_title || state.generatedProductName,
                            item_variant: addedItem.variant_title || '',
                            price: (addedItem.final_price / 100).toFixed(2),
                            quantity: addedItem.quantity || 1
                          }]
                        }
                      });
                    }
                  } else {
                    console.warn('dataLayer is not defined, source: fb29o3487ytr234rty2fbo3478yr28');
                  }
                  
                  // Trigger Meta Pixel AddToCart event if fbq is available
                  if (typeof fbq !== 'undefined') {
                    const addedItem = cartData.items?.find(item => item.variant_id === state.generatedVariantId);
                    if (addedItem) {
                      fbq('track', 'AddToCart', {
                        content_name: addedItem.product_title || state.generatedProductName,
                        content_ids: [addedItem.variant_id?.toString()],
                        content_type: 'product',
                        value: (addedItem.final_price / 100).toFixed(2),
                        currency: cartData.currency || 'EUR'
                      });
                    }
                  } else {
                    console.warn('fbq is not defined, source: fb29o3487ytr234rty2fbo3478yr29');
                  }
                  
                  // Also dispatch a custom event as fallback for any other tracking scripts
                  document.dispatchEvent(new CustomEvent('cart:updated', {
                    detail: { cart: cartData }
                  }));
                }
              } catch (cartErr) {
                console.warn('Failed to fetch cart data for tracking:', cartErr);
              }

              // Show confirmation popup instead of redirecting
              if (elements.confirmationPopup) {
                elements.confirmationPopup.style.opacity = '1';
                elements.confirmationPopup.style.visibility = 'visible';
              }
            } else {
              throw new Error('Failed to add to cart');
            }
          } catch (err) {
            ui.setPillState('bad', 'Fehler');
            if (elements.confirmBtn) {
              elements.confirmBtn.textContent = originalText || 'Erneut versuchen';
              elements.confirmBtn.disabled = false;
            }
          }
        } else {
          // Handle failure
          ui.setPillState('bad', 'Fehler bei Erstellung');
          if (elements.confirmBtn) {
            elements.confirmBtn.textContent = 'Erneut versuchen';
            elements.confirmBtn.disabled = false;
          }
        }
      } catch (error) {
        ui.setPillState('bad', 'Fehler');
        if (elements.confirmBtn) {
          elements.confirmBtn.textContent = 'Erneut versuchen';
          elements.confirmBtn.disabled = false;
        }
      }
    });
  }

  // Confirmation popup close handlers
  if (elements.confirmationPopupClose) {
    elements.confirmationPopupClose.addEventListener('click', () => {
      if (elements.confirmationPopup) {
        elements.confirmationPopup.style.opacity = '0';
        elements.confirmationPopup.style.visibility = 'hidden';
      }
    });
  }

  if (elements.confirmationPopupBackdrop) {
    elements.confirmationPopupBackdrop.addEventListener('click', () => {
      if (elements.confirmationPopup) {
        elements.confirmationPopup.style.opacity = '0';
        elements.confirmationPopup.style.visibility = 'hidden';
      }
    });
  }

  if (elements.upload) {
    elements.upload.addEventListener('change', () => {
      try {
        if (state.locked) {
          return;
        }
        formData.handleUploadUI();
        formData.updateProps();
        storageManager.saveFormData();
      } catch (error) {}
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
        } catch (error) {}
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
        } catch (error) {}
      },
      { passive: true },
    );
  }

  if (elements.type) {
    elements.type.addEventListener('change', () => {
      try {
        if (state.locked) return;
        formData.updateProps();
        storageManager.saveFormData();
      } catch (error) {}
    });
  }

  if (elements.bolts) {
    elements.bolts.addEventListener('change', () => {
      try {
        if (state.locked) return;
        formData.updateProps();
        storageManager.saveFormData();

        // Recalculate price when mounting set selection changes
        const material = elements.finish?.value || '';
        const size = elements.size?.value || '';
        const bolts = elements.bolts?.value || '';

        if (material && size) {
          priceManager.calculate(material, size, bolts);
        }
      } catch (error) {}
    });
  }

  if (elements.finish) {
    elements.finish.addEventListener('change', () => {
      if (state.locked) return;
      formData.updateProps();
      storageManager.saveFormData();
      // Calculate and update price immediately when material changes
      const material = elements.finish.value || '';
      const size = elements.size?.value || '';
      const bolts = elements.bolts?.value || '';
      priceManager.calculate(material, size, bolts);
    });
  }

  if (elements.size) {
    elements.size.addEventListener('change', () => {
      try {
        // Update form data and props immediately
        formData.updateProps();
        storageManager.saveFormData();

        // Calculate and update price immediately when size changes
        const material = elements.finish?.value || '';
        const size = elements.size.value || '';
        const bolts = elements.bolts?.value || '';

        if (!material || !size) {
          return;
        }
        priceManager.calculate(material, size, bolts);
      } catch (error) {}
    });
  } else {
  }

  if (elements.ctaBtn) {
    elements.ctaBtn.addEventListener('click', () => {
      try {
        // DataLayer event for werkstatt view/interaction
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'werkstatt-view' });

        const buttonText = elements.ctaLabel?.textContent?.trim() || '';

        // If button says "Weiter →", navigate to page 2 (preview)
        if (buttonText === 'Weiter →' || buttonText.includes('Weiter')) {
          // If we have a product ready, maybe we should check if we should go to page 3 directly?
          // If the user clicks "Continue" on page 1, they expect to see the preview.
          // From page 2 they can go to page 3.
          // But if they have a product ready, we could allow them to skip.
          // For now, consistent flow: Page 1 -> Page 2 -> Page 3.

          // Always navigate to page 2 when "Weiter →" is clicked
          // If state is creating or ready, we can navigate directly
          if (state.current === 'creating' || state.current === 'ready') {
            ui.navigateTo(2);
          } else if (
            state.current === 'init' &&
            (state.lastMockUrl || state.lastDraftUrl)
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
      } catch (error) {}
    });
  }

  // Download button (Page 2)
  if (elements.previewDownload) {
    elements.previewDownload.addEventListener('click', async () => {
      try {
        const url = state.lastMockUrl || state.lastDraftUrl;
        if (!url) {
          return;
        }
        await downloadHelper.downloadUrl(
          url,
          `steelmonks-vorschau-${state.generatorId || 'download'}.png`,
        );
      } catch (error) {}
    });
  }

  // Share button (Page 2)
  if (elements.previewShare) {
    elements.previewShare.addEventListener('click', async () => {
      try {
        const url = state.lastMockUrl || state.lastDraftUrl;
        if (!url) {
          return;
        }
        await shareHelper.shareUrl(url, 'Mein personalisiertes Schild');
      } catch (error) {}
    });
  }

  // Continue button (Page 2) - navigates to page 3, doesn't change state
  if (elements.continueBtn) {
    elements.continueBtn.addEventListener('click', () => {
      try {
        // Only navigate to page 3, do NOT change state
        ui.navigateTo(3);
      } catch (error) {}
    });
  }

  // ============================================================================
  // ! Animations (Closing, Opening)
  // ============================================================================
  if (elements.smc && elements.openBtn) {
    // Open Button (scales up the whole container: #sm-sign-creator then #smc)
    elements.openBtn.addEventListener('click', () => {
      try {
        elements.smcContainer.style.opacity = '1';
        elements.smcContainer.style.visibility = 'visible';
        elements.smc.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          try {
            elements.smc.style.transform = 'scale(1)';
          } catch (error) {}
        }, 300);

        // Set body overflow to hidden
        document.body.style.overflow = 'hidden';
      } catch (error) {}
    });

    // Close Button handlers (using data-close-button attribute)
    // This allows multiple close buttons across different pages
    const closeButtonsForAnimation = document.querySelectorAll(
      '[data-close-button]',
    );
    closeButtonsForAnimation.forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          elements.smc.style.transform = 'scale(0)';
          setTimeout(() => {
            try {
              elements.smcContainer.style.opacity = '0';
              elements.smcContainer.style.visibility = 'hidden';
              elements.smc.setAttribute('aria-hidden', 'true');
            } catch (error) {}
          }, 300);

          // Set body overflow back to auto
          document.body.style.overflow = 'auto';
        } catch (error) {}
      });
    });
  }

  // ============================================================================
  // ! Initialization
  // ============================================================================
  try {
    // Try to restore state from localStorage
    const savedState = storageManager.loadState();
    const savedFormData = storageManager.loadFormData();

    if (savedState) {
      // Restore state values
      Object.assign(state, {
        current: savedState.current || 'init',
        generatorId: savedState.generatorId || '',
        lastMockUrl: savedState.lastMockUrl || '',
        lastDraftUrl: savedState.lastDraftUrl || '',
        priceReady: savedState.priceReady || false,
        pendingPriceValue: savedState.pendingPriceValue || '',
        previewDone: savedState.previewDone || false,
        runStartedAt: savedState.runStartedAt || 0,
        generatedProductUrl: savedState.generatedProductUrl || '',
        generatedProductName: savedState.generatedProductName || '',
        generatedProductId: savedState.generatedProductId || '',
        generatedVariantId: savedState.generatedVariantId || '',
        hasGeneratedDesign: savedState.hasGeneratedDesign || false,
        designConfirmed: savedState.designConfirmed || false,
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
      } else if (state.lastDraftUrl) {
        ui.showPreview(state.lastDraftUrl);
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
            if (typeof updateBackBtnState === 'function') {
              updateBackBtnState();
            }
          } else {
            // Update button text with countdown
            if (state.current === 'init' && elements.ctaBtn) {
              ui.setCtaFromState();
            }
            // Update backBtn state with countdown (always update since button is always visible)
            if (typeof updateBackBtnState === 'function') {
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
        const bolts = elements.bolts?.value || '';
        priceManager.calculate(
          elements.finish.value,
          elements.size.value,
          bolts,
        );
      }

      // Ensure preview images are loaded if they don't exist yet
      // This runs after state is loaded to fetch any missing preview images
      ensurePreviewLoaded();

      // Restore timer if available
      timerManager.restoreEta();

      // Update UI based on restored state
      ui.updateUIFromState();
      formData.updateProps();

      // Initialize back button state (always visible, disabled during cooldown)
      if (typeof updateBackBtnState === 'function') {
        updateBackBtnState();
      }
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

      // Initialize back button state (always visible, disabled during cooldown)
      if (typeof updateBackBtnState === 'function') {
        updateBackBtnState();
      }

      // Calculate price if material and size are available
      if (elements.finish?.value && elements.size?.value) {
        const bolts = elements.bolts?.value || '';
        priceManager.calculate(
          elements.finish.value,
          elements.size.value,
          bolts,
        );
      }
    }
  } catch (error) {
    ui.setPillState('bad', 'Initialisierungsfehler');
  }
});




