/**
 * ✅ Testes para ClientsByDateScreen
 * 
 * Para executar: npm test ClientsByDateScreen.test.tsx
 */

import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import ClientsByDateScreen from "../screens/ClientsByDateScreen";
import { getUpcomingCharges } from "../database/db";

// Mock do hook
jest.mock("../hooks/useClientsByDate", () => ({
  useClientsByDate: jest.fn(() => ({
    clients: [
      {
        id: 1,
        name: "Cliente Teste",
        telefone: "11999999999",
        value: 100,
        next_charge: "15/01/2025",
      },
    ],
    loading: false,
    refreshing: false,
    error: null,
    loadClients: jest.fn(),
  })),
}));

// Mock de navegação
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {
    date: "15/01/2025",
  },
};

describe("ClientsByDateScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar a tela corretamente", () => {
    const { getByText } = render(
      <ClientsByDateScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText("Vencimentos: 15/01/2025")).toBeTruthy();
  });

  it("deve exibir lista de clientes quando carregado", async () => {
    const { findByText } = render(
      <ClientsByDateScreen route={mockRoute} navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(findByText("Cliente Teste")).toBeTruthy();
    });
  });

  it("deve configurar o header corretamente", () => {
    render(<ClientsByDateScreen route={mockRoute} navigation={mockNavigation} />);

    expect(mockNavigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerTitle: "Vencimentos: 15/01/2025",
      })
    );
  });
});




