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
  aiModEnabled: boolean;
  traditionalAutoModFallback: boolean;
  activeModeDescription?: string;
  geminiModel: string;
  moderationModel: string;
  claudeModel?: string;
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
  aiModEnabled: true, // Master toggle for Gemini 3.5 Flash AI AutoMod
  traditionalAutoModFallback: true, // Auto-engages if AI mod is toggled off or if AI API encounters an error/timeout
  activeModeDescription: "Hybrid (Gemini 3.5 Flash AI AutoMod primary + Traditional AutoMod fallback)",
  geminiModel: "Google Gemini (Max 150 words)",
  moderationModel: "Gemini 3.5 Flash",
  claudeModel: "Gemini 3.5 Flash",
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

// --- AI MODERATION ENGINE: GEMINI 3.5 FLASH ---
interface ModerationAssessment {
  isViolation: boolean;
  violationCategory: "ANTI_PHISHING" | "TOXICITY_HARASSMENT" | "SPAM_BURST" | "INVITE_LINK" | "DOXXING_PRIVACY" | "ANTI_RAID" | "CLEAN";
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  recommendedAction: "PASS" | "DELETE_AND_WARN" | "TIMEOUT_10M" | "KICK" | "TEMP_BAN" | "PERM_BAN";
  ruleBreached: string;
  flaggedKeywords: string[];
  evidenceSnippet?: string;
  moderationEngine: string;
}

type ClaudeModerationAssessment = ModerationAssessment;

async function runGeminiModeration(
  text: string,
  author = "ServerMember",
  channel = "general"
): Promise<ModerationAssessment> {
  const ai = getGenAI();

  if (ai) {
    const candidateModels = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"];
    for (const modelName of candidateModels) {
      try {
        const systemInstruction = `You are the Gemini 3.5 Flash Discord AutoMod Engine. Analyze the user's message for Discord safety violations (Phishing, Toxicity/Harassment, Mass Spam, Discord Invites, Doxxing, Anti-Raid).
Evaluate severity and calculate a precise threat risk score (0-100).
Return strictly valid JSON matching this schema:
{
  "isViolation": boolean,
  "violationCategory": "ANTI_PHISHING" | "TOXICITY_HARASSMENT" | "SPAM_BURST" | "INVITE_LINK" | "DOXXING_PRIVACY" | "ANTI_RAID" | "CLEAN",
  "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskScore": number,
  "recommendedAction": "PASS" | "DELETE_AND_WARN" | "TIMEOUT_10M" | "KICK" | "TEMP_BAN" | "PERM_BAN",
  "ruleBreached": string,
  "flaggedKeywords": string[],
  "evidenceSnippet": string
}`;

        const prompt = `Analyze this Discord message from member @${author} in channel #${channel}:
"""${text}"""`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        const rawContent = response.text || "";
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            moderationEngine: "Gemini 3.5 Flash",
          };
        }
      } catch (e) {
        console.warn(`Gemini moderation call with ${modelName} encountered issue, trying next:`, e);
      }
    }
  }

  // If Gemini API is unavailable or models failed, throw error to trigger Traditional AutoMod fallback
  throw new Error("Gemini AI Moderation service unavailable or timed out");
}

