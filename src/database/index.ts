/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTE ARQUIVO É O PONTO ÚNICO DE IMPORTAÇÃO DO BANCO DE DADOS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📌 REGRA DE OURO:
 * - Telas e hooks devem importar APENAS daqui
 * - Exemplo: import { getAllClients, addClient } from "../database/db"
 * 
 * ⚠️ IMPORTANTE:
 * - Módulos internos (core, migrations, repositories, services)
 *   NÃO DEVEM importar deste arquivo para evitar dependência circular
 * - Use imports diretos entre módulos internos quando necessário
 * 
 * 📦 ESTRUTURA MODULAR:
 * - core/ (connection, transactions, queries, schema, mappers)
 * - migrations/ (V2, V3, V4, index)
 * - repositories/ (clients, payments, logs, bairros, ruas)
 * - services/ (search, reports, backup, financialCache)
 * - utils/ (dateParsers, dateHelpers, clientNormalization)
 * - legacy/ (funções complexas ainda não migradas)
 * 
 * ⚠️ DEPRECATED:
 * - Funções marcadas como deprecated serão removidas em versões futuras
 * - Use as novas funções dos repositories quando possível
 */

// ============================================================================
// 📌 TIPOS E UTILITÁRIOS
// ============================================================================

export * from "./types";
export * from "./utils";

// ============================================================================
// ⚙️ CORE (Inicialização e Configuração)
// ============================================================================

export {
  initDB,
  waitForInitDB,
  optimizeDB,
  // ⚠️ DEPRECATED: ensureDatabaseDirectory não é mais necessária
  // Mantida apenas para compatibilidade, mas não deve ser usada
  ensureDatabaseDirectory,
} from "./core/schema";

// ============================================================================
// 🧱 MIGRAÇÕES
// ============================================================================

export { fixDatabaseStructure } from "./migrations";

// ============================================================================
// 👥 REPOSITORIES - CLIENTES
// ============================================================================

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

// ============================================================================
// 💵 REPOSITORIES - PAGAMENTOS
// ============================================================================

export {
  addPayment,
  marcarClienteAusente,
  getPaymentsByClient,
  deletePayment,
} from "./repositories/paymentsRepo";

// ============================================================================
// 📜 REPOSITORIES - LOGS
// ============================================================================

export {
  addLog,
  addLogAndGet,
  getLogsByClient,
} from "./repositories/logsRepo";

// ============================================================================
// 🏘️ REPOSITORIES - BAIRROS
// ============================================================================

export {
  addBairro,
  getAllBairros,
  getBairroById,
  updateBairro,
  deleteBairro,
} from "./repositories/bairroRepo";

// ============================================================================
// 🛣️ REPOSITORIES - RUAS
// ============================================================================

export {
  addRua,
  getAllRuas,
  getRuasByBairro,
  getRuaById,
  updateRua,
  deleteRua,
} from "./repositories/ruaRepo";

// ============================================================================
// 🔍 SERVICES - BUSCA
// ============================================================================

export {
  getClientsBySearch,
  // ⚠️ DEPRECATED: searchClients é apenas um alias para getClientsBySearch
  // Mantida para compatibilidade - use getClientsBySearch() em vez disso
  searchClients,
} from "./services/searchService";

// ============================================================================
// 📊 SERVICES - RELATÓRIOS
// ============================================================================

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

// ============================================================================
// 💾 SERVICES - BACKUP
// ============================================================================

export {
  createBackup,
} from "./services/backupService";

// ============================================================================
// 🔄 FUNÇÕES LEGADAS (Compatibilidade)
// ============================================================================
// ⚠️ DEPRECATED: Estas funções ainda não foram totalmente migradas
// São re-exportadas do módulo legacy para manter compatibilidade
// Use as novas funções dos repositories quando possível

export {
  updateClient,
  getClientsByDate,
  getClientesAgrupadosPorRua,
  atualizarOrdemCliente,
  normalizarOrdem,
  checkDatabaseHealth,
} from "./legacy";

// ============================================================================
// 🗑️ REMOÇÕES FUTURAS (versão 2.0)
// ============================================================================
//
// - searchClients() → substituir por getClientsBySearch()
// - ensureDatabaseDirectory() será removida
// - Toda a pasta legacy/ será arquivada
//
// Este bloco serve para facilitar migração futura.
//




