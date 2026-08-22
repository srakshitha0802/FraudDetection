import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Globe,
  ShoppingBag,
  Zap,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  Sliders,
  CheckCircle2,
  Building,
  Plus,
  Trash2,
  MapPin,
  Flame,
  Radio,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface CardsSecurityViewProps {
  initialCardLast4?: string;
}

export const CardsSecurityView: React.FC<CardsSecurityViewProps> = ({
  initialCardLast4
}) => {
  const [cards, setCards] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Add Card Modal / Section state
  const [showAddModal, setShowAddModal] = useState(false);
  const [bankName, setBankName] = useState('HDFC Bank');
  const [cardHolder, setCardHolder] = useState('RAKSHITHA S');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [cardType, setCardType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [network, setNetwork] = useState<'VISA' | 'MASTERCARD' | 'RUPAY'>('VISA');

  // Strict restriction fields for new card
  const [initDailyLimit, setInitDailyLimit] = useState(50000);
  const [initMaxSingleTxn, setInitMaxSingleTxn] = useState(10000);
  const [initOnlineTx, setInitOnlineTx] = useState(true);
  const [initIntlTx, setInitIntlTx] = useState(false);
  const [initContactless, setInitContactless] = useState(false);
  const [initAtm, setInitAtm] = useState(true);
  const [initGeofence, setInitGeofence] = useState(true);
  const [initAutoLock, setInitAutoLock] = useState(true);
  const [initBlockCrypto, setInitBlockCrypto] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cardsData, accountData] = await Promise.all([
        api.getPersonalCards(),
        api.getPersonalAccount()
      ]);
      setCards(cardsData || []);
      setAccount(accountData || null);

      if (cardsData && cardsData.length > 0) {
        if (initialCardLast4) {
          const match = cardsData.find((c: any) => c.cardNumberMasked.includes(initialCardLast4));
          setSelectedCardId(match ? match.id : cardsData[0].id);
        } else if (!selectedCardId || !cardsData.some((c: any) => c.id === selectedCardId)) {
          setSelectedCardId(cardsData[0].id);
        }
      } else {
        setSelectedCardId('');
      }
    } catch (err) {
      console.error('Failed to load card controls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialCardLast4]);

  const selectedCard = cards.find(c => c.id === selectedCardId) || cards[0];

  // Auto detect card network from digits
  const handleCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    let formatted = '';
    for (let i = 0; i < digits.length; i += 4) {
      if (i > 0) formatted += ' ';
      formatted += digits.slice(i, i + 4);
    }
    setCardNumber(formatted);

    // Network inference
    if (digits.startsWith('4')) {
      setNetwork('VISA');
    } else if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(digits)) {
      setNetwork('MASTERCARD');
    } else if (/^(60|65|81|82|508)/.test(digits)) {
      setNetwork('RUPAY');
    }
  };

  const handleExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      setExpiry(digits);
    } else {
      setExpiry(`${digits.slice(0, 2)}/${digits.slice(2, 4)}`);
    }
  };

  // Submit New Card
  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || cardNumber.replace(/\D/g, '').length < 4) {
      alert('Please enter a valid card number (at least 4 digits).');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        bankName,
        cardHolder: cardHolder || 'RAKSHITHA S',
        cardNumber,
        cardType,
        network,
        expiry: expiry || '12/29',
        dailyLimit: initDailyLimit,
        maxSingleTxnLimit: initMaxSingleTxn,
        onlineTxEnabled: initOnlineTx,
        intlTxEnabled: initIntlTx,
        contactlessEnabled: initContactless,
        atmEnabled: initAtm,
        geofenceStrictEnabled: initGeofence,
        autoLockOnFraudAttempt: initAutoLock,
        blockCryptoGambling: initBlockCrypto,
        smsAlertThreshold: 100
      };

      const res = await api.addPersonalCard(payload);
      setStatusMessage({ text: res.message, type: 'success' });
      setShowAddModal(false);
      // Reset form
      setCardNumber('');
      setExpiry('');
      setCvv('');
      await loadData();
      if (res.card?.id) {
        setSelectedCardId(res.card.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add card');
    } finally {
      setIsUpdating(false);
    }
  };

  // 1-Click Instant Card Lock / Unlock
  const handleToggleBlock = async (cardId: string) => {
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const res = await api.toggleCardBlock(cardId, 'Emergency Cyber Protection Block');
      setStatusMessage({ text: res.message, type: 'warning' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update card status');
    } finally {
      setIsUpdating(false);
    }
  };

  // 1-Click Strict Lockdown
  const handleStrictLockdown = async (cardId: string) => {
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const res = await api.applyStrictLockdown(cardId);
      setStatusMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to activate strict lockdown');
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle specific channel / safeguard control
  const handleToggleControl = async (channelKey: string, currentValue: boolean) => {
    if (!selectedCard) return;
    setIsUpdating(true);
    try {
      const payload: any = {};
      payload[channelKey] = !currentValue;
      const res = await api.updateCardControls(selectedCard.id, payload);
      setStatusMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update security control');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update Limits
  const handleLimitChange = async (key: 'dailyLimit' | 'maxSingleTxnLimit', value: number) => {
    if (!selectedCard) return;
    try {
      const payload: any = {};
      payload[key] = value;
      await api.updateCardControls(selectedCard.id, payload);
      await loadData();
    } catch (err) {
      console.error(`Failed to update ${key}`, err);
    }
  };

  // Delete Card
  const handleDeleteCard = async (cardId: string) => {
    const confirm = window.confirm('Are you sure you want to remove this card from your active cyber vault?');
    if (!confirm) return;

    setIsUpdating(true);
    try {
      const res = await api.deletePersonalCard(cardId);
      setStatusMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete card');
    } finally {
      setIsUpdating(false);
    }
  };

  // Freeze All Bank Accounts & UPI
  const handleFreezeAccount = async () => {
    const confirm = window.confirm(
      'Are you sure you want to FREEZE your entire bank account and all UPI handles? No outgoing debits will be allowed.'
    );
    if (!confirm) return;

    setIsUpdating(true);
    try {
      const res = await api.freezePersonalAccount();
      setStatusMessage({ text: res.message, type: 'warning' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to freeze account');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Card Security Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 border border-rose-500/30">
                CARD SECURITY & STRICT RESTRICTIONS
              </span>
              <span className="text-xs text-slate-400">• High-Security Payment Vault</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Debit & Credit Card Security Controls
            </h1>
            <p className="text-xs text-slate-300">
              Add personal payment cards, configure strict channel restrictions (Online, International, ATM, NFC), and enforce automated fraud kill-switches.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Card Details</span>
          </button>

          <button
            onClick={handleFreezeAccount}
            disabled={isUpdating}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-lg transition active:scale-95 ${
              account?.isFrozen
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>{account?.isFrozen ? 'Unfreeze Bank Account' : '🚨 Freeze Entire Account & UPI'}</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-xs shadow-lg ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
          }`}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div className="flex-1 font-medium">{statusMessage.text}</div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </motion.div>
      )}

      {/* Main Grid: Card Selector / Visual Card + Controls */}
      {cards.length === 0 && !isLoading ? (
        /* Empty State: No Cards Yet */
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CreditCard className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">No Bank Cards in Cyber Vault</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add your HDFC, ICICI, SBI, or other bank cards to configure strict anti-fraud channel locks, transaction threshold limits, and emergency 1-click freezing.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Card</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Card Selector & Visual Card Canvas (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Linked Bank Cards ({cards.length})
              </span>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Another Card
              </button>
            </div>

            {/* Cards Thumbnails List */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {cards.map((c) => {
                const isSelected = selectedCard?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCardId(c.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'border-rose-500 bg-slate-900 shadow-md ring-1 ring-rose-500/40'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-12 rounded-lg bg-gradient-to-br ${c.accentColor} flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-inner`}>
                        {c.network}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{c.bankName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{c.cardNumberMasked}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono ${
                          c.isBlocked
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {c.isBlocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Visual High-Tech Card Display */}
            {selectedCard && (
              <motion.div
                key={selectedCard.id}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl text-white border border-white/10 bg-gradient-to-br ${selectedCard.accentColor}`}
              >
                {/* Overlay & Chip */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-white/70 block">
                      {selectedCard.cardType} CARD • {selectedCard.bankName.split('(')[0]}
                    </span>
                    <div className="mt-2 h-7 w-9 rounded-md bg-amber-400/80 border border-amber-200/50 shadow-sm" />
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black font-mono tracking-wider italic text-white/90">
                      {selectedCard.network}
                    </span>
                    {selectedCard.isBlocked && (
                      <div className="mt-1 flex items-center gap-1 rounded bg-red-600/90 text-white text-[9px] font-bold font-mono px-2 py-0.5 shadow-md">
                        <Lock className="h-3 w-3" />
                        LOCKED
                      </div>
                    )}
                  </div>
                </div>

                {/* Masked Card Number */}
                <div className="my-6">
                  <span className="text-base sm:text-lg font-black font-mono tracking-widest text-white/95">
                    {selectedCard.cardNumberMasked}
                  </span>
                </div>

                {/* Cardholder & Expiry */}
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/10">
                  <div>
                    <div className="text-[9px] uppercase text-white/60">Cardholder</div>
                    <div className="font-bold text-white tracking-wider">{selectedCard.cardHolder}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase text-white/60">Valid Thru</div>
                    <div className="font-bold text-white">{selectedCard.expiry}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions & Bank Emergency Speed-Dial */}
            {selectedCard && (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs text-slate-400">Manage Card Details</span>
                <button
                  onClick={() => handleDeleteCard(selectedCard.id)}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Card</span>
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                24x7 Bank Cyber Crime Hotlines
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <a
                  href="tel:18002026161"
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-rose-400 transition"
                >
                  <PhoneCall className="h-3 w-3 text-rose-400" />
                  <span>HDFC: 1800 202 6161</span>
                </a>
                <a
                  href="tel:18001080"
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-rose-400 transition"
                >
                  <PhoneCall className="h-3 w-3 text-rose-400" />
                  <span>ICICI: 1800 1080</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Strict Security Controls & Granular Switches (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {selectedCard ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
                {/* Top Emergency Lock Switch Banner */}
                <div className={`rounded-2xl border p-5 transition ${
                  selectedCard.isBlocked
                    ? 'border-rose-500/60 bg-rose-950/40'
                    : 'border-slate-800 bg-slate-950'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
                        selectedCard.isBlocked ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {selectedCard.isBlocked ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {selectedCard.isBlocked ? 'Card Is LOCKED & BLOCKED' : 'Card Is ACTIVE & UNLOCKED'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedCard.isBlocked
                            ? 'All payments, swipes, and ATM withdrawals are rejected instantly.'
                            : 'Click to immediately lock this card against fraud.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStrictLockdown(selectedCard.id)}
                        disabled={isUpdating || selectedCard.isBlocked}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2.5 text-xs font-bold text-amber-300 transition active:scale-95 disabled:opacity-40"
                        title="Enforce maximum strict security (block international, contactless, drop limits)"
                      >
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        <span>Strict Lockdown</span>
                      </button>

                      <button
                        onClick={() => handleToggleBlock(selectedCard.id)}
                        disabled={isUpdating}
                        className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider shadow-lg transition active:scale-95 ${
                          selectedCard.isBlocked
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white animate-pulse'
                        }`}
                      >
                        {selectedCard.isBlocked ? (
                          <>
                            <Unlock className="h-4 w-4" />
                            <span>Unlock Card</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>EMERGENCY LOCK</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Granular Channel Security Controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                      1. Granular Payment Channels & Safeguards
                    </span>
                    <span className="text-[10px] text-slate-500">Instant toggle • No delay</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Channel 1: Online / E-commerce */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Online E-Commerce</div>
                          <div className="text-[10px] text-slate-400">Amazon, Swiggy, OTP pay</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('onlineTxEnabled', selectedCard.onlineTxEnabled)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.onlineTxEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.onlineTxEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Channel 2: International Transactions */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">International Usage</div>
                          <div className="text-[10px] text-slate-400">Cross-border & overseas POS</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('intlTxEnabled', selectedCard.intlTxEnabled)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.intlTxEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.intlTxEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Channel 3: Contactless Tap-to-Pay */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Contactless Tap (NFC)</div>
                          <div className="text-[10px] text-slate-400">PIN-less POS tap under ₹5k</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('contactlessEnabled', selectedCard.contactlessEnabled)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.contactlessEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.contactlessEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Channel 4: ATM Cash Withdrawals */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">ATM Cash Withdrawal</div>
                          <div className="text-[10px] text-slate-400">Physical ATM machines</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('atmEnabled', selectedCard.atmEnabled)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.atmEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.atmEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Strict Cyber Defense Policies */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                      2. Strict Anti-Fraud Cyber Policies
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">ENFORCED</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Policy 1: Geofence Location Lock */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            Strict Geofence Location Lock
                            <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">DOMESTIC</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Block any payment attempted outside your verified Indian region/device IP</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('geofenceStrictEnabled', selectedCard.geofenceStrictEnabled)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.geofenceStrictEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.geofenceStrictEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Policy 2: Auto-Lock on 1 Suspicious Trigger */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            Auto-Freeze on 1 Threat Signal
                            <span className="text-[9px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded">KILL-SWITCH</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Immediately freeze card if unusual night velocity or spoofed device emulator is detected</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('autoLockOnFraudAttempt', selectedCard.autoLockOnFraudAttempt)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.autoLockOnFraudAttempt ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.autoLockOnFraudAttempt ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Policy 3: Block Unregulated Crypto & Mule VPAs */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            Block Crypto & Blacklisted Mule VPAs
                            <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">ANTI-MULE</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Automatically reject routing to offshore crypto off-ramps and mule accounts</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleControl('blockCryptoGambling', selectedCard.blockCryptoGambling)}
                        disabled={selectedCard.isBlocked || isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          selectedCard.blockCryptoGambling ? 'bg-emerald-600' : 'bg-slate-700'
                        } ${selectedCard.isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            selectedCard.blockCryptoGambling ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Limit Sliders */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    3. Transaction Limits & Spending Ceilings
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Slider 1: Max Single Transaction Limit */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          Max Single Txn Limit
                        </span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          ₹{selectedCard.maxSingleTxnLimit?.toLocaleString('en-IN') || '10,000'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1000}
                        max={50000}
                        step={1000}
                        value={selectedCard.maxSingleTxnLimit || 10000}
                        onChange={(e) => handleLimitChange('maxSingleTxnLimit', Number(e.target.value))}
                        disabled={selectedCard.isBlocked}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Min: ₹1,000</span>
                        <span>Max: ₹50,000</span>
                      </div>
                    </div>

                    {/* Slider 2: Daily Spending Limit */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-blue-400" />
                          Daily Cumulative Limit
                        </span>
                        <span className="font-mono font-black text-rose-400 text-sm">
                          ₹{selectedCard.dailyLimit?.toLocaleString('en-IN') || '50,000'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5000}
                        max={200000}
                        step={5000}
                        value={selectedCard.dailyLimit || 50000}
                        onChange={(e) => handleLimitChange('dailyLimit', Number(e.target.value))}
                        disabled={selectedCard.isBlocked}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Min: ₹5,000</span>
                        <span>Max: ₹2,00,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
                Select a card to manage security controls.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Add Bank Card Details</h2>
                    <p className="text-xs text-slate-400">Secure card tokenization & strict restriction setup</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCardSubmit} className="space-y-4">
                {/* Bank Presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Issuing Bank</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Other Bank'].map((b) => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setBankName(b)}
                        className={`p-2 rounded-xl text-xs font-medium border text-center transition ${
                          bankName === b
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cardholder Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Cardholder Name (as on card)</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    required
                    placeholder="e.g. RAKSHITHA S"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white uppercase placeholder:normal-case placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Card Number & Network */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">16-Digit Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        required
                        maxLength={19}
                        placeholder="4111 2222 3333 4444"
                        className="w-full font-mono rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-3 text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {network}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Card Type</label>
                    <select
                      value={cardType}
                      onChange={(e: any) => setCardType(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="DEBIT">Debit Card</option>
                      <option value="CREDIT">Credit Card</option>
                    </select>
                  </div>
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Expiry Date (MM/YY)</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      required
                      placeholder="MM/YY (e.g. 12/29)"
                      maxLength={5}
                      className="w-full font-mono rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">CVV (3 or 4 Digits)</label>
                    <div className="relative">
                      <input
                        type={showCvv ? 'text' : 'password'}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full font-mono rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(!showCvv)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      >
                        {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Initial Strict Restrictions Configuration Box */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    <span>Default Strict Cyber Protections to Enforce</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initGeofence}
                        onChange={(e) => setInitGeofence(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span className="text-slate-200">Domestic Geofence</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initAutoLock}
                        onChange={(e) => setInitAutoLock(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span className="text-slate-200">Auto-Lock on Threat</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initBlockCrypto}
                        onChange={(e) => setInitBlockCrypto(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span className="text-slate-200">Block Crypto Mules</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initIntlTx}
                        onChange={(e) => setInitIntlTx(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span className="text-slate-200">Intl Payments (Off)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? 'Encrypting & Saving...' : 'Save & Enforce Protections'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
