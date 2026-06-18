import { NavTabs } from "./NavTabs";
import { LogoutButton } from "./LogoutButton";

export function AppHeader({ displayName }: { displayName: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-3">
        <div className="text-sm font-bold tracking-wide text-green-700">U.S. OPEN POOL</div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-500 sm:inline">{displayName}</span>
          <LogoutButton />
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4">
        <NavTabs />
      </div>
    </header>
  );
}
