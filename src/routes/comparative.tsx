import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building2,
} from "lucide-react";
import { getConfig, CONFIG_UPDATED_EVENT } from "../lib/config-store";
import type { AppConfig, Season } from "../lib/config-store";

export const Route = createFileRoute("/comparative")({
  component: ComparativeCalculator,
  head: () => ({
    meta: [
      { title: "Simulação de Diária - GAV Resorts Time Share" },
      {
        name: "description",
        content:
          "Compare a tarifa de balcão com o custo equivalente em pontos Time Share para cada resort, tipo de quarto e temporada.",
      },
    ],
  }),
});

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPts(value: number) {
  return value.toLocaleString("pt-BR") + " pts";
}

const ALL_SEASONS: Season[] = ["Baixa", "Média", "Alta", "Altíssima"];

function ComparativeCalculator() {
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

  const [selectedResortId, setSelectedResortId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<Season | "">("");

  const selectedResort = config.resorts.find((r) => r.id === selectedResortId) ?? null;
  const selectedRoom = selectedResort?.rooms.find((rm) => rm.id === selectedRoomId) ?? null;

  // Only show seasons that have BOTH costs and balcao defined
  const availableSeasons = selectedRoom
    ? ALL_SEASONS.filter(
        (s) => selectedRoom.costs[s] !== undefined && selectedRoom.balcao[s] !== undefined
      )
    : [];

  const handleResortChange = (resortId: string) => {
    setSelectedResortId(resortId);
    setSelectedRoomId("");
    setSelectedSeason("");
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedSeason("");
  };

  // Derived calculation
  const tsPoints =
    selectedRoom && selectedSeason ? (selectedRoom.costs[selectedSeason] ?? null) : null;
  const tsPrice = tsPoints !== null ? tsPoints * config.pointCost : null;
  const balcaoPrice =
    selectedRoom && selectedSeason ? (selectedRoom.balcao[selectedSeason] ?? null) : null;

  const hasResult =
    tsPoints !== null && tsPrice !== null && balcaoPrice !== null && selectedSeason !== "";

  let savingsPct = 0;
  let isSaving = true;
  if (hasResult && balcaoPrice && tsPrice !== null) {
    const diff = balcaoPrice - tsPrice;
    savingsPct = (diff / balcaoPrice) * 100;
    isSaving = savingsPct >= 0;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ===== HEADER ===== */}
      <header
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #001f42 0%, #002B5C 60%, #004080 100%)" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", transform: "translate(-30%, 30%)" }}
        />

        <div className="relative max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-xs font-medium transition-colors mb-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à Calculadora de Conversão
          </Link>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Simulação de Diária
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Comparativo Financeiro · Tarifa Balcão vs. Conversão Time Share
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ===== SELECTORS ===== */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Selecione a opção de hospedagem</span>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Resort */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Resort
              </label>
              <select
                value={selectedResortId}
                onChange={(e) => handleResortChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition appearance-none cursor-pointer"
              >
                <option value="">Escolha um resort...</option>
                {config.resorts.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Room */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tipo de Quarto
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                disabled={!selectedResortId}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedResortId ? "Selecione o quarto..." : "Aguardando resort..."}
                </option>
                {selectedResort?.rooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.type} (Máx {rm.capacity} pess.)
                  </option>
                ))}
              </select>
            </div>

            {/* Season */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Temporada
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value as Season | "")}
                disabled={!selectedRoomId}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedRoomId ? "Selecione a temporada..." : "Aguardando quarto..."}
                </option>
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ===== RESULTS ===== */}
        {hasResult && selectedRoom && balcaoPrice !== null && tsPrice !== null && tsPoints !== null ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* --- Card Balcão --- */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Tarifa Balcão</h3>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Apenas Casal · 2 Pessoas
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-6 flex-1 leading-relaxed">
                  Tarifa pública padrão cobrada no site e na recepção para hospedagem de{" "}
                  <strong>2 pessoas</strong>, sem os benefícios da multipropriedade.
                </p>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Valor cobrado (1 diária)</p>
                  <p className="text-4xl font-black text-slate-800 tabular-nums">
                    {formatBRL(balcaoPrice)}
                  </p>
                </div>
              </div>

              {/* --- Card Time Share --- */}
              <div
                className={`relative rounded-2xl p-6 shadow-md flex flex-col overflow-hidden border-2 transition-colors ${
                  isSaving
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-amber-400 bg-amber-50"
                }`}
              >
                {/* Badge */}
                <div
                  className={`absolute top-0 right-0 text-white text-[11px] font-bold px-3 py-1.5 rounded-bl-2xl ${
                    isSaving ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                >
                  {isSaving
                    ? `Economia: ${savingsPct.toFixed(1).replace(".", ",")}%`
                    : `Variação: +${Math.abs(savingsPct).toFixed(1).replace(".", ",")}%`}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSaving ? "bg-emerald-200" : "bg-amber-200"
                    }`}
                  >
                    {isSaving ? (
                      <TrendingDown className="h-5 w-5 text-emerald-700" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-amber-700" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`font-bold text-base ${
                        isSaving ? "text-emerald-900" : "text-amber-900"
                      }`}
                    >
                      Tarifa Time Share
                    </h3>
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        isSaving ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      Família Completa · Até {selectedRoom.capacity} Pessoas
                    </p>
                  </div>
                </div>

                <p
                  className={`text-xs mb-6 flex-1 leading-relaxed ${
                    isSaving ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  Uso do saldo revertido em pontos. Acomoda até{" "}
                  <strong>{selectedRoom.capacity} pessoas</strong> (incluindo crianças) pelo
                  custo de conversão — mais espaço, mais rentabilidade.
                </p>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p
                      className={`text-xs font-semibold mb-1 ${
                        isSaving ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      Custo Real Convertido
                    </p>
                    <p
                      className={`text-4xl font-black tabular-nums ${
                        isSaving ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {formatBRL(tsPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[11px] font-semibold ${
                        isSaving ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      Débito no sistema
                    </p>
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        isSaving ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {formatPts(tsPoints)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footnote */}
            <p className="text-center text-xs text-slate-400 leading-relaxed">
              * Cálculo Time Share baseado na conversão de{" "}
              <strong>
                R$ {config.pointCost.toFixed(2).replace(".", ",")}
              </strong>{" "}
              por ponto.
              <br />
              A tarifa de balcão refere-se a 2 pessoas. A ocupação máxima varia conforme a
              tipologia do quarto selecionado.
            </p>
          </div>
        ) : (
          /* ===== EMPTY STATE ===== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
              <BarChart3 className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium">
              Selecione o resort, o tipo de quarto e a temporada
            </p>
            <p className="text-slate-400 text-xs mt-1">
              para visualizar o comparativo de diárias.
            </p>
          </div>
        )}

        {/* ===== BOTTOM NAV ===== */}
        <div className="flex justify-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:shadow-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Calculadora de Conversão
          </Link>
        </div>
      </main>
    </div>
  );
}
