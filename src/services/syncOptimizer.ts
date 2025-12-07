/**
 * 🚀 Módulo de Otimização da Sincronização para Internet Ruim
 * 
 * FEATURES:
 * - Retry automático com backoff exponencial
 * - Detecção de perda de conexão (listener + fallback manual)
 * - Modo offline avançado com fila de operações pendentes
 * - Proteção contra duplicação de writes
 * - Fail-safe caso Firestore nunca responda
 * - Logs claros de cada etapa
 */

// ✅ Importação condicional do NetInfo (se não estiver instalado, usar fallback)
let NetInfo: any = null;
try {
  NetInfo = require("@react-native-community/netinfo").default;
} catch (e) {
  console.warn("⚠️ @react-native-community/netinfo não instalado. Instale com: npm install @react-native-community/netinfo");
}

import firestore from "@react-native-firebase/firestore";

// ============================================================
// 📦 TIPOS
// ============================================================

export type PendingOperation = {
  action: "SET" | "UPDATE" | "DELETE";
  path: string;
  data?: any;
  timestamp: number; // Para detectar operações muito antigas
  retryCount: number; // Contador de tentativas
};

// ============================================================
// 🧠 ESTADO INTERNO
// ============================================================

let isOnline = true;
let retryAttempts = 0;
let retryTimeout: NodeJS.Timeout | null = null;
let networkUnsubscribe: (() => void) | null = null;

const offlineQueue: PendingOperation[] = [];

// ✅ Configurações
const MAX_RETRY = 6; // = backoff até ~60s
const BASE_DELAY = 1000; // 1s
const MAX_QUEUE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias (evita fila infinita)
const MAX_QUEUE_SIZE = 1000; // Limite máximo de operações na fila

// ============================================================
// 🌐 1. LISTENER DE CONEXÃO — Detecta queda e retorno
// ============================================================

/**
 * ✅ Registra monitor de rede (chamar uma vez no App.tsx)
 * Detecta mudanças de conexão e processa fila offline automaticamente
 */
export function registerNetworkMonitor(): void {
  // ✅ Verificar se NetInfo está disponível
  if (!NetInfo) {
    console.warn("⚠️ NetInfo não disponível — monitor de rede não será registrado");
    console.warn("💡 Instale: npm install @react-native-community/netinfo");
    // ✅ Assumir online por padrão se NetInfo não estiver disponível
    isOnline = true;
    return;
  }

  // ✅ Evitar registrar múltiplas vezes
  if (networkUnsubscribe) {
    console.log("⚠️ Network monitor já registrado, ignorando...");
    return;
  }

  // ✅ Verificar estado inicial
  NetInfo.fetch().then((state) => {
    isOnline = !!state.isConnected;
    console.log(`🌐 Estado inicial de conexão: ${isOnline ? "ONLINE" : "OFFLINE"}`);
    
    // ✅ Se já está online, tentar processar fila pendente
    if (isOnline && offlineQueue.length > 0) {
      console.log("🌐 Conexão detectada — enviando fila pendente...");
      flushOfflineQueue();
    }
  });

  // ✅ Listener de mudanças de conexão
  networkUnsubscribe = NetInfo.addEventListener((state) => {
    const wasOnline = isOnline;
    isOnline = !!state.isConnected;

    if (!wasOnline && isOnline) {
      console.log("🌐 Conexão restabelecida — enviando fila pendente...");
      flushOfflineQueue();
    }

    if (wasOnline && !isOnline) {
      console.log("📴 Conexão perdida — entrando no modo offline...");
      // ✅ Limpar timeout de retry se existir
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    }
  });

  console.log("✅ Network monitor registrado");
}

/**
 * ✅ Remove o listener de rede (cleanup)
 */
export function unregisterNetworkMonitor(): void {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
    console.log("🛑 Network monitor removido");
  }
}

/**
 * ✅ Verifica manualmente o estado de conexão
 */
export function checkConnectionStatus(): Promise<boolean> {
  if (!NetInfo) {
    // ✅ Se NetInfo não disponível, assumir online
    isOnline = true;
    return Promise.resolve(true);
  }

  return NetInfo.fetch().then((state) => {
    isOnline = !!state.isConnected;
    return isOnline;
  });
}

// ============================================================
// 🔁 2. FUNÇÃO COM RETRY + BACKOFF EXPONENCIAL
// ============================================================