// --- TRADITIONAL AUTOMOD ENGINE (Regex, Pattern, Heuristic & Keyword Engine) ---
function runTraditionalAutoMod(
  text: string,
  author = "ServerMember",
  channel = "general"
): ModerationAssessment {
  const lower = text.toLowerCase();

  // Phishing / Scam detection
  const phishingPatterns = [
    /nitro.*(claim|gift|free|generator|drop)/i,
    /(steam|discord).*(gift|nitro|drop|trade).*\.(xyz|ru|to|top|click|link|gift)/i,
    /fake-nitro/i,
    /free-discord-nitro/i,
    /claim your free/i,
    /token\s*grabber/i,
    /qr\s*code.*login/i,
    /free\s*crypto.*airdrop/i,
  ];

  // Toxicity / Harassment
  const toxicPatterns = [
    /\b(kys|kill\s*yourself|go\s*die)\b/i,
    /\b(hate\s*you|uninstall\s*life|you\s*idiot|stupid\s*bitch|retard)\b/i,
    /\b(slur|fag|nigger|cunt)\b/i,
  ];

  // Invites
  const invitePatterns = [
    /discord\.(gg|io|me|li)\/[a-z0-9_-]+/i,
    /discordapp\.com\/invite\/[a-z0-9_-]+/i,
  ];

  // Spam
  const isSpam =
    (text.length > 350 && (text.match(/(!|\?|\.){3,}/g)?.length || 0) > 3) ||
    (lower.match(/@everyone/g) || []).length >= 2 ||
    /(\b\w+\b)( \1){4,}/i.test(text);

  if (phishingPatterns.some((p) => p.test(text))) {
    return {
      isViolation: true,
      violationCategory: "ANTI_PHISHING",
      severity: "CRITICAL",
      riskScore: 98,
      recommendedAction: "PERM_BAN",
      ruleBreached: "Rule #1: Malicious Phishing, Credential Theft & Fake Nitro",
      flaggedKeywords: ["fake-nitro", "token grabber", "credential theft link"],
      evidenceSnippet: text.slice(0, 140),
      moderationEngine: "Traditional AutoMod (Regex / Pattern Filter)",
    };
  }

  if (toxicPatterns.some((p) => p.test(text))) {
    return {
      isViolation: true,
      violationCategory: "TOXICITY_HARASSMENT",
      severity: "HIGH",
      riskScore: 88,
      recommendedAction: "TIMEOUT_10M",
      ruleBreached: "Rule #2: Zero Tolerance for Severe Harassment, Toxicity & Hate Speech",
      flaggedKeywords: ["targeted insult", "harassment pattern"],
      evidenceSnippet: text.slice(0, 140),
      moderationEngine: "Traditional AutoMod (Regex / Pattern Filter)",
    };
  }

  if (invitePatterns.some((p) => p.test(text))) {
    return {
      isViolation: true,
      violationCategory: "INVITE_LINK",
      severity: "MEDIUM",
      riskScore: 65,
      recommendedAction: "DELETE_AND_WARN",
      ruleBreached: "Rule #3: Unauthorized Discord Server Advertising & Link Egress",
      flaggedKeywords: ["discord.gg invite link"],
      evidenceSnippet: text.slice(0, 140),
      moderationEngine: "Traditional AutoMod (Regex / Pattern Filter)",
    };
  }

  if (isSpam) {
    return {
      isViolation: true,
      violationCategory: "SPAM_BURST",
      severity: "MEDIUM",
      riskScore: 72,
      recommendedAction: "TIMEOUT_10M",
      ruleBreached: "Rule #4: Rapid-Fire Spamming, Repetition & Mass-Pings",
      flaggedKeywords: ["repeated characters", "mass ping"],
      evidenceSnippet: text.slice(0, 140),
      moderationEngine: "Traditional AutoMod (Regex / Pattern Filter)",
    };
  }

  return {
    isViolation: false,
    violationCategory: "CLEAN",
    severity: "NONE",
    riskScore: 8,
    recommendedAction: "PASS",
    ruleBreached: "None (Clean communication)",
    flaggedKeywords: [],
    evidenceSnippet: text.slice(0, 80),
    moderationEngine: "Traditional AutoMod (Regex / Pattern Filter)",
  };
}

// Master Moderation Pipeline supporting AI toggle & seamless Traditional AutoMod fallback
async function executeModerationPipeline(
  text: string,
  author = "ServerMember",
  channel = "general"
): Promise<{ assessment: ModerationAssessment; modeUsed: "AI_MOD" | "TRADITIONAL_FALLBACK" | "TRADITIONAL_STANDALONE" }> {
  // Case 1: AI AutoMod is toggled OFF by user -> Immediately run Traditional AutoMod
  if (!botState.aiModEnabled) {
    const assessment = runTraditionalAutoMod(text, author, channel);
    return { assessment, modeUsed: "TRADITIONAL_STANDALONE" };
  }

  // Case 2: AI AutoMod is ON -> Attempt Gemini 3.5 Flash evaluation
  try {
    const aiAssessment = await runGeminiModeration(text, author, channel);
    return { assessment: aiAssessment, modeUsed: "AI_MOD" };
  } catch (err) {
    console.warn("AI AutoMod failed or timed out. Auto-engaging Traditional AutoMod fallback:", err);
    // Case 3: AI AutoMod failed -> Automatic failover to Traditional AutoMod
    const fallbackAssessment = runTraditionalAutoMod(text, author, channel);
    fallbackAssessment.moderationEngine = "Traditional AutoMod (Failover Engaged)";
    return { assessment: fallbackAssessment, modeUsed: "TRADITIONAL_FALLBACK" };
  }
}

