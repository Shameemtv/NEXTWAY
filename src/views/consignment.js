// /src/views/consignment.js
import { getDB, getCurrentUser, saveDB } from '../services/store.js';
import { getUAEISOString, getVendorByCode, getAgentName, formatAmt, getDeficitInfo, closeModal } from '../utils/helpers.js';
import { uploadImageToSupabase } from '../services/sync.js';
import { renderConsignments } from './dispatch.js';
import { generateInvoicePreview } from './finance.js';

let tempEditData = null;
let currentPodCid = null;
let currentPodDefaultMethod = '';
let tempPodPhotoData = null;
let tempPhotoData = null;

export const resetNewConsignmentForm = (retainMerchant = false) => {
    const db = getDB();
    const currentUser = getCurrentUser();

    document.getElementById('cIdInput').value = '';

    if (!retainMerchant) {
        document.getElementById('cVendorSearch').value = '';
        document.getElementById('cVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
        syncVendorPickupAddress();
    }

    const agSelect = document.getElementById('cAgentSelect');
    const puSelect = document.getElementById('cPickedUpBy');
    const agentPoolOptions = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

    if (currentUser.role === 'ADMIN') {
        agSelect.innerHTML = `<option value="">-- Pool --</option>` + agentPoolOptions;
        document.getElementById('agentSelectContainer').classList.remove('hidden');

        puSelect.innerHTML = `<option value="">-- Select Picker --</option>` + agentPoolOptions;
        puSelect.disabled = false;
        puSelect.classList.remove('bg-[var(--border-color-strong)]');
    } else {
        agSelect.innerHTML = `<option value="">-- Unassigned Pool --</option>`;
        document.getElementById('agentSelectContainer').classList.add('hidden');

        puSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name} - ${currentUser.id}</option>`;
        puSelect.value = currentUser.id;
        puSelect.disabled = true;
        puSelect.classList.add('bg-[var(--border-color-strong)]');
    }

    document.getElementById('cWeight').value = "";
    document.getElementById('cPieces').value = "";
    document.getElementById('cCustomerName').value = '';
    document.getElementById('cCustomerPhone').value = '+971';
    document.getElementById('cDeliveryAddress').value = '';
    document.getElementById('cProductAmt').value = '';
    document.getElementById('cDeliveryFee').value = '';

    if (document.getElementById('cRefVendorName')) document.getElementById('cRefVendorName').value = '';
    if (document.getElementById('cRefVendorPhone')) document.getElementById('cRefVendorPhone').value = '';
};

export const openNewConsignmentModal = () => {
    resetNewConsignmentForm(false);
    document.getElementById('consignmentModal').classList.remove('hidden');
};

export const saveNewConsignment = (e) => {
    e.preventDefault();
    const db = getDB();
    const id = document.getElementById('cIdInput').value.trim().toUpperCase();
    if (db.consignments.some(c => c.id.toUpperCase() === id)) { alert('ID exists!'); return; }

    document.getElementById('actionModalTitle').textContent = `Add New Consignment`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest mb-1.5">Are you sure you want to log this consignment?</p>
        <p class="text-xl font-black text-[var(--status-emerald)] tracking-widest tabular-nums uppercase">${id}</p>
      </div>
      <button onclick="window.executeNewConsignment()" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">Confirm Entry</button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executeNewConsignment = async () => {
    const db = getDB();
    const currentUser = getCurrentUser();

    const id = document.getElementById('cIdInput').value.trim().toUpperCase();
    const ag = document.getElementById('cAgentSelect').value || null;
    const isAgent = currentUser.role === 'AGENT';
    const pickedUpBy = isAgent ? currentUser.id : (document.getElementById('cPickedUpBy').value || null);

    const pAmt = parseFloat(document.getElementById('cProductAmt').value) || 0;
    const dFee = parseFloat(document.getElementById('cDeliveryFee').value) || 0;
    const fType = document.getElementById('cFeeType').value;
    const weightVal = parseFloat(document.getElementById('cWeight').value) || 1;
    const piecesVal = parseInt(document.getElementById('cPieces').value, 10) || 1;

    const deficitReceivedDate = (fType === 'COC') ? getUAEISOString() : null;
    let initialStatus = ag ? 'Assigned' : 'Created';
    if (pickedUpBy) initialStatus = ag ? 'Out for delivery' : 'Picked Up';

    db.consignments.unshift({
      id, vendorCode: document.getElementById('cVendorSelect').value, pickupFrom: document.getElementById('cPickupFrom').value,
      refVendorName: document.getElementById('cRefVendorName') ? document.getElementById('cRefVendorName').value.trim() : '',
      refVendorPhone: document.getElementById('cRefVendorPhone') ? document.getElementById('cRefVendorPhone').value.trim() : '',
      customerName: document.getElementById('cCustomerName').value, customerPhone: document.getElementById('cCustomerPhone').value,
      deliveryAddress: document.getElementById('cDeliveryAddress').value, productAmount: pAmt, deliveryCharge: dFee, feeType: fType,
      weight: weightVal, pieces: piecesVal, pendingModification: null, assignedTo: ag, pickedUpBy: pickedUpBy, deficitReceivedDate: deficitReceivedDate,
      rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null, rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
      cocPendingAmount: 0, cocStatus: null, status: initialStatus, qrGenerated: false, otpCode: String(Math.floor(1000 + Math.random() * 9000)),
      otpVerified: false, pickupPhoto: null, deliveryPhoto: null, returnReason: '', createdAt: getUAEISOString().split('T')[0],
      pickedUpAt: pickedUpBy ? getUAEISOString() : null, deliveredAt: null
    });

    await saveDB();
    closeModal('actionModal');

    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
    if (isAgent) { alert("Consignment Picked Up and added to the Unassigned Pool."); }

    resetNewConsignmentForm(true);
};
window.executeNewConsignment = executeNewConsignment;

export const filterVendorSelect = () => {
    const db = getDB();
    const q = document.getElementById('cVendorSearch').value.toLowerCase();
    const select = document.getElementById('cVendorSelect');
    const filtered = db.vendors.filter(v => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q));

    select.innerHTML = filtered.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
    if (filtered.length === 0) select.innerHTML = `<option value="">No matches</option>`;
    syncVendorPickupAddress();
};

export const syncVendorPickupAddress = () => {
    const code = document.getElementById('cVendorSelect').value;
    const v = getVendorByCode(code);
    if (v) document.getElementById('cPickupFrom').value = v.address;

    const walkInContainer = document.getElementById('walkInFields');
    if (walkInContainer) {
      if (code === 'WALK-IN') {
        walkInContainer.classList.remove('hidden');
        walkInContainer.classList.add('grid');
      } else {
        walkInContainer.classList.add('hidden');
        walkInContainer.classList.remove('grid');
        document.getElementById('cRefVendorName').value = '';
        document.getElementById('cRefVendorPhone').value = '';
      }
    }
};

export const bulkAssign = async () => {
    const db = getDB();
    const ids = document.getElementById('bulkIds').value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const agent = document.getElementById('bulkAgent').value;
    if (!ids.length || !agent) return alert('Enter comma separated IDs and select an agent.');

    if (!confirm(`Are you sure you want to assign ${ids.length} consignment(s) to this personnel?`)) return;

    let updated = 0;
    ids.forEach(id => {
      const c = db.consignments.find(x => x.id.toUpperCase() === id);
      if (c && c.status !== 'Delivered' && c.status !== 'Returned') {
        c.assignedTo = agent;
        if (c.status === 'Created') c.status = 'Assigned';
        if (c.status === 'Picked Up') c.status = 'Out for delivery';
        updated++;
      }
    });
    if (updated > 0) {
        await saveDB();
        renderConsignments();
        document.getElementById('bulkIds').value = '';
        alert(updated + ' consignments assigned.');
    }
};

export const openEditConsignmentModal = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    closeModal('inspectModal');

    document.getElementById('eIdInput').value = c.id;
    document.getElementById('eCid').value = c.id;

    document.getElementById('eVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
    document.getElementById('eVendorSelect').value = c.vendorCode;

    document.getElementById('ePickupFrom').value = c.pickupFrom;
    document.getElementById('eCustomerName').value = c.customerName;
    document.getElementById('eCustomerPhone').value = c.customerPhone;
    document.getElementById('eDeliveryAddress').value = c.deliveryAddress;
    document.getElementById('eWeight').value = c.weight || 1;
    document.getElementById('ePieces').value = c.pieces || 1;
    document.getElementById('eProductAmt').value = c.productAmount;
    document.getElementById('eDeliveryFee').value = c.deliveryCharge;
    document.getElementById('eFeeType').value = c.feeType;

    const agSelect = document.getElementById('eAgentSelect');
    const puSelect = document.getElementById('ePickedUpBy');
    const agentPoolOptions = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

    if (currentUser.role === 'ADMIN') {
        agSelect.innerHTML = `<option value="">-- Pool --</option>` + agentPoolOptions;
        agSelect.value = c.assignedTo || '';
        document.getElementById('eAgentSelectContainer').classList.remove('hidden');

        puSelect.innerHTML = `<option value="">-- Select Picker --</option>` + agentPoolOptions;
        puSelect.value = c.pickedUpBy || '';
        puSelect.disabled = false;
        puSelect.classList.remove('bg-[var(--border-color-strong)]');
    } else {
        agSelect.innerHTML = `<option value="">-- Unassigned Pool --</option>`;
        document.getElementById('eAgentSelectContainer').classList.add('hidden');

        puSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name} - ${currentUser.id}</option>`;
        puSelect.value = currentUser.id;
        puSelect.disabled = true;
        puSelect.classList.add('bg-[var(--border-color-strong)]');
    }

    tempEditData = {
        id: c.id, vendorCode: c.vendorCode, pickupFrom: c.pickupFrom, customerName: c.customerName,
        customerPhone: c.customerPhone, deliveryAddress: c.deliveryAddress, weight: c.weight,
        pieces: c.pieces, productAmount: c.productAmount, deliveryCharge: c.deliveryCharge,
        feeType: c.feeType, assignedTo: c.assignedTo || '', pickedUpBy: c.pickedUpBy || ''
    };

    document.getElementById('eOriginalData').value = JSON.stringify(tempEditData);
    document.getElementById('editConsignmentModal').classList.remove('hidden');
};

