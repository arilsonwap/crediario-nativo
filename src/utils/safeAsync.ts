/**
 * ✅ Wrapper seguro para funções assíncronas e síncronas
 * Retorna valor padrão em caso de erro, evitando crashes
 * Padroniza logs com prefixo [Reports] ou [DB]
 */

type AsyncFunction<T> = () => Promise<T>;
type SyncFunction<T> = () => T;
type AnyFunction<T> = AsyncFunction<T> | SyncFunction<T>;

type SafeOptions = {
  errorLabel: string;
  logPrefix?: "Reports" | "DB" | string;
};

/**
 * Executa função assíncrona ou síncrona de forma segura
 * Retorna valor padrão em caso de erro
 */
export const safe = async <T,>(
  fn: AnyFunction<T>,
  defaultValue: T,
  options: SafeOptions
): Promise<T> => {
  const { errorLabel, logPrefix = "Reports" } = options;
  
  try {
    const result = fn();
    // Se for Promise, aguarda; caso contrário, retorna diretamente
    return result instanceof Promise ? await result : result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [${logPrefix}] Erro em ${errorLabel}:`, errorMessage);
    return defaultValue;
  }
};

/**
 * Versão síncrona do safe (para funções que não retornam Promise)
 */
export const safeSync = <T,>(
  fn: SyncFunction<T>,
  defaultValue: T,
  options: SafeOptions
): T => {
  const { errorLabel, logPrefix = "Reports" } = options;
  
  try {
    return fn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [${logPrefix}] Erro em ${errorLabel}:`, errorMessage);
    return defaultValue;
  }
};

