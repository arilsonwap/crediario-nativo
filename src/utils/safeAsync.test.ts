/**
 * ✅ Testes básicos para função safe()
 * Opcional - estrutura de testes para validação
 */

import { safe, safeSync } from "./safeAsync";

describe("safe()", () => {
  it("deve retornar valor quando função assíncrona é bem-sucedida", async () => {
    const result = await safe(
      async () => Promise.resolve(42),
      0,
      { errorLabel: "test", logPrefix: "Test" }
    );
    expect(result).toBe(42);
  });

  it("deve retornar valor padrão quando função assíncrona falha", async () => {
    const result = await safe(
      async () => Promise.reject(new Error("Erro")),
      0,
      { errorLabel: "test", logPrefix: "Test" }
    );
    expect(result).toBe(0);
  });

  it("deve retornar valor quando função síncrona é bem-sucedida", async () => {
    const result = await safe(
      () => 42,
      0,
      { errorLabel: "test", logPrefix: "Test" }
    );
    expect(result).toBe(42);
  });
});

describe("safeSync()", () => {
  it("deve retornar valor quando função é bem-sucedida", () => {
    const result = safeSync(
      () => 42,
      0,
      { errorLabel: "test", logPrefix: "Test" }
    );
    expect(result).toBe(42);
  });

  it("deve retornar valor padrão quando função falha", () => {
    const result = safeSync(
      () => {
        throw new Error("Erro");
      },
      0,
      { errorLabel: "test", logPrefix: "Test" }
    );
    expect(result).toBe(0);
  });
});

