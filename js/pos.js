let cart = [];
let currentCategory = 'all';
let isRefundMode = false;

function renderPOSProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const filtered = currentCategory === 'all' 
        ? products 
        : products.filter(p => p.category === currentCategory);

    const searchTerm = document.getElementById('pos-search').value.toLowerCase();
    const searched = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.barcode.includes(searchTerm)
    );

    searched.forEach(product => {
        const card = document.createElement('div');
        const isLowStock = product.stock <= product.alert;
        card.className = `product-card ${isLowStock ? 'low-stock' : ''}`;
        card.onclick = () => addToCart(product);
        
        const stockStatus = isLowStock 
            ? '<span class="stock-badge low">منخفض</span>' 
            : '<span class="stock-badge available">متوفر</span>';

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/150'}" alt="${product.name}" loading="lazy">
                ${stockStatus}
            </div>
            <div class="product-details">
                <h4 title="${product.name}">${product.name}</h4>
                <div class="product-meta">
                    <div class="price">${parseFloat(product.price).toFixed(2)} <small>ر.س</small></div>
                    <div class="stock-count">الكمية: ${product.stock}</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterPOSProducts(category) {
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) btn.classList.add('active');
    });

    renderPOSProducts(allProducts);
}

document.getElementById('pos-search').addEventListener('input', () => {
    renderPOSProducts(allProducts);
});

function addToCart(product) {
    if (!isRefundMode && product.stock <= 0) {
        playSound('error');
        alert('المنتج نفذ من المخزون');
        return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
        if (!isRefundMode && existingItem.qty >= product.stock) {
            playSound('error');
            alert('لا توجد كمية كافية');
            return;
        }
        existingItem.qty += isRefundMode ? -1 : 1;
    } else {
        cart.push({ product, qty: isRefundMode ? -1 : 1 });
    }

    playSound('success');
    if (navigator.vibrate) navigator.vibrate(50);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.product.price * item.qty;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div style="font-weight:bold;">${item.product.name}</div>
                <div style="font-size:0.8rem;color:#777;">${item.product.price} x ${item.qty}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                <button class="btn-icon" style="color:#e74c3c;margin-right:5px;" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('cart-total').textContent = total.toFixed(2);
}

function updateCartQty(index, change) {
    const item = cart[index];
    const newQty = item.qty + change;

    if (newQty > item.product.stock) {
        playSound('error');
        alert('لا توجد كمية كافية');
        return;
    }

    if (newQty <= 0) {
        removeFromCart(index);
    } else {
        item.qty = newQty;
        renderCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

document.getElementById('clear-cart-btn').addEventListener('click', () => {
    if (confirm('هل تريد إفراغ السلة؟')) {
        cart = [];
        renderCart();
    }
});

// New Invoice Logic
function startNewInvoice() {
    if (cart.length > 0) {
        if (!confirm('هل تريد بدء فاتورة جديدة؟ سيتم مسح السلة الحالية.')) {
            return;
        }
    }
    cart = [];
    renderCart();
    
    // Reset search and filters
    document.getElementById('pos-search').value = '';
    currentCategory = 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'all') btn.classList.add('active');
    });
    renderPOSProducts(allProducts);
    
    // Switch to POS section
    const posNavItem = document.querySelector('li[data-target="pos-section"]');
    if (posNavItem) posNavItem.click();
    
    playSound('success');
}

document.getElementById('new-invoice-btn').addEventListener('click', startNewInvoice);
document.getElementById('new-invoice-from-sales').addEventListener('click', startNewInvoice);

// Checkout Logic
document.getElementById('checkout-btn').addEventListener('click', () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
    document.getElementById('checkout-total').textContent = total.toFixed(2);
    document.getElementById('amount-paid').value = '';
    document.getElementById('checkout-discount').value = '0';
    document.getElementById('change-amount').textContent = '0.00';
    document.getElementById('checkout-modal').style.display = 'flex';
    
    // Default to cash
    selectPaymentMethod('cash');
    setTimeout(() => document.getElementById('amount-paid').focus(), 100);
});

