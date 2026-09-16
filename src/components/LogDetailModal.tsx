import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  Check,
  Ban,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Bot,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { ModLogItem, AIModerationResult } from "../types";
import { playClickSound, playAlertSound, playBotResponseSound } from "../utils/audio";

interface LogDetailModalProps {
  log: ModLogItem | null;
  onClose: () => void;
  onRevokeAction: (logId: string) => void;
  onBanUser: (username: string) => void;
  onUpdateLogAudit?: (logId: string, audit: AIModerationResult) => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  log,
  onClose,
  onRevokeAction,
  onBanUser,
  onUpdateLogAudit,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [localAudit, setLocalAudit] = useState<AIModerationResult | null>(log?.aiAudit || null);

  if (!log) return null;

  const currentAudit = localAudit || log.aiAudit;

  const handleGenerateAudit = async () => {
    setIsAuditing(true);
    playClickSound();

    try {
      const res = await fetch("/api/bot/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: log.details || log.reason,
          author: log.targetUser.username,
          channel: log.channel,
        }),
      });

      if (res.ok) {
        const audit: AIModerationResult = await res.json();
        setLocalAudit(audit);
        playBotResponseSound();
        if (onUpdateLogAudit) {
          onUpdateLogAudit(log.id, audit);
        }
      }
    } catch (e) {
      console.error("Failed to generate AI crime summary:", e);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-full max-w-2xl bg-[#141824] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#5865F2]/20 text-[#5865F2]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Infraction Audit Case #{log.id.replace("log-", "")}</span>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                    log.severity === "CRITICAL"
                      ? "bg-red-950 text-red-400 border border-red-500/40"
                      : log.severity === "HIGH"
                      ? "bg-orange-950 text-orange-400 border border-orange-500/40"
                      : "bg-amber-950 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  {log.severity}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Logged in <strong className="text-[#5865F2]">#{log.channel}</strong> • {log.timestamp}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1 rounded-lg bg-[#161b28] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Case Body */}
        <div className="my-4 space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-[#181d2c] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Member</span>
              <div className="font-bold text-white truncate mt-0.5">@{log.targetUser.username}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#181d2c] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sanction Taken</span>
              <div className="font-bold text-amber-400 truncate mt-0.5">{log.actionType.replace("_", " ")}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#181d2c] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enforcing Agent</span>
              <div className="font-bold text-slate-200 truncate mt-0.5">{log.moderator.username}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#181d2c] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Channel</span>
              <div className="font-mono font-bold text-[#5865F2] truncate mt-0.5">#{log.channel}</div>
            </div>
          </div>

          {/* Offense reason */}
          <div className="p-3 rounded-xl bg-[#181d2c] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Infraction Description</span>
            <p className="text-slate-200 font-medium leading-relaxed">{log.reason}</p>
          </div>

          {/* Intercepted Snippet */}
          {log.details && (
            <div className="p-3 rounded-xl bg-[#0d1017] border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Intercepted Content Snippet
              </span>
              <code className="text-slate-300 font-mono text-[11px] break-all leading-relaxed block bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                {log.details}
              </code>
            </div>
          )}

          {/* DUAL AI REPORT SECTION: Gemini 3.5 Flash + Google Gemini */}
          <div className="rounded-xl border border-slate-700/80 bg-[#101420] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5865F2]" />
                <h4 className="font-bold text-white text-xs tracking-wide">
                  AI Moderation & Crime Forensics Report
                </h4>
              </div>

              {!currentAudit && (
                <button
                  onClick={handleGenerateAudit}
                  disabled={isAuditing}
                  className="px-2.5 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  <span>{isAuditing ? "Analyzing..." : "Generate AI Forensic Summary"}</span>
                </button>
              )}
            </div>

            {currentAudit ? (
              <div className="space-y-3">
                {/* 1. Gemini 3.5 Flash Verdict */}
                <div className="p-3 rounded-xl bg-[#14232c] border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Moderation Logic • Gemini 3.5 Flash</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40">
                      Risk Score: {currentAudit.riskScore}/100 [{currentAudit.severity}]
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs flex flex-wrap gap-2">
                    <span>Breach: <strong className="text-white">{currentAudit.ruleBreached}</strong></span>
                    <span>•</span>
                    <span>Sanction: <strong className="text-amber-300 font-mono">{currentAudit.recommendedAction}</strong></span>
                  </div>
                </div>

                {/* 2. Google Gemini Crime Summary (Word Cap: 150) */}
                <div className="p-3 rounded-xl bg-[#131d2a] border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-300 font-bold text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>Crime Summary • Google Gemini</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-200 border border-sky-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{currentAudit.crimeSummaryWordCount} / 150 words max</span>
                    </span>
                  </div>
                  <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap bg-[#0c131c] p-2.5 rounded-lg border border-slate-800">
                    {currentAudit.crimeSummary}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-[#141824] rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                Click <strong>"Generate AI Forensic Summary"</strong> to run the two-step evaluation: Claude 3.5 Sonnet for moderation risk and Google Gemini for a 150-word crime summary.
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playAlertSound();
                onBanUser(log.targetUser.username);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              Escalate to Ban
            </button>
            <button
              onClick={() => {
                playClickSound();
                onRevokeAction(log.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181d2c] hover:bg-[#202738] border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              Pardon / Revoke
            </button>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
          >
            Close Audit Case
          </button>
        </div>
      </div>
    </div>
  );
};
