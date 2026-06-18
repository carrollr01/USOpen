import { NextRequest, NextResponse } from "next/server";
import { ensureReady, getAllUsersWithPicks } from "@/lib/db";
import { authSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time helper to create tables and seed the league right after the
// database is connected. Call: /api/init?key=<AUTH_SECRET>
export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== (process.env.INIT_SECRET ?? authSecret())) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    await ensureReady();
    const users = await getAllUsersWithPicks();
    return NextResponse.json({
      ok: true,
      users: users.length,
      picks: users.reduce((n, u) => n + u.golfers.length, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
