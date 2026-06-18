import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PersonalView } from "@/components/PersonalView";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return <PersonalView me={session.u} />;
}
