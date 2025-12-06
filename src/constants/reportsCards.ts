/**
 * ✅ Configuração centralizada dos cards de relatórios
 * Facilita manutenção e adição de novos cards
 */

export const CARD_COUNT = 4;

export type CardConfig = {
  index: number;
  title: string;
  icon: string;
  color: string;
  bg: string;
  accessibilityLabel: string;
};

/**
 * Configuração dos cards de relatórios
 * Pode ser expandido dinamicamente no futuro
 */
export const REPORTS_CARDS_CONFIG: CardConfig[] = [
  {
    index: 0,
    title: "Fluxo de Caixa",
    icon: "wallet-outline",
    color: "#0056b3", // primary
    bg: "#DBEAFE", // iconBgBlue
    accessibilityLabel: "Card de Fluxo de Caixa",
  },
  {
    index: 1,
    title: "Performance Mensal",
    icon: "trending-up-outline",
    color: "#7C3AED",
    bg: "#F3E8FF", // iconBgPurple
    accessibilityLabel: "Card de Performance Mensal",
  },
  {
    index: 2,
    title: "Top 3 Clientes",
    icon: "trophy-outline",
    color: "#D97706",
    bg: "#FFEDD5", // iconBgOrange
    accessibilityLabel: "Card de Top 3 Clientes do Mês",
  },
  {
    index: 3,
    title: "Distribuição por Bairro",
    icon: "map-outline",
    color: "#16A34A", // success
    bg: "#DCFCE7", // iconBgGreen
    accessibilityLabel: "Card de Distribuição de Clientes por Bairro",
  },
];



