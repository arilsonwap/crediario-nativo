import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";

type CardSectionProps = {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

function CardSection({ title, children, style }: CardSectionProps) {
  return (
    <>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={[styles.card, style]}>{children}</View>
    </>
  );
}

export default React.memo(CardSection);

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
});

