export type Language = "uz" | "ru" | "en";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
  short: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    code: "uz",
    label: "O'zbekcha",
    nativeLabel: "O'zbekcha",
    flag: "🇺🇿",
    short: "UZ",
  },
  {
    code: "ru",
    label: "Русский",
    nativeLabel: "Русский",
    flag: "🇷🇺",
    short: "RU",
  },
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🇬🇧",
    short: "EN",
  },
];
