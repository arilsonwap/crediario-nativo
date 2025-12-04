import React, { useState, useLayoutEffect, useCallback, useEffect, useRef, useMemo } from "react";
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
  BackHandler,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { parseInteger, maskInteger, maskPhone } from "../utils/formatCurrency";
import { saveClient } from "../services/syncService";
import { useAuth } from "../contexts/AuthContext";
import InputItem from "../components/InputItem";
import CardSection from "../components/CardSection";
import { formatErrorForDisplay } from "../utils/errorHandler";
import { VALIDATION_RULES, ValidationHelpers } from "../constants/validationRules";
import { DEV_LOG, DEV_ERROR } from "../utils/devLog";
import { Metrics } from "../theme/metrics";
import { Colors } from "../theme/colors";

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
};

export default function EditClientScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { client } = route.params as any;
  const { user } = useAuth();

  // ✅ Estado unificado do formulário
  const [formData, setFormData] = useState<FormData>({
    name: client.name || "",
    value: String(client.value || ""),
    bairro: client.bairro || "",
    numero: client.numero || "",
    referencia: client.referencia || "",
    telefone: client.telefone || "",
  });

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    value: false,
    bairro: false,
    numero: false,
    referencia: false,
    telefone: false,
  });

  // ✅ Ref para armazenar dados originais
  const originalDataRef = useRef<FormData>(formData);
  const scrollViewRef = useRef<ScrollView>(null);

  // ✅ Refs para inputs (navegação automática)
  const nameInputRef = useRef<TextInput>(null);
  const telefoneInputRef = useRef<TextInput>(null);
  const valueInputRef = useRef<TextInput>(null);
  const bairroInputRef = useRef<TextInput>(null);
  const numeroInputRef = useRef<TextInput>(null);
  const referenciaInputRef = useRef<TextInput>(null);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Editar Cliente",
      headerStyle: { backgroundColor: Colors.primary, elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // ✅ Função para atualizar qualquer campo do formulário
  const updateFormData = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // ✅ Verifica mudanças em tempo real
      const hasChanges = Object.keys(updated).some(
        (key) => updated[key as keyof FormData] !== originalDataRef.current[key as keyof FormData]
      );
      setHasUnsavedChanges(hasChanges);
      return updated;
    });
  }, []);

  // ✅ Função para verificar se houve mudanças reais
  const hasChanges = useCallback((): boolean => {
    const numericValue = parseInteger(formData.value);
    const originalValue = parseInteger(String(originalDataRef.current.value));

    return (
      formData.name.trim() !== originalDataRef.current.name.trim() ||
      numericValue !== originalValue ||
      (formData.bairro.trim() || null) !== (originalDataRef.current.bairro || null) ||
      (formData.numero.trim() || null) !== (originalDataRef.current.numero || null) ||
      (formData.referencia.trim() || null) !== (originalDataRef.current.referencia || null) ||
      (formData.telefone.trim() || null) !== (originalDataRef.current.telefone || null)
    );
  }, [formData]);

  // ✅ Atualiza hasUnsavedChanges quando formData muda
  useEffect(() => {
    setHasUnsavedChanges(hasChanges());
  }, [formData, hasChanges]);

  // ✅ Validações em tempo real usando useMemo
  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    // Nome
    const nameError = ValidationHelpers.validateName(formData.name);
    if (nameError) errors.name = nameError;

    // Valor
    const valueError = ValidationHelpers.validateValue(formData.value, parseInteger);
    if (valueError) errors.value = valueError;

    // Telefone
    const phoneError = ValidationHelpers.validatePhone(formData.telefone);
    if (phoneError) errors.telefone = phoneError;

    // Bairro - opcional
    const bairroError = ValidationHelpers.validateBairro(formData.bairro);
    if (bairroError) errors.bairro = bairroError;

    // Número - opcional
    const numeroError = ValidationHelpers.validateNumero(formData.numero);
    if (numeroError) errors.numero = numeroError;

    // Referência - opcional
    const referenciaError = ValidationHelpers.validateReferencia(formData.referencia);
    if (referenciaError) errors.referencia = referenciaError;

    return errors;
  }, [formData]);

  // ✅ Verifica se o formulário é válido
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  // ✅ Função para marcar campo como tocado
  const markFieldTouched = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // ✅ Funções de navegação entre campos
  const focusNextField = useCallback((fieldName: keyof FormData) => {
    const refs: Record<keyof FormData, React.RefObject<TextInput>> = {
      name: nameInputRef,
      telefone: telefoneInputRef,
      value: valueInputRef,
      bairro: bairroInputRef,
      numero: numeroInputRef,
      referencia: referenciaInputRef,
    };
    refs[fieldName]?.current?.focus();
  }, []);

  // ✅ Handler para salvar
  const handleSave = useCallback(async () => {
    // ✅ Validação antes de salvar
    if (!isFormValid) {
      // Marca todos os campos como tocados para mostrar erros
      setTouched({
        name: true,
        value: true,
        telefone: true,
        bairro: true,
        numero: true,
        referencia: true,
      });
      
      // Scroll para o primeiro erro
      const firstErrorField = Object.keys(validationErrors)[0] as keyof FormData;
      if (firstErrorField && scrollViewRef.current) {
        // Scroll básico - pode ser melhorado com medidas de posição
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      
      Alert.alert("Campos inválidos", "Por favor, corrija os erros antes de salvar.");
      return;
    }

    // ✅ Verifica se realmente houve mudanças
    if (!hasChanges()) {
      navigation.goBack();
      return;
    }

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    setSaving(true);
    try {
      const numericValue = parseInteger(formData.value);

      await saveClient(user.uid, {
        id: client.id,
        name: formData.name.trim(),
        value: numericValue,
        bairro: normalize(formData.bairro),
        numero: normalize(formData.numero),
        referencia: normalize(formData.referencia),
        telefone: normalize(formData.telefone),
        next_charge: client.next_charge,
        paid: client.paid,
      });

      // ✅ Atualiza dados originais após salvar
      originalDataRef.current = { ...formData };
      setHasUnsavedChanges(false);

      Alert.alert("✅ Sucesso", "Cliente atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      DEV_ERROR("Erro ao atualizar cliente:", error);
      const errorMessage = formatErrorForDisplay(
        error,
        "Não foi possível atualizar o cliente."
      );
      Alert.alert("❌ Erro", errorMessage);
    } finally {
      setSaving(false);
    }
  }, [isFormValid, hasChanges, formData, user, client, navigation, validationErrors]);

  // ✅ Handler para voltar
  const handleGoBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Descartar alterações?",
        "Você fez mudanças que ainda não foram salvas.",
        [
          { text: "Continuar Editando", style: "cancel" },
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasUnsavedChanges, navigation]);

  // ✅ BackHandler para Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (hasUnsavedChanges) {
        handleGoBack();
        return true; // Previne comportamento padrão
      }
      return false; // Permite comportamento padrão
    });

    return () => backHandler.remove();
  }, [hasUnsavedChanges, handleGoBack]);

  // ✅ Handler para normalizar nome (remove múltiplos espaços)
  const handleNameChange = useCallback((text: string) => {
    const normalized = text.replace(/\s{2,}/g, " ").trimStart();
    updateFormData("name", normalized);
    markFieldTouched("name");
  }, [updateFormData, markFieldTouched]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Seção 1: Dados Pessoais */}
        <CardSection title="DADOS PESSOAIS">
          <InputItem
            ref={nameInputRef}
            icon="person-outline"
            placeholder="Nome Completo *"
            value={formData.name}
            onChangeText={handleNameChange}
            onBlur={() => markFieldTouched("name")}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => focusNextField("telefone")}
            error={touched.name ? validationErrors.name : undefined}
            maxLength={VALIDATION_RULES.NAME.MAX_LENGTH}
          />
          <View style={styles.divider} />
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
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => focusNextField("value")}
            error={touched.telefone ? validationErrors.telefone : undefined}
            maxLength={15}
          />
        </CardSection>

        {/* Seção 2: Financeiro */}
        <CardSection title="FINANCEIRO">
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
            keyboardType="numeric"
            returnKeyType="next"
                onSubmitEditing={() => focusNextField("bairro")}
            isCurrency
            error={touched.value ? validationErrors.value : undefined}
            maxLength={9}
          />
        </CardSection>

        {/* Seção 3: Endereço */}
        <CardSection title="ENDEREÇO">
          <View style={styles.rowInput}>
            <View style={{ flex: 2, marginRight: 10 }}>
              <InputItem
                ref={bairroInputRef}
                icon="map-outline"
                placeholder="Bairro"
                value={formData.bairro}
                onChangeText={(t) => {
                  updateFormData("bairro", t.trimStart());
                  markFieldTouched("bairro");
                }}
                onBlur={() => markFieldTouched("bairro")}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => focusNextField("numero")}
                error={touched.bairro ? validationErrors.bairro : undefined}
                maxLength={VALIDATION_RULES.BAIRRO.MAX_LENGTH}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputItem
                ref={numeroInputRef}
                icon="home-outline"
                placeholder="Nº"
                value={formData.numero}
                onChangeText={(t) => {
                  updateFormData("numero", maskInteger(t));
                  markFieldTouched("numero");
                }}
                onBlur={() => markFieldTouched("numero")}
                keyboardType="numeric"
                returnKeyType="next"
                onSubmitEditing={() => focusNextField("referencia")}
                error={touched.numero ? validationErrors.numero : undefined}
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
            onChangeText={(t) => {
              updateFormData("referencia", t.trimStart());
              markFieldTouched("referencia");
            }}
            onBlur={() => markFieldTouched("referencia")}
            autoCapitalize="sentences"
            returnKeyType="done"
            error={touched.referencia ? validationErrors.referencia : undefined}
            maxLength={100}
          />
        </CardSection>

        {/* Botões de Ação */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!isFormValid || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isFormValid || saving}
            activeOpacity={0.7}
            hitSlop={Metrics.hitSlop}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
            hitSlop={Metrics.hitSlop}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ✅ Loading Overlay */}
      {saving && (
        <Modal transparent animationType="fade" statusBarTranslucent>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Salvando...</Text>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

/* ===========================================================
   🎨 Estilos
=========================================================== */
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: Colors.background,
    minHeight: "100%",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  rowInput: {
    flexDirection: "row",
  },
  footer: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    minWidth: 150,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
});
