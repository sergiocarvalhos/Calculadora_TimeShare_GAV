import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Calendar, Users, Sparkles, Info, AlertCircle, AlertTriangle, Printer, RotateCw, History, Check, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Calculadora de Conversão - Time Share" },
      { name: "description", content: "Converta seu saldo em pontos de Time Share e descubra quantas diárias você consegue nos resorts GAV em cada temporada." },
    ],
  }),
});

const POINT_COST = 0.17;
const MIN_NIGHTS = 2;
const MIN_POINTS = 8000;
const MIN_BALANCE = MIN_POINTS * POINT_COST; // R$ 1.360,00

type Season = "Baixa" | "Média" | "Alta" | "Altíssima";
const SEASONS: Season[] = ["Baixa", "Média", "Alta", "Altíssima"];

type ProposalStatus = "pendente" | "aceita" | "nao_aceita" | "inelegivel";
type SimulationEntry = {
  id: string;
  createdAt: string;
  balance: number;
  points: number;
  status: ProposalStatus;
  rejectionReason?: string;
};

type Room = {
  type: string;
  shortType: string;
  capacity: number;
  costs: Partial<Record<Season, number>>;
};
type Resort = { name: string; tagline: string; rooms: Room[] };

const RESORTS: Resort[] = [
  {
    name: "Park GAV Resort",
    tagline: "Diversão para a família",
    rooms: [
      { type: "1 Quarto", shortType: "1Q", capacity: 5, costs: { Baixa: 2800, Média: 3000, Alta: 6300, Altíssima: 6500 } },
      { type: "2 Quartos", shortType: "2Q", capacity: 8, costs: { Baixa: 4600, Média: 4800, Alta: 8900, Altíssima: 9200 } },
    ],
  },
  {
    name: "Exclusive GAV Resort",
    tagline: "Experiência exclusiva",
    rooms: [
      { type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Baixa: 2600, Média: 2800, Alta: 5900, Altíssima: 6000 } },
      { type: "2 Quartos", shortType: "2Q", capacity: 7, costs: { Baixa: 4300, Média: 4500, Alta: 8000, Altíssima: 8300 } },
    ],
  },
  {
    name: "Premium GAV Resort",
    tagline: "Conforto refinado",
    rooms: [
      { type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Baixa: 2500, Média: 2600, Alta: 5700, Altíssima: 5900 } },
      { type: "2 Quartos", shortType: "2Q", capacity: 7, costs: { Baixa: 4200, Média: 4500, Alta: 9000, Altíssima: 9300 } },
    ],
  },
  {
    name: "Porto Alto Resort",
    tagline: "Beira-mar premium",
    rooms: [
      { type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Média: 6300, Alta: 9100, Altíssima: 13600 } },
      { type: "2 Quartos", shortType: "2Q", capacity: 6, costs: { Média: 12400, Alta: 18000, Altíssima: 27000 } },
    ],
  },
  {
    name: "Pyrenéus Residence",
    tagline: "Águas termais",
    rooms: [
      { type: "1 Quarto", shortType: "1Q", capacity: 4, costs: { Baixa: 4600, Média: 4800, Alta: 7300, Altíssima: 9100 } },
    ],
  },
];

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

