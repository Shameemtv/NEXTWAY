// /src/main.js
import { initDB, getCurrentUser, setCurrentUser, getDB, setStatusCallback } from './services/store.js';[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span)
import { initSupabase, getUAEISOString } from './services/sync.js';[span_4](start_span)[span_4](end_span)
import { hashPassword } from './services/auth.js';[span_5](start_span)[span_5](end_span)
import { handleLoginSubmit } from './views/loginViews.js';[span_6](start_span)[span_6](end_span)[span_7](start_span)[span_7](end_span)
import { closeModal } from './utils/helpers.js';[span_8](start_span)[span_8](end_span)

import {
  setDashMode, renderAgentDashboard, closeDashSubScreen,
  openDashAnalysis, openDashList, renderDashListItems
} from './views/dashboard.js';[span_9](start_span)[span_9](end_span)[span_10](start_span)[span_10](end_span)

import {
  renderConsignments, debounceRenderConsignments, adminAssignAgent
} from './views/dispatch.js';[span_11](start_span)[span_11](end_span)[span_12](start_span)[span_12](end_span)

import {
  generateAdminAgentReport, generateAgentFinanceReport, updateInvoiceFilterInputs,
  generateInvoicePreview, exportAgentDailyExcel, sendAgentReportWhatsApp,
  exportInvoiceExcel, printAdminAgentReport, printAgentFinanceReport, printVendorInvoice,
  openExpenseModal, saveAgentExpense, deleteExpense, updateExpenseStatus
} from './views/finance.js';[span_13](start_span)[span_13](end_span)[span_14](start_span)[span_14](end_span)

import {
  toggleWaybillView, clearWaybillForm, generateAndSendWaybill,
  addQuotationRow, removeQuotationRow, calcQtRow, calcQtGrandTotal,
  clearQuotationForm, generateAndSendQuotation, printQuotation
} from './views/documents.js';[span_15](start_span)[span_15](end_span)[span_16](start_span)[span_16](end_span)

import {
  openNewConsignmentModal, filterVendorSelect, syncVendorPickupAddress, saveNewConsignment,
  bulkAssign, openEditConsignmentModal, syncEditVendorPickupAddress, confirmEditConsignment,
  executeEditConsignment, deleteConsignmentFromEdit, openAssignRtoModal, confirmAssignRto,
  submitRtoToOwner, inspectConsignmentById, showConsignmentDetails, openPodScreen,
  handlePodPayMethodChange, handlePodPhoto, submitPodDelivered, executePodDelivered,
  submitPodReturn, openReturnModal, confirmReturn, viewPickupPhoto, viewDeliveryPhoto,
  agentMarkCocCollected, markDeficitReceived, adminConfirmPendingCoc, sendWhatsAppStatus,
  handleModalPhoto
} from './views/consignment.js';[span_17](start_span)[span_17](end_span)[span_18](start_span)[span_18](end_span)

import {
  saveSupabaseConfigFromTab, clearSupabaseConfig, toggleCloudSyncVisibility, applySettingsUi,
  archiveOldDeliveries, purgeOldPhotos60Days, clearAllConsignments, downloadBackup, restoreBackup,
  downloadImportTemplate, importConsignmentsFromExcel, toggleAutoAdjust, openVendorModal,
  openEditVendorModal, saveVendor, deleteVendor, renderVendors, openVendorPaymentModal,
  saveVendorLedgerEntry, renderVendorLedger, deleteLedger, openVendorSettlementOtpModal,
  sendSettlementOtp, verifySettlementOtp, cancelSettlementOtp, adminConfirmRto, openAgentModal,
  saveAgent, renderAgents, setAgentStatus, adminDeleteAgent, adminResetAgentPassword,
  openCredentialsModal, changeOwnPassword, renderConfirmations, generateAdminFinanceTab
} from './views/admin.js';[span_19](start_span)[span_19](end_span)[span_20](start_span)[span_20](end_span)

