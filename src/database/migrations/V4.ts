/**
 * 🔄 Migração V4: Adiciona coluna ultimaVisita
 * Adiciona coluna para rastrear última visita do cliente
 */

import { txExec, txGetAll } from "../core/transactions";

/**
 * ✅ Migração V4: Adiciona coluna ultimaVisita se não existir
 */
export async function migrateV4(tx: any): Promise<void> {
  try {
    // ✅ Verificar se coluna já existe
    const clientsColsRaw = await txGetAll<any>(tx, "PRAGMA table_info(clients)", []);
    if (!Array.isArray(clientsColsRaw)) {
      console.warn("⚠️ Não foi possível verificar colunas de clients, pulando migração V4");
      return;
    }
    
    const clientsCols = clientsColsRaw.map((c: any) => c.name);
    
    // ✅ Adicionar coluna ultimaVisita se não existir
    if (!clientsCols.includes("ultimaVisita")) {
      await txExec(tx, `
        ALTER TABLE clients 
        ADD COLUMN ultimaVisita TEXT 
        CHECK (ultimaVisita IS NULL OR ultimaVisita GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*');
      `);
      console.log("✅ Coluna ultimaVisita adicionada");
    } else {
      console.log("ℹ️ Coluna ultimaVisita já existe");
    }
    
  } catch (error) {
    console.error("❌ Erro na migração V4:", error);
    throw error;
  }
}
