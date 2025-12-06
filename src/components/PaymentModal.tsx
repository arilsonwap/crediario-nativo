import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addPayment, Payment } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSave: () => void;
};

export default function PaymentModal({
  visible,
  clientId,
  onClose,
  onSave,
}: Props) {
  const [valor, setValor] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleSave = async () => {
    const amount = parseFloat(valor.replace(",", "."));
    if (!valor || isNaN(amount)) {
      Alert.alert("Atenção", "Digite um valor válido para o pagamento.");
      return;
    }

    try {
      // ✅ Converte clientId de string para number e passa apenas o valor
      await addPayment(Number(clientId), amount);
      onSave();
      onClose();
      Alert.alert("Sucesso", "Pagamento registrado com sucesso!");
      setValor("");
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      Alert.alert("Erro", "Não foi possível registrar o pagamento.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>💸 Registrar Pagamento</Text>

          {/* 💰 Valor */}
          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 150.00"
            keyboardType="numeric"
            value={valor}
            onChangeText={setValor}
          />

          {/* 📅 Data */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString("pt-BR")}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* 🧾 Botões */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.confirm]} onPress={handleSave}>
              <Text style={[styles.buttonText, { color: "#fff" }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ========================= Styles ========================= */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    // sombra leve cross-platform
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#111827",
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  dateButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: "#111",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancel: {
    backgroundColor: "#f3f4f6",
  },
  confirm: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
