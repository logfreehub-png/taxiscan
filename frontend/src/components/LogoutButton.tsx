"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { LogOut } from "lucide-react";

/** Profil sahifasidagi "Chiqish" tugmasi (mobil TopBar'dan logout olib tashlangani uchun). */
export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { logout } = useAuth();
  return (
    <button
      onClick={() => {
        logout();
        router.push("/login");
      }}
      className={`btn-outline w-full justify-center text-red-600 ${className}`}
    >
      <LogOut size={16} /> Chiqish
    </button>
  );
}
