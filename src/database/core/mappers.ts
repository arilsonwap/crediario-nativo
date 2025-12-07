/**
 * 🔄 Mappers robustos (DB → API)
 * Converte dados de SQLite (strings, valores brutos) para tipos fortes
 * 
 * ✅ PROTEÇÕES IMPLEMENTADAS:
 * 1. Validação de números (SQLite retorna strings no Android)
 * 2. Normalização de campos opcionais (null, "", undefined)
 * 3. Fallback para números inválidos (NaN → 0)
 * 4. Proteção contra valores negativos (centavos)
 * 5. Padronização de strings (trim, null para vazias)
 * 6. Garantia de ordemVisita ≥ 1
 * 7. Normalização de booleanos (0/1)
 * 8. Validação de status (pendente/quitado)
 * 
 * 🐛 BUGS EVITADOS:
 * 
 * ✅ Crash ao fazer toReais("abc")
 *    → Agora é convertido para fallback seguro (0)
 *    → normalizeInt() valida Number.isFinite() antes de converter
 * 
 * ✅ Nome com espaços e strings vazias
 *    → Ex.: " Maria " → "Maria" (trim automático)
 *    → "" → null (padrão do banco)
 *    → normalizeString() faz trim e valida vazias
 * 
 * ✅ Status inválido vindo do SQLite
 *    → Se vier "0" ou "" não quebra mais
 *    → normalizeStatus() valida apenas "pendente" ou "quitado"
 *    → Retorna null para valores inválidos
 * 
 * ✅ Booleanos confiáveis
 *    → prioritario sempre será 0 ou 1, nunca "1" ou true
 *    → normalizeBool() converte qualquer valor para 0 ou 1
 *    → Compatível com SQLite (não tem boolean nativo)
 * 
 * ✅ Ordem sempre ≥ 1
 *    → Evita app reorganizar visitas errado
 *    → normalizeOrdemVisita() garante Math.max(ordem, 1)
 *    → Fallback padrão de 1 se valor inválido
 * 
 * ✅ Valores monetários negativos
 *    → normalizeCents() usa Math.max(cents, 0)
 *    → Protege contra dados antigos ou incorretos
 *    → Evita cálculos financeiros incorretos
 */

import { toReais } from "../utils";
import { ClientDB, PaymentDB, Client, Payment } from "../types";

// ============================================================================
// ⚙️ CONFIGURAÇÃO DO MAPPER
// ============================================================================

/**
 * ✅ 2.2. Configuração global do mapper
 * Permite ativar/desativar logs ou níveis de validação
 */
export const MapperConfig = {
  warnOnTrimmedString: true,
  warnOnStatusInvalid: true,
  warnOnInvalidDate: true,
  warnOnInvalidBoolean: true,
  warnOnInvalidForeignKey: true,
} as const;

// ============================================================================
// 🛡️ HELPERS DE NORMALIZAÇÃO ROBUSTOS
// ============================================================================

/**
 * ✅ 5. Tipagem mais segura para valores nullable
 */
export type Nullable<T> = T | null;

/**
 * ✅ 1. Unificar verificação de null/undefined/espaço em branco
 * Padroniza verificação em todo o código
 */
function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * ✅ 4. Helper para warnings centralizados com contexto rico
 * Facilita desativar logs no futuro e debug em produção
 */
interface LogContext {
  table?: string;
  rowId?: number;
  campo?: string;
  valorOriginal?: any;
  valorNormalizado?: any;
}

function logWarning(message: string, context?: LogContext | any): void {
  if (__DEV__) {
    console.warn(`⚠️ MAPPER: ${message}`, context || "");
  } else {
    // ✅ Em produção, poderia enviar para serviço de logs (Sentry, etc.)
    // ou salvar em arquivo de log local
  }
}

/**
 * ✅ 2.1. Centralizar warnings de contexto
 * Evita repetição de spread operator
 */
function withField(context: LogContext, campo: string): LogContext {
  return { ...context, campo };
}

/**
 * ✅ Normaliza número com fallback seguro
 * SQLite retorna tudo como string no Android → converte automaticamente
 * Exemplo: "15" (string) → 15 (number)
 * 
 * ✅ 3.1. Proteção contra valores muito altos (overflow)
 */
function normalizeInt(value: any, fallback: number = 0, context?: LogContext): number {
  if (isEmpty(value)) {
    if (context) {
      logWarning("Valor vazio, usando fallback", { ...context, fallback });
    }
    return fallback;
  }
  
  const n = Number(value);
  if (!Number.isFinite(n)) {
    if (context) {
      logWarning("Valor não é número finito", { ...context, valorOriginal: value, fallback });
    }
    return fallback;
  }
  
  // ✅ 3.1. Proteção contra valores muito altos (overflow)
  if (!Number.isSafeInteger(n)) {
    if (context) {
      logWarning("Número fora dos limites seguros", { ...context, valorOriginal: value, fallback });
    }
    return fallback;
  }
  
  return Math.floor(n);
}

