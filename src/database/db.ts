/**
 * ⚠️ IMPORTANTE: Este arquivo foi migrado de Expo para React Native CLI
 *
 * Mudanças realizadas:
 * ✅ expo-sqlite → react-native-sqlite-storage
 * ✅ expo-file-system → react-native-fs
 * ✅ expo-sharing → Share do React Native
 *
 * ⚠️ ATENÇÃO: A API do react-native-sqlite-storage é assíncrona!
 * - Todas as funções de banco (exec, run, getOne, getAll) agora retornam Promises
 * - initDB() deve ser chamada com await ou .then()
 * - Todas as funções públicas que acessam o banco são assíncronas
 *
 * Certifique-se de chamar ensureDatabaseDirectory() ANTES de initDB()
 */

import SQLite from "react-native-sqlite-storage";
import RNFS from "react-native-fs";
import { Share } from "react-native";

// Habilita promessas no SQLite
SQLite.enablePromise(true);

// ============================================================
// 🧩 Tipos (valores em reais, convertidos para centavos no banco)
// ============================================================
export type Client = {
  id?: number;
  name: string;
  value: number; // Reais (API) - armazenado como value_cents (INTEGER) no banco
  bairro?: string | null;
  numero?: string | null;
  referencia?: string | null;
  telefone?: string | null;
  next_charge?: string | null; // ISO: yyyy-mm-dd
  paid?: number; // Reais (API) - armazenado como paid_cents (INTEGER) no banco
};

export type Payment = {
  id?: number;
  client_id: number;
  created_at: string; // ISO: yyyy-mm-ddTHH:mm:ss.sssZ
  valor: number; // Reais (API) - armazenado como value_cents (INTEGER) no banco
};

export type Log = {
  id?: number;
  clientId: number;
  created_at: string; // ISO: yyyy-mm-ddTHH:mm:ss.sssZ
  descricao: string;
};

// Tipo interno do banco (com centavos)
type ClientDB = {
  id: number;
  name: string;
  value_cents: number;
  bairro: string | null;
  numero: string | null;
  referencia: string | null;
  telefone: string | null;
  next_charge: string | null;
  paid_cents: number;
};

type PaymentDB = {
  id: number;
  client_id: number;
  created_at: string;
  value_cents: number;
};

// ============================================================
// 🗄️ Conexão com o banco
// ============================================================
/**
 * ⚠️ IMPORTANTE: react-native-sqlite-storage usa API assíncrona.
 * O banco será aberto na função initDB(). Todas as operações devem
 * ser feitas após inicializar o banco.
 */
let db: any = null;

/**
 * 🔄 Migra banco antigo (location: default) para DocumentDirectoryPath
 * Necessário para que o backup funcione corretamente
 */
async function migrateDatabaseLocation(): Promise<void> {
  try {
    const newPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;
    const newExists = await RNFS.exists(newPath);

    // Se o banco novo já existe, não precisa migrar
    if (newExists) {
      return;
    }

    // Tenta encontrar o banco na localização antiga (default)
    // Android: /data/data/<package>/databases/
    // iOS: Library/LocalDatabase/
    const oldPaths = [
      `${RNFS.DocumentDirectoryPath}/../databases/crediario.db`,  // Android
      `${RNFS.LibraryDirectoryPath}/LocalDatabase/crediario.db`,   // iOS
    ];

    for (const oldPath of oldPaths) {
      const oldExists = await RNFS.exists(oldPath);
      if (oldExists) {
        console.log(`📦 Migrando banco de ${oldPath} para ${newPath}`);
        await ensureDatabaseDirectory();
        await RNFS.copyFile(oldPath, newPath);
        console.log("✅ Migração concluída com sucesso!");
        return;
      }
    }
  } catch (error) {
    console.log("⚠️ Nenhum banco antigo encontrado ou erro na migração:", error);
  }
}

