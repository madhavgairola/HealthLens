import { db } from "../firebaseConfig.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    loadLogs();
});

async function loadLogs() {
    const tbody = document.getElementById("logBody");
    try {
        const q = query(
            collection(db, "auditLogs"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No logs found.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : "N/A";

            let badgeClass = "bdg-access";
            if (data.action?.includes("GRANT")) badgeClass = "bdg-grant";
            if (data.action?.includes("REVOKE")) badgeClass = "bdg-revoke";

            const row = `
                <tr>
                    <td>${date}</td>
                    <td>${data.user}</td>
                    <td><span class="badge ${badgeClass}">${data.action || "ACCESS"}</span></td>
                    <td style="font-family:monospace;">${data.patientId}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error loading logs: ${err.message}</td></tr>`;
    }
}
