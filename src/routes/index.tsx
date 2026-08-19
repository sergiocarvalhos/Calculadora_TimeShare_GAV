import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Calendar, Users, Sparkles, Info, AlertCircle, AlertTriangle, Printer, RotateCw, History, Check, X, Trash2, BarChart3, ArrowRight, LogOut, CheckCircle } from "lucide-react";
import { getConfig, CONFIG_UPDATED_EVENT, SEASONS } from "../lib/config-store";
import type { AppConfig, Resort, Season } from "../lib/config-store";
import { getConsultantSession, logoutConsultant } from "../lib/consultant-auth";
import type { ConsultantSession } from "../lib/consultant-auth";
import { getConsultants, updateConsultant, isValidPin } from "../lib/consultant-store";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Calculadora de Conversão - Time Share" },
      { name: "description", content: "Converta seu saldo em pontos de Time Share e descubra quantas diárias você consegue nos resorts GAV em cada temporada." },
    ],
  }),
});


function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskBRL(digits: string) {
  const onlyDigits = digits.replace(/\D/g, "");
  if (!onlyDigits) return "";
  const n = parseInt(onlyDigits, 10);
  const reais = Math.floor(n / 100);
  const cents = n % 100;
  return reais.toLocaleString("pt-BR") + "," + cents.toString().padStart(2, "0");
}

type ProposalStatus = "pendente" | "aceita" | "nao_aceita" | "inelegivel";
type SimulationEntry = {
  id: string;
  createdAt: string;
  balance: number;
  points: number;
  status: ProposalStatus;
  rejectionReason?: string;
  consultantId?: string;    // linked consultant (optional for backward compat)
  consultantName?: string;  // denormalized full name
};

