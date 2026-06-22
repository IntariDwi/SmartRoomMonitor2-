import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import PixelTitle from './PixelTitle';

const FONT_NORMAL = 'monospace';

// ===== Palet warna tema baru (ungu-pink ala arcade) =====
const BG_UTAMA     = '#1F1438'; // dulu navy #1A2E4A
const CARD_BOX      = '#3D2160'; // dulu navy sedang #2C4870
const BORDER_AKSEN  = '#E0457B'; // dulu kuning emas #F4C430
const TOMBOL_UTAMA  = '#FFC93C'; // dulu kuning #F4C430
const TEKS_LABEL    = '#C9A6E8'; // dulu kuning pucat #F5D98C

// Warna status — TETAP seperti sebelumnya (gak diubah sesuai instruksi)
const WARNA_HIJAU_CERAH = '#4CD964'; // aman 🟢
const WARNA_MERAH_CERAH = '#FF3B30'; // bahaya, merah cerah menyala
const WARNA_ORANYE      = '#E08B2E'; // berisik

export default function RiwayatScreen({ navigation }) {
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  const ambilRiwayat = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'riwayat'),
        orderBy('waktu', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        waktu: doc.data().waktu?.toDate().toLocaleString('id-ID') || '-'
      }));
      setRiwayat(data);
    } catch (error) {
      console.log('Error ambil riwayat:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    ambilRiwayat();
  }, []);

  const getWarna = (status) => {
    if (status === 'bahaya')  return WARNA_MERAH_CERAH;
    if (status === 'warning') return WARNA_ORANYE;
    return WARNA_HIJAU_CERAH;
  };

  const getEmoji = (status) => {
    if (status === 'bahaya')  return '🚨';
    if (status === 'warning') return '⚠️';
    return '✅';
  };

  const getTeksStatus = (status) => {
    if (status === 'bahaya')  return 'BAHAYA';
    if (status === 'warning') return 'BERISIK';
    return 'AMAN';
  };

  const renderItem = ({ item }) => (
    <View style={[styles.item, { borderLeftColor: getWarna(item.status) }]}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemEmoji}>{getEmoji(item.status)}</Text>
        <View>
          <Text style={[styles.itemStatus, { color: getWarna(item.status) }]}>
            {getTeksStatus(item.status)}
          </Text>
          <Text style={styles.itemWaktu}>{item.waktu}</Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemLevel, { color: getWarna(item.status) }]}>
          {item.level}%
        </Text>
        <Text style={[styles.itemGerak, { color: item.gerak ? WARNA_HIJAU_CERAH : WARNA_MERAH_CERAH }]}>
          {item.gerak ? '👤 Ada orang' : '🚫 Kosong'}
        </Text>
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={TOMBOL_UTAMA} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBox} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerEmoji}>📋</Text>
          <PixelTitle fontSize={11} style={styles.headerTitleText}>Riwayat Kejadian</PixelTitle>
        </View>
        <TouchableOpacity onPress={ambilRiwayat}>
          <Text style={styles.refreshBtn}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={TOMBOL_UTAMA} size="large" style={{ marginTop: 40 }} />
      ) : riwayat.length === 0 ? (
        <View style={styles.kosong}>
          <Text style={styles.kosongEmoji}>📭</Text>
          <Text style={styles.kosongTeks}>Belum ada kejadian tercatat</Text>
          <Text style={styles.kosongSub}>
            Riwayat akan muncul otomatis saat status ruangan berubah
          </Text>
        </View>
      ) : (
        <FlatList
          data={riwayat}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BG_UTAMA, padding: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 40, marginBottom: 16,
  },
  backBox: {
    backgroundColor: TOMBOL_UTAMA,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 4,
    borderColor: BG_UTAMA,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 3,
  },
  backBtn: { color: BG_UTAMA, fontSize: 16, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginHorizontal: 8 },
  headerEmoji: { fontSize: 18, lineHeight: 18 * 1.45, marginRight: 4 },
  headerTitleText: { textAlign: 'left' },
  refreshBtn: { fontSize: 26 }, // dibesarkan biar pas dengan ukuran teks lain
  listContainer: { paddingBottom: 40 },
  item: {
    backgroundColor: CARD_BOX, borderRadius: 8, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 6,
    borderWidth: 2, borderColor: BG_UTAMA,
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 0, elevation: 2,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemEmoji: { fontSize: 24 },
  itemStatus: { fontFamily: FONT_NORMAL, fontWeight: 'bold', fontSize: 16 },
  itemWaktu: { color: TEKS_LABEL, fontSize: 14, marginTop: 2, fontFamily: FONT_NORMAL, opacity: 0.8 },
  itemRight: { alignItems: 'flex-end', minWidth: 70 },
  itemLevel: { fontSize: 16, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  itemGerak: { fontSize: 16, marginTop: 2, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  kosong: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  kosongEmoji: { fontSize: 48, marginBottom: 8 },
  kosongTeks: { color: TEKS_LABEL, fontSize: 16, fontFamily: FONT_NORMAL, fontWeight: 'bold' },
  kosongSub: { color: TEKS_LABEL, fontSize: 14, textAlign: 'center', paddingHorizontal: 20, fontFamily: FONT_NORMAL, opacity: 0.7 },
});