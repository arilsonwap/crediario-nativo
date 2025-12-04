/**
 * ✅ Analytics e Logging centralizado
 * Facilita rastreamento de eventos e telas
 */

// Importação condicional para evitar erros se Firebase não estiver configurado
let analyticsModule: any = null;

try {
  // @ts-ignore - Firebase pode não estar instalado
  analyticsModule = require("@react-native-firebase/analytics").default;
} catch {
  // Firebase não disponível, usar console.log como fallback
}

/**
 * ✅ Registra visualização de tela
 */
export const trackScreenView = async (screenName: string) => {
  try {
    if (analyticsModule) {
      await analyticsModule().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
    } else {
      console.log(`📊 [Analytics] Screen View: ${screenName}`);
    }
  } catch (error) {
    console.warn("⚠️ Erro ao registrar analytics:", error);
  }
};

/**
 * ✅ Registra evento customizado
 */
export const trackEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    if (analyticsModule) {
      await analyticsModule().logEvent(eventName, params);
    } else {
      console.log(`📊 [Analytics] Event: ${eventName}`, params);
    }
  } catch (error) {
    console.warn("⚠️ Erro ao registrar evento:", error);
  }
};

/**
 * ✅ Registra tempo de carregamento
 */
export const trackLoadTime = async (screenName: string, loadTime: number) => {
  try {
    await trackEvent("screen_load_time", {
      screen_name: screenName,
      load_time_ms: loadTime,
      is_slow: loadTime > 1000,
    });
  } catch (error) {
    console.warn("⚠️ Erro ao registrar tempo de carregamento:", error);
  }
};

