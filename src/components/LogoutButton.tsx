"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 active:bg-gray-100"
    >
      Sign out
    </button>
  );
}
