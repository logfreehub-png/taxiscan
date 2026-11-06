"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

interface Props {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
  onComplete?: () => void;
}

/**
 * 6 ta alohida katakli kod kiritish:
 * raqam yozilsa keyingisiga o'tadi, Backspace bosilsa oldingisiga qaytadi,
 * paste qilingan kod kataklarga taqsimlanadi.
 */
export function OtpInput({ value, onChange, length = 6, error, autoFocus = true, onComplete }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(i, length - 1))];
    el?.focus();
    el?.select();
  };

  const fillFrom = (index: number, text: string) => {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const arr = [...digits];
    for (let k = 0; k < clean.length && index + k < length; k++) arr[index + k] = clean[k];
    const next = arr.join("");
    onChange(next);
    focus(index + clean.length);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = [...digits];
      if (arr[i]) {
        arr[i] = "";
        onChange(arr.join(""));
        if (i > 0) focus(i - 1);
      } else if (i > 0) {
        arr[i - 1] = "";
        onChange(arr.join(""));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    } else if (e.key === "Enter" && value.length === length) {
      onComplete?.();
    }
  };

  return (
    <div className="flex justify-between gap-2" onPaste={(e) => {
      e.preventDefault();
      const idx = refs.current.findIndex((r) => r === document.activeElement);
      fillFrom(idx < 0 ? 0 : idx, e.clipboardData.getData("text"));
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) return;
            fillFrom(i, v);
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={clsx(
            "w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 text-center text-2xl font-extrabold text-ink bg-ink-bg outline-none transition",
            "focus:border-brand focus:ring-4 focus:ring-brand/20",
            error ? "border-red-400" : d ? "border-brand" : "border-ink-line"
          )}
        />
      ))}
    </div>
  );
}
