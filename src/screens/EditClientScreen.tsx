import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { updateClient } from "../database/db";
import { formatCurrency, parseBRL } from "../utils/formatCurrency";

export default function EditClientScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { client } = route.params as any;

  // States
  const [name, setName] = useState(client.name);
  const [value, setValue] = useState(formatCurrency(client.value));
  const [bairro, setBairro] = useState(client.bairro || "");
  const [numero, setNumero] = useState(client.numero || "");
  const [referencia, setReferencia] = useState(client.referencia || "");
  const [telefone, setTelefone] = useState(client.telefone || "");
  const [alterado, setAlterado] = useState(false);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Editar Cliente",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // Handler genérico para marcar como alterado
  const handleChange = (setter: any, text: string) => {
    setter(text);
    setAlterado(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !value.trim()) {
      Alert.alert("Campos obrigatórios", "Nome e valor são obrigatórios.");
      return;
    }

    try {
      const numericValue = parseBRL(value);

      await updateClient({
        id: client.id,
        name: name.trim(),
        value: numericValue,
        bairro: bairro.trim(),
        numero: numero.trim(),
        referencia: referencia.trim(),
        telefone: telefone.trim(),
        next_charge: client.next_charge,
        paid: client.paid,
      });

      Alert.alert("✅ Sucesso", "Cliente atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      Alert.alert("❌ Erro", "Não foi possível atualizar o cliente.");
    }
  };

  const handleGoBack = () => {
    if (alterado) {
      Alert.alert(
        "Descartar alterações?",
        "Você fez mudanças que ainda não foram salvas.",
        [
          { text: "Continuar Editando", style: "cancel" },
          { text: "Descartar", style: "destructive", onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Seção 1: Dados Pessoais */}
        <Text style={styles.sectionTitle}>DADOS PESSOAIS</Text>
        <View style={styles.card}>
          <InputItem
            icon="person-outline"
            label="Nome Completo"
            value={name}
            onChangeText={(t: string) => handleChange(setName, t)}
            placeholder="Ex: Maria Silva"
          />
          <View style={styles.divider} />
          <InputItem
            icon="call-outline"
            label="Telefone / WhatsApp"
            value={telefone}
            onChangeText={(t: string) => handleChange(setTelefone, t)}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />
        </View>

        {/* Seção 2: Financeiro */}
        <Text style={styles.sectionTitle}>FINANCEIRO</Text>
        <View style={styles.card}>
          <InputItem
            icon="cash-outline"
            label="Valor Total (R$)"
            value={value}
            onChangeText={(t: string) => handleChange(setValue, t)}
            placeholder="0,00"
            keyboardType="numeric"
            isCurrency
          />
        </View>

        {/* Seção 3: Endereço */}
        <Text style={styles.sectionTitle}>ENDEREÇO</Text>
        <View style={styles.card}>
          <View style={styles.rowInput}>
            <View style={{ flex: 2, marginRight: 10 }}>
              <InputItem
                icon="map-outline"
                label="Bairro"
                value={bairro}
                onChangeText={(t: string) => handleChange(setBairro, t)}
                placeholder="Ex: Centro"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputItem
                icon="home-outline"
                label="Número"
                value={numero}
                onChangeText={(t: string) => handleChange(setNumero, t)}
                placeholder="Nº"
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.divider} />
          <InputItem
            icon="location-outline"
            label="Ponto de Referência"
            value={referencia}
            onChangeText={(t: string) => handleChange(setReferencia, t)}
            placeholder="Ex: Próximo ao mercado..."
          />
        </View>

        {/* Botões de Ação */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Icon name="checkmark-circle-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveText}>Salvar Alterações</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleGoBack}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🛠 Componente Reutilizável de Input
const InputItem = ({ icon, label, value, onChangeText, placeholder, keyboardType, isCurrency }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputContainer}>
      <Icon name={icon} size={20} color={isCurrency ? "#16A34A" : "#64748B"} />
      <TextInput
        style={[styles.input, isCurrency && styles.currencyText]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        keyboardType={keyboardType || "default"}
      />
    </View>
  </View>
);

/* ===========================================================
   🎨 Estilos
=========================================================== */
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#F1F5F9", // Fundo cinza-azulado
    minHeight: '100%'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  rowInput: {
    flexDirection: 'row',
  },
  
  // Estilos do Input Component
  inputWrapper: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1E293B",
  },
  currencyText: {
    color: "#16A34A",
    fontWeight: "700",
  },

  // Botões
  footer: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#0056b3",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: "#0056b3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  saveText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
});