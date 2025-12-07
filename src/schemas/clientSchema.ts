import { z } from "zod";

// ✅ Schema mais permissivo para evitar filtrar todos os clientes
export const ClientSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  value: z.number().min(0).optional(),
  bairro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  referencia: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  next_charge: z.string().nullable().optional(),
  paid: z.number().min(0).optional(),
  // ✅ Campos V3 - todos opcionais e nullable
  ruaId: z.union([z.number().int().positive(), z.null(), z.undefined()]).optional(),
  ordemVisita: z.number().int().positive().optional(),
  prioritario: z.union([z.literal(0), z.literal(1), z.number().int().min(0).max(1)]).optional(),
  observacoes: z.string().nullable().optional(),
  status: z.union([z.literal("pendente"), z.literal("quitado"), z.null(), z.undefined()]).optional(),
  proximaData: z.string().nullable().optional(),
}).catchall(z.any()); // ✅ Permite campos extras que não estão no schema

export type ValidatedClient = z.infer<typeof ClientSchema>;

/**
 * Valida um cliente individual
 */
export const validateClient = (client: unknown): client is ValidatedClient => {
  try {
    ClientSchema.parse(client);
    return true;
  } catch (error) {
    // ✅ Log erro de validação em desenvolvimento
    if (__DEV__) {
      console.warn("⚠️ Cliente inválido:", error, client);
    }
    return false;
  }
};

/**
 * Filtra e valida um array de clientes
 * ⚠️ TEMPORÁRIO: Se todos os clientes forem filtrados, retorna os clientes originais sem validação
 * para evitar que a tela fique vazia
 */
export const validateClients = (clients: unknown[]): ValidatedClient[] => {
  const validated = clients.filter(validateClient) as ValidatedClient[];
  
  // ✅ Log se muitos clientes foram filtrados
  if (clients.length > 0 && validated.length === 0) {
    console.error("❌ CRÍTICO: TODOS os clientes foram filtrados na validação!");
    if (__DEV__ && clients.length > 0) {
      console.error("❌ Primeiro cliente (exemplo):", JSON.stringify(clients[0], null, 2));
      // Tentar validar o primeiro cliente para ver o erro
      try {
        ClientSchema.parse(clients[0]);
      } catch (error) {
        console.error("❌ Erro de validação do primeiro cliente:", error);
      }
    }
    // ⚠️ TEMPORÁRIO: Retornar clientes originais se validação falhar completamente
    // Isso evita que a tela fique vazia enquanto investigamos o problema
    console.warn("⚠️ Retornando clientes sem validação para evitar tela vazia");
    return clients as ValidatedClient[];
  } else if (clients.length > validated.length) {
    console.warn(`⚠️ ${clients.length - validated.length} de ${clients.length} clientes foram filtrados na validação`);
  }
  
  return validated;
};






