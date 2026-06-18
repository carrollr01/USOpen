"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-md border border-gray-200 px-2.5 py-1 text-sm text-gray-600 transition hover:bg-gray-50"
    >
      Sign out
    </button>
  );
}
