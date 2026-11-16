import { getDB, getCurrentUser, saveDB } from '../services/store.js';
import { formatAmt, getUAEISOString, getUAEDisplayDate, getVendorByCode, getDeficitInfo } from '../utils/helpers.js';

// ==========================================
// INTERNAL HELPERS
// ==========================================
const getAgentFinanceRows = (agentId, dateStr, statusFilter) => {
    const db = getDB();
    const rows = []; 
    let totalCollected = 0;
    
    db.consignments.forEach(c => {
        let rowAmt = 0; let typeLabel = [];
        const deliveredToday = c.status === 'Delivered' && c.assignedTo === agentId && c.deliveredAt && c.deliveredAt.split('T')[0] === dateStr;

        const { isDeficit, deficitAmt } = getDeficitInfo(c);
        const deficitCollectedToday = isDeficit && c.pickedUpBy === agentId && c.deficitReceivedDate && c.deficitReceivedDate.split('T')[0] === dateStr;

        if (statusFilter !== 'ALL' && c.status !== statusFilter) return;

        if (deliveredToday) {
            if (c.feeType === 'COC') { rowAmt += c.productAmount; typeLabel.push('Delivery (Prod)'); } 
            else if (c.feeType === 'COD') { rowAmt += (parseFloat(c.productAmount) + parseFloat(c.deliveryCharge)); typeLabel.push('Delivery (COD)'); } 
            else if (c.feeType === 'CAD') { rowAmt += c.productAmount; typeLabel.push('Delivery (CAD)'); }
        }
        
        if (deficitCollectedToday) { 
            rowAmt += deficitAmt; 
            typeLabel.push(`Pickup Deficit (${c.feeType})`); 
        }

        if (rowAmt > 0 || typeLabel.length > 0) {
            totalCollected += rowAmt;
            rows.push({ id: c.id, customer: c.customerName, type: typeLabel.join(' + ') || c.status, amount: rowAmt });
        }
    });
    
    return { rows, totalCollected };
};

