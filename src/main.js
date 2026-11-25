// /src/main.js
import { initDB, getCurrentUser, setCurrentUser, getDB, setStatusCallback } from './services/store.js';[span_1522](start_span)[span_1522](end_span)[span_1523](start_span)[span_1523](end_span)
import { initSupabase, getUAEISOString } from './services/sync.js';[span_1524](start_span)[span_1524](end_span)
import { hashPassword } from './services/auth.js';[span_1525](start_span)[span_1525](end_span)
import { handleLoginSubmit } from './views/loginViews.js';[span_1526](start_span)[span_1526](end_span)[span_1527](start_span)[span_1527](end_span)

import {[span_1528](start_span)[span_1528](end_span)
  setDashMode, renderAgentDashboard, closeDashSubScreen,[span_1529](start_span)[span_1529](end_span)
  openDashAnalysis, openDashList, renderDashListItems[span_1530](start_span)[span_1530](end_span)
} from './views/dashboard.js';[span_1531](start_span)[span_1531](end_span)[span_1532](start_span)[span_1532](end_span)

import {[span_1533](start_span)[span_1533](end_span)
  renderConsignments, debounceRenderConsignments, adminAssignAgent[span_1534](start_span)[span_1534](end_span)
} from './views/dispatch.js';[span_1535](start_span)[span_1535](end_span)[span_1536](start_span)[span_1536](end_span)

import {[span_1537](start_span)[span_1537](end_span)
  generateAdminAgentReport, generateAgentFinanceReport, updateInvoiceFilterInputs,[span_1538](start_span)[span_1538](end_span)
  generateInvoicePreview, exportAgentDailyExcel, sendAgentReportWhatsApp,[span_1539](start_span)[span_1539](end_span)
  exportInvoiceExcel, printAdminAgentReport, printAgentFinanceReport, printVendorInvoice,[span_1540](start_span)[span_1540](end_span)
  openExpenseModal, saveAgentExpense, deleteExpense, updateExpenseStatus[span_1541](start_span)[span_1541](end_span)
} from './views/finance.js';[span_1542](start_span)[span_1542](end_span)[span_1543](start_span)[span_1543](end_span)

import {[span_1544](start_span)[span_1544](end_span)
  toggleWaybillView, clearWaybillForm, generateAndSendWaybill,[span_1545](start_span)[span_1545](end_span)
  addQuotationRow, removeQuotationRow, calcQtRow, calcQtGrandTotal,[span_1546](start_span)[span_1546](end_span)
  clearQuotationForm, generateAndSendQuotation, printQuotation[span_1547](start_span)[span_1547](end_span)
} from './views/documents.js';[span_1548](start_span)[span_1548](end_span)[span_1549](start_span)[span_1549](end_span)

import {[span_1550](start_span)[span_1550](end_span)
  openNewConsignmentModal, filterVendorSelect, syncVendorPickupAddress, saveNewConsignment,[span_1551](start_span)[span_1551](end_span)
  bulkAssign, openEditConsignmentModal, syncEditVendorPickupAddress, confirmEditConsignment,[span_1552](start_span)[span_1552](end_span)
  executeEditConsignment, deleteConsignmentFromEdit, openAssignRtoModal, confirmAssignRto,
  submitRtoToOwner, inspectConsignmentById, showConsignmentDetails, openPodScreen,
  handlePodPayMethodChange, handlePodPhoto, submitPodDelivered, executePodDelivered,
  submitPodReturn, openReturnModal, confirmReturn, viewPickupPhoto, viewDeliveryPhoto,
  agentMarkCocCollected, markDeficitReceived, adminConfirmPendingCoc, sendWhatsAppStatus,
  handleModalPhoto[span_1553](start_span)[span_1553](end_span)
} from './views/consignment.js';[span_1554](start_span)[span_1554](end_span)[span_1555](start_span)[span_1555](end_span)

import {[span_1556](start_span)[span_1556](end_span)
  saveSupabaseConfigFromTab, clearSupabaseConfig, toggleCloudSyncVisibility, applySettingsUi,[span_1557](start_span)[span_1557](end_span)
  archiveOldDeliveries, purgeOldPhotos60Days, clearAllConsignments, downloadBackup, restoreBackup,[span_1558](start_span)[span_1558](end_span)
  downloadImportTemplate, importConsignmentsFromExcel, toggleAutoAdjust, openVendorModal,[span_1559](start_span)[span_1559](end_span)
  openEditVendorModal, saveVendor, deleteVendor, renderVendors, openVendorPaymentModal,[span_1560](start_span)[span_1560](end_span)
  saveVendorLedgerEntry, renderVendorLedger, deleteLedger, openVendorSettlementOtpModal,[span_1561](start_span)[span_1561](end_span)
  sendSettlementOtp, verifySettlementOtp, cancelSettlementOtp, adminConfirmRto, openAgentModal,
  saveAgent, renderAgents, setAgentStatus, adminDeleteAgent, adminResetAgentPassword,
  openCredentialsModal, changeOwnPassword, renderConfirmations, generateAdminFinanceTab[span_1562](start_span)[span_1562](end_span)
} from './views/admin.js';[span_1563](start_span)[span_1563](end_span)[span_1564](start_span)[span_1564](end_span)

