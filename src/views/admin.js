// /src/views/admin.js
import { getDB, saveDB, getCurrentUser } from '../services/store.js';
import { getUAEISOString, formatAmt, closeModal, getVendorByCode, getDeficitInfo } from '../utils/helpers.js';
import { hashPassword } from '../services/auth.js';
import { generateInvoicePreview } from './finance.js';

let editingVendorCode = null;

export const saveSupabaseConfigFromTab = () => {
    const url = document.getElementById('adminSupabaseUrlInput').value.trim();
    const key = document.getElementById('adminSupabaseKeyInput').value.trim();
    if (!url || !key) return alert('Please enter both Supabase Project URL and Anon Key.');
    localStorage.setItem('NEXTWAY_SUPABASE_URL', url);
    localStorage.setItem('NEXTWAY_SUPABASE_KEY', key);
    location.reload();
};

export const clearSupabaseConfig = () => {
    if (confirm('Disconnect from Supabase? The app will operate in local offline mode.')) {
        localStorage.setItem('NEXTWAY_SUPABASE_URL', 'OFFLINE');
        localStorage.setItem('NEXTWAY_SUPABASE_KEY', 'OFFLINE');
        location.reload();
    }
};

export const toggleCloudSyncVisibility = async () => {
    const db = getDB();
    if (!db.settings) db.settings = {};
    db.settings.showCloudSyncConfig = db.settings.showCloudSyncConfig === false ? true : false;
    await saveDB();
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const applySettingsUi = () => {
    const db = getDB();
    if (!db.settings) db.settings = {};
    const showSync = db.settings.showCloudSyncConfig !== false;
    const block = document.getElementById('cloudSyncConfigBlock');
    if (block) block.classList.toggle('hidden', !showSync);
};

export const archiveOldDeliveries = async () => {
    const db = getDB();
    if (!confirm('Archive delivered & returned consignments older than 24 hours? \n\nThis permanently removes them from the Live Sync feed to keep your app fast.')) return;
    const now = new Date();
    let initialCount = db.consignments.length;

    db.consignments = db.consignments.filter(c => {
        if (c.status !== 'Delivered' && c.status !== 'Returned') return true;
        const dDate = new Date(c.deliveredAt || c.createdAt);
        return ((now.getTime() - dDate.getTime()) / (1000 * 60 * 60)) < 24;
    });

    const removed = initialCount - db.consignments.length;
    await saveDB();
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
    alert(removed + ' old consignments archived.');
};

export const purgeOldPhotos60Days = async () => {
    const db = getDB();
    if (!confirm('Purge photos from delivered & returned consignments older than 60 days? \n\nThis keeps the text data but removes the heavy image files.')) return;

    const now = new Date();
    let purgedCount = 0;

    db.consignments.forEach(c => {
        if (c.status === 'Delivered' || c.status === 'Returned') {
            const dDate = new Date(c.deliveredAt || c.createdAt);
            const daysOld = (now.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysOld >= 60 && (c.pickupPhoto || c.deliveryPhoto)) {
                c.pickupPhoto = null;
                c.deliveryPhoto = null;
                purgedCount++;
            }
        }
    });

    if (purgedCount > 0) {
        await saveDB();
        if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
        alert(purgedCount + ' consignments had their photos successfully purged.');
    } else {
        alert('No photos older than 60 days were found.');
    }
};

export const clearAllConsignments = async () => {
    const db = getDB();
    if (!confirm('WARNING: This will permanently delete ALL consignments without retaining any history or archive.\n\nAre you sure you want to proceed?')) return;
    if (!confirm('Are you absolutely sure? This action cannot be undone.')) return;
    db.consignments = [];
    await saveDB();
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
    alert('All consignments have been successfully cleared.');
};

export const downloadBackup = () => {
    const db = getDB();
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db));
    a.download = 'Backup.json';
    document.body.appendChild(a);
    a.click();
};

export const restoreBackup = (e) => {
    const r = new FileReader();
    r.onload = async ev => {
        const parsed = JSON.parse(ev.target.result);
        const db = getDB();
        Object.assign(db, parsed);
        await saveDB();
        location.reload();
    };
    r.readAsText(e.target.files[0]);
};

