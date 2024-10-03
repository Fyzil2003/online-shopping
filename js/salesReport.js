// Firestore configuration
const FIREBASE_API_URL = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents/";

// Function to fetch categories for category-wise filtering
async function fetchCategories() {
    const response = await fetch(`${FIREBASE_API_URL}categories?key=API_KEY`);
    const data = await response.json();
    return data.documents.map(doc => ({
        id: doc.fields.categoryId.stringValue,
        name: doc.fields.name.stringValue,
    }));
}

// Fetch all orders from the orders collection
async function fetchOrders() {
    const response = await fetch(`${FIREBASE_API_URL}orders?key=API_KEY`);
    const data = await response.json();
    return data.documents.map(doc => ({
        orderDate: new Date(doc.fields.orderDate.timestampValue),
        productId: doc.fields.productId.stringValue,
        quantity: doc.fields.quantity.integerValue,
        totalAmount: doc.fields.totalAmount.integerValue,
        paymentType: doc.fields.paymentType.stringValue,
        uid: doc.fields.uid.stringValue,
    }));
}

// Fetch inventory data to map product details (title, category, price)
async function fetchInventory() {
    const response = await fetch(`${FIREBASE_API_URL}inventory?key=API_KEY`);
    const data = await response.json();
    return data.documents.map(doc => ({
        inventoryId: doc.fields.inventoryId.stringValue,
        title: doc.fields.title.stringValue,
        catId: doc.fields.catId.stringValue,
        price: doc.fields.price.integerValue,
        quantity: doc.fields.quantity.integerValue,
    }));
}

// Populate categories in dropdown for category-wise report
async function loadCategories() {
    const categories = await fetchCategories();
    const categorySelect = document.getElementById('category');
    
    categorySelect.innerHTML = ''; // Clear existing options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.text = category.name;
        categorySelect.appendChild(option);
    });
}

// Filter orders based on selected date range
function filterByDate(orders, fromDate, toDate) {
    return orders.filter(order => order.orderDate >= fromDate && order.orderDate <= toDate);
}

// Download CSV file
function downloadCSV(data, filename) {
    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate the sales report based on user selections
async function generateSalesReport() {
    const fromDate = new Date(document.getElementById("fromDate").value);
    const toDate = new Date(document.getElementById("toDate").value);
    const reportType = document.getElementById("reportType").value;

    const orders = await fetchOrders();
    const inventory = await fetchInventory();

    let filteredOrders = filterByDate(orders, fromDate, toDate);
    let reportData = [["Order Date", "Product Title", "Quantity", "Total Amount", "Payment Type"]];

    if (reportType === "categoryWise") {
        const selectedCategoryId = document.getElementById("category").value;
        filteredOrders = filteredOrders.filter(order => {
            const product = inventory.find(item => item.inventoryId === order.productId);
            return product && product.catId === selectedCategoryId;
        });
    } else if (reportType === "cashWise" || reportType === "creditWise") {
        filteredOrders = filteredOrders.filter(order => order.paymentType === reportType.replace("Wise", ""));
    }

    // Generate CSV data
    filteredOrders.forEach(order => {
        const product = inventory.find(item => item.inventoryId === order.productId);
        if (product) {
            reportData.push([
                order.orderDate.toLocaleString(),
                product.title,
                order.quantity,
                order.totalAmount,
                order.paymentType
            ]);
        }
    });

    downloadCSV(reportData, `${reportType}_sales_report.csv`);
}

// Toggle category selection based on report type
document.getElementById("reportType").addEventListener("change", async function () {
    const reportType = this.value;
    const categoryToggle = document.getElementById("categoryToggle");

    if (reportType === "categoryWise") {
        categoryToggle.style.display = "block"; // Show category dropdown
        await loadCategories(); // Load categories from Firestore
    } else {
        categoryToggle.style.display = "none"; // Hide category dropdown
    }
});

// Generate report on button click
document.getElementById("generateReportBtn").addEventListener("click", generateSalesReport);