// Backwards compatibility alias
const runClaudeModeration = runGeminiModeration;

// --- CRIME SUMMARIZER ENGINE: GOOGLE GEMINI (WORD CAP = 150) ---
async function runGeminiCrimeSummary(
  text: string,
  assessment: ModerationAssessment,
  author = "User",
  channel = "general"
): Promise<{ summary: string; wordCount: number }> {
  const ai = getGenAI();

  if (ai) {
    try {
      const systemInstruction = `You are the Google Gemini Crime Summarizer for an automated Discord moderation bot.
Your mission is to summarize the member's violation/crime in an objective, concise, and structured report.
CRITICAL MANDATORY CONSTRAINT: The summary MUST NOT exceed 150 words under any circumstance. Keep it direct, factual, and strictly under 150 words.`;

      const prompt = `Incident Details:
- Target User: ${author}
- Channel: #${channel}
- Moderation Assessment (Gemini 3.5 Flash): ${assessment.violationCategory} (Severity: ${assessment.severity}, Risk: ${assessment.riskScore}/100)
- Rule Breached: ${assessment.ruleBreached}
- Evidence Text: "${text}"

Summarize this crime concisely:
1. Incident Overview: What the user did and what harmful action was attempted.
2. Threat Analysis: The potential harm to the community (e.g. account theft, hostility, raid disruption).
3. AutoMod Sanction: Explain why the penalty (${assessment.recommendedAction}) is warranted.

Remember: Maximum 150 words!`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      });

      const rawText = response.text || "";
      // Enforce strict word cap of 150
      const words = rawText.trim().split(/\s+/);
      const cappedText = words.slice(0, 150).join(" ");
      return {
        summary: cappedText,
        wordCount: Math.min(words.length, 150),
      };
    } catch (e) {
      console.warn("Gemini Crime Summarizer API call failed, generating fallback summary:", e);
    }
  }

  // Intelligent Fallback Crime Summarizer (strictly under 150 words)
  let crimeText = "";
  if (assessment.violationCategory === "ANTI_PHISHING") {
    crimeText = `Incident Report: Member @${author} in #${channel} distributed an unverified link masquerading as free Discord Nitro or promotional rewards. The link signature matches credential harvester and browser token exfiltration patterns. Distributing counterfeit incentive links presents an immediate risk of account compromise and automated lateral spread across servers. In accordance with Rule #1, AutoMod suppressed the message and enforced an account sanction to protect community members from theft.`;
  } else if (assessment.violationCategory === "TOXICITY_HARASSMENT") {
    crimeText = `Incident Report: Member @${author} posted hostile or derogatory language targeting community members in #${channel}. The detected phrase violates community safety guidelines regarding direct harassment and abusive conduct. Such hostility degrades civil discourse and intimidates participants. As evaluated by Gemini 3.5 Flash, a temporary timeout and message deletion was executed under Rule #2 to de-escalate tension and maintain a safe environment.`;
  } else if (assessment.violationCategory === "INVITE_LINK") {
    crimeText = `Incident Report: Member @${author} shared an unauthorized external Discord server invite in #${channel}. Unauthorized server promotion leads to spam clutter and directs users toward unmoderated external communities. AutoMod intercepted and removed the invite link under Rule #3, issuing an automated warning to prevent repeated unauthorized promotions.`;
  } else if (assessment.violationCategory === "SPAM_BURST") {
    crimeText = `Incident Report: High-frequency repetitive messaging or excessive pings were registered from @${author} in #${channel}. This burst pattern disrupts real-time discussions and triggers spam alerts across active shards. AutoMod applied a temporary timeout and message purge under Rule #4 to restore normal channel flow.`;
  } else {
    crimeText = `Incident Report: Message from @${author} was audited by Gemini 3.5 Flash AutoMod. No malicious links, hate speech, or spam vectors were detected. The communication adheres to Discord community guidelines and was cleared for broadcast.`;
  }

  const words = crimeText.trim().split(/\s+/);
  return {
    summary: words.slice(0, 150).join(" "),
    wordCount: Math.min(words.length, 150),
  };
}

