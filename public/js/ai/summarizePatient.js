// Global AI Helper
export function summarizeForPatient(medicalText) {
    // If we have real text (from Gemini), display it properly
    if (medicalText && medicalText.length > 50) {
        return "--- YOUR HEALTH SUMMARY ---\n" + medicalText;
    }

    // Mock AI summary logic
    console.log("AI Summarizing for Patient (Mock)...");
    return "AI Summary (Patient View): \n" +
        "Your heart health looks stable. \n" +
        "Please remember to take your blood pressure medication daily. \n" +
        "Try to eat less salt.";
}
