import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDB } from './src/database/db';
import { registerNetworkMonitor, unregisterNetworkMonitor } from './src/services/syncOptimizer';

export default function App() {
  useEffect(() => {
    // ✅ Inicializar banco de dados
    initDB();
    
    // ✅ Registrar monitor de rede para sincronização otimizada
    registerNetworkMonitor();
    
    // ✅ Cleanup: remover monitor ao desmontar (raramente acontece)
    return () => {
      unregisterNetworkMonitor();
    };
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
