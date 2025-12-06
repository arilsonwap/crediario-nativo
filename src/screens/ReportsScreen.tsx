import React, { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useReportsDashboard } from "../hooks/useReportsDashboard";
import { useReportAnimations } from "../hooks/useReportAnimations";
import { usePerformanceData } from "../hooks/usePerformanceData";
import { useDashboardRefresh } from "../hooks/useDashboardRefresh";
import { useReportTheme } from "../theme/reportTheme";
import { useReportCards } from "../hooks/useReportCards";

import { ReportErrorCard, ReportsLayout } from "../components/reports";

// 🔢 Quantidade de cards exibidos
import { CARD_COUNT } from "../constants/reportsCards";
import { ERROR_MESSAGES } from "../constants/messages";

type RootStackParamList = {
  Reports: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Reports">;

export default function ReportsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useReportTheme();

  // 🎨 Theme colors
  const { primary, headerText, success, danger } = theme.color;

  // 📊 Dashboard
  const {
    data,
    error,
    loading,
    refresh,
    loadData: reloadDashboard,
  } = useReportsDashboard();

  // ✅ Dados normalizados (data sempre existe, mas garantimos valores padrão)
  const normalizedData = useMemo(
    () => ({
      totalHoje: data.totalHoje ?? 0,
      totalMesAtual: data.totalMesAtual ?? 0,
      totalMesAnterior: data.totalMesAnterior ?? 0,
      totalAReceber: data.totalAReceber ?? 0,
      topClientes: data.topClientes ?? [],
      crediariosPorBairro: data.crediariosPorBairro ?? [],
      crescimento: data.crescimento ?? { percentual: 0, cresceu: false },
    }),
    [data]
  );

  // 🎞️ Animation settings
  const animationSettings = useMemo(
    () => ({
      count: CARD_COUNT,
      durationFade: 120,
      durationSlide: 220,
      stagger: 80,
    }),
    []
  );

  // 🎞️ Animations
  const animations = useReportAnimations(animationSettings);
  const { stagger, fadeOut } = animations;

  // 🔃 Refresh
  const { refreshing, onRefresh } = useDashboardRefresh(refresh, fadeOut);

  // 📈 Performance
  const performance = usePerformanceData(normalizedData.crescimento, {
    success,
    danger,
  });

  // 🧱 Cards
  const reportCards = useReportCards({
    data: normalizedData,
    theme,
    performance,
  });

  // 🎨 Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Relatórios Financeiros",
      headerStyle: {
        backgroundColor: primary,
        elevation: 0,
        shadowOpacity: 0,
      } as any,
      headerTintColor: headerText,
      headerTitleStyle: {
        fontWeight: "700",
        fontSize: 18,
      },
      headerShadowVisible: false,
    });
  }, [navigation, primary, headerText]);

  // 🔄 Load on Focus
  useFocusEffect(
    useCallback(() => {
      reloadDashboard();
    }, [reloadDashboard])
  );

  // 🎞️ Animation effect
  const canAnimate = !loading && !error && !refreshing;
  useEffect(() => {
    if (canAnimate) {
      stagger();
    }
  }, [canAnimate, stagger]);

  // 🧩 Layout
  return (
    <ReportsLayout
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={onRefresh}
      animations={animations}
      skeletonCount={CARD_COUNT}
      errorComponent={
        <ReportErrorCard
          error={error || ERROR_MESSAGES.carregarDados}
          onRetry={reloadDashboard}
        />
      }
    >
      {reportCards ?? null}
    </ReportsLayout>
  );
}
