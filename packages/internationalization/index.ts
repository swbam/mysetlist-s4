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
          .catch((err) => {
            console.error(
              `Failed to load dictionary for locale: ${locale}`,
              err
            );
            return import('./dictionaries/en.json').then((mod) => mod.default);
          }),
    ])
  );

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const normalizedLocale = locale.split('-')[0];
  
  if (!normalizedLocale || !locales.includes(normalizedLocale as any)) {
    console.warn(`Locale "${locale}" is not supported, defaulting to "en"`);
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
  } catch (error) {
    console.error(
      `Error loading dictionary for locale "${normalizedLocale}", falling back to "en"`,
      error
    );
    const enDictionary = dictionaries['en'];
    if (!enDictionary) {
      throw new Error('Default dictionary not found');
    }
    return enDictionary();
  }
};
