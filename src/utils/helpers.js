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
// Add this to /src/utils/helpers.js
export const getDeficitInfo = (c) => {
    const db = getDB();
    const v = getVendorByCode(c.vendorCode);
    const autoAdjust = v ? v.autoAdjustment !== false : true;
    
    let vendorGrossCollected = 0;
    let vendorTotalDelivery = 0;
    let lp = 0;

    if (db && db.consignments) {
        db.consignments.forEach(x => {
            if (x.vendorCode === c.vendorCode) {
                vendorGrossCollected += (parseFloat(x.productAmount) || 0);
                vendorTotalDelivery += (parseFloat(x.deliveryCharge) || 0);
            }
        });
    }
    
    if (db && db.vendorPayments) {
        db.vendorPayments.forEach(p => {
            if (p.vendorCode === c.vendorCode) {
                if (p.type === 'PAID') lp += parseFloat(p.amount);
                else lp -= parseFloat(p.amount);
            }
        });
    }

    let vendorNetBalance = vendorGrossCollected - vendorTotalDelivery - lp;
    let vendorOwes = vendorNetBalance < 0 ? Math.abs(vendorNetBalance) : 0;
    
    let isDeficit = false;
    let deficitAmt = 0;
    let deductionInInvoice = c.deliveryCharge; 
    
    function getBaseDef(item) {
        let bDef = 0;
        if (item.feeType === 'CAD') {
            if (autoAdjust && item.productAmount < item.deliveryCharge) {
                bDef = item.deliveryCharge - item.productAmount;
            } else if (!autoAdjust) {
                bDef = item.deliveryCharge;
            }
        } else if (item.feeType === 'COC') {
            bDef = item.deliveryCharge;
        } else if (item.feeType === 'COD') {
            bDef = 0; 
        }
        return bDef;
    }

    let baseDeficit = getBaseDef(c);
    
    if (baseDeficit > 0) {
        if (autoAdjust) {
            if (vendorOwes > 0) {
                let uncollected = db.consignments
                    .filter(x => x.vendorCode === c.vendorCode && !x.deficitReceivedDate)
                    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
                    
                let remainingOwes = vendorOwes;
                let allocatedToThis = 0;

                for (let i = 0; i < uncollected.length; i++) {
                    let item = uncollected[i];
                    let itemBaseDef = getBaseDef(item);
                    
                    if (itemBaseDef > 0) {
                        let alloc = Math.min(itemBaseDef, remainingOwes);
                        if (item.id === c.id) {
                            allocatedToThis = alloc;
                            break;
                        }
                        remainingOwes -= alloc;
                        if (remainingOwes <= 0) break;
                    }
                }
                if (allocatedToThis > 0) {
                    isDeficit = true;
                    deficitAmt = allocatedToThis;
                }
            }
        } else {
            isDeficit = true;
            deficitAmt = baseDeficit;
        }
    }
    
    let excludeFromNet = false;
    if (!autoAdjust && c.feeType === 'CAD') {
        if (c.deficitReceivedDate) {
            deductionInInvoice = 0; 
        } else {
            deductionInInvoice = c.deliveryCharge;
            excludeFromNet = true; 
        }
    }
    
    return { isDeficit, deficitAmt, deductionInInvoice, excludeFromNet };
};
// Add to the bottom of /src/utils/helpers.js
export const closeModal = (id) => { 
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden'); 
};
