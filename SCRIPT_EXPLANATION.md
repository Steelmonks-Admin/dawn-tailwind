# Steelmonks Sign Creator - Script Explanation & Analysis

## 🎯 Core Functionality

This script manages a **custom sign creation workflow** for Shopify, allowing users to:

1. Upload images or provide text descriptions
2. Configure sign options (finish, size)
3. Generate AI-powered sign designs
4. Preview and finalize designs
5. Add customized products to cart

---

## 📋 Main Workflow States

The application has three primary states:

```
init → creating → ready
```

- **`init`**: User fills form, ready to create
- **`creating`**: Processing/awaiting backend responses
- **`ready`**: Design complete, can view/add to cart

---

## 🏗️ Architecture Overview

### 1. **Configuration Layer** (Lines 1-46)

- **Timing constants**: All delays, timeouts, and polling intervals
- **API endpoints**: Backend service URLs (customizable via `window.SMCREATOR_ENDPOINTS`)
- **Status texts**: German status message constants

**Key Values:**

- Total creation time: 120 seconds
- Price fetch delay: 5 seconds
- Entwurf (draft) polling: starts at 70 seconds
- Mock-up polling: starts at 90 seconds, every 10 seconds

---

### 2. **Utility Functions** (Lines 48-139)

Helper functions for common operations:

- **`fmtMMSS(ms)`**: Formats milliseconds to `MM:SS`
- **`tryParseJson(text)`**: Safe JSON parsing
- **`extractIdFromText(text)`**: Regex extraction of IDs from responses
- **`normalizeImageUrl(candidate)`**: Converts Google Drive IDs to URLs
- **`extractField(j, key)`**: Safely extracts fields from JSON (handles arrays)
- **`extractPriceValue(j, raw)`**: Multi-format price extraction (handles various API response formats)
- **`normalizePriceDisplay(p)`**: Ensures price has € symbol

---

### 3. **State Management** (Lines 224-254)

**Application State:**

```javascript
state = {
  current: 'init' | 'creating' | 'ready',
  locked: boolean, // Prevents user input during processing
  generatorId: string, // Backend-generated ID for this creation
  lastMockUrl: string, // Final preview image URL
  lastEntUrl: string, // Draft image URL
  checkoutReady: boolean, // Ready to proceed to checkout
  priceReady: boolean, // Price has been calculated
  priceRequested: boolean, // Prevents duplicate price requests
  pendingPriceValue: string,
  previewDone: boolean,
  previewInFlight: boolean,
  forceMockLoading: boolean, // Forces preview loading UI
  runStartedAt: number, // Timestamp for timing calculations
  pollInFlight: boolean, // Prevents concurrent polling
};
```

**Timers Object:**
Tracks all active intervals/timeouts for cleanup

---

### 4. **Timer Management** (Lines 256-344)

**`timerManager`** handles:

- **ETA Timer**: Countdown display (120 seconds)
- **Hold Timer**: 30-minute reservation timer in modal
- **Cleanup**: Centralized timer clearing to prevent memory leaks

**Key Method: `startEta(label, ms, onFinish)`**

- Starts countdown with callback when finished
- Updates UI every second

---

### 5. **UI Updates Module** (Lines 346-475)

**`ui` object** manages all DOM updates:

- **Preview states**: Loading, blur, fade, clickable
- **Pill state**: Status indicator (idle/work/ok/bad)
- **Price display**: Conditional price text
- **Input locking**: Disables form during processing
- **Scroll locking**: Prevents body scroll when modal open
- **CTA button**: Updates based on state

**Key Pattern:** All UI updates go through this module for consistency

---

### 6. **Form & Data Management** (Lines 477-553)

**`formData` object** handles:

- **`hasImage()`**: Checks if file uploaded
- **`routeValue()`**: Returns 'Edit' (has image) or 'Generate' (text-only)
- **`updateProps()`**: Syncs form values to hidden inputs for cart
- **`createPayload(extra)`**: Builds FormData for API requests
- **`handleUploadUI()`**: Manages file preview (FileReader)

---

### 7. **Price Management** (Lines 555-584)

**`priceManager`**:

- **`set(txt)`**: Normalizes and sets price, updates UI
- **`setCalculating()`**: Shows "calculating..." state

**Features:**

- Auto-formats with € symbol
- Updates hidden form properties
- Triggers pill state update

---

### 8. **API Communication** (Lines 586-911)

**`api` object** - All backend interactions:

#### Key Methods:

**`postText(url, fd)`**

- Posts FormData with 25s timeout
- Uses AbortController for cancellation
- Returns raw text response

**`runPriceOnce()`**

- Fetches price after 5-second delay
- Only runs once per creation (priceRequested flag)

**`runCreatorPreviewOnce(reason)`**

- Triggers preview generation on backend
- Only runs once per creation

**`fetchSignOnce(mode)`**