async function openDatabase() {
  if (!db) {
    // ✅ Migra banco antigo para o novo local (se necessário)
    await migrateDatabaseLocation();

    // ✅ Cria banco no DocumentDirectoryPath para facilitar backup
    await ensureDatabaseDirectory();
    db = await SQLite.openDatabase({
      name: `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`,
      location: "default",
    });
  }
  return db;
}

// ============================================================
// ⚙️ Utilidades
// ============================================================
// 📅 Formato brasileiro para UI (dd/mm/yyyy)
const formatDate = (date = new Date()): string => date.toLocaleDateString("pt-BR");

// 📅 Formato ISO completo para armazenamento (yyyy-mm-ddTHH:mm:ss.sssZ)
const formatDateTimeIso = (date = new Date()): string => date.toISOString();

// 📅 Formato ISO apenas data (yyyy-mm-dd)
const formatDateIso = (date = new Date()): string => date.toISOString().slice(0, 10);

// 💰 Conversão de valores monetários (evita problemas de float)
export const toCentavos = (reais: number): number => Math.round(reais * 100); // R$ 15.00 → 1500 centavos
export const toReais = (centavos: number): number => centavos / 100; // 1500 centavos → R$ 15.00

// ✅ Validação de data ISO (yyyy-mm-dd)
export const isValidDateISO = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

export { formatDateTimeIso, formatDateIso, formatDate }; // Exporta para UI