// ==========================================
// AGENT & ADMIN FINANCE REPORTS
// ==========================================
export const generateAdminAgentReport = () => {
    const db = getDB();
    const id = document.getElementById('adminReportSelect').value;
    const d = document.getElementById('adminReportDate').value;
    const stat = document.getElementById('adminReportStatus').value;
    const ag = db.users.find(u => u.id === id);
    
    const { rows, totalCollected } = getAgentFinanceRows(id, d, stat);
    const tbody = rows.map(r => `<tr class="border-b border-[var(--border-color)]"><td class="py-3 px-2 font-bold">${r.id}</td><td class="py-3 px-2">${r.customer}</td><td class="py-3 px-2">${r.type}</td><td class="py-3 px-2 text-right font-black">${formatAmt(r.amount)}</td></tr>`).join('');
    
    const exps = (db.agentExpenses || []).filter(e => e.agentId === id && e.date === d);
    const totExp = exps.reduce((sum, e) => sum + (e.status !== 'REJECTED' ? parseFloat(e.amount) : 0), 0);
    const netCash = totalCollected - totExp;

    const expTbody = exps.length ? exps.map(e => {
        let statusBadge = '';
        if (e.status === 'PENDING') statusBadge = `<span class="text-[var(--accent-gold)] font-bold uppercase tracking-wider text-[10px]">Pending</span>`;
        if (e.status === 'APPROVED') statusBadge = `<span class="text-[var(--status-emerald)] font-bold uppercase tracking-wider text-[10px]">Approved</span>`;
        if (e.status === 'REJECTED') statusBadge = `<span class="text-[var(--status-rose)] font-bold uppercase tracking-wider text-[10px] line-through">Rejected</span>`;
        
        let actionBtns = '';
        if (e.status === 'PENDING') {
            actionBtns = `<div class="flex gap-2 justify-end mt-1.5 no-print"><button onclick="window.updateExpenseStatus('${e.id}', 'APPROVED')" class="bg-[var(--status-emerald-bg)] text-[var(--status-emerald)] border border-[#10b981]/20 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors">Approve</button><button onclick="window.updateExpenseStatus('${e.id}', 'REJECTED')" class="bg-[var(--status-rose-bg)] text-[var(--status-rose)] border border-[#f43f5e]/20 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors">Reject</button></div>`;
        }
        return `<tr class="border-b border-[var(--border-color)]"><td class="py-3 px-2 font-bold">${e.category}</td><td class="py-3 px-2 text-[var(--text-secondary)]">${e.notes}</td><td class="py-3 px-2 text-right font-black text-[var(--status-rose)]">${formatAmt(e.amount)}</td><td class="py-3 px-2 text-right">${statusBadge} ${actionBtns}</td></tr>`;
    }).join('') : `<tr><td colspan="4" class="p-6 text-center text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest">No expenses logged.</td></tr>`;

    document.getElementById('printableAdminAgentReport').innerHTML = `
    <div class="flex justify-between border-b border-gray-300 pb-5">
      <div>
          <h2 class="text-xl font-black text-gray-900 uppercase tracking-tighter">NEXT WAY DELIVERY</h2>
          <p class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mt-1">Agent Cash Settlement</p>
      </div>
      <div class="text-right">
          <p class="text-sm font-black text-gray-900 uppercase">${ag ? ag.name : id}</p>
          <p class="text-[10px] text-gray-500 font-extrabold tracking-widest uppercase mt-1">${d}</p>
      </div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
      <div class="p-4 rounded-xl bg-gray-50 border border-gray-200"><p class="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Entries</p><p class="text-xl font-black text-gray-900 mt-1 tabular-nums">${rows.length}</p></div>
      <div class="p-4 rounded-xl bg-blue-50 border border-blue-200"><p class="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Gross</p><p class="text-xl font-black text-blue-900 mt-1 tabular-nums">${formatAmt(totalCollected)} AED</p></div>
      <div class="p-4 rounded-xl bg-rose-50 border border-rose-200"><p class="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">Expenses</p><p class="text-xl font-black text-rose-900 mt-1 tabular-nums">${formatAmt(totExp)} AED</p></div>
      <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200"><p class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Net Cash</p><p class="text-xl font-black text-emerald-900 mt-1 tabular-nums">${formatAmt(netCash)} AED</p></div>
    </div>
    <h3 class="font-black text-xs text-gray-900 mb-3 uppercase tracking-widest">Deliveries & Collections</h3>
    <div class="overflow-x-auto mb-8"><table class="w-full text-left text-xs border-collapse tabular-nums"><thead><tr class="bg-gray-100 border-b border-gray-300"><th class="p-3 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">ID</th><th class="p-3 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">Customer</th><th class="p-3 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">Type</th><th class="p-3 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold text-right">Amt Collected</th></tr></thead><tbody class="divide-y divide-gray-100 text-gray-800">${tbody}</tbody></table></div>
    <h3 class="font-black text-xs text-rose-800 mb-3 uppercase tracking-widest">Daily Expenses</h3>
    <div class="overflow-x-auto"><table class="w-full text-left text-xs border-collapse tabular-nums"><thead><tr class="bg-rose-50 border-b border-rose-200 text-rose-900"><th class="p-3 text-[10px] uppercase tracking-wider font-extrabold">Category</th><th class="p-3 text-[10px] uppercase tracking-wider font-extrabold">Notes</th><th class="p-3 text-[10px] uppercase tracking-wider font-extrabold text-right">Amount</th><th class="p-3 text-[10px] uppercase tracking-wider font-extrabold text-right">Status / Action</th></tr></thead><tbody class="divide-y divide-rose-50 text-gray-800">${expTbody}</tbody></table></div>
    `;
    document.getElementById('printableAdminAgentReport').classList.remove('hidden');
};

