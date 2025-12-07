/**
 * 💾 Cache de valores financeiros
 * Armazena valores de relatório em tabela própria para evitar SUM() constantes
 * Melhora performance significativamente em bases grandes
 */

import { formatDateTimeIso } from "../utils";
import { getOne, run } from "../core/queries";
import { withTransactionAsync, txRun } from "../core/transactions";
import { toCentavos, toReais } from "../utils";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

type CacheKey = 
  | "total_paid"
  | "total_to_receive"
  | "total_hoje"
  | "total_mes_atual"
  | "total_mes_anterior";

/**
 * ✅ Obtém valor do cache financeiro
 */
async function getCachedValue(key: CacheKey): Promise<number | null> {
  try {
    const now = formatDateTimeIso();
    const result = await getOne<{ value_cents: number; expires_at: string }>(
      `SELECT value_cents, expires_at 
       FROM financial_cache 
       WHERE key = ? AND expires_at > ?`,
      [key, now]
    );

    if (result) {
      return toReais(result.value_cents);
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Erro ao ler cache financeiro (${key}):`, error);
    return null;
  }
}

/**
 * ✅ Armazena valor no cache financeiro
 */
async function setCachedValue(key: CacheKey, value: number, ttlMs: number = CACHE_TTL_MS): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    
    await run(
      `INSERT OR REPLACE INTO financial_cache (key, value_cents, updated_at, expires_at)
       VALUES (?, ?, ?, ?)`,
      [
        key,
        toCentavos(value),
        formatDateTimeIso(now),
        formatDateTimeIso(expiresAt),
      ]
    );
  } catch (error) {
    console.warn(`⚠️ Erro ao salvar cache financeiro (${key}):`, error);
  }
}

/**
 * ✅ Limpa cache financeiro expirado
 */
export async function cleanExpiredFinancialCache(): Promise<void> {
  try {
    const now = formatDateTimeIso();
    await run(
      `DELETE FROM financial_cache WHERE expires_at <= ?`,
      [now]
    );
  } catch (error) {
    console.warn("⚠️ Erro ao limpar cache financeiro expirado:", error);
  }
}

/**
 * ✅ Limpa todo o cache financeiro
 */
export async function clearFinancialCache(): Promise<void> {
  try {
    await run(`DELETE FROM financial_cache`, []);
  } catch (error) {
    console.warn("⚠️ Erro ao limpar cache financeiro:", error);
  }
}

/**
 * ✅ Obtém total pago (com cache)
 */
export async function getTotalPaidCached(): Promise<number> {
  const cached = await getCachedValue("total_paid");
  if (cached !== null) {
    return cached;
  }

  // ✅ Calcular e armazenar no cache
  const { getOne } = await import("../core/queries");
  const result = await getOne<{ totalPaid: number }>(`
    SELECT COALESCE(SUM(paid_cents), 0) AS totalPaid
    FROM clients
  `);

  const total = toReais(result?.totalPaid ?? 0);
  await setCachedValue("total_paid", total);
  return total;
}

/**
 * ✅ Obtém total a receber (com cache)
 */
export async function getTotalToReceiveCached(): Promise<number> {
  const cached = await getCachedValue("total_to_receive");
  if (cached !== null) {
    return cached;
  }

  // ✅ Calcular e armazenar no cache
  const { getOne } = await import("../core/queries");
  const result = await getOne<{ totalToReceive: number }>(`
    SELECT COALESCE(SUM(value_cents - paid_cents), 0) AS totalToReceive
    FROM clients
  `);

  const total = toReais(result?.totalToReceive ?? 0);
  await setCachedValue("total_to_receive", total);
  return total;
}

/**
 * ✅ Obtém total de hoje (com cache)
 */
export async function getTotalHojeCached(): Promise<number> {
  const cached = await getCachedValue("total_hoje");
  if (cached !== null) {
    return cached;
  }

  // ✅ Calcular e armazenar no cache
  const { getOne } = await import("../core/queries");
  const { todayISO } = await import("../utils/dateHelpers");
  const today = todayISO();
  
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE DATE(created_at) = ?
  `, [today]);

  const total = toReais(result?.total ?? 0);
  await setCachedValue("total_hoje", total, 60 * 1000); // Cache de 1 minuto para dados do dia
  return total;
}

/**
 * ✅ Invalida cache quando valores mudam
 */
export async function invalidateFinancialCache(): Promise<void> {
  await clearFinancialCache();
}

/**
 * ✅ Inicializa cache financeiro (chamar após operações que alteram valores)
 */
export async function refreshFinancialCache(): Promise<void> {
  try {
    await withTransactionAsync(async (tx) => {
      // ✅ Limpar cache expirado
      const now = formatDateTimeIso();
      await txRun(tx, `DELETE FROM financial_cache WHERE expires_at <= ?`, [now]);

      // ✅ Recalcular e armazenar valores principais
      const { txGetOne } = await import("../core/transactions");
      
      const totals = await txGetOne<{ totalPaid: number; totalToReceive: number }>(tx, `
        SELECT
          COALESCE(SUM(paid_cents), 0) AS totalPaid,
          COALESCE(SUM(value_cents - paid_cents), 0) AS totalToReceive
        FROM clients
      `, []);

      if (totals) {
        const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
        await txRun(tx, `
          INSERT OR REPLACE INTO financial_cache (key, value_cents, updated_at, expires_at)
          VALUES (?, ?, ?, ?)
        `, ["total_paid", totals.totalPaid, formatDateTimeIso(), formatDateTimeIso(expiresAt)]);

        await txRun(tx, `
          INSERT OR REPLACE INTO financial_cache (key, value_cents, updated_at, expires_at)
          VALUES (?, ?, ?, ?)
        `, ["total_to_receive", totals.totalToReceive, formatDateTimeIso(), formatDateTimeIso(expiresAt)]);
      }
    });
  } catch (error) {
    console.warn("⚠️ Erro ao atualizar cache financeiro:", error);
  }
}

