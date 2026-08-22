import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Web app's Firebase configuration provided by user
export const firebaseConfig = {
  apiKey: "AIzaSyB-UW7xr1GOHKXvC_woV4SZlQyhzq_Dom8",
  authDomain: "frauddetection-3a60d.firebaseapp.com",
  projectId: "frauddetection-3a60d",
  storageBucket: "frauddetection-3a60d.firebasestorage.app",
  messagingSenderId: "531610511274",
  appId: "1:531610511274:web:efae5f35717a829868edd3",
  measurementId: "G-N6LP2GH4LX"
};

// Initialize Firebase App safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Safe Analytics initialization (only in browser environments where supported)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('[Firebase] Analytics initialized successfully for frauddetection-3a60d');
    }
  }).catch((err) => {
    console.warn('[Firebase] Analytics init check error:', err);
  });
}

// Firestore Database Service & Helper Functions
export const firestoreService = {
  // Save or update card in Firestore 'cards' collection
  saveCard: async (card: any) => {
    try {
      const cardRef = doc(db, 'cards', card.id);
      await setDoc(cardRef, {
        ...card,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Error saving card:', err);
      return false;
    }
  },

  // Delete card from Firestore
  deleteCard: async (cardId: string) => {
    try {
      const cardRef = doc(db, 'cards', cardId);
      await deleteDoc(cardRef);
      return true;
    } catch (err) {
      console.warn('[Firestore] Error deleting card:', err);
      return false;
    }
  },

  // Get all cards from Firestore
  getCards: async () => {
    try {
      const cardsCol = collection(db, 'cards');
      const snapshot = await getDocs(cardsCol);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn('[Firestore] Error fetching cards:', err);
      return [];
    }
  },

  // Save Police Complaint to Firestore 'complaints' collection
  saveComplaint: async (complaint: any) => {
    try {
      const complaintRef = doc(db, 'complaints', complaint.id || `cmp-${Date.now()}`);
      await setDoc(complaintRef, {
        ...complaint,
        savedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Error saving complaint:', err);
      return false;
    }
  },

  // Save Transaction to Firestore 'transactions' collection
  saveTransaction: async (tx: any) => {
    try {
      const txRef = doc(db, 'transactions', tx.id || `tx-${Date.now()}`);
      await setDoc(txRef, {
        ...tx,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Error syncing transaction:', err);
      return false;
    }
  },

  // Save Security Settings / Account profile
  saveAccountProfile: async (userId: string, accountData: any) => {
    try {
      const accRef = doc(db, 'accounts', userId || 'personal_account');
      await setDoc(accRef, {
        ...accountData,
        lastActive: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Error saving account:', err);
      return false;
    }
  }
};
