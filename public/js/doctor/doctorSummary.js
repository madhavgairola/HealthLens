import { db } from "../firebaseConfig.js";
import { doc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { summarizeForDoctor } from "../ai/summarizeDoctor.js";

export function loadDoctorSummary(patient) {
    const el = document.getElementById("summary");
    if (!el) return;

    // Clear previous
    el.innerHTML = "";

    console.log("Loading Summary for:", patient);
    console.log("Reports Array:", patient.reports);

    // 1. Check for New "Reports" Array
    if (patient.reports && Array.isArray(patient.reports) && patient.reports.length > 0) {
        const listDiv = document.createElement("div");
        listDiv.className = "report-list";

        // Sort: Newest First (Using timestamp or ID as fallback)
        const sortedReports = [...patient.reports].sort((a, b) => {
            const timeA = a.timestamp || parseInt(a.id) || 0;
            const timeB = b.timestamp || parseInt(b.id) || 0;
            return timeB - timeA;
        });

        sortedReports.forEach(report => {
            // Fix Date Format (DD/MM/YYYY)
            let dateStr = report.displayDate;
            if (report.date) {
                try {
                    dateStr = new Date(report.date).toLocaleDateString('en-GB');
                } catch (e) { /* keep fallback */ }
            }

            const card = document.createElement("div");
            card.className = "report-card collapsed"; // Start collapsed

            card.innerHTML = `
                <div class="report-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <div style="display:flex; align-items:center; gap:10px; flex:1;">
                         <span style="font-size:1.2em; cursor:pointer;" class="toggle-icon">▶</span>
                         <span style="font-weight:600;">📅 ${dateStr} - ${report.title || "Medical Report"}</span>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;" onclick="event.stopPropagation()">
                        ${report.fileUrl ? `<button onclick="openPdfModal('${report.id}')" class="btn-sm-view">📄 View</button>` : ""}
                        <button class="delete-btn btn-sm-del" data-id="${report.id}">🗑️</button>
                    </div>
                </div>
                <!-- Store URL in hidden input -->
                <input type="hidden" id="pdf_${report.id}" value="${report.fileUrl || ''}">
                <div class="report-content">
                    ${report.doctorSummary || report.content}
                </div>
            `;

            // Attach Delete Event
            card.querySelector(".delete-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                handleDelete(patient.id, report, card);
            });
            listDiv.appendChild(card);

            // Attach Delete Event
            card.querySelector(".delete-btn").addEventListener("click", () => handleDelete(patient.id, report, card));
            listDiv.appendChild(card);
        });

        el.appendChild(listDiv);
    }



    if (el.innerHTML === "") {
        el.innerText = "No medical records found.";
    }
}

async function handleDelete(patientId, reportObj, cardDom) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
        const ref = doc(db, "patients", patientId);
        await updateDoc(ref, {
            reports: arrayRemove(reportObj)
        });

        // Remove from UI
        cardDom.remove();
        alert("Report deleted.");
    } catch (e) {
        alert("Delete failed: " + e.message);
        console.error(e);
    }
}
