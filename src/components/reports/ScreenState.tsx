import React from "react";
import { View, StyleSheet } from "react-native";
import { InitialLoader } from "./InitialLoader";
import { LOADING_MESSAGES } from "../../constants/messages";

type ScreenStateProps = {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  refreshing?: boolean;
  children: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  showSkeletons?: boolean;
  skeletonCount?: number;
};

// ✅ Função de comparação customizada para React.memo
const areEqual = (prevProps: ScreenStateProps, nextProps: ScreenStateProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.empty === nextProps.empty &&
    prevProps.refreshing === nextProps.refreshing &&
    prevProps.showSkeletons === nextProps.showSkeletons &&
    prevProps.skeletonCount === nextProps.skeletonCount
  );
};

/**
 * ✅ Componente para gerenciar estados da tela (loading, error, empty, content)
 * Simplifica renderização condicional
 * Memoizado com comparação customizada para evitar re-renders desnecessários
 */
export const ScreenState = React.memo<ScreenStateProps>(
  ({
    loading,
    error,
    empty = false,
    refreshing = false,
    children,
    errorComponent,
    emptyComponent,
    showSkeletons = false,
    skeletonCount = 4,
  }) => {
    // ⏳ Loading inicial (não durante refresh)
    if (loading && !refreshing) {
      return (
        <InitialLoader
          message={LOADING_MESSAGES.carregandoRelatorios}
          showSkeletons={showSkeletons}
          skeletonCount={skeletonCount}
        />
      );
    }

    // ⚠️ Erro
    if (error) {
      return <View style={styles.container}>{errorComponent || null}</View>;
    }

    // 📭 Vazio
    if (empty) {
      return <View style={styles.container}>{emptyComponent || null}</View>;
    }

    // ✅ Conteúdo
    return <>{children}</>;
  },
  areEqual
);

ScreenState.displayName = "ScreenState";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

