/**
 * 🛣️ Repositório de Ruas
 * Gerencia operações CRUD de ruas
 */

import { sanitizeString } from "../utils";
import { runAndGetId, getOne, getAll, run } from "../core/queries";
import type { Rua } from "../types";

export async function addRua(nome: string, bairroId: number): Promise<number> {
  if (!nome || !nome.trim()) throw new Error("Nome da rua é obrigatório");
  if (!bairroId) throw new Error("Bairro é obrigatório");
  
  // ✅ Sanitizar string antes de inserir
  const id = await runAndGetId(
    "INSERT INTO ruas (nome, bairroId) VALUES (?, ?)",
    [sanitizeString(nome, 100), bairroId]
  );
  
  return id;
}

export async function getAllRuas(): Promise<Rua[]> {
  return await getAll<Rua>("SELECT * FROM ruas ORDER BY nome ASC", []);
}

export async function getRuasByBairro(bairroId: number): Promise<Rua[]> {
  if (!bairroId) return [];
  return await getAll<Rua>("SELECT * FROM ruas WHERE bairroId = ? ORDER BY nome ASC", [bairroId]);
}

export async function getRuaById(id: number): Promise<Rua | null> {
  if (!id) return null;
  return await getOne<Rua>("SELECT * FROM ruas WHERE id = ?", [id]);
}

export async function updateRua(id: number, nome: string, bairroId: number): Promise<void> {
  if (!id || !nome || !nome.trim()) throw new Error("ID e nome são obrigatórios");
  if (!bairroId) throw new Error("Bairro é obrigatório");
  
  // ✅ Sanitizar string antes de atualizar
  await run("UPDATE ruas SET nome = ?, bairroId = ? WHERE id = ?", [sanitizeString(nome, 100), bairroId, id]);
}

export async function deleteRua(id: number): Promise<void> {
  if (!id) return;
  
  // ✅ ON DELETE SET NULL: clientes com ruaId = id terão ruaId = NULL
  await run("DELETE FROM ruas WHERE id = ?", [id]);
}

