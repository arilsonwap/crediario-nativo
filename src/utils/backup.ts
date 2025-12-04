// ✅ Backup compatível com React Native CLI + Firebase Nativo
import RNFS from "react-native-fs";
import { Share } from "react-native";
import {
  getStorage,
  ref,
  writeToFile,
  list,
  getMetadata,
} from "@react-native-firebase/storage";

// 🧩 Tipos
export type BackupResult = {
  success: boolean;
  path?: string;
};

export type RestoreResult = {
  success: boolean;
  message?: string;
};

/**
 * 💾 Cria um backup local do banco SQLite.
 * Salva na pasta Downloads (Android) ou Documents (iOS).
 */
export async function backupLocal(): Promise<BackupResult> {
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
    const storage = getStorage();
    const fileRef = ref(storage, `backups/${userId}/${fileName}`);

    // Função auxiliar com retry (até 3 tentativas)
    // Nota: No React Native Firebase, putFile é um método do StorageReference
    const tryUpload = async (attempt = 1): Promise<void> => {
      try {
        console.log(`📤 Tentativa ${attempt}: enviando backup...`);
        // putFile é um método do StorageReference retornado por ref()
        await fileRef.putFile(dbPath);
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

/**
 * 🔄 Restaura backup local do banco SQLite.
 * ⚠️ ATENÇÃO: Esta operação substitui o banco atual. Faça backup antes!
 * @param backupPath - Caminho do arquivo de backup a ser restaurado
 * @returns Promise<RestoreResult> - Resultado da restauração
 */
export async function restoreLocal(backupPath: string): Promise<RestoreResult> {
  try {
    if (!backupPath) {
      return {
        success: false,
        message: "Caminho do backup não fornecido.",
      };
    }

    // Remove o prefixo "file://" se existir (comum em URIs)
    const cleanPath = backupPath.replace(/^file:\/\//, "");

    // Verifica se o arquivo de backup existe
    const backupExists = await RNFS.exists(cleanPath);
    if (!backupExists) {
      return {
        success: false,
        message: "Arquivo de backup não encontrado.",
      };
    }

    // Verifica se é um arquivo .db válido
    if (!cleanPath.endsWith(".db")) {
      return {
        success: false,
        message: "Arquivo inválido. Selecione um arquivo .db de backup.",
      };
    }

    // Caminho do banco atual
    const dbPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;
    const dbDir = `${RNFS.DocumentDirectoryPath}/SQLite`;

    // Garante que o diretório existe
    const dirExists = await RNFS.exists(dbDir);
    if (!dirExists) {
      await RNFS.mkdir(dbDir);
    }

    // Faz backup do banco atual antes de restaurar (segurança)
    const currentDbExists = await RNFS.exists(dbPath);
    if (currentDbExists) {
      const safetyBackupPath = `${dbDir}/crediario_safety_backup_${Date.now()}.db`;
      await RNFS.copyFile(dbPath, safetyBackupPath);
      console.log(`🛡️ Backup de segurança criado: ${safetyBackupPath}`);
    }

    // Copia o arquivo de backup para o local do banco
    await RNFS.copyFile(cleanPath, dbPath);

    // Verifica se a cópia foi bem-sucedida
    const restoreExists = await RNFS.exists(dbPath);
    if (!restoreExists) {
      return {
        success: false,
        message: "Falha ao restaurar o backup. Arquivo não foi copiado corretamente.",
      };
    }

    console.log(`✅ Backup restaurado com sucesso de: ${cleanPath}`);
    return {
      success: true,
      message: "Backup restaurado com sucesso! Reinicie o aplicativo para aplicar as mudanças.",
    };
  } catch (error: any) {
    console.error("❌ Erro ao restaurar backup local:", error);
    return {
      success: false,
      message: error?.message || "Falha ao restaurar backup local.",
    };
  }
}

/**
 * ☁️ Restaura backup do Firebase Storage.
 * ⚠️ ATENÇÃO: Esta operação substitui o banco atual. Faça backup antes!
 * @param userId - ID do usuário para buscar o backup
 * @param backupFileName - Nome do arquivo de backup (opcional, usa o mais recente se não fornecido)
 * @returns Promise<RestoreResult> - Resultado da restauração
 */
export async function restoreFirebase(userId: string, backupFileName?: string): Promise<RestoreResult> {
  try {
    if (!userId) {
      return {
        success: false,
        message: "ID do usuário não fornecido.",
      };
    }

    console.log("🌐 Iniciando download do backup do Firebase Storage...");

    const storage = getStorage();
    const baseRef = ref(storage, `backups/${userId}`);

    let fileRef;
    if (backupFileName) {
      // Usa o arquivo específico fornecido
      fileRef = ref(storage, `backups/${userId}/${backupFileName}`);
    } else {
      // Lista todos os backups e pega o mais recente
      const listResult = await list(baseRef);
      if (listResult.items.length === 0) {
        return {
          success: false,
          message: "Nenhum backup encontrado na nuvem.",
        };
      }

      // Ordena por data de modificação (mais recente primeiro)
      const filesWithMetadata = await Promise.all(
        listResult.items.map(async (item) => {
          const metadata = await getMetadata(item);
          return {
            name: item.name,
            time: new Date(metadata.timeCreated).getTime(),
            item,
          };
        })
      );

      filesWithMetadata.sort((a, b) => {
        return b.time - a.time; // Mais recente primeiro
      });

      fileRef = filesWithMetadata[0].item;
      console.log(`📥 Usando backup mais recente: ${filesWithMetadata[0].name}`);
    }

    // Caminho temporário para download
    const tempPath = `${RNFS.CachesDirectoryPath}/restore_${Date.now()}.db`;
    const dbPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;
    const dbDir = `${RNFS.DocumentDirectoryPath}/SQLite`;

    // Garante que o diretório existe
    const dirExists = await RNFS.exists(dbDir);
    if (!dirExists) {
      await RNFS.mkdir(dbDir);
    }

    // Faz backup do banco atual antes de restaurar (segurança)
    const currentDbExists = await RNFS.exists(dbPath);
    if (currentDbExists) {
      const safetyBackupPath = `${dbDir}/crediario_safety_backup_${Date.now()}.db`;
      await RNFS.copyFile(dbPath, safetyBackupPath);
      console.log(`🛡️ Backup de segurança criado: ${safetyBackupPath}`);
    }

    // Faz download do backup do Firebase
    console.log("📥 Baixando backup do Firebase...");
    await writeToFile(fileRef, tempPath);

    // Verifica se o download foi bem-sucedido
    const downloadExists = await RNFS.exists(tempPath);
    if (!downloadExists) {
      return {
        success: false,
        message: "Falha ao baixar backup do Firebase.",
      };
    }

    // Copia o arquivo baixado para o local do banco
    await RNFS.copyFile(tempPath, dbPath);

    // Remove arquivo temporário
    await RNFS.unlink(tempPath).catch(() => {
      // Ignora erro se não conseguir remover
    });

    // Verifica se a cópia foi bem-sucedida
    const restoreExists = await RNFS.exists(dbPath);
    if (!restoreExists) {
      return {
        success: false,
        message: "Falha ao restaurar o backup. Arquivo não foi copiado corretamente.",
      };
    }

    console.log("✅ Backup do Firebase restaurado com sucesso!");
    return {
      success: true,
      message: "Backup da nuvem restaurado com sucesso! Reinicie o aplicativo para aplicar as mudanças.",
    };
  } catch (error: any) {
    console.error("❌ Erro ao restaurar backup do Firebase:", error);
    
    let errorMessage = "Falha ao restaurar backup da nuvem.";
    if (error?.code === "storage/object-not-found") {
      errorMessage = "Backup não encontrado na nuvem.";
    } else if (error?.code === "storage/unauthorized") {
      errorMessage = "Sem permissão para acessar o backup na nuvem.";
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}