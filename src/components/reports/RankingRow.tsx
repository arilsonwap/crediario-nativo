import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../../utils/formatCurrency";
import { TopCliente } from "../../database/db";
import { useReportTheme } from "../../theme/reportTheme";

type Props = {
  cliente: TopCliente;
  index: number;
};

const RankingRowComponent = ({ cliente, index }: Props) => {
  const theme = useReportTheme();
  const isFirst = index === 0;
  
  return (
    <View style={styles.row(theme)}>
      <View style={[
        styles.badge(theme),
        isFirst && styles.badgeFirst
      ]}>
        <Text 
          style={[
            styles.badgeText(theme),
            isFirst && styles.badgeTextFirst
          ]}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
        >
          {index + 1}º
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name(theme)} numberOfLines={1} allowFontScaling maxFontSizeMultiplier={1.3}>{cliente.name}</Text>
        <Text style={styles.value(theme)} allowFontScaling maxFontSizeMultiplier={1.3}>{formatCurrency(cliente.totalPago)}</Text>
      </View>
    </View>
  );
};

// ✅ Memoização com shallow compare
export const RankingRow = React.memo<Props>(
  RankingRowComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.cliente.id === nextProps.cliente.id &&
      prevProps.cliente.name === nextProps.cliente.name &&
      prevProps.cliente.totalPago === nextProps.cliente.totalPago &&
      prevProps.index === nextProps.index
    );
  }
);

RankingRow.displayName = 'RankingRow';

const styles = {
  row: (theme: ReturnType<typeof useReportTheme>) => ({
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.background,
  }),
  badge: (theme: ReturnType<typeof useReportTheme>) => ({
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.color.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
  }),
  badgeFirst: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  badgeText: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.textBody,
  }),
  badgeTextFirst: {
    color: "#D97706",
    fontWeight: '800',
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 15,
    fontWeight: "600",
    color: theme.color.textTitle,
    flex: 1,
    marginRight: 8,
  }),
  value: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 15,
    fontWeight: "700",
    color: theme.color.success,
  }),
};