const getDefaultSeedDB = async () => {
  const adminHash = await hashPassword('admin123');[span_21](start_span)[span_21](end_span)[span_22](start_span)[span_22](end_span)
  const agentHash = await hashPassword('agent123');[span_23](start_span)[span_23](end_span)[span_24](start_span)[span_24](end_span)
  return {
    settings: { companyName: 'NEXT WAY DELIVERY', otpMandatory: true, showCloudSyncConfig: true, invoiceCounter: 1001 },[span_25](start_span)[span_25](end_span)
    users: [
      { id: 'USR-ADMIN', username: 'NEXTWAY', name: 'System Administrator', role: 'ADMIN', phone: '+917012133095', passwordHash: adminHash, status: 'ACTIVE' },[span_26](start_span)[span_26](end_span)
      { id: 'AG-101', username: 'agent1', name: 'Ramesh Kumar', role: 'AGENT', phone: '+971501112233', passwordHash: agentHash, status: 'ACTIVE' }[span_27](start_span)[span_27](end_span)
    ],[span_28](start_span)[span_28](end_span)
    vendors: [{ code: 'VND-001', name: 'Gulf Horizon Trading LLC', phone: '+971500001111', address: 'Dubai', trn: '105508889000003' }],[span_29](start_span)[span_29](end_span)
    consignments: [{
      id: '10001', vendorCode: 'VND-001', pickupFrom: 'Dubai', customerName: 'Omar',[span_30](start_span)[span_30](end_span)
      customerPhone: '+971529876543', deliveryAddress: 'Villa 12', productAmount: 350,[span_31](start_span)[span_31](end_span)
      deliveryCharge: 25, feeType: 'COD', weight: 1.5, pieces: 1, pendingModification: null,[span_32](start_span)[span_32](end_span)
      assignedTo: 'AG-101', pickedUpBy: 'AG-101', cocPendingAmount: 0, cocStatus: null,[span_33](start_span)[span_33](end_span)
      deficitReceivedDate: null, rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null,
      rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
      status: 'Delivered', qrGenerated: true, otpCode: '4829', otpVerified: true,[span_34](start_span)[span_34](end_span)
      pickupPhoto: null, deliveryPhoto: null, returnReason: '',[span_35](start_span)[span_35](end_span)
      createdAt: getUAEISOString().split('T')[0], pickedUpAt: getUAEISOString(), deliveredAt: getUAEISOString()[span_36](start_span)[span_36](end_span)
    }],[span_37](start_span)[span_37](end_span)
    vendorPayments: [],[span_38](start_span)[span_38](end_span)
    vendorSettlementOtps: [],[span_39](start_span)[span_39](end_span)
    agentExpenses: []
  };[span_40](start_span)[span_40](end_span)
};

export const enterWorkspace = () => {
  const currentUser = getCurrentUser();[span_41](start_span)[span_41](end_span)
  if (!currentUser) return;[span_42](start_span)[span_42](end_span)

  document.getElementById('authView').classList.add('hidden');[span_43](start_span)[span_43](end_span)
  document.getElementById('appView').classList.remove('hidden');[span_44](start_span)[span_44](end_span)
  document.getElementById('bottomNav').classList.remove('hidden');[span_45](start_span)[span_45](end_span)
  document.getElementById('bottomNav').classList.add('flex');[span_46](start_span)[span_46](end_span)
  document.getElementById('darkModeBtn').classList.remove('hidden');[span_47](start_span)[span_47](end_span)

  const isA = currentUser.role === 'ADMIN';[span_48](start_span)[span_48](end_span)

  const roleBadge = document.getElementById('roleBadge');[span_49](start_span)[span_49](end_span)
  if (roleBadge) {
    roleBadge.innerHTML = isA
      ? `<span class="text-[var(--accent-gold)] font-extrabold mr-1">ADMIN</span> <span>${currentUser.username}</span>`
      : `<span>${currentUser.name} - ${currentUser.id}</span>`;[span_50](start_span)[span_50](end_span)
  }[span_51](start_span)[span_51](end_span)

  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isA));[span_52](start_span)[span_52](end_span)
  document.querySelectorAll('.agent-only').forEach(el => el.classList.toggle('hidden', isA));[span_53](start_span)[span_53](end_span)

  if (isA) {
    const db = getDB();[span_54](start_span)[span_54](end_span)
    if (db) {
      const agentOptions = `<option value="ALL">All Personnel</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_55](start_span)[span_55](end_span)

      const bulkAgent = document.getElementById('bulkAgent');[span_56](start_span)[span_56](end_span)
      if (bulkAgent) bulkAgent.innerHTML = `<option value="">Agent...</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_57](start_span)[span_57](end_span)

      const filterAgentSlicer = document.getElementById('filterAgentSlicer');[span_58](start_span)[span_58](end_span)
      if (filterAgentSlicer) filterAgentSlicer.innerHTML = `<option value="ALL">All Agents</option><option value="UNASSIGNED">Unassigned</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_59](start_span)[span_59](end_span)

      const adminReportSelect = document.getElementById('adminReportSelect');[span_60](start_span)[span_60](end_span)
      if (adminReportSelect) adminReportSelect.innerHTML = db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_61](start_span)[span_61](end_span)

      const adminCocReportSelect = document.getElementById('adminCocReportSelect');[span_62](start_span)[span_62](end_span)
      if (adminCocReportSelect) adminCocReportSelect.innerHTML = agentOptions;[span_63](start_span)[span_63](end_span)

      const adminDashAgentFilter = document.getElementById('adminDashAgentFilter');[span_64](start_span)[span_64](end_span)
      if (adminDashAgentFilter) adminDashAgentFilter.innerHTML = `<option value="ALL">Overall (All Agents)</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_65](start_span)[span_65](end_span)

      const adminDashFilterWrap = document.getElementById('adminDashFilterWrap');[span_66](start_span)[span_66](end_span)
      if (adminDashFilterWrap) adminDashFilterWrap.classList.remove('hidden');[span_67](start_span)[span_67](end_span)
    }[span_68](start_span)[span_68](end_span)
  }[span_69](start_span)[span_69](end_span)

  switchTab(isA ? 'consignments' : 'dashboard');[span_70](start_span)[span_70](end_span)
  refreshAllViews();[span_71](start_span)[span_71](end_span)
};

