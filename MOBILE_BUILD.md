# Build IDTC Mobile untuk Android dan iOS

Project ini memakai Capacitor untuk membungkus aplikasi web IDTC menjadi aplikasi native.

## Prasyarat

- Node.js 20 atau lebih baru dan npm
- Android: Android Studio, Android SDK, dan JDK 17
- iOS: macOS, Xcode, dan CocoaPods

## Instalasi awal

Jalankan dari folder project:

```bash
npm install
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
```

Perintah `cap:add:ios` harus dijalankan di macOS. Folder `android/` dan `ios/` akan dibuat oleh Capacitor setelah perintah tersebut berhasil.

## Android APK debug

```bash
npm run android:build
```

APK hasil debug berada di:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Atau buka project native di Android Studio:

```bash
npm run android:open
```

## iOS

```bash
npm run ios:open
```

Kemudian pilih simulator atau perangkat di Xcode dan tekan Run. Untuk distribusi App Store, aplikasi membutuhkan Apple Developer account, signing certificate, provisioning profile, dan konfigurasi bundle identifier.

## Catatan

- Aplikasi web tetap bisa dijalankan sebagai PWA melalui server lokal.
- Login email/password saat ini memakai penyimpanan lokal browser. Login Google sungguhan membutuhkan Google Client ID dan backend/OAuth callback.
- Jangan menjalankan build native dari `file://`; Capacitor akan memuat aset dari bundle aplikasi setelah `cap sync`.
