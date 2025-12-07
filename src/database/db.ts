/**
 * ⚠️ IMPORTANTE: Este arquivo foi modularizado
 * 
 * A estrutura foi dividida em:
 * - core/ (connection.ts, transactions.ts, queries.ts, schema.ts, mappers.ts)
 * - migrations/ (V2.ts, V3.ts, index.ts)
 * - repositories/ (clientsRepo.ts, paymentsRepo.ts, logsRepo.ts, bairroRepo.ts, ruaRepo.ts)
 * - services/ (searchService.ts, reportsService.ts, backupService.ts)
 * 
 * Este arquivo mantém compatibilidade re-exportando todas as funções dos novos módulos.
 * 
 * ⚠️ ATENÇÃO: Funções complexas como updateClient ainda estão neste arquivo
 * para evitar duplicação excessiva. Considere extrair em um arquivo separado se necessário.
 */

// Re-exportar tipos
export * from "./types";

// Re-exportar utilitários
export * from "./utils";

// Re-exportar core
export {
  initDB,
  waitForInitDB,
  optimizeDB,
  ensureDatabaseDirectory,
} from "./core/schema";

// Re-exportar migrations
export { fixDatabaseStructure } from "./migrations";

// Re-exportar repositories
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

export {
  addPayment,
  marcarClienteAusente,
  getPaymentsByClient,
  deletePayment,
} from "./repositories/paymentsRepo";

export {
  addLog,
  addLogAndGet,
  getLogsByClient,
} from "./repositories/logsRepo";

export {
  addBairro,
  getAllBairros,
  getBairroById,
  updateBairro,
  deleteBairro,
} from "./repositories/bairroRepo";

export {
  addRua,
  getAllRuas,
  getRuasByBairro,
  getRuaById,
  updateRua,
  deleteRua,
} from "./repositories/ruaRepo";

// Re-exportar services
export {
  getClientsBySearch,
  searchClients,
} from "./services/searchService";

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

export {
  createBackup,
} from "./services/backupService";

// ⚠️ NOTA: Funções complexas ainda precisam ser migradas
// Por enquanto, estas funções continuam no arquivo db.ts original
// e serão migradas gradualmente conforme necessário
// 
// Funções que ainda precisam ser migradas:
// - updateClient (muito complexa, ~300 linhas)
// - getClientsByDate
// - getClientesAgrupadosPorRua  
// - atualizarOrdemCliente
// - normalizarOrdem
// - checkDatabaseHealth
//
// Para usar essas funções, importe diretamente do arquivo original:
// import { updateClient } from "./db_original";
