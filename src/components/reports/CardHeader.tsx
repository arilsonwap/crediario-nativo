import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

export type CardHeaderProps = {
  title: string;
  icon: string;
  color: string;
  bg: string;
};

// ✅ Componente CardHeader memoizado com comparação customizada
export const CardHeader = React.memo<CardHeaderProps>(
  ({ title, icon, color, bg }) => (
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: bg }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={styles.cardTitle} allowFontScaling maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
    </View>
  ),
  (prevProps, nextProps) =>
    prevProps.title === nextProps.title &&
    prevProps.icon === nextProps.icon &&
    prevProps.color === nextProps.color &&
    prevProps.bg === nextProps.bg
);

CardHeader.displayName = "CardHeader";

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: -0.3,
  },
});

