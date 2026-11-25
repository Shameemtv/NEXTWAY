// /src/services/store.js
import { pushLocalDBToCloud } from './sync.js';

const DB_KEY = 'NEXTWAY_DELIVERY_DB_V1';
const localforage = window.localforage;

let db = null;
let currentUser = null;
let isApplyingRemoteUpdate = false;
let onStatusBadgeChange = null;

export const getDB = () => db;
export const getCurrentUser = () => currentUser;

export const setCurrentUser = (user) => {
  currentUser = user;
  if (user) localStorage.setItem('NEXTWAY_SESSION_USER', user.id);
  else localStorage.removeItem('NEXTWAY_SESSION_USER');
};

export const setApplyingRemoteUpdate = (status) => {
  isApplyingRemoteUpdate = status;
};

export const setStatusCallback = (fn) => {
  onStatusBadgeChange = fn;
};

export const saveDB = async () => {
  if (!db) return;
  if (localforage) {
    await localforage.setItem(DB_KEY, JSON.stringify(db));
  } else {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  if (!isApplyingRemoteUpdate) {
    pushLocalDBToCloud(db, onStatusBadgeChange);
  }
};

export const initDB = async (defaultSeedDB = null) => {
  try {
    let storedStr = null;
    if (localforage) {
      storedStr = await localforage.getItem(DB_KEY);
    } else {
      storedStr = localStorage.getItem(DB_KEY);
    }

    const saved = storedStr ? JSON.parse(storedStr) : null;

    if (saved && Array.isArray(saved.users) && saved.users.length > 0) {
      db = saved;
    } else if (defaultSeedDB) {
      db = defaultSeedDB;
    } else {
      db = {
        settings: { companyName: 'NEXT WAY DELIVERY', otpMandatory: true, showCloudSyncConfig: true, invoiceCounter: 1001 },
        users: [],
        vendors: [],
        consignments: [],
        vendorPayments: [],
        vendorSettlementOtps: [],
        agentExpenses: []
      };
    }

    db.vendorPayments = db.vendorPayments || [];
    db.vendorSettlementOtps = db.vendorSettlementOtps || [];
    db.agentExpenses = db.agentExpenses || [];
    db.consignments = db.consignments || [];
    if (!db.settings) db.settings = { showCloudSyncConfig: true, invoiceCounter: 1001 };
    if (!db.settings.invoiceCounter) db.settings.invoiceCounter = 1001;

    await saveDB();

    const savedUserId = localStorage.getItem('NEXTWAY_SESSION_USER');
    if (savedUserId && Array.isArray(db.users)) {
      const restored = db.users.find(u => u.id === savedUserId && u.status === 'ACTIVE');
      if (restored) {
        currentUser = restored;
      } else {
        localStorage.removeItem('NEXTWAY_SESSION_USER');
      }
    }

    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};
