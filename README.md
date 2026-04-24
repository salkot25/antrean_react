# 🏢 Sistem Antrean Digital PLN (QMS PLN)

Sistem antrian digital berbasis web untuk PLN ULP Salatiga. Mendukung 3 loket layanan, pengumuman suara otomatis (TTS), tampilan TV Display real-time, cetak tiket thermal, dan konfigurasi terpusat via Google Spreadsheet.

---

## 📸 Tampilan

| Kiosk (Ambil Tiket) | Admin Dashboard | TV Display |
|---|---|---|
| Mobile-first form pilih layanan | Manajemen antrian per loket | Layar informasi antrian + video |

---

## ✨ Fitur Utama

### 🎫 Kiosk (Ambil Tiket)
- Pilih salah satu dari 3 layanan: **Customer Service**, **PLN Mobile Experience**, **Customer Care**
- Input nama pelanggan (opsional)
- Popup konfirmasi sebelum mencetak tiket
- Print tiket otomatis ke printer thermal Bluetooth (58mm)
- Format tiket thermal: nomor besar dalam kotak, nama loket, timestamp, pesan, footer
- Halaman sukses dengan countdown auto-redirect (5 detik)

### 📺 TV Display
- Menampilkan status 3 loket secara real-time (polling setiap 3 detik)
- **3 status per loket:**
  - 🔵 **Menunggu** — belum ada panggilan
  - 🟡 **Memanggil** — aktif memanggil (30 detik, animasi pulse)
  - 🟢 **Sedang Dilayani** — setelah durasi panggilan selesai
- Pemutar video YouTube (video tunggal atau playlist, loop otomatis)
- Ticker berjalan di footer
- **Audio Ducking:** volume video otomatis turun saat TTS berbicara, lalu kembali normal

### 👨‍💼 Admin Dashboard
- Memanggil nomor antrian berikutnya per layanan
- Loket ditentukan otomatis berdasarkan jenis layanan
- Panggil Ulang nomor terakhir
- Tabel daftar antrian menunggu (dengan nama pelanggan)
- Refresh manual dan auto setiap 5 detik

### ⚙️ Service Config
- **TV Display:** URL video/playlist YouTube, volume normal, volume saat memanggil
- **Printer:** toggle auto-print
- **Text-to-Speech:** pilih suara (dropdown berdasarkan suara browser tersedia), slider intonasi (pitch), slider kecepatan (rate), tombol test suara

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  React + Vite + TypeScript + Tailwind CSS        │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Kiosk   │ │  Admin   │ │   TV Display     │ │
│  │ App.tsx  │ │ Page.tsx │ │  DisplayPage.tsx │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌───────────────────────────────────────────┐   │
│  │        src/utils/tts.ts                   │   │
│  │   Centralized TTS (Web Speech API)        │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │        src/api.ts                         │   │
│  │   HTTP Client → Google Apps Script        │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
              │ HTTP GET/POST
              ▼
┌─────────────────────────────────────────────────┐
│           BACKEND (Google Apps Script)           │
│                 Code.gs                          │
│                                                  │
│  doGet()  → list, display, get_config            │
│  doPost() → create, call, skip, set_config       │
│             init_sheets                          │
└─────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│           Google Spreadsheet                     │
│                                                  │
│  📄 queues   → id, number, service,              │
│                customer_name, status,            │
│                created_at, called_at,            │
│                counter, date                     │
│                                                  │
│  📄 counters → id, name, service,               │
│                last_called_number, last_called_at│
│                                                  │
│  📄 settings → key, value, description          │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Font | Inter (Google Fonts) |
| Backend | Google Apps Script (GAS) |
| Database | Google Spreadsheet |
| TTS | Web Speech API (browser native) |
| Video | YouTube IFrame API (postMessage) |
| Print | Browser Print Dialog (CSS @media print) |

---

## 📁 Struktur Folder

```
antrean/
├── frontend/
│   └── src/
│       ├── App.tsx                  # Halaman Kiosk (ambil tiket)
│       ├── main.tsx                 # Entry point + routing
│       ├── config.ts                # GAS_WEB_APP_URL configuration
│       ├── api.ts                   # HTTP client ke Google Apps Script
│       ├── utils/
│       │   └── tts.ts               # Centralized Text-to-Speech utility
│       ├── pages/
│       │   ├── AdminPage.tsx        # Halaman admin panggil antrian
│       │   ├── DisplayPage.tsx      # Halaman TV Display
│       │   └── ServiceConfigPage.tsx# Halaman konfigurasi
│       └── index.css                # Global styles
├── backend/
│   └── Code.gs                      # Google Apps Script backend
└── README.md
```

---

## 🚀 Setup & Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/salkot25/antrean_react.git
cd antrean_react
```

### 2. Setup Google Apps Script (Backend)

1. Buka [Google Spreadsheet](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama sheet tab: `queues`, `counters`, `settings`
3. Buka **Extensions → Apps Script**
4. Hapus kode default, paste seluruh isi `backend/Code.gs`
5. Klik **Run → `handleInitSheets`** (jalankan sekali untuk buat header + seed settings)
6. Klik **Deploy → New Deployment**:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy **Web App URL** yang diberikan

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Edit `src/config.ts`:
```ts
export const GAS_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

Jalankan development server:
```bash
npm run dev
```