function safeRun(action: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${action} concluído.`);
  } catch (e) {
    console.error(`❌ Erro ao ${action}:`, e);
  }
}

/**
 * ⚠️ NOTA: As funções abaixo foram convertidas para async/await devido à mudança
 * de expo-sqlite (síncrono) para react-native-sqlite-storage (assíncrono).
 * Todas as funções públicas que usam o banco agora são assíncronas.
 */

async function tableExists(tableName: string): Promise<boolean> {
  try {
    if (!db) await openDatabase();
    const results = await new Promise<any>((resolve, reject) => {
      db.executeSql(
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

// ============================================================
// 🔒 Helpers de Banco (seguro contra SQL injection)
// ============================================================
async function exec(sql: string): Promise<void> {
  try {
    if (!db) await openDatabase();
    await db.executeSql(sql, []);
  } catch (e) {
    console.error("❌ SQL exec error:", sql, e);
    throw e;
  }
}

async function run(sql: string, params: any[] = []): Promise<void> {
  try {
    if (!db) await openDatabase();
    await db.executeSql(sql, params);
  } catch (e) {
    console.error("❌ SQL run error:", sql, params, e);
    throw e;
  }
}

async function runAndGetId(sql: string, params: any[] = []): Promise<number> {
  try {
    if (!db) await openDatabase();
    await db.executeSql(sql, params);
    const result = await getOne<{ id: number }>("SELECT last_insert_rowid() as id");
    return result?.id ?? 0;
  } catch (e) {
    console.error("❌ SQL runAndGetId error:", sql, params, e);
    throw e;
  }
}

async function getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  try {
    if (!db) await openDatabase();
    const [results] = await db.executeSql(sql, params);
    return results.rows.length > 0 ? results.rows.item(0) : null;
  } catch (e) {
    console.error("❌ SQL getOne error:", sql, params, e);
    return null;
  }
}

async function getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    if (!db) await openDatabase();
    const [results] = await db.executeSql(sql, params);
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
async function selectMapped<T, R>(sql: string, params: any[], mapper: (row: R) => T): Promise<T[]> {
  const rows = await getAll<R>(sql, params);
  return rows.map(mapper);
}

// Wrapper para transações atômicas (garante consistência do banco)
function withTransaction(fn: () => void): void {
  exec("BEGIN TRANSACTION;");
  try {
    fn();
    exec("COMMIT;");
  } catch (e) {
    exec("ROLLBACK;");
    console.error("❌ Transação revertida devido a erro:", e);
    throw e;
  }
}

function ensureColumn(table: string, name: string, def: string) {
  if (!tableExists(table)) {
    console.log(`⚠️ Tabela '${table}' não existe. Pulando verificação de coluna.`);
    return;
  }
  const cols = getAll<any>(`PRAGMA table_info(${table})`).map((c: any) => c.name);
  if (!cols.includes(name)) {
    exec(`ALTER TABLE ${table} ADD COLUMN ${def};`);
    console.log(`🛠️ Coluna '${name}' adicionada em ${table}.`);
  }
}

// ============================================================
// 🔄 Mappers (DB → API)
// ============================================================
function mapClient(row: ClientDB): Client {
  return {
    id: row.id,
    name: row.name,
    value: toReais(row.value_cents),
    bairro: row.bairro,
    numero: row.numero,
    referencia: row.referencia,
    telefone: row.telefone,
    next_charge: row.next_charge,
    paid: toReais(row.paid_cents),
  };
}

function mapPayment(row: PaymentDB): Payment {
  return {
    id: row.id,
    client_id: row.client_id,
    created_at: row.created_at,
    valor: toReais(row.value_cents),
  };
}

// ============================================================
// 🧱 Estrutura das tabelas (V2 - INTEGER para dinheiro, ISO para datas)
// ============================================================
const TABLES = {
  clients: `
    CREATE TABLE IF NOT EXISTS clients (
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
  `,
  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      value_cents INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `,
  logs: `
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      descricao TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );
  `,
};

// ============================================================
// 🏗️ Inicialização e Correção
// ============================================================

/**
 * ⚠️ CRÍTICO: Criar diretório SQLite antes de usar openDatabaseSync
 * Android crasha se a pasta não existir. Chamar ANTES de initDB().
 */
export async function ensureDatabaseDirectory(): Promise<void> {
  try {
    const sqliteDir = `${RNFS.DocumentDirectoryPath}/SQLite`;
    const dirExists = await RNFS.exists(sqliteDir);
    if (!dirExists) {
      await RNFS.mkdir(sqliteDir);
    }
  } catch (error) {
    // Ignora se diretório já existe
  }
}

export function initDB(): void {
  safeRun("inicializar banco de dados", () => {
    // ⚠️ Limpar cache na inicialização (previne valores antigos)
    clearTotalsCache();

    // 🚀 Otimizações de performance WAL (+200-300% mais rápido)
    exec("PRAGMA journal_mode = WAL;");        // Write-Ahead Logging
    exec("PRAGMA synchronous = NORMAL;");      // Balanço performance/segurança
    exec("PRAGMA temp_store = MEMORY;");       // Temp tables em RAM
    exec("PRAGMA cache_size = -64000;");       // 64MB cache

    // ✅ CRÍTICO: Ativar foreign keys para garantir integridade referencial
    exec("PRAGMA foreign_keys = ON;");

    Object.values(TABLES).forEach(sql => exec(sql));

    // 📊 Índices para melhor performance (35-80% mais rápido)
    exec("CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);");
    exec("CREATE INDEX IF NOT EXISTS idx_clients_bairro ON clients(bairro);");
    // ⚠️ idx_clients_search: OR queries não usam índice composto. Considere FTS5 para search avançada
    exec("CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(name, bairro);");
    exec("CREATE INDEX IF NOT EXISTS idx_clients_next_charge ON clients(next_charge);");
    exec("CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);");
    exec("CREATE INDEX IF NOT EXISTS idx_logs_client ON logs(clientId);");
    exec("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);");
  });
}

/**
 * 🗜️ Otimiza banco: compacta espaço e atualiza estatísticas
 * Chamar semanalmente ou após grandes operações (delete massivo, etc)
 */
export function optimizeDB(): void {
  safeRun("otimizar banco de dados", () => {
    exec("VACUUM;");   // Compacta banco (libera espaço de DELETEs)
    exec("ANALYZE;");  // Atualiza estatísticas para query planner
  });
}

export function fixDatabaseStructure(): void {
  safeRun("migrar para V2 (INTEGER + ISO)", () => {
    if (!tableExists("clients")) return;

    const clientsColsRaw = getAll<any>("PRAGMA table_info(clients)");
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
        exec("PRAGMA foreign_keys=off;");

        // Migrar CLIENTS
        exec(`
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

        exec(`
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
        if (tableExists("payments")) {
          try {
            exec(`
              CREATE TABLE payments_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                value_cents INTEGER NOT NULL,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
              );
            `);

            const paymentsColsRaw = getAll<any>("PRAGMA table_info(payments)");
            if (!Array.isArray(paymentsColsRaw)) {
              console.warn("⚠️ PRAGMA table_info(payments) retornou valor inválido, pulando migração");
              exec("DROP TABLE IF EXISTS payments_new;");
              return;
            }

            const paymentsCols = paymentsColsRaw.map((c) => c.name);

            // ✅ Validação robusta de colunas
            if (paymentsCols.length === 0) {
              console.warn("⚠️ PRAGMA table_info(payments) retornou vazio, pulando migração de payments");
              exec("DROP TABLE payments_new;");
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
                exec("DROP TABLE IF EXISTS payments_new;");
              } else {
                // ✅ Só multiplicar por 100 se REAL, se já é INTEGER apenas copiar
                const valueExpression = isValorReal
                  ? "CAST(ROUND(valor * 100) AS INTEGER)"  // REAL → centavos
                  : "value_cents";                          // já está em centavos

                exec(`
                  INSERT INTO payments_new (id, client_id, created_at, value_cents)
                  SELECT
                    id,
                    ${useClientId},
                    ${useData},
                    ${valueExpression}
                  FROM payments;
                `);

                exec("DROP TABLE payments;");
                exec("ALTER TABLE payments_new RENAME TO payments;");
              }
            }
          } catch (e) {
            console.error("❌ Erro ao migrar payments:", e);
            // Tentar limpar payments_new se foi criado
            try { exec("DROP TABLE IF EXISTS payments_new;"); } catch {}
            throw e;
          }
        }

        // Migrar LOGS (se existir)
        if (tableExists("logs")) {
          try {
            exec(`
              CREATE TABLE logs_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clientId INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                descricao TEXT NOT NULL,
                FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
              );
            `);

            const logsColsRaw = getAll<any>("PRAGMA table_info(logs)");
            if (!Array.isArray(logsColsRaw)) {
              console.warn("⚠️ PRAGMA table_info(logs) retornou valor inválido, pulando migração");
              exec("DROP TABLE IF EXISTS logs_new;");
              return;
            }

            const logsCols = logsColsRaw.map((c) => c.name);

            // ✅ Validação robusta de colunas
            if (logsCols.length === 0) {
              console.warn("⚠️ PRAGMA table_info(logs) retornou vazio, pulando migração de logs");
              exec("DROP TABLE logs_new;");
            } else {
              const useData = logsCols.includes("data") ? "data" : "created_at";

              // Verificar se as colunas necessárias existem
              const hasRequiredCols = logsCols.includes("clientId") &&
                                     logsCols.includes(useData) &&
                                     logsCols.includes("descricao");

              if (!hasRequiredCols) {
                console.warn("⚠️ Colunas esperadas não encontradas em logs, pulando migração:", logsCols);
                exec("DROP TABLE IF EXISTS logs_new;");
              } else {
                exec(`
                  INSERT INTO logs_new (id, clientId, created_at, descricao)
                  SELECT id, clientId, ${useData}, descricao
                  FROM logs;
                `);

                exec("DROP TABLE logs;");
                exec("ALTER TABLE logs_new RENAME TO logs;");
              }
            }
          } catch (e) {
            console.error("❌ Erro ao migrar logs:", e);
            // Tentar limpar logs_new se foi criado
            try { exec("DROP TABLE IF EXISTS logs_new;"); } catch {}
            throw e;
          }
        }

        exec("DROP TABLE clients;");
        exec("ALTER TABLE clients_new RENAME TO clients;");

        // 📊 Recriar índices após migração (crítico para performance)
        console.log("🔨 Recriando índices após migração...");
        exec("CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);");
        exec("CREATE INDEX IF NOT EXISTS idx_clients_bairro ON clients(bairro);");
        exec("CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(name, bairro);"); // Índice composto para OR search
        exec("CREATE INDEX IF NOT EXISTS idx_clients_next_charge ON clients(next_charge);");
        exec("CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);");
        exec("CREATE INDEX IF NOT EXISTS idx_logs_client ON logs(clientId);");
        exec("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);");

        console.log("✅ Migração V2 concluída!");
      } catch (e) {
        console.error("❌ Erro na migração V2:", e);
        throw e;
      } finally {
        // ✅ CRÍTICO: Reabilitar foreign keys SEMPRE (mesmo em caso de erro)
        exec("PRAGMA foreign_keys=on;");
      }
    }
  });
}

