import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowRight, Check, MapPin, TrendingUp, Wallet, Sparkles,
  Search, Navigation, Users, Route, Moon, Layers, BarChart3, Crown,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-ink-bg">
      {/* Header */}
      <header className="border-b border-ink-line bg-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm">Kirish</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4">Boshlash</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-3 py-1 text-xs font-semibold text-brand-700 mb-5">
              <Sparkles size={12} /> Toshkent uchun #1 taksi narx aggregatori
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-ink leading-[1.05] tracking-tight">
              5 ta taksining narxini
              <br />
              <span className="text-brand-600">bir joyda</span> ko'ring
            </h1>
            <p className="mt-5 text-lg text-ink-muted max-w-lg">
              Yandex Go, Uklon, Fasten, WB Taxi va MyTaxi narxlarini bir soniyada
              taqqoslang — eng arzon variantni tanlab, har safar pul tejang.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?role=passenger" className="btn-primary">
                Yo'lovchi sifatida boshlash <ArrowRight size={18} />
              </Link>
              <Link href="/register?role=driver" className="btn-dark">
                Haydovchi sifatida kirish <ArrowRight size={18} />
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5"><Check size={16} className="text-brand-600" /> 1 kun bepul</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-brand-600" /> Oyiga 9 999 so'mdan</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-brand-600" /> Istalgan vaqt bekor</span>
            </div>
          </div>

          <div className="relative">
            <div className="card p-6 shadow-xl">
              <div className="text-xs uppercase font-bold text-ink-muted tracking-wider mb-3">Bugungi narxlar — Mirobod → Yunusobod</div>
              {[
                { name: "Uklon",     color: "#00C853", price: 27500, cheapest: true },
                { name: "WB Taxi",   color: "#7B2CBF", price: 29000 },
                { name: "Fasten",    color: "#FF6B00", price: 30500 },
                { name: "MyTaxi",    color: "#0066CC", price: 32000 },
                { name: "Yandex Go", color: "#FFCC00", price: 33500 },
              ].map((s) => (
                <div key={s.name} className={`flex items-center justify-between py-2.5 border-b border-ink-line last:border-0 ${s.cheapest ? "bg-brand/10 -mx-6 px-6 rounded-md" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: s.color }}>
                      {s.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-sm">{s.name}</div>
                      {s.cheapest && (
                        <div className="text-[10px] uppercase text-brand-700 font-bold">Eng arzon</div>
                      )}
                    </div>
                  </div>
                  <div className="font-extrabold text-ink">{s.price.toLocaleString("uz-UZ")} so'm</div>
                </div>
              ))}
              <div className="mt-4 text-center text-xs text-ink-muted">Tejagan summa: <span className="font-bold text-brand-700">6,000 so'm</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Qanday ishlaydi — 3 qadam */}
      <section className="bg-white border-y border-ink-line">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-ink">Qanday ishlaydi?</h2>
          <p className="text-center text-ink-muted mt-3 max-w-xl mx-auto">
            Uch qadamda eng arzon taksini toping — ro'yxatdan o'tish 1 daqiqa.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { n: "1", icon: <MapPin size={22} />, title: "Manzilni kiriting", text: "Qayerdan va qayerga borishingizni yozing yoki to'g'ridan-to'g'ri xaritadan belgilang." },
              { n: "2", icon: <Search size={22} />, title: "Narxlarni solishtiring", text: "Yandex Go, Uklon, Fasten, WB Taxi va MyTaxi narxlari bir soniyada — arzondan qimmatga tartiblanadi." },
              { n: "3", icon: <Navigation size={22} />, title: "Ilovada oching", text: "Eng arzonini tanlang — o'sha taksi ilovasi manzilingiz bilan avtomatik ochiladi." },
            ].map((s) => (
              <div key={s.n} className="card p-6 relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-ink text-white text-sm font-extrabold flex items-center justify-center">
                  {s.n}
                </div>
                <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center text-brand-700 mb-4">
                  {s.icon}
                </div>
                <h3 className="font-bold text-lg text-ink">{s.title}</h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kim uchun — yo'lovchi va haydovchi */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-ink">Kim uchun?</h2>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="card p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-brand/15 flex items-center justify-center text-brand-700">
                <Users size={22} />
              </div>
              <h3 className="text-xl font-extrabold text-ink">Yo'lovchi uchun</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-ink-muted">
              {[
                "5 ta taksi narxini bir joyda solishtirish",
                "Bir nechta manzil (A → B → C → D) bo'yicha narx",
                "Bir nechta yo'lni tanlab, narxni ko'rish",
                "Har safar eng arzonini tanlab pul tejash",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check size={17} className="text-brand-600 shrink-0 mt-0.5" /> <span className="text-ink">{t}</span>
                </li>
              ))}
            </ul>
            <Link href="/register?role=passenger" className="btn-primary w-full mt-6">
              Yo'lovchi sifatida boshlash <ArrowRight size={16} />
            </Link>
          </div>

          <div className="card p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-ink/10 flex items-center justify-center text-ink">
                <Navigation size={22} />
              </div>
              <h3 className="text-xl font-extrabold text-ink">Haydovchi uchun</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-ink-muted">
              {[
                "Qaysi xizmat qaysi tumanda ko'p to'lashini ko'rish",
                "Real vaqtdagi talab: qayerda yo'lovchi ko'p",
                "Tuman bo'yicha o'rtacha narx statistikasi",
                "Eng foydali zonani tanlab, ko'proq ishlash",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check size={17} className="text-brand-600 shrink-0 mt-0.5" /> <span className="text-ink">{t}</span>
                </li>
              ))}
            </ul>
            <Link href="/register?role=driver" className="btn-dark w-full mt-6">
              Haydovchi sifatida kirish <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-ink">
          Nima uchun TaxiScan?
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: <MapPin />, title: "Real vaqtda narxlar", text: "Manzillaringizni kiriting va barcha taksi xizmatlaridan narxlarni bir soniyada oling." },
            { icon: <TrendingUp />, title: "Statistika va trendlar", text: "Qaysi tumanda qaysi xizmat ko'p arzon ekanini ko'ring. Haydovchilar uchun maxsus." },
            { icon: <Wallet />, title: "Har safar tejash", text: "Eng arzon xizmatni tanlab, oyiga 100 000+ so'm tejang. Obuna esa atigi 9 999 so'mdan." },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center text-brand-700 mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg text-ink">{f.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bepul va Obuna — taqqoslash */}
      <section className="bg-white border-y border-ink-line">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-ink">Bepul va Obuna</h2>
          <p className="text-center text-ink-muted mt-3 max-w-xl mx-auto">
            Bepul boshlang — kerak bo'lsa obuna bilan barcha imkoniyatlarni oching.
          </p>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {/* Bepul */}
            <div className="card p-7">
              <div className="text-xs uppercase font-bold text-ink-muted tracking-wider">Bepul</div>
              <div className="mt-1 text-3xl font-extrabold text-ink">0 so'm</div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {[
                  "Kuniga 1 marta narx qidirish",
                  "2 ta eng arzon taksi narxi",
                  "Faqat A va B nuqta",
                  "Faqat Start tarifi",
                  "Faqat kunduzgi rejim",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-ink">
                    <Check size={17} className="text-ink-muted shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn-outline w-full mt-6">Bepul boshlash</Link>
            </div>

            {/* Obuna */}
            <div className="card p-7 border-2 border-brand relative overflow-hidden">
              <div className="absolute top-4 right-4 badge bg-brand text-ink"><Crown size={12} /> Tavsiya</div>
              <div className="text-xs uppercase font-bold text-brand-700 tracking-wider">Obuna</div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-ink-muted flex items-center gap-1.5"><Users size={14} /> Yo'lovchi</span>
                  <span className="text-xl font-extrabold text-ink">9 999 so'm<span className="text-xs font-semibold text-ink-muted">/oy</span></span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-ink-muted flex items-center gap-1.5"><Navigation size={14} /> Haydovchi</span>
                  <span className="text-xl font-extrabold text-ink">49 999 so'm<span className="text-xs font-semibold text-ink-muted">/oy</span></span>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {[
                  { icon: <Search size={16} />, t: "Cheksiz narx qidirish" },
                  { icon: <Wallet size={16} />, t: "Barcha taksilar narxi" },
                  { icon: <Route size={16} />, t: "Bir nechta manzil va yo'l" },
                  { icon: <Layers size={16} />, t: "Barcha tariflar: Comfort, Comfort+, Biznes" },
                  { icon: <BarChart3 size={16} />, t: "Haydovchi uchun to'liq statistika" },
                  { icon: <Moon size={16} />, t: "Kunduzgi va tungi rejim" },
                ].map((f) => (
                  <li key={f.t} className="flex items-start gap-2 text-ink">
                    <span className="text-brand-700 shrink-0 mt-0.5">{f.icon}</span> {f.t}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn-primary w-full mt-6">
                1 kun bepul sinab ko'rish <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-ink text-white p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold">Bugun boshlang — 1 kun bepul</h2>
          <p className="mt-3 text-ink-line max-w-xl mx-auto">
            Ro'yxatdan o'ting va darhol narxlarni solishtiring. To'lov Payme orqali — istalgan vaqt bekor qiling.
          </p>
          <div className="mt-6">
            <Link href="/register" className="btn-primary text-base px-6 py-3.5">
              Hozir ro'yhatdan o'tish <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-line py-6 text-center text-sm text-ink-muted">
        © {new Date().getFullYear()} TaxiScan. Toshkent.
      </footer>
    </div>
  );
}
