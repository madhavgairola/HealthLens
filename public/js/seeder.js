// Data Seeder - Run this in browser console to populate DB
window.seedDatabase = function () {
    console.log("Seeding database...");
    const batch = db.batch();

    // 1. Users
    const doctorRef = db.collection("users").doc("doctor_current");
    batch.set(doctorRef, { role: "doctor", name: "Dr. Smith", email: "dr.smith@hospital.com" });

    const patientRef = db.collection("users").doc("P123");
    batch.set(patientRef, { role: "patient", name: "John Doe", email: "john@example.com" });

    // 2. Patient Profile
    const pProfileRef = db.collection("patients").doc("P123");
    batch.set(pProfileRef, {
        name: "John Doe",
        age: 45,
        sex: "Male",
        medicalText: "History of hypertension. Diagnosed 2023. Allergic to Penicillin."
    });

    // 3. Initial Prescriptions
    const rxRef1 = db.collection("prescriptions").doc();
    batch.set(rxRef1, {
        patientId: "P123",
        medicine: "Lisinopril",
        dosage: "10mg",
        frequency: "Daily",
        foodRule: "After breakfast",
        duration: "30 days",
        createdBy: "doctor_current",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const rxRef2 = db.collection("prescriptions").doc();
    batch.set(rxRef2, {
        patientId: "P123",
        medicine: "Amlodipine",
        dosage: "5mg",
        frequency: "Nightly",
        foodRule: "With food",
        duration: "30 days",
        createdBy: "doctor_current",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 4. Consent (Allow doctor by default for testing)
    const consentRef = db.collection("consents").doc("P123");
    batch.set(consentRef, {
        allowedDoctors: ["doctor_current"]
    });

    batch.commit().then(() => {
        console.log("✅ Database seeded successfully!");
        alert("Database seeded! You can now test the dashboards.");
    }).catch(err => {
        console.error("Seeding failed", err);
        alert("Seeding failed: " + err);
    });
};
