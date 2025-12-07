/**
 * 🔍 Suporte FTS5 (Full-Text Search) opcional
 * Melhora performance de buscas em dispositivos compatíveis
 * SQLite FTS5 requer versão >= 3.9.0
 */

import { exec, getOne } from "./queries";
import { waitForInitDB } from "./schema";

let fts5Available: boolean | null = null;

/**
 * ✅ Verifica se FTS5 está disponível no SQLite
 * ✅ Usa transação para garantir que tabela de teste seja sempre removida
 */
export async function isFTS5Available(): Promise<boolean> {
  if (fts5Available !== null) {
    return fts5Available;
  }

  try {
    await waitForInitDB();
    
    // ✅ Usar transação para garantir atomicidade e limpeza
    // Garante que tabela _fts5_test seja SEMPRE removida mesmo em caso de erro
    const { withTransactionAsync, txExec } = await import("./transactions");
    
    await withTransactionAsync(async (tx) => {
      // ✅ Tentar criar tabela FTS5 de teste dentro da transação
      await txExec(tx, `CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(test);`);
      // ✅ Remover tabela de teste dentro da mesma transação
      await txExec(tx, `DROP TABLE IF EXISTS _fts5_test;`);
    });
    
    fts5Available = true;
    console.log("✅ FTS5 disponível - buscas full-text serão otimizadas");
    return true;
  } catch (error) {
    fts5Available = false;
    console.warn("⚠️ FTS5 não disponível - usando buscas LIKE padrão");
    return false;
  }
}

/**
 * ✅ Cria tabela FTS5 para clientes (se disponível)
 */
export async function createClientsFTS5(): Promise<boolean> {
  if (!(await isFTS5Available())) {
    return false;
  }

  try {
    await waitForInitDB();
    
    // ✅ Verificar se tabela já existe
    const exists = await getOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='clients_fts'",
      []
    );

    if (exists) {
      console.log("ℹ️ Tabela clients_fts já existe");
      return true;
    }

    // ✅ Criar tabela FTS5 vinculada à tabela clients
    await exec(`
      CREATE VIRTUAL TABLE clients_fts USING fts5(
        name,
        telefone,
        referencia,
        content='clients',
        content_rowid='id'
      );
    `);

    // ✅ Popular tabela FTS5 com dados existentes
    await exec(`
      INSERT INTO clients_fts(rowid, name, telefone, referencia)
      SELECT id, name, telefone, referencia FROM clients;
    `);

    // ✅ Criar triggers para manter FTS5 sincronizado
    await exec(`
      CREATE TRIGGER IF NOT EXISTS clients_fts_insert AFTER INSERT ON clients BEGIN
        INSERT INTO clients_fts(rowid, name, telefone, referencia)
        VALUES (new.id, new.name, new.telefone, new.referencia);
      END;
    `);

    await exec(`
      CREATE TRIGGER IF NOT EXISTS clients_fts_update AFTER UPDATE ON clients BEGIN
        UPDATE clients_fts SET
          name = new.name,
          telefone = new.telefone,
          referencia = new.referencia
        WHERE rowid = new.id;
      END;
    `);

    await exec(`
      CREATE TRIGGER IF NOT EXISTS clients_fts_delete AFTER DELETE ON clients BEGIN
        DELETE FROM clients_fts WHERE rowid = old.id;
      END;
    `);

    console.log("✅ Tabela FTS5 criada e sincronizada");
    return true;
  } catch (error) {
    console.error("❌ Erro ao criar tabela FTS5:", error);
    return false;
  }
}

/**
 * ✅ Busca usando FTS5 (se disponível) ou fallback para LIKE
 */
export async function searchClientsFTS5(query: string): Promise<number[]> {
  if (!(await isFTS5Available())) {
    return []; // Fallback para busca LIKE padrão
  }

  try {
    await waitForInitDB();
    
    // ✅ Sanitizar query para FTS5 (remover caracteres especiais que podem causar erro)
    // FTS5 usa sintaxe especial, então precisamos escapar caracteres problemáticos
    const sanitized = query.trim().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
    
    if (!sanitized || sanitized.length === 0) {
      return [];
    }
    
    // ✅ Usar getAll em vez de getOne com group_concat para evitar limite de 1MB
    // Isso também evita problemas com group_concat em bases grandes
    const { getAll } = await import("./queries");
    const results = await getAll<{ rowid: number }>(
      `SELECT rowid FROM clients_fts 
       WHERE clients_fts MATCH ? 
       LIMIT 100`,
      [sanitized]
    );

    if (!results || results.length === 0) {
      return [];
    }

    // ✅ Converter para array de IDs
    return results.map(r => r.rowid).filter(id => !isNaN(id) && id > 0);
  } catch (error) {
    console.warn("⚠️ Erro na busca FTS5, usando fallback:", error);
    return []; // Fallback para busca LIKE padrão
  }
}

