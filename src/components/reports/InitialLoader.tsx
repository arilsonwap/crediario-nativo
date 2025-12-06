import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

type InitialLoaderProps = {
  message?: string;
  showSkeletons?: boolean;
  skeletonCount?: number;
};

/**
 * ✅ Componente de loading inicial para ReportsScreen
 * Suporta ActivityIndicator simples ou skeleton loaders
 */
export const InitialLoader = React.memo<InitialLoaderProps>(
  ({ message = "Carregando relatórios...", showSkeletons = false, skeletonCount = 4 }) => {
    if (showSkeletons) {
      return <SkeletonLoader count={skeletonCount} message={message} />;
    }

    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.text} allowFontScaling maxFontSizeMultiplier={1.3}>
          {message}
        </Text>
      </View>
    );
  }
);

InitialLoader.displayName = "InitialLoader";

/**
 * Skeleton Loader para cards de relatório
 */
const SkeletonLoader = ({ count, message }: { count: number; message: string }) => {
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View key={index} style={[styles.skeletonCard, animatedStyle]}>
          {/* Header skeleton */}
          <View style={styles.skeletonHeader}>
            <Animated.View style={[styles.skeletonIcon, animatedStyle]} />
            <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
          </View>
          {/* Content skeleton */}
          <View style={styles.skeletonContent}>
            <Animated.View style={[styles.skeletonRow, animatedStyle]} />
            <Animated.View style={[styles.skeletonRow, styles.skeletonRowShort, animatedStyle]} />
          </View>
        </Animated.View>
      ))}
      <Text style={styles.skeletonMessage} allowFontScaling maxFontSizeMultiplier={1.3}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    marginRight: 12,
  },
  skeletonTitle: {
    height: 16,
    width: 150,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  skeletonContent: {
    gap: 12,
  },
  skeletonRow: {
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  skeletonRowShort: {
    width: "60%",
  },
  skeletonMessage: {
    marginTop: 20,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
});

