import { db } from "../firebaseConfig.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { lookupUidByEmail } from "../userLookup.js";

export async function searchPatientWithConsent(patientEmail, doctorId) {
    if (!patientEmail) return Promise.reject("No email provided");

    console.log(`[Search] Looking up ID for email: ${patientEmail}`);

    try {
        // 1. Lookup User ID by Email
        const targetUid = await lookupUidByEmail(patientEmail);
        console.log(`[Search] Found UID: ${targetUid}`);

        // 2. Check Consent
        const consentRef = doc(db, "consents", targetUid);
        const consentSnap = await getDoc(consentRef);

        if (!consentSnap.exists()) {
            throw new Error("Access denied: No consent record found for this user.");
        }

        const allowedDoctors = consentSnap.data().allowedDoctors || [];
        if (!allowedDoctors.includes(doctorId)) {
            throw new Error("Access denied: Consent not granted by patient.");
        }

        console.log("[Search] Consent Verfied! Fetching data...");

        // 3. Fetch Patient Data (Real Data)
        const patientRef = doc(db, "patients", targetUid);
        const patientSnap = await getDoc(patientRef);

        let patientData = patientSnap.exists() ? patientSnap.data() : { medicalText: "" };

        // Return structured data for the dashboard
        return {
            id: targetUid,
            ...patientData
        };

    } catch (error) {
        console.error(error);
        throw error;
    }
}
