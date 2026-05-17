"use client";

import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  X,
  MapPin,
  Clock,
  Fuel,
  TrendingUp,
  Info,
  Calendar,
  ChevronLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import theme from "../page"

interface HistoryPoint {
  date: string;
  g95: number | null;
  g98: number | null;
  diesel: number | null;
  diesel_plus: number | null;
  glp: number | null;
}

interface StationDetailsProps {
  stationId: string;
  onClose: () => void;
}

export default function StationDetails({ stationId, onClose }: StationDetailsProps) {
  const [station, setStation] = useState<any>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [stationRes, historyRes] = await Promise.all([
          fetch(`/api/gasolineras/${stationId}`),
          fetch(`/api/gasolineras/${stationId}/history`)
        ]);

        if (!stationRes.ok || !historyRes.ok) throw new Error("Error al cargar datos");

        const stationData = await stationRes.json();
        const historyData = await historyRes.json();

        setStation(stationData.station);
        setHistory(historyData.history);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información de la estación.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [stationId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl" style={{ padding: "1%" }}>
          <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-blue)]" />
          <p className="font-bold text-[var(--text-primary)]">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[var(--bg-card)] rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Error</h3>
          <p className="text-[var(--text-secondary)]">{error || "Estación no encontrada"}</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-[var(--accent-blue)] text-white rounded-xl font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const chartOptionLight = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 0,
      textStyle: { color: '#333' },
      padding: 12,
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.1)'
    },
    legend: {
      data: ['G95', 'G98', 'Diesel'],
      bottom: 0,
      textStyle: { color: '#4b5563' }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: history.map(h => new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
      axisLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.08)' } },
      axisLabel: { color: '#9ca3af' }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.08)', type: 'dashed' } },
      axisLabel: { color: '#9ca3af' }
    },
    series: [
      {
        name: 'G95',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.map(h => h.g95),
        lineStyle: { width: 3, color: '#00c950' },
        itemStyle: { color: '#00c950' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(0, 201, 80, 0.2)' }, { offset: 1, color: 'rgba(0, 201, 80, 0)' }]
          }
        }
      },
      {
        name: 'G98',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.map(h => h.g98),
        lineStyle: { width: 3, color: '#2b7fff' },
        itemStyle: { color: '#2b7fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(43, 127, 255, 0.2)' }, { offset: 1, color: 'rgba(43, 127, 255, 0)' }]
          }
        }
      },
      {
        name: 'Diesel',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.map(h => h.diesel),
        lineStyle: { width: 3, color: '#ff6900' },
        itemStyle: { color: '#ff6900' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(255, 105, 0, 0.2)' }, { offset: 1, color: 'rgba(255, 105, 0, 0)' }]
          }
        }
      }
    ]
  };

  const chartOptionDark = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderWidth: 0,
      textStyle: { color: '#fff' },
      padding: 12,
      shadowBlur: 10,
      shadowColor: 'rgba(255,255,255,0.1)'
    },
    legend: {
      data: ['G95', 'G98', 'Diesel'],
      bottom: 0,
      textStyle: { color: '#8b949e' }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: history.map(h => new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.07)' } },
      axisLabel: { color: '#484f58' }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.07)', type: 'dashed' } },
      axisLabel: { color: '#484f58' }
    },
    series: [
      {
        name: 'G95',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.map(h => h.g95),
        lineStyle: { width: 3, color: '#00c950' },
        itemStyle: { color: '#00c950' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(0, 201, 80, 0.2)' }, { offset: 1, color: 'rgba(0, 201, 80, 0)' }]
          }
        }
      },
      {
        name: 'G98',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.map(h => h.g98),
        lineStyle: { width: 3, color: '#2b7fff' },
        itemStyle: { color: '#2b7fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(43, 127, 255, 0.2)' }, { offset: 1, color: 'rgba(43, 127, 255, 0)' }]
          }
        }
      },
      {
        name: 'Diesel',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.map(h => h.diesel),
        lineStyle: { width: 3, color: '#ff6900' },
        itemStyle: { color: '#ff6900' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(255, 105, 0, 0.2)' }, { offset: 1, color: 'rgba(255, 105, 0, 0)' }]
          }
        }
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-primary)] w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
        {/* Header Image/Pattern */}
        <div className="h-32 bg-gradient-to-r from-[var(--accent-blue)] to-indigo-600 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="absolute top-6 left-11 w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-4 border-4 border-[var(--bg-primary)]">
            <Fuel className="w-12 h-12 text-[var(--accent-blue)]" />
          </div>
        </div>

        <div className="pt-16 px-12 pb-12" style={{ padding: "2%" }}>
          {/* Title & Badge */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black text-[var(--text-primary)] leading-tight mb-2">
                {station.name}
              </h2>
              <div className="flex items-center gap-4 text-[var(--text-secondary)] font-medium">
                <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1 rounded-lg border border-[var(--border-subtle)]" style={{ padding: "1% 5px", margin: "1% 0 5% 0" }}>
                  <MapPin className="w-4 h-4 text-[var(--accent-blue)]" />
                  {station.locality}, {station.province}
                </span>
                <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1 rounded-lg border border-[var(--border-subtle)]" style={{ padding: "1% 5px", margin: "1% 0 5% 0" }}>
                  <Clock className="w-4 h-4 text-[var(--accent-blue)]" />
                  {station.schedule?.toLowerCase().includes("24h") ? "Abierto 24h" : "Ver horario abajo"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Info & Prices */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Prices Card */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[1.5rem] p-6 shadow-sm" style={{ padding: "5%" }}>
                <div className="flex items-center gap-2 mb-6 text-[var(--text-primary)] font-black uppercase tracking-wider text-xs">
                  <TrendingUp className="w-4 h-4 text-[var(--accent-blue)]" />
                  Precios Actuales
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Gasolina 95", price: station.prices.G95, color: "text-green-500" },
                    { label: "Gasolina 98", price: station.prices.G98, color: "text-blue-500" },
                    { label: "Diésel A", price: station.prices.DIESEL, color: "text-orange-500" }
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <span className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                        {p.label}
                      </span>
                      <span className={`text-xl font-black ${p.color}`}>
                        {p.price ? p.price.toFixed(3) : "--"}
                        <small className="text-[10px] ml-0.5 opacity-70">€/L</small>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[1.5rem] p-6 shadow-sm" style={{ padding: "5%" }}>
                <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] font-black uppercase tracking-wider text-xs">
                  <Info className="w-4 h-4 text-[var(--accent-blue)]" />
                  Información
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1" style={{ paddingTop: "3%" }}>Dirección</label>
                    <p className="text-sm font-bold text-[var(--text-primary)] leading-snug">{station.address}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{station.cp} {station.locality}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1" style={{ paddingTop: "3%" }}>Horario Detallado</label>
                    <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                      {station.schedule}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Evolution Graph */}
            <div className="lg:col-span-2">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[1.5rem] p-8 h-full shadow-sm flex flex-col" style={{ padding: "3%" }}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-black uppercase tracking-wider text-xs">
                    <Calendar className="w-4 h-4 text-[var(--accent-blue)]" />
                    Evolución de Precios (30 días)
                  </div>
                  {/* TODO: Ver si es necesario mostrar esto */}
                  {/* <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">G95</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">G98</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">Diesel</span>
                    </div>
                  </div> */}
                </div>

                <div className="flex-1 min-h-[350px]">
                  {history.length > 0 ? (
                    <ReactECharts option={theme.toString() === "dark" ? chartOptionDark : chartOptionLight} style={{ height: '100%', width: '100%' }} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <TrendingUp className="w-12 h-12 mb-4 text-[var(--text-primary)]" />
                      <p className="text-sm font-bold text-[var(--text-primary)]">Sin datos históricos suficientes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