- Polls for status updates
- Modes: `'entwurf'`, `'mock'`, `'any'`
- Handles draft and final preview URLs
- Updates UI based on status

**`startRunCreator()`** ⭐ **Core Workflow Function**

1. Validates description (min 5 chars)
2. Resets all state
3. Starts ETA timer
4. Posts to `/apps/creator/run-creator`
5. Extracts generator ID from response
6. Sets up timed polling:
   - Price fetch at 5s
   - Draft fetch at 70s
   - Mock-up polling starts at 90s

**`startMockPollingWindow()`**

- Polls every 10 seconds for final preview
- Has hard stop at 240 seconds total
- Auto-cancels when mock URL received

**`addToCartFromProductUrl(productUrl)`**

- Fetches product JSON
- Finds available variant
- Adds to cart with custom properties
- Handles Shopify cart API

---

### 9. **Status Management** (Lines 913-943)

**`statusManager.updateFromStatus(statusText)`**

- Maps German status texts to UI states
- Handles edge cases (forceMockLoading)
- Updates pill indicator colors:
  - `work`: Yellow/gold
  - `ok`: Green
  - `bad`: Red
  - `idle`: Default

---

### 10. **Modal Management** (Lines 945-1178)

**`modalManager`** handles two modal modes:

**Viewer Mode:**

- Shows preview image
- Download functionality
- Minimal UI

**Product Mode:**

- Shows final design
- 30-minute hold timer
- Add to cart functionality
- Product URL management

**Key Features:**

- Download with fallback strategies (blob → direct link → new tab)
- Scroll locking
- Product creation flow

---

### 11. **Event Listeners** (Lines 1226-1308)

**Registered Events:**

- **Close button**: Body scroll unlock + scale-down animation
- **Modal backdrop/close**: Modal dismissal
- **Escape key**: Modal close (passive listener)
- **Reset button**: Full state reset
- **Upload change**: File preview + form sync
- **Description input**: CTA enable/disable + form sync
- **Finish/Size change**: Form sync
- **Preview area click**: Opens viewer modal (if clickable)
- **CTA button**: Triggers creation or product modal based on state

**Animation Handlers** (Lines 1310-1339):

- **Open button**: Scales container up, locks scroll
- **Close button**: Scales container down, unlocks scroll
- Uses 300ms transition delay for smooth animations

---

## 🔄 Complete User Journey

```
1. User opens form (init state)
   ↓
2. Fills description (min 5 chars) → CTA enabled
   ↓
3. Optionally uploads image
   ↓
4. Selects finish & size
   ↓
5. Clicks "Entwurf erstellen" → startRunCreator()
   ↓
6. State → 'creating'
   - Form locked
   - ETA timer starts (120s)
   - Preview loading shown
   ↓
7. Backend receives request → Returns generator ID
   ↓
8. Timed processes:
   - 5s:  Price request sent
   - 70s: Draft polling starts
   - 90s: Mock-up polling starts (every 10s)
   ↓
9. Draft received → Shows blurry preview + "finalizing" overlay
   ↓
10. Mock-up received → State → 'ready'
    - Clear preview shown
    - Price displayed (if calculated)
    - CTA → "Schild ansehen"
    ↓
11. User clicks → Opens product modal
    - Creates product on backend
    - Shows 30-minute hold timer
    ↓
12. User adds to cart → Redirects to checkout
```

---

## 🎨 UI State Management

**Preview States** (data attributes on `previewArea`):

- `data-loading`: Shows spinner
- `data-softblur`: Blurred preview (draft visible)
- `data-fade`: Image fade-in animation
- `data-clickable`: Enables click-to-view-modal

**Pill States**:

- `idle`: Ready (gold border)
- `work`: Processing (gold border, pulsing)
- `ok`: Success (green border)
- `bad`: Error (red border)

---

## ⚠️ Areas for Improvement

### 1. **Error Handling & Resilience**

**Issues:**

- Silent failures (many `catch {}` blocks)
- No user-facing error messages for network failures
- No retry logic for failed requests
- Polling continues even if backend is down

**Recommendations:**

```javascript
// Add error tracking
const errorTracker = {
  consecutiveFailures: 0,
  lastError: null,
  report(error, context) {
    console.error(`[SMC] ${context}:`, error);
    this.consecutiveFailures++;
    // Show user-friendly error after 3 failures
    if (this.consecutiveFailures >= 3) {
      ui.setPillState('bad', 'Verbindungsproblem. Bitte versuche es erneut.');
    }
  },
};

// Add retry logic with exponential backoff
async function postTextWithRetry(url, fd, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await api.postText(url, fd);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

---

### 2. **Performance Optimizations**

**Issues:**

- Multiple DOM queries for same elements
- No debouncing on input events
- Image loading without size optimization
- No request cancellation on unmount

**Recommendations:**

```javascript
// Debounce input
const debounce = (fn, ms) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

elements.desc?.addEventListener('input', debounce(() => {
  ui.setCtaFromState();
  formData.updateProps();
}, 300));

