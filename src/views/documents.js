// /src/views/documents.js

// ==========================================
// WAYBILL GENERATOR
// ==========================================

export const toggleWaybillView = () => {
    const isWaybill = document.querySelector('input[name="wb_type"]:checked').value === 'waybill';
    document.getElementById('form-waybill').classList.toggle('hidden', !isWaybill);
    document.getElementById('form-quotation').classList.toggle('hidden', isWaybill);
};

export const clearWaybillForm = () => {
    if (!confirm("Are you sure you want to clear all fields?")) return;
    
    const fields = [
        'wb_in_from_address', 'wb_in_from_tel', 'wb_in_to_address', 'wb_in_to_tel',
        'wb_in_courier', 'wb_in_others', 'wb_in_vat', 'wb_in_total', 'wb_in_coll_date',
        'wb_in_coll_by', 'wb_in_mode', 'wb_in_amount', 'wb_in_material',
        'wb_in_packages', 'wb_in_weight', 'wb_in_special'
    ];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
};

export const generateAndSendWaybill = () => {
    const phone = prompt("Enter WhatsApp number to send this to (include country code, e.g., 971501234567):", "+971");
    if (phone === null) return; 

    const bgImg = new Image();
    bgImg.src = '1000515892.png';
    
    bgImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / 1000;
        const scaleY = canvas.height / 500;

        ctx.fillStyle = '#0f172a'; 
        
        function drawText(id, x, y, isMultiline = false) {
            const text = document.getElementById(id).value || '';
            if (!text) return;
            
            if (isMultiline) {
                const lines = text.split('\n');
                lines.forEach((line, i) => {
                    ctx.fillText(line, x * scaleX, (y + (i * 22)) * scaleY);
                });
            } else {
                ctx.fillText(text, x * scaleX, y * scaleY);
            }
        }

        ctx.font = `bold ${14 * scaleY}px Arial`;

        drawText('wb_in_from_address', 55, 195, true); 
        drawText('wb_in_from_tel', 80, 312);
        drawText('wb_in_to_address', 412, 195, true);  
        drawText('wb_in_to_tel', 440, 312);

        drawText('wb_in_courier', 870, 175);
        drawText('wb_in_others', 870, 215);
        drawText('wb_in_vat', 870, 255);
        drawText('wb_in_total', 870, 295);

        drawText('wb_in_coll_date', 140, 338);
        drawText('wb_in_coll_by', 340, 338);

        drawText('wb_in_material', 55, 400, true);
        drawText('wb_in_special', 275, 400, true);
        drawText('wb_in_packages', 785, 395);
        drawText('wb_in_weight', 900, 395);
        
        ctx.font = `bold ${16 * scaleY}px Arial`;
        drawText('wb_in_amount', 645, 438); 

        const mode = document.getElementById('wb_in_mode').value;
        ctx.font = `bold ${22 * scaleY}px Arial`;
        if (mode === 'COD') ctx.fillText('✔', 530 * scaleX, 403 * scaleY);
        if (mode === 'CAD') ctx.fillText('✔', 530 * scaleX, 435 * scaleY); 
        if (mode === 'COC') ctx.fillText('✔', 530 * scaleX, 460 * scaleY); 

        const random4 = Math.floor(1000 + Math.random() * 9000).toString();
        const bcCanvas = document.createElement('canvas');
        if (typeof window.JsBarcode !== 'undefined') {
            window.JsBarcode(bcCanvas, random4, { height: 40, width: 2, displayValue: false, margin: 0, background: "transparent" });
            ctx.drawImage(bcCanvas, 780 * scaleX, 40 * scaleY, 160 * scaleX, 50 * scaleY);
        }
        
        ctx.font = `bold ${16 * scaleY}px Arial`;
        ctx.fillText(random4, 840 * scaleX, 105 * scaleY);

        canvas.toBlob((blob) => {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `Waybill_${random4}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (cleanPhone) {
                setTimeout(() => {
                    if(confirm('Image Saved to downloads! Open WhatsApp to attach and send?')) {
                        const message = encodeURIComponent("Please find the attached Waybill.");
                        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
                    }
                }, 300);
            }
        }, 'image/png');
    };

    bgImg.onerror = () => {
        alert("Could not load 1000515892.png. Make sure the file exists in the same folder as this HTML file.");
    };
};


// ==========================================
// QUOTATION GENERATOR
// ==========================================

export const addQuotationRow = () => {
    const container = document.getElementById('qt_items_container');
    const row = document.createElement('div');
    row.className = 'flex flex-wrap sm:flex-nowrap gap-2 items-center qt-item-row mt-3';
    row.innerHTML = `
        <input type="text" placeholder="Item Name" class="qt-item w-full sm:flex-1 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]" />
        <div class="flex gap-2 w-full sm:w-auto">
            <input type="text" placeholder="Qty" oninput="window.calcQtRow(this)" class="qt-qty w-20 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] tabular-nums" />
            <input type="number" placeholder="Price" oninput="window.calcQtRow(this)" class="qt-price w-24 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] tabular-nums" />
            <input type="number" placeholder="Total" oninput="window.calcQtGrandTotal()" class="qt-total w-28 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-black bg-[var(--bg-surface)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] tabular-nums" />
            <button onclick="window.removeQuotationRow(this)" class="text-[var(--status-rose)] hover:opacity-70 font-black px-2 text-lg transition-opacity shrink-0">✕</button>
        </div>
    `;
    container.appendChild(row);
};

export const removeQuotationRow = (btn) => {
    btn.parentElement.parentElement.remove();
    calcQtGrandTotal();
};

export const calcQtRow = (el) => {
    const row = el.closest('.qt-item-row');
    const qtyRaw = row.querySelector('.qt-qty').value;
    const qtyMatch = qtyRaw.match(/[\d\.]+/);
    const qty = qtyMatch ? parseFloat(qtyMatch[0]) : 0;
    
    const price = parseFloat(row.querySelector('.qt-price').value) || 0;
    
    if(qty > 0 && price > 0) {
        row.querySelector('.qt-total').value = (qty * price).toFixed(2);
    } else {
        row.querySelector('.qt-total').value = '';
    }
    calcQtGrandTotal();
};

export const calcQtGrandTotal = () => {
    const totals = document.querySelectorAll('.qt-total');
    let grand = 0;
    totals.forEach(t => grand += parseFloat(t.value) || 0);
    document.getElementById('qt_grand_total').textContent = grand.toFixed(2);
};

export const clearQuotationForm = () => {
    if (!confirm("Are you sure you want to clear all Quotation fields?")) return;
    document.getElementById('qt_no').value = '';
    document.getElementById('qt_date').value = '';
    document.getElementById('qt_to').value = '';
    
    const container = document.getElementById('qt_items_container');
    container.innerHTML = `
        <div class="flex flex-wrap sm:flex-nowrap gap-2 items-center qt-item-row">
            <input type="text" placeholder="Item Name" class="qt-item w-full sm:flex-1 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]" />
            <div class="flex gap-2 w-full sm:w-auto">
                <input type="text" placeholder="Qty" oninput="window.calcQtRow(this)" class="qt-qty w-20 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] tabular-nums" />
                <input type="number" placeholder="Price" oninput="window.calcQtRow(this)" class="qt-price w-24 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-bold bg-[var(--bg-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] tabular-nums" />
                <input type="number" placeholder="Total" oninput="window.calcQtGrandTotal()" class="qt-total w-28 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs font-black bg-[var(--bg-surface)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)] tabular-nums" />
                <button onclick="window.removeQuotationRow(this)" class="text-[var(--status-rose)] hover:opacity-70 font-black px-2 text-lg transition-opacity shrink-0">✕</button>
            </div>
        </div>
    `;
    calcQtGrandTotal();
};

export const generateQuotationCanvas = (callback) => {
    const bgImg = new Image();
    bgImg.src = '1000521341.jpg'; 
    
    bgImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / 1000;
        const scaleY = canvas.height / 1414;

        const qtNo = document.getElementById('qt_no').value || '';
        if (qtNo) {
            ctx.fillStyle = '#091442'; 
            ctx.font = `bold ${18 * scaleY}px Helvetica`; 
            ctx.fillText(qtNo, 830 * scaleX, 158.36 * scaleY); 
        }
        
        const dateVal = document.getElementById('qt_date').value;
        if (dateVal) {
            const d = new Date(dateVal);
            const ds = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            ctx.fillStyle = '#404040'; 
            ctx.font = `normal ${14 * scaleY}px Helvetica`;
            ctx.fillText(ds, 830 * scaleX, 185 * scaleY); 
        }

        const toText = document.getElementById('qt_to').value || '';
        const toLines = toText.split('\n');
        toLines.forEach((line, i) => {
            if (i === 0) {
                ctx.font = `bold ${16 * scaleY}px Helvetica`; 
                ctx.fillStyle = '#091442'; 
            } else {
                ctx.font = `normal ${14 * scaleY}px Helvetica`; 
                ctx.fillStyle = '#404040'; 
            }
            ctx.fillText(line, 538 * scaleX, (315 + (i * 26)) * scaleY); 
        });

        const rows = document.querySelectorAll('.qt-item-row');
        let startY = 618; 
        ctx.fillStyle = '#0f172a';
        
        rows.forEach((row, i) => {
            const item = row.querySelector('.qt-item').value;
            const qty = row.querySelector('.qt-qty').value;
            const price = row.querySelector('.qt-price').value;
            const total = row.querySelector('.qt-total').value;
            
            ctx.font = `bold ${17 * scaleY}px Helvetica Bold`; 
            ctx.fillText(item, 120 * scaleX, (startY + (i * 50)) * scaleY);
            ctx.fillText(qty, 530 * scaleX, (startY + (i * 50)) * scaleY);
            if (price) ctx.fillText(`${price}/Pc`, 675 * scaleX, (startY + (i * 50)) * scaleY);
            ctx.fillText(total, 798 * scaleX, (startY + (i * 50)) * scaleY);
        });

        const grandTotalY = startY + (rows.length * 50) + 50; 
        ctx.font = `bold ${17 * scaleY}px Arial`; 
        ctx.fillText("GRAND TOTAL", 530 * scaleX, grandTotalY * scaleY);
        ctx.fillText(document.getElementById('qt_grand_total').textContent, 798 * scaleX, grandTotalY * scaleY);

        callback(canvas);
    };

    bgImg.onerror = () => {
        alert("Could not load 1000521341.jpg. Make sure the quotation template exists in the same folder.");
    };
};

export const generateAndSendQuotation = () => {
    const phone = prompt("Enter WhatsApp number to send this to (include country code, e.g., 971501234567):", "+971");
    if (phone === null) return; 

    generateQuotationCanvas((canvas) => {
        canvas.toBlob((blob) => {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Quotation_${(document.getElementById('qt_no').value || 'New').replace(/\//g, '-')}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (cleanPhone) {
                setTimeout(() => {
                    if(confirm('Quotation Saved to downloads! Open WhatsApp to attach and send?')) {
                        const message = encodeURIComponent("Please find the attached Quotation from NextWay Delivery.");
                        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
                    }
                }, 300);
            }
        }, 'image/jpeg', 0.95);
    });
};

export const printQuotation = () => {
    generateQuotationCanvas((canvas) => {
        const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
        
        let printContainer = document.getElementById('printableQuotationArea');
        if (!printContainer) {
            printContainer = document.createElement('div');
            printContainer.id = 'printableQuotationArea';
            printContainer.className = 'hidden bg-white';
            document.body.appendChild(printContainer);
        }
        
        printContainer.innerHTML = `<img src="${dataUrl}" style="width: 100%; max-width: 800px; height: auto; display: block; margin: 0 auto;" />`;
        
        document.querySelectorAll('.print-area').forEach(e => e.classList.remove('print-area'));
        
        printContainer.classList.remove('hidden');
        printContainer.classList.add('print-area');
        
        const img = printContainer.querySelector('img');
        const doPrint = () => {
            window.print();
            printContainer.classList.remove('print-area');
            printContainer.classList.add('hidden');
        };
        if (img.complete) doPrint(); else img.onload = doPrint;
    });
};
