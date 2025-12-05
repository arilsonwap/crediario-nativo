import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * 🎣 Hook para analytics de telas
 * Estrutura preparada para integração com bibliotecas de analytics
 */
export const useScreenAnalytics = (screenName: string) => {
  useFocusEffect(
    useCallback(() => {
      // ✅ Log screen view
      if (__DEV__) {
        console.log(`📊 [Analytics] Screen View: ${screenName}`);
      }

      // TODO: Integrar com biblioteca de analytics
      // Exemplo com Firebase Analytics:
      // analytics().logScreenView({ screen_name: screenName });
      // Exemplo com Mixpanel:
      // mixpanel.track('Screen View', { screen: screenName });

      return () => {
        // ✅ Log screen exit
        if (__DEV__) {
          console.log(`📊 [Analytics] Screen Exit: ${screenName}`);
        }

        // TODO: Log screen exit se necessário
      };
    }, [screenName])
  );
};

/**
 * 🎣 Hook para log de eventos customizados
 */
export const useEventAnalytics = () => {
  const logEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (__DEV__) {
      console.log(`📊 [Analytics] Event: ${eventName}`, params);
    }

    // TODO: Integrar com biblioteca de analytics
    // Exemplo:
    // analytics().logEvent(eventName, params);
  }, []);

  return { logEvent };
};



