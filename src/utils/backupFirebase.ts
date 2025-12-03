// ============================================================
// 🔥 Backup Firebase Storage - Firebase Nativo
// ============================================================
import { firebaseStorage } from "../firebaseConfig";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";

/**
 * 📤 Faz upload do backup local para o Firebase Storage
 */
export async function uploadBackupToFirebase(uid: string): Promise<void> {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/crediario.db`;

    // Verifica se o arquivo existe
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists) {
      Alert.alert("Erro", "Nenhum backup local encontrado.");
      return;
    }

    const fileName = `backup_${Date.now()}.db`;
    const storageRef = firebaseStorage.ref(`backups/${uid}/${fileName}`);

    console.log("📤 Enviando backup para Firebase Storage...");
    await storageRef.putFile(dbPath);
    console.log("✅ Backup enviado com sucesso!");

    Alert.alert("Sucesso", "Backup enviado para a nuvem!");
  } catch (error: any) {
    console.error("❌ Erro ao enviar backup:", error);
    Alert.alert("Erro", "Falha ao enviar backup para a nuvem.");
  }
}

/**
 * 📋 Lista todos os backups disponíveis no Firebase Storage
 */
export async function listBackupsFromFirebase(
  uid: string
): Promise<{ name: string; url: string; createdAt: string }[]> {
  try {
    const storageRef = firebaseStorage.ref(`backups/${uid}`);
    const result = await storageRef.listAll();

    const backups = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await itemRef.getDownloadURL();
        const metadata = await itemRef.getMetadata();
        return {
          name: itemRef.name,
          url,
          createdAt: metadata.timeCreated || "",
        };
      })
    );

    console.log(`✅ ${backups.length} backups encontrados.`);
    return backups;
  } catch (error: any) {
    console.error("❌ Erro ao listar backups:", error);
    Alert.alert("Erro", "Falha ao listar backups.");
    return [];
  }
}

/**
 * 📥 Baixa e restaura um backup do Firebase Storage
 */
export async function downloadBackupFromFirebase(
  uid: string,
  fileName: string
): Promise<void> {
  try {
    const storageRef = firebaseStorage.ref(`backups/${uid}/${fileName}`);
    const downloadUrl = await storageRef.getDownloadURL();

    const localPath = `${FileSystem.documentDirectory}SQLite/crediario.db`;

    console.log("📥 Baixando backup do Firebase Storage...");
    await FileSystem.downloadAsync(downloadUrl, localPath);
    console.log("✅ Backup restaurado com sucesso!");

    Alert.alert(
      "Sucesso",
      "Backup restaurado! Reinicie o app para aplicar as mudanças."
    );
  } catch (error: any) {
    console.error("❌ Erro ao restaurar backup:", error);
    Alert.alert("Erro", "Falha ao restaurar backup.");
  }
}

/**
 * 🗑️ Deleta um backup do Firebase Storage
 */
export async function deleteBackupFromFirebase(
  uid: string,
  fileName: string
): Promise<void> {
  try {
    const storageRef = firebaseStorage.ref(`backups/${uid}/${fileName}`);

    console.log("🗑️ Deletando backup do Firebase Storage...");
    await storageRef.delete();
    console.log("✅ Backup deletado com sucesso!");

    Alert.alert("Sucesso", "Backup deletado.");
  } catch (error: any) {
    console.error("❌ Erro ao deletar backup:", error);
    Alert.alert("Erro", "Falha ao deletar backup.");
  }
}
