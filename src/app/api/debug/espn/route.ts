import { NextRequest, NextResponse } from "next/server";
import { authSecret } from "@/lib/crypto";
import { ensureReady, getAllUsersWithPicks } from "@/lib/db";
import { getLeaderboard } from "@/lib/espn";
import { buildStandings } from "@/lib/scoring";
import { matchGolfer } from "@/lib/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Full-pipeline validation against live data: DB seed + ESPN parse + matching + scoring.
export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await ensureReady();
  const users = await getAllUsersWithPicks();
  const lb = await getLeaderboard(true);

  // Which picks failed to match the live field?
  const allPicks = Array.from(new Set(users.flatMap((u) => u.golfers)));
  const unmatched = allPicks.filter((p) => !matchGolfer(p, lb.golfers));

  const standings = buildStandings(users, lb.golfers).map((t) => ({
    pos: t.positionDisplay,
    name: t.displayName,
    total: t.teamTotal,
    golfers: t.golfers.map((g) => ({
      pick: g.name,
      found: g.found,
      toPar: g.toPar,
      status: g.status,
      thru: g.thru,
      counts: g.counted,
    })),
  }));

  return NextResponse.json({
    event: lb.event,
    fieldSize: lb.golfers.length,
    unmatched,
    sampleField: lb.golfers.slice(0, 3).map((g) => ({ name: g.name, toPar: g.toPar, thru: g.thru, pos: g.positionDisplay })),
    standings,
  });
}
