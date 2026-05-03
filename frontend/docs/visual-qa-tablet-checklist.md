# Visual QA Checklist - Tablet

Checklist ini dipakai untuk review cepat sebelum deploy pada layar kiosk dan display.

Referensi visual utama: docs/kiosk-ui-mini-guide.md.

## Setup Uji

- Device A: Tablet portrait (contoh 800x1280).
- Device B: Tablet landscape (contoh 1280x800).
- Browser: Chrome latest.
- Zoom: 100%.
- Mode: tanpa dark mode paksa.

## Global Pass Criteria

- Tidak ada elemen yang overlap.
- Tidak ada teks terpotong pada label utama.
- Tidak ada tombol/aksi penting di luar viewport.
- Kontras teks terhadap background tetap terbaca.
- Status visual konsisten dengan state data.

## A. Halaman Ambil Nomor (/ambil)

### A1. Tablet Portrait

- [ ] Layout tetap satu kolom utama.
- [ ] Hero card tampil penuh dan tidak terpotong.
- [ ] Kartu layanan tampil rapi dengan jarak antar card konsisten.
- [ ] Warna service cue konsisten: PLN=emerald, CS=cyan, CC=amber.
- [ ] Input nama opsional mudah di-tap dan placeholder terbaca.
- [ ] Panel status printer tetap terbaca tanpa menutupi konten utama.
- [ ] CTA utama sticky di bawah, selalu terlihat.
- [ ] CTA disabled state jelas saat belum memilih layanan.

### A2. Tablet Landscape

- [ ] Layout berubah ke split 3:2.
- [ ] Kolom kiri (hero + layanan) dan kolom kanan (ringkasan + printer + CTA) seimbang.
- [ ] CTA menjadi statis di panel kanan (tidak sticky).
- [ ] Ringkasan pilihan menampilkan loket aktif dengan benar.
- [ ] Tidak ada loncatan layout saat memilih layanan.

### A3. Modal Konfirmasi

- [ ] Overlay menutup area belakang secara jelas.
- [ ] Label langkah "Langkah 2 dari 2" tampil.
- [ ] Nama loket pada modal sesuai pilihan di halaman utama.
- [ ] Tombol primer dan sekunder mudah dibedakan.
- [ ] Saat loading, tombol primer menampilkan state memproses.

### A4. Success State

- [ ] Nomor antrean menjadi fokus visual utama.
- [ ] Informasi waktu cetak tampil rapi.
- [ ] Tombol "Layani Pelanggan Berikutnya" lebih dominan dari "Cetak Ulang".
- [ ] Countdown kembali otomatis berjalan stabil.

## B. Halaman Display (/)

### B1. Tablet Portrait

- [ ] Header tidak menutupi konten utama.
- [ ] Waktu tetap terbaca pada ukuran teks kecil.
- [ ] Counter cards tampil sebagai grid 3 kolom (atau setara) tanpa overflow.
- [ ] Angka antrean tetap terbaca jelas dari jarak menengah.
- [ ] Status chip (Memanggil/Dilayani/Menunggu) terbaca jelas.
- [ ] Panel video tidak overlap dengan footer informasi.

### B2. Tablet Landscape

- [ ] Layout berubah ke split 2:3 (counter : video).
- [ ] Counter cards memiliki border radius, shadow, dan aksen yang konsisten.
- [ ] Video panel tampil penuh dalam card, tidak stretch berlebih.
- [ ] Tombol "Aktifkan Suara Video" terlihat namun tidak mengganggu informasi utama.
- [ ] Running text footer bergerak mulus dan tidak clipping.

### B3. State Dinamis Display

- [ ] Saat state "Memanggil", card terkait mendapat highlight visual yang konsisten.
- [ ] Saat state "Dilayani", warna status berubah sesuai semantik.
- [ ] Saat tidak ada nomor, state default tetap rapi (tidak kosong/pecah).
- [ ] Transisi visual antar state tidak menyebabkan flicker signifikan.

## C. Cross-Page Consistency

- [ ] Brand primary biru konsisten antar halaman.
- [ ] Radius card utama konsisten (rounded-3xl pada blok utama).
- [ ] Hierarki tipografi konsisten: judul > konten > caption.
- [ ] Bahasa copy tetap ringkas dan operasional.

## D. Release Gate

- [ ] Semua item critical di A dan B lulus.
- [ ] Tidak ada bug visual blocker pada portrait maupun landscape.
- [ ] Screenshot final portrait dan landscape tersimpan untuk arsip QA.

## Catatan Reviewer

- Device/OS:
- Browser version:
- Build hash:
- Temuan:
- Keputusan: PASS / HOLD
