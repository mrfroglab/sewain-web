"use client";

import { Star } from "lucide-react";
import { cn } from "./cn";

/** Five gold stars + compact numeric score (DESIGN.md › Rating). Gold is used ONLY here. */
export function Stars({ rating, count, size = 11, showScore = true, className }: { rating: number; count?: number; size?: number; showScore?: boolean; className?: string }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption text-smoke", className)} aria-label={rating ? `Rating ${rating.toFixed(1)} dari 5${count != null ? `, ${count} ulasan` : ""}` : "Belum ada rating"}>
      <span className="inline-flex gap-px" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star className="absolute inset-0 text-image-gray" fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: size * fill }}>
                  <Star className="text-rating-gold" fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showScore && (rating ? <span className="font-medium text-graphite">{rating.toFixed(1)}</span> : <span>Baru</span>)}
      {count != null && rating > 0 && <span>({count})</span>}
    </span>
  );
}

/** Interactive 1–5 star input for reviews. */
export function StarInput({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} bintang`} onClick={() => onChange(i)} className="rounded-full p-0.5">
          <Star className={i <= value ? "text-rating-gold" : "text-image-gray"} fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
        </button>
      ))}
    </div>
  );
}
