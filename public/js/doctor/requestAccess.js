import { db } from "../firebaseConfig.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { lookupUidByEmail } from "../userLookup.js";

export async function requestConsent(doctorName, doctorId, patientEmail) {
    try {
        const patientUid = await lookupUidByEmail(patientEmail);

        await addDoc(collection(db, "consent_requests"), {
            doctorName: doctorName,
            doctorId: doctorId,
            patientId: patientUid,
            status: "pending",
            timestamp: serverTimestamp()
        });

        return patientUid;
    } catch (error) {
        console.error("Request Error:", error);
        throw error;
    }
}
