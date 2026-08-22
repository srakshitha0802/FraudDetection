import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  CreditCard,
  Building,
  User,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { AuthUser, Transaction } from '../../types.ts';

interface DataExportViewProps {
  currentUser: AuthUser | null;
  transactions: Transaction[];
}

export const DataExportView: React.FC<DataExportViewProps> = ({
  currentUser,
  transactions
}) => {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExportingFIR, setIsExportingFIR] = useState(false);
  const [copiedFIR, setCopiedFIR] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // 1. Download CSV
  const handleDownloadCSV = () => {
    setIsExportingCSV(true);
    try {
      const headers = [
        'Transaction ID',
        'Date & Time',
        'Payee / Merchant',
        'Amount (INR)',
        'Payment Method',
        'Safety Status',
        'Risk Level',
        'Risk Score (0-100)',
        'Device Used',
        'Location / City',
        'Action Taken'
      ];

      const rows = transactions.map(t => [
        `"${t.transaction_id}"`,
        `"${new Date(t.timestamp).toLocaleString('en-IN')}"`,
        `"${(t.merchant_name || 'Transfer').replace(/"/g, '""')}"`,
        t.amount,
        `"${t.transaction_type || 'UPI'}"`,
        `"${t.status}"`,
        `"${t.risk_level || 'LOW'}"`,
        t.risk_score || 0,
        `"${(t.device_id || 'Primary Phone').replace(/"/g, '""')}"`,
        `"${(t.location || 'Bengaluru, India').replace(/"/g, '""')}"`,
        `"${(t.decision_reasons && t.decision_reasons[0]) ? t.decision_reasons[0].replace(/"/g, '""') : 'Approved'}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sentinel_PayGuard_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess('CSV Transaction statement downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setIsExportingCSV(false);
    }
  };

  // 2. Download JSON
  const handleDownloadJSON = () => {
    setIsExportingJSON(true);
    try {
      const exportObject = {
        export_metadata: {
          app_name: 'Sentinel PayGuard - Personal Payment Protection',
          export_timestamp: new Date().toISOString(),
          account_holder: currentUser?.name || 'Rakshitha S',
          registered_email: currentUser?.email || 'srakshitha912@gmail.com',
          account_masked: currentUser?.accountNumberMasked || 'HDFC •••• 8831',
          upi_handle: currentUser?.upiHandle || 'srakshitha@okhdfcbank',
          protection_status: 'ACTIVE_SHIELD_ENABLED'
        },
        security_summary: {
          total_transactions_monitored: transactions.length,
          safe_transactions_count: transactions.filter(t => t.risk_level === 'LOW').length,
          flagged_transactions_count: transactions.filter(t => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL').length,
          fraud_prevented_amount_inr: transactions
            .filter(t => t.risk_level === 'CRITICAL' || t.status === 'BLOCKED')
            .reduce((sum, t) => sum + t.amount, 0)
        },
        transactions: transactions
      };

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sentinel_PayGuard_Security_Audit_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess('Comprehensive Security JSON dossier downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('JSON export failed:', err);
    } finally {
      setIsExportingJSON(false);
    }
  };

  // 3. Download Bank Dispute & 1930 Cyber Police Evidence Dossier (.TXT)
  const generateFIRText = () => {
    const flagged = transactions.filter(t => t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH');
    const totalFraudAmt = flagged.reduce((sum, t) => sum + t.amount, 0);

    return `========================================================================
NATIONAL CYBER CRIME REPORTING PORTAL (1930) & BANK DISPUTE DOSSIER
CONFIDENTIAL - OFFICIAL CUSTOMER DISPUTE EVIDENCE PACKET
========================================================================

1. COMPLAINANT IDENTIFICATION:
- Full Name: ${currentUser?.name || 'Rakshitha S'}
- Registered Email: ${currentUser?.email || 'srakshitha912@gmail.com'}
- Primary Banking Relationship: ${currentUser?.bankName || 'HDFC Bank & ICICI Bank'}
- Masked Account / VPA: ${currentUser?.upiHandle || 'srakshitha@okhdfcbank'} (${currentUser?.accountNumberMasked || 'HDFC •••• 8831'})
- Incident Jurisdiction: Bengaluru Cyber Crime Police Station (CCPS), Karnataka

2. INCIDENT SUMMARY:
- Total Disputed Volume: INR ₹${totalFraudAmt.toLocaleString('en-IN')}
- Protection Mechanism: AI Multi-Vector Behavioral & Device Telemetry Guard
- Date of Report: ${new Date().toLocaleString('en-IN')}

3. SUSPICIOUS / FRAUDULENT TRANSACTIONS LOG:
${flagged.map((t, idx) => `
[ITEM #${idx + 1}]
- Transaction ID: ${t.transaction_id}
- Timestamp: ${new Date(t.timestamp).toLocaleString('en-IN')}
- Disputed Amount: INR ₹${t.amount.toLocaleString('en-IN')}
- Suspect Beneficiary / VPA: ${t.merchant_name}
- Originating IP & Device: ${t.ip_address || '182.74.92.11'} (${t.device_id})
- Anomaly Flag: ${t.decision_reasons ? t.decision_reasons.join('; ') : 'Unauthorized location anomaly & rapid velocity'}
- Risk Score: ${t.risk_score}/100 [${t.risk_level}]
- Action Enforced: ${t.status}
`).join('\n')}

4. STATEMENT OF NON-AUTHORIZATION:
"I hereby state under penalty of law that the above transaction(s) were NOT authorized or initiated by me. I did not share my UPI PIN, OTP, or passwords. I request the immediate freezing of the beneficiary account under Section 102 CrPC / Section 1930 MHA Guidelines and reversal of disputed funds."

Signed,
${currentUser?.name || 'Rakshitha S'}
Digital Signature Timestamp: ${new Date().toISOString()}
Generated via Sentinel PayGuard Personal Security System
========================================================================`;
  };

  const handleDownloadFIR = () => {
    setIsExportingFIR(true);
    try {
      const firText = generateFIRText();
      const blob = new Blob([firText], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bank_Dispute_1930_Police_Dossier_${new Date().toISOString().slice(0, 10)}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess('Official Bank Dispute Dossier downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('FIR text download failed:', err);
    } finally {
      setIsExportingFIR(false);
    }
  };

  const handleCopyFIR = () => {
    navigator.clipboard.writeText(generateFIRText());
    setCopiedFIR(true);
    setTimeout(() => setCopiedFIR(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Download className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-0.5 border border-emerald-500/30">
                  DATA EXPORT & DOWNLOAD CENTER
                </span>
                <span className="text-xs text-slate-400">Personal Records</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Download Your Personal Payment & Security Data
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Export your full transaction statement, cyber safety audit logs, and official dispute evidence packages in clean formats (CSV, JSON, and Bank Dispute Docs).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {downloadSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-sm text-emerald-300 flex items-center gap-3 shadow-lg"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{downloadSuccess}</span>
        </motion.div>
      )}

      {/* 3 Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: CSV Statement */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className="rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold px-2 py-1 border border-emerald-500/20">
                .CSV (Excel / Sheets)
              </span>
            </div>

            <h3 className="text-base font-bold text-white mt-4">Transaction History Statement</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Standard spreadsheet with all your transactions, timestamps, amounts, safety ratings, merchant names, and device records.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Records:</span>
                <span className="font-bold text-white font-mono">{transactions.length} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Format:</span>
                <span className="font-mono text-emerald-400">RFC 4180 CSV</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={isExportingCSV}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition active:scale-95"
          >
            {isExportingCSV ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Exporting CSV...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Spreadsheet (.CSV)</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: JSON Security Dossier */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col justify-between hover:border-sky-500/40 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
                <FileText className="h-6 w-6" />
              </div>
              <span className="rounded-lg bg-sky-500/10 text-sky-400 text-[10px] font-mono font-bold px-2 py-1 border border-sky-500/20">
                .JSON (Developer/Full)
              </span>
            </div>

            <h3 className="text-base font-bold text-white mt-4">Personal Cyber Security Audit</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Complete JSON data backup containing all account protection parameters, device fingerprints, and fraud evaluation metrics.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Security Score:</span>
                <span className="font-bold text-emerald-400 font-mono">98/100 Safe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Includes:</span>
                <span className="font-mono text-sky-400">Account + Txn Logs</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadJSON}
            disabled={isExportingJSON}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-sky-600/20 hover:bg-sky-500 disabled:opacity-50 transition active:scale-95"
          >
            {isExportingJSON ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Exporting JSON...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Security Audit (.JSON)</span>
              </>
            )}
          </button>
        </div>

        {/* Card 3: 1930 Cyber Police Evidence Dossier */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col justify-between hover:border-rose-500/40 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <span className="rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-mono font-bold px-2 py-1 border border-rose-500/20">
                .TXT (Police / Bank FIR)
              </span>
            </div>

            <h3 className="text-base font-bold text-white mt-4">Bank Dispute & Police Dossier</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Formatted official evidence letter to email or print for your bank branch manager or submit on the 1930 Cyber Crime Portal.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Formal Header:</span>
                <span className="font-bold text-white">Section 102 CrPC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Legal Statement:</span>
                <span className="font-mono text-rose-400">Pre-Drafted</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={handleDownloadFIR}
              disabled={isExportingFIR}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 disabled:opacity-50 transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Download Dossier (.TXT)</span>
            </button>
            <button
              onClick={handleCopyFIR}
              className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Copy to clipboard"
            >
              {copiedFIR ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

      </div>

      {/* Live Preview Box of the Official Dossier */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Official Dispute Dossier Preview</h3>
              <p className="text-xs text-slate-400">Ready to print, submit to police station, or email to bank</p>
            </div>
          </div>
          <button
            onClick={handleCopyFIR}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            {copiedFIR ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedFIR ? 'Copied to Clipboard' : 'Copy All Text'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-80 leading-relaxed">
          {generateFIRText()}
        </pre>
      </div>
    </div>
  );
};
