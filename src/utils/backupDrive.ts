import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

// 🔐 Constantes principais
const TOKEN_KEY = "@google_access_token";
const CLIENT_ID =
  "367980910760-r6nnr9kfqjka3v7jgi437spo6j4bqvcr.apps.googleusercontent.com";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

/**
 * 🔑 Faz login com o Google e retorna o token de acesso.
 * Inclui cache local (AsyncStorage) e validação do token antes de reutilizar.
 */
async function signInWithGoogle(): Promise<string | null> {
  try {
    // Verifica se já existe um token salvo e ainda válido
    const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      const isValid = await validateToken(savedToken);
      if (isValid) {
        console.log("🔐 Token reutilizado do armazenamento local.");
        return savedToken;
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
        console.log("⚠️ Token expirado — será solicitado novo login.");
      }
    }

    // Cria URL e redirecionamento
    const redirectUri = AuthSession.makeRedirectUri({ scheme: "crediario" });
    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      `response_type=token&client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(SCOPES.join(" "))}`;

    console.log("🌐 Abrindo navegador de login Google...");
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === "success" && result.url.includes("access_token=")) {
      const token = new URL(result.url).hash
        .split("&")
        .find((s) => s.startsWith("access_token="))
        ?.split("=")[1];

      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        console.log("✅ Login Google bem-sucedido!");
        return token;
      }
    }

    console.warn("⚠️ Login cancelado ou falhou:", result.type);
    return null;
  } catch (err) {
    console.error("❌ Erro durante login no Google:", err);
    return null;
  }
}

/**
 * 🧩 Valida se o token ainda está ativo (sem precisar novo login).
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * ☁️ Faz backup do banco SQLite no Google Drive (pasta AppDataFolder).
 */
export async function backupToDrive(): Promise<void> {
  try {
    console.log("📂 Iniciando backup para o Google Drive...");
    const token = await signInWithGoogle();
    if (!token) throw new Error("Falha ao autenticar no Google.");

    const dbPath = `${FileSystem.documentDirectory}SQLite/crediario.db`;
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists) throw new Error("Banco de dados não encontrado.");

    console.log("📄 Lendo banco de dados...");
    const base64 = await FileSystem.readAsStringAsync(dbPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Cria metadados e payload para envio multipart
    console.log("🧩 Preparando upload...");
    const metadata = {
      name: `crediario_${new Date().toISOString().replace(/[:.]/g, "-")}.db`,
      mimeType: "application/octet-stream",
      parents: ["appDataFolder"],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append(
      "file",
      new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
        type: "application/octet-stream",
      })
    );

    // Faz upload para o Google Drive
    console.log("🚀 Enviando arquivo para o Google Drive...");
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro HTTP ${res.status}: ${errText}`);
    }

    console.log("✅ Backup enviado com sucesso para o Google Drive!");
  } catch (error: any) {
    console.error("❌ Erro no backup do Drive:", error.message);
    throw new Error("Falha ao enviar backup para o Google Drive.");
  }
}