export const generateAgentFinanceReport = () => {
    const currentUser = getCurrentUser();
    const db = getDB();
    if(currentUser.role !== 'AGENT') return;
    
    if(!document.getElementById('agentFinanceDate').value) document.getElementById('agentFinanceDate').value = getUAEISOString().split('T')[0];
    const d = document.getElementById('agentFinanceDate').value;
    const stat = document.getElementById('agentFinanceStatus').value;
    
    const { rows, totalCollected } = getAgentFinanceRows(currentUser.id, d, stat);
    
    const exps = (db.agentExpenses || []).filter(e => e.agentId === currentUser.id && e.date === d);
    const totalExpenses = exps.reduce((sum, e) => sum + (e.status !== 'REJECTED' ? parseFloat(e.amount) : 0), 0);
    const netHandover = totalCollected - totalExpenses;
    
    document.getElementById('afTableBody').innerHTML = rows.map(r=>`<tr class="hover:bg-[var(--bg-base)] transition-colors"><td class="p-3 font-black text-[var(--text-primary)]">${r.id}</td><td class="p-3 font-bold text-[var(--text-secondary)] uppercase">${r.customer}</td><td class="p-3 font-bold text-[var(--text-muted)] uppercase text-[10px]">${r.type}</td><td class="p-3 text-right font-black text-[var(--text-primary)]">${formatAmt(r.amount)}</td></tr>`).join('');
    
    document.getElementById('afExpenseBody').innerHTML = exps.length ? exps.map(e => `
      <tr class="hover:bg-[var(--status-rose-bg)] transition-colors">
          <td class="p-3 font-black text-[var(--text-primary)]">${e.category}</td>
          <td class="p-3 font-bold text-[var(--text-secondary)]">${e.notes}</td>
          <td class="p-3 text-right font-black text-[var(--status-rose)]">${formatAmt(e.amount)}</td>
          <td class="p-3 text-center font-black uppercase tracking-widest text-[10px] ${e.status==='APPROVED'?'text-[var(--status-emerald)]':(e.status==='REJECTED'?'text-[var(--status-rose)] line-through opacity-60':'text-[var(--accent-gold)]')}">${e.status}</td>
          <td class="p-3 text-right no-print">${e.status === 'PENDING' ? `<button onclick="window.deleteExpense('${e.id}')" class="text-[var(--status-rose)] font-extrabold bg-[var(--bg-base)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color-strong)] transition-colors text-[10px] uppercase tracking-widest shadow-sm">Del</button>` : '<span class="text-[var(--text-muted)]">-</span>'}</td>
      </tr>`).join('') : `<tr><td colspan="5" class="p-8 text-center text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest">No expenses logged for this date.</td></tr>`;

    document.getElementById('afTotalCount').textContent = rows.length; 
    document.getElementById('afTotalCollected').textContent = formatAmt(totalCollected) + ' AED';
    document.getElementById('afTotalExpenses').textContent = formatAmt(totalExpenses) + ' AED';
    document.getElementById('afNetHandover').textContent = formatAmt(netHandover) + ' AED';
    document.getElementById('afAgentNameDisplay').textContent = currentUser.name; 
    document.getElementById('afDateDisplay').textContent = d;
};

// ==========================================
// VENDOR INVOICES
// ==========================================
export const updateInvoiceFilterInputs = () => { 
    const t = document.getElementById('invFilterType').value; 
    document.getElementById('invSingleDateWrap').classList.toggle('hidden',!['DATE','MONTH','YEAR'].includes(t)); 
    document.getElementById('invRangeStartWrap').classList.toggle('hidden',t!=='RANGE'); 
    document.getElementById('invRangeEndWrap').classList.toggle('hidden',t!=='RANGE'); 
    
    if(t==='MONTH') document.getElementById('invSingleInput').type='month'; 
    else if(t==='YEAR') document.getElementById('invSingleInput').type='number'; 
    else document.getElementById('invSingleInput').type='date'; 
    
    generateInvoicePreview(); 
};

