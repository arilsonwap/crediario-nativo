// ============================================================
// 🔥 FIREBASE CONFIGURAÇÃO MODULAR - React Native Firebase v22+
// ============================================================
// ✅ Formato Modular (sem warnings de depreciação)
// ✅ getAuth(), getFirestore(), getStorage()
// ============================================================

import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";
import { getStorage } from "@react-native-firebase/storage";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

// --------------------------------------
// 🔥 Configuração Firebase
// --------------------------------------
/**
 * ⚠️ NOTA: A configuração do Firebase é feita automaticamente pelos arquivos:
 * - Android: google-services.json
 * - iOS: GoogleService-Info.plist
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAzQcyWf2argX07xwZaEpWmht7Ty74haHI",
  authDomain: "crediario-app.firebaseapp.com",
  projectId: "crediario-app",
  storageBucket: "crediario-app.firebasestorage.app",
  messagingSenderId: "464413033372",
  appId: "1:464413033372:web:67344359b50089bc3ffe59",
};

// --------------------------------------
// 🌐 Instâncias Firebase (Formato Modular)
// --------------------------------------
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();

// --------------------------------------
// 📦 Tipos
// --------------------------------------
export type FirebaseUser = FirebaseAuthTypes.User | null;