document.getElementById('checkout-discount').addEventListener('input', () => {
    updateChange();
});

document.getElementById('amount-paid').addEventListener('input', () => {
    updateChange();
});

function updateChange() {
    const total = parseFloat(document.getElementById('checkout-total').textContent);
    const discount = parseFloat(document.getElementById('checkout-discount').value) || 0;
    const paid = parseFloat(document.getElementById('amount-paid').value) || 0;
    
    const finalTotal = total - discount;
    const change = paid - finalTotal;
    
    document.getElementById('change-amount').textContent = change.toFixed(2);
}

let paymentMethod = 'cash';
document.querySelectorAll('.payment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectPaymentMethod(btn.dataset.method);
    });
});

function selectPaymentMethod(method) {
    paymentMethod = method;
    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.payment-btn[data-method="${method}"]`).classList.add('active');
    
    const cashInput = document.getElementById('cash-input-area');
    if (method === 'cash') {
        cashInput.style.display = 'block';
    } else {
        cashInput.style.display = 'none';
    }
}

// Quick Cash Functions
window.quickPay = function(amount) {
    if (cart.length === 0) return;
    document.getElementById('checkout-btn').click();
    document.getElementById('amount-paid').value = amount;
    document.getElementById('amount-paid').dispatchEvent(new Event('input'));
};

window.addAmount = function(value) {
    const input = document.getElementById('amount-paid');
    const current = parseFloat(input.value) || 0;
    input.value = current + value;
    input.dispatchEvent(new Event('input'));
};

window.clearAmount = function() {
    const input = document.getElementById('amount-paid');
    input.value = '';
    input.dispatchEvent(new Event('input'));
};

document.getElementById('confirm-checkout-btn').addEventListener('click', async () => {
    const total = parseFloat(document.getElementById('checkout-total').textContent);
    const discount = parseFloat(document.getElementById('checkout-discount').value) || 0;
    const finalTotal = total - discount;
    const paid = parseFloat(document.getElementById('amount-paid').value) || 0;

    if (paymentMethod === 'cash' && paid < finalTotal) {
        alert('المبلغ المدفوع غير كافٍ');
        return;
    }

    const totalCost = cart.reduce((sum, item) => sum + (parseFloat(item.product.cost || 0) * item.qty), 0);
    const profit = finalTotal - totalCost;

    const sale = {
        date: new Date().toISOString(),
        items: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            qty: item.qty,
            cost: item.product.cost
        })),
        total: finalTotal,
        discount: discount,
        profit: profit,
        paymentMethod: paymentMethod,
        cashier: 'Admin' // Could be dynamic
    };

    try {
        // Save Sale
        const saleId = await db.add('sales', sale);

        // Update Stock
        for (const item of cart) {
            const product = await db.getById('products', item.product.id);
            product.stock -= item.qty;
            await db.update('products', product);
        }

        // Print Invoice (Simulated)
        generateInvoice(saleId, sale, paid, paid - total);

        // Reset
        cart = [];
        renderCart();
        document.getElementById('checkout-modal').style.display = 'none';
        loadProducts(); // Refresh stock
        loadSales(); // Refresh sales list
        updateDashboard();
        
        playSound('success');
        alert('تمت عملية البيع بنجاح');
    } catch (error) {
        console.error('Checkout error:', error);
        alert('حدث خطأ أثناء عملية البيع');
    }
});

// Park Sale
document.getElementById('park-sale-btn').addEventListener('click', async () => {
    if (cart.length === 0) return;
    
    const sale = {
        date: new Date().toISOString(),
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0)
    };

    await db.add('parked_sales', sale);
    cart = [];
    renderCart();
    alert('تم تعليق البيع');
});

// Refund Mode Toggle
document.getElementById('refund-mode-btn').addEventListener('click', () => {
    isRefundMode = !isRefundMode;
    const btn = document.getElementById('refund-mode-btn');
    if (isRefundMode) {
        btn.classList.add('active');
        btn.style.border = '2px solid #c0392b';
        document.body.style.borderTop = '5px solid #e74c3c';
    } else {
        btn.classList.remove('active');
        btn.style.border = 'none';
        document.body.style.borderTop = 'none';
    }
});

// View Parked Sales
document.getElementById('view-parked-btn').addEventListener('click', async () => {
    const parkedSales = await db.getAll('parked_sales');
    const list = document.getElementById('parked-sales-list');
    list.innerHTML = '';

    if (parkedSales.length === 0) {
        list.innerHTML = '<p style="text-align:center;">لا يوجد مبيعات معلقة</p>';
    } else {
        parkedSales.forEach(sale => {
            const div = document.createElement('div');
            div.style.borderBottom = '1px solid #eee';
            div.style.padding = '10px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.innerHTML = `
                <div>
                    <strong>${new Date(sale.date).toLocaleString()}</strong><br>
                    <span>${sale.items.length} منتجات - ${sale.total.toFixed(2)}</span>
                </div>
                <div>
                    <button class="btn btn-success btn-sm" onclick="restoreParkedSale(${sale.id})">استرجاع</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteParkedSale(${sale.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(div);
        });
    }
    document.getElementById('parked-sales-modal').style.display = 'flex';
});

