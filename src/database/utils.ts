/**
 * 🛠️ Utilitários do banco de dados
 */

// 📅 Formato brasileiro para UI (dd/mm/yyyy)
export const formatDate = (date = new Date()): string => date.toLocaleDateString("pt-BR");

// 📅 Formato ISO completo para armazenamento (yyyy-mm-ddTHH:mm:ss.sssZ)
export const formatDateTimeIso = (date = new Date()): string => date.toISOString();

// 📅 Formato ISO apenas data (yyyy-mm-dd)
export const formatDateIso = (date = new Date()): string => date.toISOString().slice(0, 10);

// 💰 Conversão de valores monetários (evita problemas de float)
export const toCentavos = (reais: number): number => Math.round(reais * 100); // R$ 15.00 → 1500 centavos
export const toReais = (centavos: number): number => centavos / 100; // 1500 centavos → R$ 15.00

// ✅ Validação de data ISO (yyyy-mm-dd)
export const isValidDateISO = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * ✅ Sanitiza string para uso seguro em queries SQL
 * Remove caracteres perigosos e limita tamanho
 * 
 * @param input - String a ser sanitizada
 * @param maxLength - Tamanho máximo (padrão: 500)
 * @returns String sanitizada e segura
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 500): string {
  if (!input) return "";
  
  return String(input)
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove caracteres de controle
}

/**
 * ✅ Sanitiza string para uso seguro em queries LIKE
 * Escapa caracteres especiais % e _ que podem quebrar resultados
 * 
 * @param input - String a ser sanitizada para LIKE
 * @returns String sanitizada e segura para LIKE com ESCAPE
 */
export function sanitizeForLike(input: string | null | undefined): string {
  if (!input) return "";
  
  return sanitizeString(input)
    .replace(/[%_]/g, "\\$&"); // Escapa % e _ para LIKE
}

/**
 * ✅ Sanitiza array de strings para uso seguro em queries SQL
 */
export function sanitizeStrings(inputs: (string | null | undefined)[], maxLength: number = 500): string[] {
  return inputs.map(input => sanitizeString(input, maxLength));
}

/**
 * ✅ Normaliza data para formato ISO (yyyy-mm-dd) com padding de zeros
 * Garante que datas como "1/12/2025" virem "2025-12-01" e não "2025-12-1"
 */
export function normalizeDateToISO(date: string): string {
  if (!date) return "";
  
  // Se já está no formato ISO (yyyy-mm-dd), retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Se está no formato brasileiro (dd/mm/yyyy), converter
  if (date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // ✅ Garantir padding de zeros: 1 → 01, 12 → 12
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Fallback: tentar parsear como Date
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Ignorar erro
  }
  
  return date; // Retornar original se não conseguir normalizar
}


