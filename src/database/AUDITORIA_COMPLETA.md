# 🔍 AUDITORIA PROFISSIONAL - BANCO DE DADOS SQLite
## React Native - Crediario App

**Data:** 2024  
**Versão SQLite Analisada:** 3.9.0+ (compatível com Android API 30+)  
**Framework:** react-native-sqlite-storage

---

## 📋 SUMÁRIO EXECUTIVO

### ✅ Pontos Fortes
- ✅ Schema bem estruturado com CHECK constraints
- ✅ Migrations idempotentes e seguras
- ✅ Uso correto de transações atômicas
- ✅ Índices otimizados para buscas
- ✅ FTS5 implementado com fallback
- ✅ Cache financeiro para performance
- ✅ Validação de schema antes de migrações

### ⚠️ Problemas Encontrados
- ⚠️ **CRÍTICO:** Falta `PRAGMA auto_vacuum` na inicialização
- ⚠️ **MÉDIO:** Consultas UNION podem ser otimizadas
- ⚠️ **BAIXO:** Alguns índices podem ser redundantes
- ⚠️ **BAIXO:** Falta validação de tamanho máximo de strings

---

## 1️⃣ ESTRUTURA DO SCHEMA

### 1.1 Tipagem de Colunas

#### ✅ CORRETO
```sql
value_cents INTEGER NOT NULL CHECK (value_cents >= 0)
paid_cents INTEGER DEFAULT 0 CHECK (paid_cents >= 0 AND paid_cents <= value_cents)
ordemVisita INTEGER DEFAULT 1 CHECK (ordemVisita > 0)
```

**Análise:**
- ✅ Uso correto de INTEGER para valores monetários (evita problemas de float)
- ✅ CHECK constraints garantem integridade
- ✅ DEFAULT values apropriados

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/schema.ts:51`
```sql
status TEXT CHECK (status IS NULL OR status IN ('pendente', 'quitado')) DEFAULT 'pendente'
```

**Problema:** 
- CHECK constraint com `IN` pode falhar em SQLite <3.35
- DEFAULT não funciona com CHECK que permite NULL

**Risco:** 
- Em SQLite antigo, constraint pode ser ignorada silenciosamente
- DEFAULT pode não ser aplicado se constraint falhar

**Correção Sugerida:**
```sql
status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'quitado'))
```

**Código Corrigido:**
```typescript
// Em core/schema.ts, linha 51
status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'quitado'))
```

---

### 1.2 Chaves Primárias e Estrangeiras

#### ✅ CORRETO
```sql
FOREIGN KEY (ruaId) REFERENCES ruas(id) ON DELETE SET NULL
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
FOREIGN KEY (bairroId) REFERENCES bairros(id) ON DELETE CASCADE
```

**Análise:**
- ✅ Foreign keys bem definidas
- ✅ ON DELETE apropriado (CASCADE para dependências, SET NULL para opcionais)
- ✅ `PRAGMA foreign_keys = ON` está sendo executado

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/schema.ts:210`

**Problema:**
- `PRAGMA foreign_keys = ON` é executado, mas não há verificação se realmente foi ativado
- Em alguns dispositivos Android antigos, foreign keys podem ser ignoradas

**Risco:**
- Integridade referencial pode não ser garantida
- Dados órfãos podem ser criados

**Correção Sugerida:**
```typescript
// Após executar PRAGMA foreign_keys = ON
const fkCheck = await getOne<{ foreign_keys: number }>("PRAGMA foreign_keys");
if (fkCheck?.foreign_keys !== 1) {
  console.error("❌ CRÍTICO: Foreign keys não foram ativadas!");
  throw new Error("Foreign keys não puderam ser ativadas");
}
```

---

### 1.3 Índices

#### ✅ CORRETO
```sql
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_clients_rua_ordem ON clients(ruaId, ordemVisita);
CREATE INDEX IF NOT EXISTS idx_search_clients ON clients(name, telefone, numero, referencia);
```

