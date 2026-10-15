"use client";

import { useRef, useState } from "react";
import { apiUpload } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { Camera } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Profil rasmini ko'rsatadi va o'zgartirish imkonini beradi.
 * Rasmga bosilganda fayl tanlanadi va /auth/me/ ga multipart yuklanadi.
 */
export function AvatarUpload({
  size = 80,
  fallbackClass = "bg-brand text-ink",
}: {
  size?: number;
  fallbackClass?: string;
}) {
  const { user, loadMe } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await apiUpload("/auth/me/", form, "PATCH");
      await loadMe();
    } catch (err: any) {
      setError(err?.data?.avatar?.[0] || err?.data?.detail || "Rasmni yuklab bo'lmadi");
      setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const src = preview || user?.avatar_url || null;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative rounded-full group"
        style={{ width: size, height: size }}
        title="Rasmni o'zgartirish"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Profil rasmi"
            className="rounded-full object-cover border-2 border-brand w-full h-full"
          />
        ) : (
          <div
            className={`rounded-full flex items-center justify-center font-extrabold w-full h-full ${fallbackClass}`}
            style={{ fontSize: size * 0.4 }}
          >
            {user?.first_name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center border-2 border-white dark:border-[rgb(var(--surface))]">
          {busy ? <Spinner size={12} /> : <Camera size={14} />}
        </span>
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-xs text-ink-muted mt-2 hover:text-ink"
      >
        Rasmni o'zgartirish
      </button>
      {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
