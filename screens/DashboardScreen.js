import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import axios from 'axios';
import { auth, rtdb, db } from '../firebase';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import PixelTitle from './PixelTitle';

const screenWidth = Dimensions.get('window').width;

const FONT_NORMAL = 'monospace';

// ===== Palet warna tema baru (ungu-pink ala arcade) =====
const BG_UTAMA      = '#1F1438'; // dulu navy #1A2E4A
const CARD_BOX       = '#3D2160'; // dulu navy sedang #2C4870
const BORDER_AKSEN   = '#E0457B'; // dulu kuning emas #F4C430
const TOMBOL_UTAMA   = '#FFC93C'; // dulu kuning #F4C430
const TEKS_LABEL     = '#C9A6E8'; // dulu kuning pucat #F5D98C

// Warna status — TETAP seperti sebelumnya (gak diubah sesuai instruksi)
const WARNA_HIJAU        = '#5F6B2A';
const WARNA_HIJAU_CERAH  = '#4CD964'; // aman / online
const WARNA_MERAH        = '#6B1F1A';
const WARNA_MERAH_CERAH  = '#FF3B30'; // bahaya / offline
const WARNA_ORANYE       = '#E08B2E'; // berisik
const WARNA_KUNING_PUCAT = '#F4C430'; // kartu sensor (dibiarkan kuning, bukan bagian status R/K/H)

// Batas waktu (ms) sejak heartbeat terakhir device sampai dianggap offline.
// Device HARUS menulis field "timestamp" (epoch ms) ke /koneksi/timestamp
// setiap kali dia masih hidup & terhubung. Kalau sudah lewat batas ini,
// status dianggap offline meskipun field "status" masih bernilai "online"
// (mengatasi kasus device mati tiba-tiba tanpa sempat menulis "offline").
const BATAS_HEARTBEAT_MS = 7000;

