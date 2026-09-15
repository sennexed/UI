import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Discord Bot Telemetry State
interface BotTelemetry {
  status: "ONLINE" | "DEGRADED" | "MAINTENANCE";
  uptimeSeconds: number;
  pingMs: number;
  serversCount: number;
  membersProtected: number;
  infractionsToday: number;
  eventsPerMinute: number;
  memoryUsageMb: number;
  memoryMaxMb: number;
  raidMode: boolean;
  shards: {
    id: number;
    region: string;
    guildsCount: number;
    pingMs: number;
    status: "READY" | "RESUMING" | "RECONNECTING";
  }[];
  activeRules: {
    id: string;
    name: string;
    description: string;
    category: string;
    enabled: boolean;
    triggerCount: number;
    action: string;
  }[];
}

const botState: BotTelemetry = {
  status: "ONLINE",
  uptimeSeconds: 84320,
  pingMs: 22,
  serversCount: 18420,
  membersProtected: 2410500,
  infractionsToday: 48290,
  eventsPerMinute: 4210,
  memoryUsageMb: 184,
  memoryMaxMb: 512,
  raidMode: false,
  shards: [
    { id: 0, region: "US East (Virginia)", guildsCount: 6140, pingMs: 19, status: "READY" },
    { id: 1, region: "EU Central (Frankfurt)", guildsCount: 6210, pingMs: 23, status: "READY" },
    { id: 2, region: "Asia Pacific (Tokyo)", guildsCount: 6070, pingMs: 26, status: "READY" },
  ],
  activeRules: [
    {
      id: "rule-phishing",
      name: "Anti-Phishing Link Shield",
      description: "Blocks known scam, fake Nitro, and malicious token grabber domains.",
      category: "ANTI_PHISHING",
      enabled: true,
      triggerCount: 1240,
      action: "DELETE_AND_WARN",
    },
    {
      id: "rule-spam",
      name: "Burst Message & Mention Filter",
      description: "Detects rapid-fire messages (>5 msgs/3s) and mass @mentions (>4 mentions).",
      category: "ANTI_SPAM",
      enabled: true,
      triggerCount: 894,
      action: "TIMEOUT_10M",
    },
    {
      id: "rule-invites",
      name: "Discord Invite Blocker",
      description: "Blocks unauthorized discord.gg server invites in public channels.",
      category: "ANTI_INVITES",
      enabled: true,
      triggerCount: 432,
      action: "DELETE_AND_WARN",
    },
    {
      id: "rule-raid",
      name: "Anti-Raid Gatekeeper",
      description: "Auto-quarantines sudden member join spikes (10+ joins within 15 seconds).",
      category: "ANTI_RAID",
      enabled: true,
      triggerCount: 18,
      action: "TEMP_BAN",
    },
    {
      id: "rule-badwords",
      name: "Toxicity & Slurs Filter",
      description: "Removes hate speech, severe profanity, and harassment patterns.",
      category: "WORD_BLACKLIST",
      enabled: true,
      triggerCount: 615,
      action: "DELETE_AND_WARN",
    },
  ],
};

// Periodic live jitter
setInterval(() => {
  botState.uptimeSeconds += 2;
  botState.pingMs = Math.floor(18 + Math.random() * 8);
  botState.eventsPerMinute = Math.floor(4100 + Math.random() * 250);
  botState.shards.forEach((s) => {
    s.pingMs = Math.floor(18 + Math.random() * 10);
  });
}, 2000);

// Health & Telemetry Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    bot: "Aegis Discord Moderation Bot",
    version: "v3.1.2",
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.get("/api/bot/status", (req, res) => {
  res.json({
    ...botState,
    timestamp: new Date().toISOString(),
  });
});

// Bot Management Commands
app.post("/api/bot/command", (req, res) => {
  const { command, payload } = req.body;

  switch (command) {
    case "TOGGLE_RAID_MODE": {
      botState.raidMode = !botState.raidMode;
      return res.json({
        success: true,
        message: botState.raidMode
          ? "🚨 **Raid Mode Activated**: Verification level set to MAXIMUM. New accounts under 7 days cannot join."
          : "✅ **Raid Mode Deactivated**: Standard server join gateway restored.",
        state: botState,
      });
    }

    case "TOGGLE_RULE": {
      const ruleId = payload?.ruleId;
      const rule = botState.activeRules.find((r) => r.id === ruleId);
      if (rule) {
        rule.enabled = !rule.enabled;
        return res.json({
          success: true,
          message: `AutoMod rule **${rule.name}** is now ${rule.enabled ? "ENABLED" : "DISABLED"}.`,
          state: botState,
        });
      }
      return res.status(404).json({ success: false, error: "Rule not found." });
    }

    case "SIMULATE_RAID": {
      botState.infractionsToday += 14;
      botState.raidMode = true;
      return res.json({
        success: true,
        message: "⚠️ **Simulated Raid Intercepted**: 14 self-bot accounts joined within 3 seconds. Auto-quarantine triggered.",
        state: botState,
      });
    }

    case "PURGE_MESSAGES": {
      const amount = payload?.amount || 25;
      return res.json({
        success: true,
        message: `🧹 Purged **${amount} messages** in targeted channel.`,
        state: botState,
      });
    }

    default:
      return res.status(400).json({ success: false, error: "Unknown bot command." });
  }
});