**Análise:**
- ✅ Índices covering para buscas (idx_search_clients)
- ✅ Índices compostos para queries complexas
- ✅ COLLATE NOCASE para buscas case-insensitive

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/schema.ts:129`

**Problema:**
- Índice `idx_search_clients` é covering, mas não inclui `id`
- Quando usado em UNION, pode precisar fazer lookup adicional

**Risco:**
- Performance pode ser melhorada

**Correção Sugerida:**
```sql
-- Adicionar id ao índice covering
CREATE INDEX IF NOT EXISTS idx_search_clients ON clients(name, telefone, numero, referencia, id);
```

**OU** (melhor):
```sql
-- Índice covering completo incluindo id
CREATE INDEX IF NOT EXISTS idx_search_clients_covering ON clients(name, telefone, numero, referencia, id, ruaId, status);
```

---

### 1.4 Normalização e Consistência

#### ✅ CORRETO
- ✅ Estrutura hierárquica: Bairro → Rua → Cliente
- ✅ UNIQUE constraints apropriadas
- ✅ Campos opcionais bem definidos

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/schema.ts:38-57`

**Problema:**
- Tabela `clients` não tem índice único em campos que deveriam ser únicos
- Não há constraint UNIQUE em combinações críticas

**Risco:**
- Clientes duplicados podem ser criados
- Dados inconsistentes

**Correção Sugerida:**
```sql
-- Adicionar índice único para prevenir duplicatas (se aplicável)
-- Exemplo: se telefone deve ser único
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_telefone_unique ON clients(telefone) WHERE telefone IS NOT NULL;
```

---

## 2️⃣ CONSULTAS SQL

### 2.1 Consultas Pesadas

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `repositories/clientsRepo.ts:78`
```sql
SELECT * FROM clients ORDER BY name ASC LIMIT 500
```

**Problema:**
- LIMIT 500 sem OFFSET pode carregar muitos dados
- `getAllClients()` sempre retorna até 500 registros

**Risco:**
- Em bases grandes, pode travar UI thread
- Memória pode ser consumida excessivamente

**Correção Sugerida:**
```typescript
// Usar paginação sempre
export const getAllClients = async (limit: number = 100, offset: number = 0): Promise<Client[]> =>
  await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients ORDER BY name ASC LIMIT ? OFFSET ?", 
    [limit, offset], 
    mapClient
  );
```

---

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `services/searchService.ts:46-71`

**Problema:**
- Query UNION com 6 subqueries pode ser pesada
- Cada UNION faz SELECT completo antes de unir

**Risco:**
- Performance degrada com muitos clientes
- Pode travar UI thread em dispositivos fracos

**Correção Sugerida:**
```sql
-- Usar UNION ALL se duplicatas não importarem (mais rápido)
-- OU usar CTE (Common Table Expression) para melhor otimização
WITH search_results AS (
  SELECT DISTINCT id FROM (
    SELECT id FROM clients WHERE name LIKE ? ESCAPE '\\'
    UNION ALL
    SELECT id FROM clients WHERE telefone LIKE ? ESCAPE '\\'
    -- ... outros campos
  )
)
SELECT c.* FROM clients c
INNER JOIN search_results sr ON c.id = sr.id
ORDER BY c.name ASC
LIMIT ?;
```

---

### 2.2 Uso de LIKE

#### ✅ CORRETO
- ✅ LIKE usa ESCAPE '\\' (proteção contra SQL injection)
- ✅ Índices covering para campos pesquisados
- ✅ FTS5 como fallback otimizado

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `services/searchService.ts:49-64`

**Problema:**
- LIKE em campos sem índice específico (ruas.nome, bairros.nome)
- JOINs em subqueries UNION podem ser lentos

**Risco:**
- Busca por rua/bairro pode ser lenta

