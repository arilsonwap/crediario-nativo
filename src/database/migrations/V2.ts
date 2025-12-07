/**
 * 🔄 Migração V2: REAL → INTEGER, datas → ISO
 * Converte valores monetários de REAL para INTEGER (centavos)
 * Normaliza datas para formato ISO
 */

import { txExec, txGetAll } from "../core/transactions";
import { tableExists } from "../core/queries";

/**
 * ✅ Migração V2: REAL → INTEGER, datas → ISO
 * ✅ Usa tx diretamente para evitar transações duplicadas
 */
export async function migrateV2(tx: any): Promise<void> {
  const clientsExists = await tableExists("clients");
  if (!clientsExists) return;

  const clientsColsRaw = await txGetAll<any>(tx, "PRAGMA table_info(clients)", []);
  if (!Array.isArray(clientsColsRaw)) {
    console.error("⚠️ PRAGMA table_info retornou valor inválido");
    return;
  }

  const clientsCols = clientsColsRaw.map((c) => c.name);
  const needsMigration = clientsCols.includes("value") && !clientsCols.includes("value_cents");

  if (needsMigration) {
    console.log("🔄 Migrando banco para V2 (REAL → INTEGER, datas → ISO)");

    try {
      // ⚠️ CRÍTICO: Desabilitar foreign keys ANTES de qualquer alteração
      await txExec(tx, "PRAGMA foreign_keys=off;");

      // Migrar CLIENTS
      await txExec(tx, `
        CREATE TABLE clients_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value_cents INTEGER NOT NULL,
          bairro TEXT,
          numero TEXT,
          referencia TEXT,
          telefone TEXT,
          next_charge TEXT,
          paid_cents INTEGER DEFAULT 0
        );
      `);

      // ✅ Detectar se value/paid são REAL ou INTEGER (idempotência)
      const hasValueReal = clientsCols.includes("value") && !clientsCols.includes("value_cents");
      const hasPaidReal = clientsCols.includes("paid") && !clientsCols.includes("paid_cents");

      const valueExpr = hasValueReal ? "CAST(ROUND(value * 100) AS INTEGER)" : "value_cents";
      const paidExpr = hasPaidReal ? "CAST(ROUND(COALESCE(paid, 0) * 100) AS INTEGER)" : "paid_cents";

      await txExec(tx, `
        INSERT INTO clients_new (id, name, value_cents, bairro, numero, referencia, telefone, next_charge, paid_cents)
        SELECT
          id,
          name,
          ${valueExpr},
          bairro,
          numero,
          referencia,
          telefone,
          next_charge,
          ${paidExpr}
        FROM clients;
      `);

      // Migrar PAYMENTS (se existir)
      const paymentsExists = await tableExists("payments");
      if (paymentsExists) {
        try {
          await txExec(tx, `
            CREATE TABLE payments_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              client_id INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              value_cents INTEGER NOT NULL,
              FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            );
          `);

          const paymentsColsRaw = await txGetAll<any>(tx, "PRAGMA table_info(payments)", []);
          if (!Array.isArray(paymentsColsRaw)) {
            console.warn("⚠️ PRAGMA table_info(payments) retornou valor inválido, pulando migração");
            await txExec(tx, "DROP TABLE IF EXISTS payments_new;");
            return;
          }

          const paymentsCols = paymentsColsRaw.map((c) => c.name);

          // ✅ Validação robusta de colunas
          if (paymentsCols.length === 0) {
            console.warn("⚠️ PRAGMA table_info(payments) retornou vazio, pulando migração de payments");
            await txExec(tx, "DROP TABLE payments_new;");
          } else {
            const useClientId = paymentsCols.includes("client_id") ? "client_id" : "clientId";
            const useData = paymentsCols.includes("data") ? "data" : "created_at";
            const useValorCol = paymentsCols.includes("valor") ? "valor" : "value_cents";
            const isValorReal = useValorCol === "valor";

            // Verificar se as colunas necessárias existem
            const hasRequiredCols = paymentsCols.includes(useClientId) &&
                                   paymentsCols.includes(useData) &&
                                   paymentsCols.includes(useValorCol);

            if (!hasRequiredCols) {
              console.warn("⚠️ Colunas esperadas não encontradas em payments, pulando migração:", paymentsCols);
              await txExec(tx, "DROP TABLE IF EXISTS payments_new;");
            } else {
              // ✅ Só multiplicar por 100 se REAL, se já é INTEGER apenas copiar
              const valueExpression = isValorReal
                ? "CAST(ROUND(valor * 100) AS INTEGER)"  // REAL → centavos
                : "value_cents";                          // já está em centavos

              await txExec(tx, `
                INSERT INTO payments_new (id, client_id, created_at, value_cents)
                SELECT
                  id,
                  ${useClientId},
                  ${useData},
                  ${valueExpression}
                FROM payments;
              `);

              await txExec(tx, "DROP TABLE payments;");
              await txExec(tx, "ALTER TABLE payments_new RENAME TO payments;");
            }
          }
        } catch (e) {
          console.error("❌ Erro ao migrar payments:", e);
          // Tentar limpar payments_new se foi criado
          try { await txExec(tx, "DROP TABLE IF EXISTS payments_new;"); } catch {}
          throw e;
        }
      }

      // Migrar LOGS (se existir)
      const logsExists = await tableExists("logs");
      if (logsExists) {
        try {
          await txExec(tx, `
            CREATE TABLE logs_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              clientId INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              descricao TEXT NOT NULL,
              FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
            );
          `);

          const logsColsRaw = await txGetAll<any>(tx, "PRAGMA table_info(logs)", []);
          if (!Array.isArray(logsColsRaw)) {
            console.warn("⚠️ PRAGMA table_info(logs) retornou valor inválido, pulando migração");
            await txExec(tx, "DROP TABLE IF EXISTS logs_new;");
            return;
          }

          const logsCols = logsColsRaw.map((c) => c.name);

          // ✅ Validação robusta de colunas
          if (logsCols.length === 0) {
            console.warn("⚠️ PRAGMA table_info(logs) retornou vazio, pulando migração de logs");
            await txExec(tx, "DROP TABLE logs_new;");
          } else {
            const useData = logsCols.includes("data") ? "data" : "created_at";

            // Verificar se as colunas necessárias existem
            const hasRequiredCols = logsCols.includes("clientId") &&
                                   logsCols.includes(useData) &&
                                   logsCols.includes("descricao");

            if (!hasRequiredCols) {
              console.warn("⚠️ Colunas esperadas não encontradas em logs, pulando migração:", logsCols);
              await txExec(tx, "DROP TABLE IF EXISTS logs_new;");
            } else {
              await txExec(tx, `
                INSERT INTO logs_new (id, clientId, created_at, descricao)
                SELECT id, clientId, ${useData}, descricao
                FROM logs;
              `);

              await txExec(tx, "DROP TABLE logs;");
              await txExec(tx, "ALTER TABLE logs_new RENAME TO logs;");
            }
          }
        } catch (e) {
          console.error("❌ Erro ao migrar logs:", e);
          // Tentar limpar logs_new se foi criado
          try { await txExec(tx, "DROP TABLE IF EXISTS logs_new;"); } catch {}
          throw e;
        }
      }

      await txExec(tx, "DROP TABLE clients;");
      await txExec(tx, "ALTER TABLE clients_new RENAME TO clients;");

      // ✅ Índices já são criados em ALL_INDEXES no initDB()
      // Não criar aqui para evitar duplicação

      // ✅ CRÍTICO: Reabilitar foreign keys SEMPRE (mesmo em caso de erro)
      await txExec(tx, "PRAGMA foreign_keys=on;");
      
      // ✅ CRÍTICO: Verificar se foreign keys foram realmente reabilitadas
      const fkCheck = await txGetOne<{ foreign_keys: number }>(tx, "PRAGMA foreign_keys", []);
      if (fkCheck?.foreign_keys !== 1) {
        console.error("❌ CRÍTICO: Foreign keys não foram reabilitadas após migração V2!");
        throw new Error("Foreign keys não puderam ser reabilitadas após migração V2 - integridade referencial comprometida");
      }

      console.log("✅ Migração V2 concluída!");
    } catch (e) {
      console.error("❌ Erro na migração V2:", e);
      // ✅ Tentar reabilitar foreign keys mesmo em caso de erro
      try {
        await txExec(tx, "PRAGMA foreign_keys=on;");
        // ✅ Verificar novamente
        const fkCheck = await txGetOne<{ foreign_keys: number }>(tx, "PRAGMA foreign_keys", []);
        if (fkCheck?.foreign_keys !== 1) {
          console.error("❌ CRÍTICO: Foreign keys não puderam ser reabilitadas mesmo após tentativa de recuperação!");
        }
      } catch (fkError) {
        console.error("❌ Erro ao tentar reabilitar foreign keys:", fkError);
      }
      throw e;
    }
  }
}

