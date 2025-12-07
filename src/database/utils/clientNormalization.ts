/**
 * 🔧 Funções auxiliares para normalização de dados de clientes
 * Quebra funções grandes em funções menores e testáveis
 */

// ✅ Quebrar dependência circular: importar diretamente das funções básicas
// Em vez de importar de ../utils (que importa este arquivo)
import { normalizeDateToISO } from "./dateParsers";
import type { Client } from "../types";

// ✅ Funções básicas locais (evita dependência circular)
function sanitizeString(input: string | null | undefined, maxLength: number = 500): string {
  if (!input) return "";
  return String(input)
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, "");
}

function toCentavos(reais: number): number {
  return Math.round(reais * 100);
}

function formatDateTimeIso(date?: Date): string {
  if (!date) {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 19) + "Z";
  }
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19) + "Z";
}

/**
 * ✅ Sanitiza campos de string do cliente
 */
export function sanitizeClientStrings(client: Partial<Client>) {
  return {
    name: sanitizeString(client.name, 200),
    bairro: sanitizeString(client.bairro, 100),
    numero: sanitizeString(client.numero, 50),
    referencia: sanitizeString(client.referencia, 200),
    telefone: sanitizeString(client.telefone, 20),
    observacoes: sanitizeString(client.observacoes, 2000), // ✅ CRÍTICO: Limitar a 2000 caracteres
  };
}

/**
 * ✅ Normaliza e valida valores monetários
 */
export function normalizeMonetaryValues(client: Partial<Client>) {
  const value_cents = toCentavos(client.value ?? 0);
  const paid_cents = toCentavos(client.paid ?? 0);
  
  // ✅ Validação robusta
  if (isNaN(value_cents) || value_cents < 0) {
    throw new Error(`Valor inválido: ${client.value}. Deve ser um número >= 0.`);
  }
  
  if (isNaN(paid_cents) || paid_cents < 0) {
    throw new Error(`Valor pago inválido: ${client.paid}. Deve ser um número >= 0.`);
  }
  
  // ✅ CRÍTICO: Validar que paid_cents não excede value_cents
  if (paid_cents > value_cents) {
    throw new Error(
      `Valor pago (${paid_cents} centavos) não pode exceder valor total (${value_cents} centavos).`
    );
  }
  
  return { value_cents, paid_cents };
}

/**
 * ✅ Normaliza datas do cliente (proximaData e next_charge)
 * CRÍTICO: Se proximaData for fornecido, next_charge deve ser NULL (V3)
 */
export function normalizeClientDates(client: Partial<Client>) {
  const proximaData = client.proximaData ? normalizeDateToISO(client.proximaData) : null;
  const next_charge = proximaData ? null : (client.next_charge ? normalizeDateToISO(client.next_charge) : null);
  
  return { proximaData, next_charge };
}

/**
 * ✅ Normaliza campos parciais para atualização
 * Reutiliza lógica de normalizeClientData mas apenas para campos enviados
 */
export function normalizePartialUpdate(original: Client, partial: Partial<Client>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(partial)) {
    if (key === "id" || value === undefined) continue;
    
    if (key === "value") {
      const value_cents = toCentavos(value as number);
      if (isNaN(value_cents) || value_cents < 0) {
        throw new Error(`Valor inválido: ${value}. Deve ser um número >= 0.`);
      }
      normalized.value_cents = value_cents;
    } else if (key === "paid") {
      const paid_cents = toCentavos(value as number);
      if (isNaN(paid_cents) || paid_cents < 0) {
        throw new Error(`Valor pago inválido: ${value}. Deve ser um número >= 0.`);
      }
      normalized.paid_cents = paid_cents;
    } else if (key === "next_charge") {
      normalized.next_charge = value ? normalizeDateToISO(value as string) : null;
    } else if (key === "proximaData") {
      normalized.proximaData = value ? normalizeDateToISO(value as string) : null;
      normalized.next_charge = null; // Sempre limpar next_charge quando proximaData é atualizada
    } else if (key === "name") {
      normalized.name = sanitizeString(value as string, 200);
    } else if (key === "numero") {
      normalized.numero = value ? sanitizeString(value as string, 50) : null;
    } else if (key === "referencia") {
      normalized.referencia = value ? sanitizeString(value as string, 200) : null;
    } else if (key === "telefone") {
      normalized.telefone = value ? sanitizeString(value as string, 20) : null;
    } else if (key === "observacoes") {
      normalized.observacoes = value ? sanitizeString(value as string, 2000) : null;
    } else if (key === "status") {
      const statusValue = value ? sanitizeString(String(value), 20) : "pendente";
      if (statusValue === "pendente" || statusValue === "quitado") {
        normalized.status = statusValue;
      } else {
        normalized.status = "pendente"; // Default seguro
      }
    } else if (key === "ruaId") {
      normalized.ruaId = value ?? null;
    } else if (key === "ordemVisita") {
      normalized.ordemVisita = value ?? 1;
    } else if (key === "prioritario") {
      normalized.prioritario = value ?? 0;
    }
  }
  
  return normalized;
}

/**
 * ✅ Calcula status do cliente baseado em paid_cents e value_cents
 */
