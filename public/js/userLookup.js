import { db } from "./firebaseConfig.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

export async function lookupUidByEmail(email) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error(`No user found with email: ${email}`);
    }

    return querySnapshot.docs[0].id;
}
