/**
 * Shared authentication utility for all Colyseus rooms.
 * Verifies JWT tokens against the Grudge auth-gateway.
 */

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://id.grudge-studio.com";

export interface AuthResult {
  grudgeId: string;
  username: string;
  role: string;
}

/**
 * Verify a Bearer token against the auth-gateway.
 * Returns the user payload on success, or null on failure.
 */
export async function verifyToken(token: string): Promise<AuthResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${AUTH_GATEWAY}/api/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.grudgeId) return null;
    return {
      grudgeId: data.grudgeId,
      username: data.username || data.user?.username || "Unknown",
      role: data.user?.role || "player",
    };
  } catch {
    return null;
  }
}

/**
 * Standard onAuth handler for Colyseus rooms.
 * Accepts token-based auth or falls back to guest.
 */
export async function roomAuth(
  sessionId: string,
  options: { token?: string; username?: string },
  guestPrefix = "Guest"
): Promise<AuthResult> {
  if (options.token) {
    const verified = await verifyToken(options.token);
    if (verified) return verified;
  }
  return {
    grudgeId: `guest-${sessionId}`,
    username: options.username || `${guestPrefix}-${sessionId.slice(0, 4)}`,
    role: "guest",
  };
}
