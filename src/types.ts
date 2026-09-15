export interface BotStatusTelemetry {
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
  shards: BotShard[];
  activeRules: AutoModRule[];
}

export interface BotShard {
  id: number;
  region: string;
  guildsCount: number;
  pingMs: number;
  status: "READY" | "RESUMING" | "RECONNECTING";
}

export interface AutoModRule {
  id: string;
  name: string;
  description: string;
  category: "ANTI_PHISHING" | "ANTI_SPAM" | "ANTI_INVITES" | "ANTI_RAID" | "MENTION_SHIELD" | "WORD_BLACKLIST";
  enabled: boolean;
  triggerCount: number;
  action: "DELETE_AND_WARN" | "TIMEOUT_10M" | "KICK" | "TEMP_BAN";
}

export interface ModLogItem {
  id: string;
  timestamp: string;
  actionType: "AUTOMOD_BLOCK" | "MUTE" | "BAN" | "KICK" | "WARN" | "PURGE" | "RAID_MITIGATION";
  targetUser: {
    username: string;
    discriminator: string;
    avatarUrl?: string;
  };
  moderator: {
    username: string;
    isBot: boolean;
  };
  channel: string;
  reason: string;
  details?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  color?: string; // hex like #5865F2, #ef4444, #10b981
  author?: {
    name: string;
    iconUrl?: string;
  };
  title?: string;
  description?: string;
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
    timestamp?: string;
  };
}

export interface DiscordChatMessage {
  id: string;
  sender: "user" | "aegis" | "system";
  authorName: string;
  isBot?: boolean;
  timestamp: string;
  content: string;
  embed?: DiscordEmbed;
  commandUsed?: string;
}
