/**
 * ✅ Retorna clientes agrupados por rua para uma data específica
 * ⚠️ DEPRECATED: Esta função será migrada para repositories/clientsRepo.ts
 */

import { getAll, selectMapped } from "../core/queries";
import { mapClient } from "../core/mappers";
import type { Client, ClientDB, ClientesPorRua } from "../types";

export async function getClientesAgrupadosPorRua(date: string): Promise<ClientesPorRua[]> {
  if (!date) return [];
  
  const { normalizeDateToISO } = await import("../utils/dateParsers");
  const normalizedDate = normalizeDateToISO(date);
  
  if (!normalizedDate) {
    console.warn(`⚠️ Data inválida: ${date}`);
    return [];
  }
  
  // ✅ Buscar clientes da data agrupados por rua
  // ✅ Usar -1 para "sem rua" em vez de NULL (diferencia ruaId real)
  const results = await getAll<{
    ruaId: number; // ✅ Sempre número (nunca null devido ao COALESCE)
    ruaNome: string | null;
    bairroNome: string | null;
    totalClientes: number;
    totalPagos_cents: number;
    totalPendentes_cents: number;
  }>(`
    SELECT 
      COALESCE(c.ruaId, -1) as ruaId,
      r.nome as ruaNome,
      b.nome as bairroNome,
      COUNT(*) as totalClientes,
      SUM(CASE WHEN c.status = 'quitado' THEN c.paid_cents ELSE 0 END) as totalPagos_cents,
      SUM(CASE WHEN c.status = 'pendente' THEN (c.value_cents - c.paid_cents) ELSE 0 END) as totalPendentes_cents
    FROM clients c
    LEFT JOIN ruas r ON c.ruaId = r.id
    LEFT JOIN bairros b ON r.bairroId = b.id
    WHERE c.proximaData = ?
    GROUP BY COALESCE(c.ruaId, -1), r.nome, b.nome
    ORDER BY r.nome ASC, b.nome ASC
  `, [normalizedDate]);
  
  // ✅ Buscar clientes de cada rua
  const grupos: ClientesPorRua[] = [];
  const { toReais } = await import("../utils");
  
  for (const row of results) {
    // ✅ ruaId já vem como -1 para "sem rua" do COALESCE
    const ruaId = row.ruaId;
    
    // ✅ Buscar clientes: se ruaId = -1, buscar clientes sem rua (ruaId IS NULL)
    const clientes = await selectMapped<Client, ClientDB>(
      `SELECT * FROM clients 
       WHERE proximaData = ? AND (ruaId = ? OR (ruaId IS NULL AND ? = -1))
       ORDER BY ordemVisita ASC, name ASC`,
      [normalizedDate, ruaId === -1 ? null : ruaId, ruaId],
      mapClient
    );
    
    grupos.push({
      ruaId, // ✅ Usar -1 para "sem rua"
      ruaNome: row.ruaNome ?? "Sem rua",
      bairroNome: row.bairroNome ?? "Sem bairro",
      clientes,
      totalClientes: row.totalClientes,
      totalPagos: toReais(row.totalPagos_cents ?? 0),
      totalPendentes: toReais(row.totalPendentes_cents ?? 0),
    });
  }
  
  return grupos;
}
