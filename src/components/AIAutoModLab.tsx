import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Bot,
  Zap,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { AIModerationResult } from "../types";
import { playClickSound, playAlertSound, playBotResponseSound } from "../utils/audio";

interface AIAutoModLabProps {
  onIncidentLogged?: (result: AIModerationResult, snippet: string) => void;
  selectedGuild: string;
}

const PRESET_TEST_CASES = [
  {
    name: "🎣 Phishing Link (Fake Nitro)",
    type: "CRITICAL",
    author: "scammer_bot#9941",
    channel: "general",
    text: "Discord is giving out FREE 3-Month Nitro to celebrate anniversary! Claim immediately: http://nitro-gift-drop.xyz/claim @everyone",
  },
  {
    name: "🤬 Toxicity & Harassment",
    type: "HIGH",
    author: "rage_quitter#2210",
    channel: "lounge",
    text: "kys you absolute idiot go uninstall life right now, nobody wants your stupid opinion here",
  },
  {
    name: "🔗 Unauthorized Invite Spam",
    type: "MEDIUM",
    author: "crypto_shill#8802",
    channel: "media-share",
    text: "Join my new trading server guys discord.gg/crypto-alpha-exclusive 500 spots left hurry up!",
  },
  {
    name: "✅ Harmless Community Message",
    type: "CLEAN",
    author: "gamer_pro#4021",
    channel: "general",
    text: "Hey everyone! Is anyone down to queue up for some Valorant competitive matches tonight in voice 2?",
  },
];

