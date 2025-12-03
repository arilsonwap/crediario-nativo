// ✅ Backup compatível com React Native CLI + Firebase Nativo
import RNFS from "react-native-fs";
import { Share } from "react-native";
import { firebaseStorage } from "../firebaseConfig";

/**
 * 💾 Cria um backup local do banco SQLite.
 * Salva na pasta Downloads (Android) ou Documents (iOS).
 */
export async function backupLocal(): Promise<{ success: boolean; path?: string }> {
  try {
    const dbPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;

    // Verifica se o banco existe
    const fileExists = await RNFS.exists(dbPath);
    if (!fileExists) {
      throw new Error("Banco de dados não encontrado.");
    }

    // Nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const fileName = `crediario_backup_${timestamp}.db`;

    // Salva na pasta Downloads (Android) ou pasta acessível (iOS)
    const destPath = `${RNFS.DownloadDirectoryPath || RNFS.DocumentDirectoryPath}/${fileName}`;
    await RNFS.copyFile(dbPath, destPath);

    console.log(`✅ Backup salvo em: ${destPath}`);
    return { success: true, path: destPath };
  } catch (error: any) {
    console.error("❌ Erro no backup local:", error);
    throw new Error("Falha ao gerar o backup local.");
  }
}

/**
 * 📤 Compartilha o último backup criado via Share API.
 * Permite enviar por WhatsApp, Drive, Email, etc.
 */
export async function shareBackup(backupPath: string): Promise<void> {
  try {
    await Share.share({
      title: "Compartilhar backup",
      message: "Backup do Crediário",
      url: `file://${backupPath}`,
    });
  } catch (error: any) {
    console.error("❌ Erro ao compartilhar backup:", error);
    throw new Error("Falha ao compartilhar backup.");
  }
}

/**
 * ☁️ Envia o banco SQLite para o Firebase Storage (Firebase Nativo).
 */
export async function backupFirebase(userId: string): Promise<void> {
  try {
    console.log("🌐 Iniciando upload para Firebase Storage...");

    const dbPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;

    // Verifica se o banco existe
    const fileExists = await RNFS.exists(dbPath);
    if (!fileExists) {
      throw new Error("Banco de dados não encontrado.");
    }

    console.log("📄 Lendo banco de dados...");
    const fileName = `crediario_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.db`;
    const storageRef = firebaseStorage.ref(`backups/${userId}/${fileName}`);

    // Função auxiliar com retry (até 3 tentativas)
    const tryUpload = async (attempt = 1): Promise<void> => {
      try {
        console.log(`📤 Tentativa ${attempt}: enviando backup...`);
        await storageRef.putFile(dbPath);
        console.log("✅ Upload concluído com sucesso!");
      } catch (err) {
        console.error(`🚨 Falha durante upload (tentativa ${attempt}):`, err);
        if (attempt < 3) {
          console.log("⏳ Re-tentando em 3 segundos...");
          await new Promise((res) => setTimeout(res, 3000));
          await tryUpload(attempt + 1);
        } else {
          throw err;
        }
      }
    };

    await tryUpload();
    console.log("✅ Backup enviado com sucesso para o Firebase Storage!");
  } catch (error: any) {
    console.error("❌ Falha ao enviar backup Firebase:", error);
    throw new Error("Falha ao enviar backup para o Firebase.");
  }
}