import { Search, Map as MapIcon, Bell, Settings, User, Menu, Sun, Moon } from "lucide-react";
import LocationSearch from "./LocationSearch";

interface HeaderProps {
  onMenuClick: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function Header({ onMenuClick, theme, onThemeToggle, onLocationSelect }: HeaderProps) {
  return (
    <header className="h-20 flex items-center justify-between px-8 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] z-[1001] shadow-sm">
      <div className="flex items-center gap-6">
        <button 
          onClick={onMenuClick}
          className="p-3 hover:bg-[var(--bg-secondary)] rounded-xl lg:hidden transition-all"
        >
          <Menu className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--accent-blue)] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FuelIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight hidden sm:block text-[var(--text-primary)]">
            Fuel<span className="text-[var(--accent-blue)]">Cartographer</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-12 hidden md:block">
        <LocationSearch onLocationSelect={onLocationSelect} />
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <nav className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={onThemeToggle}
            className="p-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all"
            title={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="p-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all">
            <MapIcon className="w-5 h-5" />
          </button>
          <button className="p-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-primary)]"></span>
          </button>
        </nav>
        
        <div className="w-px h-8 bg-[var(--border-subtle)] mx-1 sm:mx-2"></div>
        
        <button className="flex items-center gap-3 p-1.5 pl-1.5 pr-5 hover:bg-[var(--bg-secondary)] rounded-2xl transition-all border border-transparent hover:border-[var(--border-subtle)] shadow-sm bg-[var(--bg-secondary)]/30">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md">
            JD
          </div>
          <div className="flex flex-col items-start hidden lg:flex">
            <span className="text-sm font-bold text-[var(--text-primary)] leading-tight">Usuario Demo</span>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Premium Plan</span>
          </div>
        </button>
      </div>
    </header>
  );
}

function FuelIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 22L17 22" />
      <path d="M4 18L16 18" />
      <path d="M14 18V6C14 4.89543 13.1046 4 12 4H6C4.89543 4 4 4.89543 4 6V18" />
      <path d="M8 8H10" />
      <path d="M14 9C16.2091 9 18 10.7909 18 13V15" />
      <path d="M18 15V18" />
      <path d="M18 15C19.1046 15 20 14.1046 20 13C20 11.8954 19.1046 11 18 11" />
    </svg>
  );
}