export function computeClientStatus(paidCents: number, valueCents: number): "pendente" | "quitado" {
  if (valueCents > 0 && paidCents >= valueCents) {
    return "quitado";
  }
  return "pendente";
}

/**
 * ✅ Valida e corrige paid_cents > value_cents
 * Retorna valores corrigidos
 */
export function validateAndFixMonetaryValues(
  newValueCents: number | null,
  newPaidCents: number | null,
  originalValue: number,
  originalPaid: number
): { valueCents: number; paidCents: number } {
  const { toCentavos } = require("../utils");
  
  const finalValueCents = newValueCents ?? toCentavos(originalValue ?? 0);
  let finalPaidCents = newPaidCents ?? toCentavos(originalPaid ?? 0);
  
  // ✅ CRÍTICO: Corrigir automaticamente se paid_cents > value_cents
  if (finalPaidCents > finalValueCents) {
    console.warn(
      `⚠️ Valor pago (${finalPaidCents} centavos) excede valor total (${finalValueCents} centavos). ` +
      `Corrigindo automaticamente para ${finalValueCents} centavos.`
    );
    finalPaidCents = finalValueCents;
  }
  
  return { valueCents: finalValueCents, paidCents: finalPaidCents };
}

/**
 * ✅ Constrói campos de atualização a partir de dados normalizados
 */
export function buildUpdateFields(normalized: Record<string, any>): [string, any][] {
  const dbEntries: [string, any][] = [];
  
  for (const [key, value] of Object.entries(normalized)) {
    if (key === "value_cents") {
      dbEntries.push(["value_cents", value]);
    } else if (key === "paid_cents") {
      dbEntries.push(["paid_cents", value]);
    } else if (key === "next_charge") {
      dbEntries.push(["next_charge", value]);
    } else if (key === "proximaData") {
      dbEntries.push(["proximaData", value]);
    } else if (key === "name") {
      dbEntries.push(["name", value]);
    } else if (key === "numero") {
      dbEntries.push(["numero", value]);
    } else if (key === "referencia") {
      dbEntries.push(["referencia", value]);
    } else if (key === "telefone") {
      dbEntries.push(["telefone", value]);
    } else if (key === "observacoes") {
      dbEntries.push(["observacoes", value]);
    } else if (key === "status") {
      dbEntries.push(["status", value]);
    } else if (key === "ruaId") {
      dbEntries.push(["ruaId", value]);
    } else if (key === "ordemVisita") {
      dbEntries.push(["ordemVisita", value]);
    } else if (key === "prioritario") {
      dbEntries.push(["prioritario", value]);
    }
  }
  
  // ✅ Sempre atualizar updated_at e ultimaVisita
  dbEntries.push(["updated_at", formatDateTimeIso()]);
  dbEntries.push(["ultimaVisita", formatDateTimeIso()]);
  
  return dbEntries;
}

/**
 * ✅ Detecta mudanças entre cliente original e atualizado
 * Retorna array de strings descrevendo as mudanças
 */
export function detectClientChanges(original: Client, updated: Partial<Client>): string[] {
  const changes: string[] = [];
  
  const fieldLabels: Record<string, string> = {
    name: "Nome",
    value: "Valor Total",
    bairro: "Bairro",
    numero: "Número",
    referencia: "Referência",
    telefone: "Telefone",
    next_charge: "Próxima Cobrança",
    paid: "Valor Pago",
  };
  
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === "") return "(vazio)";
    if (key === "value" || key === "paid") {
      return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
    }
    if (key === "next_charge" && value) {
      try {
        const parts = String(value).split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString("pt-BR");
          }
        }
      } catch (e) {
        console.warn("Erro ao formatar data:", value, e);
      }
      return String(value);
    }
    return String(value);
  };
  
  for (const [key, newValue] of Object.entries(updated)) {
    if (key === "id") continue;
    
    const originalValue = (original as any)[key];
    const normalizedNew = typeof newValue === "string" && newValue.trim() === "" ? null : newValue;
    const normalizedOriginal = typeof originalValue === "string" && originalValue?.trim() === "" ? null : originalValue;
    
    // Comparação considerando valores monetários com tolerância
    if (key === "value" || key === "paid") {
      const diff = Math.abs((normalizedNew as number) - (normalizedOriginal || 0));
      if (diff > 0.01) {
        changes.push(
          `${fieldLabels[key]}: ${formatValue(key, normalizedOriginal)} → ${formatValue(key, normalizedNew)}`
        );
      }
    } else if (normalizedNew !== normalizedOriginal) {
      changes.push(
        `${fieldLabels[key]}: ${formatValue(key, normalizedOriginal)} → ${formatValue(key, normalizedNew)}`
      );
    }
  }
  
  return changes;
}

/**
 * ✅ Cria descrição de log a partir das mudanças detectadas
 * Trunca se exceder limite máximo
 */
export function buildLogDescription(changes: string[], fromFirestore: boolean, maxLength: number = 300): string {
  if (fromFirestore) {
    return "Dados do cliente atualizados na nuvem";
  }
  
  if (changes.length > 0) {
    let description = `📝 Dados atualizados:\n${changes.join("\n")}`;
    if (description.length > maxLength) {
      description = description.slice(0, maxLength) + "...";
    }
    return description;
  }
  
  return "📝 Dados do cliente atualizados.";
}

