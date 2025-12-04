import type { Client } from "../database/db";
import type { ChargesByDate } from "../types/charges";
import { parseChargeDate } from "./dateUtils";

/**
 * ✅ Função pura para processar dados de cobranças
 * Separa lógica de negócio para facilitar testes
 */
export const processChargesData = (clients: Client[]): ChargesByDate => {
  const grouped: ChargesByDate = {};

  clients.forEach((client) => {
    if (!client.next_charge) return;

    const dateKey = parseChargeDate(client.next_charge);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(client);
  });

  return grouped;
};