// Cancel requests on unmount
let abortControllers = new Set();

async postText(url, fd) {
  const ctrl = new AbortController();
  abortControllers.add(ctrl);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ... });
    return await res.text();
  } finally {
    abortControllers.delete(ctrl);
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  abortControllers.forEach(ctrl => ctrl.abort());
});
```

---

### 3. **State Management Improvements**

**Issues:**

- State scattered across multiple objects
- No state validation
- No state persistence (loses state on refresh)

**Recommendations:**

```javascript
// Unified state manager with validation
const stateManager = {
  state: {
    /* ... */
  },

  set(updates) {
    const newState = { ...this.state, ...updates };
    // Validate state transitions
    if (!this.validateTransition(this.state.current, newState.current)) {
      console.warn('Invalid state transition');
      return false;
    }
    this.state = newState;
    this.persist(); // Save to sessionStorage
    return true;
  },

  validateTransition(from, to) {
    const valid = {
      init: ['creating'],
      creating: ['ready', 'init'], // can reset
      ready: ['init'], // can reset
    };
    return valid[from]?.includes(to) ?? false;
  },

  persist() {
    try {
      sessionStorage.setItem('smc_state', JSON.stringify(this.state));
    } catch {}
  },

  restore() {
    try {
      const saved = sessionStorage.getItem('smc_state');
      if (saved) this.state = { ...this.state, ...JSON.parse(saved) };
    } catch {}
  },
};
```

---

### 4. **Code Organization**

**Issues:**

- Very large single file (1362 lines)
- Some duplicate logic (error handling patterns)
- Magic numbers scattered (300ms, 8000ms)

**Recommendations:**

```javascript
// Extract constants
const ANIMATION = {
  SCALE_DURATION: 300,
  BLOB_REVOKE_DELAY: 8000,
};

// Extract reusable patterns
const createSafeHandler = (fn, errorMessage) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorTracker.report(error, errorMessage);
      throw error;
    }
  };
};
```

---

### 5. **Accessibility Improvements**

**Issues:**

- Keyboard navigation not fully tested
- ARIA attributes could be more comprehensive
- No screen reader announcements for state changes

**Recommendations:**

```javascript
// Add live region for announcements
const announce = (message) => {
  const region =
    document.getElementById('smc-announce') ||
    Object.assign(document.createElement('div'), {
      id: 'smc-announce',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      className: 'sr-only',
    });
  document.body.appendChild(region);
  region.textContent = message;
};

// Announce state changes
ui.setPillState = (kind, text) => {
  // ... existing code ...
  announce(`${text}. Status: ${kind}`); // Screen reader announcement
};
```

---

### 6. **Mobile Optimizations**

**Issues:**

- File upload may be slow on mobile
- No image compression before upload
- Large images could cause memory issues
- No offline detection

**Recommendations:**

```javascript
// Compress images before upload
const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// Check online status
const isOnline = () => navigator.onLine;
window.addEventListener('online', () => {
  ui.setPillState('work', 'Verbindung wiederhergestellt');
});
window.addEventListener('offline', () => {
  ui.setPillState('bad', 'Keine Internetverbindung');
});
```

---

### 7. **Testing & Debugging**

**Issues:**

- No logging/debugging utilities
- Hard to trace state changes
- No performance monitoring

**Recommendations:**

```javascript
// Add debug mode
const DEBUG = window.location.search.includes('debug=true');

const log = (...args) => {
  if (DEBUG) console.log('[SMC]', ...args);
};

const time = (label) => {
  if (DEBUG) {
    console.time(`[SMC] ${label}`);
    return () => console.timeEnd(`[SMC] ${label}`);
  }
  return () => {};
};

// Usage
const endTimer = time('startRunCreator');
// ... code ...
endTimer();
```

---

### 8. **Security Considerations**

**Issues:**

- No input sanitization visible
- XSS potential in user-provided text
- No CSRF token handling

**Recommendations:**

```javascript
// Sanitize user input
const sanitize = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Validate file types/sizes
const validateFile = (file) => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > MAX_SIZE) {
    throw new Error('Datei zu groß (max 10MB)');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Nur Bilder erlaubt (JPG, PNG, WebP)');
  }
  return true;
};
```

---

## 📊 Summary

**Strengths:**
✅ Well-organized modular structure
✅ Clear separation of concerns
✅ Modern ES6+ syntax
✅ Comprehensive state management
✅ Good error recovery patterns

**Priority Improvements:**

1. **High**: Error handling & user feedback
2. **High**: Mobile image compression
3. **Medium**: State persistence
4. **Medium**: Request cancellation/cleanup
5. **Low**: Accessibility enhancements
6. **Low**: Performance monitoring

**Overall Assessment:**
The script is well-structured and functional, but would benefit from enhanced error handling, mobile optimizations, and better resilience to network issues. The modular architecture makes it relatively easy to add these improvements incrementally.
