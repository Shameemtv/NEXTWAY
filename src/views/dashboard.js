// /src/views/dashboard.js
import { getDB, getCurrentUser } from '../services/store.js';[span_90](start_span)[span_90](end_span)
import { getUAEDisplayDate, getUAEISOString, formatAmt, getVendorByCode, getAgentName } from '../utils/helpers.js';[span_91](start_span)[span_91](end_span)[span_92](start_span)[span_92](end_span)

let currentDashMode = 'DELIVERY';[span_93](start_span)[span_93](end_span)
let currentDashListFilter = 'ALL';[span_94](start_span)[span_94](end_span)

const getDashboardConsignments = (type = 'DELIVERY') => {[span_95](start_span)[span_95](end_span)
  const db = getDB();[span_96](start_span)[span_96](end_span)
  const currentUser = getCurrentUser();[span_97](start_span)[span_97](end_span)
  let list = [];[span_98](start_span)[span_98](end_span)

  if (currentUser.role === 'ADMIN') {[span_99](start_span)[span_99](end_span)
    const filterId = document.getElementById('adminDashAgentFilter').value || 'ALL';[span_100](start_span)[span_100](end_span)
    if (type === 'PICKUP') {
      list = filterId === 'ALL'
        ? db.consignments.filter(c => c.pickedUpBy || c.rtoPickupBy)
        : db.consignments.filter(c => c.pickedUpBy === filterId || c.rtoPickupBy === filterId);
    } else {
      list = filterId === 'ALL'
        ? db.consignments.filter(c => c.assignedTo || c.rtoStatus)
        : db.consignments.filter(c => c.assignedTo === filterId || c.rtoPickupBy === filterId);
    }
  } else {[span_101](start_span)[span_101](end_span)
    if (type === 'PICKUP') {
      list = db.consignments.filter(c => c.pickedUpBy === currentUser.id || c.rtoPickupBy === currentUser.id);
    } else {
      list = db.consignments.filter(c => c.assignedTo === currentUser.id || c.rtoPickupBy === currentUser.id);
    }
  }[span_102](start_span)[span_102](end_span)

  const today = getUAEISOString().split('T')[0];[span_103](start_span)[span_103](end_span)
  return list.filter(c => {[span_104](start_span)[span_104](end_span)
    if (c.rtoStatus === 'ASSIGNED' || c.rtoStatus === 'SUBMITTED_BY_AGENT') {
      return true;
    }
    if (c.rtoStatus === 'CONFIRMED') {
      const rtoDate = c.rtoConfirmedAt ? c.rtoConfirmedAt.split('T')[0] : today;
      return rtoDate === today;
    }
    if (c.status === 'Delivered') {[span_105](start_span)[span_105](end_span)
      const deliveredDate = c.deliveredAt ? c.deliveredAt.split('T')[0] : (c.createdAt ? c.createdAt.split('T')[0] : '');[span_106](start_span)[span_106](end_span)
      return deliveredDate === today;[span_107](start_span)[span_107](end_span)
    }[span_108](start_span)[span_108](end_span)
    return true;[span_109](start_span)[span_109](end_span)
  });[span_110](start_span)[span_110](end_span)
};[span_111](start_span)[span_111](end_span)

const formatDashDateTime = (isoStr) => {[span_112](start_span)[span_112](end_span)
  if (!isoStr) return '-';[span_113](start_span)[span_113](end_span)
  if (isoStr.includes('T')) {[span_114](start_span)[span_114](end_span)
    const [d, t] = isoStr.split('T');[span_115](start_span)[span_115](end_span)
    return `${d}<br/><span class="text-[10px]">${t.split('.')[0]}</span>`;[span_116](start_span)[span_116](end_span)
  }[span_117](start_span)[span_117](end_span)
  return isoStr;[span_118](start_span)[span_118](end_span)
};[span_119](start_span)[span_119](end_span)

