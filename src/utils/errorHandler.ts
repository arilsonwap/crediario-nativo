/**
 * Utilitário para tratamento de erros do Firebase e SQLite
 * Traduz códigos de erro técnicos em mensagens amigáveis ao usuário
 */

interface FirebaseError {
  code?: string;
  message?: string;
}

interface SQLiteError {
  message?: string;
  code?: string;
}

/**
 * Extrai mensagem de erro amigável do Firebase
 */
export function getFirebaseErrorMessage(error: any): string {
  const firebaseError = error as FirebaseError;
  const code = firebaseError?.code || "";
  const message = firebaseError?.message || "";

  // Códigos de erro do Firestore
  switch (code) {
    case "permission-denied":
      return "Você não tem permissão para realizar esta operação. Verifique suas configurações de segurança.";
    
    case "unavailable":
    case "unavailable/network-request-failed":
      return "Serviço temporariamente indisponível. Verifique sua conexão com a internet.";
    
    case "deadline-exceeded":
      return "A operação demorou muito para ser concluída. Tente novamente.";
    
    case "not-found":
      return "Recurso não encontrado no servidor.";
    
    case "already-exists":
      return "Este registro já existe. Tente atualizar em vez de criar.";
    
    case "resource-exhausted":
      return "Limite de operações atingido. Tente novamente mais tarde.";
    
    case "failed-precondition":
      return "Operação não pode ser executada no estado atual.";
    
    case "aborted":
      return "Operação foi cancelada. Tente novamente.";
    
    case "out-of-range":
      return "Valor fora do intervalo permitido.";
    
    case "unimplemented":
      return "Operação não implementada no servidor.";
    
    case "internal":
      return "Erro interno do servidor. Tente novamente mais tarde.";
    
    case "unauthenticated":
      return "Você precisa estar autenticado para realizar esta operação.";
    
    case "cancelled":
      return "Operação foi cancelada.";
    
    default:
      // Se não for um código conhecido, tenta extrair mensagem útil
      if (message) {
        // Remove prefixos técnicos do Firebase
        const cleanMessage = message
          .replace(/^\[.*?\]\s*/, "") // Remove [FirebaseError: ...]
          .replace(/^Error:\s*/i, "") // Remove "Error: " no início
          .trim();
        
        if (cleanMessage) {
          return cleanMessage;
        }
      }
      
      return "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.";
  }
}

/**
 * Extrai mensagem de erro amigável do SQLite
 */
export function getSQLiteErrorMessage(error: any): string {
  const sqliteError = error as SQLiteError;
  const message = sqliteError?.message || "";
  const code = sqliteError?.code || "";

  // Códigos de erro comuns do SQLite
  if (code === "SQLITE_CONSTRAINT" || message.includes("UNIQUE constraint")) {
    return "Este registro já existe no banco de dados local.";
  }
  
  if (code === "SQLITE_FULL" || message.includes("database is full")) {
    return "O banco de dados local está cheio. Limpe dados antigos e tente novamente.";
  }
  
  if (code === "SQLITE_BUSY" || message.includes("database is locked")) {
    return "O banco de dados está em uso. Aguarde um momento e tente novamente.";
  }
  
  if (code === "SQLITE_CORRUPT" || message.includes("database disk image is malformed")) {
    return "O banco de dados local está corrompido. Faça um backup e reinstale o aplicativo.";
  }
  
  if (message.includes("no such table")) {
    return "Tabela não encontrada. O banco de dados pode estar desatualizado.";
  }
  
  if (message.includes("no such column")) {
    return "Coluna não encontrada. O banco de dados pode estar desatualizado.";
  }
  
  if (message.includes("syntax error")) {
    return "Erro de sintaxe no banco de dados. Contate o suporte.";
  }
  
  // Se não for um erro conhecido, tenta extrair mensagem útil
  if (message) {
    const cleanMessage = message
      .replace(/^Error:\s*/i, "")
      .trim();
    
    if (cleanMessage) {
      return cleanMessage;
    }
  }
  
  return "Erro ao salvar no banco de dados local. Tente novamente.";
}

/**
 * Detecta o tipo de erro e retorna mensagem amigável
 */
export function getErrorMessage(error: any): string {
  if (!error) {
    return "Ocorreu um erro desconhecido. Tente novamente.";
  }

  // Verifica se é erro do Firebase
  if (error?.code && typeof error.code === "string") {
    // Códigos do Firebase geralmente começam com "auth/" ou são códigos do Firestore
    if (error.code.startsWith("auth/") || error.code.startsWith("storage/")) {
      // Erros de autenticação ou storage - já tratados em outros lugares
      return getFirebaseErrorMessage(error);
    }
    
    // Códigos do Firestore
    if (
      error.code === "permission-denied" ||
      error.code === "unavailable" ||
      error.code === "deadline-exceeded" ||
      error.code === "not-found" ||
      error.code === "already-exists" ||
      error.code === "resource-exhausted" ||
      error.code === "failed-precondition" ||
      error.code === "aborted" ||
      error.code === "out-of-range" ||
      error.code === "unimplemented" ||
      error.code === "internal" ||
      error.code === "unauthenticated" ||
      error.code === "cancelled"
    ) {
      return getFirebaseErrorMessage(error);
    }
  }

  // Verifica se é erro do SQLite
  if (
    error?.code?.startsWith("SQLITE_") ||
    error?.message?.includes("database") ||
    error?.message?.includes("SQLite") ||
    error?.message?.includes("constraint") ||
    error?.message?.includes("table") ||
    error?.message?.includes("column")
  ) {
    return getSQLiteErrorMessage(error);
  }

  // Verifica se é erro de rede
  if (
    error?.message?.includes("network") ||
    error?.message?.includes("Network") ||
    error?.message?.includes("fetch") ||
    error?.message?.includes("timeout") ||
    error?.message?.includes("ECONNREFUSED") ||
    error?.message?.includes("ENOTFOUND")
  ) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }

  // Se for um objeto Error padrão, usa a mensagem
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Se tiver uma propriedade message, usa ela
  if (error?.message && typeof error.message === "string") {
    return error.message;
  }

  // Fallback genérico
  return "Ocorreu um erro ao processar sua solicitação. Tente novamente.";
}

/**
 * Formata mensagem de erro para exibição em Alert ou Toast
 */
export function formatErrorForDisplay(error: any, context?: string): string {
  const baseMessage = getErrorMessage(error);
  
  if (context) {
    return `${context}\n\n${baseMessage}`;
  }
  
  return baseMessage;
}