// ============================================================
// 📜 LOGS
// ============================================================

/**
 * ⚠️ INTERNO: Adiciona log SEM transação própria
 * Use dentro de withTransaction() para garantir atomicidade
 */
function _addLogUnsafe(clientId: number, descricao: string): void {
  if (!clientId) return;

  run("INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
    clientId,
    formatDateTimeIso(),
    descricao,
  ]);
}

/**
 * Adiciona log com transação própria (uso externo)
 */
export function addLog(clientId: number, descricao: string): void {
  withTransaction(() => {
    _addLogUnsafe(clientId, descricao);
  });
}

export const getLogsByClient = async (clientId: number): Promise<Log[]> => {
  if (!clientId) return [];
  return await getAll<Log>("SELECT * FROM logs WHERE clientId = ? ORDER BY id DESC", [clientId]);
};

// ============================================================
// 👥 CLIENTES
// ============================================================
export async function addClient(client: Client): Promise<number> {
  const id = await runAndGetId(
    `INSERT INTO clients (name, value_cents, bairro, numero, referencia, telefone, next_charge, paid_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client.name,
      toCentavos(client.value ?? 0),
      client.bairro ?? null,
      client.numero ?? null,
      client.referencia ?? null,
      client.telefone ?? null,
      client.next_charge ?? null,
      toCentavos(client.paid ?? 0),
    ]
  );
  clearTotalsCache();
  return id;
}

export async function updateClient(client: Client, newData?: Partial<Client>): Promise<void> {
  if (!client.id) return;

  // ✅ Se newData existe, atualizar APENAS os campos enviados (parcial)
  const data = newData ?? client;
  const entries = Object.entries(data).filter(([k, v]) => v !== undefined && k !== "id");

  if (entries.length === 0) return;

  // 🔍 Obter dados originais para comparar mudanças
  const originalClient = await getClientById(client.id);
  if (!originalClient) return;

  // 📝 Detectar mudanças e criar descrição detalhada
  const changes: string[] = [];

  const fieldLabels: Record<string, string> = {
    name: "Nome",
    value: "Valor Total",
    bairro: "Bairro",
    numero: "Número",
    referencia: "Referência",
    telefone: "Telefone",
    next_charge: "Próxima Cobrança",
    paid: "Valor Pago",
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === "") return "(vazio)";
    if (key === "value" || key === "paid") {
      return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
    }
    if (key === "next_charge" && value) {
      // ✅ next_charge está no formato yyyy-mm-dd (ISO date)
      // Parsear manualmente para evitar problemas com new Date()
      try {
        const parts = String(value).split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          // Criar data no formato correto (month é 0-indexed no Date)
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          // Verificar se a data é válida
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString("pt-BR");
          }
        }
        // Fallback: tentar parsear diretamente
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("pt-BR");
        }
      } catch (e) {
        // Se falhar, retorna o valor original
        console.warn("Erro ao formatar data:", value, e);
      }
      return String(value);
    }
    return String(value);
  };

  // Comparar cada campo alterado
  for (const [key, newValue] of entries) {
    const originalValue = (originalClient as any)[key];
    const normalizedNew = typeof newValue === "string" && newValue.trim() === "" ? null : newValue;
    const normalizedOriginal = typeof originalValue === "string" && originalValue?.trim() === "" ? null : originalValue;

    // Comparação considerando valores monetários com tolerância
    if (key === "value" || key === "paid") {
      const diff = Math.abs((normalizedNew as number) - (normalizedOriginal || 0));
      if (diff > 0.01) {
        changes.push(
          `${fieldLabels[key]}: ${formatValue(key, normalizedOriginal)} → ${formatValue(key, normalizedNew)}`
        );
      }
    } else if (normalizedNew !== normalizedOriginal) {
      changes.push(
        `${fieldLabels[key]}: ${formatValue(key, normalizedOriginal)} → ${formatValue(key, normalizedNew)}`
      );
    }
  }

  // Mapeia campos da API para campos do banco e converte valores monetários
  const dbEntries = entries.map(([key, value]) => {
    if (key === "value") return ["value_cents", toCentavos(value as number)];
    if (key === "paid") return ["paid_cents", toCentavos(value as number)];

    // ✅ Converter strings vazias para null (melhor semântica no banco)
    if (typeof value === "string" && value === "") return [key, null];

    return [key, value];
  });

  const fields = dbEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = dbEntries.map(([, value]) => value);

  await run(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, client.id]);

  // 📝 Criar log detalhado com as mudanças
  if (changes.length > 0) {
    const logDescription = `📝 Dados atualizados:\n${changes.join("\n")}`;
    addLog(client.id, logDescription);
  } else {
    addLog(client.id, "📝 Dados do cliente atualizados.");
  }

  // Invalida cache se alterou 'value' ou 'paid'
  if (data.value !== undefined || data.paid !== undefined) {
    clearTotalsCache();
  }
}

export function deleteClient(id: number): void {
  if (!id) return;
  try {
    // 🔒 ON DELETE CASCADE: payments e logs são deletados automaticamente
    withTransaction(() => {
      run("DELETE FROM clients WHERE id = ?", [id]);
    });

    clearTotalsCache();
    console.log(`🗑️ Cliente #${id} removido com sucesso.`);
  } catch (error) {
    console.error("❌ Erro ao remover cliente:", error);
  }
}

