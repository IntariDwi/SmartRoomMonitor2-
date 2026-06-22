#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ArduinoJson.h>

const char* ssid     = "tari";
const char* password = "123456789";
#define FIREBASE_HOST "smart-room-monitor-140fd-default-rtdb.firebaseio.com"
#define DATABASE_URL  "https://smart-room-monitor-140fd-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "4RrP3pVHT9P9KIeSHo7AjhVfP9hrLEFUBbJyNkK5"

#define PIN_SOUND_AO   33
#define PIN_SOUND_DO   35
#define PIN_PIR        26
#define PIN_LED_HIJAU  25
#define PIN_LED_KUNING 27
#define PIN_LED_MERAH  14
#define PIN_BUZZER     12

#define SOUND_MIN      50
#define SOUND_MAX      4000

// --- PERUBAHAN #1 ---
// Dulu ini #define (nilai mati, gak bisa diubah saat device jalan).
// Sekarang jadi variabel biasa, supaya bisa di-update dari Firebase
// setiap kali user ganti nilai di dashboard mobile.
int batasKuning = 40;
int batasMerah  = 70;

// Timer khusus buat cek perubahan threshold dari Firebase.
// Gak perlu dicek tiap loop (1x/detik) karena nilainya jarang berubah,
// cukup tiap beberapa detik aja biar gak nge-bebani koneksi.
unsigned long lastCekThreshold = 0;
const unsigned long INTERVAL_CEK_THRESHOLD = 3000; // cek tiap 3 detik

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastTime = 0;
const unsigned long interval = 1000;
bool firebaseReady = false;

// Timer hold PIR 30 detik
unsigned long waktuTerakhirGerak = 0;
const unsigned long HOLD_GERAK   = 5000;

void matikanSemua() {
  digitalWrite(PIN_LED_HIJAU,  LOW);
  digitalWrite(PIN_LED_KUNING, LOW);
  digitalWrite(PIN_LED_MERAH,  LOW);
  digitalWrite(PIN_BUZZER,     LOW);
}

void kedipMerah(int kali) {
  for (int i = 0; i < kali; i++) {
    digitalWrite(PIN_LED_MERAH, HIGH); delay(200);
    digitalWrite(PIN_LED_MERAH, LOW);  delay(200);
  }
}

int bacaSuara() {
  int puncak = 0;
  for (int i = 0; i < 15; i++) {
    int val = analogRead(PIN_SOUND_AO);
    if (val > puncak) puncak = val;
    delay(3);
  }
  return puncak;
}

int hitungLevel(int raw) {
  if (raw < SOUND_MIN) return 0;
  raw = constrain(raw, SOUND_MIN, SOUND_MAX);
  return map(raw, SOUND_MIN, SOUND_MAX, 0, 100);
}

bool hubungWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  matikanSemua();
  Serial.println("\n[WiFi] Menghubungkan ke: " + String(ssid));

  WiFi.disconnect(true);
  delay(500);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(ssid, password, 0, NULL, true);

  int timeout = 60;
  while (WiFi.status() != WL_CONNECTED && timeout > 0) {
    delay(500);
    timeout--;
    digitalWrite(PIN_LED_HIJAU, timeout % 2 == 0 ? HIGH : LOW);
    Serial.print(".");
  }
  digitalWrite(PIN_LED_HIJAU, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Terhubung!");
    Serial.println("[WiFi] IP     : " + WiFi.localIP().toString());
    Serial.println("[WiFi] RSSI   : " + String(WiFi.RSSI()) + " dBm");
    Serial.println("[WiFi] Channel: " + String(WiFi.channel()));
    return true;
  }

  Serial.println("\n[WiFi] GAGAL. Status: " + String(WiFi.status()));
  kedipMerah(3);
  return false;
}

void reconnectJikaPutus() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("[WiFi] Putus! Reconnecting...");
  unsigned long delayMs = 2000;

  for (int attempt = 1; attempt <= 5; attempt++) {
    Serial.println("[WiFi] Percobaan ke-" + String(attempt));
    if (hubungWiFi()) return;
    delay(delayMs);
    delayMs = min(delayMs * 2, 30000UL);
  }

  Serial.println("[WiFi] Semua gagal. Restart...");
  delay(1000);
  ESP.restart();
}

void initFirebase() {
  config.host                       = FIREBASE_HOST;
  config.database_url               = DATABASE_URL;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  config.timeout.serverResponse     = 10 * 1000;
  config.timeout.socketConnection   = 10 * 1000;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  delay(2000);

  if (Firebase.setString(fbdo, "/koneksi/status", "online")) {
    Serial.println("[Firebase] Terhubung!");
    firebaseReady = true;
  } else {
    Serial.println("[Firebase] Gagal: " + fbdo.errorReason());
    firebaseReady = false;
  }
}

