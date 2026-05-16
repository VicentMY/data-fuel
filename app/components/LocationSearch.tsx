"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface LocationSearchProps {
  onLocationSelect: (lat: number, lon: number) => void;
  className?: string;
}

interface NominationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    state?: string;
  };
}

export default function LocationSearch({ onLocationSelect, className }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&countrycodes=es&addressdetails=1&limit=5`,
        {
          headers: {
            "Accept-Language": "es",
          },
        }
      );
      const data = await res.json();
      setResults(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchLocation(value);
    }, 500);
  };

  const handleSelect = (result: NominationResult) => {
    onLocationSelect(parseFloat(result.lat), parseFloat(result.lon));
    setQuery(result.display_name.split(",")[0]);
    setIsOpen(false);
    setResults([]);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative group w-full", className)}>
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
          isOpen ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)]"
        )} />
        
        <input
          style={{padding: "1% 35px" }}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          placeholder="Buscar municipio o código postal..."
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium focus:outline-none focus:border-[var(--accent-blue)] focus:bg-[var(--bg-card)] transition-all shadow-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-blue)]" />}
          {query && (
            <button 
              onClick={clearSearch}
              className="p-1 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden z-[2000] animate-fade-in-up">
          <div className="p-2">
            {results.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSelect(result)}
                className="w-full flex items-start gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded-xl transition-all text-left group"
              >
                <div className="p-2 bg-[var(--bg-secondary)] rounded-lg group-hover:bg-[var(--bg-card)] transition-colors mt-0.5">
                  <MapPin className="w-4 h-4 text-[var(--accent-blue)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {result.display_name.split(",")[0]}
                    </p>
                    {result.address?.postcode && (
                      <span className="text-[10px] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-md text-[var(--accent-blue)] font-bold border border-[var(--border-subtle)]">
                        {result.address.postcode}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {result.display_name.split(",").slice(1).join(",").trim()}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="bg-[var(--bg-secondary)]/50 px-4 py-2 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <span className="w-1 h-1 bg-[var(--accent-blue)] rounded-full"></span>
              Resultados de OpenStreetMap
            </p>
          </div>
        </div>
      )}

      {isOpen && query.length >= 3 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-2xl text-center z-[2000] animate-fade-in-up">
          <p className="text-sm text-[var(--text-secondary)] font-medium">No se encontraron resultados para "{query}"</p>
        </div>
      )}
    </div>
  );
}
