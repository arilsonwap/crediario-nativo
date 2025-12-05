import type { Client } from "../database/db";

export const getUpcomingCharges = jest.fn(
  (): Promise<Client[]> =>
    Promise.resolve([
      {
        id: 1,
        name: "Cliente Teste",
        telefone: "11999999999",
        value: 100,
        bairro: null,
        numero: null,
        referencia: null,
        next_charge: "2025-01-15",
        paid: 0,
      },
    ])
);

export const getAllClients = jest.fn(() => getUpcomingCharges());
export const getClientById = jest.fn(() => Promise.resolve(null));
export const searchClients = jest.fn(() => Promise.resolve([]));




