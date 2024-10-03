document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
});

// Function to load the user's orders from Firestore
async function loadOrders() {
    const userId = localStorage.getItem('uid');
    const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents";
    
    if (!userId) {
        alert('Please log in to view your orders.');
        return;
    }

    try {
        // Fetch all orders from the Firestore orders collection
        const response = await fetch(`${apiBaseUrl}/orders`);
        
        if (!response.ok) {
            throw new Error(`Error fetching orders: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const orders = data.documents || [];
        const ordersBody = document.getElementById('orders-items-body');

        // Clear the table body
        ordersBody.innerHTML = '';

        // Create an array to store promises for fetching product details
        const productPromises = [];
        let totalSpent = 0; // Initialize total spent amount

        // Loop through the orders and filter by user ID
        for (const order of orders) {
            const orderFields = order.fields;
            const orderUid = orderFields.uid.stringValue;

            // Only process orders that belong to the logged-in user
            if (orderUid === userId) {
                const productId = orderFields.productId.stringValue;
                const quantity = orderFields.quantity.integerValue;
                const totalAmount = orderFields.totalAmount.doubleValue;
                const orderDate = new Date(orderFields.orderDate.timestampValue);
                const paymentType = orderFields.paymentType.stringValue; // Fetch the payment type

                // Accumulate the total amount spent
                totalSpent += totalAmount;

                // Fetch product details (name, image) from the inventory
                productPromises.push(
                    fetch(`${apiBaseUrl}/inventory/${productId}`).then(productResponse => {
                        if (!productResponse.ok) {
                            throw new Error(`Error fetching product details: ${productResponse.status} - ${productResponse.statusText}`);
                        }
                        return productResponse.json().then(productData => ({
                            productId: productId,
                            productName: productData.fields.title.stringValue,
                            productImage: productData.fields.image.stringValue,
                            quantity: quantity,
                            totalAmount: totalAmount,
                            paymentType: paymentType, // Include payment type
                            orderDate: orderDate
                        }));
                    })
                );
            }
        }

        // Wait for all product details to be fetched
        const productsDetails = await Promise.all(productPromises);

        // Sort products by order date (newest first)
        productsDetails.sort((a, b) => b.orderDate - a.orderDate);

        // Create table rows for each order
        productsDetails.forEach(({ productName, productImage, quantity, totalAmount, paymentType, orderDate }) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${productName}</td>
                <td><img src="${productImage}" alt="${productName}" style="width: 100px;"></td>
                <td>${quantity}</td>
                <td>${paymentType}</td> <!-- Display payment type -->
                <td>₹${totalAmount.toFixed(2)}</td>
                <td class="order-date">${orderDate.toLocaleString()}</td>
            `;

            ordersBody.appendChild(row);
        });

        // Display the total amount spent
        document.getElementById('total-spent').innerHTML = `<strong>Total Amount Spent: $${totalSpent.toFixed(2)}</strong>`;

        // Update total spent in user's Firestore document
        await updateUserTotalSpent(userId, totalSpent);
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Failed to load orders. Please try again.');
    }
}


// Function to update the user's total spent amount in Firestore
async function updateUserTotalSpent(userId, totalSpent) {
    const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents/users";
    
    try {
        const userRef = `${apiBaseUrl}/${userId}`;
        const updateData = {
            fields: {
                totalSpent: {
                    doubleValue: totalSpent
                }
            }
        };

        const response = await fetch(`${userRef}?updateMask.fieldPaths=totalSpent`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error(`Error updating total spent: ${response.status} - ${response.statusText}`);
        }

        console.log('User total spent updated successfully');
    } catch (error) {
        console.error('Error updating user total spent:', error);
    }
}

