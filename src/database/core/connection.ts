/**
 * 🔌 Conexão com o banco de dados SQLite
 * Gerencia a abertura e inicialização do banco
 */

import SQLite from "react-native-sqlite-storage";

// Habilita promessas no SQLite
SQLite.enablePromise(true);

let db: any = null;

/**
 * ⚠️ CRÍTICO: react-native-sqlite-storage location: "default" tem comportamento diferente:
 * 
 * Android:
 * - "default" → /data/data/<package>/databases/crediario.db
 * - "Library" → /data/data/<package>/databases/crediario.db (mesmo local)
 * 
 * iOS:
 * - "default" → ~/Library/Application Support/<bundle>/crediario.db
 * - "Library" → ~/Library/crediario.db
 * 
 * ❌ NÃO usar DocumentDirectoryPath - cria banco separado e inútil
 * O banco DEVE ficar na localização "default" do SQLite para compatibilidade
 */
export async function openDatabase() {
  if (!db) {
    db = await SQLite.openDatabase({
      name: "crediario.db",
      location: "default", // ✅ Compatível com Android e iOS (comportamento diferente mas funcional)
    });
  }
  return db;
}

export function getDatabase() {
  return db;
}

export function setDatabase(database: any) {
  db = database;
}