**Correção Sugerida:**
```sql
-- Adicionar índices para ruas e bairros
CREATE INDEX IF NOT EXISTS idx_ruas_nome ON ruas(nome COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_bairros_nome ON bairros(nome COLLATE NOCASE);
```

---

### 2.3 LIMIT, OFFSET, ORDER BY

#### ✅ CORRETO
- ✅ LIMIT usado corretamente
- ✅ ORDER BY em índices apropriados

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `repositories/clientsRepo.ts:90`

**Problema:**
- OFFSET pode ser lento em grandes bases
- Não há validação de offset negativo

**Risco:**
- Performance degrada com OFFSET alto
- Offset negativo pode causar erro

**Correção Sugerida:**
```typescript
export const getClientsPage = async (limit: number, offset: number): Promise<Client[]> => {
  // ✅ Validar parâmetros
  if (limit <= 0 || limit > 1000) {
    throw new Error("Limit deve estar entre 1 e 1000");
  }
  if (offset < 0) {
    throw new Error("Offset não pode ser negativo");
  }
  
  // ✅ Usar cursor-based pagination para melhor performance (futuro)
  return await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients WHERE id > ? ORDER BY id ASC LIMIT ?",
    [offset, limit],
    mapClient
  );
};
```

---

## 3️⃣ MIGRATIONS

### 3.1 Segurança e Idempotência

#### ✅ CORRETO
- ✅ Migrations verificam versão antes de executar
- ✅ Uso de transações atômicas
- ✅ Validação de colunas antes de migrar

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `migrations/V2.ts:32`

**Problema:**
```typescript
await txExec(tx, "PRAGMA foreign_keys=off;");
// ... migração ...
await txExec(tx, "PRAGMA foreign_keys=on;");
```

**Risco:**
- Se migração falhar, foreign keys podem ficar desabilitadas
- Código tenta reabilitar no catch, mas pode falhar silenciosamente

**Correção Sugerida:**
```typescript
try {
  await txExec(tx, "PRAGMA foreign_keys=off;");
  // ... migração ...
} finally {
  // ✅ SEMPRE reabilitar, mesmo em caso de erro
  const fkCheck = await txGetOne<{ foreign_keys: number }>(tx, "PRAGMA foreign_keys", []);
  if (fkCheck?.foreign_keys !== 1) {
    await txExec(tx, "PRAGMA foreign_keys=on;");
    // ✅ Verificar novamente
    const verify = await txGetOne<{ foreign_keys: number }>(tx, "PRAGMA foreign_keys", []);
    if (verify?.foreign_keys !== 1) {
      throw new Error("CRÍTICO: Não foi possível reabilitar foreign keys após migração");
    }
  }
}
```

---

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `migrations/V3.ts:119-190`

**Problema:**
- Recriação de tabela `clients` pode ser muito pesada
- Verificação de `clients_v3` existe, mas pode não ser suficiente

**Risco:**
- Em dispositivos fracos, pode causar timeout
- Dados podem ser perdidos se migração falhar no meio

**Correção Sugerida:**
```typescript
// Adicionar checkpoint antes de recriar tabela
await txExec(tx, "PRAGMA wal_checkpoint(TRUNCATE);");

// Adicionar timeout maior para migração V3
await withTransactionAsync(async (tx) => {
  await migrateV3(tx);
  await setSchemaVersion(3, tx);
}, 30000); // 30 segundos para V3
```

---

### 3.2 Versionamento

#### ✅ CORRETO
- ✅ `PRAGMA user_version` usado corretamente
- ✅ Migrations incrementais (V2 → V3 → V4)

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `migrations/index.ts:42-98`

**Problema:**
- Flag em `app_settings` para V2, mas não para V3/V4
- Inconsistência no controle de migrações

**Risco:**
- Migração pode ser reexecutada em bases corrompidas

