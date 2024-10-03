const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents";
let allProducts = []; // Store all products globally
let filteredProducts = []; // Store filtered products for display

// Fetch user data from local storage (UID is the same as document ID)
const userUid = localStorage.getItem('uid');

if (userUid) {
    fetchUserDetails(userUid);
} else {
    window.location.href = "index.html"; // Redirect to login if no UID is found
}

// Fetch and display user details
async function fetchUserDetails(uid) {
    try {
        const response = await fetch(`${apiBaseUrl}/users/${uid}`);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();

        // Debugging: Log the response data
        console.log('Fetched user data:', data);

        if (data.fields) {
            const username = data.fields.displayName ? data.fields.displayName.stringValue : "Guest";
            const credits = data.fields.credits ? data.fields.credits.integerValue : 0;

            // Display user details
            document.getElementById('user-username').textContent = `Hi, ${username}`;
            document.getElementById('user-credits').textContent = `Credits: ${credits}`;
        } else {
            throw new Error("User data not found");
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        alert('Failed to fetch user details. Please try again.');
    }
}

// Handle category filtering
function handleCategoryFilter(event) {
    const selectedCategoryId = event.target.value;

    // If "All Categories" is selected (value is an empty string), show all products
    if (selectedCategoryId === '') {
        filteredProducts = [...allProducts]; // Show all products
    } else {
        // Filter products based on the selected category ID
        filteredProducts = allProducts.filter(product => 
            product.catId.stringValue === selectedCategoryId // Assuming catId is the field name in Firestore
        );
    }

    // Display the filtered products
    displayProducts(filteredProducts);
}

// Fetch categories from Firestore
async function fetchCategories() {
    try {
        const response = await fetch(`${apiBaseUrl}/categories`);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();

        if (data.documents) {
            const categories = data.documents.map(doc => ({
                id: doc.name.split('/').pop(),
                name: doc.fields.name.stringValue
            }));

            const categorySelect = document.getElementById('category-select');
            categorySelect.innerHTML = '<option value="">All Categories</option>'; // Add "All Categories" option

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id; // Set the value to category ID
                option.textContent = category.name; // Set the text to category name
                categorySelect.appendChild(option);
            });

            // Add event listener for category filter
            categorySelect.addEventListener('change', handleCategoryFilter);
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Handle search functionality
function handleSearch() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();

    // Filter products based on the search query
    filteredProducts = allProducts.filter(product => 
        product.title.stringValue.toLowerCase().includes(searchQuery)
    );

    displayProducts(filteredProducts);
}

// Fetch products from Firestore
async function fetchProducts() {
    try {
        const response = await fetch(`${apiBaseUrl}/inventory`);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();

        if (data.documents) {
            allProducts = data.documents.map(doc => ({
                id: doc.name.split('/').pop(),
                ...doc.fields
            }));

            filteredProducts = [...allProducts]; // Initialize filtered products
            displayProducts(filteredProducts); // Display all products initially
        }
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Display products based on the filteredProducts array
function displayProducts(products) {
    const productContainer = document.getElementById('product-container');
    productContainer.innerHTML = ''; // Clear the container before displaying

    if (products.length === 0) {
        const noProductsMessage = document.createElement('p');
        noProductsMessage.textContent = 'No products found.';
        productContainer.appendChild(noProductsMessage);
    } else {
        products.forEach(product => {
            const productCard = createProductCard(product);
            productContainer.appendChild(productCard);
        });
    }
}

async function addToCart(productId, quantity) {
    const userId = localStorage.getItem('uid'); // Get the logged-in user ID from local storage
    const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents"; // Replace with your Firestore API base URL

    if (!userId) {
        displayCartMessage('Please log in to add items to your cart.', false);
        return;
    }

    try {
        // Fetch the current cart for the user
        const response = await fetch(`${apiBaseUrl}/cart/${userId}`);
        let cartItems = [];

        if (response.ok) {
            const data = await response.json();
            // Parse existing cart items, if any
            cartItems = data.fields.items?.arrayValue?.values || [];
        } else if (response.status === 404) {
            // If the cart document does not exist, proceed with creating a new one
            console.log("Cart not found, creating a new cart for the user.");
        } else {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        // Check if the product already exists in the cart
        const itemIndex = cartItems.findIndex(item => item.mapValue.fields.productId.stringValue === productId);

        if (itemIndex > -1) {
            // If product exists, update the quantity
            let existingQuantity = parseInt(cartItems[itemIndex].mapValue.fields.quantity.integerValue, 10);
            cartItems[itemIndex].mapValue.fields.quantity.integerValue = existingQuantity + quantity;
        } else {
            // If product does not exist, create a new item entry
            const newItem = {
                mapValue: {
                    fields: {
                        productId: { stringValue: productId },
                        quantity: { integerValue: quantity }
                    }
                }
            };
            cartItems.push(newItem); // Add the new product to the cart array
        }

        // Prepare the data for the Firestore update, including the uid
        const cartData = {
            fields: {
                uid: { stringValue: userId }, // Store uid in the document
                items: {
                    arrayValue: {
                        values: cartItems
                    }
                }
            }
        };

        // Update or create the cart document in Firestore
        const updateResponse = await fetch(`${apiBaseUrl}/cart/${userId}?updateMask.fieldPaths=items&updateMask.fieldPaths=uid`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cartData)
        });

        if (!updateResponse.ok) {
            throw new Error(`Error updating cart: ${updateResponse.status} - ${updateResponse.statusText}`);
        }

        // Display success message
        displayCartMessage('Product added to cart successfully.', true);
        loadCartProducts(); // Reload cart (or just update cart badge)
    } catch (error) {
        console.log(error);
    }
}

// Function to display the cart message below the navbar
function displayCartMessage(message, isSuccess) {
    const messageElement = document.getElementById('cart-message');
    messageElement.textContent = message;
    messageElement.style.backgroundColor = isSuccess ? '#28a745' : '#dc3545'; // Green for success, red for failure

    messageElement.classList.add('show');
    messageElement.classList.remove('hidden');

    // Hide the message after 3 seconds
    setTimeout(() => {
        messageElement.classList.remove('show');
        messageElement.classList.add('hidden');
    }, 3000);
}


async function buyNow(productId, quantity) {
    const userId = localStorage.getItem('uid');
    const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents";

    if (!userId) {
        alert('Please log in to proceed with the purchase.');
        return;
    }

    // Prompt the user for the payment type
    const paymentType = prompt("Select payment type: cash or credit").toLowerCase();
    
    if (paymentType !== "cash" && paymentType !== "credit") {
        alert('Invalid payment type selected.');
        return;
    }

    try {
        // Fetch the product details to get the price and stock
        const productResponse = await fetch(`${apiBaseUrl}/inventory/${productId}`);
        if (!productResponse.ok) {
            throw new Error(`Error fetching product details: ${productResponse.status} - ${productResponse.statusText}`);
        }

        const productData = await productResponse.json();
        const productPrice = parseFloat(productData.fields.price.doubleValue); // Ensure product price is treated as a number
        const currentStock = parseInt(productData.fields.quantity.integerValue, 10); // Ensure stock is treated as an integer
        let totalAmount = (productPrice * quantity).toFixed(2); // Calculate total amount as a string (decimal fixed)

        // Ensure ordered quantity does not exceed available stock
        if (quantity > currentStock) {
            alert('Quantity exceeds available stock.');
            return;
        }

        // Fetch user's current credits and creditsUsed
        const creditsResponse = await fetch(`${apiBaseUrl}/users/${userId}`);
        if (!creditsResponse.ok) {
            throw new Error(`Error fetching user credits: ${creditsResponse.status} - ${creditsResponse.statusText}`);
        }

        const userData = await creditsResponse.json();
        let currentCredits = parseInt(userData.fields.credits.integerValue, 10); // Ensure current credits are treated as an integer
        let creditsUsed = userData.fields.creditsUsed ? parseInt(userData.fields.creditsUsed.integerValue, 10) : 0; // Ensure creditsUsed is treated as an integer (default to 0)

        // Check if user has 1000 or more credits to apply discount
        if (currentCredits >= 1000) {
            const discount = (totalAmount * 0.10).toFixed(2); // Calculate 10% discount as a string
            totalAmount = (totalAmount - discount).toFixed(2); // Apply discount and ensure result is formatted as a decimal string
            currentCredits -= 500; // Deduct 500 credits
            creditsUsed += 500; // Increase the credits used by 500
        }

        // Add 10 credits for each unit purchased
        const creditsToAdd = 10 * quantity;
        currentCredits += creditsToAdd; // Ensure credits are correctly updated as a number

        // Prepare the order data, now including the payment type
        const orderData = {
            fields: {
                uid: { stringValue: userId },
                productId: { stringValue: productId },
                quantity: { integerValue: parseInt(quantity, 10) }, // Ensure quantity is treated as an integer
                totalAmount: { doubleValue: parseFloat(totalAmount) }, // Ensure total amount is treated as a float
                orderDate: { timestampValue: new Date().toISOString() },
                paymentType: { stringValue: paymentType } // Add payment type to the order
            }
        };

        // Create an order in the Firestore orders collection
        const orderResponse = await fetch(`${apiBaseUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!orderResponse.ok) {
            throw new Error(`Error creating order: ${orderResponse.status} - ${orderResponse.statusText}`);
        }

        // Prepare the data for updating user credits and creditsUsed
        const creditUpdateData = {
            fields: {
                credits: { integerValue: currentCredits }, // Updated credits
                creditsUsed: { integerValue: creditsUsed }  // Updated creditsUsed (if user used 500 credits)
            }
        };

        // Update the user's credits and creditsUsed using update mask
        const creditUpdateResponse = await fetch(`${apiBaseUrl}/users/${userId}?updateMask.fieldPaths=credits&updateMask.fieldPaths=creditsUsed`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(creditUpdateData)
        });

        if (!creditUpdateResponse.ok) {
            throw new Error(`Error updating user credits: ${creditUpdateResponse.status} - ${creditUpdateResponse.statusText}`);
        }

        // Update product stock (decrease by quantity ordered)
        const updatedStock = currentStock - quantity;
        const stockUpdateData = {
            fields: {
                quantity: { integerValue: updatedStock } // Updated quantity
            }
        };

        // Update the inventory stock using update mask
        const stockUpdateResponse = await fetch(`${apiBaseUrl}/inventory/${productId}?updateMask.fieldPaths=quantity`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(stockUpdateData)
        });

        if (!stockUpdateResponse.ok) {
            throw new Error(`Error updating product stock: ${stockUpdateResponse.status} - ${stockUpdateResponse.statusText}`);
        }

        alert('Order placed successfully.'); // Notify the user of the successful order placement
        window.location.href = 'order.html'; // Redirect to the orders page
    } catch (error) {
        console.error('Error processing order:', error);
        alert('Failed to place the order. Please try again.');
    }
}











function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const productImage = document.createElement('img');
    productImage.src = product.image.stringValue || 'default-image-url.jpg';
    productImage.alt = product.title.stringValue;

    const title = document.createElement('h3');
    title.textContent = product.title.stringValue;

    const price = document.createElement('p');
    price.textContent = `Price: $${product.price.doubleValue.toFixed(2)}`;

    const stock = document.createElement('p');
    stock.textContent = `Stock: ${product.quantity.integerValue}`;

    card.appendChild(productImage);
    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(stock);

    // Check if the product is available and has stock
    if (product.status.stringValue === 'Available' && product.quantity.integerValue > 0) {
        const quantitySelect = document.createElement('input');
        quantitySelect.type = 'number';
        quantitySelect.value = 1;
        quantitySelect.min = 1;
        quantitySelect.max = product.quantity.integerValue;
        quantitySelect.className = 'quantity-select';

        const addToCartButton = document.createElement('button');
        addToCartButton.textContent = 'Add to Cart';
        addToCartButton.className = 'btn-add-to-cart';
        
        // Add event listener to the "Add to Cart" button
        addToCartButton.addEventListener('click', function() {
            const quantity = parseInt(quantitySelect.value, 10); // Get selected quantity
            addToCart(product.id, quantity); // Call the addToCart function
        });

        // Create the "Buy Now" button
        const buyNowButton = document.createElement('button');
        buyNowButton.textContent = 'Buy Now';
        buyNowButton.className = 'btn-buy-now';

        buyNowButton.addEventListener('click', function() {
            const quantity = parseInt(quantitySelect.value, 10); // Get selected quantity
            buyNow(product.id, quantity); // Call the buyNow function
        });

        // Append buttons to the card
        card.appendChild(quantitySelect);
        card.appendChild(addToCartButton);
        card.appendChild(buyNowButton); // Add the Buy Now button
    } else {
        // Display "Out of Stock" if product quantity is 0 or less
        const outOfStockMessage = document.createElement('p');
        outOfStockMessage.textContent = 'Out of Stock';
        outOfStockMessage.className = 'out-of-stock';
        card.appendChild(outOfStockMessage);
    }

    return card;
}







// ... Existing code remains unchanged ...


// Initialize the page by fetching categories and products
async function initialize() {
    await fetchCategories(); // Fetch categories first with "All Categories" option
    await fetchProducts(); // Fetch products after categories

    // Add event listener for search functionality
    document.getElementById('search-button').addEventListener('click', handleSearch);
}

window.onload = initialize;
