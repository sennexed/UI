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
  ShieldAlert,
  Zap,
  AlertTriangle,
  Flame,
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

const QUICK_TEST_PROMPTS = [
  {
    label: "🎣 Fake Nitro Phishing",
    text: "Claim your free 3-month Discord Nitro immediately at http://fake-nitro-gift.xyz/claim @everyone!",
  },
  {
    label: "🤬 Toxic Harassment",
    text: "kys you absolute idiot go uninstall life right now, nobody wants your stupid opinion",
  },
  {
    label: "🔗 Discord Invite Spam",
    text: "Join my new server guys discord.gg/secret-giveaway-hub fast limited spots!",
  },
  {
    label: "💬 Normal Chat",
    text: "Hey everyone, how's the server doing today? Any game night planned?",
  },
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

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || isLoading) return;

    if (!customText) setInputText("");
    playSendSound();
    await onSendMessage(textToSend);
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
      className="rounded-2xl bg-[#121520] border border-slate-800/80 flex flex-col h-[650px] shadow-xl overflow-hidden relative"
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
            Active AutoMod Channel • Gemini 3.5 Flash + Gemini (≤150w Summary)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AutoMod Guard Live
          </span>
          <button
            onClick={() => {
              playClickSound();
              onClearChat();
            }}
            title="Clear channel messages"
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.map((msg) => {
          const isAegis = msg.sender === "aegis";
          const isSystem = msg.sender === "system";

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="py-1 px-3 my-1 rounded bg-[#161b28] border border-slate-800/80 text-slate-400 text-[11px] flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>{msg.content}</span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 group transition-colors rounded-lg p-1.5 -mx-1.5 hover:bg-[#141824]/60 ${
                msg.isFlagged ? "bg-red-950/20 border-l-2 border-red-500 pl-2" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-sm ${
                  isAegis
                    ? "bg-gradient-to-br from-[#5865F2] to-indigo-700"
                    : "bg-emerald-600"
                }`}
              >
                {isAegis ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Content Area */}
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

                  {msg.isFlagged && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-500/40 uppercase">
                      ⚠️ AutoMod Intercept
                    </span>
                  )}
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
                    className="mt-2 p-3.5 rounded-xl bg-[#141824] border border-slate-800 text-xs shadow-md"
                    style={{ borderLeft: `4px solid ${msg.embed.color || "#5865F2"}` }}
                  >
                    {msg.embed.author && (
                      <div className="text-[11px] text-slate-400 font-semibold mb-1">
                        {msg.embed.author.name}
                      </div>
                    )}
                    {msg.embed.title && (
                      <div className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>{msg.embed.title}</span>
                      </div>
                    )}
                    {msg.embed.description && (
                      <div className="text-slate-300 text-xs mb-2 leading-relaxed whitespace-pre-wrap">
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
                            <div className="text-xs text-slate-200 mt-0.5 font-mono leading-relaxed bg-slate-900/40 p-1.5 rounded border border-slate-800/80">
                              {field.value}
                            </div>
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
            <span>Aegis AutoMod is scanning payload (Claude 3.5 Sonnet + Gemini)...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AutoMod Quick Test Action Bar */}
      <div className="px-3 py-1.5 bg-[#0b0e16] border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] font-semibold text-slate-500 uppercase flex-shrink-0">
          AutoMod Test:
        </span>
        {QUICK_TEST_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(undefined, p.text)}
            disabled={isLoading}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[#161b28] hover:bg-[#202738] border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Discord Message Input Form */}
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
                : `Message #aegis-commands (AutoMod will scan in real-time)...`
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
          <span>AI Pipeline: Claude 3.5 Sonnet (Moderation) + Google Gemini (Crime Summary ≤150w)</span>
          <span>Aegis AutoMod Core</span>
        </div>
      </form>
    </div>
  );
};