export const generateInvoicePreview = () => { 
    const db = getDB();
    const currentUser = getCurrentUser();
    const vCode = document.getElementById('invVendorSelect')?.value; 
    
    if (!vCode) {
        document.getElementById('standardInvoiceWrap')?.classList.add('hidden');
        document.getElementById('taxInvoiceWrap')?.classList.add('hidden');
        return;
    }

    const type = document.getElementById('invFilterType').value; 
    const sVal = document.getElementById('invSingleInput').value; 
    const start = document.getElementById('invStartDate').value; 
    const end = document.getElementById('invEndDate').value;
    const invTaxSelection = document.getElementById('invTaxInvoiceSelect').value;
    
    const isTaxInvoice = invTaxSelection === 'YES' || invTaxSelection === 'NO_VAT';
    const isNoVat = invTaxSelection === 'NO_VAT';
    const v = getVendorByCode(vCode); 
    
    let period = '';
    if(type === 'MONTH' && sVal) { const [y, m] = sVal.split('-'); period = `Billing Month : ${new Date(y, m-1).toLocaleString('default', {month:'long'})}, ${y}`; }
    else if(type === 'YEAR' && sVal) { period = `Year : ${sVal}`; }
    else if(type === 'DATE' && sVal) { const [y, m, d] = sVal.split('-'); period = `Date : ${m}-${d}-${y}`; }
    else if(type === 'RANGE') { const fS = start?`${start.split('-')[1]}-${start.split('-')[2]}-${start.split('-')[0]}`:''; const fE = end?`${end.split('-')[1]}-${end.split('-')[2]}-${end.split('-')[0]}`:''; period = `Period : ${fS} to ${fE}`; }
    
    const ls = db.consignments.filter(c => {
      if(c.status !== 'Delivered') return false;
      if(c.feeType === 'COC' && !(c.cocPendingAmount > 0)) return false; 
      if(vCode!=='ALL'&&c.vendorCode!==vCode) return false;
      if(c.productAmount === 0 && c.feeType === 'COD') return false; 
      
      const cd = c.createdAt;
      if(type==='DATE'&&sVal&&cd!==sVal) return false; 
      if(type==='MONTH'&&sVal&&!cd.startsWith(sVal)) return false; 
      if(type==='YEAR'&&sVal&&!cd.startsWith(String(sVal))) return false; 
      if(type==='RANGE') { if(start&&cd<start) return false; if(end&&cd>end) return false; }
      return true;
    }); 
    
    if (isTaxInvoice) {
        document.getElementById('standardInvoiceWrap').classList.add('hidden');
        document.getElementById('taxInvoiceWrap').classList.remove('hidden');

        const invNo = 'NW-' + (db.settings.invoiceCounter || 1001);
        document.getElementById('taxInvNo').textContent = invNo;
        const now = getUAEDisplayDate();
        document.getElementById('taxInvDate').textContent = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
        
        document.getElementById('taxCustName').textContent = v ? v.name : 'ALL VENDORS';
        document.getElementById('taxCustLoc').textContent = v ? (v.address || '') : '';
        document.getElementById('taxCustTRN').textContent = v ? (v.trn || '') : '';
        document.getElementById('taxPrintedBy').textContent = currentUser ? currentUser.name : 'System';
        document.getElementById('taxPrintedDate').textContent = getUAEDisplayDate().toLocaleString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true});

        if (typeof window.JsBarcode !== "undefined") {
            window.JsBarcode("#taxInvoiceBarcode", invNo, {height: 40, width: 2, displayValue: false, margin: 0, background: "transparent"}); 
        }

        document.getElementById('taxInvoiceMainTitle').textContent = isNoVat ? 'INVOICE' : 'TAX INVOICE';
        document.getElementById('thVatPct').style.display = isNoVat ? 'none' : '';
        document.getElementById('thVatAmt').style.display = isNoVat ? 'none' : '';
        document.getElementById('rowTotalBeforeVat').style.display = isNoVat ? 'none' : '';
        document.getElementById('rowTotalVat').style.display = isNoVat ? 'none' : '';

        let tAmt = 0, tBeforeVat = 0, tVat = 0;
        document.getElementById('taxInvoiceTableBody').innerHTML = ls.map((c, i) => {
            const total = c.deliveryCharge || 0;
            const amount = isNoVat ? total : total / 1.05; 
            const vatAmt = isNoVat ? 0 : total - amount;
            tAmt += total; tBeforeVat += amount; tVat += vatAmt;
            return `<tr>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b">${i+1}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b font-bold">${c.id}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b">${c.pickupFrom || 'Dubai'}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b uppercase font-bold">${c.customerName || ''}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b">${c.deliveryAddress || ''}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b">${c.weight || 0.5}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b text-right font-bold">${amount.toFixed(3)}</td>
                <td class="py-2.5 px-2 border-r border-gray-200 border-b text-right font-bold">0.000</td>
                ${!isNoVat ? `<td class="py-2.5 px-2 border-r border-gray-200 border-b text-right font-bold">5.000</td><td class="py-2.5 px-2 border-r border-gray-200 border-b text-right font-bold">${vatAmt.toFixed(3)}</td>` : ''}
                <td class="py-2.5 px-2 border-b text-right font-bold">${total.toFixed(3)}</td>
            </tr>`;
        }).join('');

        document.getElementById('taxTotalAmt').textContent = tAmt.toFixed(3);
        document.getElementById('taxTotalBeforeVat').textContent = tBeforeVat.toFixed(3);
        document.getElementById('taxTotalVat').textContent = tVat.toFixed(3);
        document.getElementById('taxNetAmt').textContent = tAmt.toFixed(3);

    } else {
        document.getElementById('standardInvoiceWrap').classList.remove('hidden');
        document.getElementById('taxInvoiceWrap').classList.add('hidden');

        document.getElementById('invVendorHeader').innerHTML = v ? `${v.name}<br/><span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 block leading-relaxed">${v.phone} <br/> ${v.address}</span>` : 'ALL REGISTERED VENDORS';
        document.getElementById('invPeriodHeader').textContent = period;

        let tp=0, td=0, netDeduction=0; 
        document.getElementById('invTableBody').innerHTML = ls.map(c=>{
          tp+=c.productAmount; 
          
          const defInfo = getDeficitInfo(c);
          let deduction = defInfo.deductionInInvoice;
          let mathDeduction = deduction;

          if (c.feeType === 'COC') { 
              deduction = c.cocPendingAmount > 0 ? c.deliveryCharge : 0; 
              mathDeduction = deduction;
          } else if (defInfo.excludeFromNet) {
              mathDeduction = 0; 
          }

          td += deduction;
          netDeduction += mathDeduction;
          
          const feeDisplay = c.feeType === 'COC' ? c.cocPendingAmount : deduction;
          return `<tr><td class="p-3 font-bold">${c.createdAt}</td><td class="p-3 font-black">${c.id}</td><td class="p-3 uppercase font-bold">${c.customerName}</td><td class="p-3 text-right text-rose-700 font-bold">${formatAmt(feeDisplay)}</td><td class="p-3 text-right font-black">${formatAmt(c.productAmount)}</td></tr>`;
        }).join(''); 
        
        let lp=0; 
        const pL = db.vendorPayments.filter(p=>{
          if(vCode!=='ALL'&&p.vendorCode!==vCode) return false;
          const pd = p.date; if(type==='DATE'&&sVal&&pd!==sVal) return false; if(type==='MONTH'&&sVal&&!pd.startsWith(sVal)) return false; if(type==='YEAR'&&sVal&&!pd.startsWith(String(sVal))) return false; if(type==='RANGE') { if(start&&pd<start) return false; if(end&&pd>end) return false; } return true;
        });
        
        if(pL.length>0) { 
            document.getElementById('invSettledLedgerWrap').classList.remove('hidden'); 
            document.getElementById('invSettledTableBody').innerHTML = pL.map(p=>{ if(p.type==='PAID') lp+=p.amount; else lp-=p.amount; return `<tr><td class="p-3 font-bold">${p.date}</td><td class="p-3 font-black text-[10px] uppercase tracking-widest ${p.type==='PAID'?'text-[#10b981]':'text-[#3b82f6]'}">${p.type}</td><td class="p-3 font-bold">${p.notes}</td><td class="p-3 text-right font-black">${formatAmt(p.amount)}</td></tr>`;}).join(''); 
        } else { 
            document.getElementById('invSettledLedgerWrap').classList.add('hidden'); 
        }
        
        document.getElementById('invTotalProduct').textContent = formatAmt(tp) + ' AED'; 
        document.getElementById('invTotalDeductions').textContent = formatAmt(td) + ' AED'; 
        document.getElementById('invSettledAmount').textContent = formatAmt(lp) + ' AED'; 
        document.getElementById('invNetAmount').textContent = formatAmt(tp - netDeduction - lp) + ' AED'; 
        
        setTimeout(()=>{ 
            document.getElementById('pdfQrCodeCanvas').innerHTML=''; 
            if(window.QRCode) {
                new window.QRCode(document.getElementById('pdfQrCodeCanvas'), { text: JSON.stringify({ Vendor: vCode, NetPayable: formatAmt(tp - netDeduction - lp), Date: getUAEISOString() }), width: 64, height: 64, colorDark: "#0b0f19", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.L }); 
            }
        }, 100);
    }
};