/**
 * ✅ Normaliza string com trim e null para vazias
 * Unifica verificação de null/undefined/espaço em branco
 * 
 * ✅ 1.1. Emite warning quando string vem cheia de espaços
 */
function normalizeString(value: any, context?: LogContext): Nullable<string> {
  if (isEmpty(value)) {
    return null;
  }
  
  const original = String(value);
  const str = original.trim();
  
  // ✅ 1.1. Warning quando string vem cheia de espaços
  if (str.length === 0 && original.length > 0 && MapperConfig.warnOnTrimmedString) {
    logWarning("String vazia após trim (era apenas espaços)", { ...context, valorOriginal: original });
  }
  
  // ✅ 3.2. Sanitização de campos que podem causar crash em UI
  // Normaliza emojis e caracteres inválidos
  if (str.length > 0) {
    try {
      const safeStr = str.normalize("NFC");
      return safeStr;
    } catch (error) {
      logWarning("Erro ao normalizar string", { ...context, valorOriginal: str, error });
      return str; // ✅ Fallback: retornar string original se normalização falhar
    }
  }
  
  return null;
}

/**
 * ✅ Helper para calcular dias no mês
 * 
 * ✅ 3. Parâmetro renomeado para deixar claro que é 1-12 (não 0-11)
 * month1to12: 1 = Janeiro, 12 = Dezembro
 */
function daysInMonth(month1to12: number, year: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/**
 * ✅ 2. Valida se é uma data ISO 8601 válida
 * Aceita: "2024-01-01T00:00:00.000Z", "2024-01-01"
 * Rejeita: "data inválida", "01/01/2024"
 * 
 * ✅ 1.8. Valida datas reais (não aceita 2024-02-31)
 */
function normalizeISO8601(value: any, context?: LogContext): Nullable<string> {
  const str = normalizeString(value, context);
  if (!str) return null;
  
  // ✅ Regex simples para ISO 8601
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;
  
  if (isoRegex.test(str)) {
    // ✅ Extrair data (sem hora se houver)
    const datePart = str.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    
    // ✅ 1.8. Validar se data realmente existe (não aceita 2024-02-31)
    if (d > daysInMonth(m, y)) {
      if (MapperConfig.warnOnInvalidDate && context) {
        logWarning("Data inexistente (dia inválido para o mês)", { ...context, valorOriginal: str, datePart });
      }
      return null;
    }
    
    // ✅ Tenta criar objeto Date para validação adicional
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return str;
    }
  }
  
  if (MapperConfig.warnOnInvalidDate && context) {
    logWarning("Data em formato inválido", { ...context, valorOriginal: str });
  }
  return null;
}

/**
 * ✅ 3. Helper para fallback de datas
 * Centraliza lógica de fallback e warnings
 */
function normalizeDateWithFallback(value: any, fallback: string, context?: LogContext): string {
  const normalized = normalizeISO8601(value, context);
  if (!normalized) {
    logWarning("Data ausente ou inválida, usando fallback", { ...context, fallback });
    return fallback;
  }
  return normalized;
}

/**
 * ✅ Normaliza data (pode retornar null)
 * Usa validação ISO 8601
 */
function normalizeDate(value: any, context?: LogContext): string | null {
  return normalizeISO8601(value, context);
}

/**
 * ✅ Normaliza booleano (0 ou 1)
 * SQLite não tem boolean → aceita "0"/"1" (string) ou 0/1 (number)
 * 
 * ✅ 1.2. Detecta valores inesperados e emite warning
 */
function normalizeBool(value: any, context?: LogContext): 0 | 1 {
  // ✅ Valores explícitos true/false
  if (value === true || value === "true") return 1;
  if (value === false || value === "false") return 0;
  
  // ✅ Valores numéricos padrão
  if (value == 1) return 1;
  if (value == 0) return 0;
  
  // ✅ Valores inesperados: emitir warning
  if (MapperConfig.warnOnInvalidBoolean && context) {
    logWarning("Boolean inválido normalizado para 0", { ...context, valorOriginal: value });
  }
  
  return 0;
}

/**
 * ✅ Normaliza status com validação
 * 
 * ✅ 1.3. Emite warning quando status inválido é detectado
 * ✅ 1. Converte maiúsculas/minúsculas (case-insensitive)
 * Previne problemas de versão antiga do banco, importações CSV, inputs manuais
 */
