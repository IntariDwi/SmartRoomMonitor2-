import React from 'react';
import { Text, StyleSheet } from 'react-native';

const FONT_PIXEL = 'PressStart2P_400Regular';

/**
 * Judul ala pixel-game: isi kuning, outline/shadow pink-merah tipis di belakang.
 * Pakai textShadow bawaan React Native (1 layer, native, reliable) — bukan
 * trik tumpuk beberapa <Text> absolute, karena itu gampang berantakan saat
 * teks panjang yang wrap ke beberapa baris (tiap layer bisa wrap beda titik).
 *
 * Props:
 * - children: teks judul
 * - fontSize: ukuran font (default 16)
 * - style: style tambahan untuk Text (misal marginBottom, textAlign, maxWidth)
 */
export default function PixelTitle({ children, fontSize = 16, style }) {
  return (
    <Text
      style={[
        styles.base,
        { fontSize, lineHeight: fontSize * 1.45 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_PIXEL,
    color: '#FFC93C',
    textAlign: 'center',
    // Shadow tipis ke kanan-bawah, warna pink-merah, tanpa blur (radius 0)
    // biar kesan "outline kotak" pixel-art, bukan blur lembut.
    textShadowColor: '#E0457B',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});