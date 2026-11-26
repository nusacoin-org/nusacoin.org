/* Nusa Wallet core — kripto murni JS (tanpa dependensi), parameter Nusacoin (NUX).
   Diport dari logika Nusa-Card.html: P2PKH (N...), Bech32 (nu1q...), WIF 0x57. */
(function (root) {
  'use strict';

  const PARAMS = { bech32: 'nu', pubKeyHash: 0x35, scriptHash: 0x4b, wif: 0x57 };
  const MSG_MAGIC = 'Nusachain Signed Message:\n'; // sama dengan Tanda-Tangan-Wallet.html (Nusachain Tools) agar tanda tangan bisa diverifikasi di sana
  const DUST_SATS = 546;

  // ---------- util ----------
  const hexToBytes = h => { const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; };
  const bytesToHex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  const concat = (...a) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
  const utf8 = s => new TextEncoder().encode(s);
  const reverseHex = h => h.match(/../g).reverse().join('');
  const b64 = b => btoa(String.fromCharCode(...b));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  // ---------- SHA-256 ----------
  const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
  const SK = new Uint32Array(primes.map(p => frac(Math.cbrt(p))));
  const SH0 = primes.slice(0, 8).map(p => frac(Math.sqrt(p)));
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  function sha256(msg) {
    const l = msg.length, padLen = ((l + 9 + 63) >> 6) << 6, buf = new Uint8Array(padLen);
    buf.set(msg); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor(l / 0x20000000)); dv.setUint32(padLen - 4, (l << 3) >>> 0);
    const H = Uint32Array.from(SH0), w = new Uint32Array(64);
    for (let o = 0; o < padLen; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SK[i] + w[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    H.forEach((x, i) => odv.setUint32(i * 4, x >>> 0));
    return out;
  }
  const sha256d = m => sha256(sha256(m));

  function hmacSha256(key, msg) {
    if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key);
    const ip = k.map(x => x ^ 0x36), op = k.map(x => x ^ 0x5c);
    return sha256(concat(op, sha256(concat(ip, msg))));
  }

  // ---------- RIPEMD-160 ----------
  const R1 = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
  const R2 = [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
  const S1 = [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
  const S2 = [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
  const KL = [0, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E], KR = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0];
  const rotl = (x, n) => (x << n) | (x >>> (32 - n));
  const rf = (j, x, y, z) => j < 16 ? x ^ y ^ z : j < 32 ? (x & y) | (~x & z) : j < 48 ? (x | ~y) ^ z : j < 64 ? (x & z) | (y & ~z) : x ^ (y | ~z);
  function ripemd160(msg) {
    const l = msg.length, padLen = ((l + 9 + 63) >> 6) << 6, buf = new Uint8Array(padLen);
    buf.set(msg); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, (l << 3) >>> 0, true); dv.setUint32(padLen - 4, Math.floor(l / 0x20000000), true);
    let h0 = 0x67452301, h1 = 0xEFCDAB89 | 0, h2 = 0x98BADCFE | 0, h3 = 0x10325476, h4 = 0xC3D2E1F0 | 0;
    const X = new Uint32Array(16);
    for (let o = 0; o < padLen; o += 64) {
      for (let i = 0; i < 16; i++) X[i] = dv.getUint32(o + i * 4, true);
      let al = h0, bl = h1, cl = h2, dl = h3, el = h4, ar = h0, br = h1, cr = h2, dr = h3, er = h4;
      for (let j = 0; j < 80; j++) {
        let t = (rotl((al + rf(j, bl, cl, dl) + X[R1[j]] + KL[j >> 4]) | 0, S1[j]) + el) | 0;
        al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
        t = (rotl((ar + rf(79 - j, br, cr, dr) + X[R2[j]] + KR[j >> 4]) | 0, S2[j]) + er) | 0;
        ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
      }
      const t = (h1 + cl + dr) | 0;
      h1 = (h2 + dl + er) | 0; h2 = (h3 + el + ar) | 0; h3 = (h4 + al + br) | 0; h4 = (h0 + bl + cr) | 0; h0 = t;
    }
    const out = new Uint8Array(20), odv = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach((x, i) => odv.setUint32(i * 4, x >>> 0, true));
    return out;
  }
  const hash160 = m => ripemd160(sha256(m));

  // ---------- secp256k1 (BigInt, affine) ----------
  const P = 2n ** 256n - 2n ** 32n - 977n;
  const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const G = [0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n, 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n];
  const mod = (a, m = P) => { const r = a % m; return r >= 0n ? r : r + m; };
  function inv(a, m = P) {
    let [lm, hm, low, high] = [1n, 0n, mod(a, m), m];
    while (low > 1n) { const q = high / low; [lm, hm, low, high] = [hm - lm * q, lm, high - low * q, low]; }
    return mod(lm, m);
  }
  function padd(p, q) {
    if (!p) return q; if (!q) return p;
    let l;
    if (p[0] === q[0]) { if (mod(p[1] + q[1]) === 0n) return null; l = mod(3n * p[0] * p[0] * inv(2n * p[1])); }
    else l = mod((q[1] - p[1]) * inv(q[0] - p[0]));
    const x = mod(l * l - p[0] - q[0]);
    return [x, mod(l * (p[0] - x) - p[1])];
  }
  function pmul(k, p) {
    let r = null, a = p;
    while (k > 0n) { if (k & 1n) r = padd(r, a); a = padd(a, a); k >>= 1n; }
    return r;
  }
  const b2i = b => BigInt('0x' + (bytesToHex(b) || '0'));
  const i2b = (n, len = 32) => hexToBytes(n.toString(16).padStart(len * 2, '0'));

  function pubkeyFromPriv(priv32) {
    const d = b2i(priv32);
    if (d <= 0n || d >= N) throw new Error('Private key di luar rentang.');
    const [x, y] = pmul(d, G);
    return concat(Uint8Array.of(y & 1n ? 3 : 2), i2b(x));
  }

  function rfc6979k(d, hash) {
    const x = i2b(d), h1 = i2b(mod(b2i(hash), N));
    let V = new Uint8Array(32).fill(1), K = new Uint8Array(32);
    K = hmacSha256(K, concat(V, Uint8Array.of(0), x, h1)); V = hmacSha256(K, V);
    K = hmacSha256(K, concat(V, Uint8Array.of(1), x, h1)); V = hmacSha256(K, V);
    for (;;) {
      V = hmacSha256(K, V);
      const k = b2i(V);
      if (k > 0n && k < N) return k;
      K = hmacSha256(K, concat(V, Uint8Array.of(0))); V = hmacSha256(K, V);
    }
  }

  // Tanda tangan ECDSA deterministik (RFC6979), low-S. hash = 32 byte digest.
  function signHash(priv32, hash) {
    const d = b2i(priv32), z = b2i(hash), k = rfc6979k(d, hash);
    const R = pmul(k, G);
    const r = mod(R[0], N);
    let recid = Number(R[1] & 1n) | (R[0] >= N ? 2 : 0);
    let s = mod(inv(k, N) * (z + r * d), N);
    if (s > N / 2n) { s = N - s; recid ^= 1; }
    return { r, s, recid };
  }
  function derEncode(r, s) {
    const enc = n => { let b = i2b(n, 32); let i = 0; while (i < 31 && b[i] === 0) i++; b = b.slice(i); if (b[0] & 0x80) b = concat(Uint8Array.of(0), b); return concat(Uint8Array.of(2, b.length), b); };
    const rr = enc(r), ss = enc(s);
    return bytesToHex(concat(Uint8Array.of(0x30, rr.length + ss.length), rr, ss));
  }

  // ---------- Base58 / Bech32 ----------
  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function b58enc(bytes) {
    let n = b2i(bytes), s = '';
    while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
    for (const b of bytes) { if (b === 0) s = '1' + s; else break; }
    return s;
  }
  function b58dec(str) {
    let n = 0n;
    for (const c of str) { const i = B58.indexOf(c); if (i < 0) throw new Error('Karakter Base58 tidak valid.'); n = n * 58n + BigInt(i); }
    let hex = n === 0n ? '' : n.toString(16); if (hex.length % 2) hex = '0' + hex;
    let z = 0; for (const c of str) { if (c === '1') z++; else break; }
    return concat(new Uint8Array(z), hexToBytes(hex));
  }
  const b58checkEnc = payload => b58enc(concat(payload, sha256d(payload).slice(0, 4)));
  function b58checkDec(str) {
    const raw = b58dec(str);
    if (raw.length < 5) throw new Error('Base58 terlalu pendek.');
    const payload = raw.slice(0, -4), cs = raw.slice(-4), h = sha256d(payload).slice(0, 4);
    if (bytesToHex(cs) !== bytesToHex(h)) throw new Error('Checksum Base58 salah.');
    return payload;
  }

  const BCS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const BG = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  function polymod(values) {
    let chk = 1;
    for (const v of values) { const top = chk >>> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= BG[i]; }
    return chk >>> 0;
  }
  const hrpExpand = h => [...h].map(c => c.charCodeAt(0) >> 5).concat([0], [...h].map(c => c.charCodeAt(0) & 31));
  function convertBits(data, from, to, pad) {
    let acc = 0, bits = 0; const out = [], maxv = (1 << to) - 1;
    for (const v of data) { acc = ((acc << from) | v) & 0xffff; bits += from; while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv); } }
    if (pad) { if (bits) out.push((acc << (to - bits)) & maxv); }
    else if (bits >= from || ((acc << (to - bits)) & maxv)) return null;
    return out;
  }
  function bech32Enc(hrp, version, program) {
    const data = [version].concat(convertBits(program, 8, 5, true));
    const chk = polymod(hrpExpand(hrp).concat(data, [0, 0, 0, 0, 0, 0])) ^ 1;
    let s = hrp + '1'; data.forEach(d => s += BCS[d]);
    for (let p = 0; p < 6; p++) s += BCS[(chk >>> (5 * (5 - p))) & 31];
    return s;
  }
  function bech32Dec(addr) {
    const pos = addr.lastIndexOf('1');
    if (pos < 1 || pos + 7 > addr.length) throw new Error('Alamat bech32 tidak valid.');
    const hrp = addr.slice(0, pos), data = [...addr.slice(pos + 1)].map(c => { const v = BCS.indexOf(c); if (v < 0) throw new Error('Karakter bech32 tidak valid.'); return v; });
    if (polymod(hrpExpand(hrp).concat(data)) !== 1) throw new Error('Checksum alamat bech32 salah.');
    const prog = convertBits(data.slice(1, -6), 5, 8, false);
    if (!prog) throw new Error('Program bech32 tidak valid.');
    return { hrp, version: data[0], program: Uint8Array.from(prog) };
  }

  // ---------- wallet / alamat ----------
  function wifEncode(priv32) { return b58checkEnc(concat(Uint8Array.of(PARAMS.wif), priv32, Uint8Array.of(1))); }
  function wifDecode(wif) {
    const p = b58checkDec(wif.trim());
    if (p[0] !== PARAMS.wif) throw new Error('Prefix WIF bukan Nusacoin (0x57).');
    if (p.length !== 34 || p[33] !== 1) throw new Error('Hanya WIF kompresi yang didukung.');
    return p.slice(1, 33);
  }
  function addressFromPub(pub, type) {
    const h = hash160(pub);
    return type === 'p2pkh' ? b58checkEnc(concat(Uint8Array.of(PARAMS.pubKeyHash), h)) : bech32Enc(PARAMS.bech32, 0, h);
  }
  function randomPrivKey() {
    for (;;) { const k = crypto.getRandomValues(new Uint8Array(32)), n = b2i(k); if (n > 0n && n < N) return k; }
  }
  function walletFromWif(wif, type = 'bech32') {
    const priv = wifDecode(wif), pub = pubkeyFromPriv(priv);
    return { wif: wif.trim(), pubkey: bytesToHex(pub), address: addressFromPub(pub, type), type };
  }

  function addressToScriptHex(address) {
    const a = (address || '').trim();
    if (!a) throw new Error('Alamat kosong.');
    const lower = a.toLowerCase();
    if (lower.startsWith(PARAMS.bech32 + '1')) {
      if (a !== lower && a !== a.toUpperCase()) throw new Error('Alamat bech32 tidak valid (huruf campuran).');
      const { hrp, version, program } = bech32Dec(lower);
      if (hrp !== PARAMS.bech32) throw new Error('Prefix bech32 bukan Nusacoin.');
      if (version !== 0 || program.length !== 20) throw new Error('Hanya alamat bech32 v0 (20 byte) yang didukung.');
      return '0014' + bytesToHex(program);
    }
    let p; try { p = b58checkDec(a); } catch (e) { throw new Error('Alamat tidak valid (bukan Base58/Bech32).'); }
    if (p.length !== 21) throw new Error('Panjang alamat tidak valid.');
    const h = bytesToHex(p.slice(1));
    if (p[0] === PARAMS.pubKeyHash) return '76a914' + h + '88ac';
    if (p[0] === PARAMS.scriptHash) return 'a914' + h + '87';
    throw new Error('Prefix alamat bukan Nusacoin.');
  }

  // ---------- transaksi ----------
  const leHex = (n, bytes) => bytesToHex(i2b(BigInt(n), bytes).reverse());
  const varInt = n => n < 0xfd ? leHex(n, 1) : n <= 0xffff ? 'fd' + leHex(n, 2) : 'fe' + leHex(n, 4);
  const sha256dHex = hex => bytesToHex(sha256d(hexToBytes(hex)));

  function buildSignedTransaction(utxos, outputs, wif, ownScript) {
    const priv = wifDecode(wif), pubHex = bytesToHex(pubkeyFromPriv(priv));
    const pkh = bytesToHex(hash160(hexToBytes(pubHex)));
    const isSegwit = ownScript === '0014' + pkh, isLegacy = ownScript === '76a914' + pkh + '88ac';
    if (!isSegwit && !isLegacy) throw new Error('Private key tidak cocok dengan alamat wallet (P2SH tidak bisa dibelanjakan).');

    const VERSION = '01000000', LOCKTIME = '00000000', SEQ = 'ffffffff', SIGHASH_ALL = '01000000';
    const outsHex = outputs.map(o => leHex(o.value, 8) + varInt(o.script.length / 2) + o.script).join('');
    const outsSer = varInt(outputs.length) + outsHex;
    const ins = utxos.map(u => ({ prev: reverseHex(u.txid) + leHex(u.vout, 4), value: u.value }));
    const signDigest = hex => { const { r, s } = signHash(priv, sha256d(hexToBytes(hex))); return derEncode(r, s) + '01'; };

    let inputsSer = varInt(ins.length), witness = '';
    if (isLegacy) {
      ins.forEach((inp, i) => {
        let pre = VERSION + varInt(ins.length);
        ins.forEach((o, j) => { pre += o.prev + (i === j ? varInt(ownScript.length / 2) + ownScript : '00') + SEQ; });
        pre += outsSer + LOCKTIME + SIGHASH_ALL;
        const sig = signDigest(pre);
        const scriptSig = varInt(sig.length / 2) + sig + varInt(pubHex.length / 2) + pubHex;
        inputsSer += inp.prev + varInt(scriptSig.length / 2) + scriptSig + SEQ;
      });
    } else {
      const hashPrevouts = sha256dHex(ins.map(x => x.prev).join(''));
      const hashSequence = sha256dHex(ins.map(() => SEQ).join(''));
      const hashOutputs = sha256dHex(outsHex);
      const scriptCode = '1976a914' + pkh + '88ac';
      ins.forEach(inp => {
        const pre = VERSION + hashPrevouts + hashSequence + inp.prev + scriptCode + leHex(inp.value, 8) + SEQ + hashOutputs + LOCKTIME + SIGHASH_ALL;
        const sig = signDigest(pre);
        witness += '02' + varInt(sig.length / 2) + sig + varInt(pubHex.length / 2) + pubHex;
        inputsSer += inp.prev + '00' + SEQ;
      });
    }
    const legacySer = VERSION + inputsSer + outsSer + LOCKTIME;
    const raw = isSegwit ? VERSION + '0001' + inputsSer + outsSer + witness + LOCKTIME : legacySer;
    return { raw, txid: reverseHex(sha256dHex(legacySer)) };
  }

  // ---------- sign message (compact recoverable, base64) ----------
  function signMessage(wif, message) {
    const priv = wifDecode(wif);
    const vs = s => { const b = utf8(s); return concat(hexToBytes(varInt(b.length)), b); };
    const digest = sha256d(concat(vs(MSG_MAGIC), vs(message)));
    const { r, s, recid } = signHash(priv, digest);
    return { signature: b64(concat(Uint8Array.of(27 + recid + 4), i2b(r), i2b(s))), publicKey: bytesToHex(pubkeyFromPriv(priv)), magic: MSG_MAGIC };
  }

  // ---------- enkripsi vault (WebCrypto: PBKDF2 + AES-GCM) ----------
  async function deriveKey(password, salt) {
    const base = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptSecret(password, plaintext) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(password, salt), utf8(plaintext)));
    return { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function decryptSecret(password, vault) {
    try {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, await deriveKey(password, unb64(vault.salt)), unb64(vault.ct));
      return new TextDecoder().decode(pt);
    } catch (e) { throw new Error('Password salah.'); }
  }

  // ---------- API (explorer Iquidus + API Nusacoin) ----------
  const trimUrl = u => (u || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  async function getJson(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

  async function fetchBalance(explorer, addr) {
    const r = await fetch(`${trimUrl(explorer)}/ext/getbalance/${addr}`);
    if (!r.ok) throw new Error('Gagal mengambil saldo (HTTP ' + r.status + ')');
    const v = parseFloat(await r.text());
    return isNaN(v) ? 0 : v;
  }

  async function fetchHistory(explorer, addr, limit = 10) {
    const base = trimUrl(explorer);
    const raw = await getJson(`${base}/ext/getaddresstxs/${addr}/0/${limit}`);
    const arr = Array.isArray(raw) ? raw : (raw.data || raw.records || []);
    return arr.slice(0, limit).map(i => ({
      txid: i.txid || (typeof i === 'string' ? i : ''),
      amount: i.amount !== undefined ? Number(i.amount) / 1e8 : (i.balance !== undefined ? Number(i.balance) : null),
      time: i.timestamp || i.time || null
    })).filter(i => i.txid);
  }

  function normalizeUtxos(data, ownAddr) {
    let arr = data;
    if (data && !Array.isArray(data)) {
      arr = data.result ?? data.utxos ?? data.unspent ?? data.unspents ?? data.data ?? data.unspent_outputs ?? null;
      if (arr && !Array.isArray(arr)) arr = arr.utxos ?? arr.unspents ?? arr.unspent ?? null;
    }
    if (!Array.isArray(arr)) return null;
    return arr.map(u => {
      if (ownAddr && typeof u.address === 'string' && u.address !== ownAddr) return { txid: null };
      const txid = u.txid || u.tx_hash || u.hash || u.txHash;
      const vout = [u.vout, u.n, u.tx_output_n, u.tx_pos, u.index, u.outputIndex].find(v => v !== undefined);
      let value;
      if (u.satoshis !== undefined) value = Number(u.satoshis);
      else if (u.amount !== undefined) value = Math.round(Number(u.amount) * 1e8);
      else if (u.value !== undefined) value = Number.isInteger(Number(u.value)) ? Number(u.value) : Math.round(Number(u.value) * 1e8);
      let confirmed = true;
      if (u.confirmations !== undefined) confirmed = Number(u.confirmations) > 0;
      else if (u.confirmed !== undefined) confirmed = !!u.confirmed;
      return { txid, vout: Number(vout), value, confirmed };
    }).filter(u => typeof u.txid === 'string' && /^[0-9a-fA-F]{64}$/.test(u.txid) && Number.isInteger(u.vout) && Number.isFinite(u.value) && u.value > 0);
  }

  async function utxosFromExplorer(explorer, addr) {
    const base = trimUrl(explorer);
    const raw = await getJson(`${base}/ext/getaddresstxs/${addr}/0/200`);
    const arr = Array.isArray(raw) ? raw : (raw.data || raw.records || []);
    const txids = [...new Set(arr.map(i => i.txid || (typeof i === 'string' ? i : null)).filter(Boolean))];
    if (!txids.length) return [];
    const decoded = await Promise.all(txids.map(t => getJson(`${base}/api/getrawtransaction?txid=${t}&decrypt=1`)));
    const spent = new Set();
    decoded.forEach(t => (t.vin || []).forEach(v => { if (v.txid !== undefined) spent.add(v.txid + ':' + v.vout); }));
    const out = [];
    decoded.forEach(t => (t.vout || []).forEach(o => {
      const spk = o.scriptPubKey || {}, addrs = spk.addresses || (spk.address ? [spk.address] : []);
      if (addrs.includes(addr) && !spent.has(t.txid + ':' + o.n)) out.push({ txid: t.txid, vout: o.n, value: Math.round(Number(o.value) * 1e8), confirmed: true });
    }));
    return out.filter(u => u.value > 0);
  }

  // Ambil UTXO; total harus cocok dengan saldo explorer supaya data salah tidak dipakai.
  async function fetchUtxos(cfg, addr, balance) {
    const api = trimUrl(cfg.api), enc = encodeURIComponent(addr), notes = [];
    const ok = list => { if (!(balance >= 0)) return true; const tot = list.filter(u => u.confirmed !== false).reduce((s, u) => s + u.value, 0) / 1e8; return Math.abs(tot - balance) <= Math.max(0.00001, balance * 0.001); };
    const sources = [];
    if (cfg.utxoTemplate) sources.push(async () => normalizeUtxos(await getJson(cfg.utxoTemplate.split('{address}').join(enc)), addr));
    ['utxos', 'unspent', 'utxo', 'getutxo'].forEach(p => sources.push(async () => normalizeUtxos(await getJson(`${api}/${p}/${enc}`), addr)));
    sources.push(() => utxosFromExplorer(cfg.explorer, addr));
    for (const fn of sources) {
      try { const l = await fn(); if (l && ok(l)) return l; notes.push('format/saldo tidak cocok'); } catch (e) { notes.push(e.message); }
    }
    throw new Error('Tidak ada sumber UTXO yang valid (' + notes.slice(-2).join('; ') + ').');
  }

  async function broadcast(cfg, rawHex, expectedTxid) {
    const url = `${trimUrl(cfg.api)}/broadcast`, enc = encodeURIComponent(rawHex);
    const attempts = [
      () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'raw=' + enc }),
      () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: rawHex }) }),
      () => fetch(`${url}?raw=${enc}`, { method: 'POST' })
    ];
    const formatErr = /expected type|got null|got undefined|param|argument|no raw/i, notes = [];
    for (const a of attempts) {
      let res; try { res = await a(); } catch (e) { notes.push(e.message); continue; }
      const text = await res.text(); let j = null; try { j = JSON.parse(text); } catch (e) {}
      if (j && typeof j === 'object' && ('result' in j || 'error' in j)) {
        if (j.error) {
          const msg = typeof j.error === 'object' ? (j.error.message || JSON.stringify(j.error)) : String(j.error);
          if (formatErr.test(msg)) { notes.push(msg); continue; }
          if (expectedTxid && /already|known|duplicate/i.test(msg) && !/conflict|missing|spent/i.test(msg)) return expectedTxid;
          throw new Error(msg);
        }
        if (j.result) return String(j.result);
      }
      notes.push(`HTTP ${res.status} ${text.slice(0, 80)}`);
    }
    throw new Error('Broadcast gagal: ' + notes.join(' | '));
  }

  // Bangun & tandatangani transaksi (belum dikirim). amountNux & feeNux dalam NUX.
  async function prepareSend(cfg, wallet, toAddr, amountNux, feeNux) {
    const amount = Math.round(Number(amountNux) * 1e8), fee = Math.round(Number(feeNux) * 1e8);
    if (!(amount >= DUST_SATS)) throw new Error('Jumlah terlalu kecil (di bawah batas dust).');
    if (!(fee >= 0)) throw new Error('Fee tidak valid.');
    const toScript = addressToScriptHex(toAddr), ownScript = addressToScriptHex(wallet.address);
    const balance = await fetchBalance(cfg.explorer, wallet.address);
    const pool = (await fetchUtxos(cfg, wallet.address, balance)).filter(u => u.confirmed !== false).sort((a, b) => b.value - a.value);
    if (!pool.length) throw new Error('Tidak ada UTXO terkonfirmasi yang bisa dibelanjakan.');
    const sel = []; let acc = 0;
    for (const u of pool) { sel.push(u); acc += u.value; if (acc >= amount + fee) break; }
    if (acc < amount + fee) throw new Error(`Saldo tidak cukup untuk ${amountNux} NUX + fee ${feeNux} NUX.`);
    const outputs = [{ value: amount, script: toScript }];
    const change = acc - amount - fee; let realFee = fee;
    if (change >= DUST_SATS) outputs.push({ value: change, script: ownScript }); else realFee += change;
    const { raw, txid } = buildSignedTransaction(sel, outputs, wallet.wif, ownScript);
    return { raw, txid, fee: realFee / 1e8, inputs: sel.length };
  }

  // Bangun & tandatangani transaksi OP_RETURN (data on-chain, nilai 0). data = Uint8Array, maks 80 byte (batas relay standar).
  const MAX_OPRETURN = 80;
  function opReturnScriptHex(data) {
    if (!data.length) throw new Error('Data kosong.');
    if (data.length > MAX_OPRETURN) throw new Error(`Data ${data.length} byte melebihi batas OP_RETURN (${MAX_OPRETURN} byte).`);
    const push = data.length <= 75 ? leHex(data.length, 1) : '4c' + leHex(data.length, 1);
    return '6a' + push + bytesToHex(data);
  }
  async function prepareData(cfg, wallet, data, feeNux) {
    const fee = Math.round(Number(feeNux) * 1e8);
    if (!(fee >= 0)) throw new Error('Fee tidak valid.');
    const ownScript = addressToScriptHex(wallet.address);
    const balance = await fetchBalance(cfg.explorer, wallet.address);
    const pool = (await fetchUtxos(cfg, wallet.address, balance)).filter(u => u.confirmed !== false).sort((a, b) => b.value - a.value);
    if (!pool.length) throw new Error('Tidak ada UTXO terkonfirmasi yang bisa dibelanjakan.');
    const sel = []; let acc = 0;
    for (const u of pool) { sel.push(u); acc += u.value; if (acc >= fee + DUST_SATS) break; }
    if (acc < fee + DUST_SATS) throw new Error(`Saldo tidak cukup untuk fee ${feeNux} NUX.`);
    const outputs = [{ value: 0, script: opReturnScriptHex(data) }];
    const change = acc - fee; let realFee = fee;
    if (change >= DUST_SATS) outputs.push({ value: change, script: ownScript }); else realFee += change;
    const { raw, txid } = buildSignedTransaction(sel, outputs, wallet.wif, ownScript);
    return { raw, txid, fee: realFee / 1e8, inputs: sel.length, bytes: data.length };
  }

  // ---------- tanda tangan transaksi dari DApp ----------
  // DApp mengirim daftar input (hanya txid:vout) dan output. Nilai input TIDAK dipercaya dari DApp:
  // diambil dari UTXO milik wallet sendiri, sehingga fee yang ditampilkan selalu benar.
  const MAX_SIGN_FEE_SATS = 1e8; // tolak jika fee > 1 NUX
  function scriptToAddress(h) {
    h = String(h || '').toLowerCase(); let m;
    if ((m = /^76a914([0-9a-f]{40})88ac$/.exec(h))) return b58checkEnc(concat(Uint8Array.of(PARAMS.pubKeyHash), hexToBytes(m[1])));
    if ((m = /^a914([0-9a-f]{40})87$/.exec(h))) return b58checkEnc(concat(Uint8Array.of(PARAMS.scriptHash), hexToBytes(m[1])));
    if ((m = /^0014([0-9a-f]{40})$/.exec(h))) return bech32Enc(PARAMS.bech32, 0, hexToBytes(m[1]));
    if ((m = /^0020([0-9a-f]{64})$/.exec(h))) return bech32Enc(PARAMS.bech32, 0, hexToBytes(m[1]));
    return null;
  }
  function opReturnData(h) { // -> Uint8Array | null
    h = String(h || '').toLowerCase(); if (!h.startsWith('6a')) return null;
    const b = hexToBytes(h); let i = 1, len;
    if (b[i] <= 0x4b) { len = b[i]; i += 1; } else if (b[i] === 0x4c) { len = b[i + 1]; i += 2; } else return null;
    return b.slice(i, i + len);
  }
  async function prepareSign(cfg, wallet, inputs, outputs) {
    if (!Array.isArray(inputs) || !inputs.length || inputs.length > 800) throw new Error('Daftar input transaksi tidak valid.');
    if (!Array.isArray(outputs) || !outputs.length || outputs.length > 800) throw new Error('Daftar output transaksi tidak valid.');
    const ownScript = addressToScriptHex(wallet.address), outs = []; let nOp = 0, totalOut = 0;
    for (const o of outputs) {
      const script = String((o && o.script) || '').toLowerCase(), value = Number(o && o.value);
      if (!/^([0-9a-f]{2})+$/.test(script)) throw new Error('Script output tidak valid.');
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Nilai output tidak valid.');
      if (script.startsWith('6a')) {
        if (++nOp > 1) throw new Error('Maksimal satu output OP_RETURN.');
        if (value !== 0) throw new Error('Output OP_RETURN harus bernilai 0.');
        if (script.length / 2 > 83 || !opReturnData(script)) throw new Error('Output OP_RETURN tidak valid (maks 80 byte data).');
      } else {
        if (!scriptToAddress(script)) throw new Error('Jenis output tidak didukung.');
        if (value < DUST_SATS) throw new Error('Ada output di bawah batas dust.');
      }
      totalOut += value; outs.push({ value, script });
    }
    const balance = await fetchBalance(cfg.explorer, wallet.address);
    const pool = await fetchUtxos(cfg, wallet.address, balance);
    const byKey = new Map(pool.map(u => [u.txid.toLowerCase() + ':' + u.vout, u]));
    const sel = [], seen = new Set(); let totalIn = 0;
    for (const i of inputs) {
      const txid = String((i && i.txid) || '').toLowerCase(), vout = Number(i && i.vout), k = txid + ':' + vout;
      if (seen.has(k)) throw new Error('Input ganda dalam transaksi.'); seen.add(k);
      const u = byKey.get(k);
      if (!u) throw new Error('Input ' + txid.slice(0, 10) + '…:' + vout + ' tidak ditemukan di UTXO wallet (belum terkonfirmasi atau sudah terpakai). Tunggu konfirmasi lalu ulangi.');
      sel.push(u); totalIn += u.value;
    }
    const fee = totalIn - totalOut;
    if (fee < 0) throw new Error('Total output melebihi total input.');
    if (fee > MAX_SIGN_FEE_SATS) throw new Error('Fee ' + (fee / 1e8) + ' NUX terlalu besar, ditolak demi keamanan.');
    const { raw, txid } = buildSignedTransaction(sel, outs, wallet.wif, ownScript);
    return { raw, txid, fee: fee / 1e8, totalIn, totalOut, outputs: outs, inputs: sel.length };
  }

  root.NusaCore = {
    scriptToAddress, opReturnData, prepareSign,
    opReturnScriptHex, prepareData, MAX_OPRETURN,
    PARAMS, MSG_MAGIC, DUST_SATS,
    sha256, sha256d, ripemd160, hash160, hmacSha256, hexToBytes, bytesToHex,
    pubkeyFromPriv, signHash, derEncode, wifEncode, wifDecode, addressFromPub, randomPrivKey, walletFromWif,
    addressToScriptHex, buildSignedTransaction, signMessage, encryptSecret, decryptSecret,
    fetchBalance, fetchHistory, fetchUtxos, broadcast, prepareSend, trimUrl, normalizeUtxos
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NusaCore;
})(typeof self !== 'undefined' ? self : globalThis);
