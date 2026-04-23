import { auth, db } from "../firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { grantConsent, revokeConsent, checkConsentStatus } from "./consent.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Patient Dashboard Script Loaded");

    // Listen for Auth State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User Logged In:", user.uid);
            loadPatientDashboard(user.uid);

            // New Notification System
            import("./notifications.js?v=2").then(mod => {
                mod.listenForRequests(user.uid);
                mod.loadAuthorizedDoctors(user.uid);
            }).catch(e => console.error("Notification load failed", e));

            // Init Chatbot
            import("../ai/chatBot.js").then(mod => {
                mod.initChatBot();
            }).catch(e => console.error("Chatbot load failed", e));
        } else {
            console.log("No user detected. Redirecting...");
            // window.location.href = "../login.html"; // Commented out for debug
        }
    });
});



async function loadPatientDashboard(patientId) {
    console.log("Starting loadPatientDashboard for:", patientId);
    try {
        console.log("Fetching profile and meds...");

        // 1. Fetch Prescriptions (Static on load for now, could also be onSnapshot if desired)
        const q = query(
            collection(db, "prescriptions"),
            where("patientId", "==", patientId)
        );
        const medsSnap = await getDocs(q);
        const medsDocs = [];
        medsSnap.forEach(d => medsDocs.push(d.data()));

        const medList = document.getElementById("medicationList");
        import("./medReminders.js").then(mod => mod.initMedReminders(medsDocs));

        if (medList) {
            if (medsDocs.length === 0) {
                medList.innerHTML = "<li>No medications prescribed.</li>";
            } else {
                medList.innerHTML = "";
                medsDocs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                medsDocs.forEach(rx => {
                    medList.innerHTML += `<li><strong>${rx.medicine}</strong> - ${rx.dosage} (${rx.frequency})</li>`;
                });
            }
        }

        // 2. Real-time Profile & Reports Fetch
        let isFirstLoad = true;
        onSnapshot(doc(db, "patients", patientId), (profileSnap) => {
            console.log("Profile update detected.");
            const data = profileSnap.exists() ? profileSnap.data() : null;

            if (!isFirstLoad && data) {
                // If this is a real-time update injected by the doctor, trigger a tiny notification or just let it snap
                console.log("New data synced from doctor dashboard!");
            }
            isFirstLoad = false;

            // Update Profile UI
            const profileEl = document.getElementById("patientProfile");
            if (profileEl && data) {
                profileEl.innerHTML = `<strong>${data.name || 'N/A'}</strong><br><span style="color:#64748b;">${data.age || 'N/A'} yrs • ${data.sex || 'N/A'}</span>`;
            }

            // Update Reports UI
            const summaryEl = document.getElementById("patientSummary");
            if (summaryEl && data) {
                summaryEl.innerHTML = "";
                if (data.reports && data.reports.length > 0) {
                    const listDiv = document.createElement("div");
                    // Sort: Newest First
                    const sortedReports = [...data.reports].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                    sortedReports.forEach(report => {
                        let finalContent = report.patientSummary;
                        if (!finalContent) {
                            let raw = report.content || "";
                            if (raw.includes("**PATIENT SUMMARY**")) {
                                finalContent = raw.split("**PATIENT SUMMARY**")[1].trim();
                            } else finalContent = raw;
                        }
                        const title = report.title || "AI Medical Analysis";
                        let dateStr = report.displayDate;
                        if (report.date) {
                            try { dateStr = new Date(report.date).toLocaleDateString('en-GB'); } catch (e) { }
                        }

                        const card = document.createElement("div");
                        card.className = "card patient-report-card";
                        card.innerHTML = `
        <div style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--primary); font-size:1.1rem;">${title} <span style="font-weight:normal; font-size:0.9em; color:var(--text-muted);">(${dateStr})</span></strong>
        </div>
        <div class="report-content-patient" style="white-space:pre-wrap;">${finalContent ? finalContent.replace(/\*\*/g, "") : "No summary available."}</div>
        `;
                        listDiv.appendChild(card);
                    });
                    summaryEl.appendChild(listDiv);
                }
                if (summaryEl.innerHTML === "") {
                    summaryEl.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><p>No medical reports found.</p></div>`;
                }
            }

            // Update Chatbot Context Reactively
            if (data) {
                import("../ai/chatBot.js").then(mod => {
                    const fullContext = {
                        ...data,
                        prescriptions: medsDocs
                    };
                    mod.updateChatContext(fullContext);
                });
            }
        });

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }

    // 4. Check Consent
    checkConsentStatus(patientId);
}
