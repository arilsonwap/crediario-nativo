/**
 * Constantes globais de validação para formulários
 * Centraliza todas as regras de validação para facilitar manutenção e reutilização
 */

export const VALIDATION_RULES = {
  // Nome do cliente
  NAME: {
    REQUIRED: true,
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    PATTERN: {
      NO_MULTIPLE_SPACES: /\s{2,}/,
      NO_LEADING_SPACES: /^\s+/,
    },
    MESSAGES: {
      REQUIRED: "Nome é obrigatório",
      MIN_LENGTH: "Nome deve ter pelo menos 3 caracteres",
      MAX_LENGTH: "Nome deve ter no máximo 100 caracteres",
      MULTIPLE_SPACES: "Nome não pode ter espaços múltiplos",
      LEADING_SPACES: "Nome não pode começar com espaço",
    },
  },

  // Telefone
  PHONE: {
    REQUIRED: false, // Opcional
    MIN_DIGITS: 10, // DDD (2) + número (8 ou 9)
    MAX_DIGITS: 11, // DDD (2) + número (9)
    MESSAGES: {
      MIN_DIGITS: "Telefone deve ter pelo menos 10 dígitos (com DDD)",
      MAX_DIGITS: "Telefone deve ter no máximo 11 dígitos",
      INVALID_FORMAT: "Telefone inválido",
    },
  },

  // Valor (inteiro)
  VALUE: {
    REQUIRED: true,
    MIN_VALUE: 1,
    MAX_VALUE: 999999999, // Limite prático
    IS_INTEGER: true,
    MESSAGES: {
      REQUIRED: "Valor é obrigatório",
      MIN_VALUE: "Valor deve ser maior que zero",
      MAX_VALUE: "Valor excede o limite máximo",
      INVALID_NUMBER: "Valor deve ser um número inteiro maior que zero",
      NOT_INTEGER: "Valor deve ser um número inteiro (sem centavos)",
    },
  },

  // Bairro
  BAIRRO: {
    REQUIRED: false, // Opcional
    MAX_LENGTH: 50,
    MESSAGES: {
      MAX_LENGTH: "Bairro deve ter no máximo 50 caracteres",
    },
  },

  // Número (endereço)
  NUMERO: {
    REQUIRED: false, // Opcional
    MAX_LENGTH: 6,
    IS_NUMERIC: true,
    MESSAGES: {
      MAX_LENGTH: "Número deve ter no máximo 6 dígitos",
      NOT_NUMERIC: "Número deve conter apenas dígitos",
    },
  },

  // Referência
  REFERENCIA: {
    REQUIRED: false, // Opcional
    MAX_LENGTH: 100,
    MESSAGES: {
      MAX_LENGTH: "Referência deve ter no máximo 100 caracteres",
    },
  },

  // Data
  DATE: {
    REQUIRED: false, // Opcional
    MIN_DATE: new Date(), // Não pode ser no passado
    MESSAGES: {
      REQUIRED: "Data é obrigatória",
      INVALID_DATE: "Data inválida",
      PAST_DATE: "Data não pode ser no passado",
    },
  },
} as const;

/**
 * Funções auxiliares de validação
 */
