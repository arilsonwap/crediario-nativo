/**
 * 📦 Módulo principal do banco de dados
 * Re-exporta todas as funções e tipos dos módulos especializados
 * 
 * ⚠️ IMPORTANTE: Este arquivo mantém compatibilidade com imports existentes
 * Exemplo: import { getAllClients } from "../database/db" continua funcionando
 */

// Tipos
export * from "./types";

// Utilitários
export * from "./utils";

// Core (funções básicas de banco)
export {
  ensureDatabaseDirectory,
  initDB,
  waitForInitDB,
  optimizeDB,
} from "./core";

// Migrações
export { fixDatabaseStructure } from "./migrations";

// Clientes
export {
  addClient,
  updateClient,
  deleteClient,
  getAllClients,
  getClientsPage,
  getClientById,
  searchClients,
  getClientsBySearch,
  getUpcomingCharges,
  getClientsByRua,
  getClientesPrioritariosHoje,
  getClientsByDate,
  getClientesAgrupadosPorRua,
} from "./clients";

// Pagamentos
export {
  addPayment,
  marcarClienteAusente,
  getPaymentsByClient,
  deletePayment,
} from "./payments";

// Logs
export {
  addLog,
  addLogAndGet,
  getLogsByClient,
} from "./logs";

// Bairros
export {
  addBairro,
  getAllBairros,
  getBairroById,
  updateBairro,
  deleteBairro,
} from "./bairros";

// Ruas
export {
  addRua,
  getAllRuas,
  getRuasByBairro,
  getRuaById,
  updateRua,
  deleteRua,
} from "./ruas";

// Ordem de visita
export {
  atualizarOrdemCliente,
  normalizarOrdem,
} from "./ordem";

// Relatórios
export {
  getTotals,
  clearTotalsCache,
  getTotalHoje,
  getTotalMesAtual,
  getTotalMesAnterior,
  getTopClientesMes,
  getCrediariosPorBairro,
  getCrescimentoPercentual,
  createBackup,
} from "./relatorios";


