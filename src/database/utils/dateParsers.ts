/**
 * 📅 Parsers específicos para formatos de data
 * Cada parser é responsável por um formato específico
 */

/**
 * ✅ Parser para formato ISO (yyyy-mm-dd)
 */
export function parseISODate(date: string): string | null {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // ✅ Validar ranges básicos
    const [year, month, day] = trimmed.split('-').map(Number);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return trimmed;
    }
  }
  return null;
}

/**
 * ✅ Parser para formato brasileiro (dd/mm/yyyy)
 */
export function parseBrazilianDate(date: string): string | null {
  const trimmed = date.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      
      // ✅ Validar ranges: dia 1-31, mês 1-12, ano 1900-2100
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/**
 * ✅ Normaliza data para formato ISO (yyyy-mm-dd)
 * Versão simplificada que aceita apenas formatos seguros
 */
export function normalizeDateToISO(date: string): string {
  if (!date) return "";
  
  const trimmed = date.trim();
  
  // ✅ Formato ISO (yyyy-mm-dd) - retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // ✅ Formato brasileiro (dd/mm/yyyy) - converter
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m}-${d}`;
  }
  
  // ❌ Rejeitar formatos não suportados
  console.warn("Data inválida:", date);
  return "";
}

