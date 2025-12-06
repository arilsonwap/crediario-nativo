import React from "react";
import { View, ScrollView, StatusBar, RefreshControl, StyleSheet } from "react-native";
import { useReportTheme } from "../../theme/reportTheme";
import { ScreenState } from "./ScreenState";
import { AnimationProvider } from "../../hooks/useCardAnimation";
import type { AnimationOrchestrator } from "../../hooks/useReportAnimations";

type ReportsLayoutProps = {
  children: React.ReactNode;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  animations: AnimationOrchestrator;
  errorComponent?: React.ReactNode;
  skeletonCount?: number;
};

/**
 * ✅ Layout estruturado para ReportsScreen
 * Encapsula toda estrutura visual: ScrollView, StatusBar, ScreenState, AnimationProvider
 * ReportsScreen apenas compõe conteúdo
 */
export const ReportsLayout = React.memo<ReportsLayoutProps>(
  ({
    children,
    loading,
    error,
    refreshing,
    onRefresh,
    animations,
    errorComponent,
    skeletonCount = 4,
  }) => {
    const theme = useReportTheme();

    const styles = React.useMemo(
      () =>
        StyleSheet.create({
          root: {
            flex: 1,
            backgroundColor: theme.color.background,
          },
          headerBackground: {
            backgroundColor: theme.color.primary,
            height: 40,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: -1,
          },
          container: {
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xl,
            paddingBottom: theme.spacing.xxl,
          },
        }),
      [theme]
    );

    const refreshControlColors = React.useMemo(
      () => [theme.color.primary],
      [theme.color.primary]
    );

    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={theme.color.primary} />
        <View style={styles.headerBackground} />

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={refreshControlColors}
              tintColor={theme.color.primary}
            />
          }
        >
          <AnimationProvider value={{ getAnimatedStyle: animations.getAnimatedStyle }}>
            <ScreenState
              loading={loading}
              error={error}
              empty={false}
              refreshing={refreshing}
              showSkeletons={true}
              skeletonCount={skeletonCount}
              errorComponent={errorComponent}
            >
              {children}
            </ScreenState>
          </AnimationProvider>
        </ScrollView>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.loading === nextProps.loading &&
      prevProps.error === nextProps.error &&
      prevProps.refreshing === nextProps.refreshing &&
      prevProps.skeletonCount === nextProps.skeletonCount &&
      prevProps.children === nextProps.children
    );
  }
);

ReportsLayout.displayName = "ReportsLayout";

