import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  StatusBar,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { formatCurrency } from "../utils/formatCurrency";
import { getReportsDashboard } from "../services/reportsService";
import type { ReportsDashboardData } from "../services/reportsService";
import {
  ReportCard,
  ReportValue,
  ReportDivider,
  ReportErrorCard,
  RankingRow,
  BairroListItem,
  EmptyState,
  ScreenState,
  REPORTS_METRICS,
} from "../components/reports";
import { getReportsColors } from "../theme/reportsColors";
import { applyFontScaling } from "../utils/accessibilityHelpers";
import { CARD_COUNT, REPORTS_CARDS_CONFIG } from "../constants/reportsCards";
import { REPORTS_LABELS } from "../constants/reportsAccessibility";
import { ERROR_MESSAGES, LOADING_MESSAGES } from "../constants/messages";
import { useAppColorScheme } from "../hooks/useAppColorScheme";
import { useReportCardAnimations } from "../hooks/useReportCardAnimations";

// ✅ Tipos locais
type PerformanceData = {
  percentual: number;
  cresceu: boolean;
};

export default function ReportsScreen() {
  const navigation = useNavigation();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  
  // ✅ Tema de cores dinâmico baseado no color scheme
  const THEME = useMemo(() => ({
    colors: getReportsColors(isDark),
  }), [isDark]);
  
  const [dashboardData, setDashboardData] = useState<ReportsDashboardData>({
    totalHoje: 0,
    totalMesAtual: 0,
    totalMesAnterior: 0,
    totalAReceber: 0,
    topClientes: [],
    crediariosPorBairro: [],
    crescimento: { percentual: 0, cresceu: false },
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Configuração do Header dinâmica baseada no tema
  const headerConfig = useMemo(() => ({
    title: "Relatórios Financeiros",
    headerStyle: { backgroundColor: THEME.colors.primary, elevation: 0, shadowOpacity: 0 },
    headerTintColor: THEME.colors.headerText,
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 18 },
    headerShadowVisible: false,
  }), [THEME.colors.primary, THEME.colors.headerText]);

  // 🎨 Configuração do Header (memoizada para evitar recriação)
  useLayoutEffect(() => {
    navigation.setOptions(headerConfig);
  }, [navigation, headerConfig]);

  // ✅ Carrega dados usando o service (100% desacoplado da camada de banco)
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const data = await getReportsDashboard();
      setDashboardData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.carregarRelatorio;
      console.error(`❌ [ReportsScreen] ${ERROR_MESSAGES.erroCritico}:`, errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ✅ Hook de animações compartilhado (para cancelar no refresh)
  const {
    cancelAnimations,
    runStaggerAnimation,
    getCardAnimationStyle,
  } = useReportCardAnimations(CARD_COUNT);

  // ✅ Anima cards quando dados são carregados
  useEffect(() => {
    if (!loading && !error && !refreshing) {
      runStaggerAnimation();
    }
  }, [loading, error, refreshing, runStaggerAnimation]);

  const onRefresh = useCallback(async () => {
    // ✅ Cancela animações em andamento ao iniciar refresh
    cancelAnimations();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    // ✅ Anima novamente após refresh (será acionado pelo useEffect acima)
  }, [loadData, cancelAnimations]);
  
  // ✅ Memoiza RefreshControl para evitar recriação
  // Cores dinâmicas baseadas no tema
  const refreshControlColors = useMemo(() => [THEME.colors.primary], [THEME.colors.primary]);
  
  const refreshControl = useMemo(
    () => (
      <RefreshControl 
        refreshing={refreshing} 
        onRefresh={onRefresh} 
        colors={refreshControlColors} 
        tintColor={THEME.colors.primary} 
      />
    ),
    [refreshing, onRefresh, refreshControlColors, THEME.colors.primary]
  );

  // ✅ Memoizar valores calculados de performance
  // ✅ Fallback seguro para números válidos
  // THEME.colors agora é dinâmico e precisa estar nas dependências
  const performanceData = useMemo(() => {
    const percentual = Math.abs(dashboardData.crescimento.percentual || 0);
    const isValid = !isNaN(percentual) && isFinite(percentual);
    
    return {
      color: dashboardData.crescimento.cresceu ? THEME.colors.success : THEME.colors.danger,
      icon: dashboardData.crescimento.cresceu ? "caret-up" : "caret-down",
      text: dashboardData.crescimento.cresceu ? REPORTS_LABELS.crescimento : REPORTS_LABELS.retracao,
      percentual: isValid ? percentual : 0,
    };
  }, [dashboardData.crescimento, THEME.colors.success, THEME.colors.danger]);

  // ✅ Memoizar renderização de topClientes
  const topClientesContent = useMemo(() => {
    if (dashboardData.topClientes.length === 0) {
      return <EmptyState icon="trophy-outline" message={REPORTS_LABELS.nenhumPagamentoMes} />;
    }
    return dashboardData.topClientes.map((cliente, index) => (
      <RankingRow key={cliente.id} cliente={cliente} index={index} />
    ));
  }, [dashboardData.topClientes]);

  // ✅ Memoizar renderização de crediariosPorBairro
  const bairrosContent = useMemo(() => {
    if (dashboardData.crediariosPorBairro.length === 0) {
      return <EmptyState icon="map-outline" message={REPORTS_LABELS.nenhumBairroCadastrado} />;
    }
    return dashboardData.crediariosPorBairro.map((item, index) => (
      <BairroListItem key={index} item={item} />
    ));
  }, [dashboardData.crediariosPorBairro]);

  // ✅ Styles dinâmicos baseados no tema
  const styles = useMemo(() => {
    const colors = THEME.colors;
    return StyleSheet.create({
      root: {
        flex: 1,
        backgroundColor: colors.background,
      },
      headerBackground: {
        backgroundColor: colors.primary,
        height: 40,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: -1,
      },
      container: {
        paddingHorizontal: REPORTS_METRICS.padding.container,
        paddingTop: REPORTS_METRICS.padding.container,
        paddingBottom: REPORTS_METRICS.spacing.xxl,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      column: {
        flex: 1,
      },
      verticalDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
        marginHorizontal: REPORTS_METRICS.spacing.lg,
      },
      horizontalDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: REPORTS_METRICS.spacing.lg,
      },
      rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      label: {
        fontSize: 13,
        color: colors.textBody,
        marginBottom: 4,
        fontWeight: "500",
      },
      labelSmall: {
        fontSize: 12,
        color: colors.textBody,
        marginBottom: 2,
      },
      valueLarge: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.textTitle,
        letterSpacing: -0.5,
      },
      valueHighlight: {
        fontSize: 18,
        fontWeight: "700",
      },
      valueSmall: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.textTitle,
      },
      growthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: REPORTS_METRICS.spacing.lg,
        padding: REPORTS_METRICS.spacing.md,
        borderRadius: REPORTS_METRICS.radius.medium,
      },
      growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: REPORTS_METRICS.spacing.md,
      },
      growthPercent: {
        fontSize: 18,
        fontWeight: "800",
        marginLeft: REPORTS_METRICS.spacing.xs,
      },
      growthText: {
        fontSize: 13,
        color: colors.textBody,
        flex: 1,
      },
      comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: REPORTS_METRICS.spacing.sm,
      },
      comparisonItem: {
        alignItems: 'center',
      },
    });
  }, [THEME.colors]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} />
      
      {/* Background Decorativo Superior (Opcional, dá um acabamento pro header) */}
      <View style={styles.headerBackground} />

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <ScreenState
          loading={loading}
          error={error}
          empty={false}
          refreshing={refreshing}
          showSkeletons={true}
          skeletonCount={CARD_COUNT}
          errorComponent={
            <ReportErrorCard error={error || ERROR_MESSAGES.carregarDados} onRetry={loadData} />
          }
        >
          {/* 📊 Conteúdo principal */}
          <>
            {/* 📊 Card 1: Fluxo de Caixa */}
            <ReportCard
              title={REPORTS_CARDS_CONFIG[0].title}
              icon={REPORTS_CARDS_CONFIG[0].icon}
              color={REPORTS_CARDS_CONFIG[0].color}
              bg={REPORTS_CARDS_CONFIG[0].bg}
              index={REPORTS_CARDS_CONFIG[0].index}
              animationStyle={getCardAnimationStyle(REPORTS_CARDS_CONFIG[0].index)}
            >
              <View style={styles.row}>
                <ReportValue
                  label={REPORTS_LABELS.recebidoHoje}
                  value={formatCurrency(dashboardData.totalHoje)}
                />
                <ReportDivider orientation="vertical" />
                <ReportValue
                  label={REPORTS_LABELS.totalMesAtual}
                  value={formatCurrency(dashboardData.totalMesAtual)}
                />
              </View>

              <ReportDivider orientation="horizontal" />

              <View style={styles.rowBetween}>
                <Text style={styles.label} {...applyFontScaling("normal")}>
                  {REPORTS_LABELS.totalPendenteReceber}
                </Text>
                <Text style={[styles.valueHighlight, { color: THEME.colors.warning }]} {...applyFontScaling("large")}>
                  {formatCurrency(dashboardData.totalAReceber)}
                </Text>
              </View>
            </ReportCard>

            {/* 📈 Card 2: Performance */}
            <ReportCard
              title={REPORTS_CARDS_CONFIG[1].title}
              icon={REPORTS_CARDS_CONFIG[1].icon}
              color={REPORTS_CARDS_CONFIG[1].color}
              bg={REPORTS_CARDS_CONFIG[1].bg}
              index={REPORTS_CARDS_CONFIG[1].index}
              animationStyle={getCardAnimationStyle(REPORTS_CARDS_CONFIG[1].index)}
            >
              <View style={styles.growthContainer}>
                <View style={styles.growthBadge}>
                  <Icon 
                    name={performanceData.icon} 
                    size={20} 
                    color={performanceData.color} 
                  />
                  <Text style={[styles.growthPercent, { color: performanceData.color }]} {...applyFontScaling("large")}>
                    {performanceData.percentual}%
                  </Text>
                </View>
                <Text style={styles.growthText} {...applyFontScaling("normal")}>
                  {performanceData.text} {REPORTS_LABELS.emRelacaoMesAnterior}
                </Text>
              </View>

              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.labelSmall} {...applyFontScaling("normal")}>{REPORTS_LABELS.mesAnterior}</Text>
                  <Text style={styles.valueSmall} {...applyFontScaling("normal")}>{formatCurrency(dashboardData.totalMesAnterior)}</Text>
                </View>
                <Icon name="arrow-forward" size={16} color={THEME.colors.textBody} style={{ opacity: 0.5 }} />
                <View style={styles.comparisonItem}>
                  <Text style={styles.labelSmall} {...applyFontScaling("normal")}>{REPORTS_LABELS.mesAtual}</Text>
                  <Text style={[styles.valueSmall, { color: THEME.colors.primary }]} {...applyFontScaling("normal")}>{formatCurrency(dashboardData.totalMesAtual)}</Text>
                </View>
              </View>
            </ReportCard>

            {/* 🏆 Card 3: Top Clientes */}
            <ReportCard
              title={REPORTS_CARDS_CONFIG[2].title}
              icon={REPORTS_CARDS_CONFIG[2].icon}
              color={REPORTS_CARDS_CONFIG[2].color}
              bg={REPORTS_CARDS_CONFIG[2].bg}
              index={REPORTS_CARDS_CONFIG[2].index}
              animationStyle={getCardAnimationStyle(REPORTS_CARDS_CONFIG[2].index)}
            >
              {topClientesContent}
            </ReportCard>

            {/* 🏘️ Card 4: Geografia */}
            <ReportCard
              title={REPORTS_CARDS_CONFIG[3].title}
              icon={REPORTS_CARDS_CONFIG[3].icon}
              color={REPORTS_CARDS_CONFIG[3].color}
              bg={REPORTS_CARDS_CONFIG[3].bg}
              index={REPORTS_CARDS_CONFIG[3].index}
              animationStyle={getCardAnimationStyle(REPORTS_CARDS_CONFIG[3].index)}
              marginBottom={REPORTS_METRICS.margin.section}
            >
              {bairrosContent}
            </ReportCard>
          </>
        </ScreenState>
      </ScrollView>
    </View>
  );
}