// Autonomous Discord Bot heuristic response generator
function generateDiscordBotResponse(userPrompt: string): {
  content: string;
  embed?: {
    color: string;
    title?: string;
    description?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string };
  };
} {
  const query = userPrompt.trim().toLowerCase();

  // /stats or status
  if (query.startsWith("/stats") || query.includes("status") || query.includes("ping") || query.includes("uptime")) {
    const hours = Math.floor(botState.uptimeSeconds / 3600);
    const mins = Math.floor((botState.uptimeSeconds % 3600) / 60);
    return {
      content: "",
      embed: {
        color: "#5865F2",
        title: "🛡️ Aegis Discord Bot — System Status",
        description: "Real-time health telemetry across all connected Discord guild shards.",
        fields: [
          { name: "⚡ Shard Ping", value: `\`${botState.pingMs}ms\``, inline: true },
          { name: "🌐 Connected Servers", value: `\`${botState.serversCount.toLocaleString()} guilds\``, inline: true },
          { name: "👥 Members Monitored", value: `\`${(botState.membersProtected / 1000000).toFixed(2)}M users\``, inline: true },
          { name: "⏱️ Uptime", value: `\`${hours}h ${mins}m\``, inline: true },
          { name: "🛑 Infractions Today", value: `\`${botState.infractionsToday.toLocaleString()}\``, inline: true },
          { name: "🚨 Anti-Raid Status", value: botState.raidMode ? "`🔴 ACTIVE`" : "`🟢 STANDBY`", inline: true },
        ],
        footer: { text: "Aegis AutoMod v3.1.2 • Verified Discord Application" },
      },
    };
  }

  // /automod
  if (query.startsWith("/automod") || query.includes("rules") || query.includes("filter")) {
    return {
      content: "",
      embed: {
        color: "#10b981",
        title: "⚙️ AutoMod Configuration & Active Filters",
        description: "Active server defense rules. Violators are automatically penalized based on severity.",
        fields: botState.activeRules.map((rule) => ({
          name: `${rule.enabled ? "✅" : "❌"} ${rule.name}`,
          value: `Action: \`${rule.action}\` • Triggered: \`${rule.triggerCount} times\``,
          inline: false,
        })),
        footer: { text: "Use /automod toggle [rule-name] to modify filter states" },
      },
    };
  }

  // /ban command
  if (query.startsWith("/ban")) {
    const match = userPrompt.match(/\/ban\s+(@?\w+)(?:\s+(.*))?/i);
    const target = match ? match[1] : "@malicious_user";
    const reason = match && match[2] ? match[2] : "Violating Server Rule #1 (Spam / Phishing)";
    botState.infractionsToday += 1;
    return {
      content: "",
      embed: {
        color: "#ef4444",
        title: "🔨 Member Banned",
        description: `Successfully banned **${target}** from the server.`,
        fields: [
          { name: "Target", value: target, inline: true },
          { name: "Moderator", value: "ServerAdmin", inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Messages Deleted", value: "Previous 24 hours purged", inline: true },
        ],
        footer: { text: "Case #48291 • Logged to #mod-logs" },
      },
    };
  }

  // /mute or /timeout
  if (query.startsWith("/mute") || query.startsWith("/timeout")) {
    const match = userPrompt.match(/\/(?:mute|timeout)\s+(@?\w+)(?:\s+(\d+\w*))?(?:\s+(.*))?/i);
    const target = match ? match[1] : "@troublemaker";
    const duration = match && match[2] ? match[2] : "10 minutes";
    const reason = match && match[3] ? match[3] : "Spamming in non-spam channel";
    botState.infractionsToday += 1;
    return {
      content: "",
      embed: {
        color: "#f59e0b",
        title: "🔇 Member Timed Out",
        description: `Timed out **${target}** for **${duration}**.`,
        fields: [
          { name: "Target", value: target, inline: true },
          { name: "Duration", value: duration, inline: true },
          { name: "Reason", value: reason, inline: false },
        ],
        footer: { text: "Case #48292 • Member cannot send messages or join voice" },
      },
    };
  }

  // /purge command
  if (query.startsWith("/purge") || query.startsWith("/clear")) {
    const amount = userPrompt.replace(/[^\d]/g, "") || "25";
    return {
      content: `🧹 **Purged ${amount} messages** in this channel.\n*(This notification will auto-delete in 5 seconds)*`,
    };
  }

  // /raidmode
  if (query.startsWith("/raidmode") || query.includes("raid")) {
    botState.raidMode = !botState.raidMode;
    return {
      content: "",
      embed: {
        color: botState.raidMode ? "#ef4444" : "#10b981",
        title: botState.raidMode ? "🚨 Anti-Raid Mode ENGAGED" : "✅ Anti-Raid Mode RESTORED",
        description: botState.raidMode
          ? "Verification gatekeeper activated. All incoming joins require manual approval or 7-day account verification. Mass-joins will be automatically banned."
          : "Server join gateway set back to standard verification.",
        footer: { text: "Aegis Security Sentinel" },
      },
    };
  }

  // /userinfo
  if (query.startsWith("/userinfo") || query.includes("whois")) {
    return {
      content: "",
      embed: {
        color: "#5865F2",
        title: "👤 Member Security Audit — @suspect_user#1337",
        fields: [
          { name: "Account Created", value: "3 days ago (Flagged: New Account)", inline: true },
          { name: "Joined Server", value: "2 hours ago", inline: true },
          { name: "Roles", value: "@Member", inline: true },
          { name: "Infractions", value: "1 Warning (Spam trigger)", inline: true },
          { name: "Trust Score", value: "🟡 45/100 (Suspicious)", inline: true },
        ],
        footer: { text: "Aegis AutoMod Reputation Service" },
      },
    };
  }

  // General helpful bot answer
  return {
    content: `I'm **Aegis**, your Discord server moderation & AutoMod bot. Here are quick moderation commands you can test:\n\n• \`/stats\` — View server health, shard ping, and member counts\n• \`/automod\` — Inspect anti-phishing, anti-spam, and word filters\n• \`/ban @user [reason]\` — Ban an offending member and purge their recent messages\n• \`/mute @user [time] [reason]\` — Apply a Discord timeout\n• \`/purge 25\` — Mass delete recent spam messages\n• \`/raidmode\` — Toggle high-security anti-raid lockdown\n• \`/userinfo @user\` — Check member trust score & previous infractions`,
  };
}

// Chat API endpoint
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message payload." });
  }

  const ai = getGenAI();

  if (ai) {
    try {
      const systemInstruction = `You are Aegis, an aesthetic, modern, and highly capable Discord moderation and AutoMod bot.
You power Discord servers with anti-raid protection, spam mitigation, phishing detection, role assignment, and moderation logs.
Current Bot State:
- Servers: ${botState.serversCount} guilds
- Members Protected: ${botState.membersProtected} users
- Ping: ${botState.pingMs}ms
- Raid Mode: ${botState.raidMode ? "ACTIVE" : "OFF"}
- Active Rules: Anti-Phishing, Anti-Spam, Invite Blocker, Anti-Raid

Format your responses cleanly like a modern Discord bot:
- Use markdown: bold, inline code, and bullet points.
- If asked to ban, kick, mute, or purge, format it cleanly as a Discord moderation embed or action log.
- Do NOT use sci-fi spaceship or military drone jargon. Speak like a friendly, professional Discord moderation bot (similar to Dyno, Carl-bot, Wick, or Discord's native AutoMod).`;

      const formattedHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h: { sender: string; content: string }) => `${h.sender === "user" ? "User" : "Aegis"}: ${h.content}`)
            .join("\n")
        : "";

      const promptText = formattedHistory
        ? `Discord Chat History:\n${formattedHistory}\n\nUser: ${message}\nAegis:`
        : message;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: promptText,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "Command processed.";

      return res.json({
        content: replyText,
        botState,
      });
    } catch (err: unknown) {
      console.warn("Gemini API call failed, using heuristic Discord bot response:", err);
      const fallback = generateDiscordBotResponse(message);
      return res.json({
        ...fallback,
        botState,
      });
    }
  }

  const fallback = generateDiscordBotResponse(message);
  return res.json({
    ...fallback,
    botState,
  });
});

// Start Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aegis Discord Bot Dashboard online at http://0.0.0.0:${PORT}`);
  });
}

startServer();
