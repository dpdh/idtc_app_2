# Build IDTC Mobile untuk Android dan iOS

Project ini memakai Capacitor untuk membungkus aplikasi web IDTC menjadi aplikasi native.

## Prasyarat

- Node.js 20 atau lebih baru dan npm
- Android: Android Studio, Android SDK Platform 36, dan JDK 21
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

## Android release

Untuk menguji varian release secara lokal, jalankan:

```bash
npm run android:release
```

APK release bernama `app-release.apk` jika signing dikonfigurasi; tanpa signing,
Gradle menghasilkan
`android/app/build/outputs/apk/release/app-release-unsigned.apk`. APK ini tidak
dapat dipasang atau diunggah ke Play Store. APK debug ditandatangani dengan
debug key dan hanya ditujukan untuk pengujian lokal.
Untuk distribusi Play Store, gunakan Android App Bundle:

```bash
npm run android:bundle
```

Hasilnya berada di `android/app/build/outputs/bundle/release/app-release.aab`.
Sebelum mengunggah, buat upload key sendiri dan simpan keystore beserta password
di tempat aman di luar repository. Atur environment variables berikut pada mesin
build; jangan masukkan rahasia ke file Gradle, konfigurasi aplikasi, atau Git:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Gradle menggunakan key tersebut untuk menandatangani APK dan AAB release bila
keempat variabel tersedia; jika hanya sebagian diatur, build akan gagal. Aktifkan
Play App Signing di Play Console dan jangan kehilangan salinan upload key.
Naikkan `versionCode` di `android/app/build.gradle` untuk setiap rilis baru.

### Batas keamanan sebelum rilis produksi

Konfigurasi Android menonaktifkan cleartext HTTP dan backup/transfer data aplikasi,
serta hanya meminta izin internet. Namun login, sesi, akun, role, dan konten CMS
saat ini disimpan di `localStorage` perangkat. Hash kata sandi tidak menjadikan
role atau sesi lokal sebagai autentikasi/otorisasi yang aman: pengguna perangkat
dapat mengubah data tersebut. Jangan gunakan alur lokal ini untuk akun nyata,
data sensitif, atau kontrol akses produksi. Sebelum rilis publik, pindahkan
autentikasi dan pemeriksaan role ke backend tepercaya, lalu lengkapi kebijakan
privasi dan deklarasi Data safety Play Console sesuai data dan SDK yang benar-benar
digunakan. Build release atau lolos pemeriksaan teknis tidak menjamin persetujuan
Play Store.

Atau buka project native di Android Studio:

```bash
npm run android:open
```

## iOS

```bash
npm run ios:open
```

Kemudian pilih simulator atau perangkat di Xcode dan tekan Run. Untuk distribusi App Store, aplikasi membutuhkan Apple Developer account, signing certificate, provisioning profile, dan konfigurasi bundle identifier.

Ikon native Android dan iOS menggunakan sumber `assets/img/dni/ITDC_icon_app_01.png`.
Untuk iOS, ikon aktif di katalog `ios/App/App/Assets.xcassets/AppIcon.appiconset`.

## Catatan

- Aplikasi web tetap bisa dijalankan sebagai PWA melalui server lokal.
- Login email/password saat ini memakai penyimpanan lokal browser. Login Google sungguhan membutuhkan Google Client ID dan backend/OAuth callback.
- Jangan menjalankan build native dari `file://`; Capacitor akan memuat aset dari bundle aplikasi setelah `cap sync`.
