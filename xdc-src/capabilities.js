/* =========================================================================
 * Webxdc Creator Studio — capabilities.js
 * Detect messenger capabilities and API availability.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});

  const STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'SIMULATED', 'NOT_SUPPORTED'];

  let cached = null;

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function webxdcObj() {
    return (typeof window !== 'undefined' && window.webxdc && typeof window.webxdc === 'object')
      ? window.webxdc
      : null;
  }

  function isSimulatedWebxdc(w) {
    if (!w) return false;
    if (w.__csPreview || w.__csn_mock || w.__wcs_mock) return true;
    try {
      if (w.selfAddr === 'preview@local' || w.selfAddr === 'demo@local') return true;
      if (w.selfName === 'Preview User' || w.selfName === 'Demo User') return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function apiStatus(w, name) {
    if (!w) return 'UNAVAILABLE';
    const has = typeof w[name] === 'function' || (name in w && w[name] != null);
    if (!has) return 'UNAVAILABLE';
    if (isSimulatedWebxdc(w)) return 'SIMULATED';
    return 'AVAILABLE';
  }

  function detect() {
    const w = webxdcObj();
    const simulated = isSimulatedWebxdc(w);

    const indexedDB = safe(function () { return typeof indexedDB !== 'undefined' && !!indexedDB; }, false);
    const localStorageOk = safe(function () {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem('__cs_cap', '1');
      localStorage.removeItem('__cs_cap');
      return true;
    }, false);
    const workers = safe(function () { return typeof Worker === 'function'; }, false);
    const blob = safe(function () {
      return typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    }, false);
    const cryptoSubtle = safe(function () {
      return typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function';
    }, false);
    const compression = safe(function () { return typeof CompressionStream === 'function'; }, false);
    const decompression = safe(function () { return typeof DecompressionStream === 'function'; }, false);
    const canvas = safe(function () { return typeof HTMLCanvasElement !== 'undefined'; }, false);
    const audioCtx = safe(function () {
      return typeof AudioContext === 'function' || typeof webkitAudioContext === 'function';
    }, false);
    const fileApi = safe(function () { return typeof File === 'function' && typeof FileReader === 'function'; }, false);
    const monacoFiles = safe(function () {
      /* Real presence is confirmed on load; here only the pack flag. */
      return !!(CS.monaco && CS.monaco.bundled);
    }, false);

    let opaqueOrigin = false;
    try {
      opaqueOrigin = (typeof window !== 'undefined' && (window.location.origin === 'null' || window.location.protocol === 'null:'));
    } catch (e) { opaqueOrigin = true; }

    const apis = {
      sendUpdate: apiStatus(w, 'sendUpdate'),
      setUpdateListener: apiStatus(w, 'setUpdateListener'),
      sendToChat: apiStatus(w, 'sendToChat'),
      selfAddr: w && w.selfAddr != null ? (simulated ? 'SIMULATED' : 'AVAILABLE') : 'UNAVAILABLE',
      selfName: w && w.selfName != null ? (simulated ? 'SIMULATED' : 'AVAILABLE') : 'UNAVAILABLE',
      sendUpdateInterval: w && w.sendUpdateInterval != null ? (simulated ? 'SIMULATED' : 'AVAILABLE') : 'UNAVAILABLE',
      sendUpdateMaxSize: w && w.sendUpdateMaxSize != null ? (simulated ? 'SIMULATED' : 'AVAILABLE') : 'UNAVAILABLE',
      importFiles: apiStatus(w, 'importFiles'),
      joinRealtimeChannel: apiStatus(w, 'joinRealtimeChannel')
    };

    const report = {
      at: Date.now(),
      webxdc: w ? (simulated ? 'SIMULATED' : 'AVAILABLE') : 'UNAVAILABLE',
      simulated: simulated,
      apis: apis,
      storage: {
        indexedDB: indexedDB ? 'AVAILABLE' : 'UNAVAILABLE',
        localStorage: localStorageOk ? 'AVAILABLE' : 'UNAVAILABLE',
        strategy: indexedDB ? 'indexeddb' : (localStorageOk ? 'localstorage' : 'memory')
      },
      runtime: {
        workers: workers ? 'AVAILABLE' : 'NOT_SUPPORTED',
        blob: blob ? 'AVAILABLE' : 'NOT_SUPPORTED',
        cryptoSubtle: cryptoSubtle ? 'AVAILABLE' : 'UNAVAILABLE',
        compressionStream: compression ? 'AVAILABLE' : 'UNAVAILABLE',
        decompressionStream: decompression ? 'AVAILABLE' : 'UNAVAILABLE',
        canvas: canvas ? 'AVAILABLE' : 'NOT_SUPPORTED',
        audioContext: audioCtx ? 'AVAILABLE' : 'NOT_SUPPORTED',
        fileApi: fileApi ? 'AVAILABLE' : 'NOT_SUPPORTED',
        opaqueOrigin: opaqueOrigin ? 'AVAILABLE' : 'UNAVAILABLE',
        monacoBundled: monacoFiles ? 'AVAILABLE' : 'UNAVAILABLE'
      }
    };
    cached = report;
    return report;
  }

  function get() { return cached || detect(); }

  function status(path) {
    const r = get();
    const parts = String(path || '').split('.');
    let cur = r;
    for (let i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return 'UNAVAILABLE';
      cur = cur[parts[i]];
    }
    if (STATUSES.indexOf(cur) >= 0) return cur;
    return cur ? 'AVAILABLE' : 'UNAVAILABLE';
  }

  function chooseEditorStrategy() {
    const r = get();
    const prefer = !(CS.settings && CS.settings.get && CS.settings.get('preferMonaco') === false);
    if (!prefer) return 'fallback';
    if (r.runtime.workers !== 'AVAILABLE' || r.runtime.blob !== 'AVAILABLE') return 'fallback';
    if (typeof document === 'undefined') return 'fallback';
    try {
      if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return 'fallback';
    } catch (e) { /* ignore */ }
    /*user can enable Monaco on mobile too (editor button).
     * Solo se rechaza si el runtime no da workers/blob o estamos en jsdom. */
    return 'monaco';
  }

  function chooseStorageStrategy() {
    return get().storage.strategy;
  }

  function isRealWebxdc() {
    return get().webxdc === 'AVAILABLE';
  }

  CS.capabilities = {
    STATUSES: STATUSES.slice(),
    detect: detect,
    get: get,
    status: status,
    chooseEditorStrategy: chooseEditorStrategy,
    chooseStorageStrategy: chooseStorageStrategy,
    isRealWebxdc: isRealWebxdc,
    apiStatus: function (name) { return get().apis[name] || 'UNAVAILABLE'; }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.capabilities; }
})();
