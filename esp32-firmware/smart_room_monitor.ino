#include <WiFi.h>
#include <FirebaseESP32.h>

const char* ssid     = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";
#define FIREBASE_HOST "smart-room-monitor-140fd-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "TOKEN"

#define PIN_SOUND_AO 33
#define PIN_PIR      26
#define PIN_LED_HIJAU  25
#define PIN_LED_MERAH  14
#define PIN_BUZZER     12

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi Terhubung!");

  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
}

void loop() {
  int raw = analogRead(PIN_SOUND_AO);
  int level = map(raw, 0, 4095, 0, 100);
  bool gerak = digitalRead(PIN_PIR);

  Firebase.setInt(fbdo, "/sensor/suara", level);
  Firebase.setBool(fbdo, "/sensor/gerak", gerak);

  delay(1000);
}