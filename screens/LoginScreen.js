import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import PixelTitle from './PixelTitle';

const FONT_NORMAL = 'monospace';

// ===== Palet warna tema baru (ungu-pink ala arcade) =====
const BG_UTAMA      = '#1F1438'; // dulu navy #1A2E4A
const CARD_BOX       = '#3D2160'; // dulu navy sedang #2C4870
const BORDER_AKSEN   = '#E0457B'; // dulu kuning emas #F4C430
const TOMBOL_UTAMA   = '#FFC93C'; // dulu kuning #F4C430, tetap kuning biar kontras
const TEKS_LABEL     = '#C9A6E8'; // dulu kuning pucat #F5D98C

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi!');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert('Sukses', 'Akun berhasil dibuat!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  if (!fontsLoaded) {
    return (
      <View style={[styles.outer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={TOMBOL_UTAMA} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
    >
      {/* "Blok" logo di atas, judul di bawahnya */}
      <View style={styles.logoBox}>
        <Text style={styles.logoEmoji}>🔒</Text>
      </View>
      <PixelTitle fontSize={17} style={styles.titleText}>Smart Room Monitor</PixelTitle>

      <Text style={styles.subtitle}>
        {isRegister ? 'Buat Akun Baru' : 'Masuk ke Akun'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="nama@email.com"
          placeholderTextColor="#8FA3C0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#8FA3C0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color={BG_UTAMA} />
            : <Text style={styles.buttonText}>
                {isRegister ? 'Daftar' : 'Masuk'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={styles.switchWrap}>
          <Text style={styles.switchText}>
            {isRegister
              ? 'Sudah punya akun? '
              : 'Belum punya akun? '}
            <Text style={styles.switchTextBold}>
              {isRegister ? 'Masuk' : 'Daftar'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: BG_UTAMA,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 4, // sudut tegas ala blok pixel
    backgroundColor: TOMBOL_UTAMA,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 4,
    borderColor: BG_UTAMA,
    // efek bayangan blok 8-bit
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 30,
  },
  titleText: {
    marginBottom: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  subtitle: {
    fontSize: 16,
    color: TEKS_LABEL,
    marginBottom: 28,
    fontFamily: FONT_NORMAL,
    fontWeight: 'bold',
    opacity: 0.9,
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BOX,
    borderRadius: 6, // kotak chunky, bukan bulat
    padding: 22,
    borderWidth: 4,
    borderColor: BORDER_AKSEN,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 5,
  },
  inputLabel: {
    color: TEKS_LABEL,
    fontSize: 14,
    fontFamily: FONT_NORMAL,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    width: '100%',
    backgroundColor: BG_UTAMA,
    color: '#ffffff',
    padding: 14,
    borderRadius: 4,
    marginBottom: 14,
    fontSize: 14,
    fontFamily: FONT_NORMAL,
    borderWidth: 4,
    borderColor: BORDER_AKSEN,
  },
  button: {
    width: '100%',
    backgroundColor: TOMBOL_UTAMA,
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: BG_UTAMA,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonText: {
    color: BG_UTAMA,
    fontSize: 14,
    fontFamily: FONT_NORMAL,
    fontWeight: 'bold',
  },
  switchWrap: {
    alignItems: 'center',
  },
  switchText: {
    color: TEKS_LABEL,
    fontSize: 14,
    fontFamily: FONT_NORMAL,
    opacity: 0.85,
  },
  switchTextBold: {
    color: TOMBOL_UTAMA,
    fontFamily: FONT_NORMAL,
    fontWeight: 'bold',
  },
});