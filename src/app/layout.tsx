import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSessionUser } from "@/lib/auth";
import { ROSTER } from "@/lib/roster";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "U.S. Open Pool",
  description: "Pick 6, use 4 — live U.S. Open golf pool.",
  appleWebApp: {
    capable: true,
    title: "U.S. Open Pool",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2d6a39",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <main className="mx-auto max-w-2xl px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </body>
    </html>
  );
}
