import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  totalPaid: number;
  totalToReceive: number;
};

export default function FinancialChart({ totalPaid, totalToReceive }: Props) {
  const size = 150;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = totalPaid + totalToReceive;
  const percent = total > 0 ? totalPaid / total : 0;

  const paidStrokeDashoffset = circumference - circumference * percent;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resumo Geral</Text>

      <Svg width={size} height={size} style={{ alignSelf: "center" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#16A34A"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={paidStrokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>

      <Text style={styles.percentText}>
        {Math.round(percent * 100)}%
      </Text>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: "#16A34A" }]} />
          <Text style={styles.legendLabel}>
            Recebido: {formatCurrency(totalPaid)}
          </Text>
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: "#64748B" }]} />
          <Text style={styles.legendLabel}>
            A receber: {formatCurrency(totalToReceive)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    marginBottom: 16,
  },
  percentText: {
    position: "absolute",
    top: 85,
    alignSelf: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#16A34A",
  },
  legend: {
    marginTop: 20,
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
});
