import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBrizwD_rt8pe2bwBg2gNGgQClAalGn8iU",
  authDomain: "strategiaconnect-10753.firebaseapp.com",
  projectId: "strategiaconnect-10753",
  storageBucket: "strategiaconnect-10753.firebasestorage.app",
  messagingSenderId: "1814031719",
  appId: "1:1814031719:web:e2414a5a8fec79bce393c2",
  measurementId: "G-YVPJ0VKMCL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
