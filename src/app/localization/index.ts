import { useMemo } from 'react';
import { AppLocale } from '../store/appSlice';
import { useAppSelector } from '../store/hooks';
import { en } from './translations/en';
import { ru, RuKey } from './translations/ru';

type Dictionary = Record<RuKey, string>;

type TranslateParams = Record<string, string | number>;

const translations: Record<AppLocale, Dictionary> = {
  ru,
  en: en as Dictionary,
};

function interpolate(template: string, params?: TranslateParams) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((output, [key, value]) => {
    return output.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
}

export function translate(
  locale: AppLocale,
  key: RuKey,
  params?: TranslateParams,
) {
  const value = translations[locale][key] ?? translations.ru[key] ?? key;
  return interpolate(value, params);
}

export function useI18n() {
  const locale = useAppSelector(state => state.app.locale);

  return useMemo(
    () => ({
      locale,
      t: (key: RuKey, params?: TranslateParams) =>
        translate(locale, key, params),
    }),
    [locale],
  );
}

export type TranslationKey = RuKey;
