import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { REPORTS_THEME } from "./shared";

type Props = {
  icon: string;
  message: string;
};

export const EmptyState = React.memo(({ icon, message }: Props) => (
  <View style={styles.container}>
    <Icon name={icon} size={32} color={REPORTS_THEME.colors.textBody} style={styles.icon} />
    <Text style={styles.text} allowFontScaling maxFontSizeMultiplier={1.3}>{message}</Text>
  </View>
));

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    opacity: 0.3,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: REPORTS_THEME.colors.textBody,
    fontWeight: "500",
    textAlign: 'center',
  },
});

