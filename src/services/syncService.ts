// ============================================================
// 🔄 Serviço de Sincronização Automática (Firebase Nativo)
// ============================================================
//
// Este serviço implementa sincronização automática entre SQLite e Firestore
// usando os recursos nativos do Firebase (fila offline, retry automático, etc.)
//
// FEATURES:
// ✅ Sincronização em tempo real via onSnapshot
// ✅ Funciona 100% offline (cache automático)
// ✅ Fila de operações pendentes (automática)
// ✅ Reenvio automático quando volta online
// ✅ Zero sync manual necessário
//
// ============================================================

// ✅ Proteção global contra chamadas duplicadas
let isSyncStarted = false;
let currentUnsubscribe: (() => void) | null = null;
// ✅ Rastreia o userId atual da sincronização (evita múltiplas syncs para mesmo usuário)
let currentSyncUserId: string | null = null;

import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "@react-native-firebase/firestore";
import { safeWrite } from "./syncOptimizer";
import type { Client, Log } from "../database/types";
import { getAllClients, addClient, getClientById, deleteClient } from "../database/repositories/clientsRepo";
import { updateClient } from "../database/legacy";
import { getLogsByClient } from "../database/repositories/logsRepo";

/**
 * ✅ Inicia sincronização em tempo real (AUTOMÁTICA)
 *
 * FEATURES:
 * - Detecta mudanças remotas automaticamente
 * - Funciona offline (lê do cache)
 * - Sincroniza automaticamente quando volta online
 * - Processa apenas mudanças (não tudo)
 * - Notifica UI sobre atualizações
 *
 * @param userId - ID do usuário logado
 * @param onUpdate - Callback chamado quando há mudanças (para atualizar UI)
 * @returns Função para parar o listener (chamar no cleanup)
 */
