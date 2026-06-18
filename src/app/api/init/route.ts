import { NextRequest, NextResponse } from "next/server";
import { ensureReady, getAllUsersWithPicks } from "@/lib/db";
import { getLeaderboard } from "@/lib/espn";
import { matchGolfer } from "@/lib/match";
import { authSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sync the roster into the DB and report any picks that don't match the live
// field. Call: /api/init?key=<AUTH_SECRET>
export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== (process.env.INIT_SECRET ?? authSecret())) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    await ensureReady();
    const users = await getAllUsersWithPicks();

    let fieldSize = 0;
    let unmatched: string[] = [];
    try {
      const lb = await getLeaderboard(true);
      fieldSize = lb.golfers.length;
      const picks = Array.from(new Set(users.flatMap((u) => u.golfers)));
      unmatched = picks.filter((p) => !matchGolfer(p, lb.golfers));
    } catch {
      /* live field unavailable; roster sync still succeeded */
    }

    return NextResponse.json({
      ok: true,
      users: users.map((u) => u.username),
      picks: users.reduce((n, u) => n + u.golfers.length, 0),
      fieldSize,
      unmatched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
