import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { generateBackup } from "../database/backup";


export default function ExportPDFButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      await generateBackup(); // Função que cria o PDF (você já tem isso no projeto)
      Alert.alert("✅ Sucesso", "Relatório exportado em PDF com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      Alert.alert("❌ Erro", "Não foi possível gerar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleExport}
      disabled={loading}
      style={styles.container}
    >
      <LinearGradient
        colors={["#5856D6", "#3B2EB1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="document-text-outline" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.text}>Exportar Relatório PDF</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* ========================= Styles ========================= */
const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
