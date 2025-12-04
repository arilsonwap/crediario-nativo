import React, { useState, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
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
import { parseInteger, maskInteger, maskPhone } from "../utils/formatCurrency";
import { saveClient } from "../services/syncService";
import { useAuth } from "../contexts/AuthContext";
import InputItem from "../components/InputItem";
import CardSection from "../components/CardSection";
import { generateRandomClient } from "../utils/generateRandomClient";

// Formata apenas para exibir na UI
function formatDateBR(date: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("pt-BR");
}

// Normaliza strings vazias para null (evita armazenar strings vazias no Firestore/SQLite)
const normalize = (v: string): string | null => {
  return v.trim() === "" ? null : v.trim();
};

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
  const [saving, setSaving] = useState(false);

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
    // ✅ Previne salvamento duplicado
    if (saving) return;

    if (!name.trim() || !value.trim()) {
      Alert.alert("Atenção", "Os campos Nome e Valor são obrigatórios.");
      return;
    }

    // ✅ Validação extra no nome (evita espaços duplos e nomes muito curtos)
    if (name.trim().length < 3) {
      Alert.alert("Nome inválido", "Insira ao menos 3 caracteres.");
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
    const numericValue = parseInteger(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      Alert.alert("Valor inválido", "O campo valor precisa ser um número inteiro válido.");
      return;
    }

    setSaving(true);

    try {
      // ✅ Usa saveClient que salva no SQLite imediatamente (não bloqueia)
      // A sincronização com Firestore acontece em background automaticamente
      await saveClient(user.uid, {
        name: name.trim(),
        value: numericValue,
        bairro: normalize(bairro),
        numero: normalize(numero),
        referencia: normalize(referencia),
        telefone: normalize(telefone),
        next_charge: nextChargeDate ? formatDateIso(nextChargeDate) : null,
      });

      // ✅ Sucesso imediato - cliente salvo localmente
      // Sincronização com nuvem acontece em background
      Alert.alert("✅ Sucesso", "Cliente adicionado com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      Alert.alert("Erro", "Falha ao adicionar cliente.");
    } finally {
      setSaving(false);
    }
  }, [name, value, bairro, numero, referencia, telefone, nextChargeDate, user?.uid, saving]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }

    if (selectedDate) {
      setNextChargeDate(selectedDate);
    }
  };

  const handleGenerateRandomClient = useCallback(() => {
    const randomClient = generateRandomClient();
    
    setName(randomClient.name);
    setValue(randomClient.value);
    setBairro(randomClient.bairro);
    setNumero(randomClient.numero);
    setReferencia(randomClient.referencia);
    setTelefone(randomClient.telefone);
    setNextChargeDate(randomClient.nextChargeDate);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#F1F5F9" }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Seção 1: Dados Pessoais */}
        <CardSection title="DADOS PESSOAIS">
          <InputItem 
            icon="person-outline" 
            placeholder="Nome do cliente" 
            value={name} 
            onChangeText={(t) => setName(t.replace(/ {2,}/g, " "))}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <View style={styles.divider} />
          <InputItem 
            icon="call-outline" 
            placeholder="Telefone / WhatsApp" 
            value={telefone} 
            onChangeText={(t) => setTelefone(maskPhone(t))} 
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </CardSection>

        {/* Seção 2: Financeiro */}
        <CardSection title="FINANCEIRO">
          <InputItem 
            icon="cash-outline" 
            placeholder="Valor Total (Inteiro)" 
            value={value} 
            onChangeText={(txt) => setValue(maskInteger(txt))} 
            keyboardType="number-pad"
            returnKeyType="next"
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
        </CardSection>

        {/* Seção 3: Endereço */}
        <CardSection title="ENDEREÇO">
          <View style={styles.rowInput}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <InputItem 
                icon="map-outline" 
                placeholder="Bairro" 
                value={bairro} 
                onChangeText={(t) => setBairro(t.trimStart())}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={{ width: 100 }}>
              <InputItem 
                icon="home-outline" 
                placeholder="Nº" 
                value={numero} 
                onChangeText={(t) => setNumero(t.replace(/\D/g, "").slice(0, 6))} 
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </View>
          </View>
          <View style={styles.divider} />
          <InputItem 
            icon="location-outline" 
            placeholder="Ponto de Referência" 
            value={referencia} 
            onChangeText={(t) => setReferencia(t.trimStart())}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </CardSection>

        {/* Botões */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            activeOpacity={0.8} 
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? "Salvando..." : "Salvar Cliente"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.generateButton} activeOpacity={0.6} onPress={handleGenerateRandomClient}>
            <Icon name="dice-outline" size={18} color="#EA580C" style={{ marginRight: 6 }} />
            <Text style={styles.generateText}>Preencher com dados aleatórios</Text>
          </TouchableOpacity>
        </View>

        {/* Componente de Data Oculto/Modal */}
        {showPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={nextChargeDate ?? new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
        )}
        {Platform.OS === "ios" && showPicker && (
          <View style={styles.iosDatePickerContainer}>
            <DateTimePicker
              value={nextChargeDate ?? new Date()}
              mode="date"
              display="default"
              onChange={onChangeDate}
              minimumDate={new Date()}
            />
            <TouchableOpacity 
              onPress={() => setShowPicker(false)} 
              style={styles.iosDatePickerButton}
            >
              <Text style={styles.iosDatePickerButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🎨 Estilos
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
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
  
  // Date Picker Style
  dateTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
  saveButtonDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.6,
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

  // iOS Date Picker
  iosDatePickerContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iosDatePickerButton: {
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  iosDatePickerButtonText: {
    color: "#0056b3",
    fontSize: 16,
    fontWeight: "700",
  },
});