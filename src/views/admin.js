// /src/views/admin.js
import { getDB, saveDB, getCurrentUser } from '../services/store.js';[span_871](start_span)[span_871](end_span)
import { getUAEISOString, formatAmt, closeModal, getVendorByCode, getDeficitInfo } from '../utils/helpers.js';[span_872](start_span)[span_872](end_span)[span_873](start_span)[span_873](end_span)
import { hashPassword } from '../services/auth.js';[span_874](start_span)[span_874](end_span)[span_875](start_span)[span_875](end_span)
import { generateInvoicePreview } from './finance.js';[span_876](start_span)[span_876](end_span)[span_877](start_span)[span_877](end_span)

let editingVendorCode = null;[span_878](start_span)[span_878](end_span)

export const saveSupabaseConfigFromTab = () => {[span_879](start_span)[span_879](end_span)
    const url = document.getElementById('adminSupabaseUrlInput').value.trim();[span_880](start_span)[span_880](end_span)
    const key = document.getElementById('adminSupabaseKeyInput').value.trim();[span_881](start_span)[span_881](end_span)
    if (!url || !key) return alert('Please enter both Supabase Project URL and Anon Key.');[span_882](start_span)[span_882](end_span)
    localStorage.setItem('NEXTWAY_SUPABASE_URL', url);[span_883](start_span)[span_883](end_span)
    localStorage.setItem('NEXTWAY_SUPABASE_KEY', key);[span_884](start_span)[span_884](end_span)
    location.reload();[span_885](start_span)[span_885](end_span)
};[span_886](start_span)[span_886](end_span)

export const clearSupabaseConfig = () => {[span_887](start_span)[span_887](end_span)
    if (confirm('Disconnect from Supabase? The app will operate in local offline mode.')) {[span_888](start_span)[span_888](end_span)
        localStorage.setItem('NEXTWAY_SUPABASE_URL', 'OFFLINE');[span_889](start_span)[span_889](end_span)
        localStorage.setItem('NEXTWAY_SUPABASE_KEY', 'OFFLINE');[span_890](start_span)[span_890](end_span)
        location.reload();[span_891](start_span)[span_891](end_span)
    }[span_892](start_span)[span_892](end_span)
};[span_893](start_span)[span_893](end_span)

export const toggleCloudSyncVisibility = async () => {[span_894](start_span)[span_894](end_span)
    const db = getDB();[span_895](start_span)[span_895](end_span)
    if (!db.settings) db.settings = {};[span_896](start_span)[span_896](end_span)
    db.settings.showCloudSyncConfig = db.settings.showCloudSyncConfig === false ? true : false;[span_897](start_span)[span_897](end_span)
    await saveDB();[span_898](start_span)[span_898](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_899](start_span)[span_899](end_span)
};[span_900](start_span)[span_900](end_span)

export const applySettingsUi = () => {[span_901](start_span)[span_901](end_span)
    const db = getDB();[span_902](start_span)[span_902](end_span)
    if (!db.settings) db.settings = {};[span_903](start_span)[span_903](end_span)
    const showSync = db.settings.showCloudSyncConfig !== false;[span_904](start_span)[span_904](end_span)
    const block = document.getElementById('cloudSyncConfigBlock');[span_905](start_span)[span_905](end_span)
    if (block) block.classList.toggle('hidden', !showSync);[span_906](start_span)[span_906](end_span)
};[span_907](start_span)[span_907](end_span)

export const archiveOldDeliveries = async () => {[span_908](start_span)[span_908](end_span)
    const db = getDB();[span_909](start_span)[span_909](end_span)
    if (!confirm('Archive delivered & returned consignments older than 24 hours? \n\nThis permanently removes them from the Live Sync feed to keep your app fast.')) return;[span_910](start_span)[span_910](end_span)
    const now = new Date();[span_911](start_span)[span_911](end_span)
    let initialCount = db.consignments.length;[span_912](start_span)[span_912](end_span)

    db.consignments = db.consignments.filter(c => {[span_913](start_span)[span_913](end_span)
        if (c.status !== 'Delivered' && c.status !== 'Returned') return true;[span_914](start_span)[span_914](end_span)
        const dDate = new Date(c.deliveredAt || c.createdAt);[span_915](start_span)[span_915](end_span)
        return ((now.getTime() - dDate.getTime()) / (1000 * 60 * 60)) < 24;[span_916](start_span)[span_916](end_span)
    });[span_917](start_span)[span_917](end_span)

    const removed = initialCount - db.consignments.length;[span_918](start_span)[span_918](end_span)
    await saveDB();[span_919](start_span)[span_919](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_920](start_span)[span_920](end_span)
    alert(removed + ' old consignments archived.');[span_921](start_span)[span_921](end_span)
};[span_922](start_span)[span_922](end_span)

export const purgeOldPhotos60Days = async () => {[span_923](start_span)[span_923](end_span)
    const db = getDB();[span_924](start_span)[span_924](end_span)
    if (!confirm('Purge photos from delivered & returned consignments older than 60 days? \n\nThis keeps the text data but removes the heavy image files.')) return;[span_925](start_span)[span_925](end_span)

    const now = new Date();[span_926](start_span)[span_926](end_span)
    let purgedCount = 0;[span_927](start_span)[span_927](end_span)

    db.consignments.forEach(c => {[span_928](start_span)[span_928](end_span)
        if (c.status === 'Delivered' || c.status === 'Returned') {[span_929](start_span)[span_929](end_span)
            const dDate = new Date(c.deliveredAt || c.createdAt);[span_930](start_span)[span_930](end_span)
            const daysOld = (now.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24);[span_931](start_span)[span_931](end_span)

            if (daysOld >= 60 && (c.pickupPhoto || c.deliveryPhoto)) {[span_932](start_span)[span_932](end_span)
                c.pickupPhoto = null;[span_933](start_span)[span_933](end_span)
                c.deliveryPhoto = null;[span_934](start_span)[span_934](end_span)
                purgedCount++;[span_935](start_span)[span_935](end_span)
            }[span_936](start_span)[span_936](end_span)
        }[span_937](start_span)[span_937](end_span)
    });[span_938](start_span)[span_938](end_span)

    if (purgedCount > 0) {[span_939](start_span)[span_939](end_span)
        await saveDB();[span_940](start_span)[span_940](end_span)
        if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_941](start_span)[span_941](end_span)
        alert(purgedCount + ' consignments had their photos successfully purged.');[span_942](start_span)[span_942](end_span)
    } else {[span_943](start_span)[span_943](end_span)
        alert('No photos older than 60 days were found.');[span_944](start_span)[span_944](end_span)
    }[span_945](start_span)[span_945](end_span)
};[span_946](start_span)[span_946](end_span)

export const clearAllConsignments = async () => {[span_947](start_span)[span_947](end_span)
    const db = getDB();[span_948](start_span)[span_948](end_span)
    if (!confirm('WARNING: This will permanently delete ALL consignments without retaining any history or archive.\n\nAre you sure you want to proceed?')) return;[span_949](start_span)[span_949](end_span)
    if (!confirm('Are you absolutely sure? This action cannot be undone.')) return;[span_950](start_span)[span_950](end_span)
    db.consignments = [];[span_951](start_span)[span_951](end_span)
    await saveDB();[span_952](start_span)[span_952](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_953](start_span)[span_953](end_span)
    alert('All consignments have been successfully cleared.');[span_954](start_span)[span_954](end_span)
};[span_955](start_span)[span_955](end_span)

