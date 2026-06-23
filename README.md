# Smart Room Security Monitor

## Anggota Tim & Pembagian Tugas

| Nama | Username GitHub | Role | Tugas |
|---|---|---|---|
| Intari Dwi | IntariDwi | UI/UX & State Specialist | Layout, navigasi, state management |
| Andika Marcellino | jujuna-dika | API & Network Specialist | Axios, fetch data Firebase, error handling |
| Aminatu Nur Utammi | natunrtmm | Cloud Database & Auth Specialist | Firebase Auth, Firestore, ESP32 |

## Deskripsi Aplikasi

Smart Room Security Monitor adalah sistem IoT berbasis ESP32 yang 
memonitor keamanan ruangan menggunakan sensor suara (KY-037) dan 
sensor gerak (PIR HC-SR501). Data dikirim via WiFi ke Firebase 
Realtime Database dan ditampilkan secara realtime di aplikasi 
mobile React Native.

## API yang Digunakan

- Firebase Realtime Database REST API (diakses via Axios)
- Firebase Authentication SDK
- Cloud Firestore SDK

## 3 Fitur Utama

1. Monitor keamanan ruangan realtime dengan grafik level suara
2. Set threshold batas kebisingan (kuning & merah) dari aplikasi mobile
3. Login dengan Firebase Auth + riwayat log kejadian di Firestore

## Teknologi

- React Native (Expo SDK 54)
- Firebase (Auth, Firestore, Realtime Database)
- Axios
- ESP32 + KY-037 + PIR HC-SR501
- Arduino IDE
