/**
 * ✅ Configuração do React Native CLI
 * 
 * Desativa suporte iOS para react-native-sqlite-storage
 * (Projeto é Android-only, não precisa de configuração iOS)
 * 
 * NOTA: O aviso sobre "dependency.platforms.ios.project" pode ainda aparecer
 * mas é apenas informativo e não afeta o funcionamento do app no Android.
 * O pacote funciona perfeitamente no Android mesmo com esse aviso.
 */

module.exports = {
  dependencies: {
    'react-native-sqlite-storage': {
      platforms: {
        ios: null, // Desativa iOS completamente
      },
    },
  },
};
