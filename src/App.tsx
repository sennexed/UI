/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { StatusDashboard } from "./components/StatusDashboard";
import { ChatInterface } from "./components/ChatInterface";
import { LogDetailModal } from "./components/LogDetailModal";
import {
  BotStatusTelemetry,
  ModLogItem,
  DiscordChatMessage,
} from "./types";
import {
  setSoundEnabled,
  playBotResponseSound,
  playAlertSound,
  playClickSound,
} from "./utils/audio";
import { LayoutDashboard, MessageSquare, Layers, ShieldCheck } from "lucide-react";

const INITIAL_LOGS: ModLogItem[] = [
  {
    id: "log-101",
    timestamp: "2 mins ago",
    actionType: "AUTOMOD_BLOCK",
    targetUser: { username: "crypto_drop", discriminator: "8912" },
    moderator: { username: "Aegis AutoMod", isBot: true },
    channel: "general",
    reason: "Malicious Phishing URL detected (Blacklist match: fake-nitro-claim.xyz)",
    details: "Click here for free Discord Nitro 3 months: http://fake-nitro-claim.xyz/gift",
    severity: "CRITICAL",
  },
  {
    id: "log-102",
    timestamp: "14 mins ago",
    actionType: "MUTE",
    targetUser: { username: "toxic_raider", discriminator: "3310" },
    moderator: { username: "ModSarah", isBot: false },
    channel: "lounge",
    reason: "Rule #2: Severe Harassment & Hate Speech (Timed out for 1 hour)",
    details: "Multiple repeated targeted insults after moderator warning",
    severity: "HIGH",
  },
  {
    id: "log-103",
    timestamp: "32 mins ago",
    actionType: "AUTOMOD_BLOCK",
    targetUser: { username: "promoter_bot", discriminator: "1104" },
    moderator: { username: "Aegis AutoMod", isBot: true },
    channel: "media-share",
    reason: "Unauthorized Discord Server Invite (discord.gg/free-stuff)",
    details: "Join my new server guys: discord.gg/free-stuff unlimited giveaways",
    severity: "MEDIUM",
  },
  {
    id: "log-104",
    timestamp: "1 hour ago",
    actionType: "RAID_MITIGATION",
    targetUser: { username: "selfbot_batch_04", discriminator: "0019" },
    moderator: { username: "Aegis Anti-Raid", isBot: true },
    channel: "welcome",
    reason: "Burst Join Spike: 14 accounts joined in 2.8 seconds with identical creation dates",
    details: "Automated Quarantine applied. Captcha verification dispatched.",
    severity: "CRITICAL",
  },
  {
    id: "log-105",
    timestamp: "2 hours ago",
    actionType: "PURGE",
    targetUser: { username: "spambot_army", discriminator: "9900" },
    moderator: { username: "AdminAlex", isBot: false },
    channel: "bot-commands",
    reason: "Bulk message purge (50 spam messages cleared)",
    severity: "LOW",
  },
];

const INITIAL_MESSAGES: DiscordChatMessage[] = [
  {
    id: "msg-welcome-1",
    sender: "aegis",
    authorName: "Aegis",
    isBot: true,
    timestamp: "Today at 12:00 PM",
    content: "Hello! I'm **Aegis**, your Discord server's moderation and AutoMod bot.",
    embed: {
      color: "#5865F2",
      title: "🛡️ Aegis Moderation Engine Online",
      description: "All server defense filters are active and protecting members from phishing, raid floods, and toxic spam.",
      fields: [
        { name: "Server", value: "Cyberpunk Gaming Hub", inline: true },
        { name: "Active Shard", value: "Shard #0 (19ms ping)", inline: true },
        { name: "AutoMod Filters", value: "5/5 Filters Enabled", inline: true },
        { name: "Anti-Raid Shield", value: "Standby (Auto-Quarantine)", inline: true },
      ],
      footer: { text: "Aegis v3.1.2 • Type /automod or /stats to inspect security configurations" },
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
  const [activeTab, setActiveTab] = useState<"all" | "dashboard" | "chat">("all");

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
        // Post Discord embed in chat
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

        // Add to mod log
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
        };
        setModLogs((prev) => [newLog, ...prev.slice(0, 14)]);

        // Post alert in chat
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
        setModLogs((prev) => [purgeLog, ...prev.slice(0, 14)]);

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
        };
        setMessages((prev) => [...prev, botMsg]);
        playBotResponseSound();

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
      content: `Pardoned case #${logId.replace("log-", "")}. Member sanction revoked.`,
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

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] text-slate-100 flex flex-col font-sans selection:bg-[#5865F2]/30 selection:text-white">
      {/* Aesthetic Discord Bot Header */}
      <Header
        telemetry={telemetry}
        onToggleRaidMode={handleToggleRaidMode}
        onSimulateRaid={handleSimulateRaid}
        onPurgeRecent={handlePurgeRecent}
        soundOn={soundOn}
        onToggleSound={handleToggleSound}
        selectedGuild={selectedGuild}
        onSelectGuild={(g) => setSelectedGuild(g)}
      />

      {/* View Switcher Pills */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-3 pb-1 flex items-center justify-between">
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
            <span className="hidden sm:inline">Overview & Console</span>
            <span className="sm:hidden">All</span>
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
          <span className="text-slate-500">Shard #0 Online</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Status Dashboard View */}
          {(activeTab === "all" || activeTab === "dashboard") && (
            <div
              className={`${
                activeTab === "all" ? "lg:col-span-7" : "lg:col-span-12"
              } transition-all`}
            >
              <StatusDashboard
                telemetry={telemetry}
                modLogs={modLogs}
                onToggleRule={handleToggleRule}
                onClearLogs={() => setModLogs([])}
                onSelectLog={(log) => setSelectedLog(log)}
                selectedGuild={selectedGuild}
              />
            </div>
          )}

          {/* Integrated Chat Interface View */}
          {(activeTab === "all" || activeTab === "chat") && (
            <div
              className={`${
                activeTab === "all" ? "lg:col-span-5" : "lg:col-span-12"
              } transition-all`}
            >
              <ChatInterface
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onClearChat={() => setMessages([])}
                selectedGuild={selectedGuild}
              />
            </div>
          )}
        </div>
      </main>

      {/* Audit Log Details Modal */}
      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onRevokeAction={handleRevokeAction}
        onBanUser={handleBanUser}
      />
    </div>
  );
}
