// Global AI Helper
export function summarizeForDoctor(medicalText) {
    // If we have real text (from Gemini), display it properly
    if (medicalText && medicalText.length > 50) {
        return "--- LATEST HEALTH RECORD ---\n" + medicalText;
    }

    // Fallback Mock AI summary logic (only for empty profiles)
    console.log("AI Summarizing for Doctor (Mock)...");
    return "AI Summary (Clinician View): \n" +
        "Patient exhibits stable cardiovascular vitals. \n" +
        "Adherence to antihypertensives is crucial. \n" +
        "Recommended dietary restrictions: Low Sodium.";
}
