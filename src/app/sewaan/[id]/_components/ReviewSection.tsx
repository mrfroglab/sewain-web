"use client";

import { EyeOff, Send } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { StarInput, Stars } from "@/components/ui/Stars";
import { formatDateTime } from "@/lib/format";
import { isReviewVisible, publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Review, User } from "@/lib/types";
import { otherParty, type BookingView } from "./shared";

const D = 86_400_000;
const RATING_WORDS = ["", "Buruk", "Kurang", "Cukup", "Baik", "Mantap"];

/** Two-way rating after COMPLETED/RESOLVED (FR-T1) with the "hidden until both reviewed or 7 days" rule (FR-T2). */
export function ReviewSection({ view }: { view: BookingView }) {
  const { b, user, role, now, renter, provider } = view;
  const allReviews = useAppStore((s) => s.reviews);
  const reviews = allReviews.filter((r) => r.bookingId === b.id);
  const mine = reviews.find((r) => r.fromId === user.id);
  const theirs = reviews.find((r) => r.fromId !== user.id);
  const other = otherParty(view);
  const authorOf = (r: Review) => (r.fromId === b.renterId ? renter : provider);

  return (
    <div className="mt-4">
      {role !== "admin" && !mine && <ReviewForm view={view} other={other} theirsWaiting={!!theirs} />}

      {reviews.length > 0 && (
        <div className="mt-4 space-y-3">
          {[mine, theirs]
            .filter((r): r is Review => !!r)
            .map((r) => {
              const visible = isReviewVisible(r, allReviews, now);
              const isMine = r.fromId === user.id;
              if (!visible && !isMine && role !== "admin") return null;
              return (
                <ReviewItem
                  key={r.id}
                  review={r}
                  author={authorOf(r)}
                  isMine={isMine}
                  hiddenNote={visible ? undefined : `Belum tampil untuk publik. Tampil setelah ${isMine ? publicName(other) : "pihak lain"} mengisi atau ${formatDateTime(r.createdAt + 7 * D)}.`}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ view, other, theirsWaiting }: { view: BookingView; other?: User; theirsWaiting: boolean }) {
  const { b, user, role } = view;
  const submitReview = useAppStore((s) => s.submitReview);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = () => {
    if (toastResult(submitReview(user.id, b.id, rating, comment), "Terima kasih! Rating tersimpan.")) {
      setRating(0);
      setComment("");
    }
  };
  return (
    <div className="rounded-[12px] border border-border-gray p-3.5">
      <p className="text-body-sm font-semibold text-ink">Beri rating untuk {publicName(other)}</p>
      <div className="mt-2 flex items-center gap-3">
        <StarInput value={rating} onChange={setRating} size={30} />
        {rating > 0 && <span className="text-body-sm font-medium text-graphite">{RATING_WORDS[rating]}</span>}
      </div>
      <TextArea
        className="mt-3"
        aria-label="Komentar"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={300}
        placeholder={role === "penyewa" ? "Gimana kondisi barang dan pelayanan penyedianya?" : "Gimana penyewanya? Tepat waktu, barang dijaga?"}
      />
      <p className="mt-2 text-caption text-smoke">Rating tampil setelah kalian berdua mengisi, atau otomatis setelah 7 hari. Jadi tidak ada yang bisa membalas rating.</p>
      {theirsWaiting && (
        <Notice className="mt-3" icon={<EyeOff className="size-4" />}>
          {publicName(other)} sudah memberi rating untukmu. Isi punyamu untuk melihatnya.
        </Notice>
      )}
      <Button block className="mt-3" disabled={rating === 0} onClick={submit}>
        <Send className="size-4" /> Kirim rating
      </Button>
    </div>
  );
}

function ReviewItem({ review, author, isMine, hiddenNote }: { review: Review; author?: User; isMine: boolean; hiddenNote?: string }) {
  const name = publicName(author);
  return (
    <article className="rounded-[12px] border border-border-gray bg-white p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-ink">
            {isMine ? "Ratingmu" : name} <span className="font-normal text-smoke">· sebagai {review.fromRole}</span>
          </p>
          <Stars rating={review.rating} showScore={false} size={12} />
        </div>
        <span className="shrink-0 text-micro text-ash">{formatDateTime(review.createdAt)}</span>
      </div>
      {review.comment && <p className="mt-2 text-body-sm text-graphite">{review.comment}</p>}
      {hiddenNote && (
        <p className="mt-2 flex items-start gap-1.5 text-caption text-smoke">
          <EyeOff className="mt-0.5 size-3.5 shrink-0" /> {hiddenNote}
        </p>
      )}
    </article>
  );
}
