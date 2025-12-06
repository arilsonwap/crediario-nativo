import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../../utils/formatCurrency";
import { TopCliente } from "../../database/db";
import { REPORTS_THEME } from "./shared";

type Props = {
  cliente: TopCliente;
  index: number;
};

const RankingRowComponent = ({ cliente, index }: Props) => {
  const isFirst = index === 0;
  
  return (
    <View style={styles.row}>
      <View style={[
        styles.badge,
        isFirst && styles.badgeFirst
      ]}>
        <Text 
          style={[
            styles.badgeText,
            isFirst && styles.badgeTextFirst
          ]}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
        >
          {index + 1}º
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} allowFontScaling maxFontSizeMultiplier={1.3}>{cliente.name}</Text>
        <Text style={styles.value} allowFontScaling maxFontSizeMultiplier={1.3}>{formatCurrency(cliente.totalPago)}</Text>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgeFirst: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: REPORTS_THEME.colors.textBody,
  },
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
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: REPORTS_THEME.colors.textTitle,
    flex: 1,
    marginRight: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: REPORTS_THEME.colors.success,
  },
});

