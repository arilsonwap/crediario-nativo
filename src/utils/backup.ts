// ✅ Backup compatível com Expo SDK 54 + Firebase Nativo
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { firebaseStorage } from "../firebaseConfig";

/**
 * 💾 Cria um backup local do banco SQLite e abre o menu de compartilhamento.
 */
export async function backupLocal(): Promise<void> {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/crediario.db`;
    const backupPath = `${FileSystem.documentDirectory}crediario_backup.db`;

    // Verifica se o banco existe
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists) {
      throw new Error("Banco de dados não encontrado.");
    }

    // Copia o arquivo e abre o menu de compartilhamento
    await FileSystem.copyAsync({ from: dbPath, to: backupPath });
    await Sharing.shareAsync(backupPath, {
      dialogTitle: "Compartilhar backup do banco de dados",
      mimeType: "application/octet-stream",
    });

    console.log("✅ Backup local criado e compartilhado com sucesso!");
  } catch (error: any) {
    console.error("❌ Erro no backup local:", error);
    throw new Error("Falha ao gerar o backup local.");
  }
}

/**
 * ☁️ Envia o banco SQLite para o Firebase Storage (Firebase Nativo).
 */
export async function backupFirebase(userId: string): Promise<void> {
  try {
    console.log("🌐 Iniciando upload para Firebase Storage...");

    const dbPath = `${FileSystem.documentDirectory}SQLite/crediario.db`;

    // Verifica se o banco existe
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists) {
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
