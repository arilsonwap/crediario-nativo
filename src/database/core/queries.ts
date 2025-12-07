/**
 * 🔍 Funções de query do banco de dados
 * Operações básicas de leitura e escrita
 */

import { getDatabase, openDatabase } from "./connection";
import { waitForInitDB } from "./schema";

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
    console.error("❌ SQL exec error:", sql, e);
    throw e;
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
    console.error("❌ SQL run error:", sql, params, e);
    throw e;
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
    console.error("❌ SQL runAndGetId error:", sql, params, e);
    throw e;
  }
}

export async function getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    const [results] = await database.executeSql(sql, params);
    return results.rows.length > 0 ? results.rows.item(0) : null;
  } catch (e) {
    console.error("❌ SQL getOne error:", sql, params, e);
    return null;
  }
}

export async function getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    const [results] = await database.executeSql(sql, params);
    const rows: T[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(results.rows.item(i));
    }
    return rows;
  } catch (e) {
    console.error("❌ SQL getAll error:", sql, params, e);
    return [];
  }
}

// Wrapper genérico para SELECT com mapeamento automático
export async function selectMapped<T, R>(sql: string, params: any[], mapper: (row: R) => T): Promise<T[]> {
  const rows = await getAll<R>(sql, params);
  return rows.map(mapper);
}
