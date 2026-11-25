// /src/main.js
import { initDB, getCurrentUser, setCurrentUser, getDB, setStatusCallback } from './services/store.js';
import { initSupabase, getUAEISOString } from './services/sync.js';
import { hashPassword } from './services/auth.js';
import { handleLoginSubmit } from './views/loginViews.js';
import { closeModal } from './utils/helpers.js';

import {
  setDashMode, renderAgentDashboard, closeDashSubScreen,
  openDashAnalysis, openDashList, renderDashListItems
} from './views/dashboard.js';

import {
  renderConsignments, debounceRenderConsignments, adminAssignAgent
} from './views/dispatch.js';

import {
  generateAdminAgentReport, generateAgentFinanceReport, updateInvoiceFilterInputs,
  generateInvoicePreview, exportAgentDailyExcel, sendAgentReportWhatsApp,
  exportInvoiceExcel, printAdminAgentReport, printAgentFinanceReport, printVendorInvoice,
  openExpenseModal, saveAgentExpense, deleteExpense, updateExpenseStatus
} from './views/finance.js';

import {
  toggleWaybillView, clearWaybillForm, generateAndSendWaybill,
  addQuotationRow, removeQuotationRow, calcQtRow, calcQtGrandTotal,
  clearQuotationForm, generateAndSendQuotation, printQuotation
} from './views/documents.js';

import {
  openNewConsignmentModal, filterVendorSelect, syncVendorPickupAddress, saveNewConsignment,
  bulkAssign, openEditConsignmentModal, syncEditVendorPickupAddress, confirmEditConsignment,
  executeEditConsignment, deleteConsignmentFromEdit, openAssignRtoModal, confirmAssignRto,
  executeAssignRto, submitRtoToOwner, executeSubmitRtoToOwner, inspectConsignmentById,
  showConsignmentDetails, openPodScreen, handlePodPayMethodChange, handlePodPhoto,
  submitPodDelivered, executePodDelivered, submitPodReturn, openReturnModal, confirmReturn,
  viewPickupPhoto, viewDeliveryPhoto, agentMarkCocCollected, markDeficitReceived,
  adminConfirmPendingCoc, sendWhatsAppStatus, handleModalPhoto
} from './views/consignment.js';

import {
  saveSupabaseConfigFromTab, clearSupabaseConfig, toggleCloudSyncVisibility, applySettingsUi,
  archiveOldDeliveries, purgeOldPhotos60Days, clearAllConsignments, downloadBackup, restoreBackup,
  downloadImportTemplate, importConsignmentsFromExcel, toggleAutoAdjust, openVendorModal,
  openEditVendorModal, saveVendor, deleteVendor, renderVendors, openVendorPaymentModal,
  saveVendorLedgerEntry, renderVendorLedger, deleteLedger, openVendorSettlementOtpModal,
  sendSettlementOtp, verifySettlementOtp, cancelSettlementOtp, adminConfirmRto,
  executeAdminConfirmRto, openAgentModal, saveAgent, renderAgents, setAgentStatus,
  adminDeleteAgent, adminResetAgentPassword, openCredentialsModal, changeOwnPassword,
  renderConfirmations, generateAdminFinanceTab
} from './views/admin.js';

