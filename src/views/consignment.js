// /src/views/consignment.js
import { getDB, getCurrentUser, saveDB } from '../services/store.js';[span_273](start_span)[span_273](end_span)
import { getUAEISOString, getVendorByCode, getAgentName, formatAmt, getDeficitInfo, closeModal } from '../utils/helpers.js';[span_274](start_span)[span_274](end_span)[span_275](start_span)[span_275](end_span)
import { uploadImageToSupabase } from '../services/sync.js';[span_276](start_span)[span_276](end_span)[span_277](start_span)[span_277](end_span)
import { renderConsignments } from './dispatch.js';[span_278](start_span)[span_278](end_span)[span_279](start_span)[span_279](end_span)
import { generateInvoicePreview } from './finance.js';[span_280](start_span)[span_280](end_span)[span_281](start_span)[span_281](end_span)

let tempEditData = null;[span_282](start_span)[span_282](end_span)
let currentPodCid = null;[span_283](start_span)[span_283](end_span)
let currentPodDefaultMethod = '';[span_284](start_span)[span_284](end_span)
let tempPodPhotoData = null;[span_285](start_span)[span_285](end_span)
let tempPhotoData = null;[span_286](start_span)[span_286](end_span)

export const resetNewConsignmentForm = (retainMerchant = false) => {[span_287](start_span)[span_287](end_span)
    const db = getDB();[span_288](start_span)[span_288](end_span)
    const currentUser = getCurrentUser();[span_289](start_span)[span_289](end_span)

    document.getElementById('cIdInput').value = '';[span_290](start_span)[span_290](end_span)

    if (!retainMerchant) {[span_291](start_span)[span_291](end_span)
        document.getElementById('cVendorSearch').value = '';[span_292](start_span)[span_292](end_span)
        document.getElementById('cVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_293](start_span)[span_293](end_span)
        syncVendorPickupAddress();[span_294](start_span)[span_294](end_span)
    }[span_295](start_span)[span_295](end_span)

    const agSelect = document.getElementById('cAgentSelect');[span_296](start_span)[span_296](end_span)
    const puSelect = document.getElementById('cPickedUpBy');[span_297](start_span)[span_297](end_span)
    const agentPoolOptions = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_298](start_span)[span_298](end_span)

    if (currentUser.role === 'ADMIN') {[span_299](start_span)[span_299](end_span)
        agSelect.innerHTML = `<option value="">-- Pool --</option>` + agentPoolOptions;[span_300](start_span)[span_300](end_span)
        document.getElementById('agentSelectContainer').classList.remove('hidden');[span_301](start_span)[span_301](end_span)

        puSelect.innerHTML = `<option value="">-- Select Picker --</option>` + agentPoolOptions;[span_302](start_span)[span_302](end_span)
        puSelect.disabled = false;[span_303](start_span)[span_303](end_span)
        puSelect.classList.remove('bg-[var(--border-color-strong)]');[span_304](start_span)[span_304](end_span)
    } else {[span_305](start_span)[span_305](end_span)
        agSelect.innerHTML = `<option value="">-- Unassigned Pool --</option>`;[span_306](start_span)[span_306](end_span)
        document.getElementById('agentSelectContainer').classList.add('hidden');[span_307](start_span)[span_307](end_span)

        puSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name} - ${currentUser.id}</option>`;[span_308](start_span)[span_308](end_span)
        puSelect.value = currentUser.id;[span_309](start_span)[span_309](end_span)
        puSelect.disabled = true;[span_310](start_span)[span_310](end_span)
        puSelect.classList.add('bg-[var(--border-color-strong)]');[span_311](start_span)[span_311](end_span)
    }[span_312](start_span)[span_312](end_span)

    document.getElementById('cWeight').value = "";[span_313](start_span)[span_313](end_span)
    document.getElementById('cPieces').value = "";[span_314](start_span)[span_314](end_span)
    document.getElementById('cCustomerName').value = '';[span_315](start_span)[span_315](end_span)
    document.getElementById('cCustomerPhone').value = '+971';[span_316](start_span)[span_316](end_span)
    document.getElementById('cDeliveryAddress').value = '';[span_317](start_span)[span_317](end_span)
    document.getElementById('cProductAmt').value = '';[span_318](start_span)[span_318](end_span)
    document.getElementById('cDeliveryFee').value = '';[span_319](start_span)[span_319](end_span)

    if (document.getElementById('cRefVendorName')) document.getElementById('cRefVendorName').value = '';[span_320](start_span)[span_320](end_span)
    if (document.getElementById('cRefVendorPhone')) document.getElementById('cRefVendorPhone').value = '';[span_321](start_span)[span_321](end_span)
};[span_322](start_span)[span_322](end_span)

export const openNewConsignmentModal = () => {[span_323](start_span)[span_323](end_span)
    resetNewConsignmentForm(false);[span_324](start_span)[span_324](end_span)
    document.getElementById('consignmentModal').classList.remove('hidden');[span_325](start_span)[span_325](end_span)
};[span_326](start_span)[span_326](end_span)

export const saveNewConsignment = (e) => {[span_327](start_span)[span_327](end_span)
    e.preventDefault();[span_328](start_span)[span_328](end_span)
    const db = getDB();[span_329](start_span)[span_329](end_span)
    const id = document.getElementById('cIdInput').value.trim().toUpperCase();[span_330](start_span)[span_330](end_span)
    if (db.consignments.some(c => c.id.toUpperCase() === id)) { alert('ID exists!'); return; }[span_331](start_span)[span_331](end_span)

    document.getElementById('actionModalTitle').textContent = `Add New Consignment`;[span_332](start_span)[span_332](end_span)
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest mb-1.5">Are you sure you want to log this consignment?</p>
        <p class="text-xl font-black text-[var(--status-emerald)] tracking-widest tabular-nums uppercase">${id}</p>
      </div>
      <button onclick="window.executeNewConsignment()" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">Confirm Entry</button>
    `;[span_333](start_span)[span_333](end_span)
    document.getElementById('actionModal').classList.remove('hidden');[span_334](start_span)[span_334](end_span)
};[span_335](start_span)[span_335](end_span)