export const syncEditVendorPickupAddress = () => {
    const v = getVendorByCode(document.getElementById('eVendorSelect').value);
    if (v) document.getElementById('ePickupFrom').value = v.address;
};

export const confirmEditConsignment = (e) => {
    e.preventDefault();
    const db = getDB();
    const cid = document.getElementById('eCid').value;
    const orig = JSON.parse(document.getElementById('eOriginalData').value);

    const newData = {
        id: document.getElementById('eIdInput').value.trim().toUpperCase(),
        vendorCode: document.getElementById('eVendorSelect').value,
        pickupFrom: document.getElementById('ePickupFrom').value,
        customerName: document.getElementById('eCustomerName').value,
        customerPhone: document.getElementById('eCustomerPhone').value,
        deliveryAddress: document.getElementById('eDeliveryAddress').value,
        weight: parseFloat(document.getElementById('eWeight').value) || 1,
        pieces: parseInt(document.getElementById('ePieces').value, 10) || 1,
        productAmount: parseFloat(document.getElementById('eProductAmt').value) || 0,
        deliveryCharge: parseFloat(document.getElementById('eDeliveryFee').value) || 0,
        feeType: document.getElementById('eFeeType').value,
        assignedTo: document.getElementById('eAgentSelect').value || '',
        pickedUpBy: document.getElementById('ePickedUpBy').value || ''
    };

    if (newData.id !== cid && db.consignments.some(x => x.id.toUpperCase() === newData.id)) {
        return alert('This Consignment ID already exists!');
    }

    const hasChanges = Object.keys(newData).some(key => orig[key] != newData[key]);
    if (!hasChanges) return closeModal('editConsignmentModal');

    document.getElementById('actionModalTitle').textContent = `Update Consignment: ${cid}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[#c9a24b]/10 border border-[#c9a24b]/30 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--accent-gold)] uppercase tracking-widest mb-1.5">You made changes to this entry. Update now?</p>
      </div>
      <button onclick="window.executeEditConsignment('${cid}')" class="w-full bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-all uppercase tracking-widest text-[11px] border border-[#1e293b]">Confirm Update</button>
    `;
    tempEditData = newData;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executeEditConsignment = async (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    if (c.status === 'Delivered') {
        c.pendingModification = { type: 'FULL_EDIT', requestedBy: currentUser.username, ...tempEditData };
        await saveDB();
        closeModal('actionModal');
        closeModal('editConsignmentModal');
        if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
        return alert("Modifications to this Delivered consignment have been sent to the assigned Delivery Agent for confirmation.");
    }

    Object.assign(c, tempEditData);

    const newAssignedTo = tempEditData.assignedTo || null;
    const newPickedUpBy = tempEditData.pickedUpBy || null;

    c.assignedTo = newAssignedTo;
    c.pickedUpBy = newPickedUpBy;

    if (newPickedUpBy && !c.pickedUpAt) {
        c.pickedUpAt = getUAEISOString();
        c.status = newAssignedTo ? 'Out for delivery' : 'Picked Up';
    } else if (!newPickedUpBy) {
        c.pickedUpAt = null;
        c.status = newAssignedTo ? 'Assigned' : 'Created';
    } else {
        if (c.status === 'Created' && newAssignedTo) c.status = 'Assigned';
        if (c.status === 'Assigned' && !newAssignedTo) c.status = 'Created';
    }

    await saveDB();
    closeModal('actionModal');
    closeModal('editConsignmentModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const deleteConsignmentFromEdit = async () => {
    const db = getDB();
    const cid = document.getElementById('eCid').value;
    if (!confirm(`Are you sure you want to permanently delete Consignment ${cid}? This action cannot be undone.`)) return;

    db.consignments = db.consignments.filter(c => c.id !== cid);
    await saveDB();
    closeModal('editConsignmentModal');
    closeModal('inspectModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const openAssignRtoModal = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    const activeAgents = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE');
    const defaultPicker = c.rtoPickupBy || c.pickedUpBy || c.assignedTo || '';

    closeModal('inspectModal');
    document.getElementById('actionModalTitle').textContent = `Assign RTO: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center space-y-1.5">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest">Assign RTO pickup person for ${c.id}?</p>
        <p class="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Pick Origin: <span class="text-[var(--text-primary)] font-black">${getAgentName(c.pickedUpBy)}</span></p>
      </div>
      <div class="mb-4">
        <label class="block text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5">RTO Pickup Person (Editable)</label>
        <select id="rtoPickupAgentSelect" class="w-full font-bold border border-[var(--border-color)] rounded-xl px-4 py-3 bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--status-emerald)]">
          <option value="">-- Select Agent --</option>
          ${activeAgents.map(a => `<option value="${a.id}" ${a.id === defaultPicker ? 'selected' : ''}>${a.name} - ${a.id}</option>`).join('')}
        </select>
      </div>
      <button onclick="window.confirmAssignRto('${c.id}')" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">
        Move to RTO Card
      </button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const confirmAssignRto = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    const selectedAgent = document.getElementById('rtoPickupAgentSelect')?.value;
    if (!c) return;
    if (!selectedAgent) return alert('Please select an RTO pickup person.');

    const agentLabel = getAgentName(selectedAgent);
    document.getElementById('actionModalTitle').textContent = `Confirm RTO: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center space-y-1.5">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest">You want to move ${c.id} to RTO card?</p>
        <p class="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">${agentLabel}</p>
      </div>
      <button onclick="window.executeAssignRto('${c.id}', '${selectedAgent}')" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">
        Confirm RTO Assignment
      </button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executeAssignRto = async (cid, selectedAgent) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c || !selectedAgent) return;

    c.rtoStatus = 'ASSIGNED';
    c.rtoAssignedTo = c.assignedTo || selectedAgent;
    c.rtoPickupBy = selectedAgent;
    c.rtoAssignedAt = getUAEISOString();

    await saveDB();
    closeModal('actionModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const submitRtoToOwner = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'AGENT') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    if (c.rtoPickupBy && c.rtoPickupBy !== currentUser.id) {
        return alert('Only the assigned RTO pickup person can submit this consignment.');
    }

    closeModal('inspectModal');
    document.getElementById('actionModalTitle').textContent = `Submit RTO: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest mb-1.5">You want to submit RTO ${c.id} back to the owner?</p>
      </div>
      <button onclick="window.executeSubmitRtoToOwner('${c.id}')" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">
        Confirm Submit
      </button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executeSubmitRtoToOwner = async (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    c.rtoStatus = 'SUBMITTED_BY_AGENT';
    c.rtoSubmittedAt = getUAEISOString();

    await saveDB();
    closeModal('actionModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const inspectConsignmentById = () => {
    const db = getDB();
    const id = document.getElementById('globalConsignmentSearch').value.trim().toUpperCase();
    const c = db.consignments.find(x => x.id.toUpperCase() === id);
    if (c) showConsignmentDetails(c.id);
    else alert('Record not found.');
};

export const showConsignmentDetails = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    const v = getVendorByCode(c.vendorCode);
    const collectAmt = c.feeType === 'COD' ? (parseFloat(c.productAmount) + parseFloat(c.deliveryCharge)) : parseFloat(c.productAmount);
    document.getElementById('inspectTitle').textContent = `Consignment Record: ${c.id}`;

    const html = `
      <div class="flex flex-col sm:flex-row gap-5 text-xs mb-4 bg-[var(--bg-base)] p-5 rounded-2xl border border-[var(--border-color)]">
        <div class="flex-1 space-y-2.5 text-[var(--text-primary)]">
          <p class="flex items-center gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Status:</span> <span class="px-2.5 py-1 bg-[var(--border-color-strong)] text-[var(--text-primary)] rounded-lg font-black uppercase tracking-widest text-[9px] shadow-sm">${c.status}</span>${c.rtoStatus ? `<span class="px-2.5 py-1 bg-[var(--status-blue-bg)] text-[var(--status-blue)] border border-[#3b82f6]/20 rounded-lg font-black uppercase tracking-widest text-[9px]">${c.rtoStatus.replace(/_/g, ' ')}</span>` : ''}</p>
          <p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Merchant:</span> <span class="font-bold uppercase">${v ? v.name : c.vendorCode}</span></p>
          ${c.refVendorName ? `<p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Ref Vendor:</span> <span class="text-[var(--status-blue)] font-black uppercase">${c.refVendorName}</span> ${c.refVendorPhone ? `<span class="text-[var(--text-muted)]">(${c.refVendorPhone})</span>` : ''}</p>` : ''}
          <p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Customer:</span> <span class="font-bold uppercase">${c.customerName}</span></p>
          <p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Phone:</span> <span class="font-bold tabular-nums">${c.customerPhone}</span></p>
          <p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Destination:</span> <span class="font-bold">${c.deliveryAddress}</span></p>
          <p class="flex items-center gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Weight:</span> <span class="font-bold tabular-nums">${c.weight || 1} kg</span></p>
          <p class="flex items-center gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Pieces:</span> <span class="font-bold tabular-nums">${c.pieces || 1}</span></p>
          <p class="flex items-center gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Collect Val:</span> <span class="text-[var(--status-emerald)] font-black tabular-nums">${formatAmt(collectAmt)} AED</span></p>
          <p class="flex items-center gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Terms:</span> <span class="font-black text-[var(--status-blue)]">${c.feeType}</span></p>
          <p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Pick Origin:</span> <span class="font-bold">${getAgentName(c.pickedUpBy)}</span></p>
          <p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">Deliv Agent:</span> <span class="font-bold">${getAgentName(c.assignedTo)}</span></p>
          ${c.rtoPickupBy ? `<p class="flex items-start gap-2"><span class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest w-20 shrink-0">RTO Picker:</span> <span class="font-bold">${getAgentName(c.rtoPickupBy)}</span></p>` : ''}
          ${c.cocPendingAmount > 0 ? `<p class="text-[var(--status-rose)] font-black border border-[#f43f5e]/20 bg-[var(--status-rose-bg)] p-2 rounded-xl inline-block mt-2 shadow-sm text-[10px] uppercase tracking-widest">COC Pending: ${formatAmt(c.cocPendingAmount)} (${c.cocStatus})</p>` : ''}
          ${c.status === 'Returned' ? `<p class="text-[var(--status-rose)] font-bold bg-[var(--status-rose-bg)] border border-[#f43f5e]/20 p-3 rounded-xl mt-3 leading-relaxed shadow-sm">Returned: ${c.returnReason}</p>` : ''}

          ${c.podData ? `
          <div class="mt-4 p-4 bg-[var(--status-rose-bg)] rounded-xl border border-[#f43f5e]/20 text-xs space-y-2 shadow-sm">
              <h4 class="font-black text-[var(--status-rose)] border-b border-[#f43f5e]/20 pb-2 mb-3 uppercase tracking-widest text-[10px]">Captured POD Data</h4>
              <p class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><b class="text-[var(--status-rose)] text-[10px] uppercase tracking-wider">Receiver Name:</b> <span class="font-bold">${c.podData.receiverName || 'Not Provided'}</span></p>
              <p class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><b class="text-[var(--status-rose)] text-[10px] uppercase tracking-wider">NCND Collected:</b> <span class="font-bold tabular-nums">${c.podData.ncndCollected} ${c.podData.ncndPayMethod === 'Cheque' ? '(Cheque)' : ''}</span> <span class="text-[var(--text-muted)] font-medium italic text-[10px]">- Rmk: ${c.podData.ncndRemarks || 'N/A'}</span></p>
              <p class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><b class="text-[var(--status-rose)] text-[10px] uppercase tracking-wider">Payment Mode:</b> <span class="font-bold">${c.podData.payMethod}</span> <span class="text-[var(--text-muted)] font-medium italic text-[10px]">- Rmk: ${c.podData.payModeRemarks || 'N/A'}</span></p>
              <p class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><b class="text-[var(--status-rose)] text-[10px] uppercase tracking-wider">COD Collected:</b> <span class="font-bold tabular-nums">${c.podData.codCollected}</span> <span class="text-[var(--text-muted)] font-medium italic text-[10px]">- Rmk: ${c.podData.codRemarks || 'N/A'}</span></p>
          ${(c.podData.doCollected || c.podData.doToBeCollected || c.podData.doRemarks) ? `
          <div class="h-px bg-[#f43f5e]/20 w-full my-2"></div>
          <p class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><b class="text-[var(--status-rose)] text-[10px] uppercase tracking-wider">D.O Status:</b> <span class="font-bold">${c.podData.doCollected ? 'Collected' : (c.podData.doToBeCollected ? 'To Be Collected' : 'None')}</span> <span class="text-[var(--text-muted)] font-medium italic text-[10px]">- Rmk: ${c.podData.doRemarks || 'N/A'}</span></p>
          ` : ''}
          </div>
          ` : ''}
        </div>
        <div id="qrCodeCanvas" class="flex justify-center items-center p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shrink-0 min-w-[90px] shadow-sm self-start sm:self-auto"></div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs mb-5">
        <div class="border border-[var(--border-color)] p-4 rounded-2xl bg-[var(--bg-base)] text-center flex flex-col justify-between shadow-sm">
          <b class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest">Pickup Proof</b>
          ${c.pickupPhoto ? `<img src="${c.pickupPhoto}" class="h-28 object-cover mt-3 mx-auto rounded-xl shadow-sm border border-[var(--border-color)]" /><a href="${c.pickupPhoto}" download="${c.id}_pickup.jpg" class="mt-3 block w-full bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold py-2 rounded-xl shadow-sm transition-all border border-[#1e293b] text-[10px] uppercase tracking-widest">View Full</a>` : '<span class="text-[var(--text-muted)] mt-3 block font-bold text-[10px] uppercase tracking-widest">None</span>'}
        </div>
        <div class="border border-[var(--border-color)] p-4 rounded-2xl bg-[var(--bg-base)] text-center flex flex-col justify-between shadow-sm">
          <b class="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest">Delivery Proof</b>
          ${c.deliveryPhoto ? `<img src="${c.deliveryPhoto}" class="h-28 object-cover mt-3 mx-auto rounded-xl shadow-sm border border-[var(--border-color)]" /><a href="${c.deliveryPhoto}" download="${c.id}_delivery.jpg" class="mt-3 block w-full bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold py-2 rounded-xl shadow-sm transition-all border border-[#1e293b] text-[10px] uppercase tracking-widest">View Full</a>` : '<span class="text-[var(--text-muted)] mt-3 block font-bold text-[10px] uppercase tracking-widest">None</span>'}
        </div>
      </div>`;

    const canDeliver = ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status) && c.assignedTo === currentUser.id;
    const { isDeficit } = getDeficitInfo(c);
    const needsDeficitCollection = isDeficit && !c.deficitReceivedDate && c.pickedUpBy;
    const canMarkDeficit = needsDeficitCollection && (currentUser.role === 'ADMIN' || currentUser.id === c.pickedUpBy);
    const isA = currentUser.role === 'ADMIN';
    const ags = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE');

    let actionButtons = `<div class="flex flex-wrap gap-2 pt-5 border-t border-[var(--border-color)]">`;

    if (isA) {
        actionButtons += `<button onclick="window.openEditConsignmentModal('${c.id}')" class="bg-[var(--bg-base)] hover:bg-[var(--border-color-strong)] text-[var(--text-primary)] border border-[var(--border-color)] font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Edit</button>`;
        if (canDeliver) {
            actionButtons += `<button onclick="window.closeModal('inspectModal'); window.openPodScreen('${c.id}')" class="bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest flex-1 sm:flex-none">Deliver</button>`;
            actionButtons += `<button onclick="window.closeModal('inspectModal'); window.openReturnModal('${c.id}')" class="bg-[var(--status-rose)] hover:bg-[#e11d48] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Return</button>`;
        }
    }

    if (canMarkDeficit) {
        actionButtons += `<button onclick="window.closeModal('inspectModal'); window.markDeficitReceived('${c.id}')" class="bg-[var(--status-blue)] hover:bg-[#2563eb] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Amt Recv</button>`;
    }

    if (c.feeType === 'COC' && c.cocPendingAmount > 0 && c.cocStatus === 'PENDING' && c.pickedUpBy === currentUser.id) {
        actionButtons += `<button onclick="window.closeModal('inspectModal'); window.agentMarkCocCollected('${c.id}')" class="bg-[var(--status-blue)] hover:bg-[#2563eb] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">COC Recv</button>`;
    }

    if (isA && c.status !== 'Delivered') {
        actionButtons += `
        <div class="w-full mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <span class="font-extrabold text-[10px] text-[var(--text-secondary)] uppercase tracking-widest shrink-0">Assign:</span>
            <select onchange="window.adminAssignAgent('${c.id}',this.value); window.closeModal('inspectModal');" class="w-full sm:flex-1 border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-all cursor-pointer">
                <option value="">- Assign Pool -</option>
                ${ags.map(a => `<option value="${a.id}" ${c.assignedTo === a.id ? 'selected' : ''}>${a.name} - ${a.id}</option>`).join('')}
            </select>
        </div>`;
    }

    actionButtons += `</div>`;
    document.getElementById('inspectContent').innerHTML = html + actionButtons;
    document.getElementById('inspectModal').classList.remove('hidden');

    if (c.qrGenerated) {
        setTimeout(() => {
            document.getElementById('qrCodeCanvas').innerHTML = '';
            const isDarkMode = document.body.classList.contains('dark-mode');
            if (window.QRCode) {
                new window.QRCode(document.getElementById('qrCodeCanvas'), {
                    text: JSON.stringify({ id: c.id }),
                    width: 72, height: 72,
                    colorDark: isDarkMode ? "#ffffff" : "#0b0f19",
                    colorLight: isDarkMode ? "#0b0f19" : "#ffffff",
                    correctLevel: window.QRCode.CorrectLevel.L
                });
            }
        }, 100);
    }
};

const compressImageFile = (file, cb) => {
    const r = new FileReader();
    r.onload = e => {
        const img = new Image();
        img.onload = () => {
            const cvs = document.createElement('canvas');
            let w = img.width, h = img.height, m = 480;
            if (w > h && w > m) { h *= m / w; w = m; } else if (h > m) { w *= m / h; h = m; }
            cvs.width = w; cvs.height = h;
            cvs.getContext('2d').drawImage(img, 0, 0, w, h);
            cb(cvs.toDataURL('image/jpeg', 0.55));
        };
        img.src = e.target.result;
    };
    r.readAsDataURL(file);
};

export const handlePodPhoto = (e) => {
    if (e.target.files[0]) {
        compressImageFile(e.target.files[0], b64 => {
            tempPodPhotoData = b64;
            const img = document.getElementById('podPhotoPreview');
            img.src = b64;
            img.classList.remove('hidden');
        });
    }
};

export const handleModalPhoto = (e) => {
    if (e.target.files[0]) {
        compressImageFile(e.target.files[0], b64 => {
            tempPhotoData = b64;
            const img = document.getElementById('modalPhotoPreview');
            if (img) { img.src = b64; img.classList.remove('hidden'); }
        });
    }
};

export const openPodScreen = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    currentPodCid = cid;
    tempPodPhotoData = null;

    const v = getVendorByCode(c.vendorCode);
    document.getElementById('podAwb').textContent = c.id;
    document.getElementById('podShipper').textContent = v ? v.name : c.vendorCode;
    document.getElementById('podConsignee').textContent = c.customerName;
    document.getElementById('podReceiverName').value = '';
    document.getElementById('podDoCollected').checked = false;
    document.getElementById('podDoToBeCollected').checked = false;
    document.getElementById('podDoRemarks').value = '';

    document.getElementById('podNcndAmount').value = c.productAmount || 0;
    document.getElementById('podNcndCollected').value = c.productAmount || 0;
    document.getElementById('podNcndRemarks').value = '';

    let currentModeText = '';
    let defaultMethod = '';

    if (c.feeType === 'COD') { currentModeText = 'Cash On Delivery'; defaultMethod = 'COD'; }
    else if (c.feeType === 'CAD') { currentModeText = 'Cash After Delivery'; defaultMethod = 'CAD'; }
    else if (c.feeType === 'COC') { currentModeText = 'Pickup Cash'; defaultMethod = 'PKP'; }

    currentPodDefaultMethod = defaultMethod;
    document.getElementById('podCurrentPayMode').textContent = currentModeText;

    document.querySelectorAll('input[name="podPayMethod"]').forEach(r => {
        r.checked = (r.value === defaultMethod);
    });

    document.getElementById('podPayModeRemarks').value = '';
    document.getElementById('podCourierCharge').value = c.deliveryCharge || 0;
    document.getElementById('podCodCollected').value = c.deliveryCharge || 0;
    document.getElementById('podCodRemarks').value = '';

    document.getElementById('podPhotoPreview').classList.add('hidden');
    document.getElementById('podPhotoPreview').src = '';

    handlePodPayMethodChange();
    document.getElementById('podModal').classList.remove('hidden');
};