// ==========================================
// EXPORTS & WHATSAPP SHARING
// ==========================================
export const exportAgentDailyExcel = (role) => {
    const currentUser = getCurrentUser();
    const db = getDB();
    if(typeof window.XLSX === 'undefined') { alert("Excel library loading. Please try again."); return; }
    
    const id = role === 'admin' ? document.getElementById('adminReportSelect').value : currentUser.id;
    const d = role === 'admin' ? document.getElementById('adminReportDate').value : document.getElementById('agentFinanceDate').value;
    const stat = role === 'admin' ? document.getElementById('adminReportStatus').value : document.getElementById('agentFinanceStatus').value;
    
    const { rows } = getAgentFinanceRows(id, d, stat);
    const data = rows.map(r => ({ "ID": r.id, "Category / Customer": r.customer, "Notes / Type": r.type, "Amount": r.amount, "Entry Type": "Collection" }));
    
    const exps = (db.agentExpenses || []).filter(e => e.agentId === id && e.date === d && e.status === 'APPROVED');
    if (exps.length > 0) {
      data.push({ "ID": "", "Category / Customer": "", "Notes / Type": "", "Amount": "", "Entry Type": "" }); 
      exps.forEach(e => {
          data.push({ "ID": e.id, "Category / Customer": e.category, "Notes / Type": e.notes, "Amount": -Math.abs(e.amount), "Entry Type": "Approved Expense" });
      });
    }
    
    const wb = window.XLSX.utils.book_new(); 
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(data), "AgentReport"); 
    window.XLSX.writeFile(wb, `AgentReport_${d}.xlsx`);
};

