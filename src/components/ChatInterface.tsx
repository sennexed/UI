import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Hash,
  Sparkles,
  Bot,
  User,
  PlusCircle,
  Smile,
  Mic,
  MicOff,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Shield,
  Clock,
  Terminal,
} from "lucide-react";
import { DiscordChatMessage, DiscordEmbed } from "../types";
import { playSendSound, playBotResponseSound, playClickSound } from "../utils/audio";

interface ChatInterfaceProps {
  messages: DiscordChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  selectedGuild: string;
}

const SLASH_COMMANDS = [
  { cmd: "/stats", desc: "View bot shard ping & server statistics" },
  { cmd: "/automod", desc: "List all active AutoMod filters & triggers" },
  { cmd: "/ban @spammer Scam & Phishing Link", desc: "Ban user & delete 24h messages" },
  { cmd: "/mute @troll 1h Rule #2 Toxicity", desc: "Timeout member for 1 hour" },
  { cmd: "/purge 25", desc: "Mass delete recent channel messages" },
  { cmd: "/raidmode", desc: "Toggle server-wide anti-raid gatekeeper" },
  { cmd: "/userinfo @suspect", desc: "Inspect user trust score & infractions" },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  selectedGuild,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = "en-US";
        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };
        recog.onerror = () => setIsListening(false);
        recog.onend = () => setIsListening(false);
        recognitionRef.current = recog;
      }
    }
  }, []);

  const toggleSpeech = () => {
    if (!speechSupported || !recognitionRef.current) return;
    playClickSound();
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText("");
    playSendSound();
    await onSendMessage(text);
  };

  const handleCopy = (text: string, id: string) => {
    playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="aegis-discord-chat"
      className="rounded-xl bg-[#121520] border border-slate-800/80 flex flex-col h-[650px] shadow-xl overflow-hidden relative"
    >
      {/* Discord Channel Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-[#0e111a] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-sm">
            <Hash className="w-5 h-5 text-slate-400" />
            <span className="text-white font-bold">aegis-commands</span>
          </div>
          <div className="hidden sm:block h-4 w-[1px] bg-slate-800 mx-1" />
          <span className="text-xs text-slate-400 truncate hidden sm:inline">
            Interactive moderation console for {selectedGuild}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Bot Active
          </span>
          <button
            onClick={() => {
              playClickSound();
              onClearChat();
            }}
            title="Clear chat log"
            className="p-1.5 rounded-lg bg-[#161b28] hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Slash Commands Pill Bar */}
      <div className="px-3 py-2 bg-[#0d0f17] border-b border-slate-800/80 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pl-1 pr-1 flex items-center gap-1">
          <Terminal className="w-3 h-3 text-[#5865F2]" /> SLASH:
        </span>
        {SLASH_COMMANDS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              playClickSound();
              setInputText(item.cmd);
              inputRef.current?.focus();
            }}
            title={item.desc}
            className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#161b28] hover:bg-[#202738] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
          >
            <span className="text-[#5865F2] font-semibold">/</span>
            <span>{item.cmd.split(" ")[0].replace("/", "")}</span>
          </button>
        ))}
      </div>

      {/* Discord Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0f121b]">
        {messages.map((msg) => {
          const isAegis = msg.sender === "aegis";
          const isSystem = msg.sender === "system";

          return (
            <div key={msg.id} className="flex items-start gap-3 group">
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {isAegis ? (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5865F2] to-indigo-700 flex items-center justify-center text-white shadow-sm">
                    <Shield className="w-4 h-4 fill-white/30" />
                  </div>
                ) : isSystem ? (
                  <div className="w-9 h-9 rounded-full bg-amber-600/80 flex items-center justify-center text-white">
                    <Clock className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs">
                    OP
                  </div>
                )}
              </div>

              {/* Message Header & Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isAegis ? "text-white" : "text-emerald-400"}`}>
                    {msg.authorName}
                  </span>
                  {msg.isBot && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#5865F2] text-white uppercase tracking-wider">
                      BOT
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>

                {/* Text Content */}
                {msg.content && (
                  <div className="text-xs text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                )}

                {/* Discord Embed */}
                {msg.embed && (
                  <div
                    className="mt-2 p-3.5 rounded-lg bg-[#141824] border border-slate-800 text-xs shadow-md discord-embed-border"
                    style={{ borderLeftColor: msg.embed.color || "#5865F2" }}
                  >
                    {msg.embed.author && (
                      <div className="text-[11px] text-slate-400 font-semibold mb-1">
                        {msg.embed.author.name}
                      </div>
                    )}
                    {msg.embed.title && (
                      <div className="font-bold text-white text-sm mb-1.5">
                        {msg.embed.title}
                      </div>
                    )}
                    {msg.embed.description && (
                      <div className="text-slate-300 text-xs mb-2 leading-relaxed">
                        {msg.embed.description}
                      </div>
                    )}

                    {/* Embed Fields */}
                    {msg.embed.fields && msg.embed.fields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
                        {msg.embed.fields.map((field, fIdx) => (
                          <div
                            key={fIdx}
                            className={field.inline ? "col-span-1" : "col-span-1 sm:col-span-2"}
                          >
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              {field.name}
                            </span>
                            <span className="text-xs text-slate-200 mt-0.5 block font-mono">
                              {field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Embed Footer */}
                    {msg.embed.footer && (
                      <div className="mt-2.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500">
                        {msg.embed.footer.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-ping" />
            <span>Aegis is processing command...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Discord Message Input */}
      <form onSubmit={handleSend} className="p-3 bg-[#0e111a] border-t border-slate-800/80">
        <div className="flex items-center gap-2 bg-[#161b28] rounded-xl px-3 py-2 border border-slate-700/60 focus-within:border-[#5865F2] transition-colors">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setInputText("/automod");
            }}
            title="Slash commands shortcut"
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? "Listening to your voice command..."
                : `Message #aegis-commands (Type / for commands)...`
            }
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          {/* Voice Input */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeech}
              title={isListening ? "Stop listening" : "Voice command dictation"}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isListening ? "text-red-400 animate-pulse" : "text-slate-400 hover:text-white"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Send */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              inputText.trim() && !isLoading
                ? "bg-[#5865F2] hover:bg-[#4752c4] text-white"
                : "text-slate-600 cursor-not-allowed"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
          <span>Tip: You can talk naturally or use slash commands like <code>/ban</code>, <code>/mute</code>, <code>/stats</code></span>
          <span>Aegis AutoMod Core</span>
        </div>
      </form>
    </div>
  );
};
