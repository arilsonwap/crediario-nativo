/**
 * ✅ Atualiza ordem de visita de um cliente
 * ⚠️ DEPRECATED: Esta função será migrada para repositories/ordemRepo.ts
 */

import { withTransactionAsync, txRun, txGetOne } from "../core/transactions";
import { formatDateTimeIso } from "../utils";
import { normalizarOrdem } from "./normalizarOrdem";

export async function atualizarOrdemCliente(
  clienteId: number,
  ruaId: number,
  novaOrdem: number
): Promise<void> {
  if (!clienteId || !ruaId || novaOrdem < 1) {
    throw new Error("Parâmetros inválidos");
  }

  await withTransactionAsync(async (tx) => {
    // ✅ Verificar se o cliente já está na posição desejada
    const atual = await txGetOne<{ ordemVisita: number }>(
      tx,
      "SELECT ordemVisita FROM clients WHERE id = ?",
      [clienteId]
    );

    if (atual?.ordemVisita === novaOrdem) {
      return;
    }

    // ✅ Mover cliente para ordem temporária (9999) antes do shift
    await txRun(tx, "UPDATE clients SET ordemVisita = 9999, updated_at = ? WHERE id = ?", [
      formatDateTimeIso(),
      clienteId,
    ]);

    // ✅ Empurrar todos para baixo (EXCETO o próprio cliente)
    await txRun(
      tx,
      "UPDATE clients SET ordemVisita = ordemVisita + 1, updated_at = ? WHERE ruaId = ? AND ordemVisita >= ? AND id != ?",
      [formatDateTimeIso(), ruaId, novaOrdem, clienteId]
    );

    // ✅ Definir ordem para o cliente
    await txRun(tx, "UPDATE clients SET ordemVisita = ?, updated_at = ? WHERE id = ?", [
      novaOrdem,
      formatDateTimeIso(),
      clienteId,
    ]);
  });
  
  // ✅ Normalizar ordem após shift
  await normalizarOrdem(ruaId);
}
