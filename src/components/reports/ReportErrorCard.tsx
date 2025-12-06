import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { FONT_SCALING, HIT_SLOP } from "../../utils/accessibility";
import { useReportTheme } from "../../theme/reportTheme";
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
    const theme = useReportTheme();
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
      <View style={styles.errorCard(theme)}>
        <Icon name="alert-circle" size={24} color={theme.color.danger} />
        <View style={styles.errorContent(theme)}>
          <Text style={styles.errorTitle(theme)} {...FONT_SCALING.normal}>
            {ERROR_MESSAGES.carregarDados}
          </Text>
          <Text style={styles.errorMessage(theme)} {...FONT_SCALING.normal}>
            {error}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={onRetry}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.retryButton(theme)}
            hitSlop={HIT_SLOP.large}
            accessibilityLabel={ERROR_MESSAGES.tentarNovamente}
            accessibilityRole="button"
          >
            <Icon name="refresh" size={22} color={theme.color.primary} />
            <Text style={styles.retryButtonText(theme)} {...FONT_SCALING.normal}>
              {ERROR_MESSAGES.tentarNovamente}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
);

ReportErrorCard.displayName = "ReportErrorCard";

const styles = {
  errorCard: (theme: ReturnType<typeof useReportTheme>) => ({
    backgroundColor: theme.color.errorBg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.margin.card,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.color.errorBorder,
  }),
  errorContent: (theme: ReturnType<typeof useReportTheme>) => ({
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.md,
  }),
  errorTitle: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 15,
    fontWeight: "700",
    color: theme.color.danger,
    marginBottom: 4,
  }),
  errorMessage: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 13,
    color: theme.color.textBody,
  }),
  retryButton: (theme: ReturnType<typeof useReportTheme>) => ({
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    minHeight: 44,
    minWidth: 120,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.color.primary,
  }),
  retryButtonText: (theme: ReturnType<typeof useReportTheme>) => ({
    marginLeft: theme.spacing.xs,
    fontSize: 13,
    fontWeight: "600",
    color: theme.color.primary,
  }),
};