const getDefaultSeedDB = async () => {
  const adminHash = await hashPassword('admin123');
  const agentHash = await hashPassword('agent123');
  return {
    settings: { companyName: 'NEXT WAY DELIVERY', otpMandatory: true, showCloudSyncConfig: true, invoiceCounter: 1001 },
    users: [
      { id: 'USR-ADMIN', username: 'NEXTWAY', name: 'System Administrator', role: 'ADMIN', phone: '+917012133095', passwordHash: adminHash, status: 'ACTIVE' },
      { id: 'AG-101', username: 'agent1', name: 'Ramesh Kumar', role: 'AGENT', phone: '+971501112233', passwordHash: agentHash, status: 'ACTIVE' }
    ],
    vendors: [{ code: 'VND-001', name: 'Gulf Horizon Trading LLC', phone: '+971500001111', address: 'Dubai', trn: '105508889000003' }],
    consignments: [{
      id: '10001', vendorCode: 'VND-001', pickupFrom: 'Dubai', customerName: 'Omar',
      customerPhone: '+971529876543', deliveryAddress: 'Villa 12', productAmount: 350,
      deliveryCharge: 25, feeType: 'COD', weight: 1.5, pieces: 1, pendingModification: null,
      assignedTo: 'AG-101', pickedUpBy: 'AG-101', cocPendingAmount: 0, cocStatus: null,
      deficitReceivedDate: null, rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null,
      rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
      status: 'Delivered', qrGenerated: true, otpCode: '4829', otpVerified: true,
      pickupPhoto: null, deliveryPhoto: null, returnReason: '',
      createdAt: getUAEISOString().split('T')[0], pickedUpAt: getUAEISOString(), deliveredAt: getUAEISOString()
    }],
    vendorPayments: [],
    vendorSettlementOtps: [],
    agentExpenses: []
  };
};

export const enterWorkspace = () => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('bottomNav').classList.remove('hidden');
  document.getElementById('bottomNav').classList.add('flex');
  document.getElementById('darkModeBtn').classList.remove('hidden');

  const isA = currentUser.role === 'ADMIN';

  const roleBadge = document.getElementById('roleBadge');
  if (roleBadge) {
    roleBadge.innerHTML = isA
      ? `<span class="text-[var(--accent-gold)] font-extrabold mr-1">ADMIN</span> <span>${currentUser.username}</span>`
      : `<span>${currentUser.name} - ${currentUser.id}</span>`;
  }

  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isA));
  document.querySelectorAll('.agent-only').forEach(el => el.classList.toggle('hidden', isA));

  if (isA) {
    const db = getDB();
    if (db) {
      const agentOptions = `<option value="ALL">All Personnel</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

      const bulkAgent = document.getElementById('bulkAgent');
      if (bulkAgent) bulkAgent.innerHTML = `<option value="">Agent...</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

      const filterAgentSlicer = document.getElementById('filterAgentSlicer');
      if (filterAgentSlicer) filterAgentSlicer.innerHTML = `<option value="ALL">All Agents</option><option value="UNASSIGNED">Unassigned</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

      const adminReportSelect = document.getElementById('adminReportSelect');
      if (adminReportSelect) adminReportSelect.innerHTML = db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

      const adminCocReportSelect = document.getElementById('adminCocReportSelect');
      if (adminCocReportSelect) adminCocReportSelect.innerHTML = agentOptions;

      const adminDashAgentFilter = document.getElementById('adminDashAgentFilter');
      if (adminDashAgentFilter) adminDashAgentFilter.innerHTML = `<option value="ALL">Overall (All Agents)</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');

      const adminDashFilterWrap = document.getElementById('adminDashFilterWrap');
      if (adminDashFilterWrap) adminDashFilterWrap.classList.remove('hidden');
    }
  }

  switchTab(isA ? 'consignments' : 'dashboard');
  refreshAllViews();
};

export const logout = () => {
  setCurrentUser(null);
  document.getElementById('appView').classList.add('hidden');
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('bottomNav').classList.add('hidden');
  document.getElementById('darkModeBtn').classList.add('hidden');
};

export const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('NEXTWAY_DARK_MODE', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
};

export const toggleMoreMenu = () => {
  document.getElementById('moreMenuDrawer').classList.toggle('hidden');
};

export const switchTabWrapper = (tName) => {
  document.getElementById('moreMenuDrawer').classList.add('hidden');
  switchTab(tName);

  const moreBtn = document.getElementById('tab-more');
  if (moreBtn) {
    if (!['dashboard', 'consignments', 'confirmations'].includes(tName)) {
      moreBtn.classList.add('tab-active');
      moreBtn.classList.remove('text-[var(--text-muted)]');
    } else {
      moreBtn.classList.remove('tab-active');
      moreBtn.classList.add('text-[var(--text-muted)]');
    }
  }
};