export const setDashMode = (mode) => {[span_120](start_span)[span_120](end_span)
  currentDashMode = mode;[span_121](start_span)[span_121](end_span)
  ['PICKUP', 'DELIVERY', 'COD'].forEach(m => {[span_122](start_span)[span_122](end_span)
    const lbl = document.getElementById(`dashTabLabel-${m}`);[span_123](start_span)[span_123](end_span)
    const btn = lbl ? lbl.parentElement : null;[span_124](start_span)[span_124](end_span)
    if (lbl && btn) {[span_125](start_span)[span_125](end_span)
      btn.classList.toggle('bg-[var(--border-color)]', m === mode);[span_126](start_span)[span_126](end_span)
      btn.classList.toggle('rounded-full', m === mode);[span_127](start_span)[span_127](end_span)
      btn.classList.toggle('shadow-sm', m === mode);[span_128](start_span)[span_128](end_span)
      lbl.classList.toggle('text-[var(--text-primary)]', m === mode);[span_129](start_span)[span_129](end_span)
      lbl.classList.toggle('text-[var(--text-secondary)]', m !== mode);[span_130](start_span)[span_130](end_span)
    }[span_131](start_span)[span_131](end_span)
  });[span_132](start_span)[span_132](end_span)
  renderAgentDashboard();[span_133](start_span)[span_133](end_span)
};[span_134](start_span)[span_134](end_span)

