import { db } from "../firebaseConfig.js";
import { doc, setDoc, updateDoc, getDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { logAccess } from "../audit/auditLog.js";

export function grantConsent(doctorId, patientId) {
    if (!patientId) { console.error("No patient ID"); return; }
    console.log(`Granting consent for ${patientId} to ${doctorId}`);

    return setDoc(doc(db, "consents", patientId), {
        allowedDoctors: arrayUnion(doctorId)
    }, { merge: true })
        .then(() => {
            alert("Access Granted");
            logAccess("PATIENT_" + patientId, doctorId, "GRANT_ACCESS");
        })
        .catch(e => { console.error(e); alert("Error granting access"); });
}

export function revokeConsent(doctorId, patientId) {
    if (!patientId) return;
    console.log(`Revoking consent for ${patientId} from ${doctorId}`);

    return updateDoc(doc(db, "consents", patientId), {
        allowedDoctors: arrayRemove(doctorId)
    })
        .then(() => {
            alert("Access Revoked");
            logAccess("PATIENT_" + patientId, doctorId, "REVOKE_ACCESS");
        })
        .catch(e => { console.error(e); alert("Error revoking access"); });
}

export function checkConsentStatus(patientId) {
    const statusEl = document.getElementById("consentStatus");
    if (!statusEl) return;

    statusEl.innerText = "Checking consent status...";

    getDoc(doc(db, "consents", patientId)).then(docSnap => {
        if (docSnap.exists()) {
            const allowed = docSnap.data().allowedDoctors || [];
            if (allowed.includes("doctor_current")) {
                statusEl.innerText = "Current status: Access Granted to Doctor";
                statusEl.style.color = "green";
            } else {
                statusEl.innerText = "Current status: Access Revoked";
                statusEl.style.color = "red";
            }
        } else {
            statusEl.innerText = "Current status: No consent set (Access Denied)";
        }
    });
}
