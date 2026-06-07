import type { MeetingType } from "@/lib/types";

type Status = "processing" | "ready" | "error";

const statusStyles: Record<Status, string> = {
  processing:
    "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  ready: "bg-green-500/15 text-green-400 border border-green-500/30",
  error: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const statusLabels: Record<Status, string> = {
  processing: "Processing",
  ready: "Ready",
  error: "Error",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {status === "processing" && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {statusLabels[status]}
    </span>
  );
}

const typeLabels: Record<MeetingType, string> = {
  standup: "Standup",
  one_on_one: "1-on-1",
  planning: "Planning",
  retro: "Retro",
  review: "Review",
  other: "Other",
};

const typeColors: Record<MeetingType, string> = {
  standup: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  one_on_one: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  planning: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20",
  retro: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  review: "bg-teal-500/15 text-teal-400 border border-teal-500/20",
  other: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
};

export function TypeBadge({ type }: { type: MeetingType }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeColors[type]}`}
    >
      {typeLabels[type]}
    </span>
  );
}

export function SentimentDot({ score }: { score: number }) {
  // score is -1..1
  const color =
    score >= 0.2
      ? "bg-green-400"
      : score <= -0.2
        ? "bg-red-400"
        : "bg-amber-400";
  const label =
    score >= 0.2 ? "Positive" : score <= -0.2 ? "Negative" : "Neutral";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
