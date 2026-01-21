// src/utils/logger.js
// Logger centralizado que desabilita logs em produção

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Logger que só exibe em desenvolvimento
 * Substitui console.log para evitar logs em produção
 */
export const logger = {
  log: (...args) => {
    if (!IS_PRODUCTION) console.log(...args);
  },
  
  warn: (...args) => {
    if (!IS_PRODUCTION) console.warn(...args);
  },
  
  error: (...args) => {
    // Erros sempre são logados
    console.error(...args);
  },
  
  info: (...args) => {
    if (!IS_PRODUCTION) console.info(...args);
  },
  
  debug: (...args) => {
    if (!IS_PRODUCTION) console.debug(...args);
  },
  
  table: (...args) => {
    if (!IS_PRODUCTION) console.table(...args);
  },
  
  group: (label) => {
    if (!IS_PRODUCTION) console.group(label);
  },
  
  groupEnd: () => {
    if (!IS_PRODUCTION) console.groupEnd();
  },
  
  time: (label) => {
    if (!IS_PRODUCTION) console.time(label);
  },
  
  timeEnd: (label) => {
    if (!IS_PRODUCTION) console.timeEnd(label);
  }
};

/**
 * Logger com prefixo para identificar módulo
 */
export const createLogger = (moduleName) => ({
  log: (...args) => logger.log(`[${moduleName}]`, ...args),
  warn: (...args) => logger.warn(`[${moduleName}]`, ...args),
  error: (...args) => logger.error(`[${moduleName}]`, ...args),
  info: (...args) => logger.info(`[${moduleName}]`, ...args),
  debug: (...args) => logger.debug(`[${moduleName}]`, ...args)
});

export default logger;
