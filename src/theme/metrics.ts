export const Metrics = {
  // ✅ Altura exata do card: padding vertical (14*2) + avatar (42) = 70
  // getItemLayout precisa incluir marginBottom (12) para offset correto
  cardHeight: 70,
  cardMarginBottom: 12,
  // ✅ Altura total para getItemLayout (card + margin)
  cardTotalHeight: 82, // 70 + 12
  cardRadius: 16,
  avatarSize: 42,
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  hitSlop: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
} as const;

