/**
 * 🔄 Mappers (DB → API)
 * Converte dados do banco (centavos) para formato da API (reais)
 */

import { toReais } from "../utils";
import { ClientDB, PaymentDB, Client, Payment } from "../types";

export function mapClient(row: ClientDB): Client {
  return {
    id: row.id,
    name: row.name,
    value: toReais(row.value_cents),
    bairro: row.bairro,
    numero: row.numero,
    referencia: row.referencia,
    telefone: row.telefone,
    next_charge: row.next_charge,
    paid: toReais(row.paid_cents),
    // ✅ V3: Novos campos
    ruaId: row.ruaId ?? null,
    ordemVisita: row.ordemVisita ?? 1,
    prioritario: row.prioritario ?? 0,
    observacoes: row.observacoes ?? null,
    status: (row.status as "pendente" | "quitado") || null,
    proximaData: row.proximaData ?? null,
  };
}

export function mapPayment(row: PaymentDB): Payment {
  return {
    id: row.id,
    client_id: row.client_id,
    created_at: row.created_at,
    valor: toReais(row.value_cents),
  };
}
