// ============================================================
// 🔄 Serviço de Sincronização com Firebase Firestore (Web SDK)
// ============================================================
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import {
  getAllClients,
  addClient,
  updateClient,
  getPaymentsByClient,
  Client,
  Payment,
} from "../database/db";

/**
 * Sincroniza todos os clientes locais para o Firestore
 */
export const syncClientsToFirestore = async (
  userId: string
): Promise<void> => {
  try {
    console.log("🔄 Sincronizando clientes para Firestore...");
    const clients = getAllClients();
    const batch = writeBatch(db);

    for (const client of clients) {
      if (!client.id) continue;

      const docRef = doc(db, "users", userId, "clients", String(client.id));
      batch.set(docRef, {
        ...client,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    console.log(`✅ ${clients.length} clientes sincronizados com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao sincronizar clientes:", error);
    throw new Error("Falha ao sincronizar dados.");
  }
};

/**
 * Baixa todos os clientes do Firestore para o banco local
 */
export const syncClientsFromFirestore = async (
  userId: string
): Promise<void> => {
  try {
    console.log("📥 Baixando clientes do Firestore...");
    const clientsRef = collection(db, "users", userId, "clients");
    const snapshot = await getDocs(clientsRef);

    let count = 0;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Client;
      try {
        // Verifica se o cliente já existe localmente
        const localClients = getAllClients();
        const exists = localClients.some((c) => c.id === data.id);

        if (exists && data.id) {
          updateClient({ id: data.id } as Client, data);
        } else {
          addClient(data);
        }
        count++;
      } catch (e) {
        console.warn(`⚠️ Erro ao importar cliente ${docSnap.id}:`, e);
      }
    });

    console.log(`✅ ${count} clientes importados com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao baixar clientes:", error);
    throw new Error("Falha ao baixar dados do Firestore.");
  }
};

/**
 * Sincroniza pagamentos de um cliente específico para o Firestore
 */
export const syncPaymentsToFirestore = async (
  userId: string,
  clientId: number
): Promise<void> => {
  try {
    console.log(`🔄 Sincronizando pagamentos do cliente ${clientId}...`);
    const payments = getPaymentsByClient(clientId);
    const batch = writeBatch(db);

    for (const payment of payments) {
      if (!payment.id) continue;

      const docRef = doc(
        db,
        "users",
        userId,
        "clients",
        String(clientId),
        "payments",
        String(payment.id)
      );

      batch.set(docRef, {
        ...payment,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    console.log(
      `✅ ${payments.length} pagamentos sincronizados com sucesso!`
    );
  } catch (error) {
    console.error("❌ Erro ao sincronizar pagamentos:", error);
    throw new Error("Falha ao sincronizar pagamentos.");
  }
};

/**
 * Sincronização automática em tempo real (listener)
 * Observa mudanças no Firestore e atualiza o banco local
 */
export const startRealtimeSync = (
  userId: string,
  onUpdate: () => void
): (() => void) => {
  console.log("👂 Iniciando sincronização em tempo real...");

  const clientsRef = collection(db, "users", userId, "clients");

  const unsubscribe = onSnapshot(
    clientsRef,
    (snapshot) => {
      console.log("🔔 Mudanças detectadas no Firestore!");

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as Client;

        if (change.type === "added" || change.type === "modified") {
          try {
            const localClients = getAllClients();
            const exists = localClients.some((c) => c.id === data.id);

            if (exists && data.id) {
              updateClient({ id: data.id } as Client, data);
            } else {
              addClient(data);
            }

            console.log(
              `✅ Cliente ${data.name} ${
                change.type === "added" ? "adicionado" : "atualizado"
              }`
            );
          } catch (e) {
            console.warn(`⚠️ Erro ao processar cliente ${change.doc.id}:`, e);
          }
        }
      });

      // Notifica o app sobre as mudanças
      onUpdate();
    },
    (error) => {
      console.error("❌ Erro no listener de sincronização:", error);
    }
  );

  return unsubscribe;
};

/**
 * Sincronização completa (bidireional)
 * Envia dados locais para o Firestore e baixa dados do Firestore
 */
export const fullSync = async (userId: string): Promise<void> => {
  try {
    console.log("🔄 Iniciando sincronização completa...");

    // Envia dados locais para o Firestore
    await syncClientsToFirestore(userId);

    // Baixa dados do Firestore
    await syncClientsFromFirestore(userId);

    console.log("✅ Sincronização completa finalizada!");
  } catch (error) {
    console.error("❌ Erro na sincronização completa:", error);
    throw error;
  }
};
