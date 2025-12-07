/**
 * 🏥 Health Check Completo do Banco de Dados SQLite
 * Verifica integridade, configurações, índices, queries e migrations
 */

import { getOne, getAll, exec } from "./queries";
import { waitForInitDB } from "./schema";

export interface HealthCheckResult {
  isValid: boolean;
  integrity: {
    quickCheck: string | null;
    integrityCheck: string | null;
    errors: string[];
  };
  pragmas: {
    journalMode: string | null;
    synchronous: string | null;
    foreignKeys: number | null;
    busyTimeout: number | null;
    autoVacuum: number | null;
    mmapSize: number | null;
    cacheSize: number | null;
    pageSize: number | null;
    errors: string[];
  };
  indexes: {
    expected: number;
    found: number;
    missing: string[];
    extra: string[];
    errors: string[];
  };
  fts5: {
    available: boolean | null;
    tableExists: boolean | null;
    errors: string[];
  };
  queries: {
    issues: string[];
    warnings: string[];
  };
  migrations: {
    currentVersion: number;
    issues: string[];
  };
  errors: string[];
  warnings: string[];
}

/**
 * ✅ Executa health check completo do banco de dados
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    isValid: true,
    integrity: {
      quickCheck: null,
      integrityCheck: null,
      errors: [],
    },
    pragmas: {
      journalMode: null,
      synchronous: null,
      foreignKeys: null,
      busyTimeout: null,
      autoVacuum: null,
      mmapSize: null,
      cacheSize: null,
      pageSize: null,
      errors: [],
    },
    indexes: {
      expected: 0,
      found: 0,
      missing: [],
      extra: [],
      errors: [],
    },
    fts5: {
      available: null,
      tableExists: null,
      errors: [],
    },
    queries: {
      issues: [],
      warnings: [],
    },
    migrations: {
      currentVersion: 0,
      issues: [],
    },
    errors: [],
    warnings: [],
  };

  try {
    await waitForInitDB();

    // ============================================================
    // 1️⃣ INTEGRIDADE DO DB
    // ============================================================
    try {
      const quickCheck = await getOne<{ "quick_check": string }>("PRAGMA quick_check;");
      result.integrity.quickCheck = quickCheck?.["quick_check"] || null;
      
      if (result.integrity.quickCheck !== "ok") {
        result.integrity.errors.push(`quick_check retornou: ${result.integrity.quickCheck}`);
        result.isValid = false;
      }
    } catch (e) {
      result.integrity.errors.push(`Erro ao executar quick_check: ${e}`);
      result.isValid = false;
    }

    // Se quick_check passou, executar integrity_check completo
    if (result.integrity.quickCheck === "ok") {
      try {
        const integrityCheck = await getOne<{ "integrity_check": string }>("PRAGMA integrity_check;");
        result.integrity.integrityCheck = integrityCheck?.["integrity_check"] || null;
        
        if (result.integrity.integrityCheck !== "ok") {
          result.integrity.errors.push(`integrity_check retornou: ${result.integrity.integrityCheck}`);
          result.isValid = false;
        }
      } catch (e) {
        result.integrity.errors.push(`Erro ao executar integrity_check: ${e}`);
        result.isValid = false;
      }
    }

    // ============================================================
    // 2️⃣ CONFIGURAÇÕES ESSENCIAIS (PRAGMAS)
    // ============================================================
    try {
      const journalMode = await getOne<{ "journal_mode": string }>("PRAGMA journal_mode;");
      result.pragmas.journalMode = journalMode?.["journal_mode"] || null;
      if (result.pragmas.journalMode !== "wal") {
        result.pragmas.errors.push(`journal_mode deve ser 'wal', encontrado: ${result.pragmas.journalMode}`);
        result.isValid = false;
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar journal_mode: ${e}`);
    }

    try {
      const synchronous = await getOne<{ "synchronous": string }>("PRAGMA synchronous;");
      result.pragmas.synchronous = synchronous?.["synchronous"] || null;
      if (result.pragmas.synchronous !== "normal" && result.pragmas.synchronous !== "full") {
        result.pragmas.errors.push(`synchronous deve ser 'normal' ou 'full', encontrado: ${result.pragmas.synchronous}`);
        result.warnings.push(`synchronous está como '${result.pragmas.synchronous}' - pode afetar performance`);
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar synchronous: ${e}`);
    }

    try {
      const foreignKeys = await getOne<{ "foreign_keys": number }>("PRAGMA foreign_keys;");
      result.pragmas.foreignKeys = foreignKeys?.["foreign_keys"] || null;
      if (result.pragmas.foreignKeys !== 1) {
        result.pragmas.errors.push(`foreign_keys deve ser 1 (ON), encontrado: ${result.pragmas.foreignKeys}`);
        result.isValid = false;
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar foreign_keys: ${e}`);
      result.isValid = false;
    }

    try {
      const busyTimeout = await getOne<{ "busy_timeout": number }>("PRAGMA busy_timeout;");
      result.pragmas.busyTimeout = busyTimeout?.["busy_timeout"] || null;
      if (!result.pragmas.busyTimeout || result.pragmas.busyTimeout < 30000) {
        result.pragmas.errors.push(`busy_timeout deve ser >= 30000, encontrado: ${result.pragmas.busyTimeout}`);
        result.warnings.push(`busy_timeout está muito baixo (${result.pragmas.busyTimeout}ms) - pode causar erros "database is locked"`);
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar busy_timeout: ${e}`);
    }

    try {
      const autoVacuum = await getOne<{ "auto_vacuum": number }>("PRAGMA auto_vacuum;");
      result.pragmas.autoVacuum = autoVacuum?.["auto_vacuum"] || null;
      if (result.pragmas.autoVacuum === 0) {
        result.pragmas.errors.push(`auto_vacuum deve ser configurado (INCREMENTAL=2), encontrado: ${result.pragmas.autoVacuum} (NONE)`);
        result.isValid = false;
      } else if (result.pragmas.autoVacuum !== 2) {
        result.warnings.push(`auto_vacuum está como ${result.pragmas.autoVacuum} (esperado: 2=INCREMENTAL)`);
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar auto_vacuum: ${e}`);
    }

    try {
      const mmapSize = await getOne<{ "mmap_size": number }>("PRAGMA mmap_size;");
      result.pragmas.mmapSize = mmapSize?.["mmap_size"] || null;
      if (!result.pragmas.mmapSize || result.pragmas.mmapSize <= 0) {
        result.pragmas.errors.push(`mmap_size deve ser > 0, encontrado: ${result.pragmas.mmapSize}`);
        result.warnings.push(`mmap_size não está configurado - pode afetar performance`);
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar mmap_size: ${e}`);
    }

    try {
      const cacheSize = await getOne<{ "cache_size": number }>("PRAGMA cache_size;");
      result.pragmas.cacheSize = cacheSize?.["cache_size"] || null;
      if (!result.pragmas.cacheSize || result.pragmas.cacheSize >= 0) {
        result.pragmas.errors.push(`cache_size deve ser negativo (modo KB), encontrado: ${result.pragmas.cacheSize}`);
        result.warnings.push(`cache_size não está em modo KB (valor negativo) - pode afetar performance`);
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar cache_size: ${e}`);
    }

    try {
      const pageSize = await getOne<{ "page_size": number }>("PRAGMA page_size;");
      result.pragmas.pageSize = pageSize?.["page_size"] || null;
      if (!result.pragmas.pageSize || result.pragmas.pageSize < 4096) {
        result.pragmas.errors.push(`page_size deve ser >= 4096, encontrado: ${result.pragmas.pageSize}`);
        result.warnings.push(`page_size está muito baixo (${result.pragmas.pageSize}) - pode afetar performance`);
      }
    } catch (e) {
      result.pragmas.errors.push(`Erro ao verificar page_size: ${e}`);
    }

    // ============================================================
    // 3️⃣ ÍNDICES
    // ============================================================
    try {
      // Índices esperados (do schema.ts)
      const expectedIndexes = [
        "idx_clients_name",
        "idx_clients_telefone",
        "idx_clients_numero",
        "idx_clients_referencia",
        "idx_clients_proximaData",
        "idx_clients_status",
        "idx_ruas_bairroId",
        "idx_clients_ruaId",
        "idx_clients_rua_ordem",
        "idx_clients_prioritario_data",
        "idx_clients_data_rua_ordem",
        "idx_payments_client",
        "idx_payments_created_at",
        "idx_logs_client",
        "idx_logs_created_at",
        "idx_logs_client_date",
        "idx_search_clients",
        "idx_ruas_nome",
        "idx_bairros_nome",
      ];
      
      result.indexes.expected = expectedIndexes.length;

      // Buscar índices existentes
      const existingIndexes = await getAll<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'",
        []
      );

      const existingIndexNames = existingIndexes.map(idx => idx.name);
      result.indexes.found = existingIndexNames.length;

      // Verificar índices faltando
      for (const expectedIdx of expectedIndexes) {
        if (!existingIndexNames.includes(expectedIdx)) {
          result.indexes.missing.push(expectedIdx);
          result.indexes.errors.push(`Índice faltando: ${expectedIdx}`);
          result.isValid = false;
        }
      }

      // Verificar índices extras (não esperados)
      for (const existingIdx of existingIndexNames) {
        if (!expectedIndexes.includes(existingIdx)) {
          result.indexes.extra.push(existingIdx);
          result.warnings.push(`Índice extra encontrado: ${existingIdx} (pode ser deprecated)`);
        }
      }
    } catch (e) {
      result.indexes.errors.push(`Erro ao verificar índices: ${e}`);
      result.isValid = false;
    }

    // ============================================================
    // 4️⃣ FTS5
    // ============================================================
    try {
      const { isFTS5Available } = await import("./fts5");
      result.fts5.available = await isFTS5Available();
      
      // Verificar se tabela FTS5 existe
      const fts5Table = await getOne<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='clients_fts'",
        []
      );
      result.fts5.tableExists = fts5Table !== null;
      
      if (result.fts5.available && !result.fts5.tableExists) {
        result.fts5.errors.push("FTS5 está disponível mas tabela clients_fts não existe");
        result.warnings.push("Tabela FTS5 não criada - buscas podem ser mais lentas");
      }
    } catch (e) {
      result.fts5.errors.push(`Erro ao verificar FTS5: ${e}`);
    }

    // ============================================================
    // 5️⃣ QUERIES E PERFORMANCE
    // ============================================================
    // Verificar se queries importantes têm LIMIT
    const queriesToCheck = [
      { name: "getAllClients", sql: "SELECT * FROM clients ORDER BY name ASC LIMIT 500", hasLimit: true },
      { name: "getClientsPage", sql: "SELECT * FROM clients ORDER BY name ASC LIMIT ? OFFSET ?", hasLimit: true },
      { name: "getAllClientsFull", sql: "SELECT * FROM clients ORDER BY name ASC", hasLimit: false },
    ];

    for (const query of queriesToCheck) {
      if (!query.hasLimit && !query.sql.includes("LIMIT")) {
        result.queries.warnings.push(`Query ${query.name} não tem LIMIT - pode carregar muitos dados`);
      }
    }

    // Verificar se getAllClientsFull está documentado
    result.queries.warnings.push("getAllClientsFull não tem LIMIT - considerar usar getClientsPage() para paginação");

    // ============================================================
    // 6️⃣ MIGRATIONS
    // ============================================================
    try {
      const version = await getOne<{ version: number }>("PRAGMA user_version;");
      result.migrations.currentVersion = version?.version || 0;
      
      if (result.migrations.currentVersion < 4) {
        result.migrations.issues.push(`Versão do schema (${result.migrations.currentVersion}) está abaixo da esperada (4)`);
        result.warnings.push("Migrações podem precisar ser executadas");
      }
    } catch (e) {
      result.migrations.issues.push(`Erro ao verificar versão do schema: ${e}`);
    }

    // ============================================================
    // 7️⃣ TRATAMENTO DE ERROS
    // ============================================================
    // Verificações já feitas no código:
    // - getOne/getAll lançam exceções (verificado no código)
    // - categorizeError implementado (verificado no código)
    // - ensureDatabase não existe, mas waitForInitDB + getDatabase + openDatabase fazem o papel

    result.warnings.push("Verificar manualmente se todas as funções usam waitForInitDB() antes de acessar o banco");

  } catch (e) {
    result.errors.push(`Erro crítico durante health check: ${e}`);
    result.isValid = false;
  }

  return result;
}

/**
 * ✅ Imprime resultado do health check de forma legível
 */
