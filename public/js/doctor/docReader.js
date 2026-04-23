import { db } from "../firebaseConfig.js";
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { GEMINI_API_KEY, GEMINI_MODEL, API_BASE_URL } from "../ai/aiConfig.js";

function updateStatus(msg) {
  const el = document.getElementById("uploadStatus");
  if (el) el.innerText = msg;
}

// using pdf.js to grab text
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

// talk to gemini
async function callGeminiAPI(text, apiKey) {
  const keyToUse = apiKey || GEMINI_API_KEY;
  if (!keyToUse) throw new Error("Please enter a valid Gemini API Key.");

  const API_URL = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${keyToUse}`;

  // this is the special prompt to get the two different summaries
  const prompt = `
    You are a medical assistant. Analyze the following medical report text.
    
    Generate TWO distinct summaries. 
    YOU MUST USE THESE EXACT HEADERS:
    ### CLINICAL_SUMMARY
    (For the Doctor: Technical, concise, list vitals, diagnoses, and medications)

    ### PATIENT_SUMMARY
    (For the Patient: Simple, empathetic, jargon-free explanation of what this means for them)

    TEXT TO ANALYZE:
    "${text.substring(0, 30000)}" 
    `;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error("AI Error: " + (err.error?.message || response.statusText));
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function processDocument(file, patientId) {
  if (!file) throw new Error("No file selected");
  if (file.type !== "application/pdf")
    throw new Error("Only PDF files are supported");

  // grab key from config if not in UI
  const keyInput = document.getElementById("apiKeyInput");
  let apiKey = keyInput ? keyInput.value.trim() : "";

  updateStatus("Uploading...");

  try {
    // get the text out
    const text = await extractTextFromPDF(file);
    console.log("Extracted Text Length:", text.length);

    updateStatus("Analyzing...");
    const insights = await callGeminiAPI(text, apiKey);

    // save it to the db
    updateStatus("Saving Analysis...");

    const patientRef = doc(db, "patients", patientId);

    // optimization: only store small files to save bandwidth (requested feature)
    let fileDataUrl = null;
    if (file.size < 1024 * 1024) {
      // 1MB limit
      try {
        fileDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
        console.log("File is small enough. Stored as Base64.");
      } catch (err) {
        console.warn("Base64 conversion failed", err);
      }
    } else {
      console.log("File too large (>1MB). Skipping content storage.");
    }

    // try to split the response... sometimes ai output can be messy
    const clinicalPart = insights
      .split("### PATIENT_SUMMARY")[0]
      .replace("### CLINICAL_SUMMARY", "")
      .trim();
    const patientPart = (insights.split("### PATIENT_SUMMARY")[1] || "").trim();

    const newReport = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString(),
      title: file.name.replace(".pdf", ""), // Use filename as title
      doctorSummary: clinicalPart,
      patientSummary: patientPart,
      fileUrl: fileDataUrl,
    };

    // Fallback: If split failed, put whole text in clinical summary
    if (!newReport.patientSummary) {
      newReport.doctorSummary = insights;
      newReport.patientSummary = "Summary available in clinical notes.";
    }

    await updateDoc(patientRef, {
      reports: arrayUnion(newReport),
    });

    updateStatus("Done! Insights saved.");
    return newReport; // Return full object for UI update
  } catch (e) {
    console.error(e);
    updateStatus("Error: " + e.message);
    throw e;
  }
}