export default function DashboardScreen({ navigation }) {
  const [levelSuara, setLevelSuara]   = useState(0);
  const [adaGerak, setAdaGerak]       = useState(false);
  const [status, setStatus]           = useState('normal');
  const [batasKuning, setBatasKuning] = useState(40);
  const [batasMerah, setBatasMerah]   = useState(70);
  const [inputKuning, setInputKuning] = useState('40');
  const [inputMerah, setInputMerah]   = useState('70');
  const [koneksi, setKoneksi]         = useState('offline');
  const [grafikData, setGrafikData]   = useState([1, 2, 1, 2, 1, 2, 1]);
  const statusSebelumnya              = useRef('');

  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  const FIREBASE_URL = 'https://smart-room-monitor-140fd-default-rtdb.firebaseio.com';

  const ambilDataSensor = async () => {
    try {
      const response = await axios.get(`${FIREBASE_URL}/sensor.json`);
      const data = response.data;

      if (data) {
        setLevelSuara(data.suara || 0);
        setAdaGerak(data.gerak || false);
        setStatus(data.status || 'normal');

        setGrafikData(prev => {
          const nilaiSuara = typeof data.suara === 'number' ? data.suara : 1;
          const baru = [...prev.slice(1), nilaiSuara < 1 ? 1 : nilaiSuara];
          return baru;
        });

        if (data.status !== statusSebelumnya.current) {
          statusSebelumnya.current = data.status;
          await addDoc(collection(db, 'riwayat'), {
            level:  data.suara  || 0,
            gerak:  data.gerak  || false,
            status: data.status || 'normal;',
            waktu:  serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.log('Error ambil data:', error);
    }
  };

  const ambilThreshold = async () => {
    try {
      const response = await axios.get(`${FIREBASE_URL}/config.json`);
      const data = response.data;
      if (data) {
        if (typeof data.batasKuning === 'number') setBatasKuning(data.batasKuning);
        if (typeof data.batasMerah === 'number')  setBatasMerah(data.batasMerah);
      }
    } catch (error) {
      console.log('Error ambil threshold:', error);
    }
  };

  // Cek koneksi pakai heartbeat + timeout, bukan cuma baca field "status" mentah.
  // Kalau device gak update timestamp dalam BATAS_HEARTBEAT_MS, dianggap offline
  // walau nilai "status" di database masih nyangkut "online" dari sesi sebelumnya.
  const cekKoneksi = async () => {
    try {
      const response = await axios.get(`${FIREBASE_URL}/koneksi.json`);
      const data = response.data;

      if (!data || !data.timestamp) {
        setKoneksi('offline');
        return;
      }

      const sekarang = Date.now();
      const selisih = sekarang - data.timestamp;

      if (selisih > BATAS_HEARTBEAT_MS) {
        setKoneksi('offline');
      } else {
        setKoneksi(data.status === 'online' ? 'online' : 'offline');
      }
    } catch (error) {
      setKoneksi('offline');
    }
  };

  useEffect(() => {
    ambilDataSensor();
    ambilThreshold();
    cekKoneksi();
    const interval = setInterval(() => {
      ambilDataSensor();
      cekKoneksi();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const simpanThreshold = async () => {
    const kuning = parseInt(inputKuning);
    const merah  = parseInt(inputMerah);

    if (isNaN(kuning) || kuning < 1 || kuning > 99) {
      Alert.alert('Error', 'Batas Kuning harus angka 1-99!');
      return;
    }
    if (isNaN(merah) || merah < 1 || merah > 100) {
      Alert.alert('Error', 'Batas Merah harus angka 1-100!');
      return;
    }
    if (kuning >= merah) {
      Alert.alert('Error', 'Batas Kuning harus lebih kecil dari Batas Merah!');
      return;
    }

    try {
      await set(ref(rtdb, '/config/batasKuning'), kuning);
      await set(ref(rtdb, '/config/batasMerah'), merah);
      setBatasKuning(kuning);
      setBatasMerah(merah);
      Alert.alert('Sukses', `Batas Kuning: ${kuning}%, Batas Merah: ${merah}%`);
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan threshold');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Warna teks & garis tepi kotak status, sesuai kondisi ruangan.
  // Kalau device offline, data sensor terakhir gak bisa dipercaya (basi),
  // jadi JANGAN bilang "AMAN" — tampilkan status "tidak diketahui" sebagai gantinya.
  const getWarnaStatus = () => {
    if (koneksi !== 'online') return TEKS_LABEL; // abu-abu ungu pucat, neutral
    if (status === 'bahaya')  return WARNA_MERAH_CERAH;
    if (status === 'warning') return WARNA_ORANYE;
    return WARNA_HIJAU_CERAH; // aman -> hijau cerah
  };

  const getStatusTeks = () => {
    if (koneksi !== 'online') return '❔ STATUS TIDAK DIKETAHUI (Perangkat Offline)';
    if (status === 'bahaya')  return '🚨 RUANGAN BAHAYA! Suara sangat keras';
    if (status === 'warning') return '⚠️ RUANGAN BERISIK';
    return '✅ RUANGAN AMAN';
  };

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      bounces={true}
    >
      {!fontsLoaded ? (
        <ActivityIndicator color={TOMBOL_UTAMA} size="large" style={{ marginTop: 60 }} />
      ) : (
      <>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerEmoji}>🔐</Text>
          <PixelTitle fontSize={11} style={styles.headerTitleText}>Smart Room Monitor</PixelTitle>
        </View>
        <TouchableOpacity style={styles.logoutBox} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutBtn}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Perangkat Terhubung: hijau cerah kalau online (sudah pakai heartbeat) */}
      <View style={[styles.koneksiBox, {
        backgroundColor: koneksi === 'online' ? WARNA_HIJAU_CERAH : WARNA_MERAH_CERAH,
      }]}>
        <Text style={styles.koneksiTeks}>
          {koneksi === 'online' ? '🟢 Perangkat Terhubung' : '🔴 Perangkat Tidak Terhubung'}
        </Text>
      </View>

      {/* Status ruangan: background SELALU card ungu, hanya border & teks yang berubah warna */}
      <View style={[styles.statusBox, { borderColor: getWarnaStatus() }]}>
        <Text style={[styles.statusTeks, { color: getWarnaStatus() }]}>
          {getStatusTeks()}
        </Text>
      </View>

      <View style={styles.sensorRow}>
        <View style={styles.sensorCard}>
          <Text style={styles.sensorLabel}>🎤 Level Suara</Text>
          <Text style={[styles.sensorValue, { color: WARNA_HIJAU }]}>
            {levelSuara}%
          </Text>
        </View>
        <View style={styles.sensorCard}>
          <Text style={styles.sensorLabel}>👁️ Kehadiran</Text>
          <Text style={[styles.sensorValue, { color: adaGerak ? WARNA_HIJAU : WARNA_MERAH }]}>
            {adaGerak ? 'Ada Orang' : 'Kosong'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionEmoji}>📈</Text>
        <PixelTitle fontSize={11} style={styles.sectionTitleText}>Grafik Level Suara</PixelTitle>
      </View>
      <LineChart
        data={{
          labels: ['', '', '', '', '', '', ''],
          datasets: [{ data: grafikData }]
        }}
        width={screenWidth - 32}
        height={160}
        chartConfig={{
          backgroundColor: CARD_BOX,
          backgroundGradientFrom: CARD_BOX,
          backgroundGradientTo: BG_UTAMA,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 201, 60, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(201, 166, 232, ${opacity})`,
          propsForDots: { r: 4, strokeWidth: 2, stroke: TOMBOL_UTAMA },
        }}
        bezier
        style={styles.grafik}
      />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionEmoji}>⚙️</Text>
        <PixelTitle fontSize={11} style={styles.sectionTitleText}>Batas Kebisingan</PixelTitle>
      </View>
      <View style={styles.thresholdBoxFull}>
        <Text style={styles.thresholdInfo}>
          Kuning saat ini:{' '}
          <Text style={styles.thresholdInfoBold}>{batasKuning}%</Text>
          {'   '}Merah saat ini:{' '}
          <Text style={[styles.thresholdInfoBold, { color: WARNA_MERAH_CERAH }]}>{batasMerah}%</Text>
        </Text>

        <View style={styles.duaInputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>🟡 Batas Kuning (%)</Text>
            <TextInput
              style={styles.input}
              value={inputKuning}
              onChangeText={setInputKuning}
              keyboardType="numeric"
              placeholder="40"
              placeholderTextColor="#8FA3C0"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>🔴 Batas Merah (%)</Text>
            <TextInput
              style={styles.input}
              value={inputMerah}
              onChangeText={setInputMerah}
              keyboardType="numeric"
              placeholder="70"
              placeholderTextColor="#8FA3C0"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.simpanBtn} onPress={simpanThreshold} activeOpacity={0.8}>
          <Text style={styles.simpanBtnTeks}>💾 Simpan Kedua Batas</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.riwayatBtn}
        onPress={() => navigation.navigate('Riwayat')}
        activeOpacity={0.8}
      >
        <Text style={styles.riwayatBtnTeks}>📋 Lihat Riwayat Kejadian</Text>
      </TouchableOpacity>
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BG_UTAMA,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 60,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, gap: 8,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 10 },
  headerEmoji: { fontSize: 18, lineHeight: 18 * 1.45, marginRight: 4 },
  headerTitleText: { textAlign: 'left' },
  logoutBox: {
    backgroundColor: TOMBOL_UTAMA,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 4,
    borderColor: BG_UTAMA,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 3,
  },
  logoutBtn: { color: BG_UTAMA, fontSize: 16, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  koneksiBox: {
    padding: 12, borderRadius: 6, marginBottom: 12,
    alignItems: 'center', justifyContent: 'center', width: '100%',
    borderWidth: 4, borderColor: BG_UTAMA,
  },
  koneksiTeks: { color: BG_UTAMA, fontFamily: FONT_NORMAL, fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  statusBox: {
    backgroundColor: CARD_BOX, // selalu card ungu, tidak berubah per status
    borderWidth: 4, borderRadius: 8, padding: 14,
    marginBottom: 12, alignItems: 'center', justifyContent: 'center',
  },
  statusTeks: { fontSize: 16, fontFamily: FONT_NORMAL, fontWeight: 'bold', textAlign: 'center', lineHeight: 22 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sensorCard: {
    backgroundColor: WARNA_KUNING_PUCAT, borderRadius: 8, padding: 14,
    width: '48%', alignItems: 'center', borderWidth: 4, borderColor: BG_UTAMA,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.35, shadowRadius: 0, elevation: 3,
  },
  sensorLabel: { color: BG_UTAMA, fontSize: 14, marginBottom: 6, fontFamily: FONT_NORMAL, fontWeight: 'bold', opacity: 0.85 },
  sensorValue: { fontSize: 18, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionEmoji: { fontSize: 18, lineHeight: 18 * 1.45, marginRight: 4 },
  sectionTitleText: { textAlign: 'left' },
  grafik: { borderRadius: 8, marginBottom: 12 },
  thresholdBoxFull: {
    backgroundColor: CARD_BOX, borderRadius: 8, padding: 14, marginBottom: 16,
    borderWidth: 4, borderColor: BORDER_AKSEN,
  },
  thresholdInfo: { color: TEKS_LABEL, fontSize: 14, marginBottom: 12, fontFamily: FONT_NORMAL, opacity: 0.9 },
  thresholdInfoBold: { color: TOMBOL_UTAMA, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  duaInputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { color: TEKS_LABEL, fontSize: 14, marginBottom: 6, fontFamily: FONT_NORMAL, fontWeight: 'bold', opacity: 0.9 },
  input: {
    backgroundColor: BG_UTAMA, color: '#ffffff', padding: 10,
    borderRadius: 4, fontSize: 16, fontFamily: FONT_NORMAL, borderWidth: 4,
    borderColor: BORDER_AKSEN, textAlign: 'center',
  },
  simpanBtn: {
    backgroundColor: TOMBOL_UTAMA, padding: 12, borderRadius: 4, alignItems: 'center',
    borderWidth: 4, borderColor: BG_UTAMA,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 3,
  },
  simpanBtnTeks: { color: BG_UTAMA, fontFamily: FONT_NORMAL, fontWeight: 'bold', fontSize: 16 },
  riwayatBtn: {
    backgroundColor: CARD_BOX, padding: 16, borderRadius: 6,
    alignItems: 'center', marginBottom: 32, borderWidth: 4, borderColor: BORDER_AKSEN,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 3,
  },
  riwayatBtnTeks: { color: TEKS_LABEL, fontFamily: FONT_NORMAL, fontWeight: 'bold', fontSize: 16 },
});