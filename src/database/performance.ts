/**
 * 📊 Monitoramento de Performance
 * 
 * ✅ Adiciona métricas a todas as operações do banco
 * ✅ Detecta operações lentas (>1000ms)
 * ✅ Logging estruturado para análise
 * ✅ Thread-safe para operações simultâneas
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Manter apenas últimas 100 métricas
  private slowThreshold = 1000; // 1 segundo

  /**
   * ✅ Registra métrica de performance
   */
  record(operation: string, duration: number, success: boolean, error?: string): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      error,
    };

    this.metrics.push(metric);

    // ✅ Manter apenas últimas N métricas (evita memory leak)
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // Remove mais antiga
    }

    // ✅ Log operações lentas
    if (duration > this.slowThreshold) {
      console.warn(
        `⚠️ Operação lenta: ${operation}() levou ${duration}ms ` +
        `(limite: ${this.slowThreshold}ms)`
      );
    }

    // ✅ Log erros
    if (!success && error) {
      console.error(
        `❌ ${operation}() falhou após ${duration}ms: ${error}`
      );
    }
  }

  /**
   * ✅ Retorna estatísticas de performance
   */
  getStats(): {
    total: number;
    slow: number;
    errors: number;
    avgDuration: number;
    maxDuration: number;
    operations: Record<string, { count: number; avgDuration: number }>;
  } {
    const slow = this.metrics.filter(m => m.duration > this.slowThreshold).length;
    const errors = this.metrics.filter(m => !m.success).length;
    const total = this.metrics.length;
    const avgDuration = total > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
      : 0;
    const maxDuration = total > 0
      ? Math.max(...this.metrics.map(m => m.duration))
      : 0;

    // ✅ Agrupar por operação
    const operations: Record<string, { count: number; avgDuration: number }> = {};
    this.metrics.forEach(m => {
      if (!operations[m.operation]) {
        operations[m.operation] = { count: 0, avgDuration: 0 };
      }
      operations[m.operation].count++;
      operations[m.operation].avgDuration += m.duration;
    });

    // ✅ Calcular média por operação
    Object.keys(operations).forEach(op => {
      operations[op].avgDuration = operations[op].avgDuration / operations[op].count;
    });

    return {
      total,
      slow,
      errors,
      avgDuration: Math.round(avgDuration),
      maxDuration,
      operations,
    };
  }

  /**
   * ✅ Limpa todas as métricas
   */
  clear(): void {
    this.metrics = [];
  }
}

// ✅ Instância global do monitor
const performanceMonitor = new PerformanceMonitor();

/**
 * ✅ Wrapper para adicionar métricas a qualquer função assíncrona
 * 
 * @param operation - Nome da operação (ex: "addClient", "updateClient")
 * @param fn - Função a ser executada e monitorada
 * @returns Resultado da função
 * 
 * @example
 * ```typescript
 * const id = await withMetrics("addClient", async () => {
 *   return await addClient(client);
 * });
 * ```
 */
export async function withMetrics<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    const result = await fn();
    success = true;
    const duration = Date.now() - startTime;
    performanceMonitor.record(operation, duration, true);
    return result;
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
    const duration = Date.now() - startTime;
    performanceMonitor.record(operation, duration, false, error);
    throw e;
  }
}

/**
 * ✅ Wrapper para adicionar métricas a funções síncronas
 */
export function withMetricsSync<T>(
  operation: string,
  fn: () => T
): T {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    const result = fn();
    success = true;
    const duration = Date.now() - startTime;
    performanceMonitor.record(operation, duration, true);
    return result;
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
    const duration = Date.now() - startTime;
    performanceMonitor.record(operation, duration, false, error);
    throw e;
  }
}

/**
 * ✅ Retorna estatísticas de performance
 */
export const getPerformanceStats = () => performanceMonitor.getStats();

/**
 * ✅ Limpa todas as métricas
 */
export const clearPerformanceMetrics = () => performanceMonitor.clear();




