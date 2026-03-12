async function loadSales() {
    try {
        const sales = await db.getAll('sales');
        // Sort by date desc
        sales.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderSalesTable(sales);
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

function renderSalesTable(sales) {
    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = '';

    sales.forEach(sale => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${sale.id}</td>
            <td>${new Date(sale.date).toLocaleString()}</td>
            <td>${sale.total.toFixed(2)}</td>
            <td>${sale.paymentMethod === 'cash' ? 'نقداً' : 'بطاقة'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="showInvoice(${sale.id})"><i class="fas fa-eye"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.showInvoice = async function(id) {
    const sale = await db.getById('sales', id);
    if (!sale) return;

    const details = document.getElementById('invoice-details');
    details.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <h4>فاتورة #${sale.id}</h4>
            <p>${new Date(sale.date).toLocaleString()}</p>
        </div>
        <table style="width:100%; margin-bottom:20px;">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>المجموع</th>
                </tr>
            </thead>
            <tbody>
                ${sale.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.qty}</td>
                        <td>${item.price}</td>
                        <td>${(item.qty * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="text-align:left; font-weight:bold; font-size:1.2rem;">
            المجموع: ${sale.total.toFixed(2)}
        </div>
    `;

    document.getElementById('invoice-modal').style.display = 'flex';
    
    // Bind print button
    document.getElementById('print-invoice-btn').onclick = () => {
        generateInvoice(sale.id, sale, sale.total, 0); // Re-print
    };
}
