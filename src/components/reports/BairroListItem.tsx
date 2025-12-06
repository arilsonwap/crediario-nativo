import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { CrediarioPorBairro } from "../../database/db";
import { REPORTS_THEME } from "./shared";

type Props = {
  item: CrediarioPorBairro;
};

const BairroListItemComponent = ({ item }: Props) => (
  <View style={styles.item}>
    <View style={styles.left}>
      <Icon name="location-sharp" size={14} color={REPORTS_THEME.colors.textBody} style={styles.icon} />
      <Text style={styles.text} allowFontScaling maxFontSizeMultiplier={1.3}>{item.bairro}</Text>
    </View>
    <View style={styles.pill}>
      <Text style={styles.pillText} allowFontScaling maxFontSizeMultiplier={1.3}>{item.quantidade}</Text>
    </View>
  </View>
);

// ✅ Memoização com shallow compare
export const BairroListItem = React.memo<Props>(
  BairroListItemComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.item.bairro === nextProps.item.bairro &&
      prevProps.item.quantidade === nextProps.item.quantidade
    );
  }
);

BairroListItem.displayName = 'BairroListItem';

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: REPORTS_THEME.colors.textBody,
    fontWeight: "500",
  },
  pill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    // ✅ Acessibilidade: garante altura mínima de toque
    minHeight: 28,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: REPORTS_THEME.colors.textTitle,
  },
});

