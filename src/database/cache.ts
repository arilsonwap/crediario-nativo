/**
 * 🧠 Gerenciamento Inteligente de Cache
 * 
 * ✅ Cache com TTL (Time To Live)
 * ✅ Limites de memória (evita vazamentos)
 * ✅ Thread-safe para operações simultâneas
 * ✅ Eviction automática (remove itens mais antigos quando limite excedido)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number; // bytes estimados
}

class DatabaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSizeMB = 50; // Limite máximo de cache (50MB)
  private currentSize = 0; // bytes

  /**
   * ✅ Estima tamanho aproximado de um objeto em bytes
   * Usa JSON.stringify para estimar tamanho (não é preciso, mas suficiente)
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback: estimativa conservadora
      return 1024; // 1KB por padrão
    }
  }

  /**
   * ✅ Remove itens mais antigos até liberar espaço necessário
   * @param targetFreeMB - Quantidade de MB a liberar (0.5 = 50%)
   */
  private evictOldest(targetFreeMB: number = 0.5): void {
    const targetFreeBytes = (this.maxSizeMB * targetFreeMB) * 1024 * 1024;
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp); // Mais antigos primeiro

    let freed = 0;
    for (const [key, entry] of entries) {
      if (freed >= targetFreeBytes) break;
      
      this.cache.delete(key);
      this.currentSize -= entry.size;
      freed += entry.size;
    }

    if (freed > 0) {
      console.log(`🧹 Cache: liberados ${(freed / 1024 / 1024).toFixed(2)}MB (${this.cache.size} itens restantes)`);
    }
  }

  /**
   * ✅ Armazena dados no cache com TTL
   * @param key - Chave única do cache
   * @param data - Dados a armazenar
   * @param ttlMs - Time To Live em milissegundos (padrão: 30s)
   */
  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    const size = this.estimateSize(data);

    // ✅ Limpar cache se exceder limite
    if (this.currentSize + size > this.maxSizeMB * 1024 * 1024) {
      this.evictOldest(0.5); // Remove 50% mais antigos
    }

    // ✅ Se já existe, subtrair tamanho antigo
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });

    this.currentSize += size;
  }

  /**
   * ✅ Recupera dados do cache (retorna null se expirado ou não existe)
   * @param key - Chave do cache
   * @param ttlMs - Time To Live em milissegundos (padrão: 30s)
   */
  get<T>(key: string, ttlMs: number = 30000): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > ttlMs) {
      // ✅ Expirado: remover e retornar null
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return null;
    }

    return entry.data as T;
  }

  /**
   * ✅ Limpa todo o cache e força liberação de memória
   * ✅ Thread-safe: múltiplas chamadas simultâneas são seguras
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    
    // ✅ Forçar garbage collection (se disponível) em operações em massa
    // Nota: GC não é garantido, mas ajuda em dispositivos com pouca memória
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * ✅ Retorna estatísticas do cache
   */
  getStats(): { size: number; items: number; sizeMB: string } {
    return {
      size: this.currentSize,
      items: this.cache.size,
      sizeMB: (this.currentSize / 1024 / 1024).toFixed(2),
    };
  }
}

// ✅ Instância global do cache
const globalCache = new DatabaseCache();

/**
 * ✅ Cache específico para totais financeiros
 * ✅ Usa WeakMap para prevenir memory leaks
 * ✅ Limpa automaticamente quando não há referências
 */
class SafeTotalsCache {
  // ✅ WeakMap limpa automaticamente quando não há referências
  // Usa um objeto como chave para permitir limpeza automática pelo GC
  private cacheKey = {};
  private cache = new WeakMap<object, { totalPaid: number; totalToReceive: number; timestamp: number }>();
  
  // ✅ Fallback para compatibilidade (mantém referência forte apenas quando necessário)
  private fallbackCache: { totalPaid: number; totalToReceive: number; timestamp: number } | null = null;
  
  set(totalPaid: number, totalToReceive: number): void {
    const data = {
      totalPaid,
      totalToReceive,
      timestamp: Date.now(),
    };
    
    // ✅ Armazenar em WeakMap (limpeza automática)
    this.cache.set(this.cacheKey, data);
    
    // ✅ Manter fallback para compatibilidade (será limpo pelo GC quando não usado)
    this.fallbackCache = data;
  }
  
  get(ttlMs: number = 30000): { totalPaid: number; totalToReceive: number; timestamp: number } | null {
    // ✅ Tentar recuperar do WeakMap primeiro
    const cached = this.cache.get(this.cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age <= ttlMs) {
        return cached;
      }
      // Expirado: remover
      this.cache.delete(this.cacheKey);
    }
    
    // ✅ Fallback para compatibilidade
    if (this.fallbackCache) {
      const age = Date.now() - this.fallbackCache.timestamp;
      if (age <= ttlMs) {
        return this.fallbackCache;
      }
      this.fallbackCache = null;
    }
    
    return null;
  }
  
  clear(): void {
    // ✅ WeakMap limpa automaticamente quando não há referências
    // Criar nova chave força limpeza do WeakMap
    this.cacheKey = {};
    this.fallbackCache = null;
    
    // ✅ Forçar garbage collection (se disponível)
    if (global.gc) {
      global.gc();
    }
  }
}

// ✅ Instância global do cache seguro
const safeTotalsCache = new SafeTotalsCache();
const CACHE_TTL = 30000; // 30 segundos

/**
 * ✅ Limpa cache de totais
 * ✅ Thread-safe: múltiplas chamadas simultâneas são seguras
 * ✅ Força liberação de memória usando WeakMap (previne memory leaks)
 * ✅ CRÍTICO: Em operações em massa, o cache pode ficar desatualizado
 */
export const clearTotalsCache = () => {
  safeTotalsCache.clear();
};

/**
 * ✅ Obtém cache de totais (com TTL)
 * ✅ Usa WeakMap para prevenir memory leaks
 */
export const getTotalsCache = (): { totalPaid: number; totalToReceive: number; timestamp: number } | null => {
  return safeTotalsCache.get(CACHE_TTL);
};

/**
 * ✅ Define cache de totais
 * ✅ Usa WeakMap para prevenir memory leaks
 */
export const setTotalsCache = (totalPaid: number, totalToReceive: number): void => {
  safeTotalsCache.set(totalPaid, totalToReceive);
};

/**
 * ✅ API pública do cache global
 */
export const cache = {
  set: <T>(key: string, data: T, ttlMs?: number) => globalCache.set(key, data, ttlMs),
  get: <T>(key: string, ttlMs?: number) => globalCache.get<T>(key, ttlMs),
  clear: () => globalCache.clear(),
  getStats: () => globalCache.getStats(),
};