export const downloadImportTemplate = () => {
    if (typeof window.XLSX === 'undefined') { alert("Excel library loading. Please try again."); return; }
    const wb = window.XLSX.utils.book_new();
    const wsData = [
        ["Consignment ID", "Merchant Code", "Customer Name", "Customer Phone", "Delivery Address", "Weight", "Pieces", "Product Amount", "Delivery Fee", "Fee Type", "Picked Up Origin"],
        ["10045", "VND-001", "John Doe", "+971501234567", "Dubai Marina", 1.5, 1, 150, 20, "COD", "agent1"],
        ["10046", "VND-001", "Jane Smith", "+971509876543", "Abu Dhabi", 2.0, 2, 0, 30, "COC", "agent1"]
    ];
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    window.XLSX.utils.book_append_sheet(wb, ws, "Template");
    window.XLSX.writeFile(wb, "Consignment_Import_Template.xlsx");
};

export const importConsignmentsFromExcel = (e) => {
    const db = getDB();
    const file = e.target.files[0]; if (!file) return;
    if (typeof window.XLSX === 'undefined') { alert("Excel library is still loading. Please try again."); return; }

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const workbook = window.XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
            const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (rows.length === 0) { alert("The uploaded spreadsheet is empty."); return; }

            let importedCount = 0; let errorCount = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const vCode = (row["Merchant Code"] || row["Vendor Code"] || "").toString().trim().toUpperCase();
                const rawPicker = (row["Picked Up Origin"] || "").toString().trim();

                if (vCode) {
                    const v = getVendorByCode(vCode);
                    if (!v) {
                        alert(`Import Rejected: Merchant Code "${vCode}" in row ${i + 1} does not exist in the system.`);
                        e.target.value = ""; return;
                    }
                } else {
                    alert(`Import Rejected: Missing Merchant Code in row ${i + 1}.`);
                    e.target.value = ""; return;
                }

                if (rawPicker) {
                    const pUser = db.users.find(u => u.role === 'AGENT' && (u.username.toLowerCase() === rawPicker.toLowerCase() || u.name.toLowerCase() === rawPicker.toLowerCase() || u.id.toUpperCase() === rawPicker.toUpperCase()));
                    if (!pUser) {
                        alert(`Import Rejected: Picked Up Origin "${rawPicker}" in row ${i + 1} does not match any active personnel.`);
                        e.target.value = ""; return;
                    }
                }
            }

            for (const row of rows) {
                const id = (row["Consignment ID"] || "").toString().trim();
                const vCode = (row["Merchant Code"] || row["Vendor Code"] || "").toString().trim().toUpperCase();
                const cName = (row["Customer Name"] || "").toString().trim();
                const cPhone = (row["Customer Phone"] || "").toString().trim();
                const dAddress = (row["Delivery Address"] || "").toString().trim();
                const weightVal = parseFloat(row["Weight"]) || 1;
                const piecesVal = parseInt(row["Pieces"], 10) || 1;
                const pAmt = parseFloat(row["Product Amount"]) || 0;
                const dFee = parseFloat(row["Delivery Fee"]) || 0;
                const fType = (row["Fee Type"] || "COD").toString().trim().toUpperCase();
                const rawPicker = (row["Picked Up Origin"] || "").toString().trim();

                if (!vCode || !cName || !dAddress) { errorCount++; continue; }
                if (!id) { errorCount++; continue; }
                else if (db.consignments.some(c => c.id.toUpperCase() === id.toUpperCase())) { errorCount++; continue; }

                const v = getVendorByCode(vCode);

                let pickedUpBy = null;
                if (rawPicker) {
                    const pUser = db.users.find(u => u.role === 'AGENT' && (u.username.toLowerCase() === rawPicker.toLowerCase() || u.name.toLowerCase() === rawPicker.toLowerCase() || u.id.toUpperCase() === rawPicker.toUpperCase()));
                    if (pUser) pickedUpBy = pUser.id;
                }

                const initialStatus = pickedUpBy ? 'Picked Up' : 'Created';

                db.consignments.unshift({
                    id, vendorCode: vCode, pickupFrom: v ? v.address : "", customerName: cName, customerPhone: cPhone, deliveryAddress: dAddress,
                    productAmount: pAmt, deliveryCharge: dFee, feeType: fType, weight: weightVal, pieces: piecesVal, pendingModification: null, assignedTo: null, pickedUpBy: pickedUpBy, deficitReceivedDate: null, cocPendingAmount: 0, cocStatus: null,
                    rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null, rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
                    status: initialStatus, qrGenerated: false, otpCode: String(Math.floor(1000 + Math.random() * 9000)), otpVerified: false,
                    pickupPhoto: null, deliveryPhoto: null, returnReason: '', createdAt: getUAEISOString().split('T')[0], pickedUpAt: pickedUpBy ? getUAEISOString() : null, deliveredAt: null
                });
                importedCount++;
            }
            await saveDB();
            if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
            alert(`Successfully imported ${importedCount} consignments.\nSkipped ${errorCount} invalid rows.`);
        } catch {
            alert("Error parsing the file. Please ensure it follows the downloaded template format.");
        } finally {
            e.target.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
};