export const executeNewConsignment = async () => {[span_336](start_span)[span_336](end_span)
    const db = getDB();[span_337](start_span)[span_337](end_span)
    const currentUser = getCurrentUser();[span_338](start_span)[span_338](end_span)

    const id = document.getElementById('cIdInput').value.trim().toUpperCase();[span_339](start_span)[span_339](end_span)
    const ag = document.getElementById('cAgentSelect').value || null;[span_340](start_span)[span_340](end_span)
    const isAgent = currentUser.role === 'AGENT';[span_341](start_span)[span_341](end_span)
    const pickedUpBy = isAgent ? currentUser.id : (document.getElementById('cPickedUpBy').value || null);[span_342](start_span)[span_342](end_span)

    const pAmt = parseFloat(document.getElementById('cProductAmt').value) || 0;[span_343](start_span)[span_343](end_span)
    const dFee = parseFloat(document.getElementById('cDeliveryFee').value) || 0;[span_344](start_span)[span_344](end_span)
    const fType = document.getElementById('cFeeType').value;[span_345](start_span)[span_345](end_span)
    const weightVal = parseFloat(document.getElementById('cWeight').value) || 1;[span_346](start_span)[span_346](end_span)
    const piecesVal = parseInt(document.getElementById('cPieces').value, 10) || 1;[span_347](start_span)[span_347](end_span)

    const deficitReceivedDate = (fType === 'COC') ? getUAEISOString() : null;[span_348](start_span)[span_348](end_span)
    let initialStatus = ag ? 'Assigned' : 'Created';[span_349](start_span)[span_349](end_span)
    if (pickedUpBy) initialStatus = ag ? 'Out for delivery' : 'Picked Up';[span_350](start_span)[span_350](end_span)

    db.consignments.unshift({[span_351](start_span)[span_351](end_span)
      id, vendorCode: document.getElementById('cVendorSelect').value, pickupFrom: document.getElementById('cPickupFrom').value,[span_352](start_span)[span_352](end_span)
      refVendorName: document.getElementById('cRefVendorName') ? document.getElementById('cRefVendorName').value.trim() : '',[span_353](start_span)[span_353](end_span)
      refVendorPhone: document.getElementById('cRefVendorPhone') ? document.getElementById('cRefVendorPhone').value.trim() : '',[span_354](start_span)[span_354](end_span)
      customerName: document.getElementById('cCustomerName').value, customerPhone: document.getElementById('cCustomerPhone').value,[span_355](start_span)[span_355](end_span)
      deliveryAddress: document.getElementById('cDeliveryAddress').value, productAmount: pAmt, deliveryCharge: dFee, feeType: fType,[span_356](start_span)[span_356](end_span)
      weight: weightVal, pieces: piecesVal, pendingModification: null, assignedTo: ag, pickedUpBy: pickedUpBy, deficitReceivedDate: deficitReceivedDate,[span_357](start_span)[span_357](end_span)
      rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null, rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
      cocPendingAmount: 0, cocStatus: null, status: initialStatus, qrGenerated: false, otpCode: String(Math.floor(1000 + Math.random() * 9000)),[span_358](start_span)[span_358](end_span)
      otpVerified: false, pickupPhoto: null, deliveryPhoto: null, returnReason: '', createdAt: getUAEISOString().split('T')[0],[span_359](start_span)[span_359](end_span)
      pickedUpAt: pickedUpBy ? getUAEISOString() : null, deliveredAt: null[span_360](start_span)[span_360](end_span)
    });[span_361](start_span)[span_361](end_span)

    await saveDB();[span_362](start_span)[span_362](end_span)
    closeModal('actionModal');[span_363](start_span)[span_363](end_span)

    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_364](start_span)[span_364](end_span)
    if (isAgent) { alert("Consignment Picked Up and added to the Unassigned Pool."); }[span_365](start_span)[span_365](end_span)

    resetNewConsignmentForm(true);[span_366](start_span)[span_366](end_span)
};[span_367](start_span)[span_367](end_span)
window.executeNewConsignment = executeNewConsignment;[span_368](start_span)[span_368](end_span)

export const filterVendorSelect = () => {[span_369](start_span)[span_369](end_span)
    const db = getDB();[span_370](start_span)[span_370](end_span)
    const q = document.getElementById('cVendorSearch').value.toLowerCase();[span_371](start_span)[span_371](end_span)
    const select = document.getElementById('cVendorSelect');[span_372](start_span)[span_372](end_span)
    const filtered = db.vendors.filter(v => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q));[span_373](start_span)[span_373](end_span)

    select.innerHTML = filtered.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_374](start_span)[span_374](end_span)
    if (filtered.length === 0) select.innerHTML = `<option value="">No matches</option>`;[span_375](start_span)[span_375](end_span)
    syncVendorPickupAddress();[span_376](start_span)[span_376](end_span)
};[span_377](start_span)[span_377](end_span)

export const syncVendorPickupAddress = () => {[span_378](start_span)[span_378](end_span)
    const code = document.getElementById('cVendorSelect').value;[span_379](start_span)[span_379](end_span)
    const v = getVendorByCode(code);[span_380](start_span)[span_380](end_span)
    if (v) document.getElementById('cPickupFrom').value = v.address;[span_381](start_span)[span_381](end_span)

    const walkInContainer = document.getElementById('walkInFields');[span_382](start_span)[span_382](end_span)
    if (walkInContainer) {[span_383](start_span)[span_383](end_span)
      if (code === 'WALK-IN') {[span_384](start_span)[span_384](end_span)
        walkInContainer.classList.remove('hidden');[span_385](start_span)[span_385](end_span)
        walkInContainer.classList.add('grid');[span_386](start_span)[span_386](end_span)
      } else {[span_387](start_span)[span_387](end_span)
        walkInContainer.classList.add('hidden');[span_388](start_span)[span_388](end_span)
        walkInContainer.classList.remove('grid');[span_389](start_span)[span_389](end_span)
        document.getElementById('cRefVendorName').value = '';[span_390](start_span)[span_390](end_span)
        document.getElementById('cRefVendorPhone').value = '';[span_391](start_span)[span_391](end_span)
      }[span_392](start_span)[span_392](end_span)
    }[span_393](start_span)[span_393](end_span)
};[span_394](start_span)[span_394](end_span)

export const bulkAssign = async () => {[span_395](start_span)[span_395](end_span)
    const db = getDB();[span_396](start_span)[span_396](end_span)
    const ids = document.getElementById('bulkIds').value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);[span_397](start_span)[span_397](end_span)
    const agent = document.getElementById('bulkAgent').value;[span_398](start_span)[span_398](end_span)
    if (!ids.length || !agent) return alert('Enter comma separated IDs and select an agent.');[span_399](start_span)[span_399](end_span)

    if (!confirm(`Are you sure you want to assign ${ids.length} consignment(s) to this personnel?`)) return;[span_400](start_span)[span_400](end_span)

    let updated = 0;[span_401](start_span)[span_401](end_span)
    ids.forEach(id => {[span_402](start_span)[span_402](end_span)
      const c = db.consignments.find(x => x.id.toUpperCase() === id);[span_403](start_span)[span_403](end_span)
      if (c && c.status !== 'Delivered' && c.status !== 'Returned') {[span_404](start_span)[span_404](end_span)
        c.assignedTo = agent;[span_405](start_span)[span_405](end_span)
        if (c.status === 'Created') c.status = 'Assigned';[span_406](start_span)[span_406](end_span)
        if (c.status === 'Picked Up') c.status = 'Out for delivery';[span_407](start_span)[span_407](end_span)
        updated++;[span_408](start_span)[span_408](end_span)
      }[span_409](start_span)[span_409](end_span)
    });[span_410](start_span)[span_410](end_span)
    if (updated > 0) {[span_411](start_span)[span_411](end_span)
        await saveDB();[span_412](start_span)[span_412](end_span)
        renderConsignments();[span_413](start_span)[span_413](end_span)
        document.getElementById('bulkIds').value = '';[span_414](start_span)[span_414](end_span)
        alert(updated + ' consignments assigned.');[span_415](start_span)[span_415](end_span)
    }[span_416](start_span)[span_416](end_span)
};[span_417](start_span)[span_417](end_span)

