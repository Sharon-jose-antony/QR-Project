# Scanzo Mobile — Flutter App (Android & iOS)

A native mobile application for **Scanzo — Community-Powered Zero-Trust QR & Link Safety Gateway**.

---

## 📱 Features
- **Native Camera QR Scanner:** Real-time barcode detection using `mobile_scanner`.
- **Pre-Navigation Inspection:** Checks link safety, redirects, and destination drift before opening in browser.
- **Explainable Risk Scoring:** 0–100 risk score breakdown with plain-language advice.
- **Zero-Trust User Interstitial:** Deliberate `[ Stay Safe ]` vs `[ Open Anyway ]` actions for suspicious destinations.
- **Cross-Platform:** Single codebase for Android & iOS.

---

## 🚀 How to Run & Build APK

### 1. Prerequisites
- Install [Flutter SDK](https://flutter.dev/docs/get-started/install) (version 3.0+).
- Install [Android Studio](https://developer.android.com/studio) or Xcode (for iOS).

### 2. Run Locally on Device / Emulator
```bash
cd mobile
flutter pub get
flutter run
```

### 3. Build Production Android APK (Ready to Download & Install)
```bash
cd mobile
flutter build apk --release
```
Your compiled APK will be generated at:
`mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## 🌐 Instant PWA Mobile Alternative (Zero Installation Friction)
Anyone opening the live web app on Android or iPhone can install Scanzo directly from their browser:
1. Open [https://sharon-jose-antony.github.io/QR-Project/](https://sharon-jose-antony.github.io/QR-Project/) in Chrome or Safari.
2. Tap **"Install App"** (or Chrome Menu $\rightarrow$ **"Add to Home Screen"**).
3. The Scanzo app will appear directly on your home screen as a standalone native-like app!
