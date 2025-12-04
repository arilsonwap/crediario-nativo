import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type BackupEntry = {
  type: "local" | "cloud";
  timestamp: number;
};

/**
 * 🎣 Hook para gerenciar histórico de backups
 * Centraliza lógica de carregamento e salvamento do histórico
 */
export function useBackupHistory() {
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [lastBackup, setLastBackup] = useState<BackupEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Salva histórico no storage
  const saveBackupHistory = useCallback(async (entry: BackupEntry) => {
    try {
      const current = await AsyncStorage.getItem("backup_history");
      // ✅ Tratamento seguro de JSON.parse - evita crash se storage estiver corrompido
      let list: BackupEntry[] = [];
      try {
        list = current ? JSON.parse(current) : [];
        // Valida se é um array válido
        if (!Array.isArray(list)) {
          list = [];
        }
      } catch {
        // Se JSON estiver corrompido, começa com array vazio
        list = [];
      }
      const updated = [entry, ...list].slice(0, 10); // Mantém os últimos 10
      await AsyncStorage.setItem("backup_history", JSON.stringify(updated));
      setHistory(updated);
      setLastBackup(entry);
    } catch (e) {
      console.error("Erro ao salvar histórico de backup:", e);
    }
  }, []);

  // Carrega histórico e último backup
  const loadBackupHistory = useCallback(async () => {
    try {
      setLoading(true);
      const json = await AsyncStorage.getItem("backup_history");
      // ✅ Tratamento seguro de JSON.parse - evita crash se storage estiver corrompido
      let list: BackupEntry[] = [];
      try {
        list = json ? JSON.parse(json) : [];
        // Valida se é um array válido
        if (!Array.isArray(list)) {
          list = [];
        }
      } catch {
        // Se JSON estiver corrompido, começa com array vazio
        list = [];
      }
      setHistory(list);
      if (list.length > 0) {
        setLastBackup(list[0]);
      } else {
        setLastBackup(null);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico de backup:", e);
      // Garante que sempre há um estado válido
      setHistory([]);
      setLastBackup(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega histórico na montagem
  useEffect(() => {
    loadBackupHistory();
  }, [loadBackupHistory]);

  return {
    history,
    lastBackup,
    loading,
    saveBackupHistory,
    loadBackupHistory,
  };
}