export const switchTab = (tName) => {
  const globalHeader = document.getElementById('globalWorkspaceHeader');
  if (globalHeader) {
    globalHeader.classList.toggle('hidden', tName === 'dashboard');
  }

  ['dashboard', 'consignments', 'confirmations', 'agent-reports', 'agent-finance', 'agent-deficit', 'vendors', 'invoices', 'admin-finance', 'system', 'waybill'].forEach(t => {
    const p = document.getElementById(`panel-${t}`);
    const b = document.getElementById(`tab-${t}`);

    if (p) p.classList.toggle('hidden', t !== tName);
    if (b && b.id !== 'tab-more') {
      b.classList.toggle('tab-active', t === tName);
      b.classList.toggle('text-[var(--text-muted)]', t !== tName);
    }
  });

  if (tName === 'dashboard') { closeDashSubScreen(); renderAgentDashboard(); }
  if (tName === 'agent-finance') generateAgentFinanceReport();
  if (tName === 'admin-finance') generateAdminFinanceTab();
  if (tName === 'agent-deficit' && typeof window.renderAgentDeficit === 'function') window.renderAgentDeficit();

  if (tName === 'invoices') {
    const db = getDB();
    if (db && db.vendors) {
      document.getElementById('invVendorSelect').innerHTML = `<option value="" selected disabled></option>` + db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
    }
    generateInvoicePreview();
    renderVendorLedger();
  }
};

export const refreshAllViews = () => {
  applySettingsUi();
  renderConsignments();
  renderConfirmations();

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.role === 'ADMIN') {
    renderVendors();
    renderAgents();
    generateAdminFinanceTab();
  }

  renderAgentDashboard();

  const dashListScreen = document.getElementById('dashListScreen');
  if (dashListScreen && !dashListScreen.classList.contains('hidden')) {
    renderDashListItems();
  }

  if (currentUser && currentUser.role === 'AGENT' && typeof window.renderAgentDeficit === 'function') {
    window.renderAgentDeficit();
  }
};

