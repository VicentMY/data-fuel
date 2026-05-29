"use client";

import { Search, MapPin, Fuel, Zap, Droplet, Clock, Check, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import LocationSearch from "./LocationSearch";
import PricePrediction from "./PricePrediction";

interface SidebarProps {
  radius: number;
  setRadius: (r: number) => void;
  fuelType: string;
  setFuelType: (f: string) => void;
  brand: string;
  setBrand: (b: string) => void;
  isOpen: boolean;
  onResetSelection: () => void;
  isSelectionActive: boolean;
  onlyUpdatedToday: boolean;
  setOnlyUpdatedToday: (v: boolean) => void;
  onlyOpenNow: boolean;
  setOnlyOpenNow: (v: boolean) => void;
  lastUpdated: string | null;
  apiStatus: "online" | "offline";
  onClose: () => void;
  onLocationSelect?: (lat: number, lon: number) => void;
  idProvincia?: string | null;
  provinciaNombre?: string | null;
}

const fuelTypes = [
  { id: "G95", label: "Gasolina 95", icon: Fuel, color: "bg-green-500" },
  { id: "DIESEL", label: "Diésel", icon: Droplet, color: "bg-orange-500" },
  { id: "G98", label: "Gasolina 98", icon: Zap, color: "bg-blue-500" },
];

const brands = ["Repsol", "Cepsa", "BP", "Galp", "Shell", "Petronor", "Plenoil"];

export default function Sidebar({
  radius,
  setRadius,
  fuelType,
  setFuelType,
  brand,
  setBrand,
  isOpen,
  onResetSelection,
  isSelectionActive,
  onlyUpdatedToday,
  setOnlyUpdatedToday,
  onlyOpenNow,
  setOnlyOpenNow,
  lastUpdated,
  apiStatus,
  onClose,
  onLocationSelect,
  idProvincia,
  provinciaNombre,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-[2500] w-80 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 overflow-y-auto px-8 py-10",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Close button inside sidebar for mobile viewports (< lg) */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] lg:hidden transition-all"
        aria-label="Cerrar barra lateral"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex flex-col gap-3">
        {/* Search Header */}
        <section>
          {lastUpdated && (
            <div className={cn(
              "flex items-center gap-2 mb-6 px-4 py-3 rounded-[var(--radius-lg)] text-xs shadow-sm font-semibold w-full border transition-all",
              apiStatus === "offline"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}>
              <Clock className={cn("w-4 h-4 flex-shrink-0", apiStatus === "offline" ? "text-rose-500 animate-pulse" : "text-[var(--accent-blue)]")} />
              <span className="leading-tight">
                {apiStatus === "offline" ? (
                  <>
                    API Caída. Precios locales: <span className="font-extrabold text-rose-600">{lastUpdated}</span>
                  </>
                ) : (
                  <>
                    Precios actualizados el <span className="font-extrabold text-[var(--text-primary)]">{lastUpdated}</span>
                  </>
                )}
              </span>
            </div>
          )}
          <h2 className="text-3xl font-extrabold mb-1 text-[var(--text-primary)]">Filtros</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8">FuelCartographer v1.2</p>

          {/* Location Search — visible only on mobile/tablet viewports (< md) inside the sidebar */}
          {onLocationSelect && (
            <div className="block md:hidden mb-8">
              <div className="uppercase text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
                Buscar dirección
              </div>
              <LocationSearch onLocationSelect={(lat, lon) => {
                onLocationSelect(lat, lon);
                onClose();
              }} />
            </div>
          )}

          <div className="uppercase text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
            Modo de búsqueda
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={onResetSelection}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-4 border rounded-[var(--radius-lg)] text-sm font-semibold transition-all shadow-sm",
                !isSelectionActive 
                  ? "bg-[var(--bg-card)] border-[var(--border-active)] text-[var(--text-primary)]" 
                  : "bg-[var(--bg-sidebar)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <MapPin className={cn("w-5 h-5", !isSelectionActive ? "text-[var(--accent-blue)]" : "")} />
              Ubicación actual
            </button>
            <div className={cn(
              "w-full flex items-center gap-3 px-5 py-4 border rounded-[var(--radius-lg)] text-sm font-medium transition-all custom-dialog",
              isSelectionActive 
                ? "bg-[var(--bg-card)] border-[var(--border-active)] text-[var(--text-primary)] shadow-sm"
                : "bg-transparent border-transparent text-[var(--text-muted)] opacity-50 cursor-not-allowed"
            )}>
              <Search className="w-5 h-5" />
              {isSelectionActive ? "Punto seleccionado" : "Pin no activo"}
            </div>
          </div>
        </section>

        {/* Radius Slider */}
        <section className="bg-[var(--bg-secondary)]/50 p-6 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] custom-container">
          <div className="flex justify-between items-center mb-6">
            <div className="uppercase text-[10px] font-bold tracking-widest text-[var(--text-muted)]">
              Radio de búsqueda
            </div>
            <span className="text-sm font-mono font-bold text-[var(--accent-blue)] px-3 py-1">{radius} km</span>
          </div>
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg cursor-pointer accent-[var(--accent-blue)]"
            />
            <div className="flex justify-between mt-3 text-[10px] text-[var(--text-muted)] font-bold">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        </section>

        {/* Prediction */}
        <section>
          <div className="mb-8">
            <PricePrediction
              idProvincia={idProvincia}
              provinciaNombre={provinciaNombre}
            />
          </div>
        </section>

        {/* Fuel Types */}
        <section>
          <div className="uppercase text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-5">
            Tipo de combustible
          </div>
          <div className="grid grid-cols-1 gap-2">
            {fuelTypes.map((type) => {
              const Icon = type.icon;
              const isActive = fuelType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setFuelType(type.id)}
                  className={cn(
                    "flex items-center justify-between px-5 py-4 rounded-[var(--radius-lg)] transition-all border group custom-container",
                    isActive
                      ? "bg-[var(--bg-card)] border-[var(--border-active)] text-[var(--text-primary)] shadow-md"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-xl transition-transform group-hover:scale-110",
                      isActive ? type.color : "bg-[var(--bg-secondary)]"
                    )} style={{ padding: "5px"}}>
                      <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[var(--text-secondary)]")} />
                    </div>
                    <span className="text-sm font-bold">{type.label}</span>
                  </div>
                  {isActive && <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent-blue)]" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Brands */}
        <section>
          <div className="uppercase text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-5">
            Marcas favoritas
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {brands.map((b) => (
              <label
                key={b}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] cursor-pointer transition-all border",
                  brand === b
                    ? "bg-[var(--accent-blue)]/10 border-[var(--accent-blue)] text-[var(--accent-blue)]"
                    : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                )}
                onClick={() => setBrand(brand === b ? "" : b)}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                    brand === b
                      ? "bg-[var(--accent-blue)] border-[var(--accent-blue)]"
                      : "border-[var(--text-muted)]"
                  )}
                >
                  {brand === b && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">{b}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className="mt-auto space-y-4">
          <div className="uppercase text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-2">
            Estado
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-sm custom-container">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Abierto ahora</span>
              </div>
              <button
                onClick={() => setOnlyOpenNow(!onlyOpenNow)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:ring-offset-2",
                  onlyOpenNow ? "bg-green-500" : "bg-[var(--bg-secondary)]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    onlyOpenNow ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-sm custom-container">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[var(--accent-blue)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Actualizado hoy</span>
              </div>
              <button
                onClick={() => setOnlyUpdatedToday(!onlyUpdatedToday)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:ring-offset-2",
                  onlyUpdatedToday ? "bg-[var(--accent-blue)]" : "bg-[var(--bg-secondary)]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    onlyUpdatedToday ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
