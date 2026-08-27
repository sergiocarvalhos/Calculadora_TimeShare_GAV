import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useTransition } from "react";

import {
  LayoutDashboard,
  History,
  UserCheck,
  Plus,
  Search,
  Eye,
  EyeOff,
  X,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Menu,
  ArrowLeft,
  Mail,
  Shield,
  Activity,
  AlertCircle,
  UserPlus,
  Trash2,
  ChevronDown,
  User,
  Lock,
  LogOut,
  FileText,
  Settings,
  Save,
  PlusCircle,
  Hotel,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { useIsMobile } from "../hooks/use-mobile";
import { getConfig, saveConfig, resetConfig, generateId, SEASONS, CONFIG_UPDATED_EVENT } from "../lib/config-store";
import type { AppConfig, Resort, Room, Season } from "../lib/config-store";
import { getConsultants, addConsultant, toggleConsultantActive, getFullName, CONSULTANTS_UPDATED_EVENT, findConsultantByCredentials, updateConsultant, isValidPin, resetUserPin, syncConsultantsFromKV, forcePushConsultantsToKV } from "../lib/consultant-store";
import type { Consultant, ConsultantRole } from "../lib/consultant-store";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Painel Admin - Time Share Converter" },
      { name: "description", content: "Painel administrativo de simulações, acessos e métricas de conversão." },
    ],
  }),
});

// ===== TYPES =====
type Role = ConsultantRole; // aliased from consultant-store

// Real simulation history entry (matches what index.tsx writes to localStorage)
type RealHistoryEntry = {
  id: string;
  createdAt: string;
  balance: number;
  points: number;
  status: "pendente" | "aceita" | "nao_aceita" | "inelegivel";
  rejectionReason?: string;
  consultantId?: string;
  consultantName?: string;
};

// ===== PERMISSION HELPERS =====
function canCreateUsers(role: Role): boolean {
  return role === "Administrador" || role === "Supervisor";
}

function getCreatableRoles(role: Role): Role[] {
  if (role === "Administrador") return ["Consultor", "Supervisor", "Administrador"];
  if (role === "Supervisor") return ["Consultor"];
  return [];
}

function canToggleUser(currentRole: Role, targetUser: Consultant, currentUserId: string): boolean {
  // Nobody can toggle themselves
  if (targetUser.id === currentUserId) return false;
  // Admin can toggle everyone except themselves (handled above)
  if (currentRole === "Administrador") {
    // But cannot deactivate another Admin
    return targetUser.role !== "Administrador";
  }
  // Supervisor can only toggle Consultores
  if (currentRole === "Supervisor") return targetUser.role === "Consultor";
  // Consultor can't toggle anyone
  return false;
}

function canEditUser(currentRole: Role, targetUser: Consultant, currentUserId: string): boolean {
  if (targetUser.id === currentUserId) return false; // não pode editar a si mesmo
  if (currentRole === 'Administrador') return true; // admin edita todos exceto si mesmo
  if (currentRole === 'Supervisor') return targetUser.role === 'Consultor';
  return false;
}

function canDeleteSimulation(role: Role): boolean {
  return role === "Administrador" || role === "Supervisor";
}

function getRoleBadgeStyles(role: Role): { bg: string; text: string; border: string } {
  switch (role) {
    case "Administrador":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" };
    case "Supervisor":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" };
    case "Consultor":
      return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" };
  }
}

function getRoleIcon(role: Role) {
  switch (role) {
    case "Administrador":
      return <Shield className="h-3 w-3" />;
    case "Supervisor":
      return <Eye className="h-3 w-3" />;
    case "Consultor":
      return <User className="h-3 w-3" />;
  }
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ===== ADMIN AUTH HELPERS =====
const ADMIN_SESSION_KEY = "timeshare:admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function isAdminSessionValid(): boolean {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw) as { ts: number };
    return Date.now() - ts < SESSION_DURATION_MS;
  } catch {
    return false;
  }
}

function createAdminSession(): void {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ ts: Date.now() }));
}

function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

