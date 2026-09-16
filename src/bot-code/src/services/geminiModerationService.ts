import { GoogleGenAI } from "@google/genai";

export interface ModerationResult {
  isViolation: boolean;
  violationCategory: "ANTI_PHISHING" | "TOXICITY_HARASSMENT" | "SPAM_BURST" | "INVITE_LINK" | "DOXXING_PRIVACY" | "CLEAN";
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  recommendedAction: "PASS" | "DELETE_AND_WARN" | "TIMEOUT_10M" | "KICK" | "TEMP_BAN" | "PERM_BAN";
  ruleBreached: string;
  flaggedKeywords: string[];
  evidenceSnippet: string;
  engine: "AI_GEMINI" | "TRADITIONAL_FALLBACK" | "TRADITIONAL_STANDALONE";
}

// Traditional AutoMod heuristic filter (runs when AI is off or when Gemini 503s/times out)
export function runTraditionalAutoMod(text: string): ModerationResult {
  const lower = text.toLowerCase();

  const phishingRegex = [
    /nitro.*(claim|gift|free|generator|drop)/i,
    /(steam|discord).*(gift|nitro|drop|trade).*\.(xyz|ru|to|top|click|link|gift)/i,
    /fake-nitro/i,
    /free-discord-nitro/i,
    /token\s*grabber/i,
    /free\s*crypto.*airdrop/i
  ];

  const toxicRegex = [
    /\b(kys|kill\s*yourself|go\s*die)\b/i,
    /\b(hate\s*you|uninstall\s*life|stupid\s*bitch|retard)\b/i,
    /\b(slur|fag|nigger|cunt)\b/i
  ];

  const inviteRegex = [
    /discord\.(gg|io|me|li)\/[a-z0-9_-]+/i,
    /discordapp\.com\/invite\/[a-z0-9_-]+/i
  ];

  const isSpam =
    (text.length > 350 && (text.match(/(!|\?|\.){3,}/g)?.length || 0) > 3) ||
    (lower.match(/@everyone/g) || []).length >= 2 ||
    /(\b\w+\b)( \1){4,}/i.test(text);

  if (phishingRegex.some((p) => p.test(text))) {
    return {
      isViolation: true,
      violationCategory: "ANTI_PHISHING",
      severity: "CRITICAL",
      riskScore: 98,
      recommendedAction: "PERM_BAN",
      ruleBreached: "Rule #1: Phishing Link & Credential Theft Intercept",
      flaggedKeywords: ["phishing pattern", "fake nitro"],
      evidenceSnippet: text.slice(0, 100),
      engine: "TRADITIONAL_FALLBACK"
    };
  }

  if (toxicRegex.some((p) => p.test(text))) {
    return {
      isViolation: true,
      violationCategory: "TOXICITY_HARASSMENT",
      severity: "HIGH",
      riskScore: 88,
      recommendedAction: "TIMEOUT_10M",
      ruleBreached: "Rule #2: Severe Harassment & Toxicity",
      flaggedKeywords: ["toxic insult pattern"],
      evidenceSnippet: text.slice(0, 100),
      engine: "TRADITIONAL_FALLBACK"
    };
  }

  if (inviteRegex.some((p) => p.test(text))) {
    return {
      isViolation: true,
      violationCategory: "INVITE_LINK",
      severity: "MEDIUM",
      riskScore: 65,
      recommendedAction: "DELETE_AND_WARN",
      ruleBreached: "Rule #3: Unauthorized Server Invite",
      flaggedKeywords: ["discord.gg invite link"],
      evidenceSnippet: text.slice(0, 100),
      engine: "TRADITIONAL_FALLBACK"
    };
  }

  if (isSpam) {
    return {
      isViolation: true,
      violationCategory: "SPAM_BURST",
      severity: "MEDIUM",
      riskScore: 70,
      recommendedAction: "TIMEOUT_10M",
      ruleBreached: "Rule #4: Rapid Spam & Repetition",
      flaggedKeywords: ["spam repetition"],
      evidenceSnippet: text.slice(0, 100),
      engine: "TRADITIONAL_FALLBACK"
    };
  }

  return {
    isViolation: false,
    violationCategory: "CLEAN",
    severity: "NONE",
    riskScore: 5,
    recommendedAction: "PASS",
    ruleBreached: "Clean communication",
    flaggedKeywords: [],
    evidenceSnippet: text.slice(0, 60),
    engine: "TRADITIONAL_FALLBACK"
  };
}

export class GeminiModerationService {
  private ai: GoogleGenAI;
  public aiModEnabled: boolean = true;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  public async analyzeMessage(
    text: string,
    author: string = "Member",
    channel: string = "general"
  ): Promise<ModerationResult> {
    if (!this.aiModEnabled) {
      const fallback = runTraditionalAutoMod(text);
      fallback.engine = "TRADITIONAL_STANDALONE";
      return fallback;
    }

    // Gemini 3.5 Flash primary with 3.x Flash fallbacks
    const candidateModels = [
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-3.0-flash",
      "gemini-2.0-flash",
    ];

    for (const model of candidateModels) {
      try {
        const systemInstruction = `You are a Discord AutoMod engine. Analyze the message for Discord rules violations (Phishing, Toxicity/Harassment, Mass Spam, Discord Invites, Doxxing). Return JSON only matching:
{"isViolation": boolean, "violationCategory": "ANTI_PHISHING" | "TOXICITY_HARASSMENT" | "SPAM_BURST" | "INVITE_LINK" | "DOXXING_PRIVACY" | "CLEAN", "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "riskScore": number, "recommendedAction": "PASS" | "DELETE_AND_WARN" | "TIMEOUT_10M" | "KICK" | "TEMP_BAN" | "PERM_BAN", "ruleBreached": string, "flaggedKeywords": string[], "evidenceSnippet": string}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const response = await this.ai.models.generateContent({
          model,
          contents: `Evaluate Discord message from @${author} in #${channel}: """${text}"""`,
          config: {
            systemInstruction,
            temperature: 0.1,
            responseMimeType: "application/json",
            abortSignal: controller.signal
          }
        });
        clearTimeout(timeout);

        const json = JSON.parse(response.text || "{}");
        if (typeof json.isViolation === "boolean") {
          return {
            ...json,
            engine: "AI_GEMINI"
          };
        }
      } catch (err: any) {
        console.warn(`[GeminiModeration] ${model} unavailable (${err?.status || err?.name || "timeout"}). Trying fallback...`);
      }
    }

    // If Gemini 503s or times out on all models, automatically engage Traditional AutoMod
    console.warn("[AutoMod] AI unavailable. Traditional AutoMod failover engaged.");
    return runTraditionalAutoMod(text);
  }
}
