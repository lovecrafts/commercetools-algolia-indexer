import config from './config.js';

const logger = {
  error: console.error,
  warn: console.warn,
  info: console.log,
  debug: console.debug
};

const getTranslation = (locale, field) => {
  for (const candidateLocale of [locale, ...config.localeFallbacks[locale]]) {
    if (field[candidateLocale]) {
      return field[candidateLocale];
    }
  }
  return '';
};

export {
  logger,
  getTranslation
};
