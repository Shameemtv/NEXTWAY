// /src/views/dashboard.js
import { getDB, getCurrentUser } from '../services/store.js';
import { getUAEDisplayDate, getUAEISOString, formatAmt, getVendorByCode, getAgentName } from '../utils/helpers.js';

let currentDashMode = 'DELIVERY';
let currentDashListFilter = 'ALL';

const getDashboardConsignments = (type = 'DELIVERY') => {
  const db = getDB();
  const currentUser = getCurrentUser();
  let list = [];

  if (currentUser.role === 'ADMIN') {
    const filterId = document.getElementById('adminDashAgentFilter').value || 'ALL';
    if (type === 'PICKUP') {
      list = filterId === 'ALL'
        ? db.consignments.filter(c => c.pickedUpBy || c.rtoPickupBy)
        : db.consignments.filter(c => c.pickedUpBy === filterId || c.rtoPickupBy === filterId);
    } else {
      list = filterId === 'ALL'
        ? db.consignments.filter(c => c.assignedTo || c.rtoStatus)
        : db.consignments.filter(c => c.assignedTo === filterId || c.rtoPickupBy === filterId);
    }
  } else {
    if (type === 'PICKUP') {
      list = db.consignments.filter(c => c.pickedUpBy === currentUser.id || c.rtoPickupBy === currentUser.id);
    } else {
      list = db.consignments.filter(c => c.assignedTo === currentUser.id || c.rtoPickupBy === currentUser.id);
    }
  }

  const today = getUAEISOString().split('T')[0];
  return list.filter(c => {
    if (c.rtoStatus === 'ASSIGNED' || c.rtoStatus === 'SUBMITTED_BY_AGENT') {
      return true;
    }
    if (c.rtoStatus === 'CONFIRMED') {
      const rtoDate = c.rtoConfirmedAt ? c.rtoConfirmedAt.split('T')[0] : today;
      return rtoDate === today;
    }
    if (c.status === 'Delivered') {
      const deliveredDate = c.deliveredAt ? c.deliveredAt.split('T')[0] : (c.createdAt ? c.createdAt.split('T')[0] : '');
      return deliveredDate === today;
    }
    return true;
  });
};

const formatDashDateTime = (isoStr) => {
  if (!isoStr) return '-';
  if (isoStr.includes('T')) {
    const [d, t] = isoStr.split('T');
    return `${d}<br/><span class="text-[10px]">${t.split('.')[0]}</span>`;
  }
  return isoStr;
};

export const setDashMode = (mode) => {
  currentDashMode = mode;
  ['PICKUP', 'DELIVERY', 'COD'].forEach(m => {
    const lbl = document.getElementById(`dashTabLabel-${m}`);
    const btn = lbl ? lbl.parentElement : null;
    if (lbl && btn) {
      btn.classList.toggle('bg-[var(--border-color)]', m === mode);
      btn.classList.toggle('rounded-full', m === mode);
      btn.classList.toggle('shadow-sm', m === mode);
      lbl.classList.toggle('text-[var(--text-primary)]', m === mode);
      lbl.classList.toggle('text-[var(--text-secondary)]', m !== mode);
    }
  });
  renderAgentDashboard();
};

