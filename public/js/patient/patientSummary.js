function loadPatientSummary(patient) {
    document.getElementById("patientSummary").innerText =
        summarizeForPatient(patient.medicalText);
}
