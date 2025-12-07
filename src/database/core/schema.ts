/**
 * 🧱 Schema do banco de dados
 * Define tabelas, índices e funções de inicialização
 */

import { Platform } from "react-native";
import { openDatabase, getDatabase, setDatabase } from "./connection";
import { exec } from "./queries";
import { withTransactionAsync, txExec } from "./transactions";
import { runMigrations } from "../migrations";
import { validateSchemaStandalone } from "./schemaValidator";

// ✅ Flag global para garantir que migrações sejam executadas apenas uma vez
let migrationsRunning = false;
let migrationsComplete = false;
let initDBPromise: Promise<void> | null = null;
let initDBLock = false; // ✅ Lock para evitar race condition em React concurrent mode

// ============================================================
// 🧱 Estrutura das tabelas (V3 - Bairro → Rua → Cliente)
// ============================================================
export const TABLES = {
  bairros: `
    CREATE TABLE IF NOT EXISTS bairros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );
  `,
  ruas: `
    CREATE TABLE IF NOT EXISTS ruas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      bairroId INTEGER NOT NULL,
      FOREIGN KEY (bairroId) REFERENCES bairros(id) ON DELETE CASCADE,
      UNIQUE(nome, bairroId)
    );
  `,
  clients: `
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value_cents INTEGER NOT NULL CHECK (value_cents >= 0),
      numero TEXT,
      referencia TEXT,
      telefone TEXT,
      paid_cents INTEGER DEFAULT 0 CHECK (paid_cents >= 0 AND paid_cents <= value_cents),
      ruaId INTEGER,
      ordemVisita INTEGER DEFAULT 1 CHECK (ordemVisita > 0),
      prioritario INTEGER DEFAULT 0,
      observacoes TEXT,
          status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'quitado')),
          proximaData TEXT CHECK (proximaData IS NULL OR proximaData GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
          created_at TEXT NOT NULL DEFAULT (datetime('now')) CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')) CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
          ultimaVisita TEXT CHECK (ultimaVisita IS NULL OR ultimaVisita GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
          FOREIGN KEY (ruaId) REFERENCES ruas(id) ON DELETE SET NULL
    );
  `,
  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      created_at TEXT NOT NULL CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
      value_cents INTEGER NOT NULL CHECK (value_cents > 0),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `,
  logs: `
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      created_at TEXT NOT NULL CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
      descricao TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );
  `,
  app_settings: `
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,
  financial_cache: `
    CREATE TABLE IF NOT EXISTS financial_cache (
      key TEXT PRIMARY KEY,
      value_cents INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `,
};

// ============================================================
// 📊 ÍNDICES ÚNICOS (evita duplicação e fragmentação)
// ============================================================
/**
 * ✅ Array único de todos os índices do banco
 * Executado apenas uma vez no initDB() para evitar:
 * - Travamento momentâneo
 * - Lentidão extrema em dispositivos fracos
 * - Fragmentação
 */
export const ALL_INDEXES = [
  // ✅ Índices de busca otimizada (LIKE com índices = busca rápida)
  // ✅ COLLATE NOCASE acelera buscas 2-5x (case-insensitive nativo)
  "CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name COLLATE NOCASE);",
  "CREATE INDEX IF NOT EXISTS idx_clients_telefone ON clients(telefone COLLATE NOCASE);",
  "CREATE INDEX IF NOT EXISTS idx_clients_numero ON clients(numero);",
  "CREATE INDEX IF NOT EXISTS idx_clients_referencia ON clients(referencia);",
  // ✅ Índices de ordenação e filtros
  "CREATE INDEX IF NOT EXISTS idx_clients_proximaData ON clients(proximaData);",
  "CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);",
  // ✅ Índices V3 (ruas e relacionamentos)
  "CREATE INDEX IF NOT EXISTS idx_ruas_bairroId ON ruas(bairroId);",
  "CREATE INDEX IF NOT EXISTS idx_clients_ruaId ON clients(ruaId);",
  "CREATE INDEX IF NOT EXISTS idx_clients_rua_ordem ON clients(ruaId, ordemVisita);",
  "CREATE INDEX IF NOT EXISTS idx_clients_prioritario_data ON clients(prioritario, proximaData);",
  // ✅ Índice composto para telas de cobrança por data (melhora performance)
  "CREATE INDEX IF NOT EXISTS idx_clients_data_rua_ordem ON clients(proximaData, ruaId, ordemVisita);",
  // ✅ Índices de relacionamentos
  "CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);",
  "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);",
  "CREATE INDEX IF NOT EXISTS idx_logs_client ON logs(clientId);",
  "CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);",
  // ✅ Índice composto para getLogsByClient (melhora performance em clientes com muitos logs)
  "CREATE INDEX IF NOT EXISTS idx_logs_client_date ON logs(clientId, created_at DESC);",
  // ⚡ Índice covering para buscas pesadas (melhora performance em buscas UNION)
  "CREATE INDEX IF NOT EXISTS idx_search_clients ON clients(name, telefone, numero, referencia);",
  // ✅ Índices para buscas por rua e bairro (melhora performance em searchService)
  "CREATE INDEX IF NOT EXISTS idx_ruas_nome ON ruas(nome COLLATE NOCASE);",
  "CREATE INDEX IF NOT EXISTS idx_bairros_nome ON bairros(nome COLLATE NOCASE);",
];

