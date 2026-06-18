import { cookies } from "next/headers";
import { getUserByUsername, setUserPassword } from "./db";
import {
  hashPassword,
  verifyPassword,
  verifySessionToken,
  SESSION_COOKIE,
  type SessionPayload,
} from "./crypto";

export async function getSessionUser(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export type LoginResult =
  | { ok: true; user: { id: number; username: string; display_name: string } }
  | { ok: false; error: string };

// Logs a player in. The first time a known player signs in, whatever password
// they type becomes their password (claim-on-first-login).
export async function loginOrClaim(
  username: string,
  password: string,
): Promise<LoginResult> {
  const user = await getUserByUsername(username);
  if (!user) {
    return { ok: false, error: "Unknown player — pick your name from the list." };
  }
  if (!password) {
    return { ok: false, error: "Enter a password." };
  }

  if (!user.password_hash || !user.password_salt) {
    const { salt, hash } = await hashPassword(password);
    await setUserPassword(user.id, hash, salt);
    return { ok: true, user };
  }

  const valid = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Wrong password for this player." };
  }
  return { ok: true, user };
}