export const downloadBackup = () => {[span_956](start_span)[span_956](end_span)
    const db = getDB();[span_957](start_span)[span_957](end_span)
    const a = document.createElement('a');[span_958](start_span)[span_958](end_span)
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db));[span_959](start_span)[span_959](end_span)
    a.download = 'Backup.json';[span_960](start_span)[span_960](end_span)
    document.body.appendChild(a);[span_961](start_span)[span_961](end_span)
    a.click();[span_962](start_span)[span_962](end_span)
};[span_963](start_span)[span_963](end_span)

export const restoreBackup = (e) => {[span_964](start_span)[span_964](end_span)
    const r = new FileReader();[span_965](start_span)[span_965](end_span)
    r.onload = async ev => {[span_966](start_span)[span_966](end_span)
        const parsed = JSON.parse(ev.target.result);[span_967](start_span)[span_967](end_span)
        const db = getDB();[span_968](start_span)[span_968](end_span)
        Object.assign(db, parsed);[span_969](start_span)[span_969](end_span)
        await saveDB();[span_970](start_span)[span_970](end_span)
        location.reload();[span_971](start_span)[span_971](end_span)
    };[span_972](start_span)[span_972](end_span)
    r.readAsText(e.target.files[0]);[span_973](start_span)[span_973](end_span)
};[span_974](start_span)[span_974](end_span)

export const downloadImportTemplate = () => {[span_975](start_span)[span_975](end_span)
    if (typeof window.XLSX === 'undefined') { alert("Excel library loading. Please try again."); return; }[span_976](start_span)[span_976](end_span)
    const wb = window.XLSX.utils.book_new();[span_977](start_span)[span_977](end_span)
    const wsData = [[span_978](start_span)[span_978](end_span)
        ["Consignment ID", "Merchant Code", "Customer Name", "Customer Phone", "Delivery Address", "Weight", "Pieces", "Product Amount", "Delivery Fee", "Fee Type", "Picked Up Origin"],[span_979](start_span)[span_979](end_span)
        ["10045", "VND-001", "John Doe", "+971501234567", "Dubai Marina", 1.5, 1, 150, 20, "COD", "agent1"],[span_980](start_span)[span_980](end_span)
        ["10046", "VND-001", "Jane Smith", "+971509876543", "Abu Dhabi", 2.0, 2, 0, 30, "COC", "agent1"][span_981](start_span)[span_981](end_span)
    ];[span_982](start_span)[span_982](end_span)
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);[span_983](start_span)[span_983](end_span)
    window.XLSX.utils.book_append_sheet(wb, ws, "Template");[span_984](start_span)[span_984](end_span)
    window.XLSX.writeFile(wb, "Consignment_Import_Template.xlsx");[span_985](start_span)[span_985](end_span)
};[span_986](start_span)[span_986](end_span)

export const importConsignmentsFromExcel = (e) => {[span_987](start_span)[span_987](end_span)
    const db = getDB();[span_988](start_span)[span_988](end_span)
    const file = e.target.files[0]; if (!file) return;[span_989](start_span)[span_989](end_span)
    if (typeof window.XLSX === 'undefined') { alert("Excel library is still loading. Please try again."); return; }[span_990](start_span)[span_990](end_span)

    const reader = new FileReader();[span_991](start_span)[span_991](end_span)
    reader.onload = async (evt) => {[span_992](start_span)[span_992](end_span)
        try {[span_993](start_span)[span_993](end_span)
            const workbook = window.XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });[span_994](start_span)[span_994](end_span)
            const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);[span_995](start_span)[span_995](end_span)
            if (rows.length === 0) { alert("The uploaded spreadsheet is empty."); return; }[span_996](start_span)[span_996](end_span)

            let importedCount = 0; let errorCount = 0;[span_997](start_span)[span_997](end_span)

            for (let i = 0; i < rows.length; i++) {[span_998](start_span)[span_998](end_span)
                const row = rows[i];[span_999](start_span)[span_999](end_span)
                const vCode = (row["Merchant Code"] || row["Vendor Code"] || "").toString().trim().toUpperCase();[span_1000](start_span)[span_1000](end_span)
                const rawPicker = (row["Picked Up Origin"] || "").toString().trim();[span_1001](start_span)[span_1001](end_span)

                if (vCode) {[span_1002](start_span)[span_1002](end_span)
                    const v = getVendorByCode(vCode);[span_1003](start_span)[span_1003](end_span)
                    if (!v) {[span_1004](start_span)[span_1004](end_span)
                        alert(`Import Rejected: Merchant Code "${vCode}" in row ${i + 1} does not exist in the system.`);[span_1005](start_span)[span_1005](end_span)
                        e.target.value = ""; return;[span_1006](start_span)[span_1006](end_span)
                    }[span_1007](start_span)[span_1007](end_span)
                } else {[span_1008](start_span)[span_1008](end_span)
                    alert(`Import Rejected: Missing Merchant Code in row ${i + 1}.`);[span_1009](start_span)[span_1009](end_span)
                    e.target.value = ""; return;[span_1010](start_span)[span_1010](end_span)
                }[span_1011](start_span)[span_1011](end_span)

                if (rawPicker) {[span_1012](start_span)[span_1012](end_span)
                    const pUser = db.users.find(u => u.role === 'AGENT' && (u.username.toLowerCase() === rawPicker.toLowerCase() || u.name.toLowerCase() === rawPicker.toLowerCase() || u.id.toUpperCase() === rawPicker.toUpperCase()));[span_1013](start_span)[span_1013](end_span)
                    if (!pUser) {[span_1014](start_span)[span_1014](end_span)
                        alert(`Import Rejected: Picked Up Origin "${rawPicker}" in row ${i + 1} does not match any active personnel.`);[span_1015](start_span)[span_1015](end_span)
                        e.target.value = ""; return;[span_1016](start_span)[span_1016](end_span)
                    }[span_1017](start_span)[span_1017](end_span)
                }[span_1018](start_span)[span_1018](end_span)
            }[span_1019](start_span)[span_1019](end_span)

            for (const row of rows) {[span_1020](start_span)[span_1020](end_span)
                const id = (row["Consignment ID"] || "").toString().trim();[span_1021](start_span)[span_1021](end_span)
                const vCode = (row["Merchant Code"] || row["Vendor Code"] || "").toString().trim().toUpperCase();[span_1022](start_span)[span_1022](end_span)
                const cName = (row["Customer Name"] || "").toString().trim();[span_1023](start_span)[span_1023](end_span)
                const cPhone = (row["Customer Phone"] || "").toString().trim();[span_1024](start_span)[span_1024](end_span)
                const dAddress = (row["Delivery Address"] || "").toString().trim();[span_1025](start_span)[span_1025](end_span)
                const weightVal = parseFloat(row["Weight"]) || 1;[span_1026](start_span)[span_1026](end_span)
                const piecesVal = parseInt(row["Pieces"], 10) || 1;[span_1027](start_span)[span_1027](end_span)
                const pAmt = parseFloat(row["Product Amount"]) || 0;[span_1028](start_span)[span_1028](end_span)
                const dFee = parseFloat(row["Delivery Fee"]) || 0;[span_1029](start_span)[span_1029](end_span)
                const fType = (row["Fee Type"] || "COD").toString().trim().toUpperCase();[span_1030](start_span)[span_1030](end_span)
                const rawPicker = (row["Picked Up Origin"] || "").toString().trim();[span_1031](start_span)[span_1031](end_span)

                if (!vCode || !cName || !dAddress) { errorCount++; continue; }[span_1032](start_span)[span_1032](end_span)
                if (!id) { errorCount++; continue; }[span_1033](start_span)[span_1033](end_span)
                else if (db.consignments.some(c => c.id.toUpperCase() === id.toUpperCase())) { errorCount++; continue; }[span_1034](start_span)[span_1034](end_span)

                const v = getVendorByCode(vCode);[span_1035](start_span)[span_1035](end_span)

                let pickedUpBy = null;[span_1036](start_span)[span_1036](end_span)
                if (rawPicker) {[span_1037](start_span)[span_1037](end_span)
                    const pUser = db.users.find(u => u.role === 'AGENT' && (u.username.toLowerCase() === rawPicker.toLowerCase() || u.name.toLowerCase() === rawPicker.toLowerCase() || u.id.toUpperCase() === rawPicker.toUpperCase()));[span_1038](start_span)[span_1038](end_span)
                    if (pUser) pickedUpBy = pUser.id;[span_1039](start_span)[span_1039](end_span)
                }[span_1040](start_span)[span_1040](end_span)

                const initialStatus = pickedUpBy ? 'Picked Up' : 'Created';[span_1041](start_span)[span_1041](end_span)

                db.consignments.unshift({[span_1042](start_span)[span_1042](end_span)
                    id, vendorCode: vCode, pickupFrom: v ? v.address : "", customerName: cName, customerPhone: cPhone, deliveryAddress: dAddress,[span_1043](start_span)[span_1043](end_span)
                    productAmount: pAmt, deliveryCharge: dFee, feeType: fType, weight: weightVal, pieces: piecesVal, pendingModification: null, assignedTo: null, pickedUpBy: pickedUpBy, deficitReceivedDate: null, cocPendingAmount: 0, cocStatus: null,[span_1044](start_span)[span_1044](end_span)
                    rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null, rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
                    status: initialStatus, qrGenerated: false, otpCode: String(Math.floor(1000 + Math.random() * 9000)), otpVerified: false,[span_1045](start_span)[span_1045](end_span)
                    pickupPhoto: null, deliveryPhoto: null, returnReason: '', createdAt: getUAEISOString().split('T')[0], pickedUpAt: pickedUpBy ? getUAEISOString() : null, deliveredAt: null[span_1046](start_span)[span_1046](end_span)
                });[span_1047](start_span)[span_1047](end_span)
                importedCount++;[span_1048](start_span)[span_1048](end_span)
            }[span_1049](start_span)[span_1049](end_span)
            await saveDB();[span_1050](start_span)[span_1050](end_span)
            if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_1051](start_span)[span_1051](end_span)
            alert(`Successfully imported ${importedCount} consignments.\nSkipped ${errorCount} invalid rows.`);[span_1052](start_span)[span_1052](end_span)
        } catch {[span_1053](start_span)[span_1053](end_span)
            alert("Error parsing the file. Please ensure it follows the downloaded template format.");[span_1054](start_span)[span_1054](end_span)
        } finally {[span_1055](start_span)[span_1055](end_span)
            e.target.value = "";[span_1056](start_span)[span_1056](end_span)
        }[span_1057](start_span)[span_1057](end_span)
    };[span_1058](start_span)[span_1058](end_span)
    reader.readAsArrayBuffer(file);[span_1059](start_span)[span_1059](end_span)
};[span_1060](start_span)[span_1060](end_span)