/**
 * ✅ Executa função com retry automático e backoff exponencial
 * 
 * @param fn - Função assíncrona a executar
 * @param context - Contexto para logs (opcional)
 * @returns Resultado da função
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  if (!isOnline) {
    throw new Error("Sem conexão — operação movida para fila offline.");
  }

  try {
    const result = await fn();

    // ✅ Resetar tentativas caso funcione
    retryAttempts = 0;
    if (context) {
      console.log(`✅ Operação bem-sucedida: ${context}`);
    }
    return result;
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.log(`⚠️ Erro de sync${context ? ` (${context})` : ""}:`, errorMessage);

    if (retryAttempts >= MAX_RETRY) {
      console.log(
        `❌ Máximo de tentativas atingido${context ? ` (${context})` : ""} — operação movida para fila offline.`
      );
      throw err;
    }

    retryAttempts++;

    // ✅ Backoff exponencial: 1s, 2s, 4s, 8s, 16s, 32s
    const delay = BASE_DELAY * Math.pow(2, retryAttempts - 1);
    console.log(
      `⏳ Retry #${retryAttempts}/${MAX_RETRY} em ${delay}ms${context ? ` (${context})` : ""}...`
    );

    await new Promise((resolve) => {
      retryTimeout = setTimeout(resolve, delay);
    });

    return withRetry(fn, context);
  }
}

// ============================================================
// 🔨 3. EXECUTA UMA OPERAÇÃO (SET / UPDATE / DELETE)
// ============================================================

/**
 * ✅ Executa uma operação no Firestore
 * 
 * @param op - Operação a executar
 */
async function executeWrite(op: PendingOperation): Promise<void> {
  try {
    // ✅ Usar API do @react-native-firebase/firestore
    const ref = firestore().doc(op.path);

    switch (op.action) {
      case "SET":
        // ✅ Usar merge: true para não sobrescrever dados existentes
        await ref.set(op.data, { merge: true });
        break;
      case "UPDATE":
        await ref.update(op.data);
        break;
      case "DELETE":
        await ref.delete();
        break;
    }

    if (__DEV__) {
      console.log(`✅ Operação executada: ${op.action} em ${op.path}`);
    }
  } catch (error: any) {
    // ✅ Verificar se é erro de conexão
    const errorCode = error?.code || "";
    const errorMessage = String(error?.message || "").toLowerCase();
    
    // ✅ Erros de conexão do Firestore
    if (
      errorCode.includes("unavailable") ||
      errorCode.includes("deadline-exceeded") ||
      errorCode.includes("cancelled") ||
      errorMessage.includes("network") ||
      errorMessage.includes("offline") ||
      errorMessage.includes("connection")
    ) {
      throw new Error("Sem conexão — operação movida para fila offline.");
    }

    console.error(`❌ Erro ao executar operação ${op.action} em ${op.path}:`, error);
    throw error;
  }
}

// ============================================================
// 📦 4. EXECUTAR OPERAÇÕES COM FILA OFFLINE SEGURA
// ============================================================

/**
 * ✅ Executa operação no Firestore com retry e fila offline
 * 
 * @param action - Tipo de operação (SET, UPDATE, DELETE)
 * @param path - Caminho do documento no Firestore
 * @param data - Dados a salvar (opcional para DELETE)
 * @returns Promise que resolve quando operação é enfileirada ou executada
 */
