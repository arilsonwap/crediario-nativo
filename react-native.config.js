/**
 * ✅ Configuração do React Native CLI
 * 
 * Corrige avisos de pacotes legados que não seguem a estrutura mais recente
 * 
 * O aviso sobre "dependency.platforms.ios.project" do react-native-sqlite-storage
 * pode ser ignorado com segurança - o pacote funciona normalmente no Android.
 */

module.exports = {
  dependencies: {
    // ✅ Suprime configuração inválida do react-native-sqlite-storage
    // Este pacote usa estrutura antiga que não é mais suportada pelo RN CLI
    // Mas funciona perfeitamente no Android sem essa configuração
    'react-native-sqlite-storage': {
      platforms: {
        // Remove configuração iOS inválida que causa o aviso
        ios: {
          // Configuração vazia - o pacote será linkado automaticamente
        },
      },
    },
  },
};