export const openEditConsignmentModal = (cid) => {[span_418](start_span)[span_418](end_span)
    const db = getDB();[span_419](start_span)[span_419](end_span)
    const currentUser = getCurrentUser();[span_420](start_span)[span_420](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_421](start_span)[span_421](end_span)
    if (!c) return;[span_422](start_span)[span_422](end_span)

    closeModal('inspectModal');[span_423](start_span)[span_423](end_span)

    document.getElementById('eIdInput').value = c.id;[span_424](start_span)[span_424](end_span)
    document.getElementById('eCid').value = c.id;[span_425](start_span)[span_425](end_span)

    document.getElementById('eVendorSelect').innerHTML = db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_426](start_span)[span_426](end_span)
    document.getElementById('eVendorSelect').value = c.vendorCode;[span_427](start_span)[span_427](end_span)

    document.getElementById('ePickupFrom').value = c.pickupFrom;[span_428](start_span)[span_428](end_span)
    document.getElementById('eCustomerName').value = c.customerName;[span_429](start_span)[span_429](end_span)
    document.getElementById('eCustomerPhone').value = c.customerPhone;[span_430](start_span)[span_430](end_span)
    document.getElementById('eDeliveryAddress').value = c.deliveryAddress;[span_431](start_span)[span_431](end_span)
    document.getElementById('eWeight').value = c.weight || 1;[span_432](start_span)[span_432](end_span)
    document.getElementById('ePieces').value = c.pieces || 1;[span_433](start_span)[span_433](end_span)
    document.getElementById('eProductAmt').value = c.productAmount;[span_434](start_span)[span_434](end_span)
    document.getElementById('eDeliveryFee').value = c.deliveryCharge;[span_435](start_span)[span_435](end_span)
    document.getElementById('eFeeType').value = c.feeType;[span_436](start_span)[span_436](end_span)

    const agSelect = document.getElementById('eAgentSelect');[span_437](start_span)[span_437](end_span)
    const puSelect = document.getElementById('ePickedUpBy');[span_438](start_span)[span_438](end_span)
    const agentPoolOptions = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_439](start_span)[span_439](end_span)

    if (currentUser.role === 'ADMIN') {[span_440](start_span)[span_440](end_span)
        agSelect.innerHTML = `<option value="">-- Pool --</option>` + agentPoolOptions;[span_441](start_span)[span_441](end_span)
        agSelect.value = c.assignedTo || '';[span_442](start_span)[span_442](end_span)
        document.getElementById('eAgentSelectContainer').classList.remove('hidden');[span_443](start_span)[span_443](end_span)

        puSelect.innerHTML = `<option value="">-- Select Picker --</option>` + agentPoolOptions;[span_444](start_span)[span_444](end_span)
        puSelect.value = c.pickedUpBy || '';[span_445](start_span)[span_445](end_span)
        puSelect.disabled = false;[span_446](start_span)[span_446](end_span)
        puSelect.classList.remove('bg-[var(--border-color-strong)]');[span_447](start_span)[span_447](end_span)
    } else {[span_448](start_span)[span_448](end_span)
        agSelect.innerHTML = `<option value="">-- Unassigned Pool --</option>`;[span_449](start_span)[span_449](end_span)
        document.getElementById('eAgentSelectContainer').classList.add('hidden');[span_450](start_span)[span_450](end_span)

        puSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name} - ${currentUser.id}</option>`;[span_451](start_span)[span_451](end_span)
        puSelect.value = currentUser.id;[span_452](start_span)[span_452](end_span)
        puSelect.disabled = true;[span_453](start_span)[span_453](end_span)
        puSelect.classList.add('bg-[var(--border-color-strong)]');[span_454](start_span)[span_454](end_span)
    }[span_455](start_span)[span_455](end_span)

    tempEditData = {[span_456](start_span)[span_456](end_span)
        id: c.id, vendorCode: c.vendorCode, pickupFrom: c.pickupFrom, customerName: c.customerName,[span_457](start_span)[span_457](end_span)
        customerPhone: c.customerPhone, deliveryAddress: c.deliveryAddress, weight: c.weight,[span_458](start_span)[span_458](end_span)
        pieces: c.pieces, productAmount: c.productAmount, deliveryCharge: c.deliveryCharge,[span_459](start_span)[span_459](end_span)
        feeType: c.feeType, assignedTo: c.assignedTo || '', pickedUpBy: c.pickedUpBy || '[span_460](start_span)'[span_460](end_span)
    };[span_461](start_span)[span_461](end_span)

    document.getElementById('eOriginalData').value = JSON.stringify(tempEditData);[span_462](start_span)[span_462](end_span)
    document.getElementById('editConsignmentModal').classList.remove('hidden');[span_463](start_span)[span_463](end_span)
};[span_464](start_span)[span_464](end_span)

export const syncEditVendorPickupAddress = () => {[span_465](start_span)[span_465](end_span)
    const v = getVendorByCode(document.getElementById('eVendorSelect').value);[span_466](start_span)[span_466](end_span)
    if (v) document.getElementById('ePickupFrom').value = v.address;[span_467](start_span)[span_467](end_span)
};[span_468](start_span)[span_468](end_span)

export const confirmEditConsignment = (e) => {[span_469](start_span)[span_469](end_span)
    e.preventDefault();[span_470](start_span)[span_470](end_span)
    const db = getDB();[span_471](start_span)[span_471](end_span)
    const cid = document.getElementById('eCid').value;[span_472](start_span)[span_472](end_span)
    const orig = JSON.parse(document.getElementById('eOriginalData').value);[span_473](start_span)[span_473](end_span)

    const newData = {[span_474](start_span)[span_474](end_span)
        id: document.getElementById('eIdInput').value.trim().toUpperCase(),[span_475](start_span)[span_475](end_span)
        vendorCode: document.getElementById('eVendorSelect').value,[span_476](start_span)[span_476](end_span)
        pickupFrom: document.getElementById('ePickupFrom').value,[span_477](start_span)[span_477](end_span)
        customerName: document.getElementById('eCustomerName').value,[span_478](start_span)[span_478](end_span)
        customerPhone: document.getElementById('eCustomerPhone').value,[span_479](start_span)[span_479](end_span)
        deliveryAddress: document.getElementById('eDeliveryAddress').value,[span_480](start_span)[span_480](end_span)
        weight: parseFloat(document.getElementById('eWeight').value) || 1,[span_481](start_span)[span_481](end_span)
        pieces: parseInt(document.getElementById('ePieces').value, 10) || 1,[span_482](start_span)[span_482](end_span)
        productAmount: parseFloat(document.getElementById('eProductAmt').value) || 0,[span_483](start_span)[span_483](end_span)
        deliveryCharge: parseFloat(document.getElementById('eDeliveryFee').value) || 0,[span_484](start_span)[span_484](end_span)
        feeType: document.getElementById('eFeeType').value,[span_485](start_span)[span_485](end_span)
        assignedTo: document.getElementById('eAgentSelect').value || '',[span_486](start_span)[span_486](end_span)
        pickedUpBy: document.getElementById('ePickedUpBy').value || '[span_487](start_span)'[span_487](end_span)
    };[span_488](start_span)[span_488](end_span)

    if (newData.id !== cid && db.consignments.some(x => x.id.toUpperCase() === newData.id)) {[span_489](start_span)[span_489](end_span)
        return alert('This Consignment ID already exists!');[span_490](start_span)[span_490](end_span)
    }[span_491](start_span)[span_491](end_span)

    const hasChanges = Object.keys(newData).some(key => orig[key] != newData[key]);[span_492](start_span)[span_492](end_span)
    if (!hasChanges) return closeModal('editConsignmentModal');[span_493](start_span)[span_493](end_span)

    document.getElementById('actionModalTitle').textContent = `Update Consignment: ${cid}`;[span_494](start_span)[span_494](end_span)
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[#c9a24b]/10 border border-[#c9a24b]/30 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--accent-gold)] uppercase tracking-widest mb-1.5">You made changes to this entry. Update now?</p>
      </div>
      <button onclick="window.executeEditConsignment('${cid}')" class="w-full bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-all uppercase tracking-widest text-[11px] border border-[#1e293b]">Confirm Update</button>
    `;[span_495](start_span)[span_495](end_span)
    tempEditData = newData;[span_496](start_span)[span_496](end_span)
    document.getElementById('actionModal').classList.remove('hidden');[span_497](start_span)[span_497](end_span)
};[span_498](start_span)[span_498](end_span)