export const renderAgentDashboard = () => {
  const currentUser = getCurrentUser();
  const db = getDB();
  if (!currentUser || !db) return;

  let headerText = '';
  if (currentUser.role === 'ADMIN') {
    const filterId = document.getElementById('adminDashAgentFilter').value || 'ALL';
    if (filterId === 'ALL') headerText = 'OVERALL DASHBOARD';
    else {
      const ag = db.users.find(u => u.id === filterId);
      headerText = ag ? `${ag.name} - ${ag.id}` : 'AGENT DASHBOARD';
    }
  } else {
    headerText = `${currentUser.name} - ${currentUser.id}`;
  }
  document.getElementById('dashAgentName').textContent = headerText;

  const now = getUAEDisplayDate();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('dashCurrentDate').textContent = `Date : ${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${now.getFullYear()}`;

  const assigned = getDashboardConsignments('DELIVERY');
  const totalDelivery = assigned.length;
  const deliveredList = assigned.filter(c => c.status === 'Delivered');
  const pendingList = assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));
  const failedList = assigned.filter(c => c.status === 'Returned');
  const rtoList = assigned.filter(c => ['ASSIGNED', 'SUBMITTED_BY_AGENT', 'CONFIRMED'].includes(c.rtoStatus));

  const delPct = totalDelivery > 0 ? Math.round((deliveredList.length / totalDelivery) * 100) : 0;
  const penPct = totalDelivery > 0 ? Math.round((pendingList.length / totalDelivery) * 100) : 0;
  const circumference = 264;

  document.getElementById('dashDeliveredPct').textContent = `${delPct}%`;
  document.getElementById('dashDeliveredCircle').style.strokeDashoffset = circumference - (delPct / 100) * circumference;

  document.getElementById('dashPendingPct').textContent = `${penPct}%`;
  document.getElementById('dashPendingCircle').style.strokeDashoffset = circumference - (penPct / 100) * circumference;

  const iconBagBlue = `<div class="w-10 h-10 rounded-full bg-[var(--status-blue-bg)] border border-[#3b82f6]/30 flex items-center justify-center text-[var(--status-blue)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`;
  const iconBagGreen = `<div class="w-10 h-10 rounded-full bg-[var(--status-emerald-bg)] border border-[#10b981]/30 flex items-center justify-center text-[var(--status-emerald)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>`;
  const iconClockYellow = `<div class="w-10 h-10 rounded-full bg-[#c9a24b]/10 border border-[#c9a24b]/30 flex items-center justify-center text-[var(--accent-gold)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5"/></svg></div>`;
  const iconCrossRed = `<div class="w-10 h-10 rounded-full bg-[var(--status-rose-bg)] border border-[#f43f5e]/30 flex items-center justify-center text-[var(--status-rose)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></div>`;
  const iconRtoBlue = `<div class="w-10 h-10 rounded-full bg-[var(--status-blue-bg)] border border-[#3b82f6]/30 flex items-center justify-center text-[var(--status-blue)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></div>`;

  const grid = document.getElementById('dashCardsGrid');

  if (currentDashMode === 'DELIVERY') {
    grid.innerHTML = `
      <div onclick="openDashList('TOTAL_DELIVERY')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconBagBlue}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Total Delivery</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${totalDelivery}</p>
      </div>
      <div onclick="openDashList('DELIVERED')" class="cursor-pointer ql-card p-5 hover:border-[var(--status-emerald)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconBagGreen}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Delivered</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${deliveredList.length}</p>
      </div>
      <div onclick="openDashList('PENDING')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconClockYellow}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Pending</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${pendingList.length}</p>
      </div>
      <div onclick="openDashList('FAILED')" class="cursor-pointer ql-card p-5 hover:border-[var(--status-rose)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconCrossRed}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Failed</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${failedList.length}</p>
      </div>
      <div onclick="openDashList('RTO')" class="col-span-2 cursor-pointer ql-card p-5 hover:border-[var(--status-blue)] transition-colors flex items-center justify-between min-h-[100px]">
        <div class="flex items-center gap-3">${iconRtoBlue}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">RTO</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] tabular-nums">${rtoList.length}</p>
      </div>
    `;
  } else if (currentDashMode === 'PICKUP') {
    const pickups = getDashboardConsignments('PICKUP');
    grid.innerHTML = `
      <div onclick="openDashList('PICKUP_TOTAL')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconBagBlue}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Total Pickups</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${pickups.length}</p>
      </div>
      <div onclick="openDashList('PICKUP_COLLECTED')" class="cursor-pointer ql-card p-5 hover:border-[var(--status-emerald)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconBagGreen}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Collected</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${pickups.filter(c => ['Picked Up', 'Out for delivery', 'Delivered'].includes(c.status)).length}</p>
      </div>
      <div onclick="openDashList('PICKUP_PENDING')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconClockYellow}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Pending</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${pickups.filter(c => ['Created', 'Assigned'].includes(c.status)).length}</p>
      </div>
      <div onclick="openDashList('PICKUP_FAILED')" class="cursor-pointer ql-card p-5 hover:border-[var(--status-rose)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconCrossRed}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Failed</span></div>
        <p class="text-right font-black text-2xl text-[var(--text-primary)] mt-3 tabular-nums">${pickups.filter(c => c.status === 'Returned').length}</p>
      </div>
    `;
  } else if (currentDashMode === 'COD') {
    const sumAmt = arr => arr.reduce((sum, c) => {
      const baseAmt = Number(c.productAmount) || 0;
      const delCharge = Number(c.deliveryCharge) || 0;
      return sum + (c.feeType === 'COD' ? baseAmt + delCharge : baseAmt);
    }, 0);
    grid.innerHTML = `
      <div onclick="openDashAnalysis('COD_TOTAL')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconBagBlue}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Total COD</span></div>
        <p class="text-right font-black text-[18px] text-[var(--text-primary)] mt-3 tabular-nums">${formatAmt(sumAmt(assigned))} <span class="text-xs">د.إ</span></p>
      </div>
      <div onclick="openDashAnalysis('COD_COLLECTED')" class="cursor-pointer ql-card p-5 hover:border-[var(--status-emerald)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconBagGreen}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Collected</span></div>
        <p class="text-right font-black text-[18px] text-[var(--text-primary)] mt-3 tabular-nums">${formatAmt(sumAmt(deliveredList))} <span class="text-xs">د.إ</span></p>
      </div>
      <div onclick="openDashAnalysis('COD_PENDING')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconClockYellow}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Pending</span></div>
        <p class="text-right font-black text-[18px] text-[var(--text-primary)] mt-3 tabular-nums">${formatAmt(sumAmt(pendingList))} <span class="text-xs">د.إ</span></p>
      </div>
      <div onclick="openDashAnalysis('COD_FAILED')" class="cursor-pointer ql-card p-5 hover:border-[var(--status-rose)] transition-colors flex flex-col justify-between min-h-[120px]">
        <div class="flex items-center gap-3">${iconCrossRed}<span class="font-extrabold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Failed</span></div>
        <p class="text-right font-black text-[18px] text-[var(--text-primary)] mt-3 tabular-nums">${formatAmt(sumAmt(failedList))} <span class="text-xs">د.إ</span></p>
      </div>
    `;
  }
};

