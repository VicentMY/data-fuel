"use client";

import { TrendingDown, Navigation, Wallet, ArrowUpRight } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  price: number | null;
  dist: number;
}

interface BottomPanelProps {
  cheapest: Station | null;
  nearest: Station | null;
  onSelect: (s: Station) => void;
}

export default function BottomPanel({ cheapest, nearest, onSelect }: BottomPanelProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 z-30 flex flex-col sm:flex-row gap-4 pointer-events-none">
      {/* Cheapest Card */}
      <button
        onClick={() => cheapest && onSelect(cheapest)}
        className="flex-1 pointer-events-auto bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-subtle)] p-4 md:p-6 rounded-[var(--radius-lg)] md:rounded-[var(--radius-xl)] shadow-xl md:shadow-2xl hover:border-[var(--accent-blue)] transition-all text-left animate-fade-in-up group"
      >
        <div className="flex justify-between items-start mb-3 md:mb-5">
          <div className="min-w-0 flex-1">
            <div className="uppercase text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-1">MÁS BARATA HOY</div>
            <h3 className="font-extrabold text-sm md:text-base truncate text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">{cheapest?.name || "Buscando..."}</h3>
          </div>
          <div className="p-2 md:p-3 bg-green-500/10 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform ml-2">
            <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl md:text-3xl font-black text-green-500 leading-none tracking-tighter">
              {cheapest?.price?.toFixed(3) || "---"}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] ml-1.5 font-black uppercase">€/L</span>
          </div>
          <div className="flex items-center text-[10px] md:text-xs text-[var(--text-secondary)] font-bold bg-[var(--bg-secondary)] px-2.5 py-1 md:px-3 md:py-1.5 rounded-full">
            Ver detalles <ArrowUpRight className="w-3 md:w-3.5 h-3 md:h-3.5 ml-1 md:ml-1.5" />
          </div>
        </div>
      </button>

      {/* Nearest Card */}
      <button
        onClick={() => nearest && onSelect(nearest)}
        className="flex-1 pointer-events-auto bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-subtle)] p-4 md:p-6 rounded-[var(--radius-lg)] md:rounded-[var(--radius-xl)] shadow-xl md:shadow-2xl hover:border-[var(--accent-blue)] transition-all text-left animate-fade-in-up [animation-delay:100ms] group"
      >
        <div className="flex justify-between items-start mb-3 md:mb-5">
          <div className="min-w-0 flex-1">
            <div className="uppercase text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-1">CERCA DE TI</div>
            <h3 className="font-extrabold text-sm md:text-base truncate text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">{nearest?.name || "Buscando..."}</h3>
          </div>
          <div className="p-2 md:p-3 bg-blue-500/10 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform ml-2">
            <Navigation className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl md:text-3xl font-black text-blue-500 leading-none tracking-tighter">
              {nearest?.dist ? `${nearest.dist.toFixed(1)}` : "---"}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] ml-1.5 font-black uppercase">km</span>
          </div>
          <div className="flex items-center text-[10px] md:text-xs text-[var(--text-secondary)] font-bold bg-[var(--bg-secondary)] px-2.5 py-1 md:px-3 md:py-1.5 rounded-full">
            Ir ahora <ArrowUpRight className="w-3 md:w-3.5 h-3 md:h-3.5 ml-1 md:ml-1.5" />
          </div>
        </div>
      </button>
    </div>
  );
}