export const executeEditConsignment = async (cid) => {[span_499](start_span)[span_499](end_span)
    const db = getDB();[span_500](start_span)[span_500](end_span)
    const currentUser = getCurrentUser();[span_501](start_span)[span_501](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_502](start_span)[span_502](end_span)
    if (!c) return;[span_503](start_span)[span_503](end_span)

    if (c.status === 'Delivered') {[span_504](start_span)[span_504](end_span)
        c.pendingModification = { type: 'FULL_EDIT', requestedBy: currentUser.username, ...tempEditData };[span_505](start_span)[span_505](end_span)
        await saveDB();[span_506](start_span)[span_506](end_span)
        closeModal('actionModal');[span_507](start_span)[span_507](end_span)
        closeModal('editConsignmentModal');[span_508](start_span)[span_508](end_span)
        if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_509](start_span)[span_509](end_span)
        return alert("Modifications to this Delivered consignment have been sent to the assigned Delivery Agent for confirmation.");[span_510](start_span)[span_510](end_span)
    }[span_511](start_span)[span_511](end_span)

    Object.assign(c, tempEditData);[span_512](start_span)[span_512](end_span)

    const newAssignedTo = tempEditData.assignedTo || null;[span_513](start_span)[span_513](end_span)
    const newPickedUpBy = tempEditData.pickedUpBy || null;[span_514](start_span)[span_514](end_span)

    c.assignedTo = newAssignedTo;[span_515](start_span)[span_515](end_span)
    c.pickedUpBy = newPickedUpBy;[span_516](start_span)[span_516](end_span)

    if (newPickedUpBy && !c.pickedUpAt) {[span_517](start_span)[span_517](end_span)
        c.pickedUpAt = getUAEISOString();[span_518](start_span)[span_518](end_span)
        c.status = newAssignedTo ? 'Out for delivery' : 'Picked Up';[span_519](start_span)[span_519](end_span)
    } else if (!newPickedUpBy) {[span_520](start_span)[span_520](end_span)
        c.pickedUpAt = null;[span_521](start_span)[span_521](end_span)
        c.status = newAssignedTo ? 'Assigned' : 'Created';[span_522](start_span)[span_522](end_span)
    } else {[span_523](start_span)[span_523](end_span)
        if (c.status === 'Created' && newAssignedTo) c.status = 'Assigned';[span_524](start_span)[span_524](end_span)
        if (c.status === 'Assigned' && !newAssignedTo) c.status = 'Created';[span_525](start_span)[span_525](end_span)
    }[span_526](start_span)[span_526](end_span)

    await saveDB();[span_527](start_span)[span_527](end_span)
    closeModal('actionModal');[span_528](start_span)[span_528](end_span)
    closeModal('editConsignmentModal');[span_529](start_span)[span_529](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_530](start_span)[span_530](end_span)
};[span_531](start_span)[span_531](end_span)

export const deleteConsignmentFromEdit = async () => {[span_532](start_span)[span_532](end_span)
    const db = getDB();[span_533](start_span)[span_533](end_span)
    const cid = document.getElementById('eCid').value;[span_534](start_span)[span_534](end_span)
    if (!confirm(`Are you sure you want to permanently delete Consignment ${cid}? This action cannot be undone.`)) return;[span_535](start_span)[span_535](end_span)

    db.consignments = db.consignments.filter(c => c.id !== cid);[span_536](start_span)[span_536](end_span)
    await saveDB();[span_537](start_span)[span_537](end_span)
    closeModal('editConsignmentModal');[span_538](start_span)[span_538](end_span)
    closeModal('inspectModal');[span_539](start_span)[span_539](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_540](start_span)[span_540](end_span)
};[span_541](start_span)[span_541](end_span)

export const openAssignRtoModal = (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    const activeAgents = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE');
    const defaultPicker = c.rtoPickupBy || c.assignedTo || '';

    closeModal('inspectModal');
    document.getElementById('actionModalTitle').textContent = `Assign RTO: ${c.id}`;
    document.getElementById('actionModalBody').innerHTML = `
      <div class="space-y-4">
        <div class="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] text-xs space-y-1">
          <p><span class="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Consignment:</span> <b class="font-black">${c.id}</b></p>
          <p><span class="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Assigned Person:</span> <b>${getAgentName(c.assignedTo)}</b></p>
        </div>
        <div>
          <label class="block text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5">RTO Pickup Person (Editable)</label>
          <select id="rtoPickupAgentSelect" class="w-full font-bold border border-[var(--border-color)] rounded-xl px-4 py-3 bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]">
            <option value="">-- Select Agent --</option>
            ${activeAgents.map(a => `<option value="${a.id}" ${a.id === defaultPicker ? 'selected' : ''}>${a.name} - ${a.id}</option>`).join('')}
          </select>
        </div>
        <button onclick="window.confirmAssignRto('${c.id}')" class="w-full bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-all uppercase tracking-widest text-[11px] border border-[#1e293b]">
          Move to RTO Card
        </button>
      </div>
    `;
    document.getElementById('actionModal').classList.remove('hidden');
};

