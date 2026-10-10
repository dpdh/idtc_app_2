# IDTC Mobile

Aplikasi web responsif dan PWA untuk **Indonesia Digital Twin Community (IDTC)**, dibungkus sebagai aplikasi Android dan iOS menggunakan Capacitor. Aplikasi menyediakan informasi komunitas, materi Digital Twin, struktur pengurus dan Pokja, profil, serta TwiniAI dan katalog TwiniShop.

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Prasyarat](#prasyarat)
- [Menjalankan aplikasi web](#menjalankan-aplikasi-web)
- [TwiniAI provider setup](TwiniAI.md)
- [PostgreSQL User Management](TwiniAI.md#postgresql-user-management)
- [Build Android](#build-android)
- [Build iOS](#build-ios)
- [Struktur proyek](#struktur-proyek)
- [Keamanan dan batasan produksi](#keamanan-dan-batasan-produksi)
- [Pemecahan masalah](#pemecahan-masalah)

## Fitur

- Beranda dengan ringkasan komunitas, peta, dan carousel materi pengenalan.
- Informasi pengurus, dewan pembina, sekretariat, dan tiga Pokja utama.
- Materi belajar Digital Twin dengan rangkuman PDF dan Microsoft Word (.docx) yang dapat diunduh, mencakup seluruh jalur, modul, section terperinci, checklist, dan hasil belajar yang tersedia.
- Onboarding dengan ilustrasi IDTC dan TwiniShop.
- Profil, avatar, pengaturan tema, dan mode gelap; akun dapat memakai localStorage atau PostgreSQL server-side.
- CMS User Management dengan role Member/Admin/Super Admin, session server-side, serta audit log bila PostgreSQL dikonfigurasi.
- TwiniAI dengan basis pengetahuan lokal dan opsi integrasi OpenAI, Gemini, serta provider OpenAI-compatible melalui backend.
- TwiniShop dengan katalog, kategori, keranjang, dan formulir pesanan lokal.
- Zoom gambar dengan gestur untuk melihat detail.
- Tata letak responsif untuk ponsel kecil, ponsel besar, tablet, dan desktop.
- PWA dengan aset offline yang dicache melalui service worker.
- Build native Android dan iOS dari sumber web yang sama.

## Teknologi

- JavaScript modules, HTML, dan CSS tanpa framework UI tambahan.
- Capacitor 7 untuk menjalankan aplikasi sebagai Android WebView dan iOS WKWebView.
- Node.js HTTP API dan driver `pg` untuk PostgreSQL User Management opsional.
- Android Gradle Plugin 8.10.1, Gradle 8.11.1, dan target Android API 36.
- Web Crypto API dengan PBKDF2-SHA-256 untuk hashing sandi akun lokal.

## Prasyarat

### Web

- Node.js 20 atau lebih baru dan npm.
- (Opsional) Python 3 untuk server web lokal.
- (Opsional) PostgreSQL 13+ dan `DATABASE_URL` untuk akun/session CMS server-side.

### Android

- Android Studio dan Android SDK Platform 36 serta Android Build Tools 36.
- JDK 21.
- Perangkat Android atau emulator; aktifkan USB debugging untuk perangkat fisik.

### iOS

- macOS, Xcode, dan CocoaPods.
- Folder dan target iOS hanya dapat dibangun serta dijalankan pada macOS.

## Menjalankan aplikasi web

Pasang dependency dari lockfile:

```bash
npm ci
```

Jalankan server aplikasi dan API TwiniAI dari root proyek:

```bash
npm start
```

Kemudian buka <http://127.0.0.1:4174/>. Untuk integrasi provider AI, siapkan `.env` berdasarkan `.env.example`; tanpa API key TwiniAI tetap memakai basis pengetahuan lokal. Lihat [TwiniAI.md](TwiniAI.md) untuk konfigurasi provider, deployment, dan pengaturan Capacitor.

Untuk mencoba web statis dalam mode FAQ lokal saja, jalankan `python -m http.server 4173` atau server statis lain. Jangan membuka `index.html` langsung dengan skema `file://`; modul JavaScript, data, service worker, dan Web Crypto memerlukan konteks server yang sesuai.

Untuk membuat folder web yang akan disalin ke proyek native:

```bash
npm run build:web
```

Folder `www/` dihasilkan dari sumber proyek dan tidak perlu diedit manual.

## Build Android

Sinkronkan web asset dan konfigurasi Capacitor ke project native:

```bash
npm run cap:sync
```

Build APK debug untuk pengujian lokal:

```bash
npm run android:build
```

APK debug berada di:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

APK debug ditandatangani dengan debug key dan hanya untuk pengujian. Untuk menginstalnya pada perangkat yang tersambung melalui ADB:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Build varian release:

```bash
npm run android:release
```

Tanpa konfigurasi signing, Gradle menghasilkan `app-release-unsigned.apk`. APK unsigned tidak dapat dipasang sebagai rilis normal atau diunggah ke Google Play.

### AAB untuk Google Play

Siapkan upload keystore yang Anda miliki dan simpan di lokasi aman di luar repository. Pada mesin build, atur keempat environment variable berikut:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Build Android App Bundle:

```bash
npm run android:bundle
```

Hasilnya berada di `android/app/build/outputs/bundle/release/app-release.aab`. Gradle menandatangani release jika keempat variabel tersedia; jika tidak satu pun tersedia, hasil APK/AAB release tetap unsigned. Jika hanya sebagian variabel terisi, build dihentikan. Jangan menaruh keystore atau password di repository, file konfigurasi yang dikomit, atau log publik. Aktifkan Play App Signing di Play Console dan naikkan `versionCode` pada `android/app/build.gradle` untuk setiap rilis.

## Build iOS

Perintah ini memerlukan macOS, Xcode, dan CocoaPods:

```bash
npm ci
npm run cap:sync
npm run ios:open
```

Pilih simulator atau perangkat di Xcode, lalu jalankan target aplikasi. Distribusi App Store memerlukan Apple Developer account serta signing certificate dan provisioning profile yang sesuai.

## Perintah proyek

| Perintah | Fungsi |
| --- | --- |
| `npm run build:web` | Membuat/memperbarui `www/` dari sumber web |
| `npm run cap:sync` | Build web lalu menyinkronkan asset dan plugin Capacitor |
| `npm run android:build` | Sinkronisasi dan build APK debug |
| `npm run android:run` | Sinkronisasi lalu menjalankan aplikasi di perangkat/emulator Android |
| `npm run android:release` | Sinkronisasi dan build APK release |
| `npm run android:bundle` | Sinkronisasi dan build AAB release |
| `npm run android:open` | Membuka project Android di Android Studio |
| `npm run ios:run` | Sinkronisasi lalu menjalankan aplikasi di perangkat/simulator iOS |
| `npm run ios:open` | Membuka project iOS di Xcode |

## Struktur proyek

```text
.
├── android/              # Project native Android dan konfigurasi Gradle
├── assets/               # Gambar, ikon, dan media aplikasi
├── data/                 # Data komunitas, materi, toko, dan basis pengetahuan
├── ios/                  # Project native iOS dan plugin Capacitor
├── app.js                # Routing, halaman utama, profil, dan interaksi
├── admin-cms.js          # Pengelolaan konten lokal
├── auth-security.js      # Hashing dan verifikasi sandi lokal
├── ambient-bubbles.js    # Markup efek gelembung
├── build-web.mjs         # Menyalin sumber web ke www/
├── image-zoom.js         # Viewer zoom gambar dan gestur sentuh
├── index.html            # Dokumen utama dan shell aplikasi
├── shop.js               # Katalog, keranjang, dan pesanan TwiniShop
├── styles.css            # Gaya dan layout responsif
├── sw.js                 # Service worker dan cache PWA
└── MOBILE_BUILD.md       # Catatan build dan distribusi mobile
```

## Keamanan dan batasan produksi

- Android menargetkan API 36, menonaktifkan cleartext HTTP serta backup/transfer data aplikasi, dan hanya meminta izin internet.
- Pastikan semua layanan eksternal produksi menggunakan HTTPS.
- Akun, sesi, role, profil, konten CMS, keranjang, dan pesanan saat ini disimpan secara lokal di browser/WebView. Hash sandi lokal tidak membuat role atau sesi menjadi otorisasi tepercaya; pengguna yang menguasai perangkat dapat memodifikasi penyimpanan lokal.
- Registrasi pertama menjadi Super Admin lokal. Ini **bukan** sistem identitas atau kontrol akses untuk multi-pengguna dan data sensitif.
- Login Google masih placeholder dan belum terhubung ke Google OAuth/Client ID maupun backend. Jangan menyatakan login Google aktif.
- TwiniAI memakai basis pengetahuan lokal; TwiniShop belum terhubung ke penjual atau payment gateway dan tidak memproses pembayaran.
- Sebelum rilis publik, pindahkan autentikasi, otorisasi, dan data yang memerlukan integritas ke backend tepercaya; siapkan kebijakan privasi, deklarasi Data safety, dan peninjauan SDK sesuai perilaku rilis sebenarnya.
- Build sukses, APK debug, atau hasil lint bukan jaminan bahwa instalasi bebas peringatan, bebas masalah pada semua perangkat, atau disetujui Google Play/App Store. Uji pada perangkat dan versi Android yang didukung sebelum distribusi.

## Pemecahan masalah

### Aplikasi menampilkan halaman data yang gagal dimuat

- Pastikan aplikasi dijalankan lewat HTTP/HTTPS, bukan `file://`.
- Dari root proyek, jalankan `npm run build:web` atau `npm run cap:sync`.
- Jika menjalankan APK lama/PWA, tutup lalu buka kembali aplikasi; periksa koneksi dan cache service worker.

### Build Android gagal menemukan Java atau Android SDK

- Pastikan JDK 21 aktif dan `JAVA_HOME` menunjuk ke direktori JDK.
- Pastikan Android SDK Platform dan Build Tools 36 telah terpasang di Android Studio.
- Periksa `ANDROID_HOME` atau `ANDROID_SDK_ROOT`, lalu jalankan `npm run cap:sync` kembali.

### Release unsigned atau gagal ditandatangani

- APK debug menggunakan debug key dan hanya untuk pengujian lokal.
- Untuk artefak distribusi, isi semua environment variable keystore yang tercantum pada bagian [AAB untuk Google Play](#aab-untuk-google-play).
- Periksa lokasi keystore, alias, serta password; jangan memasukkan rahasia ke source control.

## Dokumentasi terkait

- [Panduan build mobile](MOBILE_BUILD.md)
- [Repositori GitHub](https://github.com/dpdh/idtc_app_2)
