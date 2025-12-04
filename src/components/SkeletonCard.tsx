import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

// 🎨 Componente Skeleton Card - simula ClientCard durante loading
const SkeletonCard = () => {
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Animação de shimmer (pulsação suave)
    shimmerOpacity.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Repetir infinitamente
      true // Reverter (vai e volta)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <View style={styles.card}>
      {/* Cabeçalho do Card */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {/* Avatar skeleton */}
          <Animated.View style={[styles.avatarSkeleton, animatedStyle]} />
          <View style={{ flex: 1 }}>
            {/* Nome skeleton */}
            <Animated.View style={[styles.nameSkeleton, animatedStyle]} />
            {/* Telefone skeleton */}
            <Animated.View style={[styles.phoneSkeleton, animatedStyle]} />
          </View>
        </View>
        {/* Chevron skeleton */}
        <Animated.View style={[styles.chevronSkeleton, animatedStyle]} />
      </View>

      {/* Divisor */}
      <View style={styles.divider} />

      {/* Informações Inferiores */}
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Animated.View style={[styles.labelSkeleton, animatedStyle]} />
          <Animated.View style={[styles.footerValueSkeleton, animatedStyle]} />
        </View>
        <View style={[styles.footerItem, { alignItems: 'flex-end' }]}>
          <Animated.View style={[styles.labelSkeleton, styles.labelSkeletonShort, animatedStyle]} />
          <Animated.View style={[styles.priceSkeleton, animatedStyle]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  nameSkeleton: {
    height: 18,
    width: "70%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 8,
  },
  phoneSkeleton: {
    height: 14,
    width: "50%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  chevronSkeleton: {
    width: 20,
    height: 20,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerItem: {
    flex: 1,
  },
  labelSkeleton: {
    height: 11,
    width: "60%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 6,
  },
  labelSkeletonShort: {
    width: "40%",
    alignSelf: 'flex-end',
  },
  footerValueSkeleton: {
    height: 14,
    width: "50%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  priceSkeleton: {
    height: 16,
    width: "45%",
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
});

export default React.memo(SkeletonCard);