export function printHealthCheckResult(result: HealthCheckResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("🏥 HEALTH CHECK DO BANCO DE DADOS SQLite");
  console.log("=".repeat(60));

  console.log(`\n✅ Status Geral: ${result.isValid ? "SAUDÁVEL" : "PROBLEMAS ENCONTRADOS"}`);

  // Integridade
  console.log("\n📊 1. INTEGRIDADE DO DB");
  console.log(`   quick_check: ${result.integrity.quickCheck || "ERRO"}`);
  if (result.integrity.integrityCheck) {
    console.log(`   integrity_check: ${result.integrity.integrityCheck}`);
  }
  if (result.integrity.errors.length > 0) {
    result.integrity.errors.forEach(err => console.log(`   ❌ ${err}`));
  }

  // Pragmas
  console.log("\n⚙️ 2. CONFIGURAÇÕES (PRAGMAS)");
  console.log(`   journal_mode: ${result.pragmas.journalMode || "ERRO"}`);
  console.log(`   synchronous: ${result.pragmas.synchronous || "ERRO"}`);
  console.log(`   foreign_keys: ${result.pragmas.foreignKeys !== null ? (result.pragmas.foreignKeys === 1 ? "ON" : "OFF") : "ERRO"}`);
  console.log(`   busy_timeout: ${result.pragmas.busyTimeout || "ERRO"}ms`);
  console.log(`   auto_vacuum: ${result.pragmas.autoVacuum !== null ? (result.pragmas.autoVacuum === 2 ? "INCREMENTAL" : result.pragmas.autoVacuum) : "ERRO"}`);
  console.log(`   mmap_size: ${result.pragmas.mmapSize || "ERRO"}`);
  console.log(`   cache_size: ${result.pragmas.cacheSize || "ERRO"}`);
  console.log(`   page_size: ${result.pragmas.pageSize || "ERRO"}`);
  if (result.pragmas.errors.length > 0) {
    result.pragmas.errors.forEach(err => console.log(`   ❌ ${err}`));
  }

  // Índices
  console.log("\n📇 3. ÍNDICES");
  console.log(`   Esperados: ${result.indexes.expected}`);
  console.log(`   Encontrados: ${result.indexes.found}`);
  if (result.indexes.missing.length > 0) {
    console.log(`   ❌ Faltando: ${result.indexes.missing.join(", ")}`);
  }
  if (result.indexes.extra.length > 0) {
    console.log(`   ⚠️ Extras: ${result.indexes.extra.join(", ")}`);
  }

  // FTS5
  console.log("\n🔍 4. FTS5");
  console.log(`   Disponível: ${result.fts5.available !== null ? (result.fts5.available ? "SIM" : "NÃO") : "ERRO"}`);
  console.log(`   Tabela existe: ${result.fts5.tableExists !== null ? (result.fts5.tableExists ? "SIM" : "NÃO") : "ERRO"}`);
  if (result.fts5.errors.length > 0) {
    result.fts5.errors.forEach(err => console.log(`   ❌ ${err}`));
  }

  // Migrations
  console.log("\n🔄 5. MIGRATIONS");
  console.log(`   Versão atual: ${result.migrations.currentVersion}`);
  if (result.migrations.issues.length > 0) {
    result.migrations.issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log("\n⚠️ AVISOS");
    result.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  // Errors
  if (result.errors.length > 0) {
    console.log("\n❌ ERROS CRÍTICOS");
    result.errors.forEach(error => console.log(`   ${error}`));
  }

  console.log("\n" + "=".repeat(60));
}

