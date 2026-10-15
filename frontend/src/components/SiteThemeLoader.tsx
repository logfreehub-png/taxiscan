"use client";

import { useEffect } from "react";
import { loadSiteSettings } from "@/lib/siteSettings";

/** Ilova ochilganda admin sozlagan brend rangi + standart rejimni yuklaydi. */
export function SiteThemeLoader() {
  useEffect(() => {
    loadSiteSettings();
  }, []);
  return null;
}