---

## 🗂️ Routing

| Path | Halaman | Deskripsi |
|---|---|---|
| `/` | Kiosk | Pelanggan ambil nomor tiket |
| `/admin` | Admin Dashboard | Petugas memanggil antrian |
| `/display` | TV Display | Layar informasi untuk ruang tunggu |
| `/admin/config` | Service Config | Konfigurasi sistem |

---

## 🖨️ Format Tiket Thermal

Tiket dicetak ke printer thermal 58mm dengan format:

```
================================
       NOMOR ANTREAN
================================
┌──────────────────────────────┐
│          CS-016              │
└──────────────────────────────┘
  LOKET: Customer Service
  24/04/2026 16:35:47
--------------------------------
  Mohon menunggu hingga nomor
  Anda dipanggil
  Menuju: Customer Service
  Pantau layar display
  Atas nama: Budi Santoso
                  Terima kasih
================================
```

**Pengaturan printer:** Di dialog print browser, set:
- Paper size: Custom → 58mm × Auto
- Margins: None

---

## 🔊 Text-to-Speech (TTS)

TTS menggunakan **Web Speech API** browser. Format bacaan:

```
"Nomor antrian, C S, nol satu enam. 
 Silakan menuju ke, Loket Customer Service"
```

Konfigurasi yang tersedia:
| Setting | Default | Range |
|---|---|---|
| Voice | Otomatis (bahasa Indonesia) | Semua suara tersedia di browser |
| Pitch (Intonasi) | 1.0 | 0.0 – 2.0 |
| Rate (Kecepatan) | 0.8 | 0.5 – 2.0 |

---

## 📊 Struktur Google Spreadsheet

### Sheet: `queues`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID | Auto-generated unique ID |
| number | String | Nomor antrian (misal: CS-016) |
| service | String | Kode layanan: CS / PLN / CC |
| customer_name | String | Nama pelanggan (opsional) |
| status | String | waiting / called / skipped |
| created_at | DateTime | Waktu ambil tiket |
| called_at | DateTime | Waktu dipanggil |
| counter | String | Nama loket yang memanggil |
| date | String | Tanggal (yyyy-MM-dd) |

### Sheet: `counters`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID | Auto-generated |
| name | String | Nama loket (misal: Loket Customer Service) |
| service | String | Kode layanan |
| last_called_number | String | Nomor terakhir dipanggil |
| last_called_at | DateTime | Waktu panggilan terakhir |

### Sheet: `settings`
| Key | Default | Keterangan |
|---|---|---|
| youtubeUrl | (URL default) | URL video/playlist YouTube |
| autoPrint | true | Auto print tiket di kiosk |
| ttsVoiceUri | (kosong) | Voice URI untuk TTS |
| ttsPitch | 1 | Intonasi suara TTS |
| ttsRate | 0.8 | Kecepatan bicara TTS |
| videoVolume | 100 | Volume video normal (0-100) |
| videoVolumeDucked | 15 | Volume video saat TTS berbicara (0-50) |

---

## 🔧 API Reference (Google Apps Script)

### GET Endpoints

| `?action=` | Parameter | Response |
|---|---|---|
| `list` | `service` (opsional) | Array antrian hari ini status `waiting` |
| `display` | — | Object `{ "Loket X": { number, service, called_at } }` |
| `get_config` | — | Object semua setting |
| `init_sheets` | — | Inisialisasi header semua sheet |

### POST Endpoints (body JSON)

| `action` | Body Fields | Response |
|---|---|---|
| `create` | `service`, `customerName` | `{ number, status, customer_name }` |
| `call` | `service`, `counter` | `{ id, number, status, customer_name }` |
| `skip` | `service`, `counter`, `skipId` | `{ id, number, status }` |
| `set_config` | `config: { key: value }` | `{ success }` |

---

## 🎨 Desain & UI

- **Kode Warna Loket:**
  - Customer Service: `#005BAC` (Biru PLN)
  - PLN Mobile Experience: `#16A34A` (Hijau)
  - Customer Care: `#F59E0B` (Kuning/Amber)
- **Status Badge:** Memanggil = Kuning pulse | Sedang Dilayani = Hijau | Menunggu = Warna loket
- **Font:** Inter (Google Fonts)
- **Print:** CSS `@media print` dengan `@page { size: 58mm auto; margin: 0 }`

---

## 📝 Catatan Penting

1. **Pertama kali setup:** Jalankan `handleInitSheets()` di Apps Script Editor sebelum menggunakan sistem
2. **Setelah perubahan backend:** Selalu buat **New Deployment** (bukan re-deploy) agar perubahan aktif
3. **Aktifkan suara video:** Di halaman TV Display, klik tombol "🔊 Aktifkan Suara Video" sekali di awal sesi (diperlukan karena kebijakan autoplay browser)
4. **TTS membutuhkan interaksi pengguna:** Pada beberapa browser, speech synthesis baru aktif setelah ada klik pertama
5. **Data per hari:** Sistem otomatis memfilter antrian berdasarkan tanggal hari ini, nomor antrian di-reset esok harinya

---

## 👤 Developer

**PLN ULP Salatiga**  
Email: ulp.salkot@gmail.com  
GitHub: [@salkot25](https://github.com/salkot25)

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan internal PLN ULP Salatiga.
