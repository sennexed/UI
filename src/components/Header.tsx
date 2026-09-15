import React, { useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
  Server,
  ChevronDown,
  Zap,
  ExternalLink,
  Flame,
  Trash2,
  Radio,
} from "lucide-react";
import { BotStatusTelemetry } from "../types";
import { playClickSound, playAlertSound } from "../utils/audio";

interface HeaderProps {
  telemetry: BotStatusTelemetry | null;
  onToggleRaidMode: () => void;
  onSimulateRaid: () => void;
  onPurgeRecent: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  selectedGuild: string;
  onSelectGuild: (guild: string) => void;
}

const SERVERS = [
  { name: "Cyberpunk Gaming Hub", members: "42,850 members", icon: "🎮" },
  { name: "Apex Legends Central", members: "28,400 members", icon: "⚡" },
  { name: "TypeScript Developers", members: "19,200 members", icon: "💻" },
  { name: "Lofi Beats & Chill", members: "86,100 members", icon: "🎧" },
];

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  onToggleRaidMode,
  onSimulateRaid,
  onPurgeRecent,
  soundOn,
  onToggleSound,
  selectedGuild,
  onSelectGuild,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isRaid = telemetry?.raidMode ?? false;

  return (
    <header
      id="aegis-discord-header"
      className="border-b border-slate-800/80 bg-[#0e111a]/95 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Bot Identity & Server Picker */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Bot Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#5865F2] to-indigo-700 shadow-md shadow-indigo-500/20 text-white">
              <Shield className="w-5 h-5 fill-white/20 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0e111a]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">Aegis</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#5865F2] text-white flex items-center gap-0.5">
                  ✓ BOT
                </span>
                <span className="text-[11px] text-slate-400 font-mono">v3.1.2</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {telemetry?.pingMs ?? 19}ms Shard Ping
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">All Shards Operational</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-[1px] bg-slate-800 mx-1" />

          {/* Server Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                playClickSound();
                setDropdownOpen(!dropdownOpen);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-slate-700/60 hover:border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-[#5865F2]" />
              <span className="max-w-[150px] truncate">{selectedGuild}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-[#141824] border border-slate-700/80 shadow-2xl py-1.5 z-50 animate-fadeIn">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Manage Server
                </div>
                {SERVERS.map((server) => (
                  <button
                    key={server.name}
                    onClick={() => {
                      playClickSound();
                      onSelectGuild(server.name);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#1f2538] transition-colors cursor-pointer ${
                      selectedGuild === server.name ? "bg-[#1c2233] text-[#5865F2] font-semibold" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{server.icon}</span>
                      <span className="truncate">{server.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{server.members}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Anti-Raid Panic Switch & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Anti-Raid Panic Button */}
          <button
            onClick={() => {
              if (!isRaid) playAlertSound();
              else playClickSound();
              onToggleRaidMode();
            }}
            title={isRaid ? "Click to deactivate raid lockdown" : "Instant anti-raid lockdown gatekeeper"}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border flex items-center gap-1.5 transition-all cursor-pointer ${
              isRaid
                ? "bg-red-950/80 border-red-500 text-red-300 hover:bg-red-900 shadow-md shadow-red-950 animate-pulse"
                : "bg-[#141824] hover:bg-[#1a2030] border-slate-700/60 text-slate-300 hover:border-red-500/50 hover:text-red-300"
            }`}
          >
            {isRaid ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isRaid ? "RAID MODE: ACTIVE" : "ANTI-RAID SHIELD"}</span>
          </button>

          {/* Test Raid Button */}
          <button
            onClick={() => {
              playAlertSound();
              onSimulateRaid();
            }}
            title="Simulate sudden mass-join raid to test AutoMod defenses"
            className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simulate Raid</span>
          </button>

          {/* Quick Purge */}
          <button
            onClick={() => {
              playClickSound();
              onPurgeRecent();
            }}
            title="Purge 25 recent spam messages in active channel"
            className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Purge 25</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            title={soundOn ? "Mute sound alerts" : "Enable sound alerts"}
            className="p-1.5 rounded-lg bg-[#141824] border border-slate-700/60 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Invite Bot Mock Button */}
          <a
            href="#invite"
            onClick={(e) => {
              e.preventDefault();
              playClickSound();
              alert("Bot invite link copied to clipboard! (Permissions: Administrator / Manage Server / AutoMod)");
            }}
            className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Add to Discord</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      </div>
    </header>
  );
};
