document.getElementById('submitBtn').addEventListener('click', async function () {
    const allUsers = document.getElementById('allUsers').checked;
    const topUsers = document.getElementById('topUsers').checked;
    const cashPurchase = document.getElementById('cashPurchase').checked;
    const creditPurchase = document.getElementById('creditPurchase').checked;

    // Get the API URL for fetching data from Firestore
    const apiBaseUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents";

    // Generate All Users Report
    if (allUsers) {
        try {
            const response = await fetch(`${apiBaseUrl}/users`);
            if (!response.ok) throw new Error(`Error fetching users: ${response.statusText}`);

            const data = await response.json();
            const users = data.documents.map(doc => doc.fields);
            const csvContent = generateCSV(users);
            downloadCSV(csvContent, 'all_users_report.csv');

        } catch (error) {
            console.error('Error generating report:', error);
        }
    }

    // Generate Top 10 Users Report
    if (topUsers) {
        try {
            const response = await fetch(`${apiBaseUrl}/users`);
            if (!response.ok) throw new Error(`Error fetching users: ${response.statusText}`);

            const userData = await response.json();
            const users = userData.documents.map(doc => doc.fields);

            const userSpending = users.map(user => ({
                uid: user.uid.stringValue,
                displayName: user.displayName.stringValue,
                email: user.email.stringValue,
                totalSpent: user.totalSpent ? user.totalSpent.integerValue || user.totalSpent.doubleValue : null
            }));

            const sortedUsers = userSpending.filter(user => user.totalSpent !== null)
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 10);

            const csvContent = generateCSV(sortedUsers);
            downloadCSV(csvContent, 'top_10_users_report.csv');

        } catch (error) {
            console.error('Error generating report for top users:', error);
        }
    }

    // Generate Cash Purchases Report
    if (cashPurchase) {
        await generatePurchaseReport('cash', apiBaseUrl);
    }

    // Generate Credit Purchases Report
    if (creditPurchase) {
        await generatePurchaseReport('credit', apiBaseUrl);
    }
});

// Function to generate purchase reports (cash/credit)
async function generatePurchaseReport(paymentType, apiBaseUrl) {
    try {
        const response = await fetch(`${apiBaseUrl}/orders`);
        if (!response.ok) throw new Error(`Error fetching orders: ${response.statusText}`);

        const orderData = await response.json();
        const orders = orderData.documents.map(doc => doc.fields);
        const filteredOrders = orders.filter(order => order.paymentType.stringValue === paymentType);

        const purchaseReport = [];

        for (const order of filteredOrders) {
            const userId = order.uid.stringValue;
            const totalAmount = order.totalAmount.integerValue || order.totalAmount.doubleValue;
            const quantity = order.quantity.integerValue;
            const orderDate = new Date(order.orderDate.timestampValue).toLocaleString();

            const userResponse = await fetch(`${apiBaseUrl}/users/${userId}`);
            if (userResponse.ok) {
                const userData = await userResponse.json();
                const user = userData.fields;

                purchaseReport.push({
                    uid: userId,
                    displayName: user.displayName.stringValue,
                    email: user.email.stringValue,
                    orderDate: orderDate,
                    totalAmount: totalAmount,
                    quantity: quantity
                });
            }
        }

        const csvContent = generateCSV(purchaseReport);
        downloadCSV(csvContent, `${paymentType}_purchases_report.csv`);

    } catch (error) {
        console.error(`Error generating report for ${paymentType} purchases:`, error);
    }
}

// Function to generate CSV content from the data
function generateCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
        const values = headers.map(header => item[header] !== undefined ? item[header] : 'null');
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

// Function to trigger the download of the CSV file
function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', fileName);
    a.click();
}