const getDefaultSeedDB = async () => {
  const adminHash = await hashPassword('admin123');[span_1565](start_span)[span_1565](end_span)[span_1566](start_span)[span_1566](end_span)
  const agentHash = await hashPassword('agent123');[span_1567](start_span)[span_1567](end_span)[span_1568](start_span)[span_1568](end_span)
  return {[span_1569](start_span)[span_1569](end_span)
    settings: { companyName: 'NEXT WAY DELIVERY', otpMandatory: true, showCloudSyncConfig: true, invoiceCounter: 1001 },[span_1570](start_span)[span_1570](end_span)
    users: [[span_1571](start_span)[span_1571](end_span)
      { id: 'USR-ADMIN', username: 'NEXTWAY', name: 'System Administrator', role: 'ADMIN', phone: '+917012133095', passwordHash: adminHash, status: 'ACTIVE' },[span_1572](start_span)[span_1572](end_span)
      { id: 'AG-101', username: 'agent1', name: 'Ramesh Kumar', role: 'AGENT', phone: '+971501112233', passwordHash: agentHash, status: 'ACTIVE' }[span_1573](start_span)[span_1573](end_span)
    ],[span_1574](start_span)[span_1574](end_span)
    vendors: [{ code: 'VND-001', name: 'Gulf Horizon Trading LLC', phone: '+971500001111', address: 'Dubai', trn: '105508889000003' }],[span_1575](start_span)[span_1575](end_span)
    consignments: [{[span_1576](start_span)[span_1576](end_span)
      id: '10001', vendorCode: 'VND-001', pickupFrom: 'Dubai', customerName: 'Omar',[span_1577](start_span)[span_1577](end_span)
      customerPhone: '+971529876543', deliveryAddress: 'Villa 12', productAmount: 350,[span_1578](start_span)[span_1578](end_span)
      deliveryCharge: 25, feeType: 'COD', weight: 1.5, pieces: 1, pendingModification: null,[span_1579](start_span)[span_1579](end_span)
      assignedTo: 'AG-101', pickedUpBy: 'AG-101', cocPendingAmount: 0, cocStatus: null,[span_1580](start_span)[span_1580](end_span)
      deficitReceivedDate: null, rtoStatus: null, rtoAssignedTo: null, rtoPickupBy: null,
      rtoAssignedAt: null, rtoSubmittedAt: null, rtoConfirmedAt: null,
      status: 'Delivered', qrGenerated: true, otpCode: '4829', otpVerified: true,[span_1581](start_span)[span_1581](end_span)
      pickupPhoto: null, deliveryPhoto: null, returnReason: '',[span_1582](start_span)[span_1582](end_span)
      createdAt: getUAEISOString().split('T')[0], pickedUpAt: getUAEISOString(), deliveredAt: getUAEISOString()[span_1583](start_span)[span_1583](end_span)
    }],[span_1584](start_span)[span_1584](end_span)
    vendorPayments: [],[span_1585](start_span)[span_1585](end_span)
    vendorSettlementOtps: [],[span_1586](start_span)[span_1586](end_span)
    agentExpenses: []
  };[span_1587](start_span)[span_1587](end_span)
};

