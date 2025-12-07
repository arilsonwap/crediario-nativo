import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { CrediarioPorBairro } from "../../database/types";
import { useReportTheme } from "../../theme/reportTheme";

type Props = {
  item: CrediarioPorBairro;
};

const BairroListItemComponent = ({ item }: Props) => {
  const theme = useReportTheme();
  
  return (
    <View style={styles.item(theme)}>
      <View style={styles.left}>
        <Icon name="location-sharp" size={14} color={theme.color.textBody} style={styles.icon} />
        <Text style={styles.text(theme)} allowFontScaling maxFontSizeMultiplier={1.3}>{item.bairro}</Text>
      </View>
      <View style={styles.pill(theme)}>
        <Text style={styles.pillText(theme)} allowFontScaling maxFontSizeMultiplier={1.3}>{item.quantidade}</Text>
      </View>
    </View>
  );
};

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

const styles = {
  item: (theme: ReturnType<typeof useReportTheme>) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.surfaceMuted,
  }),
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 14,
    color: theme.color.textBody,
    fontWeight: "500",
  }),
  pill: (theme: ReturnType<typeof useReportTheme>) => ({
    backgroundColor: theme.color.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    // ✅ Acessibilidade: garante altura mínima de toque
    minHeight: 28,
  }),
  pillText: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.textTitle,
  }),
};

