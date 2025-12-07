/**
 * 💾 Serviço de Backup
 * Gerencia criação e exportação de backups do banco de dados
 */

import RNFS from "react-native-fs";
import { Share } from "react-native";
import { exec } from "../core/queries";
import { getAllClientsFull } from "../repositories/clientsRepo";
import { getAllBairros } from "../repositories/bairroRepo";
import { getAllRuas } from "../repositories/ruaRepo";
import { getAll } from "../core/queries";
import type { PaymentDB, Log } from "../types";

/**
 * ⚠️ NOTA: No Android, o banco está em /data/data/<package>/databases/crediario.db
 * Esse caminho não é acessível diretamente via RNFS sem permissões root.
 * 
 * Solução alternativa: Exportar dados via SQL e salvar em JSON
 * 
 * ⚠️ ATENÇÃO: Backup pode ultrapassar 10MB em bases grandes
 */
export const createBackup = async (): Promise<string> => {
  try {
    // ✅ CRÍTICO: Fazer checkpoint do WAL antes do backup
    await exec("PRAGMA wal_checkpoint(FULL);");
    console.log("✅ Checkpoint WAL executado antes do backup");

    // ✅ Usar DocumentDirectoryPath SEMPRE (Android 13+ requer SAF para DownloadDirectoryPath)
    const timestamp = Date.now();
    const backupPath = `${RNFS.DocumentDirectoryPath}/crediario_backup_${timestamp}.json`;
    
    // Exportar todos os dados
    const clients = await getAllClientsFull();
    const payments = await getAll<PaymentDB>("SELECT * FROM payments ORDER BY id ASC", []);
    const logs = await getAll<Log>("SELECT * FROM logs ORDER BY id ASC", []);
    const bairros = await getAllBairros();
    const ruas = await getAllRuas();

    const backupData = {
      version: 3,
      timestamp,
      clients,
      payments,
      logs,
      bairros,
      ruas,
    };

    // ✅ CRÍTICO: Serializar JSON de forma não-bloqueante
    const jsonContent = await new Promise<string>((resolve, reject) => {
      try {
        let result: string;
        try {
          result = JSON.stringify(backupData);
        } catch (stringifyError) {
          reject(new Error(`Erro ao serializar backup: ${stringifyError}`));
          return;
        }
        
        // ✅ Para strings pequenas (<5MB), retornar imediatamente
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
        if (result.length < CHUNK_SIZE) {
          resolve(result);
          return;
        }
        
        // ✅ Para strings grandes, processar em chunks assíncronos
        let processed = "";
        let offset = 0;
        
        const processChunk = () => {
          if (offset >= result.length) {
            resolve(processed);
            return;
          }
          
          const chunk = result.slice(offset, offset + CHUNK_SIZE);
          processed += chunk;
          offset += CHUNK_SIZE;
          
          // ✅ Usar setImmediate para não bloquear thread principal
          setImmediate(processChunk);
        };
        
        processChunk();
      } catch (error) {
        reject(error);
      }
    });
    
    const fileSizeMB = (new Blob([jsonContent]).size / (1024 * 1024)).toFixed(2);
    
    // ✅ CRÍTICO: Verificar tamanho do backup antes de salvar
    const MAX_BACKUP_SIZE_MB = 10;
    const fileSize = parseFloat(fileSizeMB);
    
    if (fileSize > MAX_BACKUP_SIZE_MB) {
      console.warn(
        `⚠️ Backup muito grande (${fileSizeMB}MB). ` +
        `Share pode falhar no Android. ` +
        `Considere limpar logs antigos ou dividir o backup.`
      );
    }
    
    await RNFS.writeFile(backupPath, jsonContent, "utf8");
    console.log(`✅ Backup criado: ${fileSizeMB}MB`);

    // ✅ Usar Share que autoriza acesso temporário ao arquivo
    try {
      await Share.share({
        title: "Backup do Crediário",
        message: `Backup criado em ${new Date(timestamp).toLocaleString("pt-BR")} (${fileSizeMB}MB)`,
        url: `file://${backupPath}`,
      });
    } catch (shareError) {
      console.warn(`⚠️ Erro ao compartilhar backup (${fileSizeMB}MB):`, shareError);
      console.warn("💡 Dica: Arquivo salvo em:", backupPath);
    }

    return backupPath;
  } catch (error) {
    console.error("❌ Erro ao criar backup:", error);
    throw error;
  }
};
