import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

/* ============================
   Tipagem CORRIGIDA
============================ */

type IoniconName = keyof typeof Ionicons.glyphMap;

type ButtonType =
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "success"
  | "outline";

type ButtonProps = {
  label: string;
  type?: ButtonType;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  icon?: string | { ion: IoniconName };
  fullWidth?: boolean;
};

export const Button = ({
  label,
  type = "primary",
  onPress,
  style,
  disabled = false,
  icon,
  fullWidth = false,
}: ButtonProps) => {

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animate = (to: number) => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: to,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  /* ============================
     Configurações por tipo
  ============================ */

  const buttonConfig = {
    primary: {
      colors: theme.gradients.primary,
      textColor: theme.colors.text,
      shadow: theme.shadow.glow,
    },
    secondary: {
      colors: theme.gradients.secondary,
      textColor: theme.colors.text,
      shadow: theme.shadow.default,
    },
    danger: {
      colors: theme.gradients.danger,
      textColor: theme.colors.text,
      shadow: theme.shadow.glowDanger,
    },
    warning: {
      colors: theme.gradients.warning,
      textColor: theme.colors.textDark,
      shadow: theme.shadow.glowWarning,
    },
    success: {
      colors: theme.gradients.success,
      textColor: theme.colors.text,
      shadow: theme.shadow.glow,
    },
    outline: {
      colors: ["transparent", "transparent"] as const, // <- CORRIGIDO
      textColor: theme.colors.primary,
      shadow: {},
    },
  };

  const config = buttonConfig[type];

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(0.95)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => [
          styles.button,
          type === "outline" && styles.outlineButton,
          pressed && !disabled && { opacity: 0.9 },
        ]}
      >
        {type === "outline" ? (

          /* ============================
             OUTLINE – sem gradient
          ============================ */
          <View style={[styles.inner, config.shadow]}>
            {icon && typeof icon === "string" && (
              <Text style={styles.icon}>{icon}</Text>
            )}

            {icon && typeof icon === "object" && (
              <Ionicons name={icon.ion} size={20} color={config.textColor} />
            )}

            <Text style={[styles.label, { color: config.textColor }]}>
              {label}
            </Text>
          </View>

        ) : (

          /* ============================
             TIPOS COM GRADIENTE
          ============================ */
          <LinearGradient
            colors={config.colors as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.inner, config.shadow]}
          >
            {icon && typeof icon === "string" && (
              <Text style={styles.icon}>{icon}</Text>
            )}

            {icon && typeof icon === "object" && (
              <Ionicons name={icon.ion} size={20} color={config.textColor} />
            )}

            <Text style={[styles.label, { color: config.textColor }]}>
              {label}
            </Text>
          </LinearGradient>

        )}
      </Pressable>
    </Animated.View>
  );
};

/* ============================
   Styles
============================ */

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },

  button: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },

  outlineButton: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },

  inner: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },

  icon: {
    fontSize: 20,
  },

  label: {
    fontSize: theme.font.size.md,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
