import { NextRequest, NextResponse } from "next/server";
import { authSecret } from "@/lib/crypto";
import { ensureReady, getAllUsersWithPicks } from "@/lib/db";
import { getLeaderboard } from "@/lib/espn";
import { buildStandings } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("key") !== authSecret()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await ensureReady();
  const users = await getAllUsersWithPicks();
  const lb = await getLeaderboard(true);

  const out = lb.golfers.filter((g) => g.status !== "active");
  const made = lb.golfers.filter((g) => g.status === "active" && g.toPar !== null);
  const madeToPar = made.map((g) => g.toPar as number);
  const cutToPar = out.filter((g) => g.toPar !== null).map((g) => g.toPar as number);

  const standings = buildStandings(users, lb.golfers).map((t) => ({
    pos: t.positionDisplay,
    name: t.displayName,
    total: t.teamTotal,
    golfers: t.golfers.map((g) => `${g.name}: ${g.toPar}${g.status !== "active" ? `(${g.status}->${g.effective})` : ""}${g.counted ? " *" : ""}`),
  }));

  return NextResponse.json({
    event: lb.event,
    fieldOut: out.length,
    fieldMade: made.length,
    worstScoreThatMadeCut: madeToPar.length ? Math.max(...madeToPar) : null,
    bestScoreThatMissed: cutToPar.length ? Math.min(...cutToPar) : null,
    outGolfersAmongField: out.slice(0, 6).map((g) => `${g.name} ${g.toPar} (${g.status})`),
    standings,
  });
}