export const logout = () => {
  setCurrentUser(null);[span_72](start_span)[span_72](end_span)
  document.getElementById('appView').classList.add('hidden');[span_73](start_span)[span_73](end_span)
  document.getElementById('authView').classList.remove('hidden');[span_74](start_span)[span_74](end_span)
  document.getElementById('bottomNav').classList.add('hidden');[span_75](start_span)[span_75](end_span)
  document.getElementById('darkModeBtn').classList.add('hidden');[span_76](start_span)[span_76](end_span)
};

export const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');[span_77](start_span)[span_77](end_span)
  localStorage.setItem('NEXTWAY_DARK_MODE', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');[span_78](start_span)[span_78](end_span)
};

export const toggleMoreMenu = () => {
  document.getElementById('moreMenuDrawer').classList.toggle('hidden');[span_79](start_span)[span_79](end_span)
};

export const switchTabWrapper = (tName) => {
  document.getElementById('moreMenuDrawer').classList.add('hidden');[span_80](start_span)[span_80](end_span)
  switchTab(tName);[span_81](start_span)[span_81](end_span)

  const moreBtn = document.getElementById('tab-more');[span_82](start_span)[span_82](end_span)
  if (moreBtn) {
    if (!['dashboard', 'consignments', 'confirmations'].includes(tName)) {
      moreBtn.classList.add('tab-active');[span_83](start_span)[span_83](end_span)
      moreBtn.classList.remove('text-[var(--text-muted)]');[span_84](start_span)[span_84](end_span)
    } else {
      moreBtn.classList.remove('tab-active');[span_85](start_span)[span_85](end_span)
      moreBtn.classList.add('text-[var(--text-muted)]');[span_86](start_span)[span_86](end_span)
    }[span_87](start_span)[span_87](end_span)
  }[span_88](start_span)[span_88](end_span)
};

