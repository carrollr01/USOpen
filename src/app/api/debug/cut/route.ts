import { NextRequest, NextResponse } from "next/server";
import { authSecret } from "@/lib/crypto";
import { ensureReady, getAllUsersWithPicks } from "@/lib/db";
import { getLeaderboard } from "@/lib/espn";
import { buildStandings } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify cut handling end-to-end against the live event.
export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await ensureReady();
  const users = await getAllUsersWithPicks();
  const lb = await getLeaderboard(true);

  const cutGolfers = lb.golfers
    .filter((g) => g.status !== "active")
    .map((g) => ({ name: g.name, toPar: g.toPar, status: g.status, pos: g.positionDisplay }));

  const standings = buildStandings(users, lb.golfers).map((t) => ({
    pos: t.positionDisplay,
    name: t.displayName,
    total: t.teamTotal,
    golfers: t.golfers.map((g) => ({
      name: g.name,
      toPar: g.toPar,
      status: g.status,
      eff: g.effective,
      counts: g.counted,
    })),
  }));

  return NextResponse.json({
    event: lb.event,
    cutCount: cutGolfers.length,
    cutGolfers,
    standings,
  });
}