export const updateSyncBadge = (state, label) => {
  const dot = document.getElementById('syncDot');
  if (!dot) return;
  dot.title = label;
  if (state === 'LIVE') { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#10b981] shadow ring-2 ring-[#10b981]/20 animate-pulse'; }
  else if (state === 'SYNCING') { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#c9a24b] shadow ring-2 ring-[#c9a24b]/20 animate-pulse'; }
  else { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow ring-2 ring-[#f43f5e]/20'; }
};

const initPWA = () => {
  let deferredPrompt;
  const installBtn = document.getElementById('installPwaBtn');

  if (installBtn) {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !window.navigator.standalone) {
      installBtn.classList.remove('hidden');
      installBtn.textContent = 'Setup iOS';
      installBtn.onclick = () => alert("To install on iPhone: \n\n1. Tap 'Share' at the bottom of Safari.\n2. Tap 'Add to Home Screen'.");
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.classList.remove('hidden');
      installBtn.onclick = async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        installBtn.classList.add('hidden');
        deferredPrompt = null;
      };
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const seedDB = await getDefaultSeedDB();
    await initDB(seedDB);
    setStatusCallback(updateSyncBadge);

    const savedUrl = localStorage.getItem('NEXTWAY_SUPABASE_URL');
    const savedKey = localStorage.getItem('NEXTWAY_SUPABASE_KEY');
    const supabaseUrl = savedUrl === 'OFFLINE' ? null : (savedUrl || 'https://hswhzctlpfjqwpvckxwm.supabase.co');
    const supabaseKey = savedKey === 'OFFLINE' ? null : (savedKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzd2h6Y3RscGZqcXdwdmNreHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDEyMjMsImV4cCI6MjEwODU3NzIyM30.jYqGM5_DhqFEGOGaiT_Mw7HQvVH0PKOjRyCONfwML60');

    const urlInput = document.getElementById('adminSupabaseUrlInput');
    const keyInput = document.getElementById('adminSupabaseKeyInput');
    if (urlInput && supabaseUrl) urlInput.value = supabaseUrl;
    if (keyInput && supabaseKey) keyInput.value = supabaseKey;

    await initSupabase(supabaseUrl, supabaseKey, updateSyncBadge, () => {
      const activeUser = getCurrentUser();
      if (activeUser) {
        const freshUser = getDB()?.users?.find(u => u.id === activeUser.id);
        if (freshUser && freshUser.status !== 'ACTIVE') {
          logout();
          alert('Account Deactivated');
          return;
        }
        if (freshUser) setCurrentUser(freshUser);
        refreshAllViews();
      }
    });

    const loginForm = document.querySelector('#authView form');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);
    }

    const dashListSearch = document.getElementById('dashListSearchInput');
    if (dashListSearch) {
      dashListSearch.addEventListener('input', () => {
        requestAnimationFrame(renderDashListItems);
      });
    }

    const dispatchSearch = document.getElementById('filterSearchText');
    if (dispatchSearch) {
      dispatchSearch.addEventListener('input', debounceRenderConsignments);
    }

    window.closeModal = closeModal;
    window.enterWorkspace = enterWorkspace;
    window.logout = logout;
    window.toggleDarkMode = toggleDarkMode;
    window.switchTab = switchTab;
    window.switchTabWrapper = switchTabWrapper;
    window.toggleMoreMenu = toggleMoreMenu;
    window.refreshAllViews = refreshAllViews;
    window.updateSyncBadge = updateSyncBadge;

    window.setDashMode = setDashMode;
    window.renderAgentDashboard = renderAgentDashboard;
    window.closeDashSubScreen = closeDashSubScreen;
    window.openDashAnalysis = openDashAnalysis;
    window.openDashList = openDashList;
    window.renderDashListItems = renderDashListItems;

    window.renderConsignments = renderConsignments;
    window.debounceRenderConsignments = debounceRenderConsignments;
    window.adminAssignAgent = adminAssignAgent;

    window.generateAdminAgentReport = generateAdminAgentReport;
    window.generateAgentFinanceReport = generateAgentFinanceReport;
    window.updateInvoiceFilterInputs = updateInvoiceFilterInputs;
    window.generateInvoicePreview = generateInvoicePreview;
    window.exportAgentDailyExcel = exportAgentDailyExcel;
    window.sendAgentReportWhatsApp = sendAgentReportWhatsApp;
    window.exportInvoiceExcel = exportInvoiceExcel;
    window.printAdminAgentReport = printAdminAgentReport;
    window.printAgentFinanceReport = printAgentFinanceReport;
    window.printVendorInvoice = printVendorInvoice;
    window.openExpenseModal = openExpenseModal;
    window.saveAgentExpense = saveAgentExpense;
    window.deleteExpense = deleteExpense;
    window.updateExpenseStatus = updateExpenseStatus;

    window.toggleWaybillView = toggleWaybillView;
    window.clearWaybillForm = clearWaybillForm;
    window.generateAndSendWaybill = generateAndSendWaybill;
    window.addQuotationRow = addQuotationRow;
    window.removeQuotationRow = removeQuotationRow;
    window.calcQtRow = calcQtRow;
    window.calcQtGrandTotal = calcQtGrandTotal;
    window.clearQuotationForm = clearQuotationForm;
    window.generateAndSendQuotation = generateAndSendQuotation;
    window.printQuotation = printQuotation;

    window.openNewConsignmentModal = openNewConsignmentModal;
    window.filterVendorSelect = filterVendorSelect;
    window.syncVendorPickupAddress = syncVendorPickupAddress;
    window.saveNewConsignment = saveNewConsignment;
    window.bulkAssign = bulkAssign;
    window.openEditConsignmentModal = openEditConsignmentModal;
    window.syncEditVendorPickupAddress = syncEditVendorPickupAddress;
    window.confirmEditConsignment = confirmEditConsignment;
    window.executeEditConsignment = executeEditConsignment;
    window.deleteConsignmentFromEdit = deleteConsignmentFromEdit;
    window.openAssignRtoModal = openAssignRtoModal;
    window.confirmAssignRto = confirmAssignRto;
    window.executeAssignRto = executeAssignRto;
    window.submitRtoToOwner = submitRtoToOwner;
    window.executeSubmitRtoToOwner = executeSubmitRtoToOwner;
    window.inspectConsignmentById = inspectConsignmentById;
    window.showConsignmentDetails = showConsignmentDetails;
    window.openPodScreen = openPodScreen;
    window.handlePodPayMethodChange = handlePodPayMethodChange;
    window.handlePodPhoto = handlePodPhoto;
    window.submitPodDelivered = submitPodDelivered;
    window.executePodDelivered = executePodDelivered;
    window.submitPodReturn = submitPodReturn;
    window.openReturnModal = openReturnModal;
    window.confirmReturn = confirmReturn;
    window.viewPickupPhoto = viewPickupPhoto;
    window.viewDeliveryPhoto = viewDeliveryPhoto;
    window.agentMarkCocCollected = agentMarkCocCollected;
    window.markDeficitReceived = markDeficitReceived;
    window.adminConfirmPendingCoc = adminConfirmPendingCoc;
    window.sendWhatsAppStatus = sendWhatsAppStatus;
    window.handleModalPhoto = handleModalPhoto;

    window.saveSupabaseConfigFromTab = saveSupabaseConfigFromTab;
    window.clearSupabaseConfig = clearSupabaseConfig;
    window.toggleCloudSyncVisibility = toggleCloudSyncVisibility;
    window.applySettingsUi = applySettingsUi;
    window.archiveOldDeliveries = archiveOldDeliveries;
    window.purgeOldPhotos60Days = purgeOldPhotos60Days;
    window.clearAllConsignments = clearAllConsignments;
    window.downloadBackup = downloadBackup;
    window.restoreBackup = restoreBackup;
    window.downloadImportTemplate = downloadImportTemplate;
    window.importConsignmentsFromExcel = importConsignmentsFromExcel;
    window.toggleAutoAdjust = toggleAutoAdjust;
    window.openVendorModal = openVendorModal;
    window.openEditVendorModal = openEditVendorModal;
    window.saveVendor = saveVendor;
    window.deleteVendor = deleteVendor;
    window.renderVendors = renderVendors;
    window.openVendorPaymentModal = openVendorPaymentModal;
    window.saveVendorLedgerEntry = saveVendorLedgerEntry;
    window.renderVendorLedger = renderVendorLedger;
    window.deleteLedger = deleteLedger;
    window.openVendorSettlementOtpModal = openVendorSettlementOtpModal;
    window.sendSettlementOtp = sendSettlementOtp;
    window.verifySettlementOtp = verifySettlementOtp;
    window.cancelSettlementOtp = cancelSettlementOtp;
    window.adminConfirmRto = adminConfirmRto;
    window.executeAdminConfirmRto = executeAdminConfirmRto;
    window.openAgentModal = openAgentModal;
    window.saveAgent = saveAgent;
    window.renderAgents = renderAgents;
    window.setAgentStatus = setAgentStatus;
    window.adminDeleteAgent = adminDeleteAgent;
    window.adminResetAgentPassword = adminResetAgentPassword;
    window.openCredentialsModal = openCredentialsModal;
    window.changeOwnPassword = changeOwnPassword;
    window.renderConfirmations = renderConfirmations;
    window.generateAdminFinanceTab = generateAdminFinanceTab;

    initPWA();

    if (getCurrentUser()) {
      enterWorkspace();
    }

    console.log('NextWay Delivery Modular App initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
