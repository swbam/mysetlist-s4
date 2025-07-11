import 'server-only';
import type en from './dictionaries/en.json';
import languine from './languine.json';

export const locales = [
  languine.locale.source,
  ...languine.locale.targets,
] as const;

export type Dictionary = typeof en;

const dictionaries: Record<string, () => Promise<Dictionary>> =
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      () =>
        import(`./dictionaries/${locale}.json`)
          .then((mod) => mod.default)
          .catch((_err) => {
            return import('./dictionaries/en.json').then((mod) => mod.default);
          }),
    ])
  );

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const normalizedLocale = locale.split('-')[0];

  if (!normalizedLocale || !locales.includes(normalizedLocale as any)) {
    const enDictionary = dictionaries['en'];
    if (!enDictionary) {
      throw new Error('Default dictionary not found');
    }
    return enDictionary();
  }

  try {
    const localeDictionary = dictionaries[normalizedLocale];
    if (!localeDictionary) {
      throw new Error(`Dictionary for locale "${normalizedLocale}" not found`);
    }
    return await localeDictionary();
  } catch (_error) {
    const enDictionary = dictionaries['en'];
    if (!enDictionary) {
      throw new Error('Default dictionary not found');
    }
    return enDictionary();
  }
};
