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
  Client,
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
  console.log("🔄 Iniciando sincronização automática...");

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
              await updateClient(exists, clientData);
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
  return unsubscribe;
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
 *
 * @param userId - ID do usuário logado
 * @param client - Dados do cliente
 */
export const saveClient = async (userId: string, client: Client): Promise<void> => {
  let clientId = client.id;

  // 1️⃣ Salva no SQLite (imediato, funciona offline)
  // ✅ Esta é a operação crítica - resolve a Promise assim que completar
  if (clientId) {
    await updateClient({ id: clientId } as Client, client);
  } else {
    // ✅ Obtém o ID gerado pelo SQLite
    clientId = await addClient(client);
  }

  console.log("✅ Cliente salvo no SQLite (local)");

  // 2️⃣ Salva no Firestore em BACKGROUND (não bloqueia a UI)
  // ✅ Não espera a confirmação do Firestore - deixa a fila offline do Firebase cuidar
  const docRef = doc(
    collection(doc(collection(db, "users"), userId), "clients"),
    String(clientId)
  );

  // ⚡ Firestore em background: não bloqueia, não falha a Promise
  setDoc(docRef, {
    ...client,
    id: clientId, // ✅ Garante que o ID está presente
    updatedAt: new Date().toISOString(),
  })
    .then(() => {
      console.log("✅ Cliente sincronizado com Firestore");
    })
    .catch((error) => {
      // ⚠️ Erro no Firestore não deve bloquear - a fila offline vai cuidar
      console.log("⏳ Cliente salvo localmente, sincronização será feita quando voltar online");
      // O Firestore tem fila offline automática, então não precisa fazer nada aqui
    });

  // ✅ Promise resolve imediatamente após salvar no SQLite
  // A sincronização com Firestore acontece em background
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