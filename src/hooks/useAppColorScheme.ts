import { useColorScheme } from "react-native";

/**
 * ✅ Hook customizado para obter o color scheme do sistema
 * Retorna 'light' ou 'dark' baseado nas preferências do usuário
 * 
 * @returns 'light' | 'dark'
 * 
 * @example
 * const colorScheme = useAppColorScheme();
 * const isDark = colorScheme === 'dark';
 * const colors = getReportsColors(isDark);
 */
export const useAppColorScheme = (): 'light' | 'dark' => {
  const systemColorScheme = useColorScheme();
  // ✅ Retorna 'light' como padrão se o sistema não fornecer um valor
  return systemColorScheme === 'dark' ? 'dark' : 'light';
};



