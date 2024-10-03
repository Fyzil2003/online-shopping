const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents"; // Replace with your Firestore API base URL

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('uid'); // Fetch user ID from local storage
    if (!userId) {
        alert('You must be logged in to view your cart.');
        window.location.href = 'index.html'; // Redirect to the login page if not logged in
    } else {
        loadCartItems(userId); // Load cart items for the logged-in user
    }

    // Logout button functionality
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('uid'); // Remove user ID from local storage
        window.location.href = 'index.html'; // Redirect to the login page
    });

    // Checkout button functionality
    document.getElementById('checkout-btn').addEventListener('click', () => {
        checkoutCart(userId); // Handle the checkout process
    });
});

// Function to load cart items from Firestore
async function loadCartItems(userId) {
    try {
        const response = await fetch(`${apiBaseUrl}/cart/${userId}`);
        
        if (!response.ok) {
            throw new Error(`Error fetching cart: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const items = data.fields.items?.arrayValue?.values || []; // Extract items from response

        // Fetch product details for each item and populate the table
        const cartItemsBody = document.getElementById('cart-items-body');
        cartItemsBody.innerHTML = ''; // Clear existing items

        for (const item of items) {
            const productId = item.mapValue.fields.productId.stringValue;
            const quantity = parseInt(item.mapValue.fields.quantity.integerValue, 10);
            const productDetails = await fetchProductDetails(productId); // Fetch product details from inventory collection
            
            if (productDetails) {
                const price = parseFloat(productDetails.price); // Ensure price is a number
                
                if (isNaN(price)) {
                    console.error(`Invalid price for product ${productDetails.name}`);
                    continue;
                }

                const totalAmount = price * quantity; // Calculate total amount

                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${productDetails.name}</td>
                    <td><img src="${productDetails.image}" alt="${productDetails.name}" class="product-image"></td>
                    <td>${quantity}</td>
                    <td>${price.toFixed(2)} ₹</td>
                    <td>${totalAmount.toFixed(2)} ₹</td>
                    <td><button class="remove-btn" data-product-id="${productId}">Remove</button></td>
                `;

                cartItemsBody.appendChild(row);
            }
        }

        // Add event listeners for remove buttons
        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                removeCartItem(userId, productId); // Call function to remove item from cart
            });
        });

    } catch (error) {
        console.error('Error loading cart items:', error);
        alert('Failed to load cart items. Please try again.');
    }
}

// Function to fetch product details by product ID from the inventory collection
async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${apiBaseUrl}/inventory/${productId}`); // Fetch from the inventory collection
        
        if (!response.ok) {
            throw new Error(`Error fetching product: ${response.status} - ${response.statusText}`);
        }

        const productData = await response.json();
        return {
            name: productData.fields.title.stringValue, // Adjust this based on your inventory structure
            price: productData.fields.price.integerValue || productData.fields.price.doubleValue || 0, // Support for integer or double
            image: productData.fields.image.stringValue // Ensure this matches your field names
        };
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null; // Return null if there is an error
    }
}

// Function to remove an item from the cart
async function removeCartItem(userId, productId) {
    try {
        const response = await fetch(`${apiBaseUrl}/cart/${userId}`);
        const data = await response.json();
        let cartItems = data.fields.items?.arrayValue?.values || [];

        cartItems = cartItems.filter(item => item.mapValue.fields.productId.stringValue !== productId);

        const updateResponse = await fetch(`${apiBaseUrl}/cart/${userId}?updateMask.fieldPaths=items`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    items: {
                        arrayValue: {
                            values: cartItems
                        }
                    }
                }
            })
        });

        if (!updateResponse.ok) {
            throw new Error(`Error updating cart: ${updateResponse.status} - ${updateResponse.statusText}`);
        }

        alert('Item removed from cart successfully.');
        loadCartItems(userId); // Reload cart items after removal
    } catch (error) {
        console.error('Error removing cart item:', error);
        alert('Failed to remove item from cart. Please try again.');
    }
}

// Function to handle checkout and store the order in Firestore
async function checkoutCart(userId) {
    try {
        const cartResponse = await fetch(`${apiBaseUrl}/cart/${userId}`);
        const cartData = await cartResponse.json();
        const items = cartData.fields.items?.arrayValue?.values || [];

        if (items.length === 0) {
            alert('Your cart is empty.');
            return;
        }

        // Loop through cart items and place orders
        for (const item of items) {
            const productId = item.mapValue.fields.productId.stringValue;
            const quantity = parseInt(item.mapValue.fields.quantity.integerValue, 10);
            const productDetails = await fetchProductDetails(productId); // Fetch product details for each item

            if (productDetails) {
                const price = parseFloat(productDetails.price);
                const totalAmount = price * quantity;
                
                // Create order object
                const order = {
                    fields: {
                        uid: { stringValue: userId },
                        productId: { stringValue: productId },
                        quantity: { integerValue: quantity },
                        totalAmount: { integerValue: totalAmount },
                        paymentType: { stringValue: "cash" }, // Assuming payment type is cash for now
                        orderDate: { timestampValue: new Date().toISOString() } // Current timestamp
                    }
                };

                // Add order to Firestore orders collection
                const orderResponse = await fetch(`${apiBaseUrl}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(order)
                });

                if (!orderResponse.ok) {
                    throw new Error(`Error placing order: ${orderResponse.status} - ${orderResponse.statusText}`);
                }
            }
        }

        // Clear the cart after placing orders
        const clearCartResponse = await fetch(`${apiBaseUrl}/cart/${userId}?updateMask.fieldPaths=items`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    items: {
                        arrayValue: { values: [] }
                    }
                }
            })
        });

        if (!clearCartResponse.ok) {
            throw new Error(`Error clearing cart: ${clearCartResponse.status} - ${clearCartResponse.statusText}`);
        }

        alert('Order placed successfully!');
        loadCartItems(userId); // Reload cart to show it's empty now

    } catch (error) {
        console.error('Error during checkout:', error);
        alert('Checkout failed. Please try again.');
    }
}
