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
 * 🎨 Skeleton Loader para timeline de cobranças
 * Exibe 7 linhas animadas durante o carregamento
 */
const ChargesTimelineSkeleton = () => {
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
      {[...Array(7)].map((_, index) => (
        <View key={index} style={styles.timelineRow}>
          {/* Coluna da Timeline (Esquerda) */}
          <View style={styles.timelineCol}>
            <View style={[styles.line, index === 6 && styles.lineHidden]} />
            <Animated.View style={[styles.dot, animatedStyle]} />
          </View>

          {/* Card Skeleton (Direita) */}
          <View style={styles.cardWrapper}>
            <Animated.View style={[styles.card, animatedStyle]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Animated.View style={[styles.weekdaySkeleton, animatedStyle]} />
                  <Animated.View style={[styles.dateSkeleton, animatedStyle]} />
                </View>
                <Animated.View style={[styles.badgeSkeleton, animatedStyle]} />
              </View>
              <Animated.View style={[styles.statusSkeleton, animatedStyle]} />
            </Animated.View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 90,
    marginBottom: 16,
  },
  timelineCol: {
    width: 40,
    alignItems: "center",
  },
  line: {
    position: "absolute",
    top: 18,
    bottom: -18,
    width: 2,
    backgroundColor: "#E2E8F0",
    left: 19,
    zIndex: 0,
  },
  lineHidden: {
    display: "none",
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E2E8F0",
    zIndex: 1,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#F1F5F9",
  },
  cardWrapper: {
    flex: 1,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  weekdaySkeleton: {
    height: 18,
    width: "60%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 8,
  },
  dateSkeleton: {
    height: 12,
    width: "40%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  badgeSkeleton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  statusSkeleton: {
    height: 14,
    width: "70%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginTop: 4,
  },
});

export default React.memo(ChargesTimelineSkeleton);