window.restoreParkedSale = async function(id) {
    const sale = await db.getById('parked_sales', id);
    if (sale) {
        cart = sale.items;
        renderCart();
        await db.delete('parked_sales', id);
        document.getElementById('parked-sales-modal').style.display = 'none';
        playSound('success');
    }
}

window.deleteParkedSale = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا البيع المعلق؟')) {
        await db.delete('parked_sales', id);
        document.getElementById('view-parked-btn').click(); // Refresh list
    }
}

// Scanner Logic
document.getElementById('scan-btn').addEventListener('click', () => {
    document.getElementById('scanner-modal').style.display = 'flex';
    document.getElementById('manual-barcode').value = '';
    startScanner();
});

document.getElementById('submit-manual-barcode').addEventListener('click', () => {
    const barcode = document.getElementById('manual-barcode').value.trim();
    if (barcode) {
        const product = allProducts.find(p => p.barcode === barcode);
        if (product) {
            addToCart(product);
            playSound('success');
            document.getElementById('manual-barcode').value = '';
            // Optional: close modal?
            // closeAllModals();
        } else {
            playSound('error');
            alert('المنتج غير موجود: ' + barcode);
        }
    }
});

document.getElementById('manual-barcode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('submit-manual-barcode').click();
    }
});

let isTorchOn = false;
document.getElementById('toggle-torch-btn').addEventListener('click', async () => {
    if (!window.scannerReader) return;
    
    try {
        const videoElement = document.getElementById('scanner-video');
        const stream = videoElement.srcObject;
        if (!stream) return;
        
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            isTorchOn = !isTorchOn;
            await track.applyConstraints({
                advanced: [{ torch: isTorchOn }]
            });
            
            const btn = document.getElementById('toggle-torch-btn');
            if (isTorchOn) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-lightbulb"></i>';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-lightbulb"></i>';
            }
        } else {
            alert('الفلاش غير مدعوم على هذا الجهاز');
        }
    } catch (err) {
        console.error('Torch error:', err);
    }
});

