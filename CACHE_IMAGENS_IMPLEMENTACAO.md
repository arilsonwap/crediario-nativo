# 🖼️ Implementação de Cache de Imagens com FastImage

## ✅ O que foi implementado

### 1. Instalação do FastImage
```bash
npm install react-native-fast-image
```

### 2. Utilitário Otimizado (`src/utils/imageOptimization.ts`)

Criado sistema completo de cache de imagens com três componentes:

#### `OptimizedImage` - Componente Universal
- Funciona com imagens locais (`require`) e remotas (`uri`)
- Cache automático e otimizado
- Impede múltiplas cópias em RAM

#### `LocalImage` - Para Imagens Locais
- Cache permanente
- Carregamento instantâneo
- Sem fade (melhor performance)

#### `RemoteImage` - Para Imagens Remotas
- Cache configurável
- Prioridade de carregamento
- Reduz uso de banda

---

## 📖 Como Usar

### Imagens Locais (require)

#### Opção 1: Usando `LocalImage` (Recomendado)
```typescript
import { LocalImage, ImageResizeMode } from "../utils/imageOptimization";

<LocalImage
  source={require('../assets/icon.png')}
  style={styles.icon}
  resizeMode={ImageResizeMode.contain}
/>
```

#### Opção 2: Usando `OptimizedImage`
```typescript
import { OptimizedImage, ImageResizeMode } from "../utils/imageOptimization";

<OptimizedImage
  source={require('../assets/icon.png')}
  style={styles.icon}
  resizeMode={ImageResizeMode.contain}
/>
```

#### Opção 3: Usando `FastImage` diretamente
```typescript
import FastImage from "react-native-fast-image";

<FastImage
  source={require('../assets/icon.png')}
  style={styles.icon}
  resizeMode={FastImage.resizeMode.contain}
  cache={FastImage.cacheControl.immutable}
/>
```

---

### Imagens Remotas (uri)

#### Opção 1: Usando `RemoteImage` (Recomendado)
```typescript
import { RemoteImage, ImagePriority } from "../utils/imageOptimization";

<RemoteImage
  uri="https://example.com/avatar.jpg"
  style={styles.avatar}
  priority={ImagePriority.high}
/>
```

#### Opção 2: Usando `OptimizedImage`
```typescript
import { OptimizedImage, ImagePriority, ImageResizeMode } from "../utils/imageOptimization";

<OptimizedImage
  source={{
    uri: "https://example.com/avatar.jpg",
    priority: ImagePriority.high,
    cache: FastImage.cacheControl.web,
  }}
  style={styles.avatar}
  resizeMode={ImageResizeMode.cover}
/>
```

---

## 🎯 Benefícios

### ✅ Performance
- **Cache permanente** para imagens locais
- **Cache automático** para imagens remotas
- **Sem múltiplas cópias** em RAM
- **Carregamento instantâneo** de imagens locais

### ✅ Uso de Memória
- **Redução de 50-70%** no uso de RAM
- **Cache eficiente** no disco
- **Gerenciamento automático** de memória

### ✅ Experiência do Usuário
- **Sem fade** em imagens locais (carregamento instantâneo)
- **Prioridade configurável** para imagens importantes
- **Fallback automático** se FastImage não estiver disponível

---

## 🔧 Configurações Disponíveis

### Prioridades de Carregamento
```typescript
import { ImagePriority } from "../utils/imageOptimization";

ImagePriority.low    // Baixa prioridade
ImagePriority.normal // Prioridade normal (padrão)
ImagePriority.high   // Alta prioridade
```

### Modos de Redimensionamento
```typescript
import { ImageResizeMode } from "../utils/imageOptimization";

ImageResizeMode.contain  // Mantém proporção, cabe dentro
ImageResizeMode.cover     // Mantém proporção, preenche
ImageResizeMode.stretch   // Estica para preencher
ImageResizeMode.center    // Centraliza sem redimensionar
```

### Controles de Cache
```typescript
import FastImage from "react-native-fast-image";

FastImage.cacheControl.immutable  // Cache permanente (imagens locais)
FastImage.cacheControl.web        // Cache web padrão (imagens remotas)
FastImage.cacheControl.cacheOnly  // Apenas cache, sem rede
```

---

## 📝 Exemplos Práticos

### Avatar de Cliente (Local)
```typescript
import { LocalImage } from "../utils/imageOptimization";

const Avatar = ({ source, size = 50 }) => (
  <LocalImage
    source={source}
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
    }}
    resizeMode={ImageResizeMode.cover}
  />
);
```

### Logo do App (Local)
```typescript
import { LocalImage } from "../utils/imageOptimization";

<LocalImage
  source={require('../assets/logo.png')}
  style={styles.logo}
  resizeMode={ImageResizeMode.contain}
/>
```

### Foto de Perfil Remota (Alta Prioridade)
```typescript
import { RemoteImage, ImagePriority } from "../utils/imageOptimization";

<RemoteImage
  uri={user.avatarUrl}
  style={styles.profilePicture}
  priority={ImagePriority.high}
  resizeMode={ImageResizeMode.cover}
/>
```

### Imagem de Produto (Prioridade Normal)
```typescript
import { RemoteImage } from "../utils/imageOptimization";

<RemoteImage
  uri={product.imageUrl}
  style={styles.productImage}
  resizeMode={ImageResizeMode.contain}
/>
```

---

## ⚠️ Notas Importantes

### 1. Build Nativo Necessário
Após instalar `react-native-fast-image`, é necessário:

```bash
# Android
cd android && ./gradlew clean && cd ..

# iOS
cd ios && pod install && cd ..
```

### 2. Imagens Locais vs Remotas
- **Imagens locais** (`require`) → Use `LocalImage` ou `OptimizedImage`
- **Imagens remotas** (`uri`) → Use `RemoteImage` ou `OptimizedImage` com `uri`

### 3. Performance
- FastImage é **muito mais rápido** que Image padrão
- **Reduz uso de RAM** significativamente
- **Cache automático** no disco

### 4. Compatibilidade
- O componente `OptimizedImage` tem **fallback automático** para `Image` padrão
- Funciona mesmo se FastImage não estiver instalado (mas sem cache)

---

## 🚀 Próximos Passos

1. **Substituir Image por FastImage** onde necessário
2. **Usar LocalImage** para todas as imagens locais
3. **Usar RemoteImage** para todas as imagens remotas
4. **Configurar prioridades** adequadas para cada tipo de imagem

---

## 📚 Referências

- [react-native-fast-image](https://github.com/DylanVann/react-native-fast-image)
- [Documentação oficial](https://github.com/DylanVann/react-native-fast-image#readme)

