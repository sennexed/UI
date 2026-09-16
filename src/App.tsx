/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { StatusDashboard } from "./components/StatusDashboard";
import { ChatInterface } from "./components/ChatInterface";
import { LogDetailModal } from "./components/LogDetailModal";
import { AIAutoModLab } from "./components/AIAutoModLab";
import {
  BotStatusTelemetry,
  ModLogItem,
  DiscordChatMessage,
  AIModerationResult,
} from "./types";
import {
  setSoundEnabled,
  playBotResponseSound,
  playAlertSound,
  playClickSound,
} from "./utils/audio";
import { LayoutDashboard, MessageSquare, Layers, ShieldCheck, Sparkles } from "lucide-react";

const INITIAL_LOGS: ModLogItem[] = [
  {
    id: "log-101",
    timestamp: "2 mins ago",
    actionType: "AUTOMOD_BLOCK",
    targetUser: { username: "crypto_drop", discriminator: "8912" },
    moderator: { username: "Aegis AutoMod (Gemini 3.5 Flash)", isBot: true },
    channel: "general",
    reason: "Rule #1: Malicious Phishing, Credential Theft & Fake Nitro",
    details: "Click here for free Discord Nitro 3 months: http://fake-nitro-claim.xyz/gift",
    severity: "CRITICAL",
    aiAudit: {
      isViolation: true,
      violationCategory: "ANTI_PHISHING",
      severity: "CRITICAL",
      riskScore: 98,
      recommendedAction: "PERM_BAN",
      moderationEngine: "Gemini 3.5 Flash",
      ruleBreached: "Rule #1: Malicious Phishing & Fake Nitro Credential Harvester",
      flaggedKeywords: ["fake-nitro", "token grabber"],
      evidenceSnippet: "http://fake-nitro-claim.xyz/gift",
      crimeSummary: "Incident Report: Member @crypto_drop distributed a deceptive URL advertising fraudulent Discord Nitro incentives. The linked domain impersonates official Discord billing endpoints to harvest authorization tokens and exfiltrate browser credentials. This threat pattern risks automated account compromise across the server. In accordance with Rule #1, AutoMod deleted the payload and applied a permanent ban.",
      crimeSummaryWordCount: 56,
      summarizerEngine: "Google Gemini (Max 150 words)",
    },
  },
  {
    id: "log-102",
    timestamp: "14 mins ago",
    actionType: "MUTE",
    targetUser: { username: "toxic_raider", discriminator: "3310" },
    moderator: { username: "Aegis AutoMod (Gemini 3.5 Flash)", isBot: true },
    channel: "lounge",
    reason: "Rule #2: Zero Tolerance for Severe Harassment, Toxicity & Hate Speech",
    details: "kys you absolute idiot go uninstall life right now nobody wants you here",
    severity: "HIGH",
    aiAudit: {
      isViolation: true,
      violationCategory: "TOXICITY_HARASSMENT",
      severity: "HIGH",
      riskScore: 88,
      recommendedAction: "TIMEOUT_10M",
      moderationEngine: "Gemini 3.5 Flash",
      ruleBreached: "Rule #2: Severe Toxicity, Self-Harm Encouragement & Harassment",
      flaggedKeywords: ["kys", "harassment pattern"],
      evidenceSnippet: "kys you absolute idiot go uninstall life right now",
      crimeSummary: "Incident Report: Member @toxic_raider directed explicit personal attacks and self-harm incitement toward community members in #lounge. Gemini 3.5 Flash classified this language as severe harassment violating Discord Community Safety standards. The conduct causes immediate hostility and community intimidation. AutoMod purged the offending message and enacted an automated timeout under Rule #2.",
      crimeSummaryWordCount: 53,
      summarizerEngine: "Google Gemini (Max 150 words)",
    },
  },
  {
    id: "log-103",
    timestamp: "32 mins ago",
    actionType: "AUTOMOD_BLOCK",
    targetUser: { username: "promoter_bot", discriminator: "1104" },
    moderator: { username: "Aegis AutoMod (Gemini 3.5 Flash)", isBot: true },
    channel: "media-share",
    reason: "Rule #3: Unauthorized Discord Server Advertising & Link Egress",
    details: "Join my new server guys: discord.gg/free-stuff unlimited giveaways",
    severity: "MEDIUM",
    aiAudit: {
      isViolation: true,
      violationCategory: "INVITE_LINK",
      severity: "MEDIUM",
      riskScore: 65,
      recommendedAction: "DELETE_AND_WARN",
      moderationEngine: "Gemini 3.5 Flash",
      ruleBreached: "Rule #3: Unauthorized Discord Invite Promotion",
      flaggedKeywords: ["discord.gg invite link"],
      evidenceSnippet: "discord.gg/free-stuff unlimited giveaways",
      crimeSummary: "Incident Report: Member @promoter_bot posted an unsolicited third-party Discord invite in #media-share without server authorization. Unauthorized link promotion creates channel clutter and routes members to unverified external guilds. Under Rule #3, AutoMod intercepted and removed the invite link, dispatching an automated warning.",
      crimeSummaryWordCount: 44,
      summarizerEngine: "Google Gemini (Max 150 words)",
    },
  },
];

