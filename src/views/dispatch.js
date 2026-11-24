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

export const renderConsignments = () => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!db || !currentUser) return;

    const tbody = document.getElementById('consignmentsTbody');
    const emptyState = document.getElementById('consignmentsEmptyState');
    
    // Fallback if the user hasn't updated the HTML structure yet
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
          const isPool = c.status === 'Created';
          if (c.pickedUpBy === currentUser.id && !isAssigned) return false;
          if (!isAssigned && !isPool) return false;
      }
      if (stat === 'PENDING_ALL') { if (c.status === 'Delivered' || c.status === 'Returned') return false; } 
      else if (stat !== 'ALL' && c.status !== stat) return false;
      
      if (isA && slc !== 'ALL') { if (slc === 'UNASSIGNED' && c.assignedTo) return false; if (slc !== 'UNASSIGNED' && c.assignedTo !== slc) return false; }
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
      const dt = c.status === 'Delivered' ? c.deliveredAt : (['Picked Up', 'Out for delivery'].includes(c.status) ? c.pickedUpAt : c.createdAt);
      
      let dtStr = '-';
      if (dt) {
        if (typeof dt === 'string' && dt.includes('T')) {
          const parts = dt.split('T');
          dtStr = parts[0] + '<br>' + parts[1].split('.')[0];
        } else {
          dtStr = dt;
        }
      }

      return `
        <tr onclick="window.showConsignmentDetails('${c.id}')" class="cursor-pointer hover:bg-[var(--bg-base)] transition-colors">
          <td class="p-4 font-bold text-[var(--text-primary)]">${idx + 1}</td>
          <td class="p-4 font-black text-[var(--text-primary)] tracking-widest uppercase">${c.id}</td>
          <td class="p-4 font-bold uppercase text-[var(--text-secondary)]">${v ? v.name : c.vendorCode}</td>
          <td class="p-4 lowercase font-bold text-[var(--text-muted)]">${c.status}</td>
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
