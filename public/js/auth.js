
import { auth, db } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Sign Up ---
export async function registerUser(email, password, role, additionalData = {}) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create User Profile in Firestore (Auth Mapping)
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            role: role,
            createdAt: new Date().toISOString()
        });

        // Create Specific Role Record
        if (role === 'patient') {
            await setDoc(doc(db, "patients", user.uid), {
                email: email,
                name: additionalData.name || "Unknown",
                age: additionalData.age || "N/A",
                sex: additionalData.sex || "N/A",
                medicalText: "No medical history yet.",
                createdAt: new Date().toISOString()
            }, { merge: true });
        } else if (role === 'doctor') {
            // Optional: Create doctor profile if needed later
            await setDoc(doc(db, "doctors", user.uid), {
                email: email,
                name: additionalData.name || "Doctor",
                createdAt: new Date().toISOString()
            }, { merge: true });
        }

        console.log("User Registered:", user.uid);
        return user;
    } catch (error) {
        console.error("Registration Error:", error);
        throw error;
    }
}

// --- Login ---
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch role from Firestore to direct them correctly
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const role = userDoc.data().role;
            sessionStorage.setItem("userRole", role); // Keep for legacy checks
            return role;
        } else {
            throw new Error("User profile not found in database.");
        }
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
}

// --- Logout ---
export function logoutUser() {
    return signOut(auth).then(() => {
        sessionStorage.clear();
        window.location.href = "../login.html";
    });
}
