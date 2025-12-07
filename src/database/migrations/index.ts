/**
 * 🔄 Sistema de migrações do banco de dados
 * Executa migrações incrementais baseadas na versão do schema
 */

import { getOne, exec } from "../core/queries";
import { txExec, txGetAll, txGetOne } from "../core/transactions";
import { formatDateTimeIso } from "../utils";
import { migrateV2 } from "./V2";
import { migrateV3 } from "./V3";

/**
 * ✅ Obtém a versão atual do schema do banco
 */
async function getSchemaVersion(): Promise<number> {
  try {
    const result = await getOne<{ version: number }>("PRAGMA user_version");
    return result?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * ✅ Define versão do schema
 * ✅ Usa tx quando dentro de transação, senão usa exec normal
 */
async function setSchemaVersion(version: number, tx?: any): Promise<void> {
  if (tx) {
    await txExec(tx, `PRAGMA user_version = ${version}`);
  } else {
    await exec(`PRAGMA user_version = ${version}`);
  }
}

/**
 * ✅ Executa migrações incrementais baseadas na versão do schema
 * Garante idempotência e evita reexecutar migrações já aplicadas
 */
export async function runMigrations(): Promise<void> {
  const currentVersion = await getSchemaVersion();
  console.log(`📋 Versão atual do schema: ${currentVersion}`);

  // ✅ Migração V2: REAL → INTEGER, datas → ISO
  if (currentVersion < 2) {
    // ✅ Verificar flag em app_settings para evitar reexecução em bases corrompidas
    const v2Flag = await getOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'migration_v2_completed'", []);
    if (v2Flag?.value === "true") {
      console.log("⚠️ Migração V2 já foi executada (flag encontrada), pulando...");
      await setSchemaVersion(2);
      return;
    }

    console.log("🔄 Executando migração V2...");
    // ✅ Envolver toda a migração em uma única transação para garantir atomicidade
    const { withTransactionAsync } = await import("../core/transactions");
    await withTransactionAsync(async (tx) => {
      await migrateV2(tx);
      await setSchemaVersion(2, tx);
      // ✅ Marcar migração V2 como concluída em app_settings
      const { txRun } = await import("../core/transactions");
      await txRun(tx, "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)", [
        "migration_v2_completed",
        "true",
        formatDateTimeIso(),
      ]);
    });
    console.log("✅ Migração V2 concluída!");
  }

  // ✅ Migração V3: Bairro → Rua → Cliente, novos campos
  if (currentVersion < 3) {
    console.log("🔄 Executando migração V3...");
    
    // ✅ CRÍTICO: Remover índices deprecated ANTES da transação
    // SQLite trava DROP INDEX durante criação de tabelas dentro de transação
    // Mover DROP INDEX para fora do tx para evitar falhas
    try {
      await exec("DROP INDEX IF EXISTS idx_clients_bairro;");
      await exec("DROP INDEX IF EXISTS idx_clients_next_charge;");
      await exec("DROP INDEX IF EXISTS idx_clients_search;");
    } catch (e) {
      // Índices podem não existir, ignorar erro
      console.log("ℹ️ Alguns índices deprecated não existiam (ok)");
    }
    
    // ✅ Envolver toda a migração em uma única transação para garantir atomicidade
    const { withTransactionAsync } = await import("../core/transactions");
    await withTransactionAsync(async (tx) => {
      await migrateV3(tx);
      await setSchemaVersion(3, tx);
    });
    console.log("✅ Migração V3 concluída!");
  }
}

/**
 * ✅ Exporta fixDatabaseStructure para compatibilidade
 * Esta função é usada pela migração V2
 */
export { migrateV2 as fixDatabaseStructure };
