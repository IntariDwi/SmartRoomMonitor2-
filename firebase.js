import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCB882YCp4NxtJDlMjdn53mGjxFsXcNIPw",
  authDomain: "smart-room-monitor-140fd.firebaseapp.com",
  databaseURL: "https://smart-room-monitor-140fd-default-rtdb.firebaseio.com",
  projectId: "smart-room-monitor-140fd",
  storageBucket: "smart-room-monitor-140fd.firebasestorage.app",
  messagingSenderId: "810113593995",
  appId: "1:810113593995:web:c4d39d38513f4a4b341a8e",
  measurementId: "G-MMJFJB3WY6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);