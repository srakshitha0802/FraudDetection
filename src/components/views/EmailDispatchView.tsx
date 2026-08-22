import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Send,
  Inbox,
  ShieldCheck,
  AlertTriangle,
  Lock,
  FileText,
  Key,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Server,
  UserCheck
} from 'lucide-react';
import { EmailDispatchRecord } from '../../types.ts';

export const EmailDispatchView: React.FC = () => {
  const [emails, setEmails] = useState<EmailDispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailDispatchRecord | null>(null);

  // Send Test Form
  const [recipient, setRecipient] = useState('srakshitha912@gmail.com');
  const [subject, setSubject] = useState('🚨 [Sentinel SOC Alert] Suspicious Transfer Attempt Blocked');
  const [category, setCategory] = useState<'AUTH_OTP' | 'CRITICAL_FRAUD_ALERT' | 'CARD_BLOCKED' | 'POLICE_COMPLAINT' | 'TEST_PING'>('CRITICAL_FRAUD_ALERT');
  const [customBody, setCustomBody] = useState('An unauthorized transaction attempt of ₹85,000 to unverified payee was intercepted and blocked by the Sentinel AI Risk Engine.');
  const [isSending, setIsSending] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        if (data.length > 0 && !selectedEmail) {
          setSelectedEmail(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching emails:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !subject) return;

    setIsSending(true);
    setNotificationMsg(null);

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="font-size: 18px; font-weight: bold; color: #f43f5e;">Fraud Sentinel AI</span>
          <span style="background-color: #064e3b; color: #34d399; font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: bold;">DIRECT DISPATCH</span>
        </div>
        <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #ffffff;">${subject}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 18px 0;">
          ${customBody}
        </p>
        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px; margin-bottom: 16px; font-size: 12px; color: #cbd5e1;">
          <strong>Target User:</strong> ${recipient}<br/>
          <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br/>
          <strong>Security Status:</strong> PROTECTED
        </div>
      </div>
    `;

    try {
      const res = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject,
          bodyText: customBody,
          bodyHtml,
          category
        })
      });

      if (!res.ok) throw new Error('Dispatch failed');
      const data = await res.json();
      setNotificationMsg(`Email dispatched directly to ${recipient}!`);
      await fetchEmails();
      setSelectedEmail(data.record);
    } catch (err: any) {
      setNotificationMsg(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = async () => {
    await fetch('/api/notifications/emails/clear', { method: 'DELETE' });
    setEmails([]);
    setSelectedEmail(null);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'AUTH_OTP':
        return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">AUTH OTP</span>;
      case 'CRITICAL_FRAUD_ALERT':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">FRAUD ALERT</span>;
      case 'CARD_BLOCKED':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">CARD LOCK</span>;
      case 'POLICE_COMPLAINT':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">1930 CYBER POLICE</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">SYSTEM NOTICE</span>;
    }
  };

  return (
    <div className="space-y-6" id="email-dispatch-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Direct Account Email Notification Hub</h2>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                ACTIVE DISPATCH
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Direct SMTP & TLS email transport system delivering instantaneous sign-in OTPs, card locks, 1930 cyber crime receipts, and critical fraud alerts directly to user inboxes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEmails}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Mailbox</span>
          </button>
          <button
            onClick={handleClear}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-rose-950 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Grid: Dispatcher Form & Mailbox Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Direct Dispatch Form */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold border-b border-slate-800 pb-3">
            <Send className="w-5 h-5 text-sky-400" />
            <span>Dispatch Direct Notification</span>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Recipient Account</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="srakshitha912@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Notification Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="CRITICAL_FRAUD_ALERT">🚨 Critical Fraud Alert</option>
                <option value="AUTH_OTP">🔑 Sign-In Security OTP</option>
                <option value="CARD_BLOCKED">💳 Card Emergency Freeze Notice</option>
                <option value="POLICE_COMPLAINT">⚖️ 1930 Police Complaint Acknowledgement</option>
                <option value="TEST_PING">📡 Security Test Notification</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Message Content</label>
              <textarea
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Real Notification to User</span>
            </button>
          </form>
        </div>

        {/* Center: Email List */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Inbox className="w-4 h-4 text-sky-400" />
              <span>Dispatched Outbox ({emails.length})</span>
            </div>
            <span className="text-[11px] text-slate-500">Live feed</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {emails.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                No emails dispatched yet. Sign in or trigger a fraud action to test live delivery.
              </div>
            ) : (
              emails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {getCategoryBadge(email.category)}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(email.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate">{email.subject}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{email.to}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Rendered Email Preview */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="text-white font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Email Payload & Template Preview</span>
            </div>
            {selectedEmail && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {selectedEmail.deliveryMode}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedEmail ? (
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
                  <div><span className="text-slate-500">TO:</span> <span className="text-sky-300 font-semibold">{selectedEmail.to}</span></div>
                  <div><span className="text-slate-500">SUBJECT:</span> <span className="text-white">{selectedEmail.subject}</span></div>
                  <div><span className="text-slate-500">TIME:</span> <span className="text-slate-400">{new Date(selectedEmail.timestamp).toLocaleString()}</span></div>
                  <div><span className="text-slate-500">STATUS:</span> <span className="text-emerald-400 font-bold">{selectedEmail.status}</span></div>
                </div>

                {/* Render HTML content securely */}
                <div
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs overflow-x-auto text-slate-200"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />

                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
                  <div className="text-slate-500 font-semibold mb-1">Metadata Headers:</div>
                  <pre className="text-[10px] text-slate-400 overflow-x-auto">{JSON.stringify(selectedEmail.metadata || {}, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Select an email from the outbox to inspect the rendered delivery payload.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
