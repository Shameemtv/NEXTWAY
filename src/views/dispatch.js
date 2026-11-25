// /src/views/dispatch.js
import { getDB, getCurrentUser, saveDB } from '../services/store.js';[span_7](start_span)[span_7](end_span)
import { getVendorByCode } from '../utils/helpers.js';[span_8](start_span)[span_8](end_span)

let searchDebounceTimer = null;[span_9](start_span)[span_9](end_span)

export const debounceRenderConsignments = () => {[span_10](start_span)[span_10](end_span)
    clearTimeout(searchDebounceTimer);[span_11](start_span)[span_11](end_span)
    searchDebounceTimer = setTimeout(() => {[span_12](start_span)[span_12](end_span)
        requestAnimationFrame(renderConsignments);[span_13](start_span)[span_13](end_span)
    }, 150);[span_14](start_span)[span_14](end_span)
};[span_15](start_span)[span_15](end_span)

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

export const renderConsignments = () => {[span_16](start_span)[span_16](end_span)
    const db = getDB();[span_17](start_span)[span_17](end_span)
    const currentUser = getCurrentUser();[span_18](start_span)[span_18](end_span)
    if (!db || !currentUser) return;[span_19](start_span)[span_19](end_span)

    const tbody = document.getElementById('consignmentsTbody');[span_20](start_span)[span_20](end_span)
    const emptyState = document.getElementById('consignmentsEmptyState');[span_21](start_span)[span_21](end_span)

    if (!tbody) {[span_22](start_span)[span_22](end_span)
        console.warn("Please update the HTML to include #consignmentsTbody to use the optimized renderer.");[span_23](start_span)[span_23](end_span)
        return;[span_24](start_span)[span_24](end_span)
    }[span_25](start_span)[span_25](end_span)

    const stat = document.getElementById('filterStatus').value;[span_26](start_span)[span_26](end_span)
    const slc = document.getElementById('filterAgentSlicer')?.value || 'ALL';[span_27](start_span)[span_27](end_span)
    const q = document.getElementById('filterSearchText').value.toLowerCase();[span_28](start_span)[span_28](end_span)
    const isA = currentUser.role === 'ADMIN';[span_29](start_span)[span_29](end_span)

    const ls = db.consignments.filter(c => {[span_30](start_span)[span_30](end_span)
      if (!isA) {[span_31](start_span)[span_31](end_span)
          const isAssigned = c.assignedTo === currentUser.id;[span_32](start_span)[span_32](end_span)
          const isRtoPicker = c.rtoPickupBy === currentUser.id;
          const isPool = c.status === 'Created';[span_33](start_span)[span_33](end_span)
          if (c.pickedUpBy === currentUser.id && !isAssigned && !isRtoPicker) return false;[span_34](start_span)[span_34](end_span)
          if (!isAssigned && !isRtoPicker && !isPool) return false;[span_35](start_span)[span_35](end_span)
      }[span_36](start_span)[span_36](end_span)

      if (stat === 'RTO') {
          if (!['ASSIGNED', 'SUBMITTED_BY_AGENT', 'CONFIRMED'].includes(c.rtoStatus)) return false;
      } else if (stat === 'PENDING_ALL') {[span_37](start_span)[span_37](end_span)
          if (c.status === 'Delivered' || c.status === 'Returned') return false;[span_38](start_span)[span_38](end_span)
      } else if (stat !== 'ALL' && c.status !== stat) {[span_39](start_span)[span_39](end_span)
          return false;[span_40](start_span)[span_40](end_span)
      }[span_41](start_span)[span_41](end_span)

      if (isA && slc !== 'ALL') {[span_42](start_span)[span_42](end_span)
          if (slc === 'UNASSIGNED' && c.assignedTo) return false;[span_43](start_span)[span_43](end_span)
          if (slc !== 'UNASSIGNED' && c.assignedTo !== slc && c.rtoPickupBy !== slc) return false;[span_44](start_span)[span_44](end_span)
      }[span_45](start_span)[span_45](end_span)
      if (q && !`${c.id} ${c.customerName} ${c.vendorCode}`.toLowerCase().includes(q)) return false;[span_46](start_span)[span_46](end_span)
      return true;[span_47](start_span)[span_47](end_span)
    });[span_48](start_span)[span_48](end_span)

    if (ls.length === 0) {[span_49](start_span)[span_49](end_span)
      tbody.innerHTML = '';[span_50](start_span)[span_50](end_span)
      emptyState.classList.remove('hidden');[span_51](start_span)[span_51](end_span)
      document.querySelector('#consignmentsGrid .ql-card').classList.add('hidden');[span_52](start_span)[span_52](end_span)
      return;[span_53](start_span)[span_53](end_span)
    }[span_54](start_span)[span_54](end_span)

    emptyState.classList.add('hidden');[span_55](start_span)[span_55](end_span)
    document.querySelector('#consignmentsGrid .ql-card').classList.remove('hidden');[span_56](start_span)[span_56](end_span)

    tbody.innerHTML = ls.map((c, idx) => {[span_57](start_span)[span_57](end_span)
      const v = getVendorByCode(c.vendorCode);[span_58](start_span)[span_58](end_span)
      const dt = c.rtoConfirmedAt || c.rtoSubmittedAt || c.rtoAssignedAt ||
        (c.status === 'Delivered' ? c.deliveredAt : (['Picked Up', 'Out for delivery'].includes(c.status) ? c.pickedUpAt : c.createdAt));[span_59](start_span)[span_59](end_span)

      let dtStr = '-';[span_60](start_span)[span_60](end_span)
      if (dt) {[span_61](start_span)[span_61](end_span)
        if (typeof dt === 'string' && dt.includes('T')) {[span_62](start_span)[span_62](end_span)
          const parts = dt.split('T');[span_63](start_span)[span_63](end_span)
          dtStr = parts[0] + '<br>' + parts[1].split('.')[0];[span_64](start_span)[span_64](end_span)
        } else {[span_65](start_span)[span_65](end_span)
          dtStr = dt;[span_66](start_span)[span_66](end_span)
        }[span_67](start_span)[span_67](end_span)
      }[span_68](start_span)[span_68](end_span)

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
      `;[span_69](start_span)[span_69](end_span)
    }).join('');[span_70](start_span)[span_70](end_span)
};[span_71](start_span)[span_71](end_span)

export const adminAssignAgent = async (cid, aid) => {[span_72](start_span)[span_72](end_span)
    const currentUser = getCurrentUser();[span_73](start_span)[span_73](end_span)
    const db = getDB();[span_74](start_span)[span_74](end_span)
    if (currentUser.role !== 'ADMIN') return;[span_75](start_span)[span_75](end_span)

    const c = db.consignments.find(x => x.id === cid);[span_76](start_span)[span_76](end_span)
    if (!c || c.status === 'Delivered') return;[span_77](start_span)[span_77](end_span)

    const actionText = aid ? 'assign' : 'unassign';[span_78](start_span)[span_78](end_span)
    if (!confirm(`Are you sure you want to ${actionText} this consignment?`)) {[span_79](start_span)[span_79](end_span)
      renderConsignments();[span_80](start_span)[span_80](end_span)
      return;[span_81](start_span)[span_81](end_span)
    }[span_82](start_span)[span_82](end_span)

    c.assignedTo = aid || null;[span_83](start_span)[span_83](end_span)
    if (c.status === 'Created' && aid) c.status = 'Assigned';[span_84](start_span)[span_84](end_span)
    if (!aid && c.status === 'Assigned') c.status = 'Created';[span_85](start_span)[span_85](end_span)
    if (c.status === 'Picked Up' && aid) c.status = 'Out for delivery';[span_86](start_span)[span_86](end_span)

    await saveDB();[span_87](start_span)[span_87](end_span)
    renderConsignments();[span_88](start_span)[span_88](end_span)
};[span_89](start_span)[span_89](end_span)
