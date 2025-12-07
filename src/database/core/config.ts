/**
 * ⚙️ Configuração do Banco de Dados
 * Centraliza todas as configurações para facilitar testes e ajustes
 */

import { Platform } from "react-native";

export const DB_CONFIG = {
  name: "crediario.db",
  location: "default" as const,
  timeoutMs: 8000,
  enableWAL: Platform.OS === "android",
  enableIntegrityCheck: __DEV__,
  debug: __DEV__,
  maxRetries: 3,
  enableAutoVacuum: true, // ✅ 1.2 Auto vacuum para evitar crescimento infinito
  enableBackgroundClose: false, // ✅ 2.2 Fechar em background (opcional)
  enableFileLogging: false, // ✅ 3.1 Log em arquivo (opcional)
} as const;
