import { loadDoctorSummary } from "./doctorSummary.js";
import { searchPatientWithConsent } from "./patientSearch.js";
import { loadPrescriptions, addPrescription } from "./prescriptions.js";
import { logAccess } from "../audit/auditLog.js";
import { requestConsent } from "./requestAccess.js";
import { processDocument } from "./docReader.js";

import { auth, db } from "../firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let CURRENT_DOCTOR_ID = "doctor_current"; // Fallback
let CURRENT_DOCTOR_NAME = "Doctor";

// Setup Auth Listener
onAuthStateChanged(auth, async (user) => {
    if(user) {
        CURRENT_DOCTOR_ID = user.uid;
        const snap = await getDoc(doc(db, "doctors", user.uid));
        if(snap.exists()) CURRENT_DOCTOR_NAME = snap.data().name || "Doctor";
    }
});

// Global function for Request Access
window.handleRequestAccess = (email) => {
    const btn = document.getElementById("reqBtn_" + email.replace(/[^a-zA-Z0-9]/g, ''));
    if (btn) btn.innerText = "Sending...";

    requestConsent(CURRENT_DOCTOR_NAME, CURRENT_DOCTOR_ID, email)
        .then((patientUid) => {
            alert("Request Sent to Patient!");
            if (btn) btn.innerText = "Waiting for patient...";
            
            // Listen to the patient's consent document automatically
            const unsub = onSnapshot(doc(db, "consents", patientUid), (snap) => {
                if(snap.exists() && snap.data().allowedDoctors?.includes(CURRENT_DOCTOR_ID)){
                    alert("Patient accepted! Access granted.");
                    unsub(); // Stop listening
                    document.getElementById('searchBtn').click(); // Auto-reload page
                }
            });
        })
        .catch(e => {
            if (btn) btn.innerText = "Request Access from " + email;
            alert("Error sending request: " + e.message);
        });
};