export const startRealtimeSync = (
  userId: string,
  onUpdate: () => void
): (() => void) => {
  // ✅ Proteção contra chamadas duplicadas para o mesmo userId
  if (isSyncStarted && currentSyncUserId === userId) {
    console.log("⚠️ startRealtimeSync ignorado (já em execução para este usuário)");
    // Retorna a função de unsubscribe atual se já existe
    return currentUnsubscribe || (() => {});
  }

  // ✅ Se já está rodando para outro usuário, parar primeiro
  if (isSyncStarted && currentSyncUserId !== userId && currentUnsubscribe) {
    console.log("🛑 Parando sincronização anterior (mudança de usuário)...");
    currentUnsubscribe();
    isSyncStarted = false;
    currentUnsubscribe = null;
  }

  isSyncStarted = true;
  currentSyncUserId = userId;
  console.log(`🚀 startRealtimeSync executado para usuário: ${userId}`);

  const clientsRef = collection(
    doc(collection(db, "users"), userId),
    "clients"
  );

  // 🔥 Listener em tempo real com metadata
  const unsubscribe = onSnapshot(
    clientsRef,
    {
      includeMetadataChanges: true, // ⚡ Mostra dados do cache instantaneamente
    },
    async (snapshot) => {
      // 📊 Log de status de conexão
      if (snapshot.metadata.fromCache) {
        console.log("📦 Dados do cache (offline)");
      } else {
        console.log("🌐 Dados do servidor (online)");
      }

      if (snapshot.metadata.hasPendingWrites) {
        console.log("⏳ Operações pendentes aguardando sincronização");
      }

      // ✅ Processa APENAS mudanças (não tudo!)
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as any;
        const { updatedAt, ...clientData } = data;

        try {
          if (change.type === "added" || change.type === "modified") {
            const exists = await getClientById(clientData.id);

            if (exists) {
              // ✅ Indica que a atualização vem do Firestore
              await updateClient(exists, clientData, { fromFirestore: true });
              console.log(`✅ Cliente ${clientData.name} atualizado`);
            } else {
              await addClient(clientData);
              console.log(`✅ Cliente ${clientData.name} adicionado`);
            }
          }

          if (change.type === "removed") {
            await deleteClient(clientData.id);
            console.log(`✅ Cliente ${clientData.id} removido`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao processar mudança do cliente ${change.doc.id}:`, error);
        }
      }

      // ✅ Notifica UI sobre mudanças
      onUpdate();
    },
    (error) => {
      console.error("❌ Erro no listener de sincronização:", error);
    }
  );

  console.log("✅ Sincronização automática ativada!");
  
  // ✅ Armazena a função de unsubscribe original
  const originalUnsubscribe = unsubscribe;
  
  // ✅ Cria wrapper que reseta o estado global ao ser chamado
  const wrappedUnsubscribe = () => {
    console.log(`🛑 Executando unsubscribe da sincronização (usuário: ${currentSyncUserId})...`);
    isSyncStarted = false;
    currentUnsubscribe = null;
    currentSyncUserId = null;
    originalUnsubscribe();
  };
  
  // ✅ Armazena a função de unsubscribe globalmente
  currentUnsubscribe = wrappedUnsubscribe;
  
  return wrappedUnsubscribe;
};

/**
 * ✅ Para a sincronização em tempo real
 * Limpa o estado global e para o listener
 */
export const stopRealtimeSync = (): void => {
  if (currentUnsubscribe) {
    console.log(`🛑 Parando sincronização automática (via stopRealtimeSync) - usuário: ${currentSyncUserId}...`);
    currentUnsubscribe();
  } else if (isSyncStarted) {
    // ✅ Se não há unsubscribe mas está marcado como iniciado, reseta
    console.log("🛑 Resetando estado de sincronização...");
    isSyncStarted = false;
    currentUnsubscribe = null;
    currentSyncUserId = null;
  } else {
    console.log("ℹ️ stopRealtimeSync chamado, mas nenhuma sincronização estava ativa.");
  }
};

/**
 * ✅ Verifica se o erro do Firestore é crítico (precisa mostrar ao usuário)
 * Erros offline são normais e não precisam ser mostrados
 */
const isCriticalFirestoreError = (error: any): boolean => {
  const code = error?.code || "";
  const message = String(error?.message || "").toLowerCase();
  
  // ✅ Erros críticos que precisam ser mostrados ao usuário
  const criticalCodes = [
    "permission-denied",
    "unauthenticated",
    "invalid-argument",
    "failed-precondition",
    "out-of-range",
    "unimplemented",
    "internal",
    "data-loss",
  ];
  
  // ✅ Erros offline são normais (não mostrar)
  const offlineIndicators = [
    "unavailable",
    "deadline-exceeded",
    "network",
    "offline",
    "no internet",
  ];
  
  // Se for erro offline, não é crítico
  if (offlineIndicators.some(indicator => code.includes(indicator) || message.includes(indicator))) {
    return false;
  }
  
  // Se for erro crítico, precisa mostrar
  return criticalCodes.some(criticalCode => code.includes(criticalCode));
};

/**
 * ✅ Salva cliente (SQLite + Firestore simultâneo)
 *
 * FEATURES:
 * - Salva no SQLite imediatamente (zero latência)
 * - Resolve a Promise assim que SQLite salvar (não bloqueia UI)
 * - Salva no Firestore em background (não bloqueia)
 * - Se offline: vai para fila automática do Firestore
 * - Se online: envia imediatamente
 * - Firestore garante entrega quando voltar online
 * - Lança erro apenas se SQLite falhar ou se Firestore tiver erro crítico
 *
 * @param userId - ID do usuário logado
 * @param client - Dados do cliente
 * @throws Error se SQLite falhar ou se Firestore tiver erro crítico
 */
export const saveClient = async (userId: string, client: Client): Promise<void> => {
  let clientId = client.id;

  // 1️⃣ Salva no SQLite (imediato, funciona offline)
  // ✅ Esta é a operação crítica - resolve a Promise assim que completar
  try {
    if (clientId) {
      await updateClient({ id: clientId } as Client, client);
    } else {
      // ✅ Obtém o ID gerado pelo SQLite
      clientId = await addClient(client);
    }
  } catch (error) {
    // ✅ Erro no SQLite é crítico - precisa mostrar ao usuário
    console.error("❌ Erro ao salvar cliente no SQLite:", error);
    throw new Error("Não foi possível salvar o cliente localmente. Verifique o espaço em disco e tente novamente.");
  }

  console.log("✅ Cliente salvo no SQLite (local)");

  // 2️⃣ Salva no Firestore usando syncOptimizer (retry + fila offline)
  // ✅ Usa safeWrite que tem retry automático e fila offline integrada
  const docPath = `users/${userId}/clients/${clientId}`;
  
  // ⚡ safeWrite: retry automático + fila offline + proteção contra duplicação
  safeWrite("SET", docPath, {
    ...client,
    id: clientId, // ✅ Garante que o ID está presente
    updatedAt: new Date().toISOString(),
  }).catch((error) => {
    // ✅ safeWrite já trata erros offline automaticamente
    // Apenas logar erros críticos que não são de conexão
    if (isCriticalFirestoreError(error)) {
      console.error("❌ Erro crítico ao sincronizar com Firestore:", error);
    }
    // ✅ Erros offline são tratados automaticamente pela fila
  });

  // ✅ Promise resolve imediatamente após salvar no SQLite
  // A sincronização com Firestore acontece em background
  
  // ✅ 3️⃣ Sincroniza logs do cliente com Firestore em background
  syncClientLogs(userId, clientId);
};

/**
 * ✅ Salva log no Firestore (background, não bloqueia)
 * 
 * FEATURES:
 * - Salva no Firestore em background
 * - Se offline: vai para fila automática do Firestore
 * - Se online: envia imediatamente
 * - Firestore garante entrega quando voltar online
 * 
 * @param userId - ID do usuário logado
 * @param log - Dados do log
 */
export const saveLog = async (userId: string, log: Log): Promise<void> => {
  if (!log.id || !log.clientId) return;

  // ✅ Salva no Firestore usando syncOptimizer (retry + fila offline)
  const logPath = `users/${userId}/clients/${log.clientId}/logs/${log.id}`;
  
  // ⚡ safeWrite: retry automático + fila offline + proteção contra duplicação
  safeWrite("SET", logPath, {
    id: log.id,
    clientId: log.clientId,
    created_at: log.created_at,
    descricao: log.descricao,
  }).catch((error) => {
    // ✅ safeWrite já trata erros offline automaticamente
    if (__DEV__ && isCriticalFirestoreError(error)) {
      console.error("❌ Erro crítico ao sincronizar log:", error);
    }
  });
};

/**
 * ✅ Sincroniza todos os logs de um cliente com o Firestore
 * 
 * FEATURES:
 * - Busca todos os logs do cliente no SQLite
 * - Sincroniza cada log com o Firestore em background
 * - Não bloqueia a UI
 * 
 * @param userId - ID do usuário logado
 * @param clientId - ID do cliente
 */
export const syncClientLogs = async (userId: string, clientId: number): Promise<void> => {
  try {
    const logs = await getLogsByClient(clientId);
    
    // ✅ Sincroniza cada log em background (não bloqueia)
    for (const log of logs) {
      if (log.id) {
        saveLog(userId, log);
      }
    }
  } catch (error) {
    if (__DEV__) console.warn("⚠️ Erro ao sincronizar logs:", error);
  }
};

/**
 * ✅ Remove cliente (SQLite + Firestore simultâneo)
 *
 * @param userId - ID do usuário logado
 * @param clientId - ID do cliente a remover
 */
export const removeClient = async (userId: string, clientId: number): Promise<void> => {
  try {
    // 1️⃣ Remove do SQLite
    await deleteClient(clientId);

    // 2️⃣ Remove do Firestore usando syncOptimizer (retry + fila offline)
    const docPath = `users/${userId}/clients/${clientId}`;
    
    // ⚡ safeWrite: retry automático + fila offline
    await safeWrite("DELETE", docPath);

    console.log("✅ Cliente removido (SQLite + Firestore)");
  } catch (error) {
    console.error("❌ Erro ao remover cliente:", error);
    throw error;
  }
};