import clsx from "clsx";

export type AuthStep = "phone" | "verify" | "password";

/** 3 bosqichli indikator: telefon → kod → parol */
export function StepBars({ step }: { step: AuthStep }) {
  const idx = step === "phone" ? 0 : step === "verify" ? 1 : 2;
  return (
    <div className="mt-5 flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className={clsx("h-1 flex-1 rounded-full transition", i <= idx ? "bg-brand" : "bg-ink-line")} />
      ))}
    </div>
  );
}
