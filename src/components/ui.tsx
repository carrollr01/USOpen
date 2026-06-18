import { CUT_PENALTY } from "@/lib/roster";
import { formatToPar, scoreColor } from "@/lib/format";
import type { ScoredGolfer, TeamStanding } from "@/lib/types";

export function ToPar({ value, className = "" }: { value: number | null; className?: string }) {
  return (
    <span className={`tabular font-semibold ${scoreColor(value)} ${className}`}>
      {formatToPar(value)}
    </span>
  );
}

export function PositionBadge({ display, you = false }: { display: string; you?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-1 text-sm font-semibold tabular ${
        you ? "bg-green-600 text-white" : "bg-green-50 text-green-700"
      }`}
    >
      {display || "—"}
    </span>
  );
}

function statusLabel(g: ScoredGolfer): string {
  if (!g.found) return "not in field";
  switch (g.status) {
    case "cut":
      return "Missed cut";
    case "wd":
      return "Withdrawn";
    case "dq":
      return "Disqualified";
    default:
      if (g.thru === "F") return "Finished";
      if (/^\d+$/.test(g.thru)) return `Thru ${g.thru}`;
      if (g.teeTime) return `Tee ${g.teeTime}`;
      return "Not started";
  }
}

export function GolferRow({ g }: { g: ScoredGolfer }) {
  const isCut = g.status === "cut" || g.status === "wd" || g.status === "dq";
  const counted = g.counted;
  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 border-l-[3px] ${
        counted ? "border-green-500 bg-green-50/50" : "border-transparent"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`truncate font-medium ${g.found ? "text-gray-900" : "text-gray-400"}`}>
            {g.name}
          </span>
          {!counted && g.found && (
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              drop
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {g.found && g.positionDisplay && g.positionDisplay !== "—" ? `${g.positionDisplay} · ` : ""}
          {statusLabel(g)}
        </div>
      </div>
      <div className="ml-3 shrink-0 text-right">
        <ToPar value={g.effective} className="text-base" />
        {isCut && (
          <div className="text-[10px] text-gray-400">
            {formatToPar(g.toPar)} +{CUT_PENALTY}
          </div>
        )}
      </div>
    </div>
  );
}

export function golfersForDisplay(t: TeamStanding): ScoredGolfer[] {
  // Counting golfers first, then by score; not-yet-scored last.
  return [...t.golfers].sort((a, b) => {
    if (a.counted !== b.counted) return a.counted ? -1 : 1;
    if (a.effective === null && b.effective === null) return 0;
    if (a.effective === null) return 1;
    if (b.effective === null) return -1;
    return a.effective - b.effective;
  });
}

export function UpdatedBar({
  detail,
  source,
  updatedAt,
  refreshing,
  onRefresh,
}: {
  detail: string | null;
  source: "live" | "unavailable";
  updatedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const time = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "—";
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${
            source === "live" ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <span className="truncate font-medium text-gray-600">
          {source === "live" ? detail || "Live" : "Live scores unavailable"}
        </span>
        <span className="shrink-0 text-gray-300">·</span>
        <span className="shrink-0 whitespace-nowrap">{time}</span>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-600 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
      >
        {refreshing ? "…" : "Refresh"}
      </button>
    </div>
  );
}
