import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import RiwayatScreen from './screens/RiwayatScreen';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fix khusus web: html/body/#root harus tinggi 100% biar ScrollView
  // di dalam tahu batas tingginya dan bisa scroll. Native (Android/iOS) tidak butuh ini.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        html, body, #root {
          height: 100%;
          margin: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Riwayat" component={RiwayatScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}