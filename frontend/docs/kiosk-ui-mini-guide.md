# Kiosk UI Mini Guide

Panduan ringkas ini menjaga konsistensi visual halaman kiosk antrean di frontend.

## Scope

- Berlaku untuk layar petugas/lobby pada route pengambilan nomor.
- Fokus: kecepatan interaksi, keterbacaan jarak menengah, dan minim distraksi.

## Layout Rules

- Mobile dan tablet portrait: gunakan satu kolom utama.
- Tablet landscape dan desktop: gunakan split layout 3:2.
- CTA utama:
  - Mobile/portrait: sticky di bawah.
  - Landscape/desktop: statis di panel kanan.
- Jarak antar card utama: 16px.
- Radius card utama: 24px (rounded-3xl).

## Visual Hierarchy

- Header: hanya aksi operasional yang penting (profil, riwayat).
- Hero card: identitas layanan dan instruksi singkat.
- Service card: area paling dominan setelah hero.
- Ringkasan pilihan: panel sekunder di sisi kanan (landscape).
- Printer status: informatif, tidak lebih dominan dari CTA.

## Color Semantics

- Brand utama: primary PLN (`text-primary`, `bg-primary`).
- Service cues:
  - PLN: emerald
  - CS: cyan
  - CC: amber
- Success info: gunakan base putih + aksen service.
- Warning printer: amber.
- Ready printer: emerald.

## Typography & Copy

- Judul utama: tegas, singkat, action-oriented.
- Instruksi: maksimal 1 kalimat per blok.
- Gunakan pola langkah:
  - Langkah 1 dari 2: Pilih layanan
  - Langkah 2 dari 2: Konfirmasi cetak
- Label tombol harus menyatakan hasil aksi:
  - "Ambil & Cetak Tiket"
  - "Layani Pelanggan Berikutnya"

## Touch Targets

- Tinggi minimum tombol utama: 56px.
- Jarak antar elemen interaktif: minimal 8px.
- Gunakan state disabled yang kontras tapi tetap terbaca.

## Do / Don't

- Do:
  - Prioritaskan kartu layanan dan CTA.
  - Pertahankan bahasa yang ringkas dan operasional.
  - Pertahankan fallback status printer.
- Don't:
  - Menambah elemen dekoratif yang bersaing dengan CTA.
  - Menaruh teks panjang pada area pilihan layanan.
  - Mengubah urutan alur tanpa kebutuhan operasional.

## Implementation Notes

- Breakpoint split-layout disarankan mulai `lg` agar tablet portrait tetap lega.
- Simpan semua copy penting di komponen halaman agar mudah audit UX.
- Jika menambah halaman kiosk baru, tiru urutan blok:
  1. Header operasional
  2. Hero/instruksi
  3. Pilihan utama
  4. Info sekunder
  5. CTA utama
