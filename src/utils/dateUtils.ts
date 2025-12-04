import type { DateFormat, ISODate } from "../types/charges";

// ✅ Constantes de formatos de data
export const DATE_FORMATS = {
  ISO: "YYYY-MM-DD",
  BR: "DD/MM/YYYY",
  WEEKDAY: "EEEE",
} as const;

// ✅ Cache para weekdays (evita recálculos)
const weekdayCache = new Map<string, string>();

/**
 * ✅ Função otimizada com cache para obter weekday
 * Evita recálculos desnecessários do mesmo dia
 */
export const getCachedWeekday = (date: Date): string => {
  const key = date.toDateString();
  
  if (!weekdayCache.has(key)) {
    const weekday = date
      .toLocaleDateString("pt-BR", { weekday: "long" })
      .split("-")[0] // Remove "-feira" se houver
      .replace(/^\w/, (c) => c.toUpperCase()); // Capitaliza
    
    weekdayCache.set(key, weekday);
  }
  
  return weekdayCache.get(key)!;
};

/**
 * ✅ Função robusta para parsear data de cobrança
 * Converte ISO (YYYY-MM-DD) para BR (DD/MM/YYYY)
 */
export const parseChargeDate = (dateString: string): DateFormat => {
  if (!dateString) return "";

  try {
    // Se já está no formato BR, retorna
    if (dateString.includes("/")) {
      return dateString as DateFormat;
    }

    // Converte de ISO para BR
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-");
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` as DateFormat;
    }

    return dateString as DateFormat;
  } catch {
    return dateString as DateFormat;
  }
};

/**
 * ✅ Converte DateFormat para ISODate
 */
export const formatDateToISO = (dateStr: DateFormat): ISODate => {
  if (!dateStr) return "" as ISODate;

  try {
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` as ISODate;
    }

    return dateStr as ISODate;
  } catch {
    return dateStr as ISODate;
  }
};

/**
 * ✅ Limpa o cache de weekdays (útil para testes)
 */
export const clearWeekdayCache = () => {
  weekdayCache.clear();
};

