// ===== CONSULTANT STORE =====
// Manages the list of consultants who can log into the calculator.
// Data persists in localStorage under "timeshare:consultants".
// Both the admin panel (CRUD) and the auth module read from here.

export type ConsultantRole = "Consultor" | "Supervisor" | "Administrador";

export type Consultant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pin: string;         // 6-digit numeric PIN
  role: ConsultantRole;
  active: boolean;
  createdAt: string;
  mustChangePin?: boolean;
};

export const CONSULTANTS_KEY = "timeshare:consultants";
export const CONSULTANTS_UPDATED_EVENT = "timeshare:consultants-updated";

// Default admin consultant so the system is never locked on first use.
// The admin should update the PIN after the first login.
const DEFAULT_CONSULTANTS: Consultant[] = [
  {
    id: "consultant-admin-default",
    firstName: "Admin",
    lastName: "GAV",
    email: "admin@gavresorts.com.br",
    pin: "123456",
    role: "Administrador",
    active: true,
    createdAt: new Date(0).toISOString(),
    mustChangePin: false,
  },
];

// ===== READ =====
export function getConsultants(): Consultant[] {
  try {
    const raw = localStorage.getItem(CONSULTANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Consultant[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [...DEFAULT_CONSULTANTS];
}

// ===== WRITE =====
export function saveConsultants(list: Consultant[]): void {
  try {
    localStorage.setItem(CONSULTANTS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(CONSULTANTS_UPDATED_EVENT));
    // Fire-and-forget KV push — syncs data to Cloudflare KV so all devices stay in sync.
    // In local dev (no KV binding), this silently does nothing.
    void pushConsultantsToKV(list);
  } catch {
    // ignore quota errors
  }
}

// ===== KV SYNC (via /api/kv/consultants — direct Worker API) =====

/**
 * Fetches the consultant list from Cloudflare KV and writes it to localStorage.
 * Call this on app mount so any device gets the latest data from the shared KV store.
 * Returns true if KV had data and localStorage was updated, false otherwise.
 */
export async function syncConsultantsFromKV(): Promise<boolean> {
  try {
    const res = await fetch("/api/kv/consultants");
    const json = await res.json() as { ok: boolean; data: Consultant[] | null };
    if (json.ok && json.data && json.data.length > 0) {
      localStorage.setItem(CONSULTANTS_KEY, JSON.stringify(json.data));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CONSULTANTS_UPDATED_EVENT));
      }
      return true;
    }
  } catch {
    // KV unavailable (local dev or network error) — use localStorage fallback
  }
  return false;
}

/**
 * Pushes the current consultant list to Cloudflare KV.
 * Fire-and-forget — failures are silently swallowed.
 */
export function pushConsultantsToKV(list: Consultant[]): void {
  fetch("/api/kv/consultants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(list),
  }).catch(() => {});
}

/**
 * Explicitly pushes the consultant list to KV and returns the result.
 * Used by the admin "Sync to Cloud" button to show success/error feedback.
 */
export async function forcePushConsultantsToKV(): Promise<{ ok: boolean; debug?: string }> {
  try {
    const list = getConsultants();
    const res = await fetch("/api/kv/consultants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    });
    const json = await res.json() as { ok: boolean; debug?: string };
    return json;
  } catch (e) {
    return { ok: false, debug: `fetch_error: ${String(e)}` };
  }
}

// ===== BULK IMPORT =====

export type BulkImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  role?: ConsultantRole;
};

export type BulkImportResult = {
  created: Consultant[];
  errors: { row: number; email: string; name: string; reason: string }[];
};

/**
 * Imports a list of consultants in bulk.
 * - PIN is set to "123456" with mustChangePin=true for all.
 * - Validates email format and detects duplicates (within the file and existing list).
 * - Saves all valid rows in a single write + KV push.
 */
export async function importConsultantsInBulk(rows: BulkImportRow[]): Promise<BulkImportResult> {
  const existing = getConsultants();
  const existingEmails = new Set(existing.map((c) => c.email.toLowerCase()));
  const seenInBatch = new Set<string>();

  const created: Consultant[] = [];
  const errors: BulkImportResult["errors"] = [];

  const VALID_ROLES: ConsultantRole[] = ["Consultor", "Supervisor", "Administrador"];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DEFAULT_PIN = "123456";

  rows.forEach((row, i) => {
    const rowNum = i + 1;
    const firstName = (row.firstName ?? "").trim();
    const lastName = (row.lastName ?? "").trim();
    const email = (row.email ?? "").trim().toLowerCase();
    const name = `${firstName} ${lastName}`.trim() || `(linha ${rowNum})`;
    const role: ConsultantRole = VALID_ROLES.includes(row.role as ConsultantRole)
      ? (row.role as ConsultantRole)
      : "Consultor";

    if (!firstName && !lastName) {
      errors.push({ row: rowNum, email, name, reason: "Nome obrigatório" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, email, name, reason: "E-mail inválido" });
      return;
    }
    if (existingEmails.has(email)) {
      errors.push({ row: rowNum, email, name, reason: "E-mail já cadastrado" });
      return;
    }
    if (seenInBatch.has(email)) {
      errors.push({ row: rowNum, email, name, reason: "E-mail duplicado na planilha" });
      return;
    }

    seenInBatch.add(email);
    const newConsultant: Consultant = {
      id: `consultant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${rowNum}`,
      firstName,
      lastName,
      email,
      pin: DEFAULT_PIN,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      mustChangePin: true,
    };
    created.push(newConsultant);
    existingEmails.add(email);
  });

  if (created.length > 0) {
    const updatedList = [...existing, ...created];
    saveConsultants(updatedList);
  }

  return { created, errors };
}

// ===== CRUD =====
export function addConsultant(
  data: Omit<Consultant, "id" | "createdAt">
): Consultant {
  const consultants = getConsultants();
  const newConsultant: Consultant = {
    ...data,
    id: `consultant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  saveConsultants([...consultants, newConsultant]);
  return newConsultant;
}

export function updateConsultant(
  id: string,
  updates: Partial<Omit<Consultant, "id" | "createdAt">>
): void {
  const consultants = getConsultants();
  saveConsultants(
    consultants.map((c) => (c.id === id ? { ...c, ...updates } : c))
  );
}

export function toggleConsultantActive(id: string): void {
  const consultants = getConsultants();
  saveConsultants(
    consultants.map((c) =>
      c.id === id ? { ...c, active: !c.active } : c
    )
  );
}

export function removeConsultant(id: string): void {
  saveConsultants(getConsultants().filter((c) => c.id !== id));
}

// ===== AUTH HELPER =====
export function findConsultantByCredentials(
  email: string,
  pin: string
): Consultant | null {
  const consultants = getConsultants();
  return (
    consultants.find(
      (c) =>
        c.email.toLowerCase() === email.toLowerCase().trim() &&
        c.pin === pin.trim() &&
        c.active
    ) ?? null
  );
}

export function isValidPin(pin: string): boolean {
  return /^[a-zA-Z0-9]{6,20}$/.test(pin);
}

export function resetUserPin(id: string, newPin: string): void {
  updateConsultant(id, { pin: newPin, mustChangePin: true });
}

// ===== UTILS =====
export function getFullName(
  c: Pick<Consultant, "firstName" | "lastName">
): string {
  return `${c.firstName} ${c.lastName}`.trim();
}
