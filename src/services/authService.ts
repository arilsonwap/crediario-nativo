import { firebaseAuth } from "../firebaseConfig";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

// ============================================================
// 🔐 Serviço de Autenticação Firebase Nativo
// ============================================================

/**
 * Faz login com email e senha
 */
export const login = async (
  email: string,
  password: string
): Promise<FirebaseAuthTypes.User> => {
  try {
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(
      email,
      password
    );
    console.log("✅ Login realizado com sucesso:", userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error("❌ Erro no login:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Registra um novo usuário com email e senha
 */
export const register = async (
  email: string,
  password: string
): Promise<FirebaseAuthTypes.User> => {
  try {
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
      email,
      password
    );
    console.log(
      "✅ Usuário registrado com sucesso:",
      userCredential.user.email
    );
    return userCredential.user;
  } catch (error: any) {
    console.error("❌ Erro no registro:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Faz logout do usuário atual
 */
export const logout = async (): Promise<void> => {
  try {
    await firebaseAuth.signOut();
    console.log("✅ Logout realizado com sucesso");
  } catch (error: any) {
    console.error("❌ Erro no logout:", error);
    throw new Error("Erro ao fazer logout. Tente novamente.");
  }
};

/**
 * Retorna o usuário atualmente autenticado
 */
export const getCurrentUser = (): FirebaseAuthTypes.User | null => {
  return firebaseAuth.currentUser;
};

/**
 * Observa mudanças no estado de autenticação
 */
export const onAuthChange = (
  callback: (user: FirebaseAuthTypes.User | null) => void
) => {
  return firebaseAuth.onAuthStateChanged(callback);
};

/**
 * Traduz códigos de erro do Firebase para mensagens amigáveis
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Email inválido.";
    case "auth/user-disabled":
      return "Usuário desabilitado.";
    case "auth/user-not-found":
      return "Usuário não encontrado.";
    case "auth/wrong-password":
      return "Senha incorreta.";
    case "auth/email-already-in-use":
      return "Este email já está em uso.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/operation-not-allowed":
      return "Operação não permitida.";
    case "auth/invalid-credential":
      return "Credenciais inválidas.";
    case "auth/network-request-failed":
      return "Erro de conexão. Verifique sua internet.";
    default:
      return "Erro ao autenticar. Tente novamente.";
  }
};
