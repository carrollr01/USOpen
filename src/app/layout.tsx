import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSessionUser } from "@/lib/auth";
import { ROSTER } from "@/lib/roster";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "U.S. Open Pool",
  description: "Pick 6, use 4 — live U.S. Open golf pool.",
};

export const viewport: Viewport = {
  themeColor: "#2d6a39",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  const displayName = session
    ? ROSTER.find((r) => r.username === session.u)?.displayName ?? session.u
    : "";

  return (
    <html lang="en">
      <body>
        {session && <AppHeader displayName={displayName} />}
        <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