function normalizeStatus(v: any, context?: LogContext): Nullable<"pendente" | "quitado"> {
  // ✅ Validação case-insensitive
  if (typeof v === "string") {
    const lower = v.toLowerCase().trim();
    if (lower === "pendente" || lower === "quitado") {
      return lower as "pendente" | "quitado";
    }
  }
  
  // ✅ Validação exata (para compatibilidade)
  if (v === "pendente" || v === "quitado") {
    return v;
  }
  
  // ✅ 1.3. Warning para valores inválidos
  if (v != null && v !== "" && MapperConfig.warnOnStatusInvalid && context) {
    logWarning("Status inválido", { ...context, valorOriginal: v });
  }
  
  return null;
}

/**
 * ✅ 1. Safe toReais com fallback para valor zero
 * Protege contra erros na conversão de centavos para reais
 * 
 * ✅ 1.9. Captura erros de tipos incorretos
 */
function safeToReais(cents: number, context?: LogContext): number {
  // ✅ 1.9. Validar tipo antes de converter
  if (!Number.isFinite(cents)) {
    logWarning("Centavos não é número finito, usando 0", { ...context, cents });
    cents = 0;
  }
  
  try {
    return toReais(cents);
  } catch (error) {
    logWarning("Erro ao converter centavos para reais", { ...context, cents, error });
    return toReais(0); // ✅ Fallback para R$ 0,00
  }
}

/**
 * ✅ Normaliza centavos com proteção contra negativos
 */
function normalizeCents(value: any, fallback: number = 0, context?: LogContext): number {
  const cents = normalizeInt(value, fallback, context);
  return Math.max(cents, 0);
}

/**
 * ✅ Normaliza ordem de visita garantindo ≥ 1
 */
function normalizeOrdemVisita(value: any): number {
  const ordem = normalizeInt(value, 1);
  return Math.max(ordem, 1);
}

/**
 * ✅ 3. Sanitização de telefone com validação de DDD brasileiro
 * Remove caracteres não numéricos, mantém +55
 * Ex.: "(11) 98765-4321" → "11987654321"
 * 
 * ✅ 1.4. Valida DDD brasileiro (11-99), bloqueia números repetidos e inválidos
 */
function normalizeTelefone(value: any, context?: LogContext): Nullable<string> {
  const str = normalizeString(value, context);
  if (!str) return null;
  
  // ✅ Remove tudo exceto números e +
  const clean = str.replace(/[^\d+]/g, "");
  
  // ✅ Se começar com +, mantém
  if (clean.startsWith("+")) {
    return clean.length > 1 ? clean : null;
  }
  
  // ✅ Remove zeros à esquerda se for apenas números
  const digits = clean.replace(/^0+/, "");
  
  // ✅ 1.4. Validações de telefone brasileiro
  if (digits.length < 10) {
    if (context) {
      logWarning("Telefone muito curto (mínimo 10 dígitos)", { ...context, valorOriginal: str, valorNormalizado: digits });
    }
    return null;
  }
  
  // ✅ 1.4. Validar DDD brasileiro (11-99)
  if (digits.length >= 2) {
    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) {
      if (context) {
        logWarning("DDD inválido (deve ser entre 11-99)", { ...context, valorOriginal: str, ddd });
      }
      return null;
    }
  }
  
  // ✅ 1.4. Bloquear números repetidos (11111111111)
  if (/^(\d)\1{9,}$/.test(digits)) {
    if (context) {
      logWarning("Telefone com números repetidos (inválido)", { ...context, valorOriginal: str });
    }
    return null;
  }
  
  // ✅ 1.4. Bloquear telefones óbvios inválidos (00000000000)
  if (/^0+$/.test(digits)) {
    if (context) {
      logWarning("Telefone apenas com zeros (inválido)", { ...context, valorOriginal: str });
    }
    return null;
  }
  
  return digits;
}

/**
 * ✅ 5. Valida ID de relacionamento
 * Verifica se o ID é válido (para uso futuro com verificações assíncronas)
 * 
 * ✅ 1.5. Melhorado: warning quando ID inexistente quebra integridade
 */
function validateForeignKey(id: number | null, tableName: string, context?: LogContext): boolean {
  if (id === null) return true; // ✅ Relação opcional
  
  // ✅ Validação básica: ID deve ser positivo
  if (id <= 0) {
    if (MapperConfig.warnOnInvalidForeignKey && context) {
      logWarning("ID de relacionamento inválido (≤ 0)", { ...context, tableName, id });
    }
    return false;
  }
  
  // ✅ Em produção, poderia verificar em cache
  // ou deixar para o banco de dados validar com FOREIGN KEY constraint
  
  return true;
}

/**
 * ✅ Normaliza ID opcional (pode ser null)
 * 
 * ✅ 2. Loga quando valor é negativo (ajuda na auditoria do banco)
 */
