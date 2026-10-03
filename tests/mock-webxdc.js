/* Local stand-in for webxdc.js when testing in a browser. The messenger provides the real one. */
(function () {
  if (window.webxdc) return;
  const listeners = [];
  const updates = [];
  window.webxdc = {
    selfAddr: 'demo@local',
    selfName: 'Demo',
    sendUpdateInterval: 10000,
    sendUpdateMaxSize: 128000,
    sendUpdate(update) {
      const serial = updates.length + 1;
      const item = Object.assign({}, update, { serial, max_serial: serial });
      updates.push(item);
      setTimeout(() => listeners.forEach((fn) => fn(item)), 0);
    },
    setUpdateListener(fn, since) {
      listeners.push(fn);
      updates.filter((u) => u.serial > (since || 0)).forEach((u) => setTimeout(() => fn(u), 0));
      return Promise.resolve();
    },
    sendToChat(message) {
      window.__sentToChat = (window.__sentToChat || []).concat([message]);
      return Promise.resolve();
    },
    importFiles() { return Promise.resolve([]); },
    joinRealtimeChannel() {
      let handler = null;
      return { setListener(fn) { handler = fn; }, send() {}, leave() { handler = null; } };
    }
  };
})();
