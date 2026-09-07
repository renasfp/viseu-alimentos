"use client";

import { MAX_RANKING } from "@/lib/constants";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
};

export function StarRating({ value, onChange, size = "md" }: Props) {
  const interactive = typeof onChange === "function";
  const textSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className={`inline-flex items-center gap-0.5 ${textSize}`}>
      {Array.from({ length: MAX_RANKING }, (_, index) => {
        const star = index + 1;
        const filled = star <= value;
        const className = `leading-none ${filled ? "text-amber-500" : "text-gray-300"} ${
          interactive ? "cursor-pointer" : ""
        }`;

        if (!interactive) {
          return (
            <span key={star} className={className} aria-hidden>
              ★
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={className}
            aria-label={`${star} de ${MAX_RANKING}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
