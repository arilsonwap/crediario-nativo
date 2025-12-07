/**
 * ✅ Busca clientes por data
 * ⚠️ DEPRECATED: Esta função será migrada para repositories/clientsRepo.ts
 */

import { selectMapped } from "../core/queries";
import { mapClient } from "../core/mappers";
import type { Client, ClientDB } from "../types";

export async function getClientsByDate(date: string): Promise<Client[]> {
  if (!date) return [];
  
  const { normalizeDateToISO } = await import("../utils/dateParsers");
  const normalizedDate = normalizeDateToISO(date);
  
  if (!normalizedDate) {
    console.warn(`⚠️ Data inválida: ${date}`);
    return [];
  }
  
  return await selectMapped<Client, ClientDB>(
    `SELECT * FROM clients 
     WHERE proximaData = ?
     ORDER BY name ASC`,
    [normalizedDate],
    mapClient
  );
}