export const toggleAutoAdjust = () => {[span_1061](start_span)[span_1061](end_span)
    const val = document.getElementById('vAutoAdjustVal');[span_1062](start_span)[span_1062](end_span)
    const btn = document.getElementById('vAutoAdjustBtn');[span_1063](start_span)[span_1063](end_span)
    if (val.value === 'true') {[span_1064](start_span)[span_1064](end_span)
        val.value = 'false';[span_1065](start_span)[span_1065](end_span)
        btn.textContent = 'Disabled';[span_1066](start_span)[span_1066](end_span)
        btn.className = 'w-full text-left font-extrabold border border-[#f43f5e]/20 rounded-xl px-4 py-3 bg-[var(--status-rose-bg)] text-[var(--status-rose)] transition-colors uppercase tracking-widest';[span_1067](start_span)[span_1067](end_span)
    } else {[span_1068](start_span)[span_1068](end_span)
        val.value = 'true';[span_1069](start_span)[span_1069](end_span)
        btn.textContent = 'Enabled';[span_1070](start_span)[span_1070](end_span)
        btn.className = 'w-full text-left font-extrabold border border-[#10b981]/20 rounded-xl px-4 py-3 bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] transition-colors uppercase tracking-widest';[span_1071](start_span)[span_1071](end_span)
    }[span_1072](start_span)[span_1072](end_span)
};[span_1073](start_span)[span_1073](end_span)

export const openVendorModal = () => {[span_1074](start_span)[span_1074](end_span)
    const db = getDB();[span_1075](start_span)[span_1075](end_span)
    editingVendorCode = null;[span_1076](start_span)[span_1076](end_span)
    document.getElementById('vendorModalTitle').textContent = 'Add Merchant';[span_1077](start_span)[span_1077](end_span)
    document.getElementById('vCode').value = 'VND-00' + (db.vendors.length + 1);[span_1078](start_span)[span_1078](end_span)
    document.getElementById('vCode').readOnly = false;[span_1079](start_span)[span_1079](end_span)
    document.getElementById('vCode').classList.remove('bg-[var(--border-color-strong)]');[span_1080](start_span)[span_1080](end_span)
    document.getElementById('vName').value = '';[span_1081](start_span)[span_1081](end_span)
    document.getElementById('vPhone').value = '+971';[span_1082](start_span)[span_1082](end_span)
    document.getElementById('vAddress').value = '';[span_1083](start_span)[span_1083](end_span)
    document.getElementById('vTRN').value = '';[span_1084](start_span)[span_1084](end_span)

    const btn = document.getElementById('vAutoAdjustBtn');[span_1085](start_span)[span_1085](end_span)
    const val = document.getElementById('vAutoAdjustVal');[span_1086](start_span)[span_1086](end_span)
    val.value = 'true';[span_1087](start_span)[span_1087](end_span)
    btn.textContent = 'Enabled';[span_1088](start_span)[span_1088](end_span)
    btn.className = 'w-full text-left font-extrabold border border-[#10b981]/20 rounded-xl px-4 py-3 bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] transition-colors uppercase tracking-widest';[span_1089](start_span)[span_1089](end_span)
    document.getElementById('vendorModal').classList.remove('hidden');[span_1090](start_span)[span_1090](end_span)
};[span_1091](start_span)[span_1091](end_span)

