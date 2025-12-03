import RNFS from "react-native-fs";
import { Alert } from "react-native";
import { getAllClients, initDB, addClient, deleteClient } from "../database/db";

// ✅ Caminho do backup
const BACKUP_FILE = `${RNFS.DocumentDirectoryPath}/backup_crediario.json`;

/**
 * 🔹 Cria um backup completo (estrutura + dados)
 */
export async function createBackup(): Promise<void> {
  try {
    initDB();
    const clients = getAllClients();

    const tableStructure = `
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        bairro TEXT,
        numero TEXT,
        referencia TEXT,
        telefone TEXT,
        next_charge TEXT,
        paid REAL DEFAULT 0
      );
    `;

    const backupData = {
      version: 1,
      created_at: new Date().toISOString(),
      structure: tableStructure,
      data: clients,
    };

    await RNFS.writeFile(
      BACKUP_FILE,
      JSON.stringify(backupData, null, 2),
      'utf8'
    );

    Alert.alert("✅ Backup criado com sucesso!", `Arquivo salvo em:\n${BACKUP_FILE}`);
  } catch (error) {
    console.error("Erro ao criar backup:", error);
    Alert.alert("❌ Erro", "Não foi possível criar o backup.");
  }
}

/**
 * 🔹 Restaura o banco a partir do backup existente
 */
export async function restoreBackup(): Promise<void> {
  try {
    const fileExists = await RNFS.exists(BACKUP_FILE);

    if (!fileExists) {
      Alert.alert("⚠️ Nenhum backup encontrado!");
      return;
    }

    const content = await RNFS.readFile(BACKUP_FILE, 'utf8');

    const backupData = JSON.parse(content);

    initDB();

    // Remove dados antigos
    const existing = getAllClients();
    for (const client of existing) {
      deleteClient(client.id ?? 0);
    }

    // Reinsere dados do backup
    for (const c of backupData.data) {
      addClient({
        name: c.name,
        value: c.value,
        bairro: c.bairro,
        numero: c.numero,
        referencia: c.referencia,
        telefone: c.telefone,
        next_charge: c.next_charge,
        paid: c.paid,
      });
    }

    Alert.alert("✅ Backup restaurado com sucesso!");
  } catch (error) {
    console.error("Erro ao restaurar backup:", error);
    Alert.alert("❌ Erro", "Não foi possível restaurar o backup.");
  }
}

/**
 * 🔹 Exclui o backup existente
 */
export async function deleteBackup(): Promise<void> {
  try {
    const fileExists = await RNFS.exists(BACKUP_FILE);
    if (fileExists) {
      await RNFS.unlink(BACKUP_FILE);
      Alert.alert("🗑️ Backup removido com sucesso!");
    } else {
      Alert.alert("⚠️ Nenhum backup para excluir.");
    }
  } catch (error) {
    console.error("Erro ao excluir backup:", error);
    Alert.alert("❌ Erro", "Não foi possível excluir o backup.");
  }
}

/**
 * 🔹 Verifica se há backup existente
 */
export async function checkBackupExists(): Promise<boolean> {
  return await RNFS.exists(BACKUP_FILE);
}