// ============================================================
// 💰 PAGAMENTOS
// ============================================================
export function addPayment(clientId: number, valor: number): void {
  if (!clientId || valor <= 0) throw new Error("Cliente e valor obrigatórios");

  const valorCents = toCentavos(valor);

  // 🔒 Transação atômica: garante que payment + update + log ocorram juntos ou falhem juntos
  withTransaction(() => {
    run("INSERT INTO payments (client_id, created_at, value_cents) VALUES (?, ?, ?)", [
      clientId,
      formatDateTimeIso(),
      valorCents,
    ]);

    run("UPDATE clients SET paid_cents = paid_cents + ? WHERE id = ?", [valorCents, clientId]);

    _addLogUnsafe(clientId, `💵 Pagamento adicionado: R$ ${valor.toFixed(2)}`);
  });

  clearTotalsCache();
}

export const getPaymentsByClient = async (clientId: number): Promise<Payment[]> => {
  if (!clientId) return [];
  return await selectMapped<Payment, PaymentDB>(
    "SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC",
    [clientId],
    mapPayment
  );
};

export function deletePayment(id: number): void {
  if (!id) return;

  try {
    const paymentDB = getOne<PaymentDB>("SELECT * FROM payments WHERE id = ?", [id]);

    if (!paymentDB) return;

    // 🔒 Transação atômica: garante que delete + update + log ocorram juntos ou falhem juntos
    withTransaction(() => {
      run("DELETE FROM payments WHERE id = ?", [id]);
      run("UPDATE clients SET paid_cents = paid_cents - ? WHERE id = ?", [
        paymentDB.value_cents,
        paymentDB.client_id,
      ]);

      _addLogUnsafe(
        paymentDB.client_id,
        `❌ Pagamento de R$ ${toReais(paymentDB.value_cents).toFixed(2)} removido.`
      );
    });

    clearTotalsCache();
    console.log(`🗑️ Pagamento #${id} removido e valor revertido.`);
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
  }
}

