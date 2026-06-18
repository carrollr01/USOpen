"use client";

import { useState } from "react";
import { useLeaderboard } from "./useLeaderboard";
import { GolferRow, PositionBadge, ToPar, UpdatedBar, golfersForDisplay } from "./ui";
import { Card, EmptyState } from "./shells";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-300 transition-transform ${open ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LeagueView({ me }: { me: string }) {
  const { data, error, loading, refreshing, refresh } = useLeaderboard();
  const [open, setOpen] = useState<string | null>(null);

  if (loading && !data) return <EmptyState>Loading the league…</EmptyState>;

  return (
    <div className="space-y-4">
      <Card className="px-4 py-3">
        <UpdatedBar
          detail={data?.event?.detail ?? null}
          source={data?.source ?? "unavailable"}
          updatedAt={data?.updatedAt ?? null}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      </Card>

      {error && !data && <Card className="px-4 py-3 text-sm text-gray-500">{error}</Card>}

      <Card>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">
          <span>Player</span>
          <span>Total</span>
        </div>
        <div className="divide-y divide-gray-100">
          {data?.standings.map((s) => {
            const mine = s.username === me;
            const expanded = open === s.username;
            return (
              <div key={s.username}>
                <button
                  onClick={() => setOpen(expanded ? null : s.username)}
                  className={`flex w-full items-center justify-between px-3 py-3 text-left transition hover:bg-gray-50 active:bg-gray-100 ${
                    mine ? "bg-green-50/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PositionBadge display={s.positionDisplay} you={mine} />
                    <div>
                      <div className={`text-sm ${mine ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
                        {s.displayName}
                        {mine && <span className="ml-1.5 text-xs font-normal text-green-700">you</span>}
                      </div>
                      <div className="text-xs text-gray-400">{s.golfersComplete}/6 finished</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToPar value={s.teamTotal} className="text-lg" />
                    <Chevron open={expanded} />
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40">
                    {golfersForDisplay(s).map((g, i) => (
                      <GolferRow key={`${g.name}-${i}`} g={g} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
