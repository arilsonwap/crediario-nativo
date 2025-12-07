/**
 * 💵 Repositório de Pagamentos
 * Gerencia operações de pagamentos de clientes
 */

import { formatDateTimeIso, toCentavos, toReais, normalizeDateToISO } from "../utils";
import { todayISO, tomorrowISO } from "../utils/dateHelpers";
import { withTransactionAsync, txRun, txGetOne } from "../core/transactions";
import { run, selectMapped, getOne } from "../core/queries";
import { mapPayment } from "../core/mappers";
import { addLog } from "./logsRepo";
// Importação dinâmica para evitar dependência circular
async function clearTotalsCache() {
  try {
    const { clearTotalsCache: clearCache } = await import("../services/reportsService");
    clearCache();
  } catch (e) {
    // Ignorar se reportsService ainda não estiver disponível
    console.warn("⚠️ Não foi possível limpar cache:", e);
  }
}
import type { Payment, PaymentDB, ClientDB } from "../types";

export async function addPayment(
  clientId: number, 
  valor: number,
  options?: { proximaData?: string | null }
): Promise<void> {
  if (!clientId || valor <= 0) throw new Error("Cliente e valor obrigatórios");

  const valorCents = toCentavos(valor);
  const valorRecebido = valor;
  const created_at = formatDateTimeIso();

  // ✅ Normalizar proximaData se fornecida
  let novaProximaData: string | null = null;
  if (options?.proximaData) {
    novaProximaData = normalizeDateToISO(options.proximaData);
  }

  // 🔒 Transação atômica usando tx.executeSql diretamente (elimina deadlocks)
  await withTransactionAsync(async (tx) => {
    // ✅ Busca o cliente DENTRO da transação usando tx diretamente
    const clientDB = await txGetOne<ClientDB>(tx, "SELECT paid_cents, value_cents FROM clients WHERE id = ?", [clientId]);
    
    if (!clientDB) throw new Error("Cliente não encontrado");

    const valorPagoAntes = toReais(clientDB.paid_cents);
    const valorPagoDepois = valorPagoAntes + valorRecebido;
    const valorTotal = toReais(clientDB.value_cents);
    const restante = valorTotal - valorPagoDepois;

    // ✅ Determinar status e proximaData
    let novoStatus: "pendente" | "quitado" = "pendente";
    if (restante <= 0) {
      // ✅ Quitou tudo
      novoStatus = "quitado";
      novaProximaData = null;
    } else {
      // ✅ Pagamento parcial - CRÍTICO: exige proximaData
      novoStatus = "pendente";
      if (!options?.proximaData) {
        throw new Error("Pagamento parcial exige próxima data. Por favor, informe quando será a próxima cobrança.");
      }
    }

    await txRun(tx, "INSERT INTO payments (client_id, created_at, value_cents) VALUES (?, ?, ?)", [
      clientId,
      created_at,
      valorCents,
    ]);

    await txRun(
      tx,
      "UPDATE clients SET paid_cents = paid_cents + ?, status = ?, proximaData = ?, next_charge = NULL, updated_at = ? WHERE id = ?",
      [valorCents, novoStatus, novaProximaData, formatDateTimeIso(), clientId]
    );

    // ✅ Log detalhado mostrando valor antes, valor recebido e valor depois
    await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
      clientId,
      created_at,
      `💵 Pagamento adicionado:\n` +
      `Valor pago antes: R$ ${valorPagoAntes.toFixed(2)}\n` +
      `Valor recebido: R$ ${valorRecebido.toFixed(2)}\n` +
      `Valor pago atual: R$ ${valorPagoDepois.toFixed(2)}\n` +
      `Status: ${novoStatus === "quitado" ? "✅ Quitado" : "⏳ Pendente"}`
    ]);
  });
  
  // ✅ Limpar cache apenas após commit bem-sucedido (value/paid mudaram)
  await clearTotalsCache();
  
  // ⚡ Invalidar cache financeiro
  const { invalidateFinancialCache } = await import("../services/financialCache");
  await invalidateFinancialCache();
}

export async function marcarClienteAusente(clientId: number): Promise<void> {
  if (!clientId) throw new Error("ID do cliente é obrigatório");

  // ✅ Usar helper para data de amanhã
  const proximaData = normalizeDateToISO(tomorrowISO());
  const created_at = formatDateTimeIso();

  await withTransactionAsync(async (tx) => {
    await txRun(
      tx,
      "UPDATE clients SET status = ?, proximaData = ?, next_charge = NULL, updated_at = ? WHERE id = ?",
      ["pendente", proximaData, formatDateTimeIso(), clientId]
    );

    await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
      clientId,
      created_at,
      "🚫 Cliente ausente. Próxima cobrança agendada para amanhã.",
    ]);
  });
}

export const getPaymentsByClient = async (clientId: number): Promise<Payment[]> => {
  if (!clientId) return [];
  return await selectMapped<Payment, PaymentDB>(
    "SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC",
    [clientId],
    mapPayment
  );
};

export async function deletePayment(id: number): Promise<void> {
  if (!id) return;

  try {
    // ✅ Buscar dados ANTES da transação (não afeta atomicidade)
    const paymentDB = await getOne<PaymentDB>("SELECT * FROM payments WHERE id = ?", [id]);
    if (!paymentDB) return;

    const valorCents = paymentDB.value_cents;
    const clientId = paymentDB.client_id;

    await withTransactionAsync(async (tx) => {
      // ✅ Buscar cliente DENTRO da transação
      const clientDB = await txGetOne<ClientDB>(tx, "SELECT paid_cents, value_cents FROM clients WHERE id = ?", [clientId]);
      if (!clientDB) throw new Error("Cliente não encontrado");

      // ✅ Reverter pagamento
      const novoPaidCents = Math.max(0, clientDB.paid_cents - valorCents);
      const novoStatus = novoPaidCents >= clientDB.value_cents ? "quitado" : "pendente";

      await txRun(tx, "DELETE FROM payments WHERE id = ?", [id]);
      await txRun(
        tx,
        "UPDATE clients SET paid_cents = ?, status = ? WHERE id = ?",
        [novoPaidCents, novoStatus, clientId]
      );

      // ✅ Log
      await txRun(tx, "INSERT INTO logs (clientId, created_at, descricao) VALUES (?, ?, ?)", [
        clientId,
        formatDateTimeIso(),
        `🗑️ Pagamento removido: R$ ${toReais(valorCents).toFixed(2)}`,
      ]);
    });

    await clearTotalsCache();
    
    // ⚡ Invalidar cache financeiro
    const { invalidateFinancialCache } = await import("../services/financialCache");
    await invalidateFinancialCache();
  } catch (e) {
    console.error("❌ Erro ao deletar pagamento:", e);
    throw e;
  }
}