export const closeDashSubScreen = () => {
  document.getElementById('dashAnalysisScreen').classList.add('hidden');
  document.getElementById('dashListScreen').classList.add('hidden');
  document.getElementById('dashMainScreen').classList.remove('hidden');
};

export const openDashAnalysis = (type) => {
  document.getElementById('dashMainScreen').classList.add('hidden');
  document.getElementById('dashListScreen').classList.add('hidden');
  document.getElementById('dashAnalysisScreen').classList.remove('hidden');

  const assigned = getDashboardConsignments('DELIVERY');
  const heading = document.getElementById('dashAnalysisHeading');
  const thead = document.getElementById('dashAnalysisThead');
  const tbody = document.getElementById('dashAnalysisTbody');

  if (type === 'DELIVERED_ANALYSIS' || type === 'PENDING_ANALYSIS') {
    const isDel = type === 'DELIVERED_ANALYSIS';
    heading.textContent = isDel ? 'Delivery Analysis' : 'Pending Delivery Analysis';
    const rows = isDel
      ? assigned.filter(c => c.status === 'Delivered')
      : assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));

    thead.innerHTML = `<tr><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">#</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">AWB Number</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Merchant</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Status</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Date Time</th></tr>`;
    tbody.innerHTML = rows.length ? rows.map((c, idx) => {
      const v = getVendorByCode(c.vendorCode);
      return `<tr class="hover:bg-[var(--bg-base)] transition-colors"><td class="p-4 font-bold text-[var(--text-primary)]">${idx + 1}</td><td class="p-4 font-black text-[var(--text-primary)]">${c.id}</td><td class="p-4 font-bold uppercase text-[var(--text-secondary)]">${v ? v.name : c.vendorCode}</td><td class="p-4 lowercase font-bold text-[var(--text-muted)]">${c.status}</td><td class="p-4 leading-tight font-bold text-[var(--text-secondary)] whitespace-nowrap">${formatDashDateTime(c.deliveredAt || c.pickedUpAt || c.createdAt)}</td></tr>`;
    }).join('') : `<tr><td colspan="5" class="p-8 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">No records found.</td></tr>`;
  } else {
    heading.textContent = 'COD Analysis';
    let rows = assigned;
    if (type === 'COD_COLLECTED') rows = assigned.filter(c => c.status === 'Delivered');
    else if (type === 'COD_PENDING') rows = assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));
    else if (type === 'COD_FAILED') rows = assigned.filter(c => c.status === 'Returned');

    thead.innerHTML = `<tr><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">#</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">AWB Number</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Merchant</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold text-right">Collect</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold text-right">Received</th></tr>`;
    tbody.innerHTML = rows.length ? rows.map((c, idx) => {
      const v = getVendorByCode(c.vendorCode);
      const baseAmt = Number(c.productAmount) || 0;
      const delCharge = Number(c.deliveryCharge) || 0;
      const collectAmt = c.feeType === 'COD' ? (baseAmt + delCharge) : baseAmt;
      const receivedAmt = c.status === 'Delivered' ? collectAmt : 0;
      return `<tr class="hover:bg-[var(--bg-base)] transition-colors"><td class="p-4 font-bold text-[var(--text-primary)]">${idx + 1}</td><td class="p-4 font-black text-[var(--text-primary)]">${c.id}</td><td class="p-4 font-bold uppercase text-[var(--text-secondary)]">${v ? v.name : c.vendorCode}</td><td class="p-4 font-black text-[var(--text-primary)] text-right">${collectAmt}</td><td class="p-4 font-black text-[var(--text-primary)] text-right">${formatAmt(receivedAmt)}</td></tr>`;
    }).join('') : `<tr><td colspan="5" class="p-8 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">No records found.</td></tr>`;
  }
};