export const openEditVendorModal = (code) => {[span_1092](start_span)[span_1092](end_span)
    const v = getVendorByCode(code); if (!v) return;[span_1093](start_span)[span_1093](end_span)
    editingVendorCode = code;[span_1094](start_span)[span_1094](end_span)
    document.getElementById('vendorModalTitle').textContent = 'Edit Merchant';[span_1095](start_span)[span_1095](end_span)
    document.getElementById('vCode').value = v.code;[span_1096](start_span)[span_1096](end_span)
    document.getElementById('vCode').readOnly = true;[span_1097](start_span)[span_1097](end_span)
    document.getElementById('vCode').classList.add('bg-[var(--border-color-strong)]');[span_1098](start_span)[span_1098](end_span)
    document.getElementById('vName').value = v.name;[span_1099](start_span)[span_1099](end_span)
    document.getElementById('vPhone').value = v.phone;[span_1100](start_span)[span_1100](end_span)
    document.getElementById('vAddress').value = v.address;[span_1101](start_span)[span_1101](end_span)
    document.getElementById('vTRN').value = v.trn || '';[span_1102](start_span)[span_1102](end_span)

    const btn = document.getElementById('vAutoAdjustBtn');[span_1103](start_span)[span_1103](end_span)
    const val = document.getElementById('vAutoAdjustVal');[span_1104](start_span)[span_1104](end_span)
    if (v.autoAdjustment === false) {[span_1105](start_span)[span_1105](end_span)
        val.value = 'false'; btn.textContent = 'Disabled'; btn.className = 'w-full text-left font-extrabold border border-[#f43f5e]/20 rounded-xl px-4 py-3 bg-[var(--status-rose-bg)] text-[var(--status-rose)] transition-colors uppercase tracking-widest';[span_1106](start_span)[span_1106](end_span)
    } else {[span_1107](start_span)[span_1107](end_span)
        val.value = 'true'; btn.textContent = 'Enabled'; btn.className = 'w-full text-left font-extrabold border border-[#10b981]/20 rounded-xl px-4 py-3 bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] transition-colors uppercase tracking-widest';[span_1108](start_span)[span_1108](end_span)
    }[span_1109](start_span)[span_1109](end_span)
    document.getElementById('vendorModal').classList.remove('hidden');[span_1110](start_span)[span_1110](end_span)
};[span_1111](start_span)[span_1111](end_span)

