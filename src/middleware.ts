import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/crypto";

// Protect all pages except /login. API routes guard themselves.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const onLogin = req.nextUrl.pathname === "/login";

  if (!session && !onLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (session && onLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/me";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
