// /src/views/dispatch.js
import { getDB, getCurrentUser, saveDB } from '../services/store.js';
import { getVendorByCode } from '../utils/helpers.js';

let searchDebounceTimer = null;

export const debounceRenderConsignments = () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        requestAnimationFrame(renderConsignments);
    }, 150);
};

const getRtoBadgeHtml = (rtoStatus) => {
    if (!rtoStatus) return '';
    if (rtoStatus === 'ASSIGNED') {
        return `<span class="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-[#c9a24b]/15 text-[var(--accent-gold)] border border-[#c9a24b]/30">RTO Assigned</span>`;
    }
    if (rtoStatus === 'SUBMITTED_BY_AGENT') {
        return `<span class="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-[var(--status-blue-bg)] text-[var(--status-blue)] border border-[#3b82f6]/30">RTO Submitted</span>`;
    }
    if (rtoStatus === 'CONFIRMED') {
        return `<span class="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] border border-[#10b981]/30">RTO Confirmed</span>`;
    }
    return '';
};

export const renderConsignments = () => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!db || !currentUser) return;

    const tbody = document.getElementById('consignmentsTbody');
    const emptyState = document.getElementById('consignmentsEmptyState');

    if (!tbody) {
        console.warn("Please update the HTML to include #consignmentsTbody to use the optimized renderer.");
        return;
    }

    const stat = document.getElementById('filterStatus').value;
    const slc = document.getElementById('filterAgentSlicer')?.value || 'ALL';
    const q = document.getElementById('filterSearchText').value.toLowerCase();
    const isA = currentUser.role === 'ADMIN';

    const ls = db.consignments.filter(c => {
      if (!isA) {
          const isAssigned = c.assignedTo === currentUser.id;
          const isRtoPicker = c.rtoPickupBy === currentUser.id;
          const isPool = c.status === 'Created';
          if (c.pickedUpBy === currentUser.id && !isAssigned && !isRtoPicker) return false;
          if (!isAssigned && !isRtoPicker && !isPool) return false;
      }

      if (stat === 'RTO') {
          if (!['ASSIGNED', 'SUBMITTED_BY_AGENT', 'CONFIRMED'].includes(c.rtoStatus)) return false;
      } else if (stat === 'PENDING_ALL') {
          if (c.status === 'Delivered' || c.status === 'Returned') return false;
      } else if (stat !== 'ALL' && c.status !== stat) {
          return false;
      }

      if (isA && slc !== 'ALL') {
          if (slc === 'UNASSIGNED' && c.assignedTo) return false;
          if (slc !== 'UNASSIGNED' && c.assignedTo !== slc && c.rtoPickupBy !== slc) return false;
      }
      if (q && !`${c.id} ${c.customerName} ${c.vendorCode}`.toLowerCase().includes(q)) return false;
      return true;
    });

    if (ls.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      document.querySelector('#consignmentsGrid .ql-card').classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    document.querySelector('#consignmentsGrid .ql-card').classList.remove('hidden');

    tbody.innerHTML = ls.map((c, idx) => {
      const v = getVendorByCode(c.vendorCode);
      const dt = c.rtoConfirmedAt || c.rtoSubmittedAt || c.rtoAssignedAt ||
        (c.status === 'Delivered' ? c.deliveredAt : (['Picked Up', 'Out for delivery'].includes(c.status) ? c.pickedUpAt : c.createdAt));

      let dtStr = '-';
      if (dt) {
        if (typeof dt === 'string' && dt.includes('T')) {
          const parts = dt.split('T');
          dtStr = parts[0] + '<br>' + parts[1].split('.')[0];
        } else {
          dtStr = dt;
        }
      }

      const rtoBadge = getRtoBadgeHtml(c.rtoStatus);

      return `
        <tr onclick="window.showConsignmentDetails('${c.id}')" class="cursor-pointer hover:bg-[var(--bg-base)] transition-colors">
          <td class="p-4 font-bold text-[var(--text-primary)]">${idx + 1}</td>
          <td class="p-4 font-black text-[var(--text-primary)] tracking-widest uppercase">${c.id}</td>
          <td class="p-4 font-bold uppercase text-[var(--text-secondary)]">${v ? v.name : c.vendorCode}</td>
          <td class="p-4 lowercase font-bold text-[var(--text-muted)]">
            <div>${c.status}</div>
            ${rtoBadge}
          </td>
          <td class="p-4 leading-tight font-bold text-[var(--text-secondary)] whitespace-nowrap">${dtStr}</td>
        </tr>
      `;
    }).join('');
};

export const adminAssignAgent = async (cid, aid) => {
    const currentUser = getCurrentUser();
    const db = getDB();
    if (currentUser.role !== 'ADMIN') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c || c.status === 'Delivered') return;

    const actionText = aid ? 'assign' : 'unassign';
    if (!confirm(`Are you sure you want to ${actionText} this consignment?`)) {
      renderConsignments();
      return;
    }

    c.assignedTo = aid || null;
    if (c.status === 'Created' && aid) c.status = 'Assigned';
    if (!aid && c.status === 'Assigned') c.status = 'Created';
    if (c.status === 'Picked Up' && aid) c.status = 'Out for delivery';

    await saveDB();
    renderConsignments();
};
