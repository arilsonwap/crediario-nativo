/**
 * 📊 Serviço de Relatórios
 * Gerencia relatórios financeiros e estatísticas
 */

import { toReais, formatDateIso } from "../utils";
import { todayISO, startOfMonthISO, endOfMonthISO, daysFromTodayISO } from "../utils/dateHelpers";
import { getOne, getAll } from "../core/queries";
import type { TopCliente, CrediarioPorBairro } from "../types";
import {
  getTotalPaidCached,
  getTotalToReceiveCached,
  getTotalHojeCached,
  invalidateFinancialCache,
} from "./financialCache";

// ============================================================
// 📊 TOTAIS (com cache)
// ============================================================
let totalsCache: { totalPaid: number; totalToReceive: number; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 segundos

export const getTotals = async (forceRefresh = false): Promise<{ totalPaid: number; totalToReceive: number }> => {
  // ⚡ Usar cache financeiro se disponível (melhor performance)
  if (!forceRefresh) {
    try {
      const [totalPaid, totalToReceive] = await Promise.all([
        getTotalPaidCached(),
        getTotalToReceiveCached(),
      ]);
      
      // ✅ Se cache retornou valores válidos, usar
      if (totalPaid !== null && totalToReceive !== null) {
        return { totalPaid, totalToReceive };
      }
    } catch (error) {
      console.warn("⚠️ Erro ao usar cache financeiro, usando cálculo direto:", error);
    }
  }

  // ✅ Fallback: cálculo direto (com cache em memória)
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

/**
 * ✅ Limpa cache de totais
 */
export const clearTotalsCache = () => {
  if (totalsCache) {
    totalsCache = null;
    // ✅ Forçar garbage collection (se disponível) em operações em massa
    if (global.gc) {
      global.gc();
    }
  }
  
  // ⚡ Limpar também cache financeiro
  invalidateFinancialCache().catch(error => {
    console.warn("⚠️ Erro ao limpar cache financeiro:", error);
  });
};

// ============================================================
// 📊 RELATÓRIOS FINANCEIROS (Home)
// ============================================================

export const getTotalHoje = async (): Promise<number> => {
  // ⚡ Usar cache financeiro se disponível
  try {
    const cached = await getTotalHojeCached();
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    console.warn("⚠️ Erro ao usar cache financeiro, usando cálculo direto:", error);
  }
  
  // ✅ Fallback: cálculo direto
  // ✅ Otimizado: usar comparação direta com strings ISO em vez de DATE()
  // Isso permite uso do índice idx_payments_created_at
  const today = todayISO();
  const tomorrow = daysFromTodayISO(1);
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE created_at >= ? AND created_at < ?
  `, [today, tomorrow]);
  
  return toReais(result?.total ?? 0);
};

export const getTotalMesAtual = async (): Promise<number> => {
  const startDate = startOfMonthISO();
  const endDate = endOfMonthISO();
  
  // ✅ CRÍTICO: Usar comparação direta com strings ISO em vez de DATE()
  // Isso permite uso do índice idx_payments_created_at
  // endDate precisa incluir o final do dia (23:59:59)
  const endDateWithTime = `${endDate}T23:59:59`;
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE created_at >= ? AND created_at <= ?
  `, [startDate, endDateWithTime]);
  
  return toReais(result?.total ?? 0);
};

export const getTotalMesAnterior = async (): Promise<number> => {
  // ✅ Calcular início e fim do mês anterior
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startDate = formatDateIso(lastMonth);
  const endDate = formatDateIso(new Date(now.getFullYear(), now.getMonth(), 0));
  
  // ✅ CRÍTICO: Usar comparação direta com strings ISO em vez de DATE()
  // Isso permite uso do índice idx_payments_created_at
  // endDate precisa incluir o final do dia (23:59:59)
  const endDateWithTime = `${endDate}T23:59:59`;
  const result = await getOne<{ total: number }>(`
    SELECT COALESCE(SUM(value_cents), 0) AS total
    FROM payments
    WHERE created_at >= ? AND created_at <= ?
  `, [startDate, endDateWithTime]);
  
  return toReais(result?.total ?? 0);
};

export const getTopClientesMes = async (): Promise<TopCliente[]> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // ✅ CRÍTICO: Usar BETWEEN em vez de strftime para melhor performance
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

