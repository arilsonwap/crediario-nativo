/**
 * 🔍 Serviço de Busca
 * Gerencia buscas de clientes com otimizações de performance
 */

import { sanitizeForLike } from "../utils";
import { selectMapped } from "../core/queries";
import { mapClient } from "../core/mappers";
import { searchClientsFTS5 } from "../core/fts5";
import type { Client, ClientDB } from "../types";

/**
 * ✅ Busca accent-insensitive usando UNION para ativar índices
 * ✅ Busca em SQL (não carrega todos em memória) - ESCALA para 10.000+ clientes
 * ✅ Compatível com todos os devices (não requer FTS5)
 * ✅ Usa UNION em vez de OR para ativar índices individuais
 */
export const getClientsBySearch = async (query: string, limit: number = 100): Promise<Client[]> => {
  try {
    if (!query || !query.trim()) {
      return [];
    }
    
    // ⚡ Tentar usar FTS5 primeiro (muito mais rápido se disponível)
    const fts5Ids = await searchClientsFTS5(query.trim());
    
    if (fts5Ids.length > 0) {
      // ✅ Buscar clientes pelos IDs retornados pelo FTS5
      const placeholders = fts5Ids.map(() => "?").join(",");
      return await selectMapped<Client, ClientDB>(
        `SELECT * FROM clients 
         WHERE id IN (${placeholders})
         ORDER BY name ASC
         LIMIT ?`,
        [...fts5Ids, limit],
        mapClient
      );
    }
    
    // ✅ Fallback: busca LIKE tradicional otimizada com CTE
    // ⚡ Usa CTE (Common Table Expression) para melhor performance que múltiplas UNIONs
    // ⚡ UNION ALL é mais rápido que UNION (não remove duplicatas durante união)
    // ⚡ DISTINCT externo remove duplicatas apenas uma vez no final
    const sanitized = sanitizeForLike(query.trim());
    const q = `%${sanitized}%`;
    
    // ✅ CTE otimizada: primeiro coleta IDs únicos, depois busca dados completos
    // Isso evita carregar dados completos de clientes em cada subquery UNION
    return await selectMapped<Client, ClientDB>(
      `WITH search_results AS (
        SELECT DISTINCT c.id FROM (
          SELECT id FROM clients WHERE name LIKE ? ESCAPE '\\'
          UNION ALL
          SELECT id FROM clients WHERE telefone LIKE ? ESCAPE '\\'
          UNION ALL
          SELECT id FROM clients WHERE numero LIKE ? ESCAPE '\\'
          UNION ALL
          SELECT id FROM clients WHERE referencia LIKE ? ESCAPE '\\'
          UNION ALL
          SELECT c.id FROM clients c
          INNER JOIN ruas r ON c.ruaId = r.id
          WHERE r.nome LIKE ? ESCAPE '\\'
          UNION ALL
          SELECT c.id FROM clients c
          INNER JOIN ruas r ON c.ruaId = r.id
          INNER JOIN bairros b ON r.bairroId = b.id
          WHERE b.nome LIKE ? ESCAPE '\\'
        ) c
      )
      SELECT clients.* FROM clients
      INNER JOIN search_results sr ON clients.id = sr.id
      ORDER BY clients.name ASC
      LIMIT ?`,
      [q, q, q, q, q, q, limit],
      mapClient
    );
  } catch (err) {
    console.error("❌ Erro ao buscar clientes:", err);
    // ✅ Re-lançar erro em vez de retornar array vazio
    // Permite que chamador trate o erro adequadamente
    throw err;
  }
};

/**
 * ⚠️ DEPRECATED: Esta função é um alias para getClientsBySearch()
 * Mantida apenas para compatibilidade com código legado
 * 
 * @deprecated Use getClientsBySearch() em vez disso
 */
export async function searchClients(query: string, limit: number = 100): Promise<Client[]> {
  return getClientsBySearch(query, limit);
}