export const switchTab = (tName) => {
  const globalHeader = document.getElementById('globalWorkspaceHeader');[span_89](start_span)[span_89](end_span)
  if (globalHeader) {
    globalHeader.classList.toggle('hidden', tName === 'dashboard');[span_90](start_span)[span_90](end_span)
  }[span_91](start_span)[span_91](end_span)

  ['dashboard', 'consignments', 'confirmations', 'agent-reports', 'agent-finance', 'agent-deficit', 'vendors', 'invoices', 'admin-finance', 'system', 'waybill'].forEach(t => {
    const p = document.getElementById(`panel-${t}`);[span_92](start_span)[span_92](end_span)
    const b = document.getElementById(`tab-${t}`);[span_93](start_span)[span_93](end_span)

    if (p) p.classList.toggle('hidden', t !== tName);[span_94](start_span)[span_94](end_span)
    if (b && b.id !== 'tab-more') {
      b.classList.toggle('tab-active', t === tName);[span_95](start_span)[span_95](end_span)
      b.classList.toggle('text-[var(--text-muted)]', t !== tName);[span_96](start_span)[span_96](end_span)
    }[span_97](start_span)[span_97](end_span)
  });[span_98](start_span)[span_98](end_span)

  if (tName === 'dashboard') { closeDashSubScreen(); renderAgentDashboard(); }[span_99](start_span)[span_99](end_span)
  if (tName === 'agent-finance') generateAgentFinanceReport();[span_100](start_span)[span_100](end_span)
  if (tName === 'admin-finance') generateAdminFinanceTab();[span_101](start_span)[span_101](end_span)
  if (tName === 'agent-deficit' && typeof window.renderAgentDeficit === 'function') window.renderAgentDeficit();[span_102](start_span)[span_102](end_span)

  if (tName === 'invoices') {
    const db = getDB();[span_103](start_span)[span_103](end_span)
    if (db && db.vendors) {
      document.getElementById('invVendorSelect').innerHTML = `<option value="" selected disabled></option>` + db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_104](start_span)[span_104](end_span)
    }[span_105](start_span)[span_105](end_span)
    generateInvoicePreview();[span_106](start_span)[span_106](end_span)
    renderVendorLedger();[span_107](start_span)[span_107](end_span)
  }[span_108](start_span)[span_108](end_span)
};

export const refreshAllViews = () => {
  applySettingsUi();[span_109](start_span)[span_109](end_span)
  renderConsignments();[span_110](start_span)[span_110](end_span)
  renderConfirmations();[span_111](start_span)[span_111](end_span)

  const currentUser = getCurrentUser();[span_112](start_span)[span_112](end_span)
  if (currentUser && currentUser.role === 'ADMIN') {
    renderVendors();[span_113](start_span)[span_113](end_span)
    renderAgents();[span_114](start_span)[span_114](end_span)
    generateAdminFinanceTab();[span_115](start_span)[span_115](end_span)
  }[span_116](start_span)[span_116](end_span)

  renderAgentDashboard();[span_117](start_span)[span_117](end_span)

  const dashListScreen = document.getElementById('dashListScreen');[span_118](start_span)[span_118](end_span)
  if (dashListScreen && !dashListScreen.classList.contains('hidden')) {
    renderDashListItems();[span_119](start_span)[span_119](end_span)
  }[span_120](start_span)[span_120](end_span)

  if (currentUser && currentUser.role === 'AGENT' && typeof window.renderAgentDeficit === 'function') {
    window.renderAgentDeficit();[span_121](start_span)[span_121](end_span)
  }[span_122](start_span)[span_122](end_span)
};

