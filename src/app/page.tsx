import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionUser();
  redirect(session ? "/me" : "/login");
}
