import { z } from "zod";

export const ClientSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, "Nome obrigatório"),
  value: z.number().min(0).optional(),
  bairro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  referencia: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  next_charge: z.string().nullable().optional(),
  paid: z.number().min(0).optional(),
});

export type ValidatedClient = z.infer<typeof ClientSchema>;

/**
 * Valida um cliente individual
 */
export const validateClient = (client: unknown): client is ValidatedClient => {
  try {
    ClientSchema.parse(client);
    return true;
  } catch {
    return false;
  }
};

/**
 * Filtra e valida um array de clientes
 */
export const validateClients = (clients: unknown[]): ValidatedClient[] => {
  return clients.filter(validateClient) as ValidatedClient[];
};



