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
 */
export function parseBRL(value: string): number {
  if (!value) return 0;
  return Number(value.replace(/[R$\s.]/g, "").replace(",", "."));
}

/**
 * Exporta também como padrão (default) para compatibilidade com imports antigos
 */
export default formatCurrency;
