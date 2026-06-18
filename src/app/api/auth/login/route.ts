import { NextRequest, NextResponse } from "next/server";
import { ensureReady } from "@/lib/db";
import { loginOrClaim } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!username) {
    return NextResponse.json({ ok: false, error: "Pick your name." }, { status: 400 });
  }

  try {
    await ensureReady();
    const result = await loginOrClaim(username, password);
    if (!result.ok) {
      return NextResponse.json(result, { status: 401 });
    }
    const token = await createSessionToken({ uid: result.user.id, u: result.user.username });
    const res = NextResponse.json({
      ok: true,
      user: { username: result.user.username, displayName: result.user.display_name },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
