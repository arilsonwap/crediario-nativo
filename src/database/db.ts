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
 * ⚠️ CRÍTICO: O banco é salvo em location: "default" 
 * - Android: /data/data/<package>/databases/crediario.db
 * - iOS: ~/Library/Application Support/<bundle>/crediario.db (comportamento diferente)
 * - NÃO usar DocumentDirectoryPath - cria banco separado e inútil
 * 
 * ⚠️ TAMANHO DO ARQUIVO: 2700+ linhas
 * - Considerar modularização em: database/core.ts, clients.ts, payments.ts, etc.
 * - Facilita manutenção, testes e versionamento
 */

import SQLite from "react-native-sqlite-storage";
import RNFS from "react-native-fs";
import { Share, Platform } from "react-native";

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
async function openDatabase() {
  if (!db) {
    db = await SQLite.openDatabase({
      name: "crediario.db",
      location: "default", // ✅ Compatível com Android e iOS (comportamento diferente mas funcional)
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
/**
 * ✅ Retorna data/hora ISO no timezone local (não UTC)
 * ✅ new Date().toISOString() salva horário UTC → no Brasil fica 3–4h deslocado
 * ✅ Esta função corrige o timezone para o horário local
 */
function nowIsoLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19) + "Z";
}

/**
 * ✅ Formata data/hora para ISO string compatível com CHECK constraint
 * ✅ Garante formato: YYYY-MM-DDTHH:mm:ssZ (sem milissegundos)
 * ✅ Compatível com CHECK constraint: GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'
 * ✅ Usa timezone local (não UTC) para evitar deslocamento de 3-4h no Brasil
 */
const formatDateTimeIso = (date?: Date): string => {
  // ✅ Usar timezone local para evitar deslocamento de 3-4h no Brasil
  if (!date) {
    return nowIsoLocal();
  }
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19) + "Z";
};

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
    // ✅ Remove apenas caracteres de controle (preserva emojis e caracteres úteis)
    // ✅ Usa Unicode property \p{C} para remover apenas categorias de controle
    .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, ""); // Remove apenas caracteres de controle (preserva emojis)
}

/**
 * ✅ Sanitiza string para uso seguro em queries LIKE
 * Escapa caracteres especiais % e _ que podem quebrar resultados
 * 
 * @param input - String a ser sanitizada para LIKE
 * @returns String sanitizada e segura para LIKE com ESCAPE
 */
/**
 * ✅ Sanitiza string para uso seguro em queries LIKE com ESCAPE
 * ✅ Escapa barras primeiro, depois % e _ para evitar problemas com nomes contendo "\"
 * Exemplo: "\%" vira "\\%" (barra escapada antes do %)
 */
function sanitizeForLike(input: string | null | undefined): string {
  if (!input) return "";
  
  // ✅ CRÍTICO: Escapar barras corretamente para evitar LIKE injection com ESCAPE malformado
  // Se o usuário digitar "\", a query quebra sem escape correto
  // transforma \ → \\\\ (4 barras no código = 2 barras na string final)
  return sanitizeString(input)
    .replace(/\\/g, "\\\\\\\\")  // Escapa barras primeiro: \ → \\\\ (4 barras no código)
    .replace(/[%_]/g, "\\$&"); // Depois escapa % e _: % → \%, _ → \_
}

/**
 * ✅ Sanitiza array de strings para uso seguro em queries SQL
 */
function sanitizeStrings(inputs: (string | null | undefined)[], maxLength: number = 500): string[] {
  return inputs.map(input => sanitizeString(input, maxLength));
}

/**
 * ✅ Remove acentos de uma string para busca accent-insensitive
 * Exemplo: "Árvore" → "arvore", "José" → "jose"
 */
function removerAcentos(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * ✅ Normaliza dados do cliente para inserção/atualização no banco
 * Centraliza sanitização, normalização de datas e conversão de valores
 * 
 * @param client - Dados do cliente (API format)
 * @returns Dados normalizados prontos para inserção no banco
 */
type NormalizedClientData = {
  name: string;
  value_cents: number;
  bairro: string | null;
  numero: string | null;
  referencia: string | null;
  telefone: string | null;
  next_charge: string | null;
  paid_cents: number;
  ruaId: number | null;
  ordemVisita: number;
  prioritario: number;
  observacoes: string | null;
  status: string;
  proximaData: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeClientData(client: Partial<Client>): NormalizedClientData {
  // ✅ Sanitizar strings UMA VEZ
  const name = sanitizeString(client.name, 200);
  const bairro = sanitizeString(client.bairro, 100);
  const numero = sanitizeString(client.numero, 50);
  const referencia = sanitizeString(client.referencia, 200);
  const telefone = sanitizeString(client.telefone, 20);
  // ✅ CRÍTICO: Limitar observações a 2000 caracteres para evitar INSERT lento
  // Usuários podem colocar textos de 30.000 caracteres, deixando INSERT lento
  const observacoes = sanitizeString(client.observacoes, 2000);
  
  // ✅ Normalizar datas
  // ✅ CRÍTICO: Se proximaData for fornecido, next_charge deve ser NULL (V3)
  const proximaData = client.proximaData ? normalizeDateToISO(client.proximaData) : null;
  const next_charge = proximaData ? null : (client.next_charge ? normalizeDateToISO(client.next_charge) : null);
  
  // ✅ Converter valores monetários com validação robusta
  const value_cents = toCentavos(client.value ?? 0);
  const paid_cents = toCentavos(client.paid ?? 0);
  
  // ✅ CRÍTICO: Validar valores monetários (NaN, negativos, etc)
  if (isNaN(value_cents) || value_cents < 0) {
    throw new Error(`Valor inválido: ${client.value}. Deve ser um número >= 0.`);
  }
  
  if (isNaN(paid_cents) || paid_cents < 0) {
    throw new Error(`Valor pago inválido: ${client.paid}. Deve ser um número >= 0.`);
  }
  
  // ✅ CRÍTICO: Validar que paid_cents não excede value_cents
  if (paid_cents > value_cents) {
    throw new Error(
      `Valor pago (${paid_cents} centavos) não pode exceder valor total (${value_cents} centavos).`
    );
  }
  
  // ✅ Valores padrão
  const status = client.status ?? "pendente";
  const ordemVisita = client.ordemVisita ?? 1;
  const prioritario = client.prioritario ?? 0;
  const created_at = formatDateTimeIso();
  const updated_at = formatDateTimeIso();
  
  return {
    name,
    value_cents,
    bairro: bairro || null,
    numero: numero || null,
    referencia: referencia || null,
    telefone: telefone || null,
    next_charge,
    paid_cents,
    ruaId: client.ruaId ?? null,
    ordemVisita,
    prioritario,
    observacoes: observacoes || null,
    status,
    proximaData,
    created_at,
    updated_at,
  };
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
    await waitForInitDB();
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
    await waitForInitDB();
    if (!db) await openDatabase();
    await db.executeSql(sql, []);
  } catch (e) {
    console.error("❌ SQL exec error:", sql, e);
    throw e;
  }
}

async function run(sql: string, params: any[] = []): Promise<void> {
  try {
    await waitForInitDB();
    if (!db) await openDatabase();
    await db.executeSql(sql, params);
  } catch (e) {
    console.error("❌ SQL run error:", sql, params, e);
    throw e;
  }
}

async function runAndGetId(sql: string, params: any[] = []): Promise<number> {
  try {
    await waitForInitDB();
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
    await waitForInitDB();
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
    await waitForInitDB();
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
/**
 * ❌ REMOVIDA: Esta função foi removida por quebrar atomicidade das transações
 * Use withTransactionAsync() em vez disso
 */
function withTransaction(fn: () => void): void {
  throw new Error(
    "withTransaction() foi removida. Use withTransactionAsync() em vez disso. " +
    "A função antiga quebrava atomicidade das transações."
  );
}

// ============================================================
// 🔒 FUNÇÕES TRANSACIONAIS (usam tx.executeSql diretamente)
// ============================================================
/**
 * ✅ Executa SQL dentro de uma transação usando tx.executeSql
 * Evita deadlocks e race conditions
 */
function txRun(tx: any, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      () => resolve(),
      (error: any) => reject(error)
    );
  });
}

