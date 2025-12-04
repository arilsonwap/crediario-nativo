import { formatDateBR } from "./formatDate";
import type { ChargesByDate, DaySummary } from "../types/charges";
import { getCachedWeekday } from "./dateUtils";

/**
 * ✅ Função pura para calcular os próximos 7 dias
 * Isolada para facilitar testes e memoização
 */
export const calculateNext7Days = (chargesByDate: ChargesByDate): DaySummary[] => {
  const arr: DaySummary[] = [];
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  for (let i = 0; i < 7; i++) {
    const d = new Date(todayYear, todayMonth, todayDate + i);
    const dateStr = formatDateBR(d);
    // ✅ weekday calculado com cache e armazenado no objeto
    const weekday = getCachedWeekday(d);
    // Busca pela string formatada
    const count = (chargesByDate[dateStr] || []).length;

    arr.push({
      date: d,
      dateStr,
      weekday, // ✅ Já calculado, não precisa recalcular
      count,
      isToday: i === 0, // Assume index 0 como hoje para simplificar visualização
    });
  }
  return arr;
};

/**
 * ✅ Função pura para calcular o total de cobranças
 * Isolada para facilitar testes e memoização
 */
export const calculateTotalCount = (chargesByDate: ChargesByDate): number => {
  return Object.values(chargesByDate).reduce((a, b) => a + b.length, 0);
};

