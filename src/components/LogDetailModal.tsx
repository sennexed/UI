import React from "react";
import { X, ShieldAlert, Check, Ban, RotateCcw, AlertTriangle, MessageSquare } from "lucide-react";
import { ModLogItem } from "../types";
import { playClickSound, playAlertSound } from "../utils/audio";

interface LogDetailModalProps {
  log: ModLogItem | null;
  onClose: () => void;
  onRevokeAction: (logId: string) => void;
  onBanUser: (username: string) => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  log,
  onClose,
  onRevokeAction,
  onBanUser,
}) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#141824] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#5865F2]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Infraction Audit Case #{log.id.replace("log-", "")}
            </h3>
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

        {/* Body */}
        <div className="my-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[#181d2c] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Action Enforced</span>
              <div className="font-bold text-white mt-0.5">{log.actionType.replace("_", " ")}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#181d2c] border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Severity</span>
              <div className="font-bold text-amber-400 mt-0.5">{log.severity}</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#181d2c] border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Member:</span>
              <span className="text-white font-bold">@{log.targetUser.username}#{log.targetUser.discriminator}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Channel:</span>
              <span className="text-[#5865F2] font-mono">#{log.channel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Moderator:</span>
              <span className="text-slate-200">{log.moderator.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp:</span>
              <span className="text-slate-400">{log.timestamp}</span>
            </div>
            <div className="flex justify-between items-start pt-1 border-t border-slate-800">
              <span className="text-slate-400">Infraction Reason:</span>
              <span className="text-slate-200 text-right font-medium max-w-[280px]">{log.reason}</span>
            </div>
          </div>

          {log.details && (
            <div className="p-3 rounded-lg bg-[#0d1017] border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Intercepted Message Snippet
              </span>
              <code className="text-slate-300 font-mono text-[11px] break-all leading-relaxed">
                {log.details}
              </code>
            </div>
          )}
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
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