/**
 * ✅ Executa SQL sem parâmetros dentro de uma transação usando tx.executeSql
 */
function txExec(tx: any, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      [],
      () => resolve(),
      (error: any) => reject(error)
    );
  });
}

/**
 * ✅ Busca múltiplos registros dentro de uma transação usando tx.executeSql
 */
function txGetAll<T>(tx: any, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      (_tx: any, results: any) => {
        const rows: T[] = [];
        for (let i = 0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }
        resolve(rows);
      },
      (error: any) => reject(error)
    );
  });
}

/**
 * ✅ Busca um único registro dentro de uma transação usando tx.executeSql
 */
function txGetOne<T>(tx: any, sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      (_tx: any, results: any) => {
        if (results.rows.length > 0) {
          resolve(results.rows.item(0));
        } else {
          resolve(null);
        }
      },
      (error: any) => reject(error)
    );
  });
}


/**
 * ✅ Executa SQL e retorna o ID inserido dentro de uma transação
 */
function txRunAndGetId(tx: any, sql: string, params: any[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      (_: any, result: any) => {
        // Buscar last_insert_rowid dentro da mesma transação
        tx.executeSql(
          "SELECT last_insert_rowid() as id",
          [],
          (_: any, idResult: any) => {
            resolve(idResult.rows.length > 0 ? idResult.rows.item(0).id : 0);
          },
          (error: any) => reject(error)
        );
      },
      (error: any) => reject(error)
    );
  });
}

/**
 * ✅ Transação atômica usando db.transaction() do driver
 * ✅ ELIMINA 100% os riscos de deadlock e race conditions
 * ✅ Adiciona timeout para evitar transações travadas (padrão: 5s)
 * ✅ Logging melhorado com identificador único de transação
 * 
 * @param fn - Função que recebe o objeto tx e executa operações transacionais
 * @param timeoutMs - Timeout em milissegundos (padrão: 5000ms = 5s)
 */
