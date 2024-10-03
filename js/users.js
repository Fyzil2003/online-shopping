const apiUrl = "https://firestore.googleapis.com/v1/projects/online-shopping-c8e51/databases/(default)/documents/users";
let usersData = [];
let currentPage = 1;
let rowsPerPage = 10;

// Fetch user data from Firestore
async function fetchUsers() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.documents) {
            usersData = data.documents.map(doc => {
                const fields = doc.fields;
                return {
                    displayName: fields.displayName ? fields.displayName.stringValue : "",
                    email: fields.email ? fields.email.stringValue : "",
                    phoneNumber: fields.phoneNumber ? fields.phoneNumber.stringValue : "",
                    uid: doc.name.split('/').pop(),  // Get document ID (user's UID)
                    credits: fields.credits ? fields.credits.integerValue : 0,
                    totalSpent: fields.totalSpent?.doubleValue || fields.totalSpent?.integerValue || 0, // Handle large numbers
                    creditsUsed: fields.creditsUsed?.integerValue || fields.creditsUsed?.doubleValue || 0 // Handle both integer and double
                };
            });
            displayUsers(currentPage);
        } else {
            document.getElementById('users-table-body').innerHTML = '<tr><td colspan="8">No users found</td></tr>';
        }
    } catch (error) {
        console.error("Error fetching users:", error);
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="8">Failed to load users</td></tr>';
    }
}




// Display the users in the table
function displayUsers(page) {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, usersData.length);
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';

    for (let i = startIndex; i < endIndex; i++) {
        const user = usersData[i];
        const row = `
            <tr>
                <td>${user.displayName}</td>
                <td>${user.email}</td>
                <td>${user.phoneNumber || 'N/A'}</td>
                <td>${user.uid}</td>
                <td id="credits-${user.uid}">${user.credits}</td>
                <td>${user.totalSpent}</td> <!-- Display totalSpent -->
                <td>${user.creditsUsed}</td> <!-- Display creditsUsed -->
                <td><button class="update-credits-btn" data-uid="${user.uid}" data-credits="${user.credits}">Update Credits</button></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    }

    updatePagination();
    attachUpdateCreditsListeners();  // Attach listeners to "Update Credits" buttons
}


// Update the pagination controls
function updatePagination() {
    const totalPages = Math.ceil(usersData.length / rowsPerPage);
    document.getElementById('page-indicator').textContent = `${currentPage} of ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

// Handle pagination
document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayUsers(currentPage);
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(usersData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayUsers(currentPage);
    }
});

// Handle rows per page change
document.getElementById('ok-button').addEventListener('click', () => {
    const rowsPerPageInput = document.getElementById('rows-per-page').value;
    const newRowsPerPage = parseInt(rowsPerPageInput, 10);

    if (newRowsPerPage > 0) {
        rowsPerPage = newRowsPerPage;
        currentPage = 1; // Reset to the first page
        displayUsers(currentPage); // Refresh the displayed users
    }
});


// Attach event listeners to "Update Credits" buttons
function attachUpdateCreditsListeners() {
    const buttons = document.querySelectorAll('.update-credits-btn');
    buttons.forEach(button => {
        button.addEventListener('click', (event) => {
            const uid = event.target.getAttribute('data-uid');
            const currentCredits = event.target.getAttribute('data-credits');
            const newCredits = prompt(`Enter new credits for user (current: ${currentCredits}):`, currentCredits);

            if (newCredits !== null && newCredits !== currentCredits) {
                updateCredits(uid, parseInt(newCredits));
            }
        });
    });
}

// Update credits for a specific user
async function updateCredits(uid, newCredits) {
    const userDocUrl = `${apiUrl}/${uid}?updateMask.fieldPaths=credits`;
    
    const updatePayload = {
        fields: {
            credits: {
                integerValue: newCredits
            }
        }
    };

    try {
        const response = await fetch(userDocUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });

        if (response.ok) {
            document.getElementById(`credits-${uid}`).textContent = newCredits;
            alert("Credits updated successfully!");
        } else {
            alert("Failed to update credits.");
        }
    } catch (error) {
        console.error("Error updating credits:", error);
        alert("Error updating credits.");
    }
}

// Initial fetch and display of users
fetchUsers();
