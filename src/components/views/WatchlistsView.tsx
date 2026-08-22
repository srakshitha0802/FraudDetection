import React, { useState, useEffect } from 'react';
import { WatchlistItem } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Hash,
  Smartphone,
  Globe,
  UserCheck,
  Building
} from 'lucide-react';

export const WatchlistsView: React.FC = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BLACKLIST' | 'WHITELIST'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [type, setType] = useState<'VPA' | 'DEVICE_ID' | 'IP' | 'USER_ID'>('VPA');
  const [value, setValue] = useState<string>('');
  const [listType, setListType] = useState<'BLACKLIST' | 'WHITELIST'>('BLACKLIST');
  const [category, setCategory] = useState<string>('MULE');
  const [reason, setReason] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('Marcus Vance (Senior Risk Lead)');

  const fetchWatchlists = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWatchlists();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this entry from watchlists?')) return;
    try {
      await api.deleteWatchlistItem(id);
      fetchWatchlists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWatchlistItem({
        type,
        value,
        list_type: listType,
        category,
        reason,
        created_by: createdBy,
      });
      setIsModalOpen(false);
      setValue('');
      setReason('');
      fetchWatchlists();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab !== 'ALL' && item.list_type !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.value.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-bold text-white">Sanctions & Entity Watchlists Console</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain real-time authoritative blacklists for AML/CFT mule rings and whitelists for trusted VIP corporate nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchWatchlists}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Watchlist Entity</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Entities ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('BLACKLIST')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'BLACKLIST' ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blacklists ({items.filter(i => i.list_type === 'BLACKLIST').length})
          </button>
          <button
            onClick={() => setActiveTab('WHITELIST')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'WHITELIST' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Whitelists ({items.filter(i => i.list_type === 'WHITELIST').length})
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search VPA, IP, Device, Reason..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">List Type</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Target Value / Match</th>
                <th className="py-3.5 px-4">Category & Intelligence Reason</th>
                <th className="py-3.5 px-4">Hits</th>
                <th className="py-3.5 px-4">Added By</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map((item, idx) => {
                const isBlack = item.list_type === 'BLACKLIST';

                return (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      {isBlack ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                          <ShieldAlert className="h-3 w-3" /> BLACKLIST
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3" /> WHITELIST
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {item.type === 'VPA' && <Hash className="h-3.5 w-3.5 text-cyan-400" />}
                        {item.type === 'DEVICE_ID' && <Smartphone className="h-3.5 w-3.5 text-purple-400" />}
                        {item.type === 'IP' && <Globe className="h-3.5 w-3.5 text-amber-400" />}
                        {item.type === 'USER_ID' && <UserCheck className="h-3.5 w-3.5 text-emerald-400" />}
                        <span className="font-bold">{item.type}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">
                      {item.value}
                    </td>

                    <td className="py-3 px-4 text-[11px] font-sans">
                      <div className="font-semibold text-slate-200">{item.category}</div>
                      <div className="text-slate-400 line-clamp-1 max-w-[280px]">{item.reason}</div>
                    </td>

                    <td className="py-3 px-4 font-bold text-white">
                      {item.hits_count || 0}
                    </td>

                    <td className="py-3 px-4 text-[11px] font-sans text-slate-400">
                      {item.created_by}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Watchlist Entity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Add Entity to Authoritative Watchlist</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">List Classification</label>
                  <select
                    value={listType}
                    onChange={(e) => setListType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200"
                  >
                    <option value="BLACKLIST">BLACKLIST (Hard Intercept / Block)</option>
                    <option value="WHITELIST">WHITELIST (Trusted Exempt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Entity Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200 font-mono"
                  >
                    <option value="VPA">VPA (Virtual Payment Address)</option>
                    <option value="DEVICE_ID">DEVICE_ID (Hardware Fingerprint)</option>
                    <option value="IP">IP (Network Subnet)</option>
                    <option value="USER_ID">USER_ID (Account ID)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Exact Target Value</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  placeholder="e.g. mule.destination@axis or DEV778 or 103.145.74.19"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    placeholder="e.g. MULE, STOLEN_DEVICE, PHISHING"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Analyst Attribution</label>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Intelligence / Rationale</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. Identified nexus beneficiary for phishing syndicate operating across state borders."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
                >
                  Add To Live Watchlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