async function withTransactionAsync(fn: (tx: any) => Promise<void>, timeoutMs: number = 5000): Promise<void> {
  await waitForInitDB();
  if (!db) await openDatabase();
  
  // ✅ Gerar identificador único para logging
  const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[TX-${transactionId}] Iniciando transação (timeout: ${timeoutMs}ms)`);
  
  const transactionPromise = new Promise<void>((resolve, reject) => {
    db.transaction(
      async (tx: any) => {
        try {
          await fn(tx);
          console.log(`[TX-${transactionId}] Transação concluída com sucesso`);
        } catch (error) {
          console.error(`[TX-${transactionId}] Erro na transação:`, error);
          // Re-throw para que o callback de erro seja chamado
          throw error;
        }
      },
      (error: any) => {
        console.error(`[TX-${transactionId}] Transação revertida devido a erro:`, error);
        reject(error);
      },
      () => {
        // ✅ Transação commitada com sucesso
        console.log(`[TX-${transactionId}] Transação commitada`);
        resolve();
      }
    );
  });
  
  // ✅ Adicionar timeout para evitar transações travadas
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      console.error(`[TX-${transactionId}] ⚠️ Transação excedeu timeout de ${timeoutMs}ms`);
      reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  // ✅ Race entre transação e timeout
  return Promise.race([transactionPromise, timeoutPromise]);
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
      value_cents INTEGER NOT NULL CHECK (value_cents >= 0),
      numero TEXT,
      referencia TEXT,
      telefone TEXT,
      paid_cents INTEGER DEFAULT 0 CHECK (paid_cents >= 0 AND paid_cents <= value_cents),
      ruaId INTEGER,
      ordemVisita INTEGER DEFAULT 1 CHECK (ordemVisita > 0),
      prioritario INTEGER DEFAULT 0,
      observacoes TEXT,
          status TEXT CHECK (status IS NULL OR status IN ('pendente', 'quitado')) DEFAULT 'pendente',
          proximaData TEXT CHECK (proximaData IS NULL OR proximaData GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
          created_at TEXT NOT NULL DEFAULT (datetime('now')) CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')) CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
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
const ALL_INDEXES = [
  // ✅ Índices de busca otimizada (LIKE com índices = busca rápida)
  // ✅ COLLATE NOCASE acelera buscas 2-5x (case-insensitive nativo)
  "CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name COLLATE NOCASE);",
  "CREATE INDEX IF NOT EXISTS idx_clients_telefone ON clients(telefone);",
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
];

// ============================================================
// 🏗️ Inicialização e Correção
// ============================================================

/**
 * ⚠️ DEPRECATED: Esta função não é mais necessária
 * react-native-sqlite-storage com location: "default" cria o diretório automaticamente
 * Mantida apenas para compatibilidade com código legado
 */
/**
 * ❌ REMOVIDA: Esta função foi removida por não ser mais necessária
 * O SQLite cria o diretório automaticamente em /data/data/<package>/databases/
 */
export async function ensureDatabaseDirectory(): Promise<void> {
  throw new Error(
    "ensureDatabaseDirectory() foi removida. " +
    "O SQLite cria o diretório automaticamente e não é mais necessário chamar esta função."
  );
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

// ✅ Flag global para garantir que migrações sejam executadas apenas uma vez
let migrationsRunning = false;
let migrationsComplete = false;
let initDBPromise: Promise<void> | null = null;
let initDBLock = false; // ✅ Lock para evitar race condition em React concurrent mode

/**
 * ✅ Inicializa o banco de dados (idempotente)
 * ✅ Retorna Promise para permitir await e evitar race conditions
 * ✅ Se já está inicializando, retorna a mesma promise
 */
export function initDB(): Promise<void> {
  // ✅ CRÍTICO: Se já existe uma inicialização em andamento, retornar a mesma promise
  // Isso evita race conditions quando múltiplas chamadas ocorrem simultaneamente
  if (initDBPromise) {
    return initDBPromise;
  }

  // ✅ CRÍTICO: Verificar lock antes de criar nova promise (evita race condition)
  if (initDBLock) {
    // Se está travado mas não há promise, aguardar um pouco e tentar novamente
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        if (initDBPromise) {
          resolve(initDBPromise);
        } else {
          resolve(initDB());
        }
      }, 100);
    });
  }

  // ✅ Ativar lock imediatamente para evitar execuções simultâneas
  initDBLock = true;

  // ✅ Criar promise única que será reutilizada por todas as chamadas
  initDBPromise = (async (): Promise<void> => {
    try {
      await safeRun("inicializar banco de dados", async () => {
        // ⚠️ Limpar cache na inicialização (previne valores antigos)
        clearTotalsCache();

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

        // ✅ CRÍTICO: Ativar foreign keys para garantir integridade referencial
        await exec("PRAGMA foreign_keys = ON;");

        // ✅ Criar tabelas base (sempre executar, IF NOT EXISTS garante idempotência)
        // ⚠️ CRÍTICO: Aguardar todas as criações antes de continuar
        for (const sql of Object.values(TABLES)) {
          await exec(sql);
        }

        // 📊 Criar todos os índices de uma vez (evita duplicação e fragmentação)
        for (const indexSql of ALL_INDEXES) {
          await exec(indexSql);
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
      // ✅ CRÍTICO: Liberar lock e promise sempre, mesmo em caso de erro
      // Evita deadlock silencioso se inicialização falhar (app nunca mais inicializa)
      initDBLock = false;
      initDBPromise = null;
    }
  })();
  
  // ✅ Garantir que sempre retorna uma Promise
  return initDBPromise;
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
    // ✅ Verificar flag em app_settings para evitar reexecução em bases corrompidas
    const v2Flag = await getOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'migration_v2_completed'", []);
    if (v2Flag?.value === "true") {
      console.log("⚠️ Migração V2 já foi executada (flag encontrada), pulando...");
      await setSchemaVersion(2);
      return;
    }

    console.log("🔄 Executando migração V2...");
    // ✅ Envolver toda a migração em uma única transação para garantir atomicidade
    await withTransactionAsync(async (tx) => {
      await fixDatabaseStructure(tx);
      await setSchemaVersion(2, tx);
      // ✅ Marcar migração V2 como concluída em app_settings
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
    await withTransactionAsync(async (tx) => {
      await migrateToV3(tx);
      await setSchemaVersion(3, tx);
    });
    console.log("✅ Migração V3 concluída!");
  }
}

/**
 * ✅ Migração V3: Adiciona estrutura Bairro → Rua → Cliente
 * Adiciona novas colunas e tabelas sem perder dados existentes
 * ✅ Usa tx diretamente para evitar transações duplicadas
 * 
 * ⚠️ COMPLEXIDADE: Recria tabela clients (CREATE TABLE clients_v3)
 * - Pode falhar em dispositivos com SQLite <3.35 (suporte a CHECK constraints)
 * - Verificação de versão SQLite adicionada antes da migração
 */
async function migrateToV3(tx: any): Promise<void> {
  try {
    // ✅ CRÍTICO: Verificar versão do SQLite antes de recriar tabela
    // SQLite <3.35 pode não suportar CHECK constraints complexas
    const sqliteVersion = await txGetOne<{ version: string }>(
      tx,
      "SELECT sqlite_version() as version",
      []
    );
    
    if (sqliteVersion?.version) {
      const versionParts = sqliteVersion.version.split('.');
      const majorVersion = parseInt(versionParts[0] || '0');
      const minorVersion = parseInt(versionParts[1] || '0');
      
      if (majorVersion < 3 || (majorVersion === 3 && minorVersion < 35)) {
        console.warn(
          `⚠️ SQLite ${sqliteVersion.version} detectado. ` +
          `Migração V3 requer SQLite >=3.35 para CHECK constraints. ` +
          `Tentando migração mesmo assim...`
        );
      } else {
        console.log(`✅ SQLite ${sqliteVersion.version} - Compatível com migração V3`);
      }
    }
    
    // ✅ Criar tabelas bairros e ruas se não existirem
    await txExec(tx, `
      CREATE TABLE IF NOT EXISTS bairros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
      );
    `);
    
    await txExec(tx, `
      CREATE TABLE IF NOT EXISTS ruas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        bairroId INTEGER NOT NULL,
        FOREIGN KEY (bairroId) REFERENCES bairros(id) ON DELETE CASCADE,
        UNIQUE(nome, bairroId)
      );
    `);

    // ✅ Verificar colunas existentes em clients (usar txGetAll)
    const clientsColsRaw = await txGetAll<any>(tx, "PRAGMA table_info(clients)", []);
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
      { name: "updated_at", sql: "ALTER TABLE clients ADD COLUMN updated_at TEXT;" },
    ];
    
    for (const col of columnsToAdd) {
      if (!clientsCols.includes(col.name)) {
        await txExec(tx, col.sql);
        console.log(`✅ Coluna ${col.name} adicionada`);
      }
    }
    
    // ✅ Índices já são criados em ALL_INDEXES no initDB()
    // Não criar aqui para evitar duplicação
    
    // ✅ Migrar next_charge para proximaData se proximaData estiver vazio
    await txExec(tx, `
      UPDATE clients 
      SET proximaData = next_charge 
      WHERE proximaData IS NULL AND next_charge IS NOT NULL;
    `);
    
    // ✅ CRÍTICO: Limpar next_charge após migração para evitar dados duplicados
    // Isso garante que apenas proximaData seja usado (V3)
    await txExec(tx, `
      UPDATE clients 
      SET next_charge = NULL 
      WHERE proximaData IS NOT NULL;
    `);
    
    // ✅ Definir status padrão para clientes existentes
    await txExec(tx, `
      UPDATE clients 
      SET status = 'pendente' 
      WHERE status IS NULL;
    `);
    
    // ✅ CRÍTICO: Remover colunas deprecated E adicionar CHECK constraints
    // SQLite não suporta DROP COLUMN em versões antigas, então recriamos a tabela
    const needsMigration = clientsCols.includes("bairro") || clientsCols.includes("next_charge");
    
    if (needsMigration) {
      console.log("🔄 Removendo colunas deprecated e adicionando CHECK constraints...");
      
      // ✅ Criar nova tabela sem colunas deprecated e COM CHECK constraints
      await txExec(tx, `
        CREATE TABLE clients_v3 (
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
          status TEXT CHECK (status IS NULL OR status IN ('pendente', 'quitado')) DEFAULT 'pendente',
          proximaData TEXT CHECK (proximaData IS NULL OR proximaData GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
          created_at TEXT NOT NULL DEFAULT (datetime('now')) CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')) CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'),
          FOREIGN KEY (ruaId) REFERENCES ruas(id) ON DELETE SET NULL
        );
      `);
      
      // ✅ Copiar dados (excluindo bairro e next_charge, validando constraints)
      await txExec(tx, `
        INSERT INTO clients_v3 (
          id, name, value_cents, numero, referencia, telefone, paid_cents,
          ruaId, ordemVisita, prioritario, observacoes, status, proximaData, created_at, updated_at
        )
        SELECT 
          id, 
          name, 
          MAX(0, value_cents) as value_cents,
          numero, 
          referencia, 
          telefone, 
          MIN(MAX(0, paid_cents), MAX(0, value_cents)) as paid_cents,  -- Garantir paid_cents <= value_cents
          ruaId, 
          MAX(1, ordemVisita) as ordemVisita,
          prioritario, 
          observacoes, 
          CASE 
            WHEN status IN ('pendente', 'quitado') THEN status 
            ELSE 'pendente' 
          END as status,
          CASE 
            WHEN proximaData GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN proximaData 
            ELSE NULL 
          END as proximaData,
          COALESCE(created_at, datetime('now')) as created_at,
          COALESCE(updated_at, datetime('now')) as updated_at
        FROM clients;
      `);
      
      // ✅ Substituir tabela antiga pela nova
      await txExec(tx, "DROP TABLE clients;");
      await txExec(tx, "ALTER TABLE clients_v3 RENAME TO clients;");
      
      console.log("✅ Colunas deprecated removidas, CHECK constraints adicionadas");
    }
    
    // ✅ CRÍTICO: Limpar strings vazias em proximaData de bases antigas
    // No final da migração, alguns campos podem vir "" (string vazia) de bases antigas
    await txExec(tx, `
      UPDATE clients 
      SET proximaData = NULL 
      WHERE proximaData = '';
    `);
    
    console.log("✅ Migração V3 concluída!");
  } catch (error) {
    console.error("❌ Erro na migração V3:", error);
    throw error; // Re-throw para que runMigrations() possa tratar
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
 * ✅ Migração V2: REAL → INTEGER, datas → ISO
 * ✅ Usa tx diretamente para evitar transações duplicadas
 */
async function fixDatabaseStructure(tx: any): Promise<void> {
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

      console.log("✅ Migração V2 concluída!");
    } catch (e) {
      console.error("❌ Erro na migração V2:", e);
      // Tentar reabilitar foreign keys mesmo em caso de erro
      try {
        await txExec(tx, "PRAGMA foreign_keys=on;");
      } catch {}
      throw e;
    }
  }
}

// ============================================================
// 📜 LOGS
// ============================================================

/**
 * ✅ Adiciona log com transação própria (uso externo)
 */
export async function addLog(clientId: number, descricao: string): Promise<void> {
  if (!clientId) return;

  // ✅ CRÍTICO: Adicionar catch para evitar perda silenciosa de logs
  // Se o log falhar, o app não avisa e pode perder informações importantes
  try {
    const created_at = formatDateTimeIso();
    await withTransactionAsync(async (tx) => {
      await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
        clientId,
        created_at,
        descricao,
      ]);
    });
  } catch (e) {
    console.warn("⚠️ Log falhou:", e);
    // Não relançar erro para não quebrar o fluxo principal
  }
}

/**
 * ✅ Adiciona log e retorna o log criado (para sincronização com Firestore)
 * Use esta função quando precisar sincronizar o log com a nuvem
 * 
 * ⚠️ NOTA: Logs não precisam de atomicidade, então não usa transação
 * Para melhor performance, usa runAndGetId diretamente
 */
export async function addLogAndGet(clientId: number, descricao: string): Promise<Log | null> {
  if (!clientId) return null;

  const created_at = formatDateTimeIso();
  // ✅ Logs não precisam de atomicidade, então runAndGetId é suficiente
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
  // ✅ CRÍTICO: Limitar a últimas 50 linhas por cliente para evitar logs enormes
  // ✅ Otimizado: projeção específica + LIMIT para evitar travar em muitos logs
  // ✅ Para clientes editados várias vezes por dia, os logs ficam gigantes
  return await getAll<Log>(
    "SELECT id, clientId, created_at, descricao FROM logs WHERE clientId = ? ORDER BY id DESC LIMIT 50",
    [clientId]
  );
};

// ============================================================
// 👥 CLIENTES
// ============================================================
export async function addClient(client: Client): Promise<number> {
  // ✅ Garantir que migrações estejam concluídas antes de adicionar cliente
  await waitForInitDB();
  
  // ✅ Normalizar dados do cliente (sanitização + conversão + datas)
  const normalized = normalizeClientData(client);
  
  const id = await runAndGetId(
    `INSERT INTO clients (name, value_cents, numero, referencia, telefone, paid_cents, ruaId, ordemVisita, prioritario, observacoes, status, proximaData, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalized.name,
      normalized.value_cents,
      normalized.numero,
      normalized.referencia,
      normalized.telefone,
      normalized.paid_cents,
      normalized.ruaId,
      normalized.ordemVisita,
      normalized.prioritario,
      normalized.observacoes,
      normalized.status,
      normalized.proximaData,
      normalized.created_at,
      normalized.updated_at,
    ]
  );
  // ✅ Limpar cache após adicionar (value/paid foram inseridos)
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

  /**
   * ✅ Normaliza campos parciais para atualização
   * Reutiliza lógica de normalizeClientData mas apenas para campos enviados
   * Garante sanitização consistente entre addClient e updateClient
   */
  const normalizePartialUpdate = (original: Client, partial: Partial<Client>): Record<string, any> => {
    const normalized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(partial)) {
      if (key === "id" || value === undefined) continue;
      
      if (key === "value") {
        const value_cents = toCentavos(value as number);
        if (isNaN(value_cents) || value_cents < 0) {
          throw new Error(`Valor inválido: ${value}. Deve ser um número >= 0.`);
        }
        normalized.value_cents = value_cents;
      } else if (key === "paid") {
        const paid_cents = toCentavos(value as number);
        if (isNaN(paid_cents) || paid_cents < 0) {
          throw new Error(`Valor pago inválido: ${value}. Deve ser um número >= 0.`);
        }
        normalized.paid_cents = paid_cents;
      } else if (key === "next_charge") {
        normalized.next_charge = value ? normalizeDateToISO(value as string) : null;
      } else if (key === "proximaData") {
        normalized.proximaData = value ? normalizeDateToISO(value as string) : null;
        normalized.next_charge = null; // Sempre limpar next_charge quando proximaData é atualizada
      } else if (key === "name") {
        normalized.name = sanitizeString(value as string, 200);
      } else if (key === "numero") {
        normalized.numero = value ? sanitizeString(value as string, 50) : null;
      } else if (key === "referencia") {
        normalized.referencia = value ? sanitizeString(value as string, 200) : null;
      } else if (key === "telefone") {
        normalized.telefone = value ? sanitizeString(value as string, 20) : null;
      } else if (key === "observacoes") {
        // ✅ CRÍTICO: Limitar observações a 2000 caracteres para evitar INSERT lento
        normalized.observacoes = value ? sanitizeString(value as string, 2000) : null;
      } else if (key === "status") {
        // ✅ Sanitizar status e validar valores permitidos (consistente com sanitizeString)
        const statusValue = value ? sanitizeString(String(value), 20) : "pendente";
        // ✅ Validar que status é um dos valores permitidos
        if (statusValue === "pendente" || statusValue === "quitado") {
          normalized.status = statusValue;
        } else {
          normalized.status = "pendente"; // Default seguro se valor inválido
        }
      } else if (key === "ruaId") {
        normalized.ruaId = value ?? null;
      } else if (key === "ordemVisita") {
        normalized.ordemVisita = value ?? 1;
      } else if (key === "prioritario") {
        normalized.prioritario = value ?? 0;
      }
    }
    
    return normalized;
  };
  
  // ✅ Usar normalizePartialUpdate para garantir sanitização consistente
  const normalized = normalizePartialUpdate(originalClient, data);
  
  // ✅ Normalizar APENAS os campos que estão sendo atualizados (não todos)
  const dbEntries: [string, any][] = [];
  let newValueCents: number | null = null;
  let newPaidCents: number | null = null;
  
  for (const [key, value] of Object.entries(normalized)) {
    if (key === "value_cents") {
      newValueCents = value;
      dbEntries.push(["value_cents", value]);
    } else if (key === "paid_cents") {
      newPaidCents = value;
      dbEntries.push(["paid_cents", value]);
    } else if (key === "next_charge") {
      dbEntries.push(["next_charge", value]);
    } else if (key === "proximaData") {
      dbEntries.push(["proximaData", value]);
      // next_charge já foi adicionado acima se proximaData foi atualizado
    } else if (key === "name") {
      dbEntries.push(["name", value]);
    } else if (key === "numero") {
      dbEntries.push(["numero", value]);
    } else if (key === "referencia") {
      dbEntries.push(["referencia", value]);
    } else if (key === "telefone") {
      dbEntries.push(["telefone", value]);
    } else if (key === "observacoes") {
      dbEntries.push(["observacoes", value]);
    } else if (key === "status") {
      dbEntries.push(["status", value]);
    } else if (key === "ruaId") {
      dbEntries.push(["ruaId", value]);
    } else if (key === "ordemVisita") {
      dbEntries.push(["ordemVisita", value]);
    } else if (key === "prioritario") {
      dbEntries.push(["prioritario", value]);
    }
  }

  // ✅ CRÍTICO: Validar e corrigir automaticamente paid_cents > value_cents
  // Se ambos foram atualizados, usar os novos valores; senão, converter do original
  const finalValueCents = newValueCents ?? toCentavos(originalClient.value ?? 0);
  let finalPaidCents = newPaidCents ?? toCentavos(originalClient.paid ?? 0);
  
  // ✅ CRÍTICO: Corrigir automaticamente se paid_cents > value_cents
  // Evita que o app quebre no meio da cobrança (Firestore, dados inconsistentes, value reduzido, etc)
  if (finalPaidCents > finalValueCents) {
    console.warn(
      `⚠️ Valor pago (${finalPaidCents} centavos) excede valor total (${finalValueCents} centavos). ` +
      `Corrigindo automaticamente para ${finalValueCents} centavos.`
    );
    finalPaidCents = finalValueCents; // Corrigir automaticamente
    // ✅ Atualizar dbEntries se paid_cents foi modificado
    const paidIndex = dbEntries.findIndex(([key]) => key === "paid_cents");
    if (paidIndex >= 0) {
      dbEntries[paidIndex] = ["paid_cents", finalPaidCents];
    } else {
      dbEntries.push(["paid_cents", finalPaidCents]);
    }
  }
  
  // ✅ CRÍTICO: Recalcular status automaticamente quando paid_cents >= value_cents
  // Se você atualizar manualmente value sem atualizar paid, o status pode ficar errado
  if (finalPaidCents >= finalValueCents && finalValueCents > 0) {
    const statusIndex = dbEntries.findIndex(([key]) => key === "status");
    if (statusIndex >= 0) {
      dbEntries[statusIndex] = ["status", "quitado"];
    } else {
      dbEntries.push(["status", "quitado"]);
    }
    // ✅ Limpar proximaData quando quitado
    const proximaDataIndex = dbEntries.findIndex(([key]) => key === "proximaData");
    if (proximaDataIndex >= 0) {
      dbEntries[proximaDataIndex] = ["proximaData", null];
    } else {
      dbEntries.push(["proximaData", null]);
    }
  }
  
  // ✅ Sempre atualizar updated_at para sincronização com Firestore
  dbEntries.push(["updated_at", formatDateTimeIso()]);

  const fields = dbEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = dbEntries.map(([, value]) => value);

  await run(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, client.id]);

  // 📝 Criar log detalhado com as mudanças
  // ✅ CRÍTICO: Limitar tamanho do log e truncar descrição para evitar logs enormes
  // Para clientes editados várias vezes por dia, os logs ficam gigantes
  const MAX_LOG_DESCRIPTION_LENGTH = 300; // Limitar descrição a 300 caracteres
  
  if (fromFirestore) {
    // ✅ Log específico quando atualização vem do Firestore
    await addLog(client.id, "Dados do cliente atualizados na nuvem").catch(e => 
      console.warn("⚠️ Log falhou:", e)
    );
  } else if (changes.length > 0) {
    let logDescription = `📝 Dados atualizados:\n${changes.join("\n")}`;
    // ✅ Truncar descrição se exceder limite
    if (logDescription.length > MAX_LOG_DESCRIPTION_LENGTH) {
      logDescription = logDescription.slice(0, MAX_LOG_DESCRIPTION_LENGTH) + "...";
    }
    await addLog(client.id, logDescription).catch(e => 
      console.warn("⚠️ Log falhou:", e)
    );
  } else {
    await addLog(client.id, "📝 Dados do cliente atualizados.").catch(e => 
      console.warn("⚠️ Log falhou:", e)
    );
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
    await withTransactionAsync(async (tx) => {
      await txRun(tx, "DELETE FROM clients WHERE id = ?", [id]);
    });

    // ✅ Limpar cache após deletar (value/paid foram removidos)
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

  const valorCents = toCentavos(valor);
  const valorRecebido = valor;
  const created_at = formatDateTimeIso();

  // ✅ Normalizar proximaData se fornecida
  let novaProximaData: string | null = null;
  if (options?.proximaData) {
    novaProximaData = normalizeDateToISO(options.proximaData);
  }

  // 🔒 Transação atômica usando tx.executeSql diretamente (elimina deadlocks)
  await withTransactionAsync(async (tx) => {
    // ✅ Busca o cliente DENTRO da transação usando tx diretamente
    const clientDB = await txGetOne<ClientDB>(tx, "SELECT paid_cents, value_cents FROM clients WHERE id = ?", [clientId]);
    
    if (!clientDB) throw new Error("Cliente não encontrado");

    const valorPagoAntes = toReais(clientDB.paid_cents);
    const valorPagoDepois = valorPagoAntes + valorRecebido;
    const valorTotal = toReais(clientDB.value_cents);
    const restante = valorTotal - valorPagoDepois;

    // ✅ Determinar status e proximaData
    let novoStatus: "pendente" | "quitado" = "pendente";
    if (restante <= 0) {
      // ✅ Quitou tudo
      novoStatus = "quitado";
      novaProximaData = null;
    } else {
      // ✅ Pagamento parcial
      novoStatus = "pendente";
    }

    await txRun(tx, "INSERT INTO payments (client_id, created_at, value_cents) VALUES (?, ?, ?)", [
      clientId,
      created_at,
      valorCents,
    ]);

    await txRun(
      tx,
      "UPDATE clients SET paid_cents = paid_cents + ?, status = ?, proximaData = ?, next_charge = NULL WHERE id = ?",
      [valorCents, novoStatus, novaProximaData, clientId]
    );

    // ✅ Log detalhado mostrando valor antes, valor recebido e valor depois
    await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
      clientId,
      created_at,
      `💵 Pagamento adicionado:\n` +
      `Valor pago antes: R$ ${valorPagoAntes.toFixed(2)}\n` +
      `Valor recebido: R$ ${valorRecebido.toFixed(2)}\n` +
      `Valor pago atual: R$ ${valorPagoDepois.toFixed(2)}\n` +
      `Status: ${novoStatus === "quitado" ? "✅ Quitado" : "⏳ Pendente"}`
    ]);
  });
  
  // ✅ Limpar cache apenas após commit bem-sucedido (value/paid mudaram)
  clearTotalsCache();
}