export const ValidationHelpers = {
  /**
   * Valida nome do cliente
   */
  validateName: (name: string): string | null => {
    const trimmed = name.trim();
    
    if (VALIDATION_RULES.NAME.REQUIRED && !trimmed) {
      return VALIDATION_RULES.NAME.MESSAGES.REQUIRED;
    }
    
    if (trimmed.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
      return VALIDATION_RULES.NAME.MESSAGES.MIN_LENGTH;
    }
    
    if (trimmed.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
      return VALIDATION_RULES.NAME.MESSAGES.MAX_LENGTH;
    }
    
    if (VALIDATION_RULES.NAME.PATTERN.NO_MULTIPLE_SPACES.test(name)) {
      return VALIDATION_RULES.NAME.MESSAGES.MULTIPLE_SPACES;
    }
    
    if (VALIDATION_RULES.NAME.PATTERN.NO_LEADING_SPACES.test(name)) {
      return VALIDATION_RULES.NAME.MESSAGES.LEADING_SPACES;
    }
    
    return null; // Válido
  },

  /**
   * Valida telefone
   */
  validatePhone: (phone: string): string | null => {
    const trimmed = phone.trim();
    
    // Se não é obrigatório e está vazio, é válido
    if (!VALIDATION_RULES.PHONE.REQUIRED && !trimmed) {
      return null;
    }
    
    if (VALIDATION_RULES.PHONE.REQUIRED && !trimmed) {
      return VALIDATION_RULES.PHONE.MESSAGES.MIN_DIGITS;
    }
    
    const digits = trimmed.replace(/\D/g, "");
    
    if (digits.length < VALIDATION_RULES.PHONE.MIN_DIGITS) {
      return VALIDATION_RULES.PHONE.MESSAGES.MIN_DIGITS;
    }
    
    if (digits.length > VALIDATION_RULES.PHONE.MAX_DIGITS) {
      return VALIDATION_RULES.PHONE.MESSAGES.MAX_DIGITS;
    }
    
    return null; // Válido
  },

  /**
   * Valida valor (inteiro)
   */
  validateValue: (value: string, parseInteger: (v: string) => number): string | null => {
    const trimmed = value.trim();
    
    if (VALIDATION_RULES.VALUE.REQUIRED && !trimmed) {
      return VALIDATION_RULES.VALUE.MESSAGES.REQUIRED;
    }
    
    if (!trimmed) {
      return null; // Se não é obrigatório e está vazio, é válido
    }
    
    const numericValue = parseInteger(trimmed);
    
    if (isNaN(numericValue)) {
      return VALIDATION_RULES.VALUE.MESSAGES.INVALID_NUMBER;
    }
    
    if (VALIDATION_RULES.VALUE.IS_INTEGER && !Number.isInteger(numericValue)) {
      return VALIDATION_RULES.VALUE.MESSAGES.NOT_INTEGER;
    }
    
    if (numericValue < VALIDATION_RULES.VALUE.MIN_VALUE) {
      return VALIDATION_RULES.VALUE.MESSAGES.MIN_VALUE;
    }
    
    if (numericValue > VALIDATION_RULES.VALUE.MAX_VALUE) {
      return VALIDATION_RULES.VALUE.MESSAGES.MAX_VALUE;
    }
    
    return null; // Válido
  },

  /**
   * Valida bairro
   */
  validateBairro: (bairro: string): string | null => {
    const trimmed = bairro.trim();
    
    if (!VALIDATION_RULES.BAIRRO.REQUIRED && !trimmed) {
      return null; // Opcional e vazio = válido
    }
    
    if (trimmed.length > VALIDATION_RULES.BAIRRO.MAX_LENGTH) {
      return VALIDATION_RULES.BAIRRO.MESSAGES.MAX_LENGTH;
    }
    
    return null; // Válido
  },

  /**
   * Valida número (endereço)
   */
  validateNumero: (numero: string): string | null => {
    const trimmed = numero.trim();
    
    if (!VALIDATION_RULES.NUMERO.REQUIRED && !trimmed) {
      return null; // Opcional e vazio = válido
    }
    
    if (trimmed.length > VALIDATION_RULES.NUMERO.MAX_LENGTH) {
      return VALIDATION_RULES.NUMERO.MESSAGES.MAX_LENGTH;
    }
    
    if (VALIDATION_RULES.NUMERO.IS_NUMERIC && trimmed && !/^\d+$/.test(trimmed)) {
      return VALIDATION_RULES.NUMERO.MESSAGES.NOT_NUMERIC;
    }
    
    return null; // Válido
  },

  /**
   * Valida referência
   */
  validateReferencia: (referencia: string): string | null => {
    const trimmed = referencia.trim();
    
    if (!VALIDATION_RULES.REFERENCIA.REQUIRED && !trimmed) {
      return null; // Opcional e vazio = válido
    }
    
    if (trimmed.length > VALIDATION_RULES.REFERENCIA.MAX_LENGTH) {
      return VALIDATION_RULES.REFERENCIA.MESSAGES.MAX_LENGTH;
    }
    
    return null; // Válido
  },

  /**
   * Valida data
   */
  validateDate: (date: Date | null): string | null => {
    if (!VALIDATION_RULES.DATE.REQUIRED && !date) {
      return null; // Opcional e vazio = válido
    }
    
    if (VALIDATION_RULES.DATE.REQUIRED && !date) {
      return VALIDATION_RULES.DATE.MESSAGES.REQUIRED;
    }
    
    if (date && isNaN(date.getTime())) {
      return VALIDATION_RULES.DATE.MESSAGES.INVALID_DATE;
    }
    
    if (date && date < VALIDATION_RULES.DATE.MIN_DATE) {
      return VALIDATION_RULES.DATE.MESSAGES.PAST_DATE;
    }
    
    return null; // Válido
  },
};