function normalizeOptionalId(value: any, context?: LogContext): Nullable<number> {
  if (isEmpty(value)) {
    return null;
  }
  const id = normalizeInt(value, 0, context);
  
  // ✅ 2. Logar quando valor é negativo ou zero
  if (id <= 0 && MapperConfig.warnOnInvalidForeignKey && context) {
    logWarning("ID opcional recebeu valor <= 0", { ...context, valorOriginal: value, id });
  }
  
  return id > 0 ? id : null;
}

// ============================================================================
// 🔄 MAPEAMENTO DE CLIENTES
// ============================================================================

/**
 * ✅ 7. Validação de row no início do mapper
 * Protege contra undefined, null, schema quebrado, migrações incompletas
 */
function validateRow(row: any, tableName: string): void {
  if (typeof row !== "object" || row == null) {
    throw new Error(`Row inválido recebido pelo mapper (${tableName}): ${typeof row}`);
  }
}

/**
 * ✅ 1.7. Helper para string obrigatória com fallback
 * Logs padronizados quando fallback é usado
 */
function normalizeRequiredString(value: any, fallback: string, context?: LogContext): string {
  const normalized = normalizeString(value, context);
  if (!normalized) {
    if (context) {
      logWarning("String obrigatória ausente, usando fallback", { ...context, fallback });
    }
    return fallback;
  }
  return normalized;
}

/**
 * ✅ Mapeia cliente do banco para formato da API
 * Converte centavos → reais, normaliza strings, valida tipos
 */
export function mapClient(row: ClientDB): Client {
  // ✅ 7. Validação de row no início
  validateRow(row, "clients");
  
  const context: LogContext = { table: "clients", rowId: normalizeInt(row.id) };
  
  // ✅ 4.1. Evitar recriar context: helper field()
  const field = (campo: string) => withField(context, campo);
  
  const valueCents = normalizeCents(row.value_cents, 0, field("value_cents"));
  const paidCents = normalizeCents(row.paid_cents, 0, field("paid_cents"));
  
  const ruaId = normalizeOptionalId(row.ruaId, field("ruaId"));
  
  // ✅ 5. Validar ID de relacionamento
  const ruaIdValidated = ruaId && validateForeignKey(ruaId, "ruas", field("ruaId")) 
    ? ruaId 
    : null;
  
  return {
    id: normalizeInt(row.id, 0, context),
    
    // ✅ 1.7. Helper para string obrigatória
    name: normalizeRequiredString(row.name, "Sem nome", field("name")),
    
    // ✅ 1. Safe toReais com fallback
    value: safeToReais(valueCents, field("value")),
    paid: safeToReais(paidCents, field("paid")),
    
    bairro: normalizeString(row.bairro, field("bairro")),
    numero: normalizeString(row.numero, field("numero")),
    referencia: normalizeString(row.referencia, field("referencia")),
    
    // ✅ 3. Sanitização de telefone com validação DDD
    telefone: normalizeTelefone(row.telefone, field("telefone")),
    
    // ✅ 2. Validação ISO 8601 para datas
    next_charge: normalizeDate(row.next_charge, field("next_charge")),
    proximaData: normalizeDate(row.proximaData, field("proximaData")),
    
    ruaId: ruaIdValidated,
    ordemVisita: normalizeOrdemVisita(row.ordemVisita),
    prioritario: normalizeBool(row.prioritario, field("prioritario")),
    observacoes: normalizeString(row.observacoes, field("observacoes")),
    status: normalizeStatus(row.status, field("status")),
  };
}

// ============================================================================
// 🔄 MAPEAMENTO DE PAGAMENTOS
// ============================================================================

/**
 * ✅ Mapeia pagamento do banco para formato da API
 * Converte centavos → reais, normaliza strings, valida tipos
 * 
 * ✅ 5. Consistência total: mesma padronização de Client
 */
export function mapPayment(row: PaymentDB): Payment {
  // ✅ 7. Validação de row no início
  validateRow(row, "payments");
  
  const context: LogContext = { table: "payments", rowId: normalizeInt(row.id) };
  
  // ✅ 4.1. Evitar recriar context: helper field()
  const field = (campo: string) => withField(context, campo);
  
  const valueCents = normalizeCents(row.value_cents, 0, field("value_cents"));
  const fallbackDate = new Date().toISOString();
  const created_at = normalizeDateWithFallback(
    row.created_at, 
    fallbackDate, 
    field("created_at")
  );
  
  // ✅ 5. Validar ID de relacionamento
  const client_id = normalizeInt(row.client_id, 0, field("client_id"));
  if (!validateForeignKey(client_id, "clients", field("client_id"))) {
    logWarning("client_id inválido", { ...context, client_id });
  }
  
  return {
    id: normalizeInt(row.id, 0, context),
    client_id,
    created_at,
    
    // ✅ 1. Safe toReais com fallback
    valor: safeToReais(valueCents, field("valor")),
  };
}