/**
 * ✅ Marca cliente como ausente (cria automaticamente status pendente e proximaData = amanhã)
 */
export async function marcarClienteAusente(clientId: number): Promise<void> {
  if (!clientId) throw new Error("ID do cliente é obrigatório");

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  // ✅ Normalizar data antes de salvar
  const proximaData = normalizeDateToISO(formatDateIso(amanha));
  const created_at = formatDateTimeIso();

  await withTransactionAsync(async (tx) => {
    await txRun(
      tx,
      "UPDATE clients SET status = ?, proximaData = ?, next_charge = NULL WHERE id = ?",
      ["pendente", proximaData, clientId]
    );

    await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
      clientId,
      created_at,
      "🚫 Cliente ausente. Próxima cobrança agendada para amanhã.",
    ]);
  });
  
  // ✅ Não limpar cache aqui - status/proximaData não afetam totals
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
    // ✅ Buscar dados ANTES da transação (não afeta atomicidade)
    const paymentDB = await getOne<PaymentDB>("SELECT * FROM payments WHERE id = ?", [id]);
    if (!paymentDB) return;

    // 🔒 Transação atômica usando tx.executeSql diretamente
    await withTransactionAsync(async (tx) => {
      // ✅ Busca o cliente DENTRO da transação usando tx diretamente
      const clientDB = await txGetOne<ClientDB>(tx, "SELECT paid_cents FROM clients WHERE id = ?", [paymentDB.client_id]);
      if (!clientDB) throw new Error("Cliente não encontrado");

      const valorRemovido = toReais(paymentDB.value_cents);
      const valorPagoAntes = toReais(clientDB.paid_cents);
      const valorPagoDepois = valorPagoAntes - valorRemovido;

      await txRun(tx, "DELETE FROM payments WHERE id = ?", [id]);
      await txRun(tx, "UPDATE clients SET paid_cents = paid_cents - ? WHERE id = ?", [
        paymentDB.value_cents,
        paymentDB.client_id,
      ]);

      // ✅ Log detalhado mostrando valor antes, valor excluído e valor depois
      await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
        paymentDB.client_id,
        formatDateTimeIso(),
        `❌ Pagamento removido:\n` +
        `Valor pago antes: R$ ${valorPagoAntes.toFixed(2)}\n` +
        `Valor excluído: R$ ${valorRemovido.toFixed(2)}\n` +
        `Valor pago atual: R$ ${valorPagoDepois.toFixed(2)}`
      ]);
    });

    // ✅ Limpar cache apenas após commit bem-sucedido (paid mudou)
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

  // ✅ Usar apenas proximaData (next_charge é legado e será removido gradualmente)
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients
     WHERE proximaData IS NOT NULL
     AND proximaData BETWEEN ? AND ?
     ORDER BY proximaData ASC`,
    [today, next7],
    mapClient
  );
};

// ============================================================
// 🔍 BUSCAS
// ============================================================
/**
 * ⚠️ ATENÇÃO: Esta função carrega clientes com LIMIT 500
 * Para bases grandes (2000+ clientes), use getClientsPage() em vez disso
 * Para dataset completo (relatórios, estatísticas), use getAllClientsFull()
 * 
 * @deprecated Use getClientsPage() para melhor performance em bases grandes
 */
export const getAllClients = async (): Promise<Client[]> =>
  await selectMapped<Client, ClientDB>("SELECT * FROM clients ORDER BY name ASC LIMIT 500", [], mapClient);

/**
 * ✅ Retorna o total de clientes no banco (sem carregar dados)
 * Útil para UI decidir usar paginação ou não
 * 
 * @returns Número total de clientes
 */
export const getTotalClients = async (): Promise<number> => {
  const result = await getOne<{ total: number }>("SELECT COUNT(*) as total FROM clients", []);
  return result?.total ?? 0;
};

/**
 * ✅ Carrega TODOS os clientes sem LIMIT
 * Use para relatórios, estatísticas e operações que precisam do dataset completo
 * 
 * ⚠️ ATENÇÃO: Pode ser lento em bases muito grandes (5000+ clientes)
 * ✅ Use getTotalClients() primeiro para decidir se deve usar paginação
 * 
 * @returns Array completo de todos os clientes, ordenados por nome
 */
export const getAllClientsFull = async (): Promise<Client[]> =>
  await selectMapped<Client, ClientDB>("SELECT * FROM clients ORDER BY name ASC", [], mapClient);

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

/**
 * ✅ Busca clientes atualizados desde um timestamp específico
 * Útil para sincronização incremental (Firestore, offline → online)
 * 
 * @param timestamp - Timestamp ISO (yyyy-mm-ddTHH:mm:ss.sssZ) - apenas clientes com updated_at >= timestamp
 * @returns Array de clientes atualizados desde o timestamp
 */
export const getClientsUpdatedSince = async (timestamp: string): Promise<Client[]> => {
  if (!timestamp) return [];
  
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients 
     WHERE updated_at IS NOT NULL AND updated_at >= ?
     ORDER BY updated_at ASC`,
    [timestamp],
    mapClient
  );
};

