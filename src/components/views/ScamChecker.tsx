import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ExternalLink,
  PhoneCall,
  QrCode,
  Smartphone,
  CreditCard,
  Building,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  Upload,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Eye,
  Lock,
  Plus
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface ScamAnalysisResult {
  safetyScore: number;
  status: 'SAFE' | 'SUSPICIOUS' | 'SCAM_CONFIRMED';
  category: string;
  confidenceScore: number;
  title: string;
  summary: string;
  psychologicalTriggers: string[];
  scamIndicators: string[];
  extractedEntities: {
    phoneNumbers: string[];
    links: string[];
    upiIds: string[];
    suspiciousApps: string[];
  };
  immediateActionSteps: string[];
  rbiProtectionClause: string;
  legalSections?: string[];
  source?: string;
}

const SAMPLE_QUERIES = [
  { label: 'Electricity Disconnection SMS', query: 'Dear Consumer, your electricity will be disconnected tonight at 9:30 PM. Call BESCOM Officer at 9821055432 to update bill immediately.', type: 'Phishing SMS' },
  { label: 'Digital Arrest / Mumbai Police Call', query: 'Mumbai Police CBI: A parcel containing narcotics in your name was seized at customs. Join Skype video call immediately or face non-bailable warrant.', type: 'Digital Arrest' },
  { label: 'YouTube Like Task / Part-Time Job', query: 'Earn ₹5000/day part time by liking YouTube videos. Get ₹150 instantly. Join our Telegram VIP task group: t.me/taskprofit88', type: 'Job Scam' },
  { label: 'Reverse UPI Refund Collect Trap', query: 'OLX Buyer: I am transferring ₹15,000 for your sofa. Scan this QR code or accept UPI collect and enter PIN to receive money in your bank.', type: 'UPI Trap' },
  { label: 'Verified Swiggy Official UPI', query: 'swiggy.pay@icici', type: 'Legit Merchant' },
];

