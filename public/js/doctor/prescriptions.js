import { db } from "../firebaseConfig.js";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Global functions for Prescriptions

export function loadPrescriptions(patientId) {
    const list = document.getElementById("prescriptionList");
    if (!list) return;

    list.innerHTML = "<li>Loading Rx...</li>";

    const q = query(
        collection(db, "prescriptions"),
        where("patientId", "==", patientId)
        // orderBy("createdAt", "desc") // Removed to avoid needing a composite index
    );

    getDocs(q)
        .then(snapshot => {
            if (snapshot.empty) {
                list.innerHTML = "<li>No prescriptions found.</li>";
                return;
            }

            list.innerHTML = "";

            // Client-side sort
            const docs = [];
            snapshot.forEach(doc => docs.push(doc.data()));
            docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            docs.forEach(rx => {
                const li = document.createElement("li");
                // New Format: Med Name in Bold, Details below
                li.innerHTML = `
                    <div style="width:100%;">
                        <div style="display:flex; justify-content:space-between; font-weight:bold; color:var(--primary);">
                            <span>${rx.medicine}</span>
                            <span>${rx.dosage}</span>
                        </div>
                        <div style="font-size:0.85em; color:#555; margin-top:4px;">
                            ${rx.frequency} • ${rx.time}
                        </div>
                        ${rx.instructions ? `<div style="font-size:0.8em; color:#888; font-style:italic; margin-top:2px;">"${rx.instructions}"</div>` : ""}
                    </div>
                `;
                list.appendChild(li);
            });
        })
        .catch(err => {
            console.error("Error loading Rx:", err);
            list.innerHTML = "<li>Error loading prescriptions.</li>";
        });
}

export function addPrescription(patientId, rxData) {
    // rxData is now an object: { medicine, dosage, frequency, time, instructions }
    if (!rxData || !rxData.medicine || !rxData.dosage) {
        alert("Please select a medicine and dosage.");
        return;
    }

    addDoc(collection(db, "prescriptions"), {
        patientId: patientId,
        medicine: rxData.medicine,
        dosage: rxData.dosage,
        frequency: rxData.frequency,
        time: rxData.time,
        instructions: rxData.instructions || "", // Optional
        createdAt: serverTimestamp(),
        foodRule: rxData.time // Mapping 'Time' to old 'foodRule' slot conceptually, or just use new field
    })
        .then(() => {
            alert("Prescription added!");
            loadPrescriptions(patientId);
        })
        .catch(err => {
            console.error("Error adding Rx:", err);
            alert("Failed to add prescription.");
        });
}