export const sendAgentReportWhatsApp = () => {
    const currentUser = getCurrentUser();
    const db = getDB();
    if(currentUser.role !== 'AGENT') return;
    
    if(!document.getElementById('agentFinanceDate').value) document.getElementById('agentFinanceDate').value = getUAEISOString().split('T')[0];
    const d = document.getElementById('agentFinanceDate').value;
    const stat = document.getElementById('agentFinanceStatus').value;
    const { rows, totalCollected } = getAgentFinanceRows(currentUser.id, d, stat);
    
    const exps = (db.agentExpenses || []).filter(e => e.agentId === currentUser.id && e.date === d && e.status === 'APPROVED');
    const totalExpenses = exps.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netHandover = totalCollected - totalExpenses;
    
    let text = `*Daily Financial Balance*\n*Representative:* ${currentUser.name}\n*Personnel ID:* ${currentUser.id}\n*Date:* ${d}\n\n`;
    
    text += `*--- COLLECTIONS ---*\n`;
    if(rows.length === 0) { text += `No deliveries registered for this date.\n`; } 
    else { rows.forEach(r => { text += `• ${r.id} - ${r.type} - ${formatAmt(r.amount)} AED\n`; }); }
    
    if(exps.length > 0) {
        text += `\n*--- APPROVED EXPENSES ---*\n`;
        exps.forEach(e => { text += `• ${e.category} - ${e.notes} - ${formatAmt(e.amount)} AED\n`; });
    }
    
    text += `\n*Gross Collected:* ${formatAmt(totalCollected)} AED`;
    if (exps.length > 0) text += `\n*Total Expenses:* -${formatAmt(totalExpenses)} AED`;
    text += `\n*Net Handover:* ${formatAmt(netHandover)} AED`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

export const exportInvoiceExcel = () => { 
    const db = getDB();
    if(typeof window.XLSX === 'undefined') { alert("Excel library loading. Please try again."); return; }
    
    const v = document.getElementById('invVendorSelect').value; 
    const type = document.getElementById('invFilterType').value; 
    const sVal = document.getElementById('invSingleInput').value; 
    const start = document.getElementById('invStartDate').value; 
    const end = document.getElementById('invEndDate').value;
    
    const ls = db.consignments.filter(c => {
      if(c.status !== 'Delivered') return false;
      if(c.feeType === 'COC' && !(c.cocPendingAmount > 0)) return false; 
      if(v!=='ALL'&&c.vendorCode!==v) return false; 
      if(c.productAmount === 0 && c.feeType === 'COD') return false; 
      
      const cd = c.createdAt; 
      if(type==='DATE'&&sVal&&cd!==sVal) return false; 
      if(type==='MONTH'&&sVal&&!cd.startsWith(sVal)) return false; 
      if(type==='YEAR'&&sVal&&!cd.startsWith(String(sVal))) return false; 
      if(type==='RANGE') { if(start&&cd<start) return false; if(end&&cd>end) return false; } 
      return true;
    });
    
    const data = ls.map(c => {
      const { deductionInInvoice } = getDeficitInfo(c);
      let deduction = deductionInInvoice;
      if (c.feeType === 'COC') { deduction = c.cocPendingAmount > 0 ? c.deliveryCharge : 0; }
      return { "Date": c.createdAt, "ID": c.id, "Customer": c.customerName, "Deduction / Deficit": deduction, "Product Amount": c.productAmount };
    });
    
    const wb = window.XLSX.utils.book_new(); 
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(data), "Invoice"); 
    window.XLSX.writeFile(wb, `NEXTWAY_Invoice_${v}.xlsx`);
};