export const confirmAssignRto = async (cid) => {
    const db = getDB();
    const c = db.consignments.find(x => x.id === cid);
    const selectedAgent = document.getElementById('rtoPickupAgentSelect')?.value;
    if (!c) return;
    if (!selectedAgent) return alert('Please select an RTO pickup person.');

    const agentLabel = getAgentName(selectedAgent);
    if (!confirm(`Move consignment ${c.id} to the RTO card with "${agentLabel}" as the pickup person?`)) return;

    c.rtoStatus = 'ASSIGNED';
    c.rtoAssignedTo = c.assignedTo || selectedAgent;
    c.rtoPickupBy = selectedAgent;
    c.rtoAssignedAt = getUAEISOString();

    await saveDB();
    closeModal('actionModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const submitRtoToOwner = async (cid) => {
    const db = getDB();
    const currentUser = getCurrentUser();
    const c = db.consignments.find(x => x.id === cid);
    if (!c) return;

    if (currentUser.role === 'AGENT' && c.rtoPickupBy && c.rtoPickupBy !== currentUser.id) {
        return alert('Only the assigned RTO pickup person can submit this consignment.');
    }

    if (!confirm(`Submit RTO consignment ${c.id} back to the owner for admin confirmation?`)) return;

    c.rtoStatus = 'SUBMITTED_BY_AGENT';
    c.rtoSubmittedAt = getUAEISOString();

    await saveDB();
    closeModal('inspectModal');
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
};

export const inspectConsignmentById = () => {[span_542](start_span)[span_542](end_span)
    const db = getDB();[span_543](start_span)[span_543](end_span)
    const id = document.getElementById('globalConsignmentSearch').value.trim().toUpperCase();[span_544](start_span)[span_544](end_span)
    const c = db.consignments.find(x => x.id.toUpperCase() === id);[span_545](start_span)[span_545](end_span)
    if (c) showConsignmentDetails(c.id);[span_546](start_span)[span_546](end_span)
    else alert('Record not found.');[span_547](start_span)[span_547](end_span)
};[span_548](start_span)[span_548](end_span)

export const showConsignmentDetails = (cid) => {[span_549](start_span)[span_549](end_span)
    const db = getDB();[span_550](start_span)[span_550](end_span)
    const currentUser = getCurrentUser();[span_551](start_span)[span_551](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_552](start_span)[span_552](end_span)
    if (!c) return;[span_553](start_span)[span_553](end_span)

    const v = getVendorByCode(c.vendorCode);[span_554](start_span)[span_554](end_span)
    const collectAmt = c.feeType === 'COD' ? (parseFloat(c.productAmount) + parseFloat(c.deliveryCharge)) : parseFloat(c.productAmount);[span_555](start_span)[span_555](end_span)
    document.getElementById('inspectTitle').textContent = `Consignment Record: ${c.id}`;[span_556](start_span)[span_556](end_span)

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
      </div>`;[span_557](start_span)[span_557](end_span)

    const canDeliver = ['Assigned', 'Picked Up', 'Out for delivery'].includes(c.status) && c.assignedTo === currentUser.id;[span_558](start_span)[span_558](end_span)
    const { isDeficit } = getDeficitInfo(c);[span_559](start_span)[span_559](end_span)[span_560](start_span)[span_560](end_span)
    const needsDeficitCollection = isDeficit && !c.deficitReceivedDate && c.pickedUpBy;[span_561](start_span)[span_561](end_span)
    const canMarkDeficit = needsDeficitCollection && (currentUser.role === 'ADMIN' || currentUser.id === c.pickedUpBy);[span_562](start_span)[span_562](end_span)
    const isA = currentUser.role === 'ADMIN';[span_563](start_span)[span_563](end_span)
    const ags = db.users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE');[span_564](start_span)[span_564](end_span)

    let actionButtons = `<div class="flex flex-wrap gap-2 pt-5 border-t border-[var(--border-color)]">`;[span_565](start_span)[span_565](end_span)

    if (isA) {[span_566](start_span)[span_566](end_span)
        actionButtons += `<button onclick="window.openEditConsignmentModal('${c.id}')" class="bg-[var(--bg-base)] hover:bg-[var(--border-color-strong)] text-[var(--text-primary)] border border-[var(--border-color)] font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Edit</button>`;[span_567](start_span)[span_567](end_span)
        if (c.status === 'Returned' && !c.rtoStatus) {
            actionButtons += `<button onclick="window.openAssignRtoModal('${c.id}')" class="bg-[var(--status-blue)] hover:bg-[#2563eb] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Assign RTO</button>`;
        }
        if (canDeliver) {[span_568](start_span)[span_568](end_span)
            actionButtons += `<button onclick="window.closeModal('inspectModal'); window.openPodScreen('${c.id}')" class="bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest flex-1 sm:flex-none">Deliver</button>`;[span_569](start_span)[span_569](end_span)
            actionButtons += `<button onclick="window.closeModal('inspectModal'); window.openReturnModal('${c.id}')" class="bg-[var(--status-rose)] hover:bg-[#e11d48] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Return</button>`;[span_570](start_span)[span_570](end_span)
        }[span_571](start_span)[span_571](end_span)
    }[span_572](start_span)[span_572](end_span)

    if (c.rtoStatus === 'ASSIGNED' && (currentUser.role === 'AGENT' ? c.rtoPickupBy === currentUser.id : isA)) {
        actionButtons += `<button onclick="window.submitRtoToOwner('${c.id}')" class="bg-[#0b0f19] hover:bg-[#131b2e] text-[var(--accent-gold)] font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-all uppercase tracking-widest border border-[#1e293b] flex-1 sm:flex-none">Submit to Owner</button>`;
    }

    if (canMarkDeficit) {[span_573](start_span)[span_573](end_span)
        actionButtons += `<button onclick="window.closeModal('inspectModal'); window.markDeficitReceived('${c.id}')" class="bg-[var(--status-blue)] hover:bg-[#2563eb] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">Amt Recv</button>`;[span_574](start_span)[span_574](end_span)
    }[span_575](start_span)[span_575](end_span)

    if (c.feeType === 'COC' && c.cocPendingAmount > 0 && c.cocStatus === 'PENDING' && c.pickedUpBy === currentUser.id) {[span_576](start_span)[span_576](end_span)
        actionButtons += `<button onclick="window.closeModal('inspectModal'); window.agentMarkCocCollected('${c.id}')" class="bg-[var(--status-blue)] hover:bg-[#2563eb] text-white font-extrabold py-2 px-4 rounded-xl text-[10px] shadow-sm transition-colors uppercase tracking-widest flex-1 sm:flex-none">COC Recv</button>`;[span_577](start_span)[span_577](end_span)
    }[span_578](start_span)[span_578](end_span)

    if (isA) {[span_579](start_span)[span_579](end_span)
        actionButtons += `<button onclick="window.sendWhatsAppStatus('${c.id}')" class="bg-[#10b981]/10 text-[var(--status-emerald)] border border-[#10b981]/30 px-4 py-2 rounded-xl text-[10px] font-extrabold shadow-sm hover:bg-[#10b981]/20 transition-colors uppercase tracking-widest flex-1 sm:flex-none">WA Status</button>`;[span_580](start_span)[span_580](end_span)
        if (c.status !== 'Delivered') {[span_581](start_span)[span_581](end_span)
            actionButtons += `
            <div class="w-full mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <span class="font-extrabold text-[10px] text-[var(--text-secondary)] uppercase tracking-widest shrink-0">Assign:</span>
                <select onchange="window.adminAssignAgent('${c.id}',this.value); window.closeModal('inspectModal');" class="w-full sm:flex-1 border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-all cursor-pointer">
                    <option value="">- Assign Pool -</option>
                    ${ags.map(a => `<option value="${a.id}" ${c.assignedTo === a.id ? 'selected' : ''}>${a.name} - ${a.id}</option>`).join('')}
                </select>
            </div>`;[span_582](start_span)[span_582](end_span)
        }[span_583](start_span)[span_583](end_span)
    }[span_584](start_span)[span_584](end_span)

    actionButtons += `</div>`;[span_585](start_span)[span_585](end_span)
    document.getElementById('inspectContent').innerHTML = html + actionButtons;[span_586](start_span)[span_586](end_span)
    document.getElementById('inspectModal').classList.remove('hidden');[span_587](start_span)[span_587](end_span)

    if (c.qrGenerated) {[span_588](start_span)[span_588](end_span)
        setTimeout(() => {[span_589](start_span)[span_589](end_span)
            document.getElementById('qrCodeCanvas').innerHTML = '';[span_590](start_span)[span_590](end_span)
            const isDarkMode = document.body.classList.contains('dark-mode');[span_591](start_span)[span_591](end_span)
            if (window.QRCode) {[span_592](start_span)[span_592](end_span)
                new window.QRCode(document.getElementById('qrCodeCanvas'), {[span_593](start_span)[span_593](end_span)
                    text: JSON.stringify({ id: c.id }),[span_594](start_span)[span_594](end_span)
                    width: 72, height: 72,[span_595](start_span)[span_595](end_span)
                    colorDark: isDarkMode ? "#ffffff" : "#0b0f19",[span_596](start_span)[span_596](end_span)
                    colorLight: isDarkMode ? "#0b0f19" : "#ffffff",[span_597](start_span)[span_597](end_span)
                    correctLevel: window.QRCode.CorrectLevel.L[span_598](start_span)[span_598](end_span)
                });[span_599](start_span)[span_599](end_span)
            }[span_600](start_span)[span_600](end_span)
        }, 100);[span_601](start_span)[span_601](end_span)
    }[span_602](start_span)[span_602](end_span)
};[span_603](start_span)[span_603](end_span)

const compressImageFile = (file, cb) => {[span_604](start_span)[span_604](end_span)
    const r = new FileReader();[span_605](start_span)[span_605](end_span)
    r.onload = e => {[span_606](start_span)[span_606](end_span)
        const img = new Image();[span_607](start_span)[span_607](end_span)
        img.onload = () => {[span_608](start_span)[span_608](end_span)
            const cvs = document.createElement('canvas');[span_609](start_span)[span_609](end_span)
            let w = img.width, h = img.height, m = 480;[span_610](start_span)[span_610](end_span)
            if (w > h && w > m) { h *= m / w; w = m; } else if (h > m) { w *= m / h; h = m; }[span_611](start_span)[span_611](end_span)
            cvs.width = w; cvs.height = h;[span_612](start_span)[span_612](end_span)
            cvs.getContext('2d').drawImage(img, 0, 0, w, h);[span_613](start_span)[span_613](end_span)
            cb(cvs.toDataURL('image/jpeg', 0.55));[span_614](start_span)[span_614](end_span)
        };[span_615](start_span)[span_615](end_span)
        img.src = e.target.result;[span_616](start_span)[span_616](end_span)
    };[span_617](start_span)[span_617](end_span)
    r.readAsDataURL(file);[span_618](start_span)[span_618](end_span)
};[span_619](start_span)[span_619](end_span)

export const handlePodPhoto = (e) => {[span_620](start_span)[span_620](end_span)
    if (e.target.files[0]) {[span_621](start_span)[span_621](end_span)
        compressImageFile(e.target.files[0], b64 => {[span_622](start_span)[span_622](end_span)
            tempPodPhotoData = b64;[span_623](start_span)[span_623](end_span)
            const img = document.getElementById('podPhotoPreview');[span_624](start_span)[span_624](end_span)
            img.src = b64;[span_625](start_span)[span_625](end_span)
            img.classList.remove('hidden');[span_626](start_span)[span_626](end_span)
        });[span_627](start_span)[span_627](end_span)
    }[span_628](start_span)[span_628](end_span)
};[span_629](start_span)[span_629](end_span)

export const handleModalPhoto = (e) => {[span_630](start_span)[span_630](end_span)
    if (e.target.files[0]) {[span_631](start_span)[span_631](end_span)
        compressImageFile(e.target.files[0], b64 => {[span_632](start_span)[span_632](end_span)
            tempPhotoData = b64;[span_633](start_span)[span_633](end_span)
            const img = document.getElementById('modalPhotoPreview');[span_634](start_span)[span_634](end_span)
            if (img) { img.src = b64; img.classList.remove('hidden'); }[span_635](start_span)[span_635](end_span)
        });[span_636](start_span)[span_636](end_span)
    }[span_637](start_span)[span_637](end_span)
};[span_638](start_span)[span_638](end_span)