export const toggleAutoAdjust = () => {
    const val = document.getElementById('vAutoAdjustVal');
    const btn = document.getElementById('vAutoAdjustBtn');
    if (val.value === 'true') {
        val.value = 'false';
        btn.textContent = 'Disabled';
        btn.className = 'w-full text-left font-extrabold border border-[#f43f5e]/20 rounded-xl px-4 py-3 bg-[var(--status-rose-bg)] text-[var(--status-rose)] transition-colors uppercase tracking-widest';
    } else {
        val.value = 'true';
        btn.textContent = 'Enabled';
        btn.className = 'w-full text-left font-extrabold border border-[#10b981]/20 rounded-xl px-4 py-3 bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] transition-colors uppercase tracking-widest';
    }
};

export const openVendorModal = () => {
    const db = getDB();
    editingVendorCode = null;
    document.getElementById('vendorModalTitle').textContent = 'Add Merchant';
    document.getElementById('vCode').value = 'VND-00' + (db.vendors.length + 1);
    document.getElementById('vCode').readOnly = false;
    document.getElementById('vCode').classList.remove('bg-[var(--border-color-strong)]');
    document.getElementById('vName').value = '';
    document.getElementById('vPhone').value = '+971';
    document.getElementById('vAddress').value = '';
    document.getElementById('vTRN').value = '';

    const btn = document.getElementById('vAutoAdjustBtn');
    const val = document.getElementById('vAutoAdjustVal');
    val.value = 'true';
    btn.textContent = 'Enabled';
    btn.className = 'w-full text-left font-extrabold border border-[#10b981]/20 rounded-xl px-4 py-3 bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] transition-colors uppercase tracking-widest';
    document.getElementById('vendorModal').classList.remove('hidden');
};

export const openEditVendorModal = (code) => {
    const v = getVendorByCode(code); if (!v) return;
    editingVendorCode = code;
    document.getElementById('vendorModalTitle').textContent = 'Edit Merchant';
    document.getElementById('vCode').value = v.code;
    document.getElementById('vCode').readOnly = true;
    document.getElementById('vCode').classList.add('bg-[var(--border-color-strong)]');
    document.getElementById('vName').value = v.name;
    document.getElementById('vPhone').value = v.phone;
    document.getElementById('vAddress').value = v.address;
    document.getElementById('vTRN').value = v.trn || '';

    const btn = document.getElementById('vAutoAdjustBtn');
    const val = document.getElementById('vAutoAdjustVal');
    if (v.autoAdjustment === false) {
        val.value = 'false'; btn.textContent = 'Disabled'; btn.className = 'w-full text-left font-extrabold border border-[#f43f5e]/20 rounded-xl px-4 py-3 bg-[var(--status-rose-bg)] text-[var(--status-rose)] transition-colors uppercase tracking-widest';
    } else {
        val.value = 'true'; btn.textContent = 'Enabled'; btn.className = 'w-full text-left font-extrabold border border-[#10b981]/20 rounded-xl px-4 py-3 bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] transition-colors uppercase tracking-widest';
    }
    document.getElementById('vendorModal').classList.remove('hidden');
};