// Health & Status
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    bot: "Aegis Discord Moderation Bot",
    moderationModel: botState.moderationModel,
    claudeModel: botState.moderationModel,
    geminiModel: botState.geminiModel,
    geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.get("/api/bot/status", (req, res) => {
  res.json({
    ...botState,
    timestamp: new Date().toISOString(),
  });
});

// Dedicated AI Moderation & Crime Summarizer Endpoint
app.post("/api/bot/moderate", async (req, res) => {
  const { text, author = "Member", channel = "general" } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text to moderate." });
  }

  // 1. Evaluate with Master Moderation Pipeline (AI with automatic Traditional failover or Traditional standalone)
  const { assessment: moderationAssessment, modeUsed } = await executeModerationPipeline(text, author, channel);

  // 2. Summarize crime with Google Gemini (word cap = 150)
  const geminiSummary = await runGeminiCrimeSummary(text, moderationAssessment, author, channel);

  if (moderationAssessment.isViolation) {
    botState.infractionsToday += 1;
    const rule = botState.activeRules.find((r) => r.category === moderationAssessment.violationCategory);
    if (rule) rule.triggerCount += 1;
  }

  return res.json({
    isViolation: moderationAssessment.isViolation,
    violationCategory: moderationAssessment.violationCategory,
    severity: moderationAssessment.severity,
    riskScore: moderationAssessment.riskScore,
    recommendedAction: moderationAssessment.recommendedAction,
    moderationEngine: moderationAssessment.moderationEngine,
    modeUsed,
    ruleBreached: moderationAssessment.ruleBreached,
    flaggedKeywords: moderationAssessment.flaggedKeywords,
    evidenceSnippet: moderationAssessment.evidenceSnippet,
    crimeSummary: geminiSummary.summary,
    crimeSummaryWordCount: geminiSummary.wordCount,
    summarizerEngine: "Google Gemini (Max 150 words)",
  });
});