export const enterWorkspace = () => {[span_1588](start_span)[span_1588](end_span)
  const currentUser = getCurrentUser();[span_1589](start_span)[span_1589](end_span)
  if (!currentUser) return;[span_1590](start_span)[span_1590](end_span)

  document.getElementById('authView').classList.add('hidden');[span_1591](start_span)[span_1591](end_span)
  document.getElementById('appView').classList.remove('hidden');[span_1592](start_span)[span_1592](end_span)
  document.getElementById('bottomNav').classList.remove('hidden');[span_1593](start_span)[span_1593](end_span)
  document.getElementById('bottomNav').classList.add('flex');[span_1594](start_span)[span_1594](end_span)
  document.getElementById('darkModeBtn').classList.remove('hidden');[span_1595](start_span)[span_1595](end_span)

  const isA = currentUser.role === 'ADMIN';[span_1596](start_span)[span_1596](end_span)

  const roleBadge = document.getElementById('roleBadge');[span_1597](start_span)[span_1597](end_span)
  if (roleBadge) {[span_1598](start_span)[span_1598](end_span)
    roleBadge.innerHTML = isA[span_1599](start_span)[span_1599](end_span)
      ? `<span class="text-[var(--accent-gold)] font-extrabold mr-1">ADMIN</span> <span>${currentUser.username}</span>`[span_1600](start_span)[span_1600](end_span)
      : `<span>${currentUser.name} - ${currentUser.id}</span>`;[span_1601](start_span)[span_1601](end_span)
  }[span_1602](start_span)[span_1602](end_span)

  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isA));[span_1603](start_span)[span_1603](end_span)
  document.querySelectorAll('.agent-only').forEach(el => el.classList.toggle('hidden', isA));[span_1604](start_span)[span_1604](end_span)

  if (isA) {[span_1605](start_span)[span_1605](end_span)
    const db = getDB();[span_1606](start_span)[span_1606](end_span)
    if (db) {[span_1607](start_span)[span_1607](end_span)
      const agentOptions = `<option value="ALL">All Personnel</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_1608](start_span)[span_1608](end_span)

      const bulkAgent = document.getElementById('bulkAgent');[span_1609](start_span)[span_1609](end_span)
      if (bulkAgent) bulkAgent.innerHTML = `<option value="">Agent...</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_1610](start_span)[span_1610](end_span)

      const filterAgentSlicer = document.getElementById('filterAgentSlicer');[span_1611](start_span)[span_1611](end_span)
      if (filterAgentSlicer) filterAgentSlicer.innerHTML = `<option value="ALL">All Agents</option><option value="UNASSIGNED">Unassigned</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_1612](start_span)[span_1612](end_span)

      const adminReportSelect = document.getElementById('adminReportSelect');[span_1613](start_span)[span_1613](end_span)
      if (adminReportSelect) adminReportSelect.innerHTML = db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_1614](start_span)[span_1614](end_span)

      const adminCocReportSelect = document.getElementById('adminCocReportSelect');[span_1615](start_span)[span_1615](end_span)
      if (adminCocReportSelect) adminCocReportSelect.innerHTML = agentOptions;[span_1616](start_span)[span_1616](end_span)

      const adminDashAgentFilter = document.getElementById('adminDashAgentFilter');[span_1617](start_span)[span_1617](end_span)
      if (adminDashAgentFilter) adminDashAgentFilter.innerHTML = `<option value="ALL">Overall (All Agents)</option>` + db.users.filter(u => u.role === 'AGENT').map(a => `<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');[span_1618](start_span)[span_1618](end_span)

      const adminDashFilterWrap = document.getElementById('adminDashFilterWrap');[span_1619](start_span)[span_1619](end_span)
      if (adminDashFilterWrap) adminDashFilterWrap.classList.remove('hidden');[span_1620](start_span)[span_1620](end_span)
    }[span_1621](start_span)[span_1621](end_span)
  }[span_1622](start_span)[span_1622](end_span)

  switchTab(isA ? 'consignments' : 'dashboard');[span_1623](start_span)[span_1623](end_span)
  refreshAllViews();[span_1624](start_span)[span_1624](end_span)
};[span_1625](start_span)[span_1625](end_span)

export const logout = () => {[span_1626](start_span)[span_1626](end_span)
  setCurrentUser(null);[span_1627](start_span)[span_1627](end_span)
  document.getElementById('appView').classList.add('hidden');[span_1628](start_span)[span_1628](end_span)
  document.getElementById('authView').classList.remove('hidden');[span_1629](start_span)[span_1629](end_span)
  document.getElementById('bottomNav').classList.add('hidden');[span_1630](start_span)[span_1630](end_span)
  document.getElementById('darkModeBtn').classList.add('hidden');[span_1631](start_span)[span_1631](end_span)
};[span_1632](start_span)[span_1632](end_span)

