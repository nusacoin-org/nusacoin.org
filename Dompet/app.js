(() => {
  'use strict';
  const C = NusaCore, C_SEED = NusaSeed, $ = id => document.getElementById(id);
  const DEFAULT_CFG = { explorer: 'https://explorer.nusacoin.org', api: 'https://api.nusacoin.org', utxoTemplate: '', fee: '0.0001', autoLockMin: 15, price: 0 };
  // Daftar tools bawaan (bisa diubah). Tambahkan halaman tools Anda di sini atau lewat tombol "Simpan" di tab Jelajah.
  const DEFAULT_TOOLS = [
    { name: 'Explorer Nusacoin', url: 'https://explorer.nusacoin.org' }
  ];
  const views = ['vSetup', 'vBackup', 'vUnlock', 'vHome', 'vSend', 'vSettings', 'vBrowse', 'vApprove', 'vReceive'];
  const NAV_VIEWS = ['vHome', 'vSend', 'vReceive', 'vSettings', 'vBrowse'];
  const ALLOWED = ['nux_connect', 'nux_disconnect', 'nux_getAddress', 'nux_getBalance', 'nux_signMessage', 'nux_sendTransaction', 'nux_sendData', 'nux_signTransaction'];

  // penyimpanan lokal (pengganti chrome.storage.local); WIF hanya di memori
  const store = {
    get: k => { try { return JSON.parse(localStorage.getItem('nw_' + k)); } catch (_) { return null; } },
    set: (k, v) => localStorage.setItem('nw_' + k, JSON.stringify(v)),
    remove: (...ks) => ks.forEach(k => localStorage.removeItem('nw_' + k))
  };


  // ---------- bahasa (ID/EN) & tema (Terang/Gelap) ----------
  const EN = {
    'Nusa Wallet':'Nusa Wallet','Mulai':'Get started','Buat baru':'Create new','Impor WIF':'Import WIF','Seed phrase':'Seed phrase',
    'Seed phrase (12 / 24 kata)':'Seed phrase (12 / 24 words)','Private Key (WIF, prefix 0x57)':'Private Key (WIF, prefix 0x57)','Format alamat':'Address format',
    'Bech32 SegWit (nu1q…) — disarankan':'Bech32 SegWit (nu1q…) — recommended','Password (min. 8 karakter)':'Password (min. 8 characters)','Ulangi password':'Repeat password','Password':'Password',
    'Lanjut':'Continue','Memproses…':'Processing…','Kunci':'Lock','Buka Wallet':'Unlock wallet','Buka':'Unlock','Lupa password? Pulihkan dengan seed phrase / WIF':'Forgot password? Restore with seed phrase / WIF',
    'Cadangkan Private Key':'Back up Private Key','Selesai':'Done','Saya sudah mencadangkan private key':'I have backed up my private key',
    'Tulis WIF ini dan simpan offline. Siapa pun yang memilikinya bisa mengambil dana. Tidak akan ditampilkan lagi kecuali lewat Pengaturan.':'Write this WIF down and keep it offline. Anyone who has it can take your funds. It will not be shown again except via Settings.',
    "Alamat diturunkan dengan path yang sama dengan web wallet Nusacoin (Bech32: m/84'/662'/0'/0/0, P2PKH: m/44'/662'/0'/0/0). Seed phrase tidak disimpan; hanya private key hasil turunannya yang dienkripsi.":"The address is derived with the same path as the Nusacoin web wallet (Bech32: m/84'/662'/0'/0/0, P2PKH: m/44'/662'/0'/0/0). The seed phrase is not stored; only the derived private key is encrypted.",
    'Private key dienkripsi dengan password (PBKDF2 + AES-GCM) dan hanya tersimpan di perangkat ini. Password tidak bisa dipulihkan.':'The private key is encrypted with your password (PBKDF2 + AES-GCM) and stored only on this device. The password cannot be recovered.',
    'Muat ulang':'Refresh','Sembunyikan saldo':'Hide balance','Tampilkan saldo':'Show balance','TOTAL SALDO':'TOTAL BALANCE','Terkonfirmasi':'Confirmed','Tertunda':'Pending','Total diterima: ':'Total received: ',
    'Notifikasi':'Notifications','Dapat pemberitahuan saat koin masuk, selama aplikasi terbuka.':'Get notified when coins arrive, while the app is open.',
    'Mati: tidak ada yang disimpan. Tidak ada data dikirim ke server mana pun.':'Off: nothing is stored. No data is sent to any server.',
    'Kirim':'Send','Terima':'Receive','Alamat Bech32':'Bech32 Address','Alamat P2PKH':'P2PKH Address','Salin alamat':'Copy address','Transaksi terakhir':'Recent transactions','Memuat…':'Loading…','Belum ada transaksi.':'No transactions yet.','Riwayat tidak tersedia.':'History unavailable.',
    'Terima NUX':'Receive NUX','Bagikan alamat ini untuk menerima NUX.':'Share this address to receive NUX.','Bagikan':'Share','Kembali':'Back',
    'Kirim NUX':'Send NUX','Alamat tujuan':'Recipient address','Jumlah (NUX)':'Amount (NUX)','Fee (NUX)':'Fee (NUX)','Tinjau':'Review','Kirim sekarang':'Send now','Ke':'To','Jumlah':'Amount','Input':'Input','Transaksi tidak bisa dibatalkan setelah dikirim.':'The transaction cannot be undone once sent.','Terkirim. TXID: ':'Sent. TXID: ',
    'Jelajah':'Explore','Dompet':'Wallet','Pengaturan':'Settings','Jelajah tools':'Explore tools','Cari':'Search','✕ Tutup':'✕ Close','Simpan':'Save','Tab baru':'New tab',
    'Cari tools, ketik alamat https://… atau kata kunci':'Search tools, type a https://… address or keyword','Tempel WIF':'Paste WIF','nu1q… atau N…':'nu1q… or N…','kata1 kata2 kata3 …':'word1 word2 word3 …',
    'Bahasa':'Language','Tema':'Theme','Terang':'Light','Gelap':'Dark','Pasang aplikasi di layar utama':'Install app on home screen',
    'Explorer API (saldo & riwayat)':'Explorer API (balance & history)','API (UTXO & broadcast)':'API (UTXO & broadcast)','Template URL UTXO (opsional, pakai {address})':'UTXO URL template (optional, use {address})',
    'Harga 1 NUX dalam Rupiah (opsional)':'Price of 1 NUX in Rupiah (optional)','Fee default (NUX)':'Default fee (NUX)','Kunci otomatis (menit)':'Auto-lock (minutes)',
    'Situs terhubung':'Connected sites','Belum ada situs terhubung.':'No connected sites yet.','Cabut':'Revoke','Keamanan':'Security','Tampilkan private key':'Show private key','Hapus wallet dari perangkat ini':'Delete wallet from this device',
    'Permintaan':'Request','Situs':'Site','Tolak':'Reject','Setujui':'Approve','Batal':'Cancel','OK':'OK','Hubungkan situs':'Connect site','Tanda tangani pesan':'Sign message','Tanda tangani transaksi':'Sign transaction','Tulis data ke blockchain':'Write data to the blockchain',
    'Alamat':'Address','Fee':'Fee','Pesan:':'Message:','Ukuran':'Size','Data (hex):':'Data (hex):','Teks:':'Text:','Menyiapkan transaksi…':'Preparing transaction…','Memverifikasi transaksi…':'Verifying transaction…','Keluar ke pihak lain':'Sent to others',
    'Situs ini meminta melihat alamat dan public key Anda. Ia tidak bisa mengirim dana tanpa persetujuan Anda.':'This site asks to see your address and public key. It cannot send funds without your approval.',
    'Tanda tangan tidak memindahkan dana, tapi bisa dipakai situs untuk membuktikan Anda pemilik alamat.':'A signature does not move funds, but a site can use it to prove you own the address.',
    'Periksa alamat tujuan dengan teliti. Transaksi tidak bisa dibatalkan.':'Check the recipient address carefully. The transaction cannot be undone.',
    'Data ini akan tercatat permanen dan publik di blockchain. Tidak ada NUX yang dikirim ke pihak lain selain fee.':'This data will be recorded permanently and publicly on the blockchain. No NUX is sent to anyone other than the fee.',
    'Tidak ada NUX yang keluar ke pihak lain (hanya ke wallet sendiri dan/atau data on-chain).':'No NUX goes to others (only to your own wallet and/or on-chain data).',
    'Situs akan menyiarkan transaksi ini setelah Anda setujui. Periksa tujuan dan jumlah dengan teliti; transaksi tidak bisa dibatalkan.':'The site will broadcast this transaction once you approve. Check the destination and amount carefully; the transaction cannot be undone.',
    'Offline':'Offline','Gagal memuat saldo: ':'Failed to load balance: ','Alamat disalin.':'Address copied.','Tidak bisa menyalin. Salin manual dari kotak alamat.':'Could not copy. Copy manually from the address box.','Tersimpan.':'Saved.',
    'Password minimal 8 karakter.':'Password must be at least 8 characters.','Konfirmasi password tidak sama.':'Password confirmation does not match.','URL harus diawali https://':'URL must start with https://',
    'Hanya alamat https:// yang bisa dibuka di dalam aplikasi.':'Only https:// addresses can be opened inside the app.','Alamat tidak valid.':'Invalid address.','Disimpan ke daftar tools.':'Saved to the tools list.',
    'Belum ada tools. Buka sebuah alamat lalu tekan “Simpan”.':'No tools yet. Open an address and tap “Save”.','Cari di web: ':'Search the web: ','Dibuka di tab baru (DuckDuckGo)':'Opens in a new tab (DuckDuckGo)','Hapus':'Delete','Nama tools:':'Tool name:',
    'Wallet terkunci':'Wallet locked','Browser ini tidak mendukung notifikasi.':'This browser does not support notifications.','Izin notifikasi ditolak.':'Notification permission denied.','Koin masuk: +':'Coins received: +',
    'Masukkan password untuk menampilkan private key:':'Enter your password to show the private key:',
    'Wallet di perangkat ini akan diganti dengan wallet dari seed phrase / WIF yang Anda masukkan. Pastikan Anda punya cadangannya. Lanjutkan?':'The wallet on this device will be replaced with the one from the seed phrase / WIF you enter. Make sure you have a backup. Continue?',
    'Hapus wallet dari perangkat ini? Tanpa cadangan seed phrase/WIF, dana tidak bisa dipulihkan.':'Delete the wallet from this device? Without a seed phrase/WIF backup, funds cannot be recovered.',
    'Password salah.':'Wrong password.','Alamat kosong.':'Address is empty.','Alamat tidak valid (bukan Base58/Bech32).':'Invalid address (not Base58/Bech32).','Fee tidak valid.':'Invalid fee.','Jumlah terlalu kecil (di bawah batas dust).':'Amount too small (below dust limit).',
    'Tidak ada UTXO terkonfirmasi yang bisa dibelanjakan.':'No confirmed UTXO available to spend.','Checksum Base58 salah.':'Base58 checksum is wrong.','Checksum alamat bech32 salah.':'Bech32 address checksum is wrong.','Prefix alamat bukan Nusacoin.':'Address prefix is not Nusacoin.',
    'Prefix bech32 bukan Nusacoin.':'Bech32 prefix is not Nusacoin.','Prefix WIF bukan Nusacoin (0x57).':'WIF prefix is not Nusacoin (0x57).','Total output melebihi total input.':'Total outputs exceed total inputs.','Private key di luar rentang.':'Private key is out of range.'
  };
  const EN_HTML = { browseHint: 'Addresses starting with <b>https://…</b> open full-screen inside the app and can connect to this wallet. Keywords search your tools list; if none match, a web search opens in a new tab. If a page shows blank, that site forbids being opened inside the app; use the “New tab” button. For the Connect wallet button to work, the tools page must load <code>nux-bridge.js</code>.' };
  let lang = store.get('lang') === 'en' ? 'en' : 'id', theme = store.get('theme') === 'dark' ? 'dark' : 'light';
  const t = s => {
    if (lang !== 'en' || typeof s !== 'string') return s;
    if (EN[s]) return EN[s];
    let m = s.match(/^Saldo tidak cukup untuk (.+) NUX \+ fee (.+) NUX\.$/); if (m) return `Insufficient balance for ${m[1]} NUX + ${m[2]} NUX fee.`;
    m = s.match(/^Saldo tidak cukup untuk fee (.+) NUX\.$/); if (m) return `Insufficient balance for the ${m[1]} NUX fee.`;
    m = s.match(/^Fee (.+) NUX /); if (m && /terlalu/i.test(s)) return 'The fee looks too high: ' + s;
    m = s.match(/^Hapus “(.+)” dari daftar tools\?$/); if (m) return `Remove “${m[1]}” from the tools list?`;
    m = s.match(/^(\d+) kata$/); if (m) return m[1] + ' words';
    m = s.match(/^…dan (\d+) output lain ke pihak lain\.$/); if (m) return `…and ${m[1]} more outputs to others.`;
    m = s.match(/^Data (\d+) byte melebihi/); if (m) return `Data of ${m[1]} bytes exceeds the OP_RETURN limit.`;
    return s;
  };
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i]').forEach(e => { if (e.dataset.o === undefined) e.dataset.o = e.textContent; e.textContent = t(e.dataset.o); });
    document.querySelectorAll('[data-ip]').forEach(e => { if (e.dataset.o === undefined) e.dataset.o = e.getAttribute('placeholder'); e.setAttribute('placeholder', t(e.dataset.o)); });
    document.querySelectorAll('[data-ia]').forEach(e => { if (e.dataset.o === undefined) e.dataset.o = e.getAttribute('aria-label'); e.setAttribute('aria-label', t(e.dataset.o)); });
    document.querySelectorAll('[data-ih]').forEach(e => { if (e.dataset.o === undefined) e.dataset.o = e.innerHTML; e.innerHTML = lang === 'en' && EN_HTML[e.dataset.ih] ? EN_HTML[e.dataset.ih] : e.dataset.o; });
    document.querySelectorAll('#segLang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
    document.querySelectorAll('#segTheme button').forEach(b => b.classList.toggle('on', b.dataset.theme === theme));
    if (typeof paintBalance === 'function' && typeof hideBal !== 'undefined') { try { paintBalance(); if (hist) renderHist(); } catch (_) {} }
    syncEye();
  }
  function applyTheme() {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', theme === 'dark' ? '#0b1a30' : '#007BFF');
    document.querySelectorAll('#segTheme button').forEach(b => b.classList.toggle('on', b.dataset.theme === theme));
  }
  document.querySelectorAll('#segLang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; store.set('lang', lang); applyLang(); if (currentView === 'vHome') goHome(); });
  document.querySelectorAll('#segTheme button').forEach(b => b.onclick = () => { theme = b.dataset.theme; store.set('theme', theme); applyTheme(); });

  let cfg = { ...DEFAULT_CFG }, acc = null, wallet = null, builtTx = null, lockTimer = null, hiddenAt = 0, currentView = null;
  let frame = null, frameUrl = '', installEvt = null;

  const show = v => {
    currentView = v; views.forEach(x => $(x).hidden = x !== v);
    const nav = !!wallet && NAV_VIEWS.includes(v);
    $('btnLock').hidden = !nav; $('nav').hidden = !nav;
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === v || ((v === 'vSend' || v === 'vReceive') && b.dataset.go === 'vHome')));
    syncFraming(); window.scrollTo(0, 0);
  };
  const syncFraming = () => document.body.classList.toggle('framing', currentView === 'vBrowse' && !!frame);
  const note = (txt, ok) => { const m = $('msg'); m.hidden = !txt; m.textContent = t(txt) || ''; m.className = 'msg' + (ok ? ' ok' : ''); };
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach(k => e.append(k)); return e; };
  const kv = (k, v) => el('div', { className: 'kv' }, el('span', { textContent: t(k) }), el('b', { textContent: v }));
  const trimNum = n => (Math.round(n * 1e8) / 1e8).toString();
  const busy = (btn, on, txt) => { btn.disabled = on; if (txt) btn.textContent = on ? t('Memproses…') : t(txt); };
  const err = (code, message) => ({ error: { code, message } });

  const ask = (text, withInput, type) => new Promise(res => {
    const m = $('modal'), i = $('mInput'); $('mText').textContent = t(text); i.type = type || 'password'; i.hidden = !withInput; i.value = ''; m.hidden = false; if (withInput) i.focus();
    const done = v => { m.hidden = true; i.value = ''; res(v); };
    $('mYes').onclick = () => done(withInput ? i.value : true); $('mNo').onclick = () => done(withInput ? null : false);
  });

  // ---------- kunci otomatis ----------
  const lockMs = () => Math.max(1, Number(cfg.autoLockMin) || 15) * 60000;
  function touch() { clearTimeout(lockTimer); if (wallet) lockTimer = setTimeout(lockNow, lockMs()); }
  function lockNow() {
    clearTimeout(lockTimer); stopPoll(); wallet = null; builtTx = null; closeFrame();
    if (cur) { const c = cur; cur = null; c.resolve(err(4100, 'Wallet terkunci')); }
    while (queue.length) queue.shift().resolve(err(4100, 'Wallet terkunci'));
    if (acc) { note(''); show('vUnlock'); }
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (wallet) touch(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (wallet && hiddenAt && Date.now() - hiddenAt > lockMs()) lockNow();
  });

  function init() {
    cfg = { ...DEFAULT_CFG, ...(store.get('cfg') || {}) };
    acc = store.get('account');
    if (!acc) return show('vSetup');
    show('vUnlock');
  }

  // ---------- setup ----------
  let importMode = false, seedMode = false;
  const setMode = m => {
    importMode = m === 'wif'; seedMode = m === 'seed';
    $('tabCreate').classList.toggle('on', m === 'create'); $('tabImport').classList.toggle('on', m === 'wif'); $('tabSeed').classList.toggle('on', m === 'seed');
    $('importBox').hidden = m !== 'wif'; $('seedBox').hidden = m !== 'seed'; $('seedHint').hidden = m !== 'seed';
  };
  $('tabCreate').onclick = () => setMode('create'); $('tabImport').onclick = () => setMode('wif'); $('tabSeed').onclick = () => setMode('seed');
  $('inSeed').oninput = () => { $('seedCount').textContent = t(C_SEED.normalizeMnemonic($('inSeed').value).split(' ').filter(Boolean).length + ' kata'); };
  $('btnSetup').onclick = async () => {
    note(''); const b = $('btnSetup');
    try {
      const p1 = $('inPass').value, p2 = $('inPass2').value, type = $('inType').value;
      if (p1.length < 8) throw new Error('Password minimal 8 karakter.');
      if (p1 !== p2) throw new Error('Konfirmasi password tidak sama.');
      if (seedMode) { const c = C_SEED.checkMnemonic($('inSeed').value); if (!c.ok) throw new Error(c.error); }
      busy(b, true);
      const wif = seedMode ? await C_SEED.wifFromMnemonic($('inSeed').value, type) : importMode ? $('inWif').value.trim() : C.wifEncode(C.randomPrivKey());
      const w = C.walletFromWif(wif, type);
      const vault = await C.encryptSecret(p1, wif);
      store.set('vault', vault); store.set('account', { address: w.address, pubkey: w.pubkey, type }); store.set('perms', {});
      acc = { address: w.address, pubkey: w.pubkey, type }; wallet = w; touch();
      $('inPass').value = $('inPass2').value = $('inWif').value = $('inSeed').value = ''; $('seedCount').textContent = '0 kata';
      if (importMode || seedMode) return goHome();
      $('bkWif').value = wif; $('bkOk').checked = false; $('btnBackupDone').disabled = true; show('vBackup');
    } catch (e) { note(e.message); } finally { busy(b, false, 'Lanjut'); }
  };
  $('bkOk').onchange = () => $('btnBackupDone').disabled = !$('bkOk').checked;
  $('btnBackupDone').onclick = () => { $('bkWif').value = ''; goHome(); };

  // ---------- buka / kunci ----------
  async function doUnlock() {
    note(''); const b = $('btnUnlock');
    try {
      busy(b, true);
      const wif = await C.decryptSecret($('unPass').value, store.get('vault'));
      wallet = C.walletFromWif(wif, acc.type); touch(); $('unPass').value = '';
      goHome();
    } catch (e) { note(e.message); } finally { busy(b, false, 'Buka'); }
  }
  $('btnUnlock').onclick = doUnlock; $('unPass').onkeydown = e => { if (e.key === 'Enter') doUnlock(); };
  $('btnForgot').onclick = async () => {
    if (!(await ask('Wallet di perangkat ini akan diganti dengan wallet dari seed phrase / WIF yang Anda masukkan. Pastikan Anda punya cadangannya. Lanjutkan?'))) return;
    note(''); setMode('seed'); show('vSetup');
  };
  $('btnLock').onclick = lockNow;
  document.querySelectorAll('#nav button').forEach(b => b.onclick = () => {
    note(''); const v = b.dataset.go;
    if (v === 'vHome') goHome(); else if (v === 'vSettings') openSettings(); else openBrowse();
  });

  // ---------- beranda ----------
  let hideBal = !!store.get('hide'), bal = { conf: null, total: null, recv: null }, pollTimer = null;
  const fmtRp = n => '≈ Rp ' + Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID');
  function syncEye() {
    $('eyeOn').hidden = hideBal; $('eyeOff').hidden = !hideBal;
    const b = $('btnEye'); b.setAttribute('aria-label', t(hideBal ? 'Tampilkan saldo' : 'Sembunyikan saldo'));
  }
  function paintBalance() {
    const hid = hideBal, has = bal.total !== null, dots = '••••••';
    if (has || hid) $('hBalance').textContent = hid ? dots : trimNum(bal.total);
    const price = Number(cfg.price) || 0, f = $('hFiat');
    f.hidden = !(price > 0 && has); if (!f.hidden) f.textContent = hid ? '≈ Rp ••••' : fmtRp(bal.total * price);
    const r = $('hRecv'); r.hidden = bal.recv === null; if (!r.hidden) r.textContent = t('Total diterima: ') + (hid ? '••••' : trimNum(bal.recv) + ' NUX');
    syncEye();
  }
  async function fetchReceived() {
    try {
      const r = await fetch(C.trimUrl(cfg.explorer) + '/ext/getaddress/' + encodeURIComponent(acc.address)); if (!r.ok) return null;
      const n = Number((await r.json()).received); return isNaN(n) ? null : n;
    } catch (_) { return null; }
  }
  async function goHome() {
    note(''); show('vHome'); $('hAddr').textContent = acc.address;
    const lab = $('hAddrLabel'); lab.dataset.o = acc.type === 'p2pkh' ? 'Alamat P2PKH' : 'Alamat Bech32'; lab.textContent = t(lab.dataset.o);
    $('swNotif').checked = notifOn(); startPoll();
    bal = { conf: null, total: null, recv: null }; $('hBalance').textContent = '…'; paintBalance();
    try {
      const [c, r] = await Promise.all([C.fetchBalance(cfg.explorer, acc.address), fetchReceived()]);
      bal = { conf: c, total: c, recv: r }; store.set('lastBal', bal.total); paintBalance();
    } catch (e) { $('hBalance').textContent = t('Offline'); note(t('Gagal memuat saldo: ') + t(e.message)); }
    try { hist = await C.fetchHistory(cfg.explorer, acc.address, 10); } catch (e) { hist = null; }
    renderHist();
  }
  let hist = null;
  function renderHist() {
    const box = $('hHistory'); box.textContent = '';
    if (hist === null) return box.append(el('small', { textContent: t('Riwayat tidak tersedia.') }));
    if (!hist.length) return box.append(el('small', { textContent: t('Belum ada transaksi.') }));
    hist.forEach(x => box.append(el('div', {}, el('a', { href: C.trimUrl(cfg.explorer) + '/tx/' + encodeURIComponent(x.txid), target: '_blank', rel: 'noopener noreferrer', textContent: x.txid.slice(0, 10) + '…' + x.txid.slice(-8) }), el('span', { textContent: hideBal ? '••••' : (x.amount !== null && !isNaN(x.amount) ? trimNum(x.amount) + ' NUX' : '') }))));
  }
  $('btnRefresh').onclick = goHome;
  $('btnEye').onclick = () => { hideBal = !hideBal; store.set('hide', hideBal); paintBalance(); if (hist) renderHist(); };
  const copyAddr = async () => { try { await navigator.clipboard.writeText(acc.address); note('Alamat disalin.', true); setTimeout(() => note(''), 1500); } catch (e) { note('Tidak bisa menyalin. Salin manual dari kotak alamat.'); } };
  $('btnCopy').onclick = copyAddr; $('btnCopy').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyAddr(); } };
  $('btnToSend').onclick = () => { note(''); $('sTo').value = ''; $('sAmt').value = ''; $('sFee').value = cfg.fee; $('sReview').hidden = true; builtTx = null; $('btnSendGo').textContent = t('Tinjau'); show('vSend'); };
  function drawQr(text) {
    const cv = $('rQr');
    try {
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      const q = qrcode(0, 'M'); q.addData(text); q.make();
      const n = q.getModuleCount(), quiet = 2, cell = Math.floor(cv.width / (n + quiet * 2)), off = Math.floor((cv.width - cell * n) / 2);
      ctx.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
    } catch (_) { cv.hidden = true; }
  }
  $('btnToReceive').onclick = () => { note(''); $('rAddr').textContent = acc.address; $('rQr').hidden = false; drawQr(acc.address); $('rShare').hidden = !navigator.share; show('vReceive'); };
  $('rBack').onclick = goHome; $('rCopy').onclick = copyAddr;
  $('rShare').onclick = () => { try { navigator.share({ title: 'Nusa Wallet', text: acc.address }).catch(() => {}); } catch (_) {} };

  // ---------- notifikasi saldo masuk (lokal, saat aplikasi terbuka) ----------
  const notifOn = () => !!store.get('notif') && 'Notification' in window && Notification.permission === 'granted';
  function stopPoll() { clearInterval(pollTimer); pollTimer = null; }
  function startPoll() { stopPoll(); if (wallet && notifOn()) pollTimer = setInterval(pollBalance, 60000); }
  async function pollBalance() {
    if (!wallet || !acc || !notifOn()) return;
    try {
      const c = await C.fetchBalance(cfg.explorer, acc.address), total = c, last = store.get('lastBal');
      store.set('lastBal', total);
      if (typeof last === 'number' && total > last + 1e-9) notifyIn(total - last);
    } catch (_) { /* coba lagi pada putaran berikutnya */ }
  }
  async function notifyIn(d) {
    const body = t('Koin masuk: +') + trimNum(d) + ' NUX', opt = { body, icon: 'icons/icon-192.png', tag: 'nux-in' };
    try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) return reg.showNotification('Nusa Wallet', opt); } catch (_) {}
    try { new Notification('Nusa Wallet', opt); } catch (_) {}
  }
  $('swNotif').onchange = async e => {
    const sw = e.target;
    if (!sw.checked) { store.set('notif', false); return stopPoll(); }
    if (!('Notification' in window)) { sw.checked = false; return note('Browser ini tidak mendukung notifikasi.'); }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { sw.checked = false; store.set('notif', false); return note('Izin notifikasi ditolak.'); }
    store.set('notif', true); startPoll();
  };

  // ---------- kirim ----------
  $('btnSendBack').onclick = goHome;
  $('btnSendGo').onclick = async () => {
    note(''); const b = $('btnSendGo');
    try {
      busy(b, true);
      if (!builtTx) {
        builtTx = await C.prepareSend(cfg, wallet, $('sTo').value.trim(), $('sAmt').value, $('sFee').value);
        const r = $('sReview'); r.textContent = ''; r.hidden = false;
        r.append(kv('Ke', $('sTo').value.trim()), kv('Jumlah', trimNum(Number($('sAmt').value)) + ' NUX'), kv('Fee', trimNum(builtTx.fee) + ' NUX'), kv('Input', String(builtTx.inputs)), el('small', { textContent: t('Transaksi tidak bisa dibatalkan setelah dikirim.') }));
        b.textContent = t('Kirim sekarang'); b.disabled = false; return;
      }
      const txid = await C.broadcast(cfg, builtTx.raw, builtTx.txid);
      builtTx = null; const msg = t('Terkirim. TXID: ') + txid; await goHome(); note(msg, true);
    } catch (e) { note(e.message); builtTx = null; $('sReview').hidden = true; b.textContent = t('Tinjau'); b.disabled = false; }
  };
  ['sTo', 'sAmt', 'sFee'].forEach(i => $(i).oninput = () => { builtTx = null; $('sReview').hidden = true; $('btnSendGo').textContent = t('Tinjau'); });

  // ---------- pengaturan ----------
  function openSettings() {
    note(''); $('cExplorer').value = cfg.explorer; $('cApi').value = cfg.api; $('cUtxo').value = cfg.utxoTemplate; $('cFee').value = cfg.fee; $('cLock').value = cfg.autoLockMin; $('cPrice').value = cfg.price || ''; $('cWif').hidden = true; $('cWif').value = '';
    const perms = store.get('perms') || {}, box = $('cSites'); box.textContent = '';
    const keys = Object.keys(perms); if (!keys.length) box.append(el('small', { textContent: t('Belum ada situs terhubung.') }));
    keys.forEach(o => box.append(el('div', {}, el('span', { textContent: o }), el('button', { className: 'danger', style: 'width:auto;margin:0', textContent: t('Cabut'), onclick: () => { const p = store.get('perms') || {}; delete p[o]; store.set('perms', p); openSettings(); } }))));
    $('btnInstall').hidden = !installEvt; applyLang();
    show('vSettings');
  }
  $('btnSetBack').onclick = goHome;
  $('btnSaveCfg').onclick = () => {
    const u = x => { const v = x.trim(); if (v && !/^https:\/\//i.test(v)) throw new Error('URL harus diawali https://'); return v; };
    try {
      cfg = { explorer: u($('cExplorer').value) || DEFAULT_CFG.explorer, api: u($('cApi').value) || DEFAULT_CFG.api, utxoTemplate: u($('cUtxo').value), fee: $('cFee').value || DEFAULT_CFG.fee, autoLockMin: Number($('cLock').value) || 15, price: Math.max(0, Number($('cPrice').value) || 0) };
      store.set('cfg', cfg); touch(); note('Tersimpan.', true);
    } catch (e) { note(e.message); }
  };
  $('btnExport').onclick = async () => {
    const pw = await ask('Masukkan password untuk menampilkan private key:', true); if (pw === null) return;
    try { $('cWif').value = await C.decryptSecret(pw, store.get('vault')); $('cWif').hidden = false; setTimeout(() => { $('cWif').value = ''; $('cWif').hidden = true; }, 30000); } catch (e) { note(e.message); }
  };
  $('btnReset').onclick = async () => {
    if (!(await ask('Hapus wallet dari perangkat ini? Tanpa cadangan seed phrase/WIF, dana tidak bisa dipulihkan.'))) return;
    store.remove('vault', 'account', 'perms'); clearTimeout(lockTimer); closeFrame(); acc = wallet = null; note(''); setMode('create'); show('vSetup');
  };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', () => { installEvt = null; });
  $('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('btnInstall').hidden = true; };

  // ---------- Jelajah: pencarian & tools ----------
  const getTools = () => { const t = store.get('tools'); return Array.isArray(t) ? t : DEFAULT_TOOLS.slice(); };
  const domainLike = v => /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v);
  const webSearchUrl = q => 'https://duckduckgo.com/?q=' + encodeURIComponent(q);
  const openTab = u => window.open(u, '_blank', 'noopener,noreferrer');

  function openBrowse() { note(''); renderTools(); show('vBrowse'); }
  function renderTools() {
    const q = $('bQ').value.trim().toLowerCase(), box = $('bList'); box.textContent = '';
    const isUrl = /^https:\/\//i.test(q) || domainLike(q);
    const tools = getTools(), shown = tools.map((t, i) => ({ t, i })).filter(x => !q || isUrl || (x.t.name + ' ' + x.t.url).toLowerCase().includes(q));
    shown.forEach(({ t: tl, i }) => box.append(el('div', { className: 'tool' },
      el('span', { onclick: () => openUrl(tl.url) }, el('b', { textContent: tl.name }), el('small', { textContent: tl.url })),
      el('button', { className: 'danger', style: 'width:auto;margin:0', textContent: t('Hapus'), onclick: async e => { e.stopPropagation(); if (await ask('Hapus “' + tl.name + '” dari daftar tools?')) { const a = getTools(); a.splice(i, 1); store.set('tools', a); renderTools(); } } }))));
    if (!shown.length && !q) box.append(el('small', { textContent: t('Belum ada tools. Buka sebuah alamat lalu tekan “Simpan”.') }));
    if (q && !isUrl) box.append(el('div', { className: 'tool' }, el('span', { onclick: () => openTab(webSearchUrl($('bQ').value.trim())) }, el('b', { textContent: t('Cari di web: ') + $('bQ').value.trim() }), el('small', { textContent: t('Dibuka di tab baru (DuckDuckGo)') }))));
  }
  $('bQ').oninput = renderTools;
  function goSearch() {
    const v = $('bQ').value.trim(); if (!v) return;
    if (/^https:\/\//i.test(v)) return openUrl(v);
    if (/^http:\/\//i.test(v)) return note('Hanya alamat https:// yang bisa dibuka di dalam aplikasi.');
    if (domainLike(v)) return openUrl('https://' + v);
    const m = getTools().filter(t => (t.name + ' ' + t.url).toLowerCase().includes(v.toLowerCase()));
    if (m.length === 1) return openUrl(m[0].url);
    if (!m.length) openTab(webSearchUrl(v));
  }
  $('bGo').onclick = goSearch; $('bQ').onkeydown = e => { if (e.key === 'Enter') goSearch(); };

  function openUrl(u) {
    note('');
    let url; try { url = new URL(u); } catch (_) { return note('Alamat tidak valid.'); }
    if (url.protocol !== 'https:') return note('Hanya alamat https:// yang bisa dibuka di dalam aplikasi.');
    closeFrame(); frameUrl = url.href;
    frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals');
    frame.setAttribute('allow', 'camera; clipboard-write');
    frame.title = 'Tools';
    frame.addEventListener('load', () => injectSameOrigin(frame));
    frame.src = frameUrl; $('frameBox').append(frame);
    $('bCur').textContent = url.host + url.pathname; $('bTools').hidden = true; $('frameWrap').hidden = false;
    syncFraming();
  }
  function closeFrame() {
    if (frame) { try { frame.src = 'about:blank'; } catch (_) {} frame.remove(); frame = null; }
    frameUrl = ''; $('frameWrap').hidden = true; $('bTools').hidden = false;
    syncFraming();
  }
  // Halaman tools di origin yang sama dengan wallet: jembatan dipasang otomatis (best-effort).
  function injectSameOrigin(f) {
    try {
      const w = f.contentWindow, d = f.contentDocument;
      if (!w || !d || w.nux) return;
      const s = d.createElement('script'); s.src = new URL('nux-bridge.js', location.href).href; (d.head || d.documentElement).appendChild(s);
    } catch (_) { /* beda origin: halaman harus memuat nux-bridge.js sendiri */ }
  }
  $('bClose').onclick = closeFrame;
  $('bExt').onclick = () => { if (frameUrl) openTab(frameUrl); };
  $('bSave').onclick = async () => {
    if (!frameUrl) return;
    const u = new URL(frameUrl), name = await ask('Nama tools:', true, 'text'); if (!name || !name.trim()) return;
    const a = getTools().filter(t => t.url !== frameUrl); a.push({ name: name.trim(), url: frameUrl }); store.set('tools', a); note('Disimpan ke daftar tools.', true); setTimeout(() => note(''), 1500);
  };

  // ---------- jembatan DApp: halaman di dalam iframe -> wallet ----------
  window.addEventListener('message', async e => {
    const d = e.data;
    if (!d || d.target !== 'nusa-content' || !frame || e.source !== frame.contentWindow) return;
    const origin = e.origin, reply = o => { try { e.source.postMessage(Object.assign({ target: 'nusa-page', id: d.id }, o), origin); } catch (_) {} };
    if (!origin || origin === 'null') return reply(err(4100, 'Origin tidak valid'));
    if (!ALLOWED.includes(d.method)) return reply(err(4200, 'Method tidak didukung: ' + d.method));
    try {
      const res = await handleDapp(d.method, d.params || {}, origin);
      res && res.error ? reply({ error: res.error }) : reply({ result: res ? res.result : null });
    } catch (x) { reply(err(-32603, x.message)); }
  });

  async function handleDapp(method, params, origin) {
    if (!acc) return err(4100, 'Wallet belum dibuat.');
    if (!wallet) return err(4100, 'Wallet terkunci. Buka kunci wallet lebih dulu.');
    touch();
    const perms = store.get('perms') || {}, allowed = !!perms[origin];
    if (method === 'nux_disconnect') { delete perms[origin]; store.set('perms', perms); return { result: true }; }
    if (method === 'nux_connect' && allowed) return { result: { address: acc.address, publicKey: acc.pubkey } };
    if (method === 'nux_getAddress') return allowed ? { result: acc.address } : err(4100, 'Situs belum terhubung. Panggil connect() dulu.');
    if (method === 'nux_getBalance') {
      if (!allowed) return err(4100, 'Situs belum terhubung.');
      try { return { result: await C.fetchBalance(cfg.explorer, acc.address) }; } catch (e) { return err(-32603, e.message); }
    }
    if (method !== 'nux_connect' && !allowed) return err(4100, 'Situs belum terhubung.');
    if (method === 'nux_signMessage' && typeof params.message !== 'string') return err(-32602, 'message harus string');
    if (method === 'nux_sendTransaction') {
      try { C.addressToScriptHex(params.to); } catch (e) { return err(-32602, e.message); }
      if (!(Number(params.amount) > 0)) return err(-32602, 'amount harus > 0 (dalam NUX)');
    }
    if (method === 'nux_signTransaction') {
      if (!Array.isArray(params.inputs) || !Array.isArray(params.outputs)) return err(-32602, 'inputs dan outputs harus berupa array');
      if (params.inputs.length > 800 || params.outputs.length > 800) return err(-32602, 'Transaksi terlalu besar');
    }
    if (method === 'nux_sendData') { try { params.hex = dataToHex(params.data, params.encoding); } catch (e) { return err(-32602, e.message); } }
    return requestApproval(method, params, origin);
  }
  function dataToHex(data, encoding) {
    let bytes;
    if (encoding === 'hex') { if (!/^([0-9a-fA-F]{2})+$/.test(data)) throw new Error('Data hex tidak valid.'); bytes = C.hexToBytes(data); }
    else if (!encoding || encoding === 'utf8') bytes = new TextEncoder().encode(data);
    else throw new Error("encoding harus 'utf8' atau 'hex'");
    if (!bytes.length || bytes.length > C.MAX_OPRETURN) throw new Error(`Data harus 1-${C.MAX_OPRETURN} byte (sekarang ${bytes.length}).`);
    return C.bytesToHex(bytes);
  }

  // ---------- persetujuan (di dalam aplikasi) ----------
  const queue = []; let cur = null;
  const requestApproval = (method, params, origin) => new Promise(resolve => { queue.push({ method, params, origin, resolve }); pump(); });
  function pump() { if (cur || !queue.length) return; cur = queue.shift(); renderApprove(); }
  function finishApproval(response) {
    const c = cur; cur = null; builtTx = null; c.resolve(response);
    if (queue.length) pump(); else if (wallet) show('vBrowse');
  }
  async function renderApprove() {
    note(''); const r = cur, body = $('aBody'); body.textContent = ''; $('aOrigin').textContent = r.origin; $('btnApprove').disabled = false; builtTx = null;
    show('vApprove'); $('nav').hidden = true; $('btnLock').hidden = true;
    const hold = () => { $('btnApprove').disabled = true; };
    if (r.method === 'nux_connect') {
      $('aTitle').textContent = t('Hubungkan situs'); body.append(el('p', { textContent: t('Situs ini meminta melihat alamat dan public key Anda. Ia tidak bisa mengirim dana tanpa persetujuan Anda.') }), kv('Alamat', acc.address));
    } else if (r.method === 'nux_signMessage') {
      $('aTitle').textContent = t('Tanda tangani pesan'); body.append(el('small', { textContent: t('Pesan:') }), el('pre', { textContent: r.params.message }), el('p', { className: 'hint', textContent: t('Tanda tangan tidak memindahkan dana, tapi bisa dipakai situs untuk membuktikan Anda pemilik alamat.') }));
    } else if (r.method === 'nux_sendTransaction') {
      $('aTitle').textContent = t('Kirim NUX'); body.append(el('small', { textContent: t('Menyiapkan transaksi…') })); hold();
      try {
        builtTx = await C.prepareSend(cfg, wallet, r.params.to, r.params.amount, cfg.fee);
        body.textContent = ''; body.append(kv('Ke', r.params.to), kv('Jumlah', trimNum(Number(r.params.amount)) + ' NUX'), kv('Fee', trimNum(builtTx.fee) + ' NUX'), el('p', { className: 'hint', textContent: t('Periksa alamat tujuan dengan teliti. Transaksi tidak bisa dibatalkan.') }));
        $('btnApprove').disabled = false;
      } catch (e) { body.textContent = ''; note(e.message); }
    } else if (r.method === 'nux_signTransaction') {
      $('aTitle').textContent = t('Tanda tangani transaksi'); body.append(el('small', { textContent: t('Memverifikasi transaksi…') })); hold();
      try {
        builtTx = await C.prepareSign(cfg, wallet, r.params.inputs, r.params.outputs);
        const outs = builtTx.outputs, pay = outs.filter(o => !o.script.startsWith('6a'));
        const others = pay.filter(o => C.scriptToAddress(o.script) !== acc.address), sumOthers = others.reduce((a, o) => a + o.value, 0);
        const short = a => a.length > 26 ? a.slice(0, 12) + '…' + a.slice(-8) : a;
        body.textContent = '';
        body.append(kv('Input', builtTx.inputs + ' UTXO (' + trimNum(builtTx.totalIn / 1e8) + ' NUX)'), kv('Keluar ke pihak lain', trimNum(sumOthers / 1e8) + ' NUX'), kv('Fee', trimNum(builtTx.fee) + ' NUX'));
        others.slice(0, 8).forEach(o => body.append(kv(short(C.scriptToAddress(o.script)), trimNum(o.value / 1e8) + ' NUX')));
        if (others.length > 8) body.append(el('small', { textContent: t('…dan ' + (others.length - 8) + ' output lain ke pihak lain.') }));
        if (!others.length) body.append(el('p', { className: 'hint', textContent: t('Tidak ada NUX yang keluar ke pihak lain (hanya ke wallet sendiri dan/atau data on-chain).') }));
        const opd = outs.map(o => C.opReturnData(o.script)).find(Boolean);
        if (opd) { let t = ''; try { t = new TextDecoder('utf-8', { fatal: true }).decode(opd); } catch (_) {} body.append(el('small', { textContent: t('Data on-chain (') + opd.length + ' byte):' }), el('pre', { textContent: t || C.bytesToHex(opd) })); }
        body.append(el('p', { className: 'hint', textContent: t('Situs akan menyiarkan transaksi ini setelah Anda setujui. Periksa tujuan dan jumlah dengan teliti; transaksi tidak bisa dibatalkan.') }));
        $('btnApprove').disabled = false;
      } catch (e) { body.textContent = ''; note(e.message); }
    } else if (r.method === 'nux_sendData') {
      $('aTitle').textContent = t('Tulis data ke blockchain'); body.append(el('small', { textContent: t('Menyiapkan transaksi…') })); hold();
      try {
        const bytes = C.hexToBytes(r.params.hex);
        builtTx = await C.prepareData(cfg, wallet, bytes, cfg.fee);
        let preview = ''; try { preview = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (_) {}
        body.textContent = ''; body.append(kv('Ukuran', bytes.length + ' byte'), kv('Fee', trimNum(builtTx.fee) + ' NUX'), el('small', { textContent: t('Data (hex):') }), el('pre', { textContent: r.params.hex }));
        if (preview) body.append(el('small', { textContent: t('Teks:') }), el('pre', { textContent: preview }));
        body.append(el('p', { className: 'hint', textContent: t('Data ini akan tercatat permanen dan publik di blockchain. Tidak ada NUX yang dikirim ke pihak lain selain fee.') }));
        $('btnApprove').disabled = false;
      } catch (e) { body.textContent = ''; note(e.message); }
    }
  }
  $('btnReject').onclick = () => { if (cur) finishApproval(err(4001, 'Ditolak pengguna')); };
  $('btnApprove').onclick = async () => {
    const r = cur, b = $('btnApprove'); if (!r) return; note('');
    try {
      busy(b, true); let result = null;
      if (r.method === 'nux_signMessage') result = C.signMessage(wallet.wif, r.params.message);
      else if (r.method === 'nux_signTransaction') result = { raw: builtTx.raw, txid: builtTx.txid, fee: builtTx.fee };
      else if (r.method === 'nux_sendTransaction' || r.method === 'nux_sendData') result = { txid: await C.broadcast(cfg, builtTx.raw, builtTx.txid) };
      if (r.method === 'nux_connect') { const p = store.get('perms') || {}; p[r.origin] = Date.now(); store.set('perms', p); finishApproval({ result: { address: acc.address, publicKey: acc.pubkey } }); }
      else finishApproval({ result });
    } catch (e) { note(e.message); busy(b, false, 'Setujui'); }
  };

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW gagal:', e)));
  }
  applyTheme(); applyLang(); init();
})();
