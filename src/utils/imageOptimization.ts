/**
 * ✅ Utilitários para otimização de imagens com cache
 * 
 * Usa react-native-fast-image para cache eficiente e melhor performance
 * Impede múltiplas cópias em RAM e força cache de imagens locais
 */

import FastImage from "react-native-fast-image";
import { Image, ImageProps, ImageSourcePropType } from "react-native";
import React from "react";

/**
 * ✅ Configuração de prioridade para FastImage
 */
export const ImagePriority = FastImage.priority;

/**
 * ✅ Configuração de resize mode para FastImage
 */
export const ImageResizeMode = FastImage.resizeMode;

/**
 * ✅ Tipo para source de imagem (local ou remota)
 */
type ImageSource = 
  | { uri: string; priority?: FastImage.Priority; cache?: FastImage.Cache }
  | ImageSourcePropType;

/**
 * ✅ Props do componente de imagem otimizada
 */
type OptimizedImageProps = Omit<ImageProps, "source"> & {
  source: ImageSource;
  resizeMode?: FastImage.ResizeMode;
  priority?: FastImage.Priority;
  cache?: FastImage.Cache;
};

/**
 * ✅ Componente de imagem otimizada com cache forçado
 * 
 * Para imagens locais (require):
 * - Usa FastImage com cache permanente
 * - Impede múltiplas cópias em RAM
 * - Carregamento instantâneo
 * 
 * Para imagens remotas (uri):
 * - Cache automático do FastImage
 * - Prioridade configurável
 * - Reduz uso de banda
 * 
 * @example
 * // Imagem local
 * <OptimizedImage
 *   source={require('../assets/icon.png')}
 *   style={styles.icon}
 *   resizeMode={ImageResizeMode.contain}
 * />
 * 
 * @example
 * // Imagem remota
 * <OptimizedImage
 *   source={{ uri: 'https://example.com/image.jpg' }}
 *   style={styles.avatar}
 *   priority={ImagePriority.high}
 *   cache={FastImage.cacheControl.immutable}
 * />
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  resizeMode = FastImage.resizeMode.contain,
  priority = FastImage.priority.normal,
  cache,
  ...props
}) => {
  // ✅ Se for imagem local (require), usa FastImage com cache permanente
  if (typeof source === "number" || (source && "uri" in source === false)) {
    return (
      <FastImage
        source={source as any}
        style={props.style}
        resizeMode={resizeMode}
        // ✅ Cache permanente para imagens locais
        cache={FastImage.cacheControl.immutable}
        // ✅ Desabilita fade para carregamento instantâneo
        defaultSource={undefined}
        {...props}
      />
    );
  }

  // ✅ Se for imagem remota (uri), usa FastImage com cache configurável
  if (source && typeof source === "object" && "uri" in source) {
    return (
      <FastImage
        source={{
          uri: source.uri,
          priority: source.priority || priority,
          cache: source.cache || cache || FastImage.cacheControl.web,
        }}
        style={props.style}
        resizeMode={resizeMode}
        {...props}
      />
    );
  }

  // ✅ Fallback para Image padrão (caso de erro)
  return <Image source={source as ImageSourcePropType} {...props} />;
};

/**
 * ✅ Componente de imagem local otimizada (wrapper simplificado)
 * 
 * Use este componente para imagens locais (require) quando quiser
 * garantir cache permanente e performance máxima
 * 
 * @example
 * <LocalImage
 *   source={require('../assets/icon.png')}
 *   style={styles.icon}
 * />
 */
export const LocalImage: React.FC<Omit<OptimizedImageProps, "source"> & {
  source: ImageSourcePropType;
}> = ({ source, ...props }) => {
  return (
    <FastImage
      source={source as any}
      style={props.style}
      resizeMode={props.resizeMode || FastImage.resizeMode.contain}
      // ✅ Cache permanente para imagens locais
      cache={FastImage.cacheControl.immutable}
      // ✅ Desabilita fade para carregamento instantâneo
      defaultSource={undefined}
      {...props}
    />
  );
};

/**
 * ✅ Componente de imagem remota otimizada (wrapper simplificado)
 * 
 * Use este componente para imagens remotas (uri) quando quiser
 * cache automático e controle de prioridade
 * 
 * @example
 * <RemoteImage
 *   uri="https://example.com/image.jpg"
 *   style={styles.avatar}
 *   priority={ImagePriority.high}
 * />
 */
export const RemoteImage: React.FC<Omit<OptimizedImageProps, "source"> & {
  uri: string;
  priority?: FastImage.Priority;
  cache?: FastImage.Cache;
}> = ({ uri, priority = FastImage.priority.normal, cache, ...props }) => {
  return (
    <FastImage
      source={{
        uri,
        priority,
        cache: cache || FastImage.cacheControl.web,
      }}
      style={props.style}
      resizeMode={props.resizeMode || FastImage.resizeMode.contain}
      {...props}
    />
  );
};

// ✅ Exportar FastImage diretamente para uso avançado
export { FastImage };
export default OptimizedImage;






