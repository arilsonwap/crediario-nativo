/**
 * 🔄 Funções legadas complexas
 * Estas funções ainda não foram totalmente migradas para a nova estrutura modular
 * São mantidas aqui para compatibilidade até serem refatoradas
 * 
 * ⚠️ DEPRECATED: Estas funções serão migradas gradualmente
 * Use as novas funções dos repositories quando possível
 * 
 * 📦 ESTRUTURA:
 * Cada função está em seu próprio arquivo para facilitar:
 * - Migração futura
 * - Testes unitários
 * - Refatoração incremental
 * - PRs mais limpos
 */

export { updateClient } from "./updateClient";
export { getClientsByDate } from "./getClientsByDate";
export { getClientesAgrupadosPorRua } from "./getClientesAgrupadosPorRua";
export { atualizarOrdemCliente } from "./atualizarOrdemCliente";
export { normalizarOrdem } from "./normalizarOrdem";
export { checkDatabaseHealth } from "./checkDatabaseHealth";