// Global function for PDF Modal
window.openPdfModal = (reportId) => {
    const hiddenInput = document.getElementById(`pdf_${reportId}`);
    if (!hiddenInput || !hiddenInput.value) {
        alert("Error: PDF Data not found.");
        return;
    }

    // Create Modal
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; justify-content:center; align-items:center; flex-direction:column;";

    modal.innerHTML = `
        <div style="width:90%; height:90%; background: var(--bg-card); position:relative; border-radius:8px; overflow:hidden;">
            <button onclick="this.parentElement.parentElement.remove()" style="position:absolute; top:10px; right:10px; z-index:100; background:red; color:white; border:none; padding:5px 10px; cursor:pointer; font-size:16px;">✖ Close</button>
            <embed src="${hiddenInput.value}" type="application/pdf" width="100%" height="100%">
        </div>
    `;
    document.body.appendChild(modal);
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("Doctor Dashboard Loaded");

    import("../ai/chatBot.js").then(mod => mod.initChatBot());

    const searchBtn = document.getElementById("searchBtn");
    const patientEmailInput = document.getElementById("patientIdInput");
    const addRxBtn = document.getElementById("addRxBtn");

    // --- Search Handler ---
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            const email = patientEmailInput.value.trim();
            if (!email) {
                alert("Please enter patient email");
                return;
            }

            const doctorId = CURRENT_DOCTOR_ID;
            console.log(`Searching for ${email} as ${doctorId}`);

            searchPatientWithConsent(email, doctorId)
                .then(patientData => {
                    // Success! Show UI
                    document.getElementById("patientInfo").style.display = "block";
                    const sidebarContent = document.getElementById("patient-sidebar-content");
                    if (sidebarContent) sidebarContent.style.display = "block";

                    const errEl = document.getElementById("errorContainer");
                    if (errEl) errEl.style.display = "none";

                    const returnedId = patientData.id;
                    patientEmailInput.dataset.currentId = returnedId;

                    // 1. Render Demographics (Right Sidebar Version)
                    const demoDiv = document.getElementById("demographics");
                    if (demoDiv) {
                        demoDiv.innerHTML = `
                            <h3 style="margin-bottom:5px; color:var(--primary); font-size:1.4em;">${patientData.name || "Unknown"}</h3>
                            <div style="font-size:0.95em; color:var(--text-muted); margin-bottom:15px; font-weight:500;">
                                ${patientData.age || "N/A"} years • ${patientData.sex || "N/A"}
                            </div>
                            <div style="font-size:0.8em; background:var(--input-bg); padding:6px 10px; border-radius:4px; display:block; word-break: break-all; color:var(--text-muted);">
                                <strong>ID:</strong> ${returnedId}
                            </div>
                        `;
                    }

                    // 2. Load Modules
                    loadDoctorSummary(patientData);
                    loadPrescriptions(returnedId);
                    logAccess(doctorId, returnedId);

                    // 3. Update Chatbot Context
                    import("../ai/chatBot.js").then(mod => {
                        mod.updateChatContext(patientData);
                        // Note: patientData contains 'reports' array from searchPatientWithConsent
                        // Does NOT contain prescriptions yet. That's a separate collection.
                        // Chatbot will have partial context (Reports only).
                    });
                })
                .catch(err => {
                    // Fail! Show Error
                    console.error("Search failed:", err);
                    document.getElementById("patientInfo").style.display = "none";
                    const sidebarContent = document.getElementById("patient-sidebar-content");
                    if (sidebarContent) sidebarContent.style.display = "none";

                    const errContainer = document.getElementById("errorContainer") || createErrorContainer();
                    errContainer.style.display = "block";

                    if (err.message.includes("Access denied")) {
                        const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '');
                        errContainer.innerHTML = `
                            <p style="color:var(--danger-color); margin-bottom:10px;">${err.message}</p>
                            <button id="reqBtn_${safeEmail}" onclick="handleRequestAccess('${email}')" style="background:var(--primary); border:none; padding:8px 16px; color:white; border-radius:4px; cursor:pointer;">
                                Request Access from ${email}
                            </button>
                        `;
                    } else {
                        errContainer.innerHTML = `<p style="color:var(--danger-color)">${err.message}</p>`;
                    }
                    alert("Search Error: " + err.message);
                });
        });
    }

    // --- Add Prescription Handler ---
    if (addRxBtn) {
        addRxBtn.addEventListener("click", () => {
            const patientId = patientEmailInput.dataset.currentId;
            if (!patientId) return alert("Search for a patient first.");

            // Gather Data from New Form
            const medicine = document.getElementById("rxMedicine").value;
            const dosage = document.getElementById("rxDosage").value;
            const frequency = document.getElementById("rxFrequency").value;
            const time = document.getElementById("rxTime").value;
            const instructions = document.getElementById("rxInstructions").value;

            if (!medicine) return alert("Please select a medicine.");
            if (!dosage) return alert("Please enter dosage (e.g. 500mg).");

            addPrescription(patientId, {
                medicine,
                dosage,
                frequency,
                time,
                instructions
            });

            // Reset Form (Optional but nice)
            document.getElementById("rxMedicine").value = "";
            document.getElementById("rxDosage").value = "";
            document.getElementById("rxInstructions").value = "";
        });
    }

    // --- PDF Process Handler ---
    const processBtn = document.getElementById("processBtn");
    const reportUpload = document.getElementById("reportUpload");

    if (processBtn && reportUpload) {
        processBtn.addEventListener("click", () => {
            const patientId = patientEmailInput.dataset.currentId;
            const file = reportUpload.files[0];

            if (!patientId) return alert("Search for a patient first.");
            if (!file) return alert("Please select a PDF file.");

            processDocument(file, patientId)
                .then(newReport => {
                    alert("Success! Review added to history.");
                    if (searchBtn) searchBtn.click(); // Refresh
                })
                .catch(err => {
                    console.error(err);
                    alert("Error: " + err.message);
                });
        });
    }
});

function createErrorContainer() {
    const div = document.createElement("div");
    div.id = "errorContainer";
    div.style.padding = "20px";
    div.style.textAlign = "center";
    const searchBox = document.querySelector(".search-box");
    searchBox.parentNode.insertBefore(div, searchBox.nextSibling);
    return div;
}
