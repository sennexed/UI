import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Server,
  Zap,
  Activity,
  AlertTriangle,
  Ban,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Sparkles,
  Layers,
  Cpu,
} from "lucide-react";
import { BotStatusTelemetry, ModLogItem, AutoModRule } from "../types";
import { playClickSound, playAlertSound } from "../utils/audio";

interface StatusDashboardProps {
  telemetry: BotStatusTelemetry | null;
  modLogs: ModLogItem[];
  onToggleRule: (ruleId: string) => void;
  onClearLogs: () => void;
  onSelectLog: (log: ModLogItem) => void;
  selectedGuild: string;
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  telemetry,
  modLogs,
  onToggleRule,
  onClearLogs,
  onSelectLog,
  selectedGuild,
}) => {
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [eventHistory, setEventHistory] = useState<number[]>([
    3950, 4120, 4080, 4220, 4180, 4290, 4210, 4340, 4250, 4310, 4280, 4400, 4320, 4210,
  ]);

  useEffect(() => {
    if (!telemetry) return;
    setEventHistory((prev) => [...prev.slice(1), telemetry.eventsPerMinute]);
  }, [telemetry?.eventsPerMinute]);

  const filteredLogs = modLogs.filter((log) => {
    if (logFilter === "ALL") return true;
    return log.actionType === logFilter;
  });

  return (
    <div id="aegis-status-dashboard" className="space-y-4">
      {/* Multi-Model AI Moderation Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#17142b] via-[#121626] to-[#0f1b26] border border-slate-700/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                Active Multi-Model AutoMod Pipeline
              </h4>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ENGAGED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Every message is moderated by <strong>Gemini 3.5 Flash</strong> and crime incidents are summarized by <strong>Google Gemini</strong> (≤150 words).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-[11px] font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Gemini 3.5 Flash (Moderation)</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-sky-950/70 border border-sky-500/40 text-sky-200 text-[11px] font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Google Gemini (≤150w Summary)</span>
          </div>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Guilds Protected */}
        <div
          id="stat-card-servers"
          className="p-4 rounded-xl bg-[#121520] border border-slate-800/80 hover:border-slate-700 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#5865F2]" />
              Servers Protected
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30">
              99.98%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {telemetry?.serversCount.toLocaleString() ?? "18,420"}
            </span>
            <span className="text-xs text-emerald-400 font-medium">+142/wk</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across 3 active gateway clusters</p>
        </div>

        {/* Card 2: Members Protected */}
        <div
          id="stat-card-members"
          className="p-4 rounded-xl bg-[#121520] border border-slate-800/80 hover:border-slate-700 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Members Monitored
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
              LIVE
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {telemetry ? (telemetry.membersProtected / 1000000).toFixed(2) : "2.41"}M
            </span>
            <span className="text-xs text-slate-400">Total Users</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Real-time presence & event sync</p>
        </div>

        {/* Card 3: Infractions Blocked */}
        <div
          id="stat-card-infractions"
          className="p-4 rounded-xl bg-[#121520] border border-slate-800/80 hover:border-slate-700 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Infractions Blocked
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/30">
              TODAY
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-200">
              {telemetry?.infractionsToday.toLocaleString() ?? "48,290"}
            </span>
            <span className="text-xs text-emerald-400 font-medium">100% Mitigated</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Phishing, spam, invite links, raids</p>
        </div>

        {/* Card 4: Gateway Activity */}
        <div
          id="stat-card-gateway"
          className="p-4 rounded-xl bg-[#121520] border border-slate-800/80 hover:border-slate-700 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Gateway Throughput
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {telemetry?.pingMs ?? 19}ms
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {telemetry?.eventsPerMinute.toLocaleString() ?? "4,210"}
            </span>
            <span className="text-xs text-slate-400 font-mono">events/min</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Memory: {telemetry?.memoryUsageMb ?? 184} MB / 512 MB</p>
        </div>
      </div>

      {/* Middle Grid: AutoMod Rules & Shards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: AutoMod Security Matrix */}
        <div
          id="automod-rules-card"
          className="lg:col-span-7 p-4 rounded-xl bg-[#121520] border border-slate-800/80 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#5865F2]" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  AutoMod Rule Enforcement
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Server: <strong className="text-white">{selectedGuild}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Automated rules intercept infractions before members see them.
            </p>

            {/* Rules List */}
            <div className="space-y-2">
              {telemetry?.activeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-2.5 rounded-lg bg-[#161b28] border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{rule.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {rule.action.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{rule.description}</p>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      {rule.triggerCount.toLocaleString()} blocked
                    </span>
                    <button
                      onClick={() => {
                        playClickSound();
                        onToggleRule(rule.id);
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        rule.enabled ? "bg-[#5865F2]" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          rule.enabled ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Filter Engine: Gemini 3.5 Flash + Gemini</span>
            <span className="text-emerald-400 font-medium">All 5 Filters Operational</span>
          </div>
        </div>

        {/* Right 5 cols: Shard Health */}
        <div
          id="shards-health-card"
          className="lg:col-span-5 p-4 rounded-xl bg-[#121520] border border-slate-800/80 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Shard Clusters
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Ping: <strong className="text-white font-mono">{telemetry?.pingMs ?? 19}ms</strong>
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Multi-cluster WebSocket shards distributed across global Discord regions.
            </p>

            <div className="space-y-2">
              {telemetry?.shards.map((shard) => (
                <div
                  key={shard.id}
                  className="p-2.5 rounded-lg bg-[#161b28] border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">Shard #{shard.id}</div>
                      <div className="text-[11px] text-slate-500">{shard.region}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-slate-200">{shard.guildsCount.toLocaleString()} guilds</div>
                    <div className="text-[10px] text-emerald-400 font-mono">{shard.pingMs}ms ping</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Total Shards: 3</span>
            <span className="text-[#5865F2] font-medium">Zero Packet Drop</span>
          </div>
        </div>
      </div>

      {/* Moderation Audit Log Stream */}
      <div
        id="mod-log-stream-card"
        className="p-4 rounded-xl bg-[#121520] border border-slate-800/80 flex flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#5865F2]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Live Moderation & Infraction Stream
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {filteredLogs.length} EVENTS
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {["ALL", "AUTOMOD_BLOCK", "BAN", "MUTE", "WARN", "PURGE"].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => {
                  playClickSound();
                  setLogFilter(filterKey);
                }}
                className={`text-[11px] font-medium px-2 py-0.5 rounded transition-all cursor-pointer ${
                  logFilter === filterKey
                    ? "bg-[#5865F2] text-white"
                    : "bg-[#161b28] text-slate-400 hover:text-slate-200"
                }`}
              >
                {filterKey.replace("_", " ")}
              </button>
            ))}
            <button
              onClick={() => {
                playClickSound();
                onClearLogs();
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 ml-1.5 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No recent moderation actions matching filter. Server is peaceful.
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  playClickSound();
                  onSelectLog(item);
                }}
                className="p-2.5 rounded-lg bg-[#161b28] border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  {/* Badge */}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                      item.actionType === "BAN"
                        ? "bg-red-950/80 text-red-400 border border-red-500/40"
                        : item.actionType === "MUTE"
                        ? "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                        : item.actionType === "AUTOMOD_BLOCK"
                        ? "bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {item.actionType.replace("_", " ")}
                  </span>

                  <div>
                    <div className="font-semibold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5 flex-wrap">
                      <span>@{item.targetUser.username}</span>
                      <span className="text-slate-500 font-normal">in</span>
                      <span className="text-[#5865F2] font-mono">#{item.channel}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300 font-normal">{item.reason}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Action by {item.moderator.username}</span>
                      <span>•</span>
                      <span>{item.timestamp}</span>
                      {item.aiAudit && (
                        <span className="text-[10px] text-sky-400 font-medium">
                          • Gemini Crime Summary Attached ({item.aiAudit.crimeSummaryWordCount}w)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200">
                    Audit Case
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
