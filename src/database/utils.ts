/**
 * 🛠️ Utilitários do banco de dados
 */

import type { Client } from "./types";
import {
  sanitizeClientStrings,
  normalizeMonetaryValues,
  normalizeClientDates,
} from "./utils/clientNormalization";

// Re-exportar funções auxiliares
export * from "./utils/clientNormalization";
export * from "./utils/dateParsers";
export * from "./utils/dateHelpers";

// 📅 Formato brasileiro para UI (dd/mm/yyyy)
export const formatDate = (date = new Date()): string => date.toLocaleDateString("pt-BR");

// 📅 Formato ISO completo para armazenamento (yyyy-mm-ddTHH:mm:ss.sssZ)
/**
 * ✅ Retorna data/hora ISO no timezone local (não UTC)
 * ✅ new Date().toISOString() salva horário UTC → no Brasil fica 3–4h deslocado
 * ✅ Esta função corrige o timezone para o horário local
 */
function nowIsoLocal(): string {
  try {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 19) + "Z";
  } catch (error) {
    // ✅ Fallback seguro em caso de erro de timezone
    console.warn("⚠️ Erro ao obter timezone local, usando UTC:", error);
    return new Date().toISOString().slice(0, 19) + "Z";
  }
}

/**
 * ✅ Formata data/hora para ISO string compatível com CHECK constraint
 * ✅ Garante formato: YYYY-MM-DDTHH:mm:ssZ (sem milissegundos)
 * ✅ Compatível com CHECK constraint: GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'
 * ✅ Usa timezone local (não UTC) para evitar deslocamento de 3-4h no Brasil
 */
export const formatDateTimeIso = (date?: Date): string => {
  // ✅ Usar timezone local para evitar deslocamento de 3-4h no Brasil
  if (!date) {
    return nowIsoLocal();
  }
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19) + "Z";
};

// 📅 Formato ISO apenas data (yyyy-mm-dd)
export const formatDateIso = (date = new Date()): string => date.toISOString().slice(0, 10);

// 💰 Conversão de valores monetários (evita problemas de float)
export const toCentavos = (reais: number): number => Math.round(reais * 100); // R$ 15.00 → 1500 centavos
export const toReais = (centavos: number): number => centavos / 100; // 1500 centavos → R$ 15.00

// ✅ Validação de data ISO (yyyy-mm-dd)
export const isValidDateISO = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * ✅ Sanitiza string para uso seguro em queries SQL
 * Remove caracteres perigosos e limita tamanho
 * 
 * @param input - String a ser sanitizada
 * @param maxLength - Tamanho máximo (padrão: 500)
 * @returns String sanitizada e segura
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 500): string {
  if (!input) return "";
  
  return String(input)
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove caracteres de controle
}

/**
 * ✅ Sanitiza string para uso seguro em queries LIKE
 * Escapa caracteres especiais % e _ que podem quebrar resultados
 * 
 * @param input - String a ser sanitizada para LIKE
 * @returns String sanitizada e segura para LIKE com ESCAPE
 */
export function sanitizeForLike(input: string | null | undefined): string {
  if (!input) return "";
  return sanitizeString(input).replace(/([%_\\])/g, "\\$1");
}

/**
 * ✅ Sanitiza array de strings para uso seguro em queries SQL
 */
export function sanitizeStrings(inputs: (string | null | undefined)[], maxLength: number = 500): string[] {
  return inputs.map(input => sanitizeString(input, maxLength));
}

/**
 * ✅ Normaliza data para formato ISO (yyyy-mm-dd)
 * Usa parsers específicos por formato para evitar ambiguidade
 * Re-exporta do módulo de parsers
 */
export { normalizeDateToISO } from "./utils/dateParsers";

/**
 * ✅ Normaliza dados do cliente para inserção/atualização no banco
 * Centraliza sanitização, normalização de datas e conversão de valores
 */

export type NormalizedClientData = {
  name: string;
  value_cents: number;
  bairro: string | null;
  numero: string | null;
  referencia: string | null;
  telefone: string | null;
  next_charge: string | null;
  paid_cents: number;
  ruaId: number | null;
  ordemVisita: number;
  prioritario: number;
  observacoes: string | null;
  status: string;
  proximaData: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeClientData(client: Partial<Client>): NormalizedClientData {
  // ✅ Usar funções auxiliares para modularizar
  // ✅ Sanitizar strings
  const strings = sanitizeClientStrings(client);
  
  // ✅ Normalizar datas
  const dates = normalizeClientDates(client);
  
  // ✅ Normalizar valores monetários
  const { value_cents, paid_cents } = normalizeMonetaryValues(client);
  
  // ✅ Valores padrão
  const status = client.status ?? "pendente";
  const ordemVisita = client.ordemVisita ?? 1;
  const prioritario = client.prioritario ?? 0;
  const created_at = formatDateTimeIso();
  const updated_at = formatDateTimeIso();
  
  return {
    name: strings.name,
    value_cents,
    bairro: strings.bairro || null,
    numero: strings.numero || null,
    referencia: strings.referencia || null,
    telefone: strings.telefone || null,
    next_charge: dates.next_charge,
    paid_cents,
    ruaId: client.ruaId ?? null,
    ordemVisita,
    prioritario,
    observacoes: strings.observacoes || null,
    status,
    proximaData: dates.proximaData,
    created_at,
    updated_at,
  };
}