async function startScanner() {
    // Explicitly define formats to improve speed and accuracy
    const hints = new Map();
    const formats = [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.QR_CODE
    ];
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    const codeReader = new ZXing.BrowserMultiFormatReader(hints);
    window.scannerReader = codeReader;
    
    const constraints = {
        video: {
            facingMode: { exact: "environment" },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
        }
    };

    try {
        console.log('Starting scanner with constraints:', constraints);

        // Try environment camera first, fallback to default if it fails (e.g. on desktop)
        try {
            await codeReader.decodeFromConstraints(constraints, 'scanner-video', (result, err) => {
                handleScannerResult(result, err);
            });
        } catch (e) {
            console.warn('Facing mode environment failed, falling back to default camera', e);
            await codeReader.decodeFromConstraints({ video: true }, 'scanner-video', (result, err) => {
                handleScannerResult(result, err);
            });
        }
    } catch (err) {
        console.error('Scanner initialization error:', err);
        alert('تعذر تشغيل الماسح. تأكد من منح صلاحية الكاميرا وتوفرها.');
        closeAllModals();
    }
}

function handleScannerResult(result, err) {
    if (result) {
        const barcode = result.text;
        console.log('Barcode detected:', barcode);
        
        const product = allProducts.find(p => p.barcode === barcode);
        
        if (product) {
            addToCart(product);
            playSound('success');
            // Provide visual feedback
            const container = document.getElementById('scanner-container');
            container.style.borderColor = '#2ecc71';
            setTimeout(() => container.style.borderColor = 'transparent', 500);
            
            // On success, we might want to pause briefly to avoid double scans
            // but ZXing handles this fairly well.
        } else {
            // Only play error sound if it's a clear read but product not found
            // Don't alert to avoid interrupting the flow
            console.warn('Product not found for barcode:', barcode);
            const container = document.getElementById('scanner-container');
            container.style.borderColor = '#e74c3c';
            setTimeout(() => container.style.borderColor = 'transparent', 500);
        }
    }
    // ZXing throws NotFoundException constantly while scanning, we ignore it
    if (err && !(err instanceof ZXing.NotFoundException)) {
        // Check for specific errors that might indicate the stream stopped
        if (err.name === 'NotReadableError') {
            console.error('Camera stream lost');
        }
    }
}

// Sound Effects
function playSound(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);
    }
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.stop(ctx.currentTime + 0.2);
}

// Invoice Generation
async function generateInvoice(id, sale, paid, change) {
    const storeName = document.getElementById('store-name').value || 'نقطة بيع';
    const storeAddress = document.getElementById('store-address').value || '';
    const storePhone = document.getElementById('store-phone').value || '';
    
    const date = new Date(sale.date).toLocaleString('ar-EG');
    
    let itemsHtml = '';
    sale.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td style="text-align: right;">${item.name}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: left;">${(item.qty * item.price).toFixed(2)}</td>
            </tr>
        `;
    });

    const invoiceHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة رقم #${id}</title>
            <style>
                body { font-family: 'Tahoma', sans-serif; padding: 10px; width: 80mm; margin: 0 auto; background: #fff; }
                .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .details { margin-bottom: 10px; font-size: 12px; }
                table { width: 100%; font-size: 12px; border-collapse: collapse; }
                th { border-bottom: 1px solid #000; padding: 5px 0; }
                td { padding: 5px 0; }
                .totals { margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; font-size: 14px; }
                .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { margin: 0; padding: 5mm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>${storeName}</h3>
                <p>${storeAddress}</p>
                <p>${storePhone}</p>
            </div>
            <div class="details">
                <p>رقم الفاتورة: #${id}</p>
                <p>التاريخ: ${date}</p>
                <p>الكاشير: ${sale.cashier || 'Admin'}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="text-align: right;">الصنف</th>
                        <th style="text-align: center;">الكمية</th>
                        <th style="text-align: left;">السعر</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div class="totals">
                <div style="display: flex; justify-content: space-between;">
                    <strong>المجموع:</strong>
                    <span>${sale.total.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>المدفوع:</span>
                    <span>${paid.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>الباقي:</span>
                    <span>${change.toFixed(2)}</span>
                </div>
            </div>
            <div class="footer">
                <p>شكراً لزيارتكم</p>
                <p>نظام نقاط البيع</p>
            </div>
            <script>
                window.onload = function() { window.print(); setTimeout(() => window.close(), 1000); }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
    } else {
        alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
    }
}
