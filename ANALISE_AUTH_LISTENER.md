# 🔍 Análise: Registros de onAuthStateChanged

## 📋 Arquivos Analisados

### 1. `index.js`
```javascript
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('Crediario', () => App);
```
✅ **Status**: SEM listener de autenticação
- Apenas registra o componente principal
- Não há `React.StrictMode`
- Não há nenhum listener

---

### 2. `App.tsx`
```typescript
export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
```
✅ **Status**: SEM listener de autenticação
- Apenas inicializa o banco de dados
- Renderiza o `AuthProvider` (único lugar)
- Não há listener direto aqui

---

### 3. `src/contexts/AuthContext.tsx`
```typescript
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const listenerRegistered = React.useRef(false);

  useEffect(() => {
    if (listenerRegistered.current) {
      console.log("⚠️ onAuthStateChanged já registrado, ignorando...");
      return;
    }

    listenerRegistered.current = true;
    console.log("🔐 Registrando listener de autenticação...");

    const unsubscribe = onAuthChange((currentUser) => {
      console.log(
        "🔐 Estado de autenticação:",
        currentUser ? currentUser.email : "Não autenticado"
      );
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      console.log("🛑 Removendo listener de autenticação...");
      listenerRegistered.current = false;
      unsubscribe();
    };
  }, []);
  
  // ...
};
```
⚠️ **Status**: ÚNICO listener registrado, MAS pode estar sendo executado duas vezes

---

## 🔴 PROBLEMA IDENTIFICADO

### O que está acontecendo:

1. **Há apenas UM registro de `onAuthStateChanged`** no projeto (em `AuthContext.tsx`)
2. **MAS o `useEffect` pode estar executando duas vezes** por causa de:
   - React 18 comportamento (mesmo sem StrictMode)
   - Hot Reload durante desenvolvimento
   - Remontagem do componente

3. **A proteção com `useRef` NÃO está funcionando** porque:
   - O `useRef` é resetado quando o componente é remontado
   - Se o `useEffect` executar duas vezes rapidamente, ambas podem passar pela verificação antes de `listenerRegistered.current` ser setado como `true`

---

## ✅ SOLUÇÃO DEFINITIVA

### Arquitetura Correta:

**Usar uma variável global (fora do componente) para garantir que o listener seja registrado apenas UMA vez, mesmo se o componente for remontado:**

```typescript
// ✅ Variável global (fora do componente)
let globalAuthListener: (() => void) | null = null;
let isListenerActive = false;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Verifica variável GLOBAL (não é resetada em remontagens)
    if (isListenerActive) {
      console.log("⚠️ onAuthStateChanged já registrado globalmente, ignorando...");
      return;
    }

    isListenerActive = true;
    console.log("🔐 Registrando listener de autenticação (único)...");

    // Observa mudanças no estado de autenticação
    globalAuthListener = onAuthChange((currentUser) => {
      console.log(
        "🔐 Estado de autenticação:",
        currentUser ? currentUser.email : "Não autenticado"
      );
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      // ✅ Cleanup: remove listener global
      if (globalAuthListener) {
        console.log("🛑 Removendo listener de autenticação...");
        globalAuthListener();
        globalAuthListener = null;
        isListenerActive = false;
      }
    };
  }, []);

  // ... resto do código
};
```

---

## 📊 RESUMO

| Arquivo | Tem Listener? | Status |
|---------|---------------|--------|
| `index.js` | ❌ Não | ✅ OK |
| `App.tsx` | ❌ Não | ✅ OK |
| `AuthContext.tsx` | ✅ Sim (1x) | ⚠️ Precisa proteção global |

**Conclusão**: Há apenas UM listener, mas ele pode ser registrado duas vezes se o componente for remontado. A solução é usar variável global em vez de `useRef`.





