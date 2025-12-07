import React, { createContext, useContext, useState, useEffect } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { onAuthChange, logout as firebaseLogout } from "../services/authService";

// ============================================================
// 🔐 Contexto de Autenticação
// ============================================================

interface AuthContextData {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ✅ Variáveis globais (fora do componente) para garantir listener único
// Isso previne registro duplicado mesmo se o componente for remontado
let globalAuthListener: (() => void) | null = null;
let isListenerActive = false;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Verifica variável GLOBAL (não é resetada em remontagens)
    if (isListenerActive) {
      console.log("⚠️ onAuthStateChanged já registrado globalmente, ignorando...");
      return;
    }

    isListenerActive = true;
    console.log("🔐 Registrando listener de autenticação (único)...");

    // Observa mudanças no estado de autenticação
    globalAuthListener = onAuthChange((currentUser) => {
      console.log(
        "🔐 Estado de autenticação:",
        currentUser ? currentUser.email : "Não autenticado"
      );
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      // ✅ Cleanup: remove listener global
      if (globalAuthListener) {
        console.log("🛑 Removendo listener de autenticação...");
        globalAuthListener();
        globalAuthListener = null;
        isListenerActive = false;
      }
    };
  }, []);

  const logout = async () => {
    try {
      await firebaseLogout();
      setUser(null);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