export const toggleDarkMode = () => {[span_1633](start_span)[span_1633](end_span)
  document.body.classList.toggle('dark-mode');[span_1634](start_span)[span_1634](end_span)
  localStorage.setItem('NEXTWAY_DARK_MODE', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');[span_1635](start_span)[span_1635](end_span)
};[span_1636](start_span)[span_1636](end_span)

export const toggleMoreMenu = () => {[span_1637](start_span)[span_1637](end_span)
  document.getElementById('moreMenuDrawer').classList.toggle('hidden');[span_1638](start_span)[span_1638](end_span)
};[span_1639](start_span)[span_1639](end_span)

export const switchTabWrapper = (tName) => {[span_1640](start_span)[span_1640](end_span)
  document.getElementById('moreMenuDrawer').classList.add('hidden');[span_1641](start_span)[span_1641](end_span)
  switchTab(tName);[span_1642](start_span)[span_1642](end_span)

  const moreBtn = document.getElementById('tab-more');[span_1643](start_span)[span_1643](end_span)
  if (moreBtn) {[span_1644](start_span)[span_1644](end_span)
    if (!['dashboard', 'consignments', 'confirmations'].includes(tName)) {[span_1645](start_span)[span_1645](end_span)
      moreBtn.classList.add('tab-active');[span_1646](start_span)[span_1646](end_span)
      moreBtn.classList.remove('text-[var(--text-muted)]');[span_1647](start_span)[span_1647](end_span)
    } else {[span_1648](start_span)[span_1648](end_span)
      moreBtn.classList.remove('tab-active');[span_1649](start_span)[span_1649](end_span)
      moreBtn.classList.add('text-[var(--text-muted)]');[span_1650](start_span)[span_1650](end_span)
    }[span_1651](start_span)[span_1651](end_span)
  }[span_1652](start_span)[span_1652](end_span)
};[span_1653](start_span)[span_1653](end_span)

export const switchTab = (tName) => {[span_1654](start_span)[span_1654](end_span)
  const globalHeader = document.getElementById('globalWorkspaceHeader');[span_1655](start_span)[span_1655](end_span)
  if (globalHeader) {[span_1656](start_span)[span_1656](end_span)
    globalHeader.classList.toggle('hidden', tName === 'dashboard');[span_1657](start_span)[span_1657](end_span)
  }[span_1658](start_span)[span_1658](end_span)

  ['dashboard', 'consignments', 'confirmations', 'agent-reports', 'agent-finance', 'agent-deficit', 'vendors', 'invoices', 'admin-finance', 'system', 'waybill'].forEach(t => {[span_1659](start_span)[span_1659](end_span)
    const p = document.getElementById(`panel-${t}`);[span_1660](start_span)[span_1660](end_span)
    const b = document.getElementById(`tab-${t}`);[span_1661](start_span)[span_1661](end_span)

    if (p) p.classList.toggle('hidden', t !== tName);[span_1662](start_span)[span_1662](end_span)
    if (b && b.id !== 'tab-more') {[span_1663](start_span)[span_1663](end_span)
      b.classList.toggle('tab-active', t === tName);[span_1664](start_span)[span_1664](end_span)
      b.classList.toggle('text-[var(--text-muted)]', t !== tName);[span_1665](start_span)[span_1665](end_span)
    }[span_1666](start_span)[span_1666](end_span)
  });[span_1667](start_span)[span_1667](end_span)

  if (tName === 'dashboard') { closeDashSubScreen(); renderAgentDashboard(); }[span_1668](start_span)[span_1668](end_span)
  if (tName === 'agent-finance') generateAgentFinanceReport();[span_1669](start_span)[span_1669](end_span)
  if (tName === 'admin-finance') generateAdminFinanceTab();[span_1670](start_span)[span_1670](end_span)
  if (tName === 'agent-deficit' && typeof window.renderAgentDeficit === 'function') window.renderAgentDeficit();[span_1671](start_span)[span_1671](end_span)

  if (tName === 'invoices') {[span_1672](start_span)[span_1672](end_span)
    const db = getDB();[span_1673](start_span)[span_1673](end_span)
    if (db && db.vendors) {[span_1674](start_span)[span_1674](end_span)
      document.getElementById('invVendorSelect').innerHTML = `<option value="" selected disabled></option>` + db.vendors.map(v => `<option value="${v.code}">${v.name}</option>`).join('');[span_1675](start_span)[span_1675](end_span)
    }[span_1676](start_span)[span_1676](end_span)
    generateInvoicePreview();[span_1677](start_span)[span_1677](end_span)
    renderVendorLedger();[span_1678](start_span)[span_1678](end_span)
  }[span_1679](start_span)[span_1679](end_span)
};[span_1680](start_span)[span_1680](end_span)

export const refreshAllViews = () => {[span_1681](start_span)[span_1681](end_span)
  applySettingsUi();[span_1682](start_span)[span_1682](end_span)
  renderConsignments();[span_1683](start_span)[span_1683](end_span)
  renderConfirmations();[span_1684](start_span)[span_1684](end_span)

  const currentUser = getCurrentUser();[span_1685](start_span)[span_1685](end_span)
  if (currentUser && currentUser.role === 'ADMIN') {[span_1686](start_span)[span_1686](end_span)
    renderVendors();[span_1687](start_span)[span_1687](end_span)
    renderAgents();[span_1688](start_span)[span_1688](end_span)
    generateAdminFinanceTab();[span_1689](start_span)[span_1689](end_span)
  }[span_1690](start_span)[span_1690](end_span)

  renderAgentDashboard();[span_1691](start_span)[span_1691](end_span)

  const dashListScreen = document.getElementById('dashListScreen');[span_1692](start_span)[span_1692](end_span)
  if (dashListScreen && !dashListScreen.classList.contains('hidden')) {[span_1693](start_span)[span_1693](end_span)
    renderDashListItems();[span_1694](start_span)[span_1694](end_span)
  }[span_1695](start_span)[span_1695](end_span)

  if (currentUser && currentUser.role === 'AGENT' && typeof window.renderAgentDeficit === 'function') {[span_1696](start_span)[span_1696](end_span)
    window.renderAgentDeficit();[span_1697](start_span)[span_1697](end_span)
  }[span_1698](start_span)[span_1698](end_span)
};[span_1699](start_span)[span_1699](end_span)

export const updateSyncBadge = (state, label) => {[span_1700](start_span)[span_1700](end_span)
  const dot = document.getElementById('syncDot');[span_1701](start_span)[span_1701](end_span)
  if (!dot) return;[span_1702](start_span)[span_1702](end_span)
  dot.title = label;[span_1703](start_span)[span_1703](end_span)
  if (state === 'LIVE') { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#10b981] shadow ring-2 ring-[#10b981]/20 animate-pulse'; }[span_1704](start_span)[span_1704](end_span)
  else if (state === 'SYNCING') { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#c9a24b] shadow ring-2 ring-[#c9a24b]/20 animate-pulse'; }[span_1705](start_span)[span_1705](end_span)
  else { dot.className = 'w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow ring-2 ring-[#f43f5e]/20'; }[span_1706](start_span)[span_1706](end_span)
};[span_1707](start_span)[span_1707](end_span)

const initPWA = () => {[span_1708](start_span)[span_1708](end_span)
  let deferredPrompt;[span_1709](start_span)[span_1709](end_span)
  const installBtn = document.getElementById('installPwaBtn');[span_1710](start_span)[span_1710](end_span)

  if (installBtn) {[span_1711](start_span)[span_1711](end_span)
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !window.navigator.standalone) {[span_1712](start_span)[span_1712](end_span)
      installBtn.classList.remove('hidden');[span_1713](start_span)[span_1713](end_span)
      installBtn.textContent = 'Setup iOS';[span_1714](start_span)[span_1714](end_span)
      installBtn.onclick = () => alert("To install on iPhone: \n\n1. Tap 'Share' at the bottom of Safari.\n2. Tap 'Add to Home Screen'.");[span_1715](start_span)[span_1715](end_span)
    }[span_1716](start_span)[span_1716](end_span)

    window.addEventListener('beforeinstallprompt', (e) => {[span_1717](start_span)[span_1717](end_span)
      e.preventDefault();[span_1718](start_span)[span_1718](end_span)
      deferredPrompt = e;[span_1719](start_span)[span_1719](end_span)
      installBtn.classList.remove('hidden');[span_1720](start_span)[span_1720](end_span)
      installBtn.onclick = async () => {[span_1721](start_span)[span_1721](end_span)
        deferredPrompt.prompt();[span_1722](start_span)[span_1722](end_span)
        await deferredPrompt.userChoice;[span_1723](start_span)[span_1723](end_span)
        installBtn.classList.add('hidden');[span_1724](start_span)[span_1724](end_span)
        deferredPrompt = null;[span_1725](start_span)[span_1725](end_span)
      };[span_1726](start_span)[span_1726](end_span)
    });[span_1727](start_span)[span_1727](end_span)
  }[span_1728](start_span)[span_1728](end_span)

  if ('serviceWorker' in navigator) {[span_1729](start_span)[span_1729](end_span)
    window.addEventListener('load', () => {[span_1730](start_span)[span_1730](end_span)
      navigator.serviceWorker.register('/sw.js').catch((err) => {[span_1731](start_span)[span_1731](end_span)
        console.warn('Service Worker registration failed:', err);[span_1732](start_span)[span_1732](end_span)
      });[span_1733](start_span)[span_1733](end_span)
    });[span_1734](start_span)[span_1734](end_span)
  }[span_1735](start_span)[span_1735](end_span)
};[span_1736](start_span)[span_1736](end_span)

document.addEventListener('DOMContentLoaded', async () => {[span_1737](start_span)[span_1737](end_span)
  try {[span_1738](start_span)[span_1738](end_span)
    const seedDB = await getDefaultSeedDB();
    await initDB(seedDB);[span_1739](start_span)[span_1739](end_span)[span_1740](start_span)[span_1740](end_span)
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

    const loginForm = document.querySelector('#authView form');[span_1741](start_span)[span_1741](end_span)
    if (loginForm) {[span_1742](start_span)[span_1742](end_span)
      loginForm.addEventListener('submit', handleLoginSubmit);[span_1743](start_span)[span_1743](end_span)
    }[span_1744](start_span)[span_1744](end_span)

    const dashListSearch = document.getElementById('dashListSearchInput');[span_1745](start_span)[span_1745](end_span)
    if (dashListSearch) {[span_1746](start_span)[span_1746](end_span)
      dashListSearch.addEventListener('input', () => {[span_1747](start_span)[span_1747](end_span)
        requestAnimationFrame(renderDashListItems);[span_1748](start_span)[span_1748](end_span)
      });[span_1749](start_span)[span_1749](end_span)
    }[span_1750](start_span)[span_1750](end_span)

    const dispatchSearch = document.getElementById('filterSearchText');[span_1751](start_span)[span_1751](end_span)
    if (dispatchSearch) {[span_1752](start_span)[span_1752](end_span)
      dispatchSearch.addEventListener('input', debounceRenderConsignments);[span_1753](start_span)[span_1753](end_span)
    }[span_1754](start_span)[span_1754](end_span)

    window.enterWorkspace = enterWorkspace;[span_1755](start_span)[span_1755](end_span)
    window.logout = logout;[span_1756](start_span)[span_1756](end_span)
    window.toggleDarkMode = toggleDarkMode;[span_1757](start_span)[span_1757](end_span)
    window.switchTab = switchTab;[span_1758](start_span)[span_1758](end_span)
    window.switchTabWrapper = switchTabWrapper;[span_1759](start_span)[span_1759](end_span)
    window.toggleMoreMenu = toggleMoreMenu;[span_1760](start_span)[span_1760](end_span)
    window.refreshAllViews = refreshAllViews;[span_1761](start_span)[span_1761](end_span)
    window.updateSyncBadge = updateSyncBadge;[span_1762](start_span)[span_1762](end_span)

    window.setDashMode = setDashMode;[span_1763](start_span)[span_1763](end_span)
    window.renderAgentDashboard = renderAgentDashboard;[span_1764](start_span)[span_1764](end_span)
    window.closeDashSubScreen = closeDashSubScreen;[span_1765](start_span)[span_1765](end_span)
    window.openDashAnalysis = openDashAnalysis;[span_1766](start_span)[span_1766](end_span)
    window.openDashList = openDashList;[span_1767](start_span)[span_1767](end_span)
    window.renderDashListItems = renderDashListItems;[span_1768](start_span)[span_1768](end_span)

    window.renderConsignments = renderConsignments;[span_1769](start_span)[span_1769](end_span)
    window.debounceRenderConsignments = debounceRenderConsignments;[span_1770](start_span)[span_1770](end_span)
    window.adminAssignAgent = adminAssignAgent;[span_1771](start_span)[span_1771](end_span)

    window.generateAdminAgentReport = generateAdminAgentReport;[span_1772](start_span)[span_1772](end_span)
    window.generateAgentFinanceReport = generateAgentFinanceReport;[span_1773](start_span)[span_1773](end_span)
    window.updateInvoiceFilterInputs = updateInvoiceFilterInputs;[span_1774](start_span)[span_1774](end_span)
    window.generateInvoicePreview = generateInvoicePreview;[span_1775](start_span)[span_1775](end_span)
    window.exportAgentDailyExcel = exportAgentDailyExcel;[span_1776](start_span)[span_1776](end_span)
    window.sendAgentReportWhatsApp = sendAgentReportWhatsApp;[span_1777](start_span)[span_1777](end_span)
    window.exportInvoiceExcel = exportInvoiceExcel;[span_1778](start_span)[span_1778](end_span)
    window.printAdminAgentReport = printAdminAgentReport;[span_1779](start_span)[span_1779](end_span)
    window.printAgentFinanceReport = printAgentFinanceReport;[span_1780](start_span)[span_1780](end_span)
    window.printVendorInvoice = printVendorInvoice;[span_1781](start_span)[span_1781](end_span)
    window.openExpenseModal = openExpenseModal;[span_1782](start_span)[span_1782](end_span)
    window.saveAgentExpense = saveAgentExpense;[span_1783](start_span)[span_1783](end_span)
    window.deleteExpense = deleteExpense;[span_1784](start_span)[span_1784](end_span)
    window.updateExpenseStatus = updateExpenseStatus;[span_1785](start_span)[span_1785](end_span)

    window.toggleWaybillView = toggleWaybillView;[span_1786](start_span)[span_1786](end_span)
    window.clearWaybillForm = clearWaybillForm;[span_1787](start_span)[span_1787](end_span)
    window.generateAndSendWaybill = generateAndSendWaybill;[span_1788](start_span)[span_1788](end_span)
    window.addQuotationRow = addQuotationRow;[span_1789](start_span)[span_1789](end_span)
    window.removeQuotationRow = removeQuotationRow;[span_1790](start_span)[span_1790](end_span)
    window.calcQtRow = calcQtRow;[span_1791](start_span)[span_1791](end_span)
    window.calcQtGrandTotal = calcQtGrandTotal;[span_1792](start_span)[span_1792](end_span)
    window.clearQuotationForm = clearQuotationForm;[span_1793](start_span)[span_1793](end_span)
    window.generateAndSendQuotation = generateAndSendQuotation;[span_1794](start_span)[span_1794](end_span)
    window.printQuotation = printQuotation;[span_1795](start_span)[span_1795](end_span)

    window.openNewConsignmentModal = openNewConsignmentModal;[span_1796](start_span)[span_1796](end_span)
    window.filterVendorSelect = filterVendorSelect;[span_1797](start_span)[span_1797](end_span)
    window.syncVendorPickupAddress = syncVendorPickupAddress;[span_1798](start_span)[span_1798](end_span)
    window.saveNewConsignment = saveNewConsignment;[span_1799](start_span)[span_1799](end_span)
    window.bulkAssign = bulkAssign;[span_1800](start_span)[span_1800](end_span)
    window.openEditConsignmentModal = openEditConsignmentModal;[span_1801](start_span)[span_1801](end_span)
    window.syncEditVendorPickupAddress = syncEditVendorPickupAddress;[span_1802](start_span)[span_1802](end_span)
    window.confirmEditConsignment = confirmEditConsignment;[span_1803](start_span)[span_1803](end_span)
    window.executeEditConsignment = executeEditConsignment;[span_1804](start_span)[span_1804](end_span)
    window.deleteConsignmentFromEdit = deleteConsignmentFromEdit;[span_1805](start_span)[span_1805](end_span)
    window.openAssignRtoModal = openAssignRtoModal;
    window.confirmAssignRto = confirmAssignRto;
    window.submitRtoToOwner = submitRtoToOwner;
    window.inspectConsignmentById = inspectConsignmentById;[span_1806](start_span)[span_1806](end_span)
    window.showConsignmentDetails = showConsignmentDetails;[span_1807](start_span)[span_1807](end_span)
    window.openPodScreen = openPodScreen;[span_1808](start_span)[span_1808](end_span)
    window.handlePodPayMethodChange = handlePodPayMethodChange;[span_1809](start_span)[span_1809](end_span)
    window.handlePodPhoto = handlePodPhoto;[span_1810](start_span)[span_1810](end_span)
    window.submitPodDelivered = submitPodDelivered;[span_1811](start_span)[span_1811](end_span)
    window.executePodDelivered = executePodDelivered;[span_1812](start_span)[span_1812](end_span)
    window.submitPodReturn = submitPodReturn;[span_1813](start_span)[span_1813](end_span)
    window.openReturnModal = openReturnModal;[span_1814](start_span)[span_1814](end_span)
    window.confirmReturn = confirmReturn;[span_1815](start_span)[span_1815](end_span)
    window.viewPickupPhoto = viewPickupPhoto;[span_1816](start_span)[span_1816](end_span)
    window.viewDeliveryPhoto = viewDeliveryPhoto;[span_1817](start_span)[span_1817](end_span)
    window.agentMarkCocCollected = agentMarkCocCollected;[span_1818](start_span)[span_1818](end_span)
    window.markDeficitReceived = markDeficitReceived;[span_1819](start_span)[span_1819](end_span)
    window.adminConfirmPendingCoc = adminConfirmPendingCoc;[span_1820](start_span)[span_1820](end_span)
    window.sendWhatsAppStatus = sendWhatsAppStatus;[span_1821](start_span)[span_1821](end_span)
    window.handleModalPhoto = handleModalPhoto;[span_1822](start_span)[span_1822](end_span)

    window.saveSupabaseConfigFromTab = saveSupabaseConfigFromTab;[span_1823](start_span)[span_1823](end_span)
    window.clearSupabaseConfig = clearSupabaseConfig;[span_1824](start_span)[span_1824](end_span)
    window.toggleCloudSyncVisibility = toggleCloudSyncVisibility;[span_1825](start_span)[span_1825](end_span)
    window.applySettingsUi = applySettingsUi;[span_1826](start_span)[span_1826](end_span)
    window.archiveOldDeliveries = archiveOldDeliveries;[span_1827](start_span)[span_1827](end_span)
    window.purgeOldPhotos60Days = purgeOldPhotos60Days;[span_1828](start_span)[span_1828](end_span)
    window.clearAllConsignments = clearAllConsignments;[span_1829](start_span)[span_1829](end_span)
    window.downloadBackup = downloadBackup;[span_1830](start_span)[span_1830](end_span)
    window.restoreBackup = restoreBackup;[span_1831](start_span)[span_1831](end_span)
    window.downloadImportTemplate = downloadImportTemplate;[span_1832](start_span)[span_1832](end_span)
    window.importConsignmentsFromExcel = importConsignmentsFromExcel;[span_1833](start_span)[span_1833](end_span)
    window.toggleAutoAdjust = toggleAutoAdjust;[span_1834](start_span)[span_1834](end_span)
    window.openVendorModal = openVendorModal;[span_1835](start_span)[span_1835](end_span)
    window.openEditVendorModal = openEditVendorModal;[span_1836](start_span)[span_1836](end_span)
    window.saveVendor = saveVendor;[span_1837](start_span)[span_1837](end_span)
    window.deleteVendor = deleteVendor;[span_1838](start_span)[span_1838](end_span)
    window.renderVendors = renderVendors;[span_1839](start_span)[span_1839](end_span)
    window.openVendorPaymentModal = openVendorPaymentModal;[span_1840](start_span)[span_1840](end_span)
    window.saveVendorLedgerEntry = saveVendorLedgerEntry;[span_1841](start_span)[span_1841](end_span)
    window.renderVendorLedger = renderVendorLedger;[span_1842](start_span)[span_1842](end_span)
    window.deleteLedger = deleteLedger;[span_1843](start_span)[span_1843](end_span)
    window.openVendorSettlementOtpModal = openVendorSettlementOtpModal;[span_1844](start_span)[span_1844](end_span)
    window.sendSettlementOtp = sendSettlementOtp;[span_1845](start_span)[span_1845](end_span)
    window.verifySettlementOtp = verifySettlementOtp;[span_1846](start_span)[span_1846](end_span)
    window.cancelSettlementOtp = cancelSettlementOtp;[span_1847](start_span)[span_1847](end_span)
    window.adminConfirmRto = adminConfirmRto;
    window.openAgentModal = openAgentModal;[span_1848](start_span)[span_1848](end_span)
    window.saveAgent = saveAgent;[span_1849](start_span)[span_1849](end_span)
    window.renderAgents = renderAgents;[span_1850](start_span)[span_1850](end_span)
    window.setAgentStatus = setAgentStatus;[span_1851](start_span)[span_1851](end_span)
    window.adminDeleteAgent = adminDeleteAgent;[span_1852](start_span)[span_1852](end_span)
    window.adminResetAgentPassword = adminResetAgentPassword;[span_1853](start_span)[span_1853](end_span)
    window.openCredentialsModal = openCredentialsModal;[span_1854](start_span)[span_1854](end_span)
    window.changeOwnPassword = changeOwnPassword;[span_1855](start_span)[span_1855](end_span)
    window.renderConfirmations = renderConfirmations;[span_1856](start_span)[span_1856](end_span)
    window.generateAdminFinanceTab = generateAdminFinanceTab;[span_1857](start_span)[span_1857](end_span)

    initPWA();[span_1858](start_span)[span_1858](end_span)

    if (getCurrentUser()) {[span_1859](start_span)[span_1859](end_span)
      enterWorkspace();[span_1860](start_span)[span_1860](end_span)
    }[span_1861](start_span)[span_1861](end_span)

    console.log("NextWay Delivery Modular App initialized successfully!");[span_1862](start_span)[span_1862](end_span)
  } catch (error) {[span_1863](start_span)[span_1863](end_span)
    console.error("Failed to initialize app:", error);[span_1864](start_span)[span_1864](end_span)
  }[span_1865](start_span)[span_1865](end_span)
});[span_1866](start_span)[span_1866](end_span)
