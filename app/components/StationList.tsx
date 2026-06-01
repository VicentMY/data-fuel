"use client";

import { useState, useMemo } from "react";
import {
  Fuel,
  Navigation2,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trophy,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  lat: number;
  lon: number;
  price: number | null;
  dist: number;
  locality: string;
  updatedAt: string | null;
  schedule: string;
}

type SortKey = "price" | "dist" | "locality" | "price-dist";

interface StationListProps {
  stations: Station[];
  fuelType: string;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onLocate?: (station: Station) => void;
}

const FUEL_LABELS: Record<string, string> = {
  G95: "Gasolina 95",
  G98: "Gasolina 98",
  DIESEL: "Diésel A",
  DIESEL_PLUS: "Diésel Premium",
  GLP: "GLP",
};

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}, ${hours}:${minutes}`;
  } catch (e) {
    return "";
  }
}

export function effectiveFuelPrice(
  fuelPrice: number,
  distanceKm: number,
  litersToRefuel: number = 30,
  consumptionL100Km: number = 7
): number {
  const travelCost =
    distanceKm *
    (consumptionL100Km / 100) *
    fuelPrice;

  return fuelPrice + travelCost / litersToRefuel;
}


function SortButton({
  label,
  icon,
  active,
  direction,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border w-full ${active
        ? "bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-lg shadow-blue-500/20"
        : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-blue)]/50 hover:text-[var(--text-primary)]"
        }`}
    >
      {icon}
      <span>{label}</span>
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

