import { getDB } from '../services/store.js';

export const getUAEISOString = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000+04:00`;
};

export const getUAEDisplayDate = () => {
    const iso = getUAEISOString();
    const [datePart, timePart] = iso.split('T');
    const [y, m, d] = datePart.split('-');
    const [hr, min, sec] = timePart.split('+')[0].split(':');
    return new Date(y, m - 1, d, hr, min, Math.floor(sec)); 
};

export const formatAmt = (value) => { 
    return (Number(value) || 0).toFixed(2); 
};

export const getVendorByCode = (code) => { 
    const db = getDB();
    if (!db) return null;
    return db.vendors.find(v => v.code.toUpperCase() === (code || '').toUpperCase()); 
};

export const getAgentName = (id) => { 
    const db = getDB();
    if (!id || !db) return 'Unassigned'; 
    const u = db.users.find(x => x.id === id); 
    return u ? `${u.name} - ${u.id}` : `Archived`; 
};
