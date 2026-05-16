"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  lat: number;
  lon: number;
  price: number | null;
  dist: number;
}

interface FuelMapProps {
  center: [number, number];
  radius: number;
  stations: Station[];
  onMarkerClick?: (station: Station) => void;
  onMapClick?: (lat: number, lon: number) => void;
  onSelectStation?: (id: string) => void;
  selection?: [number, number] | null;
  theme?: "light" | "dark";
}

export default function FuelMap({ 
  center, 
  radius, 
  stations, 
  onMarkerClick, 
  onMapClick,
  onSelectStation,
  selection,
  theme = "dark" 
}: FuelMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const selectionMarkerRef = useRef<L.Marker | null>(null);

  // Delegated event listener for popup buttons
  useEffect(() => {
    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("popup-ver-mas-btn")) {
        const stationId = target.getAttribute("data-station-id");
        if (stationId && onSelectStation) {
          onSelectStation(stationId);
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handlePopupClick);
    }
    return () => {
      if (container) {
        container.removeEventListener("click", handlePopupClick);
      }
    };
  }, [onSelectStation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Fix for Leaflet default icon paths in Next.js
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 13);

    const tileUrl = theme === "dark" 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    map.on("click", (e) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    
    // Add user location marker
    const userIcon = L.divIcon({
      className: "user-location-marker",
      html: `<div class="relative flex h-5 w-5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-500 border-2 border-white"></span>
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker(center, { icon: userIcon }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  // Update theme
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const tileUrl = theme === "dark" 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    tileLayerRef.current.setUrl(tileUrl);
    
    // Update container background to prevent flashes
    if (containerRef.current) {
      containerRef.current.style.background = theme === "dark" ? "#1a2035" : "#e5e7eb";
    }
  }, [theme]);

  // Update radius circle
  useEffect(() => {
    if (!mapRef.current) return;

    if (circleRef.current) {
      circleRef.current.remove();
    }

    const circleCenter = selection || center;

    circleRef.current = L.circle(circleCenter, {
      radius: radius * 1000,
      className: "radius-circle",
    }).addTo(mapRef.current);
  }, [center, selection, radius]);

  // Update selection marker (chincheta)
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectionMarkerRef.current) {
      selectionMarkerRef.current.remove();
    }

    if (selection) {
      const pinIcon = L.divIcon({
        className: "selection-pin-marker",
        html: `<div class="selection-pin animate-fade-in-up">
          <div class="pin-head"></div>
          <div class="pin-point"></div>
        </div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });

      selectionMarkerRef.current = L.marker(selection, { icon: pinIcon }).addTo(mapRef.current);
      
      // Pan to selection
      mapRef.current.panTo(selection, { animate: true });
    } else {
      // Pan back to user location if selection is cleared
      mapRef.current.panTo(center, { animate: true });
    }
  }, [selection, center]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    stations.forEach((s) => {
      if (!s.price) return;

      const colorClass = s.price < 1.5 ? "cheap" : s.price < 1.65 ? "mid" : "expensive";
      
      const icon = L.divIcon({
        className: "custom-div-icon",
        html: `<div class="fuel-marker ${colorClass}">
          <div class="fuel-marker-inner">${s.price.toFixed(3)}</div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([s.lat, s.lon], { icon })
        .bindPopup(`
          <div class="p-2 min-w-[200px]">
            <div class="font-bold text-sm mb-1 text-[var(--text-primary)]">${s.name}</div>
            <div class="text-xs text-[var(--text-secondary)] mb-3">${s.address}</div>
            <div class="flex justify-between items-center mb-4">
              <span class="text-xs font-semibold opacity-70">Precio:</span>
              <span class="text-sm font-black text-emerald-500">${s.price.toFixed(3)} €/L</span>
            </div>
            <button 
              class="popup-ver-mas-btn w-full py-2 bg-[var(--accent-blue)] text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
              data-station-id="${s.id}"
            >
              Ver Más Detalles
            </button>
          </div>
        `, {
          className: 'custom-leaflet-popup'
        })
        .on("click", () => onMarkerClick?.(s));

      markersLayerRef.current?.addLayer(marker);
    });
  }, [stations, onMarkerClick]);

  return <div ref={containerRef} className="w-full h-full" />;
}
