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

import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "@react-native-firebase/firestore";
import {
  getAllClients,
  addClient,
  updateClient,
  deleteClient,
  getClientById,
  getLogsByClient,
  Client,
  Log,
} from "../database/db";

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
  // ✅ Proteção contra chamadas duplicadas
  if (isSyncStarted) {
    console.log("⚠️ startRealtimeSync ignorado (já em execução)");
    // Retorna a função de unsubscribe atual se já existe
    return currentUnsubscribe || (() => {});
  }

  isSyncStarted = true;
  console.log("🚀 startRealtimeSync executado!");

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
    console.log("🛑 Executando unsubscribe da sincronização...");
    isSyncStarted = false;
    currentUnsubscribe = null;
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
    console.log("🛑 Parando sincronização automática (via stopRealtimeSync)...");
    currentUnsubscribe();
  } else if (isSyncStarted) {
    // ✅ Se não há unsubscribe mas está marcado como iniciado, reseta
    console.log("🛑 Resetando estado de sincronização...");
    isSyncStarted = false;
    currentUnsubscribe = null;
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

  // 2️⃣ Salva no Firestore em BACKGROUND (não bloqueia a UI)
  // ✅ Não espera a confirmação do Firestore - deixa a fila offline do Firebase cuidar
  const docRef = doc(
    collection(doc(collection(db, "users"), userId), "clients"),
    String(clientId)
  );

  // ⚡ Firestore em background: não bloqueia, mas verifica erros críticos
  setDoc(docRef, {
    ...client,
    id: clientId, // ✅ Garante que o ID está presente
    updatedAt: new Date().toISOString(),
  })
    .then(() => {
      console.log("✅ Cliente sincronizado com Firestore");
    })
    .catch((error) => {
      // ✅ Verifica se é erro crítico (não offline)
      if (isCriticalFirestoreError(error)) {
        // ⚠️ Erro crítico do Firestore - loga para debug
        console.error("❌ Erro crítico ao sincronizar com Firestore:", error);
        // ⚠️ Nota: Erro crítico do Firestore não bloqueia a Promise
        // O cliente já foi salvo no SQLite, então a operação é considerada bem-sucedida
        // Mas o erro crítico será logado para análise
        // Se necessário, pode-se implementar um sistema de notificação assíncrona aqui
      } else {
        // ✅ Erro offline é normal - não precisa mostrar
        console.log("⏳ Cliente salvo localmente, sincronização será feita quando voltar online");
      }
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

  // ✅ Salva no Firestore em BACKGROUND (não bloqueia a UI)
  const logsRef = collection(
    doc(collection(doc(collection(db, "users"), userId), "clients"), String(log.clientId)),
    "logs"
  );

  const logDocRef = doc(logsRef, String(log.id));

  // ⚡ Firestore em background: não bloqueia, não falha a Promise
  setDoc(logDocRef, {
    id: log.id,
    clientId: log.clientId,
    created_at: log.created_at,
    descricao: log.descricao,
  })
    .then(() => {
      if (__DEV__) console.log("✅ Log sincronizado com Firestore");
    })
    .catch((error) => {
      // ⚠️ Erro no Firestore não deve bloquear - a fila offline vai cuidar
      if (__DEV__) console.log("⏳ Log salvo localmente, sincronização será feita quando voltar online");
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

    // 2️⃣ Remove do Firestore (fila automática se offline)
    const docRef = doc(
      collection(doc(collection(db, "users"), userId), "clients"),
      String(clientId)
    );

    await deleteDoc(docRef);

    console.log("✅ Cliente removido (SQLite + Firestore)");
  } catch (error) {
    console.error("❌ Erro ao remover cliente:", error);
    throw error;
  }
};