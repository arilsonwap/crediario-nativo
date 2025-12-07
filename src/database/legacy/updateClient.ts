/**
 * ✅ Atualiza cliente (versão completa com todas as validações)
 * ⚠️ DEPRECATED: Esta função será migrada para repositories/clientsRepo.ts
 * Por enquanto, mantida aqui para compatibilidade
 */

import { waitForInitDB } from "../core/schema";
import { getClientById } from "../repositories/clientsRepo";
import { run } from "../core/queries";
import { buildLogDescription, detectClientChanges } from "../utils/clientNormalization";
import {
  normalizePartialUpdate,
  validateAndFixMonetaryValues,
  computeClientStatus,
  buildUpdateFields,
} from "../utils/clientNormalization";
import { addLog } from "../repositories/logsRepo";
import { clearTotalsCache } from "../services/reportsService";
import { invalidateFinancialCache } from "../services/financialCache";
import type { Client } from "../types";

export async function updateClient(
  client: Client,
  newData?: Partial<Client>,
  options?: { fromFirestore?: boolean }
): Promise<void> {
  await waitForInitDB();
  
  if (!client.id) return;

  // ✅ Se newData existe, atualizar APENAS os campos enviados (parcial)
  const data = newData ?? client;
  const entries = Object.entries(data).filter(([k, v]) => v !== undefined && k !== "id");

  if (entries.length === 0) return;
  
  const fromFirestore = options?.fromFirestore ?? false;

  // 🔍 Obter dados originais para comparar mudanças
  const originalClient = await getClientById(client.id);
  if (!originalClient) return;

  // ✅ Usar funções auxiliares para normalização
  const normalized = normalizePartialUpdate(originalClient, data);
  
  // ✅ Normalizar APENAS os campos que estão sendo atualizados
  let newValueCents: number | null = null;
  let newPaidCents: number | null = null;
  
  for (const [key, value] of Object.entries(normalized)) {
    if (key === "value_cents") {
      newValueCents = value;
    } else if (key === "paid_cents") {
      newPaidCents = value;
    }
  }

  // ✅ Validar e corrigir valores monetários
  const { valueCents, paidCents } = validateAndFixMonetaryValues(
    newValueCents,
    newPaidCents,
    originalClient.value ?? 0,
    originalClient.paid ?? 0
  );

  // ✅ Recalcular status automaticamente
  const dbEntries = buildUpdateFields(normalized);
  
  // ✅ Atualizar valores monetários se necessário
  const valueIndex = dbEntries.findIndex(([key]) => key === "value_cents");
  const paidIndex = dbEntries.findIndex(([key]) => key === "paid_cents");
  
  if (valueIndex >= 0) {
    dbEntries[valueIndex] = ["value_cents", valueCents];
  } else if (newValueCents !== null) {
    dbEntries.push(["value_cents", valueCents]);
  }
  
  if (paidIndex >= 0) {
    dbEntries[paidIndex] = ["paid_cents", paidCents];
  } else if (newPaidCents !== null) {
    dbEntries.push(["paid_cents", paidCents]);
  }

  // ✅ Recalcular status automaticamente quando paid_cents >= value_cents
  const newStatus = computeClientStatus(paidCents, valueCents);
  const statusIndex = dbEntries.findIndex(([key]) => key === "status");
  if (statusIndex >= 0) {
    dbEntries[statusIndex] = ["status", newStatus];
  } else {
    dbEntries.push(["status", newStatus]);
  }
  
  // ✅ Limpar proximaData quando quitado
  if (newStatus === "quitado") {
    const proximaDataIndex = dbEntries.findIndex(([key]) => key === "proximaData");
    if (proximaDataIndex >= 0) {
      dbEntries[proximaDataIndex] = ["proximaData", null];
    } else {
      dbEntries.push(["proximaData", null]);
    }
  }

  const fields = dbEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = dbEntries.map(([, value]) => value);

  await run(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, client.id]);

  // 📝 Criar log detalhado com as mudanças
  const changes = detectClientChanges(originalClient, data);
  const logDescription = buildLogDescription(changes, fromFirestore);
  
  await addLog(client.id, logDescription).catch(e => 
    console.warn("⚠️ Log falhou:", e)
  );

  // Invalida cache se alterou 'value' ou 'paid'
  if (data.value !== undefined || data.paid !== undefined) {
    clearTotalsCache();
    await invalidateFinancialCache();
  }
}

