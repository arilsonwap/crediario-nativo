/**
 * 📅 Helpers reutilizáveis para datas
 * Funções simples e diretas para operações comuns
 */

import { formatDateTimeIso, formatDateIso } from "../utils";

/**
 * ✅ Retorna data/hora atual em formato ISO
 */
export const nowISO = (): string => formatDateTimeIso();

/**
 * ✅ Retorna data de hoje em formato ISO (yyyy-mm-dd)
 */
export const todayISO = (): string => formatDateIso();

/**
 * ✅ Retorna data de amanhã em formato ISO (yyyy-mm-dd)
 */
export const tomorrowISO = (): string => formatDateIso(new Date(Date.now() + 86400000));

/**
 * ✅ Retorna data de X dias a partir de hoje
 */
export const daysFromTodayISO = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateIso(date);
};

/**
 * ✅ Retorna data de X dias atrás a partir de hoje
 */
export const daysAgoISO = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateIso(date);
};

/**
 * ✅ Retorna início do mês atual em formato ISO
 */
export const startOfMonthISO = (): string => {
  const now = new Date();
  return formatDateIso(new Date(now.getFullYear(), now.getMonth(), 1));
};

/**
 * ✅ Retorna fim do mês atual em formato ISO
 */
export const endOfMonthISO = (): string => {
  const now = new Date();
  return formatDateIso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

