import React from "react";
import { View, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const ShimmerCard = () => {
  const translateX = useSharedValue(-200);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar} />
        <View style={styles.info}>
          <View style={styles.line1} />
          <View style={styles.line2} />
        </View>
        <View style={styles.value} />
      </View>
      <View style={styles.overlay}>
        <Animated.View style={[styles.shimmer, animatedStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.5)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    height: 82,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    height: "100%",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  line1: {
    height: 16,
    width: "60%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  line2: {
    height: 12,
    width: "40%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  value: {
    height: 16,
    width: 80,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmer: {
    width: 200,
    height: "100%",
  },
});

export default React.memo(ShimmerCard);

