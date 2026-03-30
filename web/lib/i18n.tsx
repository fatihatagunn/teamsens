"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { tr as trLocale, enUS } from "date-fns/locale";
import type { Locale as DateLocale } from "date-fns";
import tr from "@/messages/tr.json";
import en from "@/messages/en.json";

export type Locale = "tr" | "en";
type Messages = typeof tr;

const messages: Record<Locale, Messages> = { tr, en };
const dateLocales: Record<Locale, DateLocale> = { tr: trLocale, en: enUS };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dateLocale: DateLocale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(obj: unknown, parts: string[]): unknown {
  let cur = obj;
  for (const part of parts) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "tr" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  };

  const t = (key: string): string => {
    const result = lookup(messages[locale], key.split("."));
    return typeof result === "string" ? result : key;
  };

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, dateLocale: dateLocales[locale] }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
