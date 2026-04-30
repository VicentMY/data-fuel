"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BottomPanel from "./components/BottomPanel";
import { Loader2, AlertCircle } from "lucide-react";

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
}

export default function Home() {
  const [radius, setRadius] = useState(5);
  const [fuelType, setFuelType] = useState("G95");
  const [brand, setBrand] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [selection, setSelection] = useState<[number, number] | null>(null);
  
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize with user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn("Geolocation denied, defaulting to Madrid", err);
          setLocation([40.416775, -3.703790]); // Madrid default
        }
      );
    } else {
      setLocation([40.416775, -3.703790]);
    }
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

  useEffect(() => {
    fetchStations();
  }, [fetchStations, selection]);

  // Derived data
  const filteredStations = stations.filter(s => 
    !brand || s.brand.toLowerCase().includes(brand.toLowerCase())
  );

  const cheapest = filteredStations.length > 0 
    ? [...filteredStations].sort((a, b) => (a.price || 99) - (b.price || 99))[0] 
    : null;
    
  const nearest = filteredStations.length > 0 
    ? [...filteredStations].sort((a, b) => a.dist - b.dist)[0] 
    : null;

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)] ${theme === "dark" ? "dark" : ""}`}>
      <Header 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        theme={theme}
        onThemeToggle={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
        onLocationSelect={(lat, lon) => setSelection([lat, lon])}
      />

      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          radius={radius}
          setRadius={setRadius}
          fuelType={fuelType}
          setFuelType={setFuelType}
          brand={brand}
          setBrand={setBrand}
          isOpen={isSidebarOpen}
          onResetSelection={() => setSelection(null)}
          isSelectionActive={!!selection}
        />

        <main className="flex-1 relative">
          {location ? (
            <FuelMap
              center={location}
              radius={radius}
              stations={filteredStations}
              theme={theme}
              onMarkerClick={(s) => console.log("Selected station:", s)}
              onMapClick={(lat, lon) => setSelection([lat, lon])}
              selection={selection}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[var(--accent-blue)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)] font-medium">Obteniendo ubicación...</p>
              </div>
            </div>
          )}

          {/* Map Overlays - Use higher z-index to stay above Leaflet map panes */}
          <div className="absolute top-8 left-8 z-[1000] flex flex-col gap-3 pointer-events-none">
            <div className="bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-subtle)] px-6 py-5 rounded-[var(--radius-xl)] shadow-2xl pointer-events-auto border-l-4 border-l-[var(--accent-blue)]">
              <h4 className="text-base font-black text-[var(--text-primary)] leading-tight">{stations[0]?.locality || "Área detectada"}</h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mt-1">
                {stations.length} estaciones encontradas
              </p>
            </div>
          </div>

          <div className="z-[1000] relative">
            <BottomPanel
              cheapest={cheapest}
              nearest={nearest}
              onSelect={(s) => console.log("Station focused:", s)}
            />
          </div>

          {isLoading && !stations.length && (
            <div className="absolute inset-0 z-[1100] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Actualizando precios...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1200]">
              <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center">
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
