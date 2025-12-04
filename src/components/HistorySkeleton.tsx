import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * 🎨 Skeleton Loader para histórico de backups
 * Exibe 3 linhas animadas durante o carregamento
 */
const HistorySkeleton = () => {
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
    <View style={styles.container}>
      {[1, 2, 3].map((index) => (
        <View key={index}>
          <View style={styles.row}>
            <Animated.View style={[styles.iconSkeleton, animatedStyle]} />
            <View style={styles.textContainer}>
              <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
              <Animated.View style={[styles.dateSkeleton, animatedStyle]} />
            </View>
            <Animated.View style={[styles.checkSkeleton, animatedStyle]} />
          </View>
          {index < 3 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconSkeleton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  titleSkeleton: {
    height: 14,
    width: "60%",
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  dateSkeleton: {
    height: 12,
    width: "40%",
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  checkSkeleton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 60,
  },
});

export default React.memo(HistorySkeleton);

