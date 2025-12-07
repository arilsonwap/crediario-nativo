/**
 * 🔍 Funções de query do banco de dados
 * Operações básicas de leitura e escrita
 */

import { getDatabase, openDatabase } from "./connection";
import { waitForInitDB } from "./schema";

// ============================================================
// 🔒 Tipos de Erro do Banco de Dados
// ============================================================

/**
 * ✅ Erro tipado do banco de dados com contexto completo
 */
export interface DatabaseError extends Error {
  code?: string;
  sql?: string;
  params?: any[];
  originalError?: any;
}

/**
 * ✅ Categoriza e enriquece erros do banco de dados
 * Adiciona contexto SQL, parâmetros e código de erro para facilitar debug
 */
function categorizeError(error: any, sql: string, params: any[]): DatabaseError {
  const dbError: DatabaseError = error instanceof Error ? error : new Error(String(error));
  
  // ✅ Limitar tamanho do SQL para logs (primeiros 200 caracteres)
  dbError.sql = sql.substring(0, 200);
  dbError.params = params;
  dbError.originalError = error;
  
  // ✅ Extrair código de erro SQLite se disponível
  if (error?.code) {
    dbError.code = error.code;
  } else if (error?.message) {
    // Tentar extrair código de mensagens como "SQLITE_CONSTRAINT: ..."
    const codeMatch = error.message.match(/SQLITE_(\w+)/);
    if (codeMatch) {
      dbError.code = codeMatch[1];
    }
  }
  
  return dbError;
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    const results = await new Promise<any>((resolve, reject) => {
      database.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`,
        [tableName],
        (_: any, result: any) => resolve(result),
        (_: any, error: any) => reject(error)
      );
    });
    return results.rows.length > 0;
  } catch {
    return false;
  }
}

export { tableExists };

// ============================================================
// 🔒 Helpers de Banco (seguro contra SQL injection)
// ============================================================
export async function exec(sql: string): Promise<void> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    await database.executeSql(sql, []);
  } catch (e) {
    const error = categorizeError(e, sql, []);
    console.error("❌ SQL exec error:", error.code || "UNKNOWN", error.sql, error.message);
    throw error;
  }
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    await database.executeSql(sql, params);
  } catch (e) {
    const error = categorizeError(e, sql, params);
    console.error("❌ SQL run error:", error.code || "UNKNOWN", error.sql, params, error.message);
    throw error;
  }
}

export async function runAndGetId(sql: string, params: any[] = []): Promise<number> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    await database.executeSql(sql, params);
    const result = await getOne<{ id: number }>("SELECT last_insert_rowid() as id");
    return result?.id ?? 0;
  } catch (e) {
    const error = categorizeError(e, sql, params);
    console.error("❌ SQL runAndGetId error:", error.code || "UNKNOWN", error.sql, params, error.message);
    throw error;
  }
}

export async function getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    const [results] = await database.executeSql(sql, params);
    // ✅ Retornar null apenas quando realmente não encontrou (sucesso, mas sem resultados)
    return results.rows.length > 0 ? results.rows.item(0) : null;
  } catch (e) {
    const error = categorizeError(e, sql, params);
    console.error("❌ SQL getOne error:", error.code || "UNKNOWN", error.sql, params, error.message);
    // ✅ Re-lançar erro tipado para que chamador possa tratar
    // Diferenciar entre "não encontrado" (null) e "erro" (throw)
    throw error;
  }
}

export async function getAll<T>(sql: string, params: any[] = [], maxRows: number = 10000): Promise<T[]> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    
    // ✅ Adicionar LIMIT se não houver e query não tiver limite explícito
    const hasLimit = /LIMIT\s+\d+/i.test(sql);
    const finalSql = hasLimit ? sql : `${sql} LIMIT ${maxRows}`;
    
    const [results] = await database.executeSql(finalSql, params);
    const rows: T[] = [];
    const limit = Math.min(results.rows.length, maxRows);
    
    for (let i = 0; i < limit; i++) {
      rows.push(results.rows.item(i));
    }
    
    if (results.rows.length > maxRows) {
      console.warn(`⚠️ getAll retornou ${results.rows.length} linhas, limitado a ${maxRows}. SQL: ${sql.substring(0, 100)}`);
    }
    
    // ✅ Retornar array vazio apenas quando realmente não encontrou (sucesso, mas sem resultados)
    return rows;
  } catch (e) {
    const error = categorizeError(e, sql, params);
    console.error("❌ SQL getAll error:", error.code || "UNKNOWN", error.sql, params, error.message);
    // ✅ Re-lançar erro tipado em vez de retornar array vazio
    throw error;
  }
}

// Wrapper genérico para SELECT com mapeamento automático
export async function selectMapped<T, R>(sql: string, params: any[], mapper: (row: R) => T): Promise<T[]> {
  const rows = await getAll<R>(sql, params);
  return rows.map(mapper);
}
