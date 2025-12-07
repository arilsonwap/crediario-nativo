/**
 * 🛡️ Validador de Schema
 * Valida estrutura do banco antes de iniciar migrações
 * Garante integridade e detecta problemas antes que causem erros
 */

import { txGetAll, txGetOne } from "./transactions";
import { getOne } from "./queries";
import { formatDateIso } from "../utils";

export type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
};

export type TableInfo = {
  name: string;
  columns: ColumnInfo[];
};

export type SchemaValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  tables: TableInfo[];
};

/**
 * ✅ Obtém informações de todas as colunas de uma tabela
 */
export async function getTableColumns(tx: any, tableName: string): Promise<ColumnInfo[]> {
  const columns = await txGetAll<ColumnInfo>(tx, `PRAGMA table_info(${tableName})`, []);
  return Array.isArray(columns) ? columns : [];
}

/**
 * ✅ Obtém informações de todas as tabelas do banco
 */
export async function getAllTables(tx: any): Promise<string[]> {
  const tables = await txGetAll<{ name: string }>(
    tx,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    []
  );
  return tables.map(t => t.name);
}

/**
 * ✅ Valida estrutura da tabela clients
 */
async function validateClientsTable(tx: any, columns: ColumnInfo[]): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const columnNames = columns.map(c => c.name);
  
  // ✅ Validar colunas obrigatórias
  const requiredColumns = ["id", "name", "value_cents", "paid_cents"];
  for (const col of requiredColumns) {
    if (!columnNames.includes(col)) {
      errors.push(`Coluna obrigatória ausente: ${col}`);
    }
  }
  
  // ✅ Validar tipos de colunas críticas
  const valueCentsCol = columns.find(c => c.name === "value_cents");
  if (valueCentsCol && valueCentsCol.type.toUpperCase() !== "INTEGER") {
    errors.push(`Coluna value_cents deve ser INTEGER, encontrado: ${valueCentsCol.type}`);
  }
  
  const paidCentsCol = columns.find(c => c.name === "paid_cents");
  if (paidCentsCol && paidCentsCol.type.toUpperCase() !== "INTEGER") {
    errors.push(`Coluna paid_cents deve ser INTEGER, encontrado: ${paidCentsCol.type}`);
  }
  
  // ✅ Verificar colunas deprecated
  if (columnNames.includes("bairro")) {
    warnings.push("Coluna 'bairro' está deprecated. Use ruaId em vez disso.");
  }
  
  if (columnNames.includes("next_charge")) {
    warnings.push("Coluna 'next_charge' está deprecated. Use proximaData em vez disso.");
  }
  
  // ✅ Verificar colunas V3
  if (!columnNames.includes("ruaId")) {
    warnings.push("Coluna 'ruaId' não encontrada. Migração V3 pode ser necessária.");
  }
  
  if (!columnNames.includes("proximaData")) {
    warnings.push("Coluna 'proximaData' não encontrada. Migração V3 pode ser necessária.");
  }
  
  return { errors, warnings };
}

/**
 * ✅ Valida estrutura da tabela payments
 */
async function validatePaymentsTable(tx: any, columns: ColumnInfo[]): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const columnNames = columns.map(c => c.name);
  
  // ✅ Validar colunas obrigatórias
  const requiredColumns = ["id", "client_id", "created_at", "value_cents"];
  for (const col of requiredColumns) {
    if (!columnNames.includes(col)) {
      errors.push(`Coluna obrigatória ausente em payments: ${col}`);
    }
  }
  
  // ✅ Validar tipo de value_cents
  const valueCentsCol = columns.find(c => c.name === "value_cents");
  if (valueCentsCol && valueCentsCol.type.toUpperCase() !== "INTEGER") {
    errors.push(`Coluna payments.value_cents deve ser INTEGER, encontrado: ${valueCentsCol.type}`);
  }
  
  return { errors, warnings };
}

/**
 * ✅ Valida integridade de constraints
 */
async function validateConstraints(tx: any): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // ✅ Verificar se foreign keys estão habilitadas
  const fkResult = await txGetOne<{ foreign_keys: number }>(tx, "PRAGMA foreign_keys", []);
  if (fkResult?.foreign_keys !== 1) {
    warnings.push("Foreign keys não estão habilitadas. Pode afetar integridade referencial.");
  }
  
  // ✅ Verificar integridade do banco
  const integrityResult = await txGetOne<{ integrity_check: string }>(tx, "PRAGMA integrity_check", []);
  if (integrityResult?.integrity_check !== "ok") {
    errors.push(`Integridade do banco comprometida: ${integrityResult?.integrity_check}`);
  }
  
  return { errors, warnings };
}

/**
 * ✅ Valida schema completo do banco
 * Executa antes de migrações para garantir que tudo está correto
 */
export async function validateSchema(tx: any): Promise<SchemaValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tables: TableInfo[] = [];
  
  try {
    // ✅ Obter todas as tabelas
    const tableNames = await getAllTables(tx);
    
    // ✅ Validar cada tabela
    for (const tableName of tableNames) {
      const columns = await getTableColumns(tx, tableName);
      tables.push({ name: tableName, columns });
      
      // ✅ Validações específicas por tabela
      if (tableName === "clients") {
        const result = await validateClientsTable(tx, columns);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } else if (tableName === "payments") {
        const result = await validatePaymentsTable(tx, columns);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    }
    
    // ✅ Validar constraints
    const constraintsResult = await validateConstraints(tx);
    errors.push(...constraintsResult.errors);
    warnings.push(...constraintsResult.warnings);
    
    // ✅ Verificar se tabelas essenciais existem
    const essentialTables = ["clients", "payments", "logs"];
    for (const table of essentialTables) {
      if (!tableNames.includes(table)) {
        warnings.push(`Tabela essencial não encontrada: ${table}`);
      }
    }
    
  } catch (error) {
    errors.push(`Erro ao validar schema: ${error}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    tables,
  };
}

/**
 * ✅ Valida schema sem transação (para uso fora de migrações)
 */
export async function validateSchemaStandalone(): Promise<SchemaValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tables: TableInfo[] = [];
  
  try {
    // ✅ Verificar integridade do banco
    const integrityResult = await getOne<{ integrity_check: string }>("PRAGMA integrity_check");
    if (integrityResult?.integrity_check !== "ok") {
      errors.push(`Integridade do banco comprometida: ${integrityResult?.integrity_check}`);
    }
    
    // ✅ Verificar foreign keys
    const fkResult = await getOne<{ foreign_keys: number }>("PRAGMA foreign_keys");
    if (fkResult?.foreign_keys !== 1) {
      warnings.push("Foreign keys não estão habilitadas.");
    }
    
  } catch (error) {
    errors.push(`Erro ao validar schema: ${error}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    tables,
  };
}