const INITIAL_MESSAGES: DiscordChatMessage[] = [
  {
    id: "msg-welcome-1",
    sender: "aegis",
    authorName: "Aegis",
    isBot: true,
    timestamp: "Today at 12:00 PM",
    content: "Hello! I'm **Aegis**, your Discord server's AutoMod and security sentinel.",
    embed: {
      color: "#5865F2",
      title: "🛡️ Dual-Model AI AutoMod Pipeline Operational",
      description: "All server defense filters are active and scanning incoming messages in real-time.",
      fields: [
        { name: "Server", value: "Cyberpunk Gaming Hub", inline: true },
        { name: "Moderation Brain", value: "Gemini 3.5 Flash", inline: true },
        { name: "Crime Summarizer", value: "Google Gemini (≤150w Cap)", inline: true },
        { name: "Anti-Raid Shield", value: "Standby (Auto-Quarantine)", inline: true },
      ],
      footer: { text: "Aegis v3.1.2 • Test with quick prompts below or type any message" },
    },
  },
];

export default function App() {
  const [telemetry, setTelemetry] = useState<BotStatusTelemetry | null>(null);
  const [modLogs, setModLogs] = useState<ModLogItem[]>(INITIAL_LOGS);
  const [messages, setMessages] = useState<DiscordChatMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ModLogItem | null>(null);
  const [selectedGuild, setSelectedGuild] = useState("Cyberpunk Gaming Hub");
  const [activeTab, setActiveTab] = useState<"all" | "dashboard" | "chat" | "lab">("all");

  // Fetch telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/status");
      if (res.ok) {
        const data: BotStatusTelemetry = await res.json();
        setTelemetry(data);
      }
    } catch {
      // Keep local state if server is briefly restarting
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Toggle AI Mod Mode
  const handleToggleAiMod = async () => {
    try {
      const res = await fetch("/api/bot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "TOGGLE_AI_MOD" }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setTelemetry(data.state);
        const isAi = data.state.aiModEnabled;
        const msg: DiscordChatMessage = {
          id: `cmd-${Date.now()}`,
          sender: "aegis",
          authorName: "Aegis",
          isBot: true,
          timestamp: "Just now",
          content: "",
          embed: {
            color: isAi ? "#06b6d4" : "#f59e0b",
            title: isAi ? "🤖 AI AutoMod ACTIVATED" : "🛡️ Traditional AutoMod ENGAGED",
            description: isAi
              ? "Messages will now be inspected with **Gemini 3.5 Flash** (real-time). If AI service fails or times out, **Traditional AutoMod** automatically failovers."
              : "AI mode disabled. **Traditional AutoMod** (Regex, Patterns & Blacklists) is actively protecting the server.",
            fields: [
              { name: "Active Mode", value: isAi ? "Gemini 3.5 Flash AI" : "Traditional Pattern Engine", inline: true },
              { name: "Failover Fallback", value: "Standby / Enabled", inline: true },
              { name: "Server", value: selectedGuild, inline: true },
            ],
            footer: { text: "Toggled via Dashboard Control Panel" },
          },
        };
        setMessages((prev) => [...prev, msg]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Raid Mode
  const handleToggleRaidMode = async () => {
    try {
      const res = await fetch("/api/bot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "TOGGLE_RAID_MODE" }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setTelemetry(data.state);
        const isRaid = data.state.raidMode;
        const msg: DiscordChatMessage = {
          id: `cmd-${Date.now()}`,
          sender: "aegis",
          authorName: "Aegis",
          isBot: true,
          timestamp: "Just now",
          content: "",
          embed: {
            color: isRaid ? "#ef4444" : "#10b981",
            title: isRaid ? "🚨 Anti-Raid Lockdown ENGAGED" : "✅ Anti-Raid Mode RESTORED",
            description: isRaid
              ? "All incoming joins are now gated behind high-security verification. Accounts under 7 days are quarantined automatically."
              : "Server join gateway returned to standard verification.",
            footer: { text: `Toggled by Administrator for ${selectedGuild}` },
          },
        };
        setMessages((prev) => [...prev, msg]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle AutoMod Rule
  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await fetch("/api/bot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "TOGGLE_RULE", payload: { ruleId } }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setTelemetry(data.state);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate Raid Attack
  const handleSimulateRaid = async () => {
    try {
      const res = await fetch("/api/bot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "SIMULATE_RAID" }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setTelemetry(data.state);

        const newLog: ModLogItem = {
          id: `log-${Date.now()}`,
          timestamp: "Just now",
          actionType: "RAID_MITIGATION",
          targetUser: { username: "simulated_raid_swarm", discriminator: "0042" },
          moderator: { username: "Aegis Anti-Raid", isBot: true },
          channel: "welcome",
          reason: "Simulated Raid Incursion: 14 bot accounts auto-quarantined within 3 seconds",
          details: "Mass-join threshold exceeded. Anti-raid shield engaged.",
          severity: "CRITICAL",
          aiAudit: {
            isViolation: true,
            violationCategory: "ANTI_RAID",
            severity: "CRITICAL",
            riskScore: 99,
            recommendedAction: "TEMP_BAN",
            moderationEngine: "Gemini 3.5 Flash",
            ruleBreached: "Rule #4: Sudden Mass-Join Raid Spike Mitigation",
            flaggedKeywords: ["automated mass-join", "swarm selfbot"],
            evidenceSnippet: "14 accounts joined within 2.8s",
            crimeSummary: "Incident Report: Coordinated automated swarm join detected across gateway shards. 14 newly generated Discord client tokens attempted simultaneous infiltration through #welcome. Gemini 3.5 Flash moderation logic triggered automated perimeter lockdown and temporary quarantine to shield guild members from mass DM spam.",
            crimeSummaryWordCount: 46,
            summarizerEngine: "Google Gemini (Max 150 words)",
          },
        };
        setModLogs((prev) => [newLog, ...prev.slice(0, 19)]);

        const alertMsg: DiscordChatMessage = {
          id: `raid-${Date.now()}`,
          sender: "aegis",
          authorName: "Aegis",
          isBot: true,
          timestamp: "Just now",
          content: "",
          embed: {
            color: "#ef4444",
            title: "⚠️ Simulated Member Raid Intercepted",
            description: "14 suspect accounts joined simultaneously and have been automatically quarantined by Aegis Anti-Raid Gatekeeper.",
            fields: [
              { name: "Target Channel", value: "#welcome", inline: true },
              { name: "Action", value: "Auto-Quarantined", inline: true },
              { name: "Status", value: "Perimeter Intact (Zero spam posted)", inline: false },
            ],
            footer: { text: "Aegis Defense System • Test passed successfully" },
          },
        };
        setMessages((prev) => [...prev, alertMsg]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Purge recent messages
  const handlePurgeRecent = async () => {
    try {
      const res = await fetch("/api/bot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "PURGE_MESSAGES", payload: { amount: 25 } }),
      });
      const data = await res.json();
      if (data.success) {
        const purgeLog: ModLogItem = {
          id: `log-${Date.now()}`,
          timestamp: "Just now",
          actionType: "PURGE",
          targetUser: { username: "channel_cleanup", discriminator: "0000" },
          moderator: { username: "ServerMod", isBot: false },
          channel: "aegis-commands",
          reason: "Manual moderation purge: 25 messages deleted",
          severity: "LOW",
        };
        setModLogs((prev) => [purgeLog, ...prev.slice(0, 19)]);

        const chatMsg: DiscordChatMessage = {
          id: `purge-${Date.now()}`,
          sender: "system",
          authorName: "System",
          timestamp: "Just now",
          content: "🧹 **Purged 25 recent messages** in #aegis-commands.",
        };
        setMessages((prev) => [...prev, chatMsg]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send message to Aegis Discord Bot
  const handleSendMessage = async (text: string) => {
    const userMsg: DiscordChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      authorName: "ServerAdmin",
      timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          author: "ServerAdmin",
          channel: "aegis-commands",
          history: messages.slice(-6).map((m) => ({
            sender: m.sender,
            content: m.content || m.embed?.title || "",
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: DiscordChatMessage = {
          id: `bot-${Date.now()}`,
          sender: "aegis",
          authorName: "Aegis",
          isBot: true,
          timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: data.content,
          embed: data.embed,
          isFlagged: data.isFlagged,
          moderationResult: data.moderationResult,
        };
        setMessages((prev) => [...prev, botMsg]);

        if (data.isFlagged && data.moderationResult) {
          playAlertSound();
          // Prepend to Live Mod Log Stream with full AI report
          const newModLog: ModLogItem = {
            id: `case-${Date.now().toString().slice(-4)}`,
            timestamp: "Just now",
            actionType: "AUTOMOD_BLOCK",
            targetUser: { username: "ServerAdmin", discriminator: "1337" },
            moderator: { username: "Aegis AutoMod (Gemini 3.5 Flash)", isBot: true },
            channel: "aegis-commands",
            reason: data.moderationResult.ruleBreached,
            details: data.moderationResult.evidenceSnippet || text,
            severity:
              data.moderationResult.severity === "NONE"
                ? "LOW"
                : data.moderationResult.severity,
            aiAudit: data.moderationResult,
          };
          setModLogs((prev) => [newModLog, ...prev.slice(0, 20)]);
        } else {
          playBotResponseSound();
        }

        if (data.botState) {
          setTelemetry(data.botState);
        }
      }
    } catch (err) {
      console.error("Failed to communicate with bot:", err);
      const errMsg: DiscordChatMessage = {
        id: `err-${Date.now()}`,
        sender: "aegis",
        authorName: "Aegis",
        isBot: true,
        timestamp: "Just now",
        content: "⚠️ Bot gateway connection hiccup. Rerouting to standby shard...",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke Action
  const handleRevokeAction = (logId: string) => {
    setModLogs((prev) => prev.filter((l) => l.id !== logId));
    const msg: DiscordChatMessage = {
      id: `rev-${Date.now()}`,
      sender: "system",
      authorName: "Moderation Audit",
      timestamp: "Just now",
      content: `Pardoned case #${logId.replace("log-", "").replace("case-", "")}. Member sanction revoked.`,
    };
    setMessages((prev) => [...prev, msg]);
  };

  // Ban User Escalation
  const handleBanUser = (username: string) => {
    const banLog: ModLogItem = {
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      actionType: "BAN",
      targetUser: { username, discriminator: "0000" },
      moderator: { username: "ServerAdmin", isBot: false },
      channel: "manual-escalation",
      reason: `Escalated to permanent server ban for @${username}`,
      severity: "CRITICAL",
    };
    setModLogs((prev) => [banLog, ...prev]);

    const msg: DiscordChatMessage = {
      id: `ban-${Date.now()}`,
      sender: "aegis",
      authorName: "Aegis",
      isBot: true,
      timestamp: "Just now",
      content: "",
      embed: {
        color: "#ef4444",
        title: `🔨 Member Banned: @${username}`,
        description: `Successfully permanently banned **@${username}** and removed their recent messages.`,
        footer: { text: "Logged to #mod-logs" },
      },
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleUpdateLogAudit = (logId: string, audit: AIModerationResult) => {
    setModLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, aiAudit: audit } : l))
    );
  };

  const handleIncidentLoggedFromLab = (result: AIModerationResult, snippet: string) => {
    if (result.isViolation) {
      const newLog: ModLogItem = {
        id: `case-${Date.now().toString().slice(-4)}`,
        timestamp: "Just now",
        actionType: "AUTOMOD_BLOCK",
        targetUser: { username: "tested_subject", discriminator: "4040" },
        moderator: { username: "Aegis AutoMod (Gemini 3.5 Flash)", isBot: true },
        channel: "aegis-commands",
        reason: result.ruleBreached,
        details: snippet,
        severity: result.severity === "NONE" ? "LOW" : result.severity,
        aiAudit: result,
      };
      setModLogs((prev) => [newLog, ...prev.slice(0, 20)]);
    }
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] text-slate-100 flex flex-col font-sans selection:bg-[#5865F2]/30 selection:text-white">
      {/* Discord Bot Header */}
      <Header
        telemetry={telemetry}
        onToggleRaidMode={handleToggleRaidMode}
        onToggleAiMod={handleToggleAiMod}
        onSimulateRaid={handleSimulateRaid}
        onPurgeRecent={handlePurgeRecent}
        soundOn={soundOn}
        onToggleSound={handleToggleSound}
        selectedGuild={selectedGuild}
        onSelectGuild={(g) => setSelectedGuild(g)}
      />

      {/* Navigation View Switcher */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-[#121520] rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab("all");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "all"
                ? "bg-[#5865F2] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview & Console</span>
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveTab("lab");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "lab"
                ? "bg-[#5865F2] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI AutoMod Lab</span>
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveTab("dashboard");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#5865F2] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveTab("chat");
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "chat"
                ? "bg-[#5865F2] text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>#aegis-commands</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            AutoMod Guarding {selectedGuild}
          </span>
          <span>•</span>
          <span className="text-slate-400">Gemini 3.5 Flash + Gemini Pipeline</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-5">
        {/* Dedicated AI AutoMod Lab View */}
        {activeTab === "lab" && (
          <div className="animate-fadeIn">
            <AIAutoModLab
              onIncidentLogged={handleIncidentLoggedFromLab}
              selectedGuild={selectedGuild}
            />
          </div>
        )}

        {/* Overview (All) or Split View */}
        {activeTab === "all" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Top Interactive AI AutoMod Lab */}
            <AIAutoModLab
              onIncidentLogged={handleIncidentLoggedFromLab}
              selectedGuild={selectedGuild}
            />

            {/* Split: Status Dashboard + Live Chat Console */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <StatusDashboard
                  telemetry={telemetry}
                  modLogs={modLogs}
                  onToggleRule={handleToggleRule}
                  onToggleAiMod={handleToggleAiMod}
                  onClearLogs={() => setModLogs([])}
                  onSelectLog={(log) => setSelectedLog(log)}
                  selectedGuild={selectedGuild}
                />
              </div>

              <div className="lg:col-span-5">
                <ChatInterface
                  messages={messages}
                  isLoading={isLoading}
                  onSendMessage={handleSendMessage}
                  onClearChat={() => setMessages([])}
                  selectedGuild={selectedGuild}
                />
              </div>
            </div>
          </div>
        )}

        {/* Dashboard-only Tab */}
        {activeTab === "dashboard" && (
          <div className="animate-fadeIn">
            <StatusDashboard
              telemetry={telemetry}
              modLogs={modLogs}
              onToggleRule={handleToggleRule}
              onToggleAiMod={handleToggleAiMod}
              onClearLogs={() => setModLogs([])}
              onSelectLog={(log) => setSelectedLog(log)}
              selectedGuild={selectedGuild}
            />
          </div>
        )}

        {/* Chat-only Tab */}
        {activeTab === "chat" && (
          <div className="animate-fadeIn max-w-4xl mx-auto">
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onClearChat={() => setMessages([])}
              selectedGuild={selectedGuild}
            />
          </div>
        )}
      </main>

      {/* Audit Log Details Modal */}
      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onRevokeAction={handleRevokeAction}
        onBanUser={handleBanUser}
        onUpdateLogAudit={handleUpdateLogAudit}
      />
    </div>
  );
}
