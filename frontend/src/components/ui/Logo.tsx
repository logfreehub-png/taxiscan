import clsx from "clsx";

export function Logo({ size = 32, withText = true, className = "" }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={clsx("inline-flex items-center gap-2.5", className)}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="#0F1216" />
        <path
          d="M9 22.5l5-9.5h12l5 9.5v6.5a1.5 1.5 0 01-1.5 1.5h-2A1.5 1.5 0 0126 29v-1H14v1a1.5 1.5 0 01-1.5 1.5h-2A1.5 1.5 0 019 29v-6.5z"
          fill="#FFCC00"
        />
        <circle cx="14" cy="25.5" r="1.6" fill="#0F1216" />
        <circle cx="26" cy="25.5" r="1.6" fill="#0F1216" />
        <path d="M16 14.5h8l1.5 6h-11l1.5-6z" fill="#0F1216" />
      </svg>
      {withText && (
        <div className="leading-none">
          <div className="font-bold text-ink text-lg tracking-tight">
            Taxi<span className="text-brand-600">Scan</span>
          </div>
          <div className="text-[10px] text-ink-muted font-medium tracking-wide uppercase">
            Bir nuqtada hammasi
          </div>
        </div>
      )}
    </div>
  );
}