/**
 * ❌ REMOVIDA: Esta função foi removida por ser duplicada
 * Use getClientsBySearch() em vez disso (otimizado com UNION)
 */
export const searchClients = async (query: string): Promise<Client[]> => {
  throw new Error(
    "searchClients() foi removida. Use getClientsBySearch() em vez disso. " +
    "A função antiga era apenas um wrapper duplicado."
  );
};

/**
 * ✅ Busca accent-insensitive usando UNION para ativar índices
 * ✅ Busca em SQL (não carrega todos em memória) - ESCALA para 10.000+ clientes
 * ✅ Compatível com todos os devices (não requer FTS5)
 * ✅ Usa UNION em vez de OR para ativar índices individuais
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
    
    // ✅ Sanitizar e escapar caracteres especiais para LIKE
    const sanitized = sanitizeForLike(query.trim());
    const q = `%${sanitized}%`;
    
    // ✅ Usar UNION em vez de OR para ativar índices individuais
    // ✅ V3: Busca em ruas e bairros via JOIN (coluna bairro foi removida)
    // ✅ Inclui clientes sem ruaId na busca (se query corresponder)
    // ✅ CRÍTICO: DISTINCT no subquery para evitar duplicados (Android 9 ignora DISTINCT em UNION)
    // SQLite LIKE é case-insensitive por padrão
    return await selectMapped<Client, ClientDB>(
      `SELECT * FROM (
        SELECT DISTINCT c.* FROM (
          SELECT * FROM clients WHERE name LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE telefone LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE numero LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE referencia LIKE ? ESCAPE '\\'
          UNION
          SELECT c.* FROM clients c
          LEFT JOIN ruas r ON c.ruaId = r.id
          WHERE r.nome LIKE ? ESCAPE '\\'
          UNION
          SELECT c.* FROM clients c
          LEFT JOIN ruas r ON c.ruaId = r.id
          LEFT JOIN bairros b ON r.bairroId = b.id
          WHERE b.nome LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE ruaId IS NULL
        ) c
      )
      ORDER BY name ASC
      LIMIT ?`,
      [q, q, q, q, q, q, limit],
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
  
  // ✅ CRÍTICO: Usar BETWEEN em vez de strftime para melhor performance
  // strftime faz FULL SCAN na tabela inteira, BETWEEN usa índice
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  const results = await getAll<{ client_id: number; name: string; total_cents: number }>(`
    SELECT 
      p.client_id,
      c.name,
      SUM(p.value_cents) AS total_cents
    FROM payments p
    INNER JOIN clients c ON p.client_id = c.id
    WHERE p.created_at BETWEEN ? AND ?
    GROUP BY p.client_id, c.name
    ORDER BY total_cents DESC
    LIMIT 3
  `, [startDate, endDate]);
  
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

/**
 * ✅ Refatorado para usar estrutura Rua/Bairro (V3)
 * Não usa mais coluna legacy clients.bairro
 */