function PriceBadge({ rank, price, sortKey }: { rank: number; price: number | null; sortKey: SortKey }) {
  if (price === null)
    return (
      <span className="text-xs text-[var(--text-muted)] font-bold">N/D</span>
    );

  const colors = [
    "from-amber-400 to-yellow-500 text-amber-950",
    "from-slate-400 to-slate-500 text-white",
    "from-orange-600 to-orange-700 text-white",
  ];
  const gradient = rank < 3 ? colors[rank] : null;

  const getLabel = () => {
    if (rank !== 0) return rank === 1 ? "2.º" : "3.º";
    
    switch (sortKey) {
      case "price": return "🏆 Más barato";
      case "dist": return "🏆 Más cerca";
      case "price-dist": return "🏆 Recomendado";
      default: return "🏆 Top";
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={`text-2xl font-black tracking-tight ${rank === 0 && sortKey != "locality" ? "text-amber-400" : "text-[var(--text-primary)]"
          }`}
      >
        {price.toFixed(3)}
        <span className="text-sm font-bold ml-0.5 opacity-70">€</span>
      </span>
      {rank < 3 && sortKey != "locality" && (
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r custom-badge ${gradient}`}
        >
          {getLabel()}
        </span>
      )}
    </div>
  );
}

export default function StationList({
  stations,
  fuelType,
  isLoading,
  onSelect,
  onLocate,
}: StationListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price-dist");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...stations].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "price") {
        const pa = a.price ?? 99999;
        const pb = b.price ?? 99999;
        cmp = pa - pb;
      } else if (sortKey === "dist") {
        cmp = a.dist - b.dist;
      } else if (sortKey === "price-dist") {
        const pa = a.price;
        const pb = b.price;
        if (pa === null && pb === null) cmp = 0;
        else if (pa === null) cmp = 1;
        else if (pb === null) cmp = -1;
        else {
          cmp = effectiveFuelPrice(pa, a.dist) - effectiveFuelPrice(pb, b.dist);
        }
      } else if (sortKey === "locality") {
        cmp = a.locality.localeCompare(b.locality, "es");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [stations, sortKey, sortDir]);

  // Precompute rank based on current sort criteria
  const rankMap = useMemo(() => {
    const sorted = [...stations].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "price") {
        const pa = a.price ?? 99999;
        const pb = b.price ?? 99999;
        cmp = pa - pb;
      } else if (sortKey === "dist") {
        cmp = a.dist - b.dist;
      } else if (sortKey === "price-dist") {
        const pa = a.price;
        const pb = b.price;
        if (pa === null && pb === null) cmp = 0;
        else if (pa === null) cmp = 1;
        else if (pb === null) cmp = -1;
        else {
          cmp = effectiveFuelPrice(pa, a.dist) - effectiveFuelPrice(pb, b.dist);
        }
      } else if (sortKey === "locality") {
        cmp = a.locality.localeCompare(b.locality, "es");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    const map = new Map<string, number>();
    sorted.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [stations, sortKey, sortDir]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent-blue)]/20 border-t-[var(--accent-blue)] rounded-full animate-spin" />
          <p className="text-sm font-bold text-[var(--text-secondary)]">
            Cargando estaciones...
          </p>
        </div>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Fuel className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-30" />
          <p className="text-sm font-bold text-[var(--text-secondary)]">
            No hay estaciones con los filtros actuales
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-shrink-0 custom-dialog gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Trophy className="w-4 h-4 text-[var(--accent-blue)]" />
          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
            {sorted.length} estaciones ·{" "}
            {FUEL_LABELS[fuelType] || fuelType}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-nowrap md:w-auto md:justify-end">
          <div className="w-full md:w-auto">
            <SortButton
              label="Recomendado"
              icon={<Star className="w-3.5 h-3.5" />}
              active={sortKey === "price-dist"}
              direction={sortDir}
              onClick={() => handleSort("price-dist")}
            />
          </div>
          <div className="w-full md:w-auto">
            <SortButton
              label="Precio"
              icon={<Fuel className="w-3.5 h-3.5" />}
              active={sortKey === "price"}
              direction={sortDir}
              onClick={() => handleSort("price")}
            />
          </div>
          <div className="w-full md:w-auto">
            <SortButton
              label="Distancia"
              icon={<Navigation2 className="w-3.5 h-3.5" />}
              active={sortKey === "dist"}
              direction={sortDir}
              onClick={() => handleSort("dist")}
            />
          </div>
          <div className="w-full md:w-auto">
            <SortButton
              label="Municipio"
              icon={<MapPin className="w-3.5 h-3.5" />}
              active={sortKey === "locality"}
              direction={sortDir}
              onClick={() => handleSort("locality")}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[var(--border-subtle)]">
          {sorted.map((station, idx) => {
            const rank = rankMap.get(station.id) ?? 999;
            const isTop = rank === 0 && sortKey != "locality";

            return (
              <div
                key={station.id}
                style={{ padding: "10px 1%" }}
                className={`flex items-center gap-4 transition-colors hover:bg-[var(--bg-secondary)] group ${isTop
                  ? "bg-amber-500/5 border-l-2 border-l-amber-400"
                  : "border-l-2 border-l-transparent"
                  }`}
              >
                {/* Rank number */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${rank < 3 && sortKey != "locality"
                    ? rank === 0
                      ? "bg-amber-400/20 text-amber-400"
                      : rank === 1
                        ? "bg-slate-400/20 text-slate-400"
                        : "bg-orange-600/20 text-orange-500"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                    }`}
                >
                  {rank + 1}
                </div>

                {/* Station info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black text-[var(--text-primary)] truncate">
                      {station.name}
                    </p>
                    {station.schedule?.toLowerCase().includes("24h") && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 flex-shrink-0">
                        24h
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {station.locality}
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation2 className="w-3 h-3" />
                      {formatDist(station.dist)}
                    </span>
                    {station.updatedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Actualizado: {formatDate(station.updatedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                    {station.address}
                  </p>
                </div>

                {/* Price */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <PriceBadge rank={rank} price={station.price} sortKey={sortKey} />
                  <div className="flex items-center gap-2">
                    {onLocate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLocate(station);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-black uppercase tracking-wider rounded-xl hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)] transition-all"
                      >
                        Localizar
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(station.id);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent-blue)] text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all" style={{ textWrap: "nowrap" }}
                    >
                      Ver Más
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
