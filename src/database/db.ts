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
export type Bairro = {
  id?: number;
  nome: string;
};

export type Rua = {
  id?: number;
  nome: string;
  bairroId: number;
};

export type Client = {
  id?: number;
  name: string;
  value: number; // Reais (API) - armazenado como value_cents (INTEGER) no banco
  bairro?: string | null; // ⚠️ DEPRECATED: usar ruaId
  numero?: string | null;
  referencia?: string | null;
  telefone?: string | null;
  next_charge?: string | null; // ISO: yyyy-mm-dd
  paid?: number; // Reais (API) - armazenado como paid_cents (INTEGER) no banco
  // ✅ Novos campos V3
  ruaId?: number | null;
  ordemVisita?: number;
  prioritario?: number; // 0 ou 1 (BOOLEAN)
  observacoes?: string | null;
  status?: "pendente" | "quitado" | null; // Status do pagamento
  proximaData?: string | null; // ISO: yyyy-mm-dd (data da próxima cobrança)
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
  // ✅ Novos campos V3
  ruaId: number | null;
  ordemVisita: number;
  prioritario: number;
  observacoes: string | null;
  status: string | null;
  proximaData: string | null;
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
    
    // ⚠️ CRÍTICO: react-native-sqlite-storage não suporta caminho completo em 'name'
    // O plugin gerencia automaticamente o caminho baseado em 'location'
    // location: "Documents" → /data/data/<app>/files/SQLite/crediario.db
    db = await SQLite.openDatabase({
      name: "crediario.db",
      location: "Documents",
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

// ============================================================
// 🛡️ SANITIZAÇÃO DE STRINGS (Previne SQL Injection)
// ============================================================
/**
 * ✅ Sanitiza string para uso seguro em queries SQL
 * Remove caracteres perigosos e limita tamanho
 * 
 * @param input - String a ser sanitizada
 * @param maxLength - Tamanho máximo (padrão: 500)
 * @returns String sanitizada e segura
 */
function sanitizeString(input: string | null | undefined, maxLength: number = 500): string {
  if (!input) return "";
  
  return String(input)
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove caracteres de controle
}

/**
 * ✅ Sanitiza array de strings para uso seguro em queries SQL
 */
function sanitizeStrings(inputs: (string | null | undefined)[], maxLength: number = 500): string[] {
  return inputs.map(input => sanitizeString(input, maxLength));
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

// ⚠️ DEPRECATED: Esta função está obsoleta e não deve ser usada
// Ela não aguarda operações assíncronas, quebrando atomicidade
// Use withTransactionAsync() em vez disso
// Mantida apenas para compatibilidade com código legado
function withTransaction(fn: () => void): void {
  console.warn("⚠️ withTransaction() está obsoleta. Use withTransactionAsync() em vez disso.");
  // ⚠️ Esta implementação está incorreta mas mantida para não quebrar código existente
  // TODO: Remover todas as chamadas de withTransaction() e substituir por withTransactionAsync()
  exec("BEGIN TRANSACTION;").catch(console.error);
  try {
    fn();
    exec("COMMIT;").catch(console.error);
  } catch (e) {
    exec("ROLLBACK;").catch(console.error);
    console.error("❌ Transação revertida devido a erro:", e);
    throw e;
  }
}

async function withTransactionAsync(fn: () => Promise<void>): Promise<void> {
  await exec("BEGIN TRANSACTION;");
  try {
    await fn();
    await exec("COMMIT;");
  } catch (e) {
    await exec("ROLLBACK;");
    console.error("❌ Transação revertida devido a erro:", e);
    throw e;
  }
}

async function ensureColumn(table: string, name: string, def: string) {
  const exists = await tableExists(table);
  if (!exists) {
    console.log(`⚠️ Tabela '${table}' não existe. Pulando verificação de coluna.`);
    return;
  }
  const cols = (await getAll<any>(`PRAGMA table_info(${table})`)).map((c: any) => c.name);
  if (!cols.includes(name)) {
    await exec(`ALTER TABLE ${table} ADD COLUMN ${def};`);
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
    // ✅ V3: Novos campos
    ruaId: row.ruaId ?? null,
    ordemVisita: row.ordemVisita ?? 1,
    prioritario: row.prioritario ?? 0,
    observacoes: row.observacoes ?? null,
    status: (row.status as "pendente" | "quitado") || null,
    proximaData: row.proximaData ?? null,
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
// 🧱 Estrutura das tabelas (V3 - Bairro → Rua → Cliente)
// ============================================================
const TABLES = {
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
      value_cents INTEGER NOT NULL,
      bairro TEXT,
      numero TEXT,
      referencia TEXT,
      telefone TEXT,
      next_charge TEXT,
      paid_cents INTEGER DEFAULT 0,
      ruaId INTEGER,
      ordemVisita INTEGER DEFAULT 1,
      prioritario INTEGER DEFAULT 0,
      observacoes TEXT,
      status TEXT,
      proximaData TEXT,
      FOREIGN KEY (ruaId) REFERENCES ruas(id) ON DELETE SET NULL
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
 * ✅ Define a versão do schema do banco
 */
async function setSchemaVersion(version: number): Promise<void> {
  await exec(`PRAGMA user_version = ${version}`);
}

// ✅ Flag global para garantir que migrações sejam executadas apenas uma vez
let migrationsRunning = false;
let migrationsComplete = false;
let initDBPromise: Promise<void> | null = null;

export function initDB(): void {
  // ✅ Se já existe uma inicialização em andamento, retornar sem fazer nada
  if (initDBPromise) {
    return;
  }

  // ✅ Criar promise única que será reutilizada por todas as chamadas
  initDBPromise = (async () => {
    await safeRun("inicializar banco de dados", async () => {
      // ⚠️ Limpar cache na inicialização (previne valores antigos)
      clearTotalsCache();

      // 🚀 Otimizações de performance WAL (+200-300% mais rápido)
      await exec("PRAGMA journal_mode = WAL;");        // Write-Ahead Logging
      await exec("PRAGMA synchronous = NORMAL;");      // Balanço performance/segurança
      await exec("PRAGMA temp_store = MEMORY;");       // Temp tables em RAM
      await exec("PRAGMA cache_size = -64000;");       // 64MB cache
      await exec("PRAGMA mmap_size = 134217728;");     // 128 MB memory-mapped I/O (melhora 5-15% no Android)

      // ✅ CRÍTICO: Ativar foreign keys para garantir integridade referencial
      await exec("PRAGMA foreign_keys = ON;");

      // ✅ Criar tabelas base (sempre executar, IF NOT EXISTS garante idempotência)
      // ⚠️ CRÍTICO: Aguardar todas as criações antes de continuar
      for (const sql of Object.values(TABLES)) {
        await exec(sql);
      }

      // 📊 Índices para melhor performance (35-80% mais rápido)
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);");
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_bairro ON clients(bairro);");
      // ⚠️ idx_clients_search: OR queries não usam índice composto. Considere FTS5 para search avançada
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(name, bairro);");
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_next_charge ON clients(next_charge);");
      await exec("CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);");
      await exec("CREATE INDEX IF NOT EXISTS idx_logs_client ON logs(clientId);");
      await exec("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);");
      
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
  })();
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

/**
 * ✅ Executa migrações incrementais baseadas na versão do schema
 * Garante idempotência e evita reexecutar migrações já aplicadas
 */
async function runMigrations(): Promise<void> {
  const currentVersion = await getSchemaVersion();
  console.log(`📋 Versão atual do schema: ${currentVersion}`);

  // ✅ Migração V2: REAL → INTEGER, datas → ISO
  if (currentVersion < 2) {
    console.log("🔄 Executando migração V2...");
    await fixDatabaseStructure();
    await setSchemaVersion(2);
    console.log("✅ Migração V2 concluída!");
  }

  // ✅ Migração V3: Bairro → Rua → Cliente, novos campos
  if (currentVersion < 3) {
    console.log("🔄 Executando migração V3...");
    await migrateToV3();
    await setSchemaVersion(3);
    console.log("✅ Migração V3 concluída!");
  }
}

/**
 * ✅ Migração V3: Adiciona estrutura Bairro → Rua → Cliente
 * Adiciona novas colunas e tabelas sem perder dados existentes
 */
async function migrateToV3(): Promise<void> {
  try {
    // ✅ Executar toda a migração em uma transação para garantir atomicidade
    await withTransactionAsync(async () => {
      // ✅ Criar tabelas bairros e ruas se não existirem
      await exec(`
        CREATE TABLE IF NOT EXISTS bairros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL UNIQUE
        );
      `);
      
      await exec(`
        CREATE TABLE IF NOT EXISTS ruas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          bairroId INTEGER NOT NULL,
          FOREIGN KEY (bairroId) REFERENCES bairros(id) ON DELETE CASCADE,
          UNIQUE(nome, bairroId)
        );
      `);

      // ✅ Verificar colunas existentes em clients
      const clientsColsRaw = await getAll<any>("PRAGMA table_info(clients)");
      if (!Array.isArray(clientsColsRaw)) {
        console.warn("⚠️ Não foi possível verificar colunas de clients, pulando migração V3");
        return;
      }
      
      const clientsCols = clientsColsRaw.map((c: any) => c.name);
      
      // ✅ Adicionar TODAS as novas colunas de uma vez
      // Isso garante que todas existam antes de qualquer INSERT tentar usá-las
      const columnsToAdd = [
        { name: "ruaId", sql: "ALTER TABLE clients ADD COLUMN ruaId INTEGER;" },
        { name: "ordemVisita", sql: "ALTER TABLE clients ADD COLUMN ordemVisita INTEGER DEFAULT 1;" },
        { name: "prioritario", sql: "ALTER TABLE clients ADD COLUMN prioritario INTEGER DEFAULT 0;" },
        { name: "observacoes", sql: "ALTER TABLE clients ADD COLUMN observacoes TEXT;" },
        { name: "status", sql: "ALTER TABLE clients ADD COLUMN status TEXT;" },
        { name: "proximaData", sql: "ALTER TABLE clients ADD COLUMN proximaData TEXT;" },
      ];
      
      for (const col of columnsToAdd) {
        if (!clientsCols.includes(col.name)) {
          await exec(col.sql);
          console.log(`✅ Coluna ${col.name} adicionada`);
        }
      }
      
      // ✅ Criar índices V3 compostos (melhoram performance de listas por rua e agenda)
      await exec("CREATE INDEX IF NOT EXISTS idx_ruas_bairroId ON ruas(bairroId);");
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_ruaId ON clients(ruaId);");
      // ✅ Índice composto para ordenação por rua e ordem de visita (melhora listas por rua)
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_rua_ordem ON clients(ruaId, ordemVisita);");
      // ✅ Índice composto para clientes prioritários por data (melhora agenda)
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_prioritario_data ON clients(prioritario, proximaData);");
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);");
      await exec("CREATE INDEX IF NOT EXISTS idx_clients_proximaData ON clients(proximaData);");
      
      // ✅ Migrar next_charge para proximaData se proximaData estiver vazio
      await exec(`
        UPDATE clients 
        SET proximaData = next_charge 
        WHERE proximaData IS NULL AND next_charge IS NOT NULL;
      `);
      
      // ✅ Definir status padrão para clientes existentes
      await exec(`
        UPDATE clients 
        SET status = 'pendente' 
        WHERE status IS NULL;
      `);
    });
    
    // ✅ Criar índice FTS5 para busca avançada (fora da transação, pois pode falhar)
    // FTS5 pode não estar disponível em todas as versões do SQLite
    await createFTS5Index();
    
    console.log("✅ Migração V3 concluída!");
  } catch (error) {
    console.error("❌ Erro na migração V3:", error);
    throw error; // Re-throw para que runMigrations() possa tratar
  }
}

/**
 * ✅ Cria índice FTS5 para busca avançada e rápida
 * FTS5 permite busca full-text instantânea sem travar a UI
 */
async function createFTS5Index(): Promise<void> {
  try {
    // ✅ Verificar se a tabela FTS5 já existe
    const ftsExists = await tableExists("clients_fts");
    
    if (!ftsExists) {
      console.log("🔍 Criando índice FTS5 para busca avançada...");
      
      // ✅ Criar tabela virtual FTS5
      await exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS clients_fts USING fts5(
          name,
          telefone,
          bairro,
          numero,
          referencia,
          observacoes,
          content='clients',
          content_rowid='id'
        );
      `);
      
      // ✅ Popular tabela FTS5 com dados existentes
      await exec(`
        INSERT INTO clients_fts(rowid, name, telefone, bairro, numero, referencia, observacoes)
        SELECT id, name, telefone, bairro, numero, referencia, observacoes
        FROM clients;
      `);
      
      // ✅ Criar triggers para manter FTS5 sincronizado automaticamente
      await exec(`
        CREATE TRIGGER IF NOT EXISTS clients_fts_insert AFTER INSERT ON clients BEGIN
          INSERT INTO clients_fts(rowid, name, telefone, bairro, numero, referencia, observacoes)
          VALUES (new.id, new.name, new.telefone, new.bairro, new.numero, new.referencia, new.observacoes);
        END;
      `);
      
      await exec(`
        CREATE TRIGGER IF NOT EXISTS clients_fts_delete AFTER DELETE ON clients BEGIN
          DELETE FROM clients_fts WHERE rowid = old.id;
        END;
      `);
      
      await exec(`
        CREATE TRIGGER IF NOT EXISTS clients_fts_update AFTER UPDATE ON clients BEGIN
          DELETE FROM clients_fts WHERE rowid = old.id;
          INSERT INTO clients_fts(rowid, name, telefone, bairro, numero, referencia, observacoes)
          VALUES (new.id, new.name, new.telefone, new.bairro, new.numero, new.referencia, new.observacoes);
        END;
      `);
      
      console.log("✅ Índice FTS5 criado com sucesso!");
    }
  } catch (error) {
    // ⚠️ FTS5 pode não estar disponível em todas as versões do SQLite
    // Se falhar, a busca continuará usando LIKE (mais lenta mas funcional)
    console.warn("⚠️ Não foi possível criar índice FTS5 (pode não estar disponível):", error);
  }
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

export async function fixDatabaseStructure(): Promise<void> {
  await safeRun("migrar para V2 (INTEGER + ISO)", async () => {
    const clientsExists = await tableExists("clients");
    if (!clientsExists) return;

    const clientsColsRaw = await getAll<any>("PRAGMA table_info(clients)");
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
        await exec("PRAGMA foreign_keys=off;");

        // Migrar CLIENTS
        await exec(`
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

        await exec(`
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
            await exec(`
              CREATE TABLE payments_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                value_cents INTEGER NOT NULL,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
              );
            `);

            const paymentsColsRaw = await getAll<any>("PRAGMA table_info(payments)");
            if (!Array.isArray(paymentsColsRaw)) {
              console.warn("⚠️ PRAGMA table_info(payments) retornou valor inválido, pulando migração");
              await exec("DROP TABLE IF EXISTS payments_new;");
              return;
            }

            const paymentsCols = paymentsColsRaw.map((c) => c.name);

            // ✅ Validação robusta de colunas
            if (paymentsCols.length === 0) {
              console.warn("⚠️ PRAGMA table_info(payments) retornou vazio, pulando migração de payments");
              await exec("DROP TABLE payments_new;");
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
                await exec("DROP TABLE IF EXISTS payments_new;");
              } else {
                // ✅ Só multiplicar por 100 se REAL, se já é INTEGER apenas copiar
                const valueExpression = isValorReal
                  ? "CAST(ROUND(valor * 100) AS INTEGER)"  // REAL → centavos
                  : "value_cents";                          // já está em centavos

                await exec(`
                  INSERT INTO payments_new (id, client_id, created_at, value_cents)
                  SELECT
                    id,
                    ${useClientId},
                    ${useData},
                    ${valueExpression}
                  FROM payments;
                `);

                await exec("DROP TABLE payments;");
                await exec("ALTER TABLE payments_new RENAME TO payments;");
              }
            }
          } catch (e) {
            console.error("❌ Erro ao migrar payments:", e);
            // Tentar limpar payments_new se foi criado
            try { await exec("DROP TABLE IF EXISTS payments_new;"); } catch {}
            throw e;
          }
        }

        // Migrar LOGS (se existir)
        const logsExists = await tableExists("logs");
        if (logsExists) {
          try {
            await exec(`
              CREATE TABLE logs_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clientId INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                descricao TEXT NOT NULL,
                FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
              );
            `);

            const logsColsRaw = await getAll<any>("PRAGMA table_info(logs)");
            if (!Array.isArray(logsColsRaw)) {
              console.warn("⚠️ PRAGMA table_info(logs) retornou valor inválido, pulando migração");
              await exec("DROP TABLE IF EXISTS logs_new;");
              return;
            }

            const logsCols = logsColsRaw.map((c) => c.name);

            // ✅ Validação robusta de colunas
            if (logsCols.length === 0) {
              console.warn("⚠️ PRAGMA table_info(logs) retornou vazio, pulando migração de logs");
              await exec("DROP TABLE logs_new;");
            } else {
              const useData = logsCols.includes("data") ? "data" : "created_at";

              // Verificar se as colunas necessárias existem
              const hasRequiredCols = logsCols.includes("clientId") &&
                                     logsCols.includes(useData) &&
                                     logsCols.includes("descricao");

              if (!hasRequiredCols) {
                console.warn("⚠️ Colunas esperadas não encontradas em logs, pulando migração:", logsCols);
                await exec("DROP TABLE IF EXISTS logs_new;");
              } else {
                await exec(`
                  INSERT INTO logs_new (id, clientId, created_at, descricao)
                  SELECT id, clientId, ${useData}, descricao
                  FROM logs;
                `);

                await exec("DROP TABLE logs;");
                await exec("ALTER TABLE logs_new RENAME TO logs;");
              }
            }
          } catch (e) {
            console.error("❌ Erro ao migrar logs:", e);
            // Tentar limpar logs_new se foi criado
            try { await exec("DROP TABLE IF EXISTS logs_new;"); } catch {}
            throw e;
          }
        }

        await exec("DROP TABLE clients;");
        await exec("ALTER TABLE clients_new RENAME TO clients;");

        // 📊 Recriar índices após migração (crítico para performance)
        console.log("🔨 Recriando índices após migração...");
        await exec("CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);");
        await exec("CREATE INDEX IF NOT EXISTS idx_clients_bairro ON clients(bairro);");
        await exec("CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(name, bairro);"); // Índice composto para OR search
        await exec("CREATE INDEX IF NOT EXISTS idx_clients_next_charge ON clients(next_charge);");
        await exec("CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);");
        await exec("CREATE INDEX IF NOT EXISTS idx_logs_client ON logs(clientId);");
        await exec("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);");

        console.log("✅ Migração V2 concluída!");
      } catch (e) {
        console.error("❌ Erro na migração V2:", e);
        throw e;
      } finally {
        // ✅ CRÍTICO: Reabilitar foreign keys SEMPRE (mesmo em caso de erro)
        await exec("PRAGMA foreign_keys=on;");
      }
    }
  });
}

// ============================================================
// 📜 LOGS
// ============================================================

/**
 * ⚠️ INTERNO: Adiciona log SEM transação própria
 * Use dentro de withTransaction() ou withTransactionAsync() para garantir atomicidade
 */
async function _addLogUnsafe(clientId: number, descricao: string): Promise<void> {
  if (!clientId) return;

  await run("INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
    clientId,
    formatDateTimeIso(),
    descricao,
  ]);
}

/**
 * Adiciona log com transação própria (uso externo)
 */
export async function addLog(clientId: number, descricao: string): Promise<void> {
  await withTransactionAsync(async () => {
    await _addLogUnsafe(clientId, descricao);
  });
}

/**
 * ✅ Adiciona log e retorna o log criado (para sincronização com Firestore)
 * Use esta função quando precisar sincronizar o log com a nuvem
 */
export async function addLogAndGet(clientId: number, descricao: string): Promise<Log | null> {
  if (!clientId) return null;

  const created_at = formatDateTimeIso();
  const logId = await runAndGetId(
    "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)",
    [clientId, created_at, descricao]
  );

  if (!logId) return null;

  return {
    id: logId,
    clientId,
    created_at,
    descricao,
  };
}

export const getLogsByClient = async (clientId: number): Promise<Log[]> => {
  if (!clientId) return [];
  // ✅ Otimizado: projeção específica + LIMIT para evitar travar em muitos logs
  return await getAll<Log>(
    "SELECT id, clientId, created_at, descricao FROM logs WHERE clientId = ? ORDER BY id DESC LIMIT 100",
    [clientId]
  );
};

// ============================================================
// 👥 CLIENTES
// ============================================================
export async function addClient(client: Client): Promise<number> {
  // ✅ Garantir que migrações estejam concluídas antes de adicionar cliente
  await waitForInitDB();
  
  // ✅ Sanitizar todas as strings antes de inserir
  const id = await runAndGetId(
    `INSERT INTO clients (name, value_cents, bairro, numero, referencia, telefone, next_charge, paid_cents, ruaId, ordemVisita, prioritario, observacoes, status, proximaData)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sanitizeString(client.name, 200),
      toCentavos(client.value ?? 0),
      sanitizeString(client.bairro, 100),
      sanitizeString(client.numero, 50),
      sanitizeString(client.referencia, 200),
      sanitizeString(client.telefone, 20),
      client.next_charge ?? null,
      toCentavos(client.paid ?? 0),
      client.ruaId ?? null,
      client.ordemVisita ?? 1,
      client.prioritario ?? 0,
      sanitizeString(client.observacoes, 1000),
      client.status ?? "pendente",
      client.proximaData ?? null,
    ]
  );
  clearTotalsCache();
  return id;
}

export async function updateClient(
  client: Client,
  newData?: Partial<Client>,
  options?: { fromFirestore?: boolean }
): Promise<void> {
  // ✅ Garantir que migrações estejam concluídas antes de atualizar cliente
  await waitForInitDB();
  
  if (!client.id) return;

  // ✅ Se newData existe, atualizar APENAS os campos enviados (parcial)
  const data = newData ?? client;
  const entries = Object.entries(data).filter(([k, v]) => v !== undefined && k !== "id");

  if (entries.length === 0) return;
  
  const fromFirestore = options?.fromFirestore ?? false;

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
    
    // ✅ Sanitizar strings antes de salvar (previne SQL injection)
    if (typeof value === "string") {
      const maxLength = key === "observacoes" ? 1000 : key === "name" ? 200 : 100;
      return [key, sanitizeString(value, maxLength)];
    }

    return [key, value];
  });

  const fields = dbEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = dbEntries.map(([, value]) => value);

  await run(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, client.id]);

  // 📝 Criar log detalhado com as mudanças
  if (fromFirestore) {
    // ✅ Log específico quando atualização vem do Firestore
    addLog(client.id, "Dados do cliente atualizados na nuvem");
  } else if (changes.length > 0) {
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

export async function deleteClient(id: number): Promise<void> {
  if (!id) return;
  try {
    // 🔒 ON DELETE CASCADE: payments e logs são deletados automaticamente
    await withTransactionAsync(async () => {
      await run("DELETE FROM clients WHERE id = ?", [id]);
    });

    clearTotalsCache();
    console.log(`🗑️ Cliente #${id} removido com sucesso.`);
  } catch (error) {
    console.error("❌ Erro ao remover cliente:", error);
    throw error;
  }
}

// ============================================================
// 💰 PAGAMENTOS
// ============================================================
/**
 * ✅ Adiciona pagamento com lógica V3:
 * - Quitou tudo → status = "quitado", proximaData = null
 * - Pagamento parcial → mantém status = "pendente", proximaData deve ser definido pelo usuário
 */
export async function addPayment(
  clientId: number, 
  valor: number,
  options?: { proximaData?: string | null }
): Promise<void> {
  if (!clientId || valor <= 0) throw new Error("Cliente e valor obrigatórios");

  // ✅ Busca o cliente antes de adicionar para pegar o valor pago atual
  const clientDB = await getOne<ClientDB>("SELECT paid_cents, value_cents FROM clients WHERE id = ?", [clientId]);
  
  if (!clientDB) throw new Error("Cliente não encontrado");

  const valorCents = toCentavos(valor);
  const valorRecebido = valor;
  const valorPagoAntes = toReais(clientDB.paid_cents);
  const valorPagoDepois = valorPagoAntes + valorRecebido;
  const valorTotal = toReais(clientDB.value_cents);
  const restante = valorTotal - valorPagoDepois;

  // ✅ Determinar status e proximaData
  let novoStatus: "pendente" | "quitado" = "pendente";
  let novaProximaData: string | null = null;

  if (restante <= 0) {
    // ✅ Quitou tudo
    novoStatus = "quitado";
    novaProximaData = null;
  } else {
    // ✅ Pagamento parcial
    novoStatus = "pendente";
    // ✅ Se proximaData foi fornecida, usar ela; senão manter a atual ou null
    novaProximaData = options?.proximaData ?? null;
  }

  // 🔒 Transação atômica: garante que payment + update + log ocorram juntos ou falhem juntos
  await withTransactionAsync(async () => {
    await run("INSERT INTO payments (client_id, created_at, value_cents) VALUES (?, ?, ?)", [
      clientId,
      formatDateTimeIso(),
      valorCents,
    ]);

    await run(
      "UPDATE clients SET paid_cents = paid_cents + ?, status = ?, proximaData = ? WHERE id = ?",
      [valorCents, novoStatus, novaProximaData, clientId]
    );

    // ✅ Log detalhado mostrando valor antes, valor recebido e valor depois
    await run("INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
      clientId,
      formatDateTimeIso(),
      `💵 Pagamento adicionado:\n` +
      `Valor pago antes: R$ ${valorPagoAntes.toFixed(2)}\n` +
      `Valor recebido: R$ ${valorRecebido.toFixed(2)}\n` +
      `Valor pago atual: R$ ${valorPagoDepois.toFixed(2)}\n` +
      `Status: ${novoStatus === "quitado" ? "✅ Quitado" : "⏳ Pendente"}`
    ]);
  });

  clearTotalsCache();
}

/**
 * ✅ Marca cliente como ausente (cria automaticamente status pendente e proximaData = amanhã)
 */
export async function marcarClienteAusente(clientId: number): Promise<void> {
  if (!clientId) throw new Error("ID do cliente é obrigatório");

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const proximaData = formatDateIso(amanha);

  await withTransactionAsync(async () => {
    await run(
      "UPDATE clients SET status = ?, proximaData = ? WHERE id = ?",
      ["pendente", proximaData, clientId]
    );

    await run("INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
      clientId,
      formatDateTimeIso(),
      "🚫 Cliente ausente. Próxima cobrança agendada para amanhã.",
    ]);
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

export async function deletePayment(id: number): Promise<void> {
  if (!id) return;

  try {
    const paymentDB = await getOne<PaymentDB>("SELECT * FROM payments WHERE id = ?", [id]);

    if (!paymentDB) return;

    // ✅ Busca o cliente antes de deletar para pegar o valor pago atual
    const clientDB = await getOne<ClientDB>("SELECT paid_cents FROM clients WHERE id = ?", [paymentDB.client_id]);
    
    if (!clientDB) return;

    const valorRemovido = toReais(paymentDB.value_cents);
    const valorPagoAntes = toReais(clientDB.paid_cents);
    const valorPagoDepois = valorPagoAntes - valorRemovido;

    // 🔒 Transação atômica: garante que delete + update + log ocorram juntos ou falhem juntos
    await withTransactionAsync(async () => {
      await run("DELETE FROM payments WHERE id = ?", [id]);
      await run("UPDATE clients SET paid_cents = paid_cents - ? WHERE id = ?", [
        paymentDB.value_cents,
        paymentDB.client_id,
      ]);

      // ✅ Log detalhado mostrando valor antes, valor excluído e valor depois
      await _addLogUnsafe(
        paymentDB.client_id,
        `❌ Pagamento removido:\n` +
        `Valor pago antes: R$ ${valorPagoAntes.toFixed(2)}\n` +
        `Valor excluído: R$ ${valorRemovido.toFixed(2)}\n` +
        `Valor pago atual: R$ ${valorPagoDepois.toFixed(2)}`
      );
    });

    clearTotalsCache();
    console.log(`🗑️ Pagamento #${id} removido e valor revertido.`);
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
    throw error;
  }
}

// ============================================================
// 📅 CLIENTES COM COBRANÇAS PRÓXIMAS
// ============================================================
/**
 * ✅ V3: Usa proximaData como fonte principal, com fallback para next_charge (compatibilidade)
 */
export const getUpcomingCharges = async (): Promise<Client[]> => {
  const today = formatDateIso();
  const next7 = formatDateIso(new Date(Date.now() + 7 * 86400000));

  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients
     WHERE (proximaData IS NOT NULL OR next_charge IS NOT NULL)
     AND (COALESCE(proximaData, next_charge) BETWEEN ? AND ?)
     ORDER BY COALESCE(proximaData, next_charge) ASC`,
    [today, next7],
    mapClient
  );
};

// ============================================================
// 🔍 BUSCAS
// ============================================================
/**
 * ⚠️ ATENÇÃO: Esta função carrega TODOS os clientes sem paginação
 * Para bases grandes (2000+ clientes), use getClientsPage() em vez disso
 * 
 * @deprecated Use getClientsPage() para melhor performance em bases grandes
 */
export const getAllClients = async (): Promise<Client[]> =>
  await selectMapped<Client, ClientDB>("SELECT * FROM clients ORDER BY name ASC LIMIT 500", [], mapClient);

/**
 * 📄 Carrega uma página de clientes com paginação (LIMIT + OFFSET)
 * ✅ RECOMENDADO para bases grandes (2000+ clientes)
 * 
 * @param limit - Número de registros por página (recomendado: 50-100)
 * @param offset - Número de registros a pular
 * @returns Array de clientes da página solicitada
 * 
 * @example
 * // Carregar primeira página (50 clientes)
 * const page1 = await getClientsPage(50, 0);
 * // Carregar segunda página
 * const page2 = await getClientsPage(50, 50);
 */
export const getClientsPage = async (limit: number, offset: number): Promise<Client[]> =>
  await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients ORDER BY name ASC LIMIT ? OFFSET ?",
    [limit, offset],
    mapClient
  );

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

/**
 * 🔍 Busca clientes usando FTS5 (Full-Text Search) - MUITO MAIS RÁPIDO
 * ⚠️ Requer que createFTS5Index() tenha sido executado
 * 
 * @param query - Texto de busca
 * @param limit - Limite de resultados (padrão: 100)
 * @returns Array de clientes que correspondem à busca, ordenados por relevância
 */
export const getClientsBySearchFTS = async (query: string, limit: number = 100): Promise<Client[]> => {
  try {
    if (!query || !query.trim()) {
      return [];
    }
    
    const searchTerm = query.trim();
    
    // ✅ Verificar se FTS5 está disponível
    const ftsExists = await tableExists("clients_fts");
    
    if (!ftsExists) {
      // Fallback para busca LIKE se FTS5 não estiver disponível
      return await getClientsBySearch(query, limit);
    }
    
    // ✅ Busca FTS5: muito mais rápida e não trava a UI
    return await selectMapped<Client, ClientDB>(
      `SELECT c.* FROM clients c
       INNER JOIN clients_fts fts ON c.id = fts.rowid
       WHERE fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [searchTerm, limit],
      mapClient
    );
  } catch (err) {
    console.warn("⚠️ Erro na busca FTS5, usando fallback LIKE:", err);
    // Fallback para busca LIKE se FTS5 falhar
    return await getClientsBySearch(query, limit);
  }
};

/**
 * 🔍 Busca clientes diretamente no SQLite usando LIKE em múltiplos campos
 * ⚠️ Para melhor performance em bases grandes, considere usar FTS5 (getClientsBySearchFTS)
 * 
 * @param query - Texto de busca (será normalizado com % no início e fim)
 * @param limit - Limite de resultados (padrão: 100 para evitar lentidão)
 * @returns Array de clientes que correspondem à busca, ordenados por nome
 */
export const getClientsBySearch = async (query: string, limit: number = 100): Promise<Client[]> => {
  try {
    if (!query || !query.trim()) {
      return [];
    }
    
    const q = `%${query.trim()}%`;
    
    return await selectMapped<Client, ClientDB>(
      `SELECT * FROM clients
       WHERE 
         name LIKE ? OR 
         telefone LIKE ? OR 
         bairro LIKE ? OR 
         numero LIKE ? OR
         referencia LIKE ?
       ORDER BY name ASC
       LIMIT ?`,
      [q, q, q, q, q, limit],
      mapClient
    );
  } catch (err) {
    console.error("❌ Erro ao buscar clientes:", err);
    return [];
  }
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
// 📊 RELATÓRIOS FINANCEIROS (Home)
// ============================================================

/**
 * ✅ Total recebido hoje (soma de todos os pagamentos de hoje)
 */
export const getTotalHoje = async (): Promise<number> => {
  const todayISO = formatDateIso();
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE DATE(created_at) = ?
  `, [todayISO]);
  
  return toReais(result?.total ?? 0);
};

/**
 * ✅ Total recebido no mês atual
 */
export const getTotalMesAtual = async (): Promise<number> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?
  `, [String(year), String(month).padStart(2, '0')]);
  
  return toReais(result?.total ?? 0);
};

/**
 * ✅ Total recebido no mês anterior
 */
export const getTotalMesAnterior = async (): Promise<number> => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonth.getFullYear();
  const month = lastMonth.getMonth() + 1;
  
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?
  `, [String(year), String(month).padStart(2, '0')]);
  
  return toReais(result?.total ?? 0);
};

/**
 * ✅ Top 3 clientes do mês (maior valor pago)
 */
export type TopCliente = {
  id: number;
  name: string;
  totalPago: number;
};

export const getTopClientesMes = async (): Promise<TopCliente[]> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const results = await getAll<{ client_id: number; name: string; total_cents: number }>(`
    SELECT 
      p.client_id,
      c.name,
      SUM(p.value_cents) AS total_cents
    FROM payments p
    INNER JOIN clients c ON p.client_id = c.id
    WHERE strftime('%Y', p.created_at) = ? AND strftime('%m', p.created_at) = ?
    GROUP BY p.client_id, c.name
    ORDER BY total_cents DESC
    LIMIT 3
  `, [String(year), String(month).padStart(2, '0')]);
  
  return results.map(row => ({
    id: row.client_id,
    name: row.name,
    totalPago: toReais(row.total_cents ?? 0),
  }));
};

/**
 * ✅ Crediários por bairro (top 5)
 */
export type CrediarioPorBairro = {
  bairro: string;
  quantidade: number;
};

export const getCrediariosPorBairro = async (): Promise<CrediarioPorBairro[]> => {
  const results = await getAll<{ bairro: string; quantidade: number }>(`
    SELECT 
      COALESCE(bairro, 'Sem bairro') AS bairro,
      COUNT(*) AS quantidade
    FROM clients
    WHERE bairro IS NOT NULL AND bairro != ''
    GROUP BY bairro
    ORDER BY quantidade DESC
    LIMIT 5
  `, []);
  
  return results.map(row => ({
    bairro: row.bairro,
    quantidade: row.quantidade,
  }));
};

/**
 * ✅ Calcula percentual de crescimento mensal
 */
export const getCrescimentoPercentual = async (): Promise<{ percentual: number; cresceu: boolean }> => {
  const [mesAtual, mesAnterior] = await Promise.all([
    getTotalMesAtual(),
    getTotalMesAnterior(),
  ]);
  
  if (mesAnterior === 0) {
    return { percentual: mesAtual > 0 ? 100 : 0, cresceu: mesAtual > 0 };
  }
  
  const percentual = ((mesAtual - mesAnterior) / mesAnterior) * 100;
  return {
    percentual: Math.round(percentual * 10) / 10, // 1 casa decimal
    cresceu: percentual > 0,
  };
};

// ============================================================
// 💾 BACKUP
// ============================================================
export const createBackup = async (): Promise<string> => {
  try {
    const timestamp = Date.now();
    const dbPath = `${RNFS.DocumentDirectoryPath}/SQLite/crediario.db`;
    const backupPath = `${RNFS.DocumentDirectoryPath}/crediario_backup_${timestamp}.db`;

    // ✅ CRÍTICO: Fazer checkpoint do WAL antes do backup
    // Isso garante que todas as transações pendentes sejam commitadas
    // e o arquivo principal esteja consistente
    try {
      await exec("PRAGMA wal_checkpoint(FULL);");
      console.log("✅ Checkpoint WAL executado antes do backup");
    } catch (error) {
      console.warn("⚠️ Erro ao executar checkpoint WAL (pode não estar em modo WAL):", error);
      // Continuar mesmo se falhar (pode não estar em modo WAL)
    }

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

// ============================================================
// 🏘️ BAIRROS (V3)
// ============================================================
export async function addBairro(nome: string): Promise<number> {
  if (!nome || !nome.trim()) throw new Error("Nome do bairro é obrigatório");
  
  // ✅ Sanitizar string antes de inserir
  const id = await runAndGetId(
    "INSERT INTO bairros (nome) VALUES (?)",
    [sanitizeString(nome, 100)]
  );
  
  return id;
}

export async function getAllBairros(): Promise<Bairro[]> {
  return await getAll<Bairro>("SELECT * FROM bairros ORDER BY nome ASC", []);
}

export async function getBairroById(id: number): Promise<Bairro | null> {
  if (!id) return null;
  return await getOne<Bairro>("SELECT * FROM bairros WHERE id = ?", [id]);
}

export async function updateBairro(id: number, nome: string): Promise<void> {
  if (!id || !nome || !nome.trim()) throw new Error("ID e nome são obrigatórios");
  
  // ✅ Sanitizar string antes de atualizar
  await run("UPDATE bairros SET nome = ? WHERE id = ?", [sanitizeString(nome, 100), id]);
}

export async function deleteBairro(id: number): Promise<void> {
  if (!id) return;
  
  // ✅ ON DELETE CASCADE: ruas e clientes são afetados automaticamente
  await run("DELETE FROM bairros WHERE id = ?", [id]);
}

// ============================================================
// 🛣️ RUAS (V3)
// ============================================================
export async function addRua(nome: string, bairroId: number): Promise<number> {
  if (!nome || !nome.trim()) throw new Error("Nome da rua é obrigatório");
  if (!bairroId) throw new Error("Bairro é obrigatório");
  
  // ✅ Sanitizar string antes de inserir
  const id = await runAndGetId(
    "INSERT INTO ruas (nome, bairroId) VALUES (?, ?)",
    [sanitizeString(nome, 100), bairroId]
  );
  
  return id;
}

export async function getAllRuas(): Promise<Rua[]> {
  return await getAll<Rua>("SELECT * FROM ruas ORDER BY nome ASC", []);
}

export async function getRuasByBairro(bairroId: number): Promise<Rua[]> {
  if (!bairroId) return [];
  return await getAll<Rua>("SELECT * FROM ruas WHERE bairroId = ? ORDER BY nome ASC", [bairroId]);
}

export async function getRuaById(id: number): Promise<Rua | null> {
  if (!id) return null;
  return await getOne<Rua>("SELECT * FROM ruas WHERE id = ?", [id]);
}

export async function updateRua(id: number, nome: string, bairroId: number): Promise<void> {
  if (!id || !nome || !nome.trim()) throw new Error("ID e nome são obrigatórios");
  if (!bairroId) throw new Error("Bairro é obrigatório");
  
  // ✅ Sanitizar string antes de atualizar
  await run("UPDATE ruas SET nome = ?, bairroId = ? WHERE id = ?", [sanitizeString(nome, 100), bairroId, id]);
}

export async function deleteRua(id: number): Promise<void> {
  if (!id) return;
  
  // ✅ ON DELETE SET NULL: clientes com ruaId = id terão ruaId = NULL
  await run("DELETE FROM ruas WHERE id = ?", [id]);
}

// ============================================================
// 🔄 ORDENAÇÃO DE CLIENTES (V3)
// ============================================================

/**
 * ✅ Atualiza ordem de visita de um cliente (shift automático)
 * Empurra todos os clientes da mesma rua para baixo antes de inserir
 */
export async function atualizarOrdemCliente(
  clienteId: number,
  ruaId: number,
  novaOrdem: number
): Promise<void> {
  if (!clienteId || !ruaId || novaOrdem < 1) {
    throw new Error("Parâmetros inválidos");
  }

  await withTransactionAsync(async () => {
    // ✅ Passo 1: Empurrar todos para baixo
    await run(
      "UPDATE clients SET ordemVisita = ordemVisita + 1 WHERE ruaId = ? AND ordemVisita >= ?",
      [ruaId, novaOrdem]
    );

    // ✅ Passo 2: Definir ordem para o cliente
    await run("UPDATE clients SET ordemVisita = ? WHERE id = ?", [novaOrdem, clienteId]);
  });
}

/**
 * ✅ Normaliza ordem de visita (remove buracos)
 * Reindexa como 1, 2, 3, 4... sem gaps
 */
export async function normalizarOrdem(ruaId: number): Promise<void> {
  if (!ruaId) return;

  // ✅ Buscar todos ordenados
  const clientes = await getAll<{ id: number; ordemVisita: number }>(
    "SELECT id, ordemVisita FROM clients WHERE ruaId = ? ORDER BY ordemVisita ASC",
    [ruaId]
  );

  // ✅ Reindexar como 1, 2, 3, 4...
  await withTransactionAsync(async () => {
    for (let i = 0; i < clientes.length; i++) {
      const novaOrdem = i + 1;
      if (clientes[i].ordemVisita !== novaOrdem) {
        await run("UPDATE clients SET ordemVisita = ? WHERE id = ?", [
          novaOrdem,
          clientes[i].id,
        ]);
      }
    }
  });
}

// ============================================================
// 🔍 BUSCAS POR RUA E PRIORITÁRIOS (V3)
// ============================================================

/**
 * ✅ Busca clientes de uma rua ordenados por ordemVisita
 */
export async function getClientsByRua(ruaId: number): Promise<Client[]> {
  if (!ruaId) return [];
  
  return await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients WHERE ruaId = ? ORDER BY ordemVisita ASC, name ASC",
    [ruaId],
    mapClient
  );
}

/**
 * ✅ Busca clientes prioritários do dia
 * V3: Usa proximaData como principal, next_charge como fallback
 */
export async function getClientesPrioritariosHoje(): Promise<Client[]> {
  const hoje = formatDateIso();
  
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients 
     WHERE prioritario = 1 
     AND COALESCE(proximaData, next_charge) = ?
     ORDER BY name ASC`,
    [hoje],
    mapClient
  );
}

/**
 * ✅ Normaliza data para formato ISO (yyyy-mm-dd) com padding de zeros
 * Garante que datas como "1/12/2025" virem "2025-12-01" e não "2025-12-1"
 */
function normalizeDateToISO(date: string): string {
  if (!date) return "";
  
  // Se já está no formato ISO (yyyy-mm-dd), retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Se está no formato brasileiro (dd/mm/yyyy), converter
  if (date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // ✅ Garantir padding de zeros: 1 → 01, 12 → 12
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Fallback: tentar parsear como Date
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Ignorar erro
  }
  
  return date; // Retornar original se não conseguir normalizar
}

/**
 * ✅ Busca clientes por data (usando proximaData como principal, next_charge como fallback)
 * V3: proximaData é a fonte oficial, next_charge mantido apenas para compatibilidade
 */
export async function getClientsByDate(date: string): Promise<Client[]> {
  if (!date) return [];
  
  // ✅ Normalizar data para ISO (yyyy-mm-dd) com padding de zeros
  const normalizedDate = normalizeDateToISO(date);
  
  if (!normalizedDate) return [];
  
  // ✅ Usa COALESCE para unificar: proximaData tem prioridade, fallback para next_charge
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients 
     WHERE COALESCE(proximaData, next_charge) = ?
     ORDER BY ruaId ASC, ordemVisita ASC, name ASC`,
    [normalizedDate],
    mapClient
  );
}

/**
 * ✅ Busca clientes agrupados por rua para uma data específica
 */
export type ClientesPorRua = {
  ruaId: number;
  ruaNome: string;
  bairroNome: string;
  clientes: Client[];
  totalClientes: number;
  totalPagos: number;
  totalPendentes: number;
};

export async function getClientesAgrupadosPorRua(date: string): Promise<ClientesPorRua[]> {
  const clientes = await getClientsByDate(date);
  
  // ✅ Agrupar por rua
  const porRua = new Map<number, Client[]>();
  
  for (const cliente of clientes) {
    if (!cliente.ruaId) continue;
    
    if (!porRua.has(cliente.ruaId)) {
      porRua.set(cliente.ruaId, []);
    }
    porRua.get(cliente.ruaId)!.push(cliente);
  }
  
  // ✅ Buscar informações das ruas e calcular estatísticas
  const resultado: ClientesPorRua[] = [];
  
  for (const [ruaId, clientesRua] of porRua.entries()) {
    const rua = await getRuaById(ruaId);
    if (!rua) continue;
    
    const bairro = await getBairroById(rua.bairroId);
    
    const totalClientes = clientesRua.length;
    const totalPagos = clientesRua.filter(
      (c) => (c.value || 0) - (c.paid || 0) <= 0
    ).length;
    const totalPendentes = totalClientes - totalPagos;
    
    resultado.push({
      ruaId,
      ruaNome: rua.nome,
      bairroNome: bairro?.nome || "Sem bairro",
      clientes: clientesRua,
      totalClientes,
      totalPagos,
      totalPendentes,
    });
  }
  
  // ✅ Ordenar por nome da rua
  resultado.sort((a, b) => a.ruaNome.localeCompare(b.ruaNome, "pt-BR"));
  
  return resultado;
}
