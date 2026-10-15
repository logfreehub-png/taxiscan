import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Shield, User, Phone, MapPin, Bell, Lock, Trash2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati — TaxiScan",
  description:
    "TaxiScan ilovasi qanday ma'lumotlarni yig'ishi, ulardan qanday foydalanishi va ularni qanday himoya qilishi haqida.",
};

// Oxirgi yangilangan sana
const UPDATED = "2026-yil 17-sentyabr";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
        <Icon size={20} className="text-brand-700" />
        {title}
      </h2>
      <div className="mt-2 text-sm text-ink-muted leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-ink-bg flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-ink-line">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-ink-muted hover:text-ink">
            ← Bosh sahifa
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="card p-8 animate-fade-in">
            <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
              <Shield size={24} className="text-brand-700" />
              Maxfiylik siyosati
            </h1>
            <p className="text-ink-muted mt-2 text-sm">
              Oxirgi yangilangan: {UPDATED}
            </p>

            <p className="mt-6 text-sm text-ink-muted leading-relaxed">
              Ushbu Maxfiylik siyosati <span className="font-semibold text-ink">TaxiScan</span> mobil
              ilovasi va <span className="font-semibold text-ink">taxiscan.app</span> veb-sayti
              (keyingi o'rinlarda — «Xizmat») foydalanuvchilarining shaxsiy ma'lumotlari qanday
              yig'ilishi, ishlatilishi va himoya qilinishini tushuntiradi. Xizmatdan foydalanish
              orqali siz ushbu siyosatda tavsiflangan amaliyotlarga rozilik bildirasiz.
            </p>

            <Section icon={User} title="1. Biz yig'adigan ma'lumotlar">
              <p>Xizmat faqat quyidagi minimal ma'lumotlarni yig'adi:</p>
              <ul className="list-none space-y-2 mt-2">
                <li className="flex gap-2">
                  <User size={18} className="text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold text-ink">Ism</span> — hisobingizni yaratish va
                    sizga murojaat qilish uchun.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Phone size={18} className="text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold text-ink">Telefon raqami</span> — hisobga kirish,
                    identifikatsiya va zarur hollarda siz bilan bog'lanish uchun.
                  </span>
                </li>
                <li className="flex gap-2">
                  <MapPin size={18} className="text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold text-ink">Aniq joylashuv (GPS)</span> — siz
                    ilovada «joriy joylashuvim» funksiyasidan foydalansangiz, taksi narxlarini va
                    marshrutni to'g'ri hisoblash uchun qurilmangizning koordinatalari olinadi.
                    Joylashuv faqat ilova ochiq bo'lgan paytda (foreground) va faqat siz ruxsat
                    bergandan so'ng ishlatiladi. Ilova joylashuvingizni fonda kuzatmaydi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Bell size={18} className="text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold text-ink">Bildirishnoma tokeni</span> — agar siz
                    push-bildirishnomalarga ruxsat bersangiz, sizga xabar yuborish uchun qurilma
                    tokeni saqlanadi.
                  </span>
                </li>
              </ul>
              <p className="mt-2">
                Biz parollarni ochiq ko'rinishda saqlamaymiz — ular kriptografik usulda
                shifrlanadi (hash).
              </p>
            </Section>

            <Section icon={MapPin} title="2. Ma'lumotlardan foydalanish maqsadi">
              <ul className="list-disc pl-5 space-y-1">
                <li>Foydalanuvchi hisobini yaratish va boshqarish;</li>
                <li>
                  Turli taksi xizmatlari narxlarini taqqoslash, marshrut va masofani hisoblash;
                </li>
                <li>Xizmat ishlashini ta'minlash va yaxshilash;</li>
                <li>Sizga muhim bildirishnomalarni yuborish (agar ruxsat bergan bo'lsangiz).</li>
              </ul>
            </Section>

            <Section icon={Shield} title="3. Ma'lumotlarni uchinchi tomonlarga uzatish">
              <p>
                Biz sizning shaxsiy ma'lumotlaringizni (ism, telefon raqami, joylashuv) uchinchi
                tomonlarga <span className="font-semibold text-ink">sotmaymiz va ularning o'z
                maqsadlari uchun bermaymiz</span>. Ma'lumotlar faqat Xizmatning o'zi ishlashi uchun
                ishlatiladi.
              </p>
              <p>
                Ma'lumotlar faqat qonun talab qilgan hollarda yoki vakolatli davlat organlarining
                qonuniy so'rovi asosida oshkor qilinishi mumkin.
              </p>
            </Section>

            <Section icon={Lock} title="4. Ma'lumotlar xavfsizligi">
              <p>
                Barcha ma'lumotlar server bilan aloqa vaqtida shifrlangan kanal (HTTPS/TLS) orqali
                uzatiladi. Biz ma'lumotlaringizni ruxsatsiz kirish, o'zgartirish va yo'qotishdan
                himoya qilish uchun texnik va tashkiliy choralar ko'ramiz.
              </p>
            </Section>

            <Section icon={Trash2} title="5. Ma'lumotlarni saqlash va o'chirish">
              <p>
                Ma'lumotlaringiz hisobingiz faol bo'lgan davrda saqlanadi. Siz istalgan vaqtda
                hisobingizni va unga bog'liq barcha ma'lumotlarni butunlay o'chirib tashlashingiz
                mumkin.
              </p>
              <p>
                Hisobni o'chirish uchun:{" "}
                <Link href="/delete-account" className="font-semibold text-brand-700 hover:underline">
                  taxiscan.app/delete-account
                </Link>{" "}
                sahifasiga o'ting yoki quyidagi email orqali biz bilan bog'laning. So'rovdan so'ng
                ma'lumotlaringiz serverdan butunlay o'chiriladi.
              </p>
            </Section>

            <Section icon={User} title="6. Bolalar maxfiyligi">
              <p>
                Xizmat 13 yoshgacha bo'lgan bolalar uchun mo'ljallanmagan va biz bilib turib
                ulardan shaxsiy ma'lumot yig'maymiz.
              </p>
            </Section>

            <Section icon={Shield} title="7. Siyosatga o'zgartirishlar">
              <p>
                Biz ushbu Maxfiylik siyosatini vaqti-vaqti bilan yangilashimiz mumkin. O'zgarishlar
                ushbu sahifada e'lon qilinadi va yuqoridagi «Oxirgi yangilangan» sanasi yangilanadi.
              </p>
            </Section>

            <Section icon={Mail} title="8. Biz bilan bog'lanish">
              <p>
                Ushbu siyosat yoki ma'lumotlaringiz bo'yicha savollaringiz bo'lsa, biz bilan
                bog'laning:
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:support@taxiscan.app"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  support@taxiscan.app
                </a>
              </p>
            </Section>

            <div className="mt-10 pt-6 border-t border-ink-line text-center text-sm text-ink-muted">
              <Link href="/" className="font-semibold text-brand-700 hover:underline">
                ← Bosh sahifaga qaytish
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