export const saveVendor = async (e) => {
    e.preventDefault();
    const db = getDB();
    const currentUser = getCurrentUser();
    const autoAdjust = document.getElementById('vAutoAdjustVal').value === 'true';

    if (editingVendorCode) {
        const v = db.vendors.find(x => x.code === editingVendorCode);
        if (v) {
            v.name = document.getElementById('vName').value;
            v.phone = document.getElementById('vPhone').value;
            v.address = document.getElementById('vAddress').value;
            v.trn = document.getElementById('vTRN').value;
            v.autoAdjustment = autoAdjust;
        }
    } else {
        const newCode = document.getElementById('vCode').value.toUpperCase();
        if (db.vendors.some(x => x.code === newCode)) return alert('Vendor code already exists!');
        db.vendors.push({
            code: newCode, name: document.getElementById('vName').value,
            phone: document.getElementById('vPhone').value,
            address: document.getElementById('vAddress').value,
            trn: document.getElementById('vTRN').value,
            autoAdjustment: autoAdjust
        });
    }
    await saveDB();
    closeModal('vendorModal');
    if (currentUser && currentUser.role === 'ADMIN') renderVendors();

    if (!document.getElementById('consignmentModal').classList.contains('hidden')) {
        const currentSelected = document.getElementById('cVendorSelect').value;
        document.getElementById('cVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
        document.getElementById('cVendorSelect').value = editingVendorCode ? currentSelected : document.getElementById('vCode').value.toUpperCase();
        if (typeof window.syncVendorPickupAddress === 'function') window.syncVendorPickupAddress();
    }
};

export const deleteVendor = async (code) => {
    const db = getDB();
    if (!confirm(`Permanently remove vendor record ${code}? This action cannot be undone.`)) return;
    db.vendors = db.vendors.filter(v => v.code !== code);
    await saveDB();
    renderVendors();
};

export const renderVendors = () => {
    const db = getDB();
    document.getElementById('vendorTableBody').innerHTML = (document.getElementById('vendorCodeSearch').value
      ? db.vendors.filter(v => v.code.includes(document.getElementById('vendorCodeSearch').value.toUpperCase()))
      : db.vendors).map(v => {
        const autoBadge = v.autoAdjustment !== false
          ? '<span class="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] border border-[#10b981]/20 uppercase tracking-widest">Enabled</span>'
          : '<span class="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-[var(--status-rose-bg)] text-[var(--status-rose)] border border-[#f43f5e]/20 uppercase tracking-widest">Disabled</span>';

        return `<tr class="hover:bg-[var(--bg-base)] transition-colors">
          <td class="p-4 font-black text-[var(--text-primary)]">${v.code}</td>
          <td class="p-4 font-bold uppercase text-[var(--text-primary)]">${v.name}</td>
          <td class="p-4 font-bold text-[var(--text-secondary)] tabular-nums">${v.phone}</td>
          <td class="p-4 font-bold text-[var(--text-secondary)]">${v.address}</td>
          <td class="p-4">${autoBadge}</td>
          <td class="p-4 font-black text-[var(--text-primary)] tabular-nums">${db.consignments.filter(c => c.vendorCode === v.code).length}</td>
          <td class="p-4">
            <div class="flex gap-2">
              <button onclick="window.openEditVendorModal('${v.code}')" class="text-[var(--text-primary)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Edit</button>
              <button onclick="window.deleteVendor('${v.code}')" class="text-[var(--status-rose)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Del</button>
            </div>
          </td>
        </tr>`;
    }).join('');
};

export const openVendorPaymentModal = () => {
    const db = getDB();
    document.getElementById('vpVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
    document.getElementById('vendorPaymentModal').classList.remove('hidden');
};

export const saveVendorLedgerEntry = async (e) => {
    e.preventDefault();
    const db = getDB();
    db.vendorPayments.unshift({
        id: 'LED-' + Date.now(),
        vendorCode: document.getElementById('vpVendorSelect').value,
        type: document.getElementById('vpType').value,
        amount: parseFloat(document.getElementById('vpAmount').value),
        date: document.getElementById('vpDate').value,
        notes: document.getElementById('vpNotes').value
    });
    await saveDB();
    closeModal('vendorPaymentModal');
    renderVendorLedger();
    generateInvoicePreview();
};

export const renderVendorLedger = () => {
    const db = getDB();
    document.getElementById('vendorLedgerTableBody').innerHTML = (db.vendorPayments || []).map(p => `<tr class="hover:bg-[var(--bg-base)] transition-colors">
      <td class="p-4 font-bold text-[var(--text-secondary)]">${p.date}</td>
      <td class="p-4 font-black text-[var(--text-primary)] uppercase">${p.vendorCode}</td>
      <td class="p-4 text-[10px] font-extrabold uppercase tracking-widest ${p.type === 'PAID' ? 'text-[var(--status-emerald)]' : 'text-[var(--status-blue)]'}">${p.type}</td>
      <td class="p-4 font-black text-right text-[var(--text-primary)] tabular-nums">${formatAmt(p.amount)} AED</td>
      <td class="p-4 font-bold text-[var(--text-secondary)]">${p.notes}</td>
      <td class="p-4 text-center"><button onclick="window.deleteLedger('${p.id}')" class="text-[var(--status-rose)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Remove</button></td>
    </tr>`).join('');
};

export const deleteLedger = async (id) => {
    const db = getDB();
    if (confirm('Delete ledger entry?')) {
        db.vendorPayments = db.vendorPayments.filter(x => x.id !== id);
        await saveDB();
        renderVendorLedger();
        generateInvoicePreview();
    }
};

export const openVendorSettlementOtpModal = () => {
    const db = getDB();
    document.getElementById('vsoVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
    document.getElementById('vsoAgentSelect').innerHTML = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');
    document.getElementById('vsoAmount').value = '';
    document.getElementById('vendorSettlementOtpModal').classList.remove('hidden');
};

export const sendSettlementOtp = async (e) => {
    e.preventDefault();
    const db = getDB();
    const vendorCode = document.getElementById('vsoVendorSelect').value;
    const agentId = document.getElementById('vsoAgentSelect').value;
    const amt = document.getElementById('vsoAmount').value;

    const v = getVendorByCode(vendorCode);
    const a = db.users.find(u => u.id === agentId);
    if (!v || !a) return;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.vendorSettlementOtps.push({
        id: 'S-OTP-' + Date.now(), vendorCode: vendorCode, agentId: agentId,
        amount: parseFloat(amt), otp: otp, status: 'PENDING', date: getUAEISOString()
    });

    await saveDB();
    closeModal('vendorSettlementOtpModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();

    const msg = `Hello ${v.name},\n\nA settlement amount of *${formatAmt(amt)} AED* is being processed for handover by our Delivery Agent, *${a.name}*.\n\nPlease share this OTP: *${otp}* with the agent ONLY after you have received the exact amount.\n\nThank you,\nNEXT WAY DELIVERY`;
    window.open(`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

export const verifySettlementOtp = async (otpId) => {
    const db = getDB();
    const o = db.vendorSettlementOtps.find(x => x.id === otpId); if (!o) return;
    const input = document.getElementById(`verifyOtpInput_${otpId}`).value.trim();
    if (input !== o.otp) return alert('Invalid OTP!');

    const a = db.users.find(u => u.id === o.agentId);
    o.status = 'VERIFIED';
    db.vendorPayments.unshift({
        id: 'LED-' + Date.now(), vendorCode: o.vendorCode, type: 'PAID', amount: o.amount,
        date: getUAEISOString().split('T')[0], notes: `Settlement Handover (Agent: ${a ? a.name : 'Unknown'}) - OTP Verified`
    });

    await saveDB();
    alert('OTP Verified successfully! Payment has been recorded in the ledger.');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();

    if (document.getElementById('tab-invoices').classList.contains('tab-active')) {
        generateInvoicePreview();
        renderVendorLedger();
    }
};

export const cancelSettlementOtp = async (otpId) => {
    const db = getDB();
    if (!confirm('Are you sure you want to cancel and delete this OTP?')) return;
    db.vendorSettlementOtps = db.vendorSettlementOtps.filter(x => x.id !== otpId);
    await saveDB();
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const adminConfirmRto = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    document.getElementById('actionModalTitle').textContent = `Confirm RTO: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest mb-1.5">You want to confirm RTO ${c.id} received by owner?</p>
      </div>
      <button onclick="window.executeAdminConfirmRto('${c.id}')" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">
        Confirm RTO Receipt
      </button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executeAdminConfirmRto = async (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    c.rtoStatus = 'CONFIRMED';
    c.rtoConfirmedAt = getUAEISOString();

    await saveDB();
    closeModal('actionModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const adminRejectRto = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    document.getElementById('actionModalTitle').textContent = `Reject RTO: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-rose-bg)] border border-[#f43f5e]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-rose)] uppercase tracking-widest mb-1.5">Reject RTO submission for ${c.id} and send back to RTO card?</p>
      </div>
      <button onclick="window.executeAdminRejectRto('${c.id}')" class="w-full bg-[var(--status-rose)] hover:bg-[#e11d48] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">
        Confirm Reject
      </button>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const executeAdminRejectRto = async (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    c.rtoStatus = 'ASSIGNED';
    c.rtoSubmittedAt = null;

    await saveDB();
    closeModal('actionModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const openAgentModal = () => {
    document.getElementById('aName').value = '';
    document.getElementById('aUser').value = '';
    document.getElementById('aPhone').value = '';
    document.getElementById('aPass').value = '';
    document.getElementById('agentModal').classList.remove('hidden');
};

export const saveAgent = async (e) => {
    e.preventDefault();
    const db = getDB();
    db.users.push({
        id: 'AG-' + Math.floor(100 + Math.random() * 900),
        username: document.getElementById('aUser').value,
        name: document.getElementById('aName').value,
        phone: document.getElementById('aPhone').value,
        role: 'AGENT',
        passwordHash: await hashPassword(document.getElementById('aPass').value),
        status: 'ACTIVE'
    });
    await saveDB();
    closeModal('agentModal');
    renderAgents();
};

export const renderAgents = () => {
    const db = getDB();
    document.getElementById('agentTableBody').innerHTML = db.users.filter(u => u.role === 'AGENT').map(a => `<tr class="hover:bg-[var(--bg-base)] transition-colors">
      <td class="p-4 font-black text-[var(--text-primary)]">${a.id}</td>
      <td class="p-4 font-bold uppercase text-[var(--text-primary)]">${a.name}</td>
      <td class="p-4 font-bold text-[var(--text-secondary)]">${a.username}</td>
      <td class="p-4 text-[10px] font-extrabold uppercase tracking-widest ${a.status === 'ACTIVE' ? 'text-[var(--status-emerald)]' : 'text-[var(--status-rose)]'}">${a.status}</td>
      <td class="p-4">
        <div class="flex gap-2">
          <button onclick="window.setAgentStatus('${a.id}','${a.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'}')" class="${a.status === 'ACTIVE' ? 'text-[var(--status-rose)]' : 'text-[var(--status-emerald)]'} font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">${a.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
          <button onclick="window.adminResetAgentPassword('${a.id}')" class="text-[var(--text-primary)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Reset</button>
          <button onclick="window.adminDeleteAgent('${a.id}')" class="text-[var(--status-rose)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Del</button>
        </div>
      </td>
    </tr>`).join('');
};

export const setAgentStatus = async (id, st) => {
    const db = getDB();
    const a = db.users.find(u => u.id === id);
    if (a) a.status = st;
    await saveDB();
    renderAgents();
};

export const adminDeleteAgent = async (id) => {
    const db = getDB();
    if (!confirm('Permanently remove this agent account?')) return;
    db.users = db.users.filter(x => x.id !== id);
    await saveDB();
    renderAgents();
};

export const adminResetAgentPassword = async (id) => {
    const db = getDB();
    const newPass = prompt('Enter new password for this agent:');
    if (!newPass) return;
    const a = db.users.find(u => u.id === id);
    if (a) {
        a.passwordHash = await hashPassword(newPass);
        await saveDB();
        alert('Password updated successfully.');
    }
};

export const openCredentialsModal = () => {
    document.getElementById('selfCurrentPassword').value = '';
    document.getElementById('selfNewPassword').value = '';
    document.getElementById('credentialsModal').classList.remove('hidden');
};

export const changeOwnPassword = async (e) => {
    if (e) e.preventDefault();
    const db = getDB();
    const currentUser = getCurrentUser();

    const current = document.getElementById('selfCurrentPassword').value;
    const pass = document.getElementById('selfNewPassword').value.trim();
    if (!current || !pass) return alert('Enter both current and new passwords');

    const currentHash = await hashPassword(current);
    if (currentHash !== currentUser.passwordHash && current !== currentUser.passwordHash && current !== currentUser.password) {
      return alert('Incorrect current password');
    }

    currentUser.passwordHash = await hashPassword(pass);
    const userInDb = db.users.find(u => u.id === currentUser.id);
    if (userInDb) userInDb.passwordHash = currentUser.passwordHash;

    await saveDB();
    document.getElementById('selfCurrentPassword').value = '';
    document.getElementById('selfNewPassword').value = '';
    closeModal('credentialsModal');
    alert('Password updated successfully');
};

export const renderConfirmations = () => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!db || !currentUser) return;

    const p = db.consignments.filter(c => c.pendingModification && (currentUser.role === 'ADMIN' || c.assignedTo === currentUser.id));
    const pendingRtos = currentUser.role === 'ADMIN'
        ? db.consignments.filter(c => c.rtoStatus === 'SUBMITTED_BY_AGENT')
        : [];
    const badge = document.getElementById('navConfirmBadge');

    const totalAlerts = p.length + pendingRtos.length;
    if (totalAlerts > 0) {
        badge.textContent = totalAlerts;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    const modHtml = p.map(c => {
      const pm = c.pendingModification;
      let changesText = '';
      if (pm.type === 'FULL_EDIT') {
          changesText = `<b class="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">${c.id}</b>: Full details modified by Admin.<br><span class="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1 block">Product: <b class="text-[var(--status-emerald)]">${pm.productAmount}</b> | Fee: <b class="text-[var(--status-emerald)]">${pm.deliveryCharge}</b></span>`;
      } else {
          changesText = `<b class="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">${c.id}</b>: Product ${c.productAmount} -> <b class="text-[var(--status-emerald)]">${pm.newProductAmount}</b> <br> <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1 block">Service Fee ${c.deliveryCharge} -> <b class="text-[var(--status-emerald)]">${pm.newDeliveryCharge}</b></span>`;
      }
      const btnHtml = (currentUser.role === 'AGENT' && c.assignedTo === currentUser.id)
          ? `<button onclick="window.agentConfirmModification('${c.id}')" class="block mt-4 bg-[#0b0f19] text-[var(--accent-gold)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] hover:bg-[#131b2e] border border-[#1e293b] transition-all uppercase tracking-widest text-[10px]">Confirm Edit</button>`
          : `<div class="mt-4"><span class="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Waiting for field agent confirmation</span></div>`;
      return `<div class="p-5 border border-[#c9a24b]/30 rounded-xl bg-[#c9a24b]/10 mb-4 text-xs shadow-sm">${changesText} ${btnHtml}</div>`;
    }).join('');

    const rtoHtml = pendingRtos.map(c => {
      const v = getVendorByCode(c.vendorCode);
      const picker = db.users.find(u => u.id === c.rtoPickupBy);
      return `<div class="p-5 border border-[#3b82f6]/30 rounded-xl bg-[var(--status-blue-bg)] mb-4 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
        <div class="space-y-1.5">
          <b class="text-[var(--text-primary)] font-black text-sm tracking-widest uppercase">RTO Submitted: ${c.id}</b><br/>
          <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Owner / Merchant: <b class="text-[var(--text-primary)] ml-1">${v ? v.name : c.vendorCode}</b></span><br/>
          <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Submitted By: <b class="text-[var(--text-primary)] ml-1">${picker ? `${picker.name} - ${picker.id}` : (c.rtoPickupBy || 'Agent')}</b></span>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="window.adminConfirmRto('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] transition-all text-[10px] uppercase tracking-widest border border-[#1e293b]">Confirm RTO</button>
          <button onclick="window.adminRejectRto('${c.id}')" class="bg-[var(--bg-base)] hover:bg-[var(--border-color-strong)] text-[var(--status-rose)] border border-[var(--border-color)] font-extrabold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-[10px] uppercase tracking-widest">Reject</button>
        </div>
      </div>`;
    }).join('');

    document.getElementById('confirmationsList').innerHTML = (rtoHtml + modHtml) || '<div class="p-8 text-center text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)]">No pending modifications.</div>';

    if (currentUser.role === 'ADMIN') {
      const pendingOtps = db.vendorSettlementOtps.filter(o => o.status === 'PENDING');
      const otpCard = document.getElementById('adminSettlementOtpCard');
      if (otpCard) {
        otpCard.classList.toggle('hidden', pendingOtps.length === 0);
        document.getElementById('adminSettlementOtpList').innerHTML = pendingOtps.map(o => {
          const v = getVendorByCode(o.vendorCode); const a = db.users.find(u => u.id === o.agentId); const agentName = a ? a.name : 'Unknown Agent';
          return `<div class="p-5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] mb-4 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:border-[var(--accent-gold)] transition-colors">
            <div class="space-y-1.5">
              <b class="text-[var(--text-primary)] font-black text-sm uppercase">${v ? v.name : o.vendorCode}</b><br/>
              <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Amount: <b class="text-[var(--status-emerald)] tabular-nums text-xs ml-1">${formatAmt(o.amount)} AED</b></span><br/>
              <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Bearer: <b class="text-[var(--text-primary)] ml-1">${agentName}</b></span>
            </div>
            <div class="flex gap-2 shrink-0 items-center">
              <input id="verifyOtpInput_${o.id}" type="text" placeholder="OTP" class="w-24 border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-center font-black bg-[var(--bg-surface)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-all uppercase tracking-widest placeholder-[var(--text-muted)] shadow-sm" />
              <button onclick="window.verifySettlementOtp('${o.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] transition-all text-[10px] uppercase tracking-widest border border-[#1e293b]">Verify</button>
              <button onclick="window.cancelSettlementOtp('${o.id}')" class="bg-[var(--bg-base)] hover:bg-[var(--border-color-strong)] text-[var(--status-rose)] border border-[var(--border-color)] font-extrabold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-[10px] uppercase tracking-widest">Cancel</button>
            </div>
          </div>`;
        }).join('');
      }

      const cocHandovers = db.consignments.filter(c => c.feeType === 'COC' && c.cocStatus === 'COLLECTED');
      const cocCard = document.getElementById('adminCocHandoverCard');
      if (cocCard) {
        cocCard.classList.toggle('hidden', cocHandovers.length === 0);
        document.getElementById('adminCocHandoverList').innerHTML = cocHandovers.map(c => {
          const ag = db.users.find(u => u.id === c.pickedUpBy);
          return `<div class="p-5 border border-[#3b82f6]/30 rounded-xl bg-[var(--status-blue-bg)] mb-4 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:border-[#3b82f6]/50 transition-colors">
            <div class="space-y-1.5">
              <b class="text-[var(--text-primary)] font-black text-sm tracking-widest uppercase">${c.id}</b><br/>
              <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Agent: <b class="text-[var(--text-primary)] ml-1">${ag ? ag.name : c.pickedUpBy}</b></span><br/>
              <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Amount: <b class="text-[var(--status-blue)] tabular-nums text-xs ml-1">${formatAmt(c.cocPendingAmount)} AED</b></span>
            </div>
            <button onclick="window.adminConfirmPendingCoc('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--status-blue)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] shrink-0 transition-all text-[10px] uppercase tracking-widest border border-[#1e293b]">Confirm Deposit</button>
          </div>`;
        }).join('');
      }
    }
};

export const generateAdminFinanceTab = () => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    let collectedDeliveryCharges = 0;
    let totalPendingDeficit = 0;
    let totalExpenses = 0;

    db.consignments.forEach(c => {
      if (c.status === 'Delivered') {
        const expectedCharge = parseFloat(c.deliveryCharge) || 0;
        let pendingDeficitForThis = 0;

        const { isDeficit, deficitAmt } = getDeficitInfo(c);

        if (isDeficit && !c.deficitReceivedDate) {
          pendingDeficitForThis = deficitAmt;
          totalPendingDeficit += deficitAmt;
        }

        collectedDeliveryCharges += (expectedCharge - pendingDeficitForThis);
      }
    });

    if (db.agentExpenses) {
      db.agentExpenses.forEach(e => {
        if (e.status === 'APPROVED') {
          totalExpenses += (parseFloat(e.amount) || 0);
        }
      });
    }

    const profit = collectedDeliveryCharges - totalExpenses;

    document.getElementById('adminFinDeliveryCharges').textContent = formatAmt(collectedDeliveryCharges) + ' AED';
    document.getElementById('adminFinExpenses').textContent = formatAmt(totalExpenses) + ' AED';
    document.getElementById('adminFinDeficit').textContent = formatAmt(totalPendingDeficit) + ' AED';

    const profitEl = document.getElementById('adminFinProfit');
    const profitCard = document.getElementById('adminFinProfitCard');
    const profitLabel = document.getElementById('adminFinProfitLabel');

    profitEl.textContent = formatAmt(profit) + ' AED';

    if (profit < 0) {
      profitCard.className = "p-5 rounded-xl bg-[var(--status-rose-bg)] border border-[#f43f5e]/20 transition-colors";
      profitLabel.className = "text-[10px] font-extrabold text-[var(--status-rose)] uppercase tracking-wider";
      profitEl.className = "text-2xl font-black text-[var(--status-rose)] mt-2 transition-colors tabular-nums";
    } else {
      profitCard.className = "p-5 rounded-xl bg-[var(--status-emerald-bg)] border border-[#10b981]/20 transition-colors";
      profitLabel.className = "text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-wider";
      profitEl.className = "text-2xl font-black text-[var(--status-emerald)] mt-2 transition-colors tabular-nums";
    }
};
