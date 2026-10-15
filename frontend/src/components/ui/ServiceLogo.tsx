import clsx from "clsx";

const INITIALS: Record<string, string> = {
  yandex_go: "Y",
  yango: "Y!",
  mytaxi: "M",
  uzum_taxi: "U",
  on_taxi: "ON",
};

export function ServiceLogo({
  code,
  color,
  size = 40,
  className = "",
}: {
  code: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const initial = INITIALS[code] || code.charAt(0).toUpperCase();
  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-xl font-extrabold text-white shrink-0 shadow-sm",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </div>
  );
}
