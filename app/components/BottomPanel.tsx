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

      {/* Saving Estimation Card - Visible only on large screens */}
      <div className="hidden lg:block flex-[1.2] pointer-events-auto bg-[var(--bg-sidebar)]/95 backdrop-blur-xl border border-[var(--border-subtle)] p-6 rounded-[var(--radius-xl)] shadow-2xl animate-fade-in-up [animation-delay:200ms] border-l-4 border-l-[var(--accent-purple)]" style={{ padding: "1%" }}>
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm text-[var(--text-secondary)] font-bold leading-snug">
            Ahorro estimado este mes comparando con la media local
          </p>
          <div className="p-3 bg-purple-500/10 rounded-2xl">
            <Wallet className="w-5 h-5 text-purple-400" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">
            12.45 <span className="text-xl font-bold text-[var(--text-muted)] tracking-normal">€</span>
          </div>
          <button className="px-5 py-2.5 bg-[var(--bg-card)] hover:bg-[var(--accent-purple)] hover:text-white border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md">
            Ver histórico
          </button>
        </div>
      </div>
    </div>
  );
}