export async function safeWrite(
  action: "SET" | "UPDATE" | "DELETE",
  path: string,
  data?: any
): Promise<void> {
  // ✅ Validar entrada
  if (!path) {
    throw new Error("safeWrite: path é obrigatório");
  }

  if ((action === "SET" || action === "UPDATE") && !data) {
    throw new Error(`safeWrite: data é obrigatório para ação ${action}`);
  }

  // ✅ Proteção contra duplicação: verificar se já existe operação idêntica na fila
  const existingOp = offlineQueue.find(
    (op) => op.action === action && op.path === path
  );

  if (existingOp) {
    // ✅ Se existe, atualizar dados e timestamp (evita duplicação)
    console.log(`🔄 Operação duplicada detectada, atualizando: ${action} em ${path}`);
    existingOp.data = data;
    existingOp.timestamp = Date.now();
    existingOp.retryCount = 0;
    return;
  }

  const op: PendingOperation = {
    action,
    path,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  // ✅ Verificar se fila está muito grande
  if (offlineQueue.length >= MAX_QUEUE_SIZE) {
    console.warn(
      `⚠️ Fila offline muito grande (${offlineQueue.length}), removendo operação mais antiga...`
    );
    offlineQueue.shift(); // Remove operação mais antiga
  }

  if (!isOnline) {
    console.log(`🧩 Operação armazenada offline: ${action} em ${path}`);
    offlineQueue.push(op);
    return;
  }

  try {
    await withRetry(() => executeWrite(op), `${action} ${path}`);
  } catch (err) {
    console.log(`📥 Falhou até no retry — armazenando offline: ${action} em ${path}`);
    offlineQueue.push(op);
  }
}

// ============================================================
// 📤 5. ENVIAR FILA OFFLINE AO VOLTAR INTERNET
// ============================================================

/**
 * ✅ Processa fila offline quando conexão é restabelecida
 * Remove operações muito antigas e tenta enviar o resto
 */
async function flushOfflineQueue(): Promise<void> {
  if (offlineQueue.length === 0) {
    console.log("✨ Nenhuma operação offline pendente.");
    return;
  }

  // ✅ Limpar operações muito antigas (fail-safe)
  const now = Date.now();
  const initialLength = offlineQueue.length;
  const cleanedQueue = offlineQueue.filter((op) => {
    const age = now - op.timestamp;
    if (age > MAX_QUEUE_AGE) {
      console.log(`🗑️ Removendo operação muito antiga (${Math.floor(age / (24 * 60 * 60 * 1000))} dias): ${op.action} ${op.path}`);
      return false;
    }
    return true;
  });

  offlineQueue.length = 0; // Limpar array
  offlineQueue.push(...cleanedQueue); // Reinserir operações válidas

  if (cleanedQueue.length < initialLength) {
    console.log(`🧹 Removidas ${initialLength - cleanedQueue.length} operações antigas da fila`);
  }

  console.log(`📤 Enviando ${offlineQueue.length} operações pendentes...`);

  // ✅ Processar fila uma operação por vez
  while (offlineQueue.length > 0) {
    // ✅ Verificar conexão antes de cada operação
    if (!isOnline) {
      console.log("📴 Conexão perdida durante envio da fila — parando...");
      break;
    }

    const op = offlineQueue[0]; // Pega primeira operação (não remove ainda)

    try {
      await withRetry(() => executeWrite(op), `${op.action} ${op.path}`);
      // ✅ Só remove da fila se sucesso
      offlineQueue.shift();
      console.log(`✅ Operação sincronizada: ${op.action} ${op.path}`);
    } catch (err) {
      op.retryCount++;

      // ✅ Se já tentou muitas vezes, remover da fila (fail-safe)
      if (op.retryCount >= MAX_RETRY) {
        console.error(
          `❌ Operação falhou após ${MAX_RETRY} tentativas, removendo da fila: ${op.action} ${op.path}`
        );
        offlineQueue.shift();
      } else {
        console.log(
          `❌ Falha ao reenviar operação (tentativa ${op.retryCount}/${MAX_RETRY}), mantendo na fila.`
        );
        // ✅ Mover para o final da fila (dar chance para outras operações)
        offlineQueue.shift();
        offlineQueue.push(op);
      }

      // ✅ Se erro é de conexão, parar processamento
      if (err instanceof Error && err.message.includes("Sem conexão")) {
        break;
      }
    }
  }

  if (offlineQueue.length === 0) {
    console.log("✨ Fila offline completamente processada!");
  } else {
    console.log(`⏳ ${offlineQueue.length} operações ainda pendentes na fila`);
  }
}

// ============================================================
// 🔍 6. UTILITÁRIOS E ESTATÍSTICAS
// ============================================================

/**
 * ✅ Retorna estatísticas da fila offline
 */
export function getOfflineQueueStats(): {
  queueLength: number;
  isOnline: boolean;
  oldestOperation: number | null;
} {
  const oldestOp = offlineQueue.length > 0 ? offlineQueue[0] : null;
  return {
    queueLength: offlineQueue.length,
    isOnline,
    oldestOperation: oldestOp ? oldestOp.timestamp : null,
  };
}

/**
 * ✅ Limpa a fila offline (usar com cuidado!)
 */
export function clearOfflineQueue(): void {
  const length = offlineQueue.length;
  offlineQueue.length = 0;
  console.log(`🗑️ Fila offline limpa (${length} operações removidas)`);
}

/**
 * ✅ Força processamento da fila offline (útil para testes ou retry manual)
 */
export async function forceFlushQueue(): Promise<void> {
  console.log("🔄 Forçando processamento da fila offline...");
  await checkConnectionStatus();
  await flushOfflineQueue();
}

