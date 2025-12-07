/**
 * 🧪 Testes Unitários - Connection
 * 
 * ✅ COBERTURA RECOMENDADA:
 * - Sucesso: banco abre normalmente
 * - Timeout: banco não abre em 8s
 * - Corrupção: banco corrompido é detectado
 * - Reconexão: múltiplas tentativas após falha
 * - Race condition: múltiplas chamadas simultâneas
 * - Edge case: timeout dispara mas promise resolve depois
 */

import { openDatabase, setDatabase, healthCheck, dbDebug } from "../connection";
import type { SQLiteDatabase } from "../connection";

// Mock do SQLite
jest.mock("react-native-sqlite-storage", () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(),
}));

describe("Connection", () => {
  beforeEach(() => {
    // Resetar estado antes de cada teste
    setDatabase(null);
    dbDebug.reset();
  });

  describe("openDatabase", () => {
    it("✅ deve abrir banco com sucesso", async () => {
      const mockDB = {
        executeSql: jest.fn().mockResolvedValue([{ rows: { item: () => ({ health: 1 }) } }]),
        close: jest.fn(),
      } as unknown as SQLiteDatabase;

      const SQLite = require("react-native-sqlite-storage");
      SQLite.openDatabase.mockResolvedValue(mockDB);

      const db = await openDatabase();

      expect(db).toBe(mockDB);
      expect(SQLite.openDatabase).toHaveBeenCalledWith({
        name: "crediario.db",
        location: "default",
      });
    });

    it("⏱️ deve falhar com timeout após 8 segundos", async () => {
      const SQLite = require("react-native-sqlite-storage");
      SQLite.openDatabase.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 10000))
      );

      await expect(openDatabase()).rejects.toThrow("Timeout ao abrir banco de dados");
    }, 10000);

    it("🔄 deve permitir reconexão após falha", async () => {
      const SQLite = require("react-native-sqlite-storage");
      const mockDB = {
        executeSql: jest.fn().mockResolvedValue([{ rows: { item: () => ({ health: 1 }) } }]),
      } as unknown as SQLiteDatabase;

      // Primeira tentativa falha
      SQLite.openDatabase.mockRejectedValueOnce(new Error("Erro de conexão"));

      // Segunda tentativa sucede
      SQLite.openDatabase.mockResolvedValueOnce(mockDB);

      // Primeira chamada deve falhar
      await expect(openDatabase()).rejects.toThrow("Erro de conexão");

      // Segunda chamada deve suceder
      const db = await openDatabase();
      expect(db).toBe(mockDB);
    });

    it("⚡ deve evitar race condition com múltiplas chamadas simultâneas", async () => {
      const SQLite = require("react-native-sqlite-storage");
      const mockDB = {
        executeSql: jest.fn().mockResolvedValue([{ rows: { item: () => ({ health: 1 }) } }]),
      } as unknown as SQLiteDatabase;

      SQLite.openDatabase.mockResolvedValue(mockDB);

      // Chamar openDatabase múltiplas vezes simultaneamente
      const promises = [openDatabase(), openDatabase(), openDatabase()];

      const results = await Promise.all(promises);

      // Todas devem retornar o mesmo banco
      results.forEach((db) => {
        expect(db).toBe(mockDB);
      });

      // SQLite.openDatabase deve ser chamado apenas uma vez
      expect(SQLite.openDatabase).toHaveBeenCalledTimes(1);
    });

    it("🔒 deve descartar conexão que chega após timeout", async () => {
      const SQLite = require("react-native-sqlite-storage");
      const mockDB = {
        executeSql: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as SQLiteDatabase;

      // Simular banco que demora mais que o timeout
      SQLite.openDatabase.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockDB), 9000) // Mais que 8s
          )
      );

      await expect(openDatabase()).rejects.toThrow("Conexão aberta após timeout");

      // Verificar se close foi chamado
      expect(mockDB.close).toHaveBeenCalled();
    });
  });

  describe("healthCheck", () => {
    it("✅ deve retornar true quando banco está saudável", async () => {
      const mockDB = {
        executeSql: jest.fn().mockResolvedValue([
          { rows: { item: () => ({ health: 1 }) } },
        ]),
      } as unknown as SQLiteDatabase;

      setDatabase(mockDB);

      const isHealthy = await healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockDB.executeSql).toHaveBeenCalledWith("SELECT 1 as health");
    });

    it("❌ deve retornar false quando banco não está disponível", async () => {
      setDatabase(null);

      const isHealthy = await healthCheck();

      expect(isHealthy).toBe(false);
    });

    it("❌ deve retornar false quando query falha", async () => {
      const mockDB = {
        executeSql: jest.fn().mockRejectedValue(new Error("Query failed")),
      } as unknown as SQLiteDatabase;

      setDatabase(mockDB);

      const isHealthy = await healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe("dbDebug", () => {
    it("📊 deve retornar status completo da conexão", () => {
      const status = dbDebug.getConnectionStatus();

      expect(status).toHaveProperty("isOpen");
      expect(status).toHaveProperty("hasPendingPromise");
      expect(status).toHaveProperty("connectionClosed");
      expect(status).toHaveProperty("attempts");
      expect(status).toHaveProperty("config");
    });

    it("🔄 deve resetar estado completamente", () => {
      dbDebug.reset();

      const status = dbDebug.getConnectionStatus();
      expect(status.isOpen).toBe(false);
      expect(status.attempts).toBe(0);
    });
  });
});