**Correção Sugerida:**
```typescript
// Padronizar flags para todas as migrações
const migrationFlags = {
  v2: 'migration_v2_completed',
  v3: 'migration_v3_completed',
  v4: 'migration_v4_completed',
};

// Verificar flag antes de executar qualquer migração
if (currentVersion < 3) {
  const v3Flag = await getOne<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = ?`, 
    [migrationFlags.v3]
  );
  if (v3Flag?.value === "true") {
    console.log("⚠️ Migração V3 já executada, pulando...");
    await setSchemaVersion(3);
  } else {
    // Executar migração...
  }
}
```

---

## 4️⃣ CONEXÃO COM O BANCO

### 4.1 Abertura/Fechamento

#### ✅ CORRETO
- ✅ Singleton pattern implementado
- ✅ Proteção contra race conditions
- ✅ Timeout de segurança (8s)
- ✅ Health check com reconexão automática

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/connection.ts:228-243`

**Problema:**
- Verificação de conexão válida (`SELECT 1`) pode falhar silenciosamente
- Se falhar, conexão é resetada, mas não há retry automático

**Risco:**
- Conexão pode ficar em estado inválido

**Correção Sugerida:**
```typescript
// Em openDatabase(), após verificar conexão
if (db) {
  try {
    await db.executeSql("SELECT 1");
    return db;
  } catch (error) {
    logWarning("Conexão inválida detectada, resetando...", { error });
    // ✅ Tentar fechar antes de resetar
    try {
      await db.close();
    } catch {}
    db = null;
    // ✅ Continuar para criar nova conexão (não retornar)
  }
}
```

---

### 4.2 Múltiplas Conexões

#### ✅ CORRETO
- ✅ `openPromise` previne múltiplas aberturas simultâneas
- ✅ Lock mechanism implementado

#### ✅ SEM PROBLEMAS
- Implementação está correta

---

### 4.3 Uso de Promises

#### ✅ CORRETO
- ✅ `SQLite.enablePromise(true)` chamado
- ✅ Todas as operações usam async/await

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/queries.ts:34-45`

**Problema:**
- `exec()` não retorna resultado, mas pode falhar silenciosamente
- Erro é logado mas não há retry

**Risco:**
- Operações podem falhar sem o chamador saber

**Correção Sugerida:**
```typescript
export async function exec(sql: string, retries: number = 3): Promise<void> {
  let lastError: any = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      await waitForInitDB();
      const db = getDatabase();
      if (!db) await openDatabase();
      const database = getDatabase();
      await database.executeSql(sql, []);
      return; // ✅ Sucesso
    } catch (e) {
      lastError = e;
      if (i < retries - 1) {
        // ✅ Aguardar antes de retry
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  }
  
  console.error("❌ SQL exec error após retries:", sql, lastError);
  throw lastError;
}
```

---

## 5️⃣ PRAGMAS RECOMENDADOS

### 5.1 Pragmas Atuais

#### ✅ CORRETO
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL; (ou FULL em Android <= 8.0)
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000; (64MB)
PRAGMA mmap_size = 134217728; (128MB)
PRAGMA foreign_keys = ON;
```