export const openPodScreen = (cid) => {[span_639](start_span)[span_639](end_span)
    const db = getDB();[span_640](start_span)[span_640](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_641](start_span)[span_641](end_span)
    if (!c) return;[span_642](start_span)[span_642](end_span)

    currentPodCid = cid;[span_643](start_span)[span_643](end_span)
    tempPodPhotoData = null;[span_644](start_span)[span_644](end_span)

    const v = getVendorByCode(c.vendorCode);[span_645](start_span)[span_645](end_span)
    document.getElementById('podAwb').textContent = c.id;[span_646](start_span)[span_646](end_span)
    document.getElementById('podShipper').textContent = v ? v.name : c.vendorCode;[span_647](start_span)[span_647](end_span)
    document.getElementById('podConsignee').textContent = c.customerName;[span_648](start_span)[span_648](end_span)
    document.getElementById('podReceiverName').value = '';[span_649](start_span)[span_649](end_span)
    document.getElementById('podDoCollected').checked = false;[span_650](start_span)[span_650](end_span)
    document.getElementById('podDoToBeCollected').checked = false;[span_651](start_span)[span_651](end_span)
    document.getElementById('podDoRemarks').value = '';[span_652](start_span)[span_652](end_span)

    document.getElementById('podNcndAmount').value = c.productAmount || 0;[span_653](start_span)[span_653](end_span)
    document.getElementById('podNcndCollected').value = c.productAmount || 0;[span_654](start_span)[span_654](end_span)
    document.getElementById('podNcndRemarks').value = '';[span_655](start_span)[span_655](end_span)

    let currentModeText = '';[span_656](start_span)[span_656](end_span)
    let defaultMethod = '';[span_657](start_span)[span_657](end_span)

    if (c.feeType === 'COD') { currentModeText = 'Cash On Delivery'; defaultMethod = 'COD'; }[span_658](start_span)[span_658](end_span)
    else if (c.feeType === 'CAD') { currentModeText = 'Cash After Delivery'; defaultMethod = 'CAD'; }[span_659](start_span)[span_659](end_span)
    else if (c.feeType === 'COC') { currentModeText = 'Pickup Cash'; defaultMethod = 'PKP'; }[span_660](start_span)[span_660](end_span)

    currentPodDefaultMethod = defaultMethod;[span_661](start_span)[span_661](end_span)
    document.getElementById('podCurrentPayMode').textContent = currentModeText;[span_662](start_span)[span_662](end_span)

    document.querySelectorAll('input[name="podPayMethod"]').forEach(r => {[span_663](start_span)[span_663](end_span)
        r.checked = (r.value === defaultMethod);[span_664](start_span)[span_664](end_span)
    });[span_665](start_span)[span_665](end_span)

    document.getElementById('podPayModeRemarks').value = '';[span_666](start_span)[span_666](end_span)
    document.getElementById('podCourierCharge').value = c.deliveryCharge || 0;[span_667](start_span)[span_667](end_span)
    document.getElementById('podCodCollected').value = c.deliveryCharge || 0;[span_668](start_span)[span_668](end_span)
    document.getElementById('podCodRemarks').value = '';[span_669](start_span)[span_669](end_span)

    document.getElementById('podPhotoPreview').classList.add('hidden');[span_670](start_span)[span_670](end_span)
    document.getElementById('podPhotoPreview').src = '';[span_671](start_span)[span_671](end_span)

    handlePodPayMethodChange();[span_672](start_span)[span_672](end_span)
    document.getElementById('podModal').classList.remove('hidden');[span_673](start_span)[span_673](end_span)
};[span_674](start_span)[span_674](end_span)

export const handlePodPayMethodChange = () => {[span_675](start_span)[span_675](end_span)
    const selected = document.querySelector('input[name="podPayMethod"]:checked')?.value || 'COD';[span_676](start_span)[span_676](end_span)
    const codCol = document.getElementById('podCodCollected');[span_677](start_span)[span_677](end_span)

    if (selected === 'COD') {[span_678](start_span)[span_678](end_span)
        codCol.disabled = false;[span_679](start_span)[span_679](end_span)
    } else {[span_680](start_span)[span_680](end_span)
        codCol.disabled = true;[span_681](start_span)[span_681](end_span)
        codCol.value = '0';[span_682](start_span)[span_682](end_span)
    }[span_683](start_span)[span_683](end_span)
};[span_684](start_span)[span_684](end_span)

