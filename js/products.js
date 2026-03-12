let allProducts = [];
let currentProductImage = '';

async function loadProducts() {
    try {
        allProducts = await db.getAll('products');
        renderProductsTable(allProducts);
        renderPOSProducts(allProducts);
        updateCategoriesList(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductsTable(products) {
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = '';

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${product.image || 'https://via.placeholder.com/50'}" width="50" height="50" style="object-fit:cover; border-radius:4px;"></td>
            <td>${product.name}</td>
            <td>${product.barcode}</td>
            <td>${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateCategoriesList(products) {
    const categories = [...new Set(products.map(p => p.category).filter(c => c))];
    const datalist = document.getElementById('categories-list');
    datalist.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        datalist.appendChild(option);
    });

    // Update POS filters
    const filterContainer = document.getElementById('categories-filter');
    // Keep "All" button
    filterContainer.innerHTML = '<button class="filter-btn active" data-category="all">الكل</button>';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.category = cat;
        btn.textContent = cat;
        btn.onclick = () => filterPOSProducts(cat);
        filterContainer.appendChild(btn);
    });

    // Re-attach event listener for "All"
    filterContainer.querySelector('[data-category="all"]').onclick = () => filterPOSProducts('all');
}

// Add Product Modal
document.getElementById('add-product-btn').addEventListener('click', () => {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    currentProductImage = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('product-image-preview').src = '';
    document.getElementById('product-modal-title').textContent = 'إضافة منتج';
    document.getElementById('product-modal').style.display = 'flex';
});

// Handle image upload
document.getElementById('product-image-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        currentProductImage = event.target.result;
        const preview = document.getElementById('product-image-preview');
        preview.src = currentProductImage;
        document.getElementById('image-preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
});

// Handle image removal
document.getElementById('remove-image-btn').addEventListener('click', function() {
    currentProductImage = '';
    document.getElementById('product-image-input').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('product-image-preview').src = '';
});

// Generate Barcode
document.getElementById('generate-barcode-btn').addEventListener('click', () => {
    const random = Math.floor(Math.random() * 1000000000000);
    document.getElementById('product-barcode').value = random.toString().padStart(12, '0');
});

// Save Product
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('product-id').value;
    const product = {
        name: document.getElementById('product-name').value,
        barcode: document.getElementById('product-barcode').value,
        price: parseFloat(document.getElementById('product-price').value),
        cost: parseFloat(document.getElementById('product-cost').value) || 0,
        stock: parseInt(document.getElementById('product-stock').value),
        alert: parseInt(document.getElementById('product-alert').value) || 5,
        category: document.getElementById('product-category').value,
        image: currentProductImage || 'https://via.placeholder.com/150'
    };

    if (!product.name || !product.barcode || isNaN(product.price) || isNaN(product.stock)) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    try {
        if (id) {
            product.id = parseInt(id);
            await db.update('products', product);
        } else {
            // Check barcode uniqueness
            const existing = await db.getByIndex('products', 'barcode', product.barcode);
            if (existing) {
                alert('الباركود موجود بالفعل');
                return;
            }
            await db.add('products', product);
        }
        
        document.getElementById('product-modal').style.display = 'none';
        loadProducts();
        updateDashboard();
        alert('تم حفظ المنتج بنجاح');
    } catch (error) {
        console.error('Error saving product:', error);
        alert('حدث خطأ أثناء حفظ المنتج');
    }
});

window.editProduct = async function(id) {
    const product = await db.getById('products', id);
    if (!product) return;

    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-barcode').value = product.barcode;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-cost').value = product.cost;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-alert').value = product.alert;
    document.getElementById('product-category').value = product.category;
    
    currentProductImage = product.image || '';
    if (currentProductImage && currentProductImage !== 'https://via.placeholder.com/150') {
        document.getElementById('product-image-preview').src = currentProductImage;
        document.getElementById('image-preview-container').style.display = 'block';
    } else {
        document.getElementById('image-preview-container').style.display = 'none';
    }
    
    document.getElementById('product-modal-title').textContent = 'تعديل منتج';
    document.getElementById('product-modal').style.display = 'flex';
}

window.deleteProduct = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            await db.delete('products', id);
            loadProducts();
            updateDashboard();
            alert('تم حذف المنتج بنجاح');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('حدث خطأ أثناء حذف المنتج');
        }
    }
}