export const openDashList = (filterType) => {
  currentDashListFilter = filterType;
  document.getElementById('dashMainScreen').classList.add('hidden');
  document.getElementById('dashAnalysisScreen').classList.add('hidden');
  document.getElementById('dashListScreen').classList.remove('hidden');
  document.getElementById('dashListSearchInput').value = '';

  const headings = {
    'TOTAL_DELIVERY': 'Total Delivery List',
    'DELIVERED': 'Delivered List',
    'PENDING': 'Pending Delivery List',
    'FAILED': 'Failed List',
    'RTO': 'RTO List',
    'PICKUP_TOTAL': 'Total Pickups List',
    'PICKUP_COLLECTED': 'Collected List',
    'PICKUP_PENDING': 'Pending Pickups List',
    'PICKUP_FAILED': 'Failed Pickups List'
  };
  document.getElementById('dashListHeading').textContent = headings[filterType] || 'Delivery List';
  renderDashListItems();
};

export const renderDashListItems = () => {
  const q = (document.getElementById('dashListSearchInput').value || '').trim().toLowerCase();
  let list = [];

  if (currentDashListFilter.startsWith('PICKUP_')) {
    const pickups = getDashboardConsignments('PICKUP');
    if (currentDashListFilter === 'PICKUP_TOTAL') list = pickups;
    else if (currentDashListFilter === 'PICKUP_COLLECTED') list = pickups.filter(c => ['Picked Up', 'Out for delivery', 'Delivered'].includes(c.status));
    else if (currentDashListFilter === 'PICKUP_PENDING') list = pickups.filter(c => ['Created', 'Assigned'].includes(c.status));
    else if (currentDashListFilter === 'PICKUP_FAILED') list = pickups.filter(c => c.status === 'Returned');
  } else {
    const assigned = getDashboardConsignments('DELIVERY');
    if (currentDashListFilter === 'TOTAL_DELIVERY') list = assigned;
    else if (currentDashListFilter === 'DELIVERED') list = assigned.filter(c => c.status === 'Delivered');
    else if (currentDashListFilter === 'PENDING') list = assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));
    else if (currentDashListFilter === 'FAILED') list = assigned.filter(c => c.status === 'Returned');
    else if (currentDashListFilter === 'RTO') list = assigned.filter(c => ['ASSIGNED', 'SUBMITTED_BY_AGENT', 'CONFIRMED'].includes(c.rtoStatus));
  }

  if (q) list = list.filter(c => `${c.id} ${c.customerName} ${c.customerPhone}`.toLowerCase().includes(q));

  const container = document.getElementById('dashListContainer');
  if (list.length === 0) {
    container.innerHTML = `<div class="ql-card p-10 text-center text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest">No consignments found.</div>`;
    return;
  }

  const currentUser = getCurrentUser();
  const isAgent = currentUser && currentUser.role === 'AGENT';

  container.innerHTML = list.map((c, idx) => {
    const v = getVendorByCode(c.vendorCode);
    const vendorName = v ? v.name : c.vendorCode;
    const baseAmt = Number(c.productAmount) || 0;
    const delCharge = Number(c.deliveryCharge) || 0;
    const collectAmt = c.feeType === 'COD' ? (baseAmt + delCharge) : baseAmt;
    const waMessage = `Dear Customer,\nYour Shipment RefNo: *${c.id}*\n(From : *${vendorName}*),is on the way for delivery.\nAmount: Aed *${formatAmt(collectAmt)}*`;
    const cleanPhone = (c.customerPhone || '').replace(/[^0-9]/g, '');

    if (currentDashListFilter === 'PENDING' && isAgent) {
      return `
        <div onclick="window.showConsignmentDetails('${c.id}')" class="cursor-pointer ql-card p-4 sm:p-5 hover:border-[var(--accent-gold)] transition-colors space-y-3 text-xs">
          <div class="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-1">
            <button onclick="event.stopPropagation(); window.openPodScreen('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all tracking-widest text-[10px] uppercase border border-[#1e293b]">Start</button>
            <div class="flex items-center gap-3">
              <span class="font-black text-[var(--text-primary)] text-sm tracking-widest uppercase">${c.id}</span>
              <span class="w-6 h-6 rounded-full bg-[var(--bg-base)] border border-[var(--border-color-strong)] text-[var(--text-primary)] font-black text-[10px] flex items-center justify-center shadow-sm tabular-nums">${idx + 1}</span>
            </div>
          </div>

          <div class="flex justify-between items-end gap-3">
            <div class="flex-1 space-y-2.5 min-w-0">
              <p class="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[11px]">${c.customerName}</p>
              <div class="flex items-center">
                <span class="uppercase text-[10px] tracking-wider text-[var(--text-muted)] w-14 shrink-0">Loc</span>
                <span class="font-bold text-[var(--text-primary)] truncate">${c.deliveryAddress || ''}</span>
              </div>
              <div class="flex items-center">
                <span class="uppercase text-[10px] tracking-wider text-[var(--text-muted)] w-14 shrink-0">Pcs</span>
                <span class="font-bold text-[var(--text-primary)] tabular-nums">${c.pieces || 1}</span>
              </div>
              <div class="flex items-center">
                <span class="uppercase text-[10px] tracking-wider text-[var(--text-muted)] w-14 shrink-0">Mob</span>
                <span class="font-bold text-[var(--text-primary)] tabular-nums">${c.customerPhone || ''}</span>
              </div>
              <div class="flex items-center">
                <span class="uppercase text-[10px] tracking-wider text-[var(--text-muted)] w-14 shrink-0">Shipper</span>
                <span class="font-bold text-[var(--text-primary)] uppercase truncate">${vendorName}</span>
              </div>
            </div>

            <div class="flex flex-col gap-3 shrink-0">
              <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}" target="_blank" onclick="event.stopPropagation()" class="w-10 h-10 rounded-full bg-[#0b0f19] border border-[#1e293b] text-[var(--accent-gold)] flex items-center justify-center shadow-[var(--shadow-elevated)] hover:scale-110 transition-transform" title="WhatsApp">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.128.552 4.195 1.6 6.02L.015 24l6.104-1.592c1.748.956 3.715 1.464 5.912 1.464 6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.874c-1.802 0-3.565-.483-5.111-1.398l-.366-.217-3.8.992.992-3.801-.238-.378c-.997-1.583-1.523-3.411-1.523-5.253 0-5.467 4.45-9.917 9.916-9.917 5.467 0 9.917 4.45 9.917 9.917s-4.45 9.917-9.917 9.917zm5.442-7.44c-.298-.15-1.765-.871-2.037-.971-.272-.1-.472-.15-.671.15-.199.3-.77 1.018-.944 1.218-.174.2-.348.25-.646.1-1.258-.636-2.316-1.29-3.238-2.613-.238-.344.238-.328.665-1.182.1-.2.05-.375-.025-.525-.075-.15-.671-1.618-.921-2.218-.242-.582-.487-.503-.671-.513-.174-.01-.374-.01-.573-.01-.199 0-.522.075-.796.375-.273.3-1.044 1.022-1.044 2.493s1.07 2.892 1.219 3.092c.15.2 2.11 3.22 5.11 4.515.714.308 1.27.492 1.706.63.717.228 1.368.196 1.884.119.58-.087 1.765-.722 2.014-1.422.249-.7.249-1.3.174-1.422-.075-.122-.274-.197-.573-.347z"/></svg>
              </a>
              <a href="tel:${c.customerPhone || ''}" onclick="event.stopPropagation()" class="w-10 h-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-color-strong)] text-[var(--text-primary)] flex items-center justify-center shadow-sm hover:scale-110 transition-transform" title="Call">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </a>
            </div>
          </div>
        </div>
      `;
    }

    const canSubmitRto = c.rtoStatus === 'ASSIGNED' && (currentUser.role === 'AGENT' ? c.rtoPickupBy === currentUser.id : currentUser.role === 'ADMIN');
    const rtoBadge = c.rtoStatus
      ? `<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--status-blue-bg)] text-[var(--status-blue)] border border-[#3b82f6]/20">${c.rtoStatus.replace(/_/g, ' ')}</span>`
      : '';

    return `
      <div onclick="window.showConsignmentDetails('${c.id}')" class="cursor-pointer ql-card p-5 hover:border-[var(--accent-gold)] transition-colors space-y-3 text-xs mb-3">
        <div class="flex justify-between items-center gap-3">
          <div class="flex items-center gap-2">
            ${rtoBadge}
            ${canSubmitRto ? `<button onclick="event.stopPropagation(); window.submitRtoToOwner('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest border border-[#1e293b] shadow-sm">Submit</button>` : ''}
          </div>
          <div class="flex items-center gap-3">
            <span class="font-black text-sm text-[var(--text-primary)] tracking-widest uppercase">${c.id}</span>
            <span class="w-7 h-7 rounded-full bg-[var(--bg-base)] border border-[var(--border-color-strong)] text-[var(--text-primary)] font-black text-[10px] flex items-center justify-center shadow-sm tabular-nums">${idx + 1}</span>
          </div>
        </div>
        <p class="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-[11px]">${c.customerName}</p>
        <div class="flex justify-between items-center pt-2 font-bold text-[var(--text-primary)]">
          <span class="uppercase text-[10px] tracking-wider text-[var(--text-muted)]">Shipper: <span class="text-[var(--text-primary)] font-bold ml-1 uppercase">${vendorName}</span></span>
          <span class="uppercase text-[10px] tracking-wider text-[var(--text-muted)]">Mob <span class="text-[var(--text-primary)] font-bold ml-1 tabular-nums">${c.customerPhone || ''}</span></span>
        </div>
        ${c.rtoPickupBy ? `<p class="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">RTO Pickup Person: <span class="text-[var(--text-primary)]">${getAgentName(c.rtoPickupBy)}</span></p>` : ''}
      </div>
    `;
  }).join('');
};
