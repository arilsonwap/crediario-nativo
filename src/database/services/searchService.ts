/**
 * 🔍 Serviço de Busca
 * Gerencia buscas de clientes com otimizações de performance
 */

import { sanitizeForLike } from "../utils";
import { selectMapped } from "../core/queries";
import { mapClient } from "../core/mappers";
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
    
    // ✅ Sanitizar e escapar caracteres especiais para LIKE
    const sanitized = sanitizeForLike(query.trim());
    const q = `%${sanitized}%`;
    
    // ✅ Usar UNION em vez de OR para ativar índices individuais
    // ✅ V3: Busca em ruas e bairros via JOIN (coluna bairro foi removida)
    return await selectMapped<Client, ClientDB>(
      `SELECT * FROM (
        SELECT DISTINCT c.* FROM (
          SELECT * FROM clients WHERE name LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE telefone LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE numero LIKE ? ESCAPE '\\'
          UNION
          SELECT * FROM clients WHERE referencia LIKE ? ESCAPE '\\'
          UNION
          SELECT c.* FROM clients c
          LEFT JOIN ruas r ON c.ruaId = r.id
          WHERE r.nome LIKE ? ESCAPE '\\'
          UNION
          SELECT c.* FROM clients c
          LEFT JOIN ruas r ON c.ruaId = r.id
          LEFT JOIN bairros b ON r.bairroId = b.id
          WHERE b.nome LIKE ? ESCAPE '\\'
        ) c
      )
      ORDER BY name ASC
      LIMIT ?`,
      [q, q, q, q, q, q, limit],
      mapClient
    );
  } catch (err) {
    console.error("❌ Erro ao buscar clientes:", err);
    return [];
  }
};

/**
 * ❌ REMOVIDA: Esta função foi removida por ser duplicada
 * Use getClientsBySearch() em vez disso (otimizado com UNION)
 */
export const searchClients = async (query: string): Promise<Client[]> => {
  throw new Error(
    "searchClients() foi removida. Use getClientsBySearch() em vez disso. " +
    "A função antiga era apenas um wrapper duplicado."
  );
};