**Análise:**
- ✅ WAL habilitado (melhora performance)
- ✅ synchronous apropriado para plataforma
- ✅ Cache e mmap configurados

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/schema.ts:196-210`

**Problema:**
- `PRAGMA auto_vacuum` NÃO está sendo executado na inicialização
- Apenas em `enableWALMode()` (que só roda no Android)

**Risco:**
- Banco pode crescer indefinidamente
- Espaço não é recuperado após DELETEs

**Correção Sugerida:**
```typescript
// Em initDB(), após criar tabelas
await exec("PRAGMA auto_vacuum = INCREMENTAL;");
await exec("PRAGMA incremental_vacuum;"); // Limpar espaço imediatamente
```

**OU** (melhor - apenas uma vez):
```typescript
// Verificar se já foi configurado
const autoVacuum = await getOne<{ auto_vacuum: number }>("PRAGMA auto_vacuum");
if (autoVacuum?.auto_vacuum === 0) {
  await exec("PRAGMA auto_vacuum = INCREMENTAL;");
  await exec("PRAGMA incremental_vacuum;");
}
```

---

### 5.2 Pragmas Faltantes

#### ⚠️ RECOMENDAÇÕES

**1. `PRAGMA optimize` (SQLite 3.18.0+)**
```sql
PRAGMA optimize; -- Executar periodicamente (semanalmente)
```
**Benefício:** Otimiza estatísticas de query planner

**2. `PRAGMA quick_check` (mais rápido que integrity_check)**
```sql
PRAGMA quick_check; -- Para validação rápida
```
**Benefício:** Validação mais rápida que `integrity_check`

**3. `PRAGMA busy_timeout`**
```sql
PRAGMA busy_timeout = 30000; -- 30 segundos
```
**Benefício:** Evita erros "database is locked"

**Código Sugerido:**
```typescript
// Em initDB(), após outros pragmas
await exec("PRAGMA busy_timeout = 30000;"); // 30s timeout
await exec("PRAGMA optimize;"); // Otimizar query planner
```

---

## 6️⃣ FTS5

### 6.1 Implementação

#### ✅ CORRETO
- ✅ Detecção de disponibilidade
- ✅ Fallback para LIKE se FTS5 não disponível
- ✅ Triggers para sincronização

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/fts5.ts:111-138`

**Problema:**
```typescript
const results = await getOne<{ ids: string }>(
  `SELECT group_concat(rowid) as ids 
   FROM clients_fts 
   WHERE clients_fts MATCH ? 
   LIMIT 100`,
  [query]
);
```

**Riscos:**
1. `group_concat` tem limite de 1MB por padrão
2. Query não sanitizada pode causar erro em FTS5
3. Não há validação de tamanho do resultado

**Correção Sugerida:**
```typescript
export async function searchClientsFTS5(query: string): Promise<number[]> {
  if (!(await isFTS5Available())) {
    return [];
  }

  try {
    await waitForInitDB();
    
    // ✅ Sanitizar query para FTS5 (remover caracteres especiais)
    const sanitized = query.trim().replace(/[^\w\s]/g, " ");
    
    // ✅ Usar LIMIT menor e paginação se necessário
    const results = await getAll<{ rowid: number }>(
      `SELECT rowid FROM clients_fts 
       WHERE clients_fts MATCH ? 
       LIMIT 100`,
      [sanitized]
    );

    return results.map(r => r.rowid).filter(id => !isNaN(id) && id > 0);
  } catch (error) {
    console.warn("⚠️ Erro na busca FTS5, usando fallback:", error);
    return [];
  }
}
```

---

### 6.2 Compatibilidade

#### ✅ CORRETO
- ✅ Verificação de disponibilidade antes de usar
- ✅ Fallback implementado

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/fts5.ts:15-35`

**Problema:**
- Cria tabela de teste `_fts5_test` que pode deixar resíduos se falhar

**Risco:**
- Tabela de teste pode não ser removida em caso de erro

**Correção Sugerida:**
```typescript
export async function isFTS5Available(): Promise<boolean> {
  if (fts5Available !== null) {
    return fts5Available;
  }

  try {
    await waitForInitDB();
    // ✅ Usar transação para garantir limpeza
    const { withTransactionAsync, txExec } = await import("./transactions");
    await withTransactionAsync(async (tx) => {
      await txExec(tx, `CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(test);`);
      await txExec(tx, `DROP TABLE IF EXISTS _fts5_test;`);
    });
    fts5Available = true;
    console.log("✅ FTS5 disponível");
    return true;
  } catch (error) {
    fts5Available = false;
    console.warn("⚠️ FTS5 não disponível");
    return false;
  }
}
```

---

## 7️⃣ CÓDIGO DE ACESSO AO DB

### 7.1 Funções exec/run/getOne/getAll

#### ✅ CORRETO
- ✅ Uso de prepared statements (proteção SQL injection)
- ✅ Tratamento de erros básico

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/queries.ts:75-87`

