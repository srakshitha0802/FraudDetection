import React, { useState, useEffect } from 'react';
import { TransactionSimulator } from '../TransactionSimulator.tsx';
import { UserProfile, DeviceInfo, BeneficiaryInfo, AgentInvestigationRecord, Transaction, TestSuiteReport } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Clock,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal
} from 'lucide-react';

interface SimulatorTestViewProps {
  users?: UserProfile[];
  devices?: DeviceInfo[];
  beneficiaries?: BeneficiaryInfo[];
  onAnalysisComplete?: (result: {
    transaction: Transaction;
    investigation: AgentInvestigationRecord;
  }) => void;
}

export const SimulatorTestView: React.FC<SimulatorTestViewProps> = ({
  users: propUsers,
  devices: propDevices,
  beneficiaries: propBeneficiaries,
  onAnalysisComplete,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(propUsers || []);
  const [devices, setDevices] = useState<DeviceInfo[]>(propDevices || []);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInfo[]>(propBeneficiaries || []);

  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const loadMissingData = async () => {
      try {
        const [uRes, dRes, bRes] = await Promise.allSettled([
          api.getUsers(),
          api.getDevices(),
          api.getBeneficiaries()
        ]);
        if (uRes.status === 'fulfilled' && Array.isArray(uRes.value)) setUsers(uRes.value);
        if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) setDevices(dRes.value);
        if (bRes.status === 'fulfilled' && Array.isArray(bRes.value)) setBeneficiaries(bRes.value);
      } catch (err) {
        console.warn('Simulator test view loader notice:', err);
      }
    };

    if (!propUsers || propUsers.length === 0) {
      loadMissingData();
    }
  }, [propUsers]);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestError(null);
    try {
      const report = await api.runTests();
      setTestReport(report);
    } catch (err: any) {
      console.warn('Test runner notice:', err);
      setTestError(err.message || 'Execution error');
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Transaction Simulator Section */}
      <div>
        <TransactionSimulator
          users={users}
          devices={devices}
          beneficiaries={beneficiaries}
          onAnalysisComplete={onAnalysisComplete || (() => {})}
        />
      </div>

      {/* 2. Automated Test Suite Runner Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/20 p-2 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Automated Verification & Test Harness</h3>
              <p className="text-xs text-slate-400">
                12 automated unit & pipeline integration tests verifying ML, Rules, Agent tools, Policy safety, and n8n orchestration.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition disabled:opacity-50"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Test Suite...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Automated Tests</span>
              </>
            )}
          </button>
        </div>

        {/* Error notification */}
        {testError && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-4 text-xs text-rose-300 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>Test suite encounter: {testError}</span>
          </div>
        )}

        {/* Results Overview */}
        {testReport && (
          <div className="border-b border-slate-800 bg-slate-950/40 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Test Cases</span>
                <div className="text-xl font-bold text-white font-mono mt-0.5">{testReport.total_tests}</div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Passed</span>
                <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{testReport.passed}</div>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3">
                <span className="text-[10px] font-bold uppercase text-rose-400">Failed</span>
                <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">{testReport.failed}</div>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
                <span className="text-[10px] font-bold uppercase text-cyan-400">Pass Rate</span>
                <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{testReport.pass_rate}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Test Cases Table */}
        <div className="p-6">
          {!testReport ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Click &quot;Run Automated Tests&quot; to execute the test suite across all fraud archetypes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Test Case</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Expected Result</th>
                    <th className="pb-3">Actual Result</th>
                    <th className="pb-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {testReport.results.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/30">
                      <td className="py-3">
                        {t.passed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                            <XCircle className="h-3 w-3" /> FAIL
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-sans font-semibold text-white">
                        {t.name}
                        <div className="text-[10px] text-slate-500 font-mono">{t.id}</div>
                      </td>
                      <td className="py-3 font-sans text-slate-400">{t.category}</td>
                      <td className="py-3 text-slate-300 text-[11px]">{t.expected}</td>
                      <td className="py-3 text-slate-300 text-[11px]">{t.actual}</td>
                      <td className="py-3 text-right text-slate-500">{t.duration_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
