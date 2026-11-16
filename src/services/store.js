import localforage from 'localforage';
import { pushLocalDBToCloud } from './sync.js';

const DB_KEY = 'NEXTWAY_DELIVERY_DB_V1';

// Private variables (Not accessible outside this file)
let db = null;
let currentUser = null;
let isApplyingRemoteUpdate = false;

// Public Getters
export const getDB = () => db;
export const getCurrentUser = () => currentUser;

// Public Setters
export const setCurrentUser = (user) => { 
  currentUser = user; 
  if (user) localStorage.setItem('NEXTWAY_SESSION_USER', user.id);
  else localStorage.removeItem('NEXTWAY_SESSION_USER');
};

export const setApplyingRemoteUpdate = (status) => {
  isApplyingRemoteUpdate = status;
};

// Core Database Operations
export const saveDB = async () => {
  if (!db) return;
  await localforage.setItem(DB_KEY, JSON.stringify(db)); 
  
  // Trigger cloud sync automatically whenever local DB saves
  // We pass null for the UI callback here (the UI can handle its own loading states)
  if (!isApplyingRemoteUpdate) { 
    pushLocalDBToCloud(db, null); 
  }
};

export const initDB = async (defaultSeedDB) => {
  try { 
    const storedStr = await localforage.getItem(DB_KEY); 
    const saved = storedStr ? JSON.parse(storedStr) : null;
    
    // Merge logic
    db = saved && saved.users && saved.users.length ? saved : defaultSeedDB;
    
    // Ensure nested arrays exist safely
    db.vendorPayments = db.vendorPayments || [];
    db.agentExpenses = db.agentExpenses || [];
    
    await saveDB();
    return db;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};
