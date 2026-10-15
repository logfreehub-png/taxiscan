"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { Logo } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";
import {
  LayoutDashboard,
  Users,
  Car,
  Receipt,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Radar,
  Bell,
  Ticket,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/regions", label: "Rayonlar / Talab", icon: Radar },
  { href: "/admin/notifications", label: "Xabarlar", icon: Bell },
  { href: "/admin/promo", label: "Promo-kodlar", icon: Ticket },
  { href: "/admin/users", label: "Yo'lovchilar", icon: Users },
  { href: "/admin/drivers", label: "Haydovchilar", icon: Car },
  { href: "/admin/transactions", label: "Tranzaksiyalar", icon: Receipt },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, loadMe, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace(user.role === "driver" ? "/driver" : "/passenger");
    }
    // Fon rejimda yangilash (xato bo'lsa ham ko'rsatamiz)
    loadMe().catch(() => {});
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-ink text-white flex flex-col p-4 shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 mb-4">
          <ShieldCheck size={16} className="text-brand" />
          <div className="text-xs">
            <div className="font-bold">Admin panel</div>
            <div className="text-white/60 text-[10px]">{user.phone}</div>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  active ? "bg-brand text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 pt-4 border-t border-white/10">
          <button
            onClick={() => setTheme(nextTheme)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ThemeIcon size={16} /> Mavzu: {theme}
          </button>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:bg-red-500/20 hover:text-red-200"
          >
            <LogOut size={16} /> Chiqish
          </button>
        </div>
      </aside>

      {/* Asosiy kontent */}
      <main className="flex-1 overflow-auto bg-ink-bg dark:bg-[rgb(var(--background))]">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