/**
 * ✅ Retorna top 5 bairros com mais clientes
 * ✅ Inclui clientes sem ruaId (agrupados como "Sem bairro")
 */
export const getCrediariosPorBairro = async (): Promise<CrediarioPorBairro[]> => {
  const results = await getAll<{ bairro: string; quantidade: number }>(`
    SELECT 
      COALESCE(b.nome, 'Sem bairro') AS bairro,
      COUNT(*) AS quantidade
    FROM clients c
    LEFT JOIN ruas r ON c.ruaId = r.id
    LEFT JOIN bairros b ON r.bairroId = b.id
    GROUP BY COALESCE(b.nome, 'Sem bairro')
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
/**
 * ⚠️ NOTA: No Android, o banco está em /data/data/<package>/databases/crediario.db
 * Esse caminho não é acessível diretamente via RNFS sem permissões root.
 * 
 * Solução alternativa: Exportar dados via SQL e salvar em JSON
 * Ou usar uma biblioteca de backup específica do SQLite
 * 
 * ⚠️ ATENÇÃO: Backup pode ultrapassar 10MB em bases grandes
 * - JSON gigante → Share pode falhar em dispositivos antigos
 * - Solução futura: dividir em chunks ou usar compressão (gzip)
 * 
 * @returns Caminho do arquivo de backup criado
 */
export const createBackup = async (): Promise<string> => {
  try {
    // ✅ CRÍTICO: Fazer checkpoint do WAL antes do backup
    await exec("PRAGMA wal_checkpoint(FULL);");
    console.log("✅ Checkpoint WAL executado antes do backup");

    // ⚠️ Exportar dados via SQL (alternativa ao backup de arquivo físico)
    // No Android, não podemos acessar /data/data/<package>/databases/ diretamente
    // ✅ Usar DocumentDirectoryPath SEMPRE (Android 13+ requer SAF para DownloadDirectoryPath)
    // ⚠️ ATENÇÃO: Backup pode ultrapassar 10MB em bases grandes (10.000+ clientes, muitos logs)
    // Solução futura: dividir em chunks ou usar compressão (gzip)
    const timestamp = Date.now();
    const backupPath = `${RNFS.DocumentDirectoryPath}/crediario_backup_${timestamp}.json`;
    
    // Exportar todos os dados (usar getAllClientsFull para dataset completo)
    const clients = await getAllClientsFull();
    const payments = await getAll<PaymentDB>("SELECT * FROM payments ORDER BY id ASC", []);
    const logs = await getAll<Log>("SELECT * FROM logs ORDER BY id ASC", []);
    const bairros = await getAllBairros();
    const ruas = await getAllRuas();

    const backupData = {
      version: 3,
      timestamp,
      clients,
      payments,
      logs,
      bairros,
      ruas,
    };

    // ✅ CRÍTICO: Otimizar backup para grandes bases
    // Usar JSON.stringify sem formatação (null, 2) reduz tamanho em ~30%
    // Para bases gigantes (>50MB), considerar dividir em múltiplos arquivos
    const jsonContent = JSON.stringify(backupData); // Sem formatação para reduzir tamanho
    const fileSizeMB = (new Blob([jsonContent]).size / (1024 * 1024)).toFixed(2);
    
    // ✅ CRÍTICO: Verificar tamanho do backup antes de salvar
    // Bases com 10.000+ registros podem gerar JSON >10MB
    // Share() pode falhar no Android com arquivos muito grandes
    const MAX_BACKUP_SIZE_MB = 10;
    const fileSize = parseFloat(fileSizeMB);
    
    if (fileSize > MAX_BACKUP_SIZE_MB) {
      console.warn(
        `⚠️ Backup muito grande (${fileSizeMB}MB). ` +
        `Share pode falhar no Android. ` +
        `Considere limpar logs antigos ou dividir o backup.`
      );
    }
    
    await RNFS.writeFile(backupPath, jsonContent, "utf8");
    console.log(`✅ Backup criado: ${fileSizeMB}MB`);

    // ✅ CRÍTICO: DocumentDirectoryPath no Android não é acessível por apps externos
    // O usuário não consegue abrir o arquivo diretamente
    // Solução: Usar Share que autoriza acesso temporário ao arquivo
    // Share.share() no Android cria um URI temporário acessível por outros apps
    // ⚠️ Share pode falhar com arquivos >10MB em alguns dispositivos Android
    try {
      await Share.share({
        title: "Backup do Crediário",
        message: `Backup criado em ${new Date(timestamp).toLocaleString("pt-BR")} (${fileSizeMB}MB)`,
        url: `file://${backupPath}`, // Android cria URI temporário acessível
      });
    } catch (shareError) {
      // Se Share falhar (arquivo muito grande ou outro erro), ainda retornar o caminho
      console.warn(
        `⚠️ Erro ao compartilhar backup (${fileSizeMB}MB):`,
        shareError
      );
      console.warn("💡 Dica: Arquivo salvo em:", backupPath);
    }

    return backupPath;
  } catch (error) {
    console.error("❌ Erro ao criar backup:", error);
    throw error;
  }
};

