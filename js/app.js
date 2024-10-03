// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACYbXUmCW_alAqtx58q5kBgsD69FBJzNo",
    authDomain: "online-shopping-c8e51.firebaseapp.com",
    projectId: "online-shopping-c8e51",
    storageBucket: "online-shopping-c8e51.appspot.com",
    messagingSenderId: "311094629699",
    appId: "1:311094629699:web:1aeee5c1cf0b9c88540bf6",
    measurementId: "G-MVPCRPEC89"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Google Sign-Up Functionality
async function signUpWithGoogle() {
    try {
        console.log("Attempting to sign up with Google...");
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const phoneNumber = user.phoneNumber || ""; // Get the phone number if available

        // Add user to Firestore after signing up
        await addUserToFirestore(user, phoneNumber, user.displayName);

        console.log('User signed up:', user);
        displaySuccess('signup', 'Sign up successful! Redirecting...');
        setTimeout(() => {
            localStorage.setItem('uid', user.uid); // Store UID in local storage
            window.location.href = 'homepage.html'; // Redirect to homepage
        }, 2000);

    } catch (error) {
        console.error('Error during sign up with Google:', error);
        handleError(error, 'signup');
    }
}

// Google Login Functionality
async function loginWithGoogle() {
    try {
        console.log("Attempting to log in with Google...");
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in Firestore
        const userDoc = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDoc);

        if (userSnapshot.exists()) {
            console.log('User logged in:', user);
            displaySuccess('login', 'Login successful! Redirecting...');
            localStorage.setItem('uid', user.uid); // Store UID in local storage

            // Redirect based on email
            if (user.email === "fyzil2003@gmail.com") {
                window.location.href = 'inventory.html'; // Redirect to admin page
            } else {
                window.location.href = 'homepage.html'; // Redirect to homepage
            }
        } else {
            await auth.signOut(); // Sign out if not registered
            displayError('login', "You are not registered. Please sign up first.");
        }

    } catch (error) {
        console.error('Error during login with Google:', error);
        handleError(error, 'login');
    }
}

// Add user to Firestore
async function addUserToFirestore(user, phoneNumber, username) {
    const userDoc = doc(db, "users", user.uid);
    await setDoc(userDoc, {
        displayName: username || user.displayName, // Use provided username or Google's
        email: user.email,
        uid: user.uid,
        phoneNumber: phoneNumber,
        credits: 0, // Initial credits set to 0
        totalSpent: 0, // Total spent set to 0
        creditsUsed: 0, // Credits used set to 0
    });
}

// Handle Errors
function handleError(error, formType) {
    let message = "";

    switch (error.code) {
        case 'auth/invalid-email':
            message = "Invalid email format.";
            break;
        case 'auth/user-not-found':
            message = "No account found with this email.";
            break;
        case 'auth/wrong-password':
            message = "Incorrect password. Please try again.";
            break;
        case 'auth/email-already-in-use':
            message = "Email is already in use. Please log in.";
            break;
        case 'auth/invalid-credential':
            message = "Invalid credentials. Please check your details.";
            break;
        default:
            message = error.message; // General error message
    }

    displayError(formType, message);
}

// Display error messages
function displayError(formType, message) {
    const emailErrorId = formType === 'signup' ? 'signup-email-error' : 'login-email-error';
    const passwordErrorId = formType === 'signup' ? 'signup-password-error' : 'login-password-error';
    const messageId = formType === 'signup' ? 'signup-success-message' : 'login-success-message';

    // Clear previous error messages
    document.getElementById(emailErrorId).textContent = '';
    document.getElementById(passwordErrorId).textContent = '';
    document.getElementById(messageId).textContent = ''; // Clear previous message

    // Set the new error message
    if (formType === 'signup') {
        document.getElementById('signup-email-error').textContent = message;
    } else {
        document.getElementById('login-email-error').textContent = message;
    }
}

// Display success messages
function displaySuccess(formType, message) {
    const messageId = formType === 'signup' ? 'signup-success-message' : 'login-success-message';

    // Clear previous messages
    document.getElementById(messageId).textContent = ''; // Clear previous message

    // Set the new success message
    document.getElementById(messageId).textContent = message;
}

// Event Listeners for Forms
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password === confirmPassword) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Add user to Firestore with phone number from the input field
            const phoneNumber = document.getElementById('signup-phone').value;

            await addUserToFirestore(user, phoneNumber, username);
            console.log('User signed up:', user);
            displaySuccess('signup', 'Sign up successful! Redirecting...');
            setTimeout(() => {
                localStorage.setItem('uid', user.uid); // Store UID in local storage
                window.location.href = 'homepage.html'; // Redirect to homepage
            }, 2000);
        } catch (error) {
            console.error('Error during signup:', error);
            handleError(error, 'signup');
        }
    } else {
        displayError('signup', "Passwords do not match.");
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if user exists in Firestore
        const userDoc = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDoc);

        if (userSnapshot.exists()) {
            console.log('User logged in:', user);
            displaySuccess('login', 'Login successful! Redirecting...');
            localStorage.setItem('uid', user.uid); // Store UID in local storage
            setTimeout(() => {
                // Redirect based on email
                if (user.email === "fyzil2003@gmail.com") {
                    window.location.href = 'inventory.html'; // Redirect to admin page
                } else {
                    window.location.href = 'homepage.html'; // Redirect to homepage
                }
            }, 2000);
        } else {
            await auth.signOut(); // Sign out if not registered
            displayError('login', "You are not registered. Please sign up first.");
        }
    } catch (error) {
        console.error('Error during login:', error);
        handleError(error, 'login');
    }
});

// Google Sign-Up Button
document.getElementById('google-signup').addEventListener('click', signUpWithGoogle);

// Google Login Button
document.getElementById('google-login').addEventListener('click', loginWithGoogle);

// Toggle between forms
document.getElementById('signup-toggle').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
});

document.getElementById('login-toggle').addEventListener('click', () => {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

document.getElementById('reset-password-toggle').addEventListener('click', () => {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'block';
});

// Reset Password Functionality
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('reset-password-email').value;

    try {
        await sendPasswordResetEmail(auth, email);
        console.log('Password reset email sent to:', email);
        displaySuccess('reset', 'Password reset email sent! Please check your inbox.');
    } catch (error) {
        console.error('Error sending password reset email:', error);
        handleError(error, 'reset');
    }
});

// Initialize the app to show only the login form by default
window.onload = () => {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
};
