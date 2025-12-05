/* ===========================================================
   💰 Utilitários de Formatação de Moeda (Compatíveis com ambos os imports)
   Pode ser usado como:
   import formatCurrency, { parseBRL } from "../utils/formatCurrency";
   ou
   import { formatCurrency, parseBRL } from "../utils/formatCurrency";
=========================================================== */

/**
 * Formata número para moeda BRL (ex: 1500 → R$ 1.500,00)
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Converte string de moeda BRL para número (ex: "R$ 1.500,00" → 1500)
 * Também funciona com valores inteiros formatados (ex: "1.500" → 1500)
 */
export function parseBRL(value: string): number {
  if (!value) return 0;
  // Remove pontos de milhar e converte vírgula para ponto
  return Number(value.replace(/[R$\s.]/g, "").replace(",", "."));
}

/**
 * Converte string de valor inteiro formatado para número (ex: "1.500" → 1500)
 * Remove apenas pontos de milhar (formato brasileiro)
 */
export function parseInteger(value: string): number {
  if (!value) return 0;
  return Number(value.replace(/\./g, ""));
}

/**
 * Formata input de moeda enquanto o usuário digita (ex: "10000" → "100,00")
 */
export function maskBRL(value: string): string {
  if (!value) return "";
  let numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  numeric = (Number(numeric) / 100).toFixed(2) + "";
  return numeric.replace(".", ",");
}

/**
 * Formata input de valor inteiro (sem centavos) enquanto o usuário digita (ex: "1000" → "1.000")
 */
export function maskInteger(value: string): string {
  if (!value) return "";
  let numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  return Number(numeric).toLocaleString("pt-BR");
}

/**
 * Formata telefone com máscara dinâmica (ex: "11999999999" → "(11) 99999-9999")
 * Suporta telefone fixo (10 dígitos) e celular (11 dígitos)
 * Limita a 11 dígitos para evitar digitação infinita
 */
export function maskPhone(value: string): string {
  if (!value) return "";
  let v = value.replace(/\D/g, "");
  // Limita a 11 dígitos (máximo para celular brasileiro)
  v = v.slice(0, 11);
  
  if (v.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    if (v.length <= 2) {
      return v.length > 0 ? `(${v}` : "";
    } else if (v.length <= 6) {
      return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else {
      return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6, 10)}`;
    }
  } else {
    // Celular: (XX) XXXXX-XXXX
    if (v.length <= 2) {
      return `(${v}`;
    } else if (v.length <= 7) {
      return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else {
      return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
    }
  }
}

/**
 * Exporta também como padrão (default) para compatibilidade com imports antigos
 */
export default formatCurrency;