export const saveVendor = async (e) => {[span_1112](start_span)[span_1112](end_span)
    e.preventDefault();[span_1113](start_span)[span_1113](end_span)
    const db = getDB();[span_1114](start_span)[span_1114](end_span)
    const currentUser = getCurrentUser();[span_1115](start_span)[span_1115](end_span)
    const autoAdjust = document.getElementById('vAutoAdjustVal').value === 'true';[span_1116](start_span)[span_1116](end_span)

    if (editingVendorCode) {[span_1117](start_span)[span_1117](end_span)
        const v = db.vendors.find(x => x.code === editingVendorCode);[span_1118](start_span)[span_1118](end_span)
        if (v) {[span_1119](start_span)[span_1119](end_span)
            v.name = document.getElementById('vName').value;[span_1120](start_span)[span_1120](end_span)
            v.phone = document.getElementById('vPhone').value;[span_1121](start_span)[span_1121](end_span)
            v.address = document.getElementById('vAddress').value;[span_1122](start_span)[span_1122](end_span)
            v.trn = document.getElementById('vTRN').value;[span_1123](start_span)[span_1123](end_span)
            v.autoAdjustment = autoAdjust;[span_1124](start_span)[span_1124](end_span)
        }[span_1125](start_span)[span_1125](end_span)
    } else {[span_1126](start_span)[span_1126](end_span)
        const newCode = document.getElementById('vCode').value.toUpperCase();[span_1127](start_span)[span_1127](end_span)
        if (db.vendors.some(x => x.code === newCode)) return alert('Vendor code already exists!');[span_1128](start_span)[span_1128](end_span)
        db.vendors.push({[span_1129](start_span)[span_1129](end_span)
            code: newCode, name: document.getElementById('vName').value,[span_1130](start_span)[span_1130](end_span)
            phone: document.getElementById('vPhone').value,[span_1131](start_span)[span_1131](end_span)
            address: document.getElementById('vAddress').value,[span_1132](start_span)[span_1132](end_span)
            trn: document.getElementById('vTRN').value,[span_1133](start_span)[span_1133](end_span)
            autoAdjustment: autoAdjust[span_1134](start_span)[span_1134](end_span)
        });[span_1135](start_span)[span_1135](end_span)
    }[span_1136](start_span)[span_1136](end_span)
    await saveDB();[span_1137](start_span)[span_1137](end_span)
    closeModal('vendorModal');[span_1138](start_span)[span_1138](end_span)
    if (currentUser && currentUser.role === 'ADMIN') renderVendors();[span_1139](start_span)[span_1139](end_span)

    if (!document.getElementById('consignmentModal').classList.contains('hidden')) {[span_1140](start_span)[span_1140](end_span)
        const currentSelected = document.getElementById('cVendorSelect').value;[span_1141](start_span)[span_1141](end_span)
        document.getElementById('cVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_1142](start_span)[span_1142](end_span)
        document.getElementById('cVendorSelect').value = editingVendorCode ? currentSelected : document.getElementById('vCode').value.toUpperCase();[span_1143](start_span)[span_1143](end_span)
        if (typeof window.syncVendorPickupAddress === 'function') window.syncVendorPickupAddress();[span_1144](start_span)[span_1144](end_span)
    }[span_1145](start_span)[span_1145](end_span)
};[span_1146](start_span)[span_1146](end_span)

export const deleteVendor = async (code) => {[span_1147](start_span)[span_1147](end_span)
    const db = getDB();[span_1148](start_span)[span_1148](end_span)
    if (!confirm(`Permanently remove vendor record ${code}? This action cannot be undone.`)) return;[span_1149](start_span)[span_1149](end_span)
    db.vendors = db.vendors.filter(v => v.code !== code);[span_1150](start_span)[span_1150](end_span)
    await saveDB();[span_1151](start_span)[span_1151](end_span)
    renderVendors();[span_1152](start_span)[span_1152](end_span)
};[span_1153](start_span)[span_1153](end_span)

export const renderVendors = () => {[span_1154](start_span)[span_1154](end_span)
    const db = getDB();[span_1155](start_span)[span_1155](end_span)
    document.getElementById('vendorTableBody').innerHTML = (document.getElementById('vendorCodeSearch').value[span_1156](start_span)[span_1156](end_span)
      ? db.vendors.filter(v => v.code.includes(document.getElementById('vendorCodeSearch').value.toUpperCase()))[span_1157](start_span)[span_1157](end_span)
      : db.vendors).map(v => {[span_1158](start_span)[span_1158](end_span)
        const autoBadge = v.autoAdjustment !== false[span_1159](start_span)[span_1159](end_span)
          ? '<span class="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] border border-[#10b981]/20 uppercase tracking-widest">Enabled</span>[span_1160](start_span)'[span_1160](end_span)
          : '<span class="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-[var(--status-rose-bg)] text-[var(--status-rose)] border border-[#f43f5e]/20 uppercase tracking-widest">Disabled</span>';[span_1161](start_span)[span_1161](end_span)

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
        </tr>`;[span_1162](start_span)[span_1162](end_span)
    }).join('');[span_1163](start_span)[span_1163](end_span)
};[span_1164](start_span)[span_1164](end_span)

export const openVendorPaymentModal = () => {[span_1165](start_span)[span_1165](end_span)
    const db = getDB();[span_1166](start_span)[span_1166](end_span)
    document.getElementById('vpVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_1167](start_span)[span_1167](end_span)
    document.getElementById('vendorPaymentModal').classList.remove('hidden');[span_1168](start_span)[span_1168](end_span)
};[span_1169](start_span)[span_1169](end_span)

export const saveVendorLedgerEntry = async (e) => {[span_1170](start_span)[span_1170](end_span)
    e.preventDefault();[span_1171](start_span)[span_1171](end_span)
    const db = getDB();[span_1172](start_span)[span_1172](end_span)
    db.vendorPayments.unshift({[span_1173](start_span)[span_1173](end_span)
        id: 'LED-' + Date.now(),[span_1174](start_span)[span_1174](end_span)
        vendorCode: document.getElementById('vpVendorSelect').value,[span_1175](start_span)[span_1175](end_span)
        type: document.getElementById('vpType').value,[span_1176](start_span)[span_1176](end_span)
        amount: parseFloat(document.getElementById('vpAmount').value),[span_1177](start_span)[span_1177](end_span)
        date: document.getElementById('vpDate').value,[span_1178](start_span)[span_1178](end_span)
        notes: document.getElementById('vpNotes').value[span_1179](start_span)[span_1179](end_span)
    });[span_1180](start_span)[span_1180](end_span)
    await saveDB();[span_1181](start_span)[span_1181](end_span)
    closeModal('vendorPaymentModal');[span_1182](start_span)[span_1182](end_span)
    renderVendorLedger();[span_1183](start_span)[span_1183](end_span)
    generateInvoicePreview();[span_1184](start_span)[span_1184](end_span)
};[span_1185](start_span)[span_1185](end_span)

export const renderVendorLedger = () => {[span_1186](start_span)[span_1186](end_span)
    const db = getDB();[span_1187](start_span)[span_1187](end_span)
    document.getElementById('vendorLedgerTableBody').innerHTML = (db.vendorPayments || []).map(p => `<tr class="hover:bg-[var(--bg-base)] transition-colors">
      <td class="p-4 font-bold text-[var(--text-secondary)]">${p.date}</td>
      <td class="p-4 font-black text-[var(--text-primary)] uppercase">${p.vendorCode}</td>
      <td class="p-4 text-[10px] font-extrabold uppercase tracking-widest ${p.type === 'PAID' ? 'text-[var(--status-emerald)]' : 'text-[var(--status-blue)]'}">${p.type}</td>
      <td class="p-4 font-black text-right text-[var(--text-primary)] tabular-nums">${formatAmt(p.amount)} AED</td>
      <td class="p-4 font-bold text-[var(--text-secondary)]">${p.notes}</td>
      <td class="p-4 text-center"><button onclick="window.deleteLedger('${p.id}')" class="text-[var(--status-rose)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Remove</button></td>
    </tr>`).join('');[span_1188](start_span)[span_1188](end_span)
};[span_1189](start_span)[span_1189](end_span)

export const deleteLedger = async (id) => {[span_1190](start_span)[span_1190](end_span)
    const db = getDB();[span_1191](start_span)[span_1191](end_span)
    if (confirm('Delete ledger entry?')) {[span_1192](start_span)[span_1192](end_span)
        db.vendorPayments = db.vendorPayments.filter(x => x.id !== id);[span_1193](start_span)[span_1193](end_span)
        await saveDB();[span_1194](start_span)[span_1194](end_span)
        renderVendorLedger();[span_1195](start_span)[span_1195](end_span)
        generateInvoicePreview();[span_1196](start_span)[span_1196](end_span)
    }[span_1197](start_span)[span_1197](end_span)
};[span_1198](start_span)[span_1198](end_span)

export const openVendorSettlementOtpModal = () => {[span_1199](start_span)[span_1199](end_span)
    const db = getDB();[span_1200](start_span)[span_1200](end_span)
    document.getElementById('vsoVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_1201](start_span)[span_1201](end_span)
    document.getElementById('vsoAgentSelect').innerHTML = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_1202](start_span)[span_1202](end_span)
    document.getElementById('vsoAmount').value = '';[span_1203](start_span)[span_1203](end_span)
    document.getElementById('vendorSettlementOtpModal').classList.remove('hidden');[span_1204](start_span)[span_1204](end_span)
};[span_1205](start_span)[span_1205](end_span)

export const sendSettlementOtp = async (e) => {[span_1206](start_span)[span_1206](end_span)
    e.preventDefault();[span_1207](start_span)[span_1207](end_span)
    const db = getDB();[span_1208](start_span)[span_1208](end_span)
    const vendorCode = document.getElementById('vsoVendorSelect').value;[span_1209](start_span)[span_1209](end_span)
    const agentId = document.getElementById('vsoAgentSelect').value;[span_1210](start_span)[span_1210](end_span)
    const amt = document.getElementById('vsoAmount').value;[span_1211](start_span)[span_1211](end_span)

    const v = getVendorByCode(vendorCode);[span_1212](start_span)[span_1212](end_span)
    const a = db.users.find(u => u.id === agentId);[span_1213](start_span)[span_1213](end_span)
    if (!v || !a) return;[span_1214](start_span)[span_1214](end_span)

    const otp = Math.floor(100000 + Math.random() * 900000).toString();[span_1215](start_span)[span_1215](end_span)
    db.vendorSettlementOtps.push({[span_1216](start_span)[span_1216](end_span)
        id: 'S-OTP-' + Date.now(), vendorCode: vendorCode, agentId: agentId,[span_1217](start_span)[span_1217](end_span)
        amount: parseFloat(amt), otp: otp, status: 'PENDING', date: getUAEISOString()[span_1218](start_span)[span_1218](end_span)
    });[span_1219](start_span)[span_1219](end_span)

    await saveDB();[span_1220](start_span)[span_1220](end_span)
    closeModal('vendorSettlementOtpModal');[span_1221](start_span)[span_1221](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_1222](start_span)[span_1222](end_span)

    const msg = `Hello ${v.name},\n\nA settlement amount of *${formatAmt(amt)} AED* is being processed for handover by our Delivery Agent, *${a.name}*.\n\nPlease share this OTP: *${otp}* with the agent ONLY after you have received the exact amount.\n\nThank you,\nNEXT WAY DELIVERY`;[span_1223](start_span)[span_1223](end_span)
    window.open(`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');[span_1224](start_span)[span_1224](end_span)
};[span_1225](start_span)[span_1225](end_span)

export const verifySettlementOtp = async (otpId) => {[span_1226](start_span)[span_1226](end_span)
    const db = getDB();[span_1227](start_span)[span_1227](end_span)
    const o = db.vendorSettlementOtps.find(x => x.id === otpId); if (!o) return;[span_1228](start_span)[span_1228](end_span)
    const input = document.getElementById(`verifyOtpInput_${otpId}`).value.trim();[span_1229](start_span)[span_1229](end_span)
    if (input !== o.otp) return alert('Invalid OTP!');[span_1230](start_span)[span_1230](end_span)

    const a = db.users.find(u => u.id === o.agentId);[span_1231](start_span)[span_1231](end_span)
    o.status = 'VERIFIED';[span_1232](start_span)[span_1232](end_span)
    db.vendorPayments.unshift({[span_1233](start_span)[span_1233](end_span)
        id: 'LED-' + Date.now(), vendorCode: o.vendorCode, type: 'PAID', amount: o.amount,[span_1234](start_span)[span_1234](end_span)
        date: getUAEISOString().split('T')[0], notes: `Settlement Handover (Agent: ${a ? a.name : 'Unknown'}) - OTP Verified`[span_1235](start_span)[span_1235](end_span)
    });[span_1236](start_span)[span_1236](end_span)

    await saveDB();[span_1237](start_span)[span_1237](end_span)
    alert('OTP Verified successfully! Payment has been recorded in the ledger.');[span_1238](start_span)[span_1238](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_1239](start_span)[span_1239](end_span)

    if (document.getElementById('tab-invoices').classList.contains('tab-active')) {[span_1240](start_span)[span_1240](end_span)
        generateInvoicePreview();[span_1241](start_span)[span_1241](end_span)
        renderVendorLedger();[span_1242](start_span)[span_1242](end_span)
    }[span_1243](start_span)[span_1243](end_span)
};[span_1244](start_span)[span_1244](end_span)

export const cancelSettlementOtp = async (otpId) => {[span_1245](start_span)[span_1245](end_span)
    const db = getDB();[span_1246](start_span)[span_1246](end_span)
    if (!confirm('Are you sure you want to cancel and delete this OTP?')) return;[span_1247](start_span)[span_1247](end_span)
    db.vendorSettlementOtps = db.vendorSettlementOtps.filter(x => x.id !== otpId);[span_1248](start_span)[span_1248](end_span)
    await saveDB();[span_1249](start_span)[span_1249](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_1250](start_span)[span_1250](end_span)
};[span_1251](start_span)[span_1251](end_span)

export const adminConfirmRto = async (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    if (!confirm(`Confirm that RTO consignment ${c.id} has been received back by the owner?`)) return;

    c.rtoStatus = 'CONFIRMED';
    c.rtoConfirmedAt = getUAEISOString();

    await saveDB();
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const openAgentModal = () => {[span_1252](start_span)[span_1252](end_span)
    document.getElementById('aName').value = '';[span_1253](start_span)[span_1253](end_span)
    document.getElementById('aUser').value = '';[span_1254](start_span)[span_1254](end_span)
    document.getElementById('aPhone').value = '';[span_1255](start_span)[span_1255](end_span)
    document.getElementById('aPass').value = '';[span_1256](start_span)[span_1256](end_span)
    document.getElementById('agentModal').classList.remove('hidden');[span_1257](start_span)[span_1257](end_span)
};[span_1258](start_span)[span_1258](end_span)

export const saveAgent = async (e) => {[span_1259](start_span)[span_1259](end_span)
    e.preventDefault();[span_1260](start_span)[span_1260](end_span)
    const db = getDB();[span_1261](start_span)[span_1261](end_span)
    db.users.push({[span_1262](start_span)[span_1262](end_span)
        id: 'AG-' + Math.floor(100 + Math.random() * 900),[span_1263](start_span)[span_1263](end_span)
        username: document.getElementById('aUser').value,[span_1264](start_span)[span_1264](end_span)
        name: document.getElementById('aName').value,[span_1265](start_span)[span_1265](end_span)
        phone: document.getElementById('aPhone').value,[span_1266](start_span)[span_1266](end_span)
        role: 'AGENT',[span_1267](start_span)[span_1267](end_span)
        passwordHash: await hashPassword(document.getElementById('aPass').value),[span_1268](start_span)[span_1268](end_span)
        status: 'ACTIVE[span_1269](start_span)'[span_1269](end_span)
    });[span_1270](start_span)[span_1270](end_span)
    await saveDB();[span_1271](start_span)[span_1271](end_span)
    closeModal('agentModal');[span_1272](start_span)[span_1272](end_span)
    renderAgents();[span_1273](start_span)[span_1273](end_span)
};[span_1274](start_span)[span_1274](end_span)

export const renderAgents = () => {[span_1275](start_span)[span_1275](end_span)
    const db = getDB();[span_1276](start_span)[span_1276](end_span)
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
    </tr>`).join('');[span_1277](start_span)[span_1277](end_span)
};[span_1278](start_span)[span_1278](end_span)

export const setAgentStatus = async (id, st) => {[span_1279](start_span)[span_1279](end_span)
    const db = getDB();[span_1280](start_span)[span_1280](end_span)
    const a = db.users.find(u => u.id === id);[span_1281](start_span)[span_1281](end_span)
    if (a) a.status = st;[span_1282](start_span)[span_1282](end_span)
    await saveDB();[span_1283](start_span)[span_1283](end_span)
    renderAgents();[span_1284](start_span)[span_1284](end_span)
};[span_1285](start_span)[span_1285](end_span)

export const adminDeleteAgent = async (id) => {[span_1286](start_span)[span_1286](end_span)
    const db = getDB();[span_1287](start_span)[span_1287](end_span)
    if (!confirm('Permanently remove this agent account?')) return;[span_1288](start_span)[span_1288](end_span)
    db.users = db.users.filter(x => x.id !== id);[span_1289](start_span)[span_1289](end_span)
    await saveDB();[span_1290](start_span)[span_1290](end_span)
    renderAgents();[span_1291](start_span)[span_1291](end_span)
};[span_1292](start_span)[span_1292](end_span)

export const adminResetAgentPassword = async (id) => {[span_1293](start_span)[span_1293](end_span)
    const db = getDB();[span_1294](start_span)[span_1294](end_span)
    const newPass = prompt('Enter new password for this agent:');[span_1295](start_span)[span_1295](end_span)
    if (!newPass) return;[span_1296](start_span)[span_1296](end_span)
    const a = db.users.find(u => u.id === id);[span_1297](start_span)[span_1297](end_span)
    if (a) {[span_1298](start_span)[span_1298](end_span)
        a.passwordHash = await hashPassword(newPass);[span_1299](start_span)[span_1299](end_span)
        await saveDB();[span_1300](start_span)[span_1300](end_span)
        alert('Password updated successfully.');[span_1301](start_span)[span_1301](end_span)
    }[span_1302](start_span)[span_1302](end_span)
};[span_1303](start_span)[span_1303](end_span)

export const openCredentialsModal = () => {[span_1304](start_span)[span_1304](end_span)
    document.getElementById('selfCurrentPassword').value = '';[span_1305](start_span)[span_1305](end_span)
    document.getElementById('selfNewPassword').value = '';[span_1306](start_span)[span_1306](end_span)
    document.getElementById('credentialsModal').classList.remove('hidden');[span_1307](start_span)[span_1307](end_span)
};[span_1308](start_span)[span_1308](end_span)

export const changeOwnPassword = async (e) => {[span_1309](start_span)[span_1309](end_span)
    if (e) e.preventDefault();[span_1310](start_span)[span_1310](end_span)
    const db = getDB();[span_1311](start_span)[span_1311](end_span)
    const currentUser = getCurrentUser();[span_1312](start_span)[span_1312](end_span)

    const current = document.getElementById('selfCurrentPassword').value;[span_1313](start_span)[span_1313](end_span)
    const pass = document.getElementById('selfNewPassword').value.trim();[span_1314](start_span)[span_1314](end_span)
    if (!current || !pass) return alert('Enter both current and new passwords');[span_1315](start_span)[span_1315](end_span)

    const currentHash = await hashPassword(current);[span_1316](start_span)[span_1316](end_span)
    if (currentHash !== currentUser.passwordHash && current !== currentUser.passwordHash && current !== currentUser.password) {[span_1317](start_span)[span_1317](end_span)
      return alert('Incorrect current password');[span_1318](start_span)[span_1318](end_span)
    }[span_1319](start_span)[span_1319](end_span)

    currentUser.passwordHash = await hashPassword(pass);[span_1320](start_span)[span_1320](end_span)
    const userInDb = db.users.find(u => u.id === currentUser.id);[span_1321](start_span)[span_1321](end_span)
    if (userInDb) userInDb.passwordHash = currentUser.passwordHash;[span_1322](start_span)[span_1322](end_span)

    await saveDB();[span_1323](start_span)[span_1323](end_span)
    document.getElementById('selfCurrentPassword').value = '';[span_1324](start_span)[span_1324](end_span)
    document.getElementById('selfNewPassword').value = '';[span_1325](start_span)[span_1325](end_span)
    closeModal('credentialsModal');[span_1326](start_span)[span_1326](end_span)
    alert('Password updated successfully');[span_1327](start_span)[span_1327](end_span)
};[span_1328](start_span)[span_1328](end_span)

export const renderConfirmations = () => {[span_1329](start_span)[span_1329](end_span)
    const db = getDB();[span_1330](start_span)[span_1330](end_span)
    const currentUser = getCurrentUser();[span_1331](start_span)[span_1331](end_span)
    if (!db || !currentUser) return;[span_1332](start_span)[span_1332](end_span)

    const p = db.consignments.filter(c => c.pendingModification && (currentUser.role === 'ADMIN' || c.assignedTo === currentUser.id));[span_1333](start_span)[span_1333](end_span)
    const pendingRtos = currentUser.role === 'ADMIN'
        ? db.consignments.filter(c => c.rtoStatus === 'SUBMITTED_BY_AGENT')
        : [];
    const badge = document.getElementById('navConfirmBadge');[span_1334](start_span)[span_1334](end_span)

    const totalAlerts = p.length + pendingRtos.length;
    if (totalAlerts > 0) {[span_1335](start_span)[span_1335](end_span)
        badge.textContent = totalAlerts;[span_1336](start_span)[span_1336](end_span)
        badge.classList.remove('hidden');[span_1337](start_span)[span_1337](end_span)
    } else {[span_1338](start_span)[span_1338](end_span)
        badge.classList.add('hidden');[span_1339](start_span)[span_1339](end_span)
    }[span_1340](start_span)[span_1340](end_span)

    const modHtml = p.map(c => {[span_1341](start_span)[span_1341](end_span)
      const pm = c.pendingModification;[span_1342](start_span)[span_1342](end_span)
      let changesText = '';[span_1343](start_span)[span_1343](end_span)
      if (pm.type === 'FULL_EDIT') {[span_1344](start_span)[span_1344](end_span)
          changesText = `<b class="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">${c.id}</b>: Full details modified by Admin.<br><span class="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1 block">Product: <b class="text-[var(--status-emerald)]">${pm.productAmount}</b> | Fee: <b class="text-[var(--status-emerald)]">${pm.deliveryCharge}</b></span>`;[span_1345](start_span)[span_1345](end_span)
      } else {[span_1346](start_span)[span_1346](end_span)
          changesText = `<b class="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">${c.id}</b>: Product ${c.productAmount} -> <b class="text-[var(--status-emerald)]">${pm.newProductAmount}</b> <br> <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1 block">Service Fee ${c.deliveryCharge} -> <b class="text-[var(--status-emerald)]">${pm.newDeliveryCharge}</b></span>`;[span_1347](start_span)[span_1347](end_span)
      }[span_1348](start_span)[span_1348](end_span)
      const btnHtml = (currentUser.role === 'AGENT' && c.assignedTo === currentUser.id)[span_1349](start_span)[span_1349](end_span)
          ? `<button onclick="window.agentConfirmModification('${c.id}')" class="block mt-4 bg-[#0b0f19] text-[var(--accent-gold)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] hover:bg-[#131b2e] border border-[#1e293b] transition-all uppercase tracking-widest text-[10px]">Confirm Edit</button>`[span_1350](start_span)[span_1350](end_span)
          : `<div class="mt-4"><span class="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Waiting for field agent confirmation</span></div>`;[span_1351](start_span)[span_1351](end_span)
      return `<div class="p-5 border border-[#c9a24b]/30 rounded-xl bg-[#c9a24b]/10 mb-4 text-xs shadow-sm">${changesText} ${btnHtml}</div>`;[span_1352](start_span)[span_1352](end_span)
    }).join('');[span_1353](start_span)[span_1353](end_span)

    const rtoHtml = pendingRtos.map(c => {
      const v = getVendorByCode(c.vendorCode);
      const picker = db.users.find(u => u.id === c.rtoPickupBy);
      return `<div class="p-5 border border-[#3b82f6]/30 rounded-xl bg-[var(--status-blue-bg)] mb-4 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
        <div class="space-y-1.5">
          <b class="text-[var(--text-primary)] font-black text-sm tracking-widest uppercase">RTO Submitted: ${c.id}</b><br/>
          <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Owner / Merchant: <b class="text-[var(--text-primary)] ml-1">${v ? v.name : c.vendorCode}</b></span><br/>
          <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Submitted By: <b class="text-[var(--text-primary)] ml-1">${picker ? `${picker.name} - ${picker.id}` : (c.rtoPickupBy || 'Agent')}</b></span>
        </div>
        <button onclick="window.adminConfirmRto('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] shrink-0 transition-all text-[10px] uppercase tracking-widest border border-[#1e293b]">Confirm RTO</button>
      </div>`;
    }).join('');

    document.getElementById('confirmationsList').innerHTML = (rtoHtml + modHtml) || '<div class="p-8 text-center text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)]">No pending modifications.</div>';

    if (currentUser.role === 'ADMIN') {[span_1354](start_span)[span_1354](end_span)
      const pendingOtps = db.vendorSettlementOtps.filter(o => o.status === 'PENDING');[span_1355](start_span)[span_1355](end_span)
      const otpCard = document.getElementById('adminSettlementOtpCard');[span_1356](start_span)[span_1356](end_span)
      if (otpCard) {[span_1357](start_span)[span_1357](end_span)
        otpCard.classList.toggle('hidden', pendingOtps.length === 0);[span_1358](start_span)[span_1358](end_span)
        document.getElementById('adminSettlementOtpList').innerHTML = pendingOtps.map(o => {[span_1359](start_span)[span_1359](end_span)
          const v = getVendorByCode(o.vendorCode); const a = db.users.find(u => u.id === o.agentId); const agentName = a ? a.name : 'Unknown Agent';[span_1360](start_span)[span_1360](end_span)
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
          </div>`;[span_1361](start_span)[span_1361](end_span)
        }).join('');[span_1362](start_span)[span_1362](end_span)
      }[span_1363](start_span)[span_1363](end_span)

      const cocHandovers = db.consignments.filter(c => c.feeType === 'COC' && c.cocStatus === 'COLLECTED');[span_1364](start_span)[span_1364](end_span)
      const cocCard = document.getElementById('adminCocHandoverCard');[span_1365](start_span)[span_1365](end_span)
      if (cocCard) {[span_1366](start_span)[span_1366](end_span)
        cocCard.classList.toggle('hidden', cocHandovers.length === 0);[span_1367](start_span)[span_1367](end_span)
        document.getElementById('adminCocHandoverList').innerHTML = cocHandovers.map(c => {[span_1368](start_span)[span_1368](end_span)
          const ag = db.users.find(u => u.id === c.pickedUpBy);[span_1369](start_span)[span_1369](end_span)
          return `<div class="p-5 border border-[#3b82f6]/30 rounded-xl bg-[var(--status-blue-bg)] mb-4 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:border-[#3b82f6]/50 transition-colors">
            <div class="space-y-1.5">
              <b class="text-[var(--text-primary)] font-black text-sm tracking-widest uppercase">${c.id}</b><br/>
              <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Agent: <b class="text-[var(--text-primary)] ml-1">${ag ? ag.name : c.pickedUpBy}</b></span><br/>
              <span class="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Amount: <b class="text-[var(--status-blue)] tabular-nums text-xs ml-1">${formatAmt(c.cocPendingAmount)} AED</b></span>
            </div>
            <button onclick="window.adminConfirmPendingCoc('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--status-blue)] font-extrabold px-5 py-2.5 rounded-xl shadow-[var(--shadow-elevated)] shrink-0 transition-all text-[10px] uppercase tracking-widest border border-[#1e293b]">Confirm Deposit</button>
          </div>`;[span_1370](start_span)[span_1370](end_span)
        }).join('');[span_1371](start_span)[span_1371](end_span)
      }[span_1372](start_span)[span_1372](end_span)
    }[span_1373](start_span)[span_1373](end_span)
};[span_1374](start_span)[span_1374](end_span)

export const generateAdminFinanceTab = () => {[span_1375](start_span)[span_1375](end_span)
    const db = getDB();[span_1376](start_span)[span_1376](end_span)
    const currentUser = getCurrentUser();[span_1377](start_span)[span_1377](end_span)
    if (!currentUser || currentUser.role !== 'ADMIN') return;[span_1378](start_span)[span_1378](end_span)

    let collectedDeliveryCharges = 0;[span_1379](start_span)[span_1379](end_span)
    let totalPendingDeficit = 0;[span_1380](start_span)[span_1380](end_span)
    let totalExpenses = 0;[span_1381](start_span)[span_1381](end_span)

    db.consignments.forEach(c => {[span_1382](start_span)[span_1382](end_span)
      if (c.status === 'Delivered') {[span_1383](start_span)[span_1383](end_span)
        const expectedCharge = parseFloat(c.deliveryCharge) || 0;[span_1384](start_span)[span_1384](end_span)
        let pendingDeficitForThis = 0;[span_1385](start_span)[span_1385](end_span)

        const { isDeficit, deficitAmt } = getDeficitInfo(c);[span_1386](start_span)[span_1386](end_span)[span_1387](start_span)[span_1387](end_span)

        if (isDeficit && !c.deficitReceivedDate) {[span_1388](start_span)[span_1388](end_span)
          pendingDeficitForThis = deficitAmt;[span_1389](start_span)[span_1389](end_span)
          totalPendingDeficit += deficitAmt;[span_1390](start_span)[span_1390](end_span)
        }[span_1391](start_span)[span_1391](end_span)

        collectedDeliveryCharges += (expectedCharge - pendingDeficitForThis);[span_1392](start_span)[span_1392](end_span)
      }[span_1393](start_span)[span_1393](end_span)
    });[span_1394](start_span)[span_1394](end_span)

    if (db.agentExpenses) {[span_1395](start_span)[span_1395](end_span)
      db.agentExpenses.forEach(e => {[span_1396](start_span)[span_1396](end_span)
        if (e.status === 'APPROVED') {[span_1397](start_span)[span_1397](end_span)
          totalExpenses += (parseFloat(e.amount) || 0);[span_1398](start_span)[span_1398](end_span)
        }[span_1399](start_span)[span_1399](end_span)
      });[span_1400](start_span)[span_1400](end_span)
    }[span_1401](start_span)[span_1401](end_span)

    const profit = collectedDeliveryCharges - totalExpenses;[span_1402](start_span)[span_1402](end_span)

    document.getElementById('adminFinDeliveryCharges').textContent = formatAmt(collectedDeliveryCharges) + ' AED';[span_1403](start_span)[span_1403](end_span)
    document.getElementById('adminFinExpenses').textContent = formatAmt(totalExpenses) + ' AED';[span_1404](start_span)[span_1404](end_span)
    document.getElementById('adminFinDeficit').textContent = formatAmt(totalPendingDeficit) + ' AED';[span_1405](start_span)[span_1405](end_span)

    const profitEl = document.getElementById('adminFinProfit');[span_1406](start_span)[span_1406](end_span)
    const profitCard = document.getElementById('adminFinProfitCard');[span_1407](start_span)[span_1407](end_span)
    const profitLabel = document.getElementById('adminFinProfitLabel');[span_1408](start_span)[span_1408](end_span)

    profitEl.textContent = formatAmt(profit) + ' AED';[span_1409](start_span)[span_1409](end_span)

    if (profit < 0) {[span_1410](start_span)[span_1410](end_span)
      profitCard.className = "p-5 rounded-xl bg-[var(--status-rose-bg)] border border-[#f43f5e]/20 transition-colors";[span_1411](start_span)[span_1411](end_span)
      profitLabel.className = "text-[10px] font-extrabold text-[var(--status-rose)] uppercase tracking-wider";[span_1412](start_span)[span_1412](end_span)
      profitEl.className = "text-2xl font-black text-[var(--status-rose)] mt-2 transition-colors tabular-nums";[span_1413](start_span)[span_1413](end_span)
    } else {[span_1414](start_span)[span_1414](end_span)
      profitCard.className = "p-5 rounded-xl bg-[var(--status-emerald-bg)] border border-[#10b981]/20 transition-colors";[span_1415](start_span)[span_1415](end_span)
      profitLabel.className = "text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-wider";[span_1416](start_span)[span_1416](end_span)
      profitEl.className = "text-2xl font-black text-[var(--status-emerald)] mt-2 transition-colors tabular-nums";[span_1417](start_span)[span_1417](end_span)
    }[span_1418](start_span)[span_1418](end_span)
};[span_1419](start_span)[span_1419](end_span)
