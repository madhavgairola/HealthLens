import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAJMCUDt7FndiR3_ZdL8akeVSqVXr0Q1AI",
    authDomain: "healthlens-15bf6.firebaseapp.com",
    projectId: "healthlens-15bf6",
    storageBucket: "healthlens-15bf6.firebasestorage.app",
    messagingSenderId: "1008419893458",
    appId: "1:1008419893458:web:dae3f959eab5223bf63d0b",
    measurementId: "G-E58D5XFEZN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
