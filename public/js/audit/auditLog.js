import { db } from "../firebaseConfig.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

export function logAccess(user, patientId, action = "ACCESS_PATIENT") {
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] ${user} performed ${action} on ${patientId} at ${timestamp}`);

    addDoc(collection(db, "auditLogs"), {
        user: user,
        patientId: patientId,
        action: action,
        timestamp: serverTimestamp()
    }).catch(e => console.error("Audit log failed", e));
}
