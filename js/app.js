document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Database
    try {
        await db.init();
        console.log('App initialized');
        
        // Load initial data
        loadProducts();
        loadSales();
        updateDashboard();
        loadSettings();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('حدث خطأ أثناء تشغيل التطبيق. يرجى تحديث الصفحة.');
    }

    // Navigation Logic
    const navItems = document.querySelectorAll('.sidebar nav ul li');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));
            // Show target section
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // F1: Focus Search
        if (e.key === 'F1') {
            e.preventDefault();
            document.getElementById('pos-search').focus();
        }
        // F2: Open Scanner
        if (e.key === 'F2') {
            e.preventDefault();
            document.getElementById('scan-btn').click();
        }
        // F4: Checkout
        if (e.key === 'F4') {
            e.preventDefault();
            if (cart.length > 0) {
                document.getElementById('checkout-btn').click();
            }
        }
        // ESC: Close Modals
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Modal Close Logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    };

    // Dark Mode Logic
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> <span>الوضع النهاري</span>';
    }

    darkModeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> <span>الوضع الليلي</span>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> <span>الوضع النهاري</span>';
        }
    });

    // Logo Logic
    const logoInput = document.getElementById('store-logo-input');
    const logoPreview = document.getElementById('store-logo-preview');
    window.currentStoreLogo = '';

    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                window.currentStoreLogo = event.target.result;
                logoPreview.src = window.currentStoreLogo;
            };
            reader.readAsDataURL(file);
        }
    });

    // Settings Logic
    const storeForm = document.getElementById('store-settings-form');
    if (storeForm) {
        storeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settings = {
                name: document.getElementById('store-name').value,
                address: document.getElementById('store-address').value,
                phone: document.getElementById('store-phone').value,
                logo: window.currentStoreLogo
            };
            
            await db.update('settings', { key: 'store_info', value: settings });
            alert('تم حفظ الإعدادات بنجاح');
        });
    }

    // Backup Logic
    document.getElementById('export-db-btn').addEventListener('click', async () => {
        const data = await db.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    document.getElementById('import-db-btn').addEventListener('click', () => {
        document.getElementById('import-db-file').click();
    });

    document.getElementById('import-db-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                await db.importData(event.target.result);
                alert('تم استيراد البيانات بنجاح. سيتم تحديث الصفحة.');
                location.reload();
            } catch (error) {
                console.error('Import error:', error);
                alert('حدث خطأ أثناء استيراد البيانات.');
            }
        };
        reader.readAsText(file);
    });

    // Mobile Cart Toggle
    const cartHeader = document.querySelector('.cart-header');
    const cartArea = document.querySelector('.cart-area');
    
    if (cartHeader && cartArea) {
        cartHeader.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                cartArea.classList.toggle('expanded');
            }
        });
    }
});

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    // Stop scanner if active
    if (window.scannerReader) {
        window.scannerReader.reset();
        window.scannerReader = null;
    }
}

async function loadSettings() {
    try {
        const storeInfo = await db.getById('settings', 'store_info');
        if (storeInfo && storeInfo.value) {
            document.getElementById('store-name').value = storeInfo.value.name || '';
            document.getElementById('store-address').value = storeInfo.value.address || '';
            document.getElementById('store-phone').value = storeInfo.value.phone || '';
            if (storeInfo.value.logo) {
                document.getElementById('store-logo-preview').src = storeInfo.value.logo;
                window.currentStoreLogo = storeInfo.value.logo;
            }
        }
    } catch (e) {
        console.log('No settings found');
    }
}