/**
 * ✅ Obtém a versão atual do schema do banco
 */
async function getSchemaVersion(): Promise<number> {
  try {
    const { getOne } = await import("./queries");
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
    const { exec } = await import("./queries");
    await exec(`PRAGMA user_version = ${version}`);
  }
}

/**
 * ✅ Inicializa o banco de dados (idempotente)
 * ✅ Usa Double-Checked Locking para evitar race conditions
 * ✅ Retorna Promise para permitir await e evitar race conditions
 */
export function initDB(): Promise<void> {
  // ✅ PRIMEIRA VERIFICAÇÃO (sem lock) - Double-Checked Locking pattern
  if (initDBPromise) {
    return initDBPromise;
  }

  // ✅ SEGUNDA VERIFICAÇÃO (com lock) - Evita múltiplas inicializações simultâneas
  if (initDBLock) {
    // Aguardar promise existente com polling inteligente
    return waitForExistingInit();
  }

  // ✅ CRÍTICO: Ativar lock ATÔMICAMENTE antes de criar promise
  // Isso elimina a janela de tempo onde múltiplas chamadas podem passar
  initDBLock = true;

  // ✅ Criar promise única que será reutilizada por todas as chamadas
  initDBPromise = (async (): Promise<void> => {
    try {
      await safeRun("inicializar banco de dados", async () => {
        const db = await openDatabase();
        setDatabase(db);
        
        // ⚠️ Limpar cache na inicialização (previne valores antigos)
        // Importação dinâmica para evitar dependência circular
        try {
          const { clearTotalsCache } = await import("../services/reportsService");
          clearTotalsCache();
        } catch (e) {
          // Ignorar se reportsService ainda não estiver disponível
          console.warn("⚠️ Não foi possível limpar cache na inicialização:", e);
        }

        // 🚀 Otimizações de performance WAL (+200-300% mais rápido)
        await exec("PRAGMA journal_mode = WAL;");        // Write-Ahead Logging
        // ✅ CRÍTICO: FULL em dispositivos fracos (Android <= 8) para evitar corrupção WAL
        // Dispositivos low-end podem corromper WAL caso falte energia no meio da escrita
        if (Platform.OS === 'android' && Platform.Version <= 26) { // Android 8.0 (API 26)
          await exec("PRAGMA synchronous = FULL;");      // Máxima segurança em dispositivos fracos
        } else {
          await exec("PRAGMA synchronous = NORMAL;");    // Balanço performance/segurança em dispositivos modernos
        }
        await exec("PRAGMA temp_store = MEMORY;");       // Temp tables em RAM
        await exec("PRAGMA cache_size = -64000;");       // 64MB cache
        await exec("PRAGMA mmap_size = 134217728;");     // 128 MB memory-mapped I/O (melhora 5-15% no Android)
        await exec("PRAGMA busy_timeout = 30000;");      // 30s timeout para evitar "database is locked"
        
        // ✅ Otimizar query planner (recomendado após criar tabelas/índices)
        // PRAGMA optimize analisa estatísticas e otimiza queries futuras
        try {
          await exec("PRAGMA optimize;");
        } catch (e) {
          // PRAGMA optimize pode não estar disponível em SQLite <3.18.0
          // Ignorar silenciosamente se não suportado
          if (__DEV__) {
            console.log("ℹ️ PRAGMA optimize não disponível (SQLite pode ser <3.18.0)");
          }
        }

        // ✅ CRÍTICO: Ativar foreign keys para garantir integridade referencial
        await exec("PRAGMA foreign_keys = ON;");
        
        // ✅ CRÍTICO: Verificar se foreign keys foram realmente ativadas
        const { getOne } = await import("./queries");
        const fkCheck = await getOne<{ foreign_keys: number }>("PRAGMA foreign_keys");
        if (fkCheck?.foreign_keys !== 1) {
          console.error("❌ CRÍTICO: Foreign keys não foram ativadas!");
          throw new Error("Foreign keys não puderam ser ativadas - integridade referencial comprometida");
        }

        // ✅ Criar tabelas base (sempre executar, IF NOT EXISTS garante idempotência)
        // ⚠️ CRÍTICO: Aguardar todas as criações antes de continuar
        for (const sql of Object.values(TABLES)) {
          await exec(sql);
        }

        // 📊 Criar todos os índices de uma vez (evita duplicação e fragmentação)
        for (const indexSql of ALL_INDEXES) {
          await exec(indexSql);
        }
        
        // ✅ CRÍTICO: Configurar auto_vacuum para evitar crescimento infinito do banco
        // Verificar se já foi configurado (auto_vacuum = 0 significa não configurado)
        const autoVacuum = await getOne<{ auto_vacuum: number }>("PRAGMA auto_vacuum");
        if (autoVacuum?.auto_vacuum === 0) {
          await exec("PRAGMA auto_vacuum = INCREMENTAL;");
          // Executar vacuum incremental uma vez para limpar espaço imediatamente
          await exec("PRAGMA incremental_vacuum;");
        }
        
        // ⚡ Criar tabela FTS5 opcional (se disponível)
        // FTS5 melhora performance de buscas em 10-100x em bases grandes
        try {
          const { createClientsFTS5 } = await import("./fts5");
          await createClientsFTS5();
        } catch (error) {
          console.warn("⚠️ Erro ao criar tabela FTS5 (continuando):", error);
        }
        
        // ⚡ Inicializar cache financeiro (limpar expirados)
        try {
          const { cleanExpiredFinancialCache } = await import("../services/financialCache");
          await cleanExpiredFinancialCache();
        } catch (error) {
          console.warn("⚠️ Erro ao limpar cache financeiro expirado (continuando):", error);
        }
        
        // ✅ Validar schema antes de migrações
        try {
          const validation = await validateSchemaStandalone();
          if (validation.errors.length > 0) {
            console.error("❌ Erros de validação do schema encontrados:");
            validation.errors.forEach(error => console.error(`  - ${error}`));
          }
          if (validation.warnings.length > 0) {
            console.warn("⚠️ Avisos de validação do schema:");
            validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
          }
        } catch (error) {
          console.warn("⚠️ Erro ao validar schema (continuando):", error);
        }
        
        // ✅ Executar migrações incrementais baseadas na versão do schema
        // ⚠️ CRÍTICO: Garantir que migrações sejam executadas apenas uma vez e completamente
        if (!migrationsComplete && !migrationsRunning) {
          migrationsRunning = true;
          try {
            await runMigrations();
            migrationsComplete = true;
          } finally {
            migrationsRunning = false;
          }
        }
      });
    } finally {
      // ✅ CRÍTICO: Liberar apenas o lock
      // initDBPromise não deve ser zerado imediatamente
      // Outros módulos podem ainda precisar da promise mesmo após inicialização rápida
      initDBLock = false;
    }
  })();
  
  // ✅ Garantir que sempre retorna uma Promise
  return initDBPromise;
}

