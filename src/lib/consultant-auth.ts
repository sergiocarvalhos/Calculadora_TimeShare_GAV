// ===== CONSULTANT AUTH =====
// Session management for logged-in consultants.
// Sessions live in localStorage and expire after 8 hours.
// All functions are browser-only — never call at module level or during SSR.

import type { ConsultantRole } from "./consultant-store";
import { findConsultantByCredentials, getFullName } from "./consultant-store";

export type ConsultantSession = {
  consultantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: ConsultantRole;
  loginAt: string;
  expiresAt: string;
};

const SESSION_KEY = "timeshare:consultant_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ===== LOGIN =====
// Returns the new session on success, null if credentials are invalid.
export function loginConsultant(
  email: string,
  pin: string
): ConsultantSession | null {
  const consultant = findConsultantByCredentials(email, pin);
  if (!consultant) return null;

  const now = new Date();
  const session: ConsultantSession = {
    consultantId: consultant.id,
    firstName: consultant.firstName,
    lastName: consultant.lastName,
    fullName: getFullName(consultant),
    role: consultant.role,
    loginAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors
  }

  return session;
}

// ===== LOGOUT =====
export function logoutConsultant(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ===== GET SESSION =====
// Returns the active session or null if not logged in / expired.
export function getConsultantSession(): ConsultantSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as ConsultantSession;

    // Check expiry
    if (new Date() > new Date(session.expiresAt)) {
      logoutConsultant();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// ===== IS VALID =====
export function isConsultantSessionValid(): boolean {
  return getConsultantSession() !== null;
}

// ===== REFRESH EXPIRY =====
// Call this on user activity to extend the session.
export function refreshConsultantSession(): void {
  const session = getConsultantSession();
  if (!session) return;
  const updated: ConsultantSession = {
    ...session,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
