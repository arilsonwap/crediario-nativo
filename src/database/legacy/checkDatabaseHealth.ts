/**
 * ✅ Verifica saúde do banco de dados
 * ⚠️ DEPRECATED: Esta função será migrada para services/healthService.ts
 */

import { waitForInitDB } from "../core/schema";

export async function checkDatabaseHealth(): Promise<{
  integrity: boolean;
  size: number; // MB
  clientCount: number;
  paymentCount: number;
  logCount: number;
  sqliteVersion: string;
}> {
  try {
    await waitForInitDB();
    
    const { getOne } = await import("../core/queries");
    const { getTotalClients } = await import("../repositories/clientsRepo");
    
    // ✅ Verificar integridade do banco
    const integrityResult = await getOne<{ integrity_check: string }>("PRAGMA integrity_check");
    const integrity = integrityResult?.integrity_check === "ok";
    
    // ✅ Obter tamanho do arquivo do banco
    const pageSizeResult = await getOne<{ page_size: number }>("PRAGMA page_size");
    const pageCountResult = await getOne<{ page_count: number }>("PRAGMA page_count");
    const pageSize = pageSizeResult?.page_size ?? 4096;
    const pageCount = pageCountResult?.page_count ?? 0;
    const size = (pageSize * pageCount) / (1024 * 1024); // MB
    
    // ✅ Contar registros
    const clientCount = await getTotalClients();
    const paymentCountResult = await getOne<{ total: number }>("SELECT COUNT(*) as total FROM payments", []);
    const logCountResult = await getOne<{ total: number }>("SELECT COUNT(*) as total FROM logs", []);
    
    // ✅ Obter versão do SQLite
    const sqliteVersionResult = await getOne<{ version: string }>("SELECT sqlite_version() as version", []);
    
    return {
      integrity,
      size: parseFloat(size.toFixed(2)),
      clientCount,
      paymentCount: paymentCountResult?.total ?? 0,
      logCount: logCountResult?.total ?? 0,
      sqliteVersion: sqliteVersionResult?.version ?? "unknown",
    };
  } catch (error) {
    console.error("❌ Erro ao verificar saúde do banco:", error);
    throw error;
  }
}
