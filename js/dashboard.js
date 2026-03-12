let salesChart = null;

async function updateDashboard() {
    try {
        const sales = await db.getAll('sales');
        const products = await db.getAll('products');

        // Today's Sales & Profit
        const today = new Date().toDateString();
        const todaySalesData = sales.filter(s => new Date(s.date).toDateString() === today);
        const todaySales = todaySalesData.reduce((sum, s) => sum + s.total, 0);
        const todayProfit = todaySalesData.reduce((sum, s) => sum + (s.profit || 0), 0);

        // Monthly Sales
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthSales = sales
            .filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, s) => sum + s.total, 0);

        // Low Stock
        const lowStock = products.filter(p => p.stock <= p.alert).length;

        // Update UI
        if (document.getElementById('today-sales')) document.getElementById('today-sales').textContent = todaySales.toFixed(2);
        if (document.getElementById('today-profit')) document.getElementById('today-profit').textContent = todayProfit.toFixed(2);
        if (document.getElementById('month-sales')) document.getElementById('month-sales').textContent = monthSales.toFixed(2);
        if (document.getElementById('total-products')) document.getElementById('total-products').textContent = products.length;
        if (document.getElementById('low-stock-count')) document.getElementById('low-stock-count').textContent = lowStock;

        renderSalesChart(sales);

    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

function renderSalesChart(sales) {
    const ctx = document.getElementById('sales-chart').getContext('2d');
    
    // Get last 7 days
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('ar-EG');
        labels.push(dateStr);
        
        const daySales = sales
            .filter(s => new Date(s.date).toDateString() === d.toDateString())
            .reduce((sum, s) => sum + s.total, 0);
        data.push(daySales);
    }

    if (salesChart) {
        salesChart.destroy();
    }

    if (typeof Chart !== 'undefined') {
        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'مبيعات آخر 7 أيام',
                    data: data,
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}
