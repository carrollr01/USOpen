import { ROSTER } from "@/lib/roster";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const players = ROSTER.map((r) => ({ username: r.username, displayName: r.displayName }));
  return (
    <div className="mx-auto mt-8 max-w-sm">
      <LoginForm players={players} />
    </div>
  );
}