export const AIAutoModLab: React.FC<AIAutoModLabProps> = ({
  onIncidentLogged,
  selectedGuild,
}) => {
  const [testText, setTestText] = useState(PRESET_TEST_CASES[0].text);
  const [testAuthor, setTestAuthor] = useState(PRESET_TEST_CASES[0].author);
  const [testChannel, setTestChannel] = useState(PRESET_TEST_CASES[0].channel);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AIModerationResult | null>(null);

  const handleRunScan = async (overrideText?: string, overrideAuthor?: string) => {
    const textToScan = overrideText ?? testText;
    const authorToUse = overrideAuthor ?? testAuthor;

    if (!textToScan.trim() || isScanning) return;
    setIsScanning(true);
    playClickSound();

    try {
      const res = await fetch("/api/bot/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToScan,
          author: authorToUse,
          channel: testChannel,
        }),
      });

      if (res.ok) {
        const data: AIModerationResult = await res.json();
        setScanResult(data);

        if (data.isViolation) {
          playAlertSound();
        } else {
          playBotResponseSound();
        }

        if (onIncidentLogged) {
          onIncidentLogged(data, textToScan);
        }
      }
    } catch (err) {
      console.error("AI Moderation scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_TEST_CASES)[0]) => {
    playClickSound();
    setTestText(preset.text);
    setTestAuthor(preset.author);
    setTestChannel(preset.channel);
    handleRunScan(preset.text, preset.author);
  };

  return (
    <div
      id="ai-automod-lab"
      className="p-5 rounded-2xl bg-[#121520] border border-slate-800/90 shadow-xl space-y-5"
    >
      {/* Top Banner: Dual AI Architecture */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#5865F2]/20 text-[#5865F2]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              AI AutoMod Intelligence Lab
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              DUAL-MODEL ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline: <strong>Gemini 3.5 Flash</strong> performs moderation classification & enforcement, and <strong>Google Gemini</strong> summarizes the crime (≤150 words).
          </p>
        </div>

        {/* Engine Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#14232c] border border-cyan-500/40 text-xs flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <div className="text-[9px] text-cyan-300 font-semibold uppercase tracking-wider">Moderation Logic</div>
              <div className="text-xs font-bold text-cyan-100">Gemini 3.5 Flash</div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#14202c] border border-sky-500/40 text-xs flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <div>
              <div className="text-[9px] text-sky-300 font-semibold uppercase tracking-wider">Crime Summarizer</div>
              <div className="text-xs font-bold text-sky-100">Google Gemini (≤150w)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Payloads */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <span>Quick Payload Test Presets:</span>
          <span className="text-slate-500 text-[10px] normal-case">(Click to test dual-model pipeline instantly)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_TEST_CASES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(preset)}
              className="p-2.5 rounded-xl bg-[#161b28] hover:bg-[#1f2538] border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                  {preset.name}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    preset.type === "CRITICAL"
                      ? "bg-red-950 text-red-400 border border-red-500/30"
                      : preset.type === "HIGH"
                      ? "bg-orange-950 text-orange-400 border border-orange-500/30"
                      : preset.type === "MEDIUM"
                      ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                      : "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {preset.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-1 font-mono">
                {preset.text}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Test Message Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-slate-300 font-semibold flex items-center gap-1.5">
            <span>Suspicious Message or Incident Transcript:</span>
          </label>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Member: <strong className="text-white">@{testAuthor}</strong></span>
            <span>•</span>
            <span>Channel: <strong className="text-[#5865F2]">#{testChannel}</strong></span>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={3}
            placeholder="Type or paste any Discord message, scam payload, raid text, or invite link to audit..."
            className="w-full rounded-xl bg-[#0e111a] border border-slate-700/80 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2] font-mono leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-slate-500">
            Targeting server guild: <strong className="text-slate-300">{selectedGuild}</strong>
          </span>

          <button
            onClick={() => handleRunScan()}
            disabled={!testText.trim() || isScanning}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              isScanning
                ? "bg-slate-800 text-slate-500 cursor-wait"
                : "bg-[#5865F2] hover:bg-[#4752c4] text-white"
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Multi-Model Scan...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Run AI AutoMod Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dual Model Scan Results */}
      {scanResult && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <span>Scan Results:</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  scanResult.isViolation
                    ? "bg-red-950 text-red-400 border border-red-500/40"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {scanResult.isViolation ? `VIOLATION: ${scanResult.violationCategory}` : "SAFE & APPROVED"}
              </span>
            </span>
            <span className="text-slate-500 text-[11px]">
              Case logged to #mod-logs
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Panel 1: Gemini 3.5 Flash Moderation Decision (5 cols) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-[#14232c] border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-xs font-bold text-cyan-200">Gemini 3.5 Flash</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Moderator Logic
                </span>
              </div>

              {/* Sanction & Risk Score */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#0e111a] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Recommended Sanction</span>
                  <div className="font-bold text-white mt-1 text-sm">
                    {scanResult.recommendedAction.replace("_", " ")}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0e111a] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Threat Risk Score</span>
                  <div className="font-bold mt-1 text-sm flex items-center gap-1.5">
                    <span
                      className={
                        scanResult.riskScore > 75
                          ? "text-red-400"
                          : scanResult.riskScore > 40
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    >
                      {scanResult.riskScore}/100
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">[{scanResult.severity}]</span>
                  </div>
                </div>
              </div>

              {/* Rule & Flags */}
              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-400">
                  Rule Triggered: <strong className="text-slate-200">{scanResult.ruleBreached}</strong>
                </div>
                {scanResult.flaggedKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-[10px] text-slate-500">Flags:</span>
                    {scanResult.flaggedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950/60 text-red-300 border border-red-500/30"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Google Gemini Crime Summarizer (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-[#121c28] border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-xs font-bold text-sky-200">Google Gemini</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">
                  Crime Summarizer ({scanResult.crimeSummaryWordCount} / 150 words)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0e111a] border border-slate-800 text-xs leading-relaxed text-slate-200">
                <p className="whitespace-pre-wrap">{scanResult.crimeSummary}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Strict Word Cap: {scanResult.crimeSummaryWordCount} words (≤ 150 limit)</span>
                </span>
                <span className="text-slate-500">AutoMod v3.1.2</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
