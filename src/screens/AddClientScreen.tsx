import React, { useState, useLayoutEffect, useCallback, useEffect, useRef, useMemo } from "react";
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
  BackHandler,
  Modal,
  ActivityIndicator,
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
import { formatErrorForDisplay } from "../utils/errorHandler";
import { VALIDATION_RULES, ValidationHelpers } from "../constants/validationRules";

// Formata apenas para exibir na UI
function formatDateBR(date: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("pt-BR");
}

// Normaliza strings vazias para null (evita armazenar strings vazias no Firestore/SQLite)
const normalize = (v: string): string | null => {
  return v.trim() === "" ? null : v.trim();
};

type FormData = {
  name: string;
  value: string;
  bairro: string;
  numero: string;
  referencia: string;
  telefone: string;
  nextChargeDate: Date | null;
};

// ✅ HitSlop padrão para todos os botões (melhora acessibilidade)
const DEFAULT_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function AddClientScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Estado unificado do formulário
  const [formData, setFormData] = useState<FormData>({
    name: "",
    value: "",
    bairro: "",
    numero: "",
    referencia: "",
    telefone: "",
    nextChargeDate: null,
  });

  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    value: false,
    bairro: false,
    numero: false,
    referencia: false,
    telefone: false,
    nextChargeDate: false,
  });
  const initialFormDataRef = useRef<FormData>(formData);

  // Refs para navegação automática entre campos
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const telefoneInputRef = useRef<TextInput>(null);
  const valueInputRef = useRef<TextInput>(null);
  const bairroInputRef = useRef<TextInput>(null);
  const numeroInputRef = useRef<TextInput>(null);
  const referenciaInputRef = useRef<TextInput>(null);
  const dateTouchableRef = useRef<View>(null);
  
  // ✅ Refs para armazenar posições Y dos campos (para scroll automático)
  const fieldPositionsRef = useRef<Record<keyof FormData, number>>({
    name: 0,
    telefone: 0,
    value: 0,
    bairro: 0,
    numero: 0,
    referencia: 0,
    nextChargeDate: 0,
  });

  // Função para atualizar qualquer campo do formulário
  const updateFormData = useCallback((key: keyof FormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      // Detecta alterações comparando campos individualmente (evita problema com Date no JSON.stringify)
      const hasChanges = 
        updated.name !== initialFormDataRef.current.name ||
        updated.value !== initialFormDataRef.current.value ||
        updated.bairro !== initialFormDataRef.current.bairro ||
        updated.numero !== initialFormDataRef.current.numero ||
        updated.referencia !== initialFormDataRef.current.referencia ||
        updated.telefone !== initialFormDataRef.current.telefone ||
        (updated.nextChargeDate?.getTime() !== initialFormDataRef.current.nextChargeDate?.getTime());
      setHasUnsavedChanges(hasChanges);
      return updated;
    });
  }, []);

  // 🎨 Configuração do Header com bloqueio de navegação
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Novo Cliente",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (hasUnsavedChanges) {
              Alert.alert(
                "Alterações não salvas",
                "Você tem alterações não salvas. Deseja realmente sair?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sair",
                    style: "destructive",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
          style={{ marginLeft: 10 }}
          hitSlop={DEFAULT_HIT_SLOP}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, hasUnsavedChanges]);

  // Bloquear botão físico de voltar no Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (hasUnsavedChanges) {
        Alert.alert(
          "Alterações não salvas",
          "Você tem alterações não salvas. Deseja realmente sair?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Sair",
              style: "destructive",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return true; // Previne o comportamento padrão
      }
      return false; // Permite o comportamento padrão
    });

    return () => backHandler.remove();
  }, [hasUnsavedChanges, navigation]);

  // ✅ Validações em tempo real usando useMemo e constantes globais
  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    // Nome - usando constantes globais
    const nameError = ValidationHelpers.validateName(formData.name);
    if (nameError) errors.name = nameError;

    // Valor - usando constantes globais
    const valueError = ValidationHelpers.validateValue(formData.value, parseInteger);
    if (valueError) errors.value = valueError;

    // Telefone - usando constantes globais
    const phoneError = ValidationHelpers.validatePhone(formData.telefone);
    if (phoneError) errors.telefone = phoneError;

    // Bairro - opcional, validação apenas se necessário
    const bairroError = ValidationHelpers.validateBairro(formData.bairro);
    if (bairroError) errors.bairro = bairroError;

    // Número - opcional, validação apenas se necessário
    const numeroError = ValidationHelpers.validateNumero(formData.numero);
    if (numeroError) errors.numero = numeroError;

    // Referência - opcional, validação apenas se necessário
    const referenciaError = ValidationHelpers.validateReferencia(formData.referencia);
    if (referenciaError) errors.referencia = referenciaError;

    // Data - opcional, validação apenas se necessário
    const dateError = ValidationHelpers.validateDate(formData.nextChargeDate);
    if (dateError) errors.nextChargeDate = dateError;

    return errors;
  }, [formData]);

  // Verifica se o formulário é válido
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  // Função para marcar campo como tocado
  const markFieldTouched = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Funções de navegação entre campos
  const focusNextField = useCallback((field: "telefone" | "value" | "bairro" | "numero" | "referencia") => {
    const refs = {
      telefone: telefoneInputRef,
      value: valueInputRef,
      bairro: bairroInputRef,
      numero: numeroInputRef,
      referencia: referenciaInputRef,
    };
    refs[field].current?.focus();
  }, []);

  // ✅ Função para armazenar posição Y de um campo
  const handleFieldLayout = useCallback((field: keyof FormData) => {
    return (event: any) => {
      const { y } = event.nativeEvent.layout;
      fieldPositionsRef.current[field] = y;
    };
  }, []);

  // ✅ Função para fazer scroll até o primeiro campo com erro usando useRef do ScrollView
  const scrollToFirstError = useCallback(() => {
    const errorFields: Array<keyof FormData> = [
      "name",
      "telefone",
      "value",
      "nextChargeDate",
      "bairro",
      "numero",
      "referencia",
    ];

    // Encontra o primeiro campo com erro
    for (const fieldKey of errorFields) {
      if (validationErrors[fieldKey]) {
        // Usa setTimeout para garantir que o layout foi atualizado
        setTimeout(() => {
          if (scrollViewRef.current) {
            const fieldY = fieldPositionsRef.current[fieldKey];
            
            // Se temos a posição armazenada, usa ela
            if (fieldY > 0) {
              scrollViewRef.current.scrollTo({
                y: Math.max(0, fieldY - 120), // Offset de 120px para melhor visualização
                animated: true,
              });
            } else {
              // Fallback: scroll aproximado baseado na ordem do campo
              const fieldIndex = errorFields.indexOf(fieldKey);
              const estimatedY = fieldIndex * 100; // ~100px por campo (ajustado)
              scrollViewRef.current.scrollTo({
                y: Math.max(0, estimatedY - 120),
                animated: true,
              });
            }
            
            // Tenta fazer focus no campo após scroll
            setTimeout(() => {
              const refs: Record<keyof FormData, React.RefObject<TextInput | View> | null> = {
                name: nameInputRef,
                telefone: telefoneInputRef,
                value: valueInputRef,
                nextChargeDate: dateTouchableRef,
                bairro: bairroInputRef,
                numero: numeroInputRef,
                referencia: referenciaInputRef,
              };
              
              const fieldRef = refs[fieldKey];
              if (fieldRef?.current) {
                // Tenta fazer focus se for TextInput
                if ('focus' in fieldRef.current && typeof (fieldRef.current as any).focus === 'function') {
                  (fieldRef.current as any).focus();
                }
              }
            }, 300);
          }
        }, 200);
        break;
      }
    }
  }, [validationErrors]);

  const handleSave = useCallback(async () => {
    // ✅ Previne salvamento duplicado
    if (saving) return;

    // Marca todos os campos como tocados para mostrar erros
    setTouched({
      name: true,
      value: true,
      bairro: true,
      numero: true,
      referencia: true,
      telefone: true,
      nextChargeDate: true,
    });

    // Valida se o formulário é válido
    if (!isFormValid) {
      // ✅ Scroll automático para o primeiro campo com erro
      scrollToFirstError();
      Alert.alert("Atenção", "Por favor, corrija os erros no formulário antes de salvar.");
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        "⚠️ Autenticação Necessária",
        "Você precisa estar autenticado para adicionar clientes. Por favor, faça login novamente.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // ✅ Validação robusta de valor
    const numericValue = parseInteger(formData.value);

    setSaving(true);

    try {
      // ✅ Usa saveClient que salva no SQLite imediatamente (não bloqueia)
      // A sincronização com Firestore acontece em background automaticamente
      await saveClient(user.uid, {
        name: formData.name.trim(),
        value: numericValue,
        bairro: normalize(formData.bairro),
        numero: normalize(formData.numero),
        referencia: normalize(formData.referencia),
        telefone: normalize(formData.telefone),
        next_charge: formData.nextChargeDate ? formatDateIso(formData.nextChargeDate) : null,
      });

      // ✅ Sucesso imediato - cliente salvo localmente
      // Sincronização com nuvem acontece em background
      setHasUnsavedChanges(false);
      Alert.alert("✅ Sucesso", "Cliente adicionado com sucesso!");
      navigation.goBack();
    } catch (error) {
      // ✅ Log detalhado para debug (apenas no console)
      console.error("❌ Erro ao adicionar cliente:", {
        error,
        errorCode: (error as any)?.code,
        errorMessage: (error as any)?.message,
        formData: {
          name: formData.name,
          value: formData.value,
          telefone: formData.telefone,
        },
      });
      
      // ✅ Mensagem de erro específica e amigável para o usuário
      const errorMessage = formatErrorForDisplay(error, "Não foi possível adicionar o cliente.");
      
      Alert.alert(
        "❌ Erro ao Salvar",
        errorMessage,
        [
          {
            text: "OK",
            style: "default",
          },
        ],
        { cancelable: true }
      );
    } finally {
      setSaving(false);
    }
  }, [formData, user?.uid, saving, navigation, isFormValid, scrollToFirstError]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    // Android: fecha automaticamente ao selecionar
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }

    // iOS: apenas atualiza a data, não fecha (fecha só pelo botão OK)
    if (selectedDate && Platform.OS === "ios") {
      updateFormData("nextChargeDate", selectedDate);
    } else if (selectedDate) {
      updateFormData("nextChargeDate", selectedDate);
    }
  };

  const handleDatePickerCancel = useCallback(() => {
    setShowPicker(false);
  }, []);

  const handleDatePickerConfirm = useCallback(() => {
    setShowPicker(false);
    markFieldTouched("nextChargeDate");
  }, [markFieldTouched]);

  const handleGenerateRandomClient = useCallback(() => {
    const randomClient = generateRandomClient();
    
    setFormData({
      name: randomClient.name,
      value: randomClient.value,
      bairro: randomClient.bairro,
      numero: randomClient.numero,
      referencia: randomClient.referencia,
      telefone: randomClient.telefone,
      nextChargeDate: randomClient.nextChargeDate,
    });
    setHasUnsavedChanges(true);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#F1F5F9" }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        
        {/* Seção 1: Dados Pessoais */}
        <CardSection title="DADOS PESSOAIS">
          <View onLayout={handleFieldLayout("name")}>
            <InputItem 
              ref={nameInputRef}
              icon="person-outline" 
              placeholder="Nome do cliente *" 
              value={formData.name} 
              onChangeText={(t) => {
                updateFormData("name", t.replace(/\s{2,}/g, " ").trimStart());
                markFieldTouched("name");
              }}
              onBlur={() => markFieldTouched("name")}
              onSubmitEditing={() => focusNextField("telefone")}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={VALIDATION_RULES.NAME.MAX_LENGTH}
              error={touched.name ? validationErrors.name : undefined}
            />
          </View>
          <View style={styles.divider} />
          <View onLayout={handleFieldLayout("telefone")}>
            <InputItem 
              ref={telefoneInputRef}
              icon="call-outline" 
              placeholder="Telefone / WhatsApp" 
              value={formData.telefone} 
              onChangeText={(t) => {
                updateFormData("telefone", maskPhone(t));
                markFieldTouched("telefone");
              }}
              onBlur={() => markFieldTouched("telefone")}
              onSubmitEditing={() => focusNextField("value")}
              keyboardType="phone-pad"
              returnKeyType="next"
              maxLength={VALIDATION_RULES.PHONE.MAX_DIGITS + 5}
              error={touched.telefone ? validationErrors.telefone : undefined}
            />
          </View>
        </CardSection>

        {/* Seção 2: Financeiro */}
        <CardSection title="FINANCEIRO">
          <View onLayout={handleFieldLayout("value")}>
            <InputItem 
              ref={valueInputRef}
              icon="cash-outline" 
              placeholder="Valor Total (Inteiro) *" 
              value={formData.value} 
              onChangeText={(txt) => {
                updateFormData("value", maskInteger(txt));
                markFieldTouched("value");
              }}
              onBlur={() => markFieldTouched("value")}
              onSubmitEditing={() => focusNextField("bairro")}
              keyboardType="number-pad"
              returnKeyType="next"
              maxLength={VALIDATION_RULES.PHONE.MAX_DIGITS + 5}
              error={touched.value ? validationErrors.value : undefined}
            />
          </View>
          <View style={styles.divider} />
          
          {/* Date Picker Customizado */}
          <View ref={dateTouchableRef} onLayout={handleFieldLayout("nextChargeDate")}>
            <TouchableOpacity 
              onPress={() => setShowPicker(true)} 
              style={styles.dateTouchable}
              activeOpacity={0.7}
            >
              <View style={styles.rowCenter}>
                <Icon name="calendar-outline" size={20} color="#0056b3" />
                <Text style={[styles.dateText, !formData.nextChargeDate && styles.placeholderText]}>
                  {formData.nextChargeDate ? formatDateBR(formData.nextChargeDate) : "Data da próxima cobrança"}
                </Text>
              </View>
              <View style={styles.rowCenter}>
                {formData.nextChargeDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      updateFormData("nextChargeDate", null);
                      markFieldTouched("nextChargeDate");
                    }}
                    style={styles.clearDateButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close-circle" size={20} color="#64748B" />
                  </TouchableOpacity>
                )}
                <Icon name="chevron-down" size={16} color="#CBD5E1" style={{ marginLeft: formData.nextChargeDate ? 8 : 0 }} />
              </View>
            </TouchableOpacity>
          </View>
        </CardSection>

        {/* Seção 3: Endereço */}
        <CardSection title="ENDEREÇO">
          <View style={styles.rowInput}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <InputItem 
                ref={bairroInputRef}
                icon="map-outline" 
                placeholder="Bairro" 
                value={formData.bairro} 
                onChangeText={(t) => updateFormData("bairro", t.trimStart())}
                onSubmitEditing={() => focusNextField("numero")}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={VALIDATION_RULES.BAIRRO.MAX_LENGTH}
              />
            </View>
            <View style={{ width: 100 }}>
              <InputItem 
                ref={numeroInputRef}
                icon="home-outline" 
                placeholder="Nº" 
                value={formData.numero} 
                onChangeText={(t) => updateFormData("numero", t.replace(/\D/g, "").slice(0, 6))} 
                onSubmitEditing={() => focusNextField("referencia")}
                keyboardType="number-pad"
                returnKeyType="next"
                maxLength={VALIDATION_RULES.NUMERO.MAX_LENGTH}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <InputItem 
            ref={referenciaInputRef}
            icon="location-outline" 
            placeholder="Ponto de Referência" 
            value={formData.referencia} 
            onChangeText={(t) => updateFormData("referencia", t.trimStart())}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={100}
          />
        </CardSection>

        {/* Botões */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              (saving || !isFormValid) && styles.saveButtonDisabled
            ]} 
            activeOpacity={0.7} 
            onPress={handleSave}
            disabled={saving || !isFormValid}
            hitSlop={DEFAULT_HIT_SLOP}
          >
            <Text style={styles.saveText}>
              {saving ? "Salvando..." : "Salvar Cliente"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.generateButton} 
            activeOpacity={0.7} 
            onPress={handleGenerateRandomClient}
            hitSlop={DEFAULT_HIT_SLOP}
          >
            <Icon name="dice-outline" size={18} color="#EA580C" style={{ marginRight: 6 }} />
            <Text style={styles.generateText}>Preencher com dados aleatórios</Text>
          </TouchableOpacity>
        </View>

        {/* Componente de Data - Android (fecha automaticamente) */}
        {showPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={formData.nextChargeDate ?? new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
        )}

        {/* Componente de Data - iOS (Modal customizado com spinner) */}
        <Modal
          visible={showPicker && Platform.OS === "ios"}
          transparent={true}
          animationType="slide"
          onRequestClose={handleDatePickerCancel}
          statusBarTranslucent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.iosDatePickerModal}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity 
                  onPress={handleDatePickerCancel}
                  style={styles.iosDatePickerHeaderButton}
                >
                  <Text style={styles.iosDatePickerCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.iosDatePickerTitle}>Selecionar Data</Text>
                <TouchableOpacity 
                  onPress={handleDatePickerConfirm}
                  style={styles.iosDatePickerHeaderButton}
                >
                  <Text style={styles.iosDatePickerConfirmText}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.nextChargeDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={onChangeDate}
                minimumDate={new Date()}
                style={styles.iosDatePickerSpinner}
              />
            </View>
          </View>
        </Modal>

        {/* Overlay de Loading */}
        {saving && (
          <Modal
            visible={saving}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
          >
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0056b3" />
                <Text style={styles.loadingText}>Salvando cliente...</Text>
              </View>
            </View>
          </Modal>
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
    flex: 1,
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },
  clearDateButton: {
    padding: 4,
    marginRight: 4,
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

  // iOS Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  iosDatePickerModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  iosDatePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  iosDatePickerHeaderButton: {
    minWidth: 80,
  },
  iosDatePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  iosDatePickerCancelText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  iosDatePickerConfirmText: {
    color: "#0056b3",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  iosDatePickerSpinner: {
    height: 200,
  },

  // Loading Overlay
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },
});