export const submitPodDelivered = (e) => {[span_685](start_span)[span_685](end_span)
    if (e) e.preventDefault();[span_686](start_span)[span_686](end_span)
    const db = getDB();[span_687](start_span)[span_687](end_span)
    const cid = currentPodCid;[span_688](start_span)[span_688](end_span)
    if (!cid) return alert('Error: Consignment ID missing.');[span_689](start_span)[span_689](end_span)

    const c = db.consignments.find(x => x.id === cid);[span_690](start_span)[span_690](end_span)
    if (!c) return;[span_691](start_span)[span_691](end_span)

    const ncndAmt = parseFloat(document.getElementById('podNcndAmount').value) || 0;[span_692](start_span)[span_692](end_span)
    const ncndCol = parseFloat(document.getElementById('podNcndCollected').value) || 0;[span_693](start_span)[span_693](end_span)
    const ncndRemarks = document.getElementById('podNcndRemarks').value.trim();[span_694](start_span)[span_694](end_span)

    if (ncndCol < ncndAmt && !ncndRemarks) {[span_695](start_span)[span_695](end_span)
        return alert('Validation Failed: Please enter NCND Remarks because NCND Collected is less than NCND Amount.');[span_696](start_span)[span_696](end_span)
    }[span_697](start_span)[span_697](end_span)

    const selectedPayRadio = document.querySelector('input[name="podPayMethod"]:checked');[span_698](start_span)[span_698](end_span)
    const selectedPayMethod = selectedPayRadio ? selectedPayRadio.value : 'COD';[span_699](start_span)[span_699](end_span)

    const payModeRemarks = document.getElementById('podPayModeRemarks').value.trim();[span_700](start_span)[span_700](end_span)

    if (selectedPayMethod !== (currentPodDefaultMethod || 'COD') && !payModeRemarks) {[span_701](start_span)[span_701](end_span)
        return alert('Validation Failed: Please enter Payment Mode Remarks since the default Payment Method was changed.');[span_702](start_span)[span_702](end_span)
    }[span_703](start_span)[span_703](end_span)

    const courierCharge = parseFloat(document.getElementById('podCourierCharge').value) || 0;[span_704](start_span)[span_704](end_span)
    const codCol = parseFloat(document.getElementById('podCodCollected').value) || 0;[span_705](start_span)[span_705](end_span)
    const codRemarks = document.getElementById('podCodRemarks').value.trim();[span_706](start_span)[span_706](end_span)

    if (selectedPayMethod === 'COD' && codCol !== courierCharge && !codRemarks) {[span_707](start_span)[span_707](end_span)
        return alert('Validation Failed: Please enter COD Remarks because COD Collected is different from the Courier Charge.');[span_708](start_span)[span_708](end_span)
    }[span_709](start_span)[span_709](end_span)

    document.getElementById('actionModalTitle').textContent = `Deliver Consignment: ${c.id}`;[span_710](start_span)[span_710](end_span)
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-emerald-bg)] border border-[#10b981]/20 rounded-xl text-center">
        <p class="text-[10px] font-extrabold text-[var(--status-emerald)] uppercase tracking-widest mb-1.5">You want to mark this consignment as Delivered?</p>
      </div>
      <button onclick="window.executePodDelivered('${c.id}')" class="w-full bg-[var(--status-emerald)] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">Confirm Delivery</button>
    `;[span_711](start_span)[span_711](end_span)
    document.getElementById('actionModal').classList.remove('hidden');[span_712](start_span)[span_712](end_span)
};[span_713](start_span)[span_713](end_span)

export const executePodDelivered = async (cid) => {[span_714](start_span)[span_714](end_span)
    const db = getDB();[span_715](start_span)[span_715](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_716](start_span)[span_716](end_span)
    if (!c) return;[span_717](start_span)[span_717](end_span)

    const ncndAmt = parseFloat(document.getElementById('podNcndAmount').value) || 0;[span_718](start_span)[span_718](end_span)
    const ncndCol = parseFloat(document.getElementById('podNcndCollected').value) || 0;[span_719](start_span)[span_719](end_span)
    const ncndRemarks = document.getElementById('podNcndRemarks').value.trim();[span_720](start_span)[span_720](end_span)
    const selectedPayRadio = document.querySelector('input[name="podPayMethod"]:checked');[span_721](start_span)[span_721](end_span)
    const selectedPayMethod = selectedPayRadio ? selectedPayRadio.value : 'COD';[span_722](start_span)[span_722](end_span)
    const payModeRemarks = document.getElementById('podPayModeRemarks').value.trim();[span_723](start_span)[span_723](end_span)
    const courierCharge = parseFloat(document.getElementById('podCourierCharge').value) || 0;[span_724](start_span)[span_724](end_span)
    const codCol = parseFloat(document.getElementById('podCodCollected').value) || 0;[span_725](start_span)[span_725](end_span)
    const codRemarks = document.getElementById('podCodRemarks').value.trim();[span_726](start_span)[span_726](end_span)
    const doCollected = document.getElementById('podDoCollected').checked;[span_727](start_span)[span_727](end_span)
    const doToBeCollected = document.getElementById('podDoToBeCollected').checked;[span_728](start_span)[span_728](end_span)
    const doRemarks = document.getElementById('podDoRemarks').value.trim();[span_729](start_span)[span_729](end_span)

    const btn = document.querySelector('#actionModal button');[span_730](start_span)[span_730](end_span)
    if (btn) {[span_731](start_span)[span_731](end_span)
        btn.textContent = 'Processing...';[span_732](start_span)[span_732](end_span)
        btn.disabled = true;[span_733](start_span)[span_733](end_span)
    }[span_734](start_span)[span_734](end_span)

    let photoUrl = c.deliveryPhoto;[span_735](start_span)[span_735](end_span)
    if (tempPodPhotoData) {[span_736](start_span)[span_736](end_span)
        photoUrl = await uploadImageToSupabase(tempPodPhotoData, `delivery_pod_${cid}_${Date.now()}.jpg`);[span_737](start_span)[span_737](end_span)
    }[span_738](start_span)[span_738](end_span)

    if (ncndCol !== ncndAmt) { c.productAmount = ncndCol; }[span_739](start_span)[span_739](end_span)
    if (selectedPayMethod === 'COD' && codCol !== courierCharge) { c.deliveryCharge = codCol; }[span_740](start_span)[span_740](end_span)
    if (selectedPayMethod === 'PKP') { c.feeType = 'COC'; } else { c.feeType = selectedPayMethod; }[span_741](start_span)[span_741](end_span)

    c.status = 'Delivered';[span_742](start_span)[span_742](end_span)
    c.deliveredAt = getUAEISOString();[span_743](start_span)[span_743](end_span)
    c.deliveryPhoto = photoUrl;[span_744](start_span)[span_744](end_span)
    c.podData = {[span_745](start_span)[span_745](end_span)
        receiverName: document.getElementById('podReceiverName').value.trim(),[span_746](start_span)[span_746](end_span)
        ncndCollected: ncndCol,[span_747](start_span)[span_747](end_span)
        ncndPayMethod: document.querySelector('input[name="podNcndPayMethod"]:checked') ? document.querySelector('input[name="podNcndPayMethod"]:checked').value : 'Cash',[span_748](start_span)[span_748](end_span)
        ncndRemarks: ncndRemarks,[span_749](start_span)[span_749](end_span)
        payMethod: selectedPayMethod,[span_750](start_span)[span_750](end_span)
        payModeRemarks: payModeRemarks,[span_751](start_span)[span_751](end_span)
        codCollected: codCol,[span_752](start_span)[span_752](end_span)
        codRemarks: codRemarks,[span_753](start_span)[span_753](end_span)
        doCollected: doCollected,[span_754](start_span)[span_754](end_span)
        doToBeCollected: doToBeCollected,[span_755](start_span)[span_755](end_span)
        doRemarks: doRemarks[span_756](start_span)[span_756](end_span)
    };[span_757](start_span)[span_757](end_span)

    await saveDB();[span_758](start_span)[span_758](end_span)
    closeModal('actionModal');[span_759](start_span)[span_759](end_span)
    closeModal('podModal');[span_760](start_span)[span_760](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_761](start_span)[span_761](end_span)
};[span_762](start_span)[span_762](end_span)

export const submitPodReturn = () => {[span_763](start_span)[span_763](end_span)
    const cid = currentPodCid;[span_764](start_span)[span_764](end_span)
    if (!cid) return alert("Error: Consignment ID not found.");[span_765](start_span)[span_765](end_span)
    closeModal('podModal');[span_766](start_span)[span_766](end_span)
    openReturnModal(cid);[span_767](start_span)[span_767](end_span)
};[span_768](start_span)[span_768](end_span)

export const openReturnModal = (cid) => {[span_769](start_span)[span_769](end_span)
    const db = getDB();[span_770](start_span)[span_770](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_771](start_span)[span_771](end_span)
    if (!c) return;[span_772](start_span)[span_772](end_span)

    document.getElementById('actionModalTitle').textContent = `Return Consignment: ${c.id}`;[span_773](start_span)[span_773](end_span)
    document.getElementById('actionModalBody').innerHTML = `
      <div class="mb-4 p-4 bg-[var(--status-rose-bg)] border border-[#f43f5e]/20 rounded-xl">
        <p class="text-[10px] font-extrabold text-[var(--status-rose)] uppercase tracking-widest mb-2">Reason for Return</p>
        <textarea id="returnRemark" rows="3" class="w-full border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs font-bold bg-[var(--bg-surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--status-rose)] focus:border-[var(--status-rose)] transition-all placeholder-[var(--text-muted)] resize-none" placeholder="e.g., Customer not available..."></textarea>
      </div>
      <button onclick="window.confirmReturn('${c.id}')" class="w-full bg-[var(--status-rose)] hover:bg-[#e11d48] text-white font-extrabold py-3.5 rounded-xl shadow-[var(--shadow-elevated)] transition-colors uppercase tracking-widest text-[11px]">Confirm Return</button>
    `;[span_774](start_span)[span_774](end_span)
    document.getElementById('actionModal').classList.remove('hidden');[span_775](start_span)[span_775](end_span)
};[span_776](start_span)[span_776](end_span)

export const confirmReturn = async (cid) => {[span_777](start_span)[span_777](end_span)
    const db = getDB();[span_778](start_span)[span_778](end_span)
    const remark = document.getElementById('returnRemark').value.trim();[span_779](start_span)[span_779](end_span)
    if (!remark) return alert('Please enter a remark or reason for the return.');[span_780](start_span)[span_780](end_span)
    if (!confirm('Are you sure you want to mark this consignment as Returned?')) return;[span_781](start_span)[span_781](end_span)

    const c = db.consignments.find(x => x.id === cid);[span_782](start_span)[span_782](end_span)
    c.status = 'Returned';[span_783](start_span)[span_783](end_span)
    c.returnReason = remark;[span_784](start_span)[span_784](end_span)
    c.deliveredAt = getUAEISOString();[span_785](start_span)[span_785](end_span)

    await saveDB();[span_786](start_span)[span_786](end_span)
    closeModal('actionModal');[span_787](start_span)[span_787](end_span)
    if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_788](start_span)[span_788](end_span)
};[span_789](start_span)[span_789](end_span)

export const viewPickupPhoto = (cid) => {[span_790](start_span)[span_790](end_span)
    const db = getDB();[span_791](start_span)[span_791](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_792](start_span)[span_792](end_span)
    if (!c) return;[span_793](start_span)[span_793](end_span)

    document.getElementById('actionModalTitle').textContent = `Pick Up Photo: ${c.id}`;[span_794](start_span)[span_794](end_span)
    if (c.pickupPhoto) {[span_795](start_span)[span_795](end_span)
      document.getElementById('actionModalBody').innerHTML = `<div class="flex justify-center bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)]"><img src="${c.pickupPhoto}" class="max-h-[60vh] object-contain rounded-lg shadow-sm" alt="Pickup Photo" /></div>`;[span_796](start_span)[span_796](end_span)
    } else {[span_797](start_span)[span_797](end_span)
      document.getElementById('actionModalBody').innerHTML = `<div class="p-8 text-center text-[var(--text-muted)] font-bold border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] text-[10px] uppercase tracking-widest">No Pick Up Photo available.</div>`;[span_798](start_span)[span_798](end_span)
    }[span_799](start_span)[span_799](end_span)
    document.getElementById('actionModal').classList.remove('hidden');[span_800](start_span)[span_800](end_span)
};[span_801](start_span)[span_801](end_span)

export const viewDeliveryPhoto = (cid) => {[span_802](start_span)[span_802](end_span)
    const db = getDB();[span_803](start_span)[span_803](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_804](start_span)[span_804](end_span)
    if (!c) return;[span_805](start_span)[span_805](end_span)

    document.getElementById('actionModalTitle').textContent = `Delivery Photo: ${c.id}`;[span_806](start_span)[span_806](end_span)
    if (c.deliveryPhoto) {[span_807](start_span)[span_807](end_span)
      document.getElementById('actionModalBody').innerHTML = `<div class="flex justify-center bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)]"><img src="${c.deliveryPhoto}" class="max-h-[60vh] object-contain rounded-lg shadow-sm" alt="Delivery Photo" /></div>`;[span_808](start_span)[span_808](end_span)
    } else {[span_809](start_span)[span_809](end_span)
      document.getElementById('actionModalBody').innerHTML = `<div class="p-8 text-center text-[var(--text-muted)] font-bold border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] text-[10px] uppercase tracking-widest">No Delivery Photo available.</div>`;[span_810](start_span)[span_810](end_span)
    }[span_811](start_span)[span_811](end_span)
    document.getElementById('actionModal').classList.remove('hidden');[span_812](start_span)[span_812](end_span)
};[span_813](start_span)[span_813](end_span)

export const agentMarkCocCollected = async (cid) => {[span_814](start_span)[span_814](end_span)
    const db = getDB();[span_815](start_span)[span_815](end_span)
    if (!confirm('Mark this pending COC amount as collected from the vendor?')) return;[span_816](start_span)[span_816](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_817](start_span)[span_817](end_span)
    if (c) {[span_818](start_span)[span_818](end_span)
      c.cocStatus = 'COLLECTED';[span_819](start_span)[span_819](end_span)
      await saveDB();[span_820](start_span)[span_820](end_span)
      if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_821](start_span)[span_821](end_span)
      alert('Marked as collected. The Admin must now confirm receipt in the office.');[span_822](start_span)[span_822](end_span)
    }[span_823](start_span)[span_823](end_span)
};[span_824](start_span)[span_824](end_span)

export const markDeficitReceived = (cid) => {[span_825](start_span)[span_825](end_span)
    const db = getDB();[span_826](start_span)[span_826](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_827](start_span)[span_827](end_span)
    if (!c) return;[span_828](start_span)[span_828](end_span)

    const v = getVendorByCode(c.vendorCode);[span_829](start_span)[span_829](end_span)
    const { deficitAmt } = getDeficitInfo(c);[span_830](start_span)[span_830](end_span)[span_831](start_span)[span_831](end_span)

    document.getElementById('deficitModalContent').innerHTML = `
      <div class="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] space-y-2 text-[var(--text-primary)]">
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Tracking ID:</b> <span class="font-black tracking-widest uppercase">${c.id}</span></p>
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Merchant:</b> <span class="font-bold">${v ? v.name : c.vendorCode}</span></p>
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Pickup Origin:</b> <span class="font-bold">${getAgentName(c.pickedUpBy)}</span></p>
        <div class="h-px bg-[var(--border-color)] w-full my-2"></div>
        <p><b class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Deficit Due:</b> <span class="text-[var(--status-rose)] font-black text-lg tabular-nums">${formatAmt(deficitAmt)} AED</span></p>
      </div>
      <p class="mt-4 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest text-center leading-relaxed">Confirm cash has been received from the merchant for this balance deficit.</p>
    `;[span_832](start_span)[span_832](end_span)

    document.getElementById('deficitConfirmBtn').onclick = async function () {[span_833](start_span)[span_833](end_span)
      c.deficitReceivedDate = getUAEISOString();[span_834](start_span)[span_834](end_span)
      db.vendorPayments.unshift({[span_835](start_span)[span_835](end_span)
          id: 'LED-' + Date.now() + Math.floor(Math.random() * 1000),[span_836](start_span)[span_836](end_span)
          vendorCode: c.vendorCode, type: 'RECEIVED', amount: deficitAmt,[span_837](start_span)[span_837](end_span)
          date: getUAEISOString().split('T')[0], notes: `Deficit Settled at Pickup for AWB: ${c.id}`[span_838](start_span)[span_838](end_span)
      });[span_839](start_span)[span_839](end_span)
      await saveDB();[span_840](start_span)[span_840](end_span)
      closeModal('deficitModal');[span_841](start_span)[span_841](end_span)

      if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_842](start_span)[span_842](end_span)
      if (document.getElementById('tab-invoices')?.classList.contains('tab-active')) {[span_843](start_span)[span_843](end_span)
          generateInvoicePreview();[span_844](start_span)[span_844](end_span)
          if (typeof window.renderVendorLedger === 'function') window.renderVendorLedger();[span_845](start_span)[span_845](end_span)
      }[span_846](start_span)[span_846](end_span)
    };[span_847](start_span)[span_847](end_span)

    document.getElementById('deficitModal').classList.remove('hidden');[span_848](start_span)[span_848](end_span)
};[span_849](start_span)[span_849](end_span)

export const adminConfirmPendingCoc = async (cid) => {[span_850](start_span)[span_850](end_span)
    const db = getDB();[span_851](start_span)[span_851](end_span)
    if (!confirm('Confirm physical receipt of this pending COC amount in the office?')) return;[span_852](start_span)[span_852](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_853](start_span)[span_853](end_span)
    if (c) {[span_854](start_span)[span_854](end_span)
      c.cocStatus = 'SETTLED';[span_855](start_span)[span_855](end_span)
      c.cocPendingAmount = 0;[span_856](start_span)[span_856](end_span)
      await saveDB();[span_857](start_span)[span_857](end_span)
      if (typeof window.refreshAllViews === 'function') window.refreshAllViews();[span_858](start_span)[span_858](end_span)
      if (document.getElementById('tab-invoices')?.classList.contains('tab-active')) generateInvoicePreview();[span_859](start_span)[span_859](end_span)
    }[span_860](start_span)[span_860](end_span)
};[span_861](start_span)[span_861](end_span)

export const sendWhatsAppStatus = (cid) => {[span_862](start_span)[span_862](end_span)
    const db = getDB();[span_863](start_span)[span_863](end_span)
    const c = db.consignments.find(x => x.id === cid);[span_864](start_span)[span_864](end_span)
    const v = getVendorByCode(c.vendorCode);[span_865](start_span)[span_865](end_span)
    const vendorName = v ? v.name : c.vendorCode;[span_866](start_span)[span_866](end_span)
    const collectAmt = c.feeType === 'COD' ? (parseFloat(c.productAmount) + parseFloat(c.deliveryCharge)) : parseFloat(c.productAmount);[span_867](start_span)[span_867](end_span)

    const message = `Dear Customer,\nYour Shipment RefNo: *${c.id}*\n(From : *${vendorName}*),is on the way for delivery.\nAmount: Aed *${formatAmt(collectAmt)}*`;[span_868](start_span)[span_868](end_span)
    window.open(`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');[span_869](start_span)[span_869](end_span)
};[span_870](start_span)[span_870](end_span)