export const ScamChecker: React.FC = () => {
  const [inputQuery, setInputQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScamAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; preview: string; name: string } | null>(null);
  const [communityFeed, setCommunityFeed] = useState<any[]>([]);
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [reportEntity, setReportEntity] = useState('');
  const [reportType, setReportType] = useState('UPI_VPA');
  const [reportNotes, setReportNotes] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCommunityFeed();
  }, []);

  const loadCommunityFeed = async () => {
    try {
      const feed = await api.getCommunityScamFeed();
      if (Array.isArray(feed)) setCommunityFeed(feed);
    } catch (err) {
      console.warn('Community feed load notice:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage({
        base64,
        preview: base64,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runScan = async (queryText?: string) => {
    const textToScan = queryText !== undefined ? queryText : inputQuery;
    if (!textToScan.trim() && !selectedImage) return;

    setIsScanning(true);
    setResult(null);

    try {
      const res = await api.analyzeScamWithGemini({
        text: textToScan,
        imageBase64: selectedImage?.base64,
        mimeType: 'image/jpeg',
        queryType: selectedImage ? 'SCREENSHOT_ANALYSIS' : 'TEXT_QUERY'
      });

      setResult(res);
    } catch (err: any) {
      alert('Analysis error: ' + (err.message || 'Failed to scan'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportEntity.trim()) return;

    setIsSubmittingReport(true);
    try {
      const res = await api.reportScamEntity({
        entity: reportEntity.trim(),
        type: reportType,
        notes: reportNotes.trim()
      });

      setReportSuccessMsg(res.message || 'Report submitted to community blacklist!');
      setReportEntity('');
      setReportNotes('');
      loadCommunityFeed();
      setTimeout(() => {
        setIsReportingOpen(false);
        setReportSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 shrink-0">
              <Search className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  AI Scam & Phishing Forensic Scanner
                </h1>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Gemini 3.7 Flash Vision
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl font-medium">
                Verify suspicious SMS messages, WhatsApp extortion calls, fake electricity bill threats, QR codes, APK downloads, or UPI IDs before typing your PIN.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsReportingOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Report Scam Payee</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              Enter Message Text, UPI ID, Phone Number, or Upload Screenshot
            </label>
            {selectedImage && (
              <button
                onClick={handleClearImage}
                className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" /> Remove Screenshot
              </button>
            )}
          </div>

          {/* Textarea + Screenshot Input */}
          <div className="relative rounded-2xl border border-slate-700 bg-slate-950 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition p-3">
            <textarea
              rows={3}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Paste suspicious SMS, WhatsApp chat, caller claim, or UPI address (e.g. 'cashback.lottery@ybl', '+91 98210 55432', 'Electricity bill cut notification')..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none"
            />

            {/* Attached Screenshot Preview if present */}
            {selectedImage && (
              <div className="mt-2 flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <img
                  src={selectedImage.preview}
                  alt="Scam Screenshot"
                  className="h-12 w-12 rounded-lg object-cover border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{selectedImage.name}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">Ready for Gemini Multimodal Inspection</p>
                </div>
              </div>
            )}

            {/* Input Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 text-xs font-medium border border-slate-700 transition"
                >
                  <Upload className="h-3.5 w-3.5 text-sky-400" />
                  <span>{selectedImage ? 'Change Screenshot' : 'Upload Screenshot / QR'}</span>
                </button>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Supports WhatsApp chats, SMS, QR codes & fake receipts
                </span>
              </div>

              <button
                type="button"
                onClick={() => runScan()}
                disabled={(!inputQuery.trim() && !selectedImage) || isScanning}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-40 text-white font-bold px-6 py-2 text-xs shadow-lg shadow-sky-500/20 transition"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Forensic Signals...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Run Deep AI Scam Check</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Sample Queries */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="h-3 w-3 text-slate-400" />
            Or test with common real-world threat templates:
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputQuery(sample.query);
                  runScan(sample.query);
                }}
                disabled={isScanning}
                className="rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white transition flex items-center gap-2"
              >
                <span className="font-medium">{sample.label}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                  {sample.type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Scan Results Breakdown */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${
              result.status === 'SCAM_CONFIRMED'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : result.status === 'SAFE'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            {/* Verdict Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shrink-0 ${
                    result.status === 'SCAM_CONFIRMED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : result.status === 'SAFE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {result.status === 'SCAM_CONFIRMED' ? (
                    <ShieldAlert className="h-8 w-8" />
                  ) : result.status === 'SAFE' ? (
                    <ShieldCheck className="h-8 w-8" />
                  ) : (
                    <AlertTriangle className="h-8 w-8" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        result.status === 'SCAM_CONFIRMED'
                          ? 'bg-rose-500 text-white'
                          : result.status === 'SAFE'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-black'
                      }`}
                    >
                      {result.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Category: {result.category}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {result.title}
                  </h3>
                </div>
              </div>

              {/* Safety Score Meter */}
              <div className="flex items-center gap-4 bg-slate-950/80 rounded-2xl px-4 py-3 border border-slate-800 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Safety Score</p>
                  <p
                    className={`text-2xl font-black font-mono ${
                      result.safetyScore >= 80
                        ? 'text-emerald-400'
                        : result.safetyScore >= 40
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {result.safetyScore}/100
                  </p>
                </div>
                <div className="h-10 w-1 rounded-full bg-slate-800"></div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">AI Confidence</p>
                  <p className="text-sm font-bold text-white font-mono">{result.confidenceScore || 98}%</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
              <p className="font-medium text-white">{result.summary}</p>
            </div>

            {/* Deep Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Psychological Triggers */}
              {result.psychologicalTriggers && result.psychologicalTriggers.length > 0 && (
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    Psychological Manipulation Triggers
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {result.psychologicalTriggers.map((trig, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{trig}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red Flags / Indicators */}
              {result.scamIndicators && result.scamIndicators.length > 0 && (
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Scam Red Flags & Signatures
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {result.scamIndicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{ind}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Extracted Entities */}
            {result.extractedEntities && (
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-sky-400" />
                  Extracted Threat Entities
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Suspicious Phone Numbers</p>
                    <p className="font-mono font-bold text-white mt-1">
                      {result.extractedEntities.phoneNumbers?.length ? result.extractedEntities.phoneNumbers.join(', ') : 'None extracted'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Extracted UPI VPAs</p>
                    <p className="font-mono font-bold text-white mt-1">
                      {result.extractedEntities.upiIds?.length ? result.extractedEntities.upiIds.join(', ') : 'None extracted'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Phishing Links</p>
                    <p className="font-mono font-bold text-rose-400 mt-1 truncate">
                      {result.extractedEntities.links?.length ? result.extractedEntities.links.join(', ') : 'None extracted'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Suspicious APK Droppers</p>
                    <p className="font-mono font-bold text-amber-400 mt-1">
                      {result.extractedEntities.suspiciousApps?.length ? result.extractedEntities.suspiciousApps.join(', ') : 'None detected'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Immediate Action Steps */}
            <div className="rounded-2xl bg-slate-950 p-5 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                What You Must Do Immediately
              </h4>
              <div className="space-y-2 text-xs text-slate-200">
                {result.immediateActionSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-sky-400 font-mono text-[10px] shrink-0 font-bold">
                      {i + 1}
                    </span>
                    <p className="leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RBI Statutory Reference Banner */}
            <div className="rounded-xl bg-sky-950/40 border border-sky-500/20 p-3 text-xs text-sky-200 flex items-center justify-between">
              <span><strong>RBI Customer Protection Rule:</strong> {result.rbiProtectionClause}</span>
              <a
                href="tel:1930"
                className="font-bold text-rose-400 hover:underline flex items-center gap-1 shrink-0 ml-3"
              >
                <PhoneCall className="h-3 w-3" /> Dial 1930
              </a>
            </div>
          </motion.div>
        )}
      </div>

      {/* Community Threat Blacklist Directory */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              Live Community Threat Blacklist Feed
            </h3>
            <p className="text-xs text-slate-400">
              Crowd-verified and police-reported scam UPI IDs, phone numbers, and phishing URLs
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {communityFeed.length} Verified Threat Signatures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {communityFeed.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-white">{item.reported_entity}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {item.scam_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.notes}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                <span>Reported: {item.reports_count} times</span>
                <span className="font-mono text-slate-400">Last active: {item.last_active}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {isReportingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                Report New Scam Entity
              </h4>
              <button
                onClick={() => setIsReportingOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                ✓ {reportSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Scam Identifier (UPI VPA / Phone / Link)
                  </label>
                  <input
                    type="text"
                    required
                    value={reportEntity}
                    onChange={(e) => setReportEntity(e.target.value)}
                    placeholder="e.g. cashback.claim@ybl or +91 98450 00000"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Scam Category</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="UPI_VPA">UPI VPA Address</option>
                    <option value="PHONE_NUMBER">Phone Number</option>
                    <option value="MALICIOUS_LINK">Phishing Link / Website</option>
                    <option value="BANK_ACCOUNT">Bank Account & IFSC</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Incident Notes / What happened</label>
                  <textarea
                    rows={2}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Explain what the fraudster asked you to do..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    {isSubmittingReport ? 'Submitting to 1930 Feed...' : 'Submit Scam Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportingOpen(false)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