// ===== MAIN COMPONENT =====
function AdminDashboardInner() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "allowlist" | "parameters">("dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ===== AUTH STATE =====
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminSessionValid);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loginRoleError, setLoginRoleError] = useState(false);
  const [loginShake, setLoginShake] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ===== CONFIG STATE =====
  const [config, setConfig] = useState<AppConfig>(getConfig);
  const [configSaved, setConfigSaved] = useState(false);
  const [kvSyncing, setKvSyncing] = useState(false);
  const [kvSyncStatus, setKvSyncStatus] = useState<string | null>(null);
  const [editingResortId, setEditingResortId] = useState<string | null>(null);
  const [addResortOpen, setAddResortOpen] = useState(false);
  const [newResortName, setNewResortName] = useState("");
  const [newResortTagline, setNewResortTagline] = useState("");
  const [addRoomForResort, setAddRoomForResort] = useState<string | null>(null);
  const [newRoomType, setNewRoomType] = useState("");
  const [newRoomShort, setNewRoomShort] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState(4);
  const [deleteResortConfirm, setDeleteResortConfirm] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setConfig(getConfig());
    window.addEventListener(CONFIG_UPDATED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CONFIG_UPDATED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // ===== USERS (from consultant store — real data) =====
  const [users, setUsers] = useState<Consultant[]>([]);

  useEffect(() => {
    // Sync from KV first so this device gets the latest consultant list,
    // then load from localStorage (which was just updated by the sync).
    syncConsultantsFromKV()
      .catch(() => {})
      .finally(() => setUsers(getConsultants()));

    const handler = () => setUsers(getConsultants());
    window.addEventListener(CONSULTANTS_UPDATED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CONSULTANTS_UPDATED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);


  // ===== CURRENT USER (profile switcher — defaults to first Administrador) =====
  const [currentUserId, setCurrentUserId] = useState("");
  const defaultAdminUser: Consultant = {
    id: "admin-default",
    firstName: "Admin",
    lastName: "GAV",
    email: "admin@gavresorts.com.br",
    role: "Administrador",
    pin: "",
    active: true,
    createdAt: new Date(0).toISOString(),
  };
  const currentUser =
    users.find((u) => u.id === currentUserId) ??
    users.find((u) => u.role === "Administrador") ??
    defaultAdminUser;

  // ===== REAL SIMULATION HISTORY (from localStorage — matches index.tsx) =====
  const HISTORY_KEY = "timeshare:history";
  const [historySearch, setHistorySearch] = useState("");
  const [consultorFilter, setConsultorFilter] = useState("");
  const [selectedRejection, setSelectedRejection] = useState<RealHistoryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RealHistoryEntry | null>(null);
  const [simulations, setSimulations] = useState<RealHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setSimulations(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ===== ADD CONSULTANT MODAL =====
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<Role>("Consultor");
  const [newActive, setNewActive] = useState(true);

  // ===== EDIT USER MODAL =====
  const [editingUser, setEditingUser] = useState<Consultant | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('Consultor');
  const [editActive, setEditActive] = useState(true);
  const [editPinError, setEditPinError] = useState('');

  // ===== RESET PIN MODAL =====
  const [resetPinUser, setResetPinUser] = useState<Consultant | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [resetPinConfirm, setResetPinConfirm] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  const [resetPinSuccess, setResetPinSuccess] = useState('');

  // ===== AUTH HANDLERS =====
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim() || isPending) return;

    const c = findConsultantByCredentials(loginEmail.trim(), loginPassword.trim());
    if (!c || (c.role !== "Administrador" && c.role !== "Supervisor")) {
      if (c && c.role === "Consultor") {
        setLoginRoleError(true);
        setLoginError(false);
      } else {
        setLoginError(true);
        setLoginRoleError(false);
      }
      return;
    }

    createAdminSession();
    setIsAuthenticated(true);
    setCurrentUserId(c.id);
    setLoginError(false);
    setLoginRoleError(false);
    setLoginPassword("");
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setLoginPassword("");
    setLoginError(false);
    setLoginRoleError(false);
  };

  // ===== HANDLERS =====
  const handleToggleUserActive = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target || !canToggleUser(currentUser.role, target, currentUserId)) return;
    toggleConsultantActive(id);
    // State updates via CONSULTANTS_UPDATED_EVENT listener
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || !isValidPin(newPin)) return;
    if (!canCreateUsers(currentUser.role)) return;

    const creatableRoles = getCreatableRoles(currentUser.role);
    const roleToAssign = creatableRoles.includes(newRole) ? newRole : creatableRoles[0];

    addConsultant({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      email: newEmail.trim().toLowerCase(),
      pin: newPin,
      role: roleToAssign,
      active: newActive,
      mustChangePin: true,
    });

    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewPin("");
    setNewRole("Consultor");
    setNewActive(true);
    setIsAddUserOpen(false);
  };

  const openEditUser = (user: Consultant) => {
    setEditingUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.active);
    setEditPinError('');
  };

  const handleEditUserSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) return;
    updateConsultant(editingUser.id, {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      email: editEmail.trim().toLowerCase(),
      role: editRole,
      active: editActive,
    });
    setEditingUser(null);
  };

  const openResetPin = (user: Consultant) => {
    setResetPinUser(user);
    setResetPinValue('');
    setResetPinConfirm('');
    setResetPinError('');
    setResetPinSuccess('');
  };

  const handleResetPinSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinUser) return;
    if (!isValidPin(resetPinValue)) {
      setResetPinError('O PIN deve ter entre 6 e 20 caracteres alfanuméricos (sem símbolos especiais).');
      return;
    }
    if (resetPinValue !== resetPinConfirm) {
      setResetPinError('Os PINs digitados não coincidem.');
      return;
    }
    resetUserPin(resetPinUser.id, resetPinValue);
    setResetPinSuccess(`Senha resetada com sucesso! Comunique o novo PIN ao usuário e peça que ele troque no próximo acesso.`);
    setResetPinValue('');
    setResetPinConfirm('');
  };

  const handleDeleteSimulation = (id: string) => {
    if (!canDeleteSimulation(currentUser.role)) return;
    const updated = simulations.filter((sim) => sim.id !== id);
    setSimulations(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    setDeleteConfirm(null);
  };

  const handleSwitchProfile = (userId: string) => {
    setCurrentUserId(userId);
    setProfileMenuOpen(false);
  };

  // ===== FILTERED SIMULATIONS =====
  const filteredSimulations = useMemo(() => {
    return simulations.filter((sim) => {
      const term = historySearch.toLowerCase();
      const byConsultor = !consultorFilter || sim.consultantId === consultorFilter;
      const byText =
        !term ||
        (sim.consultantName ?? "").toLowerCase().includes(term) ||
        sim.status.toLowerCase().includes(term) ||
        sim.id.toLowerCase().includes(term);
      return byConsultor && byText;
    });
  }, [simulations, historySearch, consultorFilter]);

  // ===== CHART STATE =====
  const CHART_COLORS = [
    "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
    "#0891b2", "#be185d", "#65a30d", "#0f172a", "#9333ea",
  ];

  const todayISO = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  const [chartDateFrom, setChartDateFrom] = useState(thirtyDaysAgo);
  const [chartDateTo, setChartDateTo] = useState(todayISO);
  const [chartConsultant, setChartConsultant] = useState<string>("all");

  // ===== CHART DATA (aggregated by day per consultant) =====
  const chartData = useMemo(() => {
    const from = new Date(chartDateFrom + "T00:00:00");
    const to = new Date(chartDateTo + "T23:59:59");
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return [];

    const filtered = simulations.filter((sim) => {
      const d = new Date(sim.createdAt);
      const inRange = d >= from && d <= to;
      const inConsultant = chartConsultant === "all" || sim.consultantId === chartConsultant;
      return inRange && inConsultant;
    });

    // Build day map for every day in range
    const dayMap: Record<string, Record<string, number>> = {};
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      dayMap[key] = { total: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    // Aggregate simulations per day per consultant
    for (const sim of filtered) {
      const d = new Date(sim.createdAt);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const name = sim.consultantName ?? "Desconhecido";
      if (dayMap[key] !== undefined) {
        dayMap[key][name] = (dayMap[key][name] || 0) + 1;
        dayMap[key].total = (dayMap[key].total || 0) + 1;
      }
    }

    return Object.entries(dayMap).map(([date, counts]) => ({ date, ...counts }));
  }, [simulations, chartDateFrom, chartDateTo, chartConsultant]);

  // ===== CHART LINES (which consultant keys to render) =====
  const chartLines = useMemo(() => {
    if (chartConsultant !== "all") {
      const c = users.find((u) => u.id === chartConsultant);
      if (!c) return [];
      const name = `${c.firstName} ${c.lastName}`;
      return [{ key: name, label: name }];
    }
    // Collect all consultant names that have data in the filtered range
    const names = new Set<string>();
    chartData.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (k !== "date" && k !== "total") names.add(k);
      });
    });
    return Array.from(names).map((name) => ({ key: name, label: name }));
  }, [chartData, chartConsultant, users]);

  // ===== CONFIG HANDLERS =====
  const handleSaveConfig = () => {
    saveConfig(config);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleResetConfig = () => {
    if (window.confirm("Deseja restaurar todos os parâmetros aos valores padrão? Esta ação não pode ser desfeita.")) {
      resetConfig();
      setConfig(getConfig());
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    }
  };

  const updateConfigField = (field: keyof AppConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateResortField = (resortId: string, field: "name" | "tagline", value: string) => {
    setConfig((prev) => ({
      ...prev,
      resorts: prev.resorts.map((r) => (r.id === resortId ? { ...r, [field]: value } : r)),
    }));
  };

  const updateRoomCost = (resortId: string, roomId: string, season: Season, value: string) => {
    const num = value === "" ? undefined : parseInt(value, 10);
    setConfig((prev) => ({
      ...prev,
      resorts: prev.resorts.map((r) =>
        r.id === resortId
          ? {
              ...r,
              rooms: r.rooms.map((rm) =>
                rm.id === roomId
                  ? { ...rm, costs: { ...rm.costs, [season]: isNaN(num as number) ? undefined : num } }
                  : rm
              ),
            }
          : r
      ),
    }));
  };

  const updateRoomBalcao = (resortId: string, roomId: string, season: Season, value: string) => {
    const num = value === "" ? undefined : parseFloat(value);
    setConfig((prev) => ({
      ...prev,
      resorts: prev.resorts.map((r) =>
        r.id === resortId
          ? {
              ...r,
              rooms: r.rooms.map((rm) =>
                rm.id === roomId
                  ? { ...rm, balcao: { ...rm.balcao, [season]: isNaN(num as number) ? undefined : num } }
                  : rm
              ),
            }
          : r
      ),
    }));
  };

  const updateRoomCapacity = (resortId: string, roomId: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      resorts: prev.resorts.map((r) =>
        r.id === resortId
          ? { ...r, rooms: r.rooms.map((rm) => (rm.id === roomId ? { ...rm, capacity: value } : rm)) }
          : r
      ),
    }));
  };

  const handleAddResort = () => {
    if (!newResortName.trim()) return;
    const newResort: Resort = {
      id: generateId("resort"),
      name: newResortName.trim(),
      tagline: newResortTagline.trim() || "Novo empreendimento",
      rooms: [],
    };
    setConfig((prev) => ({ ...prev, resorts: [...prev.resorts, newResort] }));
    setNewResortName("");
    setNewResortTagline("");
    setAddResortOpen(false);
  };

  const handleDeleteResort = (resortId: string) => {
    setConfig((prev) => ({ ...prev, resorts: prev.resorts.filter((r) => r.id !== resortId) }));
    setDeleteResortConfirm(null);
  };

  const handleAddRoom = (resortId: string) => {
    if (!newRoomType.trim()) return;
    const newRoom: Room = {
      id: generateId("room"),
      type: newRoomType.trim(),
      shortType: newRoomShort.trim() || newRoomType.trim().substring(0, 2),
      capacity: newRoomCapacity,
      costs: {},
      balcao: {},
    };
    setConfig((prev) => ({
      ...prev,
      resorts: prev.resorts.map((r) => (r.id === resortId ? { ...r, rooms: [...r.rooms, newRoom] } : r)),
    }));
    setNewRoomType("");
    setNewRoomShort("");
    setNewRoomCapacity(4);
    setAddRoomForResort(null);
  };

  const handleDeleteRoom = (resortId: string, roomId: string) => {
    setConfig((prev) => ({
      ...prev,
      resorts: prev.resorts.map((r) =>
        r.id === resortId ? { ...r, rooms: r.rooms.filter((rm) => rm.id !== roomId) } : r
      ),
    }));
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "history", label: "Histórico de Simulações", icon: History },
    { id: "allowlist", label: "Acessos Autorizados", icon: UserCheck },
    ...(currentUser.role === "Administrador"
      ? [{ id: "parameters" as const, label: "Parâmetros", icon: Settings }]
      : []),
  ] as const;

  const roleStyles = getRoleBadgeStyles(currentUser.role);

  // ===== LOGIN SCREEN =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#001f42] via-[#002B5C] to-[#003d80] p-4">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #60a5fa 0%, transparent 50%)" }} />

        <div className="relative w-full max-w-md">
          {/* Card */}
          <div
            className={`bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden transition-transform duration-300 ${
              loginShake ? "animate-[shake_0.4s_ease-in-out]" : ""
            }`}
            style={loginShake ? { animation: "shake 0.4s ease-in-out" } : {}}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#002B5C] to-[#003d80] px-8 pt-10 pb-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
              <p className="text-blue-200 text-sm mt-1">GAV Resorts — Time Share</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
                <div className="relative mb-4">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(false); setLoginRoleError(false); }}
                    placeholder="seu@email.com"
                    autoFocus
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                      loginError ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(false); setLoginRoleError(false); }}
                    placeholder="PIN de acesso"
                    className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                      loginError
                        ? "border-rose-400 bg-rose-50 text-rose-800 focus:ring-2 focus:ring-rose-200"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginRoleError ? (
                  <p className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Acesso restrito. Seu perfil não tem permissão para o painel.
                  </p>
                ) : loginError ? (
                  <p className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    E-mail ou PIN incorretos. Tente novamente.
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={!loginEmail.trim() || !loginPassword.trim() || isPending}
                className="w-full rounded-xl bg-[#002B5C] hover:bg-[#003d80] text-white py-3 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all hover:shadow-xl hover:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Acessar Painel"
                )}
              </button>
            </form>

            <div className="px-8 pb-8 text-center">
              <p className="text-[11px] text-slate-400">
                Acesso restrito a colaboradores autorizados da GAV Resorts.
              </p>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <a href="/" className="text-blue-200 hover:text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar à Calculadora
            </a>
          </div>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            15% { transform: translateX(-8px); }
            30% { transform: translateX(8px); }
            45% { transform: translateX(-6px); }
            60% { transform: translateX(6px); }
            75% { transform: translateX(-3px); }
            90% { transform: translateX(3px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[#002B5C] text-white shadow-xl">
        <div className="flex h-16 items-center justify-between px-6 border-b border-blue-900">
          <span className="text-lg font-bold tracking-wider flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-300" />
            Time Share Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? "bg-white text-[#002B5C] shadow-md"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-blue-900">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-950/40 py-2.5 text-xs font-semibold text-blue-200 transition hover:bg-blue-950/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à Calculadora
          </Link>
        </div>
      </aside>

      {/* SIDEBAR - MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-[#002B5C] text-white p-5 shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-blue-200 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="mt-8 mb-8">
              <span className="text-lg font-bold tracking-wider flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-300" />
                Time Share Admin
              </span>
            </div>
            <nav className="flex-1 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                      active
                        ? "bg-white text-[#002B5C] shadow-md"
                        : "text-blue-100 hover:bg-blue-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto pt-4 border-t border-blue-900">
              <Link
                to="/"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-950/40 py-2.5 text-xs font-semibold text-blue-200 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar à Calculadora
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP BAR */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-[#002B5C] focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-slate-800 capitalize">
              {activeTab === "allowlist"
                ? "Acessos Autorizados"
                : activeTab === "history"
                  ? "Histórico de Simulações"
                  : activeTab === "parameters"
                    ? "Parâmetros de Configuração"
                    : "Dashboard Geral"}
            </h1>
          </div>

          {/* CURRENT USER BADGE (read-only — no profile switching) */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${roleStyles.bg} ${roleStyles.text} ${roleStyles.border}`}>
            {getRoleIcon(currentUser.role)}
            <span className="hidden sm:inline max-w-[160px] truncate">
              {getFullName(currentUser) || currentUser.email?.split("@")[0] || "Admin"}
            </span>
            <span className="sm:hidden">{currentUser.role.slice(0, 3)}</span>
          </div>

          {/* LOGOUT BUTTON */}
          <button
            onClick={handleLogout}
            title="Sair do painel"
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 text-xs font-semibold transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

        {/* PAGE CONTENT */}
        <div className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* METRIC CARDS */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* CARD 1 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Total de Simulações
                    </span>
                    <span className="text-3xl font-bold text-slate-800 mt-2 block">{simulations.length}</span>
                    <span className="text-xs text-slate-500 font-medium mt-1 inline-flex items-center gap-1">
                      {simulations.filter(s => s.status === "aceita").length} aceitas / {simulations.filter(s => s.status === "nao_aceita").length} não aceitas
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-[#002B5C] flex items-center justify-center">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>

                {/* CARD 2 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Taxa de Conversão
                    </span>
                    <span className="text-3xl font-bold text-slate-800 mt-2 block">{simulations.length > 0 ? Math.round((simulations.filter(s => s.status === "aceita").length / simulations.length) * 100) : 0}%</span>
                    <span className="text-xs text-slate-500 font-medium mt-1 block">Meta comercial: 40%</span>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>

                {/* CARD 3 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between sm:col-span-2 lg:col-span-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Valor Total Retido
                    </span>
                    <span className="text-3xl font-bold text-slate-800 mt-2 block">{formatBRL(simulations.filter(s => s.status === "aceita").reduce((sum, s) => sum + s.balance, 0))}</span>
                    <span className="text-xs text-blue-600 font-semibold mt-1 inline-flex items-center gap-1">
                      Saldo reaproveitado ativo
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* PERFORMANCE LINE CHART */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Chart Header + Controls */}
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#002B5C]" />
                      Performance de Simulações
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Volume diário de simulações no período selecionado</p>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    {/* Date From */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap uppercase tracking-wider">De</label>
                      <input
                        type="date"
                        value={chartDateFrom}
                        max={chartDateTo}
                        onChange={(e) => setChartDateFrom(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                    {/* Date To */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap uppercase tracking-wider">Até</label>
                      <input
                        type="date"
                        value={chartDateTo}
                        min={chartDateFrom}
                        onChange={(e) => setChartDateTo(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                    {/* Consultant Selector */}
                    <select
                      value={chartConsultant}
                      onChange={(e) => setChartConsultant(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#002B5C] cursor-pointer min-w-[160px]"
                    >
                      <option value="all">Equipe completa</option>
                      {users.filter((u) => u.active).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>

                    {/* Quick range buttons */}
                    {[
                      { label: "7d", days: 7 },
                      { label: "30d", days: 30 },
                      { label: "90d", days: 90 },
                    ].map(({ label, days }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(from.getDate() - days);
                          setChartDateFrom(from.toISOString().slice(0, 10));
                          setChartDateTo(to.toISOString().slice(0, 10));
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart Body */}
                <div className="p-4 pt-6">
                  {chartLines.length === 0 || chartData.every((d) => (d.total ?? 0) === 0) ? (
                    <div className="flex flex-col items-center justify-center h-[280px] text-slate-300">
                      <Activity className="h-14 w-14 mb-3" />
                      <p className="text-sm font-bold text-slate-400">Nenhuma simulação no período selecionado</p>
                      <p className="text-xs text-slate-400 mt-1">Ajuste as datas ou aguarde novas simulações</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                          width={28}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 8px 24px rgba(0,43,92,0.10)",
                            fontSize: "12px",
                            padding: "10px 14px",
                          }}
                          labelStyle={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}
                          itemStyle={{ color: "#475569" }}
                          formatter={(value: number, name: string) => [`${value} simulaç${value === 1 ? "ão" : "ões"}`, name]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "11px", paddingTop: "16px", fontWeight: 600 }}
                        />
                        {chartLines.map((line, idx) => (
                          <Line
                            key={line.key}
                            type="monotone"
                            dataKey={line.key}
                            name={line.label}
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3.5, strokeWidth: 2, fill: "white" }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Chart Footer */}
                <div className="px-5 pb-4 border-t border-slate-50 pt-3 flex flex-wrap gap-4 items-center">
                  <span className="text-xs text-slate-500 font-semibold">
                    {chartData.reduce((sum, d) => sum + ((d.total as number) || 0), 0)} simulações no período
                  </span>
                  {chartConsultant !== "all" && (
                    <button
                      type="button"
                      onClick={() => setChartConsultant("all")}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Ver equipe completa →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: HISTÓRICO DE SIMULAÇÕES ==================== */}
          {activeTab === "history" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* READ-ONLY BANNER FOR CONSULTOR */}
              {currentUser.role === "Consultor" && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800">
                  <FileText className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold">Histórico protegido — somente leitura</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Os registros de simulações servem como base de dados para oportunidades de argumentação comercial.
                    </p>
                  </div>
                </div>
              )}

              {/* FILTERS PANEL */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por consultor, empreendimento ou pontos..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch("")}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>

              {/* DATA TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                          Data / Hora
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                          Consultor
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">
                          Pontos Gerados
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">
                          Saldo Convertido
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">
                          Status
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSimulations.length > 0 ? (
                        filteredSimulations.map((sim) => {
                          const dateLabel = (() => {
                            try { return new Date(sim.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
                            catch { return sim.createdAt; }
                          })();
                          const statusBadge = (() => {
                            if (sim.status === "aceita") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"><CheckCircle className="h-3.5 w-3.5" />Aceita</span>;
                            if (sim.status === "nao_aceita") return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800"><XCircle className="h-3.5 w-3.5" />Não Aceita</span>;
                            if (sim.status === "inelegivel") return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"><XCircle className="h-3.5 w-3.5" />Inelegível</span>;
                            return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Pendente</span>;
                          })();
                          return (
                            <tr key={sim.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 text-slate-500 font-medium tabular-nums">{dateLabel}</td>
                              <td className="p-4 font-semibold text-slate-800">{sim.consultantName ?? <span className="text-slate-400 italic">—</span>}</td>
                              <td className="p-4 text-right font-medium text-slate-700 tabular-nums">{sim.points?.toLocaleString("pt-BR") ?? "—"}</td>
                              <td className="p-4 text-right font-bold text-slate-800 tabular-nums">{formatBRL(sim.balance ?? 0)}</td>
                              <td className="p-4 text-center">{statusBadge}</td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {sim.status === "nao_aceita" && sim.rejectionReason && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRejection(sim)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Ver Motivo
                                    </button>
                                  )}
                                  {canDeleteSimulation(currentUser.role) && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirm(sim)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200 transition-colors"
                                      title="Excluir simulação"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                            {simulations.length === 0 ? "Nenhuma simulação registrada ainda." : "Nenhum registro encontrado para o termo buscado."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: ACESSOS AUTORIZADOS ==================== */}
          {activeTab === "allowlist" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* READ-ONLY BANNER FOR CONSULTOR */}
              {currentUser.role === "Consultor" && (
                <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 p-4 rounded-xl text-slate-700">
                  <Lock className="h-5 w-5 flex-shrink-0 text-slate-500" />
                  <div>
                    <p className="text-sm font-bold">Acesso somente leitura</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seu perfil de Consultor permite apenas a visualização dos acessos autorizados.
                    </p>
                  </div>
                </div>
              )}

              {/* TOP HEADER BUTTONS */}
              {canCreateUsers(currentUser.role) && (
                <div className="flex items-center justify-end gap-3 flex-wrap">
                  {/* KV SYNC BUTTON — Admins only */}
                  {currentUser.role === "Administrador" && (
                    <div className="flex items-center gap-2">
                      {kvSyncStatus === "ok" && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Sincronizado!
                        </span>
                      )}
                      {kvSyncStatus !== null && kvSyncStatus !== "ok" && (
                        <span className="text-xs font-semibold text-red-500 flex items-center gap-1" title={kvSyncStatus}>
                          ✕ Falha: {kvSyncStatus}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={kvSyncing}
                        onClick={async () => {
                          setKvSyncing(true);
                          setKvSyncStatus(null);
                          try {
                            const result = await forcePushConsultantsToKV();
                            if (result.ok) {
                              setKvSyncStatus("ok");
                            } else {
                              setKvSyncStatus(result.debug || "unknown_error");
                            }
                          } catch (e) {
                            setKvSyncStatus(`catch: ${String(e)}`);
                          } finally {
                            setKvSyncing(false);
                            setTimeout(() => setKvSyncStatus(null), 15000);
                          }
                        }}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
                      >
                        {kvSyncing ? (
                          <span className="animate-spin">⟳</span>
                        ) : (
                          <span>☁</span>
                        )}
                        {kvSyncing ? "Sincronizando..." : "Sincronizar com a Nuvem"}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const creatableRoles = getCreatableRoles(currentUser.role);
                      setNewRole(creatableRoles[0]);
                      setIsAddUserOpen(true);
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#002B5C] hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity"
                  >
                    <UserPlus className="h-4 w-4" />
                    Adicionar Consultor
                  </button>
                </div>
              )}

              {/* ACCESS MANAGEMENT TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                          Nome / E-mail
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                          Cargo
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">
                          PIN
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">
                          Status
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        // Filtro de visibilidade por perfil
                        const visibleUsers = currentUser.role === "Administrador"
                          ? users
                          : currentUser.role === "Supervisor"
                          ? users.filter(u => u.role !== "Administrador")
                          : users.filter(u => u.id === currentUserId); // Consultor vê só ele mesmo

                        return visibleUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                              Nenhum consultor cadastrado. Clique em "Adicionar Consultor" para começar.
                            </td>
                          </tr>
                        ) : visibleUsers.map((user) => {
                        const canToggle = canToggleUser(currentUser.role, user, currentUserId);
                        const badgeStyles = getRoleBadgeStyles(user.role);

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4">
                              <p className="font-semibold text-slate-800">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <Mail className="h-3 w-3" />{user.email}
                              </p>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.border}`}
                              >
                                {getRoleIcon(user.role)}
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono text-slate-500 tracking-widest text-sm">
                              {"•".repeat(user.pin?.length || 4)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-3">
                                <span
                                  className={`text-xs font-semibold ${user.active ? "text-emerald-600" : "text-slate-400"}`}
                                >
                                  {user.active ? "Ativo" : "Inativo"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => canToggle && handleToggleUserActive(user.id)}
                                  disabled={!canToggle}
                                  title={
                                    !canToggle
                                      ? user.id === currentUserId
                                        ? "Você não pode alterar seu próprio status"
                                        : `Sem permissão para alterar ${user.role}`
                                      : `Clique para ${user.active ? "desativar" : "ativar"}`
                                  }
                                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                    !canToggle
                                      ? "opacity-40 cursor-not-allowed"
                                      : "cursor-pointer"
                                  } ${user.active ? "bg-emerald-500" : "bg-slate-200"}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      user.active ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                {canEditUser(currentUser.role, user, currentUserId) && (
                                  <button
                                    type="button"
                                    onClick={() => openEditUser(user)}
                                    title="Editar usuário"
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                )}
                                {currentUser.role === 'Administrador' && user.id !== currentUserId && (
                                  <button
                                    type="button"
                                    onClick={() => openResetPin(user)}
                                    title="Resetar senha"
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })})()} 
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: PARÂMETROS (ADMIN ONLY) ==================== */}
          {activeTab === "parameters" && currentUser.role === "Administrador" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* SUCCESS TOAST */}
              {configSaved && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 animate-in fade-in duration-200">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm font-bold">Parâmetros salvos com sucesso!</p>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restaurar Padrão
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#002B5C] hover:opacity-90 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity"
                >
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </button>
              </div>

              {/* SECTION 1: CONVERSÃO DE PONTOS */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#002B5C]" />
                  Conversão de Pontos
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor do Ponto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={config.pointCost}
                      onChange={(e) => updateConfigField("pointCost", parseFloat(e.target.value) || 0.01)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Atualmente: R$ {config.pointCost.toFixed(2)} por ponto</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mínimo de Pontos</label>
                    <input
                      type="number"
                      min="1"
                      value={config.minPoints}
                      onChange={(e) => updateConfigField("minPoints", parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Saldo mínimo: {formatBRL(config.minPoints * config.pointCost)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mín. Diárias / Reserva</label>
                    <input
                      type="number"
                      min="1"
                      value={config.minNights}
                      onChange={(e) => updateConfigField("minNights", parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Diárias mínimas por reserva</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EMPREENDIMENTOS */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-[#002B5C]" />
                    Empreendimentos ({config.resorts.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setAddResortOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#002B5C] hover:opacity-90 px-3 py-2 text-xs font-semibold text-white shadow-sm transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Novo Empreendimento
                  </button>
                </div>

                <div className="space-y-4">
                  {config.resorts.map((resort) => (
                    <div key={resort.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Resort Header */}
                      <div className="bg-slate-50 p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {editingResortId === resort.id ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                value={resort.name}
                                onChange={(e) => updateResortField(resort.id, "name", e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
                                placeholder="Nome do resort"
                              />
                              <input
                                value={resort.tagline}
                                onChange={(e) => updateResortField(resort.id, "tagline", e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-sm text-slate-600 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
                                placeholder="Descrição curta"
                              />
                              <button
                                onClick={() => setEditingResortId(null)}
                                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span className="text-sm font-bold text-slate-800">{resort.name}</span>
                              <span className="text-xs text-slate-500 ml-2">{resort.tagline}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setEditingResortId(editingResortId === resort.id ? null : resort.id)}
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition"
                            title="Editar"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteResortConfirm(resort.id)}
                            className="p-1.5 rounded-md hover:bg-rose-100 text-rose-500 transition"
                            title="Excluir empreendimento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Rooms + Points Table */}
                      <div className="p-4">
                        {resort.rooms.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                                  <th className="py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cap.</th>
                                  {SEASONS.map((s) => (
                                    <th key={s} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: "#002B5C" }}>{s}</th>
                                  ))}
                                  <th className="py-2 w-8"></th>
                                </tr>
                              </thead>
                              <tbody>
                              {resort.rooms.map((room) => (
                                  <>
                                    {/* --- Row 1: Time Share points --- */}
                                    <tr key={`${room.id}-pts`} className="border-b border-slate-100">
                                      <td className="py-2 pr-2">
                                        <span className="text-xs font-semibold text-slate-800">{room.type}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">({room.shortType})</span>
                                        <span className="ml-1.5 text-[9px] font-bold text-[#002B5C] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">pts</span>
                                      </td>
                                      <td className="py-2 text-center">
                                        <input
                                          type="number"
                                          min="1"
                                          max="20"
                                          value={room.capacity}
                                          onChange={(e) => updateRoomCapacity(resort.id, room.id, parseInt(e.target.value) || 1)}
                                          className="w-12 bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-xs text-center font-semibold text-slate-800 outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-blue-100"
                                        />
                                      </td>
                                      {SEASONS.map((season) => (
                                        <td key={season} className="py-2 px-1 text-center">
                                          <input
                                            type="number"
                                            min="0"
                                            placeholder="—"
                                            value={room.costs[season] ?? ""}
                                            onChange={(e) => updateRoomCost(resort.id, room.id, season, e.target.value)}
                                            className="w-16 bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-xs text-center tabular-nums text-slate-700 outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-blue-100 placeholder:text-slate-300"
                                          />
                                        </td>
                                      ))}
                                      <td className="py-2">
                                        <button
                                          onClick={() => handleDeleteRoom(resort.id, room.id)}
                                          className="p-1 rounded hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition"
                                          title="Remover unidade"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                    {/* --- Row 2: Balcao tariff --- */}
                                    <tr key={`${room.id}-balcao`} className="border-b border-dashed border-slate-100">
                                      <td className="py-1.5 pr-2 pl-1">
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">R$ balcão</span>
                                      </td>
                                      <td />
                                      {SEASONS.map((season) => (
                                        <td key={season} className="py-1.5 px-1 text-center">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="—"
                                            value={room.balcao?.[season] ?? ""}
                                            onChange={(e) => updateRoomBalcao(resort.id, room.id, season, e.target.value)}
                                            className="w-16 bg-emerald-50/50 border border-emerald-100 rounded py-1 px-1.5 text-xs text-center tabular-nums text-emerald-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 placeholder:text-slate-300"
                                          />
                                        </td>
                                      ))}
                                      <td />
                                    </tr>
                                  </>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma unidade cadastrada.</p>
                        )}

                        {/* Add Room */}
                        {addRoomForResort === resort.id ? (
                          <div className="mt-3 flex flex-wrap items-end gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                              <input
                                value={newRoomType}
                                onChange={(e) => setNewRoomType(e.target.value)}
                                placeholder="Ex: 1 Quarto"
                                className="w-28 bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-800 outline-none focus:border-[#002B5C]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sigla</label>
                              <input
                                value={newRoomShort}
                                onChange={(e) => setNewRoomShort(e.target.value)}
                                placeholder="Ex: 1Q"
                                className="w-16 bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-800 outline-none focus:border-[#002B5C]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cap.</label>
                              <input
                                type="number"
                                min="1"
                                value={newRoomCapacity}
                                onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 1)}
                                className="w-14 bg-white border border-slate-200 rounded py-1.5 px-2 text-xs text-slate-800 outline-none focus:border-[#002B5C]"
                              />
                            </div>
                            <button
                              onClick={() => handleAddRoom(resort.id)}
                              disabled={!newRoomType.trim()}
                              className="rounded-lg bg-[#002B5C] hover:opacity-90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                            >
                              Adicionar
                            </button>
                            <button
                              onClick={() => setAddRoomForResort(null)}
                              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddRoomForResort(resort.id);
                              setNewRoomType("");
                              setNewRoomShort("");
                              setNewRoomCapacity(4);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#002B5C] hover:text-blue-800 transition"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Adicionar Unidade
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ==================== MODAL: MOTIVO DA RECUSA (ABA 2) ==================== */}
      {selectedRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRejection(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Motivo da Recusa</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Consultor: <strong className="text-slate-700">{selectedRejection.consultantName ?? "—"}</strong> ·{" "}
                  {(() => { try { return new Date(selectedRejection.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch { return selectedRejection.createdAt; } })()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRejection(null)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex gap-3 bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-900">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
                <div className="text-sm">
                  <p className="font-bold">Objeção Registrada</p>
                  <p className="mt-1.5 leading-relaxed text-slate-600 font-medium">
                    "{selectedRejection.rejectionReason}"
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Limite do sistema: {selectedRejection.rejectionReason?.length ?? 0} / 1000 caracteres
              </div>
            </div>
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRejection(null)}
                className="rounded-lg bg-slate-800 hover:bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONFIRMAR EXCLUSÃO (ABA 2) ==================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Excluir Simulação?</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Tem certeza que deseja excluir o registro de{" "}
                  <strong className="text-slate-700">{deleteConfirm.consultantName ?? "consultor desconhecido"}</strong>{" "}
                  do dia <strong className="text-slate-700">{(() => { try { return new Date(deleteConfirm.createdAt).toLocaleDateString("pt-BR"); } catch { return deleteConfirm.createdAt; } })()}</strong>?
                </p>
                <p className="text-xs text-rose-500 font-semibold mt-2">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSimulation(deleteConfirm.id)}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADICIONAR USUÁRIO (ABA 3) ==================== */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAddUserOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#002B5C]" />
                Cadastrar Novo Consultor
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Modal Body */}
            <form onSubmit={handleAddUser}>
              <div className="p-6 space-y-4">
                {/* Name fields - side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-firstname" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Primeiro Nome
                    </label>
                    <input
                      id="new-firstname"
                      type="text"
                      required
                      placeholder="Ex: Carlos"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-lastname" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Sobrenome
                    </label>
                    <input
                      id="new-lastname"
                      type="text"
                      required
                      placeholder="Ex: Silva"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                {/* Email field */}
                <div>
                  <label htmlFor="new-email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    E-mail
                  </label>
                  <input
                    id="new-email"
                    type="email"
                    required
                    placeholder="exemplo@gavresorts.com.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* PIN field */}
                <div>
                  <label htmlFor="new-pin" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    PIN de Acesso
                  </label>
                  <input
                    id="new-pin"
                    type="password"
                    required
                    placeholder="Mín. 6 caracteres alfanuméricos"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold tracking-widest text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                  />
                  {newPin.length > 0 && !isValidPin(newPin) && (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Mínimo 6 caracteres alfanuméricos, sem símbolos especiais.</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">Este PIN será usado pelo consultor para fazer login na calculadora.</p>
                </div>

                {/* Role field */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Nível de Acesso
                  </label>
                  <div
                    className={`grid gap-3 ${getCreatableRoles(currentUser.role).length >= 3 ? "grid-cols-3" : getCreatableRoles(currentUser.role).length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
                  >
                    {getCreatableRoles(currentUser.role).map((role) => {
                      const styles = getRoleBadgeStyles(role);
                      return (
                        <label
                          key={role}
                          className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold cursor-pointer transition ${
                            newRole === role
                              ? `${styles.border} ${styles.bg} ${styles.text} ring-2 ring-offset-1 ring-blue-200`
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role}
                            checked={newRole === role}
                            onChange={() => setNewRole(role)}
                            className="sr-only"
                          />
                          {getRoleIcon(role)}
                          {role}
                        </label>
                      );
                    })}
                  </div>
                  {currentUser.role === "Supervisor" && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Supervisores só podem criar Consultores
                    </p>
                  )}
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="block text-sm font-bold text-slate-700">Status Inicial</span>
                    <span className="text-xs text-slate-500">Defina se o acesso estará ativo imediatamente.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewActive(!newActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      newActive ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        newActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || !isValidPin(newPin)}
                  className="rounded-lg bg-[#002B5C] hover:opacity-90 px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cadastrar Consultor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDITAR USUÁRIO ==================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#002B5C] to-[#003d80] px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Editar Usuário</h2>
                <p className="text-blue-200 text-xs mt-0.5">{editingUser.firstName} {editingUser.lastName}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-white/70 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditUserSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sobrenome</label>
                  <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cargo</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value as Role)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100">
                    {getCreatableRoles(currentUser.role).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={editActive ? 'ativo' : 'inativo'} onChange={e => setEditActive(e.target.value === 'ativo')}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit"
                  className="flex-1 rounded-xl bg-[#002B5C] hover:bg-[#003d80] text-white py-2.5 text-sm font-bold shadow-md transition">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: RESETAR PIN ==================== */}
      {resetPinUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Resetar Senha</h2>
                <p className="text-amber-100 text-xs mt-0.5">{resetPinUser.firstName} {resetPinUser.lastName}</p>
              </div>
              <button onClick={() => setResetPinUser(null)} className="text-white/70 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleResetPinSave} className="p-6 space-y-4">
              {resetPinSuccess ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> {resetPinSuccess}
                  </p>
                  <button type="button" onClick={() => setResetPinUser(null)}
                    className="mt-3 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold transition">Fechar</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Novo PIN Temporário</label>
                    <input type="text" value={resetPinValue}
                      onChange={e => { setResetPinValue(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setResetPinError(''); }}
                      placeholder="Mín. 6 caracteres alfanuméricos"
                      maxLength={20}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar Novo PIN</label>
                    <input type="text" value={resetPinConfirm}
                      onChange={e => { setResetPinConfirm(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setResetPinError(''); }}
                      placeholder="Repita o novo PIN"
                      maxLength={20}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
                  </div>
                  {resetPinError && (
                    <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{resetPinError}</p>
                  )}
                  <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    ⚠️ O usuário será obrigado a trocar o PIN no próximo acesso.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setResetPinUser(null)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
                    <button type="submit" disabled={resetPinValue.length < 6}
                      className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white py-2.5 text-sm font-bold shadow-md transition disabled:opacity-50">Resetar Senha</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADICIONAR RESORT ==================== */}
      {addResortOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setAddResortOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Novo Empreendimento</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Cadastre um novo resort</p>
              </div>
              <button onClick={() => setAddResortOpen(false)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Resort</label>
                <input
                  value={newResortName}
                  onChange={(e) => setNewResortName(e.target.value)}
                  placeholder="Ex: Beach GAV Resort"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição Curta</label>
                <input
                  value={newResortTagline}
                  onChange={(e) => setNewResortTagline(e.target.value)}
                  placeholder="Ex: Paraíso à beira-mar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-600 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 pt-0">
              <button
                onClick={() => setAddResortOpen(false)}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddResort}
                disabled={!newResortName.trim()}
                className="rounded-lg bg-[#002B5C] hover:opacity-90 px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                Cadastrar Resort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONFIRMAR EXCLUSÃO DE RESORT ==================== */}
      {deleteResortConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteResortConfirm(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Excluir empreendimento?</h3>
              <p className="text-xs text-slate-500">
                O resort <strong>{config.resorts.find((r) => r.id === deleteResortConfirm)?.name}</strong> e todas as suas unidades serão removidos. Clique em "Salvar Alterações" para confirmar.
              </p>
            </div>
            <div className="flex justify-center gap-3 p-5 pt-0">
              <button
                onClick={() => setDeleteResortConfirm(null)}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteResort(deleteResortConfirm)}
                className="rounded-lg bg-rose-600 hover:opacity-90 px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SSR-SAFE WRAPPER =====
// AdminDashboardInner accesses localStorage, server functions, and browser APIs.
// During Cloudflare Worker SSR these are unavailable and crash the Worker.
// This wrapper defers all rendering to the client after first mount.
function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #001f42 0%, #002B5C 60%, #004080 100%)",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(255,255,255,0.25)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "admin-spin 0.8s linear infinite",
              margin: "0 auto 14px",
            }}
          />
          <p style={{ fontSize: 13, opacity: 0.65, letterSpacing: "0.02em" }}>
            Carregando painel...
          </p>
        </div>
        <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <AdminDashboardInner />;
}