**Problema:**
```typescript
export async function getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  try {
    // ...
    return results.rows.length > 0 ? results.rows.item(0) : null;
  } catch (e) {
    console.error("❌ SQL getOne error:", sql, params, e);
    return null; // ⚠️ Retorna null em caso de erro
  }
}
```

**Risco:**
- Erro é silenciado (retorna null)
- Chamador não sabe se é "não encontrado" ou "erro"

**Correção Sugerida:**
```typescript
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
    // ✅ Re-lançar erro para que chamador possa tratar
    throw new Error(`getOne failed: ${e} - SQL: ${sql.substring(0, 100)}`);
  }
}
```

---

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/queries.ts:89-105`

**Problema:**
```typescript
export async function getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  // ...
  const rows: T[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    rows.push(results.rows.item(i));
  }
  return rows;
}
```

**Risco:**
- Loop pode ser lento para muitos resultados
- Não há limite máximo padrão

**Correção Sugerida:**
```typescript
export async function getAll<T>(sql: string, params: any[] = [], maxRows: number = 10000): Promise<T[]> {
  try {
    await waitForInitDB();
    const db = getDatabase();
    if (!db) await openDatabase();
    const database = getDatabase();
    
    // ✅ Adicionar LIMIT se não houver
    const hasLimit = /LIMIT\s+\d+/i.test(sql);
    const finalSql = hasLimit ? sql : `${sql} LIMIT ${maxRows}`;
    
    const [results] = await database.executeSql(finalSql, params);
    const rows: T[] = [];
    const limit = Math.min(results.rows.length, maxRows);
    
    for (let i = 0; i < limit; i++) {
      rows.push(results.rows.item(i));
    }
    
    if (results.rows.length > maxRows) {
      console.warn(`⚠️ getAll retornou ${results.rows.length} linhas, limitado a ${maxRows}`);
    }
    
    return rows;
  } catch (e) {
    console.error("❌ SQL getAll error:", sql, params, e);
    throw e; // ✅ Re-lançar erro
  }
}
```

---

### 7.2 Tratamento de Erros

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/queries.ts` (todas as funções)

**Problema:**
- Erros são logados mas não categorizados
- Não há diferenciação entre erro de conexão, SQL, constraint, etc.

**Correção Sugerida:**
```typescript
interface DatabaseError extends Error {
  code?: string;
  sql?: string;
  params?: any[];
}

function categorizeError(error: any, sql: string, params: any[]): DatabaseError {
  const dbError: DatabaseError = error instanceof Error ? error : new Error(String(error));
  dbError.sql = sql.substring(0, 200); // Limitar tamanho
  dbError.params = params;
  
  // ✅ Categorizar por código SQLite
  if (error?.code) {
    dbError.code = error.code;
  }
  
  return dbError;
}

// Usar em todas as funções
export async function getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  try {
    // ... código ...
  } catch (e) {
    const error = categorizeError(e, sql, params);
    console.error("❌ SQL getOne error:", error.code, error.sql);
    throw error;
  }
}
```

---

### 7.3 Race Conditions

#### ✅ CORRETO
- ✅ Transações atômicas implementadas
- ✅ Lock mechanism em initDB

#### ⚠️ PROBLEMA ENCONTRADO

**Arquivo:** `core/queries.ts:34-45`

**Problema:**
- Múltiplas chamadas a `getDatabase()` e `openDatabase()` podem causar race condition
- Não há lock entre verificação e uso

