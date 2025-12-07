/**
 * 📦 Módulo principal do banco de dados
 * Re-exporta todas as funções e tipos dos módulos especializados
 * 
 * ⚠️ IMPORTANTE: Este arquivo mantém compatibilidade com imports existentes
 * Exemplo: import { getAllClients } from "../database/db" continua funcionando
 * 
 * ✅ Estrutura modular:
 * - core/ (connection, transactions, queries, schema, mappers)
 * - migrations/ (V2, V3)
 * - repositories/ (clients, payments, logs, bairros, ruas)
 * - services/ (search, reports, backup)
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
} from "./core/schema";

// Migrações
export { fixDatabaseStructure } from "./migrations";

// Clientes
export {
  addClient,
  deleteClient,
  getAllClients,
  getClientsPage,
  getTotalClients,
  getAllClientsFull,
  getClientById,
  getClientsUpdatedSince,
  getUpcomingCharges,
  getClientsByRua,
  getClientesPrioritariosHoje,
} from "./repositories/clientsRepo";

// Pagamentos
export {
  addPayment,
  marcarClienteAusente,
  getPaymentsByClient,
  deletePayment,
} from "./repositories/paymentsRepo";

// Logs
export {
  addLog,
  addLogAndGet,
  getLogsByClient,
} from "./repositories/logsRepo";

// Bairros
export {
  addBairro,
  getAllBairros,
  getBairroById,
  updateBairro,
  deleteBairro,
} from "./repositories/bairroRepo";

// Ruas
export {
  addRua,
  getAllRuas,
  getRuasByBairro,
  getRuaById,
  updateRua,
  deleteRua,
} from "./repositories/ruaRepo";

// Busca
export {
  getClientsBySearch,
  searchClients,
} from "./services/searchService";

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
} from "./services/reportsService";

// Backup
export {
  createBackup,
} from "./services/backupService";

// ⚠️ NOTA: Funções complexas ainda estão no db.ts original
// Estas serão migradas gradualmente. Por enquanto, re-exportamos do db.ts
export {
  updateClient,
  getClientsByDate,
  getClientesAgrupadosPorRua,
  atualizarOrdemCliente,
  normalizarOrdem,
  checkDatabaseHealth,
} from "./db";




