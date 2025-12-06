import { useMemo } from "react";
import { REPORTS_LABELS } from "../constants/reportsAccessibility";

type CrescimentoData = {
  percentual: number;
  cresceu: boolean;
};

type ThemeColors = {
  success: string;
  danger: string;
};

type PerformanceDataResult = {
  icon: "caret-up" | "caret-down";
  color: string;
  percentual: number;
  displayLabel: string; // ✅ Label já traduzido, pronto para uso na UI
};

/**
 * ✅ Hook dedicado para calcular dados de performance
 * Valida percentual, calcula fallback, define cor e texto
 * Retorna estrutura limpa e pronta para uso na UI
 */
export const usePerformanceData = (
  crescimento: CrescimentoData,
  themeColors: ThemeColors
): PerformanceDataResult => {
  return useMemo(() => {
    // ✅ Valida e calcula percentual com fallback seguro
    const percentual = Math.abs(crescimento.percentual || 0);
    const isValid = !isNaN(percentual) && isFinite(percentual);
    const validPercentual = isValid ? percentual : 0;

    // ✅ Define cor baseada em crescimento
    const color = crescimento.cresceu ? themeColors.success : themeColors.danger;

    // ✅ Define ícone baseado em crescimento
    const icon: "caret-up" | "caret-down" = crescimento.cresceu ? "caret-up" : "caret-down";

    // ✅ Define label traduzido diretamente (pronto para UI)
    const displayLabel = crescimento.cresceu 
      ? REPORTS_LABELS.crescimento 
      : REPORTS_LABELS.retracao;

    return {
      icon,
      color,
      percentual: validPercentual,
      displayLabel,
    };
  }, [crescimento, themeColors.success, themeColors.danger]);
};



