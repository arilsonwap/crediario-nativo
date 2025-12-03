import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { login } from "../services/authService";

// Chaves de armazenamento
const STORAGE_KEY_EMAIL = "@crediario:saved_email";
const STORAGE_KEY_PASSWORD = "@crediario:saved_password";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(true);

  // 🔄 Carrega credenciais salvas e tenta Auto-Login
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(STORAGE_KEY_EMAIL);
        const savedPassword = await AsyncStorage.getItem(STORAGE_KEY_PASSWORD);

        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);

          try {
            await login(savedEmail, savedPassword);
            // Navegação tratada pelo listener no App.tsx
          } catch (error: any) {
            console.log("Auto-login falhou:", error.message);
            setAutoLoggingIn(false); // Libera a tela se falhar
          }
        } else {
          setAutoLoggingIn(false);
        }
      } catch (error) {
        console.log("Erro ao carregar credenciais:", error);
        setAutoLoggingIn(false);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos obrigatórios", "Por favor, preencha email e senha.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);

      // 💾 Lógica de Persistência
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEY_EMAIL, email);
        await AsyncStorage.setItem(STORAGE_KEY_PASSWORD, password);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_EMAIL);
        await AsyncStorage.removeItem(STORAGE_KEY_PASSWORD);
      }

    } catch (error: any) {
      const msg = error.message || "Ocorreu um erro.";
      Alert.alert("Atenção", msg.includes("auth") ? "Credenciais inválidas." : msg);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Tela de Splash / Auto-Login
  if (autoLoggingIn) {
    return (
      <LinearGradient colors={["#0056b3", "#003d82"]} style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.autoLoginContainer}>
          <View style={styles.logoCircleLarge}>
            <Ionicons name="wallet" size={60} color="#0056b3" />
          </View>
          <Text style={styles.title}>Crediário Pro</Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
          <Text style={styles.autoLoginText}>Entrando automaticamente...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0056b3", "#003d82"]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="wallet" size={40} color="#0056b3" />
            </View>
            <Text style={styles.title}>Crediário Pro</Text>
            <Text style={styles.subtitle}>Gestão Financeira Simplificada</Text>
          </View>

          {/* Card Principal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bem-vindo de volta</Text>
            <Text style={styles.cardSub}>Informe suas credenciais</Text>

            {/* Input Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Seu e-mail"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Input Senha */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Sua senha"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Checkbox "Lembrar de mim" */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Manter conectado</Text>
            </TouchableOpacity>

            {/* Botão de Login */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>ACESSAR</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Versão 1.0.0</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  // Header Style
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#BFDBFE",
    marginTop: 2,
  },

  // Card Style
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },

  // Inputs
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1E293B" },
  eyeIcon: { padding: 4 },

  // Checkbox
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: -5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  checkboxChecked: {
    backgroundColor: "#0056b3",
    borderColor: "#0056b3",
  },
  checkboxLabel: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "500",
  },

  // Buttons
  primaryButton: {
    backgroundColor: "#0056b3",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0056b3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { fontSize: 14, color: "#64748B" },
  footerLink: { fontSize: 14, color: "#0056b3", fontWeight: "700" },

  versionText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 30,
  },

  // Auto Login Splash
  autoLoginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircleLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 10,
  },
  autoLoginText: {
    color: "#BFDBFE",
    fontSize: 14,
    marginTop: 10,
  },
});