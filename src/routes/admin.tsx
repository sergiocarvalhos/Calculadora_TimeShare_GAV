import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
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
type Role = "Consultor" | "Supervisor" | "Administrador";

type Simulation = {
  id: string;
  date: string;
  consultant: string;
  resort: string;
  product: string;
  value: number;
  status: "Aceita" | "Não Aceita";
  rejectionReason?: string;
};

type UserAccess = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
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

function canToggleUser(currentRole: Role, targetUser: UserAccess, currentUserId: string): boolean {
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
function AdminDashboard() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "allowlist" | "parameters">("dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ===== AUTH STATE =====
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminSessionValid);
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loginShake, setLoginShake] = useState(false);

  // ===== CONFIG STATE =====
  const [config, setConfig] = useState<AppConfig>(getConfig);
  const [configSaved, setConfigSaved] = useState(false);
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

  // ===== USERS (mock data) =====
  const [users, setUsers] = useState<UserAccess[]>([
    { id: "usr-1", email: "admin.sergio@gavresorts.com.br", role: "Administrador", active: true },
    { id: "usr-2", email: "patricia.gestora@gavresorts.com.br", role: "Supervisor", active: true },
    { id: "usr-3", email: "carlos.silva@gavresorts.com.br", role: "Consultor", active: true },
    { id: "usr-4", email: "mariana.costa@gavresorts.com.br", role: "Consultor", active: true },
    { id: "usr-5", email: "junior.vendas@gavresorts.com.br", role: "Consultor", active: false },
  ]);

  // ===== CURRENT USER (simulated login) =====
  const [currentUserId, setCurrentUserId] = useState("usr-1");
  const currentUser = users.find((u) => u.id === currentUserId)!;

  // ===== SIMULATIONS =====
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRejection, setSelectedRejection] = useState<Simulation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Simulation | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([
    {
      id: "sim-1",
      date: "27/05/2026 14:32",
      consultant: "Carlos Silva",
      resort: "Exclusive GAV Resort",
      product: "100.000 pontos",
      value: 17000.0,
      status: "Aceita",
    },
    {
      id: "sim-2",
      date: "26/05/2026 11:15",
      consultant: "Mariana Costa",
      resort: "Park GAV Resort",
      product: "80.000 pontos",
      value: 13600.0,
      status: "Não Aceita",
      rejectionReason:
        "O cliente achou as parcelas mensais de reaproveitamento muito elevadas para o orçamento doméstico atual, optando por renegociar o saldo em diárias diretas no balcão de atendimento.",
    },
    {
      id: "sim-3",
      date: "25/05/2026 16:45",
      consultant: "Roberto Souza",
      resort: "Porto Alto Resort",
      product: "150.000 pontos",
      value: 25500.0,
      status: "Aceita",
    },
    {
      id: "sim-4",
      date: "25/05/2026 09:20",
      consultant: "Luciana Dias",
      resort: "Premium GAV Resort",
      product: "60.000 pontos",
      value: 10200.0,
      status: "Não Aceita",
      rejectionReason:
        "Cliente viaja poucas vezes por ano e prefere manter flexibilidade de reservas pontuais no mercado livre em vez de se fidelizar ao sistema de pontos por 5 anos.",
    },
    {
      id: "sim-5",
      date: "24/05/2026 15:10",
      consultant: "Fernando Lima",
      resort: "Pyrenéus Residence",
      product: "90.000 pontos",
      value: 15300.0,
      status: "Aceita",
    },
  ]);

  // ===== ADD USER MODAL =====
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Consultor");
  const [newActive, setNewActive] = useState(true);

  // ===== AUTH HANDLERS =====
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
    if (!expected) {
      // No env var set — allow access so admin can still configure during development
      createAdminSession();
      setIsAuthenticated(true);
      return;
    }
    if (loginPassword === expected) {
      createAdminSession();
      setIsAuthenticated(true);
      setLoginError(false);
      setLoginPassword("");
    } else {
      setLoginError(true);
      setLoginPassword("");
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 600);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setLoginPassword("");
    setLoginError(false);
  };

  // ===== HANDLERS =====
  const handleToggleUserActive = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target || !canToggleUser(currentUser.role, target, currentUserId)) return;
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, active: !user.active } : user)));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !canCreateUsers(currentUser.role)) return;

    const creatableRoles = getCreatableRoles(currentUser.role);
    const roleToAssign = creatableRoles.includes(newRole) ? newRole : creatableRoles[0];

    const newUser: UserAccess = {
      id: `usr-${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      role: roleToAssign,
      active: newActive,
    };

    setUsers((prev) => [...prev, newUser]);
    setNewEmail("");
    setNewRole("Consultor");
    setNewActive(true);
    setIsAddUserOpen(false);
  };

  const handleDeleteSimulation = (id: string) => {
    if (!canDeleteSimulation(currentUser.role)) return;
    setSimulations((prev) => prev.filter((sim) => sim.id !== id));
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
      return (
        sim.consultant.toLowerCase().includes(term) ||
        sim.resort.toLowerCase().includes(term) ||
        sim.product.toLowerCase().includes(term)
      );
    });
  }, [simulations, historySearch]);

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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(false); }}
                    placeholder="Digite a senha"
                    autoFocus
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
                {loginError && (
                  <p className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Senha incorreta. Tente novamente.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!loginPassword.trim()}
                className="w-full rounded-xl bg-[#002B5C] hover:bg-[#003d80] text-white py-3 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all hover:shadow-xl hover:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                Acessar Painel
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

          {/* PROFILE SELECTOR */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold cursor-pointer ${roleStyles.bg} ${roleStyles.text} ${roleStyles.border} hover:shadow-md`}
            >
              {getRoleIcon(currentUser.role)}
              <span className="hidden sm:inline max-w-[140px] truncate">{currentUser.email.split("@")[0]}</span>
              <span className="sm:hidden">{currentUser.role.slice(0, 3)}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Profile dropdown */}
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Simular Perfil de Acesso
                    </p>
                  </div>
                  <div className="py-1">
                    {users
                      .filter((u) => u.active)
                      .map((user) => {
                        const styles = getRoleBadgeStyles(user.role);
                        const isSelected = user.id === currentUserId;
                        return (
                          <button
                            key={user.id}
                            onClick={() => handleSwitchProfile(user.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${styles.bg} ${styles.text}`}
                            >
                              {getRoleIcon(user.role)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate">{user.email}</p>
                              <p className={`text-[10px] font-bold ${styles.text}`}>{user.role}</p>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                Ativo
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
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
                    <span className="text-3xl font-bold text-slate-800 mt-2 block">142</span>
                    <span className="text-xs text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +12% vs último mês
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
                    <span className="text-3xl font-bold text-slate-800 mt-2 block">38%</span>
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
                    <span className="text-3xl font-bold text-slate-800 mt-2 block">R$ 452.000,00</span>
                    <span className="text-xs text-blue-600 font-semibold mt-1 inline-flex items-center gap-1">
                      Saldo reaproveitado ativo
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* CHART PLACEHOLDER CONTAINER */}
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 min-h-[400px] flex flex-col items-center justify-center text-center shadow-sm">
                <div className="h-16 w-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 mb-4">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-700">Painel de Análise Visual</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  Este espaço está reservado para a futura integração de gráficos dinâmicos de performance (ex:
                  Recharts, ChartJS), detalhando as taxas de sucesso por empreendimento.
                </p>
                <div className="mt-6 flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-500">
                    Volume diário
                  </span>
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-500">
                    Metas por resort
                  </span>
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-500">
                    Proporção de objeções
                  </span>
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
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                          Empreendimento
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Produto</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">
                          Valor Reaproveitado
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
                        filteredSimulations.map((sim) => (
                          <tr key={sim.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 text-slate-500 font-medium tabular-nums">{sim.date}</td>
                            <td className="p-4 font-semibold text-slate-800">{sim.consultant}</td>
                            <td className="p-4 text-slate-600">{sim.resort}</td>
                            <td className="p-4 font-medium text-slate-700">{sim.product}</td>
                            <td className="p-4 text-right font-bold text-slate-800 tabular-nums">
                              {formatBRL(sim.value)}
                            </td>
                            <td className="p-4 text-center">
                              {sim.status === "Aceita" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Aceita
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Não Aceita
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {sim.status === "Não Aceita" && (
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
                                {sim.status === "Aceita" && !canDeleteSimulation(currentUser.role) && (
                                  <span className="text-xs text-slate-400 italic font-medium">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                            Nenhum registro encontrado para o termo buscado.
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

              {/* TOP HEADER BUTTON */}
              {canCreateUsers(currentUser.role) && (
                <div className="flex justify-end">
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
                    Adicionar Usuário
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
                          E-mail do Usuário
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                          Nível de Acesso
                        </th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => {
                        const canToggle = canToggleUser(currentUser.role, user, currentUserId);
                        const badgeStyles = getRoleBadgeStyles(user.role);

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 font-semibold text-slate-800 flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {user.email}
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.border}`}
                              >
                                {getRoleIcon(user.role)}
                                {user.role}
                              </span>
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
                          </tr>
                        );
                      })}
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
                                  <tr key={room.id} className="border-b border-slate-100">
                                    <td className="py-2 pr-2">
                                      <span className="text-xs font-semibold text-slate-800">{room.type}</span>
                                      <span className="text-[10px] text-slate-400 ml-1">({room.shortType})</span>
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
                  Consultor: <strong className="text-slate-700">{selectedRejection.consultant}</strong> ·{" "}
                  {selectedRejection.date}
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
                  <strong className="text-slate-700">{deleteConfirm.consultant}</strong> em{" "}
                  <strong className="text-slate-700">{deleteConfirm.resort}</strong>?
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
                Autorizar Novo Acesso
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
                {/* Email field */}
                <div>
                  <label
                    htmlFor="new-email"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                  >
                    E-mail do Usuário
                  </label>
                  <input
                    id="new-email"
                    type="email"
                    required
                    placeholder="exemplo@gavresorts.com.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Role field - shows only roles the current user can create */}
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
                  className="rounded-lg bg-[#002B5C] hover:opacity-90 px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
                >
                  Salvar Usuário
                </button>
              </div>
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
