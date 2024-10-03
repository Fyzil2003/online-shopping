// Firestore database URL
const firestoreUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents/";

// Select the inventory table body, category toggle, search input/button, and modal elements
const inventoryTableBody = document.getElementById('inventory-table-body');
const categoryToggle = document.getElementById('category-toggle');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const pageIndicator = document.getElementById('page-indicator');
const nextButton = document.getElementById('next-button');
const prevButton = document.getElementById('prev-button');

let inventoryData = []; // Array to hold all products
let categoriesMap = {}; // Map to hold category ID to name mapping
let currentPage = 1;
let rowsPerPage = 10; // Default value

// Fetch categories
async function fetchCategories() {
    try {
        const response = await fetch(`${firestoreUrl}categories`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const categories = data.documents || [];

        // Clear existing options
        categoryToggle.innerHTML = '<option value="">All Categories</option>'; // Default option

        categories.forEach(category => {
            const categoryId = category.fields.categoryId.stringValue; // Assuming 'categoryId' is your unique identifier
            const categoryName = category.fields.name.stringValue;

            const option = document.createElement('option');
            option.value = categoryId;
            option.textContent = categoryName;
            categoryToggle.appendChild(option);

            // Populate the categories map
            categoriesMap[categoryId] = categoryName; // Map category ID to category name
        });

        // Fetch inventory after categories are fetched
        fetchProducts();
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Function to fetch products
async function fetchProducts(categoryId = "", searchTerm = "") {
    try {
        const response = await fetch(`${firestoreUrl}inventory`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const products = data.documents || [];

        inventoryData = products.filter(product => {
            const matchesCategory = categoryId === "" || product.fields.catId.stringValue === categoryId; // Filter by category ID
            const matchesSearch = product.fields.title.stringValue.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  product.fields.description.stringValue.toLowerCase().includes(searchTerm.toLowerCase()); // Search by title or description
            return matchesCategory && matchesSearch;
        }).sort((a, b) => {
            return a.fields.inventoryId.stringValue.localeCompare(b.fields.inventoryId.stringValue); // Sort by inventory ID in ascending order
        });

        // Reset to the first page and render the table
        currentPage = 1;
        renderTable();
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Function to render the table based on current page and rows per page
function renderTable() {
    inventoryTableBody.innerHTML = ''; // Clear existing rows

    // Calculate start and end index for slicing data
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = inventoryData.slice(startIndex, endIndex); // Get only the products for the current page

    paginatedData.forEach(product => {
        const row = document.createElement('tr');

        const id = document.createElement('td');
        id.textContent = product.fields.inventoryId.stringValue; // Using inventoryId as ID

        const catId = document.createElement('td');
        const categoryId = product.fields.catId.stringValue;
        catId.textContent = categoriesMap[categoryId] || 'N/A'; // Display category name instead of ID

        const title = document.createElement('td');
        title.textContent = product.fields.title.stringValue;

        const description = document.createElement('td');
        description.textContent = product.fields.description.stringValue;

        const quantity = document.createElement('td');
        quantity.textContent = product.fields.quantity.integerValue; // Assuming quantity is stored as an integer

        const price = document.createElement('td');
        // Fetch the price field directly
        if (product.fields.price && typeof product.fields.price.doubleValue === 'number') {
            price.textContent = product.fields.price.doubleValue; // Accessing the price directly
        } else {
            price.textContent = 'N/A'; // Display 'N/A' if price is not available
            console.error('Price is missing or incorrectly formatted:', product);
        }

        const image = document.createElement('td');
        const imgElement = document.createElement('img');
        imgElement.src = product.fields.image.stringValue; // URL for the product image
        imgElement.alt = product.fields.title.stringValue;
        imgElement.style.width = '50px'; // Set width for the image
        image.appendChild(imgElement);

        const status = document.createElement('td');
        status.textContent = product.fields.status.stringValue; // Accessing status

        const actions = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = () => editProduct(product.fields.inventoryId.stringValue);
        actions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteProduct(product.fields.inventoryId.stringValue);
        actions.appendChild(deleteButton);

        // Append cells to the row
        row.appendChild(id);
        row.appendChild(catId);
        row.appendChild(title);
        row.appendChild(description);
        row.appendChild(quantity);
        row.appendChild(price);
        row.appendChild(image);
        row.appendChild(status);
        row.appendChild(actions);

        // Append the row to the table body
        inventoryTableBody.appendChild(row);
    });

    // Update the page indicator
    pageIndicator.textContent = `Page ${currentPage}`;

    // Toggle the visibility of pagination buttons
    prevButton.style.display = currentPage === 1 ? 'none' : 'inline-block';
    nextButton.style.display = (currentPage * rowsPerPage) >= inventoryData.length ? 'none' : 'inline-block';
}

// Function to open the edit modal and populate it with the product data
function editProduct(inventoryId) {
    const product = inventoryData.find(item => item.fields.inventoryId.stringValue === inventoryId);
    if (product) {
        document.getElementById('edit-inventory-id').value = product.fields.inventoryId.stringValue;
        document.getElementById('edit-title').value = product.fields.title.stringValue;
        document.getElementById('edit-description').value = product.fields.description.stringValue;
        document.getElementById('edit-quantity').value = product.fields.quantity.integerValue;
        document.getElementById('edit-price').value = product.fields.price.doubleValue; // Ensure price is fetched as a number
        document.getElementById('edit-image').value = product.fields.image.stringValue;
        document.getElementById('edit-status').value = product.fields.status.stringValue; // Populate the status field

        // Populate the category dropdown
        const categorySelect = document.getElementById('edit-cat-id');
        categorySelect.innerHTML = ''; // Clear existing options
        fetchCategoriesForEdit(categorySelect, product.fields.catId.stringValue); // Fetch categories and set selected category

        // Show the modal
        document.getElementById('edit-modal').style.display = 'block';
    }
}

// Function to fetch categories for the edit modal
async function fetchCategoriesForEdit(selectElement, selectedCategoryId) {
    try {
        const response = await fetch(`${firestoreUrl}categories`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const categories = data.documents || [];

        // Populate the select element
        categories.forEach(category => {
            const categoryId = category.fields.categoryId.stringValue;
            const categoryName = category.fields.name.stringValue;

            const option = document.createElement('option');
            option.value = categoryId;
            option.textContent = categoryName;
            if (categoryId === selectedCategoryId) {
                option.selected = true; // Set the selected category
            }
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching categories for edit:', error);
    }
}

// Function to handle the update product form submission
document.getElementById('edit-product-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent form submission
    const inventoryId = document.getElementById('edit-inventory-id').value;
    const updatedProduct = {
        fields: {
            inventoryId: { stringValue: inventoryId },
            title: { stringValue: document.getElementById('edit-title').value },
            description: { stringValue: document.getElementById('edit-description').value },
            quantity: { integerValue: parseInt(document.getElementById('edit-quantity').value) },
            price: { doubleValue: parseFloat(document.getElementById('edit-price').value) }, // Ensure price is parsed as a number
            image: { stringValue: document.getElementById('edit-image').value },
            status: { stringValue: document.getElementById('edit-status').value },
            catId: { stringValue: document.getElementById('edit-cat-id').value } // Fetch selected category
        }
    };

    // Update the product in Firestore
    try {
        const response = await fetch(`${firestoreUrl}inventory/${inventoryId}?updateMask.fieldPaths=title&updateMask.fieldPaths=description&updateMask.fieldPaths=quantity&updateMask.fieldPaths=price&updateMask.fieldPaths=image&updateMask.fieldPaths=status&updateMask.fieldPaths=catId`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Hide the modal and refresh the inventory list
        document.getElementById('edit-modal').style.display = 'none';
        fetchProducts(); // Refresh the product list after editing
    } catch (error) {
        console.error('Error updating product:', error);
    }
});

// Function to handle delete product
async function deleteProduct(inventoryId) {
    if (confirm("Are you sure you want to delete this product?")) {
        try {
            // Step 1: Fetch the product details before deletion
            const productResponse = await fetch(`${firestoreUrl}inventory/${inventoryId}`);
            if (!productResponse.ok) {
                throw new Error(`Failed to fetch product details: ${productResponse.statusText}`);
            }
            const productData = await productResponse.json();

            // Extract the necessary fields for the deleted products collection
            const deletedProductData = {
                fields: {
                    catId: { stringValue: productData.fields.catId.stringValue || "" }, // Set default value if unset
                    description: { stringValue: productData.fields.description.stringValue || "" },
                    image: { stringValue: productData.fields.image.stringValue || "" },
                    inventoryId: { stringValue: inventoryId }, // Keep the same inventory ID
                    price: { integerValue: productData.fields.price.integerValue || 0 },
                    quantity: { integerValue: productData.fields.quantity.integerValue || 0 },
                    status: { stringValue: productData.fields.status.stringValue || "" },
                    title: { stringValue: productData.fields.title.stringValue || "" },
                    deletedAt: { stringValue: new Date().toISOString() } // Track when it was deleted
                }
            };

            // Step 2: Delete the product from the inventory collection
            const deleteResponse = await fetch(`${firestoreUrl}inventory/${inventoryId}`, {
                method: 'DELETE'
            });

            if (!deleteResponse.ok) {
                throw new Error(`HTTP error while deleting product: ${deleteResponse.statusText}`);
            }

            // Step 3: Store the deleted product in the deleted products collection
            const deletedProductUrl = `https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents/deleted_products/${inventoryId}`;

            const deletedProductResponse = await fetch(deletedProductUrl, {
                method: 'PATCH', // Use PATCH instead of PUT
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deletedProductData) // Send the formatted data as JSON
            });

            // Log the response to debug
            console.log('Response from storing deleted product:', deletedProductResponse);
            if (!deletedProductResponse.ok) {
                const errorText = await deletedProductResponse.text();
                throw new Error(`Failed to store deleted product: ${deletedProductResponse.statusText}. Error: ${errorText}`);
            }

            // Optionally log a success message
            console.log('Product deleted and stored in deleted products collection successfully.');

            // Refresh the inventory list after deletion
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }
}










// Function to handle category toggle change
categoryToggle.addEventListener('change', () => {
    fetchProducts(categoryToggle.value, searchInput.value); // Fetch products with selected category
});

// Function to handle search button click
searchButton.addEventListener('click', () => {
    fetchProducts(categoryToggle.value, searchInput.value); // Fetch products with search term
});

// Function to handle next page button click
nextButton.addEventListener('click', () => {
    if ((currentPage * rowsPerPage) < inventoryData.length) {
        currentPage++;
        renderTable();
    }
});

// Function to handle previous page button click
prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

// Initial fetch
fetchCategories();
