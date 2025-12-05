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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
import { type Client } from "../database/db";

// ✅ Tipagem para parâmetros da rota
interface EditClientScreenParams {
  client: Client;
}

type EditClientRouteProp = RouteProp<{ EditClient: EditClientScreenParams }, "EditClient">;

// Normaliza strings vazias para null (evita armazenar strings vazias no Firestore/SQLite)
const normalize = (v: string): string | null => {
  return v.trim() === "" ? null : v.trim();
};

// ✅ Função auxiliar para normalizar strings para comparação (movida para fora do componente)
const normalizeForCompare = (str: string): string | null => {
  const trimmed = str.trim();
  return trimmed === "" ? null : trimmed;
};

// 🧩 Mantém a posição correta do cursor durante mascaramento
function applyMaskAndKeepCursor(
  text: string,
  prevText: string,
  maskFn: (v: string) => string
) {
  const masked = maskFn(text);

  // Índice do cursor antes da máscara
  let cursor = text.length;

  // Ajuste de cursor se máscara inseriu caracteres automaticamente
  if (masked.length > prevText.length) {
    const diff = masked.length - prevText.length;
    cursor += diff;
  }

  // Limita para não passar do tamanho da string mascarada
  cursor = Math.min(cursor, masked.length);

  return { masked, cursor };
}

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
  const route = useRoute<EditClientRouteProp>();
  const { client } = route.params;
  const { user } = useAuth();

  // ✅ Estado unificado do formulário (já normalizado na inicialização)
  // Normaliza dados do cliente para evitar falsos positivos de mudança
  const initialFormData: FormData = {
    name: (client.name || "").trim(),
    value: String(client.value || ""),
    bairro: (client.bairro || "").trim(),
    numero: (client.numero || "").trim(),
    referencia: (client.referencia || "").trim(),
    telefone: (client.telefone || "").trim(),
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    value: false,
    bairro: false,
    numero: false,
    referencia: false,
    telefone: false,
  });

  // ✅ Ref para armazenar dados originais (já normalizados)
  // Isso evita detectar mudanças quando apenas normalizações são aplicadas
  const originalDataRef = useRef<FormData>(initialFormData);
  const scrollViewRef = useRef<ScrollView>(null);

  // ✅ Refs para inputs (navegação automática)
  const nameInputRef = useRef<TextInput>(null);
  const telefoneInputRef = useRef<TextInput>(null);
  const valueInputRef = useRef<TextInput>(null);
  const bairroInputRef = useRef<TextInput>(null);
  const numeroInputRef = useRef<TextInput>(null);
  const referenciaInputRef = useRef<TextInput>(null);

  // ✅ Refs para armazenar posições Y dos campos (para scroll automático)
  const fieldPositionsRef = useRef<Record<keyof FormData, number>>({
    name: 0,
    telefone: 0,
    value: 0,
    bairro: 0,
    numero: 0,
    referencia: 0,
  });

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
      return updated;
    });
    // ✅ Verifica mudanças após atualização (usa useEffect para garantir sincronização)
  }, []);

  // ✅ Função para verificar se houve mudanças reais
  // Compara valores normalizados para evitar falsos positivos
  const hasChanges = useCallback((): boolean => {
    const numericValue = parseInteger(formData.value);
    const originalValue = parseInteger(String(originalDataRef.current.value));

    return (
      normalizeForCompare(formData.name) !== normalizeForCompare(originalDataRef.current.name) ||
      numericValue !== originalValue ||
      normalizeForCompare(formData.bairro) !== normalizeForCompare(originalDataRef.current.bairro) ||
      normalizeForCompare(formData.numero) !== normalizeForCompare(originalDataRef.current.numero) ||
      normalizeForCompare(formData.referencia) !== normalizeForCompare(originalDataRef.current.referencia) ||
      normalizeForCompare(formData.telefone) !== normalizeForCompare(originalDataRef.current.telefone)
    );
  }, [formData]);

  // ✅ Calcula se há mudanças não salvas (usado para BackHandler e navegação)
  // Simplificado: hasChanges já é memoizado e depende de formData
  const hasUnsavedChanges = hasChanges();

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
  // Valida todos os campos obrigatórios, independente de terem sido tocados
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  // ✅ Função para marcar campo como tocado
  // Simplificado: função simples não precisa de useCallback
  const markFieldTouched = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

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

  // ✅ Função para armazenar posição Y de um campo
  const handleFieldLayout = useCallback((field: keyof FormData) => {
    return (event: any) => {
      const { y } = event.nativeEvent.layout;
      fieldPositionsRef.current[field] = y;
    };
  }, []);

  // ✅ Função para fazer scroll até o primeiro campo com erro
  const scrollToFirstError = useCallback(() => {
    const errorFields: Array<keyof FormData> = [
      "name",
      "telefone",
      "value",
      "bairro",
      "numero",
      "referencia",
    ];

    // Encontra o primeiro campo com erro que foi tocado
    for (const fieldKey of errorFields) {
      if (validationErrors[fieldKey] && touched[fieldKey]) {
        const fieldY = fieldPositionsRef.current[fieldKey];
        
        // Se temos a posição armazenada, usa ela (com delay para Android)
        if (fieldY > 0 && scrollViewRef.current) {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, fieldY - 120), // Offset de 120px para melhor visualização
              animated: true,
            });
          }, 10);
          return;
        }
      }
    }
  }, [validationErrors, touched]);

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
      
      // Scroll para o primeiro erro usando posições medidas (com delay para garantir que touched foi atualizado)
      setTimeout(() => {
        scrollToFirstError();
      }, 100);
      
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

      // ✅ Atualiza dados originais após salvar (normalizados para evitar falsos positivos)
      originalDataRef.current = {
        name: formData.name.trim(),
        value: String(parseInteger(formData.value)),
        bairro: formData.bairro.trim(),
        numero: formData.numero.trim(),
        referencia: formData.referencia.trim(),
        telefone: formData.telefone.trim(),
      };

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
  // Atualiza diretamente sem debounce para evitar dupla renderização
  const handleNameChange = useCallback(
    (text: string) => {
      const normalized = text.replace(/\s{2,}/g, " ").trimStart();
      updateFormData("name", normalized);
      markFieldTouched("name");
    },
    [updateFormData, markFieldTouched]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
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
          <View onLayout={handleFieldLayout("name")}>
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
          </View>
          <View style={styles.divider} />
          <View onLayout={handleFieldLayout("telefone")}>
            <InputItem
              ref={telefoneInputRef}
              icon="call-outline"
              placeholder="Telefone / WhatsApp"
              value={formData.telefone}
              onChangeText={(t) => {
                const prev = formData.telefone;

                const { masked, cursor } = applyMaskAndKeepCursor(t, prev, maskPhone);

                updateFormData("telefone", masked);
                markFieldTouched("telefone");

                requestAnimationFrame(() => {
                  if (telefoneInputRef.current) {
                    telefoneInputRef.current.setNativeProps({
                      text: masked,
                      selection: { start: cursor, end: cursor },
                    });
                  }
                });
              }}
              onBlur={() => markFieldTouched("telefone")}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => focusNextField("value")}
              error={touched.telefone ? validationErrors.telefone : undefined}
              maxLength={15}
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
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => focusNextField("bairro")}
              isCurrency
              error={touched.value ? validationErrors.value : undefined}
              maxLength={9}
            />
          </View>
        </CardSection>

        {/* Seção 3: Endereço */}
        <CardSection title="ENDEREÇO">
          <View style={styles.rowInput}>
            <View style={styles.bairroContainer}>
              <View onLayout={handleFieldLayout("bairro")}>
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
            </View>
            <View style={styles.numeroContainer}>
              <View onLayout={handleFieldLayout("numero")}>
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
          </View>
          <View style={styles.divider} />
          <View onLayout={handleFieldLayout("referencia")}>
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
          </View>
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
                <Icon name="checkmark-circle-outline" size={24} color="#FFF" style={styles.iconMargin} />
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
  root: {
    flex: 1,
  },
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
  bairroContainer: {
    flex: 2,
    marginRight: Metrics.spacing.s,
  },
  numeroContainer: {
    flex: 1,
  },
  iconMargin: {
    marginRight: 8,
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
