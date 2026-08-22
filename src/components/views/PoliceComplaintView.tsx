import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  PhoneCall,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building,
  User,
  Mail,
  Phone,
  CreditCard,
  Download,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { PoliceComplaint } from '../../types.ts';

interface PoliceComplaintViewProps {
  initialTransaction?: any;
  onComplaintFiled?: (complaint: any) => void;
}

export const PoliceComplaintView: React.FC<PoliceComplaintViewProps> = ({
  initialTransaction,
  onComplaintFiled
}) => {
  const [complaints, setComplaints] = useState<PoliceComplaint[]>([]);
  const [policeStationsData, setPoliceStationsData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<PoliceComplaint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Complaint Form State
  const [victimName, setVictimName] = useState('Rakshitha S');
  const [victimEmail, setVictimEmail] = useState('srakshitha912@gmail.com');
  const [victimPhone, setVictimPhone] = useState('+91 98450 12890');
  const [victimAddress, setVictimAddress] = useState('102, Palm Meadows, Indiranagar 100ft Rd, Bengaluru 560038');
  const [incidentCategory, setIncidentCategory] = useState<'UPI_FRAUD' | 'CARD_SKIMMING' | 'OTP_PHISHING' | 'UNAUTHORIZED_DEBIT'>('UPI_FRAUD');
  const [selectedTxnId, setSelectedTxnId] = useState<string>(initialTransaction?.transaction_id || 'TXN-FRD-94821');
  const [fraudAmount, setFraudAmount] = useState<number>(initialTransaction?.amount || 48500);
  const [selectedStation, setSelectedStation] = useState<string>('Cyber Crime Police Station (CCPS), Bengaluru East');
  const [formalNarrative, setFormalNarrative] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cmps, stns, txnsRes] = await Promise.all([
        api.getPoliceComplaints(),
        api.getPoliceStations(),
        api.getPersonalTransactions()
      ]);
      setComplaints(cmps || []);
      setPoliceStationsData(stns || null);
      setTransactions(txnsRes.transactions || []);

      if (cmps && cmps.length > 0 && !selectedComplaint) {
        setSelectedComplaint(cmps[0]);
      }
    } catch (err) {
      console.error('Failed to load police complaints data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // If initialTransaction changes, populate form
  useEffect(() => {
    if (initialTransaction) {
      setSelectedTxnId(initialTransaction.transaction_id);
      setFraudAmount(initialTransaction.amount);
      if (initialTransaction.transaction_type === 'UPI') setIncidentCategory('UPI_FRAUD');
      else if (initialTransaction.transaction_type === 'CREDIT_CARD') setIncidentCategory('CARD_SKIMMING');
      setIsFormOpen(true);
    }
  }, [initialTransaction]);

  // Update formal narrative when transaction changes
  useEffect(() => {
    const txn = transactions.find(t => t.transaction_id === selectedTxnId);
    if (txn) {
      setFormalNarrative(
        `I, ${victimName}, hereby submit an official complaint to the Cyber Crime Police Station and National Cyber Crime Portal (1930) regarding an unauthorized cyber fraud debit of ₹${txn.amount.toLocaleString('en-IN')} on ${new Date(txn.timestamp).toLocaleString()}. The payment was fraudulently diverted to ${txn.merchant_name} (${txn.merchant_id}). I did not initiate or authorize this transaction. I request immediate freezing/lien marking of the suspect account under IT Act Section 66C and 66D and recovery of stolen funds.`
      );
    }
  }, [selectedTxnId, victimName, transactions]);

  // Handle Submit Complaint
  const handleFileComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessBanner(null);

    const txn = transactions.find(t => t.transaction_id === selectedTxnId);

    try {
      const payload = {
        victim_name: victimName,
        victim_email: victimEmail,
        victim_phone: victimPhone,
        victim_address: victimAddress,
        incident_category: incidentCategory,
        incident_date: txn ? txn.timestamp : new Date().toISOString(),
        total_fraud_amount: fraudAmount,
        police_station: selectedStation,
        police_jurisdiction: 'Karnataka State Cyber Police Command & I4C 1930',
        associated_transaction_ids: [selectedTxnId],
        suspect_details: txn?.suspect_details || {
          suspect_upi: txn?.merchant_name,
          suspect_account: txn?.merchant_id,
          location: txn?.location
        },
        formal_narrative: formalNarrative
      };

      const res = await api.filePoliceComplaint(payload);
      setSuccessBanner(res.message);
      setIsFormOpen(false);
      await loadData();
      if (res.complaint) {
        setSelectedComplaint(res.complaint);
      }
      if (onComplaintFiled) onComplaintFiled(res.complaint);
    } catch (err: any) {
      alert(err.message || 'Failed to submit police complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printDocket = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Procedure Step 3 Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shrink-0">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold px-2 py-0.5 border border-blue-500/30">
                STEP 3 OF 4: POLICE & CYBER TEAM FILING
              </span>
              <span className="text-xs text-slate-400">• National Cyber Reporting (1930)</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Police & Cyber Crime Incident Command
            </h1>
            <p className="text-xs text-slate-300">
              Direct official complaint filing with nearest Cyber Crime Police Stations (CCPS) and National Cyber Helpline (1930) for instant account freezing.
            </p>
          </div>
        </div>

        {/* Emergency Speed Dial Action */}
        <div className="flex items-center gap-3">
          <a
            href="tel:1930"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:from-rose-500 hover:to-orange-400 active:scale-95 transition"
          >
            <PhoneCall className="h-4 w-4 animate-bounce" />
            <span>Call 1930 (Helpline)</span>
          </a>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-300 hover:bg-blue-500/20 active:scale-95 transition"
          >
            <FileText className="h-4 w-4" />
            <span>{isFormOpen ? 'Close Form' : '+ New Police Complaint'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-300 shadow-lg"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="flex-1 font-medium">{successBanner}</div>
          <button onClick={() => setSuccessBanner(null)} className="text-slate-400 hover:text-white">✕</button>
        </motion.div>
      )}

      {/* Nearest Cyber Police Stations Locator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policeStationsData?.stations?.map((stn: any) => (
          <div key={stn.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="truncate">{stn.name}</span>
              </div>
              <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-1.5 py-0.2 border border-emerald-500/20">
                {stn.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{stn.address}</p>
            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span className="text-cyan-400 font-mono font-semibold">{stn.distance}</span>
              <span className="font-mono text-slate-400">{stn.phone}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Accordion / Drawer: New Complaint Filing Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-blue-500/40 bg-slate-900 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Official Cyber Crime Incident Declaration & FIR Draft
                  </h3>
                </div>
                <span className="rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono px-2 py-0.5 border border-rose-500/30">
                  LEGAL STATUTORY SUBMISSION (IT ACT 2000)
                </span>
              </div>

              <form onSubmit={handleFileComplaintSubmit} className="space-y-4">
                {/* Row 1: Victim Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Victim / Complainant Name</label>
                    <input
                      type="text"
                      value={victimName}
                      onChange={(e) => setVictimName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Gmail / Official Email</label>
                    <input
                      type="email"
                      value={victimEmail}
                      onChange={(e) => setVictimEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Phone (Linked to Bank)</label>
                    <input
                      type="text"
                      value={victimPhone}
                      onChange={(e) => setVictimPhone(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Incident Selection & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select Fraud Transaction</label>
                    <select
                      value={selectedTxnId}
                      onChange={(e) => {
                        setSelectedTxnId(e.target.value);
                        const t = transactions.find(x => x.transaction_id === e.target.value);
                        if (t) setFraudAmount(t.amount);
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                    >
                      {transactions.map(t => (
                        <option key={t.transaction_id} value={t.transaction_id}>
                          {t.transaction_id} — ₹{t.amount.toLocaleString()} ({t.merchant_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Classification</label>
                    <select
                      value={incidentCategory}
                      onChange={(e) => setIncidentCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="UPI_FRAUD">UPI / QR Code Fraud & Mule Diversion</option>
                      <option value="CARD_SKIMMING">Debit/Credit Card Skimming & Counterfeiting</option>
                      <option value="OTP_PHISHING">Phishing APK / Remote Screen Share Scam</option>
                      <option value="UNAUTHORIZED_DEBIT">Unauthorized Account Debit & Takeover</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Total Loss Amount (₹)</label>
                    <input
                      type="number"
                      value={fraudAmount}
                      onChange={(e) => setFraudAmount(Number(e.target.value))}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs font-mono font-bold text-rose-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Target Police Station */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Police Station / Cyber Command</label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Cyber Crime Police Station (CCPS), Bengaluru East">
                      Cyber Crime Police Station (CCPS), Bengaluru East (Palace Rd HQ)
                    </option>
                    <option value="Central Cyber Crime Police Station (CCPS), Infantry Road">
                      Central Cyber Crime Police Station (CCPS), Infantry Road, Bengaluru
                    </option>
                    <option value="National Cyber Crime Reporting Portal (NCRP) - MHA 1930">
                      National Cyber Crime Reporting Portal (NCRP) - I4C 1930 Direct Freeze
                    </option>
                  </select>
                </div>

                {/* Row 4: Formal Narrative Preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Legal Statement & FIR Narrative</label>
                  <textarea
                    rows={3}
                    value={formalNarrative}
                    onChange={(e) => setFormalNarrative(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-slate-200 leading-relaxed font-sans focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:from-blue-500 hover:to-cyan-400 active:scale-[0.99] disabled:opacity-50 transition"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit & Transmit Complaint to Police</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complaints Tracker & Official Docket Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Filed Complaints (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Filed Complaints ({complaints.length})
            </span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TRACKING ACTIVE
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
              No police complaints on record. Click "+ New Police Complaint" to file an incident.
            </div>
          ) : (
            complaints.map((c) => {
              const isSelected = selectedComplaint?.complaint_id === c.complaint_id;

              return (
                <motion.div
                  key={c.complaint_id}
                  onClick={() => setSelectedComplaint(c)}
                  whileHover={{ scale: 1.005 }}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-blue-500/80 bg-slate-900 shadow-md ring-1 ring-blue-500/40'
                      : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-400 block">
                        {c.acknowledgement_number}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">{c.police_station}</h4>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(c.filed_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-rose-400 font-mono">
                        ₹{c.total_fraud_amount?.toLocaleString('en-IN')}
                      </div>
                      <span className="inline-block mt-1 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold px-1.5 py-0.2 border border-blue-500/30">
                        {c.fir_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Stage pill */}
                  <div className="mt-3 rounded-lg bg-slate-950 p-2 text-[11px] text-slate-300 border border-slate-800 truncate flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{c.recovery_stage}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Column: Full Police Complaint Docket & Investigation Timeline (7 cols) */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5" id="printable-docket">
              {/* Docket Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 border border-emerald-500/30">
                      OFFICIAL ACKNOWLEDGEMENT
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedComplaint.national_portal_ref}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    {selectedComplaint.acknowledgement_number}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedComplaint.police_station}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={printDocket}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Docket</span>
                  </button>
                </div>
              </div>

              {/* Investigation Progress Milestone Tracker */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Cyber Cell Investigation & Recovery Milestones
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold">
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 space-y-1">
                    <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-emerald-400" />
                    <span>1. Complaint Filed</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 space-y-1">
                    <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-emerald-400" />
                    <span>2. CCPS Assigned</span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 space-y-1">
                    <Clock className="h-3.5 w-3.5 mx-auto text-blue-400 animate-spin" />
                    <span>3. 1930 Bank Lien</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 space-y-1">
                    <span>4. Recovery Order</span>
                  </div>
                </div>
              </div>

              {/* Complainant & Case Details Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Complainant / Victim</span>
                  <div className="font-bold text-white">{selectedComplaint.victim_name}</div>
                  <div className="text-slate-400 font-mono">{selectedComplaint.victim_email}</div>
                  <div className="text-slate-400 font-mono">{selectedComplaint.victim_phone}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Investigating Officer</span>
                  <div className="font-bold text-cyan-300">{selectedComplaint.investigating_officer}</div>
                  <div className="text-slate-400 font-mono">Badge: {selectedComplaint.officer_badge}</div>
                  <div className="text-slate-400 font-mono">Duty Desk: {selectedComplaint.officer_contact}</div>
                </div>
              </div>

              {/* Suspect Account & Beneficiary Trace */}
              {selectedComplaint.suspect_details && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Target Suspect Mule Node Under Lien
                    </span>
                    <span className="text-[10px] text-rose-300 font-mono">LEGAL TARGET</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">Suspect VPA:</span>{' '}
                      <strong className="text-white font-mono">{selectedComplaint.suspect_details.suspect_upi || 'quick_crypto_transfer@ybl'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Mule Account:</span>{' '}
                      <span className="font-mono text-slate-200">{selectedComplaint.suspect_details.suspect_account || '918239019283'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">IP Location:</span>{' '}
                      <span className="text-slate-200">{selectedComplaint.suspect_details.suspect_ip || '103.141.12.89 (Surat)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Amount Under Hold:</span>{' '}
                      <strong className="text-rose-400 font-mono">₹{selectedComplaint.total_fraud_amount?.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Formal Legal Narrative */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  FIR Complaint Narrative & Statutory Statement
                </span>
                <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
                  {selectedComplaint.formal_narrative}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
              Select a filed complaint from the left to view the official police dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
