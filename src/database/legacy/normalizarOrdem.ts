/**
 * ✅ Normaliza ordem de visita (remove buracos)
 * ⚠️ DEPRECATED: Esta função será migrada para repositories/ordemRepo.ts
 */

import { withTransactionAsync, txRun, txGetAll } from "../core/transactions";
import { run } from "../core/queries";
import { formatDateTimeIso } from "../utils";

export async function normalizarOrdem(ruaId: number): Promise<void> {
  if (!ruaId) return;

  try {
    await withTransactionAsync(async (tx) => {
      const clientes = await txGetAll<{ id: number; ordemVisita: number }>(
        tx,
        "SELECT id, ordemVisita FROM clients WHERE ruaId = ? ORDER BY ordemVisita ASC",
        [ruaId]
      );

      for (let i = 0; i < clientes.length; i++) {
        const novaOrdem = i + 1;
        if (clientes[i].ordemVisita !== novaOrdem) {
          await txRun(tx, "UPDATE clients SET ordemVisita = ?, updated_at = ? WHERE id = ?", [
            novaOrdem,
            formatDateTimeIso(),
            clientes[i].id,
          ]);
        }
      }
    });
  } catch (error) {
    console.error("❌ Erro ao normalizar ordem:", error);
    try {
      await run("UPDATE clients SET ordemVisita = 1 WHERE ruaId = ? AND ordemVisita = 9999", [ruaId]);
    } catch (fallbackError) {
      console.error("❌ Erro no fallback de normalizarOrdem:", fallbackError);
    }
  }
}