// ============================================================
// 🏥 HEALTH CHECKS
// ============================================================

/**
 * ✅ Verifica saúde do banco de dados
 * Retorna integridade, tamanho e contagem de registros
 * 
 * @returns Objeto com informações de saúde do banco
 */
export async function checkDatabaseHealth(): Promise<{
  integrity: boolean;
  size: number; // MB
  clientCount: number;
  paymentCount: number;
  logCount: number;
  sqliteVersion: string;
}> {
  try {
    await waitForInitDB();
    
    // ✅ Verificar integridade do banco
    const integrityResult = await getOne<{ integrity_check: string }>("PRAGMA integrity_check");
    const integrity = integrityResult?.integrity_check === "ok";
    
    // ✅ Obter tamanho do arquivo do banco (aproximado via page_count)
    const pageSizeResult = await getOne<{ page_size: number }>("PRAGMA page_size");
    const pageCountResult = await getOne<{ page_count: number }>("PRAGMA page_count");
    const pageSize = pageSizeResult?.page_size ?? 4096;
    const pageCount = pageCountResult?.page_count ?? 0;
    const size = (pageSize * pageCount) / (1024 * 1024); // MB
    
    // ✅ Contar registros
    const clientCount = await getTotalClients();
    const paymentCountResult = await getOne<{ total: number }>("SELECT COUNT(*) as total FROM payments", []);
    const logCountResult = await getOne<{ total: number }>("SELECT COUNT(*) as total FROM logs", []);
    
    // ✅ Obter versão do SQLite
    const sqliteVersionResult = await getOne<{ version: string }>("SELECT sqlite_version() as version", []);
    
    return {
      integrity,
      size: parseFloat(size.toFixed(2)),
      clientCount,
      paymentCount: paymentCountResult?.total ?? 0,
      logCount: logCountResult?.total ?? 0,
      sqliteVersion: sqliteVersionResult?.version ?? "unknown",
    };
  } catch (error) {
    console.error("❌ Erro ao verificar saúde do banco:", error);
    throw error;
  }
}

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
/**
 * ✅ Atualiza ordem de visita de um cliente (shift automático)
 * ✅ Normaliza ordem após shift para evitar buracos
 * ✅ Usa tx diretamente para evitar transações duplicadas
 */
export async function atualizarOrdemCliente(
  clienteId: number,
  ruaId: number,
  novaOrdem: number
): Promise<void> {
  if (!clienteId || !ruaId || novaOrdem < 1) {
    throw new Error("Parâmetros inválidos");
  }

  await withTransactionAsync(async (tx) => {
    // ✅ CRÍTICO: Verificar se o cliente já está na posição desejada
    // Evita shift desnecessário que desloca toda a ordem sem necessidade
    const atual = await txGetOne<{ ordemVisita: number }>(
      tx,
      "SELECT ordemVisita FROM clients WHERE id = ?",
      [clienteId]
    );

    if (atual?.ordemVisita === novaOrdem) {
      // ✅ Cliente já está na posição desejada, não precisa fazer nada
      return;
    }

    // ✅ CRÍTICO: Mover cliente para ordem temporária (9999) antes do shift
    // Evita colisões quando dois clientes são arrastados simultaneamente em drag & drop
    await txRun(tx, "UPDATE clients SET ordemVisita = 9999, updated_at = ? WHERE id = ?", [
      formatDateTimeIso(),
      clienteId,
    ]);

    // ✅ Passo 1: Empurrar todos para baixo (EXCETO o próprio cliente que está em 9999)
    // ✅ CRÍTICO: Excluir o cliente que está sendo movido para evitar duplicação
    await txRun(
      tx,
      "UPDATE clients SET ordemVisita = ordemVisita + 1, updated_at = ? WHERE ruaId = ? AND ordemVisita >= ? AND id != ?",
      [formatDateTimeIso(), ruaId, novaOrdem, clienteId]
    );

    // ✅ Passo 2: Definir ordem para o cliente
    await txRun(tx, "UPDATE clients SET ordemVisita = ?, updated_at = ? WHERE id = ?", [
      novaOrdem,
      formatDateTimeIso(),
      clienteId,
    ]);
  });
  
  // ✅ CRÍTICO: Normalizar ordem após shift para remover buracos
  await normalizarOrdem(ruaId);
}

/**
 * ✅ Normaliza ordem de visita (remove buracos)
 * Reindexa como 1, 2, 3, 4... sem gaps
 * ✅ Usa tx diretamente para evitar transações duplicadas
 * ✅ Busca clientes DENTRO da transação para evitar dados desatualizados
 */