export const renderAgentDashboard = () => {[span_135](start_span)[span_135](end_span)
  const currentUser = getCurrentUser();[span_136](start_span)[span_136](end_span)
  const db = getDB();[span_137](start_span)[span_137](end_span)
  if (!currentUser || !db) return;[span_138](start_span)[span_138](end_span)

  let headerText = '';[span_139](start_span)[span_139](end_span)
  if (currentUser.role === 'ADMIN') {[span_140](start_span)[span_140](end_span)
    const filterId = document.getElementById('adminDashAgentFilter').value || 'ALL';[span_141](start_span)[span_141](end_span)
    if (filterId === 'ALL') headerText = 'OVERALL DASHBOARD';[span_142](start_span)[span_142](end_span)
    else {[span_143](start_span)[span_143](end_span)
      const ag = db.users.find(u => u.id === filterId);[span_144](start_span)[span_144](end_span)
      headerText = ag ? `${ag.name} - ${ag.id}` : 'AGENT DASHBOARD';[span_145](start_span)[span_145](end_span)
    }[span_146](start_span)[span_146](end_span)
  } else {[span_147](start_span)[span_147](end_span)
    headerText = `${currentUser.name} - ${currentUser.id}`;[span_148](start_span)[span_148](end_span)
  }[span_149](start_span)[span_149](end_span)
  document.getElementById('dashAgentName').textContent = headerText;[span_150](start_span)[span_150](end_span)

  const now = getUAEDisplayDate();[span_151](start_span)[span_151](end_span)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];[span_152](start_span)[span_152](end_span)
  document.getElementById('dashCurrentDate').textContent = `Date : ${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${now.getFullYear()}`;[span_153](start_span)[span_153](end_span)

  const assigned = getDashboardConsignments('DELIVERY');[span_154](start_span)[span_154](end_span)
  const totalDelivery = assigned.length;[span_155](start_span)[span_155](end_span)
  const deliveredList = assigned.filter(c => c.status === 'Delivered');[span_156](start_span)[span_156](end_span)
  const pendingList = assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));[span_157](start_span)[span_157](end_span)
  const failedList = assigned.filter(c => c.status === 'Returned');[span_158](start_span)[span_158](end_span)
  const rtoList = assigned.filter(c => ['ASSIGNED', 'SUBMITTED_BY_AGENT', 'CONFIRMED'].includes(c.rtoStatus));

  const delPct = totalDelivery > 0 ? Math.round((deliveredList.length / totalDelivery) * 100) : 0;[span_159](start_span)[span_159](end_span)
  const penPct = totalDelivery > 0 ? Math.round((pendingList.length / totalDelivery) * 100) : 0;[span_160](start_span)[span_160](end_span)
  const circumference = 264;[span_161](start_span)[span_161](end_span)

  document.getElementById('dashDeliveredPct').textContent = `${delPct}%`;[span_162](start_span)[span_162](end_span)
  document.getElementById('dashDeliveredCircle').style.strokeDashoffset = circumference - (delPct / 100) * circumference;[span_163](start_span)[span_163](end_span)

  document.getElementById('dashPendingPct').textContent = `${penPct}%`;[span_164](start_span)[span_164](end_span)
  document.getElementById('dashPendingCircle').style.strokeDashoffset = circumference - (penPct / 100) * circumference;[span_165](start_span)[span_165](end_span)

  const iconBagBlue = `<div class="w-10 h-10 rounded-full bg-[var(--status-blue-bg)] border border-[#3b82f6]/30 flex items-center justify-center text-[var(--status-blue)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`;[span_166](start_span)[span_166](end_span)
  const iconBagGreen = `<div class="w-10 h-10 rounded-full bg-[var(--status-emerald-bg)] border border-[#10b981]/30 flex items-center justify-center text-[var(--status-emerald)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>`;[span_167](start_span)[span_167](end_span)
  const iconClockYellow = `<div class="w-10 h-10 rounded-full bg-[#c9a24b]/10 border border-[#c9a24b]/30 flex items-center justify-center text-[var(--accent-gold)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5"/></svg></div>`;[span_168](start_span)[span_168](end_span)
  const iconCrossRed = `<div class="w-10 h-10 rounded-full bg-[var(--status-rose-bg)] border border-[#f43f5e]/30 flex items-center justify-center text-[var(--status-rose)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></div>`;[span_169](start_span)[span_169](end_span)
  const iconRtoBlue = `<div class="w-10 h-10 rounded-full bg-[var(--status-blue-bg)] border border-[#3b82f6]/30 flex items-center justify-center text-[var(--status-blue)] shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></div>`;

  const grid = document.getElementById('dashCardsGrid');[span_170](start_span)[span_170](end_span)

  if (currentDashMode === 'DELIVERY') {[span_171](start_span)[span_171](end_span)
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
    `;[span_172](start_span)[span_172](end_span)
  } else if (currentDashMode === 'PICKUP') {[span_173](start_span)[span_173](end_span)
    const pickups = getDashboardConsignments('PICKUP');[span_174](start_span)[span_174](end_span)
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
    `;[span_175](start_span)[span_175](end_span)
  } else if (currentDashMode === 'COD') {[span_176](start_span)[span_176](end_span)
    const sumAmt = arr => arr.reduce((sum, c) => {[span_177](start_span)[span_177](end_span)
      const baseAmt = Number(c.productAmount) || 0;[span_178](start_span)[span_178](end_span)
      const delCharge = Number(c.deliveryCharge) || 0;[span_179](start_span)[span_179](end_span)
      return sum + (c.feeType === 'COD' ? baseAmt + delCharge : baseAmt);[span_180](start_span)[span_180](end_span)
    }, 0);[span_181](start_span)[span_181](end_span)
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
    `;[span_182](start_span)[span_182](end_span)
  }[span_183](start_span)[span_183](end_span)
};[span_184](start_span)[span_184](end_span)

export const closeDashSubScreen = () => {[span_185](start_span)[span_185](end_span)
  document.getElementById('dashAnalysisScreen').classList.add('hidden');[span_186](start_span)[span_186](end_span)
  document.getElementById('dashListScreen').classList.add('hidden');[span_187](start_span)[span_187](end_span)
  document.getElementById('dashMainScreen').classList.remove('hidden');[span_188](start_span)[span_188](end_span)
};[span_189](start_span)[span_189](end_span)

export const openDashAnalysis = (type) => {[span_190](start_span)[span_190](end_span)
  document.getElementById('dashMainScreen').classList.add('hidden');[span_191](start_span)[span_191](end_span)
  document.getElementById('dashListScreen').classList.add('hidden');[span_192](start_span)[span_192](end_span)
  document.getElementById('dashAnalysisScreen').classList.remove('hidden');[span_193](start_span)[span_193](end_span)

  const assigned = getDashboardConsignments('DELIVERY');[span_194](start_span)[span_194](end_span)
  const heading = document.getElementById('dashAnalysisHeading');[span_195](start_span)[span_195](end_span)
  const thead = document.getElementById('dashAnalysisThead');[span_196](start_span)[span_196](end_span)
  const tbody = document.getElementById('dashAnalysisTbody');[span_197](start_span)[span_197](end_span)

  if (type === 'DELIVERED_ANALYSIS' || type === 'PENDING_ANALYSIS') {[span_198](start_span)[span_198](end_span)
    const isDel = type === 'DELIVERED_ANALYSIS';[span_199](start_span)[span_199](end_span)
    heading.textContent = isDel ? 'Delivery Analysis' : 'Pending Delivery Analysis';[span_200](start_span)[span_200](end_span)
    const rows = isDel[span_201](start_span)[span_201](end_span)
      ? assigned.filter(c => c.status === 'Delivered')[span_202](start_span)[span_202](end_span)
      : assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));[span_203](start_span)[span_203](end_span)

    thead.innerHTML = `<tr><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">#</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">AWB Number</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Merchant</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Status</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Date Time</th></tr>`;[span_204](start_span)[span_204](end_span)
    tbody.innerHTML = rows.length ? rows.map((c, idx) => {[span_205](start_span)[span_205](end_span)
      const v = getVendorByCode(c.vendorCode);[span_206](start_span)[span_206](end_span)
      return `<tr class="hover:bg-[var(--bg-base)] transition-colors"><td class="p-4 font-bold text-[var(--text-primary)]">${idx + 1}</td><td class="p-4 font-black text-[var(--text-primary)]">${c.id}</td><td class="p-4 font-bold uppercase text-[var(--text-secondary)]">${v ? v.name : c.vendorCode}</td><td class="p-4 lowercase font-bold text-[var(--text-muted)]">${c.status}</td><td class="p-4 leading-tight font-bold text-[var(--text-secondary)] whitespace-nowrap">${formatDashDateTime(c.deliveredAt || c.pickedUpAt || c.createdAt)}</td></tr>`;[span_207](start_span)[span_207](end_span)
    }).join('') : `<tr><td colspan="5" class="p-8 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">No records found.</td></tr>`;[span_208](start_span)[span_208](end_span)
  } else {[span_209](start_span)[span_209](end_span)
    heading.textContent = 'COD Analysis';[span_210](start_span)[span_210](end_span)
    let rows = assigned;[span_211](start_span)[span_211](end_span)
    if (type === 'COD_COLLECTED') rows = assigned.filter(c => c.status === 'Delivered');[span_212](start_span)[span_212](end_span)
    else if (type === 'COD_PENDING') rows = assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));[span_213](start_span)[span_213](end_span)
    else if (type === 'COD_FAILED') rows = assigned.filter(c => c.status === 'Returned');[span_214](start_span)[span_214](end_span)

    thead.innerHTML = `<tr><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">#</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">AWB Number</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold">Merchant</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold text-right">Collect</th><th class="p-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-extrabold text-right">Received</th></tr>`;[span_215](start_span)[span_215](end_span)
    tbody.innerHTML = rows.length ? rows.map((c, idx) => {[span_216](start_span)[span_216](end_span)
      const v = getVendorByCode(c.vendorCode);[span_217](start_span)[span_217](end_span)
      const baseAmt = Number(c.productAmount) || 0;[span_218](start_span)[span_218](end_span)
      const delCharge = Number(c.deliveryCharge) || 0;[span_219](start_span)[span_219](end_span)
      const collectAmt = c.feeType === 'COD' ? (baseAmt + delCharge) : baseAmt;[span_220](start_span)[span_220](end_span)
      const receivedAmt = c.status === 'Delivered' ? collectAmt : 0;[span_221](start_span)[span_221](end_span)
      return `<tr class="hover:bg-[var(--bg-base)] transition-colors"><td class="p-4 font-bold text-[var(--text-primary)]">${idx + 1}</td><td class="p-4 font-black text-[var(--text-primary)]">${c.id}</td><td class="p-4 font-bold uppercase text-[var(--text-secondary)]">${v ? v.name : c.vendorCode}</td><td class="p-4 font-black text-[var(--text-primary)] text-right">${collectAmt}</td><td class="p-4 font-black text-[var(--text-primary)] text-right">${formatAmt(receivedAmt)}</td></tr>`;[span_222](start_span)[span_222](end_span)
    }).join('') : `<tr><td colspan="5" class="p-8 text-center text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">No records found.</td></tr>`;[span_223](start_span)[span_223](end_span)
  }[span_224](start_span)[span_224](end_span)
};[span_225](start_span)[span_225](end_span)

export const openDashList = (filterType) => {[span_226](start_span)[span_226](end_span)
  currentDashListFilter = filterType;[span_227](start_span)[span_227](end_span)
  document.getElementById('dashMainScreen').classList.add('hidden');[span_228](start_span)[span_228](end_span)
  document.getElementById('dashAnalysisScreen').classList.add('hidden');[span_229](start_span)[span_229](end_span)
  document.getElementById('dashListScreen').classList.remove('hidden');[span_230](start_span)[span_230](end_span)
  document.getElementById('dashListSearchInput').value = '';[span_231](start_span)[span_231](end_span)

  const headings = {[span_232](start_span)[span_232](end_span)
    'TOTAL_DELIVERY': 'Total Delivery List',[span_233](start_span)[span_233](end_span)
    'DELIVERED': 'Delivered List',[span_234](start_span)[span_234](end_span)
    'PENDING': 'Pending Delivery List',[span_235](start_span)[span_235](end_span)
    'FAILED': 'Failed List',[span_236](start_span)[span_236](end_span)
    'RTO': 'RTO List',
    'PICKUP_TOTAL': 'Total Pickups List',[span_237](start_span)[span_237](end_span)
    'PICKUP_COLLECTED': 'Collected List',[span_238](start_span)[span_238](end_span)
    'PICKUP_PENDING': 'Pending Pickups List',[span_239](start_span)[span_239](end_span)
    'PICKUP_FAILED': 'Failed Pickups List[span_240](start_span)'[span_240](end_span)
  };[span_241](start_span)[span_241](end_span)
  document.getElementById('dashListHeading').textContent = headings[filterType] || 'Delivery List';[span_242](start_span)[span_242](end_span)
  renderDashListItems();[span_243](start_span)[span_243](end_span)
};[span_244](start_span)[span_244](end_span)

export const renderDashListItems = () => {[span_245](start_span)[span_245](end_span)
  const q = (document.getElementById('dashListSearchInput').value || '').trim().toLowerCase();[span_246](start_span)[span_246](end_span)
  let list = [];[span_247](start_span)[span_247](end_span)

  if (currentDashListFilter.startsWith('PICKUP_')) {[span_248](start_span)[span_248](end_span)
    const pickups = getDashboardConsignments('PICKUP');[span_249](start_span)[span_249](end_span)
    if (currentDashListFilter === 'PICKUP_TOTAL') list = pickups;[span_250](start_span)[span_250](end_span)
    else if (currentDashListFilter === 'PICKUP_COLLECTED') list = pickups.filter(c => ['Picked Up', 'Out for delivery', 'Delivered'].includes(c.status));[span_251](start_span)[span_251](end_span)
    else if (currentDashListFilter === 'PICKUP_PENDING') list = pickups.filter(c => ['Created', 'Assigned'].includes(c.status));[span_252](start_span)[span_252](end_span)
    else if (currentDashListFilter === 'PICKUP_FAILED') list = pickups.filter(c => c.status === 'Returned');[span_253](start_span)[span_253](end_span)
  } else {[span_254](start_span)[span_254](end_span)
    const assigned = getDashboardConsignments('DELIVERY');[span_255](start_span)[span_255](end_span)
    if (currentDashListFilter === 'TOTAL_DELIVERY') list = assigned;[span_256](start_span)[span_256](end_span)
    else if (currentDashListFilter === 'DELIVERED') list = assigned.filter(c => c.status === 'Delivered');[span_257](start_span)[span_257](end_span)
    else if (currentDashListFilter === 'PENDING') list = assigned.filter(c => ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status));[span_258](start_span)[span_258](end_span)
    else if (currentDashListFilter === 'FAILED') list = assigned.filter(c => c.status === 'Returned');[span_259](start_span)[span_259](end_span)
    else if (currentDashListFilter === 'RTO') list = assigned.filter(c => ['ASSIGNED', 'SUBMITTED_BY_AGENT', 'CONFIRMED'].includes(c.rtoStatus));
  }[span_260](start_span)[span_260](end_span)

  if (q) list = list.filter(c => `${c.id} ${c.customerName} ${c.customerPhone}`.toLowerCase().includes(q));[span_261](start_span)[span_261](end_span)

  const container = document.getElementById('dashListContainer');[span_262](start_span)[span_262](end_span)
  if (list.length === 0) {[span_263](start_span)[span_263](end_span)
    container.innerHTML = `<div class="ql-card p-10 text-center text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest">No consignments found.</div>`;[span_264](start_span)[span_264](end_span)
    return;[span_265](start_span)[span_265](end_span)
  }[span_266](start_span)[span_266](end_span)

  const currentUser = getCurrentUser();[span_267](start_span)[span_267](end_span)

  container.innerHTML = list.map((c, idx) => {[span_268](start_span)[span_268](end_span)
    const v = getVendorByCode(c.vendorCode);[span_269](start_span)[span_269](end_span)
    const vendorName = v ? v.name : c.vendorCode;
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
    `;[span_270](start_span)[span_270](end_span)
  }).join('');[span_271](start_span)[span_271](end_span)
};[span_272](start_span)[span_272](end_span)