export const updateSyncBadge = (state, label) => {
  const dot = document.getElementById('syncDot');[span_123](start_span)[span_123](end_span)
  if (!dot) return;[span_124](start_span)[span_124](end_span)
  dot.title = label;[span_125](start_span)[span_125](end_span)
  if (state === 'LIVE') { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#10b981] shadow ring-2 ring-[#10b981]/20 animate-pulse'; }[span_126](start_span)[span_126](end_span)
  else if (state === 'SYNCING') { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#c9a24b] shadow ring-2 ring-[#c9a24b]/20 animate-pulse'; }[span_127](start_span)[span_127](end_span)
  else { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow ring-2 ring-[#f43f5e]/20'; }[span_128](start_span)[span_128](end_span)
};

const initPWA = () => {
  let deferredPrompt;[span_129](start_span)[span_129](end_span)
  const installBtn = document.getElementById('installPwaBtn');[span_130](start_span)[span_130](end_span)

  if (installBtn) {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !window.navigator.standalone) {
      installBtn.classList.remove('hidden');[span_131](start_span)[span_131](end_span)
      installBtn.textContent = 'Setup iOS';[span_132](start_span)[span_132](end_span)
      installBtn.onclick = () => alert("To install on iPhone: \n\n1. Tap 'Share' at the bottom of Safari.\n2. Tap 'Add to Home Screen'.");[span_133](start_span)[span_133](end_span)
    }[span_134](start_span)[span_134](end_span)

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();[span_135](start_span)[span_135](end_span)
      deferredPrompt = e;[span_136](start_span)[span_136](end_span)
      installBtn.classList.remove('hidden');[span_137](start_span)[span_137](end_span)
      installBtn.onclick = async () => {
        deferredPrompt.prompt();[span_138](start_span)[span_138](end_span)
        await deferredPrompt.userChoice;[span_139](start_span)[span_139](end_span)
        installBtn.classList.add('hidden');[span_140](start_span)[span_140](end_span)
        deferredPrompt = null;[span_141](start_span)[span_141](end_span)
      };[span_142](start_span)[span_142](end_span)
    });[span_143](start_span)[span_143](end_span)
  }[span_144](start_span)[span_144](end_span)

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration failed:', err);[span_145](start_span)[span_145](end_span)
      });[span_146](start_span)[span_146](end_span)
    });[span_147](start_span)[span_147](end_span)
  }[span_148](start_span)[span_148](end_span)
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const seedDB = await getDefaultSeedDB();
    await initDB(seedDB);[span_149](start_span)[span_149](end_span)[span_150](start_span)[span_150](end_span)
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

    const loginForm = document.querySelector('#authView form');[span_151](start_span)[span_151](end_span)
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);[span_152](start_span)[span_152](end_span)
    }[span_153](start_span)[span_153](end_span)

    const dashListSearch = document.getElementById('dashListSearchInput');[span_154](start_span)[span_154](end_span)
    if (dashListSearch) {
      dashListSearch.addEventListener('input', () => {
        requestAnimationFrame(renderDashListItems);[span_155](start_span)[span_155](end_span)
      });[span_156](start_span)[span_156](end_span)
    }[span_157](start_span)[span_157](end_span)

    const dispatchSearch = document.getElementById('filterSearchText');[span_158](start_span)[span_158](end_span)
    if (dispatchSearch) {
      dispatchSearch.addEventListener('input', debounceRenderConsignments);[span_159](start_span)[span_159](end_span)
    }[span_160](start_span)[span_160](end_span)

    window.closeModal = closeModal;[span_161](start_span)[span_161](end_span)
    window.enterWorkspace = enterWorkspace;[span_162](start_span)[span_162](end_span)
    window.logout = logout;[span_163](start_span)[span_163](end_span)
    window.toggleDarkMode = toggleDarkMode;[span_164](start_span)[span_164](end_span)
    window.switchTab = switchTab;[span_165](start_span)[span_165](end_span)
    window.switchTabWrapper = switchTabWrapper;[span_166](start_span)[span_166](end_span)
    window.toggleMoreMenu = toggleMoreMenu;[span_167](start_span)[span_167](end_span)
    window.refreshAllViews = refreshAllViews;[span_168](start_span)[span_168](end_span)
    window.updateSyncBadge = updateSyncBadge;[span_169](start_span)[span_169](end_span)

    window.setDashMode = setDashMode;[span_170](start_span)[span_170](end_span)
    window.renderAgentDashboard = renderAgentDashboard;[span_171](start_span)[span_171](end_span)
    window.closeDashSubScreen = closeDashSubScreen;[span_172](start_span)[span_172](end_span)
    window.openDashAnalysis = openDashAnalysis;[span_173](start_span)[span_173](end_span)
    window.openDashList = openDashList;[span_174](start_span)[span_174](end_span)
    window.renderDashListItems = renderDashListItems;[span_175](start_span)[span_175](end_span)

    window.renderConsignments = renderConsignments;[span_176](start_span)[span_176](end_span)
    window.debounceRenderConsignments = debounceRenderConsignments;[span_177](start_span)[span_177](end_span)
    window.adminAssignAgent = adminAssignAgent;[span_178](start_span)[span_178](end_span)

    window.generateAdminAgentReport = generateAdminAgentReport;[span_179](start_span)[span_179](end_span)
    window.generateAgentFinanceReport = generateAgentFinanceReport;[span_180](start_span)[span_180](end_span)
    window.updateInvoiceFilterInputs = updateInvoiceFilterInputs;[span_181](start_span)[span_181](end_span)
    window.generateInvoicePreview = generateInvoicePreview;[span_182](start_span)[span_182](end_span)
    window.exportAgentDailyExcel = exportAgentDailyExcel;[span_183](start_span)[span_183](end_span)
    window.sendAgentReportWhatsApp = sendAgentReportWhatsApp;[span_184](start_span)[span_184](end_span)
    window.exportInvoiceExcel = exportInvoiceExcel;[span_185](start_span)[span_185](end_span)
    window.printAdminAgentReport = printAdminAgentReport;[span_186](start_span)[span_186](end_span)
    window.printAgentFinanceReport = printAgentFinanceReport;[span_187](start_span)[span_187](end_span)
    window.printVendorInvoice = printVendorInvoice;[span_188](start_span)[span_188](end_span)
    window.openExpenseModal = openExpenseModal;[span_189](start_span)[span_189](end_span)
    window.saveAgentExpense = saveAgentExpense;[span_190](start_span)[span_190](end_span)
    window.deleteExpense = deleteExpense;[span_191](start_span)[span_191](end_span)
    window.updateExpenseStatus = updateExpenseStatus;[span_192](start_span)[span_192](end_span)

    window.toggleWaybillView = toggleWaybillView;[span_193](start_span)[span_193](end_span)
    window.clearWaybillForm = clearWaybillForm;[span_194](start_span)[span_194](end_span)
    window.generateAndSendWaybill = generateAndSendWaybill;[span_195](start_span)[span_195](end_span)
    window.addQuotationRow = addQuotationRow;[span_196](start_span)[span_196](end_span)
    window.removeQuotationRow = removeQuotationRow;[span_197](start_span)[span_197](end_span)
    window.calcQtRow = calcQtRow;[span_198](start_span)[span_198](end_span)
    window.calcQtGrandTotal = calcQtGrandTotal;[span_199](start_span)[span_199](end_span)
    window.clearQuotationForm = clearQuotationForm;[span_200](start_span)[span_200](end_span)
    window.generateAndSendQuotation = generateAndSendQuotation;[span_201](start_span)[span_201](end_span)
    window.printQuotation = printQuotation;[span_202](start_span)[span_202](end_span)

    window.openNewConsignmentModal = openNewConsignmentModal;[span_203](start_span)[span_203](end_span)
    window.filterVendorSelect = filterVendorSelect;[span_204](start_span)[span_204](end_span)
    window.syncVendorPickupAddress = syncVendorPickupAddress;[span_205](start_span)[span_205](end_span)
    window.saveNewConsignment = saveNewConsignment;[span_206](start_span)[span_206](end_span)
    window.bulkAssign = bulkAssign;[span_207](start_span)[span_207](end_span)
    window.openEditConsignmentModal = openEditConsignmentModal;[span_208](start_span)[span_208](end_span)
    window.syncEditVendorPickupAddress = syncEditVendorPickupAddress;[span_209](start_span)[span_209](end_span)
    window.confirmEditConsignment = confirmEditConsignment;[span_210](start_span)[span_210](end_span)
    window.executeEditConsignment = executeEditConsignment;[span_211](start_span)[span_211](end_span)
    window.deleteConsignmentFromEdit = deleteConsignmentFromEdit;[span_212](start_span)[span_212](end_span)
    window.openAssignRtoModal = openAssignRtoModal;
    window.confirmAssignRto = confirmAssignRto;
    window.submitRtoToOwner = submitRtoToOwner;
    window.inspectConsignmentById = inspectConsignmentById;[span_213](start_span)[span_213](end_span)
    window.showConsignmentDetails = showConsignmentDetails;[span_214](start_span)[span_214](end_span)
    window.openPodScreen = openPodScreen;[span_215](start_span)[span_215](end_span)
    window.handlePodPayMethodChange = handlePodPayMethodChange;[span_216](start_span)[span_216](end_span)
    window.handlePodPhoto = handlePodPhoto;[span_217](start_span)[span_217](end_span)
    window.submitPodDelivered = submitPodDelivered;[span_218](start_span)[span_218](end_span)
    window.executePodDelivered = executePodDelivered;[span_219](start_span)[span_219](end_span)
    window.submitPodReturn = submitPodReturn;[span_220](start_span)[span_220](end_span)
    window.openReturnModal = openReturnModal;[span_221](start_span)[span_221](end_span)
    window.confirmReturn = confirmReturn;[span_222](start_span)[span_222](end_span)
    window.viewPickupPhoto = viewPickupPhoto;[span_223](start_span)[span_223](end_span)
    window.viewDeliveryPhoto = viewDeliveryPhoto;[span_224](start_span)[span_224](end_span)
    window.agentMarkCocCollected = agentMarkCocCollected;[span_225](start_span)[span_225](end_span)
    window.markDeficitReceived = markDeficitReceived;[span_226](start_span)[span_226](end_span)
    window.adminConfirmPendingCoc = adminConfirmPendingCoc;[span_227](start_span)[span_227](end_span)
    window.sendWhatsAppStatus = sendWhatsAppStatus;[span_228](start_span)[span_228](end_span)
    window.handleModalPhoto = handleModalPhoto;[span_229](start_span)[span_229](end_span)

    window.saveSupabaseConfigFromTab = saveSupabaseConfigFromTab;[span_230](start_span)[span_230](end_span)
    window.clearSupabaseConfig = clearSupabaseConfig;[span_231](start_span)[span_231](end_span)
    window.toggleCloudSyncVisibility = toggleCloudSyncVisibility;[span_232](start_span)[span_232](end_span)
    window.applySettingsUi = applySettingsUi;[span_233](start_span)[span_233](end_span)
    window.archiveOldDeliveries = archiveOldDeliveries;[span_234](start_span)[span_234](end_span)
    window.purgeOldPhotos60Days = purgeOldPhotos60Days;[span_235](start_span)[span_235](end_span)
    window.clearAllConsignments = clearAllConsignments;[span_236](start_span)[span_236](end_span)
    window.downloadBackup = downloadBackup;[span_237](start_span)[span_237](end_span)
    window.restoreBackup = restoreBackup;[span_238](start_span)[span_238](end_span)
    window.downloadImportTemplate = downloadImportTemplate;[span_239](start_span)[span_239](end_span)
    window.importConsignmentsFromExcel = importConsignmentsFromExcel;[span_240](start_span)[span_240](end_span)
    window.toggleAutoAdjust = toggleAutoAdjust;[span_241](start_span)[span_241](end_span)
    window.openVendorModal = openVendorModal;[span_242](start_span)[span_242](end_span)
    window.openEditVendorModal = openEditVendorModal;[span_243](start_span)[span_243](end_span)
    window.saveVendor = saveVendor;[span_244](start_span)[span_244](end_span)
    window.deleteVendor = deleteVendor;[span_245](start_span)[span_245](end_span)
    window.renderVendors = renderVendors;[span_246](start_span)[span_246](end_span)
    window.openVendorPaymentModal = openVendorPaymentModal;[span_247](start_span)[span_247](end_span)
    window.saveVendorLedgerEntry = saveVendorLedgerEntry;[span_248](start_span)[span_248](end_span)
    window.renderVendorLedger = renderVendorLedger;[span_249](start_span)[span_249](end_span)
    window.deleteLedger = deleteLedger;[span_250](start_span)[span_250](end_span)
    window.openVendorSettlementOtpModal = openVendorSettlementOtpModal;[span_251](start_span)[span_251](end_span)
    window.sendSettlementOtp = sendSettlementOtp;[span_252](start_span)[span_252](end_span)
    window.verifySettlementOtp = verifySettlementOtp;[span_253](start_span)[span_253](end_span)
    window.cancelSettlementOtp = cancelSettlementOtp;[span_254](start_span)[span_254](end_span)
    window.adminConfirmRto = adminConfirmRto;
    window.openAgentModal = openAgentModal;[span_255](start_span)[span_255](end_span)
    window.saveAgent = saveAgent;[span_256](start_span)[span_256](end_span)
    window.renderAgents = renderAgents;[span_257](start_span)[span_257](end_span)
    window.setAgentStatus = setAgentStatus;[span_258](start_span)[span_258](end_span)
    window.adminDeleteAgent = adminDeleteAgent;[span_259](start_span)[span_259](end_span)
    window.adminResetAgentPassword = adminResetAgentPassword;[span_260](start_span)[span_260](end_span)
    window.openCredentialsModal = openCredentialsModal;[span_261](start_span)[span_261](end_span)
    window.changeOwnPassword = changeOwnPassword;[span_262](start_span)[span_262](end_span)
    window.renderConfirmations = renderConfirmations;[span_263](start_span)[span_263](end_span)
    window.generateAdminFinanceTab = generateAdminFinanceTab;[span_264](start_span)[span_264](end_span)

    initPWA();[span_265](start_span)[span_265](end_span)

    if (getCurrentUser()) {
      enterWorkspace();[span_266](start_span)[span_266](end_span)
    }[span_267](start_span)[span_267](end_span)

    console.log("NextWay Delivery Modular App initialized successfully!");[span_268](start_span)[span_268](end_span)
  } catch (error) {
    console.error("Failed to initialize app:", error);[span_269](start_span)[span_269](end_span)
  }
});