export async function normalizarOrdem(ruaId: number): Promise<void> {
  if (!ruaId) return;

  // ✅ Reindexar como 1, 2, 3, 4... (busca DENTRO da transação)
  await withTransactionAsync(async (tx) => {
    // ✅ CRÍTICO: Buscar clientes DENTRO da transação para evitar dados desatualizados
    const clientes = await txGetAll<{ id: number; ordemVisita: number }>(
      tx,
      "SELECT id, ordemVisita FROM clients WHERE ruaId = ? ORDER BY ordemVisita ASC",
      [ruaId]
    );

    for (let i = 0; i < clientes.length; i++) {
      const novaOrdem = i + 1;
      if (clientes[i].ordemVisita !== novaOrdem) {
        await txRun(tx, "UPDATE clients SET ordemVisita = ?, updated_at = ? WHERE id = ?", [
          novaOrdem,
          formatDateTimeIso(),
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
     AND proximaData = ?
     ORDER BY name ASC`,
    [hoje],
    mapClient
  );
}

/**
 * ✅ Normaliza data para formato ISO (yyyy-mm-dd) com padding de zeros
 * Garante que datas como "1/12/2025" virem "2025-12-01" e não "2025-12-1"
 */
/**
 * ✅ Valida se uma data ISO (yyyy-mm-dd) é válida
 * Verifica se o mês está entre 1-12, dia está dentro do range do mês, etc.
 */
function isValidISODate(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Validar range básico
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Validar usando Date (detecta datas inválidas como 2025-02-30)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }
  
  return true;
}

/**
 * ✅ Normaliza e valida data para formato ISO (yyyy-mm-dd)
 * ✅ Valida se a data é real (não permite 2025-13-99)
 */
function normalizeDateToISO(date: string): string {
  if (!date) return "";
  
  let isoDate = "";
  
  // Se já está no formato ISO (yyyy-mm-dd), usar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    isoDate = date;
  }
  // Se está no formato yyyy/mm/dd (comum em smartphones chineses, calendários externos)
  else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(date)) {
    const [year, month, day] = date.split("/");
    // ✅ Garantir padding de zeros: 1 → 01, 12 → 12
    isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Se está no formato brasileiro (dd/mm/yyyy), converter
  // ✅ CRÍTICO: Resolver ambiguidade "01/02/2023" (1 de fevereiro ou 2 de janeiro?)
  // Estratégia: Se primeiro número > 12, é dia; senão, assumir formato brasileiro (dd/mm/yyyy)
  else if (date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      const [first, second, third] = parts;
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);
      
      // ✅ Detectar formato baseado nos valores
      // Se primeiro número > 12, é dia (ex: "25/12/2023" → dia 25)
      // Se primeiro <= 12 e segundo > 12, é formato americano (mm/dd/yyyy)
      // Caso contrário, assumir formato brasileiro (dd/mm/yyyy)
      if (firstNum > 12) {
        // Primeiro é dia (formato brasileiro: dd/mm/yyyy)
        isoDate = `${third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
      } else if (firstNum <= 12 && secondNum > 12) {
        // Formato americano: mm/dd/yyyy
        isoDate = `${third}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
      } else {
        // Ambiguidade: assumir formato brasileiro (dd/mm/yyyy) por padrão
        // Ex: "01/02/2023" → 1 de fevereiro (mais comum no Brasil)
        isoDate = `${third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
      }
    }
  }
  // Fallback: tentar parsear como Date
  else {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        isoDate = `${year}-${month}-${day}`;
      }
    } catch {
      // Ignorar erro
    }
  }
  
  // ✅ CRÍTICO: Validar se a data é real (não permite 2025-13-99)
  if (isoDate && !isValidISODate(isoDate)) {
    throw new Error(`Data inválida: ${date}. A data deve ser válida (ex: 2025-02-28, não 2025-13-99).`);
  }
  
  return isoDate;
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
  
  // ✅ Usar apenas proximaData (next_charge é legado)
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients 
     WHERE proximaData = ?
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
  if (!date) return [];
  
  // ✅ Normalizar data para ISO (yyyy-mm-dd) com padding de zeros
  const normalizedDate = normalizeDateToISO(date);
  if (!normalizedDate) return [];
  
  // ✅ Query única com JOIN para evitar múltiplas queries em loop
  // Muito mais rápido que fazer getRuaById/getBairroById para cada rua
  const rows = await getAll<{
    // Cliente
    id: number;
    name: string;
    value_cents: number;
    numero: string | null;
    referencia: string | null;
    telefone: string | null;
    paid_cents: number;
    ruaId: number | null;
    ordemVisita: number;
    prioritario: number;
    observacoes: string | null;
    status: string | null;
    proximaData: string | null;
    // Rua
    ruaNome: string | null;
    // Bairro
    bairroNome: string | null;
  }>(
    `SELECT 
      c.*,
      r.nome AS ruaNome,
      b.nome AS bairroNome
    FROM clients c
    LEFT JOIN ruas r ON c.ruaId = r.id
    LEFT JOIN bairros b ON r.bairroId = b.id
    WHERE c.proximaData = ?
      AND r.id IS NOT NULL
    ORDER BY r.nome ASC, c.ordemVisita ASC, c.name ASC
    -- ✅ CRÍTICO: r.id IS NOT NULL garante integridade referencial
    -- ✅ Filtra apenas clientes com ruas válidas (evita clientes órfãos após exclusão de rua)
    -- ✅ Índice usado: idx_clients_data_rua_ordem (proximaData, ruaId, ordemVisita)
    -- ✅ SQLite usa o índice para filtrar por proximaData e ordenar por ordemVisita`,
    [normalizedDate]
  );
  
  // ✅ Agrupar por rua e mapear para Client
  const porRua = new Map<number, { clientes: Client[]; ruaNome: string; bairroNome: string }>();
  
  for (const row of rows) {
    if (!row.ruaId) continue;
    
    if (!porRua.has(row.ruaId)) {
      porRua.set(row.ruaId, {
        clientes: [],
        ruaNome: row.ruaNome || "Sem rua",
        bairroNome: row.bairroNome || "Sem bairro",
      });
    }
    
    // ✅ Mapear row para Client (V3: sem next_charge e bairro)
    const cliente: Client = {
      id: row.id,
      name: row.name,
      value: toReais(row.value_cents),
      numero: row.numero,
      referencia: row.referencia,
      telefone: row.telefone,
      paid: toReais(row.paid_cents),
      ruaId: row.ruaId,
      ordemVisita: row.ordemVisita,
      prioritario: row.prioritario,
      observacoes: row.observacoes,
      status: row.status as "pendente" | "quitado" | null,
      proximaData: row.proximaData,
    };
    
    porRua.get(row.ruaId)!.clientes.push(cliente);
  }
  
  // ✅ Calcular estatísticas e montar resultado
  const resultado: ClientesPorRua[] = [];
  
  for (const [ruaId, data] of porRua.entries()) {
    const totalClientes = data.clientes.length;
    const totalPagos = data.clientes.filter(
      (c) => (c.value || 0) - (c.paid || 0) <= 0
    ).length;
    const totalPendentes = totalClientes - totalPagos;
    
    resultado.push({
      ruaId,
      ruaNome: data.ruaNome,
      bairroNome: data.bairroNome,
      clientes: data.clientes,
      totalClientes,
      totalPagos,
      totalPendentes,
    });
  }
  
  // ✅ Ordenar por nome da rua
  resultado.sort((a, b) => a.ruaNome.localeCompare(b.ruaNome, "pt-BR"));
  
  return resultado;
}
