// /src/services/auth.js
import { getDB, setCurrentUser, saveDB } from './store.js';[span_1486](start_span)[span_1486](end_span)

export const hashPassword = async (plain) => {[span_1487](start_span)[span_1487](end_span)
  const text = plain + '_NEXTWAY_SALT';[span_1488](start_span)[span_1488](end_span)
  if (window.crypto && window.crypto.subtle) {[span_1489](start_span)[span_1489](end_span)
    const msgBuffer = new TextEncoder().encode(text);[span_1490](start_span)[span_1490](end_span)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);[span_1491](start_span)[span_1491](end_span)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');[span_1492](start_span)[span_1492](end_span)
  }[span_1493](start_span)[span_1493](end_span)
  let hash = 0;[span_1494](start_span)[span_1494](end_span)
  for (let i = 0; i < text.length; i++) {[span_1495](start_span)[span_1495](end_span)
    hash = ((hash << 5) - hash) + text.charCodeAt(i);[span_1496](start_span)[span_1496](end_span)
    hash |= 0;[span_1497](start_span)[span_1497](end_span)
  }[span_1498](start_span)[span_1498](end_span)
  return 'fallback_' + Math.abs(hash).toString(16);[span_1499](start_span)[span_1499](end_span)
};[span_1500](start_span)[span_1500](end_span)

export const login = async (username, password) => {[span_1501](start_span)[span_1501](end_span)
  const db = getDB();[span_1502](start_span)[span_1502](end_span)
  if (!db || !db.users) throw new Error("Database not initialized");[span_1503](start_span)[span_1503](end_span)

  const user = db.users.find(u => u && typeof u.username === 'string' && u.username.toLowerCase() === username.toLowerCase());[span_1504](start_span)[span_1504](end_span)

  if (!user) return { success: false, error: 'Invalid credentials provided.' };[span_1505](start_span)[span_1505](end_span)
  if (user.status !== 'ACTIVE') return { success: false, error: 'Account Deactivated.' };[span_1506](start_span)[span_1506](end_span)

  const inputHash = await hashPassword(password);[span_1507](start_span)[span_1507](end_span)

  if (inputHash !== user.passwordHash && password !== user.passwordHash && password !== user.password) {[span_1508](start_span)[span_1508](end_span)
    return { success: false, error: 'Invalid credentials provided.' };[span_1509](start_span)[span_1509](end_span)
  }[span_1510](start_span)[span_1510](end_span)

  if (inputHash !== user.passwordHash) {[span_1511](start_span)[span_1511](end_span)
    user.passwordHash = inputHash;[span_1512](start_span)[span_1512](end_span)
    delete user.password;[span_1513](start_span)[span_1513](end_span)
    await saveDB();[span_1514](start_span)[span_1514](end_span)
  }[span_1515](start_span)[span_1515](end_span)

  setCurrentUser(user);[span_1516](start_span)[span_1516](end_span)
  return { success: true, user };[span_1517](start_span)[span_1517](end_span)
};[span_1518](start_span)[span_1518](end_span)

export const logout = () => {[span_1519](start_span)[span_1519](end_span)
  setCurrentUser(null);[span_1520](start_span)[span_1520](end_span)
};[span_1521](start_span)[span_1521](end_span)
