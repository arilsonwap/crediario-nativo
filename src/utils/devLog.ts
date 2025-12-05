/**
 * ✅ Helper para logs apenas em desenvolvimento
 * Evita poluição do console em produção e melhora performance
 */
export const DEV_LOG = (...msg: any[]) => {
  if (__DEV__) {
    console.log(...msg);
  }
};

export const DEV_WARN = (...msg: any[]) => {
  if (__DEV__) {
    console.warn(...msg);
  }
};

export const DEV_ERROR = (...msg: any[]) => {
  if (__DEV__) {
    console.error(...msg);
  }
};




