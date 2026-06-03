// ===== CONFIG STORE =====
// Centralized configuration module for the Time Share Calculator.
// Persists data in localStorage with fallback to hardcoded defaults.
// Both the calculator (index.tsx) and admin panel (admin.tsx) import from here.

export type Season = "Baixa" | "Média" | "Alta" | "Altíssima";
export const SEASONS: Season[] = ["Baixa", "Média", "Alta", "Altíssima"];

export type Room = {
  id: string;
  type: string;
  shortType: string;
  capacity: number;
  costs: Partial<Record<Season, number>>;   // Time Share — pontos por diária
  balcao: Partial<Record<Season, number>>;  // Tarifa balcão — R$ por diária (2 pax)
};

export type Resort = {
  id: string;
  name: string;
  tagline: string;
  rooms: Room[];
};

export type AppConfig = {
  pointCost: number;      // e.g. 0.17
  minPoints: number;      // e.g. 8000
  minNights: number;      // e.g. 2
  resorts: Resort[];
};

// ===== DEFAULT VALUES (same as the original hardcoded data) =====
export const DEFAULT_CONFIG: AppConfig = {
  pointCost: 0.17,
  minPoints: 8000,
  minNights: 2,
  resorts: [
    {
      id: "resort-1",
      name: "Park GAV Resort",
      tagline: "Diversão para a família",
      rooms: [
        { id: "room-1-1", type: "1 Quarto", shortType: "1Q", capacity: 5, costs: { Baixa: 2800, Média: 3000, Alta: 6300, Altíssima: 6500 }, balcao: { Baixa: 476.00, Média: 642.00, Alta: 2025.45, Altíssima: 2226.07 } },
        { id: "room-1-2", type: "2 Quartos", shortType: "2Q", capacity: 8, costs: { Baixa: 4600, Média: 4800, Alta: 8900, Altíssima: 9200 }, balcao: { Baixa: 792.00, Média: 1062.00, Alta: 1671.60, Altíssima: 2089.50 } },
      ],
    },
    {
      id: "resort-2",
      name: "Exclusive GAV Resort",
      tagline: "Experiência exclusiva",
      rooms: [
        { id: "room-2-1", type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Baixa: 2600, Média: 2800, Alta: 5900, Altíssima: 6000 }, balcao: { Baixa: 508.00, Média: 686.00, Alta: 1193.00, Altíssima: 1610.70 } },
        { id: "room-2-2", type: "2 Quartos", shortType: "2Q", capacity: 7, costs: { Baixa: 4300, Média: 4500, Alta: 8000, Altíssima: 8300 }, balcao: { Baixa: 839.00, Média: 1133.00, Alta: 1650.00, Altíssima: 2226.77 } },
      ],
    },
    {
      id: "resort-3",
      name: "Premium GAV Resort",
      tagline: "Conforto refinado",
      rooms: [
        { id: "room-3-1", type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Baixa: 2500, Média: 2600, Alta: 5700, Altíssima: 5900 }, balcao: { Baixa: 505.07, Média: 657.00, Alta: 1287.00, Altíssima: 1608.75 } },
        { id: "room-3-2", type: "2 Quartos", shortType: "2Q", capacity: 7, costs: { Baixa: 4200, Média: 4500, Alta: 9000, Altíssima: 9300 }, balcao: { Baixa: 775.00, Média: 1195.00, Alta: 1748.00, Altíssima: 1748.00 } },
      ],
    },
    {
      id: "resort-4",
      name: "Porto Alto Resort",
      tagline: "Beira-mar premium",
      rooms: [
        { id: "room-4-1", type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Média: 6300, Alta: 9100, Altíssima: 13600 }, balcao: { Média: 1266.00, Alta: 1682.10, Altíssima: 2102.63 } },
        { id: "room-4-2", type: "2 Quartos", shortType: "2Q", capacity: 6, costs: { Média: 12400, Alta: 18000, Altíssima: 27000 }, balcao: { Média: 2421.00, Alta: 3218.25, Altíssima: 4022.81 } },
      ],
    },
    {
      id: "resort-5",
      name: "Pyrenéus Residence",
      tagline: "Águas termais",
      rooms: [
        { id: "room-5-1", type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Baixa: 4600, Média: 4800, Alta: 7300, Altíssima: 9100 }, balcao: { Baixa: 756.00, Média: 945.00, Alta: 1562.00, Altíssima: 1563.00 } },
      ],
    },
  ],
};

// ===== STORAGE KEY =====
const STORAGE_KEY = "timeshare:config";

// ===== CUSTOM EVENT for cross-component sync =====
export const CONFIG_UPDATED_EVENT = "timeshare:config-updated";

// ===== GET CONFIG =====
export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      // Merge with defaults to ensure all fields exist
      // Also migrate rooms that may not have the balcao field (added later)
      const resorts = (parsed.resorts ?? DEFAULT_CONFIG.resorts).map((r) => ({
        ...r,
        rooms: r.rooms.map((rm) => ({
          ...rm,
          balcao: rm.balcao ?? {},
        })),
      }));
      return {
        pointCost: parsed.pointCost ?? DEFAULT_CONFIG.pointCost,
        minPoints: parsed.minPoints ?? DEFAULT_CONFIG.minPoints,
        minNights: parsed.minNights ?? DEFAULT_CONFIG.minNights,
        resorts,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_CONFIG, resorts: DEFAULT_CONFIG.resorts.map((r) => ({ ...r, rooms: [...r.rooms] })) };
}

// ===== SAVE CONFIG =====
export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Dispatch custom event so other components (calculator) can react
    window.dispatchEvent(new CustomEvent(CONFIG_UPDATED_EVENT));
  } catch {
    // ignore quota errors
  }
}

// ===== RESET TO DEFAULTS =====
export function resetConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CONFIG_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

// ===== ID GENERATOR =====
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
