# Android Bridge App — PLN QMS Kiosk

## Deskripsi

Native Android WebView wrapper untuk sistem antrian PLN. Mengekspos `window.AndroidPrintBridge` sebagai JavaScript interface untuk print tiket thermal via Bluetooth Classic SPP ke printer Blueprint BP-LITE58.

## Struktur Project

```
android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/id/salkot/plnqms/
│       │   ├── QMSApplication.kt           — Application class
│       │   ├── MainActivity.kt             — WebView kiosk, immersive mode
│       │   ├── BluetoothPickerActivity.kt  — Picker device Bluetooth paired
│       │   └── print/
│       │       ├── PrintBridgeInterface.kt — JS interface (window.AndroidPrintBridge)
│       │       ├── BluetoothPrintService.kt — Koneksi BT SPP + kirim bytes
│       │       ├── EscPosEncoder.kt        — Format ESC/POS tiket 58mm
│       │       └── TicketPayload.kt        — Data class payload dari web
│       └── res/
│           ├── layout/activity_main.xml
│           ├── layout/activity_bluetooth_picker.xml
│           ├── values/strings.xml
│           └── values/themes.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/libs.versions.toml
```

## JS Contract (dipanggil dari web app)

```js
// Cetak tiket — mengembalikan "ok" atau string error
window.AndroidPrintBridge.printTicket(
  JSON.stringify({
    number: "CS-001",
    serviceCode: "CS",
    serviceName: "Customer Service",
    printedAt: "25/04/2026 09:30:00",
    customerName: "Budi Santoso",
    officeName: "PLN ULP Salatiga",
  }),
);

// Cek status printer
window.AndroidPrintBridge.getPrinterStatus();
// → '{"connected":true,"address":"XX:XX:XX:XX:XX:XX"}'

// Buka picker pilih printer
window.AndroidPrintBridge.pickPrinter();
```

## Callback dari Android ke Web

```js
// Daftarkan handler di web untuk menerima hasil print async
window.onAndroidPrintResult = function (result) {
  // result: { success: boolean, reason: string|null, number: string }
  console.log(result);
};
```

## Cara Build

1. Buka folder `android/` di Android Studio
2. Sync Gradle
3. Build > Generate Signed APK (untuk produksi)
4. Install ke tablet kiosk Android

## Cara Pairing Printer

1. Buka Pengaturan Android > Bluetooth
2. Pasangkan Blueprint BP-LITE58 (nama device muncul di list)
3. Buka app PLN QMS Kiosk
4. Saat pertama kali cetak, picker muncul otomatis — pilih printer
5. Printer tersimpan untuk sesi berikutnya

## Alur Print (bridge mode)

```
Web ambil tiket
  → window.AndroidPrintBridge.printTicket(json)
    → PrintBridgeInterface.printTicket()          — parse JSON payload
      → schedulePrint()                           — async coroutine
        → EscPosEncoder.buildTicket()             — encode ESC/POS bytes
        → BluetoothPrintService.print()           — kirim via SPP
          → (sukses) notifyWebPrintResult(true)
          → (gagal)  notifyWebPrintResult(false, reason)
            → (no_device_paired) buka BluetoothPickerActivity
  ← window.onAndroidPrintResult({success, reason, number})
```

## Minimum Requirements

- Android 8.0 (API 26) ke atas
- Bluetooth Classic tersedia di device
- Printer: Blueprint BP-LITE58 atau printer ESC/POS Bluetooth SPP lainnya
