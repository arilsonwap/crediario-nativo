/**
 * 📜 Repositório de Logs
 * Gerencia operações de logs de clientes
 */

import { formatDateTimeIso } from "../utils";
import { withTransactionAsync, txRun } from "../core/transactions";
import { runAndGetId, getAll } from "../core/queries";
import type { Log } from "../types";

/**
 * ✅ Adiciona log com transação própria (uso externo)
 */
export async function addLog(clientId: number, descricao: string): Promise<void> {
  if (!clientId) return;

  // ✅ CRÍTICO: Adicionar catch para evitar perda silenciosa de logs
  try {
    const created_at = formatDateTimeIso();
    await withTransactionAsync(async (tx) => {
      await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
        clientId,
        created_at,
        descricao,
      ]);
      
      // ✅ CRÍTICO: Limpar logs antigos automaticamente (mantém apenas últimas 50)
      await txRun(tx, `
        DELETE FROM logs 
        WHERE clientId = ? 
        AND id NOT IN (
          SELECT id FROM logs 
          WHERE clientId = ? 
          ORDER BY id DESC 
          LIMIT 50
        )
      `, [clientId, clientId]);
    });
  } catch (e) {
    console.warn("⚠️ Log falhou:", e);
    // Não relançar erro para não quebrar o fluxo principal
  }
}

/**
 * ✅ Adiciona log e retorna o log criado (para sincronização com Firestore)
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
  // ✅ CRÍTICO: Limitar a últimas 50 linhas por cliente para evitar logs enormes
  return await getAll<Log>(
    "SELECT id, clientId, created_at, descricao FROM logs WHERE clientId = ? ORDER BY id DESC LIMIT 50",
    [clientId]
  );
};

