// Firebase API details (Firestore and Storage)
const baseUrl = `https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents`;
const storageBaseUrl = `https://firebasestorage.googleapis.com/v0/b/online-shopping-c8e51.appspot.com/o`;

// API key for Firestore access
const apiKey = "AIzaSyACYbXUmCW_alAqtx58q5kBgsD69FBJzNo";

// Logout Functionality (Using Firebase Auth REST API)
document.getElementById('logout-button').addEventListener('click', async (event) => {
    event.preventDefault();
    try {
        alert('You have logged out successfully.');
        window.location.href = "index.html"; // Redirect to the login page
    } catch (error) {
        console.error('Error during logout:', error);
    }
});

// Show modal for creating category
const categoryModal = document.getElementById("category-modal");
const createCategoryBtn = document.getElementById("create-category");
const closeModalBtn = document.querySelector(".close-btn");

// Form reference for category creation
const categoryForm = document.getElementById("category-form");

createCategoryBtn.addEventListener("click", () => {
    categoryModal.style.display = "block";
});

closeModalBtn.addEventListener("click", () => {
    categoryModal.style.display = "none";
});

// Handle category creation form submission (Firestore API)
categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get the category name from the form
    const categoryName = document.getElementById("category-name").value;

    try {
        // Send POST request to Firestore API to create a new category
        const response = await fetch(`${baseUrl}/categories?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    name: { stringValue: categoryName }
                }
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const docId = responseData.name.split("/").pop(); // Extract the document ID

            // Now we send a PATCH request to add the document ID as the categoryId and store categoryName
            await fetch(`${baseUrl}/categories/${docId}?key=${apiKey}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fields: {
                        categoryId: { stringValue: docId },
                        name: { stringValue: categoryName } // Store category name too
                    }
                })
            });

            alert("Category created successfully!");
            categoryModal.style.display = "none";
            categoryForm.reset();
        } else {
            alert("Failed to create category. Please try again.");
        }
    } catch (error) {
        console.error("Error creating category:", error);
        alert("An error occurred. Please try again.");
    }
});

// Show modal for creating inventory
const inventoryModal = document.getElementById("inventory-modal");
const createInventoryBtn = document.getElementById("create-inventory");
const closeInventoryModalBtn = document.querySelector(".close-inventory-btn");
const inventoryForm = document.getElementById("inventory-form");

// Event listener to open the modal and fetch categories
createInventoryBtn.addEventListener("click", async () => {
    try {
        // Fetch categories to populate the dropdown
        const categoryListResponse = await fetch(`${baseUrl}/categories?key=${apiKey}`);
        const categoryListData = await categoryListResponse.json();

        const inventoryCategoryDropdown = document.getElementById("inventory-category");
        inventoryCategoryDropdown.innerHTML = ''; // Clear previous options

        if (categoryListData.documents && categoryListData.documents.length > 0) {
            categoryListData.documents.forEach(doc => {
                const option = document.createElement("option");
                option.value = doc.fields.categoryId.stringValue; // Use categoryId as value
                option.textContent = doc.fields.name.stringValue; // Display category name
                inventoryCategoryDropdown.appendChild(option);
            });
        } else {
            alert("No categories found.");
        }

        inventoryModal.style.display = "block"; // Show the modal
    } catch (error) {
        console.error("Error fetching categories:", error);
        alert("Failed to load categories. Please try again later.");
    }
});

// Close the modal
closeInventoryModalBtn.addEventListener("click", () => {
    inventoryModal.style.display = "none";
});

// Function to upload image to Firebase Storage and return the URL
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    const storageUploadUrl = `${storageBaseUrl}/images%2F${file.name}?uploadType=media&name=images/${file.name}&key=${apiKey}`;

    try {
        const uploadResponse = await fetch(storageUploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error('Image upload failed');
        }

        const result = await uploadResponse.json();
        const imageUrl = `${storageBaseUrl}/images%2F${file.name}?alt=media&token=${result.downloadTokens}`;
        return imageUrl;
    } catch (error) {
        console.error("Image upload error:", error);
        alert("Image upload failed. Please try again.");
    }
}

// Handle inventory creation form submission (Firestore API)
inventoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get the values from the form
    const title = document.getElementById("inventory-title").value;
    const description = document.getElementById("inventory-description").value;
    const quantity = document.getElementById("inventory-quantity").value;
    const price = document.getElementById("inventory-price").value;
    const categoryId = document.getElementById("inventory-category").value;
    const imageFile = document.getElementById("inventory-image").files[0];
    const status = document.getElementById("inventory-status").value; // Get the status value

    try {
        // Upload image and get the URL
        const imageUrl = await uploadImage(imageFile);

        // Send POST request to Firestore API to create a new inventory item with all details
        const response = await fetch(`${baseUrl}/inventory?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    catId: { stringValue: categoryId },
                    title: { stringValue: title },
                    description: { stringValue: description },
                    quantity: { integerValue: parseInt(quantity, 10) },
                    price: { doubleValue: parseFloat(price) },
                    image: { stringValue: imageUrl },
                    status: { stringValue: status },
                    inventoryId: { stringValue: "" } // Placeholder for the inventoryId
                }
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const docId = responseData.name.split("/").pop(); // Extract the document ID

            // Update the created document to include the inventoryId
            await fetch(`${baseUrl}/inventory/${docId}?key=${apiKey}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fields: {
                        inventoryId: { stringValue: docId },
                        catId: { stringValue: categoryId },
                        title: { stringValue: title },
                        description: { stringValue: description },
                        quantity: { integerValue: parseInt(quantity, 10) },
                        price: { doubleValue: parseFloat(price) },
                        image: { stringValue: imageUrl },
                        status: { stringValue: status },
                    }
                })
            });

            alert("Inventory item created successfully!");
            inventoryModal.style.display = "none";
            inventoryForm.reset();
        } else {
            alert("Failed to create inventory item. Please try again.");
        }
    } catch (error) {
        console.error("Error creating inventory item:", error);
        alert("An error occurred. Please try again.");
    }
});

// Close modal when clicking outside the modal content
window.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        categoryModal.style.display = 'none';
    } else if (e.target === inventoryModal) {
        inventoryModal.style.display = 'none';
    }
});