/**
 * ✅ Aguarda inicialização existente com polling inteligente
 * ✅ Evita race conditions quando múltiplas chamadas ocorrem simultaneamente
 */
async function waitForExistingInit(): Promise<void> {
  const maxAttempts = 10;
  const baseDelay = 50; // ms
  
  for (let i = 0; i < maxAttempts; i++) {
    if (initDBPromise) {
      return initDBPromise;
    }
    // ✅ Backoff exponencial: 50ms, 100ms, 150ms...
    await new Promise(resolve => setTimeout(resolve, baseDelay * (i + 1)));
  }
  
  // ✅ Se após todas as tentativas ainda não há promise, lançar erro
  throw new Error("Timeout aguardando inicialização do banco de dados");
}

/**
 * ✅ Aguarda a inicialização do banco de dados completar
 * Útil para garantir que migrações sejam concluídas antes de operações
 */
export async function waitForInitDB(): Promise<void> {
  if (initDBPromise) {
    await initDBPromise;
  }
}

async function safeRun(action: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${action} concluído.`);
  } catch (e) {
    console.error(`❌ Erro ao ${action}:`, e);
  }
}

/**
 * 🗜️ Otimiza banco: compacta espaço e atualiza estatísticas
 * Chamar semanalmente ou após grandes operações (delete massivo, etc)
 * ✅ Executado em transação para evitar inconsistências internas
 */
export async function optimizeDB(): Promise<void> {
  await withTransactionAsync(async (tx) => {
    await txExec(tx, "VACUUM;");   // Compacta banco (libera espaço de DELETEs)
    await txExec(tx, "ANALYZE;");  // Atualiza estatísticas para query planner
  });
}

/**
 * ⚠️ DEPRECATED: Esta função não é mais necessária
 * react-native-sqlite-storage com location: "default" cria o diretório automaticamente
 * 
 * Mantida apenas para compatibilidade com código legado.
 * Esta função não faz nada e retorna imediatamente.
 * 
 * @deprecated Não use esta função. O SQLite cria o diretório automaticamente.
 */
export async function ensureDatabaseDirectory(): Promise<void> {
  // ✅ Não fazer nada - diretório é criado automaticamente
  // Mantida apenas para compatibilidade com código legado
  console.warn(
    "⚠️ ensureDatabaseDirectory() é deprecated e não é mais necessária. " +
    "O SQLite cria o diretório automaticamente. " +
    "Esta função não faz nada e pode ser removida do seu código."
  );
  return Promise.resolve();
}
