"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

interface Prediction {
  date: string;
  predictions: {
    g95: number | null;
    g98: number | null;
    diesel: number | null;
  };
  n_stations?: {
    g95?: number;
    g98?: number;
    diesel?: number;
  };
  mae: {
    g95?: number;
    g98?: number;
    diesel?: number;
  };
  trained_at: string | null;
  training_in_progress: boolean;
}

interface FuelCardProps {
  label: string;
  price: number | null;
  mae?: number;
  accentClass: string;
  iconBgClass: string;
}

function FuelBadge({ label, price, mae, accentClass, iconBgClass }: FuelCardProps) {
  const trend =
    mae == null ? null : mae < 0.005 ? "down" : mae < 0.015 ? "flat" : "up";

  return (
    <div
      className={`flex min-w-0 bg-[var(--bg-secondary)] rounded-[var(--radius-md)] p-3 md:p-4 border border-[var(--border-subtle)] flex flex-col gap-1.5 transition-all hover:border-opacity-60 ${iconBgClass} custom-dialog`}
    >
      <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </div>

      {price == null ? (
        <div className="text-sm font-bold text-[var(--text-muted)]">—</div>
      ) : (
        <div className="flex items-end gap-1">
          <span className={`text-2xl md:text-3xl font-black leading-none tracking-tighter ${accentClass}`}>
            {price.toFixed(3)}
          </span>
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-0.5">
            €/L
          </span>
        </div>
      )}

      {mae != null && (
        <div className="flex items-center gap-1 mt-0.5">
          {trend === "down" && (
            <TrendingDown className="w-3 h-3 text-green-500 flex-shrink-0" />
          )}
          {trend === "flat" && (
            <Minus className="w-3 h-3 text-amber-500 flex-shrink-0" />
          )}
          {trend === "up" && (
            <TrendingUp className="w-3 h-3 text-rose-500 flex-shrink-0" />
          )}
          <span className="text-[9px] text-[var(--text-muted)] font-bold">
            ±{mae.toFixed(4)} MAE
          </span>
        </div>
      )}
    </div>
  );
}

export default function PricePrediction({ 
  idProvincia, 
  provinciaNombre 
}: { 
  idProvincia?: string | null;
  provinciaNombre?: string | null;
}) {
  const [data, setData] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = idProvincia ? `/api/predicciones?id_provincia=${idProvincia}` : "/api/predicciones";
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
  }, [idProvincia]);

  useEffect(() => {
    if (!collapsed && !data && !loading) {
      fetchPrediction();
    }
  }, [collapsed, data, loading, idProvincia]);

  const trainedAt = data?.trained_at
    ? new Date(data.trained_at).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const tomorrow = data?.date
    ? new Date(data.date).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-subtle)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden animate-fade-in-up [animation-delay:150ms]" style={{padding: "3%"}}>
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 hover:bg-[var(--bg-secondary)] transition-colors group"
        id="prediction-panel-toggle"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[var(--accent-purple)]/10 rounded-lg">
            <BrainCircuit className="w-4 h-4 text-[var(--accent-purple)]" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black text-[var(--text-primary)] leading-tight">
              IA · Predicción mañana {provinciaNombre ? `(${provinciaNombre})` : ""}
            </div>
            {tomorrow && !collapsed && (
              <div className="text-[9px] text-[var(--text-muted)] font-bold capitalize">
                {tomorrow}
              </div>
            )}
          </div>

          {/* Training in progress pill */}
          {data?.training_in_progress && (
            <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/20">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Entrenando
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {trainedAt && !collapsed && (
            <span className="text-[8px] text-[var(--text-muted)] font-bold bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full hidden sm:block">
              Modelo: {trainedAt}
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
          )}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 md:px-5 pb-4 md:pb-5">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold">Cargando predicción...</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-bold max-w-[220px]">
                {error}
              </p>
              <button
                onClick={fetchPrediction}
                className="text-[10px] font-black text-[var(--accent-blue)] hover:underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Prediction cards */}
          {!loading && data && !error && (
            <>
              <div className="space-y-4">
                <FuelBadge
                  label="Gasolina 95"
                  price={data.predictions.g95}
                  mae={data.mae.g95}
                  accentClass="text-green-500"
                  iconBgClass="hover:border-green-500/30"
                />
                <FuelBadge
                  label="Gasolina 98"
                  price={data.predictions.g98}
                  mae={data.mae.g98}
                  accentClass="text-blue-500"
                  iconBgClass="hover:border-blue-500/30"
                />
                <FuelBadge
                  label="Diésel"
                  price={data.predictions.diesel}
                  mae={data.mae.diesel}
                  accentClass="text-amber-500"
                  iconBgClass="hover:border-amber-500/30"
                />
              </div>

              {/* Footer bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] font-bold">
                  <Zap className="w-3 h-3 text-[var(--accent-purple)]" />
                  Random Forest ·{" "}
                  {data.n_stations?.g95
                    ? `${data.n_stations?.g95.toLocaleString("es-ES")} estaciones`
                    : "Predicción provincial"}
                </div>
                <button
                  onClick={fetchPrediction}
                  disabled={loading || data.training_in_progress}
                  title="Actualizar datos"
                  className="flex items-center gap-1 text-[9px] font-black text-[var(--text-muted)] hover:text-[var(--accent-purple)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  id="btn-update-prediction"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loading || data.training_in_progress ? "animate-spin" : ""}`}
                  />
                  Actualizar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
