NUSA WALLET (PWA)

1. Unggah SEMUA isi folder ini (index.html, app.js, app.css, sw.js, manifest.json,
   nux-bridge.js, folder lib/ dan icons/) ke satu repo GitHub, lalu aktifkan GitHub Pages.
2. Buka https://NAMA.github.io/REPO/ di Chrome Android -> menu ⋮ -> Instal aplikasi.

Menghubungkan halaman tools ke wallet (tab Jelajah):
Tambahkan SATU baris ini di <head> halaman tools, sebelum script lain:

  <script src="https://NAMA.github.io/REPO/nux-bridge.js"></script>

Skrip ini hanya aktif saat halaman dibuka di dalam aplikasi Nusa Wallet dan belum ada window.nux
(ekstensi Nux Connect tetap berjalan seperti biasa).

Setiap memperbarui file, naikkan CACHE_VERSION di sw.js (mis. nusawallet-v2).

Pembaruan v3:
- Beranda baru: Total saldo, Total diterima, tombol mata (sembunyikan saldo), kartu Notifikasi, tombol Kirim/Terima, alamat, lalu riwayat transaksi.
- Pengaturan: toggle Bahasa ID/EN dan Tema Terang/Gelap (tersimpan di perangkat).
- Harga NUX (Rp) opsional di Pengaturan untuk menampilkan perkiraan nilai Rupiah.
- Naikkan CACHE_VERSION di sw.js sudah dilakukan (nusawallet-v3).

Pembaruan v4: bagian saldo tertunda dihapus; halaman Terima menampilkan QR code alamat (lib/qrcode.js, offline, MIT). CACHE_VERSION: nusawallet-v4.
