import React, { useState, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { formatDateIso } from "../database/db";
import { parseBRL, maskBRL } from "../utils/formatCurrency";
import { saveClient } from "../services/syncService";
import { useAuth } from "../contexts/AuthContext";

// Formata apenas para exibir na UI
function formatDateBR(date: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("pt-BR");
}

export default function AddClientScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nextChargeDate, setNextChargeDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Novo Cliente",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !value.trim()) {
      Alert.alert("Atenção", "Os campos Nome e Valor são obrigatórios.");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    // ✅ Validação robusta de telefone
    if (telefone && telefone.replace(/\D/g, "").length < 10) {
      Alert.alert("Telefone inválido", "Insira um telefone com DDD.");
      return;
    }

    // ✅ Validação robusta de valor
    const numericValue = parseBRL(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      Alert.alert("Valor inválido", "O campo valor precisa estar no formato: 100,00");
      return;
    }

    try {
      // ✅ Usa saveClient que salva no SQLite imediatamente (não bloqueia)
      // A sincronização com Firestore acontece em background automaticamente
      await saveClient(user.uid, {
        name: name.trim(),
        value: numericValue,
        bairro: bairro.trim() || null,
        numero: numero.trim() || null,
        referencia: referencia.trim() || null,
        telefone: telefone.trim() || null,
        next_charge: nextChargeDate ? formatDateIso(nextChargeDate) : null,
      });

      // ✅ Sucesso imediato - cliente salvo localmente
      // Sincronização com nuvem acontece em background
      Alert.alert("✅ Sucesso", "Cliente adicionado com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      Alert.alert("Erro", "Falha ao adicionar cliente.");
    }
  }, [name, value, bairro, numero, referencia, telefone, nextChargeDate, user, navigation]);

  const onChangeDate = (_event: any, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) {
      setNextChargeDate(selected);
    }
  };

  const generateRandomClient = useCallback(() => {
    const names = ["João Silva", "Maria Souza", "Ana Pereira", "Carlos Lopes", "Bruno Martins"];
    const bairros = ["Centro", "Jardim América", "Boa Vista", "Vila Nova", "Santa Cruz"];
    const referencias = ["Próximo ao mercado", "Ao lado da escola", "Em frente à farmácia"];

    setName(names[Math.floor(Math.random() * names.length)]);
    setValue((Math.random() * 990 + 100).toFixed(2).replace(".", ","));
    setBairro(bairros[Math.floor(Math.random() * bairros.length)]);
    setNumero(String(Math.floor(Math.random() * 9999 + 1)));
    setReferencia(referencias[Math.floor(Math.random() * referencias.length)]);
    setTelefone("(99) 99999-9999");

    const today = new Date();
    const random = new Date(today);
    random.setDate(today.getDate() + Math.floor(Math.random() * 30 + 1));
    setNextChargeDate(random);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#F1F5F9" }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Seção 1: Dados Pessoais */}
        <Text style={styles.sectionTitle}>DADOS PESSOAIS</Text>
        <View style={styles.card}>
          <InputItem 
            icon="person-outline" 
            placeholder="Nome do cliente" 
            value={name} 
            onChangeText={setName} 
          />
          <View style={styles.divider} />
          <InputItem 
            icon="call-outline" 
            placeholder="Telefone / WhatsApp" 
            value={telefone} 
            onChangeText={setTelefone} 
            keyboardType="phone-pad"
          />
        </View>

        {/* Seção 2: Financeiro */}
        <Text style={styles.sectionTitle}>FINANCEIRO</Text>
        <View style={styles.card}>
          <InputItem 
            icon="cash-outline" 
            placeholder="Valor Total (R$)" 
            value={value} 
            onChangeText={(txt) => setValue(maskBRL(txt))} 
            keyboardType="numeric"
            isCurrency
          />
          <View style={styles.divider} />
          
          {/* Date Picker Customizado */}
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateTouchable}>
            <View style={styles.rowCenter}>
              <Icon name="calendar-outline" size={20} color="#0056b3" />
              <Text style={[styles.dateText, !nextChargeDate && styles.placeholderText]}>
                {nextChargeDate ? formatDateBR(nextChargeDate) : "Data da próxima cobrança"}
              </Text>
            </View>
            <Icon name="chevron-down" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Seção 3: Endereço */}
        <Text style={styles.sectionTitle}>ENDEREÇO</Text>
        <View style={styles.card}>
          <View style={styles.rowInput}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <InputItem 
                icon="map-outline" 
                placeholder="Bairro" 
                value={bairro} 
                onChangeText={setBairro} 
              />
            </View>
            <View style={{ width: 100 }}>
              <InputItem 
                icon="home-outline" 
                placeholder="Nº" 
                value={numero} 
                onChangeText={setNumero} 
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.divider} />
          <InputItem 
            icon="location-outline" 
            placeholder="Ponto de Referência" 
            value={referencia} 
            onChangeText={setReferencia} 
          />
        </View>

        {/* Botões */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
            <Text style={styles.saveText}>Salvar Cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.generateButton} activeOpacity={0.6} onPress={generateRandomClient}>
            <Icon name="dice-outline" size={18} color="#EA580C" style={{ marginRight: 6 }} />
            <Text style={styles.generateText}>Preencher com dados aleatórios</Text>
          </TouchableOpacity>
        </View>

        {/* Componente de Data Oculto/Modal */}
        {showPicker && (
          <DateTimePicker
            value={nextChargeDate ?? new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🛠 Componente Reutilizável de Input
const InputItem = ({ icon, placeholder, value, onChangeText, keyboardType, isCurrency }: any) => (
  <View style={styles.inputContainer}>
    <Icon name={icon} size={20} color={isCurrency ? "#16A34A" : "#64748B"} />
    <TextInput
      style={[styles.input, isCurrency && styles.currencyText]}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || "default"}
    />
  </View>
);

// 🎨 Estilos
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
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
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Input Styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 4, // Hit area
  },
  currencyText: {
    color: "#16A34A",
    fontWeight: "700",
  },
  
  // Date Picker Style
  dateTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#0056b3",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },

  // Buttons
  footer: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#0056b3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#0056b3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 16,
  },
  saveText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  generateButton: {
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FDBA74", // Laranja claro
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
  },
  generateText: {
    color: "#EA580C", // Laranja escuro
    fontSize: 14,
    fontWeight: "600",
  },
});