function Index() {
  const [masked, setMasked] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [exportDate, setExportDate] = useState<string | null>(null);
  

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

    // Wait two animation frames so React commits the date into the DOM
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );

    const cleanup = () => {
      setExportDate(null);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    window.print();

    // Safety fallback if afterprint doesn't fire
    setTimeout(cleanup, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
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

        @media print {
          @page { size: A4 landscape; margin: 8mm; }
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

          /* Neutralizar wrappers da tela */
          .print-area-wrapper { max-width: none !important; padding: 0 !important; margin: 0 !important; }

          /* Folha virtual A4 landscape (297x210mm - 8mm margens = 281x194mm) */
          .print-area {
            width: 281mm !important;
            max-width: 281mm !important;
            height: 194mm !important;
            max-height: 194mm !important;
            overflow: hidden !important;
            font-size: 8pt !important;
            line-height: 1.25 !important;
            color: #0f172a !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2mm !important;
          }
          .print-area > * { margin: 0 !important; }

          /* Header compacto */
          .print-area header { margin-bottom: 1mm !important; text-align: center !important; }
          .print-area header > div:first-child { display: none !important; } /* badge "Conversão linear" */
          .print-area header h1 { font-size: 13pt !important; line-height: 1.05 !important; margin: 0 !important; }
          .print-area header h1 span { display: inline !important; margin-left: 4pt; }
          .print-area header p { font-size: 7.5pt !important; margin: 1mm 0 0 0 !important; }

          /* Títulos de seção */
          .print-area h2 { font-size: 9pt !important; margin: 0 0 1mm 0 !important; }
          .print-area h3 { font-size: 8.5pt !important; margin: 0 !important; }

          /* Resumo (saldo / pontos) */
          .print-summary {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 3mm !important;
            margin: 0 !important;
          }
          .print-summary > div { padding: 2mm 3mm !important; border-radius: 2mm !important; }
          .print-summary .text-4xl, .print-summary .text-5xl { font-size: 14pt !important; line-height: 1.1 !important; }
          .print-summary .text-sm, .print-summary .text-xs { font-size: 7pt !important; }

          /* Grid de resorts: 2 colunas fixas */
          .print-resorts {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 2mm !important;
            margin: 0 !important;
          }

          /* Cards (sempre face frontal) */
          .flip-card, .flip-card-inner, .flip-face {
            position: static !important;
            transform: none !important;
            min-height: 0 !important;
            height: auto !important;
            -webkit-backface-visibility: visible !important;
            backface-visibility: visible !important;
          }
          .flip-back { display: none !important; }

          .print-resorts article,
          .print-resorts .flip-face {
            padding: 2mm !important;
            border-radius: 2mm !important;
            border-width: 0.3mm !important;
          }
          .print-resorts .gap-2 { gap: 1mm !important; }
          .print-resorts .gap-3 { gap: 1.5mm !important; }
          .print-resorts .mb-3 { margin-bottom: 1mm !important; }
          .print-resorts .mb-2 { margin-bottom: 0.8mm !important; }
          .print-resorts .p-2\\.5, .print-resorts .p-3 { padding: 1mm !important; }
          .print-resorts .text-xl, .print-resorts .text-2xl { font-size: 9pt !important; line-height: 1.1 !important; }
          .print-resorts .text-lg { font-size: 8.5pt !important; }
          .print-resorts .text-sm { font-size: 7pt !important; }
          .print-resorts .text-xs { font-size: 6pt !important; line-height: 1.15 !important; }
          .print-resorts [class*="text-["] { font-size: 6pt !important; }
          .print-resorts br { display: none !important; }

          /* Footer */
          .print-area footer {
            padding: 1.5mm 2mm !important;
            font-size: 6.5pt !important;
            margin-top: auto !important;
            border-radius: 1.5mm !important;
          }

          /* Quebras */
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

      <div className="print-area-wrapper mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Print button */}
        <div className="no-print mb-4 flex justify-end">
          <button
            onClick={handlePrint}
            disabled={!hasResult || !isEligible}
            title={(!hasResult || !isEligible) ? "Disponível apenas para propostas elegíveis (≥ 8.000 pts)" : ""}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#002B5C" }}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>

        <div className="print-area bg-transparent">
          {/* Header */}
          <header className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Conversão linear · Gestão de Negócios
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Calculadora de Conversão
              <span className="block" style={{ color: "#002B5C" }}>
                Time Share
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
              Descubra quantos pontos seu saldo gera e quantas diárias você pode utilizar em cada temporada.
            </p>
            {exportDate && (
              <p className="mt-3 text-xs font-medium text-slate-700">{exportDate}</p>
            )}
          </header>

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
                  <span className="text-slate-600">Mínimo para conversão: <strong>{formatBRL(MIN_BALANCE)}</strong> (8.000 pts).</span>
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
                      São necessários no mínimo <strong>8.000 pontos</strong> (equivalente a{" "}
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
                <h2 className="mb-4 text-xl font-bold text-slate-900">Opções de Hospedagem</h2>
                <div className="print-resorts grid gap-5 lg:grid-cols-2">
                  {RESORTS.map((resort) => {
                    const isFlipped = !!flipped[resort.name];
                    // Tighter approximation: header + per-room compact block
                    const minH = 150 + resort.rooms.length * 135;
                    return (
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
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {SEASONS.map((season) => {
                                      const cost = room.costs[season];
                                      if (!cost) {
                                        return (
                                          <div
                                            key={season}
                                            className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center"
                                          >
                                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight min-h-[24px]">
                                              {season}
                                              <br />
                                              Temporada
                                            </div>
                                            <div className="mt-1 text-[11px] text-slate-400">Indisponível</div>
                                          </div>
                                        );
                                      }
                                      const nights = Math.floor(points / cost);
                                      const enough = nights >= MIN_NIGHTS;
                                      return (
                                        <div
                                          key={season}
                                          className={`rounded-lg border p-2.5 text-center ${
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
    </div>
  );
}
