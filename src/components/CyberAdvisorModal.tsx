import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ShieldCheck,
  PhoneCall,
  Scale,
  Clock,
  AlertCircle,
  HelpCircle,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api.ts';

interface CyberAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, extra?: any) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const PRESET_QUESTIONS = [
  'Someone asked me to enter UPI PIN to receive ₹5,000 refund, is this safe?',
  'I received a call from someone claiming to be Mumbai Police about a seized parcel with drugs. What should I do?',
  'What are my rights under RBI Zero Liability if money was debited without OTP?',
  'I accidentally clicked a link and downloaded an electricity update APK. How do I secure my phone?',
  'What is the 1930 Golden Hour rule for recovering stolen money?'
];

export const CyberAdvisorModal: React.FC<CyberAdvisorModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `### 🛡️ Welcome to Sentinel 24/7 AI Cyber Defense Advisor

I am your personal **Cyber Crime & Banking Rights AI Advisor**, powered by **Gemini 3.7 Flash**.

I can assist you with:
- **Instant Scam Verification:** Ask whether a call, message, or payment request is safe.
- **Your Legal Rights:** Learn about the **RBI Zero Liability Rule (Full Refund within 3 Days)**.
- **Emergency Containment:** Step-by-step guidance if you shared a PIN or lost funds.
- **1930 Helpline Guidance:** How to trigger immediate mule account freezing.

How can I protect your finances today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const serverMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await api.chatCyberAdvisor(serverMessages);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: res.reply || 'I could not generate an advisory response. Please dial 1930 for immediate human emergency assistance.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `### ⚠️ Advisory Connection Notice
Could not connect to live Gemini server: ${err.message || 'Network timeout'}.

**Emergency Offline Advice:**
1. **Never enter UPI PIN to receive funds.**
2. **If money was debited without consent, dial 1930 immediately.**
3. **Notify your bank within 3 days for 100% Zero Liability reimbursement under RBI/2017-18/15.**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl h-[85vh] max-h-[750px] flex flex-col rounded-3xl border border-sky-500/30 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/40 text-sky-400">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">24/7 AI Cyber Legal & Security Advisor</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grounded in Indian Cyber Law (IT Act 2000) & RBI Zero Liability Circulars
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Statutory Reference Strip */}
        <div className="flex items-center justify-between px-6 py-2 bg-sky-950/30 border-b border-sky-500/10 text-[11px] text-sky-300">
          <span className="flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-sky-400" />
            <span>RBI Master Circular 2017: <strong>3-Day Zero Liability Window</strong></span>
          </span>
          <a
            href="tel:1930"
            className="flex items-center gap-1 font-bold text-rose-400 hover:underline"
          >
            <PhoneCall className="h-3 w-3" />
            <span>National Cyber Helpline: 1930</span>
          </a>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 shrink-0 mt-1">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-none prose prose-invert prose-xs sm:prose-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className={`mt-2 text-[10px] ${msg.role === 'user' ? 'text-sky-200 text-right' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300 shrink-0 mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 shrink-0">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-bl-none bg-slate-800/90 border border-slate-700/70 px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-400 animate-spin" />
                <span>Gemini AI is analyzing cyber laws and evaluating safety rules...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Preset Prompt Chips */}
        <div className="px-6 py-2 border-t border-slate-800/80 bg-slate-950/40 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Quick Inquiries:
          </span>
          {PRESET_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isSending}
              className="text-[11px] whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-slate-700 transition shrink-0"
            >
              {q.length > 45 ? q.slice(0, 45) + '...' : q}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="Ask anything (e.g. 'I was asked to enter UPI PIN to receive money', 'How to get bank refund?')..."
              className="flex-1 rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={isSending}
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 transition shrink-0 shadow-lg shadow-sky-500/20"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
