"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiUpload } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import { Camera, Calendar, ChevronRight, CheckCircle2 } from "lucide-react";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, loadMe } = useAuth();
  const isDriver = user?.role === "driver";

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const goNext = () => router.push(isDriver ? "/driver" : "/passenger");

  // Muvaffaqiyatli saqlanganidan 2.2 sekund keyin o'tadi
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(goNext, 2200);
    return () => clearTimeout(t);
  }, [saved]);

  const onPickPhoto = (f: File | null) => {
    setPhoto(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Ism va familiya majburiy");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("first_name", firstName.trim());
      fd.append("last_name", lastName.trim());
      if (dob) fd.append("date_of_birth", dob);
      if (gender) fd.append("gender", gender);
      if (photo) fd.append("avatar", photo);
      await apiUpload("/auth/profile/complete/", fd, "PATCH");
      await loadMe();
      setSaved(true);
    } catch (err: any) {
      const data = err?.data;
      const first =
        (data && typeof data === "object" && Object.values(data)[0]) || "Xatolik";
      setError(Array.isArray(first) ? first[0] : String(first));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    goNext();
  };

  // Muvaffaqiyat ekrani
  if (saved) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-10 flex flex-col items-center gap-6 animate-fade-in text-center">
          {/* Animatsiyali yashil doira */}
          <div className="relative w-32 h-32">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="58" fill="none" stroke="#dcfce7" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="58"
                fill="none"
                stroke="#22c55e"
                strokeWidth="8"
                strokeDasharray="364"
                strokeDashoffset="0"
                strokeLinecap="round"
                style={{ animation: "dashFill 0.7s ease forwards" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-green-300"
                  style={{ animation: "popIn 0.4s 0.5s both" }}
                />
              ) : (
                <CheckCircle2
                  size={52}
                  className="text-green-500"
                  style={{ animation: "popIn 0.4s 0.5s both" }}
                />
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-ink">
              {firstName ? `Rahmat, ${firstName}!` : "Profil saqlandi!"}
            </h2>
            <p className="text-ink-muted mt-1 text-sm">
              Profilingiz muvaffaqiyatli to'ldirildi. Asosiy sahifaga o'tilmoqda...
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner size={16} />
            <span>Yuklanmoqda...</span>
          </div>
        </div>

        <style>{`
          @keyframes dashFill {
            from { stroke-dashoffset: 364; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes popIn {
            from { transform: scale(0.5); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold text-ink">
          {isDriver ? "Haydovchi profili" : "Profilingizni to'ldiring"}
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {isDriver
            ? "Ism, familiya, yosh, jins va rasm — yo'lovchilar sizni taniydi"
            : "Bularni keyin ham to'ldirish mumkin"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-28 h-28 rounded-full bg-ink-bg border-2 border-dashed border-ink-line flex items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 transition overflow-hidden"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={28} className="text-ink-muted" />
              )}
              <div className="absolute bottom-0 inset-x-0 bg-ink/70 text-white text-[10px] text-center py-1">
                {photoPreview ? "O'zgartirish" : "Rasm qo'shish"}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
            />
            {isDriver && (
              <p className="text-[10px] text-ink-muted text-center">
                Yo'lovchilarga aniq tanish uchun yuz ko'rinadigan rasm tavsiya etiladi
              </p>
            )}
          </div>

          {/* Ism / Familiya */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ism</label>
              <input
                className="input"
                placeholder="Ali"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Familiya</label>
              <input
                className="input"
                placeholder="Valiyev"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Tug'ilgan kun */}
          <div>
            <label className="label flex items-center gap-1">
              <Calendar size={14} /> Tug'ilgan kun
            </label>
            <input
              type="date"
              className="input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Jins */}
          <div>
            <label className="label">Jins</label>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                    gender === g
                      ? "border-brand bg-brand/15 text-ink"
                      : "border-ink-line bg-white text-ink-muted hover:border-ink/30"
                  }`}
                >
                  {g === "male" ? "Erkak" : "Ayol"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : (
                <>Saqlash va davom etish <ChevronRight size={16} /></>
              )}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="w-full text-sm font-semibold text-ink-muted hover:text-ink py-2"
            >
              Hozircha o'tkazib yuborish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
