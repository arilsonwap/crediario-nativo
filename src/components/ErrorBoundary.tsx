import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { Colors } from "../theme/colors";
import { Metrics } from "../theme/metrics";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ ErrorBoundary capturou erro:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultFallback;
      return (
        <FallbackComponent error={this.state.error || undefined} resetError={this.resetError} />
      );
    }

    return this.props.children;
  }
}

const DefaultFallback: React.FC<{ error?: Error; resetError: () => void }> = ({
  error,
  resetError,
}) => (
  <View style={styles.container}>
    <View style={styles.content}>
      <Icon name="alert-circle-outline" size={64} color={Colors.error} />
      <Text style={styles.title}>Ops! Algo deu errado</Text>
      <Text style={styles.message}>
        {error?.message || "Ocorreu um erro inesperado. Tente novamente."}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={resetError}
        activeOpacity={0.7}
        hitSlop={Metrics.hitSlop}
        accessibilityLabel="Tentar novamente"
        accessibilityRole="button"
      >
        <Icon name="refresh" size={20} color={Colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Tentar Novamente</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Metrics.spacing.l,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: Metrics.spacing.m,
    marginBottom: Metrics.spacing.s,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Metrics.spacing.l,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Metrics.spacing.l,
    paddingVertical: Metrics.spacing.s,
    borderRadius: Metrics.cardRadius / 2,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ErrorBoundary;

