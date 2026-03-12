class POSDatabase {
    constructor() {
        this.dbName = 'pos_db';
        this.dbVersion = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Products Store
                if (!db.objectStoreNames.contains('products')) {
                    const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productsStore.createIndex('barcode', 'barcode', { unique: true });
                    productsStore.createIndex('category', 'category', { unique: false });
                    productsStore.createIndex('name', 'name', { unique: false });
                }

                // Sales Store
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('date', 'date', { unique: false });
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Parked Sales Store
                if (!db.objectStoreNames.contains('parked_sales')) {
                    db.createObjectStore('parked_sales', { keyPath: 'id', autoIncrement: true });
                }

                // Stock Logs Store
                if (!db.objectStoreNames.contains('stock_logs')) {
                    const stockLogsStore = db.createObjectStore('stock_logs', { keyPath: 'id', autoIncrement: true });
                    stockLogsStore.createIndex('productId', 'productId', { unique: false });
                    stockLogsStore.createIndex('date', 'date', { unique: false });
                }

                // Customers Store
                if (!db.objectStoreNames.contains('customers')) {
                    const customersStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                    customersStore.createIndex('phone', 'phone', { unique: true });
                }
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Export DB to JSON
    async exportData() {
        const products = await this.getAll('products');
        const sales = await this.getAll('sales');
        const settings = await this.getAll('settings');
        
        return JSON.stringify({
            products,
            sales,
            settings,
            exportDate: new Date().toISOString()
        });
    }

    // Import DB from JSON
    async importData(jsonData) {
        const data = JSON.parse(jsonData);
        
        if (data.products) {
            await this.clear('products');
            for (const p of data.products) await this.add('products', p);
        }
        
        if (data.sales) {
            await this.clear('sales');
            for (const s of data.sales) await this.add('sales', s);
        }
        
        if (data.settings) {
            await this.clear('settings');
            for (const s of data.settings) await this.add('settings', s);
        }
        
        return true;
    }
}

const db = new POSDatabase();
