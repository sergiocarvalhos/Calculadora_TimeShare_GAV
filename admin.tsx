import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  History,
  UserCheck,
  Plus,
  Search,
  Eye,
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
  UserPlus
} from "lucide-react";
import { useIsMobile } from "../hooks/use-mobile";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Painel Admin - Time Share Converter" },
      { name: "description", content: "Painel administrativo de simulações, acessos e métricas de conversão." },
    ],
  }),
});

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
  role: "Consultor" | "Administrador";
  active: boolean;
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function AdminDashboard() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "allowlist">("dashboard");

  // ===== States para Aba 2 (Histórico de Simulações) =====
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRejection, setSelectedRejection] = useState<Simulation | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([
    {
      id: "sim-1",
      date: "27/05/2026 14:32",
      consultant: "Carlos Silva",
      resort: "Exclusive GAV Resort",
      product: "100.000 pontos",
      value: 17000.00,
      status: "Aceita"
    },
    {
      id: "sim-2",
      date: "26/05/2026 11:15",
      consultant: "Mariana Costa",
      resort: "Park GAV Resort",
      product: "80.000 pontos",
      value: 13600.00,
      status: "Não Aceita",
      rejectionReason: "O cliente achou as parcelas mensais de reaproveitamento muito elevadas para o orçamento doméstico atual, optando por renegociar o saldo em diárias diretas no balcão de atendimento."
    },
    {
      id: "sim-3",
      date: "25/05/2026 16:45",
      consultant: "Roberto Souza",
      resort: "Porto Alto Resort",
      product: "150.000 pontos",
      value: 25500.00,
      status: "Aceita"
    },
    {
      id: "sim-4",
      date: "25/05/2026 09:20",
      consultant: "Luciana Dias",
      resort: "Premium GAV Resort",
      product: "60.000 pontos",
      value: 10200.00,
      status: "Não Aceita",
      rejectionReason: "Cliente viaja poucas vezes por ano e prefere manter flexibilidade de reservas pontuais no mercado livre em vez de se fidelizar ao sistema de pontos por 5 anos."
    },
    {
      id: "sim-5",
      date: "24/05/2026 15:10",
      consultant: "Fernando Lima",
      resort: "Pyrenéus Residence",
      product: "90.000 pontos",
      value: 15300.00,
      status: "Aceita"
    }
  ]);

  // ===== States para Aba 3 (Acessos Autorizados) =====
  const [users, setUsers] = useState<UserAccess[]>([
    { id: "usr-1", email: "admin.sergio@gavresorts.com.br", role: "Administrador", active: true },
    { id: "usr-2", email: "carlos.silva@gavresorts.com.br", role: "Consultor", active: true },
    { id: "usr-3", email: "mariana.costa@gavresorts.com.br", role: "Consultor", active: true },
    { id: "usr-4", email: "junior.vendas@gavresorts.com.br", role: "Consultor", active: false }
  ]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"Consultor" | "Administrador">("Consultor");
  const [newActive, setNewActive] = useState(true);

  // ===== Handlers Aba 3 =====
  const handleToggleUserActive = (id: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, active: !user.active } : user))
    );
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const newUser: UserAccess = {
      id: `usr-${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      active: newActive
    };

    setUsers((prev) => [...prev, newUser]);
    setNewEmail("");
    setNewRole("Consultor");
    setNewActive(true);
    setIsAddUserOpen(false);
  };

  // ===== Filtragem de Simulações =====
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

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "history", label: "Histórico de Simulações", icon: History },
    { id: "allowlist", label: "Acessos Autorizados", icon: UserCheck },
  ] as const;

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
              {activeTab === "allowlist" ? "Acessos Autorizados" : activeTab === "history" ? "Histórico de Simulações" : "Dashboard Geral"}
            </h1>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Ambiente Administrativo
          </div>
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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total de Simulações</span>
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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Taxa de Conversão</span>
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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Valor Total Retido</span>
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
                  Este espaço está reservado para a futura integração de gráficos dinâmicos de performance (ex: Recharts, ChartJS), detalhando as taxas de sucesso por empreendimento.
                </p>
                <div className="mt-6 flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-500">Volume diário</span>
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-500">Metas por resort</span>
                  <span className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-500">Proporção de objeções</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: HISTÓRICO DE SIMULAÇÕES ==================== */}
          {activeTab === "history" && (
            <div className="space-y-6 animate-in fade-in duration-200">
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
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Data / Hora</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Consultor</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Empreendimento</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Produto</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Valor Reaproveitado</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Status</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Ações</th>
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
                              {sim.status === "Não Aceita" ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRejection(sim)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver Motivo
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic font-medium">—</span>
                              )}
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
              {/* TOP HEADER BUTTON */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#002B5C] hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity"
                >
                  <UserPlus className="h-4 w-4" />
                  Adicionar Usuário
                </button>
              </div>

              {/* ACCESS MANAGEMENT TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">E-mail do Usuário</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Nível de Acesso</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-semibold text-slate-800 flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {user.email}
                          </td>
                          <td className="p-4">
                            {user.role === "Administrador" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                <Shield className="h-3 w-3" />
                                Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                Consultor
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-3">
                              <span className={`text-xs font-semibold ${user.active ? "text-emerald-600" : "text-slate-400"}`}>
                                {user.active ? "Ativo" : "Inativo"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(user.id)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                  user.active ? "bg-emerald-500" : "bg-slate-200"
                                }`}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ==================== MODAL: MOTIVO DA RECUSA (ABA 2) ==================== */}
      {selectedRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRejection(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Motivo da Recusa</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Consultor: <strong className="text-slate-700">{selectedRejection.consultant}</strong> · {selectedRejection.date}
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

      {/* ==================== MODAL: ADICIONAR USUÁRIO (ABA 3) ==================== */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsAddUserOpen(false)} />
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
                  <label htmlFor="new-email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
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

                {/* Role field */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Nível de Acesso
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold cursor-pointer transition ${
                      newRole === "Consultor" ? "border-[#002B5C] bg-blue-50/50 text-[#002B5C]" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="Consultor"
                        checked={newRole === "Consultor"}
                        onChange={() => setNewRole("Consultor")}
                        className="sr-only"
                      />
                      Consultor
                    </label>
                    <label className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold cursor-pointer transition ${
                      newRole === "Administrador" ? "border-[#002B5C] bg-blue-50/50 text-[#002B5C]" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="Administrador"
                        checked={newRole === "Administrador"}
                        onChange={() => setNewRole("Administrador")}
                        className="sr-only"
                      />
                      Administrador
                    </label>
                  </div>
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
    </div>
  );
}
