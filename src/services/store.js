// /src/services/store.js
import localforage from 'localforage';[span_1420](start_span)[span_1420](end_span)
import { pushLocalDBToCloud } from './sync.js';[span_1421](start_span)[span_1421](end_span)[span_1422](start_span)[span_1422](end_span)

const DB_KEY = 'NEXTWAY_DELIVERY_DB_V1';[span_1423](start_span)[span_1423](end_span)

let db = null;[span_1424](start_span)[span_1424](end_span)
let currentUser = null;[span_1425](start_span)[span_1425](end_span)
let isApplyingRemoteUpdate = false;[span_1426](start_span)[span_1426](end_span)
let onStatusBadgeChange = null;

export const getDB = () => db;[span_1427](start_span)[span_1427](end_span)
export const getCurrentUser = () => currentUser;[span_1428](start_span)[span_1428](end_span)

export const setCurrentUser = (user) => {[span_1429](start_span)[span_1429](end_span)
  currentUser = user;[span_1430](start_span)[span_1430](end_span)
  if (user) localStorage.setItem('NEXTWAY_SESSION_USER', user.id);[span_1431](start_span)[span_1431](end_span)
  else localStorage.removeItem('NEXTWAY_SESSION_USER');[span_1432](start_span)[span_1432](end_span)
};[span_1433](start_span)[span_1433](end_span)

export const setApplyingRemoteUpdate = (status) => {[span_1434](start_span)[span_1434](end_span)
  isApplyingRemoteUpdate = status;[span_1435](start_span)[span_1435](end_span)
};[span_1436](start_span)[span_1436](end_span)

export const setStatusCallback = (fn) => {
  onStatusBadgeChange = fn;
};

export const saveDB = async () => {[span_1437](start_span)[span_1437](end_span)
  if (!db) return;[span_1438](start_span)[span_1438](end_span)
  await localforage.setItem(DB_KEY, JSON.stringify(db));[span_1439](start_span)[span_1439](end_span)

  if (!isApplyingRemoteUpdate) {[span_1440](start_span)[span_1440](end_span)
    pushLocalDBToCloud(db, onStatusBadgeChange);[span_1441](start_span)[span_1441](end_span)[span_1442](start_span)[span_1442](end_span)
  }[span_1443](start_span)[span_1443](end_span)
};[span_1444](start_span)[span_1444](end_span)

export const initDB = async (defaultSeedDB = null) => {[span_1445](start_span)[span_1445](end_span)
  try {[span_1446](start_span)[span_1446](end_span)
    const storedStr = await localforage.getItem(DB_KEY);[span_1447](start_span)[span_1447](end_span)
    const saved = storedStr ? JSON.parse(storedStr) : null;[span_1448](start_span)[span_1448](end_span)

    if (saved && Array.isArray(saved.users) && saved.users.length > 0) {[span_1449](start_span)[span_1449](end_span)
      db = saved;[span_1450](start_span)[span_1450](end_span)
    } else if (defaultSeedDB) {[span_1451](start_span)[span_1451](end_span)
      db = defaultSeedDB;[span_1452](start_span)[span_1452](end_span)
    } else {[span_1453](start_span)[span_1453](end_span)
      db = {[span_1454](start_span)[span_1454](end_span)
        settings: { companyName: 'NEXT WAY DELIVERY', otpMandatory: true, showCloudSyncConfig: true, invoiceCounter: 1001 },[span_1455](start_span)[span_1455](end_span)
        users: [],[span_1456](start_span)[span_1456](end_span)
        vendors: [],[span_1457](start_span)[span_1457](end_span)
        consignments: [],[span_1458](start_span)[span_1458](end_span)
        vendorPayments: [],[span_1459](start_span)[span_1459](end_span)
        vendorSettlementOtps: [],[span_1460](start_span)[span_1460](end_span)
        agentExpenses: [][span_1461](start_span)[span_1461](end_span)
      };[span_1462](start_span)[span_1462](end_span)
    }[span_1463](start_span)[span_1463](end_span)

    db.vendorPayments = db.vendorPayments || [];[span_1464](start_span)[span_1464](end_span)
    db.vendorSettlementOtps = db.vendorSettlementOtps || [];[span_1465](start_span)[span_1465](end_span)
    db.agentExpenses = db.agentExpenses || [];[span_1466](start_span)[span_1466](end_span)
    db.consignments = db.consignments || [];[span_1467](start_span)[span_1467](end_span)
    if (!db.settings) db.settings = { showCloudSyncConfig: true, invoiceCounter: 1001 };[span_1468](start_span)[span_1468](end_span)
    if (!db.settings.invoiceCounter) db.settings.invoiceCounter = 1001;[span_1469](start_span)[span_1469](end_span)

    await saveDB();[span_1470](start_span)[span_1470](end_span)

    const savedUserId = localStorage.getItem('NEXTWAY_SESSION_USER');[span_1471](start_span)[span_1471](end_span)
    if (savedUserId && Array.isArray(db.users)) {[span_1472](start_span)[span_1472](end_span)
      const restored = db.users.find(u => u.id === savedUserId && u.status === 'ACTIVE');[span_1473](start_span)[span_1473](end_span)
      if (restored) {[span_1474](start_span)[span_1474](end_span)
        currentUser = restored;[span_1475](start_span)[span_1475](end_span)
      } else {[span_1476](start_span)[span_1476](end_span)
        localStorage.removeItem('NEXTWAY_SESSION_USER');[span_1477](start_span)[span_1477](end_span)
      }[span_1478](start_span)[span_1478](end_span)
    }[span_1479](start_span)[span_1479](end_span)

    return db;[span_1480](start_span)[span_1480](end_span)
  } catch (error) {[span_1481](start_span)[span_1481](end_span)
    console.error("Database initialization failed:", error);[span_1482](start_span)[span_1482](end_span)
    throw error;[span_1483](start_span)[span_1483](end_span)
  }[span_1484](start_span)[span_1484](end_span)
};[span_1485](start_span)[span_1485](end_span)
