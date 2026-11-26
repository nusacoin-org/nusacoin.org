// nux-bridge.js — dipasang di halaman tools (DApp) agar bisa memakai window.nux
// saat halaman itu dibuka DI DALAM aplikasi Nusa Wallet (PWA).
// Tidak aktif jika halaman dibuka biasa (tanpa frame) atau sudah ada window.nux
// (misalnya dari ekstensi Nux Connect / Nusa Wallet).
(function () {
  if (window.nux) return;
  if (window.parent === window) return;
  var WALLET = '*';
  try { if (document.currentScript && document.currentScript.src) WALLET = new URL(document.currentScript.src).origin; } catch (_) {}
  var pending = new Map(), seq = 0, listeners = {};
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !e.data || e.data.target !== 'nusa-page') return;
    if (WALLET !== '*' && e.origin !== WALLET) return;
    var m = e.data;
    if (m.event) { (listeners[m.event] || []).forEach(function (fn) { try { fn(m.data); } catch (_) {} }); return; }
    var p = pending.get(m.id); if (!p) return; pending.delete(m.id);
    m.error ? p.reject(Object.assign(new Error(m.error.message), { code: m.error.code })) : p.resolve(m.result);
  });
  function request(args) {
    if (!args || typeof args.method !== 'string') return Promise.reject(new Error('method wajib diisi'));
    return new Promise(function (resolve, reject) {
      var id = ++seq; pending.set(id, { resolve: resolve, reject: reject });
      window.parent.postMessage({ target: 'nusa-content', id: id, method: args.method, params: args.params || {} }, WALLET);
    });
  }
  var nux = Object.freeze({
    isNuxWallet: true, chain: 'nusacoin', symbol: 'NUX',
    request: request,
    connect: function () { return request({ method: 'nux_connect' }); },
    disconnect: function () { return request({ method: 'nux_disconnect' }); },
    getAddress: function () { return request({ method: 'nux_getAddress' }); },
    getBalance: function () { return request({ method: 'nux_getBalance' }); },
    signMessage: function (message) { return request({ method: 'nux_signMessage', params: { message: String(message) } }); },
    sendTransaction: function (o) { return request({ method: 'nux_sendTransaction', params: { to: o.to, amount: o.amount } }); },
    signTransaction: function (o) { return request({ method: 'nux_signTransaction', params: { inputs: o.inputs, outputs: o.outputs } }); },
    sendData: function (o) { return request({ method: 'nux_sendData', params: { data: String(o.data), encoding: o.encoding || 'utf8' } }); },
    on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    off: function (ev, fn) { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); }
  });
  Object.defineProperty(window, 'nux', { value: nux, writable: false, configurable: false });
  if (!window.nusa) Object.defineProperty(window, 'nusa', { value: nux, writable: false, configurable: false });
  window.dispatchEvent(new Event('nux#initialized'));
  window.dispatchEvent(new Event('nusa#initialized'));
})();
