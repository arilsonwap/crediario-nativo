/**
 * ✅ Utilitários para otimização de imagens
 * 
 * Para usar FastImage, instale: npm install react-native-fast-image
 */

// Importação condicional
let FastImageModule: any = null;

try {
  // @ts-ignore - FastImage pode não estar instalado
  FastImageModule = require("react-native-fast-image");
} catch {
  // FastImage não disponível, usar Image padrão
}

/**
 * ✅ Componente de imagem otimizada
 * Usa FastImage se disponível, senão usa Image padrão
 */
export const OptimizedImage = FastImageModule
  ? FastImageModule.default
  : require("react-native").Image;

/**
 * ✅ Configuração de prioridade para FastImage
 */
export const ImagePriority = FastImageModule
  ? FastImageModule.priority
  : { low: 0, normal: 1, high: 2 };

/**
 * ✅ Configuração de resize mode para FastImage
 */
export const ImageResizeMode = FastImageModule
  ? FastImageModule.resizeMode
  : { contain: "contain", cover: "cover", stretch: "stretch", center: "center" };

/**
 * ✅ Exemplo de uso (comentado):
 * 
 * import { OptimizedImage, ImagePriority, ImageResizeMode } from "../utils/imageOptimization";
 * 
 * <OptimizedImage
 *   style={styles.avatar}
 *   source={{
 *     uri: client.avatar,
 *     priority: ImagePriority.normal,
 *   }}
 *   resizeMode={ImageResizeMode.contain}
 * />
 */




