"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { Logo } from "@/components/ui/Logo";
import { LogOut, User as UserIcon, Sun, Moon, Monitor, Search, BarChart3, Radar } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useIsPremium } from "@/lib/subscription";
import { PaywallModal } from "@/components/PaywallModal";
import { NotificationBell } from "@/components/NotificationBell";

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isPremium = useIsPremium();
  const [paywall, setPaywall] = useState<{ title: string; message: string } | null>(null);
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  const isDriver = user?.role === "driver";
  const homeHref = isDriver ? "/driver" : "/passenger";

  // Tungi rejim faqat obuna bilan; bepulga faqat kunduzgi
  const onThemeClick = () => {
    if (!isPremium) {
      setPaywall({
        title: "Tungi rejim — obuna bilan",
        message: "Qorong'i (tungi) rejim obuna orqali ochiladi.",
      });
      return;
    }
    setTheme(nextTheme);
  };

  const links = isDriver
    ? [
        { href: "/driver", label: "Narxlar", icon: Radar },
        // Statistika faqat obunali haydovchi uchun
        ...(isPremium ? [{ href: "/driver/stats", label: "Statistika", icon: BarChart3 }] : []),
        { href: "/driver/profile", label: "Profil", icon: UserIcon },
      ]
    : [
        { href: "/passenger", label: "Buyurtma", icon: Search },
        { href: "/passenger/profile", label: "Profil", icon: UserIcon },
      ];

  return (
    <>
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-[rgb(var(--surface))]/90 backdrop-blur border-b border-ink-line">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={homeHref} className="hover:opacity-90 transition">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-brand text-ink"
                  : "text-ink-muted hover:bg-ink-line/40 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          {/* Profil chip — faqat katta ekranda (telefonda pastki tabda "Profil" bor) */}
          <Link
            href={isDriver ? "/driver/profile" : "/passenger/profile"}
            className="hidden md:flex items-center gap-2 rounded-xl border border-ink-line px-3 py-1.5 hover:bg-ink-line/30 transition"
          >
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center font-bold text-ink text-sm">
              {user?.first_name?.[0] || user?.phone?.[4] || "U"}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-xs font-semibold text-ink">{user?.first_name || "Foydalanuvchi"}</div>
              <div className="text-[10px] text-ink-muted">{isDriver ? "Haydovchi" : "Yo'lovchi"}</div>
            </div>
          </Link>
          <button
            onClick={onThemeClick}
            className="btn-ghost"
            title={`Mavzu: ${theme}`}
            aria-label="Mavzuni o'zgartirish"
          >
            <ThemeIcon size={16} />
          </button>
          {/* Chiqish — mobil ekranda yashirilgan (profil sahifasida bor),
              katta ekranda qoladi. Mobil TopBar tor bo'lib qolmasligi uchun. */}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="btn-ghost hidden md:inline-flex"
            aria-label="Chiqish"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>

    {/* Telefon: pastki fixed tab bar (mobile ilova uslubida).
        MUHIM: header'dan TASHQARIDA — header'da backdrop-filter (blur) bor,
        u esa fixed bolalari uchun "containing block" yaratadi va tab barni
        viewport pastiga emas, header pastiga (tepaga) yopishtirib qo'yardi. */}
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[rgb(var(--surface))] border-t border-ink-line pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {links.map((l) => {
          const active = pathname === l.href;
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
                active ? "text-brand-700" : "text-ink-muted"
              }`}
            >
              <Icon size={20} className={active ? "text-brand-700" : "text-ink-muted"} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>

    <PaywallModal
      open={!!paywall}
      onClose={() => setPaywall(null)}
      title={paywall?.title}
      message={paywall?.message}
    />
    </>
  );
}
