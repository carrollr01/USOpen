import { NextResponse } from "next/server";
import { ensureReady, getAllUsersWithPicks } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/espn";
import { buildStandings } from "@/lib/scoring";
import type { LeaderboardResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await ensureReady();
    const users = await getAllUsersWithPicks();

    try {
      const lb = await getLeaderboard();
      const standings = buildStandings(users, lb.golfers);
      const body: LeaderboardResponse = {
        event: lb.event,
        standings,
        updatedAt: new Date().toISOString(),
        source: "live",
      };
      return NextResponse.json(body);
    } catch (err) {
      // Live scores unavailable — still return the rosters so the UI renders.
      const standings = buildStandings(users, []);
      const body: LeaderboardResponse = {
        event: null,
        standings,
        updatedAt: new Date().toISOString(),
        source: "unavailable",
        message: err instanceof Error ? err.message : "Live scores unavailable",
      };
      return NextResponse.json(body);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