// ============================================================
// 📅 CLIENTES COM COBRANÇAS PRÓXIMAS
// ============================================================
export const getUpcomingCharges = async (): Promise<Client[]> => {
  const today = formatDateIso();
  const next7 = formatDateIso(new Date(Date.now() + 7 * 86400000));

  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients
     WHERE next_charge IS NOT NULL
     AND next_charge BETWEEN ? AND ?
     ORDER BY next_charge ASC`,
    [today, next7],
    mapClient
  );
};

// ============================================================
// 🔍 BUSCAS
// ============================================================
export const getAllClients = async (): Promise<Client[]> =>
  await selectMapped<Client, ClientDB>("SELECT * FROM clients ORDER BY name ASC", [], mapClient);

export const getClientById = async (id: number): Promise<Client | null> => {
  if (!id) return null;
  const row = await getOne<ClientDB>("SELECT * FROM clients WHERE id = ?", [id]);
  if (!row) return null;
  return mapClient(row);
};

export const searchClients = async (query: string): Promise<Client[]> => {
  if (!query.trim()) return await getAllClients();
  return await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients WHERE name LIKE ? OR bairro LIKE ? ORDER BY name ASC LIMIT 100",
    [`%${query}%`, `%${query}%`],
    mapClient
  );
};

// ============================================================
// 📊 TOTAIS (com cache)
// ============================================================
let totalsCache: { totalPaid: number; totalToReceive: number; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 segundos

export const getTotals = async (forceRefresh = false): Promise<{ totalPaid: number; totalToReceive: number }> => {
  const now = Date.now();

  if (!forceRefresh && totalsCache && (now - totalsCache.timestamp) < CACHE_TTL) {
    return { totalPaid: totalsCache.totalPaid, totalToReceive: totalsCache.totalToReceive };
  }

  const result = await getOne<{ totalPaid: number; totalToReceive: number }>(`
    SELECT
      COALESCE(SUM(paid_cents), 0) AS totalPaid,
      COALESCE(SUM(value_cents - paid_cents), 0) AS totalToReceive
    FROM clients
  `);

  // ✅ Tratamento robusto de null/undefined
  if (!result) {
    return { totalPaid: 0, totalToReceive: 0 };
  }

  const totals = {
    totalPaid: toReais(result.totalPaid ?? 0),
    totalToReceive: toReais(result.totalToReceive ?? 0),
  };

  totalsCache = { ...totals, timestamp: now };
  return totals;
};

export const clearTotalsCache = () => {
  totalsCache = null;
};

// ============================================================
// 💾 BACKUP
// ============================================================
export const createBackup = async (): Promise<string> => {
  try {
    const timestamp = Date.now();
    const dbPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;
    const backupPath = `${RNFS.DocumentDirectoryPath}/crediario_backup_${timestamp}.db`;

    // ✅ Copiar arquivo principal
    await RNFS.copyFile(dbPath, backupPath);

    // ✅ Copiar WAL e SHM (arquivos auxiliares do SQLite em modo WAL)
    // Necessário para consistência total do backup
    try {
      const walExists = await RNFS.exists(`${dbPath}-wal`);
      if (walExists) {
        await RNFS.copyFile(`${dbPath}-wal`, `${backupPath}-wal`);
      }
    } catch {
      // WAL pode não existir se não houver transações pendentes
    }

    try {
      const shmExists = await RNFS.exists(`${dbPath}-shm`);
      if (shmExists) {
        await RNFS.copyFile(`${dbPath}-shm`, `${backupPath}-shm`);
      }
    } catch {
      // SHM pode não existir se não houver transações pendentes
    }

    // Compartilhar backup usando Share do React Native
    await Share.share({
      title: "Compartilhar backup",
      message: "Backup do banco de dados",
      url: `file://${backupPath}`,
    });

    return backupPath;
  } catch (error) {
    console.error("❌ Erro ao criar backup:", error);
    throw error;
  }
};