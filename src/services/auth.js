// /src/services/auth.js
import { getDB, setCurrentUser, saveDB } from './store.js';

export const hashPassword = async (plain) => {
  const text = plain + '_NEXTWAY_SALT';
  if (window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
};

export const login = async (username, password) => {
  const db = getDB();
  if (!db || !db.users) throw new Error('Database not initialized');

  const user = db.users.find(
    u => u && typeof u.username === 'string' && u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) return { success: false, error: 'Invalid credentials provided.' };
  if (user.status !== 'ACTIVE') return { success: false, error: 'Account Deactivated.' };

  const inputHash = await hashPassword(password);

  if (inputHash !== user.passwordHash && password !== user.passwordHash && password !== user.password) {
    return { success: false, error: 'Invalid credentials provided.' };
  }

  if (inputHash !== user.passwordHash) {
    user.passwordHash = inputHash;
    delete user.password;
    await saveDB();
  }

  setCurrentUser(user);
  return { success: true, user };
};

export const logout = () => {
  setCurrentUser(null);
};
