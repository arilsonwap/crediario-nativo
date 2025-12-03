import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme/theme";

type CalendarIconProps = {
  size?: number;
  showMonth?: boolean;
};

export const CalendarIcon = ({ size = 64, showMonth = true }: CalendarIconProps) => {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase();
  
  const scaleFactor = size / 64; // Escala baseada no tamanho padrão

  return (
    <View style={[styles.container, { 
      width: size, 
      height: size,
      borderRadius: size * 0.25,
    }]}>
      {/* Header vermelho do calendário */}
      {showMonth && (
        <View style={[styles.header, {
          height: size * 0.3,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
        }]}>
          <Text style={[styles.month, { 
            fontSize: size * 0.16,
            letterSpacing: size * 0.01,
          }]}>
            {month}
          </Text>
        </View>
      )}
      
      {/* Corpo branco com o número do dia */}
      <View style={[styles.body, {
        flex: 1,
        borderBottomLeftRadius: size * 0.25,
        borderBottomRightRadius: size * 0.25,
        paddingTop: showMonth ? 0 : size * 0.15,
      }]}>
        <Text style={[styles.day, { 
          fontSize: size * (showMonth ? 0.45 : 0.55),
          lineHeight: size * (showMonth ? 0.5 : 0.6),
        }]}>
          {day}
        </Text>
      </View>

      {/* Argolas do calendário */}
      <View style={[styles.rings, { top: size * 0.08 }]}>
        <View style={[styles.ring, {
          width: size * 0.12,
          height: size * 0.18,
          borderRadius: size * 0.06,
          left: size * 0.15,
        }]} />
        <View style={[styles.ring, {
          width: size * 0.12,
          height: size * 0.18,
          borderRadius: size * 0.06,
          right: size * 0.15,
        }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: "relative",
  },
  header: {
    backgroundColor: "#E74C3C",
    justifyContent: "center",
    alignItems: "center",
  },
  month: {
    color: "#FFF",
    fontWeight: "900",
  },
  body: {
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  day: {
    color: "#2C3E50",
    fontWeight: "900",
  },
  rings: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
  },
  ring: {
    position: "absolute",
    backgroundColor: "#34495E",
  },
});

// Versão simplificada sem mês (apenas número)
export const CalendarIconSimple = ({ size = 48 }: { size?: number }) => {
  return <CalendarIcon size={size} showMonth={false} />;
};

// Versão pequena para badges
export const CalendarIconSmall = () => {
  return <CalendarIcon size={40} showMonth={true} />;
};