// Firestore configuration (replace with your actual configuration)
const FIREBASE_API_URL = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents/";

// Function to download CSV file
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

// Fetch all products from the inventory collection
async function fetchAllProducts() {
    try {
        const response = await fetch(`${FIREBASE_API_URL}inventory?key=AIzaSyACYbXUmCW_alAqtx58q5kBgsD69FBJzNo`);
        const data = await response.json();

        // Convert fetched data to CSV format
        const csvData = [["Product ID", "Title", "Description", "Quantity", "Price", "Image"]];
        data.documents.forEach(item => {
            const product = item.fields;
            csvData.push([
                item.name.split('/').pop(), // Product ID
                product.title.stringValue,
                product.description.stringValue,
                product.quantity.integerValue,
                product.price.integerValue,
                product.image.stringValue
            ]);
        });

        downloadCSV(csvData, "all_inventory_report.csv");
    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

// Fetch categories from the categories collection
async function fetchCategories() {
    try {
        const response = await fetch(`${FIREBASE_API_URL}categories?key=AIzaSyACYbXUmCW_alAqtx58q5kBgsD69FBJzNo`);
        const data = await response.json();

        // Populate category dropdown
        const categoryInput = document.getElementById("categoryInput");
        categoryInput.innerHTML = ""; // Clear previous options
        data.documents.forEach(item => {
            const category = item.fields;
            const option = document.createElement("option");
            option.value = category.categoryId.stringValue; // Category ID
            option.textContent = category.name.stringValue;
            categoryInput.appendChild(option);
        });

        // Show category input and generate CSV button
        document.querySelector('.category-input-container').style.display = 'block';
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

// Fetch products by category
async function fetchProductsByCategory(categoryId) {
    try {
        const response = await fetch(`${FIREBASE_API_URL}inventory?key=AIzaSyACYbXUmCW_alAqtx58q5kBgsD69FBJzNo`);
        const data = await response.json();

        // Filter products by selected category
        const csvData = [["Product ID", "Title", "Description", "Quantity", "Price", "Image"]];
        data.documents.forEach(item => {
            const product = item.fields;
            // Check if the product's catId matches the selected categoryId
            if (product.catId && product.catId.stringValue === categoryId) {
                csvData.push([
                    item.name.split('/').pop(), // Product ID
                    product.title.stringValue,
                    product.description.stringValue,
                    product.quantity.integerValue,
                    product.price.integerValue,
                    product.image.stringValue
                ]);
            }
        });

        if (csvData.length > 1) { // If we have products
            downloadCSV(csvData, `inventory_report_category_${categoryId}.csv`);
        } else {
            alert("No products found for the selected category.");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

// Event listener for the Generate Report button
document.getElementById("submitBtn").addEventListener("click", () => {
    if (document.getElementById("allStock").checked) {
        fetchAllProducts();
    } else if (document.getElementById("categoryWiseStock").checked) {
        const selectedCategory = document.getElementById("categoryInput").value;
        if (selectedCategory) {
            fetchProductsByCategory(selectedCategory);
        } else {
            alert("Please select a category.");
        }
    }
});

// Fetch categories when the page loads
fetchCategories();