// ==========================================
// PRINTING UTILS
// ==========================================
export const printAdminAgentReport = () => {
    document.querySelectorAll('.print-area').forEach(e => e.classList.remove('print-area'));
    document.getElementById('printableAdminAgentReport').classList.add('print-area'); 
    window.print();
};

export const printAgentFinanceReport = () => { 
    document.querySelectorAll('.print-area').forEach(e => e.classList.remove('print-area')); 
    document.getElementById('printableAgentFinance').classList.add('print-area'); 
    window.print(); 
};

export const printVendorInvoice = () => { 
    const db = getDB();
    const isTaxInvoice = !document.getElementById('taxInvoiceWrap').classList.contains('hidden');
    if (isTaxInvoice) {
        db.settings.invoiceCounter = (db.settings.invoiceCounter || 1001) + 1;
        saveDB();
    }
    document.querySelectorAll('.print-area').forEach(e => e.classList.remove('print-area')); 
    document.getElementById('printableInvoice').classList.add('print-area'); 
    window.print(); 
    if (isTaxInvoice) generateInvoicePreview(); 
};

// ==========================================
// EXPENSE MANAGEMENT
// ==========================================
export const openExpenseModal = () => {
    document.getElementById('expAmount').value = '';
    document.getElementById('expNotes').value = '';
    document.getElementById('expenseModal').classList.remove('hidden');
};

export const saveAgentExpense = async (e) => {
    e.preventDefault();
    const db = getDB();
    const currentUser = getCurrentUser();
    
    const date = document.getElementById('agentFinanceDate').value || getUAEISOString().split('T')[0];
    const expense = {
        id: 'EXP-' + Date.now(),
        agentId: currentUser.id,
        date: date,
        category: document.getElementById('expCategory').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        notes: document.getElementById('expNotes').value,
        status: 'PENDING'
    };
    
    db.agentExpenses.unshift(expense);
    await saveDB();
    
    document.getElementById('expenseModal').classList.add('hidden');
    generateAgentFinanceReport();
};

export const deleteExpense = async (id) => {
    const db = getDB();
    if(!confirm('Are you sure you want to delete this pending expense?')) return;
    db.agentExpenses = db.agentExpenses.filter(e => e.id !== id);
    await saveDB();
    generateAgentFinanceReport();
};

export const updateExpenseStatus = async (id, status) => {
    const db = getDB();
    const exp = db.agentExpenses.find(e => e.id === id);
    if(exp) {
        exp.status = status;
        await saveDB();
        generateAdminAgentReport();
    }
};