**Correção Sugerida:**
```typescript
// Criar helper que garante conexão
async function ensureDatabase(): Promise<SQLiteDatabase> {
  let db = getDatabase();
  if (!db) {
    db = await openDatabase();
  }
  // ✅ Verificar se ainda está válida
  try {
    await db.executeSql("SELECT 1");
    return db;
  } catch {
    // ✅ Reconectar se inválida
    db = await openDatabase();
    return db;
  }
}

// Usar em todas as funções
export async function exec(sql: string): Promise<void> {
  const database = await ensureDatabase();
  await database.executeSql(sql, []);
}
```

---

## 📊 RESUMO DE PROBLEMAS E CORREÇÕES

### 🔴 CRÍTICO (Corrigir Imediatamente)

1. **Falta `PRAGMA auto_vacuum` na inicialização**
   - **Arquivo:** `core/schema.ts`
   - **Correção:** Adicionar após criar tabelas
   - **Impacto:** Banco pode crescer indefinidamente

2. **Foreign keys podem não ser reabilitadas após migração**
   - **Arquivo:** `migrations/V2.ts:204`
   - **Correção:** Verificar após reabilitar
   - **Impacto:** Integridade referencial comprometida

3. **getOne/getAll retornam null/[] em caso de erro**
   - **Arquivo:** `core/queries.ts`
   - **Correção:** Re-lançar erro ou usar Result type
   - **Impacto:** Erros silenciosos

---

### 🟡 MÉDIO (Corrigir em Breve)

4. **Query UNION pode ser otimizada**
   - **Arquivo:** `services/searchService.ts:46-71`
   - **Correção:** Usar CTE ou UNION ALL
   - **Impacto:** Performance em bases grandes

5. **Falta validação de foreign keys após ativar**
   - **Arquivo:** `core/schema.ts:210`
   - **Correção:** Verificar após PRAGMA
   - **Impacto:** Foreign keys podem não estar ativas

6. **Falta índice em ruas.nome e bairros.nome**
   - **Arquivo:** `core/schema.ts:ALL_INDEXES`
   - **Correção:** Adicionar índices
   - **Impacto:** Buscas por rua/bairro lentas

---

### 🟢 BAIXO (Melhorias Futuras)

7. **getAll sem limite máximo padrão**
   - **Arquivo:** `core/queries.ts:89`
   - **Correção:** Adicionar maxRows
   - **Impacto:** Possível consumo excessivo de memória

8. **Falta PRAGMA optimize periódico**
   - **Arquivo:** `core/schema.ts`
   - **Correção:** Executar semanalmente
   - **Impacto:** Query planner pode não estar otimizado

9. **Falta PRAGMA busy_timeout**
   - **Arquivo:** `core/schema.ts`
   - **Correção:** Adicionar timeout
   - **Impacto:** Erros "database is locked"

---

## 🚀 SUGESTÕES AVANÇADAS

### 1. Connection Pooling (Futuro)

Para apps com muitas operações simultâneas:
```typescript
// Criar pool de conexões (se react-native-sqlite-storage suportar)
// OU usar worker threads para operações pesadas
```

### 2. Query Builder (Opcional)

Para queries complexas:
```typescript
// Criar query builder type-safe
const query = db.select('clients')
  .where('status', '=', 'pendente')
  .orderBy('name')
  .limit(100);
```

### 3. Monitoring de Performance

```typescript
// Adicionar timing em todas as queries
const start = Date.now();
await exec(sql);
const duration = Date.now() - start;
if (duration > 1000) {
  logWarning("Query lenta detectada", { sql, duration });
}
```

---

## ✅ CONCLUSÃO

O banco de dados está **bem estruturado** com:
- ✅ Schema sólido
- ✅ Migrations seguras
- ✅ Índices otimizados
- ✅ Transações atômicas

**Principais correções necessárias:**
1. Adicionar `PRAGMA auto_vacuum`
2. Verificar foreign keys após ativar
3. Melhorar tratamento de erros
4. Otimizar queries UNION

**Prioridade:** Corrigir itens CRÍTICOS primeiro, depois MÉDIOS.
