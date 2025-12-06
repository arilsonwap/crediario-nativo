import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { FONT_SCALING, HIT_SLOP } from "../../utils/accessibility";
import { REPORTS_METRICS } from "./metrics";
import { getReportsColors } from "../../theme/reportsColors";

const THEME = { colors: getReportsColors(false) };
import { ERROR_MESSAGES } from "../../constants/messages";

type ReportErrorCardProps = {
  error: string;
  onRetry: () => void;
};

/**
 * ✅ Componente de erro elegante para relatórios
 * Fallback visual melhorado com animação no botão
 */
export const ReportErrorCard = React.memo<ReportErrorCardProps>(
  ({ error, onRetry }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <View style={styles.errorCard}>
        <Icon name="alert-circle" size={24} color={THEME.colors.danger} />
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle} {...FONT_SCALING.normal}>
            {ERROR_MESSAGES.carregarDados}
          </Text>
          <Text style={styles.errorMessage} {...FONT_SCALING.normal}>
            {error}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={onRetry}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.retryButton}
            hitSlop={HIT_SLOP.large}
            accessibilityLabel={ERROR_MESSAGES.tentarNovamente}
            accessibilityRole="button"
          >
            <Icon name="refresh" size={22} color={THEME.colors.primary} />
            <Text style={styles.retryButtonText} {...FONT_SCALING.normal}>
              {ERROR_MESSAGES.tentarNovamente}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
);

ReportErrorCard.displayName = "ReportErrorCard";

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: REPORTS_METRICS.radius.large,
    padding: REPORTS_METRICS.spacing.lg,
    marginBottom: REPORTS_METRICS.margin.card,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorContent: {
    flex: 1,
    marginLeft: REPORTS_METRICS.spacing.md,
    marginRight: REPORTS_METRICS.spacing.md,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: THEME.colors.textBody,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: REPORTS_METRICS.spacing.md,
    paddingVertical: REPORTS_METRICS.spacing.sm,
    borderRadius: REPORTS_METRICS.radius.medium,
    minHeight: 44,
    minWidth: 120,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  retryButtonText: {
    marginLeft: REPORTS_METRICS.spacing.xs,
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
});

