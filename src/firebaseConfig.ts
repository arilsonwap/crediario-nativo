// ============================================================
// 🔥 FIREBASE CONFIGURAÇÃO HÍBRIDA - Expo SDK 54
// ============================================================
// ✅ Firestore: Firebase Web SDK (firebase/firestore)
// ✅ Auth: Firebase Nativo (@react-native-firebase/auth)
// ✅ Storage: Firebase Nativo (@react-native-firebase/storage)
// ============================================================

// 🌐 Firebase Web (para Firestore)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 📱 Firebase Nativo (para Auth e Storage)
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";

// --------------------------------------
// 🔥 Configuração Firebase
// --------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAzQcyWf2argX07xwZaEpWmht7Ty74haHI",
  authDomain: "crediario-app.firebaseapp.com",
  projectId: "crediario-app",
  storageBucket: "crediario-app.firebasestorage.app",
  messagingSenderId: "464413033372",
  appId: "1:464413033372:web:67344359b50089bc3ffe59",
};

// --------------------------------------
// 🔥 Inicializa Firebase App (Web)
// --------------------------------------
export const app = initializeApp(firebaseConfig);

// --------------------------------------
// 🌐 Firestore (Web SDK)
// --------------------------------------
export const db = getFirestore(app);

// --------------------------------------
// 📱 Auth (Nativo)
// --------------------------------------
export const firebaseAuth = auth();

// --------------------------------------
// 📱 Storage (Nativo)
// --------------------------------------
export const firebaseStorage = storage();

// --------------------------------------
// 📦 Tipos do Firebase Auth
// --------------------------------------
export type FirebaseUser = typeof firebaseAuth.currentUser;
