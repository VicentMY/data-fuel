"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BottomPanel from "./components/BottomPanel";
import StationList from "./components/StationList";
import StationDetails from "./components/StationDetails";
import PricePrediction from "./components/PricePrediction";
import { Loader2, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { isOpenNow, isUpdatedToday } from "./lib/schedule";

// Dynamically import Map to avoid hydration errors with Leaflet
const FuelMap = dynamic(() => import("./components/FuelMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
    </div>
  ),
});

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
  province: string;
  id_provincia: string;
  updatedAt: string | null;
  schedule: string;
}

export default function Home() {
  const [radius, setRadius] = useState(5);
  const [fuelType, setFuelType] = useState("G95");
  const [brands, setBrands] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [highlightedStationId, setHighlightedStationId] = useState<string | null>(null);
  
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [onlyUpdatedToday, setOnlyUpdatedToday] = useState(true);
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);

  // Background ingestion tracking
  const [isIngesting, setIsIngesting] = useState(false);
  const [isHistoricalIngesting, setIsHistoricalIngesting] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"online" | "offline">("online");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasIngesting = useRef(false);
  const hasCheckedInitialStatus = useRef(false);
  // Ref so the polling closure always calls the latest fetchStations
  const fetchStationsRef = useRef<() => void>(() => {});

  // Initialize with user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("Geolocation denied, defaulting to Valencia", err);
          setLocation([39.4749, -0.3763]); // Valencia default
        }
      );
    } else {
      setLocation([39.4749, -0.3763]);
    }
  }, []);

  // Poll /api/status while ingestion is running
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const { isIngesting: ing, isHistoricalIngesting: histIng, lastUpdated: lu, apiStatus: apiSt } = await res.json();
        setIsIngesting(ing);
        setIsHistoricalIngesting(histIng);
        if (apiSt) setApiStatus(apiSt);
        
        if (lu) {
          const lastDate = new Date(lu);
          const formatted = lastDate.toLocaleDateString("es-ES", { 
            day: "2-digit", 
            month: "2-digit",
            hour: "2-digit", 
            minute: "2-digit" 
          });
          setLastUpdated(formatted);
          
          // Initial check: if not ingesting but updated recently (< 60s), show success banner ONCE
          if (!hasCheckedInitialStatus.current) {
            hasCheckedInitialStatus.current = true;
            if (!ing && !histIng) {
              const secondsSinceUpdate = (new Date().getTime() - lastDate.getTime()) / 1000;
              if (secondsSinceUpdate < 60) {
                setJustFinished(true);
                setTimeout(() => setJustFinished(false), 5000);
              }
            }
          }
        }

        // Transition: was ingesting → now done → reload stations
        if (wasIngesting.current && !ing && !histIng) {
          setJustFinished(true);
          // Clear client cache so fresh data is fetched, not cached stale data
          sessionStorage.clear();
          fetchStationsRef.current();
          setTimeout(() => setJustFinished(false), 5000);
        }
        
        wasIngesting.current = ing || histIng;

        // If we were ingesting and now it's done, or if it was never ingesting and we've done the initial check,
        // we can potentially stop the interval if ing is false and the API status is online.
        if (!ing && !histIng && apiSt === 'online' && pollingRef.current && hasCheckedInitialStatus.current) {
           // We keep it running if the API is offline to detect when it recovers.
           clearInterval(pollingRef.current);
           pollingRef.current = null;
        }
      } catch {
        // Silently ignore network errors during polling
      }
    };

    // Initial check
    checkStatus();

    // Start polling every 3s
    pollingRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const fetchStations = useCallback(async () => {
    const searchPoint = selection || location;
    if (!searchPoint) return;
    
    // Generar clave de caché (redondeando coordenadas para mayor estabilidad)
    const [lat, lon] = searchPoint;
    const cacheKey = `fuel_cache_${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${fuelType}`;
    
    // Intentar leer de caché local (sessionStorage)
    const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Caché válido por 5 minutos en el cliente
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log("[Client Cache] Usando datos guardados para esta zona.");
          setStations(data);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/gasolineras?lat=${lat}&lon=${lon}&radius=${radius}&fuel=${fuelType}`);
      
      if (!res.ok) throw new Error("Failed to fetch stations");
      
      const data = await res.json();
      const stationsList = data.stations || [];
      
      setStations(stationsList);
      
      // Guardar en caché del navegador
      if (typeof window !== "undefined") {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: stationsList,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las estaciones. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [location, selection, radius, fuelType]);

  // Keep ref in sync so the polling closure always calls the latest version
  useEffect(() => {
    fetchStationsRef.current = fetchStations;
  }, [fetchStations]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations, selection]);

  // Derived data
  const filteredStations = stations.filter(s => {
    const matchesBrand = brands.length === 0 || brands.some(b => s.brand.toLowerCase().includes(b.toLowerCase()));
    const matchesUpdated = !onlyUpdatedToday || apiStatus === "offline" || isUpdatedToday(s.updatedAt);
    const matchesOpen = !onlyOpenNow || isOpenNow(s.schedule);
    
    return matchesBrand && matchesUpdated && matchesOpen;
  });

  const cheapest = filteredStations.length > 0 
    ? [...filteredStations].sort((a, b) => (a.price || 99) - (b.price || 99))[0] 
    : null;
    
  const nearest = filteredStations.length > 0 
    ? [...filteredStations].sort((a, b) => a.dist - b.dist)[0] 
    : null;

  const stationsWithPrice = filteredStations.filter(s => s.price !== null);
  const currentPrice = stationsWithPrice.length > 0
    ? stationsWithPrice.reduce((acc, s) => acc + s.price!, 0) / stationsWithPrice.length
    : null;

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)] ${theme === "dark" ? "dark" : ""}`}>
      <Header 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        theme={theme}
        onThemeToggle={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
        onLocationSelect={(lat, lon) => setSelection([lat, lon])}
        viewMode={viewMode}
        onViewToggle={() => setViewMode(prev => prev === "map" ? "list" : "map")}
      />

      {/* Ingestion status banner — between header and content, full width */}
      {(isIngesting || isHistoricalIngesting || justFinished) && (
        <div
          className={`flex items-center gap-4 px-8 py-3.5 text-sm font-bold border-b shadow-xl transition-all duration-700 relative z-[50] ${
            justFinished
              ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20"
              : "bg-amber-400 text-amber-950 border-amber-500 shadow-amber-900/20 animate-pulse"
          }`}
        >
          {justFinished ? (
            <>
              <div className="bg-white/20 p-1.5 rounded-full shadow-inner">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
              </div>
              <span className="tracking-tight text-base">¡Precios actualizados con éxito!</span>
            </>
          ) : (
            <>
              <div className="bg-amber-950/10 p-1.5 rounded-full shadow-inner">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-950 flex-shrink-0" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="tracking-tight text-base">
                  {isHistoricalIngesting ? `Obteniendo históricos. Última fecha: ${lastUpdated}` : "Obteniendo nuevos precios..."}
                </span>
                {!isHistoricalIngesting && lastUpdated && (
                  <span className="bg-amber-950/10 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit">
                    Última versión: {lastUpdated}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {/* API offline warning banner */}
      {apiStatus === "offline" && !isIngesting && (
        <div className="flex items-center gap-4 px-8 py-3.5 text-sm font-bold bg-rose-500/10 text-rose-500 border-b border-rose-500/20 shadow-xl transition-all duration-700 relative z-[50]">
          <div className="bg-rose-500/20 p-1.5 rounded-full shadow-inner flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 leading-tight">
            <span className="tracking-tight text-base font-extrabold">⚠️ La API de MINETUR no está disponible (Error 503).</span>
            <span className="opacity-90">Mostrando precios locales guardados de la última actualización del <span className="font-black text-rose-600 underline decoration-2 decoration-rose-500/50">{lastUpdated || "origen desconocido"}</span>.</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 relative overflow-hidden">
        {/* Backdrop for mobile viewport when sidebar is open */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[2400] bg-black/50 backdrop-blur-sm lg:hidden transition-all duration-300 cursor-pointer"
          />
        )}

        <Sidebar
          radius={radius}
          setRadius={setRadius}
          fuelType={fuelType}
          setFuelType={setFuelType}
          brands={brands}
          setBrands={setBrands}
          isOpen={isSidebarOpen}
          onResetSelection={() => setSelection(null)}
          isSelectionActive={!!selection}
          onlyUpdatedToday={onlyUpdatedToday}
          setOnlyUpdatedToday={setOnlyUpdatedToday}
          onlyOpenNow={onlyOpenNow}
          setOnlyOpenNow={setOnlyOpenNow}
          lastUpdated={lastUpdated}
          apiStatus={apiStatus}
          onClose={() => setIsSidebarOpen(false)}
          onLocationSelect={(lat, lon) => {
            setSelection([lat, lon]);
          }}
          idProvincia={nearest?.id_provincia || null}
          provinciaNombre={nearest?.province || null}
          currentPrice={currentPrice}
        />
        <main className="flex-1 relative overflow-hidden">
          {viewMode === "list" ? (
            <StationList
              stations={filteredStations}
              fuelType={fuelType}
              isLoading={isLoading && !stations.length}
              onSelect={(id) => setSelectedStationId(id)}
              onLocate={(s) => {
                setViewMode("map");
                setHighlightedStationId(null);
                setTimeout(() => setHighlightedStationId(s.id), 0);
              }}
            />
          ) : (
            <>
              {location ? (
                <FuelMap
                  center={location}
                  radius={radius}
                  stations={filteredStations}
                  theme={theme}
                  onMarkerClick={(s) => console.log("Selected station:", s)}
                  onMapClick={(lat, lon) => setSelection([lat, lon])}
                  onSelectStation={(id) => setSelectedStationId(id)}
                  selection={selection}
                  highlightedStationId={highlightedStationId}
                />
              ) : (
                <div className="absolute inset-0 z-[1100] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 custom-dialog">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">Obteniendo ubicación...</span>
                  </div>
                </div>
              )}

              {/* Map Overlays */}
              <div className="absolute top-4 md:top-8 left-4 md:left-8 z-[1000] flex flex-col gap-3 pointer-events-none">
                {/* Area info card */}
                <div className="bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-subtle)] px-4 py-3 rounded-[var(--radius-xl)] shadow-2xl pointer-events-auto border-l-4 border-l-[var(--accent-blue)] custom-container">
                  <h4 className="text-sm font-black text-[var(--text-primary)] leading-tight">{nearest?.locality || "Área detectada"}</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mt-1">
                    {filteredStations.length} estaciones encontradas
                  </p>
                </div>
              </div>

              <div className="z-[1000] relative">
                <BottomPanel
                  cheapest={cheapest}
                  nearest={nearest}
                  onSelect={(s) => setSelectedStationId(s.id)}
                />
              </div>
            </>
          )}

          {selectedStationId && (
            <StationDetails
              stationId={selectedStationId}
              onClose={() => setSelectedStationId(null)}
            />
          )}

          {isLoading && !stations.length && (
            <div className="absolute inset-0 z-[1100] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 custom-dialog">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Actualizando precios...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1200]">
              <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center custom-container">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <h3 className="font-bold mb-1 text-[var(--text-primary)]">Algo salió mal</h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-[200px]">{error}</p>
                </div>
                <button 
                  onClick={fetchStations}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold transition-all hover:bg-red-600"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