function Index() {
  const router = useRouter();

  // ===== Consultant session (SSR-safe: checked in useEffect) =====
  const [consultant, setConsultant] = useState<ConsultantSession | null>(null);
  const [mustChangePinScreen, setMustChangePinScreen] = useState(false);
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [changePinError, setChangePinError] = useState('');

  const [changeOwnPinOpen, setChangeOwnPinOpen] = useState(false);
  const [ownPinCurrent, setOwnPinCurrent] = useState('');
  const [ownPinNew, setOwnPinNew] = useState('');
  const [ownPinConfirm, setOwnPinConfirm] = useState('');
  const [ownPinError, setOwnPinError] = useState('');
  const [ownPinSuccess, setOwnPinSuccess] = useState(false);

  useEffect(() => {
    const session = getConsultantSession();
    if (!session) {
      router.navigate({ to: "/login" });
      return;
    }
    setConsultant(session);
    const fullConsultant = getConsultants().find(c => c.id === session.consultantId);
    if (fullConsultant?.mustChangePin) {
      setMustChangePinScreen(true);
    }
  }, [router]);

  // ===== Config from store =====
  const [config, setConfig] = useState<AppConfig>(getConfig);

  useEffect(() => {
    const handler = () => setConfig(getConfig());
    window.addEventListener(CONFIG_UPDATED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CONFIG_UPDATED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const POINT_COST = config.pointCost;
  const MIN_POINTS = config.minPoints;
  const MIN_NIGHTS = config.minNights;
  const MIN_BALANCE = MIN_POINTS * POINT_COST;
  const RESORTS = config.resorts;

  const [masked, setMasked] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [exportDate, setExportDate] = useState<string | null>(null);

  // ===== CLIENT DATA (required for printing) =====
  const [clientName, setClientName] = useState("");
  const [clientCpf, setClientCpf] = useState("");

  const maskCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const cpfDigitsCount = clientCpf.replace(/\D/g, "").length;
  const isClientDataValid = clientName.trim().length >= 5 && cpfDigitsCount === 11;

  const balance = useMemo(() => {
    const d = masked.replace(/\D/g, "");
    if (!d) return 0;
    return parseInt(d, 10) / 100;
  }, [masked]);

  const [computedBalance, setComputedBalance] = useState<number | null>(null);
  const points = computedBalance ? Math.round(computedBalance / POINT_COST) : 0;
  const hasResult = computedBalance !== null && computedBalance > 0;
  const isEligible = points >= MIN_POINTS;
  const pointsMissing = Math.max(0, MIN_POINTS - points);
  const balanceMissing = Math.max(0, MIN_BALANCE - (computedBalance ?? 0));
  const eligibilityProgress = Math.min(100, Math.round((points / MIN_POINTS) * 100));

  // ===== Histórico de Simulações =====
  const HISTORY_KEY = "timeshare:history";
  const [history, setHistory] = useState<SimulationEntry[]>([]);
  const [pendingRejection, setPendingRejection] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore quota errors
    }
  }, [history]);

  const handleCalculate = () => {
    if (balance <= 0) return;
    setComputedBalance(balance);
    const entryPoints = Math.round(balance / POINT_COST);
    const entry: SimulationEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      balance,
      points: entryPoints,
      status: entryPoints >= MIN_POINTS ? "pendente" : "inelegivel",
      consultantId: consultant?.consultantId,
      consultantName: consultant?.fullName,
    };
    setHistory((h) => [entry, ...h].slice(0, 50));
  };

  const setProposalAccepted = (id: string) => {
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, status: "aceita", rejectionReason: undefined } : e)));
    setPendingRejection((p) => {
      const { [id]: _, ...rest } = p;
      return rest;
    });
  };

  const openRejection = (id: string) => {
    setPendingRejection((p) => ({ ...p, [id]: p[id] ?? "" }));
  };

  const cancelRejection = (id: string) => {
    setPendingRejection((p) => {
      const { [id]: _, ...rest } = p;
      return rest;
    });
  };

  const saveRejection = (id: string) => {
    const text = (pendingRejection[id] ?? "").trim();
    if (!text) return;
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, status: "nao_aceita", rejectionReason: text } : e)));
    cancelRejection(id);
  };

  const resetStatus = (id: string) => {
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, status: "pendente", rejectionReason: undefined } : e)));
  };

  const clearHistory = () => {
    if (window.confirm("Deseja limpar todo o histórico de simulações?")) {
      setHistory([]);
      setPendingRejection({});
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  };

  const toggleFlip = (name: string) => setFlipped((f) => ({ ...f, [name]: !f[name] }));

  const handlePrint = async () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    setExportDate(`Simulação realizada em: ${dd}/${mm}/${yyyy} às ${hh}:${mi}`);

    const originalTitle = document.title;
    document.title = `Proposta ${clientName || "Cliente"} - Time Share`;

    // Wait two animation frames so React commits the date into the DOM
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );

    const cleanup = () => {
      setExportDate(null);
      document.title = originalTitle;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    window.print();

    // Safety fallback if afterprint doesn't fire
    setTimeout(cleanup, 2000);
  };

  // ===== SESSION GATE =====
  // During SSR and while the session check is running, show a loading screen.
  // The useEffect above redirects to /login if there's no valid session.
  if (!consultant) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #001f42 0%, #002B5C 60%, #004080 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "28px", height: "28px", border: "3px solid rgba(147,197,253,0.25)", borderTopColor: "rgba(147,197,253,0.85)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "rgba(147,197,253,0.75)", fontSize: "14px", margin: 0 }}>Verificando acesso...</p>
      </div>
    );
  }

  if (mustChangePinScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001f42] via-[#002B5C] to-[#003d80] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#002B5C] to-[#003d80] px-6 py-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 mb-3">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Crie sua Senha Pessoal</h1>
            <p className="text-blue-200 text-xs mt-1">Por segurança, defina uma senha pessoal antes de continuar.</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!isValidPin(changePinNew)) { setChangePinError('Mínimo 6 caracteres alfanuméricos, sem símbolos especiais.'); return; }
            if (changePinNew !== changePinConfirm) { setChangePinError('As senhas não coincidem.'); return; }
            updateConsultant(consultant!.consultantId, { pin: changePinNew, mustChangePin: false });
            setMustChangePinScreen(false);
            setChangePinError('');
          }} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nova Senha</label>
              <input type="password" value={changePinNew}
                onChange={e => { setChangePinNew(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setChangePinError(''); }}
                placeholder="Mín. 6 caracteres alfanuméricos"
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar Senha</label>
              <input type="password" value={changePinConfirm}
                onChange={e => { setChangePinConfirm(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setChangePinError(''); }}
                placeholder="Repita a nova senha"
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
            </div>
            {changePinError && <p className="text-xs text-rose-600">{changePinError}</p>}
            <button type="submit" disabled={changePinNew.length < 6}
              className="w-full rounded-xl bg-[#002B5C] hover:bg-[#003d80] text-white py-3 text-sm font-bold shadow-lg transition disabled:opacity-50">Definir Minha Senha</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        .flip-card { perspective: 1500px; }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.7s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .flip-back { transform: rotateY(180deg); }
        .print-only { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .no-print, .print-hide { display: none !important; }

          /* Neutralizar wrappers */
          .print-area-wrapper { max-width: none !important; padding: 0 !important; margin: 0 !important; }

          /* Folha A4 Portrait com 8mm margens: 194mm x 281mm */
          .print-area {
            width: 194mm !important;
            max-width: 194mm !important;
            height: 281mm !important;
            max-height: 281mm !important;
            overflow: hidden !important;
            font-size: 7.5pt !important;
            line-height: 1.2 !important;
            color: #0f172a !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5mm !important;
          }
          .print-area > * { margin: 0 !important; }

          /* ── OPR HEADER: titulo esquerda / meta direita ── */
          .print-area .print-only {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            border-bottom: 0.5mm solid #002B5C !important;
            padding-bottom: 2mm !important;
            margin-bottom: 0 !important;
            text-align: left !important;
          }
          .print-opr-brand h1 {
            font-size: 11pt !important;
            font-weight: 700 !important;
            color: #002B5C !important;
            margin: 0 !important;
            line-height: 1.1 !important;
          }
          .print-opr-brand p {
            font-size: 6.5pt !important;
            color: #64748b !important;
            margin: 0.5mm 0 0 !important;
          }
          .print-opr-meta {
            text-align: right !important;
            font-size: 7pt !important;
            color: #334155 !important;
            line-height: 1.6 !important;
            white-space: nowrap !important;
          }

          /* ── RESUMO (saldo / pontos) ── */
          .print-summary {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 2mm !important;
            margin: 0 !important;
          }
          .print-summary > div { padding: 2mm 3mm !important; border-radius: 2mm !important; }
          .print-summary .text-4xl,
          .print-summary .text-5xl { font-size: 13pt !important; line-height: 1.1 !important; }
          .print-summary .text-sm,
          .print-summary .text-xs { font-size: 6.5pt !important; }

          /* ── TITULOS ── */
          .print-area h2 { font-size: 8pt !important; margin: 0 0 0.5mm 0 !important; }
          .print-area h3 { font-size: 7pt !important; margin: 0 !important; }
          /* Ocultar paragrafo descritivo abaixo de Opcoes de Hospedagem */
          .print-area > section > p { display: none !important; }

          /* ── GRID DE RESORTS: 2 colunas ── */
          .print-resorts {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1.5mm !important;
            margin: 0 !important;
            flex: 1 1 auto !important;
          }

          /* ── FLIP CARD: sempre face frontal ── */
          .flip-card, .flip-card-inner, .flip-face {
            position: static !important;
            transform: none !important;
            min-height: 0 !important;
            height: auto !important;
            -webkit-backface-visibility: visible !important;
            backface-visibility: visible !important;
          }
          .flip-back { display: none !important; }

          /* ── CARD DE RESORT COMPACTO ── */
          .print-resorts article,
          .print-resorts .flip-face {
            border-radius: 1.5mm !important;
            border-width: 0.3mm !important;
            overflow: hidden !important;
          }

          /* Cabecalho do resort */
          .print-resorts .flex.items-start.justify-between.p-5 {
            padding: 1.5mm 2mm !important;
          }
          .print-resorts .text-slate-300 { font-size: 5.5pt !important; }

          /* Linhas de quarto */
          .print-resorts .divide-y > div { padding: 1.5mm 2mm !important; }
          .print-resorts .mb-3 { margin-bottom: 0.5mm !important; }
          .print-resorts .mb-2 { margin-bottom: 0.3mm !important; }
          .print-resorts .p-2\.5, .print-resorts .p-3 { padding: 1mm !important; }
          .print-resorts .gap-2 { gap: 0.5mm !important; }
          .print-resorts .gap-3 { gap: 1mm !important; }

          /* ── TEMPORADAS: grid 4 colunas por quarto ── */
          .print-resorts .flex.flex-wrap.items-stretch {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.5mm !important;
          }
          /* Ocultar separadores 'ou' (removidos do fluxo do grid) */
          .season-or-label { display: none !important; }

          /* Celula de temporada */
          .print-resorts .flex-1 {
            min-width: 0 !important;
            padding: 0.8mm !important;
            font-size: 5.5pt !important;
            line-height: 1.1 !important;
          }
          .print-resorts .min-h-\[24px\] { min-height: 0 !important; }
          .print-resorts .text-xl,
          .print-resorts .text-2xl { font-size: 8pt !important; line-height: 1.1 !important; }
          .print-resorts .text-lg { font-size: 7.5pt !important; }
          .print-resorts .text-sm { font-size: 6pt !important; }
          .print-resorts .text-xs { font-size: 5.5pt !important; line-height: 1.1 !important; }
          .print-resorts .text-\[10px\] { font-size: 5.5pt !important; }
          .print-resorts [class*="text-["] { font-size: 5.5pt !important; }
          .print-resorts .mt-1 { margin-top: 0.3mm !important; }
          .print-resorts br { display: none !important; }

          /* ── RODAPE ── */
          .print-area footer {
            padding: 1.5mm 2mm !important;
            font-size: 6pt !important;
            margin-top: auto !important;
            border-radius: 1.5mm !important;
          }

          /* Sem quebras de pagina */
          article, section, .flip-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-area, .print-area > * {
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }
        }
      `}</style>

      {/* ===== GRADIENT HEADER ===== */}
      <header
        className="relative overflow-hidden no-print"
        style={{
          background:
            "linear-gradient(135deg, #001f42 0%, #002B5C 60%, #004080 100%)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #60a5fa, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-6 sm:py-8">
          {/* Top row: pills + print button */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Conversão linear · Reaproveitamento
              </div>
              <Link
                to="/comparative"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all group"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Simulação de Diária
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {/* Logged-in consultant indicator */}
              <div className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-white/70 flex-shrink-0" />
                <span className="text-xs font-medium text-white/90 truncate max-w-[130px]">
                  {consultant.firstName} {consultant.lastName}
                </span>
              </div>
              <button
                onClick={() => setChangeOwnPinOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition"
              >
                <Lock className="h-3.5 w-3.5" />
                Alterar Senha
              </button>
              <button
                onClick={() => { logoutConsultant(); router.navigate({ to: "/login" }); }}
                title="Sair do sistema"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-red-500/20 hover:border-red-400/40 px-3 py-1.5 text-xs font-medium text-white/80 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
              <button
                onClick={handlePrint}
                disabled={!hasResult || !isEligible || !isClientDataValid}
                title={
                  !hasResult || !isEligible
                    ? `Disponível apenas para propostas elegíveis (≥ ${MIN_POINTS.toLocaleString("pt-BR")} pts)`
                    : !isClientDataValid
                    ? "Preencha o Nome e CPF do cliente para liberar a impressão"
                    : ""
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold text-white shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>

          {/* Icon + title */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Calculadora de Conversão Time Share
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Descubra quantos pontos seu saldo gera e quantas diárias você pode utilizar em cada temporada.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="print-area-wrapper mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="print-area bg-transparent">
          {/* OPR Header — visivel apenas na impressao */}
          <div className="print-only">
            <div className="print-opr-brand">
              <h1>Calculadora de Conversão — Time Share GAV Resorts</h1>
              <p>Análise de Reaproveitamento de Saldo · One Page Report</p>
            </div>
            <div className="print-opr-meta">
              {exportDate && <div>{exportDate}</div>}
              <div>Consultor: {consultant.fullName}</div>
              {clientName && <div>Cliente: {clientName}{clientCpf ? ` | CPF: ${clientCpf}` : ""}</div>}
            </div>
          </div>

          {/* Input */}
          <section className="print-hide mx-auto mb-8 max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
              <label htmlFor="balance" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Calculator className="h-4 w-4" style={{ color: "#002B5C" }} />
                Saldo de Reaproveitamento
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-400">
                  R$
                </span>
                <input
                  id="balance"
                  type="text"
                  inputMode="numeric"
                  value={masked}
                  onChange={(e) => {
                    setMasked(maskBRL(e.target.value));
                    if (computedBalance !== null) setComputedBalance(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCalculate();
                    }
                  }}
                  placeholder="0,00"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-5 pl-14 pr-4 text-2xl font-bold text-slate-900 outline-none transition-all focus:border-[#002B5C] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Digite o valor disponível como saldo para conversão em pontos.<br />
                  <span className="text-slate-600">Mínimo para conversão: <strong>{formatBRL(MIN_BALANCE)}</strong> ({MIN_POINTS.toLocaleString("pt-BR")} pts).</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCalculate}
                    disabled={balance <= 0}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#002B5C" }}
                  >
                    <Calculator className="h-4 w-4" />
                    Calcular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMasked("");
                      setComputedBalance(null);
                    }}
                    disabled={!masked && computedBalance === null}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          </section>

          {hasResult && !isEligible && (
            <section className="print-hide mx-auto mb-8 max-w-2xl">
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 shadow-lg sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-amber-900">Saldo insuficiente para proposta Time Share</h2>
                    <p className="mt-2 text-sm text-amber-900/90">
                      São necessários no mínimo <strong>{MIN_POINTS.toLocaleString("pt-BR")} pontos</strong> (equivalente a{" "}
                      <strong>{formatBRL(MIN_BALANCE)}</strong> de saldo) para que a conversão seja elegível.
                    </p>
                    <p className="mt-2 text-sm text-amber-900/90">
                      Seu saldo atual gera apenas{" "}
                      <strong className="tabular-nums">{points.toLocaleString("pt-BR")} pontos</strong>. Faltam{" "}
                      <strong className="tabular-nums">{pointsMissing.toLocaleString("pt-BR")} pontos</strong>{" "}
                      (~ <strong>{formatBRL(balanceMissing)}</strong>).
                    </p>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs font-medium text-amber-900">
                        <span>Progresso de elegibilidade</span>
                        <span className="tabular-nums">{eligibilityProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200">
                        <div
                          className="h-full rounded-full bg-amber-600 transition-all"
                          style={{ width: `${eligibilityProgress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("balance") as HTMLInputElement | null;
                        el?.focus();
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                    >
                      <Calculator className="h-4 w-4" />
                      Ajustar saldo
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {hasResult && isEligible && (
            <>
              {/* Client Data — required before printing */}
              <section className="print-hide mx-auto mb-8 max-w-2xl">
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Users className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-blue-900">Dados do Cliente <span className="text-xs font-normal text-blue-600">(obrigatório para gerar proposta)</span></h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="clientName" className="mb-1.5 block text-xs font-semibold text-slate-600">Nome Completo</label>
                      <input
                        id="clientName"
                        type="text"
                        placeholder="Copie o nome completo do CRM"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="clientCpf" className="mb-1.5 block text-xs font-semibold text-slate-600">CPF</label>
                      <input
                        id="clientCpf"
                        type="text"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={clientCpf}
                        onChange={(e) => setClientCpf(maskCpf(e.target.value))}
                        maxLength={14}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 tabular-nums"
                      />
                    </div>
                  </div>
                  {!isClientDataValid && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Preencha o nome (mín. 5 caracteres) e CPF (11 dígitos) do cliente para liberar o botão Imprimir.
                    </p>
                  )}
                  {isClientDataValid && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
                      <Check className="h-3.5 w-3.5 flex-shrink-0" />
                      Dados do cliente preenchidos — proposta pronta para impressão.
                    </p>
                  )}
                </div>
              </section>
              {/* Summary */}
              <section className="print-summary mb-8 grid gap-4 sm:grid-cols-2">
                <div
                  className="rounded-2xl p-6 text-white shadow-xl shadow-blue-900/20"
                  style={{ background: "linear-gradient(135deg, #002B5C 0%, #003d7a 100%)" }}
                >
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-90">Total de Pontos</div>
                  <div className="text-4xl font-bold tabular-nums">{points.toLocaleString("pt-BR")}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-300/30">
                    <Check className="h-3 w-3" />
                    Proposta elegível
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Validade
                  </div>
                  <div className="text-4xl font-bold text-slate-900">5 anos</div>
                  <div className="mt-2 text-xs text-slate-500">para utilizar seus pontos</div>
                </div>
              </section>

              {/* Resorts */}
              <section>
                <h2 className="mb-2 text-xl font-bold text-slate-900">Opções de Hospedagem</h2>
                <p className="mb-5 text-xs text-slate-500 leading-relaxed max-w-2xl">
                  <Info className="inline h-3.5 w-3.5 mr-1 text-slate-400 -mt-0.5" />
                  As alternativas abaixo <strong className="text-slate-700">não são cumulativas</strong>.
                </p>
                <div className="print-resorts grid gap-5 lg:grid-cols-2">
                  {RESORTS.flatMap((resort, index) => {
                    const isFlipped = !!flipped[resort.name];
                    // Tighter approximation: header + per-room compact block
                    const minH = 150 + resort.rooms.length * 135;
                    const items = [];

                    // No separator between resorts (explanatory text is now above the grid)

                    items.push(
                      <div
                        key={resort.name}
                        className={`flip-card ${isFlipped ? "flipped" : ""}`}
                        style={{ minHeight: minH }}
                      >
                        <div className="flip-card-inner" style={{ minHeight: minH }}>
                          {/* FRONT */}
                          <article
                            className="flip-face overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer"
                            onClick={() => toggleFlip(resort.name)}
                          >
                            <div className="flex items-start justify-between p-5" style={{ backgroundColor: "#002B5C" }}>
                              <div>
                                <h3 className="font-bold text-white">{resort.name}</h3>
                                <p className="text-xs text-slate-300">{resort.tagline}</p>
                              </div>
                              <RotateCw className="h-4 w-4 text-slate-300 opacity-70" />
                            </div>
                            <div className="divide-y divide-slate-100">
                              {resort.rooms.map((room) => (
                                <div key={room.type} className="p-5">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-900">{room.type}</div>
                                    <div
                                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                      title="Crianças, independentemente da idade, contam como hóspedes para o limite de capacidade."
                                    >
                                      <Users className="h-3 w-3" />
                                      Máx. {room.capacity}
                                      <Info className="h-3 w-3 text-slate-400" />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-stretch gap-y-2">
                                    {SEASONS.map((season, sIdx) => {
                                      const cost = room.costs[season];
                                      const seasonCard = !cost ? (
                                        <div
                                          key={season}
                                          className="flex-1 min-w-[calc(50%-16px)] sm:min-w-0 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center"
                                        >
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight min-h-[24px]">
                                            {season}
                                            <br />
                                            Temporada
                                          </div>
                                          <div className="mt-1 text-[11px] text-slate-400">Indisponível</div>
                                        </div>
                                      ) : (() => {
                                        const nights = Math.floor(points / cost);
                                        const enough = nights >= MIN_NIGHTS;
                                        return (
                                          <div
                                            key={season}
                                            className={`flex-1 min-w-[calc(50%-16px)] sm:min-w-0 rounded-lg border p-2.5 text-center ${
                                              enough ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50"
                                            }`}
                                          >
                                            <div
                                              className="text-[10px] font-semibold uppercase tracking-wider leading-tight min-h-[24px]"
                                              style={{ color: enough ? "#002B5C" : "#92400e" }}
                                            >
                                              {season}
                                              <br />
                                              Temporada
                                            </div>
                                            {enough ? (
                                              <>
                                                <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                                                  {nights}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                  {nights === 1 ? "diária" : "diárias"}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="mt-1 inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-amber-700">
                                                <AlertCircle className="h-3 w-3" />
                                                Insuficiente
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })();

                                      // Insert "ou" label between season cards
                                      if (sIdx < SEASONS.length - 1) {
                                        return (
                                          <>
                                            {seasonCard}
                                            <div
                                              key={`ou-${season}`}
                                              className="season-or-label flex items-center justify-center px-1"
                                            >
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">ou</span>
                                            </div>
                                          </>
                                        );
                                      }
                                      return seasonCard;
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </article>

                          {/* BACK */}
                          <article
                            className="flip-face flip-back overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm cursor-pointer flex flex-col"
                            onClick={() => toggleFlip(resort.name)}
                          >
                            <div className="flex items-start justify-between p-5" style={{ backgroundColor: "#002B5C" }}>
                              <div>
                                <h3 className="font-bold text-white">{resort.name}</h3>
                                <p className="text-xs text-slate-300">Pontuação por diária</p>
                              </div>
                              <RotateCw className="h-4 w-4 text-slate-300 opacity-70" />
                            </div>
                            <div className="flex-1 p-5">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                      Unidade
                                    </th>
                                    {SEASONS.map((s) => (
                                      <th
                                        key={s}
                                        className="py-2 text-center text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: "#002B5C" }}
                                      >
                                        {s}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {resort.rooms.map((room) => (
                                    <tr key={room.type} className="border-b border-slate-100">
                                      <td className="py-3 text-sm font-semibold text-slate-900">
                                        <div>{room.shortType}</div>
                                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                          <Users className="h-3 w-3" />
                                          Máx. {room.capacity}
                                        </div>
                                      </td>
                                      {SEASONS.map((s) => {
                                        const c = room.costs[s];
                                        return (
                                          <td key={s} className="py-3 text-center tabular-nums text-slate-700">
                                            {c ? c.toLocaleString("pt-BR") : "—"}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="px-5 pb-4 text-[11px] italic text-slate-500">
                              * Pontuações referentes à 1 diária.
                              <br />
                              * Apenas hospedagem. Não inclui alimentação.
                            </div>
                          </article>
                        </div>
                      </div>
                    );

                    return items;
                  })}
                </div>
              </section>
            </>
          )}

          {/* Histórico de Simulações */}
          {history.length > 0 && (
            <section className="no-print mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold" style={{ color: "#002B5C" }}>
                  <History className="h-5 w-5" />
                  Histórico de Simulações
                </h2>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </button>
              </div>

              <ul className="space-y-3">
                {history.map((entry) => {
                  const rejectionOpen = entry.id in pendingRejection;
                  const rejText = pendingRejection[entry.id] ?? "";
                  const trimmedLen = rejText.trim().length;
                  return (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</div>
                          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            <div className="text-sm">
                              <span className="text-slate-500">Saldo:</span>{" "}
                              <span className="font-semibold text-slate-900">{formatBRL(entry.balance)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-slate-500">Pontos:</span>{" "}
                              <span className="font-semibold tabular-nums" style={{ color: "#002B5C" }}>
                                {entry.points.toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>
                          {entry.status === "nao_aceita" && entry.rejectionReason && (
                            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-900">
                              <span className="font-semibold">Motivo: </span>
                              {entry.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {entry.status === "pendente" && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              Pendente
                            </span>
                          )}
                          {entry.status === "aceita" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              <Check className="h-3 w-3" />
                              Aceita
                            </span>
                          )}
                          {entry.status === "nao_aceita" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                              <X className="h-3 w-3" />
                              Não Aceita
                            </span>
                          )}
                          {entry.status === "inelegivel" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                              <AlertTriangle className="h-3 w-3" />
                              Inelegível
                            </span>
                          )}
                          {entry.status !== "pendente" && entry.status !== "inelegivel" && (
                            <button
                              type="button"
                              onClick={() => resetStatus(entry.id)}
                              className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>
                      </div>

                      {entry.status === "pendente" && !rejectionOpen && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setProposalAccepted(entry.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Proposta Aceita
                          </button>
                          <button
                            type="button"
                            onClick={() => openRejection(entry.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                          >
                            <X className="h-3.5 w-3.5" />
                            Proposta Não Aceita
                          </button>
                        </div>
                      )}

                      {rejectionOpen && (
                        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                          <label className="mb-1.5 block text-xs font-semibold text-rose-900">
                            Motivo da recusa <span className="text-rose-600">*</span>
                          </label>
                          <div className="relative">
                            <textarea
                              value={rejText}
                              maxLength={1000}
                              onChange={(e) =>
                                setPendingRejection((p) => ({ ...p, [entry.id]: e.target.value }))
                              }
                              placeholder="Descreva o motivo pelo qual a proposta não foi aceita..."
                              rows={3}
                              className="w-full resize-y rounded-md border border-rose-200 bg-white p-2.5 pr-2 pb-6 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            />
                            <div className="pointer-events-none absolute bottom-1.5 right-2 text-[11px] tabular-nums text-slate-500">
                              {rejText.length}/1000
                            </div>
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => cancelRejection(entry.id)}
                              className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => saveRejection(entry.id)}
                              disabled={trimmedLen === 0}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Salvar recusa
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}


          {/* Footer notice */}
          <footer className="mt-12 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                <strong>Aviso importante:</strong> Crianças, independentemente da idade, contam como hóspedes para o limite de capacidade do apartamento. Reservas exigem o mínimo de 2 diárias.
              </p>
            </div>
          </footer>
        </div>
      </div>

      {changeOwnPinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#002B5C] to-[#003d80] px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Alterar Minha Senha</h2>
                <p className="text-blue-200 text-xs mt-0.5">{consultant?.fullName}</p>
              </div>
              <button onClick={() => { setChangeOwnPinOpen(false); setOwnPinCurrent(''); setOwnPinNew(''); setOwnPinConfirm(''); setOwnPinError(''); setOwnPinSuccess(false); }} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {ownPinSuccess ? (
              <div className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-slate-800">Senha alterada com sucesso!</p>
                <button onClick={() => { setChangeOwnPinOpen(false); setOwnPinSuccess(false); }}
                  className="mt-4 w-full rounded-xl bg-[#002B5C] text-white py-2.5 text-sm font-bold">Fechar</button>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const consultants = getConsultants();
                const me = consultants.find(c => c.id === consultant!.consultantId);
                if (!me || me.pin !== ownPinCurrent) { setOwnPinError('Senha atual incorreta.'); return; }
                if (!isValidPin(ownPinNew)) { setOwnPinError('Nova senha deve ter mín. 6 caracteres alfanuméricos.'); return; }
                if (ownPinNew !== ownPinConfirm) { setOwnPinError('As senhas não coincidem.'); return; }
                updateConsultant(consultant!.consultantId, { pin: ownPinNew });
                setOwnPinSuccess(true);
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha Atual</label>
                  <input type="password" value={ownPinCurrent} onChange={e => { setOwnPinCurrent(e.target.value); setOwnPinError(''); }}
                    placeholder="Digite sua senha atual"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nova Senha</label>
                  <input type="password" value={ownPinNew} onChange={e => { setOwnPinNew(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setOwnPinError(''); }}
                    placeholder="Mín. 6 caracteres alfanuméricos"
                    maxLength={20}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar Nova Senha</label>
                  <input type="password" value={ownPinConfirm} onChange={e => { setOwnPinConfirm(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setOwnPinError(''); }}
                    placeholder="Repita a nova senha"
                    maxLength={20}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100" />
                </div>
                {ownPinError && <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{ownPinError}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setChangeOwnPinOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
                  <button type="submit"
                    className="flex-1 rounded-xl bg-[#002B5C] hover:bg-[#003d80] text-white py-2.5 text-sm font-bold shadow-md transition">Salvar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
