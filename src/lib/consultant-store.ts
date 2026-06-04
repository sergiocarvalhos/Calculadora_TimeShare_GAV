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
  } catch {
    // ignore quota errors
  }
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

// ===== UTILS =====
export function getFullName(
  c: Pick<Consultant, "firstName" | "lastName">
): string {
  return `${c.firstName} ${c.lastName}`.trim();
}