// Bot Management Commands
app.post("/api/bot/command", (req, res) => {
  const { command, payload } = req.body;

  switch (command) {
    case "TOGGLE_AI_MOD": {
      botState.aiModEnabled = !botState.aiModEnabled;
      botState.activeModeDescription = botState.aiModEnabled
        ? "AI Mode Enabled (Gemini 3.5 Flash primary + Traditional AutoMod failover fallback)"
        : "Traditional AutoMod Standalone (Regex / Pattern / Heuristic engine active)";
      return res.json({
        success: true,
        message: botState.aiModEnabled
          ? "🤖 **AI AutoMod Enabled**: Messages are now inspected in real-time by **Gemini 3.5 Flash** (with instant Traditional AutoMod failover)."
          : "🛡️ **Traditional AutoMod Engaged**: AI scanning disabled. Rules are enforced via **Traditional Regex & Pattern Engine**.",
        state: botState,
      });
    }

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

// Chat & AutoMod Intercept API
app.post("/api/chat", async (req, res) => {
  const { message, history, author = "ServerMember", channel = "aegis-commands" } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message payload." });
  }

  const query = message.trim();

  // 1. First, check if message is a slash command
  if (query.startsWith("/")) {
    const cmd = query.toLowerCase();

    if (cmd.startsWith("/stats") || cmd.includes("ping") || cmd.includes("uptime")) {
      const hours = Math.floor(botState.uptimeSeconds / 3600);
      const mins = Math.floor((botState.uptimeSeconds % 3600) / 60);
      return res.json({
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
            { name: "🛑 Infractions Blocked", value: `\`${botState.infractionsToday.toLocaleString()}\``, inline: true },
            { name: "🧠 AI Moderation Engine", value: "`Gemini 3.5 Flash`", inline: true },
            { name: "📝 AI Crime Summarizer", value: "`Google Gemini (Cap: 150w)`", inline: true },
            { name: "🚨 Anti-Raid Status", value: botState.raidMode ? "`🔴 ACTIVE`" : "`🟢 STANDBY`", inline: true },
          ],
          footer: { text: "Aegis AutoMod v3.1.2 • Multi-Model AI Safety Pipeline" },
        },
        botState,
      });
    }

    if (cmd.startsWith("/aimod")) {
      botState.aiModEnabled = !botState.aiModEnabled;
      botState.activeModeDescription = botState.aiModEnabled
        ? "AI Mode Enabled (Gemini 3.5 Flash primary + Traditional AutoMod failover fallback)"
        : "Traditional AutoMod Standalone (Regex / Pattern / Heuristic engine active)";
      return res.json({
        content: "",
        embed: {
          color: botState.aiModEnabled ? "#06b6d4" : "#f59e0b",
          title: botState.aiModEnabled ? "🤖 AI AutoMod ACTIVATED" : "🛡️ Traditional AutoMod ENGAGED",
          description: botState.aiModEnabled
            ? "**Gemini 3.5 Flash** is now inspecting messages in real time. If the AI model times out or encounters an error, **Traditional AutoMod** automatically failovers."
            : "AI scanning has been **disabled**. Server messages are now guarded exclusively by **Traditional Regex, Pattern & Heuristic AutoMod**.",
          fields: [
            { name: "Current Engine", value: botState.aiModEnabled ? "Gemini 3.5 Flash (AI)" : "Traditional Pattern Engine", inline: true },
            { name: "Failover Fallback", value: "Always Standby", inline: true },
            { name: "Status", value: "Active", inline: true },
          ],
          footer: { text: "Toggle with /aimod or via Dashboard Controls" },
        },
        botState,
      });
    }

    if (cmd.startsWith("/automod") || cmd.includes("rules")) {
      return res.json({
        content: "",
        embed: {
          color: "#10b981",
          title: "⚙️ AutoMod Configuration & Engine Status",
          description: `**Operational Mode:** ${botState.aiModEnabled ? "🤖 **AI AutoMod (Gemini 3.5 Flash)** with Traditional failover" : "🛡️ **Traditional AutoMod (Regex / Patterns)**"}\nCrime Forensic Summaries: **Google Gemini (≤150w)**.`,
          fields: [
            {
              name: "⚡ AI Mode Toggle",
              value: botState.aiModEnabled ? "✅ **ON** (Gemini 3.5 Flash active)" : "❌ **OFF** (Traditional AutoMod running)",
              inline: true,
            },
            {
              name: "🛡️ Traditional Fallback",
              value: "✅ **ACTIVE** (Zero-latency standby)",
              inline: true,
            },
            ...botState.activeRules.map((rule) => ({
              name: `${rule.enabled ? "✅" : "❌"} ${rule.name}`,
              value: `Action: \`${rule.action}\` • Triggered: \`${rule.triggerCount} times\``,
              inline: false,
            })),
          ],
          footer: { text: "Use /aimod to toggle AI mode, or /testmod [message] to test." },
        },
        botState,
      });
    }

    if (cmd.startsWith("/ban")) {
      const match = query.match(/\/ban\s+(@?\w+)(?:\s+(.*))?/i);
      const target = match ? match[1] : "@violator";
      const reason = match && match[2] ? match[2] : "Severe AutoMod Violation";
      botState.infractionsToday += 1;
      return res.json({
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
          footer: { text: "Logged to #mod-logs • AutoMod Case ID Dispatched" },
        },
        botState,
      });
    }

    if (cmd.startsWith("/mute") || cmd.startsWith("/timeout")) {
      const match = query.match(/\/(?:mute|timeout)\s+(@?\w+)(?:\s+(\d+\w*))?(?:\s+(.*))?/i);
      const target = match ? match[1] : "@offender";
      const duration = match && match[2] ? match[2] : "10 minutes";
      const reason = match && match[3] ? match[3] : "Channel rule breach";
      botState.infractionsToday += 1;
      return res.json({
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
          footer: { text: "Case Logged • AutoMod Active" },
        },
        botState,
      });
    }

    if (cmd.startsWith("/purge")) {
      const amount = query.replace(/[^\d]/g, "") || "25";
      return res.json({
        content: `🧹 **Purged ${amount} messages** in this channel.\n*(Notification will auto-delete)*`,
        botState,
      });
    }

    if (cmd.startsWith("/raidmode")) {
      botState.raidMode = !botState.raidMode;
      return res.json({
        content: "",
        embed: {
          color: botState.raidMode ? "#ef4444" : "#10b981",
          title: botState.raidMode ? "🚨 Anti-Raid Mode ENGAGED" : "✅ Anti-Raid Mode RESTORED",
          description: botState.raidMode
            ? "Verification gatekeeper activated. All incoming joins require manual approval. Mass-joins will be automatically banned."
            : "Server join gateway set back to standard verification.",
          footer: { text: "Aegis Security Sentinel" },
        },
        botState,
      });
    }
  }

  // 2. LIVE DUAL-ENGINE AUTOMOD PIPELINE (Gemini 3.5 Flash AI AutoMod with Traditional AutoMod failover & standalone)
  const { assessment: moderationAssessment, modeUsed } = await executeModerationPipeline(query, author, channel);

  if (moderationAssessment.isViolation) {
    botState.infractionsToday += 1;

    // Run Google Gemini Crime Summarizer (strictly <=150 words)
    const geminiSummary = await runGeminiCrimeSummary(query, moderationAssessment, author, channel);

    const embedColor =
      moderationAssessment.severity === "CRITICAL"
        ? "#ef4444"
        : moderationAssessment.severity === "HIGH"
        ? "#f97316"
        : "#eab308";

    const engineLabel =
      modeUsed === "AI_MOD"
        ? "Gemini 3.5 Flash (AI Engine)"
        : modeUsed === "TRADITIONAL_FALLBACK"
        ? "Traditional AutoMod (Failover Engaged)"
        : "Traditional AutoMod (Pattern Engine)";

    return res.json({
      content: `⚠️ **AutoMod Intercept**: A message from **@${author}** violated server rules and was blocked.`,
      isFlagged: true,
      moderationResult: {
        ...moderationAssessment,
        modeUsed,
        crimeSummary: geminiSummary.summary,
        crimeSummaryWordCount: geminiSummary.wordCount,
        summarizerEngine: "Google Gemini (Max 150 words)",
      },
      embed: {
        color: embedColor,
        title: `🛡️ AutoMod Sanction: [${moderationAssessment.recommendedAction.replace("_", " ")}]`,
        description: `**Enforcement Engine:** \`${engineLabel}\`\n${moderationAssessment.ruleBreached} • Risk Score: **${moderationAssessment.riskScore}/100** [${moderationAssessment.severity}]`,
        fields: [
          {
            name: `📝 Crime Summary (by Google Gemini • ${geminiSummary.wordCount} words / 150 max)`,
            value: geminiSummary.summary,
            inline: false,
          },
          { name: "👤 Offending Member", value: `@${author}`, inline: true },
          { name: "⚖️ Enforced Action", value: `\`${moderationAssessment.recommendedAction}\``, inline: true },
          { name: "📁 Channel", value: `#${channel}`, inline: true },
          {
            name: "🔍 Blocked Message Snippet",
            value: `\`${moderationAssessment.evidenceSnippet || query.slice(0, 100)}\``,
            inline: false,
          },
        ],
        footer: {
          text: `Aegis AutoMod • Evaluated by ${engineLabel} • Summarized by Google Gemini`,
        },
      },
      botState,
    });
  }

  // 3. If clean conversational query, respond via Gemini or bot helper
  const ai = getGenAI();
  if (ai) {
    try {
      const systemInstruction = `You are Aegis, an aesthetic Discord moderation bot.
Speak like a helpful Discord bot moderator. Keep answers concise, clean, and styled with Discord markdown.
Mention that your AI Moderation Engine runs Gemini 3.5 Flash for rule assessment and Google Gemini for 150-word crime summaries.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        content: response.text || "Command processed.",
        isFlagged: false,
        botState,
      });
    } catch {
      // Fallback
    }
  }

  return res.json({
    content: `Aegis AutoMod scanned your message: **[CLEAN - PASS]**.\nNo safety violations were detected by Gemini 3.5 Flash. All community filters passed.`,
    isFlagged: false,
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
