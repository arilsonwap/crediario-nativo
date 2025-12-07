/**
 * 🏘️ Repositório de Bairros
 * Gerencia operações CRUD de bairros
 */

import { sanitizeString } from "../utils";
import { runAndGetId, getOne, getAll, run } from "../core/queries";
import type { Bairro } from "../types";

export async function addBairro(nome: string): Promise<number> {
  if (!nome || !nome.trim()) throw new Error("Nome do bairro é obrigatório");
  
  // ✅ Sanitizar string antes de inserir
  const id = await runAndGetId(
    "INSERT INTO bairros (nome) VALUES (?)",
    [sanitizeString(nome, 100)]
  );
  
  return id;
}

export async function getAllBairros(): Promise<Bairro[]> {
  return await getAll<Bairro>("SELECT * FROM bairros ORDER BY nome ASC", []);
}

export async function getBairroById(id: number): Promise<Bairro | null> {
  if (!id) return null;
  return await getOne<Bairro>("SELECT * FROM bairros WHERE id = ?", [id]);
}

export async function updateBairro(id: number, nome: string): Promise<void> {
  if (!id || !nome || !nome.trim()) throw new Error("ID e nome são obrigatórios");
  
  // ✅ Sanitizar string antes de atualizar
  await run("UPDATE bairros SET nome = ? WHERE id = ?", [sanitizeString(nome, 100), id]);
}

export async function deleteBairro(id: number): Promise<void> {
  if (!id) return;
  
  // ✅ ON DELETE CASCADE: ruas e clientes são afetados automaticamente
  await run("DELETE FROM bairros WHERE id = ?", [id]);
}
