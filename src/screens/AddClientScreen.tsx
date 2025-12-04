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

  const generateRandomClient = useCallback(() => {
    // Nomes brasileiros variados
    const firstNames = [
      "João", "Maria", "José", "Ana", "Carlos", "Francisco", "Antonio", "Paulo",
      "Pedro", "Lucas", "Luiz", "Marcos", "Luis", "Gabriel", "Rafael", "Daniel",
      "Marcelo", "Bruno", "Fernando", "Ricardo", "Roberto", "André", "Eduardo",
      "Fábio", "Rodrigo", "Thiago", "Felipe", "Gustavo", "Renato", "Vinicius",
      "Patricia", "Juliana", "Fernanda", "Mariana", "Camila", "Amanda", "Bruna",
      "Larissa", "Vanessa", "Cristina", "Sandra", "Adriana", "Simone", "Renata"
    ];
    
    const lastNames = [
      "Silva", "Souza", "Costa", "Santos", "Oliveira", "Pereira", "Rodrigues",
      "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes",
      "Martins", "Rocha", "Ribeiro", "Alves", "Monteiro", "Mendes", "Barros",
      "Freitas", "Cardoso", "Teixeira", "Cavalcanti", "Dias", "Castro", "Correia",
      "Moraes", "Ramos", "Reis", "Nunes", "Moreira", "Torres", "Lopes", "Pires"
    ];

    // Bairros variados
    const bairros = [
      "Centro", "Jardim América", "Boa Vista", "Vila Nova", "Santa Cruz",
      "São José", "Nova Esperança", "Parque Industrial", "Vila Rica", "Bela Vista",
      "Jardim das Flores", "Alto da Boa Vista", "Vila Esperança", "Centro Histórico",
      "Jardim Primavera", "Vila São Paulo", "Bairro Novo", "Parque das Águas",
      "Vila Progresso", "São Cristóvão", "Jardim Bela Vista", "Vila União",
      "Parque Residencial", "Vila dos Pescadores", "Centro Comercial", "Alto Alegre"
    ];

    // Referências variadas
    const referencias = [
      "Próximo ao mercado", "Ao lado da escola", "Em frente à farmácia",
      "Próximo à praça", "Ao lado do posto de gasolina", "Em frente ao supermercado",
      "Próximo à igreja", "Ao lado da padaria", "Em frente à clínica",
      "Próximo ao banco", "Ao lado da lanchonete", "Em frente à loja",
      "Próximo ao hospital", "Ao lado do açougue", "Em frente à sorveteria",
      "Próximo à delegacia", "Ao lado da praça de esportes", "Em frente ao parque",
      "Próximo à rodoviária", "Ao lado do shopping", "Em frente à estação"
    ];

    // DDDs brasileiros comuns
    const ddds = ["11", "21", "31", "41", "47", "48", "51", "61", "71", "81", "85", "92"];

    // Gerar dados aleatórios
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    setName(`${firstName} ${lastName}`);

    // Valor inteiro (sem centavos) entre 100 e 5000
    const randomValue = Math.floor(Math.random() * 4900 + 100);
    setValue(randomValue.toLocaleString("pt-BR"));

    setBairro(bairros[Math.floor(Math.random() * bairros.length)]);
    
    // Número da casa entre 1 e 9999
    setNumero(String(Math.floor(Math.random() * 9999 + 1)));
    
    setReferencia(referencias[Math.floor(Math.random() * referencias.length)]);

    // Telefone aleatório com DDD e número
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    const phoneNumber = String(Math.floor(Math.random() * 90000000 + 10000000)); // 8 dígitos
    setTelefone(`(${ddd}) ${phoneNumber.slice(0, 5)}-${phoneNumber.slice(5)}`);

    // Data aleatória entre hoje e 60 dias à frente
    const today = new Date();
    const random = new Date(today);
    random.setDate(today.getDate() + Math.floor(Math.random() * 60 + 1));
    setNextChargeDate(random);
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

          <TouchableOpacity style={styles.generateButton} activeOpacity={0.6} onPress={generateRandomClient}>
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
          <DateTimePicker
            value={nextChargeDate ?? new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
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
});