// --- PERUBAHAN #2 ---
// Ambil nilai batasKuning & batasMerah dari Firebase (/config/...).
// Dipanggil berkala, bukan tiap loop, supaya gak boros request.
// Kalau gagal baca (misal koneksi lemot), nilai lama tetap dipakai (aman).
void cekThresholdDariFirebase() {
  if (Firebase.getInt(fbdo, "/config/batasKuning")) {
    int nilai = fbdo.intData();
    if (nilai > 0 && nilai < 100) batasKuning = nilai;
  }

  if (Firebase.getInt(fbdo, "/config/batasMerah")) {
    int nilai = fbdo.intData();
    if (nilai > 0 && nilai <= 100) batasMerah = nilai;
  }

  Serial.print("[Config] Batas Kuning: "); Serial.print(batasKuning);
  Serial.print("  Batas Merah: "); Serial.println(batasMerah);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);

  Serial.println("\n=== Smart Room Monitor v5.1 ===");

  pinMode(PIN_LED_HIJAU,  OUTPUT);
  pinMode(PIN_LED_KUNING, OUTPUT);
  pinMode(PIN_LED_MERAH,  OUTPUT);
  pinMode(PIN_BUZZER,     OUTPUT);
  pinMode(PIN_PIR,        INPUT);
  pinMode(PIN_SOUND_DO,   INPUT);
  matikanSemua();

  if (hubungWiFi()) {
    initFirebase();
    if (firebaseReady) {
      cekThresholdDariFirebase(); // ambil threshold awal begitu konek
    }
  }

  Serial.println("[PIR] Warm-up 30 detik...");
  for (int i = 30; i > 0; i--) {
    Serial.println("[PIR] " + String(i) + "s");
    digitalWrite(PIN_LED_KUNING, i % 2 == 0 ? HIGH : LOW);
    delay(1000);
  }
  matikanSemua();
  Serial.println("[PIR] Siap!");
}

void loop() {
  unsigned long now = millis();
  if (now - lastTime < interval) return;
  lastTime = now;

  reconnectJikaPutus();

  if (!firebaseReady && WiFi.status() == WL_CONNECTED) {
    initFirebase();
  }

  // --- PERUBAHAN #2 (lanjutan) ---
  // Cek apakah sudah waktunya nge-refresh threshold dari Firebase
  if (firebaseReady && Firebase.ready() && (now - lastCekThreshold >= INTERVAL_CEK_THRESHOLD)) {
    lastCekThreshold = now;
    cekThresholdDariFirebase();
  }

  // === Baca Sensor Suara ===
  int rawSuara   = bacaSuara();
  int levelSuara = hitungLevel(rawSuara);
  bool doSuara   = digitalRead(PIN_SOUND_DO);

  // === Baca PIR dengan hold 30 detik ===
  bool p1 = digitalRead(PIN_PIR); delay(100);
  bool p2 = digitalRead(PIN_PIR); delay(100);
  bool p3 = digitalRead(PIN_PIR);
  bool pirNyala = ((p1 + p2 + p3) >= 2);

  if (pirNyala) {
    waktuTerakhirGerak = millis();
  }
  bool adaGerak = (millis() - waktuTerakhirGerak < HOLD_GERAK);

  // === Tentukan Status & Aktuator ===
  // --- PERUBAHAN #1 (lanjutan) ---
  // Sekarang pakai variabel batasKuning/batasMerah (bisa berubah real-time),
  // bukan #define BATAS_KUNING/BATAS_MERAH (nilai mati) lagi.
  matikanSemua();
  String status;

  if (levelSuara > batasMerah) {
    status = "bahaya";
    digitalWrite(PIN_LED_MERAH, HIGH);
    digitalWrite(PIN_BUZZER, HIGH);

  } else if (levelSuara > batasKuning) {
    status = "warning";
    digitalWrite(PIN_LED_KUNING, HIGH);
    digitalWrite(PIN_BUZZER, HIGH); delay(150);
    digitalWrite(PIN_BUZZER, LOW);  delay(150);
    digitalWrite(PIN_BUZZER, HIGH); delay(150);
    digitalWrite(PIN_BUZZER, LOW);

  } else {
    status = "aman";
    digitalWrite(PIN_LED_HIJAU, HIGH);
  }

  // === Serial Monitor ===
  Serial.println("================================");
  Serial.print("Suara RAW   : "); Serial.println(rawSuara);
  Serial.print("Suara Level : "); Serial.print(levelSuara); Serial.println("%");
  Serial.print("Suara DO    : "); Serial.println(doSuara ? "TERDETEKSI" : "sepi");
  Serial.print("Gerakan PIR : "); Serial.println(adaGerak ? "ADA" : "tidak ada");
  Serial.print("Status      : "); Serial.println(status);
  Serial.print("Batas K/M   : "); Serial.print(batasKuning); Serial.print(" / "); Serial.println(batasMerah);
  Serial.print("WiFi RSSI   : "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  Serial.println("================================");

  // === Kirim ke Firebase ===
  if (firebaseReady && Firebase.ready()) {
    Firebase.setInt(fbdo,    "/sensor/suara",     levelSuara);
    Firebase.setInt(fbdo,    "/sensor/suara_raw", rawSuara);
    Firebase.setBool(fbdo,   "/sensor/gerak",     adaGerak);
    Firebase.setString(fbdo, "/sensor/status",    status);
    Firebase.setString(fbdo, "/koneksi/status",   "online");

    // --- PERUBAHAN #3 ---
    // Kirim juga "jam absen" (timestamp) tiap kali masih hidup & terkirim data,
    // supaya app mobile tau device ini BENERAN masih aktif baru-baru ini
    // (bukan cuma baca status "online" yang bisa nyangkut lama walau device
    // udah mati duluan tanpa sempat update statusnya).
    Firebase.setTimestamp(fbdo, "/koneksi/timestamp");
  }
}