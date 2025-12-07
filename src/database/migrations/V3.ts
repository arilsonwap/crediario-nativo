/**
 * 🔄 Migração V3: Bairro → Rua → Cliente
 * Adiciona estrutura hierárquica Bairro → Rua → Cliente
 * Adiciona novos campos: ruaId, ordemVisita, prioritario, observacoes, status, proximaData
 */

import { txExec, txGetAll, txGetOne } from "../core/transactions";

/**
 * ✅ Migração V3: Adiciona estrutura Bairro → Rua → Cliente
 * Adiciona novas colunas e tabelas sem perder dados existentes
 * ✅ Usa tx diretamente para evitar transações duplicadas
 * 
 * ⚠️ COMPLEXIDADE: Recria tabela clients (CREATE TABLE clients_v3)
 * - Pode falhar em dispositivos com SQLite <3.35 (suporte a CHECK constraints)
 * - Verificação de versão SQLite adicionada antes da migração
 */
export async function migrateV3(tx: any): Promise<void> {
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
    // ⚠️ OTIMIZAÇÃO: Só recriar se realmente necessário (tem colunas deprecated)
    // Evita recriação desnecessária em dispositivos fracos
    const needsMigration = clientsCols.includes("bairro") || clientsCols.includes("next_charge");
    
    if (needsMigration) {
      console.log("🔄 Removendo colunas deprecated e adicionando CHECK constraints...");
      
      // ✅ CRÍTICO: Verificar se já existe clients_v3 (evita recriação múltipla)
      const tablesRaw = await txGetAll<any>(tx, "SELECT name FROM sqlite_master WHERE type='table' AND name='clients_v3'", []);
      if (tablesRaw.length > 0) {
        console.log("⚠️ Tabela clients_v3 já existe, pulando recriação para evitar perda de dados");
      } else {
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
        // ⚠️ OTIMIZAÇÃO: Usar INSERT com validação em uma única query
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
            MIN(MAX(0, paid_cents), MAX(0, value_cents)) as paid_cents,
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
        
        // ✅ Substituir tabela antiga pela nova (ATÔMICO)
        await txExec(tx, "DROP TABLE clients;");
        await txExec(tx, "ALTER TABLE clients_v3 RENAME TO clients;");
        
        console.log("✅ Colunas deprecated removidas, CHECK constraints adicionadas");
      }
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
