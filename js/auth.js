// Import Firebase functions
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// Initialize Firebase Auth
const auth = getAuth();

// Logout Functionality
document.getElementById('logout-button').addEventListener('click', (event) => {
    event.preventDefault();
    signOut(auth).then(() => {
        // Sign-out successful.
        alert('You have logged out successfully.');
        window.location.href = "index.html"; // Redirect to the login page
    }).catch((error) => {
        console.error('Error during logout:', error);
    });
});
