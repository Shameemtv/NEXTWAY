import { initDB, getCurrentUser, setCurrentUser, getDB } from './services/store.js';
import { handleLoginSubmit } from './views/loginViews.js';
import { 
  setDashMode, renderAgentDashboard, closeDashSubScreen, 
  openDashAnalysis, openDashList, renderDashListItems 
} from './views/dashboard.js';

// ==========================================
// CORE SHELL & NAVIGATION LOGIC
// ==========================================

export const enterWorkspace = () => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  // Reveal Workspace
  document.getElementById('authView').classList.add('hidden'); 
  document.getElementById('appView').classList.remove('hidden'); 
  document.getElementById('bottomNav').classList.remove('hidden'); 
  document.getElementById('bottomNav').classList.add('flex'); 
  document.getElementById('darkModeBtn').classList.remove('hidden');
  
  const isA = currentUser.role === 'ADMIN'; 
  
  // Set Role Badge
  const roleBadge = document.getElementById('roleBadge');
  if (roleBadge) {
    roleBadge.innerHTML = isA 
      ? `<span class="text-[var(--accent-gold)] font-extrabold mr-1">ADMIN</span> <span>${currentUser.username}</span>` 
      : `<span>${currentUser.name} - ${currentUser.id}</span>`;
  }
  
  // Toggle Admin/Agent specific UI elements
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isA)); 
  document.querySelectorAll('.agent-only').forEach(el => el.classList.toggle('hidden', isA));
  
  // Populate Admin Dropdowns dynamically
  if (isA) { 
    const db = getDB();
    if (db) {
        const agentOptions = `<option value="ALL">All Personnel</option>` + db.users.filter(u=>u.role==='AGENT').map(a=>`<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');
        
        const bulkAgent = document.getElementById('bulkAgent');
        if (bulkAgent) bulkAgent.innerHTML = `<option value="">Agent...</option>` + db.users.filter(u=>u.role==='AGENT').map(a=>`<option value="${a.id}">${a.name} - ${a.id}</option>`).join(''); 
        
        const filterAgentSlicer = document.getElementById('filterAgentSlicer');
        if (filterAgentSlicer) filterAgentSlicer.innerHTML = `<option value="ALL">All Agents</option><option value="UNASSIGNED">Unassigned</option>` + db.users.filter(u=>u.role==='AGENT').map(a=>`<option value="${a.id}">${a.name} - ${a.id}</option>`).join(''); 
        
        const adminReportSelect = document.getElementById('adminReportSelect');
        if (adminReportSelect) adminReportSelect.innerHTML = db.users.filter(u=>u.role==='AGENT').map(a=>`<option value="${a.id}">${a.name} - ${a.id}</option>`).join(''); 
        
        const adminCocReportSelect = document.getElementById('adminCocReportSelect');
        if (adminCocReportSelect) adminCocReportSelect.innerHTML = agentOptions;
        
        const adminDashAgentFilter = document.getElementById('adminDashAgentFilter');
        if (adminDashAgentFilter) adminDashAgentFilter.innerHTML = `<option value="ALL">Overall (All Agents)</option>` + db.users.filter(u=>u.role==='AGENT').map(a=>`<option value="${a.id}">${a.name} - ${a.id}</option>`).join('');
        
        const adminDashFilterWrap = document.getElementById('adminDashFilterWrap');
        if (adminDashFilterWrap) adminDashFilterWrap.classList.remove('hidden');
    }
  } 
  
  // Route to initial tab
  switchTab(isA ? 'consignments' : 'dashboard'); 
  
  // Trigger global refresh (Calling back to index.html bridge temporarily)
  if (typeof window.refreshAllViews === 'function') {
    window.refreshAllViews();
  }
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
  document.getElementById('moreMenuDrawer').classList.add('hidden'); // Auto-close the drawer
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

  // Toggle View Panels & Bottom Nav Icons
  ['dashboard','consignments','confirmations','agent-reports','agent-finance','agent-deficit','vendors','invoices','admin-finance','system','waybill'].forEach(t => {
    const p = document.getElementById(`panel-${t}`);
    const b = document.getElementById(`tab-${t}`);
    
    if(p) p.classList.toggle('hidden', t !== tName);
    if(b && b.id !== 'tab-more') { 
        b.classList.toggle('tab-active', t === tName); 
        b.classList.toggle('text-[var(--text-muted)]', t !== tName); 
    }
  });
  
  // Route to extracted ES Modules
  if(tName === 'dashboard') { 
      closeDashSubScreen(); 
      renderAgentDashboard(); 
  }
  
  // Route to pending legacy functions (still living in index.html, to be extracted later)
  if(tName === 'agent-finance' && typeof window.generateAgentFinanceReport === 'function') window.generateAgentFinanceReport();
  if(tName === 'admin-finance' && typeof window.generateAdminFinanceTab === 'function') window.generateAdminFinanceTab();
  if(tName === 'agent-deficit' && typeof window.renderAgentDeficit === 'function') window.renderAgentDeficit();
  if(tName === 'invoices' && typeof window.generateInvoicePreview === 'function') { 
    const db = getDB();
    if(db && db.vendors) {
        document.getElementById('invVendorSelect').innerHTML = `<option value="" selected disabled></option>` + db.vendors.map(v=>`<option value="${v.code}">${v.name}</option>`).join(''); 
    }
    window.generateInvoicePreview(); 
    if(typeof window.renderVendorLedger === 'function') window.renderVendorLedger(); 
  }
};

// ==========================================
// APP INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize the local database & sync engine
    await initDB();

    // 2. Attach Login Listener
    const loginForm = document.querySelector('#authView form');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // 3. Attach Dashboard Search Listener
    const listSearch = document.getElementById('dashListSearchInput');
    if (listSearch) {
      listSearch.addEventListener('input', () => {
         requestAnimationFrame(renderDashListItems);
      });
    }
    
    // 4. Bind Core Functions to Window (Bridge for inline HTML onclicks)
    window.enterWorkspace = enterWorkspace;
    window.logout = logout;
    window.toggleDarkMode = toggleDarkMode;
    window.switchTab = switchTab;
    window.switchTabWrapper = switchTabWrapper;
    window.toggleMoreMenu = toggleMoreMenu;
    
    window.setDashMode = setDashMode;
    window.renderAgentDashboard = renderAgentDashboard;
    window.closeDashSubScreen = closeDashSubScreen;
    window.openDashAnalysis = openDashAnalysis;
    window.openDashList = openDashList;
    window.renderDashListItems = renderDashListItems;

    // 5. Restore Session if user was already logged in
    if (getCurrentUser()) {
      enterWorkspace();
    }
    
    console.log("NextWay Delivery Modular App initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
});
