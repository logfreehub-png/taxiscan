import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Language, type LanguageOption, LANGUAGES } from "./types";
import { translations } from "./translations";

const STORAGE_LANG_KEY = "taxinarx_language";
const STORAGE_LANG_CHOSEN_KEY = "taxinarx_lang_chosen";

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => Promise<void>;
  hasChosenLang: boolean;
  markLangChosen: () => Promise<void>;
  showLangModal: boolean;
  setShowLangModal: (show: boolean) => void;
  languages: LanguageOption[];
  currentLangOption: LanguageOption;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "uz",
  setLang: async () => {},
  hasChosenLang: true,
  markLangChosen: async () => {},
  showLangModal: false,
  setShowLangModal: () => {},
  languages: LANGUAGES,
  currentLangOption: LANGUAGES[0],
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("uz");
  const [hasChosenLang, setHasChosenLang] = useState<boolean>(true); // default true until check
  const [showLangModal, setShowLangModal] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedLang, chosen] = await Promise.all([
          AsyncStorage.getItem(STORAGE_LANG_KEY),
          AsyncStorage.getItem(STORAGE_LANG_CHOSEN_KEY),
        ]);
        if (savedLang === "uz" || savedLang === "ru" || savedLang === "en") {
          setLangState(savedLang);
        }
        if (chosen !== "1") {
          setHasChosenLang(false);
        } else {
          setHasChosenLang(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    setHasChosenLang(true);
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_LANG_KEY, newLang),
        AsyncStorage.setItem(STORAGE_LANG_CHOSEN_KEY, "1"),
      ]);
    } catch {
      /* ignore */
    }
  };

  const markLangChosen = async () => {
    setHasChosenLang(true);
    try {
      await AsyncStorage.setItem(STORAGE_LANG_CHOSEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const currentLangOption = useMemo(
    () => LANGUAGES.find((item) => item.code === lang) || LANGUAGES[0],
    [lang]
  );

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[lang] || translations.uz;
      let text = dict[key] || translations.uz[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    };
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      hasChosenLang,
      markLangChosen,
      showLangModal,
      setShowLangModal,
      languages: LANGUAGES,
      currentLangOption,
      t,
    }),
    [lang, hasChosenLang, showLangModal, currentLangOption, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export * from "./types";
export * from "./translations";
