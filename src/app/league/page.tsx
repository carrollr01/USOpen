import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LeagueView } from "@/components/LeagueView";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return <LeagueView me={session.u} />;
}
