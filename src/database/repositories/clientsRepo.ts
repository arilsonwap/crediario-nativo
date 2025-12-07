/**
 * 👥 Repositório de Clientes
 * Gerencia operações CRUD e buscas de clientes
 * 
 * ⚠️ NOTA: Este arquivo contém apenas as funções principais.
 * Funções auxiliares complexas (updateClient com normalização parcial)
 * foram mantidas no db.ts original para evitar duplicação excessiva.
 * Considere extrair essas funções auxiliares em um arquivo separado se necessário.
 */

import { waitForInitDB } from "../core/schema";
import { normalizeClientData } from "../utils";
import { runAndGetId, run, getOne, getAll, selectMapped } from "../core/queries";
import { mapClient } from "../core/mappers";
import { addLog } from "./logsRepo";
// Importação dinâmica para evitar dependência circular
async function clearTotalsCache() {
  try {
    const { clearTotalsCache: clearCache } = await import("../services/reportsService");
    clearCache();
  } catch (e) {
    // Ignorar se reportsService ainda não estiver disponível
    console.warn("⚠️ Não foi possível limpar cache:", e);
  }
}
import { formatDateTimeIso, toCentavos, toReais, normalizeDateToISO, sanitizeString } from "../utils";
import { todayISO, daysFromTodayISO } from "../utils/dateHelpers";
import type { Client, ClientDB } from "../types";

export async function addClient(client: Client): Promise<number> {
  await waitForInitDB();
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
  await   await clearTotalsCache();
  
  // ⚡ Invalidar cache financeiro
  const { invalidateFinancialCache } = await import("../services/financialCache");
  await invalidateFinancialCache();
  
  return id;
}

// ⚠️ NOTA: updateClient é muito complexo (300+ linhas) 
// Esta função ainda precisa ser migrada do db.ts original
// Por enquanto, use diretamente do db.ts original se necessário

export async function deleteClient(id: number): Promise<void> {
  if (!id) return;
  await run("DELETE FROM clients WHERE id = ?", [id]);
  await clearTotalsCache();
  
  // ⚡ Invalidar cache financeiro
  const { invalidateFinancialCache } = await import("../services/financialCache");
  await invalidateFinancialCache();
}

export const getAllClients = async (): Promise<Client[]> => {
  // ✅ Usar paginação mesmo para getAllClients (limite de 500)
  // Isso garante que nunca carregamos todos os clientes de uma vez
  try {
    if (__DEV__) {
      console.log("🔄 getAllClients: iniciando query...");
    }
    
    // ✅ Verificar se a tabela existe e tem dados
    const { getOne } = await import("../core/queries");
    const countResult = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM clients", []);
    const totalCount = countResult?.count ?? 0;
    
    if (__DEV__) {
      console.log(`📊 getAllClients: Total de clientes no banco: ${totalCount}`);
    }
    
    if (totalCount === 0) {
      console.warn("⚠️ getAllClients: Nenhum cliente encontrado no banco de dados!");
      return [];
    }
    
    const result = await selectMapped<Client, ClientDB>(
      "SELECT * FROM clients ORDER BY name ASC LIMIT 500", 
      [], 
      mapClient
    );
    if (__DEV__) {
      console.log(`✅ getAllClients: ${result.length} clientes retornados (de ${totalCount} no banco)`);
    }
    
    if (result.length === 0 && totalCount > 0) {
      console.error("❌ CRÍTICO: getAllClients retornou array vazio mas há clientes no banco!");
      console.error("❌ Isso indica problema no mapeamento ou na query");
    }
    
    return result;
  } catch (error) {
    console.error("❌ getAllClients: erro ao buscar clientes:", error);
    throw error;
  }
};

export const getTotalClients = async (): Promise<number> => {
  const result = await getOne<{ total: number }>("SELECT COUNT(*) as total FROM clients", []);
  return result?.total ?? 0;
};

export const getAllClientsFull = async (): Promise<Client[]> => {
  // ⚠️ ATENÇÃO: Esta função pode carregar muitos dados
  // Considerar usar getClientsPage() com paginação em vez disso
  // Limite explícito de 10000 para evitar carregar todos os clientes de uma vez
  return await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients ORDER BY name ASC LIMIT 10000", 
    [], 
    mapClient
  );
};

export const getClientsPage = async (limit: number, offset: number): Promise<Client[]> => {
  // ✅ Validação de parâmetros para evitar queries inválidas
  // Limite entre 1 e 1000 para evitar carregar muitos dados de uma vez
  if (limit <= 0 || limit > 1000) {
    throw new Error(`Limit deve estar entre 1 e 1000. Recebido: ${limit}`);
  }
  
  // Offset não pode ser negativo
  if (offset < 0) {
    throw new Error(`Offset não pode ser negativo. Recebido: ${offset}`);
  }
  
  return await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients ORDER BY name ASC LIMIT ? OFFSET ?",
    [limit, offset],
    mapClient
  );
};

export const getClientById = async (id: number): Promise<Client | null> => {
  if (!id) return null;
  const row = await getOne<ClientDB>("SELECT * FROM clients WHERE id = ?", [id]);
  if (!row) return null;
  return mapClient(row);
};

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

export const getUpcomingCharges = async (): Promise<Client[]> => {
  const today = todayISO();
  const next7 = daysFromTodayISO(7);
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients
     WHERE proximaData IS NOT NULL
     AND proximaData BETWEEN ? AND ?
     ORDER BY proximaData ASC`,
    [today, next7],
    mapClient
  );
};

export async function getClientsByRua(ruaId: number): Promise<Client[]> {
  if (!ruaId) return [];
  return await selectMapped<Client, ClientDB>(
    "SELECT * FROM clients WHERE ruaId = ? ORDER BY ordemVisita ASC, name ASC",
    [ruaId],
    mapClient
  );
}

export async function getClientesPrioritariosHoje(): Promise<Client[]> {
  const hoje = todayISO();
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients 
     WHERE prioritario = 1 
     AND proximaData = ?
     ORDER BY name ASC`,
    [hoje],
    mapClient
  );
}

// ⚠️ NOTA: getClientsByDate e getClientesAgrupadosPorRua ainda precisam ser migradas
// Use diretamente do db.ts original se necessário
