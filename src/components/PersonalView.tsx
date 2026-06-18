"use client";

import Link from "next/link";
import { useLeaderboard } from "./useLeaderboard";
import { GolferRow, PositionBadge, ToPar, UpdatedBar, golfersForDisplay } from "./ui";
import { Card, EmptyState } from "./shells";

export function PersonalView({ me }: { me: string }) {
  const { data, error, loading, refreshing, refresh } = useLeaderboard();

  if (loading && !data) return <EmptyState>Loading your team…</EmptyState>;

  const myTeam = data?.standings.find((s) => s.username === me) ?? null;
  const total = data?.standings.length ?? 0;

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

      {error && !data && (
        <Card className="px-4 py-3 text-sm text-gray-500">{error}</Card>
      )}

      {myTeam && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Your position
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <PositionBadge display={myTeam.positionDisplay} you />
                <span className="text-sm text-gray-400">of {total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Team score
              </div>
              <div className="mt-1 text-3xl font-bold">
                <ToPar value={myTeam.teamTotal} />
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
            Best 4 of your 6 golfers count · {myTeam.golfersComplete}/6 finished
          </div>
        </Card>
      )}

      {myTeam && (
        <Card>
          <div className="border-b border-gray-100 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">
            Your golfers
          </div>
          <div className="divide-y divide-gray-100">
            {golfersForDisplay(myTeam).map((g, i) => (
              <GolferRow key={`${g.name}-${i}`} g={g} />
            ))}
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
            Highlighted = counting toward your total. A missed cut counts as the golfer&apos;s
            score plus 20.
          </div>
        </Card>
      )}

      {data && (
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
              League
            </span>
            <Link href="/league" className="text-xs font-medium text-green-700 hover:underline">
              Full standings →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.standings.map((s) => {
              const mine = s.username === me;
              return (
                <div
                  key={s.username}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    mine ? "bg-green-50/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 text-sm font-semibold tabular text-gray-500">
                      {s.positionDisplay}
                    </span>
                    <span className={`text-sm ${mine ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {s.displayName}
                      {mine && <span className="ml-1 text-xs text-green-700">you</span>}
                    </span>
                  </div>
                  <ToPar value={s.teamTotal} />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