export const handlePodPayMethodChange = () => {
    const selected = document.querySelector('input[name="podPayMethod"]:checked')?.value || 'COD';
    const codCol = document.getElementById('podCodCollected');

    if (selected === 'COD') {
        codCol.disabled = false;
    } else {
        codCol.disabled = true;
        codCol.value = '0';
    }
};

export const submitPodDelivered = (e) => {
    if (e) e.preventDefault();
    const db = getDB();
    const cid = currentPodCid;
    if (!cid) return alert('Error: Consignment ID missing.');

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    const ncndAmt = parseFloat(document.getElementById('podNcndAmount').value) || 0;
    const ncndCol = parseFloat(document.getElementById('podNcndCollected').value) || 0;
    const ncndRemarks = document.getElementById('podNcndRemarks').value.trim();

    if (ncndCol < ncndAmt && !ncndRemarks) {
        return alert('Validation Failed: Please enter NCND Remarks because NCND Collected is less than NCND Amount.');
    }

    const selectedPayRadio = document.querySelector('input[name="podPayMethod"]:checked');
    const selectedPayMethod = selectedPayRadio ? selectedPayRadio.value : 'COD';

    const payModeRemarks = document.getElementById('podPayModeRemarks').value.trim();

    if (selectedPayMethod !== (currentPodDefaultMethod || 'COD') && !payModeRemarks) {
        return alert('Validation Failed: Please enter Payment Mode Remarks since the default Payment Method was changed.');
    }

    const courierCharge = parseFloat(document.getElementById('podCourierCharge').value) || 0;
    const codCol = parseFloat(document.getElementById('podCodCollected').value) || 0;
    const codRemarks = document.getElementById('podCodRemarks').value.trim();

    if (selectedPayMethod === 'COD' && codCol !== courierCharge && !codRemarks) {
        return alert('Validation Failed: Please enter COD Remarks because COD Collected is different from the Courier Charge.');
    }

    document.getElementById('actionModalTitle').textContent = `Deliver Consignment: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest mb-1.5">You want to mark this consignment as Delivered?</p>
      </div>
      <button onclick="window.executePodDelivered('${c.id}')" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">Confirm Delivery</button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executePodDelivered = async (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    const ncndAmt = parseFloat(document.getElementById('podNcndAmount').value) || 0;
    const ncndCol = parseFloat(document.getElementById('podNcndCollected').value) || 0;
    const ncndRemarks = document.getElementById('podNcndRemarks').value.trim();
    const selectedPayRadio = document.querySelector('input[name="podPayMethod"]:checked');
    const selectedPayMethod = selectedPayRadio ? selectedPayRadio.value : 'COD';
    const payModeRemarks = document.getElementById('podPayModeRemarks').value.trim();
    const courierCharge = parseFloat(document.getElementById('podCourierCharge').value) || 0;
    const codCol = parseFloat(document.getElementById('podCodCollected').value) || 0;
    const codRemarks = document.getElementById('podCodRemarks').value.trim();
    const doCollected = document.getElementById('podDoCollected').checked;
    const doToBeCollected = document.getElementById('podDoToBeCollected').checked;
    const doRemarks = document.getElementById('podDoRemarks').value.trim();

    const btn = document.querySelector('#actionModal button');
    if (btn) {
        btn.textContent = 'Processing...';
        btn.disabled = true;
    }

    let photoUrl = c.deliveryPhoto;
    if (tempPodPhotoData) {
        photoUrl = await uploadImageToSupabase(tempPodPhotoData, `delivery_pod_${cid}_${Date.now()}.jpg`);
    }

    if (ncndCol !== ncndAmt) { c.productAmount = ncndCol; }
    if (selectedPayMethod === 'COD' && codCol !== courierCharge) { c.deliveryCharge = codCol; }
    if (selectedPayMethod === 'PKP') { c.feeType = 'COC'; } else { c.feeType = selectedPayMethod; }

    c.status = 'Delivered';
    c.deliveredAt = getUAEISOString();
    c.deliveryPhoto = photoUrl;
    c.podData = {
        receiverName: document.getElementById('podReceiverName').value.trim(),
        ncndCollected: ncndCol,
        ncndPayMethod: document.querySelector('input[name="podNcndPayMethod"]:checked') ? document.querySelector('input[name="podNcndPayMethod"]:checked').value : 'Cash',
        ncndRemarks: ncndRemarks,
        payMethod: selectedPayMethod,
        payModeRemarks: payModeRemarks,
        codCollected: codCol,
        codRemarks: codRemarks,
        doCollected: doCollected,
        doToBeCollected: doToBeCollected,
        doRemarks: doRemarks
    };

    await saveDB();
    closeModal('actionModal');
    closeModal('podModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const submitPodReturn = () => {
    const cid = currentPodCid;
    if (!cid) return alert("Error: Consignment ID not found.");
    closeModal('podModal');
    openReturnModal(cid);
};

export const openReturnModal = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    document.getElementById('actionModalTitle').textContent = `Return Consignment: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-rose-bg)] border border-[#f43f5e]/20 rounded-xl">
        <p class="text-[10px] font-extrabold text-[var(--status-rose)] uppercase tracking-widest mb-2">Reason for Return</p>
        <textarea id="returnRemark" rows="3" class="w-full border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs font-bold bg-[var(--bg-surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--status-rose)] focus:border-[var(--status-rose)] transition-all placeholder-[var(--text-muted)] resize-none" placeholder="e.g., Customer not available..."></textarea>
      </div>
      <button onclick="window.confirmReturn('${c.id}')" class="w-full bg-[var(--status-rose)] hover:bg-[#e11d48] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">Confirm Return</button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const confirmReturn = async (cid) => {
    const db = getDB();
    const remark = document.getElementById('returnRemark').value.trim();
    if (!remark) return alert('Please enter a remark or reason for the return.');
    if (!confirm('Are you sure you want to mark this consignment as Returned?')) return;

    const c = db.consignments.find(x => x.id === cid);
    c.status = 'Returned';
    c.returnReason = remark;
    c.deliveredAt = getUAEISOString();

    await saveDB();
    closeModal('actionModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const viewPickupPhoto = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    document.getElementById('actionModalTitle').textContent = `Pick Up Photo: ${c.id}`;
    if (c.pickupPhoto) {
      document.getElementById('actionModalBody').innerHTML = `<div class="flex justify-center bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)]"><img src="${c.pickupPhoto}" class="max-h-[60vh] object-contain rounded-lg shadow-sm" alt="Pickup Photo" /></div>`;
    } else {
      document.getElementById('actionModalBody').innerHTML = `<div class="p-8 text-center text-[var(--text-muted)] font-bold border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] text-[10px] uppercase tracking-widest">No Pick Up Photo available.</div>`;
    }
    document.getElementById('actionModal').classList.remove('hidden');
};

export const viewDeliveryPhoto = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    document.getElementById('actionModalTitle').textContent = `Delivery Photo: ${c.id}`;
    if (c.deliveryPhoto) {
      document.getElementById('actionModalBody').innerHTML = `<div class="flex justify-center bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)]"><img src="${c.deliveryPhoto}" class="max-h-[60vh] object-contain rounded-lg shadow-sm" alt="Delivery Photo" /></div>`;
    } else {
      document.getElementById('actionModalBody').innerHTML = `<div class="p-8 text-center text-[var(--text-muted)] font-bold border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] text-[10px] uppercase tracking-widest">No Delivery Photo available.</div>`;
    }
    document.getElementById('actionModal').classList.remove('hidden');
};

export const agentMarkCocCollected = async (cid) => {
    const db = getDB();
    if (!confirm('Mark this pending COC amount as collected from the vendor?')) return;
    const c = db.consignments.find(x => x.id === cid);
    if (c) {
      c.cocStatus = 'COLLECTED';
      await saveDB();
      if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
      alert('Marked as collected. The Admin must now confirm receipt in the office.');
    }
};

export const markDeficitReceived = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    const v = getVendorByCode(c.vendorCode);
    const { deficitAmt } = getDeficitInfo(c);

    document.getElementById('deficitModalContent').innerHTML = `
      <div class="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] space-y-2 text-[var(--text-primary)]">
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Tracking ID:</b> <span class="font-black tracking-widest uppercase">${c.id}</span></p>
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Merchant:</b> <span class="font-bold">${v ? v.name : c.vendorCode}</span></p>
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Pickup Origin:</b> <span class="font-bold">${getAgentName(c.pickedUpBy)}</span></p>
        <div class="h-px bg-[var(--border-color)] w-full my-2"></div>
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Deficit Due:</b> <span class="text-[var(--status-rose)] font-black text-lg tabular-nums">${formatAmt(deficitAmt)} AED</span></p>
      </div>
      <p class="mt-4 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest text-center leading-relaxed">Confirm cash has been received from the merchant for this balance deficit.</p>
    `;

    document.getElementById('deficitConfirmBtn').onclick = async function () {
      c.deficitReceivedDate = getUAEISOString();
      db.vendorPayments.unshift({
          id: 'LED-' + Date.now() + Math.floor(Math.random() * 1000),
          vendorCode: c.vendorCode, type: 'RECEIVED', amount: deficitAmt,
          date: getUAEISOString().split('T')[0], notes: `Deficit Settled at Pickup for AWB: ${c.id}`
      });
      await saveDB();
      closeModal('deficitModal');

      if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
      if (document.getElementById('tab-invoices')?.classList.contains('tab-active')) {
          generateInvoicePreview();
          if (typeof window.renderVendorLedger === 'function') window.renderVendorLedger();
      }
    };

    document.getElementById('deficitModal').classList.remove('hidden');
};

export const adminConfirmPendingCoc = async (cid) => {
    const db = getDB();
    if (!confirm('Confirm physical receipt of this pending COC amount in the office?')) return;
    const c = db.consignments.find(x => x.id === cid);
    if (c) {
      c.cocStatus = 'SETTLED';
      c.cocPendingAmount = 0;
      await saveDB();
      if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
      if (document.getElementById('tab-invoices')?.classList.contains('tab-active')) generateInvoicePreview();
    }
};

export const sendWhatsAppStatus = (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    const v = getVendorByCode(c.vendorCode);
    const vendorName = v ? v.name : c.vendorCode;
    const collectAmt = c.feeType === 'COD' ? (parseFloat(c.productAmount) + parseFloat(c.deliveryCharge)) : parseFloat(c.productAmount);

    const message = `Dear Customer,\nYour Shipment RefNo: *${c.id}*\n(From : *${vendorName}*),is on the way for delivery.\nAmount: Aed *${formatAmt(collectAmt)}*`;
    window.open(`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
};
