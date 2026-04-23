import { db } from "../firebaseConfig.js";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, arrayUnion, arrayRemove, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Listen for Pending Requests
export function listenForRequests(patientId) {
    const list = document.getElementById("request-list");
    if (!list) return;

    const q = query(
        collection(db, "consent_requests"),
        where("patientId", "==", patientId),
        where("status", "==", "pending")
    );

    // Realtime Listener
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = '<div style="font-size:0.9em; color:#999; font-style:italic;">No pending requests.</div>';
            return;
        }

        list.innerHTML = "";
        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            const div = document.createElement("div");
            div.className = "request-card";
            
            let rawName = req.doctorName || "Unknown";
            if(!rawName.toLowerCase().startsWith("dr")) rawName = "Dr. " + rawName;

            let timeStr = "";
            if (req.timestamp && req.timestamp.toDate) {
                const d = req.timestamp.toDate();
                timeStr = d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            div.innerHTML = `
                <h5>${rawName}</h5>
                <p style="font-size:0.85em; margin-bottom:5px;">Requests access to your records. <br><span style="color:#888; font-size:0.9em;">${timeStr}</span></p>
                <div class="request-actions">
                    <button class="btn-allow" onclick="window.handleRequest('${docSnap.id}', '${req.doctorId}', '${patientId}', 'approved')">Allow</button>
                    <button class="btn-deny" onclick="window.handleRequest('${docSnap.id}', '${req.doctorId}', '${patientId}', 'rejected')">Deny</button>
                </div>
            `;
            list.appendChild(div);
        });
    });
}

// Handle Approve/Reject
window.handleRequest = async (reqId, doctorId, patientId, action) => {
    try {
        console.log(`Processing request ${reqId}: ${action}`);

        // 1. Process Database Consents first (so errors block the request from vanishing)
        if (action === "approved") {
            await setDoc(doc(db, "consents", patientId), {
                allowedDoctors: arrayUnion(doctorId)
            }, { merge: true });
        }

        // 2. ONLY if step 1 passed (or if denying), update Request Status to clear it from UI
        await updateDoc(doc(db, "consent_requests", reqId), {
            status: action
        });

        alert(action === "approved" ? "Access Granted!" : "Request Denied.");

    } catch (err) {
        console.error("Error handling request:", err);
        alert("Action failed: " + err.message);
    }
};

// Manage Authorized Doctors
export async function loadAuthorizedDoctors(patientId) {
    const container = document.getElementById("authorized-list");
    const toggleBtn = document.getElementById("btn-show-authorized");

    if (!container || !toggleBtn) return;

    toggleBtn.onclick = () => {
        container.style.display = container.style.display === "none" ? "block" : "none";
        if (container.style.display === "block") fetchDoctors();
    };

    async function fetchDoctors() {
        container.innerHTML = "Loading...";
        const snap = await getDoc(doc(db, "consents", patientId));
        if (!snap.exists()) {
            container.innerHTML = "No authorized doctors.";
            return;
        }

        const doctors = snap.data().allowedDoctors || [];
        if (doctors.length === 0) {
            container.innerHTML = "No authorized doctors.";
            return;
        }

        container.innerHTML = "";
        for (const docId of doctors) {
            const div = document.createElement("div");
            div.className = "auth-doctor-item";
            
            let displayName = "Dr. Unknown";
            if (docId === "doctor_current") {
                 displayName = "Dr. Your Doctor";
            } else {
                 try {
                     const dSnap = await getDoc(doc(db, "doctors", docId));
                     if(dSnap.exists()){
                         let rawName = dSnap.data().name || "Unknown";
                         if(!rawName.toLowerCase().startsWith("dr")) rawName = "Dr. " + rawName;
                         displayName = rawName;
                     }
                 } catch(e) {}
            }

            div.innerHTML = `
                <span>${displayName}</span>
                <button class="btn-revoke-mini" onclick="window.revokeAccess('${patientId}', '${docId}')">Revoke</button>
            `;
            container.appendChild(div);
        }
    }
}

window.revokeAccess = async (patientId, doctorId) => {
    if (!confirm("Revoke access for this doctor?")) return;

    await updateDoc(doc(db, "consents", patientId), {
        allowedDoctors: arrayRemove(doctorId)
    });

    // Refresh list
    document.getElementById("btn-show-authorized").click();
    document.getElementById("btn-show-authorized").click(); // toggle refresh hack
};
