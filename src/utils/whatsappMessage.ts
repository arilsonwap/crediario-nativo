import { formatCurrency } from "./formatCurrency";

/**
 * ✅ Constrói mensagem de WhatsApp para lembrança de vencimento
 * 
 * @param clientName - Nome do cliente
 * @param clientValue - Valor da cobrança
 * @param date - Data do vencimento (formato BR: DD/MM/YYYY)
 * @returns Mensagem formatada para WhatsApp
 */
export const buildWhatsAppMessage = (
  clientName: string,
  clientValue: number,
  date: string
): string => {
  return `Olá ${clientName}, estou passando para lembrar do vencimento hoje (${date}) no valor de ${formatCurrency(clientValue || 0)}.